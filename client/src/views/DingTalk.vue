<template>
  <div>
    <div class="page-header">
      <h2>钉钉集成</h2>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 自动同步 Tab -->
      <el-tab-pane label="⏱ 自动同步" name="auto">
        <el-card>
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>定时自动同步</span>
              <el-tag :type="autoSyncStatus.enabled ? 'success' : 'info'" size="small">
                {{ autoSyncStatus.enabled ? '运行中' : '未启动' }}
              </el-tag>
            </div>
          </template>

          <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
            <template #title>
              <div>配置钉钉多维表文档ID后，系统会定时自动同步数据（双向：从钉钉导入 + 导出到钉钉）。</div>
              <div style="margin-top: 4px; font-size: 12px; color: #909399;">
                需要先在钉钉开放平台开通 Notable API 权限，或使用电子表格 API。
              </div>
            </template>
          </el-alert>

          <el-form label-width="100px" style="max-width: 600px;">
            <el-form-item label="文档ID">
              <el-input v-model="autoSyncForm.document_id" placeholder="钉钉多维表文档 ID" />
            </el-form-item>
            <el-form-item label="工作表名/ID">
              <el-input v-model="autoSyncForm.sheet_name" placeholder="留空则使用第一个工作表" />
            </el-form-item>
            <el-form-item label="操作人ID">
              <el-input v-model="autoSyncForm.operator_id" placeholder="钉钉 operatorId（可选）" />
            </el-form-item>
            <el-form-item label="导出文件夹">
              <el-input v-model="autoSyncForm.folder_id" placeholder="钉钉云盘文件夹 ID（可选，不填则不同步导出）" />
            </el-form-item>
            <el-form-item label="同步间隔">
              <el-input-number v-model="autoSyncForm.interval" :min="5" :max="1440" :step="5" />
              <span style="margin-left: 8px; color: #909399;">分钟</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="startAutoSync" :loading="autoSyncLoading">
                {{ autoSyncStatus.enabled ? '更新配置并重启' : '启动自动同步' }}
              </el-button>
              <el-button v-if="autoSyncStatus.enabled" type="danger" @click="stopAutoSync" :loading="autoSyncLoading">
                停止
              </el-button>
              <el-button @click="triggerSyncNow" :loading="syncTriggering">
                立即同步一次
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
            <el-descriptions-item label="文档ID">
              {{ autoSyncStatus.config?.documentId || autoSyncForm.document_id || '未配置' }}
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="autoSyncStatus.lastResult" style="margin-top: 12px;">
            <el-tag :type="autoSyncStatus.lastResult.success ? 'success' : 'danger'" size="small">
              {{ autoSyncStatus.lastResult.success ? '上次同步成功' : '上次同步失败' }}
            </el-tag>
            <span v-if="autoSyncStatus.lastResult.results" style="margin-left: 8px; font-size: 13px; color: #909399;">
              <template v-for="r in autoSyncStatus.lastResult.results" :key="r.direction">
                {{ r.direction === 'import' ? '导入' : '导出' }}: {{ r.error ? '失败 - ' + r.error : r.count + ' 条' }}
              </template>
            </span>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 数据同步 Tab -->
      <el-tab-pane label="数据同步" name="sync">
        <el-card>
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>网站 ↔ 钉钉多维表 数据同步</span>
              <el-tag type="info" size="small">文件传输方式</el-tag>
            </div>
          </template>

          <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
            <template #title>
              <div>由于钉钉多维表 API 权限限制，当前采用<strong>文件传输</strong>方式实现数据同步。</div>
              <div style="margin-top: 4px; font-size: 12px; color: #909399;">
                数据流向：钉钉多维表 → 导出 xlsx → 上传到网站 / 网站导出 xlsx → 导入钉钉多维表
              </div>
            </template>
          </el-alert>

          <!-- 从钉钉导入 -->
          <div style="margin-bottom: 24px;">
            <h4 style="margin-bottom: 12px; color: #409eff;">📥 从钉钉多维表导入到网站</h4>
            <el-steps :active="syncImportStep" finish-status="success" align-center style="margin-bottom: 16px;">
              <el-step title="从钉钉导出" description="在钉钉多维表中导出为 xlsx" />
              <el-step title="上传文件" description="将 xlsx 文件拖拽上传" />
              <el-step title="自动导入" description="系统自动识别并导入" />
            </el-steps>

            <div v-if="syncImportStep === 0" style="text-align: center;">
              <p style="margin-bottom: 16px; color: #606266;">
                1. 打开钉钉多维表 → 点击右上角「...」→「导出」→ 选择「Excel」格式<br>
                2. 下载导出的 xlsx 文件<br>
                3. 点击下方按钮上传
              </p>
              <el-button type="primary" @click="openDingTalkDoc" style="margin-right: 12px;">
                打开钉钉多维表
              </el-button>
              <el-button @click="syncImportStep = 1">
                下一步：上传文件
              </el-button>
            </div>

            <div v-if="syncImportStep === 1">
              <el-upload
                ref="syncUploadRef"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleSyncFileChange"
                accept=".xlsx,.xls"
                :limit="1"
                style="max-width: 500px; margin: 0 auto;"
              >
                <el-icon :size="48" style="color: #c0c4cc;"><UploadFilled /></el-icon>
                <div style="margin-top: 8px;">将钉钉导出的 Excel 文件拖到此处，或<em>点击上传</em></div>
                <template #tip>
                  <div style="color: #909399; font-size: 12px; margin-top: 8px;">
                    支持 .xlsx / .xls 格式，表头需包含：类型/出厂编号、序列号 等字段
                  </div>
                </template>
              </el-upload>
              <div style="text-align: center; margin-top: 12px;">
                <el-button @click="syncImportStep = 0">上一步</el-button>
              </div>
            </div>

            <div v-if="syncImportStep === 2">
              <el-result icon="success" title="导入成功" :sub-title="`已导入 ${syncImportResult.count} 条记录`">
                <template #extra>
                  <el-button type="primary" @click="syncImportStep = 0">继续导入</el-button>
                  <el-button @click="$router.push('/robots')">查看资产列表</el-button>
                </template>
              </el-result>
            </div>
          </div>

          <el-divider />

          <!-- 从网站导出到钉钉 -->
          <div>
            <h4 style="margin-bottom: 12px; color: #67c23a;">📤 从网站导出到钉钉多维表</h4>
            <el-steps :active="syncExportStep" finish-status="success" align-center style="margin-bottom: 16px;">
              <el-step title="选择数据" description="筛选要导出的数据" />
              <el-step title="导出文件" description="生成 xlsx 文件" />
              <el-step title="导入钉钉" description="在钉钉多维表中导入" />
            </el-steps>

            <div v-if="syncExportStep === 0">
              <el-form label-width="100px" style="max-width: 600px;">
                <el-form-item label="筛选状态">
                  <el-select v-model="syncExportForm.status" clearable placeholder="全部状态">
                    <el-option label="测试中" value="测试中" />
                    <el-option label="已出库" value="已出库" />
                    <el-option label="借出中" value="借出中" />
                    <el-option label="闲置中" value="闲置中" />
                    <el-option label="展出中" value="展出中" />
                    <el-option label="返修中" value="返修中" />
                  </el-select>
                </el-form-item>
                <el-form-item label="筛选类型">
                  <el-select v-model="syncExportForm.type" clearable placeholder="全部类型">
                    <el-option v-for="t in filterOptions.types" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="doSyncExport">导出 Excel 文件</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div v-if="syncExportStep === 1">
              <el-result icon="success" title="导出成功" sub-title="文件已下载到本地，请在钉钉多维表中导入">
                <template #extra>
                  <el-button type="primary" @click="openDingTalkDoc">打开钉钉多维表</el-button>
                  <el-button @click="syncExportStep = 0">继续导出</el-button>
                </template>
              </el-result>
              <div style="text-align: center; margin-top: 12px;">
                <p style="color: #909399; font-size: 13px;">
                  导入步骤：打开钉钉多维表 → 点击右上角「...」→「导入」→ 选择下载的 xlsx 文件
                </p>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 导入 Tab -->
      <el-tab-pane label="从钉钉导入" name="import">
        <el-card>
          <el-steps :active="importStep" finish-status="success" align-center style="margin-bottom: 24px;">
            <el-step title="上传文件" />
            <el-step title="预览数据" />
            <el-step title="导入完成" />
          </el-steps>

          <!-- Step 1: 上传文件 -->
          <div v-if="importStep === 0">
            <el-upload
              ref="uploadRef"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              accept=".xlsx,.xls"
              :limit="1"
              style="max-width: 500px; margin: 0 auto;"
            >
              <el-icon :size="48" style="color: #c0c4cc;"><UploadFilled /></el-icon>
              <div style="margin-top: 8px;">将钉钉导出的 Excel 文件拖到此处，或<em>点击上传</em></div>
              <template #tip>
                <div style="color: #909399; font-size: 12px; margin-top: 8px;">
                  支持 .xlsx / .xls 格式，表头需包含：类型/出厂编号、序列号 等字段
                </div>
              </template>
            </el-upload>

            <el-divider>或使用 API 导入（需配置多维表权限）</el-divider>

            <el-alert type="warning" :closable="false" style="margin-bottom: 16px;">
              <template #title>
                <div>API 导入需要在钉钉开放平台开通 <strong>Notable.Base.Read.All</strong> 权限并发布应用版本。</div>
                <div style="margin-top: 4px; font-size: 12px; color: #909399;">
                  如果 API 调用失败，请使用上方的文件上传方式：从钉钉多维表导出 xlsx 后上传。
                </div>
              </template>
            </el-alert>

            <el-form label-width="100px" style="max-width: 600px;">
              <el-form-item label="文档ID">
                <el-input v-model="importForm.document_id" placeholder="钉钉多维表文档 ID" />
              </el-form-item>
              <el-form-item label="工作表名/ID">
                <el-input v-model="importForm.sheet_name" placeholder="留空则使用第一个工作表，可填工作表 ID" />
              </el-form-item>
              <el-form-item label="操作人ID">
                <el-input v-model="importForm.operator_id" placeholder="可选，钉钉 operatorId/openId；也可配置 DINGTALK_OPERATOR_ID" />
              </el-form-item>
              <el-form-item>
                <el-button @click="previewImport" :disabled="!importForm.document_id" :loading="apiLoading">API 预览</el-button>
                <el-button type="success" @click="openDingTalk" style="margin-left: 12px;">打开钉钉多维表</el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- Step 2: 预览 -->
          <div v-if="importStep === 1">
            <p style="margin-bottom: 12px;">
              共 {{ importPreview.total }} 条记录，显示前 10 条：
              <el-tag v-if="importSource === 'file'" size="small" style="margin-left: 8px;">文件导入</el-tag>
              <el-tag v-else type="warning" size="small" style="margin-left: 8px;">API 导入</el-tag>
            </p>
            <el-table :data="importPreview.preview" stripe size="small" style="margin-bottom: 16px;" max-height="400">
              <el-table-column v-for="key in previewColumns" :key="key" :prop="key" :label="key" min-width="120" />
            </el-table>
            <div>
              <el-button @click="importStep = 0; importFile = null;">上一步</el-button>
              <el-button type="primary" :loading="importing" @click="doImport">确认导入 {{ importPreview.total }} 条</el-button>
            </div>
          </div>

          <!-- Step 3: 完成 -->
          <div v-if="importStep === 2">
            <el-result icon="success" title="导入成功" :sub-title="`已导入 ${importResult.imported} 条记录`">
              <template #extra>
                <el-button type="primary" @click="importStep = 0; importFile = null;">继续导入</el-button>
                <el-button @click="$router.push('/robots')">查看资产列表</el-button>
              </template>
            </el-result>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { dingtalkApi } from '@/api/dingtalk'
