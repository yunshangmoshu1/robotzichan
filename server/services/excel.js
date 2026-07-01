const XLSX = require('xlsx');

// 列名映射（数据库字段 → 中文表头）
const columnLabels = {
  type: '类型',
  serial: '序列号',
  barcode: '条形码',
  status: '状态',
  person: '负责人',
  ip: 'IP地址',
  location: '位置',
  department: '部门',
  notes: '备注',
  borrowed: '是否借出',
  borrowed_to: '借用人',
  borrowed_at: '借出时间',
  return_due: '预计归还',
  purchase_date: '采购日期',
  warranty_until: '保修到期',
  value: '资产价值',
  updater: '最后操作人',
  created_at: '创建时间',
  updated_at: '更新时间',
};

// 生成 xlsx 文件 Buffer
function generateXlsx(robots) {
  const headers = Object.values(columnLabels);
  const keys = Object.keys(columnLabels);

  const rows = robots.map(robot =>
    keys.map(k => {
      const v = robot[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return v ? '是' : '否';
      return String(v);
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 设置列宽
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '机器人资产');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// 解析上传的 xlsx 文件
function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (data.length < 2) return { headers: [], rows: [] };

  return {
    headers: data[0],
    rows: data.slice(1),
  };
}

module.exports = { generateXlsx, parseXlsx, columnLabels };
