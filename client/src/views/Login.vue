<template>
  <div class="login-page">
    <div class="login-card">
      <h1>ROBO::TRACK</h1>
      <p class="subtitle">机器人资产管理系统</p>
      <el-form ref="formRef" :model="form" :rules="loginRules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" prefix-icon="User" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" prefix-icon="Lock" placeholder="密码" type="password" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginRules } from '@/utils/validators'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (err) {
    // 错误已在 api 拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d1e2c 0%, #2d3a4b 100%);
}

.login-card {
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  text-align: center;

  h1 {
    font-size: 28px;
    color: #409eff;
    letter-spacing: 3px;
    margin-bottom: 8px;
  }

  .subtitle {
    color: #909399;
    margin-bottom: 32px;
  }
}
</style>
