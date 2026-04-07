<script setup lang="ts">
import { computed, ref } from 'vue'

const textInput = ref('Windows 小工具仪表盘\n支持文本统计、字符和字节分析。')

const stats = computed(() => {
  const value = textInput.value
  const trimmed = value.trim()
  return {
    chars: value.length,
    charsNoSpace: value.replace(/\s/g, '').length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: value ? value.split(/\r?\n/).length : 0,
    bytes: new TextEncoder().encode(value).length
  }
})
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <button type="button" class="ghost-button" @click="textInput = ''">清空</button>
    </div>
    <textarea v-model="textInput" rows="9" placeholder="粘贴要统计的文本" />
    <div class="stats-grid">
      <div>
        <span>字符</span><strong>{{ stats.chars }}</strong>
      </div>
      <div>
        <span>去空格字符</span><strong>{{ stats.charsNoSpace }}</strong>
      </div>
      <div>
        <span>单词</span><strong>{{ stats.words }}</strong>
      </div>
      <div>
        <span>行数</span><strong>{{ stats.lines }}</strong>
      </div>
      <div>
        <span>字节</span><strong>{{ stats.bytes }}</strong>
      </div>
    </div>
  </div>
</template>