import { robotsApi } from '@/api/robots'
import api from '@/api'
import { formatDateTime } from '@/utils/format'
import { useExport } from '@/composables/useExport'

const { exportToXlsx } = useExport()
const activeTab = ref('auto')
const filterOptions = ref({ types: [] })

// 自动同步
const autoSyncForm = reactive({
  document_id: '',
  sheet_name: '',
  operator_id: '',
  folder_id: '',
  interval: 30,
})
const autoSyncStatus = ref({ enabled: false, running: false, lastSync: null, lastResult: null, config: {} })
const autoSyncLoading = ref(false)
const syncTriggering = ref(false)

// 导入
const importStep = ref(0)
const importForm = reactive({
  document_id: 'MyQA2dXW7ZObXrq5hZjnyDk28zlwrZgb',
  sheet_name: 'WzQTWCb',
  operator_id: '16kd04D5P0iPWNQ6iS84ydVwiEiE',
})
const importFile = ref(null)
const importPreview = ref({ preview: [], total: 0 })
const importResult = ref({ imported: 0 })
const importing = ref(false)
const importSource = ref('file') // 'file' or 'api'

const previewColumns = computed(() => {
  if (!importPreview.value.preview.length) return []
  return Object.keys(importPreview.value.preview[0])
})

// API 导入
const apiLoading = ref(false)

