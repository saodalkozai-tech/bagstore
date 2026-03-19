# ملاحظات النشر والتحديث (GitHub + Firebase)

## 1) المتطلبات
- تثبيت Node.js و npm.
- تسجيل الدخول في Firebase CLI.
- وجود مشروع Firebase جاهز (مثال: `hr-accessories`).
- وجود مستودع GitHub (مثال: `saodalkozai-tech/bagstore`).

## 2) تثبيت الأدوات
```bash
npm install
npm install -g firebase-tools@15.7.0
```

## 3) تسجيل الدخول في Firebase
```bash
firebase login
firebase projects:list
firebase use hr-accessories
```

## 4) بناء المشروع محليًا
```bash
npm run build
```

## 5) نشر مباشر على Firebase Hosting
```bash
firebase deploy --only hosting
```

لو أمر `firebase` لا يعمل في PowerShell:
```powershell
C:\Users\PC\AppData\Roaming\npm\firebase.cmd deploy --only hosting --debug
```

## 6) رفع المشروع إلى GitHub
```bash
git status
git add .
git commit -m "feat: update app and deployment notes"
git push origin master
```

إذا ظهر خطأ هوية Git:
```bash
git config user.name "saodalkozai-tech"
git config user.email "saodalkozai@gmail.com"
```

## 7) إعداد النشر التلقائي من GitHub Actions
1. أنشئ Service Account Key من Firebase/Google Cloud.
2. أضف السر في GitHub:
   - `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`
   - الاسم: `FIREBASE_SERVICE_ACCOUNT_HR_ACCESSORIES`
   - القيمة: محتوى JSON كامل للمفتاح.
3. تأكد من وجود ملف workflow:
   - `.github/workflows/firebase-hosting-deploy.yml`
4. عند كل `push` سيتم البناء والنشر تلقائيًا.

## 8) ملاحظة PowerShell مهمة (خطأ `<`)
في PowerShell لا تستخدم:
```powershell
... < C:\path\service-account.json
```
الحل:
- استخدم `Get-Content -Raw` داخل أمر مناسب، أو
- انسخ محتوى JSON والصقه مباشرة داخل GitHub Secret.

## 9) التحقق بعد النشر
- افتح الرابط:
  - `https://hr-accessories.web.app`
- تحقق من الصفحات الأساسية:
  - الصفحة الرئيسية
  - تسجيل الدخول
  - لوحة التحكم
  - صفحة `404`

## 10) أمان مهم جدًا (إلزامي)
إذا تم تسريب مفتاح Service Account في أي مكان:
1. احذف المفتاح القديم فورًا من Google Cloud IAM.
2. أنشئ مفتاحًا جديدًا.
3. حدّث السر في GitHub.
4. أعد النشر للتأكد أن كل شيء يعمل بالمفتاح الجديد.

## 11) أوامر سريعة مفيدة
```bash
npm run build
firebase deploy --only hosting
git add . && git commit -m "chore: update" && git push
```
