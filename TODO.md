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

