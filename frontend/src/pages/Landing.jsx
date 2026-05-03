import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

const features = [
  {
    title: 'محادثات فورية',
    description: 'رسائل لحظية مع Socket.IO، حالات إرسال وقراءة، وتجربة سريعة بين المستخدمين.',
    icon: '⚡',
  },
  {
    title: 'خصوصية وتحكم',
    description: 'حظر، بلاغات، حذف الحساب، ولوحة إدارة قوية بدون كشف الرسائل الخاصة.',
    icon: '🛡️',
  },
  {
    title: 'واجهة عربية كاملة',
    description: 'تجربة RTL مصممة بالعربية من البداية، مع وضع فاتح وداكن وتجاوب ممتاز.',
    icon: '🌙',
  },
  {
    title: 'جاهز للويب والتطبيق',
    description: 'تصميم وهوية بصرية موحدة يمكن استخدامها في الموقع وتطبيق Expo بسهولة.',
    icon: '📱',
  },
];

const privacyItems = [
  'الإدارة تتحكم في المستخدمين والبلاغات بدون مشاهدة الرسائل الخاصة.',
  'إمكانية حذف الرسائل المخالفة عند الحاجة.',
  'حظر المستخدمين المزعجين وإدارة الحسابات من لوحة واحدة.',
];

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-dark-300 text-white professional-surface">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-40 -left-28 h-[28rem] w-[28rem] rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Nabd Chat">
          <BrandLogo size="md" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
          <a href="#features" className="hover:text-white">المميزات</a>
          <a href="#privacy" className="hover:text-white">الخصوصية</a>
          <a href="#experience" className="hover:text-white">التجربة</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link to="/login" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            دخول
          </Link>
          <Link to="/register" className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_10px_35px_rgba(34,211,238,.25)] transition hover:bg-cyan-300">
            ابدأ الآن
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pt-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" />
              منصة دردشة عربية خفيفة وسريعة
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
              نبض شات بتجربة عالمية، بلا تعقيد ولا صور زائدة.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-gray-300 md:text-xl">
              واجهة احترافية مبنية على هوية نبض: سرعة، وضوح، أمان، وتصميم مريح للموقع والتطبيق. لا توجد صور محادثات ضخمة في الصفحة الرئيسية، فقط هوية نظيفة ورسالة واضحة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="rounded-2xl bg-gradient-to-l from-cyan-300 to-emerald-300 px-7 py-4 font-black text-slate-950 shadow-[0_20px_70px_rgba(45,212,191,.28)] transition hover:-translate-y-0.5">
                إنشاء حساب مجاني
              </Link>
              <Link to="/login" className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10">
                تسجيل الدخول
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
              {[
                ['Realtime', 'رسائل فورية'],
                ['Admin', 'تحكم كامل'],
                ['RTL', 'عربي 100%'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/[.04] p-4 backdrop-blur">
                  <p className="text-xl font-black text-cyan-200">{value}</p>
                  <p className="mt-1 text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute inset-6 rounded-[3rem] bg-cyan-300/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#061837]/90 p-8 shadow-2xl backdrop-blur professional-card">
              <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="relative flex flex-col items-center text-center">
                <img src="/nabd-logo-full.png" alt="Nabd Chat" className="h-72 w-full object-contain drop-shadow-[0_25px_55px_rgba(34,211,238,.18)]" />
                <div className="mt-4 grid w-full grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-right">
                    <p className="text-sm text-gray-400">الحالة</p>
                    <p className="mt-1 font-black text-emerald-300">جاهز للإطلاق</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-right">
                    <p className="text-sm text-gray-400">الهوية</p>
                    <p className="mt-1 font-black text-cyan-200">نبض موحد</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-cyan-300">ميزات أساسية بلا خدمات مدفوعة</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">كل ما يحتاجه مشروع دردشة احترافي في البداية</h2>
            </div>
            <p className="max-w-xl text-gray-400">
              ركّزنا على الأشياء التي ترفع قيمة الموقع فعلاً: الأداء، الخصوصية، التحكم، والواجهة النظيفة.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="group rounded-[2rem] border border-white/10 bg-white/[.04] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[.07]">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-2xl ring-1 ring-cyan-300/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-7 backdrop-blur">
              <p className="text-sm font-bold text-emerald-300">مبدأ نبض</p>
              <h2 className="mt-2 text-3xl font-black">إدارة قوية مع احترام خصوصية الرسائل</h2>
              <p className="mt-4 leading-8 text-gray-400">
                لوحة الإدارة تساعدك على حماية المجتمع، لكنها لا تجعل محتوى الرسائل الخاصة مكشوفاً بشكل افتراضي. التحكم موجود، والخصوصية محفوظة.
              </p>
            </div>
            <div className="grid gap-3">
              {privacyItems.map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-5 backdrop-blur">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-sm font-black text-slate-950">{index + 1}</span>
                  <p className="leading-8 text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experience" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[.07] to-white/[.03] p-8 backdrop-blur md:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_.8fr]">
              <div>
                <h2 className="text-3xl font-black md:text-4xl">واجهة أنظف، تحميل أخف، وشكل أقرب للمنتجات العالمية</h2>
                <p className="mt-4 leading-8 text-gray-400">
                  تم الاعتماد على اللوجو والهوية التي أنشأناها سابقاً، مع خلفيات CSS خفيفة بدل صور كثيرة، حتى يبقى الموقع سريعاً ومناسباً للهواتف.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-300">
                  {['بدون صور محادثات كبيرة', 'ألوان موحدة', 'تجاوب للجوال', 'حركات خفيفة'].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-cyan-300/20 bg-[#061837] p-6 shadow-[0_30px_100px_rgba(34,211,238,.12)]">
                <BrandLogo size="lg" />
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-3/4 rounded-full bg-gradient-to-l from-cyan-300 to-emerald-300" />
                </div>
                <p className="mt-4 text-sm leading-7 text-gray-400">تصميم يعتمد على الرمز، التدرجات، والمساحات الهادئة بدل محتوى وهمي يثقل الصفحة.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-5 py-8 text-sm text-gray-400 md:flex-row md:items-center md:justify-between md:px-8">
        <BrandLogo size="sm" />
        <p>© {new Date().getFullYear()} Nabd Chat. واجهة عربية احترافية وسريعة.</p>
      </footer>
    </div>
  );
}

export default Landing;
