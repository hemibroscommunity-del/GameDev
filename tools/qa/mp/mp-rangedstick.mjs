/* ═══ v2.3.6648: THE RANGED STICK, PLAYED ON A PHONE (card PAD part 13; `?manual=5`) ═══
 *
 * The owner, 2026-11-27: "for melee to stay as it is (attacking and locking
 * towards nearest enemy) but [BOW] and magic need to use the right button
 * that turns into the right joystick again where attacks must be used in that
 * directional rotation with no lock on mechanism."  The rules are
 * src/game/rangedStick.js (tools/guards/ranged-stick.test.mjs plays them);
 * this plays the page with REAL touches (CDP Input.dispatchTouchEvent) on the
 * Attack disc, in the Wheel, against a real monster, upright and sideways:
 *
 *   1. the two buttons (mode 5), and a bow in hand: the disc wears
 *      data-disc="stick" (S._discKind);
 *   2. THE BOW, the thumb dragged AWAY from the monster and held: the aim is
 *      the thumb's (S._aimAngle, S._aiming), arrows keep leaving at empty
 *      ground (the owner, 16:35: "no matter if there's a monster in front or
 *      not"), every one the thumb's way, nothing is locked or sighted, the monster gets no claim;
 *      lifted: the aim and the held attack let go;
 *   3. THE BOW, the thumb dragged TOWARD it and held: arrows the thumb's way,
 *      and the monster is hit (a monster_damage claim naming it);
 *   4. A TAP, the body turned away from the monster: one arrow, the way the
 *      bro faces, never toward the monster;
 *   4b. (upright; v2.3.6649) the bow held and shooting, its lift MISSED by
 *      the page (eaten), another finger's lift: the shots stop;
 *   5. THE STAFF (upright): the same as 2 and 3, its bolts the thumb's way;
 *   6. THE SWORD (upright): the disc is a latch, and a press with the monster
 *      in sight locks it, as today;
 *   7. `?rangedstick=0` (upright; history.replaceState: read at each ask):
 *      today's bow, a latch: the press locks the monster in sight;
 *   8. no page errors.
 * Each hold is timed by the renderer's frames (S._frameCount), never a 60 fps
 * window (TRAPS 200).  `RS_SHOTS=1` saves the owner's pictures to docs/shots/
 * (rangedstick-*.png: the sword's disc, the bow's stick with the thumb
 * dragged). */
import * as H from './harness.mjs';
import { join } from 'node:path';
export const lane = 'full';

