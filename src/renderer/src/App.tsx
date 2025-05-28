import { useState, useEffect, type ReactElement } from 'react'

type MacroType = 'shortcut' | 'ae'
interface MacroConfig {
  id: number
  name: string
  description: string
  type: MacroType
  shortcut?: string
  aeCommand?: string
  aeArgs?: string
}

function App(): ReactElement {
  const [lastAction, setLastAction] = useState<string>('Waiting for input...')
  const [isConfigMode, setIsConfigMode] = useState(false)
  const [editingButton, setEditingButton] = useState<number | null>(null)

  const [macroConfigs, setMacroConfigs] = useState<MacroConfig[]>([
    { id: 1, name: 'Button 1', description: 'コピー', type: 'shortcut', shortcut: 'Cmd+C' },
    { id: 2, name: 'Button 2', description: 'ペースト', type: 'shortcut', shortcut: 'Cmd+V' },
    { id: 4, name: 'Button 3', description: 'カット', type: 'shortcut', shortcut: 'Cmd+X' }
  ])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (api) {
      api.onHid((code: number) => {
        const config = macroConfigs.find((c) => c.id === code)
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
      })
    }
  }, [macroConfigs])

  const updateMacroConfig = (id: number, updates: Partial<MacroConfig>): void => {
    setMacroConfigs((prev) =>
      prev.map((config) => (config.id === id ? { ...config, ...updates } : config))
    )
  }

  const ConfigModal = ({
    buttonId,
    onClose
  }: {
    buttonId: number
    onClose: () => void
  }): ReactElement => {
    const config = macroConfigs.find((c) => c.id === buttonId)!

    const [tempConfig, setTempConfig] = useState(config)

    const handleSave = (): void => {
      updateMacroConfig(buttonId, tempConfig)
      onClose()
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6">Configure {config.name}</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-100 mb-2">Button Name</label>
              <input
                type="text"
                value={tempConfig.name}
                onChange={(e) => setTempConfig((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border bg-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-100 mb-2">Description</label>
              <input
                type="text"
                value={tempConfig.description}
                onChange={(e) =>
                  setTempConfig((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full px-3 py-2 border bg-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-100 mb-2">Type</label>
              <select
                value={tempConfig.type}
                onChange={(e) =>
                  setTempConfig((prev) => ({ ...prev, type: e.target.value as MacroType }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg"
              >
                <option value="shortcut">Shortcut</option>
                <option value="ae">AE Command</option>
              </select>
            </div>

            {tempConfig.type === 'shortcut' && (
              <div>
                <label className="block text-sm font-medium text-gray-100 mb-2">Shortcut</label>
                <input
                  type="text"
                  value={tempConfig.shortcut || ''}
                  onChange={(e) => setTempConfig((prev) => ({ ...prev, shortcut: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            {tempConfig.type === 'ae' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">AE Command</label>
                  <input
                    type="text"
                    value={tempConfig.aeCommand || ''}
                    onChange={(e) =>
                      setTempConfig((prev) => ({ ...prev, aeCommand: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Args (JSON)
                  </label>
                  <input
                    type="text"
                    value={tempConfig.aeArgs || ''}
                    onChange={(e) => setTempConfig((prev) => ({ ...prev, aeArgs: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-100">HID Macro Controller</h1>
          <p className="text-gray-400 text-sm">Professional Macro Management System</p>
        </header>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setIsConfigMode(!isConfigMode)}
            className={`px-5 py-2 rounded-md border transition-colors ${
              isConfigMode
                ? 'border-red-500 text-red-400 hover:bg-red-500/10'
                : 'border-blue-500 text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            {isConfigMode ? 'Exit Config' : 'Config Mode'}
          </button>
        </div>

        <section className="bg-gray-800 rounded-lg p-5 mb-6 border border-gray-700">
          <h2 className="text-lg font-medium text-gray-100 mb-3">Status</h2>
          <p className="font-mono text-blue-400 text-sm">{lastAction}</p>
        </section>

        <section className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <h2 className="text-lg font-medium text-gray-100 mb-4">Macro Buttons</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {macroConfigs.map((cfg) => (
              <div
                key={cfg.id}
                className="relative group bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-blue-500"
              >
                {isConfigMode && (
                  <button
                    onClick={() => setEditingButton(cfg.id)}
                    className="absolute top-2 right-2 text-xs text-gray-300 hover:text-white"
                  >
                    ⚙
                  </button>
                )}

                <h3 className="text-base font-semibold text-gray-100 mb-1">{cfg.name}</h3>
                <p className="text-gray-400 text-xs mb-2">{cfg.description}</p>
                <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded">
                  {cfg.shortcut || cfg.aeCommand}
                </span>
                <p className="text-[10px] text-gray-500 mt-1">HID: {cfg.id}</p>
              </div>
            ))}
          </div>
        </section>

        {editingButton && (
          <ConfigModal buttonId={editingButton} onClose={() => setEditingButton(null)} />
        )}
      </div>
    </div>
  )
}

export default App
