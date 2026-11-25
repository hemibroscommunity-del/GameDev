/* ═══ v2.3.6557: THE BOW'S SPECIAL AT ONCE, PLAYED ON A PHONE (card CT part 23 PR 2) ═══
 *
 * Special with the bow is a first strike: in the two buttons (`?manual=5`) a
 * press of Special with a monster to take shoots the special at it NOW, where
 * it used to be readied until the drawn sight line landed (playerActions.js
 * specialAttack's queue).  Played with REAL touches (CDP
 * Input.dispatchTouchEvent) on an upright phone in the Wheel, with the bow:
 *
 *   1. a monster to take: the bro 380 px from a live monster with no other
 *      within 900, turned toward it by the left stick until the sight picks
 *      it (S._sightId, the frame's own: the renderer's clock, TRAPS 200);
 *      ONE press of Special and no press of Attack:
 *      a. an `ability_use` leaves and the special's arrows are in flight
 *         within 300 ms by the renderer's clock (S._frameCount and
 *         S._frameMs: the frames between the press and the shot);
 *      b. nothing readied (S._bowSpecialQueued 0) and the latch took the
 *         monster as Attack's press would;
 *      c. the monster takes the special's hit (its health falls, or it
 *         dies), waited for until the arrows are gone, up to a cap;
 *   2. nothing to take: the bro 400 px from a monster with it BEHIND (Special
 *      is on screen: a monster near), the sight on nothing; ONE press of
 *      Special: readied as before (S._bowSpecialQueued, the button's
 *      'queued'), no `ability_use`, no mana spent;
 *   3. no page errors.
 * The rule's every edge is server/test/bow-special.test.mjs.
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
/* H.readState passes the page's S alone: an argument goes into the function's text */
const bind = (fn, arg) => ({ toString: () => `(S) => (${fn.toString()})(S, ${JSON.stringify(arg)})` });

/* A stand: a live monster at full health M and one of the eight facings, a
   spot `d` px from M along it (o.behind: M behind the spot, the facing away
   from it), no other live monster within o.clear of the spot.  The nearest
   such spot to the body wins. */
const STAND = (S, o) => {
  const FACE = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
  const P0 = S.player;
  const live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp == null || (m.curHp > 0 && !(m.curHp < m.maxHp))) && isFinite(m.x) && isFinite(m.y)
    && Math.hypot(m.x - P0.x, m.y - P0.y) < o.maxD && (o.skip || []).indexOf(String(m.id)) < 0);
  const all = (S.monsters || []).filter((m) => m && m.alive && isFinite(m.x) && isFinite(m.y));
  let best = null;
  for (const M of live) for (const a of FACE) {
    const x = o.behind ? M.x + Math.cos(a) * o.d : M.x - Math.cos(a) * o.d;
    const y = o.behind ? M.y + Math.sin(a) * o.d : M.y - Math.sin(a) * o.d;
    if (all.some((q) => q !== M && Math.hypot(q.x - x, q.y - y) < o.clear)) continue;
    const far = Math.hypot(x - P0.x, y - P0.y);
    if (!best || far < best.far) best = { id: String(M.id), x: Math.round(x), y: Math.round(y), a, far: Math.round(far) };
  }
  return best;
};

/* the page's watcher: the press (Special's pointerdown, capture), every
   message that leaves (the time, the frame), and each frame's special arrows */
