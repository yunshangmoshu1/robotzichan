<template>
  <div class="dashboard-page">
    <section class="overview-band">
      <div class="overview-copy">
        <p class="eyebrow">资产总览</p>
        <h1>机器人资产运行状态</h1>
        <p>集中查看库存、借出、测试和返修状态，保持每台设备的位置与责任人清晰可追踪。</p>
      </div>
      <img src="/images/robot-lineup.jpg" alt="机器人产品阵列" />
    </section>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ dashboard.total || 0 }}</div>
        <div class="stat-label">资产总数</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">{{ outCount }}</div>
        <div class="stat-label">已出库</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">{{ testingCount }}</div>
        <div class="stat-label">测试中</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">{{ repairCount }}</div>
        <div class="stat-label">返修中</div>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <el-card header="状态分布">
          <div v-for="item in statusEntries" :key="item.status" class="dist-item">
            <div class="dist-header">
              <span class="dist-label">{{ item.label }}</span>
              <span class="dist-count">{{ item.count }}</span>
            </div>
            <el-progress
              :percentage="item.percentage"
              :color="statusColorMap[item.status] || '#2e7da0'"
              :show-text="false"
              :stroke-width="7"
            />
          </div>
          <el-empty v-if="!statusEntries.length" description="暂无数据" :image-size="80" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card header="最近变更">
          <el-timeline v-if="dashboard.recent_changes?.length">
            <el-timeline-item
              v-for="log in dashboard.recent_changes"
              :key="log.id"
              :timestamp="formatDateTime(log.changed_at)"
              placement="top"
            >
              <p class="change-title">
                <strong>{{ log.robots?.type }} {{ log.robots?.serial }}</strong>
              </p>
              <p class="change-detail">
                {{ log.field }}: {{ log.old_value || '-' }} → {{ log.new_value || '-' }}
              </p>
              <p class="change-by">{{ log.changed_by }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无变更记录" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="dashboard.overdue_list?.length" header="逾期未还提醒" class="overdue-card">
      <el-table :data="dashboard.overdue_list" stripe size="small">
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="serial" label="序列号" />
        <el-table-column prop="borrowed_to" label="借用人" />
        <el-table-column prop="return_due" label="应还日期" :formatter="(_, __, val) => formatDate(val)" />
        <el-table-column label="逾期天数">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ overdueDays(row.return_due) }} 天</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { statusLabels, formatDate, formatDateTime } from '@/utils/format'

const dashboard = ref({})

const statusColorMap = {
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

const counts = computed(() => dashboard.value.status_counts || {})
const outCount = computed(() => counts.value['已出库'] || counts.value.deployed || 0)
const testingCount = computed(() => counts.value['测试中'] || counts.value.testing || 0)
const repairCount = computed(() => counts.value['返修中'] || counts.value['维修中'] || counts.value.repair || 0)

const statusEntries = computed(() => {
  const total = dashboard.value.total || 0
  return Object.entries(counts.value).map(([status, count]) => ({
    status,
    count,
    label: statusLabels[status] || status,
    percentage: total ? Math.round((count / total) * 100) : 0,
  }))
})

function overdueDays(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

onMounted(async () => {
  try {
    const res = await api.get('/reports/dashboard')
    dashboard.value = res
  } catch (e) {
    // 错误已在拦截器中处理
  }
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
}

.overview-band {
  min-height: 210px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: center;
  gap: 28px;
  margin-bottom: 22px;
  padding: 26px 30px;
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: 170px;
    object-fit: contain;
    object-position: center;
    display: block;
  }
}

.overview-copy {
  max-width: 620px;

  .eyebrow {
    color: var(--primary-dark);
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 8px;
  }

  h1 {
    color: var(--text-primary);
    font-size: 28px;
    line-height: 1.22;
    font-weight: 800;
    margin-bottom: 10px;
  }

  p {
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.dist-item {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.dist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 7px;
}

.dist-label,
.dist-count {
  font-size: 13px;
  font-weight: 700;
}

.dist-label {
  color: var(--text-secondary);
}

.dist-count {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.change-title {
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;

  strong {
    font-weight: 800;
  }
}

.change-detail {
  color: var(--text-secondary);
  font-size: 12.5px;
  margin-top: 2px;
}

.change-by {
  color: var(--text-tertiary);
  font-size: 12px;
  margin-top: 4px;
}

.overdue-card {
  margin-top: 20px;
}

:deep(.el-timeline) {
  padding-left: 2px;

  .el-timeline-item__tail {
    border-left-color: var(--border-light);
  }

  .el-timeline-item__node {
    background-color: var(--accent);
  }

  .el-timeline-item__timestamp {
    color: var(--text-tertiary);
    font-size: 12px;
  }
}

:deep(.el-progress-bar__outer),
:deep(.el-progress-bar__inner) {
  border-radius: 4px;
}

@media (max-width: 900px) {
  .overview-band {
    grid-template-columns: 1fr;
    padding: 22px;

    img {
      height: 150px;
    }
  }

  .overview-copy h1 {
    font-size: 24px;
  }
}
</style>
