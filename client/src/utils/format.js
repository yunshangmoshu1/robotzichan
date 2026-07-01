// 状态标签颜色映射
export const statusColors = {
  testing: 'info',
  deployed: 'success',
  repair: 'warning',
  borrowed: 'danger',
  '已出库': 'success',
  '测试中': 'primary',
  '借出中': 'danger',
  '闲置中': 'info',
  '展出中': 'warning',
  '返修中': 'warning',
  '维修中': 'warning',
  '已部署': 'success',
  '已借出': 'danger',
}

// 状态中文名
export const statusLabels = {
  testing: '测试中',
  deployed: '已出库',
  repair: '返修中',
  borrowed: '借出中',
  '已部署': '已出库',
  '维修中': '返修中',
  '已借出': '借出中',
}

export const defaultStatusOptions = ['已出库', '测试中', '借出中', '闲置中', '展出中', '返修中']

// 格式化日期
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 格式化日期时间
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// 检查是否逾期
export function isOverdue(returnDue) {
  if (!returnDue) return false
  return new Date(returnDue) < new Date()
}

// XSS 转义
export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
