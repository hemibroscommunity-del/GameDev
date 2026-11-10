/* ═══ THE TOWN BLUFF: A JUMP COURSE A MINUTE FROM THE SQUARE (v2.3.4456, docs/specs/rise-chest.md) ═══
 *
 * The owner: "it would be cool to have some elevation and obstacle areas where
 * [the double jump] can be put to use", and, asked where the first public ones
 * go, "Go recommended": the Lagoon Islet (v2.3.4453), then a course near
 * BroTown.  This is the course: on the commons' grass north-east of town, a
 * terrace its vines (or a sprinting jump) get you up, and on it a ledge only
 * the flip reaches, a chest on top.
 *
 * One phone in the world against a real worker, nothing asked in its address:
 *   1. the rises came, the Bluff's two among them, AFTER the islet's;
 *   2. nothing the world places stands on it (the keep-out);
 *   3. he walks from where a player arrives to its foot (it is near);
 *   4. the terrace's face stops him; its vines take him up;
 *   5. the flip lands him on the ledge;
 *   6. the chest pays its 100 coins, once.
 * Pictures: tools/qa/mp/out/townbluff-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { st, hold, jumpNorth } from './mp-lagoonclimb.mjs';
import { chestPrizeNote } from '../../../src/game/climb.js';

const PHONE = { width: 390, height: 844 };
const HS = 10;
const AIR_MS = 2600;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Bluffer', wsPort, webPort, world: 'wheel', viewport: PHONE, query: `jumpms=${AIR_MS}` });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `townbluff-${name}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, grid: !!(S._tiledWalkable && S._tiledWalkable.wheel && S._tiledWalkable.wheel.length) }),
      (v) => v.zone === 'wheel' && !v.loading && v.grid, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world, its walk grid there (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });
    const start = await st(P);
    const coins0 = await P.page.evaluate(() => { const S = window._gameState.current; return (S.rpg && typeof S.rpg.coins === 'number') ? S.rpg.coins : null; });

    /* ── 1. the rises came ── */
    const c0 = await P.page.evaluate(() => window.__btClimb && window.__btClimb());
    const T = c0 && c0.rises.find((r) => r.id === 'bluff-terrace');
    const L = c0 && c0.rises.find((r) => r.id === 'bluff-ledge');
    rec.ok('the Town Bluff\'s two rises came with the world, after the islet\'s two: a terrace (72 px face, vines) and on it a ledge (144 px, a chest)',
      !!c0 && c0.on && c0.rises.length === 4 && c0.rises[0].id === 'lagoon-terrace' && c0.rises[1].id === 'lagoon-ledge'
      && !!T && T.h === 72 && !!T.climb && !!L && L.h === 144 && !!L.chest && L.box.x0 > T.box.x0 && L.box.x1 < T.box.x1 && L.box.y1 <= T.face.y0, c0 && c0.rises.map((r) => r.id));
    if (!T || !L) return;
    const far = Math.round(Math.hypot((T.box.x0 + T.box.x1) / 2 - start.x, T.face.y1 - start.y));
    rec.ok(`it is near where a player arrives (${far} px: about ${Math.round(far / 150 / 10) * 10 || 10} s at a walk), with the caps said`, far < 3500 && await P.page.evaluate(() => { const S = window._gameState.current; return !!(S._serverCaps && S._serverCaps.risechest === true); }), { far });

    /* ── 2. nothing placed stands on it ── */
    const onIt = await P.page.evaluate((b) => {
      const S = window._gameState.current;
      const hits = [];
      const lists = [S.gatherNodes || [], S.monsters || [], S.npcs || []];
      for (const list of lists) for (const o of list) { if (o && typeof o.x === 'number' && o.x >= b.x0 && o.x < b.x1 && o.y >= b.y0 && o.y < b.y1 + 48) hits.push(o.nodeType || o.type || o.name || 'thing'); }
      return hits;
    }, T.box);
    rec.ok('no resource, monster or townsperson stands on it', onIt.length === 0, onIt);

    /* ── 3. to its foot ── */
    const vx = (T.climb.x0 + T.climb.x1) / 2;
    const footFeet = T.face.y1 + HS + 24;
    await H.hopTo(P, vx - 70, footFeet + 60 - feetDy, { tries: 80 });
    await P.page.waitForTimeout(2500);
    await shot('1-foot');
    /* ── 4. the face stops him; the vines take him up ── */
    await hold(P, ['w'], 3000, (o) => o.length > 4 && Math.abs(o[o.length - 1].y - o[o.length - 3].y) < 0.3);
    const atFace = await st(P);
    rec.ok('the terrace\'s face stops him at its foot, walking (beside the vines)', atFace.y + feetDy - HS - T.face.y1 >= -0.5 && atFace.y + feetDy - HS - T.face.y1 < 8 /* a walk stops a few px off a wall */, { feet: atFace.y + feetDy, foot: T.face.y1 });
    await H.hopTo(P, vx, footFeet - feetDy, { tries: 30 });
    await P.page.waitForTimeout(700);
    const climbS = await hold(P, ['w'], 30000, (o) => {
      const s = o[o.length - 1];
      return o.some((q) => q.climb && q.climb.climbing) && !(s.climb && s.climb.climbing);
    });
    const up = await st(P);
    await shot('2-terrace');
    rec.ok('its vines take him up on to the terrace', climbS.some((s) => s.climb && s.climb.climbing) && up.y + feetDy + HS <= T.face.y0 + 0.5 && up.y + feetDy > T.box.y0, { feet: up.y + feetDy, top: T.face.y0 });

    /* ── 5. the flip gets him up the ledge ── */
    const lx = (L.face.x0 + L.face.x1) / 2 + 30;
    const ledgeFoot = L.face.y1 + HS + 2;
    let flip = null;
    for (let k = 0; k < 5; k++) {
      await H.hopTo(P, lx, ledgeFoot - feetDy, { tries: 20 });
      await P.page.waitForTimeout(500);
      await P.page.keyboard.down('w'); await P.page.keyboard.down('Shift');
      try { flip = await jumpNorth(P, 0.74); } finally { await P.page.keyboard.up('Shift'); await P.page.keyboard.up('w'); }
      console.log(`    flip ${k + 1}: ${JSON.stringify(flip)}`);
      if (flip && flip.landing && flip.landing.fate === 'top') break;
      await P.page.waitForTimeout(800);
    }
    const onLedge = await st(P);
    rec.ok('a sprinting jump with a flip lands him on the ledge\'s top', !!flip && !!flip.landing && flip.landing.id === 'bluff-ledge' && flip.landing.fate === 'top' && onLedge.y + feetDy + HS <= L.face.y0 + 0.5 && onLedge.y + feetDy > L.box.y0, { flip, feet: onLedge.y + feetDy });

    /* ── 6. the chest ── */
    if (flip && flip.landing && flip.landing.fate === 'top') {
      await H.hopTo(P, (L.chest.x0 + L.chest.x1) / 2, onLedge.y, { tries: 10 });
      const ch = await hold(P, ['w'], 6000, (o) => o[o.length - 1].climb.stats.chestAnswer === 'ok');
      const s1 = ch[ch.length - 1].climb.stats;
      await shot('3-chest');
      await P.page.waitForTimeout(1500);
      const coins1 = await P.page.evaluate(() => { const S = window._gameState.current; return (S.rpg && typeof S.rpg.coins === 'number') ? S.rpg.coins : null; });
      rec.ok(`the chest pays the Bluff's own prize: "${chestPrizeNote(s1.chestCoins)}" (${coins0} -> ${coins1})`,
        s1.chestAnswer === 'ok' && s1.chestCoins === 100 && s1.chestSaid === chestPrizeNote(100) && s1.chestAsks === 1 && (coins0 === null || coins1 === null || coins1 === coins0 + 100), { stats: { answer: s1.chestAnswer, coins: s1.chestCoins, said: s1.chestSaid, asks: s1.chestAsks }, coins0, coins1 });
    }
    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
