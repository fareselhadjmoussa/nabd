import { create } from 'zustand';
import { authAPI, usersAPI, conversationsAPI, messagesAPI, uploadAPI } from '../services/api';
import socketService from '../services/socket';

const getId = (value) => {
  if (!value) return '';
  if (value._id) return value._id.toString();
  return value.toString();
};

const getConversationTime = (conversation) => {
  const date = conversation?.lastMessageTime || conversation?.updatedAt || conversation?.createdAt;
  return date ? new Date(date).getTime() : 0;
};

const sortConversations = (conversations) => {
  return [...conversations].sort((a, b) => getConversationTime(b) - getConversationTime(a));
};

const normalizeUnreadCount = (conversation) => {
  if (!conversation) return conversation;

  // Mongo Map may arrive as object. Keep it unchanged for backend compatibility,
  // but ensure Sidebar can still receive a numeric unreadCount when backend sends one.
  return conversation;
};

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
    get().clearAuthLoading?.();
  },

  clearAuthLoading: () => set({ isLoading: false }),

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
      const conversations = response.data.data.conversations || [];
      set({ conversations: sortConversations(conversations.map(normalizeUnreadCount)) });
      return conversations;
    } catch (error) {
      console.error('FetchConversations error:', error);
      return [];
    }
  },

  // Insert or update a conversation in the sidebar
  upsertConversation: (conversation) => {
    if (!conversation?._id) return;

    set((state) => {
      const normalized = normalizeUnreadCount(conversation);
      const exists = state.conversations.some((item) => item._id === normalized._id);
      const conversations = exists
        ? state.conversations.map((item) => (item._id === normalized._id ? { ...item, ...normalized } : item))
        : [normalized, ...state.conversations];

      const currentConversation = state.currentConversation?._id === normalized._id
        ? { ...state.currentConversation, ...normalized }
        : state.currentConversation;

      return {
        conversations: sortConversations(conversations),
        currentConversation,
      };
    });
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
      get().upsertConversation(conversation);
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
        set((state) => {
          const existingIds = new Set(state.messages.map((message) => message._id));
          const newMessages = messages.filter((message) => !existingIds.has(message._id));
          return { messages: [...newMessages, ...state.messages] };
        });
      }

      return messages;
    } catch (error) {
      console.error('FetchMessages error:', error);
      return [];
    }
  },

  // Add message without duplicates
  addMessage: (message) => {
    if (!message?._id) return;

    set((state) => {
      if (state.messages.some((item) => item._id === message._id)) {
        return state;
      }

      const messages = [...state.messages, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      return { messages };
    });
  },

  // Update message
  updateMessage: (messageId, updates) => {
    if (!messageId) return;

    set((state) => ({
      messages: state.messages.map((message) =>
        message._id === messageId ? { ...message, ...updates } : message
      ),
    }));
  },

  // Mark one message, or all current messages, as read by a user
  markMessageRead: (messageId, userId) => {
    if (!userId) return;

    set((state) => ({
      messages: state.messages.map((message) => {
        if (messageId && message._id !== messageId) return message;

        const readBy = Array.isArray(message.readBy) ? message.readBy : [];
        const alreadyRead = readBy.some((entry) => getId(entry.user || entry) === getId(userId));
        if (alreadyRead) return message;

        return {
          ...message,
          readBy: [...readBy, { user: userId, readAt: new Date().toISOString() }],
        };
      }),
    }));
  },

  // Delete message locally
  deleteMessage: (messageId) => {
    if (!messageId) return;

    set((state) => ({
      messages: state.messages.map((message) =>
        message._id === messageId
          ? { ...message, deleted: true, content: 'تم حذف هذه الرسالة', mediaUrl: '' }
          : message
      ),
    }));
  },

  // Send message via API, used as a fallback when Socket is not connected
  sendMessage: async (data) => {
    try {
      const response = await messagesAPI.sendMessage(data);
      const payload = response.data.data;

      if (payload?.conversation) {
        get().upsertConversation(payload.conversation);
      }

      if (payload?.message) {
        const currentConversationId = getId(get().currentConversation?._id);
        const messageConversationId = getId(payload.conversationId || payload.message.conversationId);
        if (currentConversationId && currentConversationId === messageConversationId) {
          get().addMessage(payload.message);
        }
      }

      return { success: true, message: payload.message, conversation: payload.conversation };
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

      if (!response) {
        return { success: false, message: 'نوع الملف غير مدعوم' };
      }

      return { success: true, url: response.data.data.url };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في رفع الملف',
      };
    }
  },

  // Mark conversation as read
  markAsRead: async (conversationId) => {
    try {
      await conversationsAPI.markAsRead(conversationId);
      set((state) => ({
        conversations: state.conversations.map((conversation) =>
          conversation._id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
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
    set({ onlineUsers: Array.from(new Set(users || [])) });
  },

  // Add online user
  addOnlineUser: (userId) => {
    if (!userId) return;

    set((state) => ({
      onlineUsers: Array.from(new Set([...state.onlineUsers, userId])),
      conversations: state.conversations.map((conversation) =>
        conversation.participants?.some((participant) => getId(participant) === getId(userId))
          ? {
              ...conversation,
              participants: conversation.participants.map((participant) =>
                getId(participant) === getId(userId) ? { ...participant, status: 'online' } : participant
              ),
            }
          : conversation
      ),
    }));
  },

  // Remove online user
  removeOnlineUser: (userId) => {
    if (!userId) return;

    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => getId(id) !== getId(userId)),
      conversations: state.conversations.map((conversation) =>
        conversation.participants?.some((participant) => getId(participant) === getId(userId))
          ? {
              ...conversation,
              participants: conversation.participants.map((participant) =>
                getId(participant) === getId(userId) ? { ...participant, status: 'offline' } : participant
              ),
            }
          : conversation
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
      set({ users: response.data.data.users || [] });
    } catch (error) {
      console.error('FetchUsers error:', error);
    }
  },

  // Search users
  searchUsers: async (query) => {
    try {
      if (!query || query.trim() === '') {
        set({ searchResults: [] });
        return [];
      }

      const response = await usersAPI.searchUsers(query.trim());
      const users = response.data.data.users || [];
      set({ searchResults: users });
      return users;
    } catch (error) {
      console.error('SearchUsers error:', error);
      set({ searchResults: [] });
      return [];
    }
  },

  // Clear search
  clearSearch: () => {
    set({ searchResults: [] });
  },
}));
