export type MacroType = 'empty' | 'shortcut' | 'ae'

export interface MacroConfig {
  id: number
  name: string
  description: string
  type: MacroType
  shortcut?: string
  aeCommand?: string
  aeArgs?: string
}
