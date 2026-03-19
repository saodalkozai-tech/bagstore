# BagStore

واجهة متجر حقائب مع لوحة تحكم للإدارة مبنية بـ React + Vite + TypeScript + Tailwind.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## بيانات الدخول الافتراضية (وضع محلي)

- `admin / admin123` (صلاحية مدير)
- `editor / editor123` (صلاحية محرر)
- `viewer / viewer123` (صلاحية مشاهد)

يمكن تغيير كلمة المرور من صفحة الإعدادات داخل لوحة الإدارة.

ملاحظة أمنية:
- عند تفعيل Firebase Auth، يتم إخفاء بيانات demo من واجهة تسجيل الدخول.
- إدارة المستخدمين وكلمات المرور تصبح عبر Firebase (وليس الحسابات المحلية).

## الصلاحيات

- `admin`: وصول كامل (لوحة التحكم + إدارة المنتجات + الإعدادات).
- `editor`: لوحة التحكم + إدارة المنتجات فقط.
- `viewer`: لوحة التحكم للعرض فقط.

يمكنك الآن إدارة المستخدمين (إضافة/تعديل/حذف/تغيير كلمة المرور) من:
`لوحة التحكم > الإعدادات > إدارة مستخدمي لوحة التحكم`.

## ربط Cloudinary لرفع الصور

1. أنشئ Upload Preset من Cloudinary من نوع **Unsigned**.
2. انسخ الملف `.env.example` إلى `.env`.
3. ضع القيم التالية:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_API_KEY=your-api-key
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

ملاحظة: `VITE_CLOUDINARY_API_KEY` مضاف للتوثيق فقط، والرفع الحالي يعتمد على `cloud_name + unsigned upload preset`.

بعد ذلك، زر "رفع إلى Cloudinary" في نموذج المنتج سيرفع الصورة ويضيف رابطها تلقائياً.
إذا كانت الإعدادات ناقصة أو فشل الرفع، سيظهر خطأ واضح ولن يتم حفظ رابط placeholder وهمي.
ويمكنك تعديل معلومات Cloudinary لاحقاً من لوحة التحكم عبر صفحة: `الإعدادات > إعدادات Cloudinary`.

## ربط قاعدة بيانات سحابية (Supabase)

تمت إضافة ربط فعلي اختياري مع Supabase من لوحة التحكم:
`لوحة التحكم > الإعدادات > إعدادات قاعدة البيانات السحابية`.

الخطوات:
1. في Supabase أنشئ الجداول التالية (SQL Editor):

```sql
create table if not exists bagstore_products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists bagstore_settings (
  key text primary key,
  data jsonb not null default '{
    "themePrimaryColor": "#d95f1f",
    "themeAccentColor": "#d95f1f",
    "themeBackgroundColor": "#ffffff",
    "themeForegroundColor": "#1a1a1a"
  }'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists bagstore_user_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

إذا كانت الجداول موجودة مسبقاً وتريد إضافة مفاتيح الألوان للسجلات القديمة:

```sql
update bagstore_settings
set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
  'themePrimaryColor', coalesce(data->>'themePrimaryColor', '#d95f1f'),
  'themeAccentColor', coalesce(data->>'themeAccentColor', '#d95f1f'),
  'themeBackgroundColor', coalesce(data->>'themeBackgroundColor', '#ffffff'),
  'themeForegroundColor', coalesce(data->>'themeForegroundColor', '#1a1a1a')
)
where key = 'default';
```

2. من إعدادات المشروع في Supabase انسخ:
   - Project URL
- `anon` public API key
3. أدخل القيم في لوحة التحكم ثم فعّل خيار القاعدة السحابية مع اختيار `Supabase`.

ملاحظات:
- عند التفعيل، التطبيق يحمّل البيانات من Supabase عند التشغيل ثم يزامن المنتجات والإعدادات وسجل النشاط تلقائياً.
- مستخدمو لوحة التحكم المحليون لا تتم مزامنتهم إلى Supabase.
- إذا فشل الاتصال، التطبيق يرجع للتخزين المحلي بدون توقف.

### المزامنة اليدوية من لوحة التحكم

من:
`لوحة التحكم > الإعدادات > قاعدة البيانات`

توجد الآن 3 أزرار واضحة:
- `مزامنة قاعدة البيانات بالكامل`: تحفظ الإعدادات الحالية ثم ترفع المنتجات والإعدادات وسجل النشاط إلى Supabase، وبعدها تحدّث المنتجات محليًا من القاعدة.
- `رفع البيانات المحلية إلى Supabase`: يدفع البيانات المحلية الحالية إلى القاعدة.
- `تحديث المنتجات من قاعدة البيانات`: يجلب أحدث المنتجات من Supabase إلى المتصفح مباشرة.

أفضل استخدام عملي:
1. عدّل المنتجات أو الإعدادات.
2. احفظ التغييرات.
3. استخدم `مزامنة قاعدة البيانات بالكامل` إذا أردت توحيد النسخة المحلية مع السحابية مباشرة.

### سياسات الأمان (RLS) الجاهزة

للتشغيل السريع المحلي يمكنك استخدام سياسات مؤقتة محدودة حسب حاجتك، لكن للإنتاج استخدم القالب الموجود في:

- `scripts/supabase-rls-production.sql`

تنبيه مهم:
- لا تفعّل سياسات كتابة مفتوحة لـ `anon` في الإنتاج.
- يفضّل أن تمر عمليات الكتابة الإنتاجية عبر Backend آمن أو Edge Functions.
- التطبيق الحالي لا يزامن جدول مستخدمي الإدارة إلى Supabase.

مثال تشغيل سريع ومحدود للقراءة العامة وكتابة المستخدمين الموثقين:

```sql
alter table bagstore_settings enable row level security;
alter table bagstore_products enable row level security;
alter table bagstore_user_logs enable row level security;

