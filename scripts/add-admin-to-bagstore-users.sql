-- إضافة مستخدم admin إلى جدول bagstore_users
-- ملاحظة: يجب تنفيذ هذا الملف في SQL Editor في لوحة تحكم Supabase
-- URL: https://supabase.com/dashboard/project/ljxgrubmnviqwtzudnzl/sql/new

-- التأكد من وجود جدول bagstore_users مع العمود password
DO $$
BEGIN
  -- إضافة عمود password إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='bagstore_users' 
    AND column_name='password'
  ) THEN
    ALTER TABLE bagstore_users ADD COLUMN password TEXT;
  END IF;
END $$;

-- إضافة مستخدم admin
INSERT INTO bagstore_users (id, username, email, password, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin',
  'sha256:' || encode(digest('admin', 'sha256'), 'hex'),
  'مدير النظام',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  updated_at = NOW();

-- التحقق من إضافة المستخدم
SELECT * FROM bagstore_users WHERE username = 'admin';
