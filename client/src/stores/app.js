import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const currentSessionId = ref(`session_${Date.now()}`)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function newInventorySession() {
    currentSessionId.value = `session_${Date.now()}`
  }

  return { sidebarCollapsed, currentSessionId, toggleSidebar, newInventorySession }
})
