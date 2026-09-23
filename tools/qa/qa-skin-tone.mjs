/* qa-skin-tone.mjs — v2.3.2665. Shoot the real client wearing each skin tone.
 *
 * WHY.  A SKIN_CATALOG row is four numbers, and the only thing that can say
 * whether those numbers look right is the renderer: _retint scales the target
 * by every pixel's own luminance, so a tone that reads fine as a swatch can
 * still blow out its highlight rim or lose its hue in shadow.
 * tools/skin_clip.mjs measures the clipping; this one lets you LOOK at it.
 *
 * Drives the tone through localStorage ('bt-skin', playerSkins' own store) via
 * addInitScript, so the pick is in place before the first frame and no click
 * path through the creator is needed.  Two shots per tone: the creator (which
 * draws at the full 256 frame, where a tone actually reads) and town after
 * joining (~77px, where it will really be seen).
 *
 * No worker required -- the client renders the creator and the town with the
 * socket down, the same posture qa-ui-shots.mjs documents.
 *
 * Usage: npm run build && npx vite preview --port 4173   (then)
 *        node tools/qa/qa-skin-tone.mjs [outDir] [tone,tone,...]
 *
 * For the TOWN shots, also run a worker and point the client at it:
 *        cd server && npx wrangler dev --port 8787 --local
 *        QA_WS=ws://127.0.0.1:8787 node tools/qa/qa-skin-tone.mjs
 * Without QA_WS the creator shots are still valid and the town shots are the
 * reconnect spinner.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/skin-tone-shots';
const TONES = (process.argv[3] || 'default,aliencyan,monkeybrown').split(',');
const URL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const EXE = [process.env.QA_CHROME,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/tmp/chrome-headless-shell-linux64/chrome-headless-shell',
].filter(Boolean).find((p) => existsSync(p));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'],
});

for (const tone of TONES) {
  /* A fresh context per tone: the store reads localStorage once at module
     load, so reusing a page would keep the first tone for the whole run. */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror] ${tone}: ${e.message.slice(0, 140)}`));
  await page.addInitScript((a) => {
    try {
      localStorage.setItem('bt-skin', a.t);
      localStorage.setItem('bt-pants', 'default');
      localStorage.setItem('bt-shoes', 'default');
    } catch (e) { /* privacy mode -- the run just shows the default tone */ }
    /* The creator draws with the socket down, but JOINING does not: without a
       worker the town shot is the "Reconnecting to Bro Town..." spinner, not a
       figure (TRAPS §75 -- an asset gate is not a server gate).  QA_WS points
       this at a local `wrangler dev`; the creator shots do not need it. */
    if (a.ws) window.BROTOWN_WS_URL = a.ws;
  }, { t: tone, ws: process.env.QA_WS || '' });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  /* v2.3.2665: the title screen stands in front of the creator (CONTINUE /
     CREATE CHARACTER), so a run that only waits shoots the splash and reports
     "no name field".  Click through by NAME rather than by nth-button, so a
     re-ordered title screen fails loudly here instead of silently shooting
     whatever button moved into the slot. */
  try {
    await page.getByText(/create character/i).first().click({ timeout: 8000 });
    await page.waitForTimeout(5000);
  } catch (e) { console.log(`  ${tone}: no CREATE CHARACTER button (already past the title?)`); }
  /* Confirm the store actually took the value rather than trusting the write:
     a typo'd id silently falls back to the art's own tan, which on a
     screenshot is indistinguishable from "the tone is subtle". */
  const applied = await page.evaluate(() => {
    try { return localStorage.getItem('bt-skin'); } catch (e) { return null; }
  });
  if (applied !== tone) console.log(`  WARN ${tone}: store holds ${applied}`);
  await page.screenshot({ path: `${OUT}/creator-${tone}.png` });
  /* The figure on the pedestal, cropped, because that is the whole point of
     the run and it is ~6% of a 1280x1000 shot.  Fixed CSS-pixel box tied to
     this viewport -- it is a review aid, not an assertion. */
  await page.screenshot({ path: `${OUT}/figure-${tone}.png`, clip: { x: 520, y: 110, width: 180, height: 260 } });
  /* And the Skin tab open, so the swatch row is on the record too. */
  try {
    await page.getByText(/^Skin$/).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/skintab-${tone}.png` });
  } catch (e) { console.log(`  ${tone}: no Skin tab`); }

  try {
    const input = page.locator('input').first();
    await input.fill('Tone ' + tone);
    await input.press('Enter');
  } catch (e) { console.log(`  ${tone}: no name field (already joined?)`); }
  await page.waitForTimeout(12000);
  await page.screenshot({ path: `${OUT}/town-${tone}.png` });
  console.log(`${tone}: creator + town`);
  await ctx.close();
}
await browser.close();
console.log('done ->', OUT);
