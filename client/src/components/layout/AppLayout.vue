<template>
  <div class="app-layout">
    <Sidebar :collapsed="appStore.sidebarCollapsed" />
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
