/** Lifecycle-owned contributions to the host's keyed tool presentation slot. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { ToolCard } from './ToolCard.tsx'
import { en, zh } from './locale.ts'

/**
 * Register tool cards for each host declaration lifetime and release them on unload.
 * @param ctx - Plugin context with the slots and locale services injected.
 */
export function registerTools(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('lobeTools', { en, zh, ja: en, es: en, fr: en, de: en, ru: en, pt: en }), 'lobe tools: dictionaries')
  ctx.slots.inject('tool.call.toolview', function* () {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'bash', priority: -100, locale: 'lobeTools' }, ToolCard)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'edit', priority: -100, locale: 'lobeTools' }, ToolCard)
  })
}
