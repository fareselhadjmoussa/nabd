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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">محادثة جديدة</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مستخدم..."
              className="w-full bg-dark-100 border border-gray-700 rounded-xl px-4 py-2 pl-10 text-white focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 mt-2">اكتب حرفين على الأقل من اسم المستخدم أو البريد.</p>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto">
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
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-dark-100 transition-colors border-b border-gray-800 ${
                  selectedUser?._id === user._id ? 'bg-dark-100' : ''
                }`}
              >
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
                      {user.username?.charAt(0) || '?'}
                    </div>
                  )}
                  {user.status === 'online' && (
                    <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-200"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{user.username}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {user.status === 'online' ? 'متصل' : 'غير متصل'}
                  </p>
                </div>
                {selectedUser?._id === user._id && (
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleStartChat}
            disabled={!selectedUser || loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            ابدأ المحادثة
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewChat;
