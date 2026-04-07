import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppMetaApi, NotesApi, TotpApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      app: AppMetaApi
      notes: NotesApi
      totp: TotpApi
    }
  }
}
