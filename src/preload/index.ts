import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

let onHidCallback: ((code: number) => void) | null = null

ipcRenderer.on('hid-event', (_e: IpcRendererEvent, code: number) => {
  if (onHidCallback) onHidCallback(code)
})

contextBridge.exposeInMainWorld('electronAPI', {
  onHid: (cb: (code: number) => void): void => {
    onHidCallback = cb
  },
  runMacro: (name: string): Promise<void> => ipcRenderer.invoke('run-macro', name),
  runAe: (cmd: string, args: Record<string, unknown> = {}): Promise<void> =>
    ipcRenderer.invoke('run-ae', cmd, args)
})
