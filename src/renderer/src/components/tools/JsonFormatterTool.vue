<script setup lang="ts">
import { ref } from 'vue'

const jsonInput = ref('{\n  "name": "quick-notes-kit",\n  "platform": "windows"\n}')
const output = ref('')
const error = ref('')

function format(pretty: boolean): void {
  try {
    output.value = JSON.stringify(JSON.parse(jsonInput.value), null, pretty ? 2 : 0)
    error.value = ''
  } catch (err) {
    output.value = ''
    error.value = err instanceof Error ? err.message : 'JSON 解析失败'
  }
}

format(true)
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <button type="button" class="ghost-button" @click="format(true)">格式化</button>
      <button type="button" class="ghost-button" @click="format(false)">压缩</button>
    </div>
    <textarea v-model="jsonInput" rows="9" spellcheck="false" placeholder="输入 JSON" />
    <p v-if="error" class="error-text">{{ error }}</p>
    <textarea :value="output" rows="9" readonly placeholder="结果输出" />
  </div>
</template>
