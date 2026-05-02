import { Link } from 'react-router-dom';
import { useThemeStore } from '../stores';

function Landing() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-dark-300 text-white overflow-hidden">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center font-black text-xl">ن</div>
          <div>
            <h1 className="text-xl font-black">نبض شات</h1>
            <p className="text-xs text-gray-400">تواصل عربي سريع وآمن</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="px-4 py-2 rounded-xl bg-dark-200 text-sm hover:bg-dark-100 transition-colors">
            {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
          </button>
          <Link to="/login" className="px-4 py-2 rounded-xl bg-dark-200 hover:bg-dark-100 transition-colors">دخول</Link>
          <Link to="/register" className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 transition-colors">إنشاء حساب</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
        <section>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200 border border-gray-700 text-sm text-gray-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            يعمل الآن على الويب والموبايل
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            دردشة عربية حديثة باسم <span className="gradient-text">نبض</span>
          </h2>
          <p className="text-lg text-gray-400 leading-8 mb-8">
            أنشئ حسابك، ابحث عن أصدقائك، وابدأ محادثات فورية مع حالة اتصال ورسائل مباشرة وتصميم مريح.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 font-bold transition-colors">ابدأ الآن مجاناً</Link>
            <Link to="/login" className="px-6 py-3 rounded-2xl bg-dark-200 hover:bg-dark-100 font-bold transition-colors">لدي حساب</Link>
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full"></div>
          <div className="relative bg-dark-200 border border-gray-700 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-cyan-400"></div>
                <div>
                  <p className="font-bold">Fares</p>
                  <p className="text-xs text-green-500">متصل الآن</p>
                </div>
              </div>
              <span className="text-gray-400">•••</span>
            </div>
            <div className="space-y-3 min-h-[360px] bg-dark-300 rounded-2xl p-4">
              <div className="max-w-[75%] bg-dark-100 p-3 rounded-2xl rounded-br-sm text-sm">السلام عليكم، الموقع أصبح سريع 🔥</div>
              <div className="max-w-[75%] mr-auto bg-primary-500 p-3 rounded-2xl rounded-bl-sm text-sm">وعليكم السلام، الرسائل تصل فوراً ✓✓</div>
              <div className="max-w-[75%] bg-dark-100 p-3 rounded-2xl rounded-br-sm text-sm">جرب لوحة المدير والبلاغات أيضاً</div>
              <div className="max-w-[75%] mr-auto bg-primary-500 p-3 rounded-2xl rounded-bl-sm text-sm">تمام، شكله احترافي 👌</div>
            </div>
          </div>
        </section>
      </main>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-4">
        {['محادثات فورية', 'حظر وبلاغات', 'وضع فاتح وداكن'].map((item) => (
          <div key={item} className="bg-dark-200 border border-gray-700 rounded-2xl p-5">
            <h3 className="font-bold mb-2">{item}</h3>
            <p className="text-sm text-gray-400">ميزة جاهزة داخل نبض شات لتجربة أفضل وأكثر أماناً.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Landing;
