import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

// font-size: 16px on mobile prevents iOS Safari's zoom-on-focus.
// Drops to 15px at sm+ to keep the editorial weight on desktop.
const base =
  'w-full rounded-[10px] border border-rule bg-surface px-3 text-[16px] sm:text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-bg transition-colors';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${base} h-11 ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`${base} py-2.5 leading-relaxed resize-y min-h-[88px] ${className}`} {...rest} />;
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-wider text-ink-2 mb-1.5">
      {children}
    </label>
  );
}
