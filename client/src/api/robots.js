import api from './index'

export const robotsApi = {
  list: (params) => api.get('/robots', { params }),
  getById: (id) => api.get(`/robots/${id}`),
  getByBarcode: (code) => api.get(`/robots/barcode/${encodeURIComponent(code)}`),
  create: (data) => api.post('/robots', data),
  update: (id, data) => api.put(`/robots/${id}`, data),
  remove: (id) => api.delete(`/robots/${id}`),
  batchUpdateStatus: (ids, status) => api.post('/robots/batch/status', { ids, status }),
  batchDelete: (ids) => api.post('/robots/batch/delete', { ids }),
  batchImport: (robots) => api.post('/robots/batch/import', { robots }),
  getChangelog: (id) => api.get(`/robots/${id}/changelog`),
  getFilterOptions: () => api.get('/robots/filters'),
}
