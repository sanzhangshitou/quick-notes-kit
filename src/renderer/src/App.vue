<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Base64Tool from './components/tools/Base64Tool.vue'
import ColorConverterTool from './components/tools/ColorConverterTool.vue'
import HashGeneratorTool from './components/tools/HashGeneratorTool.vue'
import JsonFormatterTool from './components/tools/JsonFormatterTool.vue'
import JsonPhpArrayTool from './components/tools/JsonPhpArrayTool.vue'
import LocalNotesTool from './components/tools/LocalNotesTool.vue'
import PasswordGeneratorTool from './components/tools/PasswordGeneratorTool.vue'
import RegexTesterTool from './components/tools/RegexTesterTool.vue'
import TextStatsTool from './components/tools/TextStatsTool.vue'
import TimestampConverterTool from './components/tools/TimestampConverterTool.vue'
import TotpManagerTool from './components/tools/TotpManagerTool.vue'
import UnitConverterTool from './components/tools/UnitConverterTool.vue'
import UrlCodecTool from './components/tools/UrlCodecTool.vue'
import { tools } from './data/tools'
import type { ToolId } from './types'
import ToolView from './views/ToolView.vue'

const currentToolId = ref<ToolId | null>(null)
const appVersion = ref('0.0.0')
const updateMessage = ref('')
const canRestartUpdate = ref(false)

const toolComponents = {
  'local-notes': LocalNotesTool,
  'totp-manager': TotpManagerTool,
  'json-php-array': JsonPhpArrayTool,
  'text-stats': TextStatsTool,
  'json-formatter': JsonFormatterTool,
  'timestamp-converter': TimestampConverterTool,
  base64: Base64Tool,
  'url-codec': UrlCodecTool,
  'password-generator': PasswordGeneratorTool,
  'hash-generator': HashGeneratorTool,
  'unit-converter': UnitConverterTool,
  'color-converter': ColorConverterTool,
  'regex-tester': RegexTesterTool
} as const

function syncFromHash(): void {
  const match = window.location.hash.match(/^#\/tool\/(.+)$/)
  const candidate = match?.[1]
  currentToolId.value = tools.some((item) => item.id === candidate) ? (candidate as ToolId) : null
}

function openTool(id: ToolId): void {
  window.location.hash = `/tool/${id}`
}

function backHome(): void {
  window.location.hash = '/'
}

const currentTool = computed(() => tools.find((item) => item.id === currentToolId.value) ?? null)
const currentComponent = computed(() =>
  currentToolId.value ? toolComponents[currentToolId.value] : null
)

onMounted(async () => {
  appVersion.value = await window.api.app.getVersion()
  const updateStatus = await window.api.app.getUpdateStatus()
  updateMessage.value = updateStatus.message
  canRestartUpdate.value = updateStatus.state === 'ready'

  const stopListening = window.api.app.onUpdateStatus((status) => {
    updateMessage.value = status.message
    canRestartUpdate.value = status.state === 'ready'
  })

  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
  window.addEventListener('beforeunload', stopListening, { once: true })
})

function restartUpdate(): void {
  if (!canRestartUpdate.value) return
  void window.api.app.restartToUpdate()
}
</script>

<template>
  <div v-if="!currentTool || !currentComponent" class="home-screen">
    <main class="page-shell">
      <section class="home-hero">
        <div class="home-eyebrow-row">
          <p class="eyebrow">轻记工具箱</p>
          <button
            v-if="updateMessage"
            type="button"
            class="update-chip"
            :class="{ actionable: canRestartUpdate }"
            @click="restartUpdate"
          >
            {{ updateMessage }}
            <span v-if="canRestartUpdate">立即重启</span>
          </button>
        </div>
        <h1>常用功能列表</h1>
        <p class="home-copy">首页只保留功能入口。选择一个工具后进入独立功能页。</p>
      </section>

      <section class="tool-list">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="tool-item"
          @click="openTool(tool.id)"
        >
          <span class="tool-category">{{ tool.category }}</span>
          <strong>{{ tool.name }}</strong>
          <span class="tool-summary">{{ tool.summary }}</span>
        </button>
      </section>
    </main>
    <p class="app-version">当前版本 {{ appVersion }}</p>
  </div>
  <ToolView v-else :tool="currentTool" :component="currentComponent" @back="backHome" />
</template>

<style scoped>
.home-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.update-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(29, 95, 208, 0.08);
  color: #1d5fd0;
  font-size: 0.78rem;
  line-height: 1;
}

.update-chip.actionable {
  background: rgba(29, 95, 208, 0.12);
}

.update-chip.actionable:hover {
  background: rgba(29, 95, 208, 0.18);
}

.update-chip span {
  font-weight: 600;
}

.app-version {
  width: min(1080px, calc(100vw - 32px));
  margin: -8px auto 24px;
  color: #617081;
  font-size: 0.9rem;
  text-align: right;
}

@media (max-width: 640px) {
  .app-version {
    width: min(100vw - 20px, 1080px);
    margin-bottom: 16px;
    font-size: 0.84rem;
  }

  .home-eyebrow-row {
    gap: 8px;
  }
}
</style>
