/* ═══ THE BIG-TOWN PREVIEW, WALKED (v2.3.2982) ═══
 *
 * Owner, 2026-10-02: "I actually think all the buildings need to be twice as
 * large let me see preview".  `?trial=wheel&bigtown` lays the town for
 * buildings twice the size and draws them so (public/tools/world/plan.js
 * bigTownPlan).  On a phone viewport, against a real worker:
 *   1. the way in says it is the preview -- buildings x2, 13 of 17 (at 1.5,
 *      BIGTOWN=1.5, all 17: v2.3.2985);
 *   2. round the arrival the buildings are drawn twice their pictures' size,
 *      everything else as made, Mayor Bro beside the bigger Town Hall;
 *   3. walking up to the Hotel your feet stop at its (bigger) porch;
 *   4. pictures from the square, Main Street and Market Row, for the owner;
 *   5. no page errors.
 * Pictures in tools/qa/mp/out/bigtown-*.png.
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
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `bigtown${tag}-${name}.png`) });
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const man = JSON.parse(readFileSync(join(H.REPO, 'public/world/objects/manifest.json'), 'utf8'));
  const gameW = Object.create(null);
  for (const o of man.objects) gameW[o.id] = o.pieces.map((p) => p.gameW);

  /* BIGTOWN=1.5 in the environment for that size's pictures (the checks
     are written for twice) -- v2.3.2985: and, up to TWO_A_SIDE_MAX, all 17
     buildings stand (the owner: "Let me try 1.5 size for buildings. Does
     that fit?") */
  const K = Number(process.env.BIGTOWN || 2);
  const { TWO_A_SIDE_MAX } = await import(H.REPO + '/public/tools/world/plan.js');
  const STAND = K <= TWO_A_SIDE_MAX ? 17 : 13;
  const tag = K === 2 ? '' : `-${K}`;
  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort, viewport: PHONE, touch: true, query: K === 2 ? 'trial=wheel&bigtown' : `trial=wheel&bigtown=${K}` });
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

  phase = 'the way in';
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  const zone = await waitZone(P, WHEELISH);
  await P.page.waitForTimeout(1500);
  const info = await P.page.evaluate(() => {
    const o = window.__btWorldTrial.objects(), t = document.body.innerText || '';
    return { o, readout: (t.match(/preview buildings[^\n]*/) || [''])[0] };
  });
  rec.ok(`the way in is the preview: "${info.readout}"`, WHEELISH(zone) && info.readout.includes(`preview buildings x${K} (${STAND} of 17)`), info);

  phase = 'the town';
  const town = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    return W.near(S.player.x, S.player.y, 1600).map((o) => ({ ...o, s: W.sprite(o.i) })).filter((o) => o.s);
  });
  const buildings = town.filter((o) => gameW[o.id] && man.objects.find((m) => m.id === o.id).kind === 'building');
  const others = town.filter((o) => !buildings.includes(o));
  const off = buildings.filter((o) => !gameW[o.id].some((w) => Math.abs(o.s.w - K * w) < 1.5));
  const offOthers = others.filter((o) => gameW[o.id] && !gameW[o.id].some((w) => Math.abs(o.s.w - w) < 1.5));
  rec.ok(`round the arrival ${buildings.length} buildings are drawn ${K === 2 ? 'twice' : K + ' times'} their pictures' size (${[...new Set(buildings.map((o) => o.id))].join(', ')}), and ${others.length} other things as made`,
    buildings.length >= 3 && off.length === 0 && others.length >= 1 && offOthers.length === 0, { off: off.slice(0, 3), offOthers: offOthers.slice(0, 3) });
  await shot(P, 'arrival');
  const mayor = await P.page.evaluate(() => {
    const S = window._gameState.current, m = window.__btWheelObjects.mayor();
    const hall = window.__btWheelObjects.near(m ? m.x : 0, m ? m.y : 0, 900).find((o) => o.id === 'townhall');
    return m && hall ? { m, hall: { x: hall.x, y: hall.y, w: hall.w } } : null;
  });
  rec.ok('Mayor Bro stands beside the bigger Town Hall\'s steps', !!mayor && mayor.m.x > mayor.hall.x + 60 && Math.abs(mayor.m.y - mayor.hall.y) < 80, mayor);
  if (mayor) {
    await H.hopTo(P, mayor.m.x - 120, mayor.m.y + 200, { tries: 40 });
    await P.page.waitForTimeout(1200);
    await tap(P, 'Close');
    await shot(P, 'townhall');
  }

  phase = 'porch';
  const hotel = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const o = W.near(S.player.x, S.player.y, 2400).find((q) => q.id === 'hotel');
    return o || null;
  });
  if (hotel) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, hotel.x - 60, hotel.y + 90 - dy, { tries: 40 });
    await P.page.waitForTimeout(900);
    const box = await P.page.evaluate(() => (window.__btBlockers(window._gameState.current.currentZone) || []).find((b) => b.id === 'hotel') || null);
    await P.page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await P.page.keyboard.down('w'); await P.page.waitForTimeout(1800); await P.page.keyboard.up('w');
    await P.page.waitForTimeout(400);
    const f = await feet(P);
    rec.ok(`walking up to the Hotel, your feet stop at its porch, now ${box ? Math.round(box.x1 - box.x0) : '?'} game px wide (feet at ${Math.round(f.fy)}, its front ${box ? Math.round(box.y1) : '?'})`,
      !!box && box.x1 - box.x0 > 360 * K && f.fy >= box.y1 - 3 && f.fy < hotel.y + 90 - 10, { box, f });
    await shot(P, 'hotel');
  } else rec.ok('the Hotel stands near the arrival', false, null);

  phase = 'streets';
  /* Main Street, north of the square, and Market Row, east of it */
  const here = await P.page.evaluate(() => { const m = window.__btWheelObjects.mayor(); return m; });
  if (here) {
    await H.hopTo(P, here.x - 105, here.y - 900, { tries: 60 });
    await P.page.waitForTimeout(1500);
    await shot(P, 'mainstreet');
    await H.hopTo(P, here.x + 700, here.y - 300, { tries: 60 });
    await P.page.waitForTimeout(1500);
    await shot(P, 'marketrow');
  }
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
