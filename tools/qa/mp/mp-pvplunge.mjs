/* ═══ THE SWORD'S OPENING LUNGE AT A PLAYER, ON TWO PHONES (v2.3.3262) ═══
 *
 * Owner, on v2.3.3260's honest limit (a sword cannot catch a bow or a staff
 * that keeps its distance): "Yes make opening lunge work on players too".
 *
 * The lunge (sworddash) zooms to the locked target and swings on arrival.  It
 * named only a monster; now a locked PLAYER the sword may fight -- a duel, or
 * No man's land's lock -- is lunged at the same way, the worker lands the hit
 * through the one door for a hit between players and DAZES the player hit
 * (the rock monsters' daze: 0.5 s of no walk, swing, roll or shield, then
 * 2.5 s before another): server/src/pvplunge.js, docs/specs/pvp-lunge.md.
 *
 * Two phones in town (a real duel is the consent; No man's land's rule is the
 * same door):
 *   1. no duel, a player locked by hand in town: the press does NOT lunge
 *      (town is safe) and nothing reaches the other player;
 *   2. in the duel, from ~160 px, the press lunges: the dash closes to contact,
 *      the worker puts the swordsman there too, and B's pvp_hit says
 *      `ability: 'sworddash'`, the worker's hit (HP down), `st: 'daze'`, 500 ms;
 *   3. B's phone carries it out: dazed for exactly stMs, its walk stopped while
 *      a key is held, its own lunge refused ("Dazed") -- and A's phone draws the
 *      daze on B (the stars, `_dazeUntil` on B's copy);
 *   4. the cooldown holds (an instant second press is an ordinary swing), and a
 *      second lunge inside the daze's window lands without a daze;
 *   5. no page errors on either phone.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* Walk A to `want` px from B (the server's copies), keys like a thumb */
async function closeIn(A, wsPort, aId, bId, want) {
  for (let i = 0; i < 24; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    const tol = Math.max(8, want * 0.2);
    if (Math.abs(d - want) <= tol) return { ok: true, d: Math.round(d) };
    /* v2.3.3403: put there by the harness's hops (the page's own place, then
       its move to the worker), as mp-pvpnumbers' closeIn does.  A key held a
       set time walks however many frames fall inside it, and this box draws a
       frame every few hundred ms: a 123 ms press often walked none, and 24
       tries ended 216 px out with the guard failed (the lunge, from there,
       still landed). */
    const ux = d > 1 ? dx / d : 1, uy = d > 1 ? dy / d : 0;
    await H.hopTo(A, pb.x - ux * want, pb.y - uy * want, { step: 60, gap: 300, tries: 30 });
    await A.page.waitForTimeout(500);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

async function equipFromStash(P, wantType, slot, activeSlot) {
  return P.page.evaluate(({ wantType, slot, activeSlot }) => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return { ok: false, why: 'no state' };
    if (R[slot] && R[slot].type === wantType) {
      S.channel.send({ type: 'set_active_slot', payload: { slot: activeSlot } });
      R.activeSlot = activeSlot; S._userCycledSlot = true;
      return { ok: true, worn: true };
    }
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === wantType);
    if (i < 0) return { ok: false, why: 'not in stash', stash: (R.weaponStash || []).map((w) => w && w.type) };
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot } });
    S.channel.send({ type: 'set_active_slot', payload: { slot: activeSlot } });
    R.activeSlot = activeSlot;
    S._userCycledSlot = true;
    return { ok: true, idx: i };
  }, { wantType, slot, activeSlot });
}

/* the press, through the same function the right stick's press calls */
const press = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
  return { ok, dash: !!S._bashDash, pid: S._bashDash ? S._bashDash.pid : null, pending: !!S._dashStrike,
    status: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null,
    lock: S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null };
});

/* the dash's end, caught on the frame it happens (the gap then, not later) */
const dashEnd = (A, bId) => A.page.evaluate((bId) => new Promise((resolve) => {
  const S = window._gameState.current;
  const t0 = Date.now();
  const iv = setInterval(() => {
    if (!S._bashDash || Date.now() - t0 > 3000) {
      clearInterval(iv);
      const o = S.others && S.others[bId];
      const ox = o ? (typeof o.renderX === 'number' ? o.renderX : o.x) : null;
      const oy = o ? (typeof o.renderY === 'number' ? o.renderY : o.y) : null;
      resolve({ ended: !S._bashDash, ms: Date.now() - t0, gap: o ? Math.round(Math.hypot(ox - S.player.x, oy - S.player.y)) : null });
    }
  }, 16);
}), bId);