// 打开钉钉多维表
function openDingTalk() {
  const docId = importForm.document_id
  if (docId) {
    window.open(`https://alidocs.dingtalk.com/i/nodes/${docId}`, '_blank')
  } else {
    window.open('https://alidocs.dingtalk.com', '_blank')
  }
}

// 导出
const exportForm = reactive({ status: '', type: '', folder_id: '' })
const exporting = ref(false)

// 通知
const notifyMessage = ref('')
const notifying = ref(false)

// 数据同步
const syncImportStep = ref(0)
const syncImportResult = ref({ count: 0 })
const syncExportStep = ref(0)
const syncExportForm = reactive({ status: '', type: '' })

// 打开钉钉多维表文档
function openDingTalkDoc() {
  window.open('https://alidocs.dingtalk.com', '_blank')
}

// 同步导入文件处理
function handleSyncFileChange(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)

      if (!data.length) {
        ElMessage.warning('文件为空')
        return
      }

      // 映射字段
      const fieldMap = {
        '类型': 'type', 'type': 'type', '机器人类型': 'type', '型号': 'type',
        '序列号': 'serial', 'serial': 'serial', '编号': 'serial', '出厂编号': 'serial', '机器人出厂编号': 'serial',
        '状态': 'status', 'status': 'status', '机器人状态': 'status',
        '负责人': 'person', 'person': 'person', '责任人': 'person', '关联责任人': 'person',
        'IP': 'ip', 'ip': 'ip', 'IP地址': 'ip',
        '位置': 'location', 'location': 'location', '地点': 'location', '位置更新时间（每周五更新）': 'location',
        '备注': 'notes', 'notes': 'notes', '说明': 'notes',
        '条形码': 'barcode', 'barcode': 'barcode', '条码': 'barcode',
        '部门': 'department', 'department': 'department',
        '采购日期': 'purchase_date', '保修到期': 'warranty_until', '价值': 'value',
        '资产价值': 'value',
      }

      const robots = data.map(row => {
        const robot = {}
        for (const [key, val] of Object.entries(row)) {
          const mapped = fieldMap[key.trim()]
          if (mapped && val != null && val !== '') {
            robot[mapped] = String(val).trim()
          }
        }
        return robot
      }).filter(r => r.type || r.serial)

      if (!robots.length) {
        ElMessage.warning('未找到有效数据，请检查表头格式')
        return
      }

      // 使用批量导入 API（upsert，存在则更新）
      const result = await robotsApi.batchImport(robots)
      const count = result.imported || robots.length

      syncImportResult.value = { count }
      syncImportStep.value = 2
      ElMessage.success(`成功导入 ${count} 条记录`)
    } catch (err) {
      ElMessage.error('文件解析失败: ' + err.message)
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

// 同步导出
async function doSyncExport() {
  try {
    const params = {}
    if (syncExportForm.status) params.status = syncExportForm.status
    if (syncExportForm.type) params.type = syncExportForm.type

    const data = await robotsApi.list(params)
    const robots = data.data || data

    if (!robots.length) {
      ElMessage.warning('没有数据可导出')
      return
    }

    // 转换为钉钉多维表格式
    const exportData = robots.map(r => ({
      '类型': r.type || '',
      '序列号': r.serial || '',
      '状态': r.status || '',
      '负责人': r.person || '',
      'IP地址': r.ip || '',
      '位置': r.location || '',
      '条形码': r.barcode || '',
      '部门': r.department || '',
      '采购日期': r.purchase_date || '',
      '保修到期': r.warranty_until || '',
      '价值': r.value || '',
      '备注': r.notes || '',
    }))

    exportToXlsx(exportData, `机器人资产_${new Date().toISOString().slice(0, 10)}`)
    syncExportStep.value = 1
    ElMessage.success(`已导出 ${robots.length} 条记录`)
  } catch (err) {
    ElMessage.error('导出失败: ' + err.message)
  }
}

// 日志
const syncLogs = ref([])

// 中文列名 → 英文字段映射
const fieldMap = {
  '类型': 'type', 'type': 'type', '机器人类型': 'type', '型号': 'type',
  '序列号': 'serial', 'serial': 'serial', '编号': 'serial', '出厂编号': 'serial', '机器人出厂编号': 'serial',
  '状态': 'status', 'status': 'status', '机器人状态': 'status',
  '负责人': 'person', 'person': 'person', '责任人': 'person', '管理人': 'person', '关联责任人': 'person',
  'IP': 'ip', 'ip': 'ip', 'IP地址': 'ip',
  '位置': 'location', 'location': 'location', '地点': 'location', '所在位置': 'location', '位置更新时间（每周五更新）': 'location',
  '备注': 'notes', 'notes': 'notes', '说明': 'notes',
  '条形码': 'barcode', 'barcode': 'barcode', '条码': 'barcode',
  '部门': 'department', 'department': 'department', '所属部门': 'department',
  '采购日期': 'purchase_date', '保修到期': 'warranty_until', '价值': 'value',
  '资产价值': 'value',
}

// 文件上传处理
function handleFileChange(file) {
  importFile.value = file.raw
  importSource.value = 'file'

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

      if (data.length < 2) {
        ElMessage.error('表格数据为空或格式不正确')
        return
      }

      const headers = data[0].map(h => String(h || '').trim())
      const rows = data.slice(1)

      // 自动映射列
      const mapping = {}
      headers.forEach((header, idx) => {
        const field = fieldMap[header]
        if (field) mapping[idx] = field
      })

      // 转换为对象
      const robots = rows
        .map(row => {
          const robot = {}
          for (const [colIdx, fieldName] of Object.entries(mapping)) {
            const val = row[parseInt(colIdx)]
            robot[fieldName] = val !== null && val !== undefined ? String(val) : null
          }
          return robot
        })
        .filter(r => r.type && r.serial) // 过滤无效行

      if (robots.length === 0) {
        ElMessage.error('没有有效的资产数据，请检查表格格式（需包含"类型"和"序列号"列）')
        return
      }

      importPreview.value = {
        preview: robots.slice(0, 10),
        total: robots.length,
        _allData: robots, // 存储完整数据
        mapping,
        headers,
      }
      importStep.value = 1
      ElMessage.success(`解析成功，共 ${robots.length} 条记录`)
    } catch (err) {
      ElMessage.error('文件解析失败: ' + err.message)
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

// API 预览
async function previewImport() {
  if (!importForm.document_id) {
    ElMessage.warning('请输入文档ID')
    return
  }
  importSource.value = 'api'
  apiLoading.value = true
  try {
    const res = await dingtalkApi.importPreview(importForm)
    importPreview.value = res
    importStep.value = 1
  } catch (e) {
    ElMessage.error('API 导入失败，请检查文档ID是否正确，或使用文件上传方式导入')
  } finally {
    apiLoading.value = false
  }
}

// 执行导入
async function doImport() {
  importing.value = true
  try {
    if (importSource.value === 'file') {
      // 文件导入：直接写入数据库
      const robots = importPreview.value._allData
      let success = 0

      // 批量 upsert（每批 50 条）
      for (let i = 0; i < robots.length; i += 50) {
        const batch = robots.slice(i, i + 50)
        try {
          const res = await api.post('/robots/batch/import', { robots: batch })
          success += res.imported || batch.length
        } catch {
          // 降级：逐条创建
          for (const robot of batch) {
            try {
              await robotsApi.create(robot)
              success++
            } catch { /* skip duplicates */ }
          }
        }
      }

      importResult.value = { imported: success }
    } else {
      // API 导入
      const res = await dingtalkApi.importData(importForm)
      importResult.value = res
    }
    importStep.value = 2
  } finally {
    importing.value = false
  }
}

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
      if (status.config.documentId) autoSyncForm.document_id = status.config.documentId
      if (status.config.sheetName) autoSyncForm.sheet_name = status.config.sheetName
      if (status.config.operatorId) autoSyncForm.operator_id = status.config.operatorId
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
})
</script>
