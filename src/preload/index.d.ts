declare global {
  interface Window {
    electronAPI: {
      onHid: (cb: (code: number) => void) => void
      runMacro: (name: string) => Promise<void>
      runAe: (cmd: string, args?: Record<string, unknown>) => Promise<void>
      onDeviceStatus: (cb: (state: string) => void) => void
      onActiveApp: (cb: (appId: string) => void) => void
      listWindows: () => Promise<string[]>
    }
  }
}

export {}
