import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { AppShell } from './app-shell'
import { APP_ID, APP_NAME } from './config'
import { NotesDatabase } from './notes-db'
import { registerIpcHandlers } from './register-ipc'
import { TotpStore } from './totp-store'
import { getUpdateStatus, restartToInstallUpdate, setupAutoUpdater } from './updater'

const appShell = new AppShell()

let notesDb: NotesDatabase | null = null
let totpStore: TotpStore | null = null

app.whenReady().then(() => {
  notesDb = new NotesDatabase(join(app.getPath('userData'), 'notes.sqlite'))
  totpStore = new TotpStore(join(app.getPath('userData'), 'totp.sqlite'))

  app.setName(APP_NAME)
  electronApp.setAppUserModelId(APP_ID)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-update-status', () => getUpdateStatus())
  ipcMain.handle('app:restart-to-update', () => {
    restartToInstallUpdate()
  })

  registerIpcHandlers({
    notesDb,
    totpStore
  })

  appShell.createTray()
  appShell.createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      appShell.createWindow()
    } else {
      appShell.showWindow('/')
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  appShell.markQuitting()
  notesDb?.close()
  notesDb = null
  totpStore?.close()
  totpStore = null
  appShell.dispose()
})
