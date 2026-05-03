import { useThemeStore } from '../stores';

function ThemeToggle({ compact = false, className = '' }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 shadow-sm backdrop-blur transition hover:bg-white/10 hover:text-white ${className}`}
      title={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    >
      <span className="grid h-7 w-7 place-items-center rounded-xl bg-dark-100 text-base">
        {isDark ? '☀️' : '🌙'}
      </span>
      {!compact && <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
    </button>
  );
}

export default ThemeToggle;
