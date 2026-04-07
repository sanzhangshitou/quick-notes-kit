<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const timestampMode = ref<'ms' | 's'>('ms')
const timestampInput = ref(String(Date.now()))
const datetimeInput = ref(toDatetimeLocal(new Date()))
const error = ref('')

const details = computed(() => {
  const raw = timestampInput.value.trim()
  if (!raw) return null
  const numeric = Number(raw)
  if (Number.isNaN(numeric)) return null

  const milliseconds = timestampMode.value === 's' ? numeric * 1000 : numeric
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return null

  return {
    milliseconds,
    seconds: Math.floor(milliseconds / 1000),
    local: date.toLocaleString('zh-CN', { hour12: false }),
    iso: date.toISOString(),
    dateOnly: date.toLocaleDateString('zh-CN'),
    timeOnly: date.toLocaleTimeString('zh-CN', { hour12: false })
  }
})

function toDatetimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

function syncFromTimestamp(): void {
  const raw = timestampInput.value.trim()
  if (!raw) {
    error.value = '请输入时间戳。'
    return
  }

  const numeric = Number(raw)
  if (Number.isNaN(numeric)) {
    error.value = '时间戳格式无效。'
    return
  }

  const milliseconds = timestampMode.value === 's' ? numeric * 1000 : numeric
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) {
    error.value = '时间戳超出有效范围。'
    return
  }

  datetimeInput.value = toDatetimeLocal(date)
  error.value = ''
}

function syncFromDatetime(): void {
  if (!datetimeInput.value) {
    error.value = '请选择时间。'
    return
  }

  const date = new Date(datetimeInput.value)
  if (Number.isNaN(date.getTime())) {
    error.value = '日期时间格式无效。'
    return
  }

  const milliseconds = date.getTime()
  timestampInput.value = String(
    timestampMode.value === 's' ? Math.floor(milliseconds / 1000) : milliseconds
  )
  error.value = ''
}

function fillNow(): void {
  const now = new Date()
  datetimeInput.value = toDatetimeLocal(now)
  timestampInput.value = String(
    timestampMode.value === 's' ? Math.floor(now.getTime() / 1000) : now.getTime()
  )
  error.value = ''
}

function swapValues(): void {
  if (details.value) {
    datetimeInput.value = toDatetimeLocal(new Date(details.value.milliseconds))
  } else if (datetimeInput.value) {
    syncFromDatetime()
  }
}

fillNow()

watch(timestampMode, (next, prev) => {
  const raw = timestampInput.value.trim()
  if (!raw) return

  const numeric = Number(raw)
  if (Number.isNaN(numeric)) return

  const milliseconds = prev === 's' ? numeric * 1000 : numeric
  timestampInput.value = String(next === 's' ? Math.floor(milliseconds / 1000) : milliseconds)
})

watch(datetimeInput, (next, prev) => {
  if (!next || next === prev) return
  syncFromDatetime()
})
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <select v-model="timestampMode">
        <option value="ms">13 位毫秒</option>
        <option value="s">10 位秒级</option>
      </select>
      <button type="button" class="ghost-button" @click="fillNow">当前时间</button>
      <button type="button" class="ghost-button" @click="syncFromTimestamp">时间戳转时间</button>
      <button type="button" class="ghost-button" @click="syncFromDatetime">时间转时间戳</button>
      <button type="button" class="ghost-button" @click="swapValues">互换/回填</button>
    </div>

    <div class="totp-form-grid">
      <label class="totp-field">
        <span>时间戳</span>
        <input v-model="timestampInput" type="text" placeholder="输入 10 位或 13 位时间戳" />
      </label>
      <label class="totp-field">
        <span>指定时间</span>
        <input v-model="datetimeInput" type="datetime-local" step="1" />
      </label>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="details" class="result-list">
      <div>
        <span>本地时间</span><strong>{{ details.local }}</strong>
      </div>
      <div>
        <span>ISO</span><strong>{{ details.iso }}</strong>
      </div>
      <div>
        <span>秒级时间戳</span><strong>{{ details.seconds }}</strong>
      </div>
      <div>
        <span>毫秒时间戳</span><strong>{{ details.milliseconds }}</strong>
      </div>
      <div>
        <span>日期</span><strong>{{ details.dateOnly }}</strong>
      </div>
      <div>
        <span>时间</span><strong>{{ details.timeOnly }}</strong>
      </div>
    </div>
    <p v-else class="muted-text">请输入有效时间戳，或选择指定日期时间。</p>
  </div>
</template>
