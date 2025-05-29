import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

let onHidCallback: ((code: number) => void) | null = null
let onDeviceStatus: ((state: string) => void) | null = null

ipcRenderer.on('hid-event', (_e: IpcRendererEvent, code: number) => {
  if (onHidCallback) onHidCallback(code)
})

ipcRenderer.on('device-status', (_e: IpcRendererEvent, state: string) => {
  if (onDeviceStatus) onDeviceStatus(state)
})

contextBridge.exposeInMainWorld('electronAPI', {
  onHid: (cb: (code: number) => void): void => {
    onHidCallback = cb
  },
  runMacro: (name: string): Promise<void> => ipcRenderer.invoke('run-macro', name),
  runAe: (cmd: string, args: Record<string, unknown> = {}): Promise<void> =>
    ipcRenderer.invoke('run-ae', cmd, args),
  onDeviceStatus: (cb: (state: string) => void): void => {
    onDeviceStatus = cb
  },
  onActiveApp: (cb: (appId: string) => void): void => {
    ipcRenderer.on('active-app', (_e, appId) => cb(appId))
  },
  listWindows: (): Promise<string[]> => ipcRenderer.invoke('list-windows')
})
