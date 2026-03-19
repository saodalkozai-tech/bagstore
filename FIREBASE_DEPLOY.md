# تعليمات النشر على Firebase

## المتطلبات الأساسية
1. تأكد من تثبيت Node.js على جهازك
2. حساب على Firebase (firebase.google.com)

## خطوات النشر

### 1. تثبيت Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. تسجيل الدخول إلى Firebase
```bash
firebase login
```

### 3. بناء المشروع
```bash
npm run build
```

### 4. تهيئة Firebase (إذا لم تكن قد فعلت ذلك)
```bash
firebase init
```
اختر:
- Hosting
- استخدم ملف firebase.json الموجود
- المجلد العام: dist

### 5. النشر
```bash
firebase deploy
```

## أوامر مفيدة

### النشر مع معاينة
```bash
firebase hosting:channel:deploy preview
```

### عرض السجلات
```bash
firebase hosting:log
```

### حذف النشر السابق
```bash
firebase hosting:disable
```

## ملاحظات هامة
- تأكد من أن ملف firebase.json محدث قبل النشر
- تأكد من أن ملف .firebaserc يحتوي على معرف المشروع الصحيح
- راجع سجلات النشر للتأكد من نجاح العملية
