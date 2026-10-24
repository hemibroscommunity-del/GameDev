/* ═══ THE CREATOR'S "NONE" TILES SHOW WHAT NONE MEANS (v2.3.3592) ═══
 *
 * The owner: "In the trait picker the 'None' option should show a thumbnail
 * of what that means - for example human should just show a hemi bro head
 * (maybe the one without the eyes to focus on just the shape)."
 *
 * In the creator, on a phone, each strip's None tile (Human on Species, Normal
 * on Eyes) is the Hemi Bros collection's plain bro (tools/ui/
 * make_none_tiles.py), loaded and drawn pixelated:
 *   1. Species (Human), Hair, Hats, Beard, Shirt: the bro with no eyes
 *   2. Eyes (Normal), Eyewear: the bro with the collection's Normal Eyes
 *   3. no page errors
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const STRIPS = [
  ['Species', 'Human', 'cc-none-bro.png'],
  ['Hair', 'None', 'cc-none-bro.png'],
  ['Hats', 'None', 'cc-none-bro.png'],
  ['Beard', 'None', 'cc-none-bro.png'],
  ['Shirt', 'None', 'cc-none-bro.png'],
  ['Eyes', 'Normal', 'cc-none-eyes.png'],
  ['Eyewear', 'None', 'cc-none-eyes.png'],
];

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === l);
  if (!b) return false; b.click(); return true;
}, label);
/* the None tile's picture: its address, whether it came in, its drawn size */
const noneTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  const img = el && el.querySelector('img');
  if (!img) return null;
  const r = img.getBoundingClientRect();
  return { src: img.getAttribute('src'), done: img.complete, nat: img.naturalWidth,
    pixelated: getComputedStyle(img).imageRendering, w: Math.round(r.width), h: Math.round(r.height) };
}, title);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Nonetile', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2000);
  for (const [tab, title, want] of STRIPS) {
    const opened = await pickTab(P, tab);
    await P.page.waitForTimeout(500);
    let t = await noneTile(P, title);
    for (let i = 0; i < 20 && t && !(t.done && t.nat > 0); i++) { await P.page.waitForTimeout(150); t = await noneTile(P, title); }
    rec.ok(`${tab}: its "${title}" tile is the collection's plain bro, ${want} (${t && t.src})`,
      opened && !!t && t.src.indexOf('/ui/welcome/cc/' + want) === 0, t);
    rec.ok(`${tab}: ...loaded (128 px) and drawn pixelated`, !!t && t.done && t.nat === 128 && t.pixelated === 'pixelated', t);
    await P.page.screenshot({ path: `/tmp/qa-nonetiles-${tab.toLowerCase()}.png` }).catch(() => {});
  }
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log('    screenshots: /tmp/qa-nonetiles-<strip>.png');
}
