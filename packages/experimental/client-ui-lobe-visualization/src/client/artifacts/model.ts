/** Derive a recorded write's artifact without consulting current file contents. */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/** Write arguments and result facts admitted by the tool record. */
export interface ArtifactWrite {
  path: string | undefined
  openPath: string | undefined
  source: string | undefined
  raw: string
  output: string | undefined
  state: 'preparing' | 'running' | 'success' | 'error' | 'stopped'
  previewable: boolean
}

/**
 * Read a write call, permitting previews only after a successful HTML or SVG write.
 * @param props - Current tool phase and recorded block.
 * @returns Source and lifecycle facts; malformed arguments remain raw text.
 */
export function artifactWrite(props: Pick<ToolCallViewProps, 'phase' | 'block'>): ArtifactWrite {
  const { block } = props
  const raw = 'kind' in block ? block.call?.argsRaw ?? '' : block.phase === 'start' ? block.argsRaw : ''
  let args: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) args = parsed as Record<string, unknown>
  } catch {
    // Incomplete streamed arguments remain inspectable as their original text.
  }
  const path = typeof args.file_path === 'string' ? args.file_path : undefined
  const source = typeof args.content === 'string' ? args.content : undefined
  const meta = 'kind' in block ? block.meta as Record<string, unknown> | undefined : undefined
  const openPath = typeof meta?.path === 'string' ? meta.path : undefined
  const state = !('kind' in block) ? block.phase === 'preparing' ? 'preparing' : 'running'
    : meta?.stopped === true ? 'stopped' : block.isError ? 'error' : 'success'
  const output = 'kind' in block
    ? block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item)).join('\n')
      || (block.error === undefined ? '' : JSON.stringify(block.error))
    : undefined
  return { path, openPath, source, raw, state, output,
    previewable: state === 'success' && source !== undefined && source !== '' && /\.(?:html?|svg)$/i.test(path ?? ''),
  }
}

/**
 * Isolate an HTML or SVG source with a restrictive document policy.
 * @param source - Recorded file content.
 * @returns A complete iframe document; no Host callback or credential is embedded.
 */
export function artifactDocument(source: string): string {
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>html{color-scheme:light;background:Canvas;color:CanvasText}</style>${source}`
}
