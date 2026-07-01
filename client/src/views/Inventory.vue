<template>
  <div>
    <div class="page-header">
      <h2>盘点管理</h2>
      <div>
        <el-button type="primary" @click="newSession">
          <el-icon><Refresh /></el-icon> 新建盘点
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon> 导出报告
        </el-button>
      </div>
    </div>

    <!-- 盘点统计 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">资产总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #67c23a">{{ stats.confirmed }}</div>
        <div class="stat-label">已确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #f56c6c">{{ stats.missing }}</div>
        <div class="stat-label">缺失</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #909399">{{ stats.unchecked }}</div>
        <div class="stat-label">未盘点</div>
      </div>
    </div>

    <!-- 视图切换 + 搜索 -->
    <el-card style="margin-bottom: 16px;">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="location">按位置分组</el-radio-button>
            <el-radio-button value="flat">平铺列表</el-radio-button>
          </el-radio-group>
        </el-col>
        <el-col :span="6">
          <el-input v-model="search" placeholder="搜索类型/序列号..." clearable />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterStatus" placeholder="筛选" clearable>
            <el-option label="未盘点" value="unchecked" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="缺失" value="missing" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 按位置分组视图 -->
    <template v-if="viewMode === 'location'">
      <el-card v-for="group in locationGroups" :key="group.location" style="margin-bottom: 16px;">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>
              <el-icon><Location /></el-icon>
              {{ group.location }}
              <el-tag size="small" style="margin-left: 8px;">{{ group.robots.length }} 台</el-tag>
            </span>
            <el-button-group size="small">
              <el-button @click="batchCheckLocation(group.location, 'confirmed')">全部确认</el-button>
              <el-button @click="batchCheckLocation(group.location, 'missing')">全部标记缺失</el-button>
            </el-button-group>
          </div>
        </template>

        <div v-for="robot in group.robots" :key="robot.id" class="inv-item">
          <div class="inv-info">
            <strong>{{ robot.type }}</strong>
            <span class="mono" style="margin-left: 8px; color: #909399;">{{ robot.serial }}</span>
            <span style="margin-left: 8px; font-size: 12px; color: #909399;">
              {{ robot.status }}{{ robot.person ? ' · ' + robot.person : '' }}
            </span>
            <span v-if="getCheckBy(robot.id)" style="margin-left: 8px; font-size: 11px; color: #c0c4cc;">
              {{ getCheckBy(robot.id) }}
            </span>
          </div>
          <div class="inv-actions">
            <el-button
              :type="getCheckStatus(robot.id) === 'confirmed' ? 'success' : 'default'"
              size="small"
              @click="handleCheck(robot.id, 'confirmed')"
            >
              在位
            </el-button>
            <el-button
              :type="getCheckStatus(robot.id) === 'missing' ? 'danger' : 'default'"
              size="small"
              @click="handleCheck(robot.id, 'missing')"
            >
              未找到
            </el-button>
          </div>
        </div>
      </el-card>
    </template>

    <!-- 平铺列表视图 -->
    <el-card v-if="viewMode === 'flat'">
      <el-table :data="filteredRobots" stripe v-loading="loading">
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="serial" label="序列号" width="140" />
        <el-table-column prop="location" label="位置" min-width="120" />
        <el-table-column label="盘点状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getCheckStatusType(row.id)" size="small">
              {{ getCheckStatusLabel(row.id) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                :type="getCheckStatus(row.id) === 'confirmed' ? 'success' : 'default'"
                size="small"
                @click="handleCheck(row.id, 'confirmed')"
              >
                确认在位
              </el-button>
              <el-button
                :type="getCheckStatus(row.id) === 'missing' ? 'danger' : 'default'"
                size="small"
                @click="handleCheck(row.id, 'missing')"
              >
                标记缺失
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInventoryStore } from '@/stores/inventory'
import { useAppStore } from '@/stores/app'
import { useExport } from '@/composables/useExport'
import api from '@/api'

const inventoryStore = useInventoryStore()
const appStore = useAppStore()
const { exportToXlsx } = useExport()

const robots = ref([])
const loading = ref(false)
const search = ref('')
const filterStatus = ref('')
const viewMode = ref('location')

const sessionId = computed(() => appStore.currentSessionId)

const stats = computed(() => {
  const total = robots.value.length
  const checks = inventoryStore.checks
  const confirmed = checks.filter(c => c.status === 'confirmed').length
  const missing = checks.filter(c => c.status === 'missing').length
  return { total, confirmed, missing, unchecked: total - confirmed - missing }
})

// 按位置分组
const locationGroups = computed(() => {
  const groups = {}
  let list = robots.value

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(r => r.type?.toLowerCase().includes(q) || r.serial?.toLowerCase().includes(q))
  }

  list.forEach(r => {
    const loc = r.location || '未分配位置'
    if (!groups[loc]) groups[loc] = { location: loc, robots: [] }
    groups[loc].robots.push(r)
  })

  return Object.values(groups).sort((a, b) => a.location.localeCompare(b.location))
})

