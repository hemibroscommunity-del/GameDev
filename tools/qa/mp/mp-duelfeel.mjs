/* Does a duel FEEL right? (v2.3.1918)
 *
 * Owner: "play headlessly against yourself in a duel to make sure the TTK
 * and blocking and weapon switching etc all make sense."
 *
 * This is a play-test, not a pass/fail gate, so it MEASURES first and judges
 * second.  The numbers it prints are the deliverable; the assertions only
 * catch things that are broken by any standard (a weapon that does nothing,
 * a shield that does nothing, a swap the server never sees), because the
 * intended balance is the owner's call and not something a test should
 * invent.
 *
 * Everything is measured SERVER-SIDE, off /admin's view of the players.
 * Client HP is a prediction and the damage popups are transient; the only
 * number that decides who wins is the worker's.
 *
 * Method: burst-and-measure.  Rather than counting individual hits (the
 * cadence floor, dodges and the 22ms send throttle all make a per-swing
 * ledger lie), each phase swings for a fixed wall-clock window and divides
 * the HP the server actually removed by the time it took.  DPS is what TTK
 * is made of, and it is the same arithmetic a player does by feel.
 */
import * as H from './harness.mjs';

const BURST_MS = 9000;

/* Walk to a target separation.  Note BOTH directions: the first cut only
   ever closed, so asking for 150px of bow range from 31px away silently
   left the pair nose to nose and the ranged rounds were fought point-blank
   — which is a fair explanation for an arrow that does nothing, and not
   the one a reader would assume from "the bow did 0 damage". */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 20; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    /* Tolerance scales with the range being asked for.  A flat one is wrong
       at both ends: 22px of slack around a 34px melee target accepts 56px,
       which is OUTSIDE melee reach — that alone turned a 6.5s sword kill
       into a 40-second zero and briefly made it look like melee had broken
       too. */
    const tol = Math.max(8, want * 0.25);
    if (Math.abs(d - want) <= tol) return { ok: true, d: Math.round(d) };
    const away = d < want;                    /* too close: step the other way */
    const sx = away ? -dx : dx, sy = away ? -dy : dy;
    const key = Math.abs(dx) > Math.abs(dy) ? (sx > 0 ? 'd' : 'a') : (sy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, Math.abs(d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

/* Point the cursor along the A->B ray and hold the press.  Same canvas
   arithmetic mp-duel.mjs documents (letterboxed canvas, world scale, and
   the dashboard band that would swallow the click). */
async function aimAt(A) {
  const pt = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const o = S.others && S.others[Object.keys(S.others)[0]];
    if (!o || !S.camera) return null;
    const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
    const th = Math.atan2(oy - S.player.y, ox - S.player.x);
    const cv = document.querySelector('canvas.brotown-canvas');
    const r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const scX = S._worldScaleX || 1, scY = S._worldScaleY || 1;
    const px = (S.player.x - S.camera.x) * scX, py = (S.player.y - S.camera.y) * scY;
    const c = Math.cos(th) * scX, s = Math.sin(th) * scY;
    const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 135;
    const bottom = Math.min(r.height, innerHeight - dashH - r.top);
    const lim = (comp, toLow, toHigh) => Math.abs(comp) < 1e-3 ? Infinity
      : (comp > 0 ? toHigh : toLow) / Math.abs(comp);
    const R = Math.max(40, Math.min(180,
      lim(c, px - 24, r.width - 24 - px),
      lim(s, py - 24, bottom - 16 - py)));
    return { sx: r.left + px + c * R, sy: r.top + py + s * R };
  });
  if (!pt) return false;
  await A.page.mouse.move(pt.sx, pt.sy);
  return true;
}

/* ═══ KEEP THE DEFENDER PRESENT ═══
 * The defender never touches their own controls in this suite — the whole
 * point is that they stand there and take it — and v2.3.1913 logs an idle
 * character out after two idle minutes.  A 40-second blocking round plus
 * the wait for regen crosses that line, and the symptom is not an error:
 * the defender simply stops existing server-side, and the NEXT round then
 * measures a weapon against nobody and reports a zero.  Three separate
 * "the bow does no damage" results traced back here.
 * A keystroke is real player input, so this is the same thing a human
 * defender does by existing. */
function keepAlive(B) {
  let stop = false;
  (async () => {
    while (!stop) {
      await B.page.keyboard.press('Shift').catch(() => {});
      for (let i = 0; i < 20 && !stop; i++) await B.page.waitForTimeout(500).catch(() => {});
    }
  })();
  return () => { stop = true; };
}