const WATCH = () => {
  const S = window._gameState.current;
  const W = window.__qaBowSpecial = { press: null, sent: [], frames: [] };
  if (!window.__qaBowSpecialSend && S.channel) {
    const orig = S.channel.send.bind(S.channel);
    window.__qaBowSpecialSend = true;
    S.channel.send = (m) => {
      try {
        const k = (m && (m.event || m.type)) || '?';
        const G = window._gameState.current, w = window.__qaBowSpecial;
        if (w) w.sent.push({ k, f: G._frameCount || 0, at: performance.now(), arrows: (G.arrows || []).filter((a) => a && a.isSpecial).length });
      } catch (e) { /* never break the game */ }
      return orig(m);
    };
  }
  document.addEventListener('pointerdown', (e) => {
    const w = window.__qaBowSpecial, G = window._gameState.current;
    if (!w || w.press || !(e.target && e.target.closest && e.target.closest('[data-special]'))) return;
    w.press = { f: G._frameCount || 0, at: performance.now(), mana: G.rpg && G.rpg.mana };
  }, { capture: true });
  let n = 0;
  const tick = () => {
    const G = window._gameState.current, w = window.__qaBowSpecial;
    if (!w || n++ > 400) return;
    w.frames.push({ f: G._frameCount || 0, ms: G._frameMs || 0, n: (G.arrows || []).filter((a) => a && a.isSpecial).length });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    const P = await H.newPlayer(browser, { name: 'Bowbro', wsPort, webPort, viewport: UPRIGHT, touch: true, dpr: 3, world: 'wheel', query: 'manual=5&wheelwhole' });
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
      const b = document.querySelector('.bt-joystick-base'); if (!b) return null;
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    });
    rec.ok('the left disc on screen (guard)', !!disc, disc);
    if (!disc) return;
    const c = { x: disc.x, y: disc.y, id: 1 }, Rl = disc.w / 2;
    /* a 20% turn of the left stick toward `ang` (the facing drawn snaps to its eight) */
    const turn = async (ang) => {
      const pt = { x: c.x + 0.2 * Rl * Math.cos(ang), y: c.y + 0.2 * Rl * Math.sin(ang), id: 1 };
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [pt]);
      await P.page.waitForTimeout(600);
      await touch('touchEnd', [pt]);
    };
    const specialAt = () => P.page.evaluate(() => {
      const el = document.querySelector('[data-special]'); if (!el) return null;
      const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, state: el.getAttribute('data-special') };
    });
    const pressSpecial = async (at) => {
      await touch('touchStart', [{ x: at.x, y: at.y, id: 3 }]);
      await P.page.waitForTimeout(90);
      await touch('touchEnd', [{ x: at.x, y: at.y, id: 3 }]);
    };

    /* ── 1. a monster to take ── */
    const skip = [];
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      const st = await H.readState(P, bind(STAND, { maxD: 3200, skip, d: 380, clear: 900, behind: false }));
      rec.ok(`1. try ${attempt}: a stand 380 px from a monster, no other within 900 (guard)`, !!st, st);
      if (!st) break;
      skip.push(st.id);
      await H.hopTo(P, st.x, st.y, { tries: 160 });
      await P.page.waitForTimeout(1000);
      const at = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? Math.atan2(m.y - S.player.y, m.x - S.player.x) : null; }, st.id));
      await turn(at == null ? st.a : at);
      const sighted = await H.waitFor(P, (S) => S._sightId == null ? null : String(S._sightId), (v) => v != null, { timeout: 8000, label: 'sighted' }).catch(() => null);
      rec.ok(`1. try ${attempt}: the sight picks the monster (guard)`, sighted === st.id, { sighted, st });
      if (sighted !== st.id) continue;
      await H.devOp(wsPort, 'vitals', me, { heal: true });
      await H.waitFor(P, (S) => S.rpg && S.rpg.mana >= S.rpg.maxMana, (v) => v, { timeout: 5000, label: 'mana full' }).catch(() => null);
      const sp = await specialAt();
      rec.ok(`1. try ${attempt}: Special on screen (guard)`, !!sp, sp);
      if (!sp) continue;
      const before = await H.readState(P, bind((S, id) => {
        const m = (S.monsters || []).find((x) => x && String(x.id) === id);
        return { hp: m ? m.curHp : null, line: !!(S._bowSight && S._bowSight.d != null), latch: S._latchPhase || 'idle' };
      }, st.id));
      await P.page.evaluate(WATCH);
      await pressSpecial(sp);
      const w = await H.waitFor(P, () => window.__qaBowSpecial, (v) => !!v && !!v.press && (v.sent.some((s) => s.k === 'ability_use') || v.frames.length > 6),
        { timeout: 15000, label: 'the press' }).catch(() => null);
      const use = w && w.sent.find((s) => s.k === 'ability_use');
      /* the renderer's clock: the frames between the press and the shot, each at its own step */
      const frameMs = w && w.frames.length ? Math.max(...w.frames.map((f) => f.ms || 16.667)) : 16.667;
      const gameMs = use && w.press ? (use.f - w.press.f) * frameMs : null;
      const flying = !!w && ((use && use.arrows > 0) || w.frames.some((f) => f.n > 0));
      rec.ok(`1a. ONE press of Special, no Attack: an ability_use leaves and the special's arrows fly within 300 ms by the renderer's clock (${gameMs == null ? '-' : Math.round(gameMs)} ms; the line was ${before.line ? 'already' : 'not yet'} on it)`,
        !!use && flying && gameMs != null && gameMs <= 300, { use, press: w && w.press, frames: w && w.frames.slice(0, 6), before });
      const after = await H.readState(P, (S) => ({ queued: S._bowSpecialQueued || 0, phase: S._latchPhase || 'idle', id: S._latchId == null ? null : String(S._latchId) }));
      rec.ok('1b. nothing readied, and the latch took the monster as Attack\'s press would', after.queued === 0 && after.phase !== 'idle' && after.id === st.id, after);
      /* the hit: wait for the arrows to be over (gone from S.arrows), up to a cap (TRAPS 200) */
      const hit = await H.waitFor(P, bind((S, o) => {
        const m = (S.monsters || []).find((x) => x && String(x.id) === o.id);
        return { hp: m ? m.curHp : null, alive: !!(m && m.alive), gone: !m, flying: (S.arrows || []).filter((a) => a && a.isSpecial).length };
      }, { id: st.id }), (v) => v.gone || !v.alive || (before.hp != null && v.hp != null && v.hp < before.hp), { timeout: 20000, label: 'the hit' }).catch(() => null);
      rec.ok('1c. the monster takes the special\'s hit', !!hit, { before: before.hp, hit });
      done = true;
    }
    rec.ok('1. the press was played (a stand where the sight picked the monster)', done, { skip });

    /* ── 2. nothing to take ── */
    await P.page.waitForTimeout(1800);   /* past the special's cooldown (1.5 s, its own clock: Date.now) */
    let played = false;
    for (let attempt = 1; attempt <= 3 && !played; attempt++) {
      const st = await H.readState(P, bind(STAND, { maxD: 3200, skip, d: 400, clear: 900, behind: true }));
      rec.ok(`2. try ${attempt}: a stand 400 px from a monster with it behind (guard)`, !!st, st);
      if (!st) break;
      skip.push(st.id);
      await H.hopTo(P, st.x, st.y, { tries: 160 });
      await P.page.waitForTimeout(1000);
      await turn(st.a);   /* away from it */
      const clear = await H.waitFor(P, (S) => ({ sight: S._sightId == null ? null : String(S._sightId), phase: S._latchPhase || 'idle', line: !!(S._bowSight && S._bowSight.d != null) }),
        (v) => v.sight == null && v.phase === 'idle' && !v.line, { timeout: 8000, label: 'nothing sighted' }).catch(() => null);
      rec.ok(`2. try ${attempt}: nothing in the sight, no lock, the line on nothing (guard)`, !!clear, clear);
      if (!clear) continue;
      await H.devOp(wsPort, 'vitals', me, { heal: true });
      await H.waitFor(P, (S) => S.rpg && S.rpg.mana >= S.rpg.maxMana, (v) => v, { timeout: 5000, label: 'mana full' }).catch(() => null);
      const sp = await specialAt();
      rec.ok(`2. try ${attempt}: Special on screen (a monster near) (guard)`, !!sp, sp);
      if (!sp) continue;
      await P.page.evaluate(WATCH);
      await pressSpecial(sp);
      const w = await H.waitFor(P, () => window.__qaBowSpecial, (v) => !!v && !!v.press && v.frames.length > 3, { timeout: 15000, label: 'the press' }).catch(() => null);
      const r = await H.readState(P, (S) => ({ queued: S._bowSpecialQueued || 0, mana: S.rpg.mana, max: S.rpg.maxMana, phase: S._latchPhase || 'idle', btn: (document.querySelector('[data-special]') || { getAttribute: () => null }).getAttribute('data-special') }));
      const uses = w ? w.sent.filter((s) => s.k === 'ability_use').length : -1;
      rec.ok('2. ONE press with nothing to take: readied as before (queued), no ability_use, no mana spent, no lock',
        !!w && r.queued > 0 && uses === 0 && r.mana === r.max && r.phase === 'idle', { r, uses, press: w && w.press });
      played = true;
    }
    rec.ok('2. the press was played (a stand with nothing in the sight)', played, { skip });
    rec.ok('3. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
