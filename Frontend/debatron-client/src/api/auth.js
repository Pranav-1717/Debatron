// E:\Debatron\Frontend\my-debate-arena-frontend\src\api\auth.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

export const signup = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/signup`, { username, email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data; // Should contain user, token, refreshToken
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

// Set up Axios interceptor to include JWT in requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Get token from local storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);