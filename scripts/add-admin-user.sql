-- ========================================
-- إضافة مستخدم admin إلى Supabase
-- ========================================
-- ملاحظة: يجب تنفيذ هذا الملف في SQL Editor في لوحة تحكم Supabase
-- URL: https://supabase.com/dashboard/project/ljxgrubmnviqwtzudnzl/sql/new

-- الخطوة 1: إنشاء مستخدم admin في نظام المصادقة
-- ملاحظة: يجب عليك إنشاء المستخدم يدوياً من Authentication > Users
-- أو استخدام SQL التالي (يتطلب service_role key)

-- الخطوة 2: إضافة المستخدم إلى جدول bagstore_users
INSERT INTO bagstore_users (
  id,
  email,
  role,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  updated_at = now();

-- التحقق من إضافة المستخدم
SELECT * FROM bagstore_users WHERE email = 'admin';
