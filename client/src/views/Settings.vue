<template>
  <div>
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 钉钉配置 -->
      <el-tab-pane label="钉钉配置" name="dingtalk">
        <el-card>
          <el-form label-width="120px" style="max-width: 600px;">
            <el-form-item label="App Key">
              <el-input v-model="dingtalkConfig.appKey" placeholder="钉钉应用 AppKey" />
            </el-form-item>
            <el-form-item label="App Secret">
              <el-input v-model="dingtalkConfig.appSecret" placeholder="钉钉应用 AppSecret" show-password />
            </el-form-item>
            <el-form-item label="Agent ID">
              <el-input v-model="dingtalkConfig.agentId" placeholder="钉钉应用 AgentId" />
            </el-form-item>
            <el-form-item label="Webhook URL">
              <el-input v-model="dingtalkConfig.webhookUrl" placeholder="钉钉机器人 Webhook 地址" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveDingtalkConfig">保存配置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 字段管理 -->
      <el-tab-pane label="字段管理" name="fields">
        <el-card>
          <el-form label-width="120px" style="max-width: 600px;">
            <el-form-item label="状态选项">
              <div>
                <el-tag v-for="s in fieldOptions.statuses" :key="s" closable style="margin: 2px 4px;" @close="removeField('statuses', s)">{{ s }}</el-tag>
                <el-input v-if="addingField === 'statuses'" v-model="newFieldValue" size="small" style="width: 120px; margin: 2px;" @keyup.enter="addField('statuses')" @blur="addField('statuses')" />
                <el-button v-else size="small" @click="addingField = 'statuses'">+ 添加</el-button>
              </div>
            </el-form-item>
            <el-form-item label="类型选项">
              <div>
                <el-tag v-for="t in fieldOptions.types" :key="t" closable style="margin: 2px 4px;" @close="removeField('types', t)">{{ t }}</el-tag>
                <el-input v-if="addingField === 'types'" v-model="newFieldValue" size="small" style="width: 120px; margin: 2px;" @keyup.enter="addField('types')" @blur="addField('types')" />
                <el-button v-else size="small" @click="addingField = 'types'">+ 添加</el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 数据导入导出 -->
      <el-tab-pane label="数据导入导出" name="data">
        <el-card>
          <h4 style="margin-bottom: 16px;">导入</h4>
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            accept=".xlsx,.xls"
            :limit="1"
          >
            <el-button type="primary">选择 Excel 文件</el-button>
            <template #tip>
              <div style="color: #909399; font-size: 12px;">支持 .xlsx 格式，表头需包含：类型、序列号</div>
            </template>
          </el-upload>
          <el-button v-if="importFile" type="success" style="margin-top: 12px;" :loading="importing" @click="doLocalImport">
            导入 {{ importData.length }} 条记录
          </el-button>

          <el-divider />

          <h4 style="margin-bottom: 16px;">导出</h4>
          <el-button @click="doLocalExport('xlsx')">导出为 Excel</el-button>
          <el-button @click="doLocalExport('json')">导出为 JSON</el-button>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import api from '@/api'
import { robotsApi } from '@/api/robots'
import { useExport } from '@/composables/useExport'

const { exportToXlsx } = useExport()

const activeTab = ref('dingtalk')

// 钉钉配置
const dingtalkConfig = reactive({
  appKey: '', appSecret: '', agentId: '', webhookUrl: '',
})

// 字段管理
const fieldOptions = ref({ statuses: [], types: [] })
const addingField = ref('')
const newFieldValue = ref('')

// 数据导入
const importFile = ref(null)
const importData = ref([])
const importing = ref(false)

function saveDingtalkConfig() {
  localStorage.setItem('dingtalk_config', JSON.stringify(dingtalkConfig))
  ElMessage.success('钉钉配置已保存（需重启后端服务以生效）')
}

function removeField(field, value) {
  fieldOptions.value[field] = fieldOptions.value[field].filter(v => v !== value)
  localStorage.setItem('field_options', JSON.stringify(fieldOptions.value))
}

function addField(field) {
  if (newFieldValue.value.trim()) {
    fieldOptions.value[field].push(newFieldValue.value.trim())
    localStorage.setItem('field_options', JSON.stringify(fieldOptions.value))
  }
  newFieldValue.value = ''
  addingField.value = ''
}

function handleFileChange(file) {
  importFile.value = file.raw
  const reader = new FileReader()
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws)

    // 映射中文列名到英文字段
    const fieldMap = {
      '类型': 'type', '序列号': 'serial', '状态': 'status', '负责人': 'person',
      'IP': 'ip', 'IP地址': 'ip', '位置': 'location', '备注': 'notes',
      '条形码': 'barcode', '部门': 'department',
    }

    importData.value = data.map(row => {
      const mapped = {}
      for (const [key, val] of Object.entries(row)) {
        const field = fieldMap[key] || key
        mapped[field] = val
      }
      return mapped
    }).filter(r => r.type && r.serial)
  }
  reader.readAsArrayBuffer(file.raw)
}

async function doLocalImport() {
  importing.value = true
  try {
    const res = await api.post('/robots/batch/import', { robots: importData.value })
    ElMessage.success(`成功导入 ${res.imported || importData.value.length} 条记录`)
  } catch (e) {
    // 降级：逐条创建
    let success = 0
    for (const robot of importData.value) {
      try {
        await robotsApi.create(robot)
        success++
      } catch (err) { /* skip duplicates */ }
    }
    ElMessage.success(`成功导入 ${success} 条记录`)
  } finally {
    importing.value = false
  }
}

async function doLocalExport(format) {
  try {
    const res = await api.get('/robots', { params: { page_size: 10000 } })
    const data = res.data.map(r => ({
      类型: r.type, 序列号: r.serial, 条形码: r.barcode, 状态: r.status,
      负责人: r.person, 位置: r.location, 部门: r.department, IP: r.ip, 备注: r.notes,
    }))

    if (format === 'xlsx') {
      exportToXlsx(data, '机器人资产导出')
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'robots_export.json'
      link.click()
      URL.revokeObjectURL(url)
    }
  } catch (e) { /* handled */ }
}

onMounted(() => {
  // 加载钉钉配置
  const saved = localStorage.getItem('dingtalk_config')
  if (saved) Object.assign(dingtalkConfig, JSON.parse(saved))

  // 加载字段选项
  const fieldSaved = localStorage.getItem('field_options')
  if (fieldSaved) {
    fieldOptions.value = JSON.parse(fieldSaved)
  } else {
    fieldOptions.value = {
      statuses: ['已出库', '测试中', '借出中', '闲置中', '展出中', '返修中'],
      types: ['small hi', 'pi', 'Pi plus V2.0.0', 'Pi plus pro V2.0.0'],
    }
  }
})
</script>
