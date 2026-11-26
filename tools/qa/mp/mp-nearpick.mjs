/* ═══ v2.3.6556: THE NEAREST THREAT FIRST, PLAYED ON A PHONE (card CT part 23) ═══
 *
 * The owner, 2026-11-25, with the bow in `?manual=5`: "I'm having some
 * trouble with archery locking on monsters that aren't the monsters closest
 * to the bro ... the monster closest to me looks like the only threat and
 * it's locking somewhere else."  Played with REAL touches (CDP
 * Input.dispatchTouchEvent) on an upright phone in the Wheel, with the bow:
 *
 *   1. the stand: two real monsters of the Wheel, a NEAR one (on screen,
 *      well off the facing's line, inside the cone) and a FAR one (near the
 *      line), and no other in the bow's cone and range; the body turned
 *      toward the far one by the left stick (a 20% turn);
 *   2. the page's own state at the press, read back and put through
 *      game/sight.js: the old rule (`?nearpick=0`, the least angle) would
 *      pick the FAR one, the new the NEAR one (a guard: the stand tells the
 *      two apart, else it tries another pair);
 *   3. ONE press of Attack (the right disc, at its centre): the latch takes
 *      the NEAR one (S._latchId);
 *   4. no page errors.
 * The rule's every edge is server/test/sight.test.mjs 12 and latch.test.mjs 7.
 */
import * as H from './harness.mjs';
import { sightPick, sightRange, FACE_ANGLE } from '../../../src/game/sight.js';
export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
/* H.readState passes the page's S alone: an argument goes into the function's text */
const bind = (fn, arg) => ({ toString: () => `(S) => (${fn.toString()})(S, ${JSON.stringify(arg)})` });

/* A stand: for each pair of live monsters at full health (near N, far F) and
   each of the eight drawn facings, a spot for the body with F 420 to 580 out
   near the facing's line and N at most 0.7 of that, 25 to 42 degrees off it,
   inside the view as it is drawn round the body; no third live monster in
   the cone within 760.  The nearest such spot to the body wins. */
const STAND = (S, o) => {
  const FACE = { east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4, west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4 };
  const off = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  const P0 = S.player, hw = (S._viewW || 390) / 2 - 30, hh = (S._viewH || 600) / 2 - 30;
  const live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp == null || (m.curHp > 0 && !(m.curHp < m.maxHp))) && isFinite(m.x) && isFinite(m.y)
    && Math.hypot(m.x - P0.x, m.y - P0.y) < o.maxD && (o.skip || []).indexOf(String(m.id)) < 0);
  const deg = Math.PI / 180;
  let best = null;
  for (const F of live) for (const N of live) {
    if (F === N) continue;
    const gap = Math.hypot(F.x - N.x, F.y - N.y);
    if (gap < 200 || gap > 760) continue;
    for (const face of Object.keys(FACE)) for (const dB of [440, 500, 560]) for (const dl of [-6, 0, 6]) {
      const a = FACE[face] + dl * deg, x = F.x - Math.cos(a) * dB, y = F.y - Math.sin(a) * dB;
      const dN = Math.hypot(N.x - x, N.y - y), oN = off(Math.atan2(N.y - y, N.x - x), FACE[face]);
      if (dN < 110 || dN > 0.7 * dB || oN < 25 * deg || oN > 42 * deg) continue;
      if (Math.abs(N.x - x) > hw || Math.abs(N.y - y) > hh) continue;
      let clear = true;
      for (const q of live) {
        if (q === F || q === N) continue;
        const dq = Math.hypot(q.x - x, q.y - y);
        if (dq < 260 || (dq < 760 && off(Math.atan2(q.y - y, q.x - x), FACE[face]) < 60 * deg)) { clear = false; break; }
      }
      if (!clear) continue;
      const far = Math.hypot(x - P0.x, y - P0.y);
      if (!best || far < best.far) best = { near: String(N.id), farId: String(F.id), x: Math.round(x), y: Math.round(y), face, a: FACE[face], dN: Math.round(dN), dF: dB, far: Math.round(far) };
    }
  }
  return best;
};

