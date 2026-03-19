import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Plus, Save, Trash2, Upload, UserCog } from 'lucide-react';
import {
  createAdminUser,
  getAdminUsers,
  getStoreSettings,
  removeAdminUser,
  saveStoreSettings,
  syncLocalDataToSupabase,
  updateAdminUser,
  updateAdminUserPassword,
  updatePassword
} from '@/lib/storage';
import { isFirebaseAuthEnabled } from '@/lib/firebase-auth';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { normalizeStoreSettings } from '@/lib/store-settings-utils';
import { QuickLinkItem, StoreSettings, User } from '@/types';
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

export function SettingsPage() {
  const firebaseAuthEnabled = isFirebaseAuthEnabled();
  const initialSettings = useMemo(() => getStoreSettings(), []);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [users, setUsers] = useState<User[]>(() => getAdminUsers());
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
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const isExternalDbConfigReady = Boolean(
    settings.externalDbUrl.trim() && settings.externalDbApiKey.trim()
  );
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');

  const refreshUsers = () => {
    setUsers(getAdminUsers());
  };

  const handleSave = async () => {
    if (!settings.whatsapp.trim()) {
      toast.error('رقم واتساب مطلوب');
      return;
    }

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

    const normalizedSettings: StoreSettings = normalizeStoreSettings(settings, {
      footerCategories: initialSettings.footerCategories,
      quickLinks: initialSettings.quickLinks,
      heroImageUrl: initialSettings.heroImageUrl,
      heroImageUrls: initialSettings.heroImageUrls,
      externalDbUrl: '',
      externalDbName: '',
      externalDbApiKey: ''
    });

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
    if (!settings.externalDbEnabled) {
      toast.info('فعّل المزامنة السحابية أولًا قبل تنفيذ المزامنة اليدوية.');
      return;
    }

    if (!settings.externalDbUrl.trim() || !settings.externalDbApiKey.trim()) {
      toast.error('أدخل إعدادات Supabase كاملة قبل المزامنة.');
      return;
    }

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

  const handlePasswordChange = () => {
    if (firebaseAuthEnabled) {
      toast.info('عند تفعيل Firebase، يتم تغيير كلمات المرور من Firebase Authentication.');
      return;
    }
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

    const success = updatePassword(currentPassword, newPassword);
    if (!success) {
      toast.error('كلمة المرور الحالية غير صحيحة');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('تم تغيير كلمة المرور بنجاح');
  };

  const handleAddUser = () => {
    if (firebaseAuthEnabled) {
      toast.info('عند تفعيل Firebase، تتم إدارة المستخدمين من Firebase Console.');
      return;
    }
    const result = createAdminUser(newUser);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setNewUser(DEFAULT_NEW_USER);
    refreshUsers();
    toast.success(result.message);
  };

  const handleUserFieldChange = <K extends keyof User>(id: string, field: K, value: User[K]) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, [field]: value } : user))
    );
  };

  const handleSaveUser = (id: string) => {
    if (firebaseAuthEnabled) {
      toast.info('عند تفعيل Firebase، تتم إدارة المستخدمين من Firebase Console.');
      return;
    }
    const targetUser = users.find((user) => user.id === id);
    if (!targetUser) return;

    const result = updateAdminUser(id, {
      name: targetUser.name,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    refreshUsers();
    toast.success(result.message);
  };

  const handleDeleteUser = (id: string) => {
    if (firebaseAuthEnabled) {
      toast.info('عند تفعيل Firebase، تتم إدارة المستخدمين من Firebase Console.');
      return;
    }
    const result = removeAdminUser(id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    refreshUsers();
    toast.success(result.message);
  };

  const handleUserPasswordUpdate = (id: string) => {
    if (firebaseAuthEnabled) {
      toast.info('عند تفعيل Firebase، يتم تعديل كلمات المرور من Firebase Authentication.');
      return;
    }
    const nextPassword = passwordDrafts[id] || '';
    const result = updateAdminUserPassword(id, nextPassword);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setPasswordDrafts((prev) => ({ ...prev, [id]: '' }));
    toast.success(result.message);
  };

  const resetChanges = () => {
    setSettings(getStoreSettings());
    setUsers(getAdminUsers());
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

  const addFooterCategoryRow = () => {
    setSettings((prev) => ({ ...prev, footerCategories: [...prev.footerCategories, ''] }));
  };

  const handleFooterCategoryChange = (index: number, value: string) => {
    setSettings((prev) => ({
      ...prev,
      footerCategories: prev.footerCategories.map((category, i) => (i === index ? value : category))
    }));
  };

  const removeFooterCategory = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      footerCategories: prev.footerCategories.filter((_, i) => i !== index)
    }));
  };

  const addQuickLinkRow = () => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: [...prev.quickLinks, { message: '', label: '', url: '' }]
    }));
  };

  const handleQuickLinkChange = (
    index: number,
    field: keyof QuickLinkItem,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeQuickLink = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">إعدادات المتجر</h2>
        <p className="mt-1 text-sm text-slate-600">
          إدارة الهوية، الربط السحابي، المستخدمين وخيارات العرض من صفحة واحدة.
        </p>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as SettingsSection)}
        className="space-y-4"
      >
        <div className="sticky top-20 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">التنقل بين أقسام الإعدادات</p>
            <p className="text-xs text-slate-500">تبويبات منفصلة لكل جزء</p>
          </div>
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <TabsTrigger value="store" className="justify-start">معلومات المتجر</TabsTrigger>
            <TabsTrigger value="cloudinary" className="justify-start">Cloudinary</TabsTrigger>
            <TabsTrigger value="database" className="justify-start">قاعدة البيانات</TabsTrigger>
            <TabsTrigger value="users" className="justify-start">المستخدمون</TabsTrigger>
            <TabsTrigger value="display" className="justify-start">إعدادات العرض</TabsTrigger>
            <TabsTrigger value="security" className="justify-start">الأمان</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {activeSection === 'store' && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>معلومات المتجر</CardTitle>
          <CardDescription>معلومات أساسية عن المتجر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">اسم المتجر</Label>
            <Input
              id="storeName"
              value={settings.storeName}
              onChange={(e) => setSettings((prev) => ({ ...prev, storeName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeEmail">البريد الإلكتروني</Label>
            <Input
              id="storeEmail"
              type="email"
              value={settings.storeEmail}
              onChange={(e) => setSettings((prev) => ({ ...prev, storeEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storePhone">رقم الهاتف</Label>
            <Input
              id="storePhone"
              value={settings.storePhone}
              onChange={(e) => setSettings((prev) => ({ ...prev, storePhone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">رقم واتساب</Label>
            <Input
              id="whatsapp"
              value={settings.whatsapp}
              onChange={(e) => setSettings((prev) => ({ ...prev, whatsapp: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              سيتم استخدام هذا الرقم لاستقبال طلبات العملاء
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userName">اسم المسؤول المعروض</Label>
            <Input
              id="userName"
              value={settings.userName}
              onChange={(e) => setSettings((prev) => ({ ...prev, userName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail">بريد المسؤول</Label>
            <Input
              id="userEmail"
              type="email"
              value={settings.userEmail}
              onChange={(e) => setSettings((prev) => ({ ...prev, userEmail: e.target.value }))}
            />
          </div>
          <Separator />
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
              />
            </div>
            {settings.heroImageUrls.length > 0 ? (
              <div className="space-y-2">
                {settings.heroImageUrls.map((url, index) => (
                  <div key={`${index}-${url}`} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(e) => handleHeroImageChange(index, e.target.value)}
                      placeholder="https://example.com/hero.jpg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
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
          <Separator />
          <div className="grid md:grid-cols-3 gap-4">
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
              <Label htmlFor="logoHeightFooter">ارتفاع شعار الفوتر (px)</Label>
              <Input
                id="logoHeightFooter"
                type="number"
                min={24}
                value={settings.logoHeightFooter}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, logoHeightFooter: Number(e.target.value) || 80 }))
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
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">رابط فيسبوك</Label>
            <Input
              id="facebookUrl"
              value={settings.facebookUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, facebookUrl: e.target.value }))}
              placeholder="https://facebook.com/your-page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">رابط انستغرام</Label>
            <Input
              id="instagramUrl"
              value={settings.instagramUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, instagramUrl: e.target.value }))}
              placeholder="https://instagram.com/your-page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktokUrl">رابط تيك توك</Label>
            <Input
              id="tiktokUrl"
              value={settings.tiktokUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, tiktokUrl: e.target.value }))}
              placeholder="https://www.tiktok.com/@your-page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">رابط يوتيوب</Label>
            <Input
              id="youtubeUrl"
              value={settings.youtubeUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
              placeholder="https://youtube.com/@your-channel"
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>الفئات</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFooterCategoryRow}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة فئة
              </Button>
            </div>
            {settings.footerCategories.length > 0 ? (
              <div className="space-y-2">
                {settings.footerCategories.map((category, index) => (
                  <div key={`${index}-${category}`} className="flex items-center gap-2">
                    <Input
                      value={category}
                      onChange={(e) => handleFooterCategoryChange(index, e.target.value)}
                      placeholder="اسم الفئة"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeFooterCategory(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد فئات مضافة حتى الآن.</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>الروابط السريعة</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuickLinkRow}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة رابط
              </Button>
            </div>
            {settings.quickLinks.length > 0 ? (
              <div className="space-y-2">
                {settings.quickLinks.map((item, index) => (
                  <div key={`${index}-${item.label}-${item.url}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input
                      value={item.message || ''}
                      onChange={(e) => handleQuickLinkChange(index, 'message', e.target.value)}
                      placeholder="رسالة أمام الرابط"
                    />
                    <Input
                      value={item.label}
                      onChange={(e) => handleQuickLinkChange(index, 'label', e.target.value)}
                      placeholder="النص الظاهر"
                    />
                    <Input
                      value={item.url}
                      onChange={(e) => handleQuickLinkChange(index, 'url', e.target.value)}
                      placeholder="/products أو https://example.com"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeQuickLink(index)}
                      className="md:justify-self-end"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد روابط سريعة مضافة حتى الآن.</p>
            )}
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
          <CardDescription>ربط المتجر بقاعدة بيانات خارجية على السحابة (إعدادات فقط)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              isExternalDbConfigReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isExternalDbConfigReady
              ? settings.externalDbEnabled
                ? 'حالة الربط: جاهز والمزامنة السحابية مفعّلة للمنتجات والإعدادات والسجل.'
                : 'الإعدادات مكتملة لكن المزامنة السحابية متوقفة حاليًا.'
              : 'حالة الربط: غير مكتمل. أدخل رابط Supabase ومفتاح API ثم فعّل المزامنة عند الحاجة.'}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <p className="font-medium">تفعيل قاعدة بيانات خارجية</p>
              <p className="text-xs text-muted-foreground">
                عند التفعيل سيتم مزامنة المنتجات والإعدادات والسجل فقط. مستخدمو الإدارة يبقون محليين أو عبر Firebase.
              </p>
            </div>
            <Switch
              checked={settings.externalDbEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, externalDbEnabled: checked }))
              }
            />
          </div>

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
                <SelectItem value="firebase">Firebase</SelectItem>
                <SelectItem value="mongodb">MongoDB Atlas</SelectItem>
                <SelectItem value="custom">Custom API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              الربط الفعلي المطبق الآن يعمل مع Supabase فقط. لا تتم مزامنة مستخدمي الإدارة إلى السحابة.
            </p>
          </div>

          <div className="space-y-2">
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
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncSupabase}
            disabled={isSyncingSupabase || !settings.externalDbEnabled}
          >
            {isSyncingSupabase ? 'جارٍ المزامنة...' : 'مزامنة البيانات المحلية مع Supabase الآن'}
          </Button>
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
          {!firebaseAuthEnabled && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              يتم حفظ مستخدمي لوحة التحكم محليًا فقط في هذا الوضع، ولا تتم مزامنتهم إلى Supabase لحماية بيانات الدخول.
            </div>
          )}
          {firebaseAuthEnabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              تمت إدارة المستخدمين عبر Firebase Authentication. إضافة/تعديل/حذف المستخدمين تتم من Firebase Console.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              placeholder="الاسم"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              disabled={firebaseAuthEnabled}
            />
            <Input
              placeholder="اسم المستخدم"
              value={newUser.username}
              onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
              disabled={firebaseAuthEnabled}
            />
            <Input
              placeholder="البريد الإلكتروني"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              disabled={firebaseAuthEnabled}
            />
            <Select
              value={newUser.role}
              onValueChange={(value: User['role']) => setNewUser((prev) => ({ ...prev, role: value }))}
              disabled={firebaseAuthEnabled}
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
              disabled={firebaseAuthEnabled}
            />
          </div>
          <Button type="button" onClick={handleAddUser} disabled={firebaseAuthEnabled}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مستخدم
          </Button>

          <Separator />

          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-4 gap-3">
                  <Input
                    value={user.name}
                    onChange={(e) => handleUserFieldChange(user.id, 'name', e.target.value)}
                    placeholder="الاسم"
                    disabled={firebaseAuthEnabled}
                  />
                  <Input
                    value={user.username}
                    onChange={(e) => handleUserFieldChange(user.id, 'username', e.target.value)}
                    placeholder="اسم المستخدم"
                    disabled={firebaseAuthEnabled}
                  />
                  <Input
                    value={user.email}
                    onChange={(e) => handleUserFieldChange(user.id, 'email', e.target.value)}
                    placeholder="البريد الإلكتروني"
                    disabled={firebaseAuthEnabled}
                  />
                  <Select
                    value={user.role}
                    onValueChange={(value: User['role']) => handleUserFieldChange(user.id, 'role', value)}
                    disabled={firebaseAuthEnabled}
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

                <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                  <Input
                    type="password"
                    placeholder={`كلمة مرور جديدة للمستخدم (${ROLE_LABELS[user.role]})`}
                    value={passwordDrafts[user.id] || ''}
                    onChange={(e) =>
                      setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))
                    }
                    disabled={firebaseAuthEnabled}
                  />
                  <Button type="button" variant="outline" onClick={() => handleUserPasswordUpdate(user.id)} disabled={firebaseAuthEnabled}>
                    تغيير كلمة المرور
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => handleSaveUser(user.id)} disabled={firebaseAuthEnabled}>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => handleDeleteUser(user.id)} disabled={firebaseAuthEnabled}>
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
          <CardDescription>تخصيص مظهر المتجر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Separator />
          <div className="space-y-2">
            <Label>ألوان التطبيق</Label>
            <p className="text-xs text-muted-foreground">
              الألوان التالية ستنعكس على أزرار وثيم التطبيق بالكامل بعد الحفظ.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="themePrimaryColor">اللون الأساسي (Primary)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="themePrimaryColor"
                  type="color"
                  value={settings.themePrimaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themePrimaryColor: e.target.value }))}
                  className="h-11 w-16 cursor-pointer p-1"
                />
                <Input
                  value={settings.themePrimaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themePrimaryColor: e.target.value }))}
                  placeholder="#d95f1f"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeAccentColor">لون التمييز (Accent)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="themeAccentColor"
                  type="color"
                  value={settings.themeAccentColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeAccentColor: e.target.value }))}
                  className="h-11 w-16 cursor-pointer p-1"
                />
                <Input
                  value={settings.themeAccentColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeAccentColor: e.target.value }))}
                  placeholder="#d95f1f"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeBackgroundColor">لون الخلفية (Background)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="themeBackgroundColor"
                  type="color"
                  value={settings.themeBackgroundColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeBackgroundColor: e.target.value }))}
                  className="h-11 w-16 cursor-pointer p-1"
                />
                <Input
                  value={settings.themeBackgroundColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeBackgroundColor: e.target.value }))}
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeForegroundColor">لون النص الأساسي (Foreground)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="themeForegroundColor"
                  type="color"
                  value={settings.themeForegroundColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeForegroundColor: e.target.value }))}
                  className="h-11 w-16 cursor-pointer p-1"
                />
                <Input
                  value={settings.themeForegroundColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, themeForegroundColor: e.target.value }))}
                  placeholder="#1a1a1a"
                />
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
          {firebaseAuthEnabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              تم تفعيل Firebase Authentication. تغيير كلمة المرور يتم من Firebase مباشرة.
            </div>
          )}
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
                disabled={firebaseAuthEnabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={firebaseAuthEnabled}
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
                disabled={firebaseAuthEnabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={firebaseAuthEnabled}
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
              disabled={firebaseAuthEnabled}
            />
          </div>
          <Separator />
          <Button onClick={handlePasswordChange} variant="outline" disabled={firebaseAuthEnabled}>
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>
      )}

      {['store', 'cloudinary', 'database', 'display'].includes(activeSection) && (
      <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
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
