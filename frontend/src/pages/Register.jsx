import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { toast } from 'react-toastify';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    const result = await register({ username: formData.username, email: formData.email, password: formData.password });

    if (result.success) {
      toast.success('تم إنشاء الحساب بنجاح');
      navigate('/chat');
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-300 text-white professional-surface">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/">
          <BrandLogo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link to="/login" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
            تسجيل الدخول
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-5 pb-10 md:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-7">
              <p className="text-sm font-bold text-cyan-300">حساب جديد</p>
              <h1 className="mt-2 text-3xl font-black">ابدأ محادثاتك الآن</h1>
              <p className="mt-2 text-sm text-gray-400">املأ البيانات الأساسية فقط. لا توجد خطوات بريد إضافية.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-400">اسم المستخدم</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-dark-100 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  placeholder="مثال: fares"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-dark-100 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-dark-100 px-4 py-3 pl-12 text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                    placeholder="6 أحرف على الأقل"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-gray-400 hover:bg-white/5 hover:text-white"
                  >
                    {showPassword ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">تأكيد كلمة المرور</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-dark-100 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  placeholder="أعد كتابة كلمة المرور"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-l from-cyan-300 to-emerald-300 px-6 py-3 font-black text-slate-950 shadow-[0_15px_45px_rgba(45,212,191,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              لديك حساب؟{' '}
              <Link to="/login" className="font-bold text-cyan-300 hover:text-cyan-200">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="rounded-[2.5rem] border border-white/10 bg-[#061837]/90 p-8 shadow-2xl backdrop-blur">
            <BrandLogo size="lg" />
            <div className="my-10 flex justify-center">
              <img src="/nabd-logo-mark.png" alt="Nabd" className="h-64 w-64 object-contain drop-shadow-[0_25px_70px_rgba(34,211,238,.25)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['بحث عن مستخدمين', 'رسائل فورية', 'بلاغات وحظر', 'وضع فاتح/داكن'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Register;
