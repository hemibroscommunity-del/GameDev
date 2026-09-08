/* ═══ THE CLIENT STOPS BILLING DAMAGE THE WORKER NEVER DEALT (v2.3.2350-2352) ═══
 *
 * Three findings from one client-vs-worker sweep, all the same shape and all
 * pinned here because they share a fixture: in a SERVER zone the worker owns
 * monster HP and rolls its own numbers, and three client paths had never been
 * told.  The main hit number learned this in v2.3.2220; these three did not.
 *
 *   1. THE COLLISION BURST printed its own roll (monsterCombat.js, and the
 *      projectile twin) AND the worker's collision monster_hit printed a
 *      second, different number a round trip later -- two numbers per
 *      collision, only the second one moving the HP bar.  Worse, the client's
 *      own status clocks could resolve a collision the worker never did.
 *   2. THE LUNGE (dodge.js doLunge) wrote monster HP, applied a status and
 *      printed a number on arrival with nothing sent to the worker at all --
 *      pure fiction, undone by the next authoritative tick.
 *   3. THE SWORD DASH stamped its cooldown at the PRESS while the worker
 *      stamps at the deferred STRIKE, so a press inside the skew played a
 *      full lunge (suppressing the ordinary swing with it) and the worker
 *      answered 'cooldown'.
 *
 * WHY THE COLLISION HALF IS DISPATCHED THROUGH A SEAM.  Provoking a real
 * elemental collision needs a dual-element weapon, a status applied inside
 * its window, and a second swing timed against the worker's own status clock
 * -- a fixture that would be mostly setup and still flaky on a loaded box.
 * The packet is the worker's own shape (server/src/combat.js, the
 * `collision: col.id` monster_hit), and window.__btDispatch hands it to the
 * REAL handler, so the code under test is the code that runs on a phone.
 * WHICH ASSERTIONS DISCRIMINATE, honestly.  Run against the pre-fix files,
 * five of these go red: the collision's NAME (the burst identity the echo
 * now wears), the lunge's number over the monster, the dash cooldown being
 * strictly later than the press stamp, and both halves of the refusal.  Two
 * others pass either way and are guards, not claims: the collision COUNT
 * (this fixture never runs the local roll, so there was only ever one number
 * HERE -- the doubling is pinned by the name), and "not early", which the
 * broken build satisfies whenever the dash happens to arrive inside its own
 * cooldown.
 *
 * The lunge and the dash run against real worker-owned monsters in a spoke
 * zone, because their bug IS the disagreement with the worker.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Honest', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  const seam = await P.page.evaluate(() => typeof window.__btDispatch === 'function');
  rec.ok('the game-event seam is wired (guard)', seam === true, {});
  if (!seam) { await P.ctx.close().catch(() => {}); return; }

  /* ── 1. ONE number per collision, and it is the worker's ───────────────
     Staged entirely on the client: a fake monster in S.monsters (the local
     mirror every renderer and handler reads), _serverMonsters on, then the
     worker's collision hit through the seam.  The assertion is the COUNT. */
  const coll = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._serverMonsters = true;
    S.dmgNumbers = [];
    const m = { id: 'fn-mon-1', type: 'slime', x: S.player.x + 120, y: S.player.y,
      renderX: S.player.x + 120, renderY: S.player.y,
      hp: 200, maxHp: 200, curHp: 200, alive: true, statuses: [], color: '#8f8' };
    S.monsters = [m];
    /* The local roll's leftovers, exactly as monsterCombat would have set
       them for a collision it resolved but did not print. */
    S._ownCollisionRecent = { id: 'wildfire', name: 'Wildfire', color: '#ff9a3c', prefix: '', at: Date.now() };
    window.__btDispatch({ type: 'monster_hit', payload: {
      monsterId: 'fn-mon-1', zone: S.currentZone, dmg: 21, isCrit: false,
      attackerId: S.myId, collision: 'wildfire', slot: 'melee', hpPct: 0.8 } });
    return { pops: (S.dmgNumbers || []).map((d) => ({ t: String(d.text), y: Math.round(d.y - m.y) })) };
  });
  console.log('    popups after ONE worker collision hit', JSON.stringify(coll.pops));
  rec.ok('a worker collision hit produces exactly ONE damage number',
    coll.pops.length === 1, coll);
  rec.ok('...and it carries the WORKER\'s damage, not a second local roll',
    coll.pops.length === 1 && coll.pops[0].t.indexOf('21') >= 0, coll);
  rec.ok('...wearing the collision\'s own name, not a bare weapon hit',
    coll.pops.length === 1 && /Wildfire/.test(coll.pops[0].t), coll);
  rec.ok('...on the burst\'s higher line, not the ordinary hit line',
    coll.pops.length === 1 && coll.pops[0].y <= -30, coll);

  /* Deploy-order control: a worker that sends no `collision` still gets the
     ordinary number, so an older worker is not left silent. */
  const plain = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.dmgNumbers = [];
    window.__btDispatch({ type: 'monster_hit', payload: {
      monsterId: 'fn-mon-1', zone: S.currentZone, dmg: 13, isCrit: false,
      attackerId: S.myId, slot: 'melee', hpPct: 0.7 } });
    return (S.dmgNumbers || []).map((d) => String(d.text));
  });
  rec.ok('control: an ordinary worker hit still prints its number',
    plain.length === 1 && plain[0].indexOf('13') >= 0, { plain });

  /* ══ THE REST NEEDS A ZONE THE WORKER IS DRIVING, AND A REAL WEAPON ══
     The lunge and the dash bugs ARE the disagreement with the worker, so
     nothing here is staged: the route, the forge and the monster are the
     ones mp-dashhit uses, and the moves are fired through the same entry
     points the buttons call. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'frost')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the lunge and the dash are tested against a server monster', 'no exit tables');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2500);

  const myId = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, myId, 'gold', { amount: 500 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'forge_weapon',
      payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
  });
  await P.page.waitForTimeout(2200);

  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg || {};
    R.activeSlot = 'melee';
    S._shieldUp = false;
    return { zone: S.currentZone, serverDriven: !!S._serverMonsters,
      weapon: R.weapon ? (R.weapon.name || R.weapon.type) : null,
      monsters: (S.monsters || []).length };
  });
  console.log('    setup: ' + JSON.stringify(setup));
  rec.ok('the bro is in a spoke zone the WORKER is driving, with a forged weapon (guard)',
    setup.zone !== 'town' && setup.zone !== 'worldview' && setup.serverDriven === true && !!setup.weapon, setup);
  if (!setup.serverDriven || !setup.weapon) { await P.ctx.close().catch(() => {}); return; }

  /* ── 2. the lunge bills nothing it did not deal ────────────────────────
     Fired through triggerContextualDodge -- the function the swipe and the
     desktop key both call (the entry mp-dodgetrail uses) -- with a monster
     tap-locked at lunge reach, which is what resolveDodgeContext needs to
     choose the lunge over a plain roll. */
  const lArmed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const ang = Math.atan2(S.player.y - m.y, S.player.x - m.x);
    S.player.x = m.x + Math.cos(ang) * 180;
    S.player.y = m.y + Math.sin(ang) * 180;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S.dmgNumbers = [];
    return { id: String(m.id), hp: m.curHp,
      toward: Math.atan2(m.y - S.player.y, m.x - S.player.x),
      gap: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) };
  });
  if (lArmed.none) {
    rec.skip('a lunge in a server zone bills nothing it did not deal', 'no live monsters');
  } else {
    rec.ok('a live worker monster is locked at lunge reach (guard)',
      !!lArmed.id && lArmed.gap >= 140 && lArmed.gap <= 240, lArmed);
    /* The KIND is read on the same turn the move is fired: _dodgeRoll is
       cleared when the roll ends, well inside the 600ms this then waits for
       the arrival timer, so sampling it afterwards would say 'null' for a
       lunge that certainly happened. */
    const lFired = await P.page.evaluate(async (ang) => {
      const S = window._gameState.current;
      const f = window._gameFns || {};
      if (f.contextualDodge) f.contextualDodge(ang);
      return { kind: S._dodgeRoll && S._dodgeRoll.kind, target: S._dodgeRoll && S._dodgeRoll.targetId };
    }, lArmed.toward);
    /* doLunge lands its hit on a 160ms timer; wait well past it, but not so
       long that a worker tick could legitimately move the HP. */
    await P.page.waitForTimeout(600);
    const lAfter = await P.page.evaluate((a) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => String(x.id) === a.id) || {};
      /* Only numbers over the MONSTER count: the player is standing next to
         a live worker monster, so a hit taken in the same second would
         otherwise read as a lunge popup. */
      const near = (S.dmgNumbers || []).filter((d) =>
        Math.abs(d.x - (m.x || 0)) < 60 && Math.abs(d.y - (m.y || 0)) < 90);
      return { hp: m.curHp, pops: near.map((d) => String(d.text)),
        allPops: (S.dmgNumbers || []).length };
    }, { id: lArmed.id });
    console.log('    lunge: fired ' + JSON.stringify(lFired) + ' -> ' + JSON.stringify(lAfter));
    rec.ok('the lunge actually fired (guard)', lFired.kind === 'lunge', lFired);
    rec.ok('THE REGRESSION: it does not print a number over the monster for damage the worker never dealt',
      (lAfter.pops || []).length === 0, lAfter);
    rec.ok('...and it does not write the monster\'s HP behind the worker\'s back',
      lAfter.hp == null || lAfter.hp >= lArmed.hp, lAfter);
  }

  /* ── 3. the dash cooldown starts when the WORKER's does ────────────────
     __btMaybeSwordDash is the entry the ATTACK button takes (mp-dashhit
     drives the same one).  With a lock, the `ability` message is held until
     the dash arrives -- S._dashStrike going null is that send. */
  const dArmed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const ang = Math.atan2(S.player.y - m.y, S.player.x - m.x);
    S.player.x = m.x + Math.cos(ang) * 200;
    S.player.y = m.y + Math.sin(ang) * 200;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._abilCd = {};
    S._lastAbilityReject = null;
    const pressAt = Date.now();
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
    return { ok, pressAt, pressCd: S._abilCd.sworddash || null, pending: !!S._dashStrike };
  });
  if (dArmed.none || dArmed.ok !== true) {
    rec.skip('the dash cooldown starts at the strike, not the press',
      dArmed.none ? 'no live monsters' : 'the dash did not fire');
  } else {
    rec.ok('the dash fired and is holding its strike for arrival (guard)',
      dArmed.pending === true && typeof dArmed.pressCd === 'number', dArmed);
    /* Wait for the held strike to go out -- that is the moment the worker
       stamps its own clock. */
    const sent = await P.page.evaluate(async () => {
      const S = window._gameState.current;
      const t0 = Date.now();
      while (S._dashStrike && Date.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 30));
      return { sentAt: Date.now(), still: !!S._dashStrike, cd: S._abilCd.sworddash || null };
    });
    console.log('    dash: press ' + JSON.stringify(dArmed) + ' -> strike ' + JSON.stringify(sent));
    rec.ok('the held strike went out (guard)', sent.still === false, sent);
    rec.ok('THE REGRESSION: the cooldown is re-stamped at the STRIKE, so it is not early',
      typeof sent.cd === 'number' && sent.cd >= sent.sentAt, { ...sent, pressCd: dArmed.pressCd });
    rec.ok('...which is strictly later than the press stamp the worker never saw',
      typeof sent.cd === 'number' && sent.cd > dArmed.pressCd, { cd: sent.cd, pressCd: dArmed.pressCd });

    /* ── 4. and a REAL refusal hands the ordinary swing back ────────────
       Press again immediately: the worker's own clock is running, so this
       one comes back 'cooldown' -- the exact skew case, now from the
       worker's mouth rather than a staged payload. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._abilCd = {};                       /* the client thinks it is ready */
      S._abilitySwingUntil = Date.now() + 5000;
      S.rpg.stamina = S.rpg.maxStamina || 100;
      if (S.channel) S.channel.send({ type: 'ability', payload: { kind: 'sworddash' } });
    });
    const rej = await H.waitFor(P, (S) => S._lastAbilityReject,
      (r) => !!r && r.reason === 'cooldown', { timeout: 8000, label: 'worker refusal' }).catch(() => null);
    console.log('    refusal: ' + JSON.stringify(rej));
    if (!rej) {
      rec.skip('a refused ability hands the ordinary swing back', 'the worker did not refuse');
    } else {
      const after = await H.readState(P, (S) => ({ swingUntil: S._abilitySwingUntil, cd: (S._abilCd || {}).sworddash, now: Date.now() }));
      rec.ok('a refused ability stops suppressing the ordinary swing',
        !(after.swingUntil > after.now), after);
      rec.ok('...and the local clock takes the worker\'s remaining ms instead of guessing again',
        typeof after.cd === 'number' && after.cd > after.now, after);
    }
  }

  await P.ctx.close().catch(() => {});
}
