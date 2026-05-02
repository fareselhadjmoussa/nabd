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
        if (!sent) {
          await adminAPI.deleteMessage(message._id);
        }
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
    if (message.failed) return <span className="text-[10px] text-red-300">فشل</span>;
    if (message.pending) return <span className="text-[10px] text-gray-300">جارٍ الإرسال...</span>;
    if (message.readBy?.length > 1) return <span className="text-[10px] text-cyan-200">✓✓ مقروءة</span>;
    return <span className="text-[10px] text-gray-300">✓ تم الإرسال</span>;
  };

  const renderContent = () => {
    if (message.deleted) {
      return (
        <p className="text-gray-500 italic text-sm">
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
            className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.mediaUrl, '_blank')}
          />
        );
      case 'video':
        return <video src={message.mediaUrl} controls className="max-w-[300px] max-h-[300px] rounded-lg" />;
      case 'audio':
        return <audio src={message.mediaUrl} controls className="w-[250px] h-[40px]" />;
      default:
        return <p className="text-white whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  return (
    <div
      className={`flex items-end gap-2 mb-2 ${isSent ? 'flex-row-reverse' : 'flex-row'} message-enter group`}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!message.deleted) setShowMenu((value) => !value);
      }}
    >
      <div className="w-8">
        {showAvatar && !isSent ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs">
            {message.sender?.username?.charAt(0) || '?'}
          </div>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div
        className={`relative max-w-[70%] ${isSent ? 'bg-primary-500 message-bubble-sent' : 'bg-dark-100 message-bubble'} px-4 py-2 ${message.deleted ? 'opacity-60' : ''} ${message.pending ? 'opacity-70' : ''}`}
      >
        {!message.deleted && (
          <button
            type="button"
            onClick={() => setShowMenu((value) => !value)}
            className={`absolute -top-2 ${isSent ? '-left-2' : '-right-2'} w-7 h-7 rounded-full bg-dark-200 border border-gray-700 text-gray-300 opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-white transition-opacity`}
            title="خيارات الرسالة"
          >
            ⋯
          </button>
        )}

        {message.reactions?.length > 0 && (
          <div className="absolute -bottom-2 right-0 bg-dark-200 rounded-full px-2 py-1 flex items-center gap-1">
            <span className="text-xs">{message.reactions[0]?.emoji}</span>
            {message.reactions.length > 1 && <span className="text-xs text-gray-400">{message.reactions.length}</span>}
          </div>
        )}

        {renderContent()}

        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          {isSent && !message.deleted && renderStatus()}
          {message.adminDeleted && <span className="text-[10px] text-red-200">إدارة</span>}
        </div>

        {showMenu && !message.deleted && (
          <div className={`absolute ${isSent ? 'left-0' : 'right-0'} top-full mt-1 bg-dark-200 rounded-lg shadow-xl p-1 z-20 min-w-[150px] border border-gray-700`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="w-full p-2 hover:bg-dark-100 rounded-lg text-white text-sm text-right"
              disabled={message.pending}
            >
              إضافة رد فعل
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full p-2 hover:bg-dark-100 rounded-lg text-red-400 text-sm text-right disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : (isAdmin && !isSent ? 'حذف بواسطة الإدارة' : 'حذف الرسالة')}
              </button>
            )}
          </div>
        )}

        {showReactions && (
          <div className={`absolute ${isSent ? 'left-0' : 'right-0'} top-full mt-1 bg-dark-200 rounded-lg shadow-xl p-2 flex gap-1 z-30 border border-gray-700`}>
            {reactions.map((emoji) => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className="w-8 h-8 hover:bg-dark-100 rounded-lg text-lg">
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
