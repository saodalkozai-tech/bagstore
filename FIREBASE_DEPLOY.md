# Firebase Deploy

## GitHub Secret

أضف السر التالي داخل GitHub Actions Secrets:
- `FIREBASE_SERVICE_ACCOUNT`

القيمة يجب أن تكون JSON كامل لمفتاح Service Account من Firebase/Google Cloud.

## Workflow

الملف المسؤول عن النشر:
- [.github/workflows/firebase-hosting-deploy.yml](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.github/workflows/firebase-hosting-deploy.yml)

## Firebase Files

- [firebase.json](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/firebase.json)
- [.firebaserc](/c:/Users/PC/Desktop/project/BagStore-main/BagStore-main/.firebaserc)

## Before Deploy

```bash
npm run check
npm test
npm run build
```
