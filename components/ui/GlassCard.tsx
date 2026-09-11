import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  interactive = false,
  glow = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`relative rounded-3xl p-6 ${
        interactive ? 'glass-panel-interactive cursor-pointer' : 'glass-panel'
      } ${
        glow ? 'border-cyan-500/30 shadow-[0_0_25px_rgba(0,240,255,0.1)]' : ''
      } ${className}`}
      {...props}
    >
      {/* Top subtle specular light reflection */}
      <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}
