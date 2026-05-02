import { create } from 'zustand';
import { authAPI, usersAPI, conversationsAPI, messagesAPI, uploadAPI, blocksAPI, reportsAPI } from '../services/api';
import socketService from '../services/socket';

const getId = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const getConversationIdFromMessage = (message) => getId(message?.conversationId || message?.conversation);
const getMessageSenderId = (message) => getId(message?.sender);
const nowIso = () => new Date().toISOString();

const sortConversations = (conversations) => [...conversations].sort((a, b) => {
  const aTime = new Date(a.updatedAt || a.lastMessage?.createdAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.updatedAt || b.lastMessage?.createdAt || b.createdAt || 0).getTime();
  return bTime - aTime;
});

const buildLastMessage = (message) => ({
  _id: message._id,
  content: message.content,
  type: message.type,
  sender: message.sender,
  createdAt: message.createdAt,
});

const updateUserInParticipants = (participants = [], updatedUser) => participants.map((participant) => (
  getId(participant) === getId(updatedUser)
    ? { ...participant, ...updatedUser }
    : participant
));

const updateMessageSender = (message, updatedUser) => (
  getMessageSenderId(message) === getId(updatedUser)
    ? { ...message, sender: { ...message.sender, ...updatedUser } }
    : message
);

// Auth Store
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  init: () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    try {
      const payload = {
        ...data,
        username: String(data.username || '').trim(),
        email: String(data.email || '').trim().toLowerCase(),
      };
      const response = await authAPI.register(payload);
      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      set({ user, isAuthenticated: true });
      socketService.connect(accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.errors?.[0] || 'خطأ في إنشاء الحساب',
      };
    }
  },

  login: async (data) => {
    try {
      const payload = {
        ...data,
        email: String(data.email || '').trim().toLowerCase(),
      };
      const response = await authAPI.login(payload);
      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      set({ user, isAuthenticated: true });
      socketService.connect(accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.errors?.[0] || 'خطأ في تسجيل الدخول',
      };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('accessToken');
    socketService.disconnect();
    set({ user: null, isAuthenticated: false });
    useChatStore.getState().clearChat();
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const response = await authAPI.getMe();
      const user = response.data.data.user;
      set({ user, isAuthenticated: true });
      const token = localStorage.getItem('accessToken');
      if (token) socketService.connect(token);
    } catch (error) {
      console.error('FetchUser error:', error);
      localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const payload = { ...data };
      if (payload.username !== undefined) payload.username = String(payload.username).trim();
      const response = await authAPI.updateProfile(payload);
      const user = response.data.data.user;
      set({ user });
      useChatStore.getState().updateUserEverywhere(user);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في تحديث الملف الشخصي',
      };
    }
  },

  deleteAccount: async (password) => {
    try {
      await authAPI.deleteAccount({ password });
      localStorage.removeItem('accessToken');
      socketService.disconnect();
      set({ user: null, isAuthenticated: false });
      useChatStore.getState().clearChat();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في حذف الحساب',
      };
    }
  },

  uploadAvatar: async (file) => {
    try {
      const response = await uploadAPI.uploadAvatar(file);
      const avatar = response.data.data.url;
      const result = await get().updateProfile({ avatar });
      if (!result.success) return result;
      return { success: true, url: avatar, user: result.user };
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
  messagesByConversation: {},
  typingUsers: {},
  onlineUsers: [],
  fetchingMessages: {},

  fetchConversations: async () => {
    try {
      const response = await conversationsAPI.getConversations();
      const conversations = response.data.data.conversations || [];
      set({ conversations: sortConversations(conversations) });
      return conversations;
    } catch (error) {
      console.error('FetchConversations error:', error);
      return [];
    }
  },

  setCurrentConversation: (conversation) => {
    const conversationId = getId(conversation);
    const cachedMessages = get().messagesByConversation[conversationId] || [];
    set({
      currentConversation: conversation,
      messages: cachedMessages,
      conversations: get().conversations.map((item) => (
        getId(item) === conversationId ? { ...item, unreadCount: 0 } : item
      )),
    });
  },

  createConversation: async (data) => {
    try {
      const response = await conversationsAPI.createConversation(data);
      const conversation = response.data.data.conversation;
      set((state) => {
        const exists = state.conversations.some((item) => getId(item) === getId(conversation));
        const conversations = exists
          ? state.conversations.map((item) => getId(item) === getId(conversation) ? { ...item, ...conversation } : item)
          : [conversation, ...state.conversations];

        return { conversations: sortConversations(conversations) };
      });
      return { success: true, conversation };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في إنشاء المحادثة',
      };
    }
  },

  fetchMessages: async (conversationId, page = 1, options = {}) => {
    const id = conversationId?.toString();
    if (!id) return [];

    const cached = get().messagesByConversation[id];
    if (page === 1 && cached?.length && !options.force) {
      set({ messages: cached });
    }

    try {
      set((state) => ({ fetchingMessages: { ...state.fetchingMessages, [id]: true } }));
      const response = await messagesAPI.getMessages(id, { page, limit: 50 });
      const { messages } = response.data.data;

      set((state) => {
        const existing = page === 1 ? [] : (state.messagesByConversation[id] || []);
        const merged = [...messages, ...existing].filter((message, index, arr) => (
          arr.findIndex((item) => getId(item) === getId(message)) === index
        ));

        const nextMessagesByConversation = {
          ...state.messagesByConversation,
          [id]: page === 1 ? messages : merged,
        };

        const isCurrent = getId(state.currentConversation) === id;
        return {
          messagesByConversation: nextMessagesByConversation,
          messages: isCurrent ? nextMessagesByConversation[id] : state.messages,
          fetchingMessages: { ...state.fetchingMessages, [id]: false },
        };
      });

      return messages;
    } catch (error) {
      console.error('FetchMessages error:', error);
      set((state) => ({ fetchingMessages: { ...state.fetchingMessages, [id]: false } }));
      return cached || [];
    }
  },

  addOptimisticMessage: ({ conversationId, content = '', type = 'text', mediaUrl = '' }) => {
    const user = useAuthStore.getState().user;
    const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = {
      _id: clientId,
      clientId,
      conversationId,
      sender: user,
      type,
      content,
      mediaUrl,
      readBy: [{ user: user?._id, readAt: nowIso() }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      pending: true,
    };

    get().addMessage(message);
    return clientId;
  },

  addMessage: (message, conversation) => {
    if (!message) return;

    const conversationId = getConversationIdFromMessage(message) || getId(conversation);
    if (!conversationId) return;

    set((state) => {
      const currentMessages = state.messagesByConversation[conversationId] || [];
      const clientId = message.clientId;
      const realId = getId(message);
      const existingIndex = currentMessages.findIndex((item) => (
        (realId && getId(item) === realId) ||
        (clientId && (item.clientId === clientId || getId(item) === clientId))
      ));

      let nextMessages;
      if (existingIndex >= 0) {
        nextMessages = currentMessages.map((item, index) => (
          index === existingIndex ? { ...item, ...message, pending: false } : item
        ));
      } else {
        nextMessages = [...currentMessages, { ...message, pending: false }];
      }

      nextMessages = nextMessages.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      const messagesByConversation = {
        ...state.messagesByConversation,
        [conversationId]: nextMessages,
      };

      const isCurrent = getId(state.currentConversation) === conversationId;
      const currentUserId = useAuthStore.getState().user?._id;
      const isMine = getMessageSenderId(message) === currentUserId;

      const updatedConversations = get().buildConversationsWithMessage(
        state.conversations,
        conversationId,
        message,
        conversation,
        { isCurrent, isMine }
      );

      return {
        messagesByConversation,
        messages: isCurrent ? nextMessages : state.messages,
        conversations: updatedConversations,
        currentConversation: isCurrent && conversation
          ? { ...state.currentConversation, ...conversation, unreadCount: 0 }
          : state.currentConversation,
      };
    });
  },

  confirmMessage: (clientId, message, conversation) => {
    if (!message) return;
    get().addMessage({ ...message, clientId, pending: false }, conversation);
  },

  removeMessage: (messageId) => {
    set((state) => {
      const conversationId = getConversationIdFromMessage(
        state.messages.find((message) => getId(message) === messageId || message.clientId === messageId)
      ) || getId(state.currentConversation);

      if (!conversationId) return state;

      const nextMessages = (state.messagesByConversation[conversationId] || []).filter((message) => (
        getId(message) !== messageId && message.clientId !== messageId
      ));

      const messagesByConversation = {
        ...state.messagesByConversation,
        [conversationId]: nextMessages,
      };

      return {
        messagesByConversation,
        messages: getId(state.currentConversation) === conversationId ? nextMessages : state.messages,
      };
    });
  },

  buildConversationsWithMessage: (conversations, conversationId, message, incomingConversation, options = {}) => {
    const { isCurrent = false, isMine = false } = options;
    const existing = conversations.find((conversation) => getId(conversation) === conversationId);
    const baseConversation = incomingConversation || existing || {
      _id: conversationId,
      type: 'direct',
      name: 'محادثة',
      participants: [],
      unreadCount: 0,
      createdAt: message.createdAt || nowIso(),
    };

    const nextConversation = {
      ...existing,
      ...baseConversation,
      lastMessage: buildLastMessage(message),
      updatedAt: message.createdAt || nowIso(),
      unreadCount: isCurrent || isMine ? 0 : ((existing?.unreadCount || 0) + 1),
    };

    const withoutCurrent = conversations.filter((conversation) => getId(conversation) !== conversationId);
    return sortConversations([nextConversation, ...withoutCurrent]);
  },

  updateConversationWithMessage: (message, conversation) => {
    const conversationId = getConversationIdFromMessage(message) || getId(conversation);
    if (!conversationId) return;

    set((state) => {
      const currentUserId = useAuthStore.getState().user?._id;
      const isMine = getMessageSenderId(message) === currentUserId;
      const isCurrent = getId(state.currentConversation) === conversationId;

      return {
        conversations: get().buildConversationsWithMessage(
          state.conversations,
          conversationId,
          message,
          conversation,
          { isCurrent, isMine }
        ),
      };
    });
  },

  updateMessage: (messageId, updates) => {
    set((state) => {
      const updateList = (list = []) => list.map((message) => {
        if (getId(message) !== messageId) return message;
        const nextUpdates = typeof updates === 'function' ? updates(message) : updates;
        return { ...message, ...nextUpdates };
      });

      const messagesByConversation = Object.fromEntries(
        Object.entries(state.messagesByConversation).map(([conversationId, list]) => [conversationId, updateList(list)])
      );

      return {
        messagesByConversation,
        messages: updateList(state.messages),
      };
    });
  },

  deleteMessage: (messageId, updates = {}) => {
    get().updateMessage(messageId, {
      deleted: true,
      content: updates.content || 'تم حذف هذه الرسالة',
      adminDeleted: Boolean(updates.adminDeleted),
    });
  },

  sendMessage: async (data) => {
    try {
      const response = await messagesAPI.sendMessage(data);
      return {
        success: true,
        message: response.data.data.message,
        conversation: response.data.data.conversation,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في إرسال الرسالة',
      };
    }
  },

  uploadMedia: async (type, file) => {
    try {
      let response;
      if (type === 'image') response = await uploadAPI.uploadImage(file);
      else if (type === 'video') response = await uploadAPI.uploadVideo(file);
      else if (type === 'audio') response = await uploadAPI.uploadAudio(file);
      else throw new Error('نوع الملف غير مدعوم');

      return { success: true, url: response.data.data.url };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'خطأ في رفع الملف',
      };
    }
  },

  markAsRead: async (conversationId) => {
    if (!conversationId) return;
    try {
      set((state) => ({
        conversations: state.conversations.map((conversation) => (
          getId(conversation) === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        )),
        currentConversation: getId(state.currentConversation) === conversationId
          ? { ...state.currentConversation, unreadCount: 0 }
          : state.currentConversation,
      }));
      await conversationsAPI.markAsRead(conversationId);
    } catch (error) {
      console.error('MarkAsRead error:', error);
    }
  },

  setTyping: (conversationId, userId, username) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: { userId, username },
      },
    }));
  },

  clearTyping: (conversationId, userId) => {
    set((state) => {
      const newTyping = { ...state.typingUsers };
      if (newTyping[conversationId]?.userId === userId) delete newTyping[conversationId];
      return { typingUsers: newTyping };
    });
  },

  setOnlineUsers: (users) => {
    set({ onlineUsers: [...new Set(users)] });
  },

  addOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: [...new Set([...state.onlineUsers, userId])],
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants?.map((participant) => (
          getId(participant) === userId ? { ...participant, status: 'online' } : participant
        )),
      })),
    }));
  },

  removeOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants?.map((participant) => (
          getId(participant) === userId ? { ...participant, status: 'offline' } : participant
        )),
      })),
    }));
  },

  updateUserEverywhere: (updatedUser) => {
    if (!updatedUser?._id) return;

    const currentAuthUser = useAuthStore.getState().user;
    if (getId(currentAuthUser) === getId(updatedUser)) {
      useAuthStore.setState({ user: { ...currentAuthUser, ...updatedUser } });
    }

    set((state) => {
      const updateConversation = (conversation) => ({
        ...conversation,
        participants: updateUserInParticipants(conversation.participants, updatedUser),
        avatar: conversation.type === 'direct'
          ? (updateUserInParticipants(conversation.participants, updatedUser)[0]?.avatar || conversation.avatar)
          : conversation.avatar,
      });

      const messagesByConversation = Object.fromEntries(
        Object.entries(state.messagesByConversation).map(([conversationId, list]) => [
          conversationId,
          list.map((message) => updateMessageSender(message, updatedUser)),
        ])
      );

      return {
        conversations: state.conversations.map(updateConversation),
        currentConversation: state.currentConversation
          ? updateConversation(state.currentConversation)
          : state.currentConversation,
        messages: state.messages.map((message) => updateMessageSender(message, updatedUser)),
        messagesByConversation,
      };
    });
  },

  blockUser: async (userId) => {
    try {
      await blocksAPI.blockUser(userId);
      set((state) => ({
        conversations: state.conversations.filter((conversation) => (
          !conversation.participants?.some((participant) => getId(participant) === userId)
        )),
        currentConversation: state.currentConversation?.participants?.some((participant) => getId(participant) === userId)
          ? null
          : state.currentConversation,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'خطأ في حظر المستخدم' };
    }
  },

  reportUser: async ({ reportedUserId, conversationId, messageId, reason, details }) => {
    try {
      await reportsAPI.createReport({ reportedUserId, conversationId, messageId, reason, details });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'خطأ في إرسال البلاغ' };
    }
  },

  removeUserEverywhere: (userId) => {
    if (!userId) return;
    set((state) => ({
      conversations: state.conversations.filter((conversation) => (
        !conversation.participants?.some((participant) => getId(participant) === userId)
      )),
      currentConversation: state.currentConversation?.participants?.some((participant) => getId(participant) === userId)
        ? null
        : state.currentConversation,
      messages: state.messages.filter((message) => getMessageSenderId(message) !== userId),
      messagesByConversation: Object.fromEntries(
        Object.entries(state.messagesByConversation).map(([conversationId, list]) => [
          conversationId,
          list.filter((message) => getMessageSenderId(message) !== userId),
        ])
      ),
    }));
  },

  clearChat: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      messagesByConversation: {},
      typingUsers: {},
      onlineUsers: [],
      fetchingMessages: {},
    });
  },
}));

// Users Store
export const useUsersStore = create((set) => ({
  users: [],
  searchResults: [],

  fetchUsers: async (params) => {
    try {
      const response = await usersAPI.getUsers(params);
      set({ users: response.data.data.users });
    } catch (error) {
      console.error('FetchUsers error:', error);
    }
  },

  searchUsers: async (query) => {
    try {
      if (!query || query.trim() === '') {
        set({ searchResults: [] });
        return;
      }

      const response = await usersAPI.searchUsers(query.trim());
      set({ searchResults: response.data.data.users || [] });
    } catch (error) {
      console.error('SearchUsers error:', error);
      set({ searchResults: [] });
    }
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },
}));


// Theme Store
export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem('theme') || 'dark',
  initTheme: () => {
    const theme = localStorage.getItem('theme') || 'dark';
    set({ theme });
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
}));
