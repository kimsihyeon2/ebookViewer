import React from 'react';
import BookUpload from './BookUpload';
import UserManagement from './UserManagement';
import CouponManagement from './CouponManagement';

const AdminDashboard = ({ user }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">관리자 대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">책 업로드</h2>
          <BookUpload />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">사용자 관리</h2>
          <UserManagement adminUser={user} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">쿠폰 관리</h2>
          <CouponManagement user={user} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;