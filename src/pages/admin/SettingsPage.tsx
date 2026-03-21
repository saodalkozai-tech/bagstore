import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  Eye,
  EyeOff,
  ImageUp,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  Shield,
  Store,
  Trash2,
  Upload,
  UserCog,
  Users
} from 'lucide-react';
import {
  createAdminUser,
  getAdminUsers,
  getStoreSettings,
  refreshProductsFromSupabase,
  removeAdminUser,
  saveStoreSettings,
  syncLocalDataToSupabase,
  updateAdminUser,
  updateAdminUserPassword,
  updatePassword
} from '@/lib/storage';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { normalizeStoreSettings } from '@/lib/store-settings-utils';
import { StoreSettings, User } from '@/types';
import { toast } from 'sonner';

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'مدير',
  editor: 'محرر',
  viewer: 'مشاهد'
};

const DEFAULT_NEW_USER: {
  name: string;
  username: string;
  email: string;
  role: User['role'];
  password: string;
} = {
  name: '',
  username: '',
  email: '',
  role: 'viewer',
  password: ''
};
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
type SettingsSection = 'store' | 'cloudinary' | 'database' | 'users' | 'display' | 'security';

const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Store;
}> = [
  { id: 'store', label: 'معلومات المتجر', description: 'الهوية والتواصل', icon: Store },
  { id: 'cloudinary', label: 'Cloudinary', description: 'رفع الصور', icon: ImageUp },
  { id: 'database', label: 'قاعدة البيانات', description: 'الربط والمزامنة', icon: Database },
  { id: 'users', label: 'المستخدمون', description: 'إدارة لوحة التحكم', icon: Users },
  { id: 'display', label: 'إعدادات العرض', description: 'الألوان والواجهة', icon: Palette },
  { id: 'security', label: 'الأمان', description: 'كلمات المرور', icon: Shield }
];

const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
  store: 'معلومات المتجر',
  cloudinary: 'Cloudinary',
  database: 'قاعدة البيانات',
  users: 'المستخدمون',
  display: 'إعدادات العرض',
  security: 'الأمان'
};

const DISPLAY_COLOR_FIELDS: Array<{
  key: keyof StoreSettings;
  id: string;
  label: string;
  placeholder: string;
}> = [
  { key: 'themePrimaryColor', id: 'themePrimaryColor', label: 'اللون الأساسي (Primary)', placeholder: '#d95f1f' },
  { key: 'themeAccentColor', id: 'themeAccentColor', label: 'لون التمييز (Accent)', placeholder: '#d95f1f' },
  { key: 'themeBackgroundColor', id: 'themeBackgroundColor', label: 'لون الخلفية (Background)', placeholder: '#ffffff' },
  { key: 'themeForegroundColor', id: 'themeForegroundColor', label: 'لون النص الأساسي (Foreground)', placeholder: '#1a1a1a' }
];

