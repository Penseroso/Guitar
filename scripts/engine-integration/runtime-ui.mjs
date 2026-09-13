// Release-UI browser compatibility, isolated Playwright contexts. Viewport reflow
// is not representative physical-mobile performance evidence.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.tmp-engine-browsers');
const playwright = createRequire(import.meta.url)(process.env.CHORD_PLAYWRIGHT_MODULE ?? 'C:/Users/pense/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.env.CHORD_URL ?? 'http://localhost:3004';
let priorEvidence;
try { priorEvidence = JSON.parse(await readFile('docs/implementation/engine-release-runtime-ui.json', 'utf8')); } catch { /* First evidence run. */ }
const evidence = { schema: 'engine-release-runtime-ui-v1', measuredAt: new Date().toISOString(), url,
    buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
    scope: 'Actual release application in desktop Firefox/WebKit, with keyboard interaction and 390 CSS-pixel reflow. No physical-mobile, hearing, or human-preference claim.',
    sourceHashes: {}, browsers: [], allPassed: false,
    resolvedHistory: [...(priorEvidence?.resolvedHistory ?? []), ...(priorEvidence?.allPassed === false ? [{ buildId: priorEvidence.buildId, measuredAt: priorEvidence.measuredAt,
        failures: priorEvidence.browsers.filter(b => b.status === 'FAIL').map(b => ({ name: b.name, version: b.version, failures: b.failures, error: b.error })),
        resolution: 'Dialog now receives an explicit returnFocusRef instead of inferring the mouse trigger from document.activeElement. Resolution is confirmed only if the current runtime checks pass.' }] : [])] };
await mkdir('docs/implementation/screenshots', { recursive: true });
for (const path of ['src/components/guitar/ClientApp.tsx','src/components/guitar/chord/ChordExplorationPanel.tsx','src/components/guitar/chord/ChordDialog.tsx','src/components/guitar/chord/explorationController.ts','src/components/guitar/chord/useChordExploration.ts'])
    evidence.sourceHashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
for (const [name, type] of [['Firefox', playwright.firefox], ['WebKit', playwright.webkit]]) {
    let browser;const checks = [], errors = [], failures = [];
    try {
        browser = await type.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Chord', exact: true }).click();
        const section = page.getByRole('region', { name: 'Chord voicings' });
        const result = section.locator('[data-results-count]'), cards = section.locator('[data-voicing-id]');
        const ready = () => result.waitFor({ state: 'visible', timeout: 60000 });
        const selected = () => section.locator('[data-selected-id]').getAttribute('data-selected-id');
        await ready();assert.equal(await cards.count(), 6);const initial = await selected();checks.push('Chord entry renders six exact cards');
        await section.getByRole('button', { name: 'Next page', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-voicing-id]').length === 12);await ready();
        assert.equal(await selected(), initial);checks.push('Next page renders twelve cards and retains selection');
        await section.getByRole('button', { name: 'Details', exact: true }).click();
        assert.equal(await section.locator('[data-ledger-term]').count(), 14);
        const detailsText = await section.innerText();
        for (const text of ['Human validation: absent.', 'Partial-cover groups:', '647.7 mm (default)', 'ordering preference only, independent of physical status']) assert.ok(detailsText.includes(text), text);
        checks.push('Details shows fourteen terms, heuristic limits, absent human validation and scale provenance');
        await section.getByRole('button', { name: 'Details', exact: true }).click();
        await section.getByRole('button', { name: /^Filters/ }).click();
        const root = section.locator('fieldset').filter({ has: page.locator('legend').filter({ hasText: /^Root inclusion$/ }) });
        await root.locator('input[value="omit"]').check();
        await page.waitForFunction(() => document.querySelector('[data-results-count]')?.getAttribute('data-results-count') === '0');
        assert.equal(await selected(), initial);assert.ok((await section.innerText()).includes('outside these filters'));
        checks.push('Root-omit exact no-match view retains and explains outside-filter selection');
        await section.getByRole('button', { name: 'Enable accompaniment', exact: true }).click();
        await page.waitForFunction(() => Number(document.querySelector('[data-results-count]')?.getAttribute('data-results-count')) > 0);
        assert.equal(await selected(), initial);assert.ok((await section.innerText()).includes('Accompaniment included'));
        checks.push('Accompaniment context produces matches and revalidates selected identity');
        await section.getByRole('button', { name: 'Full fretboard', exact: true }).click();
        await page.getByRole('dialog', { name: 'Full fretboard' }).waitFor();await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: 'Full fretboard' }).waitFor({ state: 'hidden' });
        const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.tagName === 'BUTTON' ? document.activeElement.textContent : null }));
        if (focus.text === 'Full fretboard') checks.push('Full-fretboard dialog closes with Escape and restores trigger focus');
        else failures.push({ check: 'Dialog Escape restores trigger focus', actual: focus });
        const filterButton = section.getByRole('button', { name: /^Filters/ });
        if (await filterButton.getAttribute('aria-expanded') === 'true') await filterButton.click();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(100);
        const reflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        assert.ok(reflow.document <= reflow.viewport + 1 && reflow.body <= reflow.viewport + 1, JSON.stringify(reflow));
        checks.push('390-pixel viewport has no page-level horizontal overflow');
        const screenshot = `docs/implementation/screenshots/engine-${name.toLowerCase()}-390px.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        assert.deepEqual(errors, []);
        assert.deepEqual(failures, [], 'Accessibility failures');
        evidence.browsers.push({ name, version: browser.version(), status: 'PASS', checks, reflow, screenshot, pageErrors: errors });
        console.log(`${name} ${browser.version()}: ${checks.length} release-UI checks passed.`);
    } catch (error) { evidence.browsers.push({ name, version: browser?.version(), status: 'FAIL', checks, pageErrors: errors, failures, error: String(error.stack ?? error) });console.error(`${name}: ${error.message}`); }
    finally { if (browser) await browser.close(); }
}
evidence.allPassed = evidence.browsers.every(browser => browser.status === 'PASS');
await writeFile('docs/implementation/engine-release-runtime-ui.json', JSON.stringify(evidence, null, 2) + '\n');
assert.ok(evidence.allPassed, 'Release UI did not pass every runtime check.');