create policy "bagstore_products_read"
on bagstore_products
for select
to anon, authenticated
using (true);

create policy "bagstore_settings_read"
on bagstore_settings
for select
to anon, authenticated
using (true);

create policy "bagstore_products_write_auth"
on bagstore_products
for all
to authenticated
using (true)
with check (true);

create policy "bagstore_settings_write_auth"
on bagstore_settings
for all
to authenticated
using (true)
with check (true);

create policy "bagstore_user_logs_write_auth"
on bagstore_user_logs
for all
to authenticated
using (true)
with check (true);
```

تنبيه أمني:
- القالب الإنتاجي الحقيقي موجود في `scripts/supabase-rls-production.sql`.
- كلما شددت السياسات أكثر، احتجت Backend أو Edge Functions لعمليات الكتابة الحساسة.

## Firebase Auth + RBAC (حماية متقدمة)

تمت إضافة دعم مصادقة Firebase بشكل اختياري مع أدوار فعلية عبر `custom claims`.

### 1) إعداد متغيرات البيئة

أضف القيم التالية في ملف البيئة:

```env
VITE_USE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

### 2) تفعيل Email/Password في Firebase Auth

من Firebase Console:
- Authentication > Sign-in method > Email/Password > Enable

### 3) تعيين أدوار المستخدمين (custom claims)

استخدم Firebase Admin SDK (سكربت backend) لتعيين الدور:

```ts
await admin.auth().setCustomUserClaims(uid, { role: 'admin' }); // admin | editor | viewer
```

يوجد سكربت جاهز داخل المشروع لتعيين الدور:

```bash
# باستخدام uid
npm run auth:set-role -- --uid USER_UID --role admin

# باستخدام email
npm run auth:set-role -- --email user@example.com --role editor
```

المتطلبات قبل تشغيل السكربت:
- إعداد `GOOGLE_APPLICATION_CREDENTIALS` لمسار ملف Service Account JSON.
- (اختياري) إعداد `FIREBASE_PROJECT_ID` إذا لم يُكتشف تلقائيًا.

ملاحظة:
- إذا لم يتم تعيين `role`، يعتبر المستخدم `viewer` تلقائيًا.

### 4) سلوك الحماية المطبق

- التحقق من الدور يتم عبر claim `role` داخل التوكن.
- انتهاء الجلسة تلقائيًا:
  - خمول: 30 دقيقة
  - مدة قصوى: 8 ساعات
- قفل تسجيل الدخول مؤقتًا بعد 5 محاولات فاشلة لمدة 10 دقائق.
- تخزين كلمات المرور المحلية (وضع non-Firebase) يتم بصيغة hash مع ترحيل تلقائي للبيانات القديمة.

## أوامر مهمة

```bash
npm run dev
npm run check
npm test
npm run build
npm run lint
npx tsc --noEmit
```

## الاختبارات و CI

- تمت إضافة اختبارات وحدة أولية (Vitest) لمنطق السلة.
- تمت إضافة Workflow تلقائي في GitHub Actions لتشغيل:
  - `npm run check`
  - `npm test`
  - `npm run build`

## نشر تلقائي عبر GitHub Actions (Firebase)

تمت إضافة Workflow للنشر التلقائي إلى Firebase Hosting عند كل Push على `main` أو `master`:
- الملف: `.github/workflows/firebase-hosting-deploy.yml`
- المشروع المستهدف: `your-firebase-project-id`

حتى يعمل النشر، أضف Secret في GitHub:
- `FIREBASE_SERVICE_ACCOUNT`

طريقة تجهيز الـ Secret:
1. Firebase Console > Project Settings > Service accounts.
2. Generate new private key (JSON).
3. انسخ كامل محتوى JSON وضعه في GitHub Secret بالاسم أعلاه.

ملاحظة: قبل النشر، تأكد من تحديث اسم مشروعك في:
- `.firebaserc`
- `.github/workflows/firebase-hosting-deploy.yml`
- استبدل `your-firebase-project-id` بمعرف مشروعك الفعلي

