/** Agent profile registration, using the existing preset Remote API. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { AgentProfile } from './AgentProfile.tsx'
import { en, zh } from './locales.ts'

/** Register the session utility and its locale with the caller's plugin lifetime.
 * @param ctx Client injection context with slots, locale and remote.agentPresets.
 */
export function registerAgentProfile(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('lobeAgent', { en, zh, ja: en, es: en, fr: en, de: en, ru: en, pt: en }), 'lobe-agent: dictionaries')
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'lobe-agent-profile',
    order: 20,
    locale: 'lobeAgent',
    inject: () => ({
      readPreset: async (id: string) => {
        const result = await ctx.remote.agentPresets.read(id)
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
    }),
  }, AgentProfile))
}
