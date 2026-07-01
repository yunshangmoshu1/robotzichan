<template>
  <div>
    <div class="page-header">
      <h2>仪表盘</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ dashboard.total || 0 }}</div>
        <div class="stat-label">资产总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #67c23a">{{ dashboard.status_counts?.deployed || 0 }}</div>
        <div class="stat-label">已部署</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #e6a23c">{{ dashboard.status_counts?.repair || 0 }}</div>
        <div class="stat-label">维修中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #f56c6c">{{ dashboard.overdue_count || 0 }}</div>
        <div class="stat-label">逾期未还</div>
      </div>
    </div>

    <el-row :gutter="24">
      <!-- 状态分布 -->
      <el-col :span="12">
        <el-card header="状态分布">
          <div v-for="(count, status) in dashboard.status_counts" :key="status" class="dist-item">
            <span class="dist-label">{{ statusLabels[status] || status }}</span>
            <el-progress
              :percentage="Math.round(count / dashboard.total * 100)"
              :color="statusColorMap[status]"
              :format="() => count"
            />
          </div>
          <el-empty v-if="!dashboard.status_counts" description="暂无数据" />
        </el-card>
      </el-col>

      <!-- 最近变更 -->
      <el-col :span="12">
        <el-card header="最近变更">
          <el-timeline>
            <el-timeline-item
              v-for="log in dashboard.recent_changes"
              :key="log.id"
              :timestamp="formatDateTime(log.changed_at)"
              placement="top"
            >
              <p style="font-size: 13px;">
                <strong>{{ log.robots?.type }} {{ log.robots?.serial }}</strong>
                {{ log.field }}: {{ log.old_value || '-' }} → {{ log.new_value || '-' }}
              </p>
              <p style="font-size: 12px; color: #909399;">{{ log.changed_by }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!dashboard.recent_changes?.length" description="暂无变更记录" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 逾期未还提醒 -->
    <el-card v-if="dashboard.overdue_list?.length" header="逾期未还提醒" style="margin-top: 24px;">
      <el-table :data="dashboard.overdue_list" stripe size="small">
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="serial" label="序列号" />
        <el-table-column prop="borrowed_to" label="借用人" />
        <el-table-column prop="return_due" label="应还日期" :formatter="(_, __, val) => formatDate(val)" />
        <el-table-column label="逾期天数">
          <template #default="{ row }">
            <el-tag type="danger">{{ overdueDays(row.return_due) }} 天</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { statusLabels, formatDate, formatDateTime } from '@/utils/format'

const dashboard = ref({})

const statusColorMap = {
  deployed: '#67c23a',
  testing: '#409eff',
  repair: '#e6a23c',
  borrowed: '#f56c6c',
}

function overdueDays(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

onMounted(async () => {
  try {
    const res = await api.get('/reports/dashboard')
    dashboard.value = res
  } catch (e) {
    // 错误已在拦截器处理
  }
})
</script>

<style scoped>
.dist-item {
  margin-bottom: 12px;
}
.dist-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
  display: block;
}
</style>
