import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

let updateEventsRegistered = false

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
  message: string
  version?: string
}

let currentUpdateStatus: UpdateStatus = {
  state: 'idle',
  message: ''
}

function broadcastUpdateStatus(status: UpdateStatus): void {
  currentUpdateStatus = status

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('app:update-status', status)
  }
}

export function getUpdateStatus(): UpdateStatus {
  return currentUpdateStatus
}

export function restartToInstallUpdate(): void {
  autoUpdater.quitAndInstall()
}

export function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  broadcastUpdateStatus({
    state: 'checking',
    message: '正在检查更新'
  })

  if (!updateEventsRegistered) {
    updateEventsRegistered = true

    autoUpdater.on('error', (error) => {
      console.error('[auto-updater] failed:', error)
      broadcastUpdateStatus({
        state: 'error',
        message: '更新检查失败'
      })
    })

    autoUpdater.on('update-available', (info) => {
      console.log(`[auto-updater] update available: ${info.version}`)
      broadcastUpdateStatus({
        state: 'downloading',
        message: `发现新版本 ${info.version}，正在下载`,
        version: info.version
      })
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[auto-updater] no update available')
      broadcastUpdateStatus({
        state: 'idle',
        message: ''
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log(`[auto-updater] download progress: ${Math.round(progress.percent)}%`)
      broadcastUpdateStatus({
        state: 'downloading',
        message: `新版本下载中 ${Math.round(progress.percent)}%`
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      broadcastUpdateStatus({
        state: 'ready',
        message: `有新版本 ${info.version}`,
        version: info.version
      })
    })
  }

  void autoUpdater.checkForUpdatesAndNotify()
}
