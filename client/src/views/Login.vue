<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand-content">
        <div class="robot-icon">🤖</div>
        <h1>资产管理系统</h1>
        <p class="tagline">智能机器人资产管理平台</p>
        <div class="features">
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>资产追踪管理</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📱</span>
            <span>扫码快速识别</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔄</span>
            <span>钉钉数据同步</span>
          </div>
        </div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-card">
        <div class="card-header">
          <h2>欢迎登录</h2>
          <p>请输入您的账号密码</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="loginRules" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" placeholder="密码" type="password" size="large" show-password prefix-icon="Lock" @keyup.enter="handleLogin" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form-item>
        </el-form>
        <div class="card-footer">
          <p>默认账号：admin / admin123</p>
        </div>
      </div>
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
  background: #f0f2f5;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #1a1b2e 0%, #2d2e3e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(232, 85, 58, 0.1) 0%, transparent 50%);
    animation: pulse 8s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;

  .robot-icon {
    font-size: 80px;
    margin-bottom: 24px;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  h1 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 12px;
    background: linear-gradient(90deg, #fff 0%, #ff7a5c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 40px;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);

    .feature-icon {
      font-size: 20px;
    }

    span:last-child {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

.login-right {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: #fff;
}

.login-card {
  width: 100%;
  max-width: 360px;

  .card-header {
    text-align: center;
    margin-bottom: 40px;

    h2 {
      font-size: 28px;
      font-weight: 600;
      color: #1a1b2e;
      margin-bottom: 8px;
    }

    p {
      color: #909399;
      font-size: 14px;
    }
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #dcdfe6 inset;

    &:hover {
      box-shadow: 0 0 0 1px #e8553a inset;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #e8553a inset;
    }
  }

  :deep(.el-button--primary) {
    background: linear-gradient(135deg, #e8553a 0%, #ff7a5c 100%);
    border: none;
    border-radius: 8px;
    height: 48px;
    font-size: 16px;
    font-weight: 500;

    &:hover {
      background: linear-gradient(135deg, #c4432b 0%, #e8553a 100%);
    }
  }

  .card-footer {
    text-align: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #ebeef5;

    p {
      font-size: 12px;
      color: #909399;
    }
  }
}

@media (max-width: 900px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    padding: 40px 20px;
    min-height: 200px;
  }

  .brand-content {
    .robot-icon {
      font-size: 48px;
    }

    h1 {
      font-size: 24px;
    }

    .features {
      display: none;
    }
  }

  .login-right {
    width: 100%;
    padding: 40px 20px;
  }
}
</style>
