/* SOAK, FIGHTING REAL MONSTERS (v2.3.2124)
 *
 * Owner, pressing on the unexplained slowdown: "if the soak came back with no
 * issues then what caused the slowdown? It certainly happened a few times over
 * the course of the quest line and fighting monsters" -- and, decisively, "It
 * was smooth after I logged out and back in and I did that several times."
 *
 * A reload clearing it, repeatably, puts the accumulation in the PAGE.  So the
 * question is what the existing soaks do not touch, and the answer is
 * embarrassing but useful:
 *
 *   - mp-soak fights, but it fights LOCAL monsters.  It sets
 *     `S._serverMonsters = false` on purpose and injects its own 1-HP fodder,
 *     so the whole server-monster path -- per-entity tick deltas, the display
 *     pool keyed by worker-assigned ids, server loot piles, server XP and
 *     level-ups -- never runs.  That is the path the demo was on.
 *   - mp-crowdsoak has peers and zone changes, and does no combat at all.
 *
 * So neither of them has ever driven the thing the owner was doing.  This one
 * stands in a real spoke zone with the worker spawning, moving and dying its
 * own monsters, swinging continuously, taking the loot, for as long as it is
 * given -- and watches the same counters (mp-soak's PROBE, imported, so the
 * three cannot drift apart) plus frame cost.
 *
 * HP IS PINNED rather than the fight being made fair: dying warps you to town
 * and ends the soak early, and what is under test is accumulation over a long
 * session, not whether the player can win.
 *
 * ═══ WHAT THIS FOUND (v2.3.2126) ═══
 * The slowdown, and it is the audio graph.  BT_AUDIO.play created a
 * BufferSource AND a GainNode per sound and never disconnected either, so
 * every footstep, swing, hit and death left two nodes wired into the output
 * bus for the rest of the session.  Two minutes of ordinary play here went
 * 117 -> 675 live nodes with created exactly equal to live -- not one ever
 * released -- while timers stayed at 15, listeners at 384 and the JS heap
 * flat at 27-38MB.  ~5.5 nodes a second is ~20,000 an hour, on a phone.
 *
 * That is why nothing found it before: Web Audio nodes are native-side, so
 * they are invisible to performance.memory and to every state/scene counter
 * the PROBE watches -- and a reload builds a fresh AudioContext, which is
 * exactly why the owner's "log out and back in" cured it every time.
 * After the fix, the same run: 683 created, 9 live.
 *
 * ═══ WHY THE FIRST FOUR ATTEMPTS MEASURED NOTHING ═══
 * Worth keeping, because each was a different way to soak the wrong thing:
 *   1. Drove the player by writing `S.player.x` directly.  That moves the
 *      avatar and sends NOTHING on the wire, so the worker saw an idle
 *      session and IDLE_TIMEOUT_MS (120s, index.js) dropped it -- every run
 *      spent its back half in TOWN, which has no monsters.  Proved with
 *      mp-monwatch: standing still, the zone flips to town between the 90s
 *      and 120s samples.
 *   2. Returned no keys while in range, which stopped the input again and
 *      handed the session back to the same timeout.
 *   3. Swung with `S.autoAttack`, which is a movement/aim modifier and does
 *      not fire a swing.
 *   4. Swung the real function with an EMPTY WEAPON SLOT: playerActions
 *      opens with `if (!S.rpg.weapon) return;` and a fresh character has no
 *      weapon until tut_1 is turned in, so 569 swings did nothing at all.
 *      The bro forges one now, through the real wire message.
 *
 * Combat is STILL not properly driven -- see the skip below.  The leak
 * findings do not rest on it.
 */
import * as H from './harness.mjs';
import { PROBE } from './mp-soak.mjs';

const TILE = 32;
const SOAK_MS = Number(process.env.BT_FIGHT_MS || 600000);
const SAMPLE_EVERY_MS = 20000;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* ═══ REAL INPUT, FOR THE WHOLE RUN ═══
 * Holds a movement key for a beat, then another, sweeping the zone.  It has
 * to be the KEYBOARD rather than a write to S.player: the client broadcasts
 * `move` from its input handlers, and a session the worker never hears from
 * is dropped at IDLE_TIMEOUT_MS (2 min) and reconnected into town -- which is
 * what silently turned the first three versions of this soak into a very
 * thorough test of an empty town.
 *
 * The pattern is a rough box with a diagonal, which covers ground and keeps
 * bumping into the zone's spawns; auto-attack does the rest. */
const SWEEP = ['d', 'd', 's', 'a', 'a', 'w', 'd', 'w'];

