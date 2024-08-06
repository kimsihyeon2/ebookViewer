// src/userService.js

import { login, getUserInfo, refreshAccessToken } from './api';

const USER_KEY = 'ebook_user';
const CACHE_DURATION = 5 * 60 * 1000; // 5분

let cachedUser = null;
let cacheTimestamp = 0;

export const loginUser = async (credentials) => {
  try {
    const response = await login(credentials);
    if (response.user) {
      setUser(response.user);
    }
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getUser = async () => {
  if (cachedUser && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedUser;
  }

  try {
    const user = await getUserInfo();
    setUser(user);
    return user;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
};

export const setUser = (user) => {
  cachedUser = user;
  cacheTimestamp = Date.now();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearUser = () => {
  cachedUser = null;
  cacheTimestamp = 0;
  localStorage.removeItem(USER_KEY);
};

export const refreshToken = async () => {
  try {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // 토큰 갱신 후 사용자 정보 업데이트
      await getUser();
    }
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearUser();
    return null;
  }
};

export const updateUser = async (updates) => {
  try {
    // API를 통해 서버에 업데이트 요청
    const updatedUser = await updateUserAPI(updates);
    setUser(updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// 기존의 로컬 스토리지 기반 함수들은 필요에 따라 유지하거나 제거