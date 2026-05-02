import { io } from 'socket.io-client';

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

const getDefaultSocketUrl = () => {
  if (!isBrowser) return 'http://localhost:5000';

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:5000`;
};

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;

  if (envUrl && !shouldReplaceLocalhostEnv(envUrl)) {
    return normalizeUrl(envUrl);
  }

  return getDefaultSocketUrl();
};

const SOCKET_URL = getSocketUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (!token) {
      console.warn('Socket connection skipped: missing token');
      return;
    }

    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 3500,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.connected = true;
      this.getOnlineUsers();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.connected = false;
    });

    // Attach existing listeners immediately. Previously listeners were only
    // attached when the socket was already connected, which made some users
    // miss newMessage events while the connection was still opening.
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.off(event, callback);
        this.socket.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }

    console.warn(`Socket is not connected. Event not sent: ${event}`);
    return false;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks.includes(callback)) callbacks.push(callback);

    // Attach to the socket even if it is still connecting.
    if (this.socket) {
      this.socket.off(event, callback);
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) this.socket.off(event, callback);
      else this.socket.off(event);
    }

    if (!this.listeners.has(event)) return;

    if (callback) {
      const filtered = this.listeners.get(event).filter((savedCallback) => savedCallback !== callback);
      if (filtered.length) this.listeners.set(event, filtered);
      else this.listeners.delete(event);
    } else {
      this.listeners.delete(event);
    }
  }

  joinConversation(conversationId) {
    return this.emit('joinConversation', { conversationId });
  }

  leaveConversation(conversationId) {
    return this.emit('leaveConversation', { conversationId });
  }

  sendMessage(data) {
    return this.emit('sendMessage', data);
  }

  startTyping(conversationId) {
    return this.emit('typingStart', { conversationId });
  }

  stopTyping(conversationId) {
    return this.emit('typingStop', { conversationId });
  }

  markRead(conversationId, messageId) {
    return this.emit('markRead', { conversationId, messageId });
  }

  addReaction(messageId, emoji) {
    return this.emit('addReaction', { messageId, emoji });
  }

  deleteMessage(messageId) {
    return this.emit('deleteMessage', { messageId });
  }

  directMessage(recipientId, content) {
    return this.emit('directMessage', { recipientId, content });
  }

  getOnlineUsers() {
    return this.emit('getOnlineUsers');
  }

  isConnected() {
    return Boolean(this.socket?.connected && this.connected);
  }
}

const socketService = new SocketService();
export default socketService;
