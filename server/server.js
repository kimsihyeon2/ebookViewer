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

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// MongoDB 연결
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI가 환경 변수에 정의되지 않았습니다.');
  process.exit(1);
}

// MongoDB 클라이언트 옵션
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: true,
});

let db;

async function connectToDatabase() {
  try {
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
  } catch (e) {
    console.error("데이터베이스 연결 오류:", e);
    process.exit(1);
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
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5001', 'http://localhost:5002','https://ebook-viewer-pi.vercel.app'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'build')));

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

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
    res.status(500).json({ error: '로그인 오류가 발생했습니다.' });
  }
});

app.get('/books', authenticateToken, async (req, res) => {
  try {
    console.log('Request received for /books');
    let filteredBooks;
    if (!req.user.isPremium && !req.user.isAdmin) {
      filteredBooks = await db.collection('books').find({ isPremium: false }).toArray();
    } else {
      filteredBooks = await db.collection('books').find().toArray();
    }
    console.log('Books fetched from database:', filteredBooks);
    res.json(filteredBooks);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: '책을 가져오는 중 오류가 발생했습니다.' });
  }
});

app.get('/book/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid book ID format' });
    }

    const book = await db.collection('books').findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ error: '책을 찾을 수 없습니다.' });
    }
    res.json(book);
  } catch (error) {
    console.error('책을 가져오는 중 오류가 발생했습니다:', error);
    res.status(500).json({ error: '책을 가져오는 중 오류가 발생했습니다.', details: error.message });
  }
});

app.post('/upload-book', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload book route hit');
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    const { title, author, isSample } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const newBook = {
      title,
      author,
      file: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      isPremium: isSample !== 'true',
    };

    const result = await db.collection('books').insertOne(newBook);
    const insertedBook = result.ops ? result.ops[0] : { ...newBook, _id: result.insertedId };
    res.status(201).json({ message: 'Book uploaded successfully', book: insertedBook });
  } catch (error) {
    console.error('Error uploading book:', error);
    res.status(500).json({ 
      error: '책 업로드 중 오류가 발생했습니다.', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/users', authenticateToken, checkAdminAuth, async (req, res) => {
  try {
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' });
  }
});

app.delete('/users/:username', authenticateToken, checkAdminAuth, async (req, res) => {
  try {
    const result = await db.collection('users').deleteOne({ username: req.params.username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ message: '사용자가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

app.put('/users/:username/demote', authenticateToken, checkAdminAuth, async (req, res) => {
  try {
    const result = await db.collection('users').updateOne(
      { username: req.params.username },
      { $set: { isPremium: false, premiumExpiryDate: null } }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없거나 이미 프리미엄 해제되었습니다.' });
    }
    res.json({ message: '사용자의 프리미엄이 성공적으로 해제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '사용자 프리미엄 해제 중 오류가 발생했습니다.' });
  }
});

app.post('/generate-coupon', authenticateToken, checkAdminAuth, async (req, res) => {
  try {
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
    const code = `PREM-${randomPart}`;
    const newCoupon = {
      code,
      used: false,
      durationDays: 30
    };
    await db.collection('coupons').insertOne(newCoupon);
    res.json(newCoupon);
  } catch (error) {
    res.status(500).json({ error: '쿠폰 생성 중 오류가 발생했습니다.' });
  }
});

app.post('/redeem-coupon', authenticateToken, async (req, res) => {
  try {
    const { couponCode } = req.body;
    const coupon = await db.collection('coupons').findOne({ code: couponCode, used: false });

    if (!coupon) {
      return res.status(400).json({ error: '유효하지 않거나 이미 사용된 쿠폰입니다.' });
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + coupon.durationDays * 24 * 60 * 60 * 1000);

    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $set: { isPremium: true, premiumExpiryDate: expiryDate } }
    );

    await db.collection('coupons').updateOne(
      { _id: coupon._id },
      { $set: { used: true } }
    );

    res.json({ 
      success: true, 
      message: '쿠폰이 성공적으로 사용되었습니다.', 
      expiryDate: expiryDate,
      durationDays: coupon.durationDays
    });
  } catch (error) {
    res.status(500).json({ error: '쿠폰 사용 중 오류가 발생했습니다.' });
  }
});

app.get('/user', authenticateToken, async (req, res) => {
  try {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' });
  }
});

app.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    const result = await db.collection('users').updateOne(
      { _id: req.user._id },
      { $set: { isPremium: true, premiumExpiryDate: null } }
    );
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: '사용자가 이미 프리미엄 상태이거나 찾을 수 없습니다.' });
    }
    const updatedUser = await db.collection('users').findOne({ _id: req.user._id }, { projection: { password: 0 } });
    res.json({ message: '사용자가 성공적으로 프리미엄으로 업그레이드되었습니다.', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: '사용자 업그레이드 중 오류가 발생했습니다.' });
  }
});

app.get('/api/status', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ _id: req.user._id }, { projection: { password: 0 } });
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    // 프리미엄 상태 확인 및 업데이트 로직
    if (user.isPremium && user.premiumExpiryDate && new Date(user.premiumExpiryDate) < new Date()) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { isPremium: false, premiumExpiryDate: null } }
      );
      user.isPremium = false;
      user.premiumExpiryDate = null;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: '상태 확인 중 오류가 발생했습니다.' });
  }
});

app.get('/coupons', authenticateToken, checkAdminAuth, async (req, res) => {
  try {
    const coupons = await db.collection('coupons').find().toArray();
    console.log('Sending coupons:', coupons); // 로깅 추가
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons', details: error.message });
  }
});

// React 앱을 위한 catch-all 라우트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// 서버 시작
connectToDatabase().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(console.error);

// 서버 종료 시 DB 연결 종료
process.on('SIGINT', async () => {
  await client.close();
  console.log('데이터베이스 연결이 종료되었습니다.');
  process.exit(0);
});