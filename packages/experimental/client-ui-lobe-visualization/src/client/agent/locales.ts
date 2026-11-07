/** Typed copy for the session agent profile and declared configuration reader. */
export type AgentProfileKey =
  | 'entry' | 'title' | 'identity' | 'presetId' | 'fixed' | 'noPreset' | 'noPresetDetail'
  | 'configuration' | 'configurationDetail' | 'expand' | 'collapse' | 'readOnly'
  | 'readError' | 'retry' | 'loading' | 'close'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Session agent identity and read-only preset declaration. */
    lobeAgent: AgentProfileKey
  }
}

/** English profile dictionary. */
export const en: Record<AgentProfileKey, string> = {
  entry: 'Agent profile', title: 'Agent profile', identity: 'Current agent', presetId: 'Preset ID',
  fixed: 'This identity is read from the session’s recorded preset selection.',
  noPreset: 'No agent preset', noPresetDetail: 'This session has no recorded agent preset.',
  configuration: 'Declared configuration',
  configurationDetail: 'The YAML below is the preset’s current declaration, not a snapshot of this session’s running configuration.',
  expand: 'Show YAML', collapse: 'Hide YAML',
  readOnly: 'Read only. Configuration editing is unavailable here. Choose presets for new tasks in the native agent preset settings.',
  readError: 'Could not read the preset configuration', retry: 'Retry', loading: 'Reading configuration', close: 'Close',
}

/** Simplified Chinese profile dictionary. */
export const zh: Record<AgentProfileKey, string> = {
  entry: '角色与配置', title: '角色与配置', identity: '当前 Agent', presetId: '预设标识',
  fixed: '此身份来自会话记录的预设选择',
  noPreset: '无 Agent 预设', noPresetDetail: '此会话没有记录 Agent 预设',
  configuration: '预设声明配置',
  configurationDetail: '以下 YAML 是该预设当前的声明，不是此会话运行配置的历史快照',
  expand: '展开 YAML', collapse: '收起 YAML',
  readOnly: '只读。此处不支持编辑配置；新任务的预设可在原生设置的 Agent 预设中选择',
  readError: '无法读取预设配置', retry: '重试', loading: '正在读取配置', close: '关闭',
}
