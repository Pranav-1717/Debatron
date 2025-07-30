// E:\Debatron\Frontend\my-debate-arena-frontend\src\api\rooms.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

export const joinRoom = async (topicId, mode = 'ranked') => {
  try {
    const response = await axios.post(`${API_URL}/rooms/join`, { topicId, mode });
    return response.data; // Should return { roomId, isContest }
  } catch (error) {
    console.error("Error joining room:", error.response?.data?.message || error.message);
    throw error.response?.data?.message || error.message;
  }
};