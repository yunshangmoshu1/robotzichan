import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 根据环境设置 API 基础地址
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
})

// 请求拦截：添加 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误处理
api.interceptors.response.use(
  response => response.data,
  error => {
    const msg = error.response?.data?.error || error.message || '请求失败'

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(msg)
    }

    return Promise.reject(error)
  }
)

export default api
