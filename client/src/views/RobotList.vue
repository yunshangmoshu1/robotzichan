<template>
  <div>
    <div class="page-header">
      <h2>资产列表</h2>
      <div>
        <el-button type="primary" @click="$router.push('/robots/new')">
          <el-icon><Plus /></el-icon> 新增资产
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card style="margin-bottom: 16px;">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-input v-model="search" placeholder="搜索类型/序列号/条形码/负责人/位置..." clearable @input="debounceFetch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" placeholder="状态" clearable @change="fetchData">
            <el-option v-for="s in filterOptions.statuses" :key="s" :label="s" :value="s" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.type" placeholder="类型" clearable @change="fetchData">
            <el-option v-for="t in filterOptions.types" :key="t" :label="t" :value="t" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.location" placeholder="位置" clearable filterable @change="fetchData">
            <el-option v-for="l in filterOptions.locations" :key="l" :label="l" :value="l" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.person" placeholder="负责人" clearable filterable @change="fetchData">
            <el-option v-for="p in filterOptions.persons" :key="p" :label="p" :value="p" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 批量操作栏 -->
    <el-card v-if="selectedIds.length" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span>已选择 {{ selectedIds.length }} 项</span>
        <el-select v-model="batchStatus" placeholder="批量修改状态" size="small" style="width: 160px;">
          <el-option v-for="s in filterOptions.statuses" :key="s" :label="s" :value="s" />
        </el-select>
        <el-button type="primary" size="small" :disabled="!batchStatus" @click="handleBatchStatus">应用</el-button>
        <el-button type="danger" size="small" @click="handleBatchDelete">批量删除</el-button>
      </div>
    </el-card>

    <!-- 数据表格 -->
    <el-card>
      <el-table
        v-loading="loading"
        :data="robots"
        stripe
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="type" label="类型" sortable="custom" min-width="120" />
        <el-table-column prop="serial" label="序列号" sortable="custom" min-width="120" />
        <el-table-column prop="barcode" label="条形码" min-width="100" />
        <el-table-column prop="status" label="状态" sortable="custom" width="100">
          <template #default="{ row }">
            <el-tag :type="statusColors[row.status]" size="small">{{ statusLabels[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="person" label="负责人" sortable="custom" min-width="100" />
        <el-table-column prop="location" label="位置" sortable="custom" min-width="120" />
        <el-table-column prop="department" label="部门" min-width="100" />
        <el-table-column prop="updated_at" label="更新时间" width="160" :formatter="(_, __, val) => formatDateTime(val)" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/robots/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchData"
          @size-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRobotsStore } from '@/stores/robots'
import { statusColors, statusLabels, formatDateTime } from '@/utils/format'
import { useExport } from '@/composables/useExport'

const robotsStore = useRobotsStore()
const { exportToXlsx } = useExport()

const search = ref('')
const filters = reactive({ status: '', type: '', location: '', person: '' })
const sort = reactive({ by: 'updated_at', order: 'desc' })
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const robots = ref([])
const loading = ref(false)
const selectedIds = ref([])
const batchStatus = ref('')
const filterOptions = ref({ types: [], statuses: [], locations: [], persons: [] })

let debounceTimer = null
function debounceFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchData, 300)
}

async function fetchData() {
  loading.value = true
  try {
    const params = {
      search: search.value || undefined,
      status: filters.status || undefined,
      type: filters.type || undefined,
      location: filters.location || undefined,
      person: filters.person || undefined,
      sort_by: sort.by,
      sort_order: sort.order,
      page: page.value,
      page_size: pageSize.value,
    }
    const res = await robotsStore.fetchRobots(params)
    robots.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map(r => r.id)
}

function handleSortChange({ prop, order }) {
  sort.by = prop || 'updated_at'
  sort.order = order === 'ascending' ? 'asc' : 'desc'
  fetchData()
}

async function handleBatchStatus() {
  if (!batchStatus.value || !selectedIds.value.length) return
  await robotsStore.fetchRobots // just a reference
  await fetch('/api/robots/batch/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ ids: selectedIds.value, status: batchStatus.value }),
  }).then(r => r.json())
  ElMessage.success('批量更新成功')
  fetchData()
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条记录？`, '确认删除', { type: 'warning' })
  await fetch('/api/robots/batch/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ ids: selectedIds.value }),
  }).then(r => r.json())
  ElMessage.success('批量删除成功')
  fetchData()
}

function handleExport() {
  const exportData = robots.value.map(r => ({
    类型: r.type, 序列号: r.serial, 条形码: r.barcode, 状态: r.status,
    负责人: r.person, 位置: r.location, 部门: r.department, IP: r.ip,
  }))
  exportToXlsx(exportData, '机器人资产')
}

onMounted(async () => {
  fetchData()
  try {
    filterOptions.value = await robotsStore.fetchFilterOptions()
  } catch (e) { /* ignore */ }
})
</script>
