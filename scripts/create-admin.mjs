import { createClient } from '@supabase/supabase-js';

// إعدادات Supabase
const supabaseUrl = 'https://ljxgrubmnviqwtzudnzl.supabase.co';
const supabaseKey = 'ljxgrubmnviqwtzudnzl';

// إنشاء عميل Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    console.log('🚀 جاري إنشاء مستخدم admin...');

    // تسجيل المستخدم
    const { data, error } = await supabase.auth.signUp({
      email: 'admin',
      password: 'admin',
      options: {
        data: {
          role: 'admin'
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      console.log('✅ تم إنشاء مستخدم admin بنجاح!');
      console.log('📧 البريد الإلكتروني: admin');
      console.log('🔑 كلمة المرور: admin');

      // إضافة المستخدم إلى جدول bagstore_users
      const { error: insertError } = await supabase
        .from('bagstore_users')
        .insert([
          {
            id: data.user.id,
            email: 'admin',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.error('⚠️  تحذير: لم يتم إضافة المستخدم إلى جدول bagstore_users:', insertError.message);
      } else {
        console.log('✅ تم إضافة المستخدم إلى جدول bagstore_users');
      }
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدم:', error.message);
    process.exit(1);
  }
}

createAdminUser();
