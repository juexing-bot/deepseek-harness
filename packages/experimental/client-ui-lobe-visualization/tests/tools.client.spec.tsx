// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { ToolCard, type ToolCardProps } from '../src/client/tools/ToolCard.tsx'
import { toolCardModel } from '../src/client/tools/model.ts'
import { registerTools } from '../src/client/tools/register.ts'
import { en } from '../src/client/tools/locale.ts'

const argsRaw = JSON.stringify({ command: 'exit 7', description: 'Check exit status' })

function result(output: string, over: Partial<ToolResultNode> = {}): ToolResultNode {
  return {
    kind: 'tool-result', seq: 3, time: 100, callId: 'call-1', name: 'bash',
    args: PartialArguments.fromText(argsRaw), call: { name: 'bash', argsRaw }, callTime: 90,
    content: [{ type: 'text', text: output }], isError: false, subCalls: [], ...over,
  }
}

function useDisclosure() {
  const [expanded, setExpanded] = useState(false)
  return { expanded, setExpanded, toggle: () =>{  setExpanded(value => !value) } }
}

function props(block: ToolResultNode, toolName = 'bash'): ToolCardProps {
  // Only owner data and the private locale/disclosure seats are read by this component.
  return {
    phase: 'result', block, toolName, callId: block.callId, useDisclosure,
    openFile: vi.fn(), inspect: vi.fn(), t: (key: keyof typeof en) => en[key],
  } as ToolCardProps
}

afterEach(cleanup)

