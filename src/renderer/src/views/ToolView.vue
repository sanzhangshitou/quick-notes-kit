<script setup lang="ts">
import type { Component } from 'vue'
import type { ToolMeta } from '../types'

defineProps<{
  tool: ToolMeta
  component: Component
}>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <main class="page-shell">
    <section class="tool-header">
      <button type="button" class="back-button" @click="emit('back')">返回功能列表</button>
      <div>
        <p class="eyebrow">{{ tool.category }}</p>
        <h1>{{ tool.name }}</h1>
        <p class="home-copy">{{ tool.summary }}</p>
      </div>
    </section>

    <section class="tool-page-card">
      <component :is="component" />
    </section>
  </main>
</template>
