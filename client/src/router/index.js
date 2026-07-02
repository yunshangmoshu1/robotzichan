import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '仪表盘' } },
      { path: 'robots', name: 'RobotList', component: () => import('@/views/RobotList.vue'), meta: { title: '资产列表' } },
      { path: 'robots/new', name: 'RobotCreate', component: () => import('@/views/RobotForm.vue'), meta: { title: '新增资产' } },
      { path: 'robots/:id', name: 'RobotDetail', component: () => import('@/views/RobotDetail.vue'), meta: { title: '资产详情' } },
      { path: 'robots/:id/edit', name: 'RobotEdit', component: () => import('@/views/RobotForm.vue'), meta: { title: '编辑资产' } },
      { path: 'scanner', name: 'Scanner', component: () => import('@/views/Scanner.vue'), meta: { title: '条码扫描' } },
      { path: 'labels', name: 'Labels', component: () => import('@/views/Labels.vue'), meta: { title: '标签生成' } },
      { path: 'inventory', name: 'Inventory', component: () => import('@/views/Inventory.vue'), meta: { title: '盘点管理' } },
      { path: 'dingtalk', name: 'DingTalk', component: () => import('@/views/DingTalk.vue'), meta: { title: '钉钉集成' } },
      { path: 'reports', name: 'Reports', component: () => import('@/views/Reports.vue'), meta: { title: '报表统计' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置' } },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 路由守卫：未登录跳转登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