export function SettingsPage() {
  const initialSettings = useMemo(() => getStoreSettings(), []);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState(DEFAULT_NEW_USER);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const isExternalDbConfigReady = Boolean(
    settings.externalDbUrl.trim() && settings.externalDbApiKey.trim()
  );
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const canManageUsersInApp = false;
  const readySectionCount = SETTINGS_SECTIONS.length;
  const syncStatusLabel = settings.externalDbEnabled
    ? isExternalDbConfigReady
      ? 'السحابة مفعلة'
      : 'تحتاج إكمال الربط'
    : 'محلي فقط';

  const refreshUsers = useCallback(async () => {
    try {
      setUsers(await getAdminUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل المستخدمين من Supabase');
    }
  }, []);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const buildNormalizedSettings = () =>
    normalizeStoreSettings(settings, {
      footerCategories: initialSettings.footerCategories,
      quickLinks: initialSettings.quickLinks,
      heroImageUrl: initialSettings.heroImageUrl,
      heroImageUrls: initialSettings.heroImageUrls,
      externalDbUrl: '',
      externalDbName: '',
      externalDbApiKey: ''
    });

  const ensureCloudSyncReady = (targetSettings: StoreSettings): boolean => {
    if (!targetSettings.externalDbEnabled) {
      toast.info('فعّل المزامنة السحابية أولًا قبل تنفيذ المزامنة اليدوية.');
      return false;
    }

    if (!targetSettings.externalDbUrl.trim() || !targetSettings.externalDbApiKey.trim()) {
      toast.error('أدخل إعدادات Supabase كاملة قبل المزامنة.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (settings.externalDbEnabled && !settings.externalDbUrl.trim()) {
      toast.error('يرجى إدخال رابط قاعدة البيانات السحابية (Supabase URL)');
      return;
    }
    if (settings.externalDbEnabled && !settings.externalDbApiKey.trim()) {
      toast.error('يرجى إدخال مفتاح قاعدة البيانات السحابية (Supabase Anon Key)');
      return;
    }
    if (settings.externalDbEnabled && settings.externalDbProvider !== 'supabase') {
      toast.error('الربط الأساسي الحالي يعمل على Supabase فقط');
      return;
    }

    const normalizedSettings = buildNormalizedSettings();

    saveStoreSettings(normalizedSettings);
    setSettings(normalizedSettings);

    if (!normalizedSettings.externalDbEnabled) {
      toast.success('تم حفظ الإعدادات محليًا مع تعطيل المزامنة السحابية');
      return;
    }

    let syncFailed = false;
    setIsSyncingSupabase(true);
    try {
      await syncLocalDataToSupabase();
    } catch (error) {
      syncFailed = true;
      toast.error(error instanceof Error ? error.message : 'فشل مزامنة البيانات مع Supabase');
    } finally {
      setIsSyncingSupabase(false);
    }
    if (syncFailed) {
      toast.warning('تم حفظ الإعدادات محليًا، لكن مزامنة Supabase لم تكتمل');
      return;
    }
    toast.success('تم حفظ الإعدادات ومزامنتها مع Supabase بنجاح');
  };

  const handleSyncSupabase = async () => {
    const normalizedSettings = buildNormalizedSettings();
    if (!ensureCloudSyncReady(normalizedSettings)) {
      return;
    }

    saveStoreSettings(normalizedSettings);
    setSettings(normalizedSettings);
    setIsSyncingSupabase(true);
    try {
      await syncLocalDataToSupabase();
      toast.success('تمت مزامنة المنتجات والإعدادات والسجل مع Supabase بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل ربط البيانات مع Supabase');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleRefreshProducts = async () => {
    const normalizedSettings = buildNormalizedSettings();
    if (!ensureCloudSyncReady(normalizedSettings)) {
      return;
    }

    saveStoreSettings(normalizedSettings);
    setSettings(normalizedSettings);
    setIsRefreshingProducts(true);
    try {
      const changed = await refreshProductsFromSupabase();
      if (changed) {
        toast.success('تم تحديث المنتجات المحلية مباشرة من قاعدة البيانات');
      } else {
        toast.success('المنتجات المحلية محدثة بالفعل ولا توجد تغييرات جديدة');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تحديث المنتجات من قاعدة البيانات');
    } finally {
      setIsRefreshingProducts(false);
    }
  };

  const handleFullDatabaseSync = async () => {
    const normalizedSettings = buildNormalizedSettings();
    if (!ensureCloudSyncReady(normalizedSettings)) {
      return;
    }

    saveStoreSettings(normalizedSettings);
    setSettings(normalizedSettings);
    setIsSyncingSupabase(true);
    setIsRefreshingProducts(true);
    try {
      await syncLocalDataToSupabase();
      const productsChanged = await refreshProductsFromSupabase();
      toast.success(
        productsChanged
          ? 'تمت مزامنة قاعدة البيانات بالكامل وتحديث المنتجات من Supabase'
          : 'تمت مزامنة قاعدة البيانات بالكامل، والمنتجات المحلية كانت محدثة بالفعل'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشلت المزامنة الشاملة مع قاعدة البيانات');
    } finally {
      setIsSyncingSupabase(false);
      setIsRefreshingProducts(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى تعبئة جميع حقول كلمة المرور');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق');
      return;
    }

    const success = await updatePassword(currentPassword, newPassword);
    if (!success) {
      toast.error('كلمة المرور الحالية غير صحيحة');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('تم تغيير كلمة المرور بنجاح');
  };

  const handleAddUser = async () => {
    const result = await createAdminUser(newUser);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setNewUser(DEFAULT_NEW_USER);
    await refreshUsers();
    toast.success(result.message);
  };

  const handleUserFieldChange = <K extends keyof User>(id: string, field: K, value: User[K]) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, [field]: value } : user))
    );
  };

  const handleSaveUser = async (id: string) => {
    const targetUser = users.find((user) => user.id === id);
    if (!targetUser) return;

    const result = await updateAdminUser(id, {
      name: targetUser.name,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    await refreshUsers();
    toast.success(result.message);
  };

  const handleDeleteUser = async (id: string) => {
    const result = await removeAdminUser(id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    await refreshUsers();
    toast.success(result.message);
  };

  const handleUserPasswordUpdate = async (id: string) => {
    const nextPassword = passwordDrafts[id] || '';
    const result = await updateAdminUserPassword(id, nextPassword);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setPasswordDrafts((prev) => ({ ...prev, [id]: '' }));
    toast.success(result.message);
  };

  const resetChanges = async () => {
    setSettings(getStoreSettings());
    await refreshUsers();
    setNewUser(DEFAULT_NEW_USER);
    setPasswordDrafts({});
    toast.success('تم التراجع عن التعديلات');
  };

  const validateImageFile = (file: File): boolean => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('الصيغ المسموحة: JPG, PNG, WEBP, GIF');
      return false;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error('حجم الصورة يجب ألا يتجاوز 5MB');
      return false;
    }
    return true;
  };

  const uploadSettingImage = async (
    field: 'logoUrl' | 'faviconUrl',
    file: File,
    setUploading: (value: boolean) => void
  ) => {
    if (!validateImageFile(file)) {
      return;
    }
    setUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      setSettings((prev) => ({ ...prev, [field]: uploadedUrl }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadSettingImage('logoUrl', file, setIsUploadingLogo);
    event.target.value = '';
  };

  const handleHeroFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter(validateImageFile);
    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    setIsUploadingHero(true);
    try {
      const uploadedUrls: string[] = [];
      let failedCount = 0;
      const skippedCount = files.length - validFiles.length;

      for (const file of validFiles) {
        try {
          const url = await uploadImageToCloudinary(file);
          uploadedUrls.push(url);
        } catch {
          failedCount += 1;
        }
      }

      if (uploadedUrls.length > 0) {
        setSettings((prev) => ({
          ...prev,
          heroImageUrls: [...prev.heroImageUrls, ...uploadedUrls]
        }));
      }

      if (uploadedUrls.length > 0 && failedCount === 0 && skippedCount === 0) {
        toast.success(`تم رفع ${uploadedUrls.length} صورة بنجاح`);
      } else if (uploadedUrls.length > 0) {
        toast.warning(`تم رفع ${uploadedUrls.length} صورة، فشل ${failedCount} وتخطي ${skippedCount}`);
      } else {
        toast.error('فشل رفع الصور');
      }
    } finally {
      setIsUploadingHero(false);
    }

    event.target.value = '';
  };

  const handleFaviconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadSettingImage('faviconUrl', file, setIsUploadingFavicon);
    event.target.value = '';
  };

  const handleHeroImageChange = (index: number, value: string) => {
    setSettings((prev) => ({
      ...prev,
      heroImageUrls: prev.heroImageUrls.map((url, i) => (i === index ? value : url))
    }));
  };

  const addHeroImageRow = () => {
    setSettings((prev) => ({ ...prev, heroImageUrls: [...prev.heroImageUrls, ''] }));
  };

  const removeHeroImage = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      heroImageUrls: prev.heroImageUrls.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-6xl space-y-6 overflow-x-hidden">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(217,95,31,0.18),_transparent_35%),linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">إعدادات المتجر</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                لوحة إعدادات أنظف وأسرع لإدارة الهوية والربط السحابي والمستخدمين مع تجربة مريحة على الهاتف.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 backdrop-blur">
                <p className="text-xs font-semibold text-slate-500">الأقسام</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{readySectionCount}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 backdrop-blur">
                <p className="text-xs font-semibold text-slate-500">المزامنة</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{syncStatusLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 backdrop-blur">
                <p className="text-xs font-semibold text-slate-500">المستخدمون</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {`${users.length} من Supabase`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as SettingsSection)}
        className="space-y-4"
      >
        <div className="z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:sticky sm:top-20">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-700">التنقل بين أقسام الإعدادات</p>
            <p className="hidden text-xs text-slate-500 sm:block">مرر أفقيًا على الجوال للتنقل بسرعة</p>
          </div>
          <div className="sm:hidden">
            <Select
              value={activeSection}
              onValueChange={(value: SettingsSection) => setActiveSection(value)}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="اختر القسم" />
              </SelectTrigger>
              <SelectContent>
                {SETTINGS_SECTIONS.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {SETTINGS_SECTION_LABELS[section.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden h-auto w-full gap-2 overflow-x-auto bg-transparent p-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="h-auto min-w-[168px] shrink-0 justify-start rounded-2xl border border-slate-200 bg-white px-3 py-3 text-right data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  <span className="ml-3 rounded-md bg-slate-100 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-semibold">{section.label}</span>
                    <span className="text-xs opacity-80">{section.description}</span>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      {activeSection === 'store' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>معلومات المتجر</CardTitle>
          <CardDescription>الوسائط والهوية البصرية فقط</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">الهوية البصرية والوسائط</h3>
              <p className="text-sm text-slate-500">الشعار والأيقونة وصور الواجهة الرئيسية من مكان واحد.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
            <Label htmlFor="logoUrl">رابط الشعار (Logo)</Label>
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                id="logoUrl"
                value={settings.logoUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                <Upload className="w-4 h-4 ml-2" />
                {isUploadingLogo ? 'جار الرفع...' : 'رفع إلى Cloudinary'}
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
                aria-label="رفع شعار المتجر"
                title="رفع شعار المتجر"
              />
            </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">رابط أيقونة المتصفح (Favicon)</Label>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    id="faviconUrl"
                    value={settings.faviconUrl}
                    onChange={(e) => setSettings((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                    placeholder="https://example.com/favicon.png"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={isUploadingFavicon}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {isUploadingFavicon ? 'جار الرفع...' : 'رفع إلى Cloudinary'}
                  </Button>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconFileChange}
                    aria-label="رفع أيقونة المتصفح"
                    title="رفع أيقونة المتصفح"
                    className="hidden"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>صور الواجهة الرئيسية المتحركة (Hero)</Label>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={isUploadingHero}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {isUploadingHero ? 'جار الرفع...' : 'رفع صور إلى Cloudinary'}
                  </Button>
                  <Button type="button" variant="outline" onClick={addHeroImageRow}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة رابط صورة
                  </Button>
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleHeroFileChange}
                    className="hidden"
                    aria-label="رفع صور الواجهة الرئيسية"
                    title="رفع صور الواجهة الرئيسية"
                  />
                </div>
                {settings.heroImageUrls.length > 0 ? (
                  <div className="space-y-2">
                    {settings.heroImageUrls.map((url, index) => (
                      <div key={`${index}-${url}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={url}
                          onChange={(e) => handleHeroImageChange(index, e.target.value)}
                          placeholder="https://example.com/hero.jpg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="w-full sm:w-10"
                          onClick={() => removeHeroImage(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    لم تتم إضافة صور بعد. عند إضافة أكثر من صورة سيتم تبديلها تلقائيًا في الصفحة الرئيسية.
                  </p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="logoHeightNavbar">ارتفاع شعار أعلى الصفحة (px)</Label>
              <Input
                id="logoHeightNavbar"
                type="number"
                min={24}
                value={settings.logoHeightNavbar}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, logoHeightNavbar: Number(e.target.value) || 48 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSlideIntervalSec">سرعة تبديل صور الواجهة (ثانية)</Label>
              <Input
                id="heroSlideIntervalSec"
                type="number"
                min={2}
                max={15}
                value={settings.heroSlideIntervalSec}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, heroSlideIntervalSec: Number(e.target.value) || 5 }))
                }
              />
            </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">ألوان المنتجات</h3>
              <p className="text-sm text-slate-500">إدارة الألوان المتاحة للمنتجات في المتجر</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newColor">إضافة لون جديد</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="newColor"
                    placeholder="أدخل اسم اللون (مثال: أحمر، أزرق، بيج)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        const newColor = input.value.trim();
                        if (newColor && !settings.availableColors?.includes(newColor)) {
                          setSettings((prev) => ({
                            ...prev,
                            availableColors: [...(prev.availableColors || []), newColor]
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('newColor') as HTMLInputElement;
                      const newColor = input?.value.trim();
                      if (newColor && !settings.availableColors?.includes(newColor)) {
                        setSettings((prev) => ({
                          ...prev,
                          availableColors: [...(prev.availableColors || []), newColor]
                        }));
                        if (input) input.value = '';
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة لون
                  </Button>
                </div>
              </div>
              {settings.availableColors && settings.availableColors.length > 0 ? (
                <div className="space-y-2">
                  <Label>الألوان المتاحة</Label>
                  <div className="flex flex-wrap gap-2">
                    {settings.availableColors.map((color, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
                      >
                        <span>{color}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              availableColors: prev.availableColors?.filter((_, i) => i !== index) || []
                            }));
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  لم تتم إضافة ألوان بعد. أضف ألوان لتظهر في قائمة الألوان عند إضافة المنتجات.
                </p>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
      )}

      {activeSection === 'cloudinary' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>إعدادات Cloudinary</CardTitle>
          <CardDescription>تغيير سحابة رفع الصور ومعلومات الربط</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cloudinaryCloudName">Cloud Name</Label>
            <Input
              id="cloudinaryCloudName"
              value={settings.cloudinaryCloudName}
              onChange={(e) => setSettings((prev) => ({ ...prev, cloudinaryCloudName: e.target.value }))}
              placeholder="e.g. dtiehdhmf"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cloudinaryUploadPreset">Upload Preset</Label>
            <Input
              id="cloudinaryUploadPreset"
              value={settings.cloudinaryUploadPreset}
              onChange={(e) => setSettings((prev) => ({ ...prev, cloudinaryUploadPreset: e.target.value }))}
              placeholder="e.g. hr_accessories"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cloudinaryApiKey">API Key</Label>
            <Input
              id="cloudinaryApiKey"
              type="password"
              value={settings.cloudinaryApiKey}
              onChange={(e) => setSettings((prev) => ({ ...prev, cloudinaryApiKey: e.target.value }))}
              placeholder="e.g. 823494895349582"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              في الرفع غير الموقّع (Unsigned) التطبيق يستخدم Cloud Name و Upload Preset مباشرة.
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      {activeSection === 'database' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>إعدادات قاعدة البيانات السحابية</CardTitle>
          <CardDescription>حالة الاتصال، إعدادات الربط، وأوامر المزامنة اليدوية من مكان واحد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              isExternalDbConfigReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isExternalDbConfigReady
              ? settings.externalDbEnabled
                ? 'حالة الربط: جاهز والمزامنة السحابية مفعّلة للمنتجات والإعدادات وسجل النشاط.'
                : 'الإعدادات مكتملة لكن المزامنة السحابية متوقفة حاليًا.'
              : 'حالة الربط: غير مكتمل. أدخل رابط Supabase ومفتاح API ثم فعّل المزامنة عند الحاجة.'}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">تفعيل قاعدة بيانات خارجية</p>
                    <p className="text-xs text-muted-foreground">
                      عند التفعيل سيتم مزامنة المنتجات والإعدادات والسجل فقط. مستخدمو الإدارة يبقون محليين أو داخل Supabase Auth.
                    </p>
                  </div>
                  <Switch
                    checked={settings.externalDbEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, externalDbEnabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="externalDbProvider">مزود قاعدة البيانات</Label>
                    <Select
                      value="supabase"
                      disabled
                      onValueChange={() => undefined}
                    >
                      <SelectTrigger id="externalDbProvider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supabase">Supabase</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      الربط الفعلي المطبق الآن يعمل مع Supabase فقط. لا تتم مزامنة مستخدمي الإدارة إلى السحابة.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="externalDbUrl">الرابط (URL / Endpoint)</Label>
                      <Input
                        id="externalDbUrl"
                        value={settings.externalDbUrl}
                        onChange={(e) => setSettings((prev) => ({ ...prev, externalDbUrl: e.target.value }))}
                        placeholder="https://your-project.supabase.co"
                        disabled={!settings.externalDbEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="externalDbName">اسم القاعدة أو المشروع</Label>
                      <Input
                        id="externalDbName"
                        value={settings.externalDbName}
                        onChange={(e) => setSettings((prev) => ({ ...prev, externalDbName: e.target.value }))}
                        placeholder="bagstore-prod"
                        disabled={!settings.externalDbEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="externalDbApiKey">API Key / Token</Label>
                      <Input
                        id="externalDbApiKey"
                        type="password"
                        value={settings.externalDbApiKey}
                        onChange={(e) => setSettings((prev) => ({ ...prev, externalDbApiKey: e.target.value }))}
                        placeholder="ضع مفتاح الوصول هنا"
                        autoComplete="off"
                        disabled={!settings.externalDbEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-900">أوامر المزامنة اليدوية</h3>
                  <p className="text-sm text-slate-500">اختر بين مزامنة شاملة أو تحديث المنتجات فقط من قاعدة البيانات.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Button
                    type="button"
                    onClick={handleFullDatabaseSync}
                    disabled={isSyncingSupabase || isRefreshingProducts || !settings.externalDbEnabled}
                    className="w-full"
                  >
                    <Database className="ml-2 h-4 w-4" />
                    {isSyncingSupabase && isRefreshingProducts ? 'جارٍ تنفيذ المزامنة الشاملة...' : 'مزامنة قاعدة البيانات بالكامل'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncSupabase}
                    disabled={isSyncingSupabase || isRefreshingProducts || !settings.externalDbEnabled}
                    className="w-full"
                  >
                    <RefreshCcw className="ml-2 h-4 w-4" />
                    {isSyncingSupabase ? 'جارٍ رفع البيانات...' : 'رفع البيانات المحلية إلى Supabase'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshProducts}
                    disabled={isRefreshingProducts || isSyncingSupabase || !settings.externalDbEnabled}
                    className="w-full"
                  >
                    <RefreshCcw className="ml-2 h-4 w-4" />
                    {isRefreshingProducts ? 'جارٍ تحديث المنتجات...' : 'تحديث المنتجات من قاعدة البيانات'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-4 font-semibold text-slate-900">ملخص سريع</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-lg border bg-white p-3">
                  <p className="font-medium text-slate-900">ما الذي تتم مزامنته؟</p>
                  <p className="mt-1">المنتجات، إعدادات المتجر، وسجل النشاط فقط.</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="font-medium text-slate-900">ما الذي لا تتم مزامنته؟</p>
                  <p className="mt-1">مستخدمو لوحة التحكم يبقون محليين أو داخل Supabase Auth ولا يُرفعون ضمن بيانات المزامنة.</p>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <p className="font-medium text-slate-900">أفضل إجراء عند التعديل</p>
                  <p className="mt-1">احفظ الإعدادات أولًا، ثم استخدم المزامنة الشاملة إذا أردت دفع كل التغييرات وتحديث المنتجات محليًا.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {activeSection === 'users' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            إدارة مستخدمي لوحة التحكم
          </CardTitle>
          <CardDescription>إضافة، تعديل، حذف المستخدمين وتعيين الصلاحيات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            المشروع يعمل الآن بوضع Supabase-only. عرض المستخدمين يأتي من جدول <code>profiles</code>، بينما إنشاء المستخدمين وحذفهم وتغيير كلمات مرورهم يتم من Supabase Authentication Dashboard.
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input
              placeholder="الاسم"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!canManageUsersInApp}
              aria-label="اسم المستخدم الجديد"
              title="اسم المستخدم الجديد"
            />
            <Input
              placeholder="اسم المستخدم"
              value={newUser.username}
              onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
              disabled={!canManageUsersInApp}
              aria-label="اسم المستخدم الجديد"
              title="اسم المستخدم الجديد"
            />
            <Input
              placeholder="البريد الإلكتروني"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!canManageUsersInApp}
              aria-label="البريد الإلكتروني للمستخدم الجديد"
              title="البريد الإلكتروني للمستخدم الجديد"
            />
            <Select
              value={newUser.role}
              onValueChange={(value: User['role']) => setNewUser((prev) => ({ ...prev, role: value }))}
              disabled={!canManageUsersInApp}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="editor">محرر</SelectItem>
                <SelectItem value="viewer">مشاهد</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="كلمة المرور"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              disabled={!canManageUsersInApp}
              aria-label="كلمة مرور المستخدم الجديد"
              title="كلمة مرور المستخدم الجديد"
            />
          </div>
          <Button type="button" onClick={handleAddUser} disabled={!canManageUsersInApp} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مستخدم
          </Button>

          <Separator />

          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="space-y-3 rounded-lg border p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    value={user.name}
                    onChange={(e) => handleUserFieldChange(user.id, 'name', e.target.value)}
                    placeholder="الاسم"
                    disabled={!canManageUsersInApp}
                  />
                  <Input
                    value={user.username}
                    onChange={(e) => handleUserFieldChange(user.id, 'username', e.target.value)}
                    placeholder="اسم المستخدم"
                    disabled={!canManageUsersInApp}
                  />
                  <Input
                    value={user.email}
                    onChange={(e) => handleUserFieldChange(user.id, 'email', e.target.value)}
                    placeholder="البريد الإلكتروني"
                    disabled={!canManageUsersInApp}
                  />
                  <Select
                    value={user.role}
                    onValueChange={(value: User['role']) => handleUserFieldChange(user.id, 'role', value)}
                    disabled={!canManageUsersInApp}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدير</SelectItem>
                      <SelectItem value="editor">محرر</SelectItem>
                      <SelectItem value="viewer">مشاهد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid items-center gap-2 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
                  <Input
                    type="password"
                    placeholder={`كلمة مرور جديدة للمستخدم (${ROLE_LABELS[user.role]})`}
                    value={passwordDrafts[user.id] || ''}
                    onChange={(e) =>
                      setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))
                    }
                    disabled={!canManageUsersInApp}
                  />
                  <Button type="button" variant="outline" onClick={() => handleUserPasswordUpdate(user.id)} disabled={!canManageUsersInApp} className="w-full">
                    تغيير كلمة المرور
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => handleSaveUser(user.id)} disabled={!canManageUsersInApp} className="w-full">
                    <Save className="w-4 h-4 ml-2" />
                    حفظ
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => handleDeleteUser(user.id)} disabled={!canManageUsersInApp} className="w-full">
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {activeSection === 'display' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>إعدادات العرض</CardTitle>
          <CardDescription>تنظيم خيارات العرض العامة والثيم داخل مجموعات أوضح</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">خيارات العرض العامة</h3>
                <p className="text-sm text-slate-500">عدد المنتجات والعملة الأساسية في المتجر.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productsPerPage">عدد المنتجات في الصفحة</Label>
                  <Select
                    value={String(settings.productsPerPage)}
                    onValueChange={(value) => setSettings((prev) => ({ ...prev, productsPerPage: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 منتجات</SelectItem>
                      <SelectItem value="12">12 منتج</SelectItem>
                      <SelectItem value="16">16 منتج</SelectItem>
                      <SelectItem value="24">24 منتج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">العملة</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value: StoreSettings['currency']) => setSettings((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iqd">دينار عراقي (د.ع)</SelectItem>
                      <SelectItem value="usd">دولار أمريكي ($)</SelectItem>
                      <SelectItem value="eur">يورو (€)</SelectItem>
                      <SelectItem value="sar">ريال سعودي (ر.س)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">ألوان التطبيق</h3>
                <p className="text-sm text-slate-500">الألوان التالية ستنعكس على الأزرار وثيم التطبيق بالكامل بعد الحفظ.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {DISPLAY_COLOR_FIELDS.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id={field.id}
                        type="color"
                        value={String(settings[field.key] ?? '')}
                        onChange={(e) => setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="h-11 w-16 cursor-pointer p-1"
                      />
                      <Input
                        value={String(settings[field.key] ?? '')}
                        onChange={(e) => setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {activeSection === 'security' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>الأمان وكلمة المرور</CardTitle>
          <CardDescription>تغيير كلمة المرور وإعدادات الأمان</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            تغيير كلمة مرور حسابك الحالي يتم مباشرة عبر Supabase Auth.
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور الحالية"
                className="pl-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={false}
                aria-label={showPassword ? 'إخفاء كلمة المرور الحالية' : 'إظهار كلمة المرور الحالية'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور الجديدة"
                className="pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={false}
                aria-label={showNewPassword ? 'إخفاء كلمة المرور الجديدة' : 'إظهار كلمة المرور الجديدة'}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="أعد إدخال كلمة المرور الجديدة"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={false}
            />
          </div>
          <Separator />
          <Button onClick={handlePasswordChange} variant="outline">
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>
      )}

      {['store', 'cloudinary', 'database', 'display'].includes(activeSection) && (
      <div className="z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:sticky sm:bottom-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button variant="outline" size="lg" onClick={resetChanges} className="min-w-28 w-full sm:w-auto">
          إلغاء
        </Button>
        <Button onClick={handleSave} size="lg" className="min-w-40 w-full sm:w-auto">
          حفظ جميع التغييرات
        </Button>
      </div>
      )}
    </div>
  );
}
