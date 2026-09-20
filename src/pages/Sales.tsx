import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiGet, apiSend, fileUrl, toastError } from '../lib/api';
import { emptyPage, type Paginated } from '../lib/utils';
import { Badge, Button, Drawer, Input, Skeleton } from '../components/ui';
import { useConfirm } from '../lib/confirm';

type Order = {
  id: string;
  status: string;
  payment_method: string;
  order_source: string;
  total_amount: number;
  street_address?: string;
  payment_proof_key?: string;
  confirmed_at?: string;
  guest_username?: string;
  guest_whatsapp_number?: string;
  created_at: string;
  user?: { username: string; email: string; whatsapp_number?: string };
  items?: {
    id: string;
    quantity: number;
    unit_price: number;
    variant?: {
      color?: { name_en: string };
      size?: { code: string };
      product?: { name_en: string };
    };
  }[];
};

const tone: Record<string, 'amber' | 'green' | 'red' | 'muted'> = {
  pending: 'amber',
  confirmed: 'green',
  shipped: 'muted',
  delivered: 'green',
  cancelled: 'red',
};

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [source, setSource] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: status || undefined,
      payment_method: payment || undefined,
      order_source: source || undefined,
    }),
    [page, search, status, payment, source],
  );
  const list = useQuery({
    queryKey: ['orders', params],
    queryFn: () => apiGet<Paginated<Order>>('/orders', params),
  });
  const detail = useQuery({
    queryKey: ['order', openId],
    queryFn: () => apiGet<Order>(`/orders/${openId}`),
    enabled: Boolean(openId),
  });
  const rows = list.data?.results || emptyPage<Order>().results;
  const open = detail.data;

  const confirmOrder = useMutation({
    mutationFn: (id: string) => apiSend(`/orders/${id}/confirm`, 'post'),
    onSuccess: () => {
      toast.success(t('orders.confirmed'));
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['order'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });

  const ship = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiSend(`/orders/${id}/status`, 'patch', { status }),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['order'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.orders')}</h1>
        <div className="flex flex-wrap gap-2">
          <Input placeholder={t('common.search')} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <select className="rounded-md border border-sand px-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('orders.status')}</option>
            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="rounded-md border border-sand px-2" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">{t('orders.payment')}</option>
            <option value="cash">cash</option>
            <option value="cliq">cliq</option>
          </select>
          <select className="rounded-md border border-sand px-2" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{t('orders.source')}</option>
            <option value="website">website</option>
            <option value="whatsapp">whatsapp</option>
          </select>
          <Button onClick={() => setGuest(true)}>{t('orders.whatsapp')}</Button>
        </div>
      </div>
      {list.isLoading ? <Skeleton className="h-64" /> : !rows.length ? (
        <p className="py-16 text-center text-muted">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-t border-sand" onClick={() => setOpenId(row.id)}>
                  <td className="p-3 font-mono text-xs">{row.id.slice(0, 8)}</td>
                  <td className="p-3">{row.user?.username || row.guest_username || t('orders.guest')}</td>
                  <td className="p-3"><Badge tone={tone[row.status] || 'muted'}>{row.status}</Badge></td>
                  <td className="p-3">{row.payment_method}</td>
                  <td className="p-3">{row.order_source}</td>
                  <td className="p-3">{row.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex gap-3 text-sm">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
        {page} / {list.data?.totalPages || 1}
        <Button variant="outline" disabled={page >= (list.data?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>›</Button>
      </div>
      <Drawer open={Boolean(openId)} title={open?.id || t('common.loading')} onClose={() => setOpenId(null)}>
        {detail.isLoading || !open ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-3 text-sm">
            <p>{open.user?.email || `${open.guest_username || ''} · ${open.guest_whatsapp_number || ''}`}</p>
            <p>{open.street_address}</p>
            <p>{open.payment_method} · {open.order_source}</p>
            {(open.items || []).map((item) => (
              <p key={item.id}>
                {item.variant?.product?.name_en} · {item.variant?.color?.name_en} · {item.variant?.size?.code} · ×{item.quantity} · {item.unit_price}
              </p>
            ))}
            <p className="font-medium">{open.total_amount} JOD</p>
            {open.payment_method === 'cliq' && open.payment_proof_key ? (
              <img alt={t('orders.proof')} src={fileUrl(open.payment_proof_key)} className="w-full rounded-md" />
            ) : null}
            {open.status === 'pending' ? (
              <Button className="w-full" disabled={confirmOrder.isPending} onClick={() => confirmOrder.mutate(open.id)}>
                {t('orders.confirm')}
              </Button>
            ) : (
              <p>{t('orders.confirmed')} {open.confirmed_at ? new Date(open.confirmed_at).toLocaleString() : ''}</p>
            )}
            {open.status === 'confirmed' ? (
              <Button className="w-full" variant="outline" onClick={() => ship.mutate({ id: open.id, status: 'shipped' })}>
                shipped
              </Button>
            ) : null}
            {open.status === 'shipped' ? (
              <Button className="w-full" variant="outline" onClick={() => ship.mutate({ id: open.id, status: 'delivered' })}>
                delivered
              </Button>
            ) : null}
            {open.status === 'pending' || open.status === 'confirmed' ? (
              <Button
                className="w-full"
                variant="danger"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: t('common.confirm'),
                    message: t('orders.cancelConfirm', { defaultValue: 'Cancel this order?' }),
                    variant: 'danger',
                  });
                  if (ok) ship.mutate({ id: open.id, status: 'cancelled' });
                }}
              >
                cancelled
              </Button>
            ) : null}
          </div>
        )}
      </Drawer>
      <GuestForm open={guest} onClose={() => setGuest(false)} />
    </div>
  );
}

type ProductOpt = {
  id: string;
  name_en: string;
  variants?: { id: string; stock_quantity: number; color?: { name_en: string }; size?: { code: string } }[];
};

function GuestForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const products = useQuery({
    queryKey: ['products-picker'],
    queryFn: () => apiGet<Paginated<ProductOpt>>('/products', { limit: 100, includeHidden: true }),
    enabled: open,
  });
  const product = useQuery({
    queryKey: ['product-picker', productId],
    queryFn: () => apiGet<ProductOpt>(`/products/${productId}`, { includeHidden: true }),
    enabled: open && Boolean(productId),
  });

  return (
    <Drawer open={open} title={t('orders.whatsapp')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            await apiSend('/orders/guest', 'post', {
              guest_username: String(form.get('guest_username')),
              guest_whatsapp_number: String(form.get('guest_whatsapp_number')),
              street_address: String(form.get('street_address')),
              payment_method: String(form.get('payment_method')),
              items: [{
                product_variant_id: String(form.get('product_variant_id')),
                quantity: Number(form.get('quantity')),
              }],
            });
            toast.success(t('common.save'));
            void qc.invalidateQueries({ queryKey: ['orders'] });
            onClose();
          } catch (err) {
            toastError(err, i18n.language);
          }
        }}
      >
        <Input name="guest_username" placeholder="Name" required />
        <Input name="guest_whatsapp_number" placeholder="WhatsApp" required />
        <Input name="street_address" placeholder="Address" required />
        <select
          className="w-full rounded-md border border-sand px-3 py-2"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        >
          <option value="">Product</option>
          {(products.data?.results || []).map((p) => (
            <option key={p.id} value={p.id}>{p.name_en}</option>
          ))}
        </select>
        <select name="product_variant_id" className="w-full rounded-md border border-sand px-3 py-2" required>
          <option value="">Variant</option>
          {(product.data?.variants || []).map((v) => (
            <option key={v.id} value={v.id}>
              {[v.color?.name_en, v.size?.code, `stock ${v.stock_quantity}`].filter(Boolean).join(' · ')}
            </option>
          ))}
        </select>
        <Input name="quantity" type="number" min={1} defaultValue={1} required />
        <select name="payment_method" className="w-full rounded-md border border-sand px-3 py-2">
          <option value="cash">cash</option>
          <option value="cliq">cliq</option>
        </select>
        <Button className="w-full" type="submit">{t('common.save')}</Button>
      </form>
    </Drawer>
  );
}

