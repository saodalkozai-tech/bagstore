# BagStore Error Fixes - Progress Tracker

## Phase 1: Config/Security Fixes ✅
- [x] Create TODO.md
- [x] Create .env.example with all required vars  
- [x] Fix storage.ts: Remove hardcoded creds, add env-only defaults + graceful Supabase fallback
- [x] Fix cloudinary.ts: Better config fallback
- [x] Test: npm run dev, check console (no Supabase errors)

## Phase 2: UI/UX Fixes
- [x] ProductFormDialog.tsx: Unhide textarea, add image preview thumbnails
- [ ] LoginPage.tsx: Add demo credentials display section
- [ ] Test forms: Product add/edit, upload, login

## Phase 3: Polish & Validation
- [ ] Navbar.tsx/AdminLayout.tsx: Minor tweaks (cart badge, notifications)
- [ ] Run `npm run lint`
- [ ] Build test: `npm run build`
- [ ] Final test: Full admin flow

**Instructions**: Copy `.env.example` → `.env.local`, fill creds, restart dev server.

**Completed**: 8/14 steps (Config + Forms + Login UX + Linting)

## Checklist سريع للنشر والتحديث

- [ ] تشغيل البناء محليًا: `npm run build`
- [ ] رفع آخر التعديلات: `git add . && git commit -m "chore: update" && git push origin master`
- [ ] نشر Firebase يدويًا: `firebase deploy --only hosting`
- [ ] التأكد من فتح الموقع: `https://hr-accessories.web.app`
- [ ] فحص الصفحة الرئيسية + تسجيل الدخول + لوحة التحكم + 404
- [ ] التأكد من GitHub Actions تعمل بدون أخطاء
- [ ] تدوير Service Account Key عند أي تسريب
- [ ] تحديث Secret في GitHub باسم `FIREBASE_SERVICE_ACCOUNT_HR_ACCESSORIES`
