<template>
  <div class="app-layout">
    <div class="sidebar-overlay" @click="appStore.closeSidebar" />
    <Sidebar :collapsed="appStore.sidebarCollapsed" :open="appStore.sidebarOpen" />
    <div class="main-area">
      <Header @toggle-sidebar="appStore.toggleSidebar" />
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

const appStore = useAppStore()
</script>

<style lang="scss" scoped>
.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  .sidebar.open ~ .sidebar-overlay,
  .sidebar.open + .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
