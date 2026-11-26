import { app, BrowserWindow, ipcMain } from 'electron';
import HID from 'node-hid';
import path from 'node:path';
import { keyboard, Key, mouse, Button } from '@nut-tree-fork/nut-js';
import { WebSocketServer, WebSocket as WsSocket } from 'ws';
import { ActiveWindow } from '@paymoapp/active-window';

const VENDOR_ID = 0xF055;
const PRODUCT_ID = 0xcafe;

let win: BrowserWindow | null = null;

const modifierMap: Record<string, Key> = {
  cmd: Key.LeftCmd,
  command: Key.LeftCmd,
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  shift: Key.LeftShift,
  alt: Key.LeftAlt,
  option: Key.LeftAlt,
};

function charToKey(ch: string): Key | null {
  const upper = ch.toUpperCase();
  if (upper.length === 1 && upper >= 'A' && upper <= 'Z') {
    return (Key as any)[upper] as Key;
  }
  if (/^F\d{1,2}$/i.test(upper)) {
    return (Key as any)[upper] as Key;
  }
  if (upper === 'SPACE') return Key.Space;
  return null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, '../preload/index.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }
}

async function runShortcut(shortcut: string) {
  const tokens = shortcut.split('+').map(t => t.trim().toLowerCase());
  const keys: Key[] = [];
  tokens.forEach(tok => {
    if (modifierMap[tok]) {
      keys.push(modifierMap[tok]);
    } else {
      const k = charToKey(tok.toUpperCase());
      if (k) keys.push(k);
    }
  });
  if (keys.length) {
    await keyboard.type(...keys);
  }
}

app.whenReady().then(() => {
  createWindow();

  const devInfo = HID.devices().find(
    (d) => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID
  );

  if (!devInfo) {
    console.error('HID デバイスが見つからないよ～');
    return;
  }

  const device = new HID.HID(devInfo.path!);
  device.on('data', (data) => {
    const code = data[0]; // 1 バイト目をボタン ID と想定
    console.log(`[Main] HID data received: ${data.toString('hex')}, extracted code: ${code}`);
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      console.log(`[Main] Attempting to send 'hid-event' to webContents ID: ${win.webContents.id}. Page loading: ${win.webContents.isLoading()}`);
      win.webContents.send('hid-event', code);
    } else {
      console.error('[Main] Cannot send "hid-event":');
      if (!win) {
        console.error('[Main] - BrowserWindow "win" is null.');
      } else if (!win.webContents) {
        // This case should ideally not happen if win is not null,
        // but good for exhaustive check.
        console.error('[Main] - win.webContents is null or undefined.');
      } else if (win.webContents.isDestroyed()) {
        console.error(`[Main] - win.webContents ID: ${win.webContents.id} is destroyed.`);
      }
      // It's also possible that webContents exists and is not destroyed,
      // but simply not ready for IPC yet, though `isLoading` helps check this.
    }
  });
});

// WebSocket server for After Effects CEP panel
const WSS_PORT = 9234;
const wss = new WebSocketServer({ port: WSS_PORT });
const aeClients = new Set<WsSocket>();

wss.on('connection', (socket: WsSocket) => {
  console.log('[WS] AE panel connected');
  aeClients.add(socket);
  socket.on('close', () => {
    aeClients.delete(socket);
    console.log('[WS] AE panel disconnected');
  });
});

ipcMain.handle('run-macro', (_e, shortcut: string) => runShortcut(shortcut));
ipcMain.handle('run-ae', (_e, cmd: string, args?: any) => {
  const payload = JSON.stringify({ cmd, args: args ?? {} });
  console.log('[WS] send to AE', payload);
  aeClients.forEach((sock: WsSocket) => {
    if (sock.readyState === sock.OPEN) {
      sock.send(payload);
    }
  });
});

// Monitor active window changes every 1 second
ActiveWindow.initialize();
if (process.platform === 'darwin') {
  // On macOS, ask for screen-recording permission if not already granted.
  if (!ActiveWindow.requestPermissions()) {
    console.warn('[ActiveWindow] Screen recording permission not granted. Window titles may be empty.');
  }
}

let lastWindowId: string | null = null;
// Use 'any' for winInfo to avoid type errors if type declarations are not resolved yet.
ActiveWindow.subscribe((winInfo: any) => {
  if (!winInfo) return;
  const identifier = `${winInfo.application}:${winInfo.title}`;
  if (identifier !== lastWindowId) {
    lastWindowId = identifier;
    console.log(`[ActiveWindow] ${identifier}`);
  }
});