/* One measured round: swing until the defender dies, or until the cap.
 *
 * Measuring to DEATH rather than over a fixed window, because time-to-kill
 * is the thing being asked about and deriving it from a DPS extrapolation
 * adds an assumption for no reason when the real event is right there.  The
 * cap exists so a weapon that cannot reach (or cannot hurt) ends the round
 * instead of hanging the suite; when it trips, ttk is reported as null and
 * dps carries the answer instead. */
async function fight(A, wsPort, aId, bId, capMs, { keepDistance = 34 } = {}) {
  const t0 = Date.now();
  /* Wire counts around the round.  A weapon that does zero damage is either
     a broken weapon or a harness that never fired it, and those are opposite
     conclusions — the only way to tell them apart is whether the client put
     an attack on the socket at all. */
  const wire0 = await H.wireCounts(A).catch(() => ({}));
  const before = await H.serverPlayer(wsPort, bId);
  const pool = before ? before.hp : 0;
  let presses = 0, died = false;
  while (Date.now() - t0 < capMs) {
    if (!(await aimAt(A))) break;
    await A.page.mouse.down();
    await A.page.waitForTimeout(240);
    await A.page.mouse.up();
    presses++;
    await A.page.waitForTimeout(260);
    const now = await H.serverPlayer(wsPort, bId);
    if (now && (now.dying || now.hp <= 0)) { died = true; break; }
    /* Re-close if the defender drifted out of reach — a round that spent
       half its window out of range would read as a weak weapon. */
    if (presses % 4 === 0) await closeIn(A, wsPort, aId, bId, keepDistance);
  }
  const after = await H.serverPlayer(wsPort, bId);
  const wire1 = await H.wireCounts(A).catch(() => ({}));
  const sent = {};
  for (const k of Object.keys(wire1)) {
    const d = (wire1[k] || 0) - (wire0[k] || 0);
    if (d > 0 && k !== 'move' && k !== 'track') sent[k] = d;
  }
  const secs = (Date.now() - t0) / 1000;
  const dropped = died ? pool : Math.max(0, pool - (after ? after.hp : 0));
  return {
    presses, sent, secs: +secs.toFixed(1), pool, dropped, died,
    dps: +(dropped / secs).toFixed(2),
    /* Only a real kill yields a real TTK. */
    ttkSecs: died ? +secs.toFixed(1) : null,
    dmgPerPress: presses ? +(dropped / presses).toFixed(1) : 0,
  };
}

/* Equip a weapon out of the stash through the worker's own path, and set the
   active slot — both, because they are different pieces of state and a swap
   that moves one without the other is exactly the bug worth catching. */
async function equipFromStash(P, wantType, slot, activeSlot) {
  return P.page.evaluate(({ wantType, slot, activeSlot }) => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return { ok: false, why: 'no state' };
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === wantType);
    if (i < 0) return { ok: false, why: 'not in stash', stash: (R.weaponStash || []).map((w) => w && w.type) };
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot } });
    S.channel.send({ type: 'set_active_slot', payload: { slot: activeSlot } });
    R.activeSlot = activeSlot;
    S._userCycledSlot = true;
    return { ok: true, idx: i };
  }, { wantType, slot, activeSlot });
}

/* Send the handshake the REAL panels send, field for field.
 *
 * This matters more than it looks.  The first cut omitted `from` on the
 * accept, and the challenger's handler reads exactly that field to fill
 * S._inDuel.opponent — so the challenger ended up in a duel whose opponent
 * was `undefined`.  Melee did not care (its gate gets the target from the
 * mouse aim) but the ranged path looks the opponent up in S.others, found
 * nothing, and dropped every arrow: 836 impact tests, 836 misses, zero
 * player_attack on the wire.  It reads exactly like "bows do no damage in
 * duels" and it is entirely this function's fault.
 * Verified against src/ui/panels/DuelRequestPanel.jsx and the challenge
 * send in InspectPlayerPanel.jsx. */
