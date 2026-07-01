<template>
  <el-tag :type="color" :size="size">{{ label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { statusColors, statusLabels } from '@/utils/format'

const props = defineProps({
  status: String,
  size: { type: String, default: 'default' },
})

const color = computed(() => statusColors[props.status] || 'info')
const label = computed(() => statusLabels[props.status] || props.status)
</script>
