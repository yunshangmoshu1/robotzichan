import { defineStore } from 'pinia'
import { ref } from 'vue'
import { inventoryApi } from '@/api/inventory'

export const useInventoryStore = defineStore('inventory', () => {
  const checks = ref([])
  const report = ref(null)
  const loading = ref(false)

  async function fetchChecks(sessionId) {
    loading.value = true
    try {
      const res = await inventoryApi.list({ session_id: sessionId })
      checks.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function submitCheck(data) {
    const res = await inventoryApi.check(data)
    // 更新本地状态
    const idx = checks.value.findIndex(c => c.robot_id === data.robot_id)
    if (idx >= 0) {
      checks.value[idx] = res.data
    } else {
      checks.value.push(res.data)
    }
    return res.data
  }

  async function resetInventory(sessionId) {
    await inventoryApi.reset(sessionId)
    checks.value = []
  }

  async function fetchReport(sessionId) {
    const res = await inventoryApi.report(sessionId)
    report.value = res
    return res
  }

  return { checks, report, loading, fetchChecks, submitCheck, resetInventory, fetchReport }
})
