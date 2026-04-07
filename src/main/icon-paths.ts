import { existsSync } from 'node:fs'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

export function getWindowIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'resources', 'icon.png'),
    join(__dirname, '../../build/win/icon.ico'),
    join(__dirname, '../../resources/icon.png')
  ]

  return candidates.find((candidate) => existsSync(candidate))
}

export function getTrayIconPath(): string {
  if (process.platform !== 'win32') {
    return icon
  }

  const candidates = [
    join(process.resourcesPath, 'resources', 'tray-icon.png'),
    join(__dirname, '../../resources/tray-icon.png')
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? icon
}

export { icon as linuxWindowIcon }
