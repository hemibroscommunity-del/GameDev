/* ═══ A FIRE GOBLIN'S BURN IS THE BUILDING'S FIRE (v2.3.3878) ═══
 *
 * The owner, 2026-10-29: "Make the fire effect more realistic from fire
 * goblins when you take damage from them. I like the fire effect you drew
 * from taking damage from the burning buildings."
 *
 * A burn (game/elemHits.js, `st: 'burn'`, a fire goblin's) now puts the
 * burning heap's PersonFire (rendering/buildingFire.js, v2.3.3748) on
 * whoever burns, where drawn shapes stood (effectsRenderer
 * _updateElemStatusFx):
 *   1. you, burning: the building's own flames on you, every sprite of them
 *      from the campfire's atlas -- picture burnfire-1-you.png;
 *   2. running while you burn: the sparks and smoke stay where they rose,
 *      behind you, where they used to move as one with you --
 *      burnfire-2-running.png;
 *   3. the burn over: the flames go out, and soon nothing of them is left;
 *   4. another player burning, on your screen: their own fire, let go once
 *      it has died down -- burnfire-3-peer.png;
 *   5. `?burnfire=0` (that player's page): the old drawn flames, no
 *      PersonFire -- burnfire-4-off.png;
 *   and no page errors on either.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* One monster_attack, shaped as the worker sends a fire goblin's burning
   blow, through the game's own dispatcher (as mp-elemhits).  `target`: the
   player it lands on (yours by default). */
const burn = (P, target, stMs) => P.page.evaluate(({ target, stMs }) => {
  const S = window._gameState.current;
  const tid = target || S.myId;
  const o = tid === S.myId ? S.player : (S.others || {})[tid] || S.player;
  window.__btDispatch({ type: 'monster_attack', payload: {
    monsterId: 'qa-burn', targetId: tid, dmg: 3, dmgTaken: 3, zone: S.currentZone,
    attackerX: (o.x || 0) + 24, attackerY: o.y || 0, ability: 'qa', elem: 'flame', st: 'burn', stMs } });
  return tid === S.myId ? S._burnUntil || 0 : ((S.others || {})[tid] || {})._burnUntil || 0;
}, { target, stMs });

