<template>
  <div v-loading="loading">
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-button @click="$router.back()" text><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>{{ robot.type }} - {{ robot.serial }}</h2>
        <el-tag :type="statusColors[robot.status]">{{ statusLabels[robot.status] || robot.status }}</el-tag>
      </div>
      <div>
        <el-button type="primary" @click="$router.push(`/robots/${robot.id}/edit`)">编辑</el-button>
        <el-button type="danger" @click="handleDelete">删除</el-button>
      </div>
    </div>

    <el-row :gutter="24">
      <!-- 基本信息 -->
      <el-col :span="16">
        <el-card header="基本信息">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="类型">{{ robot.type }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ robot.serial }}</el-descriptions-item>
            <el-descriptions-item label="条形码">{{ robot.barcode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusColors[robot.status]">{{ statusLabels[robot.status] || robot.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="负责人">{{ robot.person || '-' }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ robot.department || '-' }}</el-descriptions-item>
            <el-descriptions-item label="IP地址">{{ robot.ip || '-' }}</el-descriptions-item>
            <el-descriptions-item label="位置">{{ robot.location || '-' }}</el-descriptions-item>
            <el-descriptions-item label="采购日期">{{ formatDate(robot.purchase_date) }}</el-descriptions-item>
            <el-descriptions-item label="保修到期">{{ formatDate(robot.warranty_until) }}</el-descriptions-item>
            <el-descriptions-item label="资产价值">{{ robot.value ? `¥${robot.value}` : '-' }}</el-descriptions-item>
            <el-descriptions-item label="最后操作人">{{ robot.updater || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(robot.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(robot.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 借还信息 -->
        <el-card v-if="robot.borrowed" header="借出信息" style="margin-top: 16px;">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="借用人">{{ robot.borrowed_to }}</el-descriptions-item>
            <el-descriptions-item label="借出时间">{{ formatDateTime(robot.borrowed_at) }}</el-descriptions-item>
            <el-descriptions-item label="预计归还">
              {{ formatDate(robot.return_due) }}
              <el-tag v-if="isOverdue(robot.return_due)" type="danger" size="small" style="margin-left: 8px;">已逾期</el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <el-button type="success" style="margin-top: 12px;" @click="handleReturn">确认归还</el-button>
        </el-card>

        <!-- 备注系统（追加式，带时间戳） -->
        <el-card header="备注" style="margin-top: 16px;">
          <!-- 历史备注 -->
          <div v-if="parsedNotes.length" class="notes-history">
            <div v-for="(note, idx) in parsedNotes" :key="idx" class="note-item">
              <div class="note-meta">
                <span class="note-time">{{ note.time }}</span>
                <span class="note-user">{{ note.user }}</span>
              </div>
              <div class="note-content">{{ note.content }}</div>
            </div>
          </div>
          <el-empty v-else description="暂无备注" />

          <!-- 添加新备注 -->
          <div style="margin-top: 16px; display: flex; gap: 8px;">
            <el-input v-model="newNote" placeholder="输入备注内容..." @keyup.enter="addNote" />
            <el-button type="primary" @click="addNote" :disabled="!newNote.trim()">添加</el-button>
          </div>
        </el-card>

        <!-- 变更日志 -->
        <el-card header="变更日志" style="margin-top: 16px;">
          <el-timeline v-if="changelog.length">
            <el-timeline-item
              v-for="log in changelog"
              :key="log.id"
              :timestamp="formatDateTime(log.changed_at)"
              placement="top"
            >
              <p style="font-size: 13px;">
                <strong>{{ log.field }}</strong>:
                {{ log.old_value || '-' }} → {{ log.new_value || '-' }}
                <span style="color: #909399; margin-left: 8px;">{{ log.changed_by }}</span>
              </p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无变更记录" />
        </el-card>
      </el-col>

      <!-- 右侧：快捷操作 + 图片 -->
      <el-col :span="8">
        <!-- 快捷操作 -->
        <el-card header="快捷操作">
          <div class="quick-actions">
            <div class="quick-action-btn" @click="showStatusDialog = true">
              <el-icon :size="24" color="#409eff"><Switch /></el-icon>
              <span>修改状态</span>
            </div>
            <div class="quick-action-btn" @click="showLocationDialog = true">
              <el-icon :size="24" color="#67c23a"><Location /></el-icon>
              <span>修改位置</span>
            </div>
            <div class="quick-action-btn" @click="showBorrowDialog = true">
              <el-icon :size="24" color="#e6a23c"><Promotion /></el-icon>
              <span>借出</span>
            </div>
            <div class="quick-action-btn" @click="showPersonDialog = true">
              <el-icon :size="24" color="#909399"><User /></el-icon>
              <span>修改负责人</span>
            </div>
          </div>
        </el-card>

        <!-- 图片（支持拍照/上传 + 压缩） -->
        <el-card header="资产图片" style="margin-top: 16px;">
          <el-image
            v-if="robot.image"
            :src="robot.image"
            fit="contain"
            style="width: 100%; max-height: 300px; border-radius: 8px;"
            :preview-src-list="[robot.image]"
          />
          <el-empty v-if="!robot.image && !uploading" description="暂无图片" />

          <!-- 上传按钮 -->
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <el-upload
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="handleFileSelect"
            >
              <el-button size="small" :loading="uploading">
                <el-icon><Upload /></el-icon> 选择图片
              </el-button>
            </el-upload>
            <el-button size="small" :loading="uploading" @click="captureCamera">
              <el-icon><Camera /></el-icon> 拍照
            </el-button>
            <el-button v-if="robot.image" size="small" type="danger" @click="removeImage">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
          <!-- 隐藏的摄像头输入 -->
          <input ref="cameraInput" type="file" accept="image/*" capture="environment" style="display: none;" @change="handleCameraCapture" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 修改状态对话框 -->
    <el-dialog v-model="showStatusDialog" title="修改状态" width="400px">
      <el-select v-model="quickStatus" style="width: 100%;">
        <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
      </el-select>
      <template #footer>
        <el-button @click="showStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="updateField('status', quickStatus)">确认</el-button>
      </template>
    </el-dialog>

    <!-- 修改位置对话框 -->
    <el-dialog v-model="showLocationDialog" title="修改位置" width="400px">
      <el-input v-model="quickLocation" placeholder="输入新位置" />
      <template #footer>
        <el-button @click="showLocationDialog = false">取消</el-button>
        <el-button type="primary" @click="updateField('location', quickLocation)">确认</el-button>
      </template>
    </el-dialog>

    <!-- 借出对话框 -->
    <el-dialog v-model="showBorrowDialog" title="借出" width="400px">
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
        <el-button type="primary" @click="handleBorrow">确认借出</el-button>
      </template>
    </el-dialog>

    <!-- 修改负责人对话框 -->
    <el-dialog v-model="showPersonDialog" title="修改负责人" width="400px">
      <el-input v-model="quickPerson" placeholder="输入负责人" />
      <template #footer>
        <el-button @click="showPersonDialog = false">取消</el-button>
        <el-button type="primary" @click="updateField('person', quickPerson)">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRobotsStore } from '@/stores/robots'
import { useAuthStore } from '@/stores/auth'
import { defaultStatusOptions, statusColors, statusLabels, formatDate, formatDateTime, isOverdue } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const robotsStore = useRobotsStore()
const authStore = useAuthStore()

const robot = ref({})
const changelog = ref([])
const loading = ref(false)
const newNote = ref('')
const uploading = ref(false)
const cameraInput = ref(null)

const statusOptions = defaultStatusOptions
const showStatusDialog = ref(false)
const quickStatus = ref('')
const showLocationDialog = ref(false)
const quickLocation = ref('')
const showBorrowDialog = ref(false)
const borrowForm = reactive({ borrowed_to: '', return_due: '' })
const showPersonDialog = ref(false)
const quickPerson = ref('')

// 解析备注为时间戳格式：[2024-01-01 12:00 张三] 备注内容
const parsedNotes = computed(() => {
  if (!robot.value.notes) return []
  const lines = robot.value.notes.split('\n').filter(Boolean)
  return lines.map(line => {
    const match = line.match(/^\[([^\]]+)\s+([^\]]+)\]\s*(.*)$/)
    if (match) {
      return { time: match[1], user: match[2], content: match[3] }
    }
    return { time: '', user: '', content: line }
  }).reverse() // 最新的在上面
})

async function loadRobot() {
  loading.value = true
  try {
    robot.value = await robotsStore.fetchById(route.params.id)
    changelog.value = await robotsStore.fetchChangelog(route.params.id)
  } finally {
    loading.value = false
  }
}

async function updateField(field, value) {
  await robotsStore.updateRobot(route.params.id, { [field]: value })
  ElMessage.success('更新成功')
  showStatusDialog.value = false
  showLocationDialog.value = false
  showPersonDialog.value = false
  loadRobot()
}

// 添加备注（追加式，带时间戳和操作人）
async function addNote() {
  if (!newNote.value.trim()) return

  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
  const user = authStore.displayName || '未知'
  const noteEntry = `[${timeStr} ${user}] ${newNote.value.trim()}`

  const oldNotes = robot.value.notes || ''
  const updatedNotes = oldNotes ? `${oldNotes}\n${noteEntry}` : noteEntry

  await robotsStore.updateRobot(route.params.id, { notes: updatedNotes })
  newNote.value = ''
  ElMessage.success('备注已添加')
  loadRobot()
}

// 图片压缩（最大 800px，70% JPEG 质量）
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 800
        let w = img.width
        let h = img.height

        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round(h * maxSize / w)
            w = maxSize
          } else {
            w = Math.round(w * maxSize / h)
            h = maxSize
          }
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/jpeg', 0.7)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// 上传图片到 Supabase Storage 或转为 base64
async function uploadImage(blob) {
  // 先尝试通过后端 API 上传
  try {
    const formData = new FormData()
    formData.append('image', blob, `${robot.value.id}_${Date.now()}.jpg`)

    const token = localStorage.getItem('token')
    const resp = await fetch('/api/robots/' + robot.value.id + '/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (resp.ok) {
      const data = await resp.json()
      return data.url
    }
  } catch (e) {
    // 后端不支持，降级为 base64
  }

  // 降级：转为 base64 存储在数据库中
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

async function handleFileSelect(file) {
  uploading.value = true
  try {
    const compressed = await compressImage(file.raw)
    const imageUrl = await uploadImage(compressed)
    await robotsStore.updateRobot(route.params.id, { image: imageUrl })
    ElMessage.success('图片上传成功')
    loadRobot()
  } catch (e) {
    ElMessage.error('图片上传失败')
  } finally {
    uploading.value = false
  }
}

function captureCamera() {
  cameraInput.value?.click()
}

async function handleCameraCapture(event) {
  const file = event.target.files[0]
  if (!file) return

  uploading.value = true
  try {
    const compressed = await compressImage(file)
    const imageUrl = await uploadImage(compressed)
    await robotsStore.updateRobot(route.params.id, { image: imageUrl })
    ElMessage.success('图片上传成功')
    loadRobot()
  } catch (e) {
    ElMessage.error('图片上传失败')
  } finally {
    uploading.value = false
    event.target.value = '' // 重置 input
  }
}

async function removeImage() {
  await ElMessageBox.confirm('确定删除图片？', '确认', { type: 'warning' })
  await robotsStore.updateRobot(route.params.id, { image: null })
  ElMessage.success('图片已删除')
  loadRobot()
}

async function handleBorrow() {
  await robotsStore.updateRobot(route.params.id, {
    status: '借出中',
    borrowed: true,
    borrowed_to: borrowForm.borrowed_to,
    borrowed_at: new Date().toISOString(),
    return_due: borrowForm.return_due,
  })
  ElMessage.success('借出成功')
  showBorrowDialog.value = false
  loadRobot()
}

async function handleReturn() {
  await robotsStore.updateRobot(route.params.id, {
    status: '测试中',
    borrowed: false,
    borrowed_to: null,
    borrowed_at: null,
    return_due: null,
  })
  ElMessage.success('归还成功')
  loadRobot()
}

async function handleDelete() {
  await ElMessageBox.confirm('确定删除该资产？', '确认删除', { type: 'warning' })
  await robotsStore.deleteRobot(route.params.id)
  ElMessage.success('删除成功')
  router.push('/robots')
}

onMounted(loadRobot)
</script>

<style scoped>
.notes-history {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}

.note-item {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.note-item:last-child {
  border-bottom: none;
}

.note-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.note-content {
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
}
</style>
