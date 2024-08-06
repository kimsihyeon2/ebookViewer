import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useBooks } from '../contexts/BookContext';

const useAuth = () => {
  const [error, setError] = useState(null);
  const { user, isLoading: userLoading } = useUser();
  const { fetchBooks, isLoading: booksLoading } = useBooks();

  useEffect(() => {
    const initializeAuth = async () => {
      setError(null);
      try {
        if (!userLoading && user) {
          await fetchBooks(true); // 인증된 사용자를 위한 책 목록 fetch
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setError('앱 초기화 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    };

    initializeAuth();
  }, [fetchBooks, user, userLoading]);

  return { loading: userLoading || booksLoading, error };
};

export default useAuth;