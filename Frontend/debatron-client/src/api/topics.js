// E:\Debatron\Frontend\my-debate-arena-frontend\src\api\topics.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

export const getAllTopics = async () => {
  try {
    const response = await axios.get(`${API_URL}/topics`);
    return response.data.topics;
  } catch (error) {
    console.error("Error fetching topics:", error.response?.data?.message || error.message);
    throw error.response?.data?.message || error.message;
  }
};