/* the page's state the sight reads, at once */
const SIGHTED = (S) => ({
  me: { x: S.player.x, y: S.player.y }, facing: S._renderFacing || null, fa: S._facingAngle,
  cam: S.camera ? { x: S.camera.x, y: S.camera.y, w: S._viewW, h: S._viewH } : null,
  mons: (S.monsters || []).filter((m) => m && isFinite(m.x)).map((m) => ({ id: String(m.id), x: m.x, y: m.y, alive: !!m.alive, curHp: m.curHp })),
  sight: S._sightId == null ? null : String(S._sightId), latch: S._latchId == null ? null : String(S._latchId), phase: S._latchPhase || 'idle',
});

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    const P = await H.newPlayer(browser, { name: 'Nearbro', wsPort, webPort, viewport: UPRIGHT, touch: true, dpr: 3, world: 'wheel', query: 'manual=5&wheelwhole' });
    players.push(P);
    P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(2000);
    const cdp = await P.ctx.newCDPSession(P.page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 });
    /* past the Mayor's gate (mp-twobuttons' way): a new character is held in BroTown's safe circle until tut_1 */
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
      keep(); clearInterval(window.__ctGateOpen); window.__ctGateOpen = setInterval(keep, 100);
    });
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
    await H.waitFor(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'bow') || !!(S.rpg && S.rpg.rangedWeapon), (v) => v, { timeout: 15000, label: 'the kit' }).catch(() => null);
    const eq = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch((e) => ({ ok: false, why: String(e) }));
    rec.ok('a bow in hand (guard)', !!(eq && eq.ok), eq);
    await H.waitFor(P, (S) => S.rpg && S.rpg.activeSlot, (v) => v === 'ranged', { timeout: 10000, label: 'the bow active' }).catch(() => null);

    const disc = await P.page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; };
      return { left: r(document.querySelector('.bt-joystick-base')), right: r(document.querySelector('.bt-rjoy-base')) };
    });
    rec.ok('both discs on screen (guard)', !!(disc.left && disc.right), disc);
    if (!disc.left || !disc.right) return;
    const c = { x: disc.left.x, y: disc.left.y, id: 1 }, Rl = disc.left.w / 2;

    const skip = [];
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      const st = await H.readState(P, bind(STAND, { maxD: 3200, skip }));
      rec.ok(`1. try ${attempt}: a stand with a near monster on screen and a far one on the line (guard)`, !!st, st);
      if (!st) break;
      skip.push(st.near, st.farId);
      await H.hopTo(P, st.x, st.y, { tries: 160 });
      await P.page.waitForTimeout(1000);
      /* turn toward the far one: a 20% turn of the left stick (the facing drawn snaps to its eight) */
      const at = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? Math.atan2(m.y - S.player.y, m.x - S.player.x) : null; }, st.farId));
      const ang = at == null ? st.a : at;
      const pt = { x: c.x + 0.2 * Rl * Math.cos(ang), y: c.y + 0.2 * Rl * Math.sin(ang), id: 1 };
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [pt]);
      await H.waitFor(P, (S) => S._renderFacing, (v) => !!v, { timeout: 4000, label: 'a facing' }).catch(() => null);
      await P.page.waitForTimeout(600);
      await touch('touchEnd', [pt]);
      /* the frame's own sighting settles (the renderer's clock: TRAPS 200) */
      await H.waitFor(P, (S) => S._sightId == null ? null : String(S._sightId), (v) => v != null, { timeout: 8000, label: 'sighted' }).catch(() => null);
      /* 2. the state at the press, through the rules */
      const s = await H.readState(P, SIGHTED);
      const face = FACE_ANGLE[s.facing] != null ? FACE_ANGLE[s.facing] : s.fa;
      const R = sightRange('ranged', 1);
      const view = s.cam && s.cam.w > 0 && s.cam.h > 0 ? s.cam : null;
      const pNew = sightPick(s.me, face, s.mons, R, null, view);
      const newId = pNew ? pNew.id : null;
      const pOld = sightPick(s.me, face, s.mons, R, null, null, true);
      const oldId = pOld ? pOld.id : null;
      const tells = newId === st.near && oldId === st.farId;
      rec.ok(`2. try ${attempt}: the stand tells the rules apart: the new picks the near one (${newId}), the old the far (${oldId}) (guard)`, tells, { st, newId, oldId, facing: s.facing, sight: s.sight });
      if (!tells) continue;
      /* 3. ONE press of Attack */
      await touch('touchStart', [{ x: disc.right.x, y: disc.right.y, id: 2 }]);
      await P.page.waitForTimeout(120);
      await touch('touchEnd', [{ x: disc.right.x, y: disc.right.y, id: 2 }]);
      const lk = await H.waitFor(P, (S) => ({ phase: S._latchPhase || 'idle', id: S._latchId == null ? null : String(S._latchId) }), (v) => v.phase !== 'idle',
        { timeout: 8000, label: 'the latch' }).catch(() => null);
      rec.ok(`3. one press of Attack with the bow: the latch takes the NEAR monster (${st.near}, ${st.dN} px), not the far one on the line (${st.farId}, ${st.dF} px)`,
        !!lk && lk.id === st.near, { lk, st });
      done = true;
    }
    rec.ok('3. the press was played (a stand that tells the rules apart was found)', done, { skip });
    rec.ok('4. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
