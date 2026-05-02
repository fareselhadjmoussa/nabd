import { useState, useEffect, useRef } from 'react';
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
    addMessage,
    markAsRead,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation._id);
      socketService.joinConversation(currentConversation._id);
      markAsRead(currentConversation._id);
    }

    return () => {
      if (currentConversation) {
        socketService.leaveConversation(currentConversation._id);
      }
    };
  }, [currentConversation?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!currentConversation?._id || !messageText.trim()) return;

    const text = messageText.trim();
    setMessageText('');

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(currentConversation._id);
    }

    clearTimeout(typingTimeoutRef.current);

    const payload = {
      conversationId: currentConversation._id,
      content: text,
      type: 'text',
    };

    // الأفضل الإرسال عبر socket للوقت الحقيقي.
    // إذا لم يكن socket متصلاً، نستخدم API كخطة بديلة حتى لا تضيع الرسالة.
    if (socketService.socket?.connected) {
      socketService.sendMessage(payload);
      return;
    }

    const result = await sendMessage(payload);
    if (result.success) {
      addMessage(result.message);
    } else {
      toast.error(result.message || 'خطأ في إرسال الرسالة');
      setMessageText(text);
    }
  };

  const handleFileSelect = async (type, file) => {
    if (!file) return;

    setShowAttachMenu(false);
    setUploading(true);

    const result = await uploadMedia(type, file);

    if (result.success) {
      const payload = {
        conversationId: currentConversation._id,
        content: '',
        type,
        mediaUrl: result.url,
      };

      if (socketService.socket?.connected) {
        socketService.sendMessage(payload);
      } else {
        const sendResult = await sendMessage(payload);
        if (sendResult.success) {
          addMessage(sendResult.message);
        } else {
          toast.error(sendResult.message || 'خطأ في إرسال الملف');
        }
      }
    } else {
      toast.error(result.message);
    }

    setUploading(false);
    fileInputRef.current.value = '';
  };

  const getOtherParticipants = () => {
    return currentConversation?.participants?.filter((p) => p._id !== user?._id) || [];
  };

  const getTypingUser = () => {
    const typing = Object.values(typingUsers).find(
      (t) => t.userId !== user?._id
    );
    return typing;
  };

  const formatDateHeader = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    return format(messageDate, 'EEEE، d MMMM yyyy', { locale: ar });
  };

  const groupMessagesByDate = (messages) => {
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
  };

  const renderMessageGroups = () => {
    const groups = groupMessagesByDate(messages);

    return groups.map((group, index) => {
      if (group.type === 'date') {
        return (
          <div key={`date-${index}`} className="flex justify-center my-4">
            <span className="bg-dark-100 text-gray-400 text-xs px-3 py-1 rounded-full">
              {formatDateHeader(group.date)}
            </span>
          </div>
        );
      }

      const message = group.message;
      const isSent = message.sender?._id === user?._id;
      const nextMessage = groups[index + 1]?.type === 'message' ? groups[index + 1].message : null;
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
  };

  const typingUser = getTypingUser();

  return (
    <div className="flex-1 flex flex-col bg-dark-300">
      {/* Header */}
      <div className="h-16 bg-dark-200 border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
            {getOtherParticipants()[0]?.username?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="text-white font-medium">
              {currentConversation?.name || getOtherParticipants()[0]?.username}
            </h3>
            {typingUser ? (
              <p className="text-xs text-gray-400">{typingUser.username} يكتب...</p>
            ) : (
              <p className="text-xs text-gray-400">
                {getOtherParticipants()[0]?.status === 'online' ? 'متصل' : 'غير متصل'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 chat-messages">
        {renderMessageGroups()}
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

      {/* Attach Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-20 right-4 bg-dark-200 rounded-xl shadow-xl p-2 z-10">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-dark-100 rounded-lg text-white"
          >
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>صورة</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-dark-100 rounded-lg text-white"
          >
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>فيديو</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-dark-100 rounded-lg text-white"
          >
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>رسالة صوتية</span>
          </button>
        </div>
      )}

      {/* Hidden File Input */}
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

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-dark-200 border-t border-gray-700">
        <div className="flex items-center gap-2">
          {/* Attach Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a.5.5 0 01.707 0 .5.5 0 010 .707l-6.415 6.414a2 2 0 01-2.828 0 .5.5 0 010-.707L9.172 8a.5.5 0 010-.707l6.414-6.414a.5.5 0 01.586 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
            </svg>
          </button>

          {/* Message Input */}
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

          {/* Send Button */}
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
