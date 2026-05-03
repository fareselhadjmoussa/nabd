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
    blockUser,
    reportUser,
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

    await sendPayload({ conversationId: currentConversation._id, content: text, type: 'text' }, text);
  };

  const handleReportUser = async () => {
    if (!otherParticipant?._id || !currentConversation?._id) return;

    const details = prompt('اكتب سبب البلاغ باختصار');
    if (details === null) return;

    const result = await reportUser({ reportedUserId: otherParticipant._id, conversationId: currentConversation._id, reason: 'other', details });

    if (result.success) toast.success('تم إرسال البلاغ للإدارة');
    else toast.error(result.message);
  };

  const handleBlockUser = async () => {
    if (!otherParticipant?._id) return;
    if (!confirm(`هل تريد حظر ${otherParticipant.username}؟ لن يستطيع مراسلتك بعد ذلك.`)) return;

    const result = await blockUser(otherParticipant._id);
    if (result.success) toast.success('تم حظر المستخدم');
    else toast.error(result.message);
  };

  const handleFileSelect = async (type, file) => {
    if (!file || !currentConversation?._id) return;

    setShowAttachMenu(false);
    setUploading(true);

    const result = await uploadMedia(type, file);

    if (result.success) {
      await sendPayload({ conversationId: currentConversation._id, content: '', type, mediaUrl: result.url });
    } else {
      toast.error(result.message);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderAvatar = (participant, size = 'md') => {
    const classes = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-2xl';

    if (participant?.avatar) {
      return <img src={participant.avatar} alt={participant.username || 'avatar'} className={`${classes} object-cover ring-1 ring-white/10`} />;
    }

    return (
      <div className={`${classes} grid place-items-center bg-gradient-to-br from-cyan-300 to-emerald-300 font-black text-slate-950`}>
        {participant?.username?.charAt(0) || '?'}
      </div>
    );
  };

  const renderMessageGroups = () => messageGroups.map((group, index) => {
    if (group.type === 'date') {
      return (
        <div key={`date-${group.date}-${index}`} className="flex justify-center my-5">
          <span className="rounded-full border border-white/10 bg-dark-200/80 px-4 py-1.5 text-xs text-gray-400 shadow-sm backdrop-blur">
            {formatDateHeader(group.date)}
          </span>
        </div>
      );
    }

    const message = group.message;
    const isSent = message.sender?._id === user?._id;
    const nextMessage = messageGroups[index + 1]?.type === 'message' ? messageGroups[index + 1].message : null;
    const showAvatar = !nextMessage || nextMessage.sender?._id !== message.sender?._id;

    return <Message key={message._id} message={message} isSent={isSent} showAvatar={showAvatar} />;
  });

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-dark-300 professional-chat-bg">
      <header className="z-10 flex min-h-[76px] items-center border-b border-white/10 bg-dark-200/90 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            {renderAvatar(otherParticipant, 'lg')}
            {otherParticipant?.status === 'online' && <span className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full border-2 border-dark-200 bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.7)]" />}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-black text-white">
              {currentConversation?.name || otherParticipant?.username || 'محادثة'}
            </h3>
            {typingUser ? (
              <p className="text-xs text-cyan-200">{typingUser.username} يكتب الآن...</p>
            ) : (
              <p className="text-xs text-gray-400">{otherParticipant?.status === 'online' ? 'متصل الآن' : 'غير متصل'}</p>
            )}
          </div>
        </div>
        {otherParticipant && (
          <div className="flex items-center gap-2">
            <button onClick={handleReportUser} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 transition hover:bg-white/10 hover:text-white">
              إبلاغ
            </button>
            <button onClick={handleBlockUser} className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500 hover:text-white">
              حظر
            </button>
          </div>
        )}
      </header>

      <section className="relative flex-1 overflow-y-auto px-4 py-5 chat-messages md:px-8">
        {loadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-3xl border border-white/10 bg-white/[.04] px-6 py-5 text-center text-gray-400 backdrop-blur">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
              جاري تحميل الرسائل...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-sm rounded-[2rem] border border-white/10 bg-white/[.04] p-8 backdrop-blur">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-3xl">💬</div>
              <h3 className="text-xl font-black text-white">ابدأ المحادثة</h3>
              <p className="mt-2 text-sm leading-7 text-gray-400">اكتب أول رسالة وسيتم إرسالها فوراً للطرف الآخر.</p>
            </div>
          </div>
        ) : (
          renderMessageGroups()
        )}

        {typingUser && (
          <div className="mt-3 flex items-center gap-2">
            <div className="typing-indicator rounded-2xl bg-dark-200/80">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-xs text-gray-400">{typingUser.username} يكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {showAttachMenu && (
        <div className="absolute bottom-24 right-5 z-20 rounded-3xl border border-white/10 bg-dark-200/95 p-2 shadow-2xl backdrop-blur">
          <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl p-3 text-white transition hover:bg-white/10">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">📎</span>
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

      <form onSubmit={handleSendMessage} className="z-10 border-t border-white/10 bg-dark-200/90 p-4 backdrop-blur md:p-5">
        <div className="mx-auto flex max-w-5xl items-center gap-2 rounded-[1.8rem] border border-white/10 bg-dark-100/80 p-2 shadow-[0_14px_40px_rgba(0,0,0,.16)]">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            disabled={uploading}
            title="إرفاق ملف"
          >
            📎
          </button>

          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            placeholder="اكتب رسالة..."
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <button
            type="submit"
            disabled={!messageText.trim() || uploading}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300 font-black text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="إرسال"
          >
            {uploading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" /> : '➤'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default ChatArea;
