<script setup lang="ts">
import { ref } from 'vue'

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('https://example.com/search?q=windows tools&lang=zh-CN')
const output = ref('')
const error = ref('')

function convert(): void {
  try {
    output.value =
      mode.value === 'encode' ? encodeURIComponent(input.value) : decodeURIComponent(input.value)
    error.value = ''
  } catch (err) {
    output.value = ''
    error.value = err instanceof Error ? err.message : 'URL 转换失败'
  }
}

async function copy(): Promise<void> {
  if (output.value) await navigator.clipboard.writeText(output.value)
}

convert()
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <select v-model="mode">
        <option value="encode">编码</option>
        <option value="decode">解码</option>
      </select>
      <button type="button" class="ghost-button" @click="convert">执行</button>
      <button type="button" class="ghost-button" @click="copy">复制结果</button>
    </div>
    <textarea v-model="input" rows="8" spellcheck="false" placeholder="输入 URL 或参数" />
    <p v-if="error" class="error-text">{{ error }}</p>
    <textarea :value="output" rows="8" readonly placeholder="转换结果" />
  </div>
</template>
