// Animated gradient + floating shapes for a unique 3D-feel background.
// Pure CSS/SVG, no WebGL — fast and theme-aware.
export const FloatingShapes = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
    <div className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-primary/15 blur-3xl animate-[float_18s_ease-in-out_infinite]" />
    <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] rounded-full bg-accent/15 blur-3xl animate-[float_22s_ease-in-out_infinite_reverse]" />
    <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-primary-glow/10 blur-3xl animate-[float_26s_ease-in-out_infinite]" />
    <svg className="absolute top-20 right-12 w-32 h-32 opacity-30 animate-[spin_40s_linear_infinite]" viewBox="0 0 100 100">
      <polygon points="50,5 95,80 5,80" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" />
    </svg>
    <svg className="absolute bottom-32 left-10 w-24 h-24 opacity-25 animate-[spin_60s_linear_infinite_reverse]" viewBox="0 0 100 100">
      <rect x="10" y="10" width="80" height="80" fill="none" stroke="hsl(var(--accent))" strokeWidth="0.5" />
      <rect x="20" y="20" width="60" height="60" fill="none" stroke="hsl(var(--accent))" strokeWidth="0.5" />
    </svg>
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0,0) scale(1); }
        33% { transform: translate(40px,-30px) scale(1.05); }
        66% { transform: translate(-30px,40px) scale(0.95); }
      }
    `}</style>
  </div>
);
