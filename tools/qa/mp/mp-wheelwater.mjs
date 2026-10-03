/* ═══ THE OWNER'S WATER, IN THE WHEEL (v2.3.2984) ═══
 *
 * Owner, 2026-10-02, with two pictures: "Is this what you need for water?
 * Again I don't see anywhere to add water in the ground studio".  They went
 * into public/world/ground/ as the Open sea and the Shallows
 * (tools/world/add-ground-pictures.mjs).  On a phone viewport, against a real
 * worker, in `?trial=wheel`:
 *   1. the ground's worker fetches both pictures;
 *   2. at a coast the screen shows the sand, the shallows' turquoise shelf and
 *      the sea's deep blue past it -- each a PICTURE, dozens of colours, where
 *      the plan's flat blues were three;
 *   3. the river by the Mill Bridge, with no fresh-water picture made yet,
 *      is drawn from the shallows' picture, not the plan's flat blue -- and
 *      since v2.3.2993, when the owner sent their Fresh water ("here's the
 *      missing water"), from the fresh-water picture: its own colours on the
 *      screen, not the shallows';
 *   4. no page errors.
 * Pictures in tools/qa/mp/out/wheelwater-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };
/* sand above the Wind Dunes' first coast, the shallows and the sea north of it */
const COAST = { x: 25199, y: 15874 };
/* the Sweetwater River, by the Mill Bridge (test-world-core's art([-2.02, 0])) */
const RIVER = { x: 19177, y: 21504 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const waitZone = async (P, want, n = 60, gap = 1000) => {
  let zone = null;
  for (let i = 0; i < n; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if ((typeof want === 'function' ? want(zone) : zone === want) && !(await H.readState(P, (S) => !!S._zoneLoading))) return zone;
    await P.page.waitForTimeout(gap);
  }
  return zone;
};
async function wayIn(P) {
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  return waitZone(P, WHEELISH);
}
/* until every piece asked for is laid (or `ms` passes) */
const settle = async (P, ms = 20000) => {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await P.page.evaluate(() => { const st = window.__btWorldTrial.stats; return { loading: st.loading, downloading: st.downloading, short: st.short, resident: st.resident }; });
    if (s.loading === 0 && s.downloading === 0 && s.short === 0 && s.resident > 0) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(800);
  return s;
};

/* a screenshot's water: the deep-blue px and the turquoise px in a band of
   rows, and how many colours each has (the plan's flat blues are three) */
async function waterOf(file, y0f, y1f) {
  const { decodePNG } = await import(H.REPO + '/tools/world/png.mjs');
  const img = decodePNG(readFileSync(file));
  const deep = new Set(), light = new Set();
  let nd = 0, nl = 0, n = 0;
  for (let y = Math.floor(img.h * y0f); y < Math.floor(img.h * y1f); y++) for (let x = 0; x < img.w; x++) {
    const o = (y * img.w + x) * 4, r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
    n++;
    const key = (r << 16) | (g << 8) | b;
    if (b > 70 && b > r + 40 && b > g + 15 && g < 130) { nd++; deep.add(key); }
    else if (g > 140 && b > 140 && r < 150 && Math.abs(g - b) < 70) { nl++; light.add(key); }
  }
  return { deep: +(nd / n).toFixed(3), light: +(nl / n).toFixed(3), deepColours: deep.size, lightColours: light.size };
}

/* v2.3.2993: whose picture a screenshot's water is.  Each ground tile keeps
   its own 64 colours (v2.3.2961), so a colour found in one water picture and
   not the other says which was laid: count the screen's pixels in each's own
   colours (exact matches -- the inside of a patch of one colour comes through
   the drawing unblended). */
async function whoseWater(file, y0f, y1f, a, b) {
  const { decodePNG } = await import(H.REPO + '/tools/world/png.mjs');
  const pal = (names) => {
    const s = new Set();
    for (const f of names) {
      const im = decodePNG(readFileSync(join(H.REPO, 'public/world/ground', f)));
      for (let i = 0; i < im.data.length; i += 4) s.add((im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]);
    }
    return s;
  };
  const A = pal(a), B = pal(b);
  const img = decodePNG(readFileSync(file));
  let na = 0, nb = 0;
  for (let y = Math.floor(img.h * y0f); y < Math.floor(img.h * y1f); y++) for (let x = 0; x < img.w; x++) {
    const o = (y * img.w + x) * 4, k = (img.data[o] << 16) | (img.data[o + 1] << 8) | img.data[o + 2];
    const inA = A.has(k), inB = B.has(k);
    if (inA && !inB) na++; else if (inB && !inA) nb++;
  }
  return { mine: na, theirs: nb };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shotPath = (name) => join(OUT, `wheelwater-${name}.png`);
  const man = JSON.parse(readFileSync(join(H.REPO, 'public/world/ground/manifest.json'), 'utf8'));
  const made = man.swatches.filter((s) => s.group === 'water').map((s) => s.versions.map((v) => `${s.id}-${v}`)).flat();
  const P = await H.newPlayer(browser, { name: 'Wader', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  const asked = new Set();
  /* (the ground's pictures are fetched by its worker: the context sees them) */
  P.page.context().on('request', (r) => { const m = /\/world\/ground\/([a-z0-9-]+-[A-Z])\.png/.exec(r.url()); if (m) asked.add(m[1]); });
  const zone = await wayIn(P);
  await P.page.waitForTimeout(2000);

  /* ── 2. a coast ── */
  await H.hopTo(P, COAST.x, COAST.y, { tries: 120 });
  const st = await settle(P);
  await P.page.screenshot({ path: shotPath('coast') });
  const ground = await P.page.evaluate(({ x, y }) => {
    const T = window.__btWorldTrial;
    const at = (dy) => { const g = T.ground(x, y + dy); return g ? g.id : null; };
    return { here: at(0), north: [at(-120), at(-240), at(-360)] };
  }, COAST);
  /* ── 1. both pictures fetched ── */
  rec.ok(`the ground's worker fetches the water's pictures in the game's copy (${made.join(', ')})`,
    WHEELISH(zone) && made.length >= 2 && made.every((k) => asked.has(k)), { asked: [...asked].filter((k) => /sea|shallows|fresh/.test(k)), made });
  const w = await waterOf(shotPath('coast'), 0.08, 0.45);
  rec.ok(`at a coast the screen shows the shallows' turquoise shelf and the sea's deep blue past it, each a picture (${w.lightColours} and ${w.deepColours} colours; the plan's flat blues were 3)`,
    w.light > 0.04 && w.deep > 0.04 && w.lightColours >= 16 && w.deepColours >= 16, { w, ground, st });

  /* ── 3. the river, from the shallows' picture ── */
  await H.hopTo(P, RIVER.x + 90, RIVER.y + 60, { tries: 120 });
  await settle(P);
  await P.page.screenshot({ path: shotPath('river') });
  const r = await waterOf(shotPath('river'), 0.15, 0.85);
  const hasFresh = made.some((k) => k.startsWith('fresh-'));
  if (!hasFresh) {
    rec.ok(`the river by the Mill Bridge, no fresh-water picture made yet, is drawn from the shallows' picture (${r.lightColours} colours of turquoise, ${r.deepColours} of deep blue)`,
      r.light > 0.02 && r.lightColours >= 16, r);
  } else {
    /* v2.3.2993: the owner's Fresh water is made -- the river is its picture */
    const freshFiles = made.filter((k) => k.startsWith('fresh-')).map((k) => k + '.png');
    const who = await whoseWater(shotPath('river'), 0.15, 0.85, freshFiles, ['shallows-A.png']);
    rec.ok(`the river by the Mill Bridge is drawn from the owner's fresh-water picture (${who.mine} px in its own colours, ${who.theirs} in the shallows'; ${r.lightColours} colours of turquoise on screen)`,
      asked.has('fresh-A') && who.mine > 500 && who.mine > who.theirs * 4 && r.lightColours >= 16, { who, r, asked: [...asked].filter((k) => /fresh/.test(k)) });
  }
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
