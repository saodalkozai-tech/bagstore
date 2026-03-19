-- إنشاء جدول admin_users في Supabase
-- ملاحظة: يجب تنفيذ هذا الملف في SQL Editor في لوحة تحكم Supabase
-- URL: https://supabase.com/dashboard/project/ljxgrubmnviqwtzudnzl/sql/new

-- إنشاء جدول admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس على username
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- إنشاء فهرس على email
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- تفعيل Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة (للمستخدمين المصادقين فقط)
CREATE POLICY "admin_users_read" ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة للكتابة (للمستخدمين المصادقين فقط)
CREATE POLICY "admin_users_write" ON admin_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إضافة مستخدم admin
INSERT INTO admin_users (username, email, password, name, role)
VALUES (
  'admin',
  'admin',
  'sha256:' || encode(digest('admin', 'sha256'), 'hex'),
  'مدير النظام',
  'admin'
)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  updated_at = NOW();

-- التحقق من إضافة المستخدم
SELECT * FROM admin_users WHERE username = 'admin';
