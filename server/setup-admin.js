// 运行方式: node setup-admin.js
// 用于创建默认管理员账户

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('请先在 .env 中配置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .upsert({
      username: 'admin',
      password_hash: hash,
      role: 'admin',
      display_name: '系统管理员',
    }, { onConflict: 'username' })
    .select();

  if (error) {
    console.error('创建管理员失败:', error.message);
  } else {
    console.log('管理员账户创建成功!');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('请登录后立即修改密码');
  }
}

main();