type Discount = {
  id: string;
  product_id: string;
  discount_type: string;
  value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  product?: { name_en: string };
};

export function DiscountsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const list = useQuery({
    queryKey: ['discounts'],
    queryFn: () => apiGet<Paginated<Discount>>('/discounts', { limit: 50 }),
  });
  const endNow = useMutation({
    mutationFn: (row: Discount) =>
      apiSend(`/discounts/${row.id}`, 'put', { end_date: new Date().toISOString(), is_active: false }),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });
  const rows = list.data?.results || [];
  return (
    <div>
      <h1 className="mb-6 text-2xl">{t('nav.discounts')}</h1>
      {list.isLoading ? <Skeleton className="h-64" /> : !rows.length ? (
        <p className="text-muted">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="p-3">{row.product?.name_en || row.product_id.slice(0, 8)}</td>
                  <td className="p-3">{row.discount_type} {row.value}</td>
                  <td className="p-3">{new Date(row.start_date).toLocaleDateString()} → {new Date(row.end_date).toLocaleDateString()}</td>
                  <td className="p-3"><Badge tone={row.is_active ? 'green' : 'muted'}>{String(row.is_active)}</Badge></td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: t('common.confirm'),
                          message: t('discounts.endConfirm', { defaultValue: 'End this discount now?' }),
                          variant: 'danger',
                        });
                        if (ok) endNow.mutate(row);
                      }}
                    >
                      End now
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
