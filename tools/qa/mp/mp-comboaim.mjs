/* ═══ v2.3.6650: THE COMBO GOES AT THE LAST TARGET, PLAYED ON A PHONE (card PAD part 14; `?manual=5`) ═══
 *
 * The owner, 2026-11-28: "Also for combos it's hard to have to tap the
 * button and aim at the same time.  Just make the combo auto-attack the last
 * target.  If the line of site is lined up just make the combo be first
 * attack".  The rule is src/game/comboAim.js (tools/guards/combo-aim.test.mjs
 * plays it on the real specialAttack); this plays the page with REAL touches
 * (CDP Input.dispatchTouchEvent) in the Wheel, against a real monster, with
 * a bow (the Attack disc a stick, card PAD part 13):
 *
 *   a. the thumb drags the disc toward the monster until the WORKER says a
 *      hit landed (monster_hit, __btHitLog): it is the last target; lifted;
 *      the bro turned AWAY with the left stick; Special tapped with no thumb
 *      on the disc: the special leaves toward the monster at once, the worker
 *      echoes a new hit on it, and nothing is locked (upright and sideways);
 *   b. a thumb aiming the disc AWAY, Special tapped by another finger: the
 *      stick wins, nothing goes at the monster (today's: the bow's special
 *      readied along the aim);
 *   c. `?comboaim=0` (history.replaceState: read at each ask): today's, the
 *      special readied, nothing at the monster; `?comboaim=1` back;
 *   d. the monster killed: Special goes where it goes today (readied);
 *   e. no page errors.
 * Each wait is by the renderer's frames (S._frameCount) or the page's clock,
 * never a 60 fps window (TRAPS 200). */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 375, height: 667 };
const SIDEWAYS = { width: 667, height: 375 };
const DRAG = 46;
const bind = (fn, arg) => ({ toString: () => `(S) => (${fn.toString()})(S, ${JSON.stringify(arg)})` });
const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const DEG = Math.PI / 180;

/* a live monster at full health with room round it, and the side to stand on
   (mp-twobuttons' PICK, smaller) */
const PICK = (S, o) => {
  const P0 = S.player, live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp > 0 || m.curHp == null));
  let best = null;
  for (const m of live) {
    const d = Math.hypot(m.x - P0.x, m.y - P0.y);
    if (d > o.maxD || (o.skip || []).indexOf(String(m.id)) >= 0) continue;
    if (typeof m.curHp === 'number' && typeof m.maxHp === 'number' && m.curHp < m.maxHp) continue;
    let nn = Infinity;
    for (const q of live) if (q !== m) nn = Math.min(nn, Math.hypot(q.x - m.x, q.y - m.y));
    if (!best || nn > best.nn || (nn === best.nn && d < best.d)) best = { id: String(m.id), x: m.x, y: m.y, d, nn: Math.round(nn) };
  }
  return best;
};

/* the page's recorders: every arrow or bolt the moment a frame first sees it,
   and every claim the phone sends */
