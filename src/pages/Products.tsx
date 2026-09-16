import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiGet, apiSend, toastError, uploadImage } from '../lib/api';
import { emptyPage, type Paginated } from '../lib/utils';
import { Badge, Button, Input, Skeleton } from '../components/ui';

type Product = {
  id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  name_tr?: string;
  description_en?: string;
  description_ar?: string;
  description_tr?: string;
  category_id: string;
  brand_id?: string;
  season_id?: string;
  base_price: number;
  sales_count: number;
  is_active: boolean;
  images?: { id: string; image_url?: string; image_key: string; color_id?: string; is_primary?: boolean }[];
  variants?: Variant[];
  category?: { name_en: string };
  current_discount?: { id: string; discount_type: string; value: number; end_date: string } | null;
};

type Variant = {
  id: string;
  color_id: string;
  size_id: string;
  stock_quantity: number;
  variant_sku: string;
  color?: { id: string; name_en: string; hex_code: string };
  size?: { id: string; code: string };
};

type Named = { id: string; name_en: string; name_ar?: string; hex_code?: string; code?: string };

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined, includeHidden: true }),
    [page, search],
  );
  const list = useQuery({
    queryKey: ['products', params],
    queryFn: () => apiGet<Paginated<Product>>('/products', params),
  });
  const toggle = useMutation({
    mutationFn: (row: Product) =>
      apiSend(`/products/${row.id}/status`, 'patch', { is_active: !row.is_active }),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toastError(e, i18n.language),
  });
  const rows = list.data?.results || [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.products')}</h1>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={t('common.search')} />
          <Link to="/products/new" className="rounded-md bg-ink px-3 py-2 text-sm text-cream">{t('common.add')}</Link>
        </div>
      </div>
      {list.isLoading ? <Skeleton className="h-64" /> : !rows.length ? (
        <p className="py-16 text-center text-muted">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="p-3">
                    {row.images?.[0]?.image_url ? (
                      <img src={row.images[0].image_url} alt="" className="h-12 w-10 object-cover" />
                    ) : <div className="h-12 w-10 bg-sand" />}
                  </td>
                  <td className="p-3">{row.name_en}</td>
                  <td className="p-3 text-muted">{row.category?.name_en}</td>
                  <td className="p-3">{row.base_price}</td>
                  <td className="p-3">{row.sales_count}</td>
                  <td className="p-3">
                    <button type="button" onClick={() => toggle.mutate(row)}>
                      <Badge tone={row.is_active ? 'green' : 'muted'}>{row.is_active ? t('common.active') : 'off'}</Badge>
                    </button>
                  </td>
                  <td className="p-3"><Link to={`/products/${row.id}`}>{t('common.edit')}</Link></td>
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
    </div>
  );
}

export function ProductEditPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ['categories-all'], queryFn: () => apiGet<Paginated<Named>>('/categories', { limit: 100, includeHidden: true }) });
  const brands = useQuery({ queryKey: ['brands-all'], queryFn: () => apiGet<Paginated<Named>>('/brands', { limit: 100 }) });
  const seasons = useQuery({ queryKey: ['seasons-all'], queryFn: () => apiGet<Paginated<Named>>('/seasons', { limit: 100 }) });
  const colors = useQuery({ queryKey: ['colors-all'], queryFn: () => apiGet<Paginated<Named>>('/colors', { limit: 100 }) });
  const sizes = useQuery({ queryKey: ['sizes-all'], queryFn: () => apiGet<Paginated<Named>>('/sizes', { limit: 100 }) });
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiGet<Product>(`/products/${id}`, { includeHidden: true }),
    enabled: !isNew && Boolean(id),
  });

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const body = {
        sku: String(form.get('sku')),
        name_en: String(form.get('name_en')),
        name_ar: String(form.get('name_ar')),
        name_tr: String(form.get('name_tr')),
        description_en: String(form.get('description_en') || ''),
        description_ar: String(form.get('description_ar') || ''),
        description_tr: String(form.get('description_tr') || ''),
        category_id: String(form.get('category_id')),
        brand_id: String(form.get('brand_id') || '') || null,
        season_id: String(form.get('season_id') || '') || null,
        base_price: Number(form.get('base_price')),
        is_active: form.get('is_active') === 'on',
      };
      if (isNew) {
        const created = await apiSend<Product>('/products', 'post', body);
        return created;
      }
      return apiSend<Product>(`/products/${id}`, 'put', body);
    },
    onSuccess: (row) => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['products'] });
      if (isNew && row?.id) nav(`/products/${row.id}`);
    },
    onError: (e) => toastError(e, i18n.language),
  });

  const p = product.data;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl">{isNew ? t('common.add') : p?.name_en}</h1>
      <form
        className="grid gap-3 rounded-xl border border-sand bg-white/60 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <Input name="sku" defaultValue={p?.sku} placeholder="SKU" required />
        <Input name="base_price" type="number" step="0.01" defaultValue={p?.base_price} placeholder="Price" required />
        <Input name="name_en" defaultValue={p?.name_en} placeholder={t('common.nameEn')} required />
        <Input name="name_ar" defaultValue={p?.name_ar} placeholder={t('common.nameAr')} required />
        <Input name="name_tr" defaultValue={p?.name_tr} placeholder={t('common.nameTr')} required />
        <select name="category_id" defaultValue={p?.category_id} className="rounded-md border border-sand px-3 py-2" required>
          <option value="">Category</option>
          {(cats.data?.results || []).map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
        <select name="brand_id" defaultValue={p?.brand_id} className="rounded-md border border-sand px-3 py-2">
          <option value="">Brand</option>
          {(brands.data?.results || []).map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
        <select name="season_id" defaultValue={p?.season_id} className="rounded-md border border-sand px-3 py-2">
          <option value="">Season</option>
          {(seasons.data?.results || []).map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
        <textarea name="description_en" defaultValue={p?.description_en} className="rounded-md border border-sand p-2 sm:col-span-2" placeholder="Description EN" />
        <textarea name="description_ar" defaultValue={p?.description_ar} className="rounded-md border border-sand p-2 sm:col-span-2" placeholder="Description AR" />
        <textarea name="description_tr" defaultValue={p?.description_tr} className="rounded-md border border-sand p-2 sm:col-span-2" placeholder="Description TR" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} /> {t('common.active')}</label>
        <Button type="submit" className="sm:col-span-2">{t('common.save')}</Button>
      </form>
      {!isNew && p ? (
        <>
          <VariantMatrix product={p} colors={colors.data?.results || []} sizes={sizes.data?.results || []} />
          <ImageManager product={p} colors={colors.data?.results || []} />
          <DiscountPanel product={p} />
        </>
      ) : null}
    </div>
  );
}

