import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../lib/utils';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  }
>(function Button({ className, variant = 'primary', ...props }, ref) {
  const styles = {
    primary: 'bg-ink text-cream hover:bg-accent',
    ghost: 'text-muted hover:text-ink hover:bg-sand/60',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    outline: 'border border-sand hover:border-ink',
  }[variant];
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    />
  );
});

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
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'flex max-h-[92vh] w-full flex-col rounded-t-xl bg-cream shadow-xl sm:rounded-xl',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-sand px-5 py-4">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted" aria-label="Close">
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 shrink-0 border-t border-sand bg-cream px-5 py-4">
            {footer}
          </div>
        ) : null}
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

export type Lang = 'en' | 'ar';

export function LangTabs({
  value,
  onChange,
  errors,
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  errors?: Partial<Record<Lang, boolean>>;
}) {
  return (
    <div className="flex gap-2 border-b border-sand pb-2">
      {([
        ['en', 'English'],
        ['ar', 'العربية'],
      ] as const).map(([lang, label]) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm',
            value === lang ? 'bg-ink text-cream' : 'text-muted',
          )}
        >
          {label}
          {errors?.[lang] ? (
            <span className="size-1.5 rounded-full bg-red-600" aria-label="has errors" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-8 w-full', className)} />;
}
