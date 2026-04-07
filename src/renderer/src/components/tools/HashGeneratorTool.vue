<script setup lang="ts">
import { ref, watch } from 'vue'

type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

const input = ref('Generate checksum for text here')
const algorithm = ref<HashAlgorithm>('SHA-256')
const output = ref('')

async function generate(): Promise<void> {
  const buffer = new TextEncoder().encode(input.value)
  const digest = await crypto.subtle.digest(algorithm.value, buffer)
  output.value = Array.from(new Uint8Array(digest), (item) =>
    item.toString(16).padStart(2, '0')
  ).join('')
}

async function copy(): Promise<void> {
  if (output.value) await navigator.clipboard.writeText(output.value)
}

watch(
  [input, algorithm],
  () => {
    void generate()
  },
  { immediate: true }
)
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <select v-model="algorithm">
        <option value="SHA-1">SHA-1</option>
        <option value="SHA-256">SHA-256</option>
        <option value="SHA-384">SHA-384</option>
        <option value="SHA-512">SHA-512</option>
      </select>
      <button type="button" class="ghost-button" @click="generate">刷新摘要</button>
      <button type="button" class="ghost-button" @click="copy">复制摘要</button>
    </div>
    <textarea v-model="input" rows="8" spellcheck="false" placeholder="输入要生成摘要的文本" />
    <textarea :value="output" rows="6" readonly placeholder="哈希结果" />
  </div>
</template>