async function reDuel(A, B, aId, bId) {
  await A.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_request', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0,
    } });
  }, bId);
  await A.page.waitForTimeout(700);
  await B.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_accept', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0,
    } });
  }, aId);
  await A.page.waitForTimeout(900);
  /* Assert the SHAPE, not just the flag: "in a duel" with an undefined
     opponent is the failure this function just caused. */
  return await H.readState(A, (S) => !!(S._inDuel && S._inDuel.opponent));
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Duelist', nameB: 'Rival' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  const stopKeepAlive = keepAlive(B);

  /* ARMING ALL THREE STYLES.
     tut_1 pays the sword + shield on ACCEPT but the Pine Bow and Pine Staff
     on TURN-IN (server/src/data.js) — the first cut of this file only
     accepted, so the stash held no bow or staff and the "bow" and "staff"
     rounds silently re-measured the sword still in hand.  They reported a
     believable 7.4s TTK, which is exactly why it was worth checking the
     equip actually took rather than trusting the round that followed it.
     The objective is `collect snowman x4`, and the admin grant DOES support
     items (it refuses weapons), so the quest can be finished the way the
     server means it to be rather than by writing into the blob. */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1500);
  await H.grant(wsPort, aId, 'item', { invKey: 'snowman', count: 4 });
  await A.page.waitForTimeout(900);
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    /* xpCat is REQUIRED, not optional: every character is on the prog3
       track, so quest XP has to name which combat skill it pays into
       ('sword' | 'bow' | 'staff', PROG3.SKILLS) and a turn-in without one
       is refused whole and silently.  The first cut sent only questId, the
       quest stayed active, no bow or staff was ever paid — and the rounds
       that followed happily re-measured the sword. */
    if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'sword' } });
  });
  await A.page.waitForTimeout(1800);
  const stashNow = await H.adminPlayer(wsPort, aId)
    .then((r) => ((r.rpg || {}).weaponStash || []).map((w) => w && w.type)).catch(() => []);
  rec.ok('the attacker holds all three weapon styles before switching (guard)',
    stashNow.includes('bow') && stashNow.includes('staff'), { stash: stashNow });
  const swordA = await equipFromStash(A, 'greatsword', 'weapon', 'melee');
  const swordB = await equipFromStash(B, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  rec.ok('both duellists are armed (guard)', swordA.ok && swordB.ok, { swordA, swordB });
  if (!swordA.ok) return;

  /* Every round starts the same way: the defender alive and whole, a fresh
     duel, and the pair in reach.  Rounds END in a death by design — TTK is
     the measurement — so this runs before each one rather than once. */
  await H.instrumentWire(A);
  /* Every round has to start from the SAME place or the numbers are not
     comparable: defender alive, at full health, duel live, pair in reach.
     Getting this wrong is not a small error — one run reported the bow doing
     zero damage over 40 seconds, and the wire counts showed the client never
     fired: the round had begun with the defender already dead, so nothing
     about the bow was measured at all.  This waits for the real state and
     REPORTS when it cannot get there, rather than measuring whatever it
     found. */
  /* maxHp comes from the PERSISTED BLOB, not from the live summary.
     /admin's `live` view carries hp but no maxHp, so every readiness test
     written against `b.maxHp` is false forever and every round runs on
     whatever health it found — which is precisely how a bow got reported as
     doing zero damage.  Read it once; it does not change during the run. */
  const fullHp = await H.adminPlayer(wsPort, bId)
    .then((r) => ((r.rpg || {}).maxHp) || 0).catch(() => 0);
  rec.ok('the defender\'s full health is known (guard)', fullHp > 0, { fullHp });

  async function freshRound(want = 34) {
    let b = null;
    for (let i = 0; i < 40; i++) {
      b = await H.serverPlayer(wsPort, bId);
      /* Full health, not merely alive.  A defender left on a sliver by the
         previous round makes the next weapon look devastating.  `b` is null
         for a beat around the respawn — keep waiting rather than treating a
         missing record as a verdict. */
      if (b && !b.dying && b.hp > 0 && fullHp && b.hp >= fullHp) break;
      await A.page.waitForTimeout(1500);
    }
    const ready = !!(b && !b.dying && fullHp && b.hp >= fullHp);
    await A.page.waitForTimeout(600);
    let live = await H.readState(A, (S) => !!(S._inDuel && S._inDuel.opponent && S.others && S.others[S._inDuel.opponent]));
    if (!live) live = await reDuel(A, B, aId, bId);
    const near = await closeIn(A, wsPort, aId, bId, want);
    return { live, near, ready, hp: b ? b.hp : null, fullHp };
  }

  const first = await freshRound();
  rec.ok('a duel is running (guard)', first.live, first);
  rec.ok('...against a defender at full health (guard)', first.ready, first);
  if (!first.live) return;

  const report = {};

  /* ── 1. sword, unblocked: the baseline ── */
  report.sword = await fight(A, wsPort, aId, bId, 40000);
  console.log('   sword       :', JSON.stringify(report.sword));

  /* ── 2. sword, defender blocking ── */
  const blockSetup = await freshRound();
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg;
    if (!R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
    clearInterval(window.__feelBlock);
    window.__feelBlock = setInterval(() => {
      const o = S.others && S.others[Object.keys(S.others)[0]];
      if (!o) return;
      const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
      S._shieldUp = true;
      S.shieldEnd = Date.now() + 500;
      S._shieldAngle = Math.atan2(oy - S.player.y, ox - S.player.x);
    }, 16);
  });
  await A.page.waitForTimeout(400);
  report.swordBlocked = await fight(A, wsPort, aId, bId, 40000);
  await B.page.evaluate(() => {
    clearInterval(window.__feelBlock);
    const S = window._gameState.current; S._shieldUp = false; S.shieldEnd = 0;
  });
  report.swordBlocked.setup = blockSetup;
  console.log('   sword+block :', JSON.stringify(report.swordBlocked));

  /* ── 3. weapon switching ── */
  for (const [label, type, slot, active, reach] of [
    ['bow', 'bow', 'rangedWeapon', 'ranged', 150],
    ['staff', 'staff', 'staffWeapon', 'staff', 150],
  ]) {
    const eq = await equipFromStash(A, type, slot, active);
    await A.page.waitForTimeout(1400);
    const full = await H.adminPlayer(wsPort, aId).catch(() => null);
    report[label + 'Equip'] = {
      eq,
      equipped: full && full.rpg ? {
        activeSlot: full.rpg.activeSlot,
        ranged: full.rpg.rangedWeapon && full.rpg.rangedWeapon.type,
        staff: full.rpg.staffWeapon && full.rpg.staffWeapon.type,
      } : null,
    };
    console.log('   ' + label + ' equip  :', JSON.stringify(report[label + 'Equip']));
    const setup = await freshRound(reach);
    report[label] = await fight(A, wsPort, aId, bId, 40000, { keepDistance: reach });
    report[label].setup = setup;
    report[label].foughtAt = setup.near && setup.near.d;
    report[label].proj = await A.page.evaluate(() => window.__btPvpProj || null).catch(() => null);
    await A.page.evaluate(() => { window.__btPvpProj = null; });
    console.log('   ' + label + '         :', JSON.stringify(report[label]));
  }

  /* ═══ what the numbers have to clear ═══
     Deliberately loose.  These catch "this does nothing at all", which is
     broken by any standard; the tuning itself is the owner's to read off
     the printed report. */
  rec.ok('a sword duel actually removes health', report.sword.dropped > 0, report.sword);
  rec.ok('...ending the fight rather than stalemating',
    report.sword.died === true, report.sword);
  rec.ok('...and taking long enough to be a fight, not a one-shot',
    report.sword.ttkSecs != null && report.sword.ttkSecs > 2, report.sword);

  rec.ok('raising a shield measurably reduces incoming damage',
    report.swordBlocked.dps < report.sword.dps,
    { openDps: report.sword.dps, blockedDps: report.swordBlocked.dps,
      openTtk: report.sword.ttkSecs, blockedTtk: report.swordBlocked.ttkSecs });
  /* ═══ v2.3.1919: ...but it does NOT make you unkillable ═══
     Owner: "Just make the shield have stamina cost that would prohibit
     holding the shield up the whole time."  Before this version the
     blocking round never ended — 40 seconds of continuous attack at 1.5
     damage a swing — so THIS is the assertion that encodes the fix: a
     defender who does nothing but hold the shield still dies. */
  rec.ok('...but holding it does not make you unkillable',
    report.swordBlocked.died === true, report.swordBlocked);
  /* And it is still worth raising.  A shield that changed nothing would
     pass the assertion above just as well. */
  rec.ok('...while still buying real time (>= 1.4x the unguarded fight)',
    report.swordBlocked.ttkSecs != null && report.sword.ttkSecs != null
      && report.swordBlocked.ttkSecs >= report.sword.ttkSecs * 1.4,
    { openTtk: report.sword.ttkSecs, blockedTtk: report.swordBlocked.ttkSecs });

  for (const label of ['bow', 'staff']) {
    const e = report[label + 'Equip'] && report[label + 'Equip'].equipped;
    rec.ok(`switching to the ${label} reaches the server`,
      !!e && e.activeSlot === (label === 'bow' ? 'ranged' : 'staff'), report[label + 'Equip']);
    if (report[label] && report[label].setup && !report[label].setup.ready) {
      rec.skip(`...and the ${label} can actually hurt someone`,
        'the round never started from a full-health defender, so its zero says nothing');
    } else {
      rec.ok(`...and the ${label} can actually hurt someone`,
        !!report[label] && report[label].dropped > 0, report[label]);
    }
  }

  stopKeepAlive();
  console.log('   REPORT:', JSON.stringify(report, null, 1));
}
