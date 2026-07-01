const dingtalkService = require('../services/dingtalk');
const excelService = require('../services/excel');
const supabase = require('../services/supabase');

// 从钉钉导入表格
exports.importFromDingTalk = async (req, res) => {
  try {
    const { document_id, sheet_name, column_mapping } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: '请提供钉钉文档ID' });
    }

    // 1. 从钉钉获取表格数据（先尝试多维表 API，失败则用电子表格 API）
    let sheetData;
    try {
      sheetData = await dingtalkService.getBitableData(document_id, sheet_name);
      console.log('使用多维表 API 获取数据成功');
    } catch (bitableErr) {
      console.log('多维表 API 失败，尝试电子表格 API:', bitableErr.message);
      try {
        sheetData = await dingtalkService.getSpreadsheetData(document_id, sheet_name);
        console.log('使用电子表格 API 获取数据成功');
      } catch (spreadsheetErr) {
        return res.status(400).json({
          error: `无法获取钉钉数据。多维表错误: ${bitableErr.message}; 电子表格错误: ${spreadsheetErr.message}。建议使用文件上传方式导入。`
        });
      }
    }

    if (!sheetData || sheetData.length < 2) {
      return res.status(400).json({ error: '表格数据为空或格式不正确' });
    }

    // 2. 解析表头和数据
    const headers = sheetData[0];
    const rows = sheetData.slice(1);

    // 3. 应用列映射（如果没有提供，尝试自动匹配）
    const mapping = column_mapping || autoMapColumns(headers);

    // 4. 转换为资产对象
    const robots = rows
      .map(row => {
        const robot = {};
        for (const [colIdx, fieldName] of Object.entries(mapping)) {
          robot[fieldName] = row[parseInt(colIdx)] || null;
        }
        return robot;
      })
      .filter(r => r.type && r.serial); // 过滤无效行

    if (robots.length === 0) {
      return res.status(400).json({ error: '没有有效的资产数据，请检查列映射' });
    }

    // 5. 预览模式（只返回前10条）
    if (req.query.preview === 'true') {
      return res.json({
        preview: robots.slice(0, 10),
        total: robots.length,
        mapping,
        headers,
      });
    }

    // 6. 批量写入数据库
    const { data, error } = await supabase
      .from('robots')
      .upsert(robots, { onConflict: 'type,serial' })
      .select();

    if (error) throw error;

    // 7. 记录同步日志
    await supabase.from('dingtalk_sync_logs').insert({
      direction: 'import',
      file_name: `钉钉文档-${document_id}`,
      record_count: data.length,
      status: 'success',
      synced_by: req.user.display_name,
    });

    res.json({ data, imported: data.length });
  } catch (err) {
    // 记录失败日志
    await supabase.from('dingtalk_sync_logs').insert({
      direction: 'import',
      file_name: `钉钉文档-${req.body.document_id}`,
      record_count: 0,
      status: 'failed',
      error_message: err.message,
      synced_by: req.user.display_name,
    }).catch(() => {});

    res.status(500).json({ error: '从钉钉导入失败: ' + err.message });
  }
};

// 导出到钉钉
exports.exportToDingTalk = async (req, res) => {
  try {
    const { folder_id, filters } = req.body;

    // 1. 查询要导出的数据
    let query = supabase.from('robots').select('*').order('type').order('serial');

    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
    }

    const { data: robots, error } = await query;
    if (error) throw error;

    // 2. 生成 Excel 文件
    const xlsxBuffer = excelService.generateXlsx(robots);

    // 3. 上传到钉钉云盘
    const fileName = `机器人资产导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const uploadResult = await dingtalkService.uploadFile(xlsxBuffer, fileName, folder_id);

    // 4. 记录同步日志
    await supabase.from('dingtalk_sync_logs').insert({
      direction: 'export',
      file_name: fileName,
      record_count: robots.length,
      status: 'success',
      synced_by: req.user.display_name,
    });

    res.json({
      message: '导出成功',
      file_url: uploadResult.url,
      record_count: robots.length,
    });
  } catch (err) {
    res.status(500).json({ error: '导出到钉钉失败: ' + err.message });
  }
};

// 钉钉 webhook 回调（接收消息）
exports.webhookCallback = async (req, res) => {
  try {
    // 验证签名
    const isValid = dingtalkService.verifySignature(req.headers, req.body);
    if (!isValid) {
      return res.status(401).json({ error: '签名验证失败' });
    }

    const { msgtype, text, senderNick } = req.body;

    // 处理文本消息
    if (msgtype === 'text' && text?.content) {
      const content = text.content.trim();

      // 支持查询资产：发送 "查询 XXX" 或 "查 XXX"
      const searchMatch = content.match(/^(查询?|查|找)\s*(.+)/);
      if (searchMatch) {
        const keyword = searchMatch[2];
        const { data } = await supabase
          .from('robots')
          .select('*')
          .or(`type.ilike.%${keyword}%,serial.ilike.%${keyword}%,barcode.ilike.%${keyword}%`)
          .limit(5);

        if (data && data.length > 0) {
          const reply = data.map(r =>
            `${r.type} | ${r.serial} | 状态: ${r.status} | 位置: ${r.location || '未记录'}`
          ).join('\n');
          return res.json({ msgtype: 'text', text: { content: `找到 ${data.length} 条结果:\n${reply}` } });
        }
        return res.json({ msgtype: 'text', text: { content: `未找到匹配 "${keyword}" 的资产` } });
      }
    }

    res.json({ msgtype: 'text', text: { content: '收到消息' } });
  } catch (err) {
    res.status(500).json({ error: '处理回调失败: ' + err.message });
  }
};

// 发送通知到钉钉群
exports.sendNotification = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: '消息内容不能为空' });

    await dingtalkService.sendGroupMessage(message);
    res.json({ message: '通知发送成功' });
  } catch (err) {
    res.status(500).json({ error: '发送通知失败: ' + err.message });
  }
};

// 获取同步日志
exports.getSyncLogs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dingtalk_sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '获取同步日志失败: ' + err.message });
  }
};

// ---- 辅助函数 ----

// 自动列映射：根据表头名称猜测对应字段
function autoMapColumns(headers) {
  const fieldMap = {
    '类型': 'type', 'type': 'type', '机器人类型': 'type', '型号': 'type',
    '序列号': 'serial', 'serial': 'serial', '编号': 'serial', '出厂编号': 'serial',
    '状态': 'status', 'status': 'status',
    '负责人': 'person', 'person': 'person', '责任人': 'person', '管理人': 'person',
    'IP': 'ip', 'ip': 'ip', 'IP地址': 'ip',
    '位置': 'location', 'location': 'location', '地点': 'location', '所在位置': 'location',
    '备注': 'notes', 'notes': 'notes', '说明': 'notes',
    '条形码': 'barcode', 'barcode': 'barcode', '条码': 'barcode',
    '部门': 'department', 'department': 'department', '所属部门': 'department',
    '采购日期': 'purchase_date', '保修到期': 'warranty_until', '价值': 'value',
  };

  const mapping = {};
  headers.forEach((header, idx) => {
    const fieldName = fieldMap[header.trim()];
    if (fieldName) mapping[idx] = fieldName;
  });

  return mapping;
}
