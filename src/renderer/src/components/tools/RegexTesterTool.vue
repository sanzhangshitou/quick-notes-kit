<script setup lang="ts">
import { ref } from 'vue'

const pattern = ref('\\b\\w{4,}\\b')
const flags = ref('g')
const input = ref('Windows utility dashboard with clean cards and fast helpers.')
const output = ref('')
const error = ref('')

function run(): void {
  try {
    const regex = new RegExp(pattern.value, flags.value)
    const matches = input.value.match(regex)
    output.value = matches && matches.length > 0 ? matches.join('\n') : '没有匹配结果'
    error.value = ''
  } catch (err) {
    output.value = ''
    error.value = err instanceof Error ? err.message : '正则表达式无效'
  }
}

run()
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar toolbar-stretch">
      <input v-model="pattern" type="text" placeholder="正则表达式" />
      <input v-model="flags" type="text" placeholder="flags" />
      <button type="button" class="ghost-button" @click="run">运行</button>
    </div>
    <textarea v-model="input" rows="8" spellcheck="false" placeholder="输入待匹配文本" />
    <p v-if="error" class="error-text">{{ error }}</p>
    <textarea :value="output" rows="8" readonly placeholder="匹配结果" />
  </div>
</template>
