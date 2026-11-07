/** Typed labels shared by artifact registration and its component. */
export type ArtifactLocale = 'lobeArtifacts'

/** English artifact controls. */
export const en = {
  write: 'Write file', artifact: 'Artifact', pending: 'Waiting for arguments',
  preparing: 'Preparing', running: 'Running', success: 'Completed', error: 'Failed', stopped: 'Stopped',
  open: 'Open file', inspect: 'Inspect call', view: 'Artifact view', source: 'Source',
  preview: 'Interactive preview', reload: 'Restart preview', frame: 'Interactive artifact preview',
}
/** Simplified Chinese artifact controls. */
export const zh: Record<keyof typeof en, string> = {
  write: '写入文件', artifact: '交互产物', pending: '等待参数',
  preparing: '准备中', running: '运行中', success: '已完成', error: '失败', stopped: '已停止',
  open: '打开文件', inspect: '查看调用', view: '产物视图', source: '源码',
  preview: '交互预览', reload: '重新运行预览', frame: '交互产物预览',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Recorded file artifact controls. */
    lobeArtifacts: keyof typeof en
  }
}
