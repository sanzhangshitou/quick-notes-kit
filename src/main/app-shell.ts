import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { APP_NAME } from './config'
import { getTrayIconPath, getWindowIconPath, linuxWindowIcon } from './icon-paths'

export class AppShell {
  private mainWindow: BrowserWindow | null = null
  private tray: Tray | null = null
  private isQuiting = false

  createWindow(): void {
    const windowIconPath = getWindowIconPath()
    this.mainWindow = new BrowserWindow({
      title: APP_NAME,
      width: 1440,
      height: 920,
      minWidth: 1100,
      minHeight: 760,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon: linuxWindowIcon } : {}),
      ...(process.platform === 'win32' && windowIconPath ? { icon: windowIconPath } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    this.mainWindow.on('ready-to-show', () => {
      if (process.platform === 'win32' && windowIconPath) {
        this.mainWindow?.setIcon(windowIconPath)
      }
      this.mainWindow?.show()
      this.updateTrayMenu()
    })

    this.mainWindow.on('close', (event) => {
      if (this.isQuiting || process.platform === 'darwin') return
      event.preventDefault()
      this.mainWindow?.hide()
      this.updateTrayMenu()
    })

    this.mainWindow.on('show', () => this.updateTrayMenu())
    this.mainWindow.on('hide', () => this.updateTrayMenu())
    this.mainWindow.on('minimize', () => this.updateTrayMenu())

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  createTray(): void {
    if (this.tray) return

    const trayIcon = nativeImage.createFromPath(getTrayIconPath()).resize({ width: 16, height: 16 })
    this.tray = new Tray(trayIcon)
    this.tray.on('click', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide()
      } else {
        this.showWindow('/')
      }
      this.updateTrayMenu()
    })
    this.tray.on('double-click', () => this.showWindow('/tool/local-notes'))
    this.updateTrayMenu()
  }

  showWindow(route = '/'): void {
    if (!this.mainWindow) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }

    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
    }

    this.mainWindow.focus()
    void this.navigateTo(route)
  }

  markQuitting(): void {
    this.isQuiting = true
  }

  dispose(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private updateTrayMenu(): void {
    if (!this.tray) return

    const visible = this.mainWindow?.isVisible() ?? false
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: visible ? '隐藏主窗口' : '显示主窗口',
          click: () => {
            if (this.mainWindow?.isVisible()) {
              this.mainWindow.hide()
            } else {
              this.showWindow('/')
            }
          }
        },
        {
          label: '打开本地记事本',
          click: () => this.showWindow('/tool/local-notes')
        },
        {
          label: '新建笔记',
          click: () => this.showWindow('/tool/local-notes')
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            this.markQuitting()
            app.quit()
          }
        }
      ])
    )
    this.tray.setToolTip(APP_NAME)
  }

  private async navigateTo(route = '/'): Promise<void> {
    if (!this.mainWindow) return

    const hash = route.startsWith('/') ? route : `/${route}`

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const url = new URL(process.env['ELECTRON_RENDERER_URL'])
      url.hash = hash
      const nextUrl = url.toString()

      if (this.mainWindow.webContents.getURL() !== nextUrl) {
        await this.mainWindow.loadURL(nextUrl)
      } else {
        this.mainWindow.webContents.executeJavaScript(
          `window.location.hash = ${JSON.stringify(hash)}`
        )
      }
      return
    }

    const currentUrl = this.mainWindow.webContents.getURL()
    if (!currentUrl) {
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash })
      return
    }

    this.mainWindow.webContents.executeJavaScript(`window.location.hash = ${JSON.stringify(hash)}`)
  }
}
