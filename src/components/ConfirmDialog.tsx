import { useEffect, useId, useRef } from 'react';
import { Button } from './ui';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const latest = useRef({ loading, onCancel });
  latest.current = { loading, onCancel };
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (latest.current.loading) return;
        event.preventDefault();
        // Keep the ESC from also closing a Dialog underneath this confirm.
        event.stopPropagation();
        latest.current.onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey ? active === first || !panelRef.current?.contains(active) : active === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const trigger = triggerRef.current;
      triggerRef.current = null;
      trigger?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-full max-w-md rounded-xl bg-cream p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg">
          {title}
        </h2>
        <p id={messageId} className="mt-3 text-sm leading-6 text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
