// 状态标签颜色映射
export const statusColors = {
  testing: 'info',
  deployed: 'success',
  repair: 'warning',
  borrowed: 'danger',
}

// 状态中文名
export const statusLabels = {
  testing: '测试中',
  deployed: '已部署',
  repair: '维修中',
  borrowed: '已借出',
}

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
