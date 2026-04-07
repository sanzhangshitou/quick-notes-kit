<script setup lang="ts">
import { ref } from 'vue'

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('Hello Windows')
const output = ref('')
const error = ref('')

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

function base64ToUtf8(value: string): string {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function convert(): void {
  try {
    output.value = mode.value === 'encode' ? utf8ToBase64(input.value) : base64ToUtf8(input.value)
    error.value = ''
  } catch (err) {
    output.value = ''
    error.value = err instanceof Error ? err.message : 'Base64 转换失败'
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
    <textarea v-model="input" rows="8" spellcheck="false" placeholder="输入内容" />
    <p v-if="error" class="error-text">{{ error }}</p>
    <textarea :value="output" rows="8" readonly placeholder="转换结果" />
  </div>
</template>