const hitsOf = (P) => P.page.evaluate(() => (window.__btFightFood && window.__btFightFood.hits) || []);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Lunger', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Target', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);
  let alive = true;
  const keep = (async () => { while (alive) { for (const P of [A, B]) await P.page.keyboard.press('Control').catch(() => {}); await B.page.waitForTimeout(15000).catch(() => {}); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); };

  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.pvplunge === true));
  rec.ok('the worker advertises caps.pvplunge (guard)', caps);
  if (!caps) { await done(); return; }

  /* Arm both: tut_1 pays the sword and shield on accept (mp-pvpshield's road) */
  for (const P of [A, B]) {
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  }
  await A.page.waitForTimeout(1500);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState.current; const R = S.rpg;
      if (R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band (mp-duelblock) */
    });
  }
  const swordA = await equipFromStash(A, 'greatsword', 'weapon', 'melee');
  const swordB = await equipFromStash(B, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  rec.ok('both hold a sword (guard)', swordA.ok && swordB.ok, { swordA, swordB });

  /* ── 1. no duel, in town: a player locked by hand is not lunged at ── */
  {
    const near = await closeIn(A, wsPort, aId, bId, 200);
    const hp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    const r = await A.page.evaluate((bId) => {
      const S = window._gameState.current;
      const o = S.others && S.others[bId];
      if (!o) return { none: true };
      S.lockedTarget = { type: 'player', id: bId, ref: o };
      S._abilCd = null;   /* off cooldown: only the rule can refuse it */
      const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
      const out = { ok, dash: !!S._bashDash, inDuel: !!S._inDuel };
      S.lockedTarget = null;
      return out;
    }, bId);
    await A.page.waitForTimeout(1200);
    const hp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
    rec.ok(`1. no duel, town: the press does NOT lunge at a locked player (${near.d} px), and B's HP stays ${hp0}`,
      r.ok === false && !r.dash && !r.inDuel && typeof hp0 === 'number' && hp1 === hp0, { r, hp0, hp1, near });
  }

  /* the duel: A challenges, B accepts, through the real cards */
  await H.openInspect(A, bId);
  const canDuel = (await H.buttonTexts(A)).some((t) => /duel/i.test(t));
  rec.ok('the inspect card offers a Duel (guard)', canDuel, await H.buttonTexts(A));
  if (!canDuel) { await done(); return; }
  await H.clickText(A, 'Duel');
  const gotReq = await H.waitUi(B, () => [...document.querySelectorAll('button')].some((b) => /accept/i.test(b.textContent || '')),
    { label: 'duel request', timeout: 20000 }).then(() => true).catch(() => false);
  if (!gotReq) { rec.ok('B is asked to accept the duel (guard)', false); await done(); return; }
  await H.clickText(B, 'Accept');
  await A.page.waitForTimeout(2000);
  const duel = await H.readState(A, (S) => ({ inDuel: !!S._inDuel, lock: S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null }));
  rec.ok('a duel is running and A is locked on B (the duel lock, guard)', duel.inDuel && duel.lock && duel.lock.type === 'player' && String(duel.lock.id) === String(bId), duel);
  if (!duel.inDuel) { await done(); return; }

  /* ── 2. the lunge, from ~160 px ── */
  /* not further: this box draws a few frames a second, and the dash moves at
     most DASH_MAX_STEP_PX (60) a frame -- from 300 px its window ran out at
     157 px here (the strike still goes, as at a monster, and lands: the
     worker's reach is 900).  A phone at 10 frames a second or better arrives
     from 900. */
  const far = await closeIn(A, wsPort, aId, bId, 160);
  rec.ok(`A stands a lunge away (guard: ${far.d} px)`, far.ok, far);
  /* B: walk with a key held through the lunge; record what B's phone does
     (its daze, its position while dazed, its own press while dazed) */
  await B.page.evaluate(() => {
    const q = window.__qaLunge = { dazes: [], pos: [], tried: null };
    const S = window._gameState.current;
    /* v2.3.3403: the place every 20 ms, not once a frame.  The daze is 500 ms
       and this box draws a frame every few hundred, so a frame-paced record
       held one frame of it and "at least two" could not be met; read on a
       timer, the frames inside the daze are all between two samples, and a
       walk the daze failed to stop shows as movement within it. */
    q.timer = setInterval(() => {
      const now = Date.now(), u = S._dazeUntil || 0;
      if (q.pos.length < 1500) q.pos.push({ t: now, x: S.player.x, y: S.player.y, dazed: u > now });
      if (q.stop) clearInterval(q.timer);
    }, 20);
    (function loop() {
      const now = Date.now();
      const u = S._dazeUntil || 0;
      if (u && (!q.dazes.length || q.dazes[q.dazes.length - 1].until !== u)) q.dazes.push({ seenAt: now, until: u });
      if (u > now && !q.tried) {
        S._abilCd = null;   /* B's lunge is off cooldown: only the daze can refuse it */
        const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
        q.tried = { at: now, ok, dash: !!S._bashDash };
      }
      if (!q.stop) requestAnimationFrame(loop);
    })();
  });
  await A.page.evaluate((bId) => {
    const q = window.__qaLungeA = { peer: [] };
    const S = window._gameState.current;
    (function loop() {
      const o = S.others && S.others[bId];
      const u = o ? (o._dazeUntil || 0) : 0;
      if (u && (!q.peer.length || q.peer[q.peer.length - 1].until !== u)) q.peer.push({ seenAt: Date.now(), until: u });
      if (!q.stop) requestAnimationFrame(loop);
    })();
  }, bId);
  const walkKey = await B.page.evaluate((aId) => {
    /* walk across A's line, so the walk is clear of the dash's own geometry */
    const S = window._gameState.current; const o = S.others[aId];
    const dx = (o.x != null ? o.x : o.renderX) - S.player.x, dy = (o.y != null ? o.y : o.renderY) - S.player.y;
    return Math.abs(dx) > Math.abs(dy) ? 's' : 'd';
  }, aId);
  await B.page.keyboard.down(walkKey);
  await B.page.waitForTimeout(400);
  const hp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  /* v2.3.3403: BOTH stages blanked through the lunge and its daze.  This
     box draws in software, one graphics process for both phones, 300-600 ms
     a frame, and nothing on B's page -- frame or timer -- runs inside one:
     the 500 ms daze held one sample (the runs of 2026-10-18, with the 20 ms
     sampler, and again with B's stage alone blanked, A's frames keeping the
     graphics process busy).  What steps 2-3 read is the game's logic -- the
     dash, the hit, the walk refused, B's own lunge refused, A's copy of B
     dazed -- not its pixels: drawn nothing, both pages run at a phone's
     pace.  About 3 s, inside the black-screen watchdog's two strikes (10 s). */
  await Promise.all([A, B].map((P) => P.page.evaluate(() => { if (window.__btBlankStage) window.__btBlankStage(true); })));
  const tFire = Date.now();
  const fired = await press(A);
  rec.ok('2. the press LUNGES at the locked player (a dash that names them)', fired.ok === true && fired.dash && String(fired.pid) === String(bId), fired);
  const end = await dashEnd(A, bId);
  /* at once, before anything slow: a second press is no lunge (the cooldown) */
  const again = await press(A);
  /* and the worker's copies, while B is still dazed where the lunge caught them */
  const [sa, sb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  rec.ok(`2. ...the dash ends on its own at contact (${end.gap} px, ${end.ms} ms)`, end.ended && end.gap != null && end.gap <= 80, end);
  await A.page.waitForTimeout(900);   /* the daze is over: B lets the key go */
  await B.page.keyboard.up(walkKey);
  await Promise.all([A, B].map((P) => P.page.evaluate(() => { if (window.__btBlankStage) window.__btBlankStage(false); })));
  await A.page.waitForTimeout(600);
  const hp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  const hitsB = await hitsOf(B);
  const lungeHit = hitsB.find((h) => h.attacker === aId && h.target === bId && h.ability === 'sworddash' && h.at >= tFire - 500);
  rec.ok(`2. B's pvp_hit is the lunge: ability 'sworddash', the worker's hit (${lungeHit ? lungeHit.dmgTaken : '?'}), st 'daze' ${lungeHit ? lungeHit.stMs : '?'} ms`,
    !!lungeHit && lungeHit.dmgTaken > 0 && !lungeHit.blocked && !lungeHit.dodged && lungeHit.st === 'daze' && lungeHit.stMs === 500, { lungeHit, hitsB: hitsB.slice(-4) });
  rec.ok(`2. ...B lost HP on the worker (${hp0} -> ${hp1})`, typeof hp0 === 'number' && typeof hp1 === 'number' && hp1 < hp0, { hp0, hp1 });
  rec.ok('2. ...and the worker\'s copy of A stands at contact with B\'s (within 120 px)', !!sa && !!sb && Math.hypot(sb.x - sa.x, sb.y - sa.y) <= 120,
    sa && sb ? { d: Math.round(Math.hypot(sb.x - sa.x, sb.y - sa.y)) } : null);

  /* ── 3. B's phone carries the daze out; A's draws it ── */
  const qB = await B.page.evaluate(() => { const q = window.__qaLunge; q.stop = true; return q; });
  const qA = await A.page.evaluate(() => { const q = window.__qaLungeA; q.stop = true; return q; });
  const dz = lungeHit ? qB.dazes.find((d) => d.until > lungeHit.at) : null;
  rec.ok(`3. B's phone is dazed for the hit's stMs (until - hit = ${dz && lungeHit ? dz.until - lungeHit.at : '?'} ms)`,
    !!dz && Math.abs((dz.until - lungeHit.at) - 500) <= 5, { dz, at: lungeHit && lungeHit.at });
  const inDaze = qB.pos.filter((p) => p.dazed);
  const spread = inDaze.length ? Math.max(Math.max(...inDaze.map((p) => p.x)) - Math.min(...inDaze.map((p) => p.x)),
    Math.max(...inDaze.map((p) => p.y)) - Math.min(...inDaze.map((p) => p.y))) : null;
  const before = qB.pos.filter((p) => !p.dazed && dz && p.t < dz.seenAt);
  const walked = before.length > 1 ? Math.hypot(before[before.length - 1].x - before[0].x, before[before.length - 1].y - before[0].y) : 0;
  rec.ok(`3. ...its walk stops while dazed, a key held (${inDaze.length} frames, ${spread == null ? '?' : spread.toFixed(1)} px of movement; ${Math.round(walked)} px walked before)`,
    inDaze.length >= 2 && spread != null && spread <= 3 && walked > 10, { frames: inDaze.length, spread, walked });
  rec.ok('3. ...and its own lunge is refused while dazed (no dash)', !!qB.tried && qB.tried.ok === false && !qB.tried.dash, qB.tried);
  const peerDz = lungeHit ? qA.peer.find((d) => d.until > tFire) : null;
  rec.ok('3. A\'s phone draws the daze on B (B\'s copy dazed, the stars)', !!peerDz && peerDz.until - tFire > 0, { peer: qA.peer });

  /* ── 4. the cooldown, and the window ── */
  rec.ok('4. an instant second press is NOT a lunge (the 2.5 s cooldown)', again.ok === false && !again.dash, again);
  /* off cooldown, at once: inside the 2.5 s after the daze no daze lands again */
  await A.page.evaluate(() => new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null;
      if ((st && st.cdLeft <= 0) || Date.now() - t0 > 4000) { clearInterval(iv); resolve(); }
    }, 10);
  }));
  const t2 = Date.now();
  const second = await press(A);
  await dashEnd(A, bId);
  await A.page.waitForTimeout(1500);
  const hitsB2 = await hitsOf(B);
  const hit2 = hitsB2.find((h) => h.attacker === aId && h.ability === 'sworddash' && h.at >= t2 - 200);
  const gap = hit2 && lungeHit ? hit2.at - lungeHit.at : null;
  if (gap != null && gap > 2900 && gap < 3100) {
    rec.skip('4. a second lunge inside the window lands with no daze', `the second hit came ${gap} ms after the first, at the window's edge`);
  } else {
    const inWindow = gap != null && gap <= 2900;
    rec.ok(`4. the second lunge lands (${gap} ms after the first) ${inWindow ? 'WITHOUT a daze (inside the window)' : 'with a daze (the window over)'}`,
      second.ok === true && !!hit2 && hit2.dmgTaken > 0 && (inWindow ? hit2.st == null : hit2.st === 'daze'), { second, hit2, gap });
  }

  rec.ok('5. no page errors on either phone', errors.length === 0, errors);
  await done();
}
