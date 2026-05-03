import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useChatStore } from '../stores';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';

function Sidebar({ onNewChat, onProfile, onLogout, onConversationSelect }) {
  const { user } = useAuthStore();
  const { conversations, currentConversation, onlineUsers } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  const getOtherParticipant = (conversation) => conversation?.participants?.find((participant) => participant?._id !== user?._id);

  const getConversationTitle = (conversation) => {
    if (conversation?.type === 'direct') return getOtherParticipant(conversation)?.username || conversation?.name || 'محادثة';
    return conversation?.name || 'مجموعة';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation?.type === 'direct') return getOtherParticipant(conversation)?.avatar;
    return conversation?.avatar;
  };

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      const filtered = conversations.filter((conversation) => {
        const title = getConversationTitle(conversation).toLowerCase();
        const participants = conversation.participants || [];
        const participantMatch = participants.some((participant) => (
          participant?.username?.toLowerCase().includes(query)
          || participant?.email?.toLowerCase().includes(query)
        ));

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
      return <img src={avatar} alt={title} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/10" />;
    }

    return (
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-lg font-black text-slate-950 shadow-[0_12px_30px_rgba(45,212,191,.18)]">
        {title?.charAt(0) || '?'}
      </div>
    );
  };

  const isUserOnline = (participant) => participant?._id !== user?._id && onlineUsers.includes(participant?._id);

  const formatLastMessage = (message) => {
    if (!message) return 'لا توجد رسائل بعد';
    if (message.deleted) return 'تم حذف رسالة';
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

    if (diffDays === 0) return format(messageDate, 'HH:mm', { locale: ar });
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return format(messageDate, 'EEEE', { locale: ar });
    return format(messageDate, 'dd/MM/yyyy', { locale: ar });
  };

  const unreadTotal = conversations.reduce((total, conversation) => total + (Number(conversation.unreadCount) || 0), 0);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-dark-200/95 backdrop-blur professional-sidebar">
      <div className="border-b border-white/10 p-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link to="/chat" className="min-w-0">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              onClick={onNewChat}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,.2)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
              title="محادثة جديدة"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 5v14m7-7H5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[.04] px-4 py-3">
          <div>
            <p className="text-xs text-gray-400">المحادثات</p>
            <p className="text-lg font-black text-white">{conversations.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">غير مقروء</p>
            <p className="text-lg font-black text-cyan-200">{unreadTotal}</p>
          </div>
          {user?.role === 'admin' && (
            <Link to="/admin" className="rounded-2xl bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/20 hover:bg-emerald-300/20">
              Admin
            </Link>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المحادثات..."
            className="w-full rounded-2xl border border-white/10 bg-dark-100/80 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
          />
          <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredConversations.length === 0 ? (
          <div className="m-3 rounded-[2rem] border border-dashed border-white/10 bg-white/[.03] p-6 text-center text-gray-400">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-3xl">💬</div>
            <p className="font-bold text-white">لا توجد محادثات</p>
            <p className="mt-2 text-sm leading-6">ابدأ محادثة جديدة وابحث عن مستخدم للانطلاق.</p>
            <button onClick={onNewChat} className="mt-4 rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200">
              محادثة جديدة
            </button>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const active = currentConversation?._id === conversation._id;
            const other = getOtherParticipant(conversation);
            const online = conversation.type === 'direct' && conversation.participants?.some((participant) => isUserOnline(participant));

            return (
              <button
                type="button"
                key={conversation._id}
                onClick={() => onConversationSelect(conversation)}
                className={`mb-2 w-full rounded-[1.6rem] border p-3 text-right transition ${active ? 'border-cyan-300/40 bg-cyan-300/10 shadow-[0_12px_40px_rgba(34,211,238,.08)]' : 'border-transparent hover:border-white/10 hover:bg-white/[.04]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {getAvatar(conversation)}
                    {online && <div className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full border-2 border-dark-200 bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.7)]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate font-bold text-white">{getConversationTitle(conversation)}</h3>
                      <span className="shrink-0 text-[11px] text-gray-500">{formatTime(conversation.updatedAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-gray-400">{formatLastMessage(conversation.lastMessage)}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="grid min-h-[22px] min-w-[22px] place-items-center rounded-full bg-cyan-300 px-1.5 text-xs font-black text-slate-950">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {other?.email && <p className="mt-0.5 truncate text-[11px] text-gray-500">@{other.username}</p>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-[1.6rem] bg-white/[.04] p-3 ring-1 ring-white/10">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username || 'avatar'} className="h-11 w-11 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 font-black text-slate-950">
              {user?.username?.charAt(0) || '?'}
            </div>
          )}
          <button type="button" onClick={onProfile} className="min-w-0 flex-1 text-right">
            <h3 className="truncate font-bold text-white">{user?.username}</h3>
            <p className="text-xs text-emerald-300">متصل الآن</p>
          </button>
          <button onClick={onLogout} className="grid h-10 w-10 place-items-center rounded-2xl text-gray-400 transition hover:bg-red-500/10 hover:text-red-300" title="تسجيل الخروج">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
