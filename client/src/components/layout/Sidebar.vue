<template>
  <div class="sidebar" :class="{ collapsed, open }">
    <div class="logo">
      <div v-if="!collapsed" class="logo-copy">
        <span class="logo-text">ROBO::TRACK</span>
        <span class="logo-subtitle">机器人资产管理</span>
      </div>
    </div>

    <el-menu
      :default-active="$route.path"
      :collapse="collapsed"
      router
      background-color="transparent"
      text-color="#647780"
      active-text-color="#bf573c"
      @select="handleMenuSelect"
    >
      <el-menu-item index="/">
        <el-icon><DataBoard /></el-icon>
        <template #title>仪表盘</template>
      </el-menu-item>
      <el-menu-item index="/robots">
        <el-icon><Box /></el-icon>
        <template #title>资产列表</template>
      </el-menu-item>
      <el-menu-item index="/scanner">
        <el-icon><Camera /></el-icon>
        <template #title>条码扫描</template>
      </el-menu-item>
      <el-menu-item index="/labels">
        <el-icon><Tickets /></el-icon>
        <template #title>标签生成</template>
      </el-menu-item>
      <el-menu-item index="/inventory">
        <el-icon><DocumentChecked /></el-icon>
        <template #title>盘点管理</template>
      </el-menu-item>
      <el-menu-item index="/dingtalk">
        <el-icon><ChatDotRound /></el-icon>
        <template #title>钉钉集成</template>
      </el-menu-item>
      <el-menu-item index="/reports">
        <el-icon><TrendCharts /></el-icon>
        <template #title>报表统计</template>
      </el-menu-item>
      <el-menu-item index="/settings">
        <el-icon><Setting /></el-icon>
        <template #title>系统设置</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app'

defineProps({
  collapsed: Boolean,
  open: Boolean,
})

const appStore = useAppStore()

function handleMenuSelect() {
  if (window.innerWidth <= 768) {
    appStore.closeSidebar()
  }
}
</script>

<style lang="scss" scoped>
.sidebar {
  .logo {
    padding: 0 18px;
  }

  .logo-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .logo-text {
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.2;
    font-weight: 800;
    white-space: nowrap;
  }

  .logo-subtitle {
    margin-top: 2px;
    color: var(--text-tertiary);
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
  }

  &.collapsed .logo {
    padding: 0;
    justify-content: center;
  }

  &.collapsed .el-menu {
    padding: 12px 8px;

    .el-menu-item {
      padding: 0;
      justify-content: center;
    }
  }
}
</style>
