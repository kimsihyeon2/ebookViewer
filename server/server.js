require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// MongoDB 연결
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI가 환경 변수에 정의되지 않았습니다.');
  process.exit(1);
}

// MongoDB 연결 옵션
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

let db;

async function connectToDatabase() {
  try {
    const client = new MongoClient(uri, mongoOptions);
    await client.connect();
    console.log("MongoDB Atlas에 연결되었습니다.");
    db = client.db("ebookviewer");

    // 초기 관리자 계정 생성
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await db.collection('users').insertOne({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        isPremium: true,
        premiumExpiryDate: null,
        isAdmin: true
      });
      console.log('초기 관리자 계정이 생성되었습니다.');
    }

    // 연결 모니터링
    client.on('close', () => {
      console.log('MongoDB 연결이 닫혔습니다. 재연결 시도 중...');
      setTimeout(connectToDatabase, 5000);
    });

    return client;
  } catch (e) {
    console.error("데이터베이스 연결 오류:", e);
    setTimeout(connectToDatabase, 5000);
  }
}

// WebSocket 설정
wss.on('connection', (ws) => {
  console.log('WebSocket 연결이 설정되었습니다.');

  ws.on('message', (message) => {
    console.log('WebSocket 메시지 수신:', message);
    ws.send(`서버로부터의 응답: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket 연결이 종료되었습니다.');
  });
});

// CORS 설정
app.use(cors({
  origin: [
    'https://ebook-viewer-e8zea5ee0-action-lions-projects.vercel.app', 
    'http://localhost:3000'
  ],
  credentials: true,
}));

app.options('*', cors()); // Preflight 요청 처리

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'build')));

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

// 파일 업로드 보안 강화
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/epub+zip'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

// JWT 설정
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// 인증 미들웨어
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: '토큰이 제공되지 않았습니다.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decodeURIComponent(decoded.username);
    const user = await db.collection('users').findOne({ username });
    
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// 관리자 권한 확인 미들웨어
const checkAdminAuth = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  next();
};

// 라우트 정의
app.post('/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '사용자 이름이 이미 존재합니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { 
      username, 
      password: hashedPassword, 
      email,
      isPremium: false, 
      premiumExpiryDate: null,
      isAdmin: false
    };
    await db.collection('users').insertOne(newUser);
    res.json({ message: '사용자가 성공적으로 생성되었습니다.', user: { ...newUser, password: undefined } });
  } catch (error) {
    console.error('사용자 생성 중 오류:', error);
    res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection('users').findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { username: encodeURIComponent(user.username), isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const refreshToken = jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ user: { ...user, password: undefined }, token, refreshToken });
    } else {
      res.status(401).json({ error: '잘못된 자격 증명입니다.' });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '로그인 오류가 발생했습니다.' });
  }
});

// 기타 라우트들...

// React 앱을 위한 catch-all 라우트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 여기에 에러 로깅 로직 추가
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 여기에 에러 로깅 로직 추가
});

// 서버 시작
connectToDatabase()
  .then((client) => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // 종료 시 정리
    process.on('SIGINT', async () => {
      await client.close();
      console.log('MongoDB 연결이 종료되었습니다.');
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  });
