const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase');
const config = require('../config');

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败: ' + err.message });
  }
};

// 用户注册（仅管理员可创建）
exports.register = async (req, res) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, password_hash, display_name: display_name || username, role: role || 'user' })
      .select('id, username, display_name, role')
      .single();

    if (error) throw error;

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: '注册失败: ' + err.message });
  }
};

// 公开注册（无需登录）
exports.registerPublic = async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: '姓名、用户名和密码不能为空' });
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, password_hash, display_name, role: 'user' })
      .select('id, username, display_name, role')
      .single();

    if (error) throw error;

    // 注册后直接返回 token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: '注册失败: ' + err.message });
  }
};

// 获取当前用户信息
exports.me = async (req, res) => {
  res.json({ user: req.user });
};