/* The sprites drawn inside every 'personFire' on the stage, by picture */
const fireSprites = (P) => P.page.evaluate(() => {
  const r = window._pixiRenderer, st = r && r.app && r.app.stage;
  const set = new Set(); let n = 0, fires = 0;
  const walk = (c, inside) => {
    if (!c || c.visible === false) return;
    const here = inside || c.label === 'personFire';
    if (!inside && here) fires++;
    if (here && c.texture && c.texture.source) { set.add(c.texture.source.uid); n++; }
    for (const k of c.children || []) walk(k, here);
  };
  walk(st, false);
  return { fires, n, uids: [...set], atlas: window.__btBuildingFire ? window.__btBuildingFire.atlas() : null };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `burnfire-${name}.png`) });
  const A = await H.newPlayer(browser, { name: 'Kindling', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push('A ' + String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(A);
  /* the second player's page draws the old flames */
  const B = await H.newPlayer(browser, { name: 'Tinder', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'burnfire=0' });
  B.page.on('pageerror', (e) => errors.push('B ' + String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  for (const P of [A, B]) await P.page.evaluate(() => { window.__btProbe = true; });
  await A.page.waitForTimeout(1500);
  const setup = await A.page.evaluate(() => {
    const S = window._gameState.current;
    return { zone: S.currentZone, dispatch: typeof window.__btDispatch === 'function', atlas: !!(window.__btBuildingFire && window.__btBuildingFire.atlas()) };
  });
  const bId = await H.readState(B, (S) => S.myId);
  rec.ok(`setup: both in the world (${setup.zone}), the dispatcher and the campfire's atlas there`, setup.zone === 'wheel' && setup.dispatch && setup.atlas, setup);

  /* This box draws a few frames a second (TRAPS §200): every wait below is
     the page's own, polled in it, and a burn the test looks at is held on
     past its 5 s (game/elemHits.js MAX_ST_MS) by its clock, then ended. */
  const until0 = (P, id, ms) => P.page.evaluate(({ id, ms }) => {
    const S = window._gameState.current;
    const R = id ? (S.others || {})[id] : S;
    if (R) R._burnUntil = Date.now() + ms;
  }, { id, ms });
  const waitPage = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);

  /* ── 1. you, burning ── */
  const until = await burn(A, null, 5000);
  await until0(A, null, 120000);
  const lit = await waitPage(A, () => { const f = window.__btPersonFire; return !!(f && f.visible && f.flames >= 3); }, null, 60000);
  const me = await A.page.evaluate(() => window.__btPersonFire || null);
  const spr = await fireSprites(A);
  await shot(A, '1-you');
  rec.ok(`you burn: the building's own flames on you (${me ? me.flames : 0} flames, heat ${me ? me.heat : 0})`,
    until > 0 && lit && !!me && me.visible && me.flames >= 3, { lit, me });
  rec.ok(`...every sprite of them from the campfire's atlas (${spr.n} sprites, pictures ${spr.uids.join(',')} = ${spr.atlas})`,
    spr.fires === 1 && spr.n > 0 && spr.uids.length === 1 && spr.uids[0] === spr.atlas, spr);

  /* ── 2. running while you burn: the sparks and smoke left behind ── */
  const run1 = (sx) => A.page.evaluate((sx) => new Promise((res) => {
    const S = window._gameState.current;
    const x0 = S.player.x, t0 = Date.now();
    S.stickX = sx; S.stickY = 0;
    const iv = setInterval(() => {
      const dx = S.player.x - x0;
      if (Math.abs(dx) < 120 && Date.now() - t0 < 60000) return;
      clearInterval(iv);
      const p = window.__btPersonFire || {};
      S.stickX = 0;
      res({ dx: Math.round(dx), lagX: p.lagX, bits: p.bits, flames: p.flames, ms: Date.now() - t0 });
    }, 50);
  }), sx);
  let ran = await run1(1);
  if (Math.abs(ran.dx) < 60) ran = await run1(-1);
  await shot(A, '2-running');
  console.log('    ran: ' + JSON.stringify(ran));
  rec.ok(`ran ${ran.dx} px while burning (guard)`, Math.abs(ran.dx) >= 60 && ran.flames >= 3, ran);
  rec.ok(`...its sparks and smoke stay behind you (${ran.bits} of them, on average ${ran.lagX} px across from you, against your run of ${ran.dx})`,
    ran.bits > 0 && Math.sign(ran.lagX) === -Math.sign(ran.dx) && Math.abs(ran.lagX) >= 15, ran);

  /* ── 3. the burn over: out, and then gone (its smoke lives some 40
     frames of its own clock: minutes here) ── */
  await until0(A, null, 0);
  const outFl = await waitPage(A, () => { const f = window.__btPersonFire; return !!(f && f.flames === 0); }, null, 60000);
  rec.ok('the burn over: the flames go out', outFl, await A.page.evaluate(() => window.__btPersonFire || null));
  const outGone = await waitPage(A, () => { const f = window.__btPersonFire; return !!(f && !f.visible); }, null, 180000);
  const out = await A.page.evaluate(() => window.__btPersonFire || null);
  rec.ok(`...and its last sparks and smoke drift off, nothing left drawn (${out ? out.bits : '?'} left, drawn: ${out ? out.visible : '?'})`,
    outGone && !!out && out.flames === 0 && !out.visible, out);

  /* ── 4. another player burning, on your screen ── */
  /* the other player in sight again first (the waits above are minutes on
     this box), and the burn held on whatever record the screen keeps for
     them: a snapshot may make it afresh, and the test holds the burn, not
     the record (the worker's real burn refreshes it the same way) */
  await H.waitMutualSight(A, B);
  const bUntil = await burn(A, bId, 5000);
  await until0(A, bId, 120000);
  const peerLit = await waitPage(A, (id) => {
    const S = window._gameState.current, o = S && S.others ? S.others[id] : null;
    if (o && !(o._burnUntil > Date.now() + 2000)) o._burnUntil = Date.now() + 120000;
    const f = (window.__btPeerFires || {})[id]; return !!(f && f.visible && f.flames >= 3);
  }, bId, 90000);
  const peer = await A.page.evaluate((id) => (window.__btPeerFires || {})[id] || null, bId);
  const seen = await A.page.evaluate((id) => {
    const S = window._gameState.current, o = S && S.others ? S.others[id] : null;
    return { there: !!o, zone: o ? (o.zone || o.z || null) : null, mine: S.currentZone, dead: !!(o && o._isDead),
      notDrawn: !!(S._peersNotDrawn && S._peersNotDrawn.has(id)), burnLeft: o && o._burnUntil ? o._burnUntil - Date.now() : 0 };
  }, bId);
  const spr2 = await fireSprites(A);
  await shot(A, '3-peer');
  rec.ok(`${bId} burning on your screen: their own fire (${peer ? peer.flames : 0} flames)`, bUntil > 0 && peerLit && !!peer && peer.visible && peer.flames >= 3, { bUntil, peerLit, peer, seen });
  rec.ok(`...from the campfire's atlas too (${spr2.fires} fires drawn, pictures ${spr2.uids.join(',')})`,
    spr2.fires >= 1 && spr2.uids.length === 1 && spr2.uids[0] === spr2.atlas, spr2);
  await until0(A, bId, 0);
  const let0 = await waitPage(A, (id) => {
    const S = window._gameState.current, o = S && S.others ? S.others[id] : null;
    if (o && o._burnUntil > Date.now()) o._burnUntil = 0;
    return Object.keys(window.__btPeerFires || {}).length === 0;
  }, bId, 180000);
  const kept = await A.page.evaluate(() => Object.keys(window.__btPeerFires || {}).length);
  rec.ok(`...and let go once it has died down (${kept} kept)`, let0 && kept === 0, kept);

  /* ── 5. `?burnfire=0`: the old drawn flames ── */
  await B.page.evaluate(() => { window.__btElemFxDrawn = Object.create(null); });
  await burn(B, null, 5000);
  await until0(B, null, 120000);
  const drew = await waitPage(B, () => ((window.__btElemFxDrawn || {}).burn || 0) >= 3, null, 60000);
  const off = await B.page.evaluate(() => ({ fire: window.__btPersonFire || null, drawn: (window.__btElemFxDrawn || {}).burn || 0 }));
  await shot(B, '4-off');
  await until0(B, null, 0);
  rec.ok(`?burnfire=0: the old drawn flames (${off.drawn} frames), no PersonFire (${off.fire ? off.fire.flames : 0} flames)`,
    drew && off.drawn > 0 && (!off.fire || (off.fire.flames === 0 && !off.fire.visible)), off);

  rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors);
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
