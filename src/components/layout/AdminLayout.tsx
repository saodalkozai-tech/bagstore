import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Settings,
  ChartColumn,
  CircleDollarSign,
  Wallet,
  Boxes,
  User,
  Bell,
  AlertTriangle,
  Info,
  LogOut,
  ChevronLeft,
  Box,
  RefreshCw,
  PackageCheck,
  PackageX,
  CalendarDays,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser, getProducts, logout } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { User as UserType } from '@/types';

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/admin', roles: ['admin', 'editor', 'viewer'] as UserType['role'][] },
  { icon: Package, label: 'المنتجات', path: '/admin/products', roles: ['admin', 'editor'] as UserType['role'][] },
  { icon: Settings, label: 'الإعدادات', path: '/admin/settings', roles: ['admin'] as UserType['role'][] },
];
const dashboardQuickLinks = [
  { icon: ChartColumn, label: 'إحصاءات المخزون', path: '/admin#inventory-stats', hash: '#inventory-stats' },
  { icon: CircleDollarSign, label: 'التحليل المالي', path: '/admin#financial-analysis', hash: '#financial-analysis' },
  { icon: Wallet, label: 'الأرباح المالية', path: '/admin#financial-profits', hash: '#financial-profits' },
  { icon: Boxes, label: 'إجمالي المنتجات', path: '/admin#total-products', hash: '#total-products' },
  { icon: Wallet, label: 'تقارير الأرباح', path: '/admin#profit-reports', hash: '#profit-reports' },
  { icon: User, label: 'سجل المستخدمين', path: '/admin#user-activity-log', hash: '#user-activity-log' }
];

