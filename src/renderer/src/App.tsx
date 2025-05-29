import { useState, useEffect, useRef, type ReactElement } from 'react'
import { MacroConfig } from './types'
import MacroButton from './components/MacroButton'
import ConfigModal from './components/ConfigModal'

function App(): ReactElement {
  const [lastAction, setLastAction] = useState<string>('Waiting for input...')
  const [editingButton, setEditingButton] = useState<number | null>(null)

  const defaultConfig: MacroConfig[] = [
    { id: 1, name: 'Button 1', description: 'コピー', type: 'shortcut', shortcut: 'Cmd+C' },
    { id: 2, name: 'Button 2', description: 'ペースト', type: 'shortcut', shortcut: 'Cmd+V' },
    { id: 3, name: 'Button 3', description: 'カット', type: 'shortcut', shortcut: 'Cmd+X' },
    { id: 4, name: 'Button 4', description: 'Undo', type: 'shortcut', shortcut: 'Cmd+Z' },
    { id: 5, name: 'Button 5', description: 'Redo', type: 'shortcut', shortcut: 'Cmd+Shift+Z' },
    { id: 6, name: 'Button 6', description: 'Save', type: 'shortcut', shortcut: 'Cmd+S' },
    { id: 7, name: 'Button 7', description: 'Select All', type: 'shortcut', shortcut: 'Cmd+A' },
    { id: 8, name: 'Button 8', description: 'Find', type: 'shortcut', shortcut: 'Cmd+F' }
  ]

  const [activeApp, setActiveApp] = useState<string>('default')
  const [selectedApp, setSelectedApp] = useState<string>('default')
  const [configsByApp, setConfigsByApp] = useState<Record<string, MacroConfig[]>>({
    default: defaultConfig
  })

  const currentConfigs = configsByApp[selectedApp] ?? configsByApp['default']

  // refs for stable access inside single effect
  const configsRef = useRef(configsByApp)
  const activeAppRef = useRef(activeApp)

  useEffect(() => {
    configsRef.current = configsByApp
  }, [configsByApp])

  useEffect(() => {
    activeAppRef.current = activeApp
  }, [activeApp])

  const [addOptions, setAddOptions] = useState<string[]>([])
  const [selectedNewApp, setSelectedNewApp] = useState<string | null>(null)

  const handleAddApp = async (): Promise<void> => {
    const api = window.electronAPI
    if (!api?.listWindows) return

    const windows = await api.listWindows()
    if (!windows || windows.length === 0) return

    const unregistered = windows.filter((id) => !(id in configsByApp))
    if (unregistered.length === 0) {
      return // nothing to add
    }

    setAddOptions(unregistered)
    setSelectedNewApp(unregistered[0])
  }

  const confirmAddApp = (): void => {
    if (!selectedNewApp) return
    setConfigsByApp((prev) => ({
      ...prev,
      [selectedNewApp]: [
        { id: 1, name: 'Button 1', description: '', type: 'empty' },
        { id: 2, name: 'Button 2', description: '', type: 'empty' },
        { id: 3, name: 'Button 3', description: '', type: 'empty' },
        { id: 4, name: 'Button 4', description: '', type: 'empty' },
        { id: 5, name: 'Button 5', description: '', type: 'empty' },
        { id: 6, name: 'Button 6', description: '', type: 'empty' },
        { id: 7, name: 'Button 7', description: '', type: 'empty' },
        { id: 8, name: 'Button 8', description: '', type: 'empty' }
      ]
    }))
    setSelectedApp(selectedNewApp)
    setAddOptions([])
    setSelectedNewApp(null)
  }

  // Register IPC listeners once
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const hidHandler = (code: number): void => {
      const activeCfgs = configsRef.current[activeAppRef.current] ?? configsRef.current['default']
      let config = activeCfgs.find((c) => c.id === code)
      if ((!config || config.type === 'empty') && activeAppRef.current !== 'default') {
        config = configsRef.current['default'].find((c) => c.id === code)
      }
      if (config) {
        if (config.type === 'shortcut' && config.shortcut) {
          api.runMacro(config.shortcut)
        } else if (config.type === 'ae' && config.aeCommand) {
          api.runAe(config.aeCommand, config.aeArgs ? JSON.parse(config.aeArgs) : {})
        }
        setLastAction(
          `Button ${config.name}: ${config.description} (${config.shortcut || config.aeCommand})`
        )
      } else {
        setLastAction(`Unassigned - HID code: ${code}`)
      }
    }

    api.onHid(hidHandler)

    api.onDeviceStatus?.((state: string) => {
      setLastAction(`Device ${state}`)
    })

    api.onActiveApp?.((appId: string) => setActiveApp(appId || 'default'))

    // No cleanup necessary since we register only once and live for app's lifetime
  }, [])

  const updateMacroConfig = (id: number, updates: Partial<MacroConfig>): void => {
    setConfigsByApp((prev) => {
      const current = prev[selectedApp] ?? prev['default']
      const updated = current.map((config) =>
        config.id === id ? { ...config, ...updates } : config
      )
      return { ...prev, [selectedApp]: updated }
    })
  }

  const Modal = ({
    buttonId,
    onClose
  }: {
    buttonId: number
    onClose: () => void
  }): ReactElement => {
    const config = currentConfigs.find((c) => c.id === buttonId)!

    const handleSave = (updated: MacroConfig): void => {
      updateMacroConfig(buttonId, updated)
    }

    return <ConfigModal config={config} onSave={handleSave} onClose={onClose} />
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-100">HID Macro Controller</h1>
          <p className="text-gray-400 text-sm">Professional Macro Management System</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-5 mb-6 border border-gray-700">
          <h2 className="text-lg font-medium text-gray-100 mb-3">Status</h2>
          <p className="font-mono text-blue-400 text-sm">{lastAction}</p>
          <p className="text-gray-400 text-xs mt-1">
            Active Window: <span className="text-gray-200 font-mono">{activeApp}</span>
          </p>
        </section>

        <div className="flex items-center justify-center gap-4 mb-6">
          <label className="text-gray-300 text-sm">Selected App:</label>
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="px-3 py-1 bg-gray-700 border border-gray-500 rounded text-gray-100"
          >
            {Object.keys(configsByApp).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          {addOptions.length === 0 ? (
            <button
              onClick={handleAddApp}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + Add App
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedNewApp ?? ''}
                onChange={(e) => setSelectedNewApp(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-500 rounded text-gray-100"
              >
                {addOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button
                onClick={confirmAddApp}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <section className="bg-gray-800 rounded-lg p-5 mb-6 border border-gray-700">
          <h2 className="text-lg font-medium text-gray-100 mb-4">Macro Buttons</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {currentConfigs.map((cfg) => (
              <MacroButton key={cfg.id} cfg={cfg} onClick={() => setEditingButton(cfg.id)} />
            ))}
          </div>
        </section>

        {editingButton && <Modal buttonId={editingButton} onClose={() => setEditingButton(null)} />}
      </div>
    </div>
  )
}

export default App