function VariantMatrix({ product, colors, sizes }: { product: Product; colors: Named[]; sizes: Named[] }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const used = product.variants || [];
  const colorIds = Array.from(new Set(used.map((v) => v.color_id)));
  const sizeIds = Array.from(new Set(used.map((v) => v.size_id)));
  const [addColor, setAddColor] = useState('');
  const [addSize, setAddSize] = useState('');

  const upsert = useMutation({
    mutationFn: async (payload: { color_id: string; size_id: string; stock_quantity: number; id?: string }) => {
      if (payload.id) return apiSend(`/product-variants/${payload.id}`, 'put', { stock_quantity: payload.stock_quantity });
      return apiSend('/product-variants', 'post', {
        product_id: product.id,
        color_id: payload.color_id,
        size_id: payload.size_id,
        stock_quantity: payload.stock_quantity,
        variant_sku: `${product.sku}-${payload.color_id.slice(0, 4)}-${payload.size_id.slice(0, 4)}`,
      });
    },
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['product', product.id] });
    },
    onError: (e) => toastError(e, i18n.language),
  });

  const cols = colors.filter((c) => colorIds.includes(c.id) || c.id === addColor);
  const rows = sizes.filter((s) => sizeIds.includes(s.id) || s.id === addSize);

  return (
    <section className="rounded-xl border border-sand bg-white/60 p-5">
      <h2 className="mb-4">Variants</h2>
      <div className="mb-4 flex gap-2">
        <select className="rounded-md border border-sand px-2 py-1" value={addColor} onChange={(e) => setAddColor(e.target.value)}>
          <option value="">Add color</option>
          {colors.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
        <select className="rounded-md border border-sand px-2 py-1" value={addSize} onChange={(e) => setAddSize(e.target.value)}>
          <option value="">Add size</option>
          {sizes.map((s) => <option key={s.id} value={s.id}>{s.code || s.name_en}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th />
              {cols.map((c) => <th key={c.id} className="p-2">{c.name_en}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="p-2">{s.code || s.name_en}</td>
                {cols.map((c) => {
                  const cell = used.find((v) => v.color_id === c.id && v.size_id === s.id);
                  return (
                    <td key={c.id} className="p-1">
                      <input
                        type="number"
                        min={0}
                        defaultValue={cell?.stock_quantity ?? 0}
                        className="w-20 rounded border border-sand px-2 py-1"
                        onBlur={(e) =>
                          upsert.mutate({
                            id: cell?.id,
                            color_id: c.id,
                            size_id: s.id,
                            stock_quantity: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImageManager({ product, colors }: { product: Product; colors: Named[] }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [colorId, setColorId] = useState(colors[0]?.id || '');
  const images = (product.images || []).filter((img) => !colorId || img.color_id === colorId);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadImage(file);
        await apiSend('/product-images', 'post', {
          product_id: product.id,
          color_id: colorId || null,
          image_key: uploaded.image_key,
          is_primary: !(product.images || []).length,
        });
      }
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: ['product', product.id] });
    } catch (e) {
      toastError(e, i18n.language);
    }
  }

  return (
    <section className="rounded-xl border border-sand bg-white/60 p-5">
      <h2 className="mb-4">Images</h2>
      <div className="mb-3 flex gap-2">
        {colors.map((c) => (
          <button key={c.id} type="button" onClick={() => setColorId(c.id)} className="size-6 rounded-full border" style={{ background: c.hex_code, outline: colorId === c.id ? '2px solid #2B2B2B' : undefined }} />
        ))}
      </div>
      <input type="file" accept="image/*" multiple onChange={(e) => void onFiles(e.target.files)} />
      <div className="mt-4 grid grid-cols-4 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative">
            {img.image_url ? <img src={img.image_url} alt="" className="aspect-square w-full object-cover" /> : null}
            <Button
              variant="ghost"
              className="absolute start-1 top-1 bg-white/80"
              onClick={async () => {
                await apiSend(`/product-images/${img.id}`, 'put', { is_primary: true });
                void qc.invalidateQueries({ queryKey: ['product', product.id] });
              }}
            >
              {img.is_primary ? '★' : '☆'}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DiscountPanel({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const d = product.current_discount;
  return (
    <section className="rounded-xl border border-sand bg-white/60 p-5">
      <h2 className="mb-4">Discount</h2>
      {d ? (
        <p className="mb-3 text-sm text-accent">{d.discount_type} {d.value} · until {new Date(d.end_date).toLocaleDateString()}</p>
      ) : null}
      <form
        className="grid gap-2 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            await apiSend('/discounts', 'post', {
              product_id: product.id,
              discount_type: String(form.get('discount_type')),
              value: Number(form.get('value')),
              start_date: new Date(String(form.get('start_date'))).toISOString(),
              end_date: new Date(String(form.get('end_date'))).toISOString(),
              is_active: true,
            });
            toast.success(t('common.save'));
            void qc.invalidateQueries({ queryKey: ['product', product.id] });
          } catch (err) {
            toastError(err, i18n.language);
          }
        }}
      >
        <select name="discount_type" className="rounded-md border border-sand px-2 py-2">
          <option value="percentage">percentage</option>
          <option value="fixed">fixed</option>
        </select>
        <Input name="value" type="number" step="0.01" placeholder="Value" required />
        <Input name="start_date" type="datetime-local" required />
        <Input name="end_date" type="datetime-local" required />
        <Button type="submit" className="sm:col-span-4">{t('common.add')}</Button>
      </form>
    </section>
  );
}
