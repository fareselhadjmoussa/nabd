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

  /**
   * Connect to socket server
   * @param {string} token - JWT token for authentication
   */
  connect(token) {
    if (!token) {
      console.warn('Socket connection skipped: missing token');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.connected = false;
    });

    // Re-emit stored listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }

    console.warn(`Socket is not connected. Event not sent: ${event}`);
    return false;
  }

  /**
   * Listen to event from server
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks.includes(callback)) {
      callbacks.push(callback);
    }

    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    if (!this.listeners.has(event)) return;

    if (callback) {
      this.listeners.set(
        event,
        this.listeners.get(event).filter((savedCallback) => savedCallback !== callback)
      );
    } else {
      this.listeners.delete(event);
    }
  }

  /**
   * Join conversation room
   * @param {string} conversationId
   */
  joinConversation(conversationId) {
    this.emit('joinConversation', { conversationId });
  }

  /**
   * Leave conversation room
   * @param {string} conversationId
   */
  leaveConversation(conversationId) {
    this.emit('leaveConversation', { conversationId });
  }

  /**
   * Send message
   * @param {object} data - Message data
   */
  sendMessage(data) {
    this.emit('sendMessage', data);
  }

  /**
   * Start typing
   * @param {string} conversationId
   */
  startTyping(conversationId) {
    this.emit('typingStart', { conversationId });
  }

  /**
   * Stop typing
   * @param {string} conversationId
   */
  stopTyping(conversationId) {
    this.emit('typingStop', { conversationId });
  }

  /**
   * Mark message as read
   * @param {string} conversationId
   * @param {string} messageId
   */
  markRead(conversationId, messageId) {
    this.emit('markRead', { conversationId, messageId });
  }

  /**
   * Add reaction to message
   * @param {string} messageId
   * @param {string} emoji
   */
  addReaction(messageId, emoji) {
    this.emit('addReaction', { messageId, emoji });
  }

  /**
   * Delete message
   * @param {string} messageId
   */
  deleteMessage(messageId) {
    this.emit('deleteMessage', { messageId });
  }

  /**
   * Send direct message
   * @param {string} recipientId
   * @param {string} content
   */
  directMessage(recipientId, content) {
    this.emit('directMessage', { recipientId, content });
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    this.emit('getOnlineUsers');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
