import React, { useState } from 'react';

const CouponRedemption = ({ onRedeem }) => {
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      alert('Please enter a coupon code.');
      return;
    }
    setIsLoading(true);
    try {
      await onRedeem(couponCode);
      setCouponCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <input
        type="text"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        placeholder="Enter coupon code (e.g., PREM-XXXX-XXXX-XXXX)"
        className="mr-2 px-2 py-1 border rounded w-64"
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="bg-green-500 text-white px-4 py-1 rounded disabled:bg-gray-400"
        disabled={isLoading}
      >
        {isLoading ? 'Redeeming...' : 'Redeem'}
      </button>
    </form>
  );
};

export default CouponRedemption;
