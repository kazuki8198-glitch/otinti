// TEXTBOOK — test/shots.mjs (npm run shots; not part of npm test): screenshots of the page into docs/.
//  - PC 1280×800 and phone 390×844, light and dark (Playwright's colorScheme): 4 pictures of one section;
//  - the whole book's first screen (#all), and the print look (emulateMedia print) of a section with a figure.
// No fullPage (the whole book is tens of thousands of px tall). The page is built into test-output/ first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';
import { loadChromium, openPage, PAGE } from './playwright.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), DOCS = path.resolve(here, '../docs');
const chromium = loadChromium(); if (!chromium) { console.error('Playwright not found'); process.exit(1); }
fs.mkdirSync(path.dirname(PAGE), { recursive: true });
fs.writeFileSync(PAGE, build({ quiet: true }).html);
fs.mkdirSync(DOCS, { recursive: true });
const browser = await chromium.launch();
const problems = [];
async function shot(name, opts, after) {
  const { ctx, page, errors, requests } = await openPage(browser, opts);
  if (after) await after(page);
  const f = path.join(DOCS, name + '.png');
  await page.screenshot({ path: f });
  problems.push(...errors, ...requests.map(u => 'request: ' + u));
  console.log(path.relative(process.cwd(), f));
  await ctx.close();
}
const top = async page => { await page.evaluate(() => window.scrollTo(0, 0)); };
for (const [dev, width, height] of [['pc', 1280, 800], ['phone', 390, 844]])
  for (const colorScheme of ['light', 'dark']) await shot(`${dev}-${colorScheme}`, { width, height, colorScheme, hash: 'aero.forces' }, top);
await shot('all-first', { width: 1280, height: 800, hash: 'all' }, top);
await shot('print', { width: 1000, height: 1300, hash: 'aero.forces' }, async page => { await page.emulateMedia({ media: 'print' }); await top(page); });
await browser.close();
console.log(problems.length ? 'problems:\n' + problems.join('\n') : 'no errors, no network requests');
