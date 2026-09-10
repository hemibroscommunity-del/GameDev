/* THE LUNGE, FROM A REAL FINGER -- AND THE ONE FLAG THAT KILLS IT (v2.3.2418)
 *
 * Owner: "The dash to enemy for melee isn't working anymore."
 *
 * ═══ WHY mp-dashhit's 18/18 DID NOT CATCH THIS ═══
 * That suite fires the lunge by calling `window.__btMaybeSwordDash()` and it
 * hands itself the lock by writing `S.lockedTarget` straight into state.  Both
 * of those are parts a player never touches.  TRAPS 67: a synthesised gesture
 * proves the handler, not the reachability -- and an injected lock proves the
 * ability, not the targeting that has to hand it one.  So this file removes
 * both crutches: a real touchscreen on the disc's real screen coordinates,
 * against a real server monster, with the lock left to the game itself.
 *
 *   finger -> disc element -> handleRBtnPress -> lock -> maybeSwordDash -> dash
 *   [------------- this file -------------->]  [------ mp-dashhit ------]
 *
 * ═══ WHAT IT FOUND ═══
 * Round 1 passes: the whole chain works.  So the lunge is not broken in the
 * code -- which is why nothing in the diff explained the report.
 *
 * Round 2 is the answer.  wsClient does
 * `setAbilitiesEnabled(!!(S._serverCaps && S._serverCaps.abil))`, and with that
 * capability off BOTH gates in abilities.js refuse: `castAbility` returns false
 * at `if (!isAbilitiesEnabled())`, and `abilityUnlocked` returns false so
 * `abilityStatus.visible` is false too.  The press is still felt, the ordinary
 * swing still goes out, the lock still forms -- and the lunge simply does not
 * happen, WITH NOTHING ON SCREEN TO SAY SO.  That is the report, exactly.
 *
 * The capability is baked `true` in the worker's own caps literal, so the way
 * it goes false in production is a LIVEOPS FLAG named after it: join.js spreads
 * `..._liveFlags` LAST over that literal, which is the same mechanism that put
 * the combat levels back to 0 (v2.3.2414).  One flag, two reports.
 *
 * Driven by deleting the capability from `state_sync` in an init script -- a
 * real deploy state a worker can be in -- rather than by poking a client field,
 * so the round measures the gate and not the test's own assumption.
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
  const P = await H.newPlayer(browser, { name: 'Lunge2', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

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
    rec.skip('a real press on the disc starts a lunge', 'no exit tables');
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
    R.stamina = R.maxStamina || 100;
    return { zone: S.currentZone, serverDriven: !!S._serverMonsters,
      weapon: R.weapon ? (R.weapon.name || R.weapon.type) : null,
      monsters: (S.monsters || []).length };
  });
  console.log('    setup: ' + JSON.stringify(setup));
  rec.ok('the bro is in a worker-driven spoke zone holding a forged sword (guard)',
    setup.serverDriven === true && !!setup.weapon, setup);
  if (!setup.serverDriven || !setup.weapon) { await P.ctx.close().catch(() => {}); return; }

  /* Walk to lunge range and then LEAVE THE LOCK ALONE.  Nothing is written to
     S.lockedTarget anywhere in this file -- whatever the game's own targeting
     decides is what the press will find, which is the point. */
  const placed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
      - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const ang = Math.atan2(S.player.y - m.y, S.player.x - m.x);
    S.player.x = m.x + Math.cos(ang) * 200;
    S.player.y = m.y + Math.sin(ang) * 200;
    S._abilCd = null;
    return { id: String(m.id), hp: m.curHp,
      gap: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) };
  });
  if (placed.none) {
    rec.skip('a real press on the disc starts a lunge', 'no live monsters');
    await P.ctx.close().catch(() => {}); return;
  }
  await P.page.waitForTimeout(1200);   /* let the game's own targeting run */

  const lock = await P.page.evaluate(() => {
    const S = window._gameState.current, lt = S.lockedTarget;
    return { has: !!lt, type: lt && lt.type, src: lt && lt.src, id: lt && String(lt.id),
      hasRef: !!(lt && lt.ref),
      status: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null };
  });
  console.log('    lock (the game\'s own, nothing injected): ' + JSON.stringify(lock));
  rec.ok('the game locks the nearest monster on its own, with no tap and no injection',
    lock.has === true && lock.type === 'monster' && lock.hasRef === true, lock);
  rec.ok('...and the lunge reports itself castable there', !!lock.status
    && lock.status.visible && lock.status.equipped && lock.status.afford
    && lock.status.cdLeft === 0, lock.status);

  /* ═══ THE REAL PRESS ═══
     Not window.__touch (dispatchEvent, which skips hit-testing -- TRAPS 67).
     The device touchscreen, at the disc's real screen coordinates. */
  const disc = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log('    disc: ' + JSON.stringify(disc));
  rec.ok('the ATTACK disc is on screen (guard)', !!disc && disc.w > 0, disc);
  if (!disc) { await P.ctx.close().catch(() => {}); return; }

  /* Does anything sit ON TOP of the disc at that point?  A real finger hits
     whatever paints there; dispatchEvent would not have noticed. */
  const onTop = await P.page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { none: true };
    const disc = document.querySelector('.bt-rjoy-base');
    return { cls: el.className && String(el.className).slice(0, 80),
      tag: el.tagName, isDiscOrInside: !!(disc && (el === disc || disc.contains(el))) };
  }, disc);
  console.log('    elementFromPoint at the disc centre: ' + JSON.stringify(onTop));
  rec.ok('...and a finger landing on its centre actually reaches it',
    onTop.isDiscOrInside === true, onTop);

  const before = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { dash: !!S._bashDash, strike: !!S._dashStrike, auto: !!S.autoAttack };
  });

  /* PRESS, then read, then release.  touchscreen.tap() is both halves, and the
     RELEASE is what turns auto-attack back off -- reading after a tap reported
     `auto: false` and made a working press look like a dead one. */
  await P.page.touchscreen.tap(disc.x, disc.y);
  await P.page.waitForTimeout(120);

  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { dash: !!S._bashDash, dashTarget: S._bashDash && String(S._bashDash.targetId),
      strike: !!S._dashStrike, auto: !!S.autoAttack,
      cd: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash').cdLeft : null };
  });
  console.log('    before: ' + JSON.stringify(before));
  console.log('    after a REAL tap on the disc: ' + JSON.stringify(after));
  rec.ok('the press is felt at all (it named a dash target)',
    !!after.dashTarget, after);
  rec.ok('A REAL TAP ON THE DISC STARTS THE LUNGE', after.dash === true, after);
  rec.ok('...and the lunge went on cooldown, so it really cast', (after.cd || 0) > 0, after);

  await P.ctx.close().catch(() => {});

  /* ═══ ROUND 2: THE SAME PRESS AGAINST A WORKER THAT DOES NOT CLAIM caps.abil ═══
     Owner: "The dash to enemy for melee isn't working anymore" -- reported in
     the same breath as combat levels reading 0, which turned out to be a live
     flag overriding a capability.  The lunge hangs off the SAME kind of gate:
     wsClient does setAbilitiesEnabled(!!caps.abil), and with it off both
     castAbility (`if (!isAbilitiesEnabled()) return false`) and abilityUnlocked
     refuse -- so the disc takes the press, the swing goes out, and the lunge
     never happens WITH NOTHING ON SCREEN TO SAY SO.

     Driven the same way the prog3 pin is: the capability is deleted from
     state_sync in an init script, which is a real deploy state (a worker that
     has not claimed it) rather than a client field poked from the test. */
  const P2 = await H.newPlayer(browser, { name: 'NoAbil', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true,
    init: () => {
      const RealWS = window.WebSocket;
      window.WebSocket = function (...a) {
        const ws = new RealWS(...a);
        ws.addEventListener('message', (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m && m.type === 'state_sync' && m.caps) delete m.caps.abil;
            else return;
            Object.defineProperty(e, 'data', { value: JSON.stringify(m) });
          } catch (err) {}
        }, true);
        return ws;
      };
      window.WebSocket.prototype = RealWS.prototype;
      /* THE STATICS TOO, and they are not decoration.  wsClient guards every
         single send with `ws.readyState !== WebSocket.OPEN` -- eight sites --
         so a wrapper that omits WebSocket.OPEN makes that read `undefined`,
         the guard is true forever, and EVERY client->server message is
         dropped in silence.  Incoming still works, so the page looks alive:
         it joins, it draws, caps arrive -- and nothing it tries to do reaches
         the worker.  Cost one round of "why is this bro stuck in town". */
      for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
        window.WebSocket[k] = RealWS[k];
      }
    } });
  await H.enterWorld(P2);
  await P2.page.waitForTimeout(2500);
  await P2.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P2.page.waitForTimeout(1800);
  /* The hop is RETRIED here, unlike round 1: a zone change is a server round
     trip and standing on the exit tile once can land while the client is still
     mid-handshake, which leaves the bro in town with nothing to fight and a
     round that skips itself rather than answering the question. */
  for (let i = 0; i < 6; i++) {
    const z = await H.readState(P2, (S) => S.currentZone);
    if (z === 'worldview') break;
    await stand(P2, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
    await H.waitFor(P2, (S) => S.currentZone, (zz) => zz === 'worldview',
      { timeout: 8000, label: 'World View' }).catch(() => {});
  }
  await P2.page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    const z = await H.readState(P2, (S) => S.currentZone);
    if (z !== 'worldview' && z !== 'town') break;
    await stand(P2, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
    await H.waitFor(P2, (S) => S.currentZone, (zz) => zz !== 'worldview' && zz !== 'town',
      { timeout: 8000, label: 'a monster zone' }).catch(() => {});
  }
  await P2.page.waitForTimeout(2500);
  console.log('    cap-off walk landed in: ' + await H.readState(P2, (S) => S.currentZone));

  const myId2 = await H.readState(P2, (S) => S.myId);
  await H.grant(wsPort, myId2, 'gold', { amount: 500 }).catch(() => {});
  await H.grant(wsPort, myId2, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
  await P2.page.waitForTimeout(1200);
  await P2.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'forge_weapon',
      payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
  });
  await P2.page.waitForTimeout(2200);

  /* GUARD: the capability really is absent, and everything else is intact.
     Without this the round could pass by measuring a broken fixture. */
  const guard2 = await P2.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg || {};
    R.activeSlot = 'melee'; S._shieldUp = false; R.stamina = R.maxStamina || 100;
    const caps = S._serverCaps || {};
    return { abil: caps.abil, capsCount: Object.keys(caps).length,
      weapon: R.weapon ? (R.weapon.name || R.weapon.type) : null,
      serverDriven: !!S._serverMonsters, zone: S.currentZone };
  });
  console.log('    cap-off guard: ' + JSON.stringify(guard2));
  rec.ok('caps.abil is absent while the rest of the handshake landed (guard)',
    !guard2.abil && guard2.capsCount > 10 && !!guard2.weapon && guard2.serverDriven === true, guard2);

  const placed2 = await P2.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
      - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const ang = Math.atan2(S.player.y - m.y, S.player.x - m.x);
    S.player.x = m.x + Math.cos(ang) * 200;
    S.player.y = m.y + Math.sin(ang) * 200;
    S._abilCd = null;
    return { id: String(m.id), gap: 200 };
  });
  if (placed2.none) {
    rec.skip('the lunge dies silently when the worker does not claim caps.abil', 'no live monsters');
    await P2.ctx.close().catch(() => {}); return;
  }
  await P2.page.waitForTimeout(1200);

  const disc2 = await P2.page.evaluate(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  const lock2 = await P2.page.evaluate(() => {
    const S = window._gameState.current, lt = S.lockedTarget;
    return { has: !!lt, status: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null };
  });
  console.log('    cap-off lock + status: ' + JSON.stringify(lock2));
  rec.ok('the lock still forms with the capability off (so nothing ELSE is broken)',
    lock2.has === true, lock2);

  await P2.page.touchscreen.tap(disc2.x, disc2.y);
  await P2.page.waitForTimeout(120);
  const after2 = await P2.page.evaluate(() => {
    const S = window._gameState.current;
    return { dash: !!S._bashDash, strike: !!S._dashStrike,
      swung: !!(S._swingTimer || S.swingTimer || S._attackUntil),
      visible: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash').visible : null };
  });
  console.log('    cap-off, after a REAL tap: ' + JSON.stringify(after2));
  rec.ok('THE LUNGE IS DEAD when the worker does not claim caps.abil -- the owner\'s symptom',
    after2.dash === false, after2);
  rec.ok('...and it is dead SILENTLY: the ability is not even visible, so no button says why',
    after2.visible === false, after2);

  await P2.ctx.close().catch(() => {});
}
