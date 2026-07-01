const config = require('../config');

let accessToken = null;
let tokenExpiry = 0;
let newAccessToken = null;
let newTokenExpiry = 0;

async function parseJsonResponse(resp, action) {
  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${action}失败: 钉钉返回了非 JSON 响应 (${resp.status})`);
  }

  if (!resp.ok) {
    throw new Error(`${action}失败: ${JSON.stringify(data)}`);
  }

  if (data?.code || data?.errcode) {
    const code = data.code || data.errcode;
    const message = data.message || data.errmsg || JSON.stringify(data);
    throw new Error(`${action}失败: ${message} (${code})`);
  }

  return data;
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const { appKey, appSecret } = config.dingtalk;
  if (!appKey || !appSecret) {
    throw new Error('钉钉 AppKey/AppSecret 未配置');
  }

  const resp = await fetch(
    `https://oapi.dingtalk.com/gettoken?appkey=${encodeURIComponent(appKey)}&appsecret=${encodeURIComponent(appSecret)}`
  );
  const data = await parseJsonResponse(resp, '获取钉钉旧版 token');

  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`获取钉钉 token 失败: ${data.errmsg || JSON.stringify(data)}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return accessToken;
}

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
  const data = await parseJsonResponse(resp, '获取钉钉新版 token');

  if (!data.accessToken) {
    throw new Error(`获取钉钉新版 token 失败: ${JSON.stringify(data)}`);
  }

  newAccessToken = data.accessToken;
  newTokenExpiry = Date.now() + ((data.expireIn || 7200) - 300) * 1000;
  return newAccessToken;
}

async function getSpreadsheetData(documentId, sheetName) {
  const token = await getAccessToken();

  const sheetsResp = await fetch(
    `https://api.dingtalk.com/v1.0/doc/spreadsheets/${encodeURIComponent(documentId)}/sheets`,
    { headers: { 'x-acs-access-token': token } }
  );
  const sheetsData = await parseJsonResponse(sheetsResp, '获取钉钉电子表格工作表');
  const sheets = Array.isArray(sheetsData) ? sheetsData : (sheetsData.sheets || sheetsData.items || []);

  if (!sheets.length) {
    throw new Error('无法获取工作表信息');
  }

  const sheet = sheetName
    ? sheets.find(s => s.name === sheetName || s.sheetName === sheetName)
    : sheets[0];

  if (!sheet) throw new Error(`未找到工作表: ${sheetName}`);

  const rangeResp = await fetch(
    `https://api.dingtalk.com/v1.0/doc/spreadsheets/${encodeURIComponent(documentId)}/sheets/${encodeURIComponent(sheet.sheetId || sheet.id)}/range`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-acs-access-token': token },
      body: JSON.stringify({ range: 'A1:Z1000' }),
    }
  );
  const rangeData = await parseJsonResponse(rangeResp, '读取钉钉电子表格数据');

  return rangeData.values || [];
}

function pickArray(data, keys) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.result?.value)) return data.result.value;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data?.result?.list)) return data.result.list;
  if (Array.isArray(data?.result?.records)) return data.result.records;
  if (Array.isArray(data?.result?.sheets)) return data.result.sheets;
  if (Array.isArray(data?.result?.fields)) return data.result.fields;
  return [];
}

function buildOperatorQuery(operatorId) {
  if (!operatorId) {
    throw new Error('钉钉 AI 表格 API 需要 operatorId，请配置 DINGTALK_OPERATOR_ID（当前验证可用的是钉钉 openId）或在请求中传 operator_id');
  }
  return `operatorId=${encodeURIComponent(operatorId)}`;
}

function normalizeFieldValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(normalizeFieldValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return value.text || value.name || value.title || value.value || JSON.stringify(value);
  }
  return value;
}

async function getNotableData(baseId, sheetName, operatorId = config.dingtalk.operatorId) {
  const token = await getNewAccessToken();
  const baseUrl = `https://api.dingtalk.com/v1.0/notable/bases/${encodeURIComponent(baseId)}`;
  const operatorQuery = buildOperatorQuery(operatorId);
  const headers = {
    'Content-Type': 'application/json',
    'x-acs-dingtalk-access-token': token,
  };

  const sheetsResp = await fetch(`${baseUrl}/sheets?${operatorQuery}`, { headers });
  const sheetsData = await parseJsonResponse(sheetsResp, '获取钉钉 AI 表格数据表');
  const sheets = pickArray(sheetsData, ['sheets', 'items', 'list']);

  if (!sheets.length) {
    throw new Error('AI 表格中没有找到任何数据表');
  }

  const sheet = sheetName
    ? sheets.find(s => s.name === sheetName || s.sheetName === sheetName || s.id === sheetName || s.sheetId === sheetName)
    : sheets[0];

  if (!sheet) throw new Error(`未找到数据表: ${sheetName}`);

  const sheetId = sheet.id || sheet.sheetId || sheet.sheetIdOrName || sheet.name || sheet.sheetName;
  const fieldsResp = await fetch(`${baseUrl}/sheets/${encodeURIComponent(sheetId)}/fields?${operatorQuery}`, { headers });
  const fieldsData = await parseJsonResponse(fieldsResp, '获取钉钉 AI 表格字段');
  const fieldDefs = pickArray(fieldsData, ['fields', 'items', 'list']);
  let fields = fieldDefs
    .map(f => ({ id: f.id || f.fieldId || f.name || f.fieldName, name: f.name || f.fieldName || f.id || f.fieldId }))
    .filter(f => f.name);

  const records = [];
  let nextToken;
  do {
    const recordsResp = await fetch(`${baseUrl}/sheets/${encodeURIComponent(sheetId)}/records/list?${operatorQuery}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ maxResults: 100, ...(nextToken ? { nextToken } : {}) }),
    });
    const recordsData = await parseJsonResponse(recordsResp, '获取钉钉 AI 表格记录');

    records.push(...pickArray(recordsData, ['records', 'items', 'list']));
    nextToken = recordsData.nextToken || recordsData.nextPageToken || recordsData.result?.nextToken || recordsData.result?.nextPageToken;
  } while (nextToken);

  if (!fields.length && records.length) {
    const firstValues = records[0].fields || records[0].values || records[0].recordValues || {};
    fields = Object.keys(firstValues).map(key => ({ id: key, name: key }));
  }

  const rows = [fields.map(field => field.name)];
  for (const record of records) {
    const values = record.fields || record.values || record.recordValues || {};
    const row = fields.map(field => normalizeFieldValue(values[field.name] ?? values[field.id]));
    rows.push(row);
  }

  return rows;
}

async function getBitableData(appToken, tableName, operatorId) {
  return getNotableData(appToken, tableName, operatorId);
}

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

  const data = await parseJsonResponse(resp, '上传文件到钉钉');
  if (!data.url) {
    throw new Error('文件上传失败: ' + JSON.stringify(data));
  }

  return data;
}

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

  const data = await parseJsonResponse(resp, '发送钉钉群消息');
  if (data.errcode !== 0) {
    throw new Error('发送钉钉消息失败: ' + data.errmsg);
  }

  return data;
}

function verifySignature(headers) {
  const { appSecret } = config.dingtalk;
  if (!appSecret) return true;

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
  getNotableData,
  getBitableData,
  uploadFile,
  sendGroupMessage,
  verifySignature,
};
