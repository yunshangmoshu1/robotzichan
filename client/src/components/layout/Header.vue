<template>
  <div class="header">
    <div class="header-left">
      <el-button class="menu-btn" :icon="Fold" text @click="$emit('toggle-sidebar')" />
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <span class="user-name">{{ authStore.displayName }}</span>
      <el-dropdown @command="handleCommand">
        <el-avatar :size="32" class="user-avatar">
          {{ (authStore.displayName || '?')[0] }}
        </el-avatar>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings">设置</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { Fold } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['toggle-sidebar'])
const router = useRouter()
const authStore = useAuthStore()

function handleCommand(cmd) {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (cmd === 'settings') {
    router.push('/settings')
  }
}
</script>

<style lang="scss" scoped>
.header {
  height: var(--header-height);
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 90;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .menu-btn {
      display: none;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .user-name {
      color: #606266;
      font-size: 14px;
    }

    .user-avatar {
      cursor: pointer;
      background: linear-gradient(135deg, #e8553a 0%, #ff7a5c 100%);
      color: #fff;
      font-weight: 600;
    }
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;

    .header-left {
      .menu-btn {
        display: flex;
      }
    }

    .header-right {
      .user-name {
        display: none;
      }
    }
  }
}
</style>
