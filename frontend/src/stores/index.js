import { create } from 'zustand';
import { authAPI, usersAPI, conversationsAPI, messagesAPI, uploadAPI } from '../services/api';
import socketService from '../services/socket';

// Auth Store
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize from localStorage
  init: () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },

  // Register
  register: async (data) => {
    try {
      const response = await authAPI.register(data);
      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      set({ user, isAuthenticated: true });
      socketService.connect(accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في إنشاء الحساب',
      };
    }
  },

  // Login
  login: async (data) => {
    try {
      const response = await authAPI.login(data);
      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      set({ user, isAuthenticated: true });
      socketService.connect(accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في تسجيل الدخول',
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('accessToken');
    socketService.disconnect();
    set({ user: null, isAuthenticated: false });
  },

  // Fetch current user
  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const response = await authAPI.getMe();
      const user = response.data.data.user;
      set({ user, isAuthenticated: true });
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketService.connect(token);
      }
    } catch (error) {
      console.error('FetchUser error:', error);
      localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      const user = response.data.data.user;
      set({ user });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في تحديث الملف الشخصي',
      };
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const response = await uploadAPI.uploadAvatar(file);
      const avatar = response.data.data.url;
      await get().updateProfile({ avatar });
      return { success: true, url: avatar };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في رفع الصورة',
      };
    }
  },
}));

// Chat Store
export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: {},
  onlineUsers: [],

  // Fetch conversations
  fetchConversations: async () => {
    try {
      const response = await conversationsAPI.getConversations();
      const conversations = response.data.data.conversations;
      set({ conversations });
    } catch (error) {
      console.error('FetchConversations error:', error);
    }
  },

  // Set current conversation
  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  // Create conversation
  createConversation: async (data) => {
    try {
      const response = await conversationsAPI.createConversation(data);
      const conversation = response.data.data.conversation;
      const { conversations } = get();

      // Add to beginning if not exists
      if (!conversations.find((c) => c._id === conversation._id)) {
        set({ conversations: [conversation, ...conversations] });
      }

      return { success: true, conversation };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في إنشاء المحادثة',
      };
    }
  },

  // Fetch messages
  fetchMessages: async (conversationId, page = 1) => {
    try {
      const response = await messagesAPI.getMessages(conversationId, { page, limit: 50 });
      const { messages } = response.data.data;

      if (page === 1) {
        set({ messages });
      } else {
        set((state) => ({ messages: [...messages, ...state.messages] }));
      }

      return messages;
    } catch (error) {
      console.error('FetchMessages error:', error);
      return [];
    }
  },

  // Add message
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // Update message
  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
    }));
  },

  // Delete message locally
  deleteMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, deleted: true, content: 'تم حذف هذه الرسالة' } : m
      ),
    }));
  },

  // Send message via API
  sendMessage: async (data) => {
    try {
      const response = await messagesAPI.sendMessage(data);
      return { success: true, message: response.data.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في إرسال الرسالة',
      };
    }
  },

  // Upload media
  uploadMedia: async (type, file) => {
    try {
      let response;
      if (type === 'image') {
        response = await uploadAPI.uploadImage(file);
      } else if (type === 'video') {
        response = await uploadAPI.uploadVideo(file);
      } else if (type === 'audio') {
        response = await uploadAPI.uploadAudio(file);
      }
      return { success: true, url: response.data.data.url };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في رفع الملف',
      };
    }
  },

  // Mark as read
  markAsRead: async (conversationId) => {
    try {
      await conversationsAPI.markAsRead(conversationId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (error) {
      console.error('MarkAsRead error:', error);
    }
  },

  // Update typing status
  setTyping: (conversationId, userId, username) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: { userId, username },
      },
    }));
  },

  // Clear typing
  clearTyping: (conversationId, userId) => {
    set((state) => {
      const newTyping = { ...state.typingUsers };
      if (newTyping[conversationId]?.userId === userId) {
        delete newTyping[conversationId];
      }
      return { typingUsers: newTyping };
    });
  },

  // Set online users
  setOnlineUsers: (users) => {
    set({ onlineUsers: users });
  },

  // Add online user
  addOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: [...state.onlineUsers, userId],
      conversations: state.conversations.map((c) =>
        c.participants?.some((p) => p._id === userId)
          ? { ...c, participants: c.participants.map((p) =>
              p._id === userId ? { ...p, status: 'online' } : p
            )}
          : c
      ),
    }));
  },

  // Remove online user
  removeOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      conversations: state.conversations.map((c) =>
        c.participants?.some((p) => p._id === userId)
          ? { ...c, participants: c.participants.map((p) =>
              p._id === userId ? { ...p, status: 'offline' } : p
            )}
          : c
      ),
    }));
  },

  // Clear chat state
  clearChat: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      typingUsers: {},
      onlineUsers: [],
    });
  },
}));

// Users Store
export const useUsersStore = create((set) => ({
  users: [],
  searchResults: [],

  // Fetch users
  fetchUsers: async (params) => {
    try {
      const response = await usersAPI.getUsers(params);
      set({ users: response.data.data.users });
    } catch (error) {
      console.error('FetchUsers error:', error);
    }
  },

  // Search users
searchUsers: async (query) => {
  try {
    if (!query || query.trim() === '') {
      set({ searchResults: [] });
      return;
    }

    const response = await usersAPI.searchUsers(query);

    set({
      searchResults: response.data.data.users
    });

  } catch (error) {
    console.error('SearchUsers error:', error);
    set({ searchResults: [] });
  }
},

  // Clear search
  clearSearch: () => {
    set({ searchResults: [] });
  },
}));
