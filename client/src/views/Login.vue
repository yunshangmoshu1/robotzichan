<template>
  <div class="login-page">
    <section class="login-panel" aria-label="登录">
      <div class="brand-mark">
        <span class="mark-grid">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span>ROBO::TRACK</span>
      </div>

      <div class="login-card">
        <p class="eyebrow">资产管理系统</p>
        <h1>{{ isRegister ? '注册账号' : '欢迎回来' }}</h1>
        <p class="subtext">{{ isRegister ? '填写个人信息创建账号，注册后直接进入系统。' : '登录后查看机器人资产、盘点和钉钉同步状态。' }}</p>

        <!-- 登录表单 -->
        <el-form
          v-if="!isRegister"
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          @submit.prevent="handleLogin"
          size="large"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="用户名"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              placeholder="密码"
              type="password"
              show-password
              prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form>

        <!-- 注册表单 -->
        <el-form
          v-else
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          @submit.prevent="handleRegister"
          size="large"
        >
          <el-form-item prop="display_name">
            <el-input
              v-model="registerForm.display_name"
              placeholder="你的姓名"
              prefix-icon="UserFilled"
              clearable
            />
          </el-form-item>

          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="用户名（登录用）"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              placeholder="密码"
              type="password"
              show-password
              prefix-icon="Lock"
              @keyup.enter="handleRegister"
            />
          </el-form-item>

          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '注册并进入' }}
          </el-button>
        </el-form>

        <div class="toggle-mode">
          <template v-if="isRegister">
            <span>已有账号？</span>
            <el-link type="primary" :underline="false" @click="isRegister = false">去登录</el-link>
          </template>
          <template v-else>
            <span>没有账号？</span>
            <el-link type="primary" :underline="false" @click="isRegister = true">注册新账号</el-link>
          </template>
        </div>
      </div>

      <div class="login-footer">
        <span>机器人资产数据中心</span>
        <span>v2.0</span>
      </div>
    </section>

    <section class="visual-panel" aria-label="机器人生态">
      <img src="/images/robot-ecosystem.jpg" alt="机器人生态展示" />
      <div class="visual-caption">
        <span class="caption-kicker">Robot Operations</span>
        <h2>从入库到盘点，保持资产状态清楚可见。</h2>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { loginRules } from '@/utils/validators'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const loginFormRef = ref(null)
const registerFormRef = ref(null)
const loading = ref(false)
const isRegister = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ display_name: '', username: '', password: '' })

const registerRules = {
  display_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

async function handleLogin() {
  await loginFormRef.value.validate()
  loading.value = true
  try {
    await authStore.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (err) {
    // 错误已在 API 拦截器中处理
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  await registerFormRef.value.validate()
  loading.value = true
  try {
    await authStore.registerPublic(registerForm)
    ElMessage.success('注册成功')
    router.push('/')
  } catch (err) {
    // 错误已在 API 拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(420px, 0.42fr) minmax(0, 0.58fr);
  background: #f4f7f8;
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 42px 56px 34px;
  background: #fbfcfc;
  border-right: 1px solid #dfe7ea;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  color: #1f2f3a;
  font-size: 15px;
  font-weight: 700;
}

.mark-grid {
  width: 32px;
  height: 32px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 6px;
  border: 1px solid #b9cbd3;
  border-radius: 8px;

  span {
    background: #e46f4d;
    border-radius: 3px;
  }
}

.login-card {
  width: 100%;
  max-width: 360px;
  margin: 54px 0;
}

.eyebrow {
  color: #e46f4d;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
}

h1 {
  color: #1f2f3a;
  font-size: 32px;
  line-height: 1.2;
  font-weight: 700;
  margin-bottom: 10px;
}

.subtext {
  color: #6d7b84;
  font-size: 14px;
  margin-bottom: 30px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 0 0 1px #d8e2e7 inset;
  padding: 0 14px;

  &:hover {
    box-shadow: 0 0 0 1px #b9cbd3 inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px #e46f4d inset;
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-weight: 700;
}

.toggle-mode {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 14px;
  color: #6d7b84;
}

.login-footer {
  display: flex;
  justify-content: space-between;
  color: #8a989f;
  font-size: 12px;
}

.visual-panel {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #eaf1f4;

  img {
    width: 100%;
    height: 100%;
    min-height: 100vh;
    object-fit: cover;
    object-position: 68% center;
    display: block;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(244, 247, 248, 0.12), rgba(244, 247, 248, 0) 35%),
      linear-gradient(0deg, rgba(23, 38, 48, 0.18), rgba(23, 38, 48, 0) 42%);
    pointer-events: none;
  }
}

.visual-caption {
  position: absolute;
  left: 42px;
  bottom: 36px;
  max-width: 420px;
  color: #fff;
  z-index: 1;

  .caption-kicker {
    display: block;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  h2 {
    font-size: 24px;
    line-height: 1.35;
    font-weight: 700;
  }
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .visual-panel {
    min-height: 260px;

    img {
      min-height: 260px;
      object-position: 58% center;
    }
  }

  .login-panel {
    border-right: none;
    padding: 32px 28px;
  }

  .login-card {
    max-width: none;
    margin: 42px 0;
  }
}

@media (max-width: 560px) {
  .login-panel {
    padding: 26px 20px;
  }

  h1 {
    font-size: 28px;
  }

  .visual-caption {
    left: 24px;
    right: 24px;
    bottom: 24px;

    h2 {
      font-size: 20px;
    }
  }

  .visual-panel {
    min-height: 220px;

    img {
      min-height: 220px;
    }
  }
}
</style>
