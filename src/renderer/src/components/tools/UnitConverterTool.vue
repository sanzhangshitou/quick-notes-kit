<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Category = 'length' | 'weight' | 'storage'

const maps = {
  length: { mm: 1, cm: 10, m: 1000, km: 1000000, in: 25.4, ft: 304.8 },
  weight: { g: 1, kg: 1000, lb: 453.59237 },
  storage: { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
} as const

const category = ref<Category>('length')
const value = ref(128)
const fromUnit = ref('cm')
const toUnit = ref('in')
const result = ref('')

const options = computed(() => Object.keys(maps[category.value]))

function convert(): void {
  const map = maps[category.value]
  const from = map[fromUnit.value as keyof typeof map]
  const to = map[toUnit.value as keyof typeof map]
  const next = (value.value * from) / to
  result.value = Number.isFinite(next)
    ? next.toLocaleString('zh-CN', { maximumFractionDigits: 6 })
    : ''
}

watch(
  category,
  (next) => {
    const [first, second] = Object.keys(maps[next])
    fromUnit.value = first
    toUnit.value = second
    convert()
  },
  { immediate: true }
)

watch([value, fromUnit, toUnit], convert)
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <select v-model="category">
        <option value="length">长度</option>
        <option value="weight">重量</option>
        <option value="storage">存储</option>
      </select>
    </div>
    <div class="converter-grid">
      <input v-model="value" type="number" step="any" />
      <select v-model="fromUnit">
        <option v-for="unit in options" :key="`from-${unit}`" :value="unit">{{ unit }}</option>
      </select>
      <span class="arrow">→</span>
      <select v-model="toUnit">
        <option v-for="unit in options" :key="`to-${unit}`" :value="unit">{{ unit }}</option>
      </select>
    </div>
    <div class="result-banner">
      <span>换算结果</span>
      <strong>{{ result }}</strong>
    </div>
  </div>
</template>
