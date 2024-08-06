// src/contexts/BookContext.js
import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { getAllBooks, getPublicBooks, getBookInfo } from '../api';

const BookContext = createContext();

export const BookProvider = ({ children }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(async (isUser) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedBooks = isUser ? await getAllBooks() : await getPublicBooks();
      console.log('Fetched books in context:', fetchedBooks);
      setBooks(fetchedBooks);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      setError(error.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookInfo = useCallback(async (bookId) => {
    try {
      const bookInfo = await getBookInfo(bookId);
      console.log('Fetched book info:', bookInfo);
      return bookInfo;
    } catch (error) {
      console.error('Failed to fetch book info:', error);
      throw error;
    }
  }, []);

  const addBook = useCallback((newBook) => {
    setBooks(prevBooks => {
      const updatedBooks = [...prevBooks, newBook];
      console.log('Updated books after adding:', updatedBooks);
      return updatedBooks;
    });
  }, []);

  const updateBook = useCallback((updatedBook) => {
    setBooks(prevBooks => {
      const updatedBooks = prevBooks.map(book => 
        book.id === updatedBook.id ? updatedBook : book
      );
      console.log('Updated books after updating:', updatedBooks);
      return updatedBooks;
    });
  }, []);

  const value = useMemo(() => ({
    books,
    loading,
    error,
    fetchBooks,
    getBookInfo: fetchBookInfo,
    addBook,
    updateBook
  }), [books, loading, error, fetchBooks, fetchBookInfo, addBook, updateBook]);

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};

export const useBooks = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return context;
};