const TOOLS = () => {
  /* a shot is known by its own stamp (_shotTs), never by its object: the game reuses an arrow's object */
  const S0 = window._gameState.current, seen = new Set();
  const key = (a) => (a._shotTs ? a._shotTs + ':' + (a._sn != null ? a._sn : '') : a);   /* v2.3.6650: a special's arrows carry no stamp: known by their object */   /* never its angle: that changes in flight */
  for (const a of (S0.arrows || [])) if (a) seen.add(key(a));
  window.__rsShots = [];
  window.__rsOut = [];
  cancelAnimationFrame(window.__rsR);
  /* each shot recorded AS IT IS PUSHED (its launch angle: an arrow's angle
     changes in flight, and this box draws a few frames a second); the
     frame's scan only catches one pushed into a list made since (late) */
  const rec = (a, late) => { const S = window._gameState.current; seen.add(key(a)); window.__rsShots.push({ ang: a.ang, sp: !!a.isSpecial, staff: !!a.isStaff, f: S._frameCount || 0, tap: S._tapAtk ? S._tapAtk.ang : null, late: !!late }); };
  const hook = (arr) => { if (!arr || arr.__rs) return; const o = arr.push; arr.push = function (...xs) { for (const a of xs) if (a && !seen.has(key(a))) rec(a, false); return o.apply(this, xs); }; arr.__rs = true; };
  hook(S0.arrows);
  const f = () => {
    const S = window._gameState.current;
    hook(S.arrows);
    for (const a of (S.arrows || [])) if (a && a._shotTs && !seen.has(key(a))) rec(a, true);
    window.__rsR = requestAnimationFrame(f);
  };
  window.__rsR = requestAnimationFrame(f);
  if (S0.channel && !S0.channel.__rs) {
    const orig = S0.channel.send.bind(S0.channel);
    S0.channel.send = (m) => {
      try { const k = m && (m.event || m.type); if (k === 'monster_damage') window.__rsOut.push({ mid: String((m.payload || {}).monsterId), f: S0._frameCount || 0 }); } catch (e) { /* QA only */ }
      return orig(m);
    };
    S0.channel.__rs = true;
  }
};
const MARK = (P) => P.page.evaluate(() => ({ shots: window.__rsShots.length, out: window.__rsOut.length, f: window._gameState.current._frameCount || 0 }));
const SINCE = (P, m) => P.page.evaluate((m) => ({ shots: window.__rsShots.slice(m.shots), out: window.__rsOut.slice(m.out) }), m);
const NOW = (P, id) => H.readState(P, bind((S, id) => {
  const m = (S.monsters || []).find((x) => x && String(x.id) === id);
  return {
    kind: S._discKind || null, latch: S._latchPhase || 'idle', lid: S._latchId == null ? null : String(S._latchId),
    lock: S.lockedTarget ? String(S.lockedTarget.id) : null, aiming: !!S._aiming, auto: !!S.autoAttack,
    queued: S._bowSpecialQueued || 0, face: typeof S._facingAngle === 'number' ? S._facingAngle : null, f: S._frameCount || 0, mana: S.rpg ? S.rpg.mana : null,
    hits: (window.__btHitLog || []).filter((h) => String(h.id) === id).length,
    special: !!document.querySelector('[data-special]'),
    why: m ? { hitAgo: typeof m._hitByMeAt === 'number' ? Date.now() - m._hitByMeAt : null, idT: typeof m.id, vw: S._viewW, vh: S._viewH, cam: S.camera ? [Math.round(S.camera.x), Math.round(S.camera.y)] : null, me: [Math.round(S.player.x), Math.round(S.player.y)], mxy: [Math.round(m.x), Math.round(m.y)], others: (S.monsters || []).filter((x) => x && typeof x._hitByMeAt === 'number').map((x) => [String(x.id), Date.now() - x._hitByMeAt]).slice(0, 4) } : null,
    mon: m ? { alive: !!m.alive, hp: m.curHp, a: Math.atan2(m.y - S.player.y, m.x - S.player.x), d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) } : null,
  };
}, id));
const frames = async (P, n, ms = 30000) => {
  const f0 = (await H.readState(P, (S) => S._frameCount || 0));
  await P.page.waitForFunction((t) => (window._gameState.current._frameCount || 0) >= t, f0 + n, { timeout: ms, polling: 50 }).catch(() => null);
};
const clock = (P, ms) => P.page.waitForFunction((t) => Date.now() >= t, Date.now() + ms, { timeout: ms + 30000, polling: 100 }).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  const players = [];
  const used = [];
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const full = label === 'upright';
      const P = await H.newPlayer(browser, { name: full ? 'Combobro' : 'Sidecombo', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'manual=5&wheelwhole' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2000);
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const me = await H.readState(P, (S) => S.myId);
      const vitals = () => H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 10 });
      await vitals();
      await H.devOp(wsPort, 'quests', me).catch(() => null);
      await P.page.evaluate(() => {   /* past the Mayor's gate (mp-rangedstick's way) */
        const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
        keep(); clearInterval(window.__rsGate); window.__rsGate = setInterval(keep, 100);
      });
      const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
      const eqB = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`${label}: the worker's bow in hand (guard)`, armed.includes('bow') && !!(eqB && eqB.ok), { armed, eqB });
      await frames(P, 4);
      const st0 = await NOW(P, '');
      rec.ok(`${label}: the two buttons, a bow: the Attack disc is a stick (guard)`, st0.kind === 'stick', st0);

      /* a fresh monster, the bro 170 px west of it */
      const fresh = async (tag) => {
        const m = await H.readState(P, bind(PICK, { maxD: 3000, skip: used }));
        rec.ok(`${label}${tag}: a real monster of the Wheel, others away from it (${m && m.nn} px; guard)`, !!m && m.nn >= 300, m);
        if (!m) return null;
        used.push(m.id);
        await H.hopTo(P, Math.round(m.x - 170), Math.round(m.y), { tries: 90 });
        await P.page.waitForTimeout(800);
        return m;
      };
      let mon = await fresh('');
      if (!mon) continue;
      await P.page.evaluate(TOOLS);
      const RD = await P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
      const LD = await P.page.evaluate(() => { const el = document.querySelector('.bt-joystick-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }; });
      rec.ok(`${label}: the Attack disc and the left stick are on screen (guard)`, !!RD && RD.w > 0 && !!LD, { RD, LD });
      if (!RD || !LD) continue;
      const turn = async (a) => {   /* the left stick at 20% of its radius: a turn, no walk */
        const p = { x: LD.x + 0.2 * LD.r * Math.cos(a), y: LD.y + 0.2 * LD.r * Math.sin(a), id: 1 };
        await touch('touchStart', [{ x: LD.x, y: LD.y, id: 1 }]); await frames(P, 1); await touch('touchMove', [p]); await frames(P, 3); await touch('touchEnd', [p]); await frames(P, 2);
      };
      const down = async (a) => {
        const end = { x: RD.x + DRAG * Math.cos(a), y: RD.y + DRAG * Math.sin(a), id: 2 };
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await frames(P, 1);
        await touch('touchMove', [{ x: RD.x + 14 * Math.cos(a), y: RD.y + 14 * Math.sin(a), id: 2 }]);
        await touch('touchMove', [end]);
        return end;
      };
      /* Special tapped by its own finger (id 3), the disc's finger (if any) still down as `held` */
      const special = async (held) => {   /* the state one frame after the press (a readied special lasts 2.5 s, and this box draws a few frames a second); null: no button */
        const SB = await P.page.evaluate(() => { const el = document.querySelector('[data-special]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
        if (!SB) return null;
        const pts = held ? [held] : [];
        await touch('touchStart', pts.concat([{ x: SB.x, y: SB.y, id: 3 }])); await frames(P, 1);
        await touch(pts.length ? 'touchMove' : 'touchEnd', pts.length ? pts : []);   /* CDP: a point left out of the list is lifted, so a move with the disc's finger alone lifts Special's and keeps the disc's down */
        return NOW(P, mon.id);
      };
      /* the bow held toward the monster until the worker says it was hit (or `kill`: until it dies) */
      const hitIt = async (kill) => {
        const s = await NOW(P, mon.id);
        if (!s.mon) return s;
        const end = await down(s.mon.a);
        const h0 = s.hits;
        let last = s;
        const tEnd = Date.now() + (kill ? 40000 : 12000);
        while (Date.now() < tEnd) {
          await frames(P, 2);
          last = await NOW(P, mon.id);
          if (kill ? (!last.mon || !last.mon.alive || last.mon.hp <= 0) : last.hits > h0) break;
        }
        await touch('touchEnd', [end]);
        await frames(P, 3);
        return last;
      };
      /* wait for the special's shot toward the monster and the worker's new hit on it */
      const watch = async (h0, m0, ms) => {
        const t0 = Date.now();
        let s = await NOW(P, mon.id), got = await SINCE(P, m0);
        while (Date.now() - t0 < ms) {
          await frames(P, 2);
          s = await NOW(P, mon.id); got = await SINCE(P, m0);
          if (s.hits > h0) break;
        }
        return { s, got };
      };

      /* ── a ── the last target */
      const H1 = await hitIt(false);
      rec.ok(`a. ${label}: the bow dragged toward the monster: the worker echoed a hit on it (${H1.hits}): the last target`, H1.hits > 0, H1);
      if (!(H1.hits > 0) || !H1.mon) continue;
      await turn(H1.mon.a + Math.PI);
      await clock(P, 1800);   /* the special's 1.5 s cooldown, if anything spent one */
      await vitals();
      await frames(P, 3);
      const A0 = await NOW(P, mon.id);
      rec.ok(`a. ${label}: turned away (facing ${A0.face != null ? Math.round(off(A0.face, A0.mon ? A0.mon.a : 0) / DEG) : '?'} deg off the monster), no thumb on the disc, the Special button shown (guard)`, !A0.aiming && A0.special && A0.face != null && A0.mon && off(A0.face, A0.mon.a) > 90 * DEG, A0);
      const m0 = await MARK(P);
      const pressed = await special(null);
      const W = await watch(A0.hits, m0, 8000);
      /* the special aims at the monster's BODY (combatHelpers lockShotPoint, the hit test's point), above its feet: so near, tens of degrees off the feet's line, never the facing's */
      const toMon = W.got.shots.filter((x) => x.sp && A0.mon && off(x.ang, A0.mon.a) < 60 * DEG);
      rec.ok(`a. ${label}: Special with no aim: at once (nothing readied) the special left toward the last target (${toMon.length} of ${W.got.shots.length} shots), never the facing, and the WORKER echoed new hits on it (${A0.hits} -> ${W.s.hits})`,
        pressed && toMon.length > 0 && W.got.shots.every((x) => off(x.ang, A0.face) > 90 * DEG) && W.s.queued === 0 && W.s.hits > A0.hits, { pressed, shots: W.got.shots.slice(0, 4), s: W.s, monA: A0.mon && A0.mon.a });
      rec.ok(`a. ${label}: ...and nothing locked or latched (the stick keeps no lock)`, W.s.latch === 'idle' && W.s.lid == null && W.s.lock == null, W.s);
      if (!full) continue;

      /* ── d ── the monster dead */
      await H.devOp(wsPort, 'combat', me, { skill: 'bow', level: 30 }).catch(() => null);
      let D0 = await NOW(P, mon.id);
      if (D0.mon && D0.mon.alive && D0.mon.hp > 0) { await clock(P, 3200); D0 = await hitIt(true); }
      const dead = !D0.mon || !D0.mon.alive || D0.mon.hp <= 0;
      rec.ok(`d. the monster killed by the bow (guard)`, dead, D0);
      if (dead) {
        await clock(P, 1800); await vitals(); await frames(P, 3);
        const md = await MARK(P);
        /* another monster your bow hit on the way is the last target now (the rule's: your last landed blow); none: today's road */
        const other = await H.readState(P, bind((S, id) => { const t = Date.now(); let b = null; for (const m of (S.monsters || [])) if (m && String(m.id) !== id && typeof m._hitByMeAt === 'number' && t - m._hitByMeAt < 7000 && m.alive && !(m.curHp <= 0) && (!b || m._hitByMeAt > b.at)) b = { id: String(m.id), at: m._hitByMeAt, a: Math.atan2(m.y - S.player.y, m.x - S.player.x) }; return b; }, mon.id));
        const D1 = await special(null);
        await frames(P, 8);
        const gotD = await SINCE(P, md);
        const wasA = D0.mon ? D0.mon.a : null;
        const spD = gotD.shots.filter((x) => x.sp);
        rec.ok(`d. the last target dead: never at its body; ${other ? 'another monster hit since is the last target: the special at it' : 'nothing else hit: today\'s, readied'} (readied ${!!(D1 && D1.queued)}, ${spD.length} special shots)`,
          !!D1 && (other ? spD.length > 0 && spD.every((x) => off(x.ang, other.a) < 60 * DEG) : D1.queued > 0 && spD.length === 0), { D1, shots: gotD.shots.slice(0, 4) });
      }
      /* ── b ── the stick wins (a fresh monster, hit first: a last target the stick must beat) */
      await H.devOp(wsPort, 'combat', me, { skill: 'bow', level: 1 }).catch(() => null);   /* d's kill done: a bow that does not kill in a blow */
      mon = await fresh(' (b)');
      if (!mon) continue;
      await clock(P, 3200);
      const HB = await hitIt(false);
      rec.ok(`b. the new monster hit: the last target (guard)`, HB.hits > 0, HB);
      await clock(P, 1800); await vitals(); await frames(P, 3);
      const B0 = await NOW(P, mon.id);
      if (!B0.mon || !B0.mon.alive) { rec.skip('b. the stick wins', 'the monster is gone', B0); continue; }
      if (B0.face != null && off(B0.face, B0.mon.a) < 90 * DEG) await turn(B0.mon.a + Math.PI);
      const away = B0.mon.a + Math.PI;
      const held = await down(away);
      await frames(P, 4);
      const mb = await MARK(P);
      const B1 = await special(held);
      await frames(P, 6);
      const gotB = await SINCE(P, mb);
      await touch('touchEnd', [held]);
      await frames(P, 3);
      const spB = gotB.shots.filter((x) => x.sp);
      rec.ok(`b. a thumb aiming the disc AWAY, Special tapped: the stick wins: nothing toward the monster (${gotB.shots.length} shots, ${spB.length} of the special, all the thumb's way; readied ${!!(B1 && B1.queued)}): today's`,
        !!B1 && B1.aiming && gotB.shots.every((x) => off(x.ang, away) < 15 * DEG) && (spB.length > 0 || B1.queued > 0), { B1, shots: gotB.shots.slice(0, 4) });
      await clock(P, 3200);   /* the readied special's 2.5 s runs out */

      /* ── c ── `?comboaim=0` */
      await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('comboaim', '0'); history.replaceState(null, '', u.toString()); });
      const HC = await hitIt(false);   /* a last target the switch must ignore */
      await clock(P, 1800); await vitals(); await frames(P, 3);
      const C0 = await NOW(P, mon.id);
      if (HC.hits > 0 && C0.mon && C0.mon.alive) {
        if (C0.face != null && off(C0.face, C0.mon.a) < 90 * DEG) await turn(C0.mon.a + Math.PI);
        const mc = await MARK(P);
        const C1 = await special(null);
        await frames(P, 8);
        const gotC = await SINCE(P, mc);
        rec.ok(`c. \`?comboaim=0\`: today's: the special readied (${!!(C1 && C1.queued)}), nothing toward the monster (${gotC.shots.length} shots)`, !!C1 && C1.queued > 0 && !gotC.shots.some((x) => off(x.ang, C0.mon.a) < 60 * DEG), { C1, shots: gotC.shots.slice(0, 4) });
      } else rec.skip('c. ?comboaim=0', 'the monster is gone', C0);
      await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('comboaim', '1'); history.replaceState(null, '', u.toString()); });
      await clock(P, 3200);

    }
    rec.ok('e. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    for (const P of players) { try { await P.ctx.close(); } catch (e) { /* closing */ } }
  }
}
