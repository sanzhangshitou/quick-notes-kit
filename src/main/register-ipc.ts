import { dialog, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import type { NotesDatabase } from './notes-db'
import type { TotpStore } from './totp-store'

interface MainStores {
  notesDb: NotesDatabase
  totpStore: TotpStore
}

export function registerIpcHandlers({ notesDb, totpStore }: MainStores): void {
  ipcMain.handle('notes:list', () => notesDb.list())
  ipcMain.handle('notes:create', (_, input: { title: string; content: string; tags: string[] }) => {
    return notesDb.create(input)
  })
  ipcMain.handle(
    'notes:update',
    (_, payload: { id: number; title: string; content: string; tags: string[] }) => {
      return notesDb.update(payload.id, payload)
    }
  )
  ipcMain.handle('notes:delete', (_, id: number) => {
    notesDb.delete(id)
    return { ok: true }
  })
  ipcMain.handle(
    'notes:export',
    async (
      _,
      payload: { title: string; content: string; tags: string[]; format: 'md' | 'txt' }
    ) => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出笔记',
        defaultPath: `${payload.title || 'note'}.${payload.format}`,
        filters: [
          payload.format === 'md'
            ? { name: 'Markdown', extensions: ['md'] }
            : { name: 'Text', extensions: ['txt'] }
        ]
      })

      if (canceled || !filePath) {
        return { canceled: true }
      }

      const body =
        payload.format === 'md'
          ? `# ${payload.title || '未命名笔记'}\n\n${
              payload.tags.length > 0
                ? `标签：${payload.tags.map((tag) => `#${tag}`).join(' ')}\n\n`
                : ''
            }${payload.content}`
          : `${payload.title || '未命名笔记'}\n${
              payload.tags.length > 0 ? `标签: ${payload.tags.join(', ')}\n` : ''
            }\n${payload.content}`

      await writeFile(filePath, body, 'utf8')
      return { canceled: false, filePath }
    }
  )

  ipcMain.handle('totp:list', () => totpStore.list())
  ipcMain.handle(
    'totp:create',
    (
      _,
      input: {
        issuer: string
        accountName: string
        secret: string
        digits?: number
        period?: number
      }
    ) => {
      return totpStore.create(input)
    }
  )
  ipcMain.handle('totp:export-backup', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出验证码备份',
      defaultPath: 'quick-notes-kit-totp-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePath) {
      return { canceled: true, count: 0 }
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: totpStore.exportAll()
    }

    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { canceled: false, filePath, count: payload.accounts.length }
  })
  ipcMain.handle('totp:import-backup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '导入验证码备份',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || filePaths.length === 0) {
      return { canceled: true, imported: 0, skipped: 0 }
    }

    const content = await readFile(filePaths[0], 'utf8')
    const parsed = JSON.parse(content) as { accounts?: unknown }
    if (!Array.isArray(parsed.accounts)) {
      throw new Error('备份文件格式无效，缺少 accounts 数组')
    }

    const result = totpStore.importMany(
      parsed.accounts.map((item) => {
        const record = item as Record<string, unknown>
        return {
          issuer: String(record.issuer ?? ''),
          accountName: String(record.accountName ?? ''),
          secret: String(record.secret ?? ''),
          digits: Number(record.digits ?? 6),
          period: Number(record.period ?? 30)
        }
      })
    )

    return { canceled: false, filePath: filePaths[0], ...result }
  })
  ipcMain.handle('totp:delete', (_, id: number) => {
    totpStore.delete(id)
    return { ok: true }
  })
}
