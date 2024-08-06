import React, { useState, useCallback, useEffect } from 'react';
import { getCoupons, generateNewCoupon } from '../api';

const CouponManagement = ({ user }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingCoupon, setGeneratingCoupon] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedCoupons = await getCoupons();
      console.log('Fetched coupons:', fetchedCoupons); // 로깅 추가
      setCoupons(fetchedCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setError(`Failed to load coupons: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchCoupons();
    }
  }, [user, fetchCoupons]);

  const handleGenerateNewCoupon = async () => {
    if (!user.isAdmin) {
      setError("You don't have permission to generate coupons.");
      return;
    }

    try {
      setGeneratingCoupon(true);
      setError(null);
      const newCoupon = await generateNewCoupon();
      console.log('New coupon generated:', newCoupon); // 로깅 추가
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