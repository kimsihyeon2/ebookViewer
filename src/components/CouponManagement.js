import React, { useState, useCallback, useEffect } from 'react';

const API_URL = window.ENV.REACT_APP_API_URL;


const CouponManagement = ({ user }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingCoupon, setGeneratingCoupon] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/coupons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch coupons');
      const fetchedCoupons = await response.json();
      console.log('Fetched coupons:', fetchedCoupons);
      setCoupons(fetchedCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setError(`Failed to load coupons: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateNewCoupon = async () => {
    if (!user.isAdmin) {
      setError("You don't have permission to generate coupons.");
      return;
    }

    try {
      setGeneratingCoupon(true);
      setError(null);
      const response = await fetch(`${API_URL}/generate-coupon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to generate coupon');
      const newCoupon = await response.json();
      console.log('New coupon generated:', newCoupon);
      setCoupons(prevCoupons => [...prevCoupons, newCoupon]);
    } catch (error) {
      console.error('Error generating new coupon:', error);
      setError(`Failed to generate new coupon: ${error.message}`);
    } finally {
      setGeneratingCoupon(false);
    }
  };

  if (!user || !user.isAdmin) {
    return <div className="text-red-500">Access denied. You must be an admin to view this page.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Coupon Management</h2>
      <button 
        onClick={handleGenerateNewCoupon}
        className={`bg-blue-500 text-white px-4 py-2 rounded mb-4 ${generatingCoupon ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={generatingCoupon}
      >
        {generatingCoupon ? 'Generating...' : 'Generate New Coupon'}
      </button>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div>Loading coupons...</div>
      ) : coupons.length > 0 ? (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Coupon Code</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Duration (Days)</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon._id}>
                <td className="border p-2">{coupon.code}</td>
                <td className="border p-2">{coupon.used ? 'Used' : 'Available'}</td>
                <td className="border p-2">{coupon.durationDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No coupons available.</p>
      )}
    </div>
  );
};

export default CouponManagement;