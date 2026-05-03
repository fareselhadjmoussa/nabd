import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'react-toastify';
import socketService from '../services/socket';
import { adminAPI } from '../services/api';
import { useAuthStore } from '../stores';

function Message({ message, isSent, showAvatar }) {
  const { user } = useAuthStore();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const isAdmin = user?.role === 'admin';
  const canDelete = !message.deleted && !message.pending && (isSent || isAdmin);

  const handleReaction = (emoji) => {
    if (message.deleted || message.pending) return;
    socketService.addReaction(message._id, emoji);
    setShowReactions(false);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!canDelete || deleting) return;

    const text = isAdmin && !isSent
      ? 'هل تريد حذف هذه الرسالة بصلاحية الإدارة؟ لن يتم عرض محتواها بعد الحذف.'
      : 'هل تريد حذف هذه الرسالة؟';

    if (!confirm(text)) return;

    setDeleting(true);
    try {
      if (isAdmin && !isSent) {
        await adminAPI.deleteMessage(message._id);
        toast.success('تم حذف الرسالة بواسطة الإدارة');
      } else {
        const sent = socketService.deleteMessage(message._id);
        if (!sent) await adminAPI.deleteMessage(message._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حذف الرسالة');
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  };

  const formatTime = (date) => format(new Date(date), 'HH:mm', { locale: ar });

  const renderStatus = () => {
    if (message.failed) return <span className="text-[10px] font-bold text-red-300">فشل</span>;
    if (message.pending) return <span className="text-[10px] text-gray-300">جارٍ الإرسال...</span>;
    if (message.readBy?.length > 1) return <span className="text-[10px] font-bold text-cyan-100">✓✓</span>;
    return <span className="text-[10px] text-gray-300">✓</span>;
  };

  const renderContent = () => {
    if (message.deleted) {
      return (
        <p className="text-sm italic text-gray-500">
          {message.content || (message.adminDeleted ? 'تم حذف هذه الرسالة بواسطة الإدارة' : 'تم حذف هذه الرسالة')}
        </p>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <img
            src={message.mediaUrl}
            alt="صورة"
            className="max-h-[320px] max-w-[320px] cursor-pointer rounded-2xl object-cover transition hover:opacity-90"
            onClick={() => window.open(message.mediaUrl, '_blank')}
          />
        );
      case 'video':
        return <video src={message.mediaUrl} controls className="max-h-[320px] max-w-[320px] rounded-2xl" />;
      case 'audio':
        return <audio src={message.mediaUrl} controls className="w-[250px]" />;
      default:
        return <p className="whitespace-pre-wrap break-words leading-7 text-white">{message.content}</p>;
    }
  };

  return (
    <div
      className={`group flex items-end gap-2 mb-2 ${isSent ? 'flex-row-reverse' : 'flex-row'} message-enter`}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!message.deleted) setShowMenu((value) => !value);
      }}
    >
      <div className="w-8 shrink-0">
        {showAvatar && !isSent ? (
          message.sender?.avatar ? (
            <img src={message.sender.avatar} alt={message.sender.username || 'avatar'} className="h-8 w-8 rounded-xl object-cover ring-1 ring-white/10" />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-xs font-black text-slate-950">
              {message.sender?.username?.charAt(0) || '?'}
            </div>
          )
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>

      <div
        className={`relative max-w-[78%] px-4 py-2.5 shadow-sm md:max-w-[68%] ${isSent ? 'bg-gradient-to-br from-primary-500 to-cyan-600 message-bubble-sent text-white shadow-cyan-950/20' : 'bg-dark-100/95 message-bubble text-white ring-1 ring-white/5'} ${message.deleted ? 'opacity-60' : ''} ${message.pending ? 'opacity-70' : ''}`}
      >
        {!message.deleted && (
          <button
            type="button"
            onClick={() => setShowMenu((value) => !value)}
            className={`absolute -top-2 ${isSent ? '-left-2' : '-right-2'} grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-dark-200 text-gray-300 opacity-0 shadow-lg transition hover:text-white group-hover:opacity-100`}
            title="خيارات الرسالة"
          >
            ⋯
          </button>
        )}

        {message.reactions?.length > 0 && (
          <div className="absolute -bottom-3 right-2 flex items-center gap-1 rounded-full border border-white/10 bg-dark-200 px-2 py-1 shadow-lg">
            <span className="text-xs">{message.reactions[0]?.emoji}</span>
            {message.reactions.length > 1 && <span className="text-xs text-gray-400">{message.reactions.length}</span>}
          </div>
        )}

        {renderContent()}

        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-gray-300/90">{formatTime(message.createdAt)}</span>
          {isSent && !message.deleted && renderStatus()}
          {message.adminDeleted && <span className="rounded-full bg-red-500/20 px-1.5 text-[10px] text-red-100">إدارة</span>}
        </div>

        {showMenu && !message.deleted && (
          <div className={`absolute ${isSent ? 'left-0' : 'right-0'} top-full z-20 mt-2 min-w-[170px] rounded-2xl border border-white/10 bg-dark-200 p-1 shadow-2xl`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="w-full rounded-xl p-2 text-right text-sm text-white transition hover:bg-white/10"
              disabled={message.pending}
            >
              إضافة رد فعل
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full rounded-xl p-2 text-right text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : (isAdmin && !isSent ? 'حذف بواسطة الإدارة' : 'حذف الرسالة')}
              </button>
            )}
          </div>
        )}

        {showReactions && (
          <div className={`absolute ${isSent ? 'left-0' : 'right-0'} top-full z-30 mt-2 flex gap-1 rounded-2xl border border-white/10 bg-dark-200 p-2 shadow-2xl`}>
            {reactions.map((emoji) => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className="grid h-8 w-8 place-items-center rounded-xl text-lg transition hover:bg-white/10">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
