<template>
  <div class="header">
    <div class="header-left">
      <el-button class="menu-btn" :icon="Fold" text @click="$emit('toggle-sidebar')" />
      <div class="page-context">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>
        <span class="context-note">机器人资产工作台</span>
      </div>
    </div>

    <div class="header-right">
      <span class="system-state">数据已连接</span>
      <span class="user-name">{{ authStore.displayName }}</span>
      <el-dropdown @command="handleCommand" trigger="click">
        <button class="user-avatar" type="button">
          {{ (authStore.displayName || '?')[0] }}
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { Fold, Setting, SwitchButton } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineEmits(['toggle-sidebar'])

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
  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;

    .menu-btn {
      display: none;
      color: var(--text-secondary);
    }
  }

  .page-context {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .context-note {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .system-state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--success);
    font-size: 12px;
    font-weight: 700;
    padding: 5px 9px;
    background: var(--success-light);
    border-radius: 999px;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  }

  .user-name {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
  }

  .user-avatar {
    width: 34px;
    height: 34px;
    border: 1px solid var(--border-medium);
    border-radius: 8px;
    background: #fff;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
}

:deep(.el-breadcrumb) {
  font-size: 13px;

  .el-breadcrumb__inner {
    color: var(--text-tertiary);
    font-weight: 600;
  }

  .el-breadcrumb__item:last-child .el-breadcrumb__inner {
    color: var(--text-primary);
    font-weight: 800;
  }
}

@media (max-width: 768px) {
  .header {
    .header-left {
      .menu-btn {
        display: flex;
      }
    }

    .context-note,
    .system-state,
    .user-name {
      display: none;
    }
  }
}
</style>
