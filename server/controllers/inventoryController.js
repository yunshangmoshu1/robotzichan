const supabase = require('../services/supabase');

// 获取盘点列表
exports.list = async (req, res) => {
  try {
    const { session_id } = req.query;

    let query = supabase.from('inventory_checks').select('*, robots(*)').order('checked_at', { ascending: false });
    if (session_id) query = query.eq('session_id', session_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '获取盘点列表失败: ' + err.message });
  }
};

// 提交盘点结果
exports.check = async (req, res) => {
  try {
    const { robot_id, session_id, status, location } = req.body;

    if (!robot_id || !session_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const record = {
      robot_id,
      session_id,
      status: status || 'confirmed',
      checked_by: req.user.display_name,
      checked_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('inventory_checks')
      .upsert(record, { onConflict: 'robot_id,session_id' })
      .select()
      .single();

    if (error) throw error;

    // 如果盘点时修改了位置
    if (location) {
      await supabase
        .from('robots')
        .update({ location, updater: req.user.display_name, updated_at: new Date().toISOString() })
        .eq('id', robot_id);
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '提交盘点结果失败: ' + err.message });
  }
};

// 重置盘点
exports.reset = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: '缺少 session_id' });

    const { error } = await supabase
      .from('inventory_checks')
      .delete()
      .eq('session_id', session_id);

    if (error) throw error;
    res.json({ message: '盘点已重置' });
  } catch (err) {
    res.status(500).json({ error: '重置盘点失败: ' + err.message });
  }
};

// 盘点报告
exports.report = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: '缺少 session_id' });

    // 获取所有资产
    const { data: robots, error: rErr } = await supabase.from('robots').select('*');
    if (rErr) throw rErr;

    // 获取本次盘点记录
    const { data: checks, error: cErr } = await supabase
      .from('inventory_checks')
      .select('*')
      .eq('session_id', session_id);
    if (cErr) throw cErr;

    const checkedIds = new Set(checks.map(c => c.robot_id));
    const confirmed = checks.filter(c => c.status === 'confirmed');
    const missing = checks.filter(c => c.status === 'missing');
    const unchecked = robots.filter(r => !checkedIds.has(r.id));

    res.json({
      session_id,
      total: robots.length,
      confirmed: confirmed.length,
      missing: missing.length,
      unchecked: unchecked.length,
      details: { confirmed, missing, unchecked },
    });
  } catch (err) {
    res.status(500).json({ error: '获取盘点报告失败: ' + err.message });
  }
};
