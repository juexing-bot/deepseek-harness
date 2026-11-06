// @vitest-environment jsdom
/** Agent identity, declaration viewing and request lifetime behavior. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { AgentPresetDocument } from '@deepseek-ai/dsh-agent-preset-registry/types'
import { AgentProfile, type AgentProfileProps } from '../src/client/agent/AgentProfile.tsx'
import { en } from '../src/client/agent/locales.ts'

afterEach(cleanup)

const declaration: AgentPresetDocument & { name: string } = {
  agentPreset: 'my-agent', name: 'Research assistant', description: 'Published description',
  content: '- name: real-plugin\n  config:\n    enabled: true\n',
}

function fixture(preset: string | null | undefined = 'my-agent', read: () => Promise<AgentPresetDocument> = async () => declaration) {
  type State = { byId: { s1: { projectionValues: { agentPreset: string | null | undefined } } } }
  const sessions = createSnapshotStore<State>({ byId: { s1: { projectionValues: { agentPreset: preset } } } })
  const readPreset = vi.fn(read)
  // Unused framework seats are omitted; the component subscribes only to useSessions.
  const props = {
    sessionId: SessionId('s1'), useSessions: bindSnapshotSelector(sessions), readPreset,
    t: (key: keyof typeof en) => en[key],
  } as AgentProfileProps
  const rendered = render(<AgentProfile {...props} />)
  const open = () => { fireEvent.click(screen.getByRole('button', { name: en.entry })) }
  return { ...rendered, readPreset, sessions, open }
}

function close() {
  fireEvent.click(screen.getAllByRole('button', { name: en.close })[0]!)
}

describe('session agent profile', () => {
  it('reads the recorded preset and expands only its real declaration', async () => {
    const f = fixture()
    expect(f.readPreset).not.toHaveBeenCalled()
    f.open()
    expect(f.readPreset).toHaveBeenCalledWith('my-agent')
    await screen.findByRole('heading', { name: declaration.name })
    expect(screen.getByText('my-agent')).toBeTruthy()
    expect(screen.getByText(en.fixed)).toBeTruthy()
    expect(screen.getByText(en.readOnly)).toBeTruthy()
    expect(screen.queryByText(declaration.content)).toBeNull()
    const expand = screen.getByRole('button', { name: en.expand })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    const source = screen.getByLabelText(en.configuration, { selector: 'pre' })
    expect(source.textContent).toBe(declaration.content)
    expect(screen.getByText(en.configurationDetail)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /save|edit|switch/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.collapse }))
    expect(screen.queryByLabelText(en.configuration, { selector: 'pre' })).toBeNull()
  })

  it('falls back to the recorded id when the declaration has no name', async () => {
    const f = fixture('my-agent', async () => ({ agentPreset: 'my-agent', content: '[]\n' }))
    f.open()
    await screen.findByRole('button', { name: en.expand })
    expect(screen.getByRole('heading', { name: 'my-agent' })).toBeTruthy()
  })

  it.each([null, undefined])('explains an absent preset without reading or offering selection (%s)', async (preset) => {
    const f = fixture(preset)
    act(() => { f.sessions.set({ byId: { s1: { projectionValues: { agentPreset: preset } } } }) })
    f.open()
    expect(screen.getByRole('heading', { name: en.noPreset })).toBeTruthy()
    expect(screen.getByText(en.noPresetDetail)).toBeTruthy()
    expect(screen.getByText(en.readOnly)).toBeTruthy()
    expect(screen.queryByRole('button', { name: en.expand })).toBeNull()
    expect(f.readPreset).not.toHaveBeenCalled()
  })

  it.each([new Error('offline'), 'offline'])('shows a localized failure with a retry (%s)', async (error) => {
    const f = fixture()
    f.readPreset.mockRejectedValueOnce(error)
    f.open()
    expect((await screen.findByRole('alert')).textContent).toBe(en.readError)
    expect(screen.getByText('offline')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await screen.findByRole('heading', { name: declaration.name })
    expect(f.readPreset.mock.calls).toEqual([['my-agent'], ['my-agent']])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each(['resolve', 'reject'] as const)('ignores a late %s after close and reopen', async (outcome) => {
    const pending = Promise.withResolvers<AgentPresetDocument>()
    const f = fixture()
    f.readPreset.mockImplementationOnce(() => pending.promise)
    f.open()
    expect(screen.getByRole('status', { name: en.loading })).toBeTruthy()
    close()
    expect(screen.queryByRole('dialog')).toBeNull()
    f.readPreset.mockResolvedValueOnce({ ...declaration, name: 'Fresh declaration' })
    f.open()
    await screen.findByRole('heading', { name: 'Fresh declaration' })
    await act(async () => {
      if (outcome === 'resolve') pending.resolve({ ...declaration, name: 'Stale declaration' })
      else pending.reject(new Error('stale failure'))
      await Promise.resolve()
    })
    expect(screen.getByRole('heading', { name: 'Fresh declaration' })).toBeTruthy()
    expect(screen.queryByText('Stale declaration')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignores a result after unmount', async () => {
    const pending = Promise.withResolvers<AgentPresetDocument>()
    const f = fixture('my-agent', () => pending.promise)
    f.open()
    f.unmount()
    await act(async () => { pending.resolve(declaration); await pending.promise })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not display an earlier identity after the projection changes', async () => {
    const pending = Promise.withResolvers<AgentPresetDocument>()
    const f = fixture('my-agent', () => pending.promise)
    f.open()
    act(() => { f.sessions.set({ byId: { s1: { projectionValues: { agentPreset: 'other-agent' } } } }) })
    await act(async () => { pending.resolve(declaration); await pending.promise })
    expect(screen.queryByRole('dialog')).toBeNull()
    f.readPreset.mockResolvedValueOnce({ agentPreset: 'other-agent', name: 'Other agent', content: '[]\n' })
    f.open()
    await screen.findByRole('heading', { name: 'Other agent' })
    expect(f.readPreset).toHaveBeenLastCalledWith('other-agent')
  })

  it('uses the native modal Escape and outside-click dismissal', async () => {
    const f = fixture()
    const entry = screen.getByRole('button', { name: en.entry })
    entry.focus()
    f.open()
    await screen.findByRole('heading', { name: declaration.name })
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
    f.open()
    await screen.findByRole('heading', { name: declaration.name })
    const overlay = screen.getByRole('presentation')
    const mask = overlay.querySelector('[aria-hidden="true"]')
    expect(mask).not.toBeNull()
    fireEvent.click(mask!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
