# Deployment Notes

## GitHub + Firebase

النشر الحالي يعتمد على:
- `GitHub Actions`
- `Firebase Hosting`

الملفات المستخدمة:
- [firebase.json](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/firebase.json)
- [.firebaserc](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.firebaserc)
- [.github/workflows/firebase-hosting-deploy.yml](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.github/workflows/firebase-hosting-deploy.yml)

GitHub Secret المطلوبة:
- `FIREBASE_SERVICE_ACCOUNT`

## Before Push

```bash
npm run check
npm test
npm run build
```

## Supabase

قبل أي نشر تأكد من تنفيذ:
- [scripts/supabase-schema.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-schema.sql)
- [scripts/supabase-auth-profiles.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-auth-profiles.sql)
- [scripts/supabase-client-only-rls.sql](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/scripts/supabase-client-only-rls.sql)
