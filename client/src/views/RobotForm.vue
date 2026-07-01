<template>
  <div>
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-button @click="$router.back()" text><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>{{ isEdit ? '编辑资产' : '新增资产' }}</h2>
      </div>
    </div>

    <el-card style="max-width: 800px;">
      <el-form ref="formRef" :model="form" :rules="robotRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="form.type" filterable allow-create placeholder="选择或输入类型" style="width: 100%;">
                <el-option v-for="t in filterOptions.types" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号" prop="serial">
              <el-input v-model="form.serial" placeholder="输入序列号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="条形码" prop="barcode">
              <el-input v-model="form.barcode" placeholder="输入条形码数字" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%;">
                <el-option v-for="s in filterOptions.statuses" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人" prop="person">
              <el-autocomplete
                v-model="form.person"
                :fetch-suggestions="queryPersons"
                placeholder="输入负责人"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-input v-model="form.department" placeholder="输入部门" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP地址" prop="ip">
              <el-input v-model="form.ip" placeholder="输入 IP 地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="位置" prop="location">
              <el-autocomplete
                v-model="form.location"
                :fetch-suggestions="queryLocations"
                placeholder="输入位置"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker v-model="form.purchase_date" type="date" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保修到期">
              <el-date-picker v-model="form.warranty_until" type="date" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="资产价值">
          <el-input-number v-model="form.value" :min="0" :precision="2" style="width: 200px;" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="4" placeholder="输入备注信息" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">{{ isEdit ? '保存修改' : '创建资产' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRobotsStore } from '@/stores/robots'
import { robotRules } from '@/utils/validators'

const route = useRoute()
const router = useRouter()
const robotsStore = useRobotsStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const saving = ref(false)
const filterOptions = ref({ types: [], statuses: [], locations: [], persons: [] })

const defaultForm = {
  type: '', serial: '', barcode: '', status: '测试中',
  person: '', department: '', ip: '', location: '',
  purchase_date: null, warranty_until: null, value: null, notes: '',
}

const form = reactive({ ...defaultForm })

async function loadFilterOptions() {
  try {
    filterOptions.value = await robotsStore.fetchFilterOptions()
  } catch (e) { /* ignore */ }
}

async function loadRobot() {
  if (!isEdit.value) return
  const robot = await robotsStore.fetchById(route.params.id)
  Object.assign(form, robot)
}

function queryPersons(queryString, cb) {
  const results = filterOptions.value.persons
    .map(p => ({ value: p }))
    .filter(item => !queryString || item.value.includes(queryString))
  cb(results)
}

function queryLocations(queryString, cb) {
  const results = filterOptions.value.locations
    .map(l => ({ value: l }))
    .filter(item => !queryString || item.value.includes(queryString))
  cb(results)
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await robotsStore.updateRobot(route.params.id, form)
      ElMessage.success('更新成功')
    } else {
      await robotsStore.createRobot(form)
      ElMessage.success('创建成功')
    }
    router.push('/robots')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadFilterOptions()
  loadRobot()
})
</script>
