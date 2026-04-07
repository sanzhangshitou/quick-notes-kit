<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface TotpDisplayRecord {
  id: number
  issuer: string
  accountName: string
  digits: number
  period: number
  code: string
  remainingSeconds: number
}

const accounts = ref<TotpDisplayRecord[]>([])
const issuer = ref('')
const accountName = ref('')
const secret = ref('')
const digits = ref<6 | 8>(6)
const period = ref<30 | 60>(30)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const sortedAccounts = computed(() => accounts.value)

async function loadAccounts(): Promise<void> {
  loading.value = true
  try {
    accounts.value = await window.api.totp.list()
  } finally {
    loading.value = false
  }
}

async function createAccount(): Promise<void> {
  if (!secret.value.trim()) {
    message.value = '请先输入 Google 验证器提供的 Base32 密钥。'
    return
  }

  saving.value = true
  try {
    await window.api.totp.create({
      issuer: issuer.value,
      accountName: accountName.value,
      secret: secret.value,
      digits: digits.value,
      period: period.value
    })
    issuer.value = ''
    accountName.value = ''
    secret.value = ''
    digits.value = 6
    period.value = 30
    message.value = '已添加新的验证码账户。'
    await loadAccounts()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '添加失败，请检查密钥格式。'
  } finally {
    saving.value = false
  }
}

async function deleteAccount(id: number): Promise<void> {
  await window.api.totp.delete(id)
  message.value = '验证码账户已删除。'
  await loadAccounts()
}

async function exportBackup(): Promise<void> {
  const result = await window.api.totp.exportBackup()
  message.value = result.canceled
    ? '已取消导出。'
    : `已导出 ${result.count} 条验证码到 ${result.filePath}`
}

async function importBackup(): Promise<void> {
  try {
    const result = await window.api.totp.importBackup()
    if (result.canceled) {
      message.value = '已取消导入。'
      return
    }

    await loadAccounts()
    message.value = `导入完成：新增 ${result.imported} 条，忽略 ${result.skipped} 条已存在账户。`
  } catch (error) {
    message.value = error instanceof Error ? error.message : '导入失败，请检查备份文件。'
  }
}

async function copyCode(code: string): Promise<void> {
  await navigator.clipboard.writeText(code)
  message.value = `验证码 ${code} 已复制。`
}

function progressWidth(account: TotpDisplayRecord): string {
  return `${(account.remainingSeconds / account.period) * 100}%`
}

onMounted(() => {
  void loadAccounts()
  refreshTimer = setInterval(() => {
    void loadAccounts()
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="tool-panel">
    <div class="totp-layout">
      <section class="totp-form-card">
        <h2>添加账户</h2>
        <input v-model="issuer" type="text" placeholder="服务名称，例如 Google / GitHub" />
        <input v-model="accountName" type="text" placeholder="账号名称，例如 you@example.com" />
        <textarea
          v-model="secret"
          rows="5"
          spellcheck="false"
          placeholder="输入 Base32 密钥，支持带空格粘贴"
        />
        <div class="totp-form-grid">
          <label class="totp-field">
            <span>位数</span>
            <select v-model="digits">
              <option :value="6">6 位</option>
              <option :value="8">8 位</option>
            </select>
          </label>
          <label class="totp-field">
            <span>周期</span>
            <select v-model="period">
              <option :value="30">30 秒</option>
              <option :value="60">60 秒</option>
            </select>
          </label>
        </div>
        <button type="button" class="ghost-button" :disabled="saving" @click="createAccount">
          添加验证码
        </button>
        <p class="muted-text">密钥保存在本地 SQLite 中，仅用于本机生成验证码。</p>
      </section>

      <section class="totp-list-card">
        <div class="toolbar">
          <h2>验证码列表</h2>
          <div class="inline-actions">
            <button type="button" class="ghost-button" @click="importBackup">导入备份</button>
            <button type="button" class="ghost-button" @click="exportBackup">导出备份</button>
          </div>
        </div>
        <p v-if="message" class="muted-text">{{ message }}</p>
        <div v-if="loading" class="notes-empty">正在加载验证码...</div>
        <div v-else-if="sortedAccounts.length === 0" class="notes-empty">
          还没有验证码账户，先添加一条。
        </div>
        <div v-else class="totp-list">
          <article v-for="account in sortedAccounts" :key="account.id" class="totp-card">
            <div class="totp-card-head">
              <div>
                <strong>{{ account.issuer }}</strong>
                <p>{{ account.accountName }}</p>
              </div>
              <button type="button" class="ghost-button" @click="deleteAccount(account.id)">
                删除
              </button>
            </div>
            <div class="totp-code-row">
              <span class="totp-code">{{ account.code }}</span>
              <button type="button" class="ghost-button" @click="copyCode(account.code)">
                复制
              </button>
            </div>
            <div class="totp-meta-row">
              <span>{{ account.digits }} 位</span>
              <span>剩余 {{ account.remainingSeconds }} 秒</span>
            </div>
            <div class="totp-progress">
              <div class="totp-progress-bar" :style="{ width: progressWidth(account) }" />
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
