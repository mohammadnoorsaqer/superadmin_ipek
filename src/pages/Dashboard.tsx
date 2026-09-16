import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiGet } from '../lib/api';
import { Card, Skeleton } from '../components/ui';

type Stats = {
  ordersToday: number;
  pendingOrders: number;
  revenueThisMonth: number;
  lowStockCount: number;
  ordersLast30Days: { date: string; count: number }[];
  bestsellers: { id: string; sku: string; name_en: string; name_ar: string; sales_count: number }[];
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<Stats>('/dashboard/stats'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    [t('dash.ordersToday'), data.ordersToday],
    [t('dash.pending'), data.pendingOrders],
    [t('dash.revenue'), `${Number(data.revenueThisMonth).toFixed(2)} JOD`],
    [t('dash.lowStock'), data.lowStockCount],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
            <p className="mt-3 text-3xl">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-4">{t('dash.chart')}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ordersLast30Days}>
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#B4532A" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4">{t('dash.bestsellers')}</h2>
        {data.bestsellers.length ? (
          <table className="w-full text-sm">
            <tbody>
              {data.bestsellers.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="py-3">{i18n.language === 'ar' ? row.name_ar : row.name_en}</td>
                  <td className="text-muted">{row.sku}</td>
                  <td className="text-end">{row.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">{t('common.empty')}</p>
        )}
      </Card>
    </div>
  );
}
