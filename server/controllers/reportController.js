const supabase = require('../services/supabase');

// 仪表盘统计数据
exports.dashboard = async (req, res) => {
  try {
    // 获取所有资产
    const { data: robots, error } = await supabase.from('robots').select('*');
    if (error) throw error;

    // 按状态统计
    const statusCounts = {};
    robots.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    // 按类型统计
    const typeCounts = {};
    robots.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    // 逾期未还的借出资产
    const now = new Date().toISOString();
    const overdue = robots.filter(r =>
      r.borrowed && r.return_due && r.return_due < now
    );

    // 最近变更日志
    const { data: recentChanges } = await supabase
      .from('change_log')
      .select('*, robots(type, serial)')
      .order('changed_at', { ascending: false })
      .limit(10);

    res.json({
      total: robots.length,
      status_counts: statusCounts,
      type_counts: typeCounts,
      overdue_count: overdue.length,
      overdue_list: overdue,
      recent_changes: recentChanges || [],
    });
  } catch (err) {
    res.status(500).json({ error: '获取仪表盘数据失败: ' + err.message });
  }
};

// 变动趋势数据
exports.trends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    // 获取变更日志
    const { data: logs, error } = await supabase
      .from('change_log')
      .select('field, changed_at')
      .order('changed_at', { ascending: true });

    if (error) throw error;

    // 按月分组统计
    const monthlyData = {};
    const now = new Date();
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { total: 0, status_changes: 0, location_changes: 0 };
    }

    logs.forEach(log => {
      const d = new Date(log.changed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].total++;
        if (log.field === '状态') monthlyData[key].status_changes++;
        if (log.field === '位置') monthlyData[key].location_changes++;
      }
    });

    res.json({ data: monthlyData });
  } catch (err) {
    res.status(500).json({ error: '获取趋势数据失败: ' + err.message });
  }
};

// 导出报表
exports.exportReport = async (req, res) => {
  try {
    const { format = 'xlsx', filters } = req.body;

    let query = supabase.from('robots').select('*').order('type').order('serial');
    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
    }

    const { data: robots, error } = await query;
    if (error) throw error;

    if (format === 'xlsx') {
      const excelService = require('../services/excel');
      const buffer = excelService.generateXlsx(robots);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=robot_report_${Date.now()}.xlsx`);
      return res.send(buffer);
    }

    res.json({ data: robots });
  } catch (err) {
    res.status(500).json({ error: '导出报表失败: ' + err.message });
  }
};
