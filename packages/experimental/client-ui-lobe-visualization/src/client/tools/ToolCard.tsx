/** Expandable tool process cards with raw diagnostics and host navigation actions. */
import { useId } from 'react'
import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locale.ts'
import { toolCardModel } from './model.ts'
import css from './ToolCard.module.css'

/** Props supplied by the keyed tool slot and its private locale seat. */
export type ToolCardProps = ToolCallViewProps & PropsLocale<'lobeTools'>

/**
 * Render Bash or edit input, lifecycle and exact result text as an expandable card.
 * @param props - Host owner data, locale and disclosure/navigation capabilities.
 * @returns A card with keyboard-accessible disclosure and independent actions.
 */
export function ToolCard(props: ToolCardProps) {
  const { toolName, useDisclosure, inspect, openFile, t } = props
  const model = toolCardModel(props)
  const { expanded, toggle } = useDisclosure()
  const bodyId = useId()
  const edit = toolName === 'edit'
  const dot = model.stage === 'success' ? 'done' : model.stage === 'error' ? 'error'
    : model.stage === 'stopped' ? 'warning' : 'ongoing'
  return (
    <article className={css.card} data-stage={model.stage}>
      <div className={css.header}>
        <button type="button" className={css.disclosure} aria-expanded={expanded}
          aria-controls={expanded ? bodyId : undefined} onClick={toggle}>
          <StateDot state={dot} />
          <span className={css.heading}>
            <span className={css.title}>{t(edit ? 'edit' : 'bash')}</span>
            {model.summary !== '' && <span className={css.summary}>{model.summary}</span>}
          </span>
          <span className={css.status}>{t(model.stage)}</span>
          <span className={css.chevron} aria-hidden>{expanded ? '−' : '+'}</span>
        </button>
      </div>
      {model.failure !== undefined && <p className={css.failure}>{model.failure}</p>}
      {expanded && (
        <div id={bodyId} className={css.body}>
          {!edit && model.command !== undefined && (
            <section className={css.section} aria-label={t('command')}>
              <span className={css.label}>{t('command')}</span>
              <pre className={css.code}>{model.command}</pre>
            </section>
          )}
          {edit && model.oldText !== undefined && (
            <section className={css.section} aria-label={t('old')}>
              <span className={css.label}>{t('old')}</span>
              <pre className={css.code} data-diff="old">{model.oldText}</pre>
            </section>
          )}
          {edit && model.newText !== undefined && (
            <section className={css.section} aria-label={t('new')}>
              <span className={css.label}>{t('new')}</span>
              <pre className={css.code} data-diff="new">{model.newText}</pre>
            </section>
          )}
          {model.rawInput !== undefined && (
            <section className={css.section} aria-label={t('input')}>
              <span className={css.label}>{t('input')}</span>
              <pre className={css.code}>{model.rawInput}</pre>
            </section>
          )}
          <section className={css.section} aria-label={t('output')}>
            <span className={css.label}>{t('output')}</span>
            <pre className={css.code}>{model.output ?? t('noOutput')}</pre>
          </section>
        </div>
      )}
      {(inspect !== undefined || edit && model.path !== undefined && model.path !== '') && (
        <div className={css.actions}>
          {edit && model.path !== undefined && model.path !== '' && (
            <Button variant="ghost" onClick={() => { if (model.path !== undefined) openFile(model.path) }}>{t('openFile')}</Button>
          )}
          {inspect !== undefined && <Button variant="ghost" onClick={inspect}>{t('inspect')}</Button>}
        </div>
      )}
    </article>
  )
}
