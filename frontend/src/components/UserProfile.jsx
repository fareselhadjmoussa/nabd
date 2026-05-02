import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../stores';
import { toast } from 'react-toastify';

function UserProfile({ onClose }) {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar, deleteAccount } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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
    if (!username.trim()) {
      toast.error('يرجى إدخال اسم المستخدم');
      return;
    }

    setLoading(true);
    const result = await updateProfile({ username: username.trim() });

    if (result.success) {
      toast.success('تم تحديث الملف الشخصي');
      setIsEditing(false);
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const password = prompt('اكتب كلمة المرور لتأكيد حذف الحساب نهائياً');
    if (!password) return;
    const confirmText = prompt('اكتب حذف حسابي للتأكيد');
    if (confirmText !== 'حذف حسابي') {
      toast.info('تم إلغاء حذف الحساب');
      return;
    }

    setLoading(true);
    const result = await deleteAccount(password);
    setLoading(false);

    if (result.success) {
      toast.success('تم حذف الحساب');
      onClose?.();
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">الملف الشخصي</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-24 h-24 rounded-full object-cover border-4 border-dark-100" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-dark-100">
                  {user?.username?.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm">تغيير</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
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
                />
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors disabled:opacity-50">
                  {loading ? '...' : 'حفظ'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-white">{user?.username}</span>
                <button onClick={() => setIsEditing(true)} className="text-primary-500 hover:text-primary-400 text-sm">تعديل</button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">البريد الإلكتروني</label>
            <span className="text-white">{user?.email}</span>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">الدور</label>
            <span className="text-white">{user?.role === 'admin' ? 'مدير' : 'مستخدم'}</span>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">الحالة</label>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500">متصل</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">المظهر</label>
            <button onClick={toggleTheme} className="w-full bg-dark-100 hover:bg-gray-700 rounded-xl px-4 py-3 text-white transition-colors">
              {theme === 'dark' ? 'تفعيل الوضع الفاتح ☀️' : 'تفعيل الوضع الداكن 🌙'}
            </button>
          </div>

          <div className="border-t border-gray-700 pt-5">
            <h3 className="text-red-400 font-bold mb-2">منطقة خطرة</h3>
            <p className="text-gray-400 text-sm mb-3">حذف الحساب نهائي وسيحذف محادثاته ورسائله المرتبطة به.</p>
            <button onClick={handleDeleteAccount} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
              حذف حسابي نهائياً
            </button>
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
