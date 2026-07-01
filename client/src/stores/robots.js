import { defineStore } from 'pinia'
import { ref } from 'vue'
import { robotsApi } from '@/api/robots'

export const useRobotsStore = defineStore('robots', () => {
  const robots = ref([])
  const total = ref(0)
  const loading = ref(false)
  const filterOptions = ref({ types: [], statuses: [], locations: [], persons: [], departments: [] })
  const currentRobot = ref(null)
  const changelog = ref([])

  async function fetchRobots(params = {}) {
    loading.value = true
    try {
      const res = await robotsApi.list(params)
      robots.value = res.data
      total.value = res.total
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id) {
    loading.value = true
    try {
      const res = await robotsApi.getById(id)
      currentRobot.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchChangelog(id) {
    const res = await robotsApi.getChangelog(id)
    changelog.value = res.data
    return res.data
  }

  async function createRobot(data) {
    const res = await robotsApi.create(data)
    return res.data
  }

  async function updateRobot(id, data) {
    const res = await robotsApi.update(id, data)
    return res.data
  }

  async function deleteRobot(id) {
    await robotsApi.remove(id)
  }

  async function fetchFilterOptions() {
    const res = await robotsApi.getFilterOptions()
    filterOptions.value = res
    return res
  }

  return {
    robots, total, loading, filterOptions, currentRobot, changelog,
    fetchRobots, fetchById, fetchChangelog, createRobot, updateRobot, deleteRobot, fetchFilterOptions,
  }
})
