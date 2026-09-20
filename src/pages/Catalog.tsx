import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiGet, apiSend, toastError } from '../lib/api';
import { cn, emptyPage, type Paginated } from '../lib/utils';
import { Badge, Button, Dialog, Input, LangTabs, Skeleton, type Lang } from '../components/ui';
import { useConfirm } from '../lib/confirm';

type Named = {
  id: string;
  name_en: string;
  name_ar: string;
  name_tr?: string;
  is_visible?: boolean;
  hex_code?: string;
  department_id?: string;
  parent_id?: string | null;
  size_group?: string;
  code?: string;
  chest_cm_min?: number;
  chest_cm_max?: number;
  waist_cm_min?: number;
  waist_cm_max?: number;
  hip_cm_min?: number;
  hip_cm_max?: number;
  department?: { name_en: string };
};

function clampByte(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex?: string) {
  const raw = String(hex || '#B4532A').replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 180, g: 83, b: 42 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clampByte(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function ColorRgbFields({ defaultHex }: { defaultHex?: string }) {
  const { t } = useTranslation();
  const initial = hexToRgb(defaultHex);
  const [rgb, setRgb] = useState(initial);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  function update(channel: 'r' | 'g' | 'b', raw: string) {
    const next = clampByte(Number(raw));
    setRgb((prev) => ({ ...prev, [channel]: next }));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span
          className="inline-block size-10 shrink-0 rounded-md border border-sand"
          style={{ background: hex }}
          aria-hidden
        />
        <span className="font-mono text-sm text-muted">{hex}</span>
        <input type="hidden" name="hex_code" value={hex} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([
          ['r', 'R'],
          ['g', 'G'],
          ['b', 'B'],
        ] as const).map(([channel, label]) => (
          <label key={channel} className="space-y-1 text-xs text-muted">
            <span>{t(`common.rgb${label}`)}</span>
            <Input
              name={`rgb_${channel}`}
              type="number"
              min={0}
              max={255}
              step={1}
              value={rgb[channel]}
              onChange={(e) => update(channel, e.target.value)}
              required
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function CrudTable({
  path,
  title,
  visibility,
  color,
  extraForm,
  extraBody,
  extraQuery,
  withHidden,
}: {
  path: string;
  title: string;
  visibility?: boolean;
  color?: boolean;
  extraForm?: (row: Named | null) => ReactNode;
  extraBody?: (form: FormData) => Record<string, unknown>;
  extraQuery?: Record<string, unknown>;
  withHidden?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [open, setOpen] = useState<Named | null | false>(false);
  const [langTab, setLangTab] = useState<Lang>('en');
  const [errors, setErrors] = useState<Partial<Record<Lang, string>>>({});
  const [dirty, setDirty] = useState(false);
  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      includeHidden: withHidden ? true : undefined,
      ...extraQuery,
    }),
    [page, search, withHidden, extraQuery],
  );
  const query = useQuery({
    queryKey: [path, params],
    queryFn: () => apiGet<Paginated<Named>>(path, params),
  });
  const rows = (query.data?.results || emptyPage<Named>().results).filter((row) => {
    if (!visibility || visibilityFilter === 'all') return true;
    if (visibilityFilter === 'visible') return row.is_visible !== false;
    return row.is_visible === false;
  });
  const editing = open === false ? null : open;

  function openForm(row: Named | null) {
    setErrors({});
    setDirty(false);
    setLangTab('en');
    setOpen(row);
  }

  function resetForm() {
    setErrors({});
    setDirty(false);
    setLangTab('en');
    setOpen(false);
  }

  async function closeForm() {
    if (dirty) {
      const ok = await confirmDialog({
        title: t('common.discard'),
        message: t('common.unsaved'),
        variant: 'danger',
        confirmLabel: t('common.discard'),
      });
      if (!ok) return;
    }
    resetForm();
  }

  const save = useMutation({
    mutationFn: (form: FormData) => {
      const name_en = String(form.get('name_en') || '').trim();
      const name_ar = String(form.get('name_ar') || '').trim();
      const body = {
        name_en,
        name_ar,
        // Turkish stays in the schema; mirror English so create requests still validate.
        name_tr: name_en,
        ...(color ? { hex_code: String(form.get('hex_code') || '#B4532A').toUpperCase() } : {}),
        ...(visibility ? { is_visible: form.get('is_visible') === 'on' || form.get('is_visible') === 'true' } : {}),
        ...(extraBody ? extraBody(form) : {}),
      };
      return editing
        ? apiSend(`${path}/${editing.id}`, 'put', body)
        : apiSend(path, 'post', body);
    },
    onSuccess: () => {
      toast.success(t('common.save'));
      resetForm();
      void qc.invalidateQueries({ queryKey: [path] });
    },
    onError: (e) => toastError(e, i18n.language),
  });
  const toggle = useMutation({
    mutationFn: (row: Named) => apiSend(`${path}/${row.id}`, 'put', { is_visible: !row.is_visible }),
    onSuccess: () => {
      toast.success(t('common.save'));
      void qc.invalidateQueries({ queryKey: [path] });
    },
    onError: (e) => toastError(e, i18n.language),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`${path}/${id}`, 'delete'),
    onSuccess: () => {
      toast.success(t('common.delete'));
      void qc.invalidateQueries({ queryKey: [path] });
    },
    onError: (e) => toastError(e, i18n.language),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <Button onClick={() => openForm(null)}>{t('common.add')}</Button>
        </div>
      </div>
      {visibility ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'visible', 'hidden'] as const).map((key) => (
            <Button
              key={key}
              variant={visibilityFilter === key ? 'primary' : 'outline'}
              onClick={() => setVisibilityFilter(key)}
            >
              {t(`common.${key}`)}
            </Button>
          ))}
        </div>
      ) : null}
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <p className="py-16 text-center text-muted">{t('common.empty')} — {t('common.add')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-sand',
                    row.is_visible === false && 'opacity-60',
                  )}
                >
                  {color ? (
                    <td className="p-3">
                      <span className="inline-block size-5 rounded-full border" style={{ background: row.hex_code }} />
                    </td>
                  ) : null}
                  <td className="p-3">
                    <div className="font-medium">{row.name_en}</div>
                    {String(row.name_ar || '').trim() ? (
                      <div className="text-muted" dir="rtl">{row.name_ar}</div>
                    ) : (
                      <Badge tone="amber">{t('common.missingAr')}</Badge>
                    )}
                    {row.is_visible === false ? (
                      <div className="mt-1"><Badge tone="muted">{t('common.hidden')}</Badge></div>
                    ) : null}
                  </td>
                  {row.department ? <td className="p-3 text-muted">{row.department.name_en}</td> : null}
                  {row.code ? <td className="p-3 text-muted">{row.code}</td> : null}
                  {visibility ? (
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: row.is_visible ? t('common.hidden') : t('common.visible'),
                            message: row.is_visible ? t('common.hideConfirm') : t('common.showConfirm'),
                            variant: (row.is_visible ? 'danger' : 'default') as 'danger' | 'default',
                          });
                          if (ok) toggle.mutate(row);
                        }}
                      >
                        <Badge tone={row.is_visible === false ? 'muted' : 'green'}>
                          {row.is_visible === false ? t('common.hidden') : t('common.visible')}
                        </Badge>
                      </button>
                    </td>
                  ) : null}
                  <td className="p-3 text-end">
                    <Button variant="ghost" onClick={() => openForm(row)}>{t('common.edit')}</Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: t('common.delete'),
                          message: t('common.deleteConfirm'),
                          variant: 'danger',
                          confirmLabel: t('common.delete'),
                        });
                        if (ok) remove.mutate(row.id);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex gap-3 text-sm text-muted">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
        {t('common.page')} {page} {t('common.of')} {query.data?.totalPages || 1}
        <Button variant="outline" disabled={page >= (query.data?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>›</Button>
      </div>
      <Dialog
        open={open !== false}
        title={editing ? t('common.edit') : t('common.add')}
        onClose={() => void closeForm()}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void closeForm()}>{t('common.cancel')}</Button>
            <Button type="submit" form="catalog-form" disabled={save.isPending}>
              {save.isPending ? <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <form
          key={editing?.id || 'new'}
          id="catalog-form"
          className="space-y-3"
          onChange={() => setDirty(true)}
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const next: Partial<Record<Lang, string>> = {};
            if (!String(form.get('name_en') || '').trim()) next.en = t('common.required');
            if (!String(form.get('name_ar') || '').trim()) next.ar = t('common.required');
            setErrors(next);
            if (next.en || next.ar) {
              setLangTab(next.en ? 'en' : 'ar');
              return;
            }
            save.mutate(form);
          }}
        >
          <LangTabs
            value={langTab}
            onChange={setLangTab}
            errors={{ en: Boolean(errors.en), ar: Boolean(errors.ar) }}
          />
          <div className={langTab === 'en' ? 'space-y-1' : 'hidden'}>
            <Input name="name_en" defaultValue={editing?.name_en} placeholder={t('common.nameEn')} />
            {errors.en ? <p className="text-xs text-red-700">{errors.en}</p> : null}
          </div>
          <div className={langTab === 'ar' ? 'space-y-1' : 'hidden'} dir="rtl">
            <Input name="name_ar" defaultValue={editing?.name_ar} placeholder={t('common.nameAr')} className="text-right" />
            {errors.ar ? <p className="text-xs text-red-700">{errors.ar}</p> : null}
          </div>
          {color ? <ColorRgbFields defaultHex={editing?.hex_code || '#B4532A'} /> : null}
          {visibility ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_visible" defaultChecked={editing?.is_visible !== false} />
              {t('common.visibleOnStorefront')}
            </label>
          ) : null}
          {extraForm?.(editing)}
        </form>
      </Dialog>
    </div>
  );
}

