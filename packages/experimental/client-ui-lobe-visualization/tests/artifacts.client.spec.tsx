// @vitest-environment jsdom
/** Recorded artifact eligibility and opt-in iframe lifecycle. */
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { ArtifactCard } from '../src/client/artifacts/ArtifactCard.tsx'
import { artifactDocument, artifactWrite } from '../src/client/artifacts/model.ts'

const source = '<h1>Counter</h1><button onclick="this.textContent=1">0</button>'
const t = (key: string) => key
function record(path = '/tmp/counter.html', failed = false): ToolCallViewProps {
  return {
    phase: 'result', callId: 'write-1', toolName: 'write',
    block: { kind: 'tool-result', call: { name: 'write', argsRaw: JSON.stringify({ file_path: path, content: source }) },
      content: [{ type: 'text', text: failed ? 'write denied' : 'written' }], isError: failed,
      meta: failed ? {} : { path },
    },
    openFile() {},
    useDisclosure() {
      const [expanded, setExpanded] = useState(true)
      return { expanded, toggle: () => { setExpanded(value => !value) } }
    },
  } as ToolCallViewProps
}
afterEach(cleanup)

describe('recorded artifacts', () => {
  it.each(['/tmp/counter.html', '/tmp/drawing.svg', '/tmp/report.htm'])('admits a successfully recorded %s source', (path) => {
    expect(artifactWrite(record(path))).toMatchObject({ state: 'success', previewable: true, source })
  })
  it('keeps failed writes, unsupported formats and malformed arguments in source mode', () => {
    expect(artifactWrite(record('/tmp/counter.html', true)).previewable).toBe(false)
    expect(artifactWrite(record('/tmp/code.tsx')).previewable).toBe(false)
    const props = record()
    if ('kind' in props.block && props.block.call !== null) props.block.call.argsRaw = '{'
    expect(artifactWrite(props)).toMatchObject({ raw: '{', previewable: false })
  })
  it('never runs dispatched writes before their success record', () => {
    const props = { phase: 'start', block: { phase: 'start', argsRaw: JSON.stringify({ file_path: '/tmp/a.html', content: source }) } } as ToolCallViewProps
    expect(artifactWrite(props)).toMatchObject({ state: 'running', previewable: false })
    expect(artifactWrite({ phase: 'preparing', block: { phase: 'preparing' } } as ToolCallViewProps)).toMatchObject({ state: 'preparing', previewable: false })
  })
  it('shows source first, creates an isolated preview on request and retires it on source selection', () => {
    render(<ArtifactCard {...record()} t={t} />)
    expect(screen.queryByTitle('frame')).toBeNull()
    expect(screen.getByText(source)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'preview' }))
    const frame = screen.getByTitle('frame')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(frame.getAttribute('srcdoc')).toContain(source)
    fireEvent.click(screen.getByRole('button', { name: 'reload' }))
    expect(screen.getByTitle('frame')).not.toBe(frame)
    fireEvent.click(screen.getByRole('tab', { name: 'source' }))
    expect(screen.queryByTitle('frame')).toBeNull()
  })
  it('preserves failure text without presenting a runnable result', () => {
    render(<ArtifactCard {...record('/tmp/counter.html', true)} t={t} />)
    expect(screen.getByText('write denied')).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'preview' })).toBeNull()
  })
  it('places document policy before untrusted source', () => {
    const html = artifactDocument('<meta http-equiv="Content-Security-Policy" content="default-src *"><script>test()</script>')
    expect(html.indexOf("connect-src 'none'")).toBeLessThan(html.indexOf('default-src *'))
    expect(html).not.toContain('allow-same-origin')
  })
})
