/* ═══ v2.3.4995: OTHER PLAYERS' WEAPONS DRAWN OUT OF THE FIGURES' RUN ═══
 *
 * src/rendering/weaponLayer.js (the rule: src/game/weaponHoist.js).  Three
 * phones in the Wheel's BroTown: A carries a greatsword, B watches with
 * `?onepic=0` (A stays layered), C comes and stands in front of A.  Every
 * comparison reads the game's own picture of the stage over A's figure, in
 * one moment (mp-platelayer's way):
 *
 *   1. A alone: A's weapon is drawn by a weapons layer (first or last in its
 *      world layer), and the stage over A is the same picture as with the
 *      weapons drawn in place (window.__btWeaponLayerSet off).
 *   2. C standing over A's weapon: A's weapon stays in place (nothing drawn
 *      out of order where they overlap), the picture the same both ways.
 *   3. No page errors.
 *
 *   node tools/qa/mp/run.mjs weaponlayer
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Armed', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true });
  const B = await H.newPlayer(browser, { name: 'Reader', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, guest: true, dpr: 3, query: 'onepic=0' });
  const C = await H.newPlayer(browser, { name: 'Crowd', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, guest: true });
  for (const [n, P] of [['A', A], ['B', B], ['C', C]]) P.page.on('pageerror', (e) => errors.push(n + ': ' + String(e).slice(0, 200)));
  for (const P of [A, B, C]) await H.enterWorld(P);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const ok3 = (await inWheel(A)) && (await inWheel(B)) && (await inWheel(C));
  rec.ok('setup: three phones in the Wheel', ok3);
  if (!ok3) return;
  const stops = [A, B, C].map((P) => H.keepAlive(P));
  const frames = (P, n) => P.page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

  /* in B's page: A's display, where its weapon is drawn from, and the stage
     over A read with the weapons layers on and off, in one moment */
  const READ = (id) => {
    const app = window._pixiRenderer && window._pixiRenderer.app;
    const R = app && app.renderer;
    const st = [app && app.stage];
    let d = null;
    while (st.length && !d) { const c = st.pop(); if (c && c.label === 'other_' + id) d = c; else if (c && c.children) for (const k of c.children) st.push(k); }
    if (!R || !d || !d._weaponContainer) return { error: 'no figure or weapon', d: !!d };
    const wc = d._weaponContainer;
    const bb = d.getBounds();
    const frame = new (app.screen.constructor)(Math.floor(bb.minX) - 4, Math.floor(bb.minY) - 4, Math.ceil(bb.maxX - bb.minX) + 8, Math.ceil(bb.maxY - bb.minY) + 8);
    const read = () => R.extract.pixels({ target: app.stage, frame, resolution: R.resolution });
    const cmp = (P, Q) => {
      let n = 0, over8 = 0, max = 0;
      const w = Math.min(P.width, Q.width), h = Math.min(P.height, Q.height);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * P.width + x) * 4, j = (y * Q.width + x) * 4;
        const dd = Math.max(Math.abs(P.pixels[i] - Q.pixels[j]), Math.abs(P.pixels[i + 1] - Q.pixels[j + 1]), Math.abs(P.pixels[i + 2] - Q.pixels[j + 2]));
        if (dd > 2) n++;
        if (dd > 8) over8++;
        if (dd > max) max = dd;
      }
      return { pixels: w * h, over2: n, over8, max };
    };
    const layer = wc.parentRenderLayer ? wc.parentRenderLayer.label : null;
    const withLayer = read();
    window.__btWeaponLayerSet(false);
    const inPlace = read();
    window.__btWeaponLayerSet(true);
    return { layer, visible: wc.visible, probe: window.__btWeaponLayer(), frame: [frame.x, frame.y, frame.width, frame.height], same: cmp(withLayer, inPlace) };
  };
  const settle = async (P, want) => {
    let r = null;
    for (let i = 0; i < 30; i++) {
      await frames(P, 4);
      r = await P.page.evaluate(READ, idA);
      if (r && !r.error && want(r)) break;
    }
    return r;
  };

  let idA = null;
  try {
    const eq = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => null);
    rec.ok('setup: A carries a greatsword', !!(eq && eq.ok), eq);
    await H.waitMutualSight(A, B);
    idA = await H.readState(A, (S) => S.myId);
    const posB = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
    /* A north of B (the back layer), C well away */
    await H.hopTo(A, posB.x + 80, posB.y - 140);
    await H.hopTo(C, posB.x - 400, posB.y + 300);
    await A.page.waitForTimeout(2500);

    /* ── 1. alone ── */
    const r1 = await settle(B, (r) => !!r.layer);
    console.log('  weaponlayer, A alone:', JSON.stringify(r1));
    rec.ok('A alone: its weapon is drawn by a weapons layer, first or last in its world layer',
      !!r1 && !r1.error && /^weapons_(back|front)_/.test(r1.layer || ''), r1);
    rec.ok('...and the stage over A is the same picture as with the weapons in place (under 0.5% of its pixels off by more than 8)',
      !!r1 && !r1.error && r1.same.over8 <= r1.same.pixels * 0.005, r1 && r1.same);

    /* ── 2. C standing just in front of A, over its weapon ── */
    const posA = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.hopTo(C, posA.x + 6, posA.y + 14);
    await C.page.waitForTimeout(2500);
    const r2 = await settle(B, (r) => r.layer === null);
    console.log('  weaponlayer, C over A:', JSON.stringify(r2));
    rec.ok('C standing over A\'s weapon: A\'s weapon stays in place (nothing drawn out of order where they overlap)',
      !!r2 && !r2.error && r2.layer === null, r2);
    rec.ok('...and the picture is the same both ways (under 0.5% of its pixels off by more than 8)',
      !!r2 && !r2.error && r2.same.over8 <= r2.same.pixels * 0.005, r2 && r2.same);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    for (const s of stops) s();
  }
}
