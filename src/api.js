const BASE_URL = 'http://localhost:5001';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const getAuthToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  console.log('Retrieved token:', token ? `${token.substring(0, 20)}...` : 'No token');
  return token;
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setAuthToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token);
export const removeAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const removeRefreshToken = () => localStorage.removeItem(REFRESH_TOKEN_KEY);

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    return decodedToken.exp * 1000 < Date.now();
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const { token: newAccessToken } = await response.json();
    setAuthToken(newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    await logout();
    throw error;
  }
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  console.log('Response content type:', contentType);
  console.log('Response status:', response.status);

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errorDetails = {};
    try {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details || {};
      } else {
        errorMessage = await response.text();
      }
    } catch (e) {
      console.error('Error parsing error response:', e);
    }
    console.error('Response error:', errorMessage, errorDetails);
    throw new Error(errorMessage, { cause: errorDetails });
  }

  let responseData;
  try {
    responseData = contentType && contentType.includes("application/json") ? await response.json() : await response.text();
  } catch (e) {
    console.error('Error parsing response:', e);
    throw new Error('Failed to parse server response');
  }
  console.log('Response data:', responseData);
  return responseData;
};

export const authFetch = async (url, options = {}) => {
  try {
    let token = getAuthToken();
    console.log('Auth token:', token ? 'Token exists' : 'No token');
    console.log('Request URL:', `${BASE_URL}${url}`);

    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required');
    }

    if (isTokenExpired(token)) {
      console.log('Token expired, refreshing...');
      try {
        token = await refreshAccessToken();
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        await logout();
        throw new Error('Failed to refresh authentication token');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      console.log('Unauthorized, attempting to refresh token...');
      try {
        token = await refreshAccessToken();
        headers.Authorization = `Bearer ${token}`;
        const retryResponse = await fetch(`${BASE_URL}${url}`, { ...options, headers });
        return handleResponse(retryResponse);
      } catch (refreshError) {
        console.error('Failed to refresh token on 401:', refreshError);
        await logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return handleResponse(response);
  } catch (error) {
    console.error('authFetch error:', error);
    if (error.message === 'Authentication required' || error.message === 'Failed to refresh token') {
      await logout();
    }
    throw error;
  }
};

export const login = async (credentials) => {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    })

    const data = await handleResponse(response);
    console.log('Login response:', data);
    
    if (data.token && data.refreshToken) {
      // URL 디코딩된 사용자 이름을 저장
      const decodedToken = JSON.parse(atob(data.token.split('.')[1]));
      const decodedUsername = decodeURIComponent(decodedToken.username);
      
      localStorage.setItem('username', decodedUsername);
      setAuthToken(data.token);
      setRefreshToken(data.refreshToken);
      console.log('Tokens stored');
    } else {
      console.error('No tokens received in login response');
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getUserInfo = async () => {
  console.log('Fetching user info');
  const username = localStorage.getItem('username');
  if (!username) {
    throw new Error('Username not found in local storage');
  }
  return authFetch(`/user`);
};

export const logout = async () => {
  try {
    const token = getAuthToken();
    if (token) {
      await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    removeAuthToken();
    removeRefreshToken();
    window.location.href = '/login';
  }
};

export const signUp = async (userData) => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

export const redeemCoupon = async (couponCode) => {
  console.log('Redeeming coupon:', couponCode);
  return authFetch('/redeem-coupon', {
    method: 'POST',
    body: JSON.stringify({ couponCode }),
  });
};

export const upgradeToPremium = async () => {
  console.log('Upgrading to premium');
  try {
    const userInfo = await getUserInfo();
    console.log('Current user info:', userInfo);

    const response = await authFetch('/upgrade', {
      method: 'POST',
    });
    console.log('Upgrade response:', response);
    return response;
  } catch (error) {
    console.error('Upgrade error:', error);
    if (error.message === 'Session expired. Please log in again.') {
      // 사용자에게 재로그인이 필요하다는 메시지를 표시
      alert('Your session has expired. Please log in again.');
      // 로그아웃 처리
      await logout();
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    } else {
      // 다른 종류의 오류인 경우, 일반적인 오류 메시지를 표시
      alert('Failed to upgrade to premium. Please try again later.');
    }
    throw error;
  }
};

export const getCoupons = async () => {
  console.log('Fetching coupons');
  try {
    const response = await authFetch('/coupons');
    console.log('Coupons response:', response);
    if (!Array.isArray(response)) {
      console.error('Unexpected response format for coupons:', response);
      return [];
    }
    return response;
  } catch (error) {
    console.error('Error fetching coupons:', error);
    throw error;
  }
};

export const generateNewCoupon = async () => {
  console.log('Generating new coupon');
  return authFetch('/generate-coupon', { method: 'POST' });
};

export const getUsers = async () => {
  console.log('Fetching all users');
  return authFetch('/users');
};

export const deleteUser = async (userToDelete) => {
  console.log('Deleting user:', userToDelete);
  return authFetch(`/users/${userToDelete}`, { method: 'DELETE' });
};

export const demoteUser = async (userToDemote) => {
  console.log('Attempting to demote user:', userToDemote);
  try {
    const response = await authFetch(`/users/${userToDemote}/demote`, { method: 'PUT' });
    console.log('Demote response:', response);
    if (response.error) {
      throw new Error(response.error);
    }
    return response;
  } catch (error) {
    console.error('Failed to demote user:', error);
    throw error; // 이 에러를 호출한 컴포넌트에서 처리할 수 있도록 다시 던집니다.
  }
};

export const uploadBook = async (formData) => {
  try {
    const response = await fetch(`${BASE_URL}/upload-book`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload book');
    }
    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const checkStatus = async () => {
  return authFetch('/api/status');
};

export const getAllBooks = async () => {
  try {
    const response = await authFetch('/books');
    console.log('API response for books:', response);
    return response;
  } catch (error) {
    console.error('Error fetching all books:', error);
    throw error;
  }
};

export const getBookInfo = async (bookId) => {
  console.log('Fetching book info for:', bookId);
  try {
    const bookInfo = await authFetch(`/book/${bookId}`);
    console.log('Received book info:', bookInfo);
    return bookInfo;
  } catch (error) {
    console.error(`Error fetching book info for ID ${bookId}:`, error);
    throw new Error(`Failed to fetch book info: ${error.message}`, { cause: error });
  }
};

export const getPublicBooks = async () => {
  console.log('Fetching public books');
  const response = await fetch(`${BASE_URL}/public-books`);
  return handleResponse(response);
};
