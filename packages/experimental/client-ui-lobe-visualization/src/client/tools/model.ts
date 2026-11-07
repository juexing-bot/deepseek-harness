/** Pure presentation derivation from streamed arguments and persisted tool results. */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/** Visible lifecycle, including process failures inside successful tool envelopes. */
export type ToolStage = 'preparing' | 'running' | 'success' | 'error' | 'stopped'

/** Display data; all source strings remain uninterpreted text. */
export interface ToolCardModel {
  stage: ToolStage
  summary: string
  command: string | undefined
  path: string | undefined
  oldText: string | undefined
  newText: string | undefined
  rawInput: string | undefined
  output: string | undefined
  failure: string | undefined
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * Derive tool-card text without accessing services or changing execution data.
 * @param props - Host tool owner props at their current phase.
 * @returns Unlocalized card data with raw input and output retained.
 */
export function toolCardModel(props: Pick<ToolCallViewProps, 'block' | 'toolName'>): ToolCardModel {
  const { block, toolName } = props
  const done = 'kind' in block
  const rawInput = done ? block.call?.argsRaw : block.phase === 'start' ? block.argsRaw : undefined
  const command = block.args.text('command')
  const requestedPath = block.args.text('file_path')
  const oldText = block.args.text('old_string')
  const newText = block.args.text('new_string')
  const meta = done ? record(block.meta) : undefined
  const output = done ? block.content.map(part => part.type === 'text' ? part.text : JSON.stringify(part)).join('\n') : undefined
  const raw = output ?? ''
  const interrupted = done && (block.error?.code === 'ABORTED' || block.error?.code === 'ABORTED_BEFORE_DISPATCH'
    || meta?.aborted === true
    || typeof meta?.stopped === 'string' || /(?:^|\n)\[stopped: [^\n]*\](?:\n|$)/.test(raw))
  // Bash presentation metadata currently records cwd; process status is in raw result markers.
  const processFailed = toolName === 'bash' && (meta?.timedOut === true
    || meta?.exitCode === null || typeof meta?.exitCode === 'number' && meta.exitCode !== 0
    || typeof meta?.signal === 'string'
    || /(?:^|\n)\[exit code: (?!0\])(?:-?\d+|null)\](?:\n|$)/.test(raw)
    || /(?:^|\n)\[(?:(?:shell )?killed by signal: [^\n]+|timed out after [^\n]+)\](?:\n|$)/.test(raw)
    || /(?:^|\n)\[Command finished with exit code (?!0\])-?\d+\](?:\n|$)/.test(raw)
    || /(?:^|\n)\[(?:Command timed out or OOM|shell exited(?:: [^\n]+)?)\](?:\n|$)/.test(raw))
  const background = toolName === 'bash' && (/^started background job \S+$/.test(raw)
    || /(?:^|\n)\[still running after [^\n]+\](?:\n|$)/.test(raw))
  const failed = done && (block.isError || meta?.stopped === true || processFailed)
  const stage: ToolStage = !done ? block.phase === 'preparing' ? 'preparing' : 'running'
    : interrupted ? 'stopped' : failed ? 'error' : background ? 'running' : 'success'
  const path = text(meta?.path) ?? requestedPath
  const failure = done && (stage === 'error' || stage === 'stopped')
    ? block.error?.reason ?? output?.split('\n').find(line => line.trim() !== '') ?? block.error?.code
    : undefined
  return {
    stage,
    summary: block.args.text('description') ?? (toolName === 'edit' ? path : command) ?? '',
    command,
    path,
    oldText,
    newText,
    rawInput,
    output,
    failure,
  }
}
