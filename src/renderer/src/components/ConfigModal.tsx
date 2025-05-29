import { useState, type ReactElement } from 'react'
import { MacroConfig, MacroType } from '../types'

interface Props {
  config: MacroConfig
  onSave: (updated: MacroConfig) => void
  onClose: () => void
}

const ConfigModal = ({ config, onSave, onClose }: Props): ReactElement => {
  const [tempConfig, setTempConfig] = useState<MacroConfig>({ ...config })

  const handleSave = (): void => {
    onSave(tempConfig)
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
              className="w-full px-3 py-2 border bg-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">Description</label>
            <input
              type="text"
              value={tempConfig.description}
              onChange={(e) => setTempConfig((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border bg-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">Type</label>
            <select
              value={tempConfig.type}
              onChange={(e) =>
                setTempConfig((prev) => ({ ...prev, type: e.target.value as MacroType }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg text-gray-100 placeholder-gray-400"
            >
              <option value="empty">Empty</option>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg text-gray-100 placeholder-gray-400"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg text-gray-100 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-100 mb-2">Args (JSON)</label>
                <input
                  type="text"
                  value={tempConfig.aeArgs || ''}
                  onChange={(e) => setTempConfig((prev) => ({ ...prev, aeArgs: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg text-gray-100 placeholder-gray-400"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-700/60 transition-colors"
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

export default ConfigModal
