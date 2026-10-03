/* ═══ THE BUILDINGS' LIFE, WATCHED (v2.3.2983) ═══
 *
 * Owner, 2026-10-02: "Also add effects just using code to each building to
 * make subtle liveliness effects".  On a phone viewport, against a real
 * worker, in `?trial=wheel`:
 *   1. round the arrival the buildings are drawn with their life -- each a
 *      picture with its life over it (src/rendering/wheelLife.js), puffs of
 *      smoke rising, lamps breathing, glints coming and going -- and it costs
 *      the frame next to nothing;
 *   2. at the Blacksmith the forge throws sparks;
 *   3. walk behind the Hotel and its life goes over you with its roof (one
 *      Container, moved by the depth pass);
 *   4. `?trial=wheel&nolife` draws every building still, a plain picture;
 *   5. no page errors.
 * Pictures in tools/qa/mp/out/wheellife-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) -- 'worldview' against an older one */
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };

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
/* the player's FEET (S.player is the body's centre) */
const feet = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null;
  return { x: S.player.x, y: S.player.y, fx: g ? g.x : NaN, fy: g ? g.y : NaN };
});

let phase = 'start';
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
/* every building drawn near the player, with its life */
const lives = (P, r = 1400) => P.page.evaluate((rr) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const near = W.near(S.player.x, S.player.y, rr).map((o) => ({ id: o.id, i: o.i, x: o.x, y: o.y, s: W.sprite(o.i) })).filter((o) => o.s);
  return { near, stats: { alive: W.stats.alive, lifeMs: W.stats.lifeMs }, player: { x: S.player.x, y: S.player.y } };
}, r);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheellife-${name}.png`) });
  const { BUILDING_LIFE } = await import(H.REPO + '/src/data/buildingLife.js');
  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  phase = 'the way in';
  const zone = await wayIn(P);
  await P.page.waitForTimeout(4500);

  phase = 'the square';
  const sq = await lives(P);
  const withLife = sq.near.filter((o) => BUILDING_LIFE[o.id]);
  const living = withLife.filter((o) => o.s.life != null);
  const busy = living.filter((o) => o.s.life > 0);
  const plain = sq.near.filter((o) => !BUILDING_LIFE[o.id] && o.s.life != null);
  rec.ok(`round the arrival ${living.length} buildings are drawn with their life (${living.map((o) => `${o.id} ${o.s.life}`).join(', ')}), and nothing else is`,
    WHEELISH(zone) && withLife.length >= 3 && living.length === withLife.length && busy.length >= 3 && plain.length === 0, { withLife: withLife.map((o) => o.id), plain: plain.map((o) => o.id) });
  rec.ok(`...and it costs the frame next to nothing: ${sq.stats.lifeMs != null ? sq.stats.lifeMs.toFixed(3) : '?'} ms a frame for ${sq.stats.alive} buildings`,
    sq.stats.alive >= 3 && sq.stats.lifeMs != null && sq.stats.lifeMs < 1.0, sq.stats);
  await shot(P, 'square');

  phase = 'the forge';
  /* where it stands (drawn or not: it is up Main Street, off the screen) */
  const smith = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return window.__btWheelObjects.near(S.player.x, S.player.y, 2400).find((o) => o.id === 'blacksmith') || null;
  });
  if (smith) {
    await H.hopTo(P, smith.x + 40, smith.y + 120, { tries: 40 });
    await P.page.waitForTimeout(3000);
    const f = await P.page.evaluate((i) => {
      const W = window.__btWheelObjects;
      let most = 0;
      return new Promise((res) => {
        const t0 = performance.now();
        const tick = () => {
          const s = W.sprite(i);
          if (s && s.life > most) most = s.life;
          if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else res({ most, s: W.sprite(i) });
        };
        tick();
      });
    }, smith.i);
    rec.ok(`at the Blacksmith the chimneys smoke and the forge throws sparks: up to ${f.most} things alive on it at once`, !!f.s && f.most >= 6, f);
    await shot(P, 'blacksmith');
  } else rec.ok('the Blacksmith stands near the arrival', false, null);

  phase = 'behind';
  const hotel = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return window.__btWheelObjects.near(S.player.x, S.player.y, 2400).find((o) => o.id === 'hotel') || null;
  });
  if (hotel) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, hotel.x + 60, hotel.y - 260 - dy, { tries: 40 });
    await P.page.waitForTimeout(1200);
    const b = await P.page.evaluate((i) => ({ s: window.__btWheelObjects.sprite(i), g: window.__btPlayerGround() }), hotel.i);
    rec.ok('walk behind the Hotel and its life goes over you with its roof: one picture-and-life, in front', !!b.s && b.s.life != null && b.s.layer === 'gatherNodesFront', b);
  } else rec.ok('the Hotel stands near the arrival', false, null);
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));

  phase = 'nolife';
  /* v2.3.3001: the first player is done -- close it, so the second is not
     drawing the Wheel's shadows (v2.3.3000) on a CPU shared with a whole
     second game: on the headless renderer two of them at once drew no
     buildings round the second's arrival in 16 s */
  await P.ctx.close().catch(() => {});
  const Q = await H.newPlayer(browser, { name: 'Stillness', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel&nolife' });
  const zq = await wayIn(Q);
  /* v2.3.2999: until the buildings round the arrival are drawn, not a fixed
     2.5 s -- the view 25% further out (v2.3.2997) loads more pages on the way
     in, and a busy machine drew none in time: "0 buildings" was the wait */
  let still = null, stillB = [];
  for (let i = 0; i < 30; i++) {
    await Q.page.waitForTimeout(500);
    still = await lives(Q);
    stillB = still.near.filter((o) => BUILDING_LIFE[o.id]);
    if (stillB.length >= 3) break;
  }
  await Q.page.waitForTimeout(1000);
  still = await lives(Q);
  stillB = still.near.filter((o) => BUILDING_LIFE[o.id]);
  /* v2.3.3000: what the second player saw, for when it saw nothing */
  const qs = await Q.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), loading: !!S._zoneLoading,
      objects: W ? { drawn: W.stats.drawn, pages: W.stats.pages, loading: W.stats.loading, placed: W.stats.placed } : null,
      near: W ? W.near(S.player.x, S.player.y, 1400).length : -1 };
  });
  console.log(`    nolife: ${JSON.stringify({ zq, ...qs, withSprites: still.near.length, buildings: stillB.length })}`);
  rec.ok(`with ?nolife the ${stillB.length} buildings round the arrival are plain pictures, no life`, WHEELISH(zq) && stillB.length >= 3 && stillB.every((o) => o.s.life == null) && !still.stats.alive, { ids: stillB.map((o) => o.id), alive: still.stats.alive });
}