const UPRIGHT = { width: 375, height: 667 };
const SIDEWAYS = { width: 667, height: 375 };
const SHOTS = !!process.env.RS_SHOTS;
const DRAG = 46;   /* px from where the thumb went down: past the 10 px dead zone, inside the disc's well */
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
  const key = (a) => (a._shotTs || 0) + ':' + (a._sn != null ? a._sn : '');   /* never its angle: that changes in flight */
  for (const a of (S0.arrows || [])) if (a) seen.add(key(a));
  window.__rsShots = [];
  window.__rsOut = [];
  cancelAnimationFrame(window.__rsR);
  /* each shot recorded AS IT IS PUSHED (its launch angle: an arrow's angle
     changes in flight, and this box draws a few frames a second); the
     frame's scan only catches one pushed into a list made since (late) */
  const rec = (a, late) => { const S = window._gameState.current; seen.add(key(a)); window.__rsShots.push({ ang: a.ang, staff: !!a.isStaff, f: S._frameCount || 0, tap: S._tapAtk ? S._tapAtk.ang : null, late: !!late }); };
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
  const el = document.querySelector('.bt-rjoy-base');
  return {
    kind: S._discKind || null, disc: el ? el.getAttribute('data-disc') : null, latch: S._latchPhase || 'idle', end: S._latchEnd || null, lid: S._latchId == null ? null : String(S._latchId),
    sight: S._sightPhase || 'none', lock: S.lockedTarget ? String(S.lockedTarget.id) : null, aiming: !!S._aiming, aim: typeof S._aimAngle === 'number' ? S._aimAngle : null,
    auto: !!S.autoAttack, slot: S.rpg && S.rpg.activeSlot, f: S._frameCount || 0,
    mon: m ? { alive: !!m.alive, hp: m.curHp, a: Math.atan2(m.y - S.player.y, m.x - S.player.x), d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) } : null,
  };
}, id));
/* wait for `n` frames the renderer draws (or `ms` of the page's clock, whichever is first) */
const frames = async (P, n, ms = 30000) => {
  const f0 = (await H.readState(P, (S) => S._frameCount || 0));
  await P.page.waitForFunction((t) => (window._gameState.current._frameCount || 0) >= t, f0 + n, { timeout: ms, polling: 50 }).catch(() => null);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  const players = [];
  const used = [];
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const full = label === 'upright';
      const P = await H.newPlayer(browser, { name: full ? 'Aimbro' : 'Sideaim', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'manual=5&wheelwhole' });
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
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 10 });
      await H.devOp(wsPort, 'quests', me).catch(() => null);
      await P.page.evaluate(() => {   /* past the Mayor's gate (mp-twobuttons' way): a new character is held in BroTown's safe circle */
        const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
        keep(); clearInterval(window.__rsGate); window.__rsGate = setInterval(keep, 100);
      });
      const armed = await H.armWorker(P, wsPort, me, ['bow', 'staff']).catch(() => []);
      const eqB = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`${label}: the worker's bow and staff in hand (guard)`, armed.includes('bow') && armed.includes('staff') && !!(eqB && eqB.ok), { armed, eqB });
      await frames(P, 4);
      const mode = await P.page.evaluate(() => window.__btManual.mode());
      const st0 = await NOW(P, '');
      rec.ok(`1. ${label}: the two buttons (mode ${mode}), a bow: the Attack disc is a stick (data-disc ${st0.disc})`, mode === 5 && st0.kind === 'stick' && st0.disc === 'stick' && st0.slot === 'ranged', st0);

      const mon = await H.readState(P, bind(PICK, { maxD: 3000, skip: used }));
      rec.ok(`${label}: a real monster of the Wheel, others away from it (${mon && mon.nn} px; guard)`, !!mon && mon.nn >= 300, mon);
      if (!mon) continue;
      used.push(mon.id);
      await H.hopTo(P, Math.round(mon.x - 170), Math.round(mon.y), { tries: 90 });
      await P.page.waitForTimeout(800);
      await P.page.evaluate(TOOLS);
      const RD = await P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
      const LD = await P.page.evaluate(() => { const el = document.querySelector('.bt-joystick-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }; });
      rec.ok(`${label}: the Attack disc and the left stick are on screen (guard)`, !!RD && RD.w > 0 && !!LD, { RD, LD });
      if (!RD || !LD) continue;
      const turn = async (a) => {   /* the left stick at 20% of its radius: a turn, no walk (card CT's turn zone) */
        const p = { x: LD.x + 0.2 * LD.r * Math.cos(a), y: LD.y + 0.2 * LD.r * Math.sin(a), id: 1 };
        await touch('touchStart', [{ x: LD.x, y: LD.y, id: 1 }]); await frames(P, 1); await touch('touchMove', [p]); await frames(P, 3); await touch('touchEnd', [p]); await frames(P, 2);
      };
      /* a drag on the disc toward angle `a`, held `n` frames (or until `want` shots): what was seen */
      const hold = async (a, n, want, shot) => {
        const end = { x: RD.x + DRAG * Math.cos(a), y: RD.y + DRAG * Math.sin(a), id: 2 };
        const m0 = await MARK(P);
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]);
        await frames(P, 1);
        await touch('touchMove', [{ x: RD.x + 14 * Math.cos(a), y: RD.y + 14 * Math.sin(a), id: 2 }]);
        await touch('touchMove', [end]);
        const f0 = (await NOW(P, mon.id)).f;
        const during = [];
        for (let k = 0; k < 40; k++) {
          await frames(P, Math.max(1, Math.floor(n / 8)));
          const s = await NOW(P, mon.id);
          during.push(s);
          const got = await SINCE(P, m0);
          if (s.f - f0 >= n || (want && got.shots.filter((x) => !x.tap || Math.abs(x.tap - a) > 1e-3).length >= want)) break;
        }
        if (shot) await P.page.screenshot({ path: join(H.REPO, 'docs/shots', shot) });
        await touch('touchEnd', [end]);
        await frames(P, 3);
        const after = await NOW(P, mon.id);
        const got = await SINCE(P, m0);
        return { during, after, got };
      };

      for (const [slot, type, sKey] of (full ? [['ranged', 'bow', 'rangedWeapon'], ['staff', 'staff', 'staffWeapon']] : [['ranged', 'bow', 'rangedWeapon']])) {
        const W = slot === 'ranged' ? 'bow' : 'staff';
        if (slot === 'staff') { await H.equipWeapon(P, type, sKey, slot); await frames(P, 4); }
        const s0 = await NOW(P, mon.id);
        if (!s0.mon || !s0.mon.alive) { rec.skip(`2-3. ${label} ${W}`, 'the monster is gone', s0); continue; }
        /* ── 2 ── away */
        const away = s0.mon.a + Math.PI;
        const A = await hold(away, 120, 3, SHOTS && slot === 'ranged' && full ? `rangedstick-${label}-bow-dragged.png` : null);
        const aimOk = A.during.length > 0 && A.during.every((s) => s.aiming && s.aim != null && off(s.aim, away) < 1 * DEG && s.latch === 'idle' && s.lid == null && s.lock == null && s.sight === 'none' && s.auto);
        const awayShots = A.got.shots.filter((x) => !x.tap && !x.late);
        rec.ok(`2${slot === 'staff' ? 's' : ''}. ${label}, ${W}: dragged AWAY from the monster and held: aimed the thumb's way, nothing locked or sighted, auto-attack on; ${awayShots.length} shot(s) at empty ground, kept leaving (the owner: "no matter if there's a monster in front or not"), each the thumb's way; no claim on it`,
          aimOk && awayShots.every((x) => off(x.ang, away) < 2 * DEG) && awayShots.length >= 2 && !A.got.out.some((o) => o.mid === mon.id),
          { away, during: A.during.slice(0, 3), shots: awayShots.slice(0, 4), out: A.got.out.slice(0, 4) });
        rec.ok(`2${slot === 'staff' ? 's' : ''}. ${label}, ${W}: lifted: the aim and the held attack let go`, !A.after.aiming && !A.after.auto && A.after.latch === 'idle', A.after);
        /* ── 3 ── toward */
        const s1 = await NOW(P, mon.id);
        if (!s1.mon || !s1.mon.alive) { rec.skip(`3. ${label} ${W}`, 'the monster is gone', s1); continue; }
        const T = await hold(s1.mon.a, 120, 3, null);
        const tShots = T.got.shots.filter((x) => !x.tap && !x.late);
        rec.ok(`3${slot === 'staff' ? 's' : ''}. ${label}, ${W}: dragged TOWARD it: ${tShots.length} shot(s) the thumb's way, the monster hit (a claim on it, or its health down: a staff's bolt is the worker's to judge), still nothing locked`,
          tShots.length > 0 && tShots.every((x) => off(x.ang, s1.mon.a) < 2 * DEG) && (T.got.out.some((o) => o.mid === mon.id) || !T.after.mon || !T.after.mon.alive || T.after.mon.hp < s1.mon.hp) && T.during.every((s) => s.latch === 'idle' && s.lock == null),
          { a: s1.mon.a, shots: tShots.slice(0, 4), out: T.got.out.slice(0, 4), during: T.during.slice(0, 2) });
      }

      /* ── 4 ── a tap, the body turned away */
      await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged'); await frames(P, 4);
      const s4 = await NOW(P, mon.id);
      if (s4.mon && s4.mon.alive) {
        const away = s4.mon.a + Math.PI;
        await turn(away);
        await frames(P, 6);   /* the bow's cadence after part 3's shots */
        await P.page.waitForTimeout(1200);
        const m0 = await MARK(P);
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(60); await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
        await frames(P, 8);
        const got0 = await SINCE(P, m0);
        const got = { shots: got0.shots.filter((x) => !x.late), out: got0.out };
        const s4b = await NOW(P, mon.id);
        const face = await H.readState(P, (S) => ({ tap: S._tapAtk ? S._tapAtk.ang : null, how: S._tapAtk ? S._tapAtk.how : null }));
        rec.ok(`4. ${label}: a tap with the bow, the body turned away: one arrow the way the bro faces (${face.tap != null ? Math.round(face.tap / DEG) : '?'} deg; the monster at ${Math.round(s4b.mon ? s4b.mon.a / DEG : 0)}), nothing locked`,
          got.shots.length === 1 && face.tap != null && off(got.shots[0].ang, face.tap) < 2 * DEG && off(face.tap, away) < 30 * DEG && (!s4b.mon || off(got.shots[0].ang, s4b.mon.a) > 90 * DEG) && s4b.latch === 'idle' && s4b.lock == null,
          { shots: got.shots, face, away, s4b });
      } else rec.skip(`4. ${label}: a tap`, 'the monster is gone', s4);

      /* ── 4b ── v2.3.6649: A LIFT THE PAGE MISSED (sitting 73's reviewer: bE
         returned at its touch lookup before the stick's release, so a missed
         lift kept the bow shooting after the thumb was off).  The bow held and
         shooting; its real lift swallowed before the page hears it (a capture
         listener, once); then another finger's lift reaches bE, Attack's
         finger gone from e.touches and not in its changedTouches: the shots
         stop.  Finger 5, never 2: the stale press is the next press's to let
         go (bS's v2.3.3496 rule), and a press with the same id would be taken
         for it. */
      if (full) {
        const s4c = await NOW(P, mon.id);
        const a = s4c.mon ? s4c.mon.a + Math.PI : 0;
        await frames(P, 6); await P.page.waitForTimeout(1200);
        const end = { x: RD.x + DRAG * Math.cos(a), y: RD.y + DRAG * Math.sin(a), id: 5 };
        const m0 = await MARK(P);
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 5 }]); await frames(P, 1);
        await touch('touchMove', [{ x: RD.x + 14 * Math.cos(a), y: RD.y + 14 * Math.sin(a), id: 5 }]); await touch('touchMove', [end]);
        await P.page.waitForFunction((m) => window.__rsShots.length >= m + 2, m0.shots, { timeout: 30000, polling: 50 }).catch(() => null);
        const held = await NOW(P, mon.id);
        await P.page.evaluate(() => { const eat = (e) => { e.stopImmediatePropagation(); window.removeEventListener('touchend', eat, true); window.__rsAte = (window.__rsAte || 0) + 1; }; window.addEventListener('touchend', eat, true); });
        await touch('touchEnd', [end]);
        await frames(P, 2);
        const ate = await P.page.evaluate(() => window.__rsAte || 0);
        await P.page.evaluate(() => {   /* another finger's lift: Attack's not on the screen, not in the list */
          const ev = new Event('touchend', { cancelable: true });
          Object.defineProperty(ev, 'touches', { value: [] });
          Object.defineProperty(ev, 'changedTouches', { value: [{ identifier: 99, clientX: 10, clientY: 10 }] });
          window.dispatchEvent(ev);
        });
        await frames(P, 4);
        const m1 = await MARK(P);
        await frames(P, 40);
        const after = await NOW(P, mon.id);
        const late = (await SINCE(P, m1)).shots.filter((x) => !x.tap);
        rec.ok(`4b. ${label}: the bow held and shooting (${m1.shots - m0.shots} shots), its lift MISSED (eaten: ${ate}), another finger lifts: the aim and the held attack end, no arrow in the next 40 frames`,
          held.aiming && held.auto && m1.shots - m0.shots >= 2 && ate === 1 && !after.aiming && !after.auto && late.length === 0,
          { held: { aiming: held.aiming, auto: held.auto }, ate, after: { aiming: after.aiming, auto: after.auto }, late: late.slice(0, 3) });
      }

      if (full) {
        /* ── 6 ── the sword keeps its latch */
        await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
        /* a fresh monster for the sword and the switch: the bow's and the staff's shots have worn the first one down */
        const mon2 = await H.readState(P, bind(PICK, { maxD: 3000, skip: used }));
        if (mon2) { used.push(mon2.id); await H.hopTo(P, Math.round(mon2.x - 170), Math.round(mon2.y), { tries: 90 }); await P.page.waitForTimeout(800); mon.id = mon2.id; }
        await H.waitFor(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword') || !!(S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword'), (v) => v, { timeout: 15000, label: 'the kit' }).catch(() => null);
        const eqS = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) }));
        await frames(P, 4);
        const s6 = await NOW(P, mon.id);
        if (s6.mon && s6.mon.alive) {
          await turn(s6.mon.a);
          const sighted = await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'sighted', { timeout: 15000, label: 'sighted' }).catch(() => null);
                    await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(80); await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
          await frames(P, 4);
          const s6b = await NOW(P, mon.id);
          rec.ok(`6. ${label}: a sword: the disc is a latch (data-disc ${s6b.disc}), the press locks the monster in sight, as today`,
            !!(eqS && eqS.ok) && !!sighted && s6b.kind === 'latch' && s6b.disc === 'latch' && ((s6b.latch === 'active' || s6b.latch === 'auto') && s6b.lid === mon.id || s6b.end === 'killed'), { eqS, sighted, s6b });
          /* let go: a press while locked strikes, a hold past the fill is auto, so the latch's own end: away */
          await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged'); await frames(P, 4);
          const s6c = await NOW(P, mon.id);
          rec.ok(`6. ${label}: swapped to the bow with the sword's lock on: the lock let go, the disc a stick`, s6c.kind === 'stick' && s6c.latch === 'idle' && s6c.lid == null && !s6c.auto, s6c);
        } else rec.skip(`6. ${label}: the sword`, 'the monster is gone', s6);

        /* ── 7 ── `?rangedstick=0` */
        await P.page.evaluate(() => { const q = new URLSearchParams(location.search); q.set('rangedstick', '0'); history.replaceState(null, '', '?' + q.toString()); });
        await frames(P, 4);
        const s7 = await NOW(P, mon.id);
        if (s7.mon && s7.mon.alive) {
          await turn(s7.mon.a);
          await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'sighted', { timeout: 15000, label: 'sighted' }).catch(() => null);
          await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(80); await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
          await frames(P, 4);
          const s7b = await NOW(P, mon.id);
          rec.ok(`7. ${label}: \`?rangedstick=0\`: today's bow, a latch (data-disc ${s7b.disc}): the press locks the monster in sight`,
            s7b.kind === 'latch' && s7b.disc === 'latch' && s7b.slot === 'ranged' && ((s7b.latch === 'active' || s7b.latch === 'auto') && s7b.lid === mon.id || s7b.end === 'killed'), s7b);
        } else rec.skip(`7. ${label}: \`?rangedstick=0\``, 'the monster is gone', s7);
        await P.page.evaluate(() => { const q = new URLSearchParams(location.search); q.delete('rangedstick'); history.replaceState(null, '', '?' + q.toString()); });
      }
    }
    rec.ok('8. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    for (const P of players) { try { await P.ctx.close(); } catch (e) { /* closed */ } }
  }
}
