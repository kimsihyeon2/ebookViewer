import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const PremiumUpgrade = () => {
  const navigate = useNavigate();
  const { user, upgradeUser, isLoading } = useUser();
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    setError(null);
    try {
      await upgradeUser();
      alert('Successfully upgraded to premium!');
      navigate('/');  // Redirect to home after upgrade
    } catch (err) {
      console.error('Upgrade error:', err);
      // 세션 만료 에러는 upgradeToPremium 함수 내에서 처리되므로,
      // 여기서는 다른 종류의 에러만 처리합니다.
      if (err.message !== 'Session expired. Please log in again.') {
        setError(err.message || 'Failed to upgrade. Please try again.');
      }
    }
  };

  if (user && user.isPremium) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4">You're already a Premium member!</h2>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Upgrade to Premium</h2>
      <p className="mb-4">
        Enjoy unlimited access to our entire ebook collection with a premium account!
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Access to all ebooks</li>
        <li>Ad-free reading experience</li>
        <li>Offline reading</li>
        <li>Priority customer support</li>
      </ul>
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}
      <button
        onClick={handleUpgrade}
        className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 mb-4"
        disabled={isLoading}
      >
        {isLoading ? 'Upgrading...' : 'Upgrade Now for $9.99/month'}
      </button>
      <button
        onClick={() => navigate('/')}
        className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400"
        disabled={isLoading}
      >
        Back to Home
      </button>
    </div>
  );
};

export default PremiumUpgrade;