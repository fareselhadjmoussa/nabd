function BrandLogo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { mark: 'w-9 h-9', text: 'text-base', sub: 'text-[10px]', image: 'h-10' },
    md: { mark: 'w-12 h-12', text: 'text-xl', sub: 'text-xs', image: 'h-12' },
    lg: { mark: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm', image: 'h-16' },
  };

  const current = sizes[size] || sizes.md;

  if (variant === 'image') {
    return (
      <img
        src="/nabd-navbar-logo.png"
        alt="Nabd Chat"
        className={`${current.image} object-contain ${className}`}
        loading="eager"
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${current.mark} relative shrink-0 rounded-2xl bg-[#071b3d] ring-1 ring-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,.2)] overflow-hidden`}>
        <img src="/nabd-logo-mark.png" alt="نبض" className="absolute inset-0 w-full h-full object-contain p-1.5" loading="eager" />
      </div>
      {variant !== 'mark' && (
        <div className="leading-tight">
          <h1 className={`${current.text} font-black tracking-tight text-white brand-title`}>نبض شات</h1>
          <p className={`${current.sub} text-cyan-200/80 tracking-[0.35em] uppercase`}>NABD CHAT</p>
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
