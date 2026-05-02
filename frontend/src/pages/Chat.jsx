import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useChatStore } from '../stores';
import socketService from '../services/socket';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import UserProfile from '../components/UserProfile';
import NewChat from '../components/NewChat';

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
    markMessageRead,
    upsertConversation,
  } = useChatStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const currentConversationRef = useRef(currentConversation);

  const getId = (value) => {
    if (!value) return '';
    if (value._id) return value._id.toString();
    return value.toString();
  };

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    fetchConversations();

    const handleNewMessage = ({ message, conversationId, conversation }) => {
      const targetConversationId = getId(conversationId || message?.conversationId || conversation?._id);
      const activeConversationId = getId(currentConversationRef.current?._id);

      if (conversation) {
        upsertConversation(conversation);
      } else {
        fetchConversations();
      }

      // Add the message only when it belongs to the currently opened conversation.
      // Otherwise, keep it out of the open chat and update only the sidebar/unread count.
      if (activeConversationId && targetConversationId === activeConversationId) {
        addMessage(message);
        markAsRead(targetConversationId);
      }
    };

    const handleMessageSent = ({ message, conversationId, conversation }) => {
      const targetConversationId = getId(conversationId || message?.conversationId || conversation?._id);
      const activeConversationId = getId(currentConversationRef.current?._id);

      if (conversation) {
        upsertConversation(conversation);
      } else {
        fetchConversations();
      }

      if (activeConversationId && targetConversationId === activeConversationId) {
        addMessage(message);
      }
    };

    const handleMessageRead = ({ messageId, userId }) => {
      markMessageRead(messageId, userId);
    };

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      deleteMessage(messageId);
      fetchConversations();
    };

    const handleReactionAdded = ({ message }) => {
      updateMessage(message._id, { reactions: message.reactions });
    };

    const handleUserTyping = ({ conversationId, userId, username }) => {
      if (getId(currentConversationRef.current?._id) === getId(conversationId)) {
        setTyping(conversationId, userId, username);
      }
    };

    const handleUserStopTyping = ({ conversationId, userId }) => {
      clearTyping(conversationId, userId);
    };

    const handleUserOnline = ({ userId }) => {
      addOnlineUser(userId);
    };

    const handleUserOffline = ({ userId }) => {
      removeOnlineUser(userId);
    };

    const handleMessagesRead = ({ conversationId, userId }) => {
      // Update the open conversation read status locally when possible.
      if (getId(currentConversationRef.current?._id) === getId(conversationId)) {
        markMessageRead(null, userId);
      }
      fetchConversations();
    };

    const handleOnlineUsersList = ({ users }) => {
      setOnlineUsers(users);
    };

    socketService.on('newMessage', handleNewMessage);
    socketService.on('messageSent', handleMessageSent);
    socketService.on('messageRead', handleMessageRead);
    socketService.on('messageDeleted', handleMessageDeleted);
    socketService.on('reactionAdded', handleReactionAdded);
    socketService.on('userTyping', handleUserTyping);
    socketService.on('userStopTyping', handleUserStopTyping);
    socketService.on('userOnline', handleUserOnline);
    socketService.on('userOffline', handleUserOffline);
    socketService.on('messagesRead', handleMessagesRead);
    socketService.on('onlineUsersList', handleOnlineUsersList);

    socketService.getOnlineUsers();

    return () => {
      socketService.off('newMessage', handleNewMessage);
      socketService.off('messageSent', handleMessageSent);
      socketService.off('messageRead', handleMessageRead);
      socketService.off('messageDeleted', handleMessageDeleted);
      socketService.off('reactionAdded', handleReactionAdded);
      socketService.off('userTyping', handleUserTyping);
      socketService.off('userStopTyping', handleUserStopTyping);
      socketService.off('userOnline', handleUserOnline);
      socketService.off('userOffline', handleUserOffline);
      socketService.off('messagesRead', handleMessagesRead);
      socketService.off('onlineUsersList', handleOnlineUsersList);
    };
  }, [
    fetchConversations,
    addMessage,
    updateMessage,
    deleteMessage,
    setTyping,
    clearTyping,
    addOnlineUser,
    removeOnlineUser,
    setOnlineUsers,
    markAsRead,
    markMessageRead,
    upsertConversation,
  ]);

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
