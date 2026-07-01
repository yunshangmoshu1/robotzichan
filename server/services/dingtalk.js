const config = require('../config');
const logger = require('../utils/logger');

let accessToken = null;
let tokenExpiry = 0;
let newAccessToken = null;
let newTokenExpiry = 0;

// 获取钉钉 access_token（旧版 oapi，用于老接口）
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const { appKey, appSecret } = config.dingtalk;
  if (!appKey || !appSecret) {
    throw new Error('钉钉 AppKey/AppSecret 未配置');
  }

  const resp = await fetch(
    `https://oapi.dingtalk.com/gettoken?appkey=${appKey}&appsecret=${appSecret}`
  );
  const data = await resp.json();

  if (data.errcode !== 0) {
    throw new Error(`获取钉钉 token 失败: ${data.errmsg}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return accessToken;
}

// 获取新版 access_token（用于 Bitable 等新 API）
async function getNewAccessToken() {
  if (newAccessToken && Date.now() < newTokenExpiry) return newAccessToken;

  const { appKey, appSecret } = config.dingtalk;
  if (!appKey || !appSecret) {
    throw new Error('钉钉 AppKey/AppSecret 未配置');
  }

  const resp = await fetch('https://api.dingtalk.com/v1.0/oauth2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appKey, appSecret }),
  });
  const data = await resp.json();

  if (!data.accessToken) {
    throw new Error(`获取钉钉新版 token 失败: ${JSON.stringify(data)}`);
  }

  newAccessToken = data.accessToken;
  newTokenExpiry = Date.now() + (data.expireIn - 300) * 1000;
  return newAccessToken;
}

// 获取钉钉表格数据（电子表格 Spreadsheet）
async function getSpreadsheetData(documentId, sheetName) {
  const token = await getAccessToken();

  // 获取工作表列表
  const sheetsResp = await fetch(
    `https://api.dingtalk.com/v1.0/doc/spreadsheets/${documentId}/sheets`,
    { headers: { 'x-acs-access-token': token } }
  );
  const sheetsData = await sheetsResp.json();

  if (!sheetsData || !sheetsData.length) {
    throw new Error('无法获取工作表信息');
  }

  // 选择指定工作表或默认第一个
  const sheet = sheetName
    ? sheetsData.find(s => s.name === sheetName)
    : sheetsData[0];

  if (!sheet) throw new Error(`未找到工作表: ${sheetName}`);

  // 读取表格数据
  const rangeResp = await fetch(
    `https://api.dingtalk.com/v1.0/doc/spreadsheets/${documentId}/sheets/${sheet.sheetId}/range`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-acs-access-token': token },
      body: JSON.stringify({ range: 'A1:Z1000' }),
    }
  );
  const rangeData = await rangeResp.json();

  return rangeData.values || [];
}

// 获取钉钉多维表数据（Bitable）
async function getBitableData(appToken, tableName) {
  const token = await getNewAccessToken();

  // 1. 获取表格列表
  const tablesResp = await fetch(
    `https://api.dingtalk.com/v1.0/bitable/apps/${appToken}/tables`,
    { headers: { 'x-acs-dingtalk-access-token': token } }
  );
  const tablesData = await tablesResp.json();

  if (tablesData.code) {
    throw new Error(`获取多维表失败: ${tablesData.message} (${tablesData.code})`);
  }

  const tables = tablesData.items || [];
  if (!tables.length) {
    throw new Error('多维表中没有找到任何数据表');
  }

  // 选择指定表或默认第一个
  const table = tableName
    ? tables.find(t => t.name === tableName)
    : tables[0];

  if (!table) throw new Error(`未找到数据表: ${tableName}`);

  // 2. 获取字段列表
  const fieldsResp = await fetch(
    `https://api.dingtalk.com/v1.0/bitable/apps/${appToken}/tables/${table.tableId}/fields`,
    { headers: { 'x-acs-dingtalk-access-token': token } }
  );
  const fieldsData = await fieldsResp.json();
  const fields = (fieldsData.items || []).map(f => f.name);

  // 3. 获取记录数据
  const recordsResp = await fetch(
    `https://api.dingtalk.com/v1.0/bitable/apps/${appToken}/tables/${table.tableId}/records?pageSize=500`,
    { headers: { 'x-acs-dingtalk-access-token': token } }
  );
  const recordsData = await recordsResp.json();
  const records = recordsData.items || [];

  // 4. 转换为二维数组格式（表头 + 数据行）
  const rows = [fields];
  for (const record of records) {
    const row = fields.map(field => {
      const val = record.fields[field];
      if (Array.isArray(val)) return val.map(v => v.text || v.name || v).join(', ');
      if (val && typeof val === 'object') return val.text || val.name || JSON.stringify(val);
      return val ?? '';
    });
    rows.push(row);
  }

  return rows;
}

// 上传文件到钉钉云盘
async function uploadFile(fileBuffer, fileName, folderId) {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  if (folderId) formData.append('folder_id', folderId);

  const resp = await fetch('https://api.dingtalk.com/v1.0/file/upload', {
    method: 'POST',
    headers: { 'x-acs-access-token': token },
    body: formData,
  });

  const data = await resp.json();
  if (!data.url) {
    throw new Error('文件上传失败: ' + JSON.stringify(data));
  }

  return data;
}

// 发送群消息（通过 webhook）
async function sendGroupMessage(message) {
  const { webhookUrl } = config.dingtalk;
  if (!webhookUrl) {
    throw new Error('钉钉 webhook URL 未配置');
  }

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'text',
      text: { content: `[ROBO::TRACK] ${message}` },
    }),
  });

  const data = await resp.json();
  if (data.errcode !== 0) {
    throw new Error('发送钉钉消息失败: ' + data.errmsg);
  }

  return data;
}

// 验证钉钉回调签名
function verifySignature(headers, body) {
  // 简化实现，生产环境需要完整的签名验证
  const { appSecret } = config.dingtalk;
  if (!appSecret) return true; // 未配置时跳过验证

  const timestamp = headers['x-dingtalk-sign-timestamp'];
  const sign = headers['x-dingtalk-sign'];

  if (!timestamp || !sign) return false;

  const crypto = require('crypto');
  const stringToSign = `${timestamp}\n${appSecret}`;
  const expectedSign = crypto
    .createHmac('sha256', appSecret)
    .update(stringToSign)
    .digest('base64');

  return sign === expectedSign;
}

module.exports = {
  getAccessToken,
  getNewAccessToken,
  getSpreadsheetData,
  getBitableData,
  uploadFile,
  sendGroupMessage,
  verifySignature,
};
