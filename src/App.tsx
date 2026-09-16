import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import {
  BrandsPage,
  CategoriesPage,
  ColorsPage,
  DepartmentsPage,
  SeasonsPage,
  SizesPage,
} from './pages/Catalog';
import { ProductEditPage, ProductsPage } from './pages/Products';
import { DiscountsPage, OrdersPage } from './pages/Sales';
import { NotificationsPage, UsersPage } from './pages/People';

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="p-10 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><AppShell /></Guard>}>
        <Route index element={<DashboardPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="colors" element={<ColorsPage />} />
        <Route path="sizes" element={<SizesPage />} />
        <Route path="seasons" element={<SeasonsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductEditPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
