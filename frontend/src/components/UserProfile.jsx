import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores';
import { toast } from 'react-toastify';

function UserProfile({ onClose }) {
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user?.username]);

  const handleAvatarClick = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const result = await uploadAvatar(file);

    if (result.success) {
      toast.success('تم تحديث الصورة الشخصية');
    } else {
      toast.error(result.message);
    }

    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      toast.error('يرجى إدخال اسم المستخدم');
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      toast.error('اسم المستخدم يجب أن يكون 3-30 حرف');
      return;
    }

    setLoading(true);
    const result = await updateProfile({ username: trimmedUsername });

    if (result.success) {
      toast.success('تم تحديث الملف الشخصي');
      setIsEditing(false);
    } else {
      toast.error(result.message);
      setUsername(user?.username || '');
    }

    setLoading(false);
  };

  const renderAvatar = (sizeClass = 'w-24 h-24', textClass = 'text-3xl') => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizeClass} rounded-full object-cover border-4 border-dark-100`}
        />
      );
    }

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white ${textClass} font-bold border-4 border-dark-100`}>
        {user?.username?.charAt(0) || '?'}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">الملف الشخصي</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-white"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div
              className={`relative group ${loading ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
              onClick={handleAvatarClick}
            >
              {renderAvatar()}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {loading ? (
                  <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <p className="text-sm text-gray-400 mt-2">انقر لتغيير الصورة</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">اسم المستخدم</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-dark-100 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'حفظ'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-white">{user?.username}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-primary-500 hover:text-primary-400 text-sm"
                >
                  تعديل
                </button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">البريد الإلكتروني</label>
            <span className="text-white">{user?.email}</span>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">الحالة</label>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500">متصل</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">اللغة</label>
            <span className="text-white">{user?.language === 'ar' ? 'العربية' : 'English'}</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-400">
          انضم في {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '-'}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
