/** Register recorded HTML/SVG write artifacts with reversible slot effects. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { ArtifactCard } from './ArtifactCard.tsx'

import { en, zh } from './locale.ts'

/**
 * Shadow the standard write view only while this opt-in plugin is mounted.
 * @param ctx - Client plugin scope with Slots and locale services.
 */
export function registerArtifacts(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('lobeArtifacts', { en, zh, ja: en, es: en, fr: en, de: en, ru: en, pt: en }))
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview', key: 'write', priority: -100, locale: 'lobeArtifacts',
  }, ArtifactCard))
}
