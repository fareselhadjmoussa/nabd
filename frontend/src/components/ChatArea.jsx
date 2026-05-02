import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuthStore, useChatStore } from '../stores';
import socketService from '../services/socket';
import Message from './Message';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'react-toastify';

function ChatArea() {
  const { user } = useAuthStore();
  const {
    currentConversation,
    messages,
    typingUsers,
    fetchMessages,
    sendMessage,
    uploadMedia,
    addOptimisticMessage,
    confirmMessage,
    removeMessage,
    markAsRead,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const previousConversationRef = useRef(null);

  useEffect(() => {
    const conversationId = currentConversation?._id;
    if (!conversationId) return undefined;

    let cancelled = false;
    setLoadingMessages(true);
    fetchMessages(conversationId).finally(() => {
      if (!cancelled) setLoadingMessages(false);
    });

    socketService.joinConversation(conversationId);
    markAsRead(conversationId);

    return () => {
      cancelled = true;
      socketService.leaveConversation(conversationId);
    };
  }, [currentConversation?._id]);

  useEffect(() => {
    const behavior = previousConversationRef.current === currentConversation?._id ? 'smooth' : 'auto';
    previousConversationRef.current = currentConversation?._id;
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages.length, currentConversation?._id]);

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  const getOtherParticipants = useCallback(() => (
    currentConversation?.participants?.filter((participant) => participant?._id !== user?._id) || []
  ), [currentConversation?.participants, user?._id]);

  const otherParticipant = getOtherParticipants()[0];

  const typingUser = useMemo(() => {
    const conversationTyping = typingUsers[currentConversation?._id];
    return conversationTyping?.userId !== user?._id ? conversationTyping : null;
  }, [typingUsers, currentConversation?._id, user?._id]);

  const formatDateHeader = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    return format(messageDate, 'EEEE، d MMMM yyyy', { locale: ar });
  };

  const messageGroups = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ type: 'date', date: message.createdAt });
      }
      groups.push({ type: 'message', message });
    });

    return groups;
  }, [messages]);

  const stopTyping = useCallback(() => {
    if (!currentConversation?._id) return;
    setIsTyping(false);
    socketService.stopTyping(currentConversation._id);
    clearTimeout(typingTimeoutRef.current);
  }, [currentConversation?._id]);

  const handleTyping = () => {
    if (!currentConversation?._id) return;

    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(currentConversation._id);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(currentConversation._id);
    }, 1200);
  };

  const sendPayload = async (payload, restoreText = '') => {
    const clientId = addOptimisticMessage(payload);
    const payloadWithClientId = { ...payload, clientId };

    if (socketService.isConnected()) {
      const sent = socketService.sendMessage(payloadWithClientId);
      if (sent) return;
    }

    const result = await sendMessage(payloadWithClientId);
    if (result.success) {
      confirmMessage(clientId, result.message, result.conversation);
    } else {
      removeMessage(clientId);
      if (restoreText) setMessageText(restoreText);
      toast.error(result.message || 'خطأ في إرسال الرسالة');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentConversation?._id || !messageText.trim()) return;

    const text = messageText.trim();
    setMessageText('');
    if (isTyping) stopTyping();

    await sendPayload({
      conversationId: currentConversation._id,
      content: text,
      type: 'text',
    }, text);
  };

  const handleFileSelect = async (type, file) => {
    if (!file || !currentConversation?._id) return;

    setShowAttachMenu(false);
    setUploading(true);

    const result = await uploadMedia(type, file);

    if (result.success) {
      await sendPayload({
        conversationId: currentConversation._id,
        content: '',
        type,
        mediaUrl: result.url,
      });
    } else {
      toast.error(result.message);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderMessageGroups = () => messageGroups.map((group, index) => {
    if (group.type === 'date') {
      return (
        <div key={`date-${group.date}-${index}`} className="flex justify-center my-4">
          <span className="bg-dark-100 text-gray-400 text-xs px-3 py-1 rounded-full">
            {formatDateHeader(group.date)}
          </span>
        </div>
      );
    }

    const message = group.message;
    const isSent = message.sender?._id === user?._id;
    const nextMessage = messageGroups[index + 1]?.type === 'message' ? messageGroups[index + 1].message : null;
    const showAvatar = !nextMessage || nextMessage.sender?._id !== message.sender?._id;

    return (
      <Message
        key={message._id}
        message={message}
        isSent={isSent}
        showAvatar={showAvatar}
      />
    );
  });

  const renderAvatar = (participant) => {
    if (participant?.avatar) {
      return (
        <img
          src={participant.avatar}
          alt={participant.username || 'avatar'}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
        {participant?.username?.charAt(0) || '?'}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-300">
      <div className="h-16 bg-dark-200 border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center gap-3">
          {renderAvatar(otherParticipant)}
          <div>
            <h3 className="text-white font-medium">
              {currentConversation?.name || otherParticipant?.username || 'محادثة'}
            </h3>
            {typingUser ? (
              <p className="text-xs text-gray-400">{typingUser.username} يكتب...</p>
            ) : (
              <p className="text-xs text-gray-400">
                {otherParticipant?.status === 'online' ? 'متصل' : 'غير متصل'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 chat-messages">
        {loadingMessages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            جاري تحميل الرسائل...
          </div>
        ) : (
          renderMessageGroups()
        )}

        {typingUser && (
          <div className="flex items-center gap-2 mt-2">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-xs text-gray-400">{typingUser.username} يكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showAttachMenu && (
        <div className="absolute bottom-20 right-4 bg-dark-200 rounded-xl shadow-xl p-2 z-10">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-dark-100 rounded-lg text-white"
          >
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>صورة / فيديو / صوت</span>
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;

          let type = 'image';
          if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'audio';

          handleFileSelect(type, file);
        }}
      />

      <form onSubmit={handleSendMessage} className="p-4 bg-dark-200 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-white"
            disabled={uploading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a.5.5 0 01.707 0 .5.5 0 010 .707l-6.415 6.414a2 2 0 01-2.828 0 .5.5 0 010-.707L9.172 8a.5.5 0 010-.707l6.414-6.414a.5.5 0 01.586 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
            </svg>
          </button>

          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-dark-100 border border-gray-700 rounded-full px-4 py-2 text-white focus:border-primary-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!messageText.trim() || uploading}
            className="p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors text-white"
          >
            {uploading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatArea;
