import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm?: () => Promise<unknown>;
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOptions(null);
    setLoading(false);
    resolve?.(value);
  }, []);

  const askConfirm = useCallback<ConfirmFn>((opts) => {
    resolver.current?.(false);
    setLoading(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={askConfirm}>
      {children}
      <ConfirmDialog
        open={Boolean(options)}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmLabel={options?.confirmLabel || t('common.confirm')}
        cancelLabel={options?.cancelLabel || t('common.cancel')}
        variant={options?.variant}
        loading={loading}
        onCancel={() => {
          if (!loading) settle(false);
        }}
        onConfirm={() => {
          const action = options?.onConfirm;
          if (!action) {
            settle(true);
            return;
          }
          setLoading(true);
          void action()
            .then(() => settle(true))
            .catch(() => settle(false));
        }}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
