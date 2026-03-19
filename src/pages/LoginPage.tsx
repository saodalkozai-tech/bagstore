import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDemoCredentials, getLoginLockoutRemainingMs, login } from '@/lib/storage';
import { isFirebaseAuthEnabled } from '@/lib/firebase-auth';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const settings = useStoreSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const logoSrc = settings.logoUrl.trim() || '/logo.png';
  const firebaseAuthEnabled = isFirebaseAuthEnabled();
  const demoCredentials = getDemoCredentials();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockoutRemainingMs = getLoginLockoutRemainingMs();
    if (lockoutRemainingMs > 0) {
      const minutes = Math.ceil(lockoutRemainingMs / 60000);
      toast.error(`تم قفل تسجيل الدخول مؤقتًا. حاول بعد ${minutes} دقيقة.`);
      return;
    }
    setLoading(true);

    try {
      const user = await login(username, password);

      if (user) {
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/admin');
      } else {
        const remainingMs = getLoginLockoutRemainingMs();
        if (remainingMs > 0) {
          const minutes = Math.ceil(remainingMs / 60000);
          toast.error(`محاولات كثيرة غير صحيحة. تم القفل لمدة ${minutes} دقيقة.`);
        } else {
          toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="motion-fade-in min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 md:p-8">
        <div className="motion-fade-up rounded-xl bg-gradient-to-l from-slate-900 to-slate-700 p-6 text-white md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <img src={logoSrc} alt={settings.storeName} className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
            <div>
              <p className="text-xs text-slate-300">منصة الإدارة</p>
              <h2 className="text-lg font-bold">{settings.storeName}</h2>
            </div>
          </div>
          <h1 className="text-2xl font-bold leading-tight md:text-3xl">تحكم احترافي بمنتجات المتجر ومحتواه من لوحة واحدة</h1>
          <p className="mt-3 text-sm text-slate-200">
            سجّل الدخول للوصول إلى الإعدادات، إدارة المنتجات، والمستخدمين بحسب الصلاحية.
          </p>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              صلاحيات متعددة حسب الدور (مدير - محرر - مشاهد)
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 text-sm">
              <KeyRound className="h-5 w-5 text-amber-300" />
              إدارة مباشرة للمخزون والهوية والتكاملات السحابية
            </div>
          </div>
        </div>

        <Card className="motion-fade-up motion-delay-1 border-0 shadow-none">
          <CardHeader className="space-y-2 px-0">
            <CardTitle className="text-2xl text-slate-900">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات حسابك للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {firebaseAuthEnabled ? 'البريد الإلكتروني' : 'اسم المستخدم'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={firebaseAuthEnabled ? 'admin@example.com' : 'admin'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="h-11 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 border-slate-200 pl-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={loading}
              >
                {loading ? 'جاري تسجيل الدخول...' : (
                  <>
                    <LogIn className="w-5 h-5 ml-2" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>

            {!firebaseAuthEnabled && demoCredentials.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">حسابات تجريبية محلية</p>
                <p className="mt-1 text-xs text-slate-600">
                  هذه الحسابات متاحة فقط عند تعطيل Firebase Auth.
                </p>
                <div className="mt-3 space-y-2">
                  {demoCredentials.map((credential) => (
                    <button
                      key={credential.username}
                      type="button"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right transition hover:border-primary hover:bg-primary/5"
                      onClick={() => {
                        setUsername(credential.username);
                        setPassword(credential.password);
                      }}
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {credential.name} ({credential.role})
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {credential.username} / {credential.password}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
