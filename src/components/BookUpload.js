import React, { useState } from 'react';
import { uploadBook } from '../api';
import { useBooks } from '../contexts/BookContext';

const BookUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addBook } = useBooks();  // 이 줄을 제거하거나 아래와 같이 사용하세요

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('author', author);
    formData.append('isSample', isSample);
  
    try {
      const newBook = await uploadBook(formData);
      addBook(newBook);  // 여기에서 addBook 함수를 사용
      alert('책이 성공적으로 업로드되었습니다.');
      // 폼 초기화
      setFile(null);
      setTitle('');
      setAuthor('');
      setIsSample(false);
    } catch (err) {
      setError('책 업로드에 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="file" className="block mb-2">PDF 파일</label>
        <input 
          type="file" 
          id="file" 
          accept=".pdf" 
          onChange={(e) => setFile(e.target.files[0])} 
          required 
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="title" className="block mb-2">제목</label>
        <input 
          type="text" 
          id="title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="author" className="block mb-2">저자</label>
        <input 
          type="text" 
          id="author" 
          value={author} 
          onChange={(e) => setAuthor(e.target.value)} 
          required 
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="flex items-center">
          <input 
            type="checkbox" 
            checked={isSample} 
            onChange={(e) => setIsSample(e.target.checked)} 
            className="mr-2"
          />
          샘플 책으로 지정
        </label>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? '업로드 중...' : '책 업로드'}
      </button>
    </form>
  );
};

export default BookUpload;