/** Keyless real-Web composition for the optional artifact, tool and profile views. */
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createAssistantMessage, createToolResultMessage, createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold, seedSession, watchConsole,
  webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { expandTurnProcesses, newEnglishPage, WEB_FIXTURE_TIME } from './support.ts'

const PACKAGE = fileURLToPath(new URL('../../../packages/experimental/client-ui-lobe-visualization/', import.meta.url))
const EXPECTED = fileURLToPath(new URL('./expected/lobe-visualization/', import.meta.url))
const MODE = webSnapshotMode()
const CAPTURE = process.env.DSH_LOBE_CAPTURE
const HTML = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Counter artifact</title><style>body{font:20px system-ui;padding:24px}button{font:inherit;padding:12px}</style><h1>Counter artifact</h1><button id="counter" onclick="this.textContent=Number(this.textContent)+1">0</button></html>'

/** The same recorded calls drive the native baseline and the opt-in views. */
function fixture(): string {
  const session = Session.create(SessionId('lobe-visualization-fixture'))
  session.append('turn/start', { turn: 1 })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Create a counter artifact and inspect the tool results.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  session.append('step/start', { turn: 1, step: 1 })
  const calls = [
    { name: 'bash', id: ToolCallId('lobe-bash'), args: { command: 'printf ready', description: 'Check the project' }, result: 'ready\n[exit code: 0]', meta: {} },
    { name: 'edit', id: ToolCallId('lobe-edit'), args: { file_path: '{{cwd}}/notes.txt', old_string: 'draft', new_string: 'ready' }, result: 'Updated notes.txt', meta: { path: '{{cwd}}/notes.txt' } },
    { name: 'write', id: ToolCallId('lobe-write'), args: { file_path: 'counter.html', content: HTML }, result: 'Created counter.html', meta: { path: '{{cwd}}/counter.html' } },
  ]
  session.append('assistant/message', {
    turn: 1, step: 1, stream: [], message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: calls.map(call => ({ type: 'tool-call', id: call.id, name: call.name, arguments: JSON.stringify(call.args) })),
    }),
  }, { surfaceOp: 'append' })
  for (const call of calls) {
    const event = session.append('tool/call', { turn: 1, step: 1, callId: call.id, name: call.name, arguments: JSON.stringify(call.args) })
    session.append('tool/result', { turn: 1, step: 1, meta: call.meta, message: createToolResultMessage({ callId: call.id, content: [{ type: 'text', text: call.result }], isError: false }) }, { surfaceOp: 'append', sourceEventSeqs: [event.seq] })
  }
  session.append('step/end', { turn: 1, step: 1 })
  session.append('step/start', { turn: 1, step: 2 })
  session.append('assistant/message', { turn: 1, step: 2, stream: [], message: createAssistantMessage({ content: [{ type: 'text', text: 'LOBE_VISUALIZATION_READY' }], source: { provider: 'fixture', model: 'fixture' } }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 2 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return [JSON.stringify({ type: 'session', version: SESSION_FORMAT_VERSION, id: '{{sessionId}}', createdAt: WEB_FIXTURE_TIME, cwd: '{{cwd}}', agentPreset: 'standard', isSeeded: false, delegationDepth: 0 }), ...session.snapshotEvents().map(event => JSON.stringify(event)), ''].join('\n')
}

for (const enabled of [false, true]) describe(`web e2e: Lobe visualization enabled=${enabled}`, () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  const stage = enabled ? 'after' : 'before'
  beforeAll(async () => {
    scaffold = await launchWebScaffold(enabled ? { extraOverlayPath: join(PACKAGE, 'cordis.patch.yml'), extraInstallAnchors: [join(PACKAGE, 'package.json')] } : {})
    await seedSession(scaffold, fixture(), 'lobe-visualization', 'standard', { createdAt: WEB_FIXTURE_TIME })
    if (MODE === 'refresh') await mkdir(EXPECTED, { recursive: true })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.clock.setFixedTime(WEB_FIXTURE_TIME)
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.locator('[role="treeitem"]').first().click()
    await page.locator('[role="treeitem"]').nth(1).click()
    await page.getByText('LOBE_VISUALIZATION_READY', { exact: true }).waitFor()
    await expandTurnProcesses(page)
    for (const call of ['lobe-write']) {
      const row = page.locator(`[data-chat-call-id="${call}"]`)
      const toggle = row.locator('[aria-expanded="false"]').first()
      if (await toggle.count() > 0) await toggle.click()
    }
  }, 120_000)
  afterAll(async () => { try { await browser?.close() } finally { await scaffold?.close() } })

  async function capture(name: string) {
    if (CAPTURE === undefined) return
    await mkdir(CAPTURE, { recursive: true })
    await page.screenshot({ path: join(CAPTURE, `${stage}-${name}.png`), fullPage: false, animations: 'disabled' })
  }

  it('renders the same recorded scenario in both themes and constrained layout', async () => {
    for (const dark of [false, true]) {
      await page.evaluate(value => document.body.toggleAttribute('data-ds-dark-theme', value), dark)
      await capture(dark ? 'dark' : 'light')
      const snapshot = await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)
      await compareOrRefreshGolden(join(EXPECTED, `${stage}-${dark ? 'dark' : 'light'}.expected.md`), snapshot, MODE)
    }
    await page.setViewportSize({ width: 760, height: 900 })
    await capture('constrained')
    expect(await page.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.setViewportSize({ width: 1440, height: 1000 })
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 60_000)

  it.skipIf(!enabled)('runs the recorded artifact only on request and can stop its browsing context', async () => {
    const write = page.locator('[data-chat-call-id="lobe-write"]')
    expect(await write.locator('iframe').count()).toBe(0)
    await write.getByRole('tab', { name: 'Interactive preview', exact: true }).click()
    const frame = write.frameLocator('iframe')
    await frame.getByRole('button', { name: '0', exact: true }).click()
    await frame.getByRole('button', { name: '1', exact: true }).waitFor()
    expect(await frame.locator('html').evaluate(html => getComputedStyle(html).backgroundColor)).toBe('rgb(255, 255, 255)')
    expect(await frame.locator('body').evaluate(() => { try { return window.parent.document.body === document.body } catch { return false } })).toBe(false)
    await capture('artifact-preview')
    await write.getByRole('tab', { name: 'Source', exact: true }).click()
    expect(await write.locator('iframe').count()).toBe(0)
  }, 30_000)

  it.skipIf(!enabled)('shows the actual preset declaration and closes with Escape', async () => {
    await page.getByRole('button', { name: 'Agent profile', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('button', { name: 'Show YAML', exact: true }).click()
    expect(await modal.locator('pre').innerText()).toContain('name:')
    await capture('agent-profile')
    await page.keyboard.press('Escape')
    expect(await page.getByRole('dialog').count()).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 30_000)
})
