import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  PackageCheck,
  PackageX,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  Layers3,
  Trash2,
  Printer,
  Eye,
  Users,
  CalendarDays,
  Settings,
  Gauge,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { clearUserActivityLogs, getCurrentUser, getProducts, getUserActivityLogs, removeUserActivityLog } from '@/lib/storage';
import { Stats } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PrintDesignSettings = {
  customTitle: string;
  paperSize: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  fontScale: 'sm' | 'md' | 'lg';
  showStoreName: boolean;
  showPrintedDate: boolean;
  showCardBorders: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PRINT_SETTINGS_KEY = 'bagstore_print_design_settings';
const DEFAULT_PRINT_SETTINGS: PrintDesignSettings = {
  customTitle: '',
  paperSize: 'A4',
  orientation: 'portrait',
  fontScale: 'md',
  showStoreName: true,
  showPrintedDate: true,
  showCardBorders: true
};
type DashboardTab = 'inventory' | 'financial' | 'reports' | 'activity';
const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string; description: string; icon: typeof Gauge }> = [
  { id: 'inventory', label: 'المخزون', description: 'التوفر والحركة', icon: Gauge },
  { id: 'financial', label: 'التحليل المالي', description: 'القيمة والتسعير', icon: TrendingUp },
  { id: 'reports', label: 'التقارير', description: 'ملخص الأداء', icon: Layers3 },
  { id: 'activity', label: 'سجل النشاط', description: 'المستخدمون والعمليات', icon: Activity }
];
const DASHBOARD_TAB_LABELS: Record<DashboardTab, string> = {
  inventory: 'المخزون',
  financial: 'التحليل المالي',
  reports: 'التقارير',
  activity: 'سجل النشاط'
};
const HASH_TO_TAB: Record<string, DashboardTab> = {
  '#inventory-stats': 'inventory',
  '#total-products': 'inventory',
  '#financial-analysis': 'financial',
  '#financial-profits': 'financial',
  '#profit-reports': 'reports',
  '#user-activity-log': 'activity'
};

