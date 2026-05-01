import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import socketService from '../services/socket';

function Message({ message, isSent, showAvatar }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleReaction = (emoji) => {
    socketService.addReaction(message._id, emoji);
    setShowReactions(false);
  };

  const handleDelete = () => {
    socketService.deleteMessage(message._id);
    setShowMenu(false);
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm', { locale: ar });
  };

  const renderContent = () => {
    if (message.deleted) {
      return (
        <p className="text-gray-500 italic text-sm">{message.content}</p>
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
        return (
          <video
            src={message.mediaUrl}
            controls
            className="max-w-[300px] max-h-[300px] rounded-lg"
          />
        );
      case 'audio':
        return (
          <audio
            src={message.mediaUrl}
            controls
            className="w-[250px] h-[40px]"
          />
        );
      default:
        return <p className="text-white">{message.content}</p>;
    }
  };

  return (
    <div className={`flex items-end gap-2 mb-2 ${isSent ? 'flex-row-reverse' : 'flex-row'} message-enter`}>
      <div className="w-8">
        {showAvatar && !isSent ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs">
            {message.sender?.username?.charAt(0) || '?'}
          </div>
        ) : (
          <div className="w-8"></div>
        )}
      </div>

      <div
        className={`relative max-w-[70%] ${isSent ? 'bg-primary-500 message-bubble-sent' : 'bg-dark-100 message-bubble'} px-4 py-2 ${message.deleted ? 'opacity-60' : ''}`}
      >
        {message.reactions?.length > 0 && (
          <div className="absolute -bottom-2 right-0 bg-dark-200 rounded-full px-2 py-1 flex items-center gap-1">
            <span className="text-xs">{message.reactions[0]?.emoji}</span>
            {message.reactions.length > 1 && (
              <span className="text-xs text-gray-400">{message.reactions.length}</span>
            )}
          </div>
        )}

        {renderContent()}

        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          {isSent && !message.deleted && (
            <span className="text-[10px] text-gray-300">
              {message.readBy?.length > 1 ? '✓✓' : '✓'}
            </span>
          )}
        </div>

        {showMenu && !message.deleted && (
          <div className="absolute left-0 top-full mt-1 bg-dark-200 rounded-lg shadow-xl p-1 z-10">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="w-full p-2 hover:bg-dark-100 rounded-lg text-white text-sm"
            >
              إضافة رد فعل
            </button>
            <button
              onClick={handleDelete}
              className="w-full p-2 hover:bg-dark-100 rounded-lg text-red-500 text-sm"
            >
              حذف الرسالة
            </button>
          </div>
        )}

        {showReactions && (
          <div className="absolute left-0 top-full mt-1 bg-dark-200 rounded-lg shadow-xl p-2 flex gap-1 z-10">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-8 h-8 hover:bg-dark-100 rounded-lg text-lg"
              >
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
