import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const sidebarOpen = ref(false)
  const currentSessionId = ref(`session_${Date.now()}`)

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      // 手机端：切换展开/收起
      sidebarOpen.value = !sidebarOpen.value
    } else {
      // 桌面端：切换折叠/展开
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function newInventorySession() {
    currentSessionId.value = `session_${Date.now()}`
  }

  return { sidebarCollapsed, sidebarOpen, currentSessionId, toggleSidebar, closeSidebar, newInventorySession }
})
