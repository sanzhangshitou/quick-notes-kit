<script setup lang="ts">
import type { ToolMeta } from '../types'

defineProps<{
  tools: ToolMeta[]
}>()

const emit = defineEmits<{
  open: [id: ToolMeta['id']]
}>()
</script>

<template>
  <main class="page-shell">
    <section class="home-hero">
      <p class="eyebrow">轻记工具箱</p>
      <h1>常用功能列表</h1>
      <p class="home-copy">首页只保留功能入口。选择一个工具后进入独立功能页。</p>
    </section>

    <section class="tool-list">
      <button
        v-for="tool in tools"
        :key="tool.id"
        type="button"
        class="tool-item"
        @click="emit('open', tool.id)"
      >
        <span class="tool-category">{{ tool.category }}</span>
        <strong>{{ tool.name }}</strong>
        <span class="tool-summary">{{ tool.summary }}</span>
      </button>
    </section>
  </main>
</template>
