<script setup lang="ts">
import { computed, ref } from 'vue'

const input = ref('#2f6fed')

function normalizeHex(value: string): string | null {
  const cleaned = value.trim().replace('#', '')
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split('')
      .map((item) => item + item)
      .join('')
      .toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`
  }
  return null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '')
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255
  const ng = g / 255
  const nb = b / 255
  const max = Math.max(nr, ng, nb)
  const min = Math.min(nr, ng, nb)
  const diff = max - min
  let h = 0
  const l = (max + min) / 2
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1))

  if (diff !== 0) {
    switch (max) {
      case nr:
        h = 60 * (((ng - nb) / diff) % 6)
        break
      case ng:
        h = 60 * ((nb - nr) / diff + 2)
        break
      default:
        h = 60 * ((nr - ng) / diff + 4)
        break
    }
  }

  return {
    h: Math.round(h < 0 ? h + 360 : h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const details = computed(() => {
  const hex = normalizeHex(input.value)
  if (!hex) return null
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  return { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` }
})

async function copy(): Promise<void> {
  if (details.value?.hex) await navigator.clipboard.writeText(details.value.hex)
}
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <button type="button" class="ghost-button" @click="copy">复制 HEX</button>
    </div>
    <div class="color-row">
      <input v-model="input" type="text" placeholder="#2f6fed" />
      <input v-model="input" type="color" class="color-input" />
    </div>
    <div v-if="details" class="color-panel">
      <div class="swatch" :style="{ background: details.hex }" />
      <div class="result-list">
        <div>
          <span>HEX</span><strong>{{ details.hex }}</strong>
        </div>
        <div>
          <span>RGB</span><strong>{{ details.rgb }}</strong>
        </div>
        <div>
          <span>HSL</span><strong>{{ details.hsl }}</strong>
        </div>
      </div>
    </div>
    <p v-else class="muted-text">请输入合法颜色值，例如 `#2f6fed`。</p>
  </div>
</template>
