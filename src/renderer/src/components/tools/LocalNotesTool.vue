<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface NoteRecord {
  id: number
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const notes = ref<NoteRecord[]>([])
const selectedId = ref<number | null>(null)
const title = ref('')
const content = ref('')
const tagsInput = ref('')
const search = ref('')
const saving = ref(false)
const loading = ref(false)
const message = ref('')
const saveState = ref<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
const syncingEditor = ref(false)
const editorMode = ref<'empty' | 'draft' | 'existing'>('empty')
const titleInputRef = ref<HTMLInputElement | null>(null)
const baseline = ref({
  title: '',
  content: '',
  tagsInput: ''
})
let autosaveTimer: ReturnType<typeof setTimeout> | null = null

const selectedNote = computed(
  () => notes.value.find((item) => item.id === selectedId.value) ?? null
)
const isDirty = computed(() => {
  return (
    title.value !== baseline.value.title ||
    content.value !== baseline.value.content ||
    tagsInput.value !== baseline.value.tagsInput
  )
})
const canPersist = computed(() => {
  return Boolean(
    title.value.trim() || content.value.trim() || parseTags(tagsInput.value).length > 0
  )
})
const filteredNotes = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return notes.value
  return notes.value.filter((note) => {
    return `${note.title}\n${note.content}\n${note.tags.join(' ')}`.toLowerCase().includes(keyword)
  })
})

function applyNote(note: NoteRecord | null): void {
  syncingEditor.value = true
  selectedId.value = note?.id ?? null
  title.value = note?.title ?? ''
  content.value = note?.content ?? ''
  tagsInput.value = note?.tags.join(', ') ?? ''
  baseline.value = {
    title: title.value,
    content: content.value,
    tagsInput: tagsInput.value
  }
  editorMode.value = note ? 'existing' : 'empty'
  saveState.value = 'idle'
  queueMicrotask(() => {
    syncingEditor.value = false
  })
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

async function loadNotes(): Promise<void> {
  loading.value = true
  try {
    const result = await window.api.notes.list()
    notes.value = result
    applyNote(result[0] ?? null)
    message.value = result.length === 0 ? '还没有笔记，先新建一条。' : ''
  } finally {
    loading.value = false
  }
}

async function createDraft(): Promise<void> {
  await persistPendingChanges()
  syncingEditor.value = true
  selectedId.value = null
  title.value = ''
  content.value = ''
  tagsInput.value = ''
  baseline.value = {
    title: '',
    content: '',
    tagsInput: ''
  }
  editorMode.value = 'draft'
  saveState.value = 'idle'
  message.value = '新建草稿，保存后写入 SQLite。'
  queueMicrotask(() => {
    syncingEditor.value = false
  })
  await nextTick()
  titleInputRef.value?.focus()
}

async function saveNote(): Promise<void> {
  if (!canPersist.value) return
  saving.value = true
  saveState.value = 'saving'
  try {
    const wasDraft = editorMode.value === 'draft' || selectedId.value == null
    const payload = {
      title: title.value.trim() || buildFallbackTitle(),
      content: content.value,
      tags: parseTags(tagsInput.value)
    }

    const saved = wasDraft
      ? await window.api.notes.create(payload)
      : selectedId.value == null
        ? await window.api.notes.create(payload)
        : await window.api.notes.update({
            id: selectedId.value,
            ...payload
          })

    notes.value = wasDraft
      ? [saved, ...notes.value]
      : notes.value.map((item) => (item.id === saved.id ? saved : item))

    notes.value.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    applyNote(saved)
    message.value = wasDraft ? '草稿已保存到 SQLite。' : '笔记已保存到 SQLite。'
    saveState.value = 'saved'
  } finally {
    saving.value = false
  }
}

async function deleteNote(): Promise<void> {
  if (editorMode.value === 'draft') {
    applyNote(notes.value[0] ?? null)
    message.value = '草稿已丢弃。'
    return
  }
  if (selectedId.value == null) return
  const id = selectedId.value
  saving.value = true
  try {
    await window.api.notes.delete(id)
    notes.value = notes.value.filter((item) => item.id !== id)
    const fallback = filteredNotes.value[0] ?? notes.value[0] ?? null
    applyNote(fallback)
    message.value = notes.value.length === 0 ? '笔记已删除，当前没有内容。' : '笔记已删除。'
  } finally {
    saving.value = false
  }
}

async function pickNote(note: NoteRecord): Promise<void> {
  await persistPendingChanges(note.id)
  applyNote(note)
  message.value = ''
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
}

async function exportNote(format: 'md' | 'txt'): Promise<void> {
  if (editorMode.value === 'draft' && canPersist.value) {
    await saveNote()
  }
  if (!selectedNote.value) return
  const result = await window.api.notes.export({
    title: title.value.trim() || '未命名笔记',
    content: content.value,
    tags: parseTags(tagsInput.value),
    format
  })
  message.value = result.canceled ? '已取消导出。' : `已导出到 ${result.filePath}`
}

function buildFallbackTitle(): string {
  const firstLine = content.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  return firstLine?.slice(0, 24) || `未命名笔记 ${notes.value.length + 1}`
}

async function persistPendingChanges(nextNoteId?: number): Promise<void> {
  if (!isDirty.value || !canPersist.value || syncingEditor.value) return
  await saveNote()
  if (typeof nextNoteId === 'number') {
    const saved = notes.value.find((item) => item.id === nextNoteId)
    if (saved) {
      applyNote(saved)
    }
  }
}

async function onKeydown(event: KeyboardEvent): Promise<void> {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    await saveNote()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void loadNotes()
})

