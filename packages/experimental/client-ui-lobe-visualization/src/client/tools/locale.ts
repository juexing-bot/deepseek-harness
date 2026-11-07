/** Typed copy owned by the expandable tool cards. */
export const en = {
  bash: 'Run command',
  edit: 'Edit file',
  preparing: 'Preparing',
  running: 'Running',
  success: 'Success',
  error: 'Failed',
  stopped: 'Stopped',
  command: 'Command',
  input: 'Raw input',
  output: 'Raw result',
  old: 'Old text',
  new: 'New text',
  inspect: 'Inspect call',
  openFile: 'Open file',
  noOutput: 'No result yet',
} satisfies Record<string, string>

/** Dictionary keys shared by all supported tool-card locales. */
export type LobeToolsKey = keyof typeof en

/** Simplified Chinese copy with the same keys as the English dictionary. */
export const zh = {
  bash: '执行命令',
  edit: '编辑文件',
  preparing: '准备中',
  running: '执行中',
  success: '成功',
  error: '失败',
  stopped: '已停止',
  command: '命令',
  input: '原始输入',
  output: '原始结果',
  old: '原文本',
  new: '新文本',
  inspect: '检查调用',
  openFile: '打开文件',
  noOutput: '尚无结果',
} satisfies Record<LobeToolsKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Expandable Bash and edit tool cards. */
    lobeTools: LobeToolsKey
  }
}
