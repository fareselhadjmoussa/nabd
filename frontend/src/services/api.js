import axios from 'axios';

// 🔥 رابط السيرفر (ثابت)
const API_BASE = "https://nabd-chat-backend.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ========================
// 🔐 AUTH API
// ========================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ========================
// 👤 USERS API
// ========================
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  searchUsers: (q) => api.get('/users/search', { params: { q } }),
  updateStatus: (status) => api.put('/users/status', { status }),
};

// ========================
// 💬 CONVERSATIONS
// ========================
export const conversationsAPI = {
  getConversations: () => api.get('/conversations'),
  getConversationById: (id) => api.get(`/conversations/${id}`),
  createConversation: (data) => api.post('/conversations', data),
  addParticipant: (id, data) =>
    api.put(`/conversations/${id}/participants`, data),
  removeParticipant: (id, participantId) =>
    api.delete(`/conversations/${id}/participants/${participantId}`),
  markAsRead: (id) => api.put(`/conversations/${id}/read`),
  deleteConversation: (id) => api.delete(`/conversations/${id}`),
};

// ========================
// ✉️ MESSAGES
// ========================
export const messagesAPI = {
  getMessages: (conversationId, params) =>
    api.get(`/messages/${conversationId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  addReaction: (id, emoji) =>
    api.put(`/messages/${id}/reaction`, { emoji }),
};

// ========================
// 📤 UPLOAD
// ========================
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadVideo: (file) => {
    const formData = new FormData();
    formData.append('video', file);
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadAudio: (file) => {
    const formData = new FormData();
    formData.append('audio', file);
    return api.post('/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;