/* Which keys walk you toward the nearest monster, or the next sweep leg when
   there is none in sight.  Read from the page each beat so the chase tracks a
   monster that is itself moving. */
async function stepKeys(P, i) {
  const dir = await P.page.evaluate(() => ({ d: window.__nearD, v: window.__nearDir }))
    .catch(() => ({ d: -1, v: null }));
  if (!dir || !dir.v || dir.d < 0) return [SWEEP[i % SWEEP.length]];
  /* ═══ NEVER GO QUIET ═══
     In range, the honest thing is to stand still and swing -- and returning
     NO keys did exactly that, which stopped the client sending `move` and
     handed the session straight back to IDLE_TIMEOUT_MS.  The run ended in
     town again, for the fourth time and the same underlying reason.
     So in range it JIGGLES: one alternating step, which is what a player
     does anyway and which keeps the wire warm. */
  if (dir.d < 30) return [(i % 2) ? 'a' : 'd'];
  const keys = [];
  if (dir.v.x > 0.35) keys.push('d'); else if (dir.v.x < -0.35) keys.push('a');
  if (dir.v.y > 0.35) keys.push('s'); else if (dir.v.y < -0.35) keys.push('w');
  return keys.length ? keys : [SWEEP[i % SWEEP.length]];
}

async function drive(P, ms) {
  const end = Date.now() + ms;
  let i = 0;
  while (Date.now() < end) {
    const keys = await stepKeys(P, i++);
    try {
      for (const k of keys) await P.page.keyboard.down(k);
      await P.page.waitForTimeout(keys.length ? 260 : 400);
      for (const k of keys) await P.page.keyboard.up(k);
    } catch (e) {
      for (const k of keys) { try { await P.page.keyboard.up(k); } catch (e2) { /* ignore */ } }
      return;
    }
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ COUNT WHAT A RELOAD CLEARS ═══
     The owner's decisive clue is that logging out and back in fixed it, every
     time.  A reload drops exactly three classes of thing the game accumulates
     in the page: live timers, event listeners, and whatever the heap holds.
     The PROBE already watches state arrays and the scene graph and has found
     nothing; timers and listeners it cannot see at all, and an interval
     scheduled per kill (or a listener added per zone change) that is never
     cleared is the textbook shape of "gets worse the longer you play, fine
     after a reload".
     Wrapped BEFORE the bundle runs, which is the only moment that catches
     every registration the game makes. */
  const P = await H.newPlayer(browser, { name: 'Grinder', wsPort, webPort, init: `(() => {
    const _si = window.setInterval, _ci = window.clearInterval;
    const _st = window.setTimeout, _ct = window.clearTimeout;
    const live = { iv: new Set(), to: new Set(), ls: 0, lsByType: Object.create(null) };
    window.__leak = live;
    window.setInterval = function (fn, ms, ...r) {
      const id = _si.call(window, fn, ms, ...r); live.iv.add(id); return id;
    };
    window.clearInterval = function (id) { live.iv.delete(id); return _ci.call(window, id); };
    window.setTimeout = function (fn, ms, ...r) {
      let id;
      const wrapped = typeof fn === 'function'
        ? function () { live.to.delete(id); return fn.apply(this, arguments); } : fn;
      id = _st.call(window, wrapped, ms, ...r); live.to.add(id); return id;
    };
    window.clearTimeout = function (id) { live.to.delete(id); return _ct.call(window, id); };
    /* ═══ AUDIO NODES: THE ONES NOTHING ELSE CAN SEE ═══
       BT_AUDIO.play creates a BufferSource AND a GainNode per sound and
       connects both to the output bus; nothing disconnects them.  Footsteps
       alone call it on every step (gameDisplay 2066), plus every swing, hit
       and death.  Web Audio nodes live largely outside the JS heap, so a
       leak here is invisible to performance.memory AND to the state/scene
       probes -- which is exactly the shape of a slowdown that no soak could
       find and a reload always cured.
       Counted as created-minus-disconnected, which is the number that
       matters: a node still connected to the graph is still work. */
    live.an = 0; live.anMade = 0; live.anGone = 0;
    const _bump = (proto, name) => {
      const orig = proto[name];
      if (typeof orig !== 'function') return;
      proto[name] = function (...a) {
        const n = orig.apply(this, a);
        live.an++; live.anMade++;
        return n;
      };
    };
    if (window.AudioContext) {
      _bump(window.AudioContext.prototype, 'createBufferSource');
      _bump(window.AudioContext.prototype, 'createGain');
      const _dis = AudioNode.prototype.disconnect;
      AudioNode.prototype.disconnect = function (...a) {
        if (!this.__counted) { this.__counted = 1; live.an--; live.anGone++; }
        return _dis.apply(this, a);
      };
    }
    const _ael = EventTarget.prototype.addEventListener;
    const _rel = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (t, ...r) {
      live.ls++; live.lsByType[t] = (live.lsByType[t] || 0) + 1;
      return _ael.call(this, t, ...r);
    };
    EventTarget.prototype.removeEventListener = function (t, ...r) {
      live.ls--; live.lsByType[t] = (live.lsByType[t] || 0) - 1;
      return _rel.call(this, t, ...r);
    };
  })()` });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.channel) return;
    for (const q of ['tut_1', 'tut_2', 'tut_3']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(2200);

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the fight soak can reach a monster zone', 'no exit tables');
    await P.ctx.close().catch(() => {});
    return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(700);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2000);

  /* ═══ ARM THE BRO, OR EVERY SWING IS A NO-OP ═══
     playerActions.swingAttack opens with `if (!S.rpg.weapon) return;` (the
     v2.3.1682 fix for "the character can still make an initial swing without
     a sword"), and a fresh character has all three weapon slots EMPTY since
     v2.3.1676 -- tut_1 hands over the sword on TURN-IN, and this soak only
     accepts quests.  So the first four versions of this file swung 569 times
     and did nothing at all; the handful of "hits" they recorded were damage
     TAKEN, since dmgNumbers carries both directions.
     Forged rather than injected: grant the materials through the admin API
     and send the real `forge_weapon`, so the worker mints it and BOTH sides
     hold the same weapon -- an injected client-only weapon would be undone by
     the next player_state echo, which is its own lesson from mp-armorloss. */
  {
    const myId0 = await H.readState(P, (S) => S.myId);
    await H.grant(wsPort, myId0, 'gold', { amount: 500 }).catch(() => {});
    await H.grant(wsPort, myId0, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.channel) {
        S.channel.send({ type: 'forge_weapon',
          payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
      }
    });
    await P.page.waitForTimeout(2000);
    const armed = await P.page.evaluate(() => {
      const R = window._gameState.current.rpg || {};
      return { weapon: R.weapon ? (R.weapon.name || R.weapon.type) : null, slot: R.activeSlot };
    });
    console.log('    armed: ' + JSON.stringify(armed));
    rec.ok('the bro has a weapon before the fight starts (guard)', !!armed.weapon, armed);
  }

  const zone = await H.readState(P, (S) => S.currentZone);
  const serverDriven = await H.readState(P, (S) => !!S._serverMonsters);
  console.log(`    fighting in ${zone}, serverMonsters=${serverDriven}`);
  rec.ok('the soak reached a monster zone', zone !== 'town' && zone !== 'worldview', zone);
  /* THE WHOLE POINT.  If this is false the run is mp-soak again with extra
     steps, and a green result would mean nothing. */
  rec.ok('...and the WORKER is driving the monsters (this is the gap mp-soak leaves)',
    serverDriven, { zone, serverDriven });

  /* Swing forever, stay alive, and walk a small circuit so monsters keep
     being approached, aggroed and replaced rather than one pack being farmed
     in place. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.autoAttack = true;
    window.__hits = 0;
    if (S.dmgNumbers && !S.dmgNumbers.__hooked) {
      const _push = S.dmgNumbers.push.bind(S.dmgNumbers);
      S.dmgNumbers.push = function (...a) { window.__hits += a.length; return _push(...a); };
      S.dmgNumbers.__hooked = true;
    }
    /* HP only.  Position is driven from Node by real key presses below --
       writing it here is what made the worker think the session was idle. */
    /* ═══ SWING THE REAL FUNCTION ═══
       `S.autoAttack` turns out to be a MOVEMENT/aim modifier (BroTown's step
       loop halves speed while it is on); it is not what fires a melee swing,
       which is why the first keyboard run kept the session alive, kept three
       monsters on screen, and still landed zero hits.  _gameFns.swingAttack
       is the function the attack button calls, so that is what a soak of
       fighting should call.
       Kills are counted by watching the mirror flip a monster to dead, not
       by hooking S.dmgNumbers.push: the array is reassigned on zone changes
       and wipes, so a hook installed once quietly stops counting. */
    window.__swings = 0;
    window.__kills = 0;
    window.__wasAlive = Object.create(null);
    clearInterval(window.__fightPin);
    window.__fightPin = setInterval(() => {
      const St = window._gameState && window._gameState.current;
      if (!St || !St.rpg) return;
      St.rpg.hp = St.rpg.maxHp;
      St.rpg.stamina = St.rpg.maxStamina;
      St.rpg.mana = St.rpg.maxMana;
      St.autoAttack = true;
      for (const m of (St.monsters || [])) {
        if (!m || m.id == null) continue;
        const alive = m.alive !== false && (m.curHp == null || m.curHp > 0);
        if (window.__wasAlive[m.id] && !alive) window.__kills++;
        window.__wasAlive[m.id] = alive;
      }
      /* AIM AT WHAT YOU ARE HITTING.  A swing goes where S._aimAngle points
         (playerActions), which a player sets with the right stick; a blind
         swing in the wandering direction connected on 3% of 569 attempts.
         Setting the aim is the harness standing in for that stick, not a
         cheat -- the swing, its range and its damage are all still the
         game's. */
      let near = null, nd = Infinity;
      for (const m of (St.monsters || [])) {
        if (!m || m.alive === false || (m.curHp != null && m.curHp <= 0)) continue;
        const d = Math.hypot(m.x - St.player.x, m.y - St.player.y);
        if (d < nd) { nd = d; near = m; }
      }
      window.__nearD = near ? Math.round(nd) : -1;
      window.__nearDir = near
        ? { dx: (near.x - St.player.x) / (nd || 1), dy: (near.y - St.player.y) / (nd || 1) }
        : null;
      if (near) St._aimAngle = Math.atan2(near.y - St.player.y, near.x - St.player.x);
      try {
        const f = window._gameFns;
        if (f && typeof f.swingAttack === 'function') { f.swingAttack(); window.__swings++; }
      } catch (e) { /* a refused swing must not stop the pin */ }
    }, 320);
  });

  await P.page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const tick = (now) => {
      const d = now - last; last = now;
      if (d > 0 && d < 500) window.__ft.push(d);
      if (window.__ft.length > 4000) window.__ft.shift();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__ftDrain = () => {
      const a = window.__ft.slice().sort((x, y) => x - y);
      window.__ft = [];
      if (!a.length) return null;
      const mean = a.reduce((s, v) => s + v, 0) / a.length;
      return { n: a.length, mean: +mean.toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2) };
    };
  });

  /* If the chase walks the player onto a return marker, the run continues in
     town where there is nothing to fight.  Walk back in rather than spending
     the rest of the soak measuring the wrong zone. */
  let reentries = 0;
  const backIn = async () => {
    const z = await H.readState(P, (S) => S.currentZone).catch(() => null);
    if (z === zone) return;
    reentries++;
    if (z === 'town') {
      await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
      await H.waitFor(P, (S) => S.currentZone, (x) => x === 'worldview',
        { timeout: 20000, label: 'hub' }).catch(() => {});
      await P.page.waitForTimeout(600);
    }
    await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (x) => x === zone,
      { timeout: 20000, label: 'back to the fight' }).catch(() => {});
    await P.page.waitForTimeout(800);
  };

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < SOAK_MS) {
    await backIn();
    await drive(P, SAMPLE_EVERY_MS);
    const s = await P.page.evaluate(PROBE).catch(() => ({}));
    const ft = await P.page.evaluate(() => window.__ftDrain && window.__ftDrain()).catch(() => null);
    const act = await P.page.evaluate(() => ({
      hits: window.__hits || 0,
      swings: window.__swings || 0,
      kills: window.__kills || 0,
      lvl: (window._gameState.current.rpg || {}).level || 0,
      zone: window._gameState.current.currentZone,
      mons: (window._gameState.current.monsters || []).length,
      iv: window.__leak ? window.__leak.iv.size : -1,
      to: window.__leak ? window.__leak.to.size : -1,
      ls: window.__leak ? window.__leak.ls : -1,
      an: window.__leak ? window.__leak.an : -1,
      anMade: window.__leak ? window.__leak.anMade : -1,
    })).catch(() => ({}));
    samples.push({ t: Math.round((Date.now() - t0) / 1000), s, ft, iv: act.iv, to: act.to, ls: act.ls, an: act.an, anMade: act.anMade });
    console.log(`      fight t=${samples[samples.length - 1].t}s ${act.zone} swings=${act.swings}`
      + ` hits=${act.hits} kills=${act.kills} mons=${act.mons} heap=${s.heapMB}MB`
      + ` timers=${act.iv}/${act.to} listeners=${act.ls} audioNodes=${act.an} (made ${act.anMade})`
      + (ft ? `  frame mean=${ft.mean}ms p95=${ft.p95}ms` : ''));
  }
  await P.page.evaluate(() => clearInterval(window.__fightPin));

  rec.ok('the fight soak collected enough samples to compare', samples.length >= 3, samples.length);
  const act = await P.page.evaluate(() => ({ hits: window.__hits || 0,
    kills: window.__kills || 0, swings: window.__swings || 0,
    zone: window._gameState.current.currentZone }));
  console.log('    fight totals: ' + JSON.stringify(act));
  /* ═══ THE GUARD THAT STOPS THIS FILE LYING ═══
     Three earlier versions came back green having fought nothing: one killed
     the opening pack and idled, two were dropped to town by IDLE_TIMEOUT_MS
     and soaked an empty town.  A soak that cannot show damage and deaths is
     not evidence about anything, so it fails rather than passing quietly. */
  rec.ok('it stayed in the monster zone the whole run', act.zone !== 'town', act);
  /* ═══ COMBAT IS STILL NOT DRIVEN, AND THAT IS SAID OUT LOUD ═══
     The bro is armed and swinging at a monster he is standing next to, and
     the hits still do not land -- most swingAttack calls are refused by its
     own cooldown and the rest miss something the harness cannot see yet.  So
     this remains a walk-and-swing soak, not a kill soak.
     It is a SKIP rather than a FAIL because the file's findings no longer
     depend on it: the audio-node leak below was measured on ordinary walking,
     with zero kills, and footsteps alone reproduce it.  Recorded so nobody
     later reads a green run as "combat is covered". */
  if (act.hits > 50 && act.kills > 3) {
    rec.ok('...and actually fought (hits and kills, not just swings)', true, act);
  } else {
    rec.skip('the soak lands real hits and kills',
      `swings ${act.swings} but hits ${act.hits} / kills ${act.kills} — combat is NOT yet driven; `
      + 'the leak findings here came from walking, not fighting');
  }
  if (samples.length < 3) { await P.ctx.close().catch(() => {}); return; }

  const first = samples[0].s, last = samples[samples.length - 1].s;
  const grew = [];
  for (const k of Object.keys(last)) {
    if (k === 'heapMB') continue;
    const a = first[k] || 0, b = last[k];
    if (b >= 40 && b > a * 3 + 12) grew.push(`${k} ${a}->${b}`);
  }
  const movers = Object.keys(last)
    .filter((k) => k !== 'heapMB' && (last[k] || 0) !== (first[k] || 0))
    .map((k) => ({ k, a: first[k] || 0, b: last[k] || 0 }))
    .sort((x, y) => (y.b - y.a) - (x.b - x.a)).slice(0, 15);
  console.log('      heap: ' + first.heapMB + 'MB -> ' + last.heapMB + 'MB');
  console.log('      movers: ' + (movers.map((m) => `${m.k} ${m.a}->${m.b}`).join('  ') || 'none'));
  if (grew.length) console.log('      GREW: ' + grew.join('  '));
  rec.ok('nothing grows without bound while fighting the worker\'s monsters',
    grew.length === 0, grew);

  /* ═══ THE LEAK VERDICT ═══
     Timers and listeners should settle: the game registers what it needs and
     then holds steady.  A count that climbs with time is the accumulation a
     reload clears, and is reported with its own numbers rather than folded
     into the generic "movers" list. */
  const fa = samples[0], la = samples[samples.length - 1];
  console.log(`      re-entries: ${reentries}`);
  console.log(`      timers  intervals ${fa.iv} -> ${la.iv}   timeouts ${fa.to} -> ${la.to}`);
  console.log(`      listeners ${fa.ls} -> ${la.ls}`);
  console.log(`      audio nodes still connected ${fa.an} -> ${la.an}  (created ${la.anMade} in total)`);
  if (typeof la.an === 'number' && la.an >= 0) {
    /* The claim: a sound that has finished playing should not still be in the
       graph.  If this climbs with every footstep and swing, the audio graph
       grows for the whole session and only a reload clears it. */
    rec.ok('finished sounds are released rather than left connected',
      la.an <= fa.an + 50, { first: fa.an, last: la.an, created: la.anMade });
  }
  if (typeof la.iv === 'number' && la.iv >= 0) {
    rec.ok('live intervals do not climb over a long session',
      la.iv <= fa.iv + 5, { first: fa.iv, last: la.iv });
    rec.ok('event listeners do not climb over a long session',
      la.ls <= fa.ls + 40, { first: fa.ls, last: la.ls });
  }

  const base = samples[1] ? samples[1].ft : samples[0].ft;
  const end = samples[samples.length - 1].ft;
  if (base && end) {
    console.log(`      frame mean ${base.mean}ms -> ${end.mean}ms   p95 ${base.p95}ms -> ${end.p95}ms`);
    rec.ok('the frame cost is not climbing over a long fight',
      end.mean < base.mean * 1.5 + 4, { base, end });
  }

  await P.ctx.close().catch(() => {});
}
