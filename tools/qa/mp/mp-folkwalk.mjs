/* ═══ v2.3.4020: THE TOWNSFOLK WALK AROUND AND WORK -- on a phone ═══
 *
 * The owner: "Make NPCs walk around and do stuff now since it doesn't make
 * much memory anymore." (docs/specs/living-town.md).  A phone (390 x 844,
 * touch) in the world's BroTown:
 *   1. their days are on (window.__btFolkWalk): all 21, drawn live;
 *   2. over ~14 s the keepers and locals move along their loops while every
 *      quest giver stays within a step or two of his spot (tethered);
 *   3. at most six walk near the screen at once (sampled every half second);
 *   4. a keeper and a giver at work, in the player's own poses: Chef Blaze's
 *      cleaver and the blacksmith's hammer (the mining swing), Old Man Reel
 *      fishing (pictures: out/folkwalk-*.png);
 *   5. a quest giver stops and turns to face you when you come near (Mayor
 *      Bro, within 200 px);
 *   6. walk up to a MOVING keeper and tap him: Sterling, walking, opens the
 *      Bank; and while it is open he stands, facing you;
 *   7. no page errors.
 * Run after `npm run build`: node tools/qa/mp/run.mjs folkwalk
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const HIDE = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Walkbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `folkwalk-${name}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const alive = H.keepAlive(P);
  const folk = () => P.page.evaluate(() => (window.__btFolkWalk ? window.__btFolkWalk() : null));
  const drawnOf = (name) => P.page.evaluate((nm) => (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.name === nm) || null, name);
  const npcAt = (name) => P.page.evaluate((nm) => { const S = window._gameState.current; const q = (S.npcs || []).find((m) => m.name === nm); return q ? { x: q.x, y: q.y } : null; }, name);
  const cssOf = (name) => P.page.evaluate((nm) => {
    const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
    const n = (S.npcs || []).find((q) => q.name === nm);
    return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26 } : null;
  }, name);
  const goNear = async (name, dx, dy) => {
    for (let k = 0; k < 2; k++) {
      const n = await npcAt(name);
      if (!n) return false;
      await H.hopTo(P, n.x + dx, n.y + dy, { step: 100, gap: 260, tries: 90 });
    }
    await P.page.waitForTimeout(800);
    return true;
  };
  /* wait (up to ms) until `name` is drawn in `pose` */
  const waitPose = async (name, pose, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const d = await drawnOf(name);
      if (d && d.pose === pose) return d;
      await P.page.waitForTimeout(250);
    }
    return drawnOf(name);
  };

  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inWheel, inWheel);
    if (!inWheel) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 }).catch(() => null);
    await P.page.addStyleTag({ content: HIDE }).catch(() => {});
    await P.page.waitForTimeout(2500);

    /* ── 1. on ── */
    const f0 = await H.waitFor(P, () => (window.__btFolkWalk ? window.__btFolkWalk() : null), (v) => !!v && v.on && v.folk.length >= 21,
      { timeout: 20000, label: 'their days' }).catch(() => null);
    const lf = await P.page.evaluate(() => (window.__btLookFolk ? window.__btLookFolk() : null));
    rec.ok(`1. their days are on: ${f0 ? f0.folk.length : 0} townsfolk, drawn live (${lf && lf.on})`, !!f0 && f0.on && f0.folk.length === 21 && !!lf && lf.on, { f0: f0 && { on: f0.on, n: f0.folk.length }, lf });
    if (!f0) return;

    /* ── 2 and 3. they move; givers stay; at most six walk near the screen ── */
    const start = Object.fromEntries(f0.folk.map((n) => [n.name, n]));
    let maxWalkers = 0, maxHomeGiver = 0;
    const travelled = Object.create(null);
    for (let i = 0; i < 28; i++) {
      await P.page.waitForTimeout(500);
      const f = await folk();
      if (!f) continue;
      maxWalkers = Math.max(maxWalkers, f.walkers);
      for (const n of f.folk) {
        const s = start[n.name];
        if (s) travelled[n.name] = Math.max(travelled[n.name] || 0, Math.hypot(n.x - s.x, n.y - s.y));
        if (n.giver && n.home) maxHomeGiver = Math.max(maxHomeGiver, Math.hypot(n.x - n.home[0], n.y - n.home[1]));
      }
    }
    const walkers = f0.folk.filter((n) => !n.giver).map((n) => n.name);
    const moved = walkers.filter((n) => (travelled[n] || 0) > 20);
    rec.ok(`2. the keepers and locals walk their loops: ${moved.length} of ${walkers.length} moved over 20 px in 14 s (${moved.join(', ')})`,
      moved.length >= 5, { travelled });
    rec.ok(`...while every quest giver stays within a step or two of his spot (at most ${Math.round(maxHomeGiver)} px)`, maxHomeGiver <= 31, maxHomeGiver);
    rec.ok(`3. at most six walk near the screen at once (at most ${maxWalkers} seen)`, maxWalkers <= 6, maxWalkers);

    /* ── 4. at work ── */
    await goNear('Chef Blaze', 30, 180);
    const chef = await waitPose('Chef Blaze', 'mine', 45000);
    await shot('chef-blaze');
    rec.ok(`4. Chef Blaze works his cleaver at the Cookhouse: drawn in the mining swing (${chef && chef.pose})`, !!chef && chef.pose === 'mine' && chef.live, chef);
    await goNear('Blacksmith Bro', 0, 260);   /* past the 200 px a giver stops for you at */
    const smith = await waitPose('Blacksmith Bro', 'mine', 45000);
    await shot('blacksmith');
    rec.ok(`...the blacksmith hammers at the forge, from 260 px off (${smith && smith.pose})`, !!smith && smith.pose === 'mine', smith);
    await goNear('Old Man Reel', 40, -240);
    const reel = await waitPose('Old Man Reel', 'fish', 45000);
    await shot('old-man-reel');
    rec.ok(`...and Old Man Reel fishes by the river (${reel && reel.pose})`, !!reel && reel.pose === 'fish', reel);

    /* ── 5. a giver stops and faces you ── */
    await goNear('Mayor Bro', 110, 40);
    await P.page.waitForTimeout(1500);
    const m1 = await npcAt('Mayor Bro');
    await P.page.waitForTimeout(2000);
    const m2 = await npcAt('Mayor Bro');
    const mf = ((await folk()) || { folk: [] }).folk.find((n) => n.name === 'Mayor Bro');
    const md = await drawnOf('Mayor Bro');
    await shot('mayor-faces');
    rec.ok(`5. Mayor Bro, a quest giver, stops for you and turns to face you (facing ${mf && mf.face}, drawn ${md && md.pose})`,
      !!m1 && !!m2 && Math.hypot(m1.x - m2.x, m1.y - m2.y) < 0.5 && !!mf && /east/.test(mf.face || '') && md && md.pose === 'stand', { m1, m2, mf, md });

    /* ── 6. walk up to a moving keeper and tap him ── */
    let tap = null, wasMoving = null;
    for (let k = 0; k < 6 && !(tap && tap.result === 'opens'); k++) {
      await goNear('Sterling', 40, 70);
      /* wait for him to be walking */
      const end = Date.now() + 30000;
      let a = null, b = null;
      while (Date.now() < end) {
        a = await npcAt('Sterling');
        await P.page.waitForTimeout(150);
        b = await npcAt('Sterling');
        const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
        if (a && b && Math.hypot(b.x - a.x, b.y - a.y) > 1.5 && Math.hypot(b.x - me.x, b.y - me.y) < 260) break;
      }
      wasMoving = a && b ? Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 10) / 10 : null;
      const at = await cssOf('Sterling');
      const t0 = Date.now();
      if (at && at.x > 0 && at.x < PHONE.width && at.y > 0 && at.y < PHONE.height) await P.page.touchscreen.tap(at.x, at.y);
      await P.page.waitForTimeout(600);
      tap = await P.page.evaluate((t) => { const r = window.__btNpcTap; return r && r.ts >= t - 50 ? r : { stale: r || null }; }, t0);
      if (!(tap && tap.result === 'opens')) {
        await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-close'); if (c) c.click(); if (window.__btBuildingWindow) window.__btBuildingWindow.open(null); });
        await P.page.waitForTimeout(400);
      }
    }
    const bank = await H.waitFor(P, () => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; },
      (v) => v === 'bank', { timeout: 4000, label: 'the bank open' }).catch(() => null);
    await shot('sterling-tapped');
    rec.ok(`6. a tap on Sterling while he walks (${wasMoving} px in 150 ms) opens the Bank`, wasMoving > 1.5 && !!tap && tap.npc === 'Sterling' && tap.result === 'opens' && bank === 'bank', { wasMoving, tap, bank });
    const s1 = await npcAt('Sterling');
    await P.page.waitForTimeout(1800);
    const s2 = await npcAt('Sterling');
    const sf = ((await folk()) || { folk: [] }).folk.find((n) => n.name === 'Sterling');
    rec.ok(`...and while his window is open he stands, facing you (${sf && sf.face})`, !!s1 && !!s2 && Math.hypot(s1.x - s2.x, s1.y - s2.y) < 0.5 && !!sf && !!sf.face, { s1, s2, sf });
    await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-close'); if (c) c.click(); if (window.__btBuildingWindow) window.__btBuildingWindow.open(null); });

    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 6));
  } finally {
    alive();
    await P.ctx.close().catch(() => {});
  }
}
