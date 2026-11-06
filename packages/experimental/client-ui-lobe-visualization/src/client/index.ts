/** Optional visualizations assembled over existing tool and preset interfaces. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { registerArtifacts } from './artifacts/register.ts'
import { registerTools } from './tools/register.ts'
import { registerAgentProfile } from './agent/index.ts'

/** Client services consumed by the three visual domains. */
export const inject = ['slots', 'locale', 'remote', 'remote.agentPresets']

/**
 * Add reversible artifact, tool-call and agent-profile entries.
 * @param ctx - Browser plugin scope.
 */
export function apply(ctx: Context): void {
  registerArtifacts(ctx)
  registerTools(ctx)
  registerAgentProfile(ctx)
}
