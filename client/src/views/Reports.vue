<template>
  <div>
    <div class="page-header">
      <h2>报表统计</h2>
      <el-button @click="handleExport">
        <el-icon><Download /></el-icon> 导出报表
      </el-button>
    </div>

    <el-row :gutter="24">
      <!-- 状态分布 -->
        <el-col :xs="24" :lg="12">
        <el-card header="状态分布">
          <div v-for="(count, status) in dashboard.status_counts" :key="status" class="chart-bar">
            <div class="bar-label">{{ statusLabels[status] || status }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: pct(count) + '%', background: colorMap[status] }"></div>
            </div>
            <div class="bar-value">{{ count }} ({{ pct(count) }}%)</div>
          </div>
          <el-empty v-if="!dashboard.status_counts" description="暂无数据" />
        </el-card>
      </el-col>

      <!-- 类型分布 -->
        <el-col :xs="24" :lg="12">
        <el-card header="类型分布">
          <div v-for="(count, type) in dashboard.type_counts" :key="type" class="chart-bar">
            <div class="bar-label">{{ type }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: pct(count) + '%', background: '#2e7da0' }"></div>
            </div>
            <div class="bar-value">{{ count }}</div>
          </div>
          <el-empty v-if="!dashboard.type_counts" description="暂无数据" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 变动趋势 -->
    <el-card header="变动趋势（近6个月）" style="margin-top: 24px;">
      <div v-if="trends" class="trends-chart">
        <div v-for="(data, month) in trends" :key="month" class="trend-bar-group">
          <div class="trend-bars">
            <div class="trend-bar" :style="{ height: barHeight(data.total) + 'px', background: '#2e7da0' }" :title="`总计: ${data.total}`"></div>
            <div class="trend-bar" :style="{ height: barHeight(data.status_changes) + 'px', background: '#4f8b6d' }" :title="`状态变更: ${data.status_changes}`"></div>
          </div>
          <div class="trend-label">{{ month.slice(5) }}月</div>
        </div>
      </div>
      <div v-if="trends" style="display: flex; gap: 16px; justify-content: center; margin-top: 12px;">
        <span style="font-size: 12px; color: #909399;"><span style="display: inline-block; width: 12px; height: 12px; background: #2e7da0; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span>总变更</span>
        <span style="font-size: 12px; color: #909399;"><span style="display: inline-block; width: 12px; height: 12px; background: #4f8b6d; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span>状态变更</span>
      </div>
      <el-empty v-if="!trends" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { statusLabels } from '@/utils/format'
import { useExport } from '@/composables/useExport'

const { exportToXlsx } = useExport()

const dashboard = ref({})
const trends = ref(null)
const total = ref(0)

const colorMap = {
  deployed: '#4f8b6d',
  testing: '#2e7da0',
  repair: '#c99232',
  borrowed: '#c95555',
  '已出库': '#2e7da0',
  '测试中': '#4f8b6d',
  '借出中': '#c95555',
  '闲置中': '#71828c',
  '展出中': '#8c6fb7',
  '返修中': '#c99232',
  '维修中': '#c99232',
}

function pct(count) {
  return total.value ? Math.round(count / total.value * 100) : 0
}

function barHeight(val) {
  const max = Math.max(...Object.values(trends.value || {}).map(d => d.total), 1)
  return Math.max((val / max) * 120, 2)
}

async function handleExport() {
  try {
    const res = await api.post('/reports/export', { format: 'xlsx' }, { responseType: 'blob' })
    const url = URL.createObjectURL(res)
    const link = document.createElement('a')
    link.href = url
    link.download = `资产报表_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) { /* handled */ }
}

onMounted(async () => {
  try {
    const [dash, trend] = await Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/trends'),
    ])
    dashboard.value = dash
    total.value = dash.total || 0
    trends.value = trend.data
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.chart-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.bar-label {
  width: 80px;
  font-size: 13px;
  text-align: right;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 20px;
  background: #f0f2f5;
  border-radius: 10px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.6s ease;
}
.bar-value {
  width: 60px;
  font-size: 13px;
  color: #606266;
}

.trends-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 160px;
  padding: 0 20px;
}
.trend-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.trend-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}
.trend-bar {
  width: 20px;
  border-radius: 4px 4px 0 0;
  min-height: 2px;
}
.trend-label {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
</style>
