// TEXTBOOK — test/playwright.mjs: finds the Playwright that is already on this machine (nothing is installed), the same
// way as cadet/test/shots.mjs's loadChromium (copied here: cadet's files are not imported):
// $PLAYWRIGHT → require('playwright') → /opt/node22/lib/node_modules/playwright. null when there is none.
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
export function loadChromium() {
  for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { return require(p).chromium; } catch (e) { /* next */ } }
  return null;
}
// the page is built into test-output/ (outputs/TEXTBOOK.html is written only by `npm run build`)
export const PAGE = path.resolve(here, '../test-output/TEXTBOOK.html');
// a page with every http(s) request stopped and counted, and its errors kept
export async function openPage(browser, { width = 1280, height = 800, colorScheme = 'light', hash = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
  const page = await ctx.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await ctx.route(/^https?:/, r => { requests.push(r.request().url()); return r.abort(); });
  await page.goto('file://' + PAGE + (hash ? '#' + hash : ''));
  await page.waitForFunction(() => window.__tb && window.__tb.ready);
  return { ctx, page, errors, requests };
}
