/* DOES THE LUNGE ACTUALLY HURT A SERVER-DRIVEN MONSTER? (v2.3.2261)
 *
 * Owner: "Melee still doesn't register a hit when you use sword dashing a
 * monster."
 *
 * ═══ WHY THIS FILE EXISTS RATHER THAN ANOTHER ASSERTION IN mp-ability ═══
 * Every test of the lunge so far has run in TOWN against a fixture monster
 * pushed straight into S.monsters with _serverMonsters false, holding a weapon
 * INJECTED into S.rpg.weapon.  Three things that matters for are exactly the
 * three the owner's report depends on:
 *
 *   1. THE WORKER OWNS THE DAMAGE.  In a spoke zone the client sends `ability`
 *      and the monster loses hp only if _handleAbility accepts it.  In town the
 *      client applies its own damage, so a lunge "worked" in every test while
 *      the worker had never once been asked.
 *   2. AN INJECTED WEAPON IS NOT A WEAPON.  mp-fightsoak's own note: a
 *      client-side S.rpg.weapon is undone by the next player_state echo, and
 *      the WORKER's ps.weapon stays empty -- which _handleAbility checks
 *      (`cfg.needs === 'weapon'`).  A lunge that the client happily casts can
 *      be refused server-side with nothing on screen to say so.
 *   3. REFERENCES GO STALE.  Server monsters arrive over the wire and a
 *      snapshot can replace the objects; S._bashDash holds a REF, and the
 *      v2.3.2261 ghost-lock bug was this exact class.
 *
 * So this stands in a real zone, with a real forged weapon, against a monster
 * the worker is driving, and asks the only question that matters: did its hp
 * go down.
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
  const P = await H.newPlayer(browser, { name: 'Lunger', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Accept the tutorial so the town gate opens, then walk town -> worldview ->
     a spoke zone, exactly as mp-fightsoak does. */
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
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the lunge can be tested against a server monster', 'no exit tables');
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

  /* A REAL weapon, forged by the worker, so both sides hold the same one --
     see the header, point 2. */
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
    return {
      zone: S.currentZone,
      serverDriven: !!S._serverMonsters,
      weapon: R.weapon ? (R.weapon.name || R.weapon.type) : null,
      monsters: (S.monsters || []).length,
      stam: R.stamina, maxStam: R.maxStamina,
    };
  });
  console.log('    setup: ' + JSON.stringify(setup));
  rec.ok('the bro is in a spoke zone the WORKER is driving (guard)',
    setup.zone !== 'town' && setup.zone !== 'worldview' && setup.serverDriven === true, setup);
  rec.ok('...holding a weapon the worker forged, not one injected into the client (guard)',
    !!setup.weapon, setup);
  if (!setup.serverDriven || !setup.weapon) { await P.ctx.close().catch(() => {}); return; }

  /* Find a live monster and stand a lunge's reach from it, then TAP-lock it --
     the deliberate pick, which is what maybeSwordDash needs. */
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true, total: (S.monsters || []).length };
    /* Nearest, so the walk below is short. */
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    /* Stand 200px away, inside the lunge's declared reach of 240. */
    const ang = Math.atan2(S.player.y - m.y, S.player.x - m.x);
    S.player.x = m.x + Math.cos(ang) * 200;
    S.player.y = m.y + Math.sin(ang) * 200;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._abilCd = null;
    return {
      id: String(m.id), hp: m.curHp, maxHp: m.maxHp,
      gap: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)),
    };
  });
  console.log('    armed: ' + JSON.stringify(armed));
  if (armed.none) {
    rec.skip('the lunge lands a hit on a server monster', `no live monsters in ${setup.zone}`);
    await P.ctx.close().catch(() => {}); return;
  }
  rec.ok('a live server monster is locked at lunge range (guard)',
    !!armed.id && armed.gap >= 150 && armed.gap <= 240, armed);

  /* THE LUNGE.  Fired through the same function the button calls. */
  const fired = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
    return { ok, dash: !!S._bashDash, pending: !!S._dashStrike,
      status: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null };
  });
  console.log('    fired: ' + JSON.stringify(fired));
  rec.ok('the lunge fires against a server monster', fired.ok === true, fired);

  /* ═══ CATCH THE GAP WHEN THE DASH ENDS, NOT WHENEVER WE LOOK ═══
     A live server monster WALKS.  Reading the distance 2.5s after the lunge
     measures where it wandered to, not where the dash finished -- one run gave
     69px and the next 83px on identical code, which is the monster moving, not
     the dash varying.  Poll for S._bashDash going null and stamp the gap on
     that frame; the hp check below still gets its full settle time. */
  const closed = await P.page.evaluate((id) => new Promise((resolve) => {
    const S = window._gameState.current;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const done = !S._bashDash;
      if (done || Date.now() - t0 > 3000) {
        clearInterval(iv);
        const m = (S.monsters || []).find((x) => x && String(x.id) === id);
        resolve({ ended: done, ms: Date.now() - t0,
          gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null });
      }
    }, 16);
  }), armed.id);
  console.log('    closed: ' + JSON.stringify(closed));
  rec.ok(`the dash ended on its own (${closed.ms}ms)`, closed.ended === true, closed);
  rec.ok(`...having CLOSED the distance to contact (${closed.gap}px at the moment it ended, from ${armed.gap})`,
    closed.gap != null && closed.gap <= 80, { closed, from: armed.gap });

  /* Now let the strike reach the worker and its damage come back. */
  await P.page.waitForTimeout(2500);
  const landed = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && String(x.id) === id);
    return {
      found: !!m,
      hp: m ? m.curHp : null,
      gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null,
      stunned: m ? !!(m._stunUntil && m._stunUntil > Date.now()) : null,
      stillDashing: !!S._bashDash,
      stillPending: !!S._dashStrike,
      stam: S.rpg.stamina,
    };
  }, armed.id);
  console.log('    landed: ' + JSON.stringify(landed));
  rec.ok('the monster is still tracked after the lunge (guard)', landed.found === true, landed);
  rec.ok('...the dash finished and its held strike went out',
    landed.stillDashing === false && landed.stillPending === false, landed);
  /* The distance claim is made above, on the frame the dash ended -- see the
     note there.  `landed.gap` is only logged now, as context for the hp read. */
  /* THE QUESTION THE OWNER ASKED. */
  rec.ok(`...and the monster actually LOST HP (${armed.hp} -> ${landed.hp})`,
    landed.hp != null && armed.hp != null && landed.hp < armed.hp,
    { before: armed.hp, after: landed.hp, ...landed });
  /* ═══ TWO BAD VERSIONS OF THIS ASSERTION, BOTH THE SAME MISTAKE ═══
     First it read `landed.stam < maxStam` -- but stamina REGENERATES, and the
     settle wait is ample to refill a 10-point spend, so it was measuring the
     regen clock.  Then it re-read the cooldown after that same wait -- but the
     cooldown is 2500ms and the wait is 2500ms, so it sampled the boundary and
     read 0.  Both were the same error: asking a moving value about a past
     event.
     The cast is already stamped at the moment it happened -- `fired.status`
     was captured on the frame maybeSwordDash returned -- so that is what is
     asserted, and nothing here has to be timed at all. */
  rec.ok(`...and the ability went on cooldown the moment it was cast (${fired.status && fired.status.cdLeft}ms)`,
    !!fired.status && fired.status.cdLeft > 0, fired.status);

  await P.ctx.close().catch(() => {});
}
