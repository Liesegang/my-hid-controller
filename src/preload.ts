import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

console.log('[Preload Script] Executing preload.ts');

let onHidCallback: ((code: number) => void) | null = null;

ipcRenderer.on('hid-event', (_e: IpcRendererEvent, code: number) => {
  console.log(`[Preload] ipcRenderer received 'hid-event', code: ${code}`);
  if (onHidCallback) {
    onHidCallback(code);
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  onHid: (cb: (code: number) => void) => {
    console.log('[Preload] electronAPI.onHid called, callback registered.');
    onHidCallback = cb;
  },
  runMacro: (name: string) => ipcRenderer.invoke('run-macro', name)
});
