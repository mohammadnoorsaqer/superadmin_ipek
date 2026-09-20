import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiGet, apiSend, toastError } from '../lib/api';
import { emptyPage, type Paginated } from '../lib/utils';
import { Badge, Button, Input, Skeleton } from '../components/ui';
import { useConfirm } from '../lib/confirm';

type User = {
  id: string;
  username: string;
  email: string;
  whatsapp_number?: string;
  role: 'user' | 'superadmin';
  is_active: boolean;
  created_at: string;
};

export function UsersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ page, limit: 20, search: search || undefined }), [page, search]);
  const list = useQuery({
    queryKey: ['users', params],
    queryFn: () => apiGet<Paginated<User>>('/users', params),
  });
  const rows = list.data?.results || emptyPage<User>().results;

  const act = useMutation({
    mutationFn: (row: User) =>
      apiSend(`/users/${row.id}/${row.is_active ? 'deactivate' : 'activate'}`, 'patch', {}),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });
  const role = useMutation({
    mutationFn: (row: User) =>
      apiSend(`/users/${row.id}/role`, 'patch', { role: row.role === 'superadmin' ? 'user' : 'superadmin' }),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.users')}</h1>
        <Input placeholder={t('common.search')} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      </div>
      {list.isLoading ? <Skeleton className="h-64" /> : !rows.length ? (
        <p className="text-muted">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="p-3">{row.username}</td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.whatsapp_number}</td>
                  <td className="p-3"><Badge>{row.role}</Badge></td>
                  <td className="p-3"><Badge tone={row.is_active ? 'green' : 'red'}>{String(row.is_active)}</Badge></td>
                  <td className="p-3 text-end">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: t('common.confirm'),
                          message: row.is_active ? t('users.deactivate') : t('users.activate'),
                          variant: 'danger',
                        });
                        if (ok) act.mutate(row);
                      }}
                    >
                      {row.is_active ? t('users.deactivate') : t('users.activate')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: t('users.promote'),
                          message: t('users.role'),
                          variant: 'danger',
                        });
                        if (ok) role.mutate(row);
                      }}
                    >
                      {t('users.role')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Note = { id: string; title_en: string; created_at: string };

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<Paginated<Note>>('/notifications', { limit: 30 }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        className="space-y-3 rounded-xl border border-sand bg-white/60 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const form = new FormData(formEl);
          const ok = await confirmDialog({
            title: t('notify.broadcast'),
            message: t('notify.confirm'),
            variant: 'danger',
            confirmLabel: t('notify.sendAll'),
          });
          if (!ok) return;
          const title_en = String(form.get('title_en') || '').trim();
          const title_ar = String(form.get('title_ar') || '').trim();
          const message_en = String(form.get('message_en') || '').trim();
          const message_ar = String(form.get('message_ar') || '').trim();
          try {
            await apiSend('/notifications/broadcast', 'post', {
              title_en,
              title_ar,
              title_tr: title_en,
              message_en,
              message_ar,
              message_tr: message_en,
            });
            toast.success(t('notify.sendAll'));
            void qc.invalidateQueries({ queryKey: ['notifications'] });
            formEl.reset();
          } catch (err) {
            toastError(err, i18n.language);
          }
        }}
      >
        <h1 className="text-2xl">{t('notify.broadcast')}</h1>
        <Input name="title_en" placeholder="Title EN" required />
        <Input name="title_ar" placeholder="Title AR" className="text-right" dir="rtl" required />
        <textarea name="message_en" className="w-full rounded-md border border-sand p-2" placeholder="Message EN" required />
        <textarea name="message_ar" className="w-full rounded-md border border-sand p-2 text-right" dir="rtl" placeholder="Message AR" required />
        <Button type="submit">{t('notify.sendAll')}</Button>
      </form>
      <div>
        <h2 className="mb-3">{t('nav.notifications')}</h2>
        {(list.data?.results || []).map((n) => (
          <p key={n.id} className="border-b border-sand py-2 text-sm">
            {n.title_en}
            <span className="ms-2 text-muted">{new Date(n.created_at).toLocaleString()}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
