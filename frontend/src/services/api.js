import axios from 'axios';

const isBrowser = typeof window !== 'undefined';

const normalizeUrl = (url) => url.replace(/\/+$/, '');

const isLocalHostName = (hostname) => ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);

const shouldReplaceLocalhostEnv = (url) => {
  if (!isBrowser || !url) return false;

  try {
    const parsed = new URL(url);
    return isLocalHostName(parsed.hostname) && !isLocalHostName(window.location.hostname);
  } catch {
    return false;
  }
};

const getDefaultBackendUrl = () => {
  if (!isBrowser) return 'http://localhost:5000';

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:5000`;
};

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl && !shouldReplaceLocalhostEnv(envUrl)) {
    return normalizeUrl(envUrl);
  }

  return `${getDefaultBackendUrl()}/api`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // If token expired and we haven't tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  searchUsers: (q) => api.get('/users/search', { params: { q } }),
  updateStatus: (status) => api.put('/users/status', { status }),
};

// Conversations API
export const conversationsAPI = {
  getConversations: () => api.get('/conversations'),
  getConversationById: (id) => api.get(`/conversations/${id}`),
  createConversation: (data) => api.post('/conversations', data),
  addParticipant: (id, data) => api.put(`/conversations/${id}/participants`, data),
  removeParticipant: (id, participantId) => api.delete(`/conversations/${id}/participants/${participantId}`),
  markAsRead: (id) => api.put(`/conversations/${id}/read`),
  deleteConversation: (id) => api.delete(`/conversations/${id}`),
};

// Messages API
export const messagesAPI = {
  getMessages: (conversationId, params) => api.get(`/messages/${conversationId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  addReaction: (id, emoji) => api.put(`/messages/${id}/reaction`, { emoji }),
};

// Upload API
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