export function DashboardPage() {
  const location = useLocation();
  const products = getProducts();
  const settings = useStoreSettings();
  const [userLogs, setUserLogs] = useState(() => getUserActivityLogs().slice(0, 20));
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmClearAllLogs, setConfirmClearAllLogs] = useState(false);
  const [isPrintDesignDialogOpen, setIsPrintDesignDialogOpen] = useState(false);
  const [printDesignSettings, setPrintDesignSettings] = useState<PrintDesignSettings>(() => {
    try {
      const stored = localStorage.getItem(PRINT_SETTINGS_KEY);
      if (!stored) return DEFAULT_PRINT_SETTINGS;
      return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(stored) as Partial<PrintDesignSettings> };
    } catch {
      return DEFAULT_PRINT_SETTINGS;
    }
  });
  const currentUser = getCurrentUser();

  const stats: Stats = {
    totalProducts: products.length,
    inStockProducts: products.filter(p => p.inStock).length,
    outOfStockProducts: products.filter(p => !p.inStock).length,
    totalCategories: settings.footerCategories.filter((category) => category.trim().length > 0).length,
    lowStockProducts: products.filter(p => p.stock > 0 && p.stock <= 5).length
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const avgPrice = products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const todayVisitors = settings.visitorDailyStats[todayKey] || 0;
  const monthVisitors = settings.visitorMonthlyStats[monthKey] || 0;
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => HASH_TO_TAB[location.hash] || 'inventory');
  useEffect(() => {
    setActiveTab(HASH_TO_TAB[location.hash] || 'inventory');
  }, [location.hash]);
  const topRevenueCategories = useMemo(() => {
    const revenueByCategory = products.reduce<Record<string, number>>((acc, product) => {
      const key = product.category || 'غير مصنف';
      const revenue = (product.salePrice || product.price) * product.stock;
      acc[key] = (acc[key] || 0) + revenue;
      return acc;
    }, {});

    return Object.entries(revenueByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [products]);
  const estimatedDiscountCost = products.reduce((sum, product) => {
    if (!product.salePrice || product.salePrice >= product.price) return sum;
    return sum + (product.price - product.salePrice) * product.stock;
  }, 0);
  const discountedProductsCount = products.filter(
    (product) => typeof product.salePrice === 'number' && product.salePrice < product.price
  ).length;
  const dashboardHighlights = [
    {
      label: 'إجمالي المنتجات',
      value: stats.totalProducts,
      tone: 'border-slate-200 bg-white text-slate-900'
    },
    {
      label: 'المتوفر الآن',
      value: stats.inStockProducts,
      tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
    },
    {
      label: 'نفاد المخزون',
      value: stats.outOfStockProducts,
      tone: 'border-rose-200 bg-rose-50/70 text-rose-700'
    },
    {
      label: 'زيارات المتجر',
      value: settings.visitorCount,
      tone: 'border-sky-200 bg-sky-50/70 text-sky-700'
    }
  ];
  const logActionLabels: Record<string, string> = {
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    password_change: 'تغيير كلمة المرور',
    user_create: 'إضافة مستخدم',
    user_update: 'تحديث مستخدم',
    user_delete: 'حذف مستخدم',
    user_password_update: 'تحديث كلمة مرور مستخدم'
  };
  const logActionStyle: Record<string, string> = {
    login: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    logout: 'border-slate-200 bg-slate-100 text-slate-700',
    password_change: 'border-amber-200 bg-amber-50 text-amber-700',
    user_create: 'border-sky-200 bg-sky-50 text-sky-700',
    user_update: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    user_delete: 'border-rose-200 bg-rose-50 text-rose-700',
    user_password_update: 'border-violet-200 bg-violet-50 text-violet-700'
  };
  const handleDeleteLog = (logId: string) => {
    if (currentUser?.role !== 'admin') return;
    const success = removeUserActivityLog(logId);
    if (!success) {
      toast.error('تعذر حذف السجل');
      return;
    }
    setUserLogs(getUserActivityLogs().slice(0, 20));
    toast.success('تم حذف السجل');
  };
  const handleClearLogs = () => {
    if (currentUser?.role !== 'admin') return;
    clearUserActivityLogs();
    setUserLogs([]);
    toast.success('تم حذف جميع السجلات');
  };
  const savePrintDesignSettings = () => {
    localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(printDesignSettings));
    setIsPrintDesignDialogOpen(false);
    toast.success('تم حفظ إعدادات تصميم الطباعة');
  };
  const printSection = (sectionId: string, sectionTitle: string) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      toast.error('تعذر العثور على القسم المطلوب للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      toast.error('يرجى السماح بفتح نافذة الطباعة من المتصفح');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    const finalTitle = printDesignSettings.customTitle.trim() || sectionTitle;
    const safeTitle = escapeHtml(finalTitle);
    const safeSectionTitle = escapeHtml(sectionTitle);
    const safeStoreName = escapeHtml(settings.storeName);
    const fontSizeMap: Record<PrintDesignSettings['fontScale'], string> = {
      sm: '12px',
      md: '14px',
      lg: '16px'
    };
    const printedAt = new Date().toLocaleString('ar-IQ');
    const safePrintedAt = escapeHtml(printedAt);

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${safeSectionTitle}</title>
          ${styles}
          <style>
            @page { size: ${printDesignSettings.paperSize} ${printDesignSettings.orientation}; margin: 14mm; }
            body { padding: 24px; background: #fff; font-size: ${fontSizeMap[printDesignSettings.fontScale]}; }
            .report-actions, .no-print { display: none !important; }
            ${printDesignSettings.showCardBorders ? '' : '.border { border-color: transparent !important; }'}
          </style>
        </head>
        <body>
          ${printDesignSettings.showStoreName ? `<p style="margin:0 0 4px 0;font-weight:700;">${safeStoreName}</p>` : ''}
          ${printDesignSettings.showPrintedDate ? `<p style="margin:0 0 10px 0;color:#64748b;font-size:12px;">تاريخ الطباعة: ${safePrintedAt}</p>` : ''}
          <h1 style="font-size:20px;margin-bottom:12px;">${safeTitle}</h1>
          ${section.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="motion-fade-in space-y-6">
      <div className="motion-fade-up overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#fff7ed_100%)] px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">نظرة عامة سريعة</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                متابعة أسرع للمخزون والقيمة المالية وسجل النشاط من واجهة أخف وأكثر وضوحًا على الهاتف.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardHighlights.map((item) => (
                <div key={item.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${item.tone}`}>
                  <p className="text-xs font-semibold opacity-80">{item.label}</p>
                  <p className="mt-1 text-xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <Link to="/admin/products">فتح إدارة المنتجات</Link>
            </Button>
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setIsPrintDesignDialogOpen(true)}>
              <Printer className="ml-2 h-4 w-4" />
              تصميم الطباعة
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">مركز التحكم السريع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/admin/products">
                <Package className="ml-2 h-4 w-4" />
                إدارة المنتجات
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/admin/settings">
                <Settings className="ml-2 h-4 w-4" />
                إعدادات المتجر
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setActiveTab('inventory')}
            >
              <Gauge className="ml-2 h-4 w-4" />
              إحصاءات المخزون
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setActiveTab('financial')}
            >
              <TrendingUp className="ml-2 h-4 w-4" />
              التحليل المالي
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              إجمالي المنتجات: {stats.totalProducts}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              المتوفر: {stats.inStockProducts}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
              غير المتوفر: {stats.outOfStockProducts}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
              زيارات المتجر: {settings.visitorCount}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DashboardTab)}
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-700">تبويبات لوحة التحكم</p>
          <p className="hidden text-xs text-slate-500 sm:block">مرر أفقيًا على الجوال للتنقل بين الأقسام</p>
        </div>
        <div className="sm:hidden">
          <Select
            value={activeTab}
            onValueChange={(value: DashboardTab) => setActiveTab(value)}
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_TABS.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  {DASHBOARD_TAB_LABELS[tab.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsList className="hidden h-auto w-full gap-2 overflow-x-auto bg-transparent p-0 pb-1 sm:flex">
          {DASHBOARD_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-auto min-w-[168px] shrink-0 justify-start rounded-2xl border border-slate-200 bg-white px-3 py-3 text-right data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <span className="ml-3 rounded-md bg-slate-100 p-2 text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className="text-xs opacity-80">{tab.description}</span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {activeTab === 'inventory' && (
      <Card id="inventory-stats" className="scroll-mt-24 border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">إحصاءات المخزون</CardTitle>
          <div className="report-actions flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => printSection('inventory-stats', 'تقرير إحصاءات المخزون')}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/products">عرض التفاصيل</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card id="total-products" className="scroll-mt-24 motion-fade-up motion-delay-1 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                إجمالي المنتجات
              </CardTitle>
              <Package className="w-5 h-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 sm:text-3xl">{stats.totalProducts}</div>
              <p className="mt-1 text-xs text-slate-500">منتج داخل قاعدة البيانات</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-1 border-emerald-200 bg-emerald-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                المنتجات المتوفرة
              </CardTitle>
              <PackageCheck className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 sm:text-3xl">{stats.inStockProducts}</div>
              <p className="mt-1 text-xs text-slate-500">جاهز للبيع الآن</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-2 border-rose-200 bg-rose-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                نفذت الكمية
              </CardTitle>
              <PackageX className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 sm:text-3xl">{stats.outOfStockProducts}</div>
              <p className="mt-1 text-xs text-slate-500">بحاجة لإعادة تخزين</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-2 border-amber-200 bg-amber-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                مخزون منخفض
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 sm:text-3xl">{stats.lowStockProducts}</div>
              <p className="mt-1 text-xs text-slate-500">منتجات أقل من 5 قطع</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-sky-200 bg-sky-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                إجمالي الزيارات
              </CardTitle>
              <Eye className="w-5 h-5 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 sm:text-3xl">{settings.visitorCount}</div>
              <p className="mt-1 text-xs text-slate-500">تُحتسب مرة واحدة لكل جلسة متصفح</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-indigo-200 bg-indigo-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                زوار فريدون
              </CardTitle>
              <Users className="w-5 h-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 sm:text-3xl">{settings.visitorUniqueCount}</div>
              <p className="mt-1 text-xs text-slate-500">تقريبي حسب كل متصفح/جهاز</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-teal-200 bg-teal-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                زيارات اليوم
              </CardTitle>
              <CalendarDays className="w-5 h-5 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600 sm:text-3xl">{todayVisitors}</div>
              <p className="mt-1 text-xs text-slate-500">إجمالي جلسات اليوم</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-cyan-200 bg-cyan-50/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                زيارات هذا الشهر
              </CardTitle>
              <CalendarDays className="w-5 h-5 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600 sm:text-3xl">{monthVisitors}</div>
              <p className="mt-1 text-xs text-slate-500">إجمالي جلسات الشهر الحالي</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      )}

      {activeTab === 'financial' && (
      <Card id="financial-analysis" className="scroll-mt-24 border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">التحليل المالي</CardTitle>
          <div className="report-actions flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => printSection('financial-analysis', 'تقرير التحليل المالي')}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/products">عرض الأسعار</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card id="financial-profits" className="scroll-mt-24 motion-fade-up motion-delay-2 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                الأرباح المالية المتوقعة
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPrice(totalValue)}</div>
              <p className="mt-1 text-xs text-slate-500">قيمة المبيعات المحتملة للمخزون الحالي</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                متوسط السعر
              </CardTitle>
              <ShoppingBag className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPrice(avgPrice)}</div>
              <p className="mt-1 text-xs text-slate-500">متوسط سعر المنتج الواحد</p>
            </CardContent>
          </Card>

          <Card className="motion-fade-up motion-delay-3 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                الفئات
              </CardTitle>
              <Layers3 className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalCategories}</div>
              <p className="mt-1 text-xs text-slate-500">فئة متاحة داخل المتجر</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      )}

      {activeTab === 'reports' && (
      <Card id="profit-reports" className="scroll-mt-24 border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">تقارير الأرباح المالية</CardTitle>
          <div className="report-actions">
            <Button size="sm" variant="outline" onClick={() => printSection('profit-reports', 'تقرير الأرباح المالية')}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">إجمالي الربح/الإيراد المتوقع</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatPrice(totalValue)}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">تكلفة التخفيضات المتوقعة</p>
              <p className="mt-1 text-xl font-bold text-amber-700">{formatPrice(estimatedDiscountCost)}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs text-sky-700">منتجات ضمن عروض سعرية</p>
              <p className="mt-1 text-xl font-bold text-sky-700">{discountedProductsCount}</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">أفضل الفئات من حيث العائد</p>
            {topRevenueCategories.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد بيانات كافية لإعداد التقرير.</p>
            ) : (
              <div className="space-y-2">
                {topRevenueCategories.map(([category, revenue]) => (
                  <div key={category} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate font-medium text-slate-700">{category}</span>
                    <span className="font-bold text-primary">{formatPrice(revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {activeTab === 'activity' && (
      <Card id="user-activity-log" className="scroll-mt-24 border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">سجل نشاط المستخدمين</CardTitle>
          <div className="report-actions flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => printSection('user-activity-log', 'تقرير سجل نشاط المستخدمين')}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            {currentUser?.role === 'admin' && userLogs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600"
                onClick={() => setConfirmClearAllLogs(true)}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف الكل
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/settings">فتح الإعدادات</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userLogs.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد سجلات نشاط حتى الآن.</p>
          ) : (
            <div className="space-y-2">
              {userLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${logActionStyle[log.action] || 'border-slate-200 bg-slate-100 text-slate-700'}`}
                    >
                      {logActionLabels[log.action] || log.action}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString('ar-IQ')}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-700">
                    المنفذ: {log.actorName || 'النظام'}
                    {log.targetUserName ? ` - المستهدف: ${log.targetUserName}` : ''}
                  </p>
                  {log.details && (
                    <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{log.details}</p>
                  )}
                  {currentUser?.role === 'admin' && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmDeleteLogId(log.id)}
                      >
                        <Trash2 className="ml-1 h-4 w-4" />
                        حذف السجل
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {currentUser?.role !== 'admin' && (
            <p className="mt-3 text-xs text-amber-700">
              ملاحظة: تفاصيل إدارة المستخدمين الكاملة متاحة للمدير فقط.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      <AlertDialog open={Boolean(confirmDeleteLogId)} onOpenChange={() => setConfirmDeleteLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف السجل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا السجل نهائيًا من النشاط المحلي والسحابي ولا يمكن التراجع بعد التأكيد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (confirmDeleteLogId) {
                  handleDeleteLog(confirmDeleteLogId);
                }
                setConfirmDeleteLogId(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClearAllLogs} onOpenChange={setConfirmClearAllLogs}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف جميع السجلات</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف كل سجلات نشاط المستخدمين من التخزين المحلي والسحابي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                handleClearLogs();
                setConfirmClearAllLogs(false);
              }}
            >
              حذف الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPrintDesignDialogOpen} onOpenChange={setIsPrintDesignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعدادات تصميم التقرير للطباعة</DialogTitle>
            <DialogDescription>خصص شكل التقرير قبل الطباعة، وسيتم حفظ الإعدادات للاستخدام القادم.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="print-custom-title">عنوان مخصص للتقارير</Label>
              <Input
                id="print-custom-title"
                value={printDesignSettings.customTitle}
                onChange={(e) => setPrintDesignSettings((prev) => ({ ...prev, customTitle: e.target.value }))}
                placeholder="اتركه فارغًا لاستخدام عنوان القسم"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>حجم الورق</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A4', 'A5', 'Letter'] as const).map((size) => (
                    <Button
                      key={size}
                      type="button"
                      size="sm"
                      variant={printDesignSettings.paperSize === size ? 'default' : 'outline'}
                      onClick={() => setPrintDesignSettings((prev) => ({ ...prev, paperSize: size }))}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>الاتجاه</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={printDesignSettings.orientation === 'portrait' ? 'default' : 'outline'}
                    onClick={() => setPrintDesignSettings((prev) => ({ ...prev, orientation: 'portrait' }))}
                  >
                    عمودي
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={printDesignSettings.orientation === 'landscape' ? 'default' : 'outline'}
                    onClick={() => setPrintDesignSettings((prev) => ({ ...prev, orientation: 'landscape' }))}
                  >
                    أفقي
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>حجم الخط</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'sm', label: 'صغير' },
                    { key: 'md', label: 'متوسط' },
                    { key: 'lg', label: 'كبير' }
                  ] as const).map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant={printDesignSettings.fontScale === item.key ? 'default' : 'outline'}
                      onClick={() => setPrintDesignSettings((prev) => ({ ...prev, fontScale: item.key }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-store-name">إظهار اسم المتجر</Label>
                <Switch
                  id="show-store-name"
                  checked={printDesignSettings.showStoreName}
                  onCheckedChange={(checked) => setPrintDesignSettings((prev) => ({ ...prev, showStoreName: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-printed-date">إظهار تاريخ الطباعة</Label>
                <Switch
                  id="show-printed-date"
                  checked={printDesignSettings.showPrintedDate}
                  onCheckedChange={(checked) => setPrintDesignSettings((prev) => ({ ...prev, showPrintedDate: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-card-borders">إظهار حدود البطاقات</Label>
                <Switch
                  id="show-card-borders"
                  checked={printDesignSettings.showCardBorders}
                  onCheckedChange={(checked) => setPrintDesignSettings((prev) => ({ ...prev, showCardBorders: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPrintDesignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={savePrintDesignSettings}>
              حفظ الإعدادات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
