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
      className={`rounded-2xl p-6 ${
        interactive ? 'black-surface-interactive cursor-pointer' : 'black-surface'
      } ${
        glow ? 'border-white/20' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
