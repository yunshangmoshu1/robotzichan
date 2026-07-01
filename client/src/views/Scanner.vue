<template>
  <div>
    <div class="page-header">
      <h2>条码扫描</h2>
    </div>

    <el-row :gutter="24">
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>摄像头扫描</span>
              <el-button-group>
                <el-button :type="isScanning ? 'danger' : 'primary'" size="small" @click="toggleScan">
                  {{ isScanning ? '停止扫描' : '开始扫描' }}
                </el-button>
              </el-button-group>
            </div>
          </template>
          <div class="scanner-container">
            <div id="scanner-reader" style="width: 100%;"></div>
          </div>
          <p v-if="scanError" style="color: #f56c6c; margin-top: 12px;">{{ scanError }}</p>
        </el-card>

        <!-- 手动输入 -->
        <el-card header="手动输入" style="margin-top: 16px;">
          <el-input v-model="manualCode" placeholder="输入条形码数字或序列号" clearable @keyup.enter="handleManualSearch">
            <template #append>
              <el-button @click="handleManualSearch">搜索</el-button>
            </template>
          </el-input>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12">
        <!-- 扫描结果 -->
        <div v-if="scanResult">
          <!-- 找到单个资产 -->
          <el-card v-if="scanResult.match_count === 1" :header="`匹配资产: ${scanResult.data[0].type}`">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="类型">{{ scanResult.data[0].type }}</el-descriptions-item>
              <el-descriptions-item label="序列号">{{ scanResult.data[0].serial }}</el-descriptions-item>
              <el-descriptions-item label="条形码">{{ scanResult.data[0].barcode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="statusColors[scanResult.data[0].status]" size="small">
                  {{ statusLabels[scanResult.data[0].status] || scanResult.data[0].status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="负责人">{{ scanResult.data[0].person || '-' }}</el-descriptions-item>
              <el-descriptions-item label="位置">{{ scanResult.data[0].location || '-' }}</el-descriptions-item>
            </el-descriptions>

            <!-- 快捷操作面板 -->
            <div class="quick-actions">
              <div class="quick-action-btn" @click="quickChangeStatus">
                <el-icon :size="24" color="#409eff"><Switch /></el-icon>
                <span>修改状态</span>
              </div>
              <div class="quick-action-btn" @click="quickChangeLocation">
                <el-icon :size="24" color="#67c23a"><Location /></el-icon>
                <span>修改位置</span>
              </div>
              <div class="quick-action-btn" @click="quickBorrow">
                <el-icon :size="24" color="#e6a23c"><Promotion /></el-icon>
                <span>快速借出</span>
              </div>
              <div class="quick-action-btn" @click="viewDetail">
                <el-icon :size="24" color="#909399"><View /></el-icon>
                <span>查看详情</span>
              </div>
            </div>
          </el-card>

          <!-- 找到多个资产 -->
          <el-card v-else-if="scanResult.match_count > 1" :header="`找到 ${scanResult.match_count} 个匹配资产`">
            <el-table :data="scanResult.data" stripe size="small" @row-click="selectRobot">
              <el-table-column prop="type" label="类型" />
              <el-table-column prop="serial" label="序列号" />
              <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                  <el-tag :type="statusColors[row.status]" size="small">{{ statusLabels[row.status] || row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="location" label="位置" />
            </el-table>
          </el-card>
        </div>

        <!-- 未找到 -->
        <el-card v-else-if="searched && !scanResult">
          <el-empty description="未找到匹配的资产">
            <el-button type="primary" @click="$router.push('/robots/new')">新增资产</el-button>
          </el-empty>
        </el-card>

        <!-- 扫描历史 -->
        <el-card v-if="scanHistory.length" header="扫描历史" style="margin-top: 16px;">
          <div v-for="(item, idx) in scanHistory" :key="idx" class="scan-history-item" @click="loadFromHistory(item)">
            <span>{{ item.code }}</span>
            <span style="color: #909399;">{{ item.time }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作对话框 -->
    <el-dialog v-model="showStatusDialog" title="修改状态" width="400px">
      <el-select v-model="quickStatus" style="width: 100%;">
        <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
      </el-select>
      <template #footer>
        <el-button @click="showStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="applyStatusChange">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showLocationDialog" title="修改位置" width="400px">
      <el-input v-model="quickLocation" placeholder="输入新位置" />
      <template #footer>
        <el-button @click="showLocationDialog = false">取消</el-button>
        <el-button type="primary" @click="applyLocationChange">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBorrowDialog" title="快速借出" width="400px">
      <el-form label-width="80px">
        <el-form-item label="借用人">
          <el-input v-model="borrowForm.borrowed_to" />
        </el-form-item>
        <el-form-item label="预计归还">
          <el-date-picker v-model="borrowForm.return_due" type="date" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBorrowDialog = false">取消</el-button>
        <el-button type="primary" @click="applyBorrow">确认借出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useScanner } from '@/composables/useScanner'
import { robotsApi } from '@/api/robots'
import { defaultStatusOptions, statusColors, statusLabels } from '@/utils/format'

const router = useRouter()
const { isScanning, error: scanError, startScanner, stopScanner } = useScanner()

const manualCode = ref('')
const scanResult = ref(null)
const searched = ref(false)
const selectedRobotId = ref(null)
const scanHistory = ref([])

const statusOptions = defaultStatusOptions
const showStatusDialog = ref(false)
const quickStatus = ref('')
const showLocationDialog = ref(false)
const quickLocation = ref('')
const showBorrowDialog = ref(false)
const borrowForm = reactive({ borrowed_to: '', return_due: '' })

async function toggleScan() {
  if (isScanning.value) {
    await stopScanner()
  } else {
    await startScanner('scanner-reader', onScanSuccess)
  }
}

async function onScanSuccess(decodedText) {
  scanHistory.value.unshift({
    code: decodedText,
    time: new Date().toLocaleTimeString(),
  })
  if (scanHistory.value.length > 20) scanHistory.value.pop()

  await searchByCode(decodedText)
}

async function handleManualSearch() {
  if (!manualCode.value.trim()) return
  await searchByCode(manualCode.value.trim())
}

// 解析扫码内容：支持普通条码、QR URL 格式 (?id=type__serial)
function parseScanContent(raw) {
  // 尝试解析 URL 格式：https://xxx?id=type__serial
  try {
    const url = new URL(raw)
    const idParam = url.searchParams.get('id')
    if (idParam) return idParam
  } catch {}

  // 尝试解析 type__serial 格式
  if (raw.includes('__')) return raw

  // 普通条形码数字
  return raw
}

async function searchByCode(code) {
  searched.value = true
  const parsed = parseScanContent(code)

  // 如果是 type__serial 格式，用类型+序列号精确查找
  if (parsed.includes('__')) {
    const [type, serial] = parsed.split('__')
    try {
      const res = await robotsApi.list({ search: serial, type, page_size: 10 })
      if (res.data.length > 0) {
        scanResult.value = { data: res.data, match_count: res.data.length }
        if (res.data.length === 1) selectedRobotId.value = res.data[0].id
        return
      }
    } catch {}
  }

  // 默认：条形码/序列号搜索
  try {
    const res = await robotsApi.getByBarcode(parsed)
    scanResult.value = res
    if (res.match_count === 1) {
      selectedRobotId.value = res.data[0].id
    }
  } catch (err) {
    scanResult.value = null
  }
}

function selectRobot(row) {
  selectedRobotId.value = row.id
  scanResult.value = { data: [row], match_count: 1 }
}

function viewDetail() {
  if (selectedRobotId.value) {
    router.push(`/robots/${selectedRobotId.value}`)
  }
}

function quickChangeStatus() {
  quickStatus.value = scanResult.value.data[0].status
  showStatusDialog.value = true
}

function quickChangeLocation() {
  quickLocation.value = scanResult.value.data[0].location || ''
  showLocationDialog.value = true
}

function quickBorrow() {
  borrowForm.borrowed_to = ''
  borrowForm.return_due = ''
  showBorrowDialog.value = true
}

async function applyStatusChange() {
  await robotsApi.update(selectedRobotId.value, { status: quickStatus.value })
  ElMessage.success('状态已更新')
  showStatusDialog.value = false
  await searchByCode(scanResult.value.data[0].barcode || scanResult.value.data[0].serial)
}

async function applyLocationChange() {
  await robotsApi.update(selectedRobotId.value, { location: quickLocation.value })
  ElMessage.success('位置已更新')
  showLocationDialog.value = false
  await searchByCode(scanResult.value.data[0].barcode || scanResult.value.data[0].serial)
}

async function applyBorrow() {
  await robotsApi.update(selectedRobotId.value, {
    status: '借出中',
    borrowed: true,
    borrowed_to: borrowForm.borrowed_to,
    borrowed_at: new Date().toISOString(),
    return_due: borrowForm.return_due,
  })
  ElMessage.success('借出成功')
  showBorrowDialog.value = false
  await searchByCode(scanResult.value.data[0].barcode || scanResult.value.data[0].serial)
}

async function loadFromHistory(item) {
  manualCode.value = item.code
  await searchByCode(item.code)
}
</script>

<style scoped>
.scan-history-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  font-size: 13px;
}
.scan-history-item:hover {
  color: #409eff;
}
</style>
