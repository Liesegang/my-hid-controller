import type { ReactElement } from 'react'
import { MacroConfig } from '../types'

const colorMap = {
  empty: 'bg-gray-600',
  shortcut: 'bg-blue-600',
  ae: 'bg-purple-600'
}

interface Props {
  cfg: MacroConfig
  onClick: () => void
}

const MacroButton = ({ cfg, onClick }: Props): ReactElement => {
  return (
    <div
      id={`button-${cfg.id}`}
      onClick={onClick}
      className="relative group cursor-pointer bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-blue-500"
    >
      <h3 className="text-base font-semibold text-gray-100 mb-1">{cfg.name}</h3>
      <p className="text-gray-400 text-xs mb-2">{cfg.description}</p>
      <span className={`text-xs px-2 py-0.5 rounded text-white ${colorMap[cfg.type]}`}>
        {cfg.type === 'shortcut' ? cfg.shortcut : cfg.aeCommand}
      </span>
      <p className="text-[10px] text-gray-500 mt-1">HID: {cfg.id}</p>
    </div>
  )
}

export default MacroButton