const ROLE_LABELS: Record<UserType['role'], string> = {
  admin: 'مدير النظام',
  editor: 'محرر',
  viewer: 'مشاهد'
};

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const products = getProducts();
  const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));
  const pageTitle = useMemo(() => {
    if (location.pathname === '/admin') return 'لوحة التحكم';
    if (location.pathname.startsWith('/admin/products')) return 'إدارة المنتجات';
    if (location.pathname.startsWith('/admin/settings')) return 'الإعدادات';
    return 'لوحة الإدارة';
  }, [location.pathname]);
  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'full' }).format(new Date()),
    []
  );
  const availableProducts = products.filter((product) => product.inStock).length;
  const unavailableProducts = products.length - availableProducts;
  const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const isPathActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };
  const isDashboardAnchorActive = (hash: string) =>
    location.pathname === '/admin' && location.hash === hash;
  type HeaderNotification = {
    id: string;
    title: string;
    description: string;
    link: string;
    tone: 'danger' | 'warning' | 'info';
  };
  const notifications = useMemo(() => {
    const items: HeaderNotification[] = [];

    if (unavailableProducts > 0) {
      items.push({
        id: 'out-of-stock',
        title: `نفاد مخزون ${unavailableProducts} منتج`,
        description: 'راجع المنتجات غير المتوفرة وأعد التخزين.',
        link: '/admin/products',
        tone: 'danger'
      });
    }

    if (lowStockProducts > 0) {
      items.push({
        id: 'low-stock',
        title: `مخزون منخفض لـ ${lowStockProducts} منتج`,
        description: 'توجد منتجات أقل من 5 قطع متاحة.',
        link: '/admin#inventory-stats',
        tone: 'warning'
      });
    }

    items.push({
      id: 'total-products-info',
      title: `إجمالي المنتجات: ${products.length}`,
      description: `المتوفر: ${availableProducts} | غير المتوفر: ${unavailableProducts}`,
      link: '/admin#total-products',
      tone: 'info'
    });

    return items;
  }, [availableProducts, lowStockProducts, products.length, unavailableProducts]);
  const [compactMode, setCompactMode] = useState(() => {
    try {
      return localStorage.getItem('bagstore_admin_compact_mode') === '1';
    } catch {
      return false;
    }
  });

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/login');
  };

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      toast.success('تم تفريغ الكاش بنجاح. سيتم تحديث الصفحة الآن.');
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      toast.error('فشل تفريغ الكاش. حاول مرة أخرى.');
    }
  };
  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bagstore_admin_compact_mode', next ? '1' : '0');
      } catch {
        // no-op when storage is unavailable
      }
      return next;
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70">
      <div className={cn('mx-auto grid max-w-[1500px] p-3 lg:grid-cols-[280px_1fr] lg:p-6', compactMode ? 'gap-3 lg:gap-4' : 'gap-4 lg:gap-6')}>
        <aside className="hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:block lg:h-fit">
          <div className="rounded-xl bg-gradient-to-l from-primary to-amber-500 p-4 text-white shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold">{user?.name}</p>
                <p className="text-xs opacity-90">{user ? ROLE_LABELS[user.role] : ''}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {todayLabel}
            </p>
            <p className="mt-1">إجمالي المنتجات: {products.length}</p>
          </div>

          <div className="mt-4 grid gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClearCache}>
              <RefreshCw className="ml-2 h-4 w-4" />
              تفريغ الكاش
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        <main className={cn(compactMode ? 'space-y-3' : 'space-y-4')}>
          <div className={cn('space-y-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:hidden', compactMode ? 'p-3' : 'p-4')}>
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-l from-primary to-amber-500 p-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{user?.name}</p>
                <p className="text-xs opacity-90">{user ? ROLE_LABELS[user.role] : ''}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  {todayLabel}
                </p>
                <p className="mt-1">إجمالي المنتجات: {products.length}</p>
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" size="sm" onClick={toggleCompactMode}>
                  {compactMode ? <Maximize2 className="ml-2 h-4 w-4" /> : <Minimize2 className="ml-2 h-4 w-4" />}
                  {compactMode ? 'وضع عادي' : 'وضع مضغوط'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleClearCache}>
                  <RefreshCw className="ml-2 h-4 w-4" />
                  تفريغ الكاش
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>

          <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm', compactMode ? 'p-3 md:p-4' : 'p-4 md:p-6')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
                <p className="text-sm text-slate-500">تنظيم وإدارة المتجر من مكان واحد</p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-start gap-2 md:w-auto md:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={toggleCompactMode}>
                  {compactMode ? <Maximize2 className="ml-2 h-4 w-4" /> : <Minimize2 className="ml-2 h-4 w-4" />}
                  {compactMode ? 'وضع عادي' : 'وضع مضغوط'}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="relative w-full sm:w-auto">
                      <Bell className="ml-2 h-4 w-4" />
                      الإشعارات
                      <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {notifications.length}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(92vw,340px)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">الإشعارات</p>
                      <span className="text-xs text-slate-500">{notifications.length}</span>
                    </div>
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          to={notification.link}
                          className={cn(
                            'flex items-start gap-2 rounded-lg border p-2 transition-colors',
                            notification.tone === 'danger' && 'border-rose-200 bg-rose-50 hover:bg-rose-100',
                            notification.tone === 'warning' && 'border-amber-200 bg-amber-50 hover:bg-amber-100',
                            notification.tone === 'info' && 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                          )}
                        >
                          {notification.tone === 'info' ? (
                            <Info className="mt-0.5 h-4 w-4 text-slate-600" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                          )}
                          <span className="space-y-0.5">
                            <span className="block text-xs font-semibold text-slate-800">{notification.title}</span>
                            <span className="block text-[11px] text-slate-600">{notification.description}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:w-fit">
                  <Box className="h-4 w-4 text-primary" />
                  <span>إجمالي المنتجات: {products.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm', compactMode ? 'p-2.5 md:p-3' : 'p-3 md:p-4')}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">أزرار التنقل السريع</p>
              <p className="text-xs text-slate-500">انتقال مباشر لأقسام لوحة التحكم</p>
            </div>
            <div className="grid gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isPathActive(item.path);
                return (
                  <Link
                    key={`quick-${item.path}`}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-4 py-3 transition-all sm:min-w-[180px]',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    <ChevronLeft className="h-4 w-4 opacity-70" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">اختصارات الإحصاءات</p>
              <div className="grid gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
                {dashboardQuickLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = isDashboardAnchorActive(item.hash);
                  const quickLabel =
                    item.hash === '#total-products'
                      ? `إجمالي المنتجات: ${products.length}`
                      : item.label;
                  return (
                    <Link
                      key={`dash-${item.path}`}
                      to={item.path}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all sm:min-w-[180px]',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{quickLabel}</span>
                      </span>
                      <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={cn('grid sm:grid-cols-2 xl:grid-cols-4', compactMode ? 'gap-2.5' : 'gap-3')}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">إجمالي المنتجات</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <PackageCheck className="h-3.5 w-3.5" />
                متوفر في المخزون
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{availableProducts}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-xs text-rose-700">
                <PackageX className="h-3.5 w-3.5" />
                غير متوفر
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{unavailableProducts}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">دورك الحالي</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {user ? ROLE_LABELS[user.role] : 'غير معروف'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
