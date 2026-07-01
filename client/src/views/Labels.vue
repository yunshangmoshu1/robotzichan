<template>
  <div>
    <div class="page-header">
      <h2>二维码标签生成</h2>
    </div>

    <!-- 筛选 -->
    <el-card style="margin-bottom: 16px;">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-select v-model="typeFilter" placeholder="全部类型" clearable @change="updateList">
            <el-option v-for="t in types" :key="t" :label="t" :value="t" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="statusFilter" placeholder="全部状态" clearable @change="updateList">
            <el-option label="排除已部署" value="!已部署" />
            <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button @click="toggleSelectAll">全选/取消</el-button>
          <span style="margin-left: 8px; color: #909399;">已选 {{ selectedCount }} 个</span>
        </el-col>
        <el-col :span="6" style="text-align: right;">
          <el-button type="primary" :disabled="!selectedCount" @click="generateLabels">生成标签 ({{ selectedCount }})</el-button>
          <el-button :disabled="!labelsGenerated" @click="downloadLabels">下载图片</el-button>
        </el-col>
      </el-row>

      <!-- 机器人列表 -->
      <el-table :data="filteredRobots" stripe max-height="400" style="margin-top: 12px;" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="serial" label="序列号" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="statusColors[row.status]" size="small">{{ statusLabels[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 标签预览 -->
    <div v-if="labelsGenerated" ref="labelsContainer" class="labels-grid">
      <div v-for="label in generatedLabels" :key="label.id" class="label-card">
        <img :src="label.qrDataUrl" style="width: 120px; height: 120px;" />
        <div class="label-info">
          <strong>{{ label.type }}</strong>
          <span class="mono">{{ label.serial }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import api from '@/api'
import { statusColors, statusLabels } from '@/utils/format'

const robots = ref([])
const types = ref([])
const statuses = ref([])
const typeFilter = ref('')
const statusFilter = ref('')
const selectedIds = ref([])
const generatedLabels = ref([])
const labelsGenerated = ref(false)
const labelsContainer = ref(null)

const filteredRobots = computed(() => {
  return robots.value.filter(r => {
    if (typeFilter.value && r.type !== typeFilter.value) return false
    if (statusFilter.value === '!已部署' && r.status === '已部署') return false
    if (statusFilter.value && statusFilter.value !== '!已部署' && r.status !== statusFilter.value) return false
    return true
  })
})

const selectedCount = computed(() => selectedIds.value.length)

function handleSelectionChange(rows) {
  selectedIds.value = rows.map(r => r.id)
}

function toggleSelectAll() {
  // This is a simplified toggle - in real use you'd call table's toggleAllSelection
  if (selectedIds.value.length === filteredRobots.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredRobots.value.map(r => r.id)
  }
}

function updateList() {
  // Reactivity handles this automatically
}

async function generateLabels() {
  const target = robots.value.filter(r => selectedIds.value.includes(r.id))
  if (!target.length) {
    ElMessage.warning('请至少选择一个机器人')
    return
  }

  const baseUrl = window.location.origin + '/scanner'
  const labels = []

  for (const r of target) {
    const qrContent = r.barcode || `${r.type}__${r.serial}`
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, qrContent, { width: 120, margin: 1 })
    const dataUrl = canvas.toDataURL()

    labels.push({
      id: r.id,
      type: r.type,
      serial: r.serial,
      qrDataUrl: dataUrl,
    })
  }

  generatedLabels.value = labels
  labelsGenerated.value = true
  ElMessage.success(`已生成 ${labels.length} 个标签`)
}

async function downloadLabels() {
  const cards = document.querySelectorAll('.label-card')
  if (!cards.length) {
    ElMessage.warning('请先生成标签')
    return
  }

  ElMessage.info('开始下载标签图片...')

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const label = generatedLabels.value[i]

    try {
      const canvas = await html2canvas(card, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${label.type}_${label.serial}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      if (i < cards.length - 1) await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error('标签下载失败:', label.serial, e)
    }
  }

  ElMessage.success(`已下载 ${cards.length} 张标签图片`)
}

onMounted(async () => {
  try {
    const res = await api.get('/robots', { params: { page_size: 10000 } })
    robots.value = res.data
    const unique = (arr) => [...new Set(arr.filter(Boolean))].sort()
    types.value = unique(robots.value.map(r => r.type))
    statuses.value = unique(robots.value.map(r => r.status))
  } catch (e) { /* handled */ }
})
</script>

<style scoped>
.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.label-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.label-info {
  text-align: center;
}

.label-info strong {
  display: block;
  font-size: 14px;
}

.label-info .mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #606266;
}

@media print {
  .el-card, .page-header { display: none !important; }
  .labels-grid { break-inside: avoid; }
}
</style>
