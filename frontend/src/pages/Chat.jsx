import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useChatStore } from '../stores';
import socketService from '../services/socket';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import UserProfile from '../components/UserProfile';
import NewChat from '../components/NewChat';
import BrandLogo from '../components/BrandLogo';
import { toast } from 'react-toastify';

function Chat() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    fetchConversations,
    currentConversation,
    setCurrentConversation,
    addMessage,
    confirmMessage,
    removeMessage,
    updateMessage,
    deleteMessage,
    setTyping,
    clearTyping,
    addOnlineUser,
    removeOnlineUser,
    setOnlineUsers,
    markAsRead,
    removeUserEverywhere,
    updateUserEverywhere,
  } = useChatStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const currentConversationRef = useRef(currentConversation);
  const userRef = useRef(user);
  const readTimersRef = useRef({});

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    fetchConversations();

    const scheduleMarkAsRead = (conversationId) => {
      if (!conversationId) return;
      clearTimeout(readTimersRef.current[conversationId]);
      readTimersRef.current[conversationId] = setTimeout(() => {
        markAsRead(conversationId);
      }, 350);
    };

    const handleNewMessage = ({ message, conversationId, conversation }) => {
      addMessage(message, conversation);

      const activeConversationId = currentConversationRef.current?._id;
      const currentUserId = userRef.current?._id;
      const senderId = message?.sender?._id || message?.sender;

      if (activeConversationId === conversationId && senderId !== currentUserId) {
        scheduleMarkAsRead(conversationId);
      }
    };

    const handleMessageSent = ({ message, conversationId, conversation }) => {
      if (message?.clientId) {
        confirmMessage(message.clientId, message, conversation);
      } else {
        addMessage(message, conversation);
      }

      if (currentConversationRef.current?._id === conversationId) {
        scheduleMarkAsRead(conversationId);
      }
    };

    const handleSocketError = ({ message, clientId }) => {
      if (clientId) removeMessage(clientId);
      if (message) toast.error(message);
    };

    const handleMessageRead = ({ messageId, userId }) => {
      updateMessage(messageId, (message) => ({
        readBy: [...(message.readBy || []), { user: userId, readAt: new Date() }],
      }));
    };

    const handleMessageDeleted = ({ messageId, content, deletedByAdmin }) => {
      deleteMessage(messageId, {
        content: content || (deletedByAdmin ? 'تم حذف هذه الرسالة بواسطة الإدارة' : 'تم حذف هذه الرسالة'),
        adminDeleted: Boolean(deletedByAdmin),
      });
    };

    const handleReactionAdded = ({ message }) => {
      updateMessage(message._id, { reactions: message.reactions });
    };

    const handleUserTyping = ({ conversationId, userId, username }) => {
      if (currentConversationRef.current?._id === conversationId) {
        setTyping(conversationId, userId, username);
      }
    };

    const handleUserStopTyping = ({ conversationId, userId }) => {
      clearTyping(conversationId, userId);
    };

    const handleUserOnline = ({ userId }) => addOnlineUser(userId);
    const handleUserOffline = ({ userId }) => removeOnlineUser(userId);
    const handleOnlineUsersList = ({ users }) => setOnlineUsers(users);
    const handleUserProfileUpdated = ({ user: updatedUser }) => updateUserEverywhere(updatedUser);
    const handleUserDeleted = ({ userId }) => removeUserEverywhere(userId);
    const handleAccountBanned = ({ message }) => {
      toast.error(message || 'تم حظر حسابك');
      logout().finally(() => navigate('/login'));
    };

    socketService.on('newMessage', handleNewMessage);
    socketService.on('messageSent', handleMessageSent);
    socketService.on('error', handleSocketError);
    socketService.on('messageRead', handleMessageRead);
    socketService.on('messageDeleted', handleMessageDeleted);
    socketService.on('reactionAdded', handleReactionAdded);
    socketService.on('userTyping', handleUserTyping);
    socketService.on('userStopTyping', handleUserStopTyping);
    socketService.on('userOnline', handleUserOnline);
    socketService.on('userOffline', handleUserOffline);
    socketService.on('onlineUsersList', handleOnlineUsersList);
    socketService.on('userProfileUpdated', handleUserProfileUpdated);
    socketService.on('userDeleted', handleUserDeleted);
    socketService.on('accountBanned', handleAccountBanned);

    socketService.getOnlineUsers();

    return () => {
      Object.values(readTimersRef.current).forEach(clearTimeout);
      socketService.off('newMessage', handleNewMessage);
      socketService.off('messageSent', handleMessageSent);
      socketService.off('error', handleSocketError);
      socketService.off('messageRead', handleMessageRead);
      socketService.off('messageDeleted', handleMessageDeleted);
      socketService.off('reactionAdded', handleReactionAdded);
      socketService.off('userTyping', handleUserTyping);
      socketService.off('userStopTyping', handleUserStopTyping);
      socketService.off('userOnline', handleUserOnline);
      socketService.off('userOffline', handleUserOffline);
      socketService.off('onlineUsersList', handleOnlineUsersList);
      socketService.off('userProfileUpdated', handleUserProfileUpdated);
      socketService.off('userDeleted', handleUserDeleted);
      socketService.off('accountBanned', handleAccountBanned);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleConversationSelect = (conversation) => {
    setCurrentConversation(conversation);
  };

  return (
    <div className="h-screen flex bg-dark-300">
      <Sidebar
        onNewChat={() => setShowNewChat(true)}
        onProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
        onConversationSelect={handleConversationSelect}
      />

      {currentConversation ? (
        <ChatArea />
      ) : (
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-dark-300 professional-chat-bg px-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute right-1/4 top-16 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="absolute bottom-12 left-1/4 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
          </div>
          <div className="relative max-w-lg rounded-[2.5rem] border border-white/10 bg-white/[.04] p-10 text-center shadow-2xl backdrop-blur">
            <div className="mb-6 flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <h2 className="text-3xl font-black text-white">مرحباً {user?.username}</h2>
            <p className="mt-3 leading-8 text-gray-400">اختر محادثة من القائمة أو ابدأ محادثة جديدة. الواجهة الآن أخف وأنظف، بدون محتوى بصري زائد يبطّئ الصفحة.</p>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="mt-7 rounded-2xl bg-cyan-300 px-6 py-3 font-black text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              محادثة جديدة
            </button>
          </div>
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      {showNewChat && (
        <NewChat onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
}

export default Chat;
