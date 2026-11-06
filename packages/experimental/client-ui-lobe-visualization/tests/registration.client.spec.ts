// @vitest-environment jsdom
/** Artifact and profile contributions follow declaration and plugin lifetimes. */
import { expect, it } from 'vitest'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { registerArtifacts } from '../src/client/artifacts/register.ts'
import { registerAgentProfile } from '../src/client/agent/index.ts'

it('restores the native artifact view and removes the profile utility on unload', async () => {
  const runtime = await SlotTestRuntime.create()
  try {
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.ctx.provide('locale', locale)
    runtime.slots.installLocale(locale)
    const feature = await runtime.mount({ inject: ['slots', 'locale'], apply(ctx) {
      registerArtifacts(ctx)
      registerAgentProfile(ctx)
    } })
    await runtime.declare({
      'tool.call.toolview': { kind: 'keyed', scope: 'session' },
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
    })
    const native = () => null
    runtime.slots.register({ name: 'tool.call.toolview', key: 'write' }, native)
    await runtime.flush()
    expect(runtime.slots.entriesOfSlot('tool.call.toolview')).toHaveLength(1)
    expect(runtime.slots.entriesOfSlot('tool.call.toolview')[0]?.component).not.toBe(native)
    expect(runtime.slots.entries('conversation.session.header.utilities')).toHaveLength(1)
    await feature.dispose()
    expect(runtime.slots.entriesOfSlot('tool.call.toolview')[0]?.component).toBe(native)
    expect(runtime.slots.entries('conversation.session.header.utilities')).toHaveLength(0)
  } finally {
    await runtime.dispose()
  }
})
