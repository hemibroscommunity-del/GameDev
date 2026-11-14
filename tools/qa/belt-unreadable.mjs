/* v2.3.5051: THE PAGE'S OWN ARMOUR BAKE AND A PIECE IT CANNOT READ, RUN.
 *
 * The gatekeeper's sitting 9 (review-z9.md "Card H: #1762"): the page's bake
 * (entityRenderer.js _maskedBodyFrameInner) handed the bake a worn piece it
 * could not read as not worn, and kept that frame under the whole set's key.
 * server/test/worn-bake.test §5 reads the source (node cannot load the
 * renderer); this RUNS the path, in the belt harness (src/belt-harness.html,
 * the real bake through the vite dev server):
 *   control: a readable steel plate alone -> a baked frame, kept;
 *   the set with one unreadable piece -> the plain body, nothing kept, and
 *   asked again -> the plain body again.
 * Before v2.3.5051: the set baked and kept (1 frame), and asked again gave
 * that frame.
 *
 *   npx vite --port 5173 &          (from the repository's root)
 *   node tools/qa/belt-unreadable.mjs
 */
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--headless'],
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5173/belt-harness.html?layers=body&wear=chest');
await page.waitForFunction('window.__done === true', null, { timeout: 300000 });
const r = await page.evaluate(async () => {
  const er = await import('/rendering/systems/entityRenderer.js');
  const sk = await import('/rendering/playerSkins.js');
  const gs = await import('/rendering/gearSheets.js');
  const pi = { pose: 'jog', dir: 'south', frameIdx: 2 };
  const body = sk.getBodyFrame('default', 'default', 'default', 'jog', 'south', 2, null, 'none');
  const chest = gs.getGearFrame('chest', 'steelplate', 'jog', 'south', 2);
  if (!body || !chest) return { err: 'not loaded', body: !!body, chest: !!chest };
  const held = () => window.__btMaskedStats().frames;
  const n0 = held();
  const a = er._maskedBodyFrame(body, [{ k: 'chest:steelplate', tex: chest }], 5, pi);   /* a key of its own: the harness baked dilate 6 */
  const n1 = held();
  /* a piece whose sheet is not in: no picture, no numbers */
  const unread = { k: 'legs:probegreaves', tex: { source: { resource: null }, frame: chest.frame, orig: chest.orig } };
  const b = er._maskedBodyFrame(body, [{ k: 'chest:steelplate', tex: chest }, unread], 6, pi);
  const n2 = held();
  const b2 = er._maskedBodyFrame(body, [{ k: 'chest:steelplate', tex: chest }, unread], 6, pi);
  return { controlBaked: a !== body, controlKept: n1 - n0, unreadPlain: b === body, unreadKept: n2 - n1, askedAgainPlain: b2 === body };
});
await browser.close();
const ok = !r.err && r.controlBaked && r.controlKept === 1 && r.unreadPlain && r.unreadKept === 0 && r.askedAgainPlain;
console.log(JSON.stringify(r), errs.length ? 'page errors: ' + errs.slice(0, 3).join(' | ') : 'no page errors');
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
