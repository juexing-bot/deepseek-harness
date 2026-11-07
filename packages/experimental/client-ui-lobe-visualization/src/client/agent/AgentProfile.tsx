/** Session-scoped profile over recorded preset identity and the live declaration reader. */
import { useEffect, useId, useRef, useState } from 'react'
import { Button, IconAgentPresetOutlineRegular, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AgentPresetDocument } from '@deepseek-ai/dsh-agent-preset-registry/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from './locales.ts'
import css from './AgentProfile.module.css'

/** Narrow declaration-reading capability supplied by registration. */
export interface AgentProfileInjected {
  /** Read the current declaration; failures reject and never change the session. */
  readPreset: (id: string) => Promise<AgentPresetDocument>
}

/** Framework-derived profile props. */
export type AgentProfileProps = PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<'lobeAgent'> & InjectFace<AgentProfileInjected>

type ProfileView =
  | { id: string | undefined; status: 'loading' }
  | { id: string; status: 'ready'; document: AgentPresetDocument }
  | { id: string; status: 'error'; message: string }
  | { id: undefined; status: 'empty' }

/** Render the recorded identity and a read-only, retryable declaration modal.
 * @param props Framework scope, localized text and the declaration reader.
 * @returns The header utility and its accessible profile modal.
 */
export function AgentProfile({ sessionId, useSessions, readPreset, t }: AgentProfileProps) {
  const preset = useSessions((state) => {
    const value = state.byId[sessionId]?.projectionValues?.agentPreset
    return typeof value === 'string' ? value : undefined
  })
  const [view, setView] = useState<ProfileView | null>(null)
  const [expanded, setExpanded] = useState(false)
  const request = useRef<AbortController | null>(null)
  const contentId = useId()
  useEffect(() => () => { request.current?.abort() }, [])

  const open = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    if (preset === undefined) {
      setView({ id: undefined, status: 'empty' })
      return
    }
    setView({ id: preset, status: 'loading' })
    try {
      const document = await readPreset(preset)
      if (!controller.signal.aborted) setView({ id: preset, status: 'ready', document })
    } catch (error) {
      if (!controller.signal.aborted) setView({ id: preset, status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }
  const close = () => {
    request.current?.abort()
    setView(null)
    setExpanded(false)
  }
  // A changed recorded identity cannot display an earlier preset's declaration.
  const visible = view !== null && view.id === preset ? view : null
  const document = visible?.status === 'ready' ? visible.document : undefined
  const name = document?.name ?? preset ?? t('noPreset')

  return <>
    <Button variant="toolbar" size="sm" aria-label={t('entry')} onClick={() => { void open() }}>
      <IconAgentPresetOutlineRegular size={16} />
      {t('entry')}
    </Button>
    <Modal open={visible !== null} onClose={close} title={t('title')} closeLabel={t('close')}
      className={css.dialog as string} footer={<Button variant="outline" data-modal-autofocus onClick={close}>{t('close')}</Button>}>
      <div className={css.body}>
        <section className={css.identity} aria-label={t('identity')}>
          <div className={css.avatar} aria-hidden="true"><IconAgentPresetOutlineRegular size={24} /></div>
          <div className={css.identityText}>
            <p className={css.eyebrow}>{t('identity')}</p>
            <h3 className={css.name}>{name}</h3>
            {document?.description === undefined ? null : <p className={css.hint}>{document.description}</p>}
            {preset === undefined ? <p className={css.hint}>{t('noPresetDetail')}</p>
              : <p className={css.hint}>{t('presetId')} <code>{preset}</code></p>}
          </div>
        </section>
        {preset === undefined ? null : <p className={css.hint}>{t('fixed')}</p>}
        <section className={css.configuration} aria-label={t('configuration')}>
          <h3 className={css.sectionTitle}>{t('configuration')}</h3>
          <p className={css.hint}>{t('readOnly')}</p>
          {visible?.status === 'loading' ? <div className={css.feedback} role="status" aria-label={t('loading')}><StateDot state="ongoing" /></div> : null}
          {visible?.status === 'error' ? <div className={css.feedback}>
            <p role="alert">{t('readError')}</p>
            <p className={css.hint}>{visible.message}</p>
            <Button variant="outline" size="sm" onClick={() => { void open() }}>{t('retry')}</Button>
          </div> : null}
          {document === undefined ? null : <>
            <p className={css.hint}>{t('configurationDetail')}</p>
            <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={contentId}
              onClick={() => { setExpanded(value => !value) }}>{t(expanded ? 'collapse' : 'expand')}</Button>
            {expanded ? <pre id={contentId} className={css.code} tabIndex={0} aria-label={t('configuration')}>{document.content}</pre> : null}
          </>}
        </section>
      </div>
    </Modal>
  </>
}
