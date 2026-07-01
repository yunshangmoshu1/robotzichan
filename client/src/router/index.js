import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'robots', name: 'RobotList', component: () => import('@/views/RobotList.vue') },
      { path: 'robots/new', name: 'RobotCreate', component: () => import('@/views/RobotForm.vue') },
      { path: 'robots/:id', name: 'RobotDetail', component: () => import('@/views/RobotDetail.vue') },
      { path: 'robots/:id/edit', name: 'RobotEdit', component: () => import('@/views/RobotForm.vue') },
      { path: 'scanner', name: 'Scanner', component: () => import('@/views/Scanner.vue') },
      { path: 'labels', name: 'Labels', component: () => import('@/views/Labels.vue') },
      { path: 'inventory', name: 'Inventory', component: () => import('@/views/Inventory.vue') },
      { path: 'dingtalk', name: 'DingTalk', component: () => import('@/views/DingTalk.vue') },
      { path: 'reports', name: 'Reports', component: () => import('@/views/Reports.vue') },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
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
