import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { BookProvider } from './contexts/BookContext';
import useAuth from './hooks/useAuth';
import Login from './components/Login';
import Signup from './components/Signup';
import EbookList from './components/EbookList';
import PdfViewer from './components/PdfViewer';
import PremiumUpgrade from './components/PremiumUpgrade';
import CouponRedemption from './components/CouponRedemption';
import CouponManagement from './components/CouponManagement';
import UserManagement from './components/UserManagement';
import ErrorBoundary from './components/ErrorBoundary';
import AdminDashboard from './components/AdminDashboard';

const App = () => {
  return (
    <ErrorBoundary>
      <UserProvider>
        <BookProvider>
          <Router>
            <AppContent />
          </Router>
        </BookProvider>
      </UserProvider>
    </ErrorBoundary>
  );
};

const AppContent = () => {
  const { user, logout, upgradeUser, redeemCoupon } = useUser();
  const { loading, error } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleUpgrade = async () => {
    try {
      await upgradeUser();
      alert('프리미엄으로 성공적으로 업그레이드 되었습니다!');
    } catch (error) {
      alert(error.message || '업그레이드에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCouponRedeem = async (couponCode) => {
    try {
      const result = await redeemCoupon(couponCode);
      if (result.success) {
        alert(`쿠폰이 성공적으로 적용되었습니다! 프리미엄 사용 권한이 ${new Date(result.expiryDate).toLocaleDateString()}까지 연장되었습니다.`);
      } else {
        alert(result.message || '쿠폰 적용에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      alert(error.message || '쿠폰 적용에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <div className="card text-red-500" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <Link to="/" className="text-2xl font-bold mb-4 md:mb-0">Ebook Library</Link>
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            {user ? (
              <>
                <span className="text-sm">
                  Welcome, {user.username}
                  ({user.isAdmin ? 'Admin' : (user.isPremium ? 'Premium' : 'Free')})
                  {user.isPremium && !user.isAdmin && ` - Expires: ${formatExpiryDate(user.premiumExpiryDate)}`}
                </span>
                {user.isAdmin && (
                  <>
                    <Link to="/admin" className="btn btn-sm">Admin Dashboard</Link>
                  </>
                )}
                {!user.isAdmin && !user.isPremium && (
                  <Link to="/upgrade" className="btn btn-sm">Upgrade to Premium</Link>
                )}
                <button onClick={handleLogout} className="btn btn-sm">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm">Login</Link>
                <Link to="/signup" className="btn btn-sm">Signup</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={
            <>
              <EbookList />
              {user && !user.isPremium && !user.isAdmin && (
                <div className="card mt-8">
                  <h3 className="text-xl font-bold mb-4">Upgrade to Premium</h3>
                  <p className="mb-4">Enter a valid coupon code to get premium access:</p>
                  <CouponRedemption onRedeem={handleCouponRedeem} />
                </div>
              )}
            </>
          } />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
          <Route
            path="/viewer/:id"
            element={user ? <PdfViewer user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/upgrade"
            element={
              user && !user.isPremium && !user.isAdmin ? (
                <PremiumUpgrade onUpgrade={handleUpgrade} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/coupon-management"
            element={
              user && user.isAdmin ? (
                <CouponManagement user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/user-management"
            element={
              user && user.isAdmin ? (
                <UserManagement adminUser={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        <Route
          path="/admin"
          element={
            user && user.isAdmin ? (
              <AdminDashboard user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
      </main>
    </div>
  );
};

export default App;