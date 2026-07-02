import api from './index'

export const dingtalkApi = {
  importData: (data) => api.post('/dingtalk/import', data),
  importPreview: (data) => api.post('/dingtalk/import', data, { params: { preview: true } }),
  exportData: (data) => api.post('/dingtalk/export', data),
  sendNotification: (message) => api.post('/dingtalk/notify', { message }),
  getSyncLogs: () => api.get('/dingtalk/sync-logs'),
  // 自动同步
  startAutoSync: (config) => api.post('/dingtalk/auto-sync/start', config),
  stopAutoSync: () => api.post('/dingtalk/auto-sync/stop'),
  getAutoSyncStatus: () => api.get('/dingtalk/auto-sync/status'),
  triggerSync: () => api.post('/dingtalk/auto-sync/trigger'),
}
