import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { apiMessage } from '../lib/api';
import { Button, Input } from '../components/ui';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, ready, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || '/';

  if (ready && user) return <Navigate to={from} replace />;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form
        className="w-full space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          setPending(true);
          const form = new FormData(event.currentTarget);
          try {
            await login(String(form.get('email')), String(form.get('password')));
          } catch (err) {
            setError(
              (err as Error).message === 'NOT_SUPERADMIN'
                ? t('login.unauthorized')
                : apiMessage(err, i18n.language),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-accent">IPEK</p>
        <h1 className="text-3xl">{t('login.title')}</h1>
        <p className="text-sm text-muted">{t('login.subtitle')}</p>
        <label className="block text-sm">
          {t('login.email')}
          <Input name="email" type="email" required className="mt-1" />
        </label>
        <label className="block text-sm">
          {t('login.password')}
          <Input name="password" type="password" required className="mt-1" />
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t('common.loading') : t('login.submit')}
        </Button>
      </form>
    </div>
  );
}
