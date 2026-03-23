# BagStore

متجر حقائب مبني بـ React + Vite + TypeScript مع لوحة إدارة بسيطة.

## المسار الحالي

المشروع يعمل الآن بوضع:
- `Supabase Auth` لتسجيل الدخول
- `profiles` للأدوار
- `bagstore_products` و `bagstore_settings` و `bagstore_user_logs` للبيانات
- `Cloudinary` لرفع الصور

لا يوجد Backend مخصص مطلوب للتشغيل.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## متغيرات البيئة

أنشئ ملف `.env.local` من [`.env.example`](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.env.example).

المطلوب فعليًا:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_DB_NAME`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_CLOUDINARY_API_KEY`

## إعداد Supabase

نفّذ ملفات SQL التالية داخل Supabase SQL Editor:

1. [scripts/supabase-schema.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-schema.sql)
2. [scripts/supabase-auth-profiles.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-auth-profiles.sql)
3. [scripts/supabase-client-only-rls.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-client-only-rls.sql)

ثم أنشئ مستخدمي الإدارة من Supabase Authentication.

## ملاحظات المستخدمين

- تسجيل الدخول داخل التطبيق يتم بالبريد الإلكتروني وكلمة المرور من Supabase Auth.
- عرض المستخدمين داخل لوحة التحكم يأتي من جدول `profiles`.
- إنشاء المستخدمين وحذفهم وتغيير كلمات مرورهم يتم من Supabase Dashboard، وليس من داخل التطبيق.

## أوامر مهمة

```bash
npm run check
npm test
npm run build
```

## رفع الكود إلى GitHub

### 1. إعداد Git لأول مرة

إذا لم تقم بإعداد Git من قبل، قم بتشغيل الأوامر التالية:

```bash
# تعيين اسمك
git config --global user.name "اسمك"

# تعيين بريدك الإلكتروني
git config --global user.email "بريدك-الإلكتروني@example.com"
```

### 2. ربط المستودع المحلي بـ GitHub

```bash
# إضافة رابط المستودع البعيد
git remote add origin https://github.com/اسم-المستخدم/اسم-المستودع.git

# التحقق من الرابط البعيد
git remote -v
```

### 3. إجراء التغييرات ورفعها

#### إضافة التغييرات:
```bash
# إضافة جميع الملفات المعدلة
git add .

# أو إضافة ملف محدد
git add اسم-الملف
```

#### إنشاء commit:
```bash
# إنشاء commit مع رسالة واضحة
git commit -m "وصف موجز للتغييرات التي قمت بها"
```

أمثلة على رسائل commit جيدة:
```bash
git commit -m "feat: إضافة صفحة تسجيل الدخول"
git commit -m "fix: تصحيح مشكلة في عرض المنتجات"
git commit -m "docs: تحديث ملف README"
```

#### رفع التغييرات إلى GitHub:
```bash
# الرفع للفرع الرئيسي (main)
git push origin main

# أو إذا كان الفرع هو master
git push origin master
```

### 4. أوامر Git المفيدة

```bash
# عرض حالة الملفات المعدلة
git status

# عرض التغييرات التي تمت
git log

# عرض الفروع الموجودة
git branch

# إنشاء فرع جديد
git branch اسم-الفرع

# التبديل إلى فرع آخر
git checkout اسم-الفرع
```

## النشر

النشر المعتمد داخل المستودع حاليًا هو `Firebase Hosting` عبر `GitHub Actions`.

الملفات المهمة:
- [firebase.json](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/firebase.json)
- [.firebaserc](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.firebaserc)
- [.github/workflows/firebase-hosting-deploy.yml](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.github/workflows/firebase-hosting-deploy.yml)

GitHub Secrets المطلوبة:
- `FIREBASE_SERVICE_ACCOUNT`

ملاحظات:
- النشر التلقائي يعمل عند `push` إلى `main` أو `master`
- تأكد من أن `projectId` داخل workflow يطابق مشروع Firebase الفعلي
