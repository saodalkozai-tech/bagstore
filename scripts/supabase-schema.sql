-- ========================================
-- إنشاء جميع الجداول المطلوبة في Supabase
-- ========================================
-- ملاحظة: يجب تنفيذ هذا الملف في SQL Editor في لوحة تحكم Supabase
-- URL: https://supabase.com/dashboard/project/ljxgrubmnviqwtzudnzl/sql/new

-- ========================================
-- جدول المنتجات
-- ========================================
CREATE TABLE IF NOT EXISTS bagstore_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  sale_price NUMERIC CHECK (sale_price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  in_stock BOOLEAN DEFAULT TRUE,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  delivery_info TEXT,
  images TEXT[] NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس على الفئة
CREATE INDEX IF NOT EXISTS idx_bagstore_products_category ON bagstore_products(category);

-- إنشاء فهرس على المنتجات المميزة
CREATE INDEX IF NOT EXISTS idx_bagstore_products_featured ON bagstore_products(featured);

-- ========================================
-- جدول المستخدمين
-- ========================================
CREATE TABLE IF NOT EXISTS bagstore_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس على username
CREATE INDEX IF NOT EXISTS idx_bagstore_users_username ON bagstore_users(username);

-- إنشاء فهرس على email
CREATE INDEX IF NOT EXISTS idx_bagstore_users_email ON bagstore_users(email);

-- ========================================
-- جدول الإعدادات
-- ========================================
CREATE TABLE IF NOT EXISTS bagstore_settings (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- جدول سجلات نشاط المستخدمين
-- ========================================
CREATE TABLE IF NOT EXISTS bagstore_user_logs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس على تاريخ الإنشاء
CREATE INDEX IF NOT EXISTS idx_bagstore_user_logs_created_at ON bagstore_user_logs(created_at DESC);

-- ========================================
-- تفعيل Row Level Security
-- ========================================
ALTER TABLE bagstore_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bagstore_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bagstore_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bagstore_user_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- سياسات الوصول للمنتجات
-- ========================================
-- قراءة للجميع
CREATE POLICY "bagstore_products_read" ON bagstore_products
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- كتابة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_products_write_auth" ON bagstore_products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- سياسات الوصول للمستخدمين
-- ========================================
-- قراءة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_users_read" ON bagstore_users
  FOR SELECT
  TO authenticated
  USING (true);

-- كتابة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_users_write_auth" ON bagstore_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- سياسات الوصول للإعدادات
-- ========================================
-- قراءة للجميع
CREATE POLICY "bagstore_settings_read" ON bagstore_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- كتابة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_settings_write_auth" ON bagstore_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- سياسات الوصول لسجلات النشاط
-- ========================================
-- قراءة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_user_logs_read" ON bagstore_user_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- كتابة للمستخدمين المصادقين فقط
CREATE POLICY "bagstore_user_logs_write_auth" ON bagstore_user_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- إضافة مستخدم admin
-- ========================================
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

-- ========================================
-- التحقق من إنشاء الجداول
-- ========================================
SELECT 'bagstore_products' as table_name, COUNT(*) as record_count FROM bagstore_products
UNION ALL
SELECT 'bagstore_users' as table_name, COUNT(*) as record_count FROM bagstore_users
UNION ALL
SELECT 'bagstore_settings' as table_name, COUNT(*) as record_count FROM bagstore_settings
UNION ALL
SELECT 'bagstore_user_logs' as table_name, COUNT(*) as record_count FROM bagstore_user_logs;

-- ========================================
-- التحقق من مستخدم admin
-- ========================================
SELECT * FROM bagstore_users WHERE username = 'admin';
