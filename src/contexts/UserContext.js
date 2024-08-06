import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { getUserInfo, login as apiLogin, logout as apiLogout, upgradeToPremium, redeemCoupon as apiRedeemCoupon, demoteUser as apiDemoteUser } from '../api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found');
        setUser(null);
        return;
      }
      const userInfo = await getUserInfo();
      console.log('User info fetched:', userInfo);
      setUser(userInfo);
      localStorage.setItem('username', userInfo.username);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      setUser(null);
      setError('Failed to fetch user info');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLogin(credentials);
      console.log('Login response:', response);
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('username', response.user.username);
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiLogout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Logout failed: ' + error.message);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
      setIsLoading(false);
    }
  }, []);

  const demoteUser = useCallback(async (username) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiDemoteUser(username);
      console.log('Demote result:', result);
      // 현재 로그인한 사용자가 강등된 경우 상태를 업데이트합니다.
      if (user && user.username === username) {
        await fetchUserInfo();
      }
      return result;
    } catch (error) {
      console.error('Demote failed:', error);
      setError('Demote failed: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchUserInfo]);

  const upgradeUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Attempting to upgrade user:', user);
      const result = await upgradeToPremium();
      console.log('Upgrade result:', result);
      await fetchUserInfo();
    } catch (error) {
      console.error('Upgrade failed:', error);
      setError('Upgrade failed: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserInfo, user]);

  const redeemCoupon = useCallback(async (couponCode) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Attempting to redeem coupon:', couponCode);
      const result = await apiRedeemCoupon(couponCode);
      console.log('Coupon redemption result:', result);
      if (result.success) {
        await fetchUserInfo();
      }
      return result;
    } catch (error) {
      console.error('Coupon redemption failed:', error);
      setError('Coupon redemption failed: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserInfo]);

  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    upgradeUser,
    redeemCoupon,
    fetchUserInfo,
    demoteUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