export function DepartmentsPage() {
  const { t } = useTranslation();
  return <CrudTable path="/departments" title={t('nav.departments')} visibility withHidden />;
}
export function BrandsPage() {
  const { t } = useTranslation();
  return <CrudTable path="/brands" title={t('nav.brands')} />;
}
export function ColorsPage() {
  const { t } = useTranslation();
  return <CrudTable path="/colors" title={t('nav.colors')} color />;
}
export function SeasonsPage() {
  const { t } = useTranslation();
  return <CrudTable path="/seasons" title={t('nav.seasons')} />;
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const deps = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => apiGet<Paginated<Named>>('/departments', { limit: 100, includeHidden: true }),
  });
  const cats = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => apiGet<Paginated<Named>>('/categories', { limit: 100, includeHidden: true }),
  });
  return (
    <CrudTable
      path="/categories"
      title={t('nav.categories')}
      visibility
      withHidden
      extraForm={(row) => (
        <>
          <select name="department_id" defaultValue={row?.department_id} className="w-full rounded-md border border-sand bg-white px-3 py-2 text-sm" required>
            <option value="">Department</option>
            {(deps.data?.results || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name_en}</option>
            ))}
          </select>
          <select name="parent_id" defaultValue={row?.parent_id || ''} className="w-full rounded-md border border-sand bg-white px-3 py-2 text-sm">
            <option value="">Parent (optional)</option>
            {(cats.data?.results || []).filter((c) => c.id !== row?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name_en}</option>
            ))}
          </select>
        </>
      )}
      extraBody={(form) => ({
        department_id: String(form.get('department_id')),
        parent_id: String(form.get('parent_id') || '') || null,
      })}
    />
  );
}

