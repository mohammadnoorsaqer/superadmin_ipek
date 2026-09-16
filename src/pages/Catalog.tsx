import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiGet, apiSend, toastError } from '../lib/api';
import { emptyPage, type Paginated } from '../lib/utils';
import { Button, Drawer, Input, Skeleton } from '../components/ui';

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Named | null | false>(false);
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
  const rows = query.data?.results || emptyPage<Named>().results;
  const editing = open === false ? null : open;

  const save = useMutation({
    mutationFn: (form: FormData) => {
      const body = {
        name_en: String(form.get('name_en')),
        name_ar: String(form.get('name_ar')),
        name_tr: String(form.get('name_tr')),
        ...(color ? { hex_code: String(form.get('hex_code')) } : {}),
        ...(extraBody ? extraBody(form) : {}),
      };
      return editing
        ? apiSend(`${path}/${editing.id}`, 'put', body)
        : apiSend(path, 'post', body);
    },
    onSuccess: () => {
      toast.success(t('common.save'));
      setOpen(false);
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
        <div className="flex gap-2">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <Button onClick={() => setOpen(null)}>{t('common.add')}</Button>
        </div>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <p className="py-16 text-center text-muted">{t('common.empty')} — {t('common.add')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand bg-white/60">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  {color ? (
                    <td className="p-3">
                      <span className="inline-block size-5 rounded-full border" style={{ background: row.hex_code }} />
                    </td>
                  ) : null}
                  <td className="p-3">{row.name_en}</td>
                  <td className="p-3">{row.name_ar}</td>
                  {row.department ? <td className="p-3 text-muted">{row.department.name_en}</td> : null}
                  {row.code ? <td className="p-3 text-muted">{row.code}</td> : null}
                  {visibility ? (
                    <td className="p-3">
                      <button type="button" onClick={() => toggle.mutate(row)}>
                        {row.is_visible ? t('common.yes') : t('common.no')}
                      </button>
                    </td>
                  ) : null}
                  <td className="p-3 text-end">
                    <Button variant="ghost" onClick={() => setOpen(row)}>{t('common.edit')}</Button>
                    <Button variant="ghost" onClick={() => { if (confirm(t('common.delete'))) remove.mutate(row.id); }}>
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
      <Drawer open={open !== false} title={editing ? t('common.edit') : t('common.add')} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            save.mutate(new FormData(e.currentTarget));
          }}
        >
          <Input name="name_en" defaultValue={editing?.name_en} placeholder={t('common.nameEn')} required />
          <Input name="name_ar" defaultValue={editing?.name_ar} placeholder={t('common.nameAr')} required />
          <Input name="name_tr" defaultValue={editing?.name_tr} placeholder={t('common.nameTr')} required />
          {color ? <Input name="hex_code" defaultValue={editing?.hex_code || '#B4532A'} required /> : null}
          {extraForm?.(editing)}
          <Button className="w-full" type="submit">{t('common.save')}</Button>
        </form>
      </Drawer>
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