## نشر Firebase Hosting والتحديث

### أول مرة فقط (تهيئة الجهاز)

```bash
npm install
npm run firebase:login
npm run firebase:use your-firebase-project-id
```

ملاحظة: استبدل `your-firebase-project-id` بمعرف مشروعك الفعلي

### رفع التحديثات إلى GitHub يدويًا

بعد إنهاء التعديلات محليًا:

```bash
git status --short
git add .
git commit -m "feat: short description of your changes"
git push origin master
```

إذا كان الفرع الرئيسي لديك هو `main` بدل `master`:

```bash
git push origin main
```

نصيحة عملية:
1. شغّل `npm run check` قبل `git commit`.
2. إذا كانت التعديلات كبيرة، شغّل `npm run build` أيضًا.
3. بعد `git push` سيتمكن GitHub Actions من النشر التلقائي إذا كانت الإعدادات مفعلة.

### نشر مباشر للإنتاج (Live)

```bash
npm run deploy
```

هذا الأمر يقوم بـ:
- بناء المشروع (`npm run build`)
- رفع آخر نسخة إلى Firebase Hosting (مشروع `your-firebase-project-id`)

ملاحظة: تأكد من تحديث اسم المشروع في `.firebaserc` قبل النشر

### دورة العمل الكاملة: GitHub ثم Firebase

إذا أردت تنفيذ الدورة الكاملة يدويًا:

```bash
npm run check
git add .
git commit -m "feat: update admin ui and homepage ordering"
git push origin master
npm run deploy
```

هذا المسار يضمن:
- التحقق من سلامة الكود أولًا
- حفظ نسخة واضحة في GitHub
- نشر نفس النسخة على Firebase Hosting

### بعد تغيير الدومين أو رابط النشر

إذا تغيّر رابط الموقع النهائي، حدّث القيم التالية داخل `index.html` قبل النشر:
- `og:url`
- `twitter:url`
- `schema.org -> url`

مثال الدومين الحالي:

```html
<meta property="og:url" content="https://hr-accessories.web.app" />
<meta name="twitter:url" content="https://hr-accessories.web.app" />
```

```json
{
  "url": "https://hr-accessories.web.app"
}
```

هذا مهم حتى تظهر روابط المشاركة والمعاينة بشكل صحيح في Google وFacebook وX.

### نشر تحديث مع فحص قبل النشر (موصى به)

```bash
npm run deploy:update
```

هذا الأمر يقوم بـ:
- فحص TypeScript + ESLint (`npm run check`)
- ثم بناء المشروع ونشره للإنتاج

### نشر تجريبي قبل الإنتاج (Staging Channel)

```bash
npm run deploy:staging
```

بعد التأكد من النسخة التجريبية، انشر الإنتاج باستخدام:

```bash
npm run deploy
```

### أوامر Firebase مفيدة

```bash
firebase hosting:channel:list
firebase hosting:channel:open staging
firebase hosting:sites:list
```

## النشر على الكلاود

### Vercel

1. ارفع المشروع إلى GitHub.
2. من Vercel اختر `New Project` ثم اختر المستودع.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. أضف متغيرات البيئة:
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_API_KEY`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
6. انشر المشروع.

تمت إضافة ملف `vercel.json` لدعم:
- إعادة توجيه React Router.
- Security Headers (CSP, HSTS, X-Frame-Options, وغيرها).
- Cache-Control لملفات `index.html`, `sw.js`, `manifest.webmanifest`.

### Netlify

1. ارفع المشروع إلى GitHub.
2. من Netlify اختر `Add new site` ثم اختر المستودع.
3. Build Command: `npm run build`
4. Publish directory: `dist`
5. أضف نفس متغيرات البيئة الخاصة بـ Cloudinary.
6. انشر المشروع.

تمت إضافة ملف `netlify.toml` لدعم:
- إعادة توجيه جميع المسارات إلى `index.html`.
- Security Headers مماثلة لبيئة Firebase/Vercel.
- Cache-Control مناسب لملفات التطبيق الحساسة للتحديث.

## توافق الهواتف

- تم تحسين شريط التنقل ليعمل على الشاشات الصغيرة بدون كسر.
- تم تحسين Layout لوحة التحكم ليكون مناسبًا للجوال.
- تم تحسين Hero في الصفحة الرئيسية (حجم الخط والأزرار) للشاشات الصغيرة.
## ملاحظات النشر والتحديث

تمت إضافة شرح كامل لخطوات النشر والتحديث في الملف:

- `DEPLOYMENT_NOTES.md`

يشمل:
- رفع المشروع إلى GitHub
- النشر على Firebase Hosting
- إعداد GitHub Actions
- حل مشاكل PowerShell الشائعة
- خطوات الأمان وتدوير مفاتيح الخدمة
