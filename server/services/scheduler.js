const cron = require('node-cron');
const dingtalkService = require('./dingtalk');
const excelService = require('./excel');
const supabase = require('./supabase');

let task = null;
let running = false;
let lastSync = null;
let lastResult = null;

// 自动列映射（与 controller 保持一致）
const fieldMap = {
  '类型': 'type', 'type': 'type', '机器人类型': 'type', '型号': 'type',
  '序列号': 'serial', 'serial': 'serial', '编号': 'serial', '出厂编号': 'serial', '机器人出厂编号': 'serial',
  '状态': 'status', 'status': 'status', '机器人状态': 'status',
  '负责人': 'person', 'person': 'person', '责任人': 'person', '管理人': 'person', '关联责任人': 'person',
  'IP': 'ip', 'ip': 'ip', 'IP地址': 'ip',
  '位置': 'location', 'location': 'location', '地点': 'location', '所在位置': 'location', '位置更新时间（每周五更新）': 'location',
  '备注': 'notes', 'notes': 'notes', '说明': 'notes',
  '条形码': 'barcode', 'barcode': 'barcode', '条码': 'barcode',
  '部门': 'department', 'department': 'department', '所属部门': 'department',
  '采购日期': 'purchase_date', '保修到期': 'warranty_until', '价值': 'value',
};

function autoMapColumns(headers) {
  const mapping = {};
  headers.forEach((header, idx) => {
    const fieldName = fieldMap[header.trim()];
    if (fieldName) mapping[idx] = fieldName;
  });
  return mapping;
}

// 从钉钉拉取数据并导入
async function syncFromDingTalk() {
  const config = require('../config');
  const { documentId, sheetName, operatorId } = getSyncConfig();

  if (!documentId) {
    throw new Error('未配置钉钉文档ID，无法自动同步');
  }

  console.log('[自动同步] 开始从钉钉拉取数据...');

  // 1. 从钉钉获取数据
  let sheetData;
  try {
    sheetData = await dingtalkService.getNotableData(documentId, sheetName, operatorId || config.dingtalk.operatorId);
  } catch (notableErr) {
    console.log('[自动同步] AI 表格 API 失败，尝试电子表格 API:', notableErr.message);
    sheetData = await dingtalkService.getSpreadsheetData(documentId, sheetName);
  }

  if (!sheetData || sheetData.length < 2) {
    throw new Error('钉钉表格数据为空');
  }

  // 2. 解析并导入
  const headers = sheetData[0];
  const rows = sheetData.slice(1);
  const mapping = autoMapColumns(headers);

  const robots = rows
    .map(row => {
      const robot = {};
      for (const [colIdx, fieldName] of Object.entries(mapping)) {
        robot[fieldName] = row[parseInt(colIdx)] || null;
      }
      return robot;
    })
    .filter(r => r.type && r.serial);

  if (robots.length === 0) {
    throw new Error('没有有效资产数据');
  }

  const { data, error } = await supabase
    .from('robots')
    .upsert(robots, { onConflict: 'type,serial' })
    .select();

  if (error) throw error;

  // 3. 记录日志
  await supabase.from('dingtalk_sync_logs').insert({
    direction: 'import',
    file_name: `自动同步-钉钉文档`,
    record_count: data.length,
    status: 'success',
    synced_by: '系统自动同步',
  });

  console.log(`[自动同步] 从钉钉导入 ${data.length} 条记录`);
  return { direction: 'import', count: data.length };
}

// 导出数据到钉钉
async function syncToDingTalk() {
  const { folderId } = getSyncConfig();

  console.log('[自动同步] 开始导出到钉钉...');

  // 1. 查询数据
  const { data: robots, error } = await supabase
    .from('robots')
    .select('*')
    .order('type')
    .order('serial');

  if (error) throw error;

  if (!robots || robots.length === 0) {
    console.log('[自动同步] 无数据可导出');
    return { direction: 'export', count: 0 };
  }

  // 2. 生成 Excel 并上传
  const xlsxBuffer = excelService.generateXlsx(robots);
  const fileName = `自动同步_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (folderId) {
    await dingtalkService.uploadFile(xlsxBuffer, fileName, folderId);
  }

  // 3. 记录日志
  await supabase.from('dingtalk_sync_logs').insert({
    direction: 'export',
    file_name: fileName,
    record_count: robots.length,
    status: 'success',
    synced_by: '系统自动同步',
  });

  console.log(`[自动同步] 导出 ${robots.length} 条记录到钉钉`);
  return { direction: 'export', count: robots.length };
}

// 自动同步：网站 → 钉钉（单向，定时任务用）
async function runSync() {
  if (running) {
    console.log('[自动同步] 上一次同步尚未完成，跳过');
    return;
  }

  running = true;
  try {
    const { folderId } = getSyncConfig();
    if (folderId) {
      const result = await syncToDingTalk();
      lastSync = new Date().toISOString();
      lastResult = { success: true, time: lastSync, results: [result] };
    } else {
      console.log('[自动同步] 未配置文件夹ID，跳过导出');
    }
  } catch (err) {
    lastResult = { success: false, error: err.message };
    console.error('[自动同步] 同步失败:', err.message);
  } finally {
    running = false;
  }
}

// 手动导入：钉钉 → 网站（单向，手动触发）
async function runImport() {
  if (running) {
    console.log('[手动导入] 上一次同步尚未完成，请稍后再试');
    return { error: '上一次同步尚未完成' };
  }

  running = true;
  try {
    const result = await syncFromDingTalk();
    lastSync = new Date().toISOString();
    lastResult = { success: true, time: lastSync, results: [result] };
    return result;
  } catch (err) {
    lastResult = { success: false, error: err.message };
    console.error('[手动导入] 从钉钉导入失败:', err.message);
    return { error: err.message };
  } finally {
    running = false;
  }
}

// 从数据库读取同步配置
function getSyncConfig() {
  try {
    const stored = require('../config').syncConfig || {};
    return {
      documentId: stored.documentId || process.env.DINGTALK_SYNC_DOCUMENT_ID || '',
      sheetName: stored.sheetName || process.env.DINGTALK_SYNC_SHEET_NAME || '',
      operatorId: stored.operatorId || process.env.DINGTALK_OPERATOR_ID || '',
      folderId: stored.folderId || '',
      interval: stored.interval || parseInt(process.env.DINGTALK_SYNC_INTERVAL) || 1,
    };
  } catch {
    return { documentId: '', sheetName: '', operatorId: '', folderId: '', interval: 1 };
  }
}

// 启动定时同步
function start(intervalMinutes) {
  stop();

  if (!intervalMinutes || intervalMinutes < 1) {
    intervalMinutes = 30; // 默认 30 分钟
  }

  // node-cron: 每 N 分钟执行
  const cronExpr = `*/${intervalMinutes} * * * *`;
  task = cron.schedule(cronExpr, () => {
    runSync();
  });

  console.log(`[自动同步] 已启动，间隔 ${intervalMinutes} 分钟`);
  return { started: true, interval: intervalMinutes };
}

// 停止定时同步
function stop() {
  if (task) {
    task.stop();
    task = null;
    console.log('[自动同步] 已停止');
  }
  return { stopped: true };
}

// 获取状态
function getStatus() {
  return {
    enabled: !!task,
    running,
    lastSync,
    lastResult,
    config: getSyncConfig(),
  };
}

module.exports = { start, stop, getStatus, runSync, runImport };
