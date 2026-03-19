import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { CLOUD_SYNC_ERROR_EVENT } from '@/lib/storage';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((module) => ({ default: module.HomePage }))
);
const ProductsPage = lazy(() =>
  import('@/pages/ProductsPage').then((module) => ({ default: module.ProductsPage }))
);
const ProductDetailPage = lazy(() =>
  import('@/pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage }))
);
const CartPage = lazy(() =>
  import('@/pages/CartPage').then((module) => ({ default: module.CartPage }))
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((module) => ({ default: module.AdminLayout }))
);
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const ProductsManagePage = lazy(() =>
  import('@/pages/admin/ProductsManagePage').then((module) => ({ default: module.ProductsManagePage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const NotFound = lazy(() => import('@/pages/NotFound'));

function hexToHslTriplet(hexColor: string, fallback: string): string {
  const hex = hexColor.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function App() {
  const settings = useStoreSettings();

  useEffect(() => {
    const iconHref = settings.faviconUrl.trim() || settings.logoUrl.trim() || '/logo.png';
    let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }

    iconLink.type = 'image/png';
    iconLink.href = iconHref;
  }, [settings.faviconUrl, settings.logoUrl]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHslTriplet(settings.themePrimaryColor, '18 83% 46%'));
    root.style.setProperty('--accent', hexToHslTriplet(settings.themeAccentColor, '18 83% 46%'));
    root.style.setProperty('--background', hexToHslTriplet(settings.themeBackgroundColor, '0 0% 100%'));
    root.style.setProperty('--foreground', hexToHslTriplet(settings.themeForegroundColor, '0 0% 10%'));
    root.style.setProperty('--ring', hexToHslTriplet(settings.themePrimaryColor, '18 83% 46%'));

    const metaTheme = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    if (metaTheme) {
      metaTheme.content = settings.themeBackgroundColor;
    }
  }, [
    settings.themePrimaryColor,
    settings.themeAccentColor,
    settings.themeBackgroundColor,
    settings.themeForegroundColor
  ]);

  useEffect(() => {
    const handleCloudSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      toast.error(detail?.message || 'فشل مزامنة السحابة');
    };

    window.addEventListener(CLOUD_SYNC_ERROR_EVENT, handleCloudSyncError);
    return () => {
      window.removeEventListener(CLOUD_SYNC_ERROR_EVENT, handleCloudSyncError);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 pb-20 sm:pb-0">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
                جاري التحميل...
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Admin Routes - Protected */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route
                  index
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'editor', 'viewer']}>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="products"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'editor']}>
                      <ProductsManagePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
        <Toaster position="top-center" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
