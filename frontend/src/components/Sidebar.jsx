import { useState, useEffect } from 'react';
import { useAuthStore, useChatStore } from '../stores';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

function Sidebar({ onNewChat, onProfile, onLogout, onConversationSelect }) {
  const { user } = useAuthStore();
  const { conversations, currentConversation, onlineUsers } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  const getOtherParticipant = (conversation) => {
    return conversation?.participants?.find((participant) => participant?._id !== user?._id);
  };

  const getConversationTitle = (conversation) => {
    if (conversation?.type === 'direct') {
      return getOtherParticipant(conversation)?.username || conversation?.name || 'محادثة';
    }

    return conversation?.name || 'مجموعة';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation?.type === 'direct') {
      return getOtherParticipant(conversation)?.avatar;
    }

    return conversation?.avatar;
  };

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      const filtered = conversations.filter((conversation) => {
        const title = getConversationTitle(conversation).toLowerCase();
        const participants = conversation.participants || [];
        const participantMatch = participants.some((participant) =>
          participant?.username?.toLowerCase().includes(query) ||
          participant?.email?.toLowerCase().includes(query)
        );

        return title.includes(query) || participantMatch;
      });

      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations, user?._id]);

  const getAvatar = (conversation) => {
    const title = getConversationTitle(conversation);
    const avatar = getConversationAvatar(conversation);

    if (avatar) {
      return (
        <img
          src={avatar}
          alt={title}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
        {title?.charAt(0) || '?'}
      </div>
    );
  };

  const isUserOnline = (participant) => {
    return participant?._id !== user?._id && onlineUsers.includes(participant?._id);
  };

  const formatLastMessage = (message) => {
    if (!message) return 'لا توجد رسائل';
    if (message.type === 'image') return '📷 صورة';
    if (message.type === 'video') return '🎬 فيديو';
    if (message.type === 'audio') return '🎤 رسالة صوتية';
    return message.content;
  };

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(messageDate, 'HH:mm', { locale: ar });
    } else if (diffDays === 1) {
      return 'أمس';
    } else if (diffDays < 7) {
      return format(messageDate, 'EEEE', { locale: ar });
    } else {
      return format(messageDate, 'dd/MM/yyyy', { locale: ar });
    }
  };

  return (
    <div className="w-80 bg-dark-200 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">نبض شات</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="p-2 hover:bg-dark-100 rounded-full transition-colors"
              title="محادثة جديدة"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onProfile}
              className="p-2 hover:bg-dark-100 rounded-full transition-colors"
              title="الملف الشخصي"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المحادثات..."
            className="w-full bg-dark-100 border border-gray-700 rounded-xl px-4 py-2 pl-10 text-white text-sm focus:border-primary-500 focus:outline-none transition-colors"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>لا توجد محادثات</p>
            <button
              onClick={onNewChat}
              className="mt-2 text-primary-500 hover:text-primary-400 text-sm"
            >
              ابدأ محادثة جديدة
            </button>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => onConversationSelect(conversation)}
              className={`p-4 cursor-pointer hover:bg-dark-100 transition-colors border-b border-gray-800 ${
                currentConversation?._id === conversation._id ? 'bg-dark-100' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {getAvatar(conversation)}
                  {conversation.type === 'direct' &&
                    conversation.participants?.some((p) => isUserOnline(p)) && (
                      <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-200"></div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {formatTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate">
                      {formatLastMessage(conversation.lastMessage)}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="min-w-[20px] h-[20px] bg-primary-500 rounded-full text-xs text-white flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
            {user?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium">{user?.username}</h3>
            <p className="text-xs text-green-500">متصل</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-red-500"
            title="تسجيل الخروج"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
