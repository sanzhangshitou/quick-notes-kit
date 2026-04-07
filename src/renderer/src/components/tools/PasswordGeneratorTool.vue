<script setup lang="ts">
import { computed, ref } from 'vue'

const length = ref(18)
const includeLowercase = ref(true)
const includeUppercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(false)
const output = ref('')

const strength = computed(() => {
  let score = 0
  if (length.value >= 12) score += 1
  if (length.value >= 16) score += 1
  if (includeLowercase.value && includeUppercase.value) score += 1
  if (includeNumbers.value) score += 1
  if (includeSymbols.value) score += 1
  if (score <= 2) return '基础'
  if (score <= 4) return '较强'
  return '很强'
})

function generate(): void {
  const pools = [
    includeLowercase.value ? 'abcdefghijkmnopqrstuvwxyz' : '',
    includeUppercase.value ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : '',
    includeNumbers.value ? '23456789' : '',
    includeSymbols.value ? '!@#$%^&*()-_=+[]{}?' : ''
  ].filter(Boolean)

  if (pools.length === 0) {
    output.value = '请至少选择一种字符集'
    return
  }

  const chars = pools.join('')
  const seed = crypto.getRandomValues(new Uint32Array(length.value))
  output.value = Array.from(seed, (value) => chars[value % chars.length]).join('')
}

async function copy(): Promise<void> {
  if (output.value) await navigator.clipboard.writeText(output.value)
}

generate()
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <span class="tag">{{ strength }}</span>
      <button type="button" class="ghost-button" @click="generate">重新生成</button>
      <button type="button" class="ghost-button" @click="copy">复制密码</button>
    </div>
    <label class="field">
      <span>长度</span>
      <input v-model="length" type="range" min="8" max="32" />
      <strong>{{ length }}</strong>
    </label>
    <div class="option-grid">
      <label><input v-model="includeLowercase" type="checkbox" /> 小写字母</label>
      <label><input v-model="includeUppercase" type="checkbox" /> 大写字母</label>
      <label><input v-model="includeNumbers" type="checkbox" /> 数字</label>
      <label><input v-model="includeSymbols" type="checkbox" /> 符号</label>
    </div>
    <textarea :value="output" rows="4" readonly />
  </div>
</template>