describe('tool process lifecycle', () => {
  it('shows streamed preparation and dispatched running before settlement', () => {
    const block = {
      phase: 'preparing' as const, callId: 'call-1', name: 'bash', turn: 1, step: 1,
      time: 90, subCalls: [], args: PartialArguments.fromText('{"description":"Preparing command","command":"pn'),
    }
    expect(toolCardModel({ block, toolName: 'bash' })).toMatchObject({ stage: 'preparing', summary: 'Preparing command', command: 'pn' })
    expect(toolCardModel({ block: { ...block, phase: 'start', argsRaw }, toolName: 'bash' }).stage).toBe('running')
  })

  it.each([
    ['hello', {}, 'success'],
    ['command failed\n[exit code: 7]', { meta: { cwd: '/workspace' } }, 'error'],
    ['failed\n[exit code: null]', {}, 'error'],
    ['failed\n[Command finished with exit code 3]', {}, 'error'],
    ['done\n[Command finished with exit code 0]', {}, 'success'],
    ['partial\n[Command timed out or OOM]', {}, 'error'],
    ['started background job j1', {}, 'running'],
    ['terminated\n[killed by signal: SIGTERM]', {}, 'error'],
    ['handled timeout\n[timed out after 100ms]', {}, 'error'],
    ['terminated\n[shell killed by signal: SIGTERM]', {}, 'error'],
    ['cancelled', { isError: true, error: { name: 'AbortError', code: 'ABORTED' } }, 'stopped'],
    ['cancelled before dispatch', { isError: true, error: { name: 'AbortError', code: 'ABORTED_BEFORE_DISPATCH' } }, 'stopped'],
    ['partial\n[stopped: user requested]', {}, 'stopped'],
    ['partial write', { meta: { stopped: true } }, 'error'],
    ['partial\n[still running after 100ms; moved to background job j1]', {}, 'running'],
    ['denied', { isError: true }, 'error'],
    ['status in metadata', { meta: { exitCode: 9 } }, 'error'],
  ] as const)('derives %s as %s', (output, over, stage) => {
    expect(toolCardModel({ block: result(output, over), toolName: 'bash' }).stage).toBe(stage)
  })

  it('keeps disclosure open while visible status progresses from preparing to running and success', () => {
    const owner = props(result('done'))
    const block = {
      phase: 'preparing' as const, callId: 'call-1', name: 'bash', turn: 1, step: 1,
      time: 90, subCalls: [], args: PartialArguments.fromText(argsRaw),
    }
    const view = render(<ToolCard {...owner} phase="preparing" block={block} />)
    expect(view.getByText('Preparing')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { expanded: false }))
    view.rerender(<ToolCard {...owner} phase="start" block={{ ...block, phase: 'start', argsRaw }} />)
    expect(view.getByText('Running')).toBeTruthy()
    expect(view.getByRole('button', { expanded: true })).toBeTruthy()
    view.rerender(<ToolCard {...owner} />)
    expect(view.getByText('Success')).toBeTruthy()
    expect(view.getByRole('region', { name: 'Raw result' }).textContent).toContain('done')
  })

  it('retains the raw command and failing result while inspect remains available collapsed', () => {
    const raw = 'Build failed\n[stderr]\npermission denied\n[exit code: 7]'
    const owner = props(result(raw))
    const view = render(<ToolCard {...owner} />)
    expect(view.getByText('Failed')).toBeTruthy()
    expect(view.getByText('Build failed')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Inspect call' }))
    expect(owner.inspect).toHaveBeenCalledOnce()
    const toggle = view.getByRole('button', { expanded: false })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(view.getByText('exit 7')).toBeTruthy()
    expect(view.getByRole('region', { name: 'Raw result' }).textContent).toContain(raw)
    fireEvent.click(toggle)
    expect(view.queryByRole('region', { name: 'Raw result' })).toBeNull()
  })

  it('shows old/new edits verbatim and opens the recorded absolute file path', () => {
    const raw = JSON.stringify({ file_path: 'src/a.ts', old_string: '<old>', new_string: '<new>' })
    const owner = props(result('edit rejected', {
      name: 'edit', call: { name: 'edit', argsRaw: raw }, args: PartialArguments.fromText(raw),
      meta: { path: '/workspace/src/a.ts' }, isError: true,
    }), 'edit')
    const view = render(<ToolCard {...owner} />)
    fireEvent.click(view.getByRole('button', { name: 'Open file' }))
    expect(owner.openFile).toHaveBeenCalledWith('/workspace/src/a.ts')
    fireEvent.click(view.getByRole('button', { expanded: false }))
    expect(view.getByRole('region', { name: 'Old text' }).textContent).toContain('<old>')
    expect(view.getByRole('region', { name: 'New text' }).textContent).toContain('<new>')
    expect(view.container.querySelector('old')).toBeNull()
    expect(view.getByRole('region', { name: 'Raw result' }).textContent).toContain('edit rejected')
  })

  it('keeps malformed input and nontext results inspectable as plain data', () => {
    const raw = '{"command":<script>alert(1)</script>'
    const owner = props(result('', {
      call: { name: 'bash', argsRaw: raw }, args: PartialArguments.fromText(raw),
      content: [{ type: 'reasoning', text: 'raw diagnostic' }],
    }))
    const view = render(<ToolCard {...owner} />)
    fireEvent.click(view.getByRole('button', { expanded: false }))
    expect(view.getByRole('region', { name: 'Raw input' }).textContent).toContain(raw)
    expect(view.getByRole('region', { name: 'Raw result' }).textContent).toContain('raw diagnostic')
    expect(view.container.querySelector('script')).toBeNull()
  })
})

describe('tool registration lifecycle', () => {
  it('waits for declarations, shadows host entries and restores them on unload', async () => {
    const runtime = await SlotTestRuntime.create()
    try {
      const locale = new LocaleRuntime(runtime.ctx)
      runtime.ctx.provide('locale', locale)
      runtime.slots.installLocale(locale)
      const feature = await runtime.mount({ inject: ['slots', 'locale'], apply: registerTools })
      expect(runtime.slots.entries('tool.call.toolview')).toHaveLength(0)
      await runtime.declare({ 'tool.call.toolview': { kind: 'keyed', scope: 'session' } })
      const host = () => null
      runtime.slots.register({ name: 'tool.call.toolview', key: 'bash' }, host)
      runtime.slots.register({ name: 'tool.call.toolview', key: 'edit' }, host)
      await runtime.flush()
      const entries = runtime.slots.entriesOfSlot('tool.call.toolview')
      expect(entries.map(entry => entry.component)).toEqual([ToolCard, ToolCard])
      expect(entries.map(entry => entry.options.priority)).toEqual([-100, -100])
      expect(locale.bind('lobeTools')('error')).toBeTruthy()
      await feature.dispose()
      expect(runtime.slots.entries('tool.call.toolview').map(entry => entry.component)).toEqual([host, host])
      expect(() => { locale.register('lobeTools', 'en', en)() }).not.toThrow()
    } finally {
      await runtime.dispose()
    }
  })
})
