<template>
  <div>
    <div class="page-header">
      <h2>钉钉集成</h2>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 自动同步 Tab：网站 → 钉钉 -->
      <el-tab-pane label="⏱ 自动同步" name="auto">
        <el-card>
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>自动同步（网站 → 钉钉）</span>
              <el-tag :type="autoSyncStatus.enabled ? 'success' : 'info'" size="small">
                {{ autoSyncStatus.enabled ? '运行中' : '未启动' }}
              </el-tag>
            </div>
          </template>

          <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
            <template #title>
              <div>系统定时将网站数据导出为 Excel 文件并上传到钉钉云盘。</div>
              <div style="margin-top: 4px; font-size: 12px; color: #909399;">
                需要配置钉钉云盘文件夹 ID，导出的文件会自动覆盖更新。
              </div>
            </template>
          </el-alert>

          <el-form label-width="120px" style="max-width: 600px;">
            <el-form-item label="钉钉文件夹ID">
              <div style="display: flex; gap: 8px; width: 100%;">
                <el-input v-model="autoSyncForm.folder_id" placeholder="钉钉云盘文件夹 ID（必填）" style="flex: 1;" />
                <el-button @click="showCreateFolder = true">创建新文件夹</el-button>
              </div>
            </el-form-item>
            <el-form-item label="同步间隔">
              <el-input-number v-model="autoSyncForm.interval" :min="1" :max="1440" :step="1" />
              <span style="margin-left: 8px; color: #909399;">分钟</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="startAutoSync" :loading="autoSyncLoading">
                {{ autoSyncStatus.enabled ? '更新配置并重启' : '启动自动同步' }}
              </el-button>
              <el-button v-if="autoSyncStatus.enabled" type="danger" @click="stopAutoSync" :loading="autoSyncLoading">
                停止
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 同步状态 -->
          <el-divider />
          <h4 style="margin-bottom: 12px;">同步状态</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="状态">
              <el-tag :type="autoSyncStatus.enabled ? 'success' : 'info'" size="small">
                {{ autoSyncStatus.enabled ? '运行中' : '未启动' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="上次同步">
              {{ autoSyncStatus.lastSync ? formatDateTime(autoSyncStatus.lastSync) : '尚未同步' }}
            </el-descriptions-item>
            <el-descriptions-item label="同步间隔">
              {{ autoSyncStatus.config?.interval || autoSyncForm.interval }} 分钟
            </el-descriptions-item>
            <el-descriptions-item label="文件夹ID">
              {{ autoSyncStatus.config?.folderId || autoSyncForm.folder_id || '未配置' }}
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="autoSyncStatus.lastResult" style="margin-top: 12px;">
            <el-tag :type="autoSyncStatus.lastResult.success ? 'success' : 'danger'" size="small">
              {{ autoSyncStatus.lastResult.success ? '上次导出成功' : '上次导出失败' }}
            </el-tag>
            <span v-if="autoSyncStatus.lastResult.results" style="margin-left: 8px; font-size: 13px; color: #909399;">
              <template v-for="r in autoSyncStatus.lastResult.results" :key="r.direction">
                {{ r.direction === 'export' ? '导出' : r.direction }}: {{ r.error ? '失败 - ' + r.error : r.count + ' 条' }}
              </template>
            </span>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 手动导入 Tab：钉钉 → 网站 -->
      <el-tab-pane label="📥 从钉钉导入" name="import">
        <el-card>
          <template #header>
            <span>手动导入（钉钉 → 网站）</span>
          </template>

          <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
            <template #title>
              <div>从钉钉多维表拉取最新数据并导入到网站数据库。</div>
              <div style="margin-top: 4px; font-size: 12px; color: #909399;">
                需要先在钉钉开放平台开通 Notable API 权限，或使用电子表格 API。
              </div>
            </template>
          </el-alert>

          <el-form label-width="120px" style="max-width: 600px;">
            <el-form-item label="文档ID">
              <el-input v-model="importForm.document_id" placeholder="钉钉多维表文档 ID" />
            </el-form-item>
            <el-form-item label="工作表名/ID">
              <el-input v-model="importForm.sheet_name" placeholder="留空则使用第一个工作表" />
            </el-form-item>
            <el-form-item label="操作人ID">
              <el-input v-model="importForm.operator_id" placeholder="钉钉 operatorId（可选）" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="manualImport" :loading="importLoading">
                立即导入
              </el-button>
            </el-form-item>
          </el-form>

          <div v-if="importResult" style="margin-top: 16px;">
            <el-alert :type="importResult.error ? 'error' : 'success'" :closable="false">
              <template #title>
                {{ importResult.error ? '导入失败: ' + importResult.error : `成功导入 ${importResult.count} 条记录` }}
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 导出 Tab -->
      <el-tab-pane label="导出数据" name="export">
        <el-card>
          <h4 style="margin-bottom: 16px;">导出为 Excel 文件</h4>
          <el-form label-width="100px" style="max-width: 600px;">
            <el-form-item label="筛选状态">
              <el-select v-model="exportForm.status" clearable placeholder="全部状态">
                <el-option label="测试中" value="测试中" />
                <el-option label="已出库" value="已出库" />
                <el-option label="借出中" value="借出中" />
                <el-option label="闲置中" value="闲置中" />
                <el-option label="展出中" value="展出中" />
                <el-option label="返修中" value="返修中" />
              </el-select>
            </el-form-item>
            <el-form-item label="筛选类型">
              <el-select v-model="exportForm.type" clearable placeholder="全部类型">
                <el-option v-for="t in filterOptions.types" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="doLocalExport">导出为 Excel</el-button>
              <el-button @click="doLocalExportJson">导出为 JSON</el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <h4 style="margin-bottom: 16px;">导出到钉钉云盘（需配置钉钉应用）</h4>
          <el-form label-width="100px" style="max-width: 600px;">
            <el-form-item label="钉钉文件夹">
              <el-input v-model="exportForm.folder_id" placeholder="钉钉云盘文件夹 ID" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="exporting" @click="doExportToDingTalk">导出到钉钉</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 通知 Tab -->
      <el-tab-pane label="变更通知" name="notify">
        <el-card>
          <el-form label-width="100px" style="max-width: 600px;">
            <el-form-item label="通知内容">
              <el-input v-model="notifyMessage" type="textarea" :rows="4" placeholder="输入要发送到钉钉群的通知内容" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="notifying" @click="sendNotify">发送通知</el-button>
            </el-form-item>
          </el-form>

          <el-divider />
          <p style="color: #909399; font-size: 13px;">
            提示：需在系统设置中配置钉钉机器人 Webhook 地址后才能发送通知。
          </p>
        </el-card>
      </el-tab-pane>

      <!-- 同步日志 Tab -->
      <el-tab-pane label="同步日志" name="logs">
        <el-card>
          <el-table :data="syncLogs" stripe>
            <el-table-column prop="direction" label="方向" width="80">
              <template #default="{ row }">
                <el-tag :type="row.direction === 'import' ? 'success' : 'primary'" size="small">
                  {{ row.direction === 'import' ? '导入' : '导出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="file_name" label="文件名" min-width="200" />
            <el-table-column prop="record_count" label="记录数" width="80" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="synced_by" label="操作人" width="100" />
            <el-table-column prop="synced_at" label="时间" width="160" :formatter="(_, __, val) => formatDateTime(val)" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建文件夹对话框 -->
    <el-dialog v-model="showCreateFolder" title="创建钉钉云盘文件夹" width="400px">
      <el-form label-width="80px">
        <el-form-item label="云盘空间">
          <el-select v-model="createFolderForm.space_id" placeholder="选择空间" style="width: 100%;">
            <el-option v-for="s in spaces" :key="s.spaceId || s.id" :label="s.name" :value="s.spaceId || s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件夹名">
          <el-input v-model="createFolderForm.name" placeholder="输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateFolder = false">取消</el-button>
        <el-button type="primary" @click="doCreateFolder" :loading="createFolderLoading">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { dingtalkApi } from '@/api/dingtalk'
import { robotsApi } from '@/api/robots'
import api from '@/api'
import { formatDateTime } from '@/utils/format'
import { useExport } from '@/composables/useExport'

const { exportToXlsx } = useExport()
const activeTab = ref('auto')
const filterOptions = ref({ types: [] })

// 自动同步（网站 → 钉钉）
const autoSyncForm = reactive({
  folder_id: '',
  interval: 1,
})
const autoSyncStatus = ref({ enabled: false, running: false, lastSync: null, lastResult: null, config: {} })
const autoSyncLoading = ref(false)
const syncTriggering = ref(false)

// 创建文件夹
const showCreateFolder = ref(false)
const createFolderForm = reactive({ space_id: '', name: 'ROBO_TRACK自动同步' })
const spaces = ref([])
const createFolderLoading = ref(false)

async function loadSpaces() {
  try {
    const res = await dingtalkApi.getSpaces()
    spaces.value = res.spaces || []
    if (spaces.value.length === 1) {
      createFolderForm.space_id = spaces.value[0].spaceId || spaces.value[0].id
    }
  } catch (e) {
    ElMessage.error('获取云盘空间失败')
  }
}

async function doCreateFolder() {
  if (!createFolderForm.space_id || !createFolderForm.name) {
    ElMessage.warning('请选择空间并输入文件夹名称')
    return
  }
  createFolderLoading.value = true
  try {
    const res = await dingtalkApi.createFolder(createFolderForm)
    const nodeId = res.nodeId || res.id
    if (nodeId) {
      autoSyncForm.folder_id = nodeId
      ElMessage.success(`文件夹创建成功，ID: ${nodeId}`)
      showCreateFolder.value = false
    } else {
      ElMessage.warning('文件夹已创建，但未返回ID，请手动填写')
    }
  } catch (e) {
    ElMessage.error('创建文件夹失败: ' + (e.response?.data?.error || e.message))
  } finally {
    createFolderLoading.value = false
  }
}

// 手动导入（钉钉 → 网站）
const importForm = reactive({
  document_id: 'MyQA2dXW7ZObXrq5hZjnyDk28zlwrZgb',
  sheet_name: 'WzQTWCb',
  operator_id: '16kd04D5P0iPWNQ6iS84ydVwiEiE',
})
const importLoading = ref(false)
const importResult = ref(null)

async function manualImport() {
  if (!importForm.document_id) {
    ElMessage.warning('请输入文档ID')
    return
  }
  importLoading.value = true
  importResult.value = null
  try {
    const res = await dingtalkApi.triggerImport()
    importResult.value = res
    ElMessage.success(`导入完成，共 ${res.count} 条记录`)
    loadAutoSyncStatus()
  } catch (e) {
    importResult.value = { error: e.response?.data?.error || e.message }
    ElMessage.error('导入失败')
  } finally {
    importLoading.value = false
  }
}

// 导出
const exportForm = reactive({ status: '', type: '', folder_id: '' })
const exporting = ref(false)

// 通知
const notifyMessage = ref('')
const notifying = ref(false)

// 日志
const syncLogs = ref([])

// 本地导出 Excel
async function doLocalExport() {
  try {
    const params = { page_size: 10000 }
    if (exportForm.status) params.status = exportForm.status
    if (exportForm.type) params.type = exportForm.type

    const res = await api.get('/robots', { params })
    const data = res.data.map(r => ({
      类型: r.type, 序列号: r.serial, 条形码: r.barcode, 状态: r.status,
      负责人: r.person, 位置: r.location, 部门: r.department, IP: r.ip, 备注: r.notes,
    }))
    exportToXlsx(data, `机器人资产_${new Date().toISOString().slice(0, 10)}`)
    ElMessage.success('导出成功')
  } catch (e) { /* handled */ }
}

// 本地导出 JSON
async function doLocalExportJson() {
  try {
    const res = await api.get('/robots', { params: { page_size: 10000 } })
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `robots_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) { /* handled */ }
}

// 导出到钉钉云盘
async function doExportToDingTalk() {
  exporting.value = true
  try {
    const res = await dingtalkApi.exportData({
      folder_id: exportForm.folder_id || undefined,
      filters: {
        status: exportForm.status || undefined,
        type: exportForm.type || undefined,
      },
    })
    ElMessage.success(`导出成功，共 ${res.record_count} 条记录`)
  } finally {
    exporting.value = false
  }
}

async function sendNotify() {
  if (!notifyMessage.value.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }
  notifying.value = true
  try {
    await dingtalkApi.sendNotification(notifyMessage.value)
    ElMessage.success('通知发送成功')
    notifyMessage.value = ''
  } finally {
    notifying.value = false
  }
}

// ---- 自动同步 ----
async function loadAutoSyncStatus() {
  try {
    const status = await dingtalkApi.getAutoSyncStatus()
    autoSyncStatus.value = status
    // 用服务端配置回填表单
    if (status.config) {
      if (status.config.folderId) autoSyncForm.folder_id = status.config.folderId
      if (status.config.interval) autoSyncForm.interval = status.config.interval
    }
  } catch (e) { /* ignore */ }
}

async function startAutoSync() {
  if (!autoSyncForm.document_id) {
    ElMessage.warning('请输入钉钉文档ID')
    return
  }
  autoSyncLoading.value = true
  try {
    await dingtalkApi.startAutoSync(autoSyncForm)
    ElMessage.success('自动同步已启动')
    await loadAutoSyncStatus()
  } catch (e) {
    ElMessage.error('启动失败')
  } finally {
    autoSyncLoading.value = false
  }
}

async function stopAutoSync() {
  autoSyncLoading.value = true
  try {
    await dingtalkApi.stopAutoSync()
    ElMessage.success('自动同步已停止')
    await loadAutoSyncStatus()
  } finally {
    autoSyncLoading.value = false
  }
}

async function triggerSyncNow() {
  syncTriggering.value = true
  try {
    await dingtalkApi.triggerSync()
    ElMessage.success('同步已触发，稍后刷新查看结果')
    setTimeout(loadAutoSyncStatus, 3000)
  } catch (e) {
    ElMessage.error('触发失败')
  } finally {
    syncTriggering.value = false
  }
}

onMounted(async () => {
  try {
    const [logs, filters] = await Promise.all([
      dingtalkApi.getSyncLogs().catch(() => ({ data: [] })),
      robotsApi.getFilterOptions().catch(() => ({ types: [] })),
    ])
    syncLogs.value = logs.data || []
    filterOptions.value = filters
  } catch (e) { /* ignore */ }
  loadAutoSyncStatus()
  loadSpaces()
})
</script>