watch([title, content, tagsInput], () => {
  if ((editorMode.value === 'empty' && !selectedNote.value) || loading.value || syncingEditor.value)
    return
  saveState.value = 'dirty'
  message.value = '正在编辑...'
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    if (canPersist.value) {
      void saveNote()
    }
  }, 900)
})

watch(search, () => {
  if (editorMode.value !== 'existing' || !selectedId.value) return
  const exists = filteredNotes.value.some((item) => item.id === selectedId.value)
  if (!exists) {
    applyNote(filteredNotes.value[0] ?? null)
  }
})

onBeforeUnmount(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <button type="button" class="ghost-button" :disabled="saving" @click="createDraft">
        新建笔记
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="saving || !canPersist"
        @click="saveNote"
      >
        保存
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="saving || editorMode === 'empty'"
        @click="deleteNote"
      >
        {{ editorMode === 'draft' ? '丢弃草稿' : '删除' }}
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="!selectedNote"
        @click="exportNote('md')"
      >
        导出 Markdown
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="!selectedNote"
        @click="exportNote('txt')"
      >
        导出 TXT
      </button>
      <span v-if="editorMode !== 'empty'" class="tag">
        {{
          saveState === 'saving'
            ? '保存中'
            : saveState === 'saved'
              ? '已保存'
              : saveState === 'dirty'
                ? '待保存'
                : '已同步'
        }}
      </span>
      <span v-if="message" class="muted-text">{{ message }}</span>
    </div>

    <div class="notes-layout">
      <aside class="notes-sidebar">
        <input v-model="search" type="text" placeholder="搜索标题或内容" />
        <div v-if="loading" class="notes-empty">正在加载笔记...</div>
        <button
          v-for="note in filteredNotes"
          :key="note.id"
          type="button"
          class="note-list-item"
          :class="{ active: note.id === selectedId }"
          @click="void pickNote(note)"
        >
          <strong>{{ note.title || '未命名笔记' }}</strong>
          <span>{{ formatDate(note.updatedAt) }}</span>
          <div v-if="note.tags.length > 0" class="note-tag-row">
            <span v-for="tag in note.tags" :key="`${note.id}-${tag}`" class="note-tag-chip"
              >#{{ tag }}</span
            >
          </div>
          <p>{{ note.content.trim() || '空白内容' }}</p>
        </button>
        <div v-if="!loading && notes.length === 0" class="notes-empty">
          没有笔记，点击“新建笔记”开始。
        </div>
        <div v-else-if="!loading && filteredNotes.length === 0" class="notes-empty">
          没有匹配当前搜索条件的笔记。
        </div>
      </aside>

      <section class="notes-editor">
        <template v-if="editorMode !== 'empty'">
          <input ref="titleInputRef" v-model="title" type="text" placeholder="笔记标题" />
          <input
            v-model="tagsInput"
            type="text"
            placeholder="标签，使用英文逗号分隔，例如 工作, 临时, 想法"
          />
          <div v-if="parseTags(tagsInput).length > 0" class="note-tag-row">
            <span v-for="tag in parseTags(tagsInput)" :key="tag" class="note-tag-chip"
              >#{{ tag }}</span
            >
          </div>
          <div v-if="selectedNote" class="notes-meta">
            <span>创建于 {{ formatDate(selectedNote.createdAt) }}</span>
            <span>更新于 {{ formatDate(selectedNote.updatedAt) }}</span>
          </div>
          <div v-else class="notes-meta">
            <span>当前为本地草稿</span>
            <span>按 `Ctrl/Cmd + S` 可立即保存</span>
          </div>
          <textarea
            v-model="content"
            rows="16"
            placeholder="记录你的内容，保存后将写入本地 SQLite 数据库。"
          />
        </template>
        <div v-else class="notes-empty notes-editor-empty">选择一条笔记，或先新建一条。</div>
      </section>
    </div>
  </div>
</template>
