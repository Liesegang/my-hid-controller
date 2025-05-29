declare module 'get-windows' {
  interface Bounds {
    x: number
    y: number
    width: number
    height: number
  }
  interface WindowOwner {
    name?: string
    bundleId?: string
    processId?: number
    path?: string
  }
  interface WindowInfo {
    title: string
    id: number
    bounds: Bounds
    owner: WindowOwner
  }
  export function openWindows(): Promise<WindowInfo[]>
  export function activeWindow(): Promise<WindowInfo | undefined>
}
