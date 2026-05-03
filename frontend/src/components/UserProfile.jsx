import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../stores';
import { toast } from 'react-toastify';
import BrandLogo from './BrandLogo';

function UserProfile({ onClose }) {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar, deleteAccount } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const result = await uploadAvatar(file);

    if (result.success) toast.success('تم تحديث الصورة الشخصية');
    else toast.error(result.message);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden overflow-y-auto rounded-[2rem] border border-white/10 bg-dark-200 shadow-2xl">
        <div className="relative overflow-hidden border-b border-white/10 p-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-cyan-300/10 via-transparent to-emerald-300/10" />
          <div className="relative flex items-center justify-between gap-4">
            <BrandLogo size="sm" />
            <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl text-gray-400 transition hover:bg-white/10 hover:text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-7 flex flex-col items-center">
            <div className="group relative cursor-pointer" onClick={handleAvatarClick}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-28 w-28 rounded-[2rem] border-4 border-dark-100 object-cover shadow-xl" />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-[2rem] border-4 border-dark-100 bg-gradient-to-br from-cyan-300 to-emerald-300 text-4xl font-black text-slate-950 shadow-xl">
                  {user?.username?.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-black/55 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-xl bg-white/10 px-3 py-1 text-sm text-white">تغيير</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            <h2 className="mt-4 text-2xl font-black text-white">{user?.username}</h2>
            <p className="text-sm text-gray-400">{user?.role === 'admin' ? 'مدير النظام' : 'مستخدم نبض'}</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
              <label className="mb-2 block text-sm text-gray-400">اسم المستخدم</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-dark-100 px-4 py-2 text-white outline-none focus:border-cyan-300/70"
                  />
                  <button onClick={handleSave} disabled={loading} className="rounded-2xl bg-cyan-300 px-4 py-2 font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">
                    {loading ? '...' : 'حفظ'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-bold text-white">{user?.username}</span>
                  <button onClick={() => setIsEditing(true)} className="rounded-xl bg-white/5 px-3 py-1.5 text-sm text-cyan-300 hover:bg-white/10">تعديل</button>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
                <label className="mb-2 block text-sm text-gray-400">البريد</label>
                <p className="truncate text-sm font-bold text-white">{user?.email}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
                <label className="mb-2 block text-sm text-gray-400">الحالة</label>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.6)]" />
                  <span className="font-bold text-emerald-300">متصل</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
              <label className="mb-2 block text-sm text-gray-400">المظهر</label>
              <button onClick={toggleTheme} className="w-full rounded-2xl bg-dark-100 px-4 py-3 font-bold text-white transition hover:bg-white/10">
                {theme === 'dark' ? 'تفعيل الوضع الفاتح ☀️' : 'تفعيل الوضع الداكن 🌙'}
              </button>
            </div>

            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-4">
              <h3 className="font-black text-red-200">منطقة خطرة</h3>
              <p className="mt-2 text-sm leading-7 text-red-100/70">حذف الحساب نهائي وسيحذف محادثاته ورسائله المرتبطة به.</p>
              <button onClick={handleDeleteAccount} disabled={loading} className="mt-4 w-full rounded-2xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
                حذف حسابي نهائياً
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 text-center text-sm text-gray-400">
          انضم في {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '-'}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
