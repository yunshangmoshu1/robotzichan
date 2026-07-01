<template>
  <div class="sidebar" :class="{ collapsed, open }">
    <div class="logo">
      <span class="logo-icon">🤖</span>
      <span v-if="!collapsed" class="logo-text">资产管理系统</span>
      <span v-else class="logo-text">AS</span>
    </div>
    <el-menu
      :default-active="$route.path"
      :collapse="collapsed"
      router
      background-color="transparent"
      text-color="rgba(255,255,255,0.7)"
      active-text-color="#fff"
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

const props = defineProps({
  collapsed: Boolean,
  open: Boolean,
})

const appStore = useAppStore()

function handleMenuSelect() {
  // 手机端选择菜单后自动关闭侧边栏
  if (window.innerWidth <= 768) {
    appStore.closeSidebar()
  }
}
</script>
