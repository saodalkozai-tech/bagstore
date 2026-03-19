-- إنشاء مستخدم admin في Supabase
-- ملاحظة: يجب تنفيذ هذا الملف في SQL Editor في لوحة تحكم Supabase

-- إدراج مستخدم admin في جدول auth.users
-- ملاحظة: يجب استخدام hashed password وليس نص عادي
-- يرجى استبدال 'hashed_password' بكلمة مرور مشفرة فعلياً

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin',
  crypt('admin', gen_salt('bf')),
  now(),
  '{"role": "admin"}',
  now(),
  now()
);

-- إدراج المستخدم في جدول bagstore_users
INSERT INTO bagstore_users (
  id,
  email,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'admin',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'admin';