const filteredRobots = computed(() => {
  let list = robots.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(r => r.type?.toLowerCase().includes(q) || r.serial?.toLowerCase().includes(q))
  }
  if (filterStatus.value) {
    list = list.filter(r => {
      const status = getCheckStatus(r.id)
      if (filterStatus.value === 'unchecked') return !status
      return status === filterStatus.value
    })
  }
  return list
})

function getCheckStatus(robotId) {
  const check = inventoryStore.checks.find(c => c.robot_id === robotId)
  return check?.status || ''
}

function getCheckBy(robotId) {
  const check = inventoryStore.checks.find(c => c.robot_id === robotId)
  return check?.checked_by || ''
}

function getCheckStatusType(robotId) {
  const s = getCheckStatus(robotId)
  if (s === 'confirmed') return 'success'
  if (s === 'missing') return 'danger'
  return 'info'
}

function getCheckStatusLabel(robotId) {
  const s = getCheckStatus(robotId)
  if (s === 'confirmed') return '已确认'
  if (s === 'missing') return '缺失'
  return '未盘点'
}

async function handleCheck(robotId, status) {
  await inventoryStore.submitCheck({
    robot_id: robotId,
    session_id: sessionId.value,
    status,
  })
  ElMessage.success(status === 'confirmed' ? '已确认在位' : '已标记缺失')
}

// 批量确认某个位置的所有机器人
async function batchCheckLocation(location, status) {
  const group = locationGroups.value.find(g => g.location === location)
  if (!group) return

  const label = status === 'confirmed' ? '确认在位' : '标记缺失'
  await ElMessageBox.confirm(`确定将 ${location} 的 ${group.robots.length} 台机器人全部${label}？`, '批量操作', { type: 'warning' })

  for (const robot of group.robots) {
    await inventoryStore.submitCheck({
      robot_id: robot.id,
      session_id: sessionId.value,
      status,
    })
  }
  ElMessage.success(`已批量${label} ${group.robots.length} 台`)
}

async function newSession() {
  await ElMessageBox.confirm('将开始新的盘点会话，当前盘点进度将重置。继续？', '新建盘点', { type: 'warning' })
  await inventoryStore.resetInventory(sessionId.value)
  appStore.newInventorySession()
  ElMessage.success('新盘点已开始')
}

function handleExport() {
  const data = robots.value.map(r => ({
    类型: r.type,
    序列号: r.serial,
    位置: r.location,
    盘点状态: getCheckStatusLabel(r.id),
    盘点人: getCheckBy(r.id),
  }))
  exportToXlsx(data, '盘点报告')
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/robots', { params: { page_size: 1000 } })
    robots.value = res.data
    await inventoryStore.fetchChecks(sessionId.value)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.inv-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.inv-item:last-child {
  border-bottom: none;
}
.inv-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}
.inv-actions {
  display: flex;
  gap: 8px;
}
.mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>
