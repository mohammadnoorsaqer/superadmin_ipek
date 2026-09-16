import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { apiGet } from '../lib/api';
import { applyDir } from '../i18n';
import { Badge, Button } from './ui';

const groups = [
  {
    key: 'dashboard',
    items: [{ to: '/', label: 'nav.dashboard' }],
  },
  {
    key: 'catalog',
    items: [
      { to: '/departments', label: 'nav.departments' },
      { to: '/categories', label: 'nav.categories' },
      { to: '/brands', label: 'nav.brands' },
      { to: '/colors', label: 'nav.colors' },
      { to: '/sizes', label: 'nav.sizes' },
      { to: '/seasons', label: 'nav.seasons' },
      { to: '/products', label: 'nav.products', badge: 'lowStock' as const },
    ],
  },
  {
    key: 'sales',
    items: [
      { to: '/orders', label: 'nav.orders', badge: 'pending' as const },
      { to: '/discounts', label: 'nav.discounts' },
    ],
  },
  {
    key: 'people',
    items: [{ to: '/users', label: 'nav.users' }],
  },
  {
    key: 'engagement',
    items: [{ to: '/notifications', label: 'nav.notifications' }],
  },
];

type Stats = { pendingOrders: number; lowStockCount: number };

export function AppShell() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const stats = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<Stats>('/dashboard/stats'),
    refetchInterval: 30000,
  });

  function toggleLang() {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    localStorage.setItem('ipek-admin-lang', next);
    applyDir(next);
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-e border-sand bg-white/50 p-4 md:block">
        <p className="mb-8 tracking-[0.25em]">{t('brand')}</p>
        {groups.map((group) => (
          <div key={group.key} className="mb-5">
            {group.key !== 'dashboard' ? (
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                {t(`nav.${group.key}`)}
              </p>
            ) : null}
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                      isActive ? 'bg-ink text-cream' : 'text-muted hover:bg-sand/70 hover:text-ink'
                    }`
                  }
                >
                  <span>{t(item.label)}</span>
                  {item.badge === 'pending' && stats.data?.pendingOrders ? (
                    <Badge tone="amber">{stats.data.pendingOrders}</Badge>
                  ) : null}
                  {item.badge === 'lowStock' && stats.data?.lowStockCount ? (
                    <Badge tone="red">{stats.data.lowStockCount}</Badge>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-sand bg-cream/90 px-4 py-3 backdrop-blur">
          <p className="md:hidden tracking-[0.2em]">IPEK</p>
          <div className="ms-auto flex items-center gap-3">
            <Button variant="ghost" onClick={toggleLang}>
              {i18n.language === 'ar' ? 'EN' : 'AR'}
            </Button>
            <span className="text-sm text-muted">{user?.username}</span>
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              {t('nav.logout')}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
