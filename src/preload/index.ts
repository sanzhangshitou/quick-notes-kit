import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface NoteRecord {
  id: number
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface NotesApi {
  list: () => Promise<NoteRecord[]>
  create: (input: { title: string; content: string; tags: string[] }) => Promise<NoteRecord>
  update: (input: {
    id: number
    title: string
    content: string
    tags: string[]
  }) => Promise<NoteRecord>
  delete: (id: number) => Promise<{ ok: true }>
  export: (input: {
    title: string
    content: string
    tags: string[]
    format: 'md' | 'txt'
  }) => Promise<{ canceled: boolean; filePath?: string }>
}

export interface TotpDisplayRecord {
  id: number
  issuer: string
  accountName: string
  digits: number
  period: number
  code: string
  remainingSeconds: number
}

export interface TotpApi {
  list: () => Promise<TotpDisplayRecord[]>
  create: (input: {
    issuer: string
    accountName: string
    secret: string
    digits?: number
    period?: number
  }) => Promise<TotpDisplayRecord>
  delete: (id: number) => Promise<{ ok: true }>
  exportBackup: () => Promise<{ canceled: boolean; filePath?: string; count: number }>
  importBackup: () => Promise<{
    canceled: boolean
    filePath?: string
    imported: number
    skipped: number
  }>
}

export interface AppMetaApi {
  getVersion: () => Promise<string>
  getUpdateStatus: () => Promise<{
    state: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
    message: string
    version?: string
  }>
  restartToUpdate: () => Promise<void>
  onUpdateStatus: (
    listener: (payload: {
      state: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
      message: string
      version?: string
    }) => void
  ) => () => void
}

const api: { app: AppMetaApi; notes: NotesApi; totp: TotpApi } = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getUpdateStatus: () => ipcRenderer.invoke('app:get-update-status'),
    restartToUpdate: () => ipcRenderer.invoke('app:restart-to-update'),
    onUpdateStatus: (listener): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: {
          state: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
          message: string
          version?: string
        }
      ): void => listener(payload)

      ipcRenderer.on('app:update-status', handler)
      return () => {
        ipcRenderer.removeListener('app:update-status', handler)
      }
    }
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    create: (input) => ipcRenderer.invoke('notes:create', input),
    update: (input) => ipcRenderer.invoke('notes:update', input),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    export: (input) => ipcRenderer.invoke('notes:export', input)
  },
  totp: {
    list: () => ipcRenderer.invoke('totp:list'),
    create: (input) => ipcRenderer.invoke('totp:create', input),
    delete: (id) => ipcRenderer.invoke('totp:delete', id),
    exportBackup: () => ipcRenderer.invoke('totp:export-backup'),
    importBackup: () => ipcRenderer.invoke('totp:import-backup')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
