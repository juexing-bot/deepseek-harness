/** Recorded write card with opt-in interactive preview and an inspectable source. */
import { useId, useState } from 'react'
import { Button, DisclosureRow, IconCodeOutlineRegular, SegmentedTabs } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { artifactDocument, artifactWrite } from './model.ts'
import type { ArtifactLocale } from './locale.ts'
import css from './ArtifactCard.module.css'

type Props = ToolCallViewProps & PropsLocale<ArtifactLocale>

/**
 * Display the recorded source; opening preview starts an opaque browsing context.
 * @param props - Tool record, disclosure, navigation and localized copy.
 * @returns Write card, preserving input and output even when it cannot preview.
 */
export function ArtifactCard(props: Props) {
  const model = artifactWrite(props)
  const { expanded, toggle } = props.useDisclosure()
  const [view, setView] = useState<'source' | 'preview'>('source')
  const [generation, setGeneration] = useState(0)
  const id = useId()
  const { t } = props
  const preview = model.previewable && view === 'preview'
  const path = model.openPath
  return (
    <DisclosureRow
      icon={<IconCodeOutlineRegular size={14} />}
      title={t('write')}
      open={expanded}
      expandable
      onToggle={toggle}
      running={model.state === 'preparing' || model.state === 'running'}
      expandOnRowClick
      collapsedContent={<span className={css.summary}>{model.path ?? t('pending')} · {t(model.state)}</span>}
      keepContentWhenOpen
    >
      <section className={css.card} aria-label={t('artifact')}>
        <div className={css.toolbar}>
          <span className={css.path}>{model.path ?? t('pending')}</span>
          {path !== undefined && <Button size="sm" onClick={() =>{  props.openFile(path) }}>{t('open')}</Button>}
          {props.inspect !== undefined && <Button size="sm" onClick={props.inspect}>{t('inspect')}</Button>}
        </div>
        {model.previewable && (
          <div className={css.toolbar}>
            <SegmentedTabs label={t('view')} size="sm" value={preview ? 'preview' : 'source'} onChange={setView} items={[
              { value: 'source', label: t('source'), id: `${id}-source`, panelId: `${id}-panel` },
              { value: 'preview', label: t('preview'), id: `${id}-preview`, panelId: `${id}-panel` },
            ]} />
            {preview && <Button size="sm" onClick={() =>{  setGeneration(value => value + 1) }}>{t('reload')}</Button>}
          </div>
        )}
        <div id={`${id}-panel`} role={model.previewable ? 'tabpanel' : undefined}
          aria-labelledby={model.previewable ? `${id}-${preview ? 'preview' : 'source'}` : undefined}>
          {preview
            ? <iframe key={`${props.callId}:${generation}`} className={css.frame}
              title={t('frame')} sandbox="allow-scripts" referrerPolicy="no-referrer"
              srcDoc={artifactDocument(model.source ?? '')} />
            : <pre className={css.source}>{model.source ?? (model.raw || t('pending'))}</pre>}
        </div>
        {model.output !== undefined && model.output !== '' && <pre className={css.output}>{model.output}</pre>}
      </section>
    </DisclosureRow>
  )
}
