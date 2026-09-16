import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
}) {
  const styles = {
    primary: 'bg-ink text-cream hover:bg-accent',
    ghost: 'text-muted hover:text-ink hover:bg-sand/60',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    outline: 'border border-sand hover:border-ink',
  }[variant];
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-ink',
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-sand bg-white/70 p-5', className)}>{children}</div>;
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'amber' | 'green' | 'red' | 'ink';
}) {
  const styles = {
    muted: 'bg-sand text-ink',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    ink: 'bg-ink text-cream',
  }[tone];
  return <span className={cn('rounded-full px-2 py-0.5 text-xs', styles)}>{children}</span>;
}

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-cream p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <div className="h-full w-full max-w-md overflow-y-auto bg-cream p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-8 w-full', className)} />;
}
