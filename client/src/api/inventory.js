import api from './index'

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  check: (data) => api.post('/inventory/check', data),
  reset: (session_id) => api.post('/inventory/reset', { session_id }),
  report: (session_id) => api.get('/inventory/report', { params: { session_id } }),
}
