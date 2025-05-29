import { app, BrowserWindow, ipcMain, shell } from 'electron'
import HID from 'node-hid'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import { WebSocketServer, WebSocket as WsSocket } from 'ws'
import { ActiveWindow } from '@paymoapp/active-window'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { openWindowsSync } from 'get-windows'

const VENDOR_ID = 0xf055
const PRODUCT_ID = 0xcafe

let win: BrowserWindow | null = null

const modifierMap: Record<string, Key> = {
  cmd: Key.LeftCmd,
  command: Key.LeftCmd,
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  shift: Key.LeftShift,
  alt: Key.LeftAlt,
  option: Key.LeftAlt
}

interface ActiveWinInfo {
  application: string
  title: string
}

function charToKey(ch: string): Key | null {
  const upper = ch.toUpperCase()

  if (upper.length === 1 && upper >= 'A' && upper <= 'Z') {
    return (Key as unknown as Record<string, Key>)[upper] ?? null
  }

  if (/^F\d{1,2}$/i.test(upper)) {
    return (Key as unknown as Record<string, Key>)[upper] ?? null
  }

  if (upper === 'SPACE') return Key.Space

  return null
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  win.on('ready-to-show', () => {
    win!.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win!.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win!.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function runShortcut(shortcut: string): Promise<void> {
  const tokens = shortcut.split('+').map((t) => t.trim().toLowerCase())
  const keys: Key[] = []
  tokens.forEach((tok) => {
    if (modifierMap[tok]) {
      keys.push(modifierMap[tok])
    } else {
      const k = charToKey(tok.toUpperCase())
      if (k) keys.push(k)
    }
  })
  if (keys.length) {
    await keyboard.type(...keys)
  }
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.electron')

  // Watch shortcuts (F12 toggle devtools, disable reload in production, etc.)
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  const devInfo = HID.devices().find((d) => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID)

  if (!devInfo) {
    console.error('HID device not found')
    if (win && !win.webContents.isDestroyed()) {
      win.webContents.send('device-status', 'disconnected')
    }
    return
  }

  const device = new HID.HID(devInfo.path!)
  console.log(`[Main] HID device found: ${devInfo.path}`)
  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send('device-status', 'connected')
  }

  device.on('data', (data) => {
    const code = data[0] // 1 バイト目をボタン ID と想定
    console.log(`[Main] HID data received: ${data.toString('hex')}, extracted code: ${code}`)
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      console.log(
        `[Main] Attempting to send 'hid-event' to webContents ID: ${win.webContents.id}. Page loading: ${win.webContents.isLoading()}`
      )
      win.webContents.send('hid-event', code)
    } else {
      console.error('[Main] Cannot send "hid-event":')
      if (!win) {
        console.error('[Main] - BrowserWindow "win" is null.')
      } else if (!win.webContents) {
        console.error('[Main] - win.webContents is null or undefined.')
      } else if (win.webContents.isDestroyed()) {
        console.error(`[Main] - win.webContents ID: ${win.webContents.id} is destroyed.`)
      }
    }
  })

  device.on('error', (err) => {
    console.error('[Main] HID device error:', err)
    if (win && !win.webContents.isDestroyed()) {
      win.webContents.send('device-status', 'disconnected')
    }
  })

  // Re-create a window when the dock icon is clicked and there are no other windows open (macOS).
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// WebSocket server for After Effects CEP panel
const WSS_PORT = 9234
const wss = new WebSocketServer({ port: WSS_PORT })
const aeClients = new Set<WsSocket>()

wss.on('connection', (socket: WsSocket) => {
  console.log('[WS] AE panel connected')
  aeClients.add(socket)
  socket.on('close', () => {
    aeClients.delete(socket)
    console.log('[WS] AE panel disconnected')
  })
})

ipcMain.handle('run-macro', (_e, shortcut: string) => runShortcut(shortcut))
ipcMain.handle(
  'run-ae',
  (_e: Electron.IpcMainInvokeEvent, cmd: string, args: Record<string, unknown> = {}) => {
    const payload = JSON.stringify({ cmd, args: args ?? {} })
    console.log('[WS] send to AE', payload)
    aeClients.forEach((sock: WsSocket) => {
      if (sock.readyState === sock.OPEN) {
        sock.send(payload)
      }
    })
  }
)

// Monitor active window changes every 1 second
ActiveWindow.initialize()
if (process.platform === 'darwin') {
  if (!ActiveWindow.requestPermissions()) {
    console.warn(
      '[ActiveWindow] Screen recording permission not granted. Window titles may be empty.'
    )
  }
}

let lastWindowId: string | null = null
const windowHistory = new Set<string>()
ActiveWindow.subscribe((winInfo: ActiveWinInfo | null) => {
  if (!winInfo) return
  const identifier = winInfo.application
  if (identifier !== lastWindowId) {
    lastWindowId = identifier
    console.log(`[ActiveWindow] ${identifier}`)
    windowHistory.add(identifier)
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('active-app', identifier)
    }
  }
})

// IPC to list currently open windows via `get-windows` (ESM module)
ipcMain.handle('list-windows', async () => {
  try {
    const wins = openWindowsSync({
      accessibilityPermission: true,
      screenRecordingPermission: true
    })
    console.log('[Main] list-windows', wins)
    const ids = wins.map((w: any) => w.owner?.name || '').filter((id: string) => id)
    return Array.from(new Set(ids)) as string[]
  } catch (err) {
    console.error('[Main] list-windows error:', err)
    return Array.from(windowHistory)
  }
})
