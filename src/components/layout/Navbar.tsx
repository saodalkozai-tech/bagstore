import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, Package, Download, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCart } from '@/hooks/use-cart';
import { isAuthenticated, trackVisitorSession } from '@/lib/storage';

export function Navbar() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/admin');
  const settings = useStoreSettings();
  const logoSrc = settings.logoUrl.trim() || '/logo.png';
  const { shouldShowInstallButton, canInstall, isIOS, triggerInstall } = usePwaInstall();
  const { count } = useCart();
  const showMobileInstallButton = !isDashboard;
  const loggedIn = isAuthenticated();

  useEffect(() => {
    if (!isDashboard) {
      trackVisitorSession();
    }
  }, [isDashboard]);

  const handleInstall = async () => {
    if (canInstall) {
      await triggerInstall();
      return;
    }

    if (isIOS) {
      toast.info('للتثبيت على iPhone: اضغط مشاركة ثم "إضافة إلى الشاشة الرئيسية".');
      return;
    }

    toast.info('للتثبيت على Android: افتح قائمة المتصفح ثم اختر "Install app" أو "Add to Home screen".');
  };

  return (
    <>
      <nav className={cn('bg-white border-b border-gray-200 sticky z-50 shadow-sm', 'top-0')}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between min-h-16 gap-2 py-2">
            {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt={settings.storeName}
                  className="w-auto max-h-10 sm:max-h-14 object-contain"
                  height={settings.logoHeightNavbar}
                />
              </Link>

            {/* Navigation */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto whitespace-nowrap">
              {!isDashboard ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className={cn(
                      'px-2 sm:px-3',
                      location.pathname === '/' && 'bg-secondary'
                    )}
                  >
                    <Link to="/" aria-label="الرئيسية">
                      <Home className="w-4 h-4 ml-0 sm:ml-2" />
                      <span className="hidden sm:inline">الرئيسية</span>
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className={cn(
                      'px-2 sm:px-3',
                      location.pathname === '/products' && 'bg-secondary'
                    )}
                  >
                    <Link to="/products" aria-label="المنتجات">
                      <Package className="w-4 h-4 ml-0 sm:ml-2" />
                      <span className="hidden sm:inline">المنتجات</span>
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className={cn('px-2 sm:px-3', location.pathname === '/cart' && 'bg-secondary')}
                  >
                    <Link to="/cart" className="relative" aria-label="السلة">
                      <ShoppingCart className="w-4 h-4 ml-0 sm:ml-2" />
                      <span className="hidden sm:inline">السلة</span>
                      {count > 0 && (
                        <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button size="sm" variant="default" asChild className="px-2 sm:px-3">
                    <Link to="/admin" aria-label={loggedIn ? 'لوحة التحكم' : 'دخول الإدارة'}>
                      <LayoutDashboard className="w-4 h-4 ml-0 sm:ml-2" />
                      <span className="hidden sm:inline">
                        {loggedIn ? 'لوحة التحكم' : 'دخول الإدارة'}
                      </span>
                    </Link>
                  </Button>
                  {shouldShowInstallButton && (
                    <Button size="sm" variant="outline" onClick={handleInstall} className="hidden sm:inline-flex">
                      <Download className="w-4 h-4 ml-2" />
                      <span className="hidden sm:inline">تثبيت التطبيق</span>
                    </Button>
                  )}
                </>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/">
                    <Home className="w-4 h-4 ml-2" />
                    <span className="hidden sm:inline">العودة للمتجر</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showMobileInstallButton && (
        <div className="fixed bottom-4 inset-x-0 z-[60] px-4 sm:hidden">
          <Button size="sm" className="w-full shadow-lg" onClick={handleInstall}>
            <Download className="w-4 h-4 ml-2" />
            تثبيت التطبيق
          </Button>
        </div>
      )}
    </>
  );
}