const GROUPS = ['women', 'men', 'kids', 'accessory'];

export function SizesPage() {
  const { t } = useTranslation();
  const [group, setGroup] = useState('women');
  const extraQuery = useMemo(() => ({ size_group: group }), [group]);
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {GROUPS.map((g) => (
          <Button key={g} variant={group === g ? 'primary' : 'outline'} onClick={() => setGroup(g)}>
            {g}
          </Button>
        ))}
      </div>
      <CrudTable
        key={group}
        path="/sizes"
        title={t('nav.sizes')}
        extraQuery={extraQuery}
        extraForm={(row) => (
          <>
            <input type="hidden" name="size_group" value={row?.size_group || group} />
            <label className="block text-sm">Code
              <Input name="code" defaultValue={row?.code || 'M'} required />
            </label>
            <label className="block text-sm">Chest cm (min–max)
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input name="chest_cm_min" defaultValue={row?.chest_cm_min} />
                <Input name="chest_cm_max" defaultValue={row?.chest_cm_max} />
              </div>
            </label>
            <label className="block text-sm">Waist cm (min–max)
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input name="waist_cm_min" defaultValue={row?.waist_cm_min} />
                <Input name="waist_cm_max" defaultValue={row?.waist_cm_max} />
              </div>
            </label>
            <label className="block text-sm">Hip cm (min–max)
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input name="hip_cm_min" defaultValue={row?.hip_cm_min} />
                <Input name="hip_cm_max" defaultValue={row?.hip_cm_max} />
              </div>
            </label>
          </>
        )}
        extraBody={(form) => ({
          size_group: String(form.get('size_group') || group),
          code: String(form.get('code')),
          chest_cm_min: num(form, 'chest_cm_min'),
          chest_cm_max: num(form, 'chest_cm_max'),
          waist_cm_min: num(form, 'waist_cm_min'),
          waist_cm_max: num(form, 'waist_cm_max'),
          hip_cm_min: num(form, 'hip_cm_min'),
          hip_cm_max: num(form, 'hip_cm_max'),
        })}
      />
    </div>
  );
}

function num(form: FormData, key: string) {
  const v = String(form.get(key) || '');
  return v ? Number(v) : undefined;
}
