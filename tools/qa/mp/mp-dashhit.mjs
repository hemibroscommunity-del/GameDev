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

  /* ═══ v2.3.2263: THE ONE THE OWNER ACTUALLY REPORTED ═══
     "Sword dash deals damage when attacking using the proximity based targeted
     attack but not when you tap to lock on a monster from across the screen.
     It always says miss when I do that."

     Everything above is the 200px case, which was already passing when he
     reported it -- that is the "proximity" half, and its passing is exactly why
     the report went unexplained for a round.  The failing half is a tap lock at
     a distance the screen allows and the DASH WINDOW did not: tap-to-lock is a
     screen-space hit test with no range limit at all, while the window was a
     flat 420ms, and at DASH_STEP_PX x 60 = 1560 px/s that is a hard travel
     budget of ~655px.  Beyond it the clock expired mid-flight, the held strike
     went out from wherever he had got to, and the worker refused it against
     `reach` 240.

     560px is chosen to sit between the two: comfortably past the 240 the worker
     will accept from a standing start, comfortably inside the 900 the lunge is
     now allowed to close.  On the old window this section fails on the distance
     assertion -- the dash stops ~100px short -- which is the reproduction. */
  await P.page.waitForTimeout(2700);   /* the 2500ms cooldown, plus slack */
  /* ═══ NO TELEPORT.  PICK A MONSTER THAT IS ALREADY FAR ═══
     Two earlier versions of this round stood the player 560px away by writing
     S.player.x, and both measured the FIXTURE rather than the dash: a 560px
     jump is exactly the teleport the worker's movement cap exists to refuse
     (movement.js, 500 px/s x dt + 80px burst at the client's 66ms cadence), so
     the worker held the old position and whiffed the lunge for a reason that
     never happens in play; and dropping the player at an arbitrary point in a
     real zone put them behind scenery, where the dash's own collision check
     ended it after 51px.
     The zone spawns six monsters at the server's farthest-point spacing, so one
     of them is simply far away.  Locking THAT one is the owner's case exactly
     -- he taps a monster across the screen from where he is already standing --
     and nothing about the player's position is faked. */
  const armed2 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    const far = live.map((m) => ({ m, d: Math.hypot(m.x - S.player.x, m.y - S.player.y) }))
      .filter((e) => e.d >= 420 && e.d <= 900)
      .sort((a, b) => b.d - a.d);
    if (!far.length) {
      return { none: true, dists: live.map((m) => Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y))) };
    }
    const m = far[0].m;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._abilCd = null;
    S._lastAbilityReject = null;
    return { id: String(m.id), hp: m.curHp, alive: m.alive !== false, gap: Math.round(far[0].d) };
  });
  console.log('    armed FAR: ' + JSON.stringify(armed2));
  if (armed2.none) {
    rec.skip('a lunge at a monster across the screen lands',
      `no live monster 420-900px away (${JSON.stringify(armed2.dists)})`);
    await P.ctx.close().catch(() => {}); return;
  }
  rec.ok('a live server monster is tap-locked ACROSS THE SCREEN, where it stands (guard)',
    armed2.gap >= 420 && armed2.gap <= 900 && armed2.alive === true && armed2.hp > 0, armed2);

  const fired2 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    /* COUNT THE MOVE PACKETS THE DASH ACTUALLY SENDS.  The worker decides the
       hit from ps.x/ps.y, which only advances when a move arrives -- so "did
       the client tell it" and "did it believe the client" are two different
       failures with one symptom, and this separates them. */
    window.__mv = 0;
    if (!S.__sendWrapped && S.channel && S.channel.send) {
      S.__sendWrapped = true;
      const orig = S.channel.send.bind(S.channel);
      S.channel.send = function (m) {
        if (m && m.type === 'broadcast' && m.event === 'move') window.__mv++;
        return orig(m);
      };
    }
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
    return { ok, dash: !!S._bashDash,
      /* The window the cast chose, stamped on the frame it was chosen -- not
         re-derived later from a clock that has moved (TRAPS #44). */
      windowMs: S._bashDash ? (S._bashDash.until - Date.now()) : null,
      maxTravel: S._bashDash ? S._bashDash.maxTravel : null };
  });
  console.log('    fired FAR: ' + JSON.stringify(fired2));
  rec.ok('the far lunge fires', fired2.ok === true, fired2);
  rec.ok(`...and its window is sized to the GAP, not the old flat 420ms (${fired2.windowMs}ms)`,
    fired2.windowMs != null && fired2.windowMs > 460, fired2);

  const closed2 = await P.page.evaluate((id) => new Promise((resolve) => {
    const S = window._gameState.current;
    const t0 = Date.now();
    /* HOW FAST DID IT ACTUALLY GO, and was the loop healthy while it went?
       The window is derived from DASH_SPEED_PX_PER_MS, and that constant is
       only true if the render loop is running at something like 60fps -- the
       step is multiplied by _dtScale, which is itself clamped to 3, so a loop
       slower than 20fps moves the dash at LESS than nominal no matter what the
       window says.  Sizing a product constant against a browser that is merely
       busy would be sizing it against the harness, so the harness reports its
       own frame health and the assertion below can be read in that light. */
    const p0 = { x: S.player.x, y: S.player.y };
    let frames = 0, dtMax = 0;
    const iv = setInterval(() => {
      frames++;
      if (typeof S._dtScale === 'number') dtMax = Math.max(dtMax, S._dtScale);
      const done = !S._bashDash;
      if (done || Date.now() - t0 > 5000) {
        clearInterval(iv);
        const m = (S.monsters || []).find((x) => x && String(x.id) === id);
        const ms = Date.now() - t0;
        const travelled = Math.hypot(S.player.x - p0.x, S.player.y - p0.y);
        resolve({ ended: done, ms,
          gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null,
          travelled: Math.round(travelled),
          pxPerSec: Math.round(travelled / (ms / 1000)),
          dtScaleMax: +dtMax.toFixed(2), polls: frames });
      }
    }, 16);
  }), armed2.id);
  console.log('    closed FAR: ' + JSON.stringify(closed2));
  /* ═══ WHERE DOES THE WORKER THINK HE IS STANDING? ═══
     This is the only number that decides the hit, and it is not the one on
     screen.  _handleAbility measures from ps.x/ps.y -- the worker's copy, fed
     by move packets -- so a lunge that visibly lands and still answers
     "Missed!" is the two copies disagreeing, and nothing in the browser can
     tell you that.  Sampled right after the dash ends, before the settle wait
     moves anything. */
  const srv = await H.serverPlayer(wsPort, myId).catch(() => null);
  const srvGap = await P.page.evaluate(({ sx, sy, id }) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && String(x.id) === id);
    if (!m || typeof sx !== 'number') return null;
    return { serverToMonster: Math.round(Math.hypot(m.x - sx, m.y - sy)),
      clientToServer: Math.round(Math.hypot(S.player.x - sx, S.player.y - sy)) };
  }, { sx: srv && srv.x, sy: srv && srv.y, id: armed2.id });
  const mv = await P.page.evaluate(() => window.__mv);
  console.log('    worker sees: ' + JSON.stringify({ srvX: srv && Math.round(srv.x), srvY: srv && Math.round(srv.y), ...srvGap, moves: mv }));
  rec.ok(`the WORKER agrees the bro closed the distance (${srvGap && srvGap.serverToMonster}px on its copy, reach is 900 since v2.3.2266)`,
    !!srvGap && srvGap.serverToMonster <= 240, { srv: srv && { x: srv.x, y: srv.y }, ...srvGap });
  rec.ok(`the far dash ended on its own (${closed2.ms}ms)`, closed2.ended === true, closed2);
  rec.ok(`...and it CLOSED all ${armed2.gap}px to contact (${closed2.gap}px when it ended)`,
    closed2.gap != null && closed2.gap <= 90, { closed2, from: armed2.gap });

  await P.page.waitForTimeout(2500);
  const landed2 = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && String(x.id) === id);
    return { found: !!m, hp: m ? m.curHp : null, stillPending: !!S._dashStrike,
      /* WHY, not just whether.  A lunge that does no damage because the worker
         refused it and one that does no damage because the client never sent it
         look identical from the hp alone -- see the wsClient probe. */
      reject: S._lastAbilityReject || null };
  }, armed2.id);
  console.log('    landed FAR: ' + JSON.stringify(landed2));
  /* THE REPORT, ANSWERED. */
  rec.ok(`a lunge at a monster tap-locked across the screen LANDS (${armed2.hp} -> ${landed2.hp})`,
    landed2.hp != null && armed2.hp != null && landed2.hp < armed2.hp,
    { before: armed2.hp, after: landed2.hp, gap: armed2.gap, ...landed2 });
  rec.ok('...and the worker did not answer it with the "Missed!" the owner keeps seeing',
    !landed2.reject || landed2.reject.reason !== 'whiff', landed2.reject);

  await P.ctx.close().catch(() => {});
}
