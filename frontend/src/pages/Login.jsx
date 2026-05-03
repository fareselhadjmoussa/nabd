import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { toast } from 'react-toastify';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/chat');
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-300 text-white professional-surface">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/">
          <BrandLogo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link to="/register" className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            إنشاء حساب
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-5 pb-10 md:px-8 lg:grid-cols-[.95fr_1.05fr]">
        <section className="hidden lg:block">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[.05] p-8 backdrop-blur">
            <img src="/nabd-logo-full.png" alt="Nabd Chat" className="mx-auto h-72 object-contain" />
            <h2 className="mt-8 text-3xl font-black">مرحباً بعودتك إلى نبض</h2>
            <p className="mt-4 leading-8 text-gray-400">
              ادخل إلى محادثاتك، تابع المتصلين، وتحكم في تجربتك من واجهة عربية خفيفة وواضحة.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              {['سريع', 'آمن', 'عربي'].map((item) => (
                <span key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-cyan-100">{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 lg:hidden">
            <BrandLogo size="lg" />
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-7">
              <p className="text-sm font-bold text-cyan-300">تسجيل الدخول</p>
              <h1 className="mt-2 text-3xl font-black">ادخل إلى حسابك</h1>
              <p className="mt-2 text-sm text-gray-400">استخدم البريد وكلمة المرور المسجلين لديك.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-l from-cyan-300 to-emerald-300 px-6 py-3 font-black text-slate-950 shadow-[0_15px_45px_rgba(45,212,191,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="font-bold text-cyan-300 hover:text-cyan-200">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
