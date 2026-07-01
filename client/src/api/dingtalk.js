import api from './index'

export const dingtalkApi = {
  importData: (data) => api.post('/dingtalk/import', data),
  importPreview: (data) => api.post('/dingtalk/import', data, { params: { preview: true } }),
  exportData: (data) => api.post('/dingtalk/export', data),
  sendNotification: (message) => api.post('/dingtalk/notify', { message }),
  getSyncLogs: () => api.get('/dingtalk/sync-logs'),
}
