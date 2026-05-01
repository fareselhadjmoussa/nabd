import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuthStore, useChatStore } from '../stores';
import socketService from '../services/socket';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import UserProfile from '../components/UserProfile';
import NewChat from '../components/NewChat';
import { toast } from 'react-toastify';

function Chat() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    fetchConversations,
    currentConversation,
    setCurrentConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    setTyping,
    clearTyping,
    addOnlineUser,
    removeOnlineUser,
    setOnlineUsers,
    markAsRead,
  } = useChatStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    // Fetch conversations on mount
    fetchConversations();

    // Set up socket listeners
    setupSocketListeners();

    // Update status when leaving
    return () => {
      socketService.off('newMessage');
      socketService.off('messageSent');
      socketService.off('messageRead');
      socketService.off('messageDeleted');
      socketService.off('reactionAdded');
      socketService.off('userTyping');
      socketService.off('userStopTyping');
      socketService.off('userOnline');
      socketService.off('userOffline');
      socketService.off('messagesRead');
    };
  }, []);

  const setupSocketListeners = () => {
    // New message
    socketService.on('newMessage', ({ message, conversationId }) => {
      addMessage(message);

      // If this is the current conversation, mark as read
      if (currentConversation?._id === conversationId) {
        markAsRead(conversationId);
      }
    });

    // Message sent confirmation
    socketService.on('messageSent', ({ message }) => {
      // Message already added via newMessage
    });

    // Message read
    socketService.on('messageRead', ({ messageId, userId }) => {
      updateMessage(messageId, {
        readBy: [...(updateMessage._readBy || []), { user: userId, readAt: new Date() }],
      });
    });

    // Message deleted
    socketService.on('messageDeleted', ({ messageId }) => {
      deleteMessage(messageId);
    });

    // Reaction added
    socketService.on('reactionAdded', ({ message }) => {
      updateMessage(message._id, { reactions: message.reactions });
    });

    // User typing
    socketService.on('userTyping', ({ conversationId, userId, username }) => {
      if (currentConversation?._id === conversationId) {
        setTyping(conversationId, userId, username);
      }
    });

    // User stop typing
    socketService.on('userStopTyping', ({ conversationId, userId }) => {
      clearTyping(conversationId, userId);
    });

    // User online
    socketService.on('userOnline', ({ userId }) => {
      addOnlineUser(userId);
    });

    // User offline
    socketService.on('userOffline', ({ userId }) => {
      removeOnlineUser(userId);
    });

    // Messages read
    socketService.on('messagesRead', ({ conversationId, userId }) => {
      // Update all messages as read
    });

    // Online users list
    socketService.on('onlineUsersList', ({ users }) => {
      setOnlineUsers(users);
    });

    // Request online users
    socketService.getOnlineUsers();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleConversationSelect = (conversation) => {
    setCurrentConversation(conversation);
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  return (
    <div className="h-screen flex bg-dark-300">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        onProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
        onConversationSelect={handleConversationSelect}
      />

      {/* Chat Area */}
      {currentConversation ? (
        <ChatArea />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-dark-300">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">مرحباً {user?.username}</h2>
            <p className="text-gray-400">اختر محادثة للبدء أو ابدأ محادثة جديدة</p>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChat onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
}

export default Chat;
