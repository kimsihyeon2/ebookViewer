import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBooks } from '../contexts/BookContext';
import { useUser } from '../contexts/UserContext';

const EbookList = () => {
  const { books, fetchBooks, loading, error } = useBooks();
  const { user } = useUser();

  console.log('Books in EbookList:', books);
  console.log('User in EbookList:', user);

  useEffect(() => {
    console.log('EbookList component mounted or updated');
    if (user) {
      console.log('Fetching books...');
      fetchBooks(true);
    }
  }, [user, fetchBooks]);

  if (loading) {
    return <div>Loading books...</div>;
  }

  if (error) {
    return <div>Error loading books: {error}</div>;
  }

  if (!user) {
    return (
      <div className="card text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to our Ebook Library</h2>
        <p className="mb-6">Please log in to view our collection of ebooks.</p>
        <Link to="/login" className="btn">
          Log In
        </Link>
        <p className="mt-4">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up here</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Ebook Collection</h2>
      {books.length === 0 ? (
        <p>No books available at the moment. {user.isAdmin && '(Admin: Check server connection)'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book._id} className="card"> {/* _id 사용 */}
              <h3 className="text-xl font-semibold mb-2">{book.title}</h3>
              <p className="text-gray-400 mb-2">{book.author}</p>
              {book.isPremium && (
                <span className="inline-block bg-yellow-500 text-black text-xs px-2 py-1 rounded mb-2">
                  Premium
                </span>
              )}
              {(user.isAdmin || user.isPremium || !book.isPremium) ? (
                <Link to={`/viewer/${book._id}`} className="btn block text-center mt-4"> {/* _id 사용 */}
                  Read
                </Link>
              ) : (
                <p className="text-red-500 mt-2">Premium Content</p>
              )}
            </div>
          ))}
        </div>
      )}
      {!user.isPremium && !user.isAdmin && (
        <div className="card mt-8 text-center">
          <h3 className="text-xl font-bold mb-4">Upgrade to Premium</h3>
          <p className="mb-4">Unlock all premium content with our Premium subscription!</p>
          <Link to="/upgrade" className="btn">
            Upgrade to Premium
          </Link>
        </div>
      )}
      {user.isAdmin && books.length < 2 && (
        <div className="mt-8 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <h4 className="font-bold">Admin Notice</h4>
          <p>There seems to be fewer books than expected. Please check the server connection and book data.</p>
        </div>
      )}
    </div>
  );
};

export default EbookList;
