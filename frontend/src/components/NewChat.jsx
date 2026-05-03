import { useState, useEffect } from 'react';
import { useChatStore } from '../stores';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';

function NewChat({ onClose }) {
  const { createConversation, setCurrentConversation, fetchConversations } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const searchUsers = async () => {
      const query = searchQuery.trim();

      setSelectedUser(null);
      setSearchError('');

      if (query.length < 2) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // مهم: لا نستخدم fetch('/api/...') هنا، لأن Vercel سيطلب من رابط الواجهة نفسه.
        // usersAPI يستخدم VITE_API_URL، لذلك يذهب مباشرة إلى backend على Render.
        const response = await usersAPI.searchUsers(query);
        setSearchResults(response.data.data?.users || []);
      } catch (error) {
        console.error('Search error:', error);
        const message = error.response?.data?.message || 'خطأ في البحث عن المستخدمين';
        setSearchError(message);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleStartChat = async () => {
    if (!selectedUser) return;

    const result = await createConversation({
      participantId: selectedUser._id,
      type: 'direct',
    });

    if (result.success) {
      toast.success('تم إنشاء المحادثة');
      setCurrentConversation(result.conversation);
      await fetchConversations?.();
      onClose();
    } else {
      toast.error(result.message || 'خطأ في إنشاء المحادثة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-dark-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-black text-white">محادثة جديدة</h2>
            <p className="mt-1 text-xs text-gray-400">ابحث عن مستخدم وابدأ المحادثة فوراً</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مستخدم..."
              className="w-full rounded-2xl border border-white/10 bg-dark-100 px-4 py-3 pl-10 text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
              autoFocus
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 mt-2">اكتب حرفين على الأقل من اسم المستخدم أو البريد.</p>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              <svg className="animate-spin h-6 w-6 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : searchError ? (
            <div className="p-4 text-center text-red-400">
              <p>{searchError}</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user._id}
                onClick={() => handleSelectUser(user)}
                className={`mb-2 flex cursor-pointer items-center gap-3 rounded-3xl border p-3 transition ${
                  selectedUser?._id === user._id ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-transparent hover:border-white/10 hover:bg-white/[.04]'
                }`}
              >
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 font-black text-slate-950">
                      {user.username?.charAt(0) || '?'}
                    </div>
                  )}
                  {user.status === 'online' && (
                    <div className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full border-2 border-dark-200 bg-emerald-400"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{user.username}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {user.status === 'online' ? 'متصل' : 'غير متصل'}
                  </p>
                </div>
                {selectedUser?._id === user._id && (
                  <svg className="h-5 w-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))
          ) : searchQuery.trim().length >= 2 ? (
            <div className="p-4 text-center text-gray-400">
              <p>لم يتم العثور على مستخدمين</p>
              <p className="text-xs mt-1">تأكد أنك تبحث من حساب مختلف، لأن حسابك الحالي لا يظهر في النتائج.</p>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>ابحث عن مستخدم لبدء محادثة</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-5">
          <button
            onClick={handleStartChat}
            disabled={!selectedUser || loading}
            className="w-full rounded-2xl bg-cyan-300 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ابدأ المحادثة
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewChat;
