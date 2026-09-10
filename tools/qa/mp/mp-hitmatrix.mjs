/* DOES EVERY WEAPON REGISTER ITS HITS? (v2.3.2435)
 *
 * Owner: "Test the arrow special attack, magic, magic special attack, sword,
 * and sword special attack too in a duel setting for hitbox registry.  Also
 * test hit detection using all weapons against monsters.  Seems very
 * inaccurate."
 *
 * mp-hitsweep measures ONE attack (the plain arrow) in depth, sweeping speed
 * and miss-distance.  This is the other axis: every attack the game has, each
 * fired point-blank-obvious at a STATIONARY target that it cannot reasonably
 * miss, asking the only question that matters for "registry" -- did it land?
 *
 * 100% IS THE CORRECT ANSWER IN EVERY ROW.  The target does not move, does not
 * dodge (dodge is rolled server-side in PvP, so the PvP rows read attempts
 * that reached the server rather than damage), and sits well inside the
 * weapon's reach with the aim pointed straight at it.  Anything under 100% is
 * a registry failure, not a balance question -- which is what makes this
 * assertable rather than merely printable.
 *
 * ═══ TWO DIFFERENT MECHANISMS, MEASURED SEPARATELY ═══
 * Sword and sword-special are an ARC test evaluated instantly around the
 * player (GS_INNER/OUTER_RADIUS, monsterCombat).  Bow, magic and both their
 * specials are PROJECTILES stepped once per frame (projectiles.js).  They fail
 * in completely different ways -- a projectile can tunnel past a target
 * between frames, an arc cannot -- so a single number over all six would hide
 * whichever one is broken.  Every row is reported on its own.
 *
 * ═══ WHAT COUNTS AS A HIT, AND WHY IT DIFFERS BY TARGET ═══
 * MONSTERS: the client's hit test is the whole story.  The worker's PvE gate
 * is a 400px player-to-monster range check (PVE_MELEE_RANGE, combat.js) which
 * nothing here comes near, so a client hit is a hit.  Measured as the target's
 * HP actually falling -- seeded locally so the number is not a round trip.
 * PLAYERS: the client decides too, but by EMITTING player_attack -- the worker
 * only clamps that claim, never re-simulates it.  So the registry question in
 * a duel is "did the attack reach the wire", counted off the harness's own
 * wire instrumentation.  Server-side HP is reported beside it, because an
 * attack that reaches the wire and still removes nothing is a different bug
 * and the two must not be conflated.
 */
import * as H from './harness.mjs';

const TRIES = 8;            /* attempts per PvE row */
/* ═══ FEWER ATTEMPTS IN A DUEL, AND A REASON ═══
   A PvE target can have 500000 HP; a player has 118, and a row that removes
   more than that KILLS -- which ends the duel and voids every row after it.
   Measured per attempt: sword ~13, bow special ~13, bow ~5.  Three attempts is
   under 40 HP for the worst of them, so no single row can kill, and resting to
   FULL between rows (not merely to 60%, which let the bow special start a row
   already at 80 and finish it on a corpse) keeps every row comparable. */
const TRIES_PVP = 3;
const MELEE_RANGE = 40;     /* inside GS_OUTER_RADIUS 72 */
const RANGED_RANGE = 180;   /* well inside bow/staff reach, well outside melee */
/* A deliberately off-axis bearing: a cardinal one passes on the axis-locked
   fire paths v2.3.2260 spent five versions fixing. */
const BEARING = 0.4;

const ATTACKS = [
  { key: 'sword',          type: 'greatsword', slot: 'melee',  special: false, range: MELEE_RANGE },
  { key: 'sword special',  type: 'greatsword', slot: 'melee',  special: true,  range: MELEE_RANGE },
  { key: 'bow',            type: 'bow',        slot: 'ranged', special: false, range: RANGED_RANGE },
  { key: 'bow special',    type: 'bow',        slot: 'ranged', special: true,  range: RANGED_RANGE },
  { key: 'magic',          type: 'staff',      slot: 'staff',  special: false, range: RANGED_RANGE },
  { key: 'magic special',  type: 'staff',      slot: 'staff',  special: true,  range: RANGED_RANGE },
];

/* Equipping moved to H.equipWeapon (harness.mjs), and the long note about why
   already-equipped counts as SUCCESS went with it.  mp-hitreal drives the same
   six weapon rows, and a second copy of a helper whose whole purpose is to
   avoid one specific mislabelling bug is how that bug comes back in the file
   that did not get the fix. */

/* Put a stationary monster at a known bearing and range, and point the player
   at it.  Local (_serverMonsters false) so its HP is the truth rather than a
   round trip -- the CLIENT's hit test is the subject here, and the worker's
   PvE range gate is 400px, which nothing in this file approaches.

   ═══ v2.3.2435: THIS IS A CONTROL, AND IT IS NOT THE GAME ═══
   Owner, asked whether the monster half was tested: "Yes test against real
   server monsters that's the only way the game is going to be played
   everything is server side."  He is right.  Pinned, 500000 HP, spd 0,
   renderX nailed to the logic position, one archetype -- it isolates the hit
   test so that a failure here can ONLY be the hit test, and that is worth
   keeping.  It is also blind to everything the live path adds: interpolation
   lag on a MOVING monster (renderX/renderY is what the hit test reads), the
   worker's own gates, and the other body radii.
   mp-hitreal.mjs owns that question -- every weapon against monsters the
   WORKER owns and moves, in three zones, scored on the server's own HP.  The
   two are meant to be read together: a row that fails there and passes here
   is a server gate or a moving target, not the hit test. */
const seedMonster = (P, range) => P.page.evaluate(({ range, bearing }) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const P0 = S.player;
  const mx = P0.x + Math.cos(bearing) * range, my = P0.y + Math.sin(bearing) * range;
  S._serverMonsters = false;
  const m = F.createMonster('hm-1', 'fodder', 2, mx, my, null);
  m.alive = true; m.curHp = m.maxHp = 500000; m.spd = 0; m.vx = 0; m.vy = 0;
  m.renderX = mx; m.renderY = my; m._atkCd = 1e9;
  S.monsters = [m];
  S.arrows = [];
  return { mx: Math.round(mx), my: Math.round(my), hp: m.curHp };
}, { range, bearing: BEARING });

/* Aim straight at the target and clear every cooldown, so an attempt is a
   fair attempt.  _lastAimAngle as well as _aimAngle because that is the one
   field that means "the direction the player asked for" (v2.3.2261). */
const readyAim = (P, bearing) => P.page.evaluate((ang) => {
  const S = window._gameState.current, R = S.rpg;
  S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = true;
  S._facingAngle = ang; S._targetFacingAngle = ang;
  S.swingTimer = 0; S._lastSwipe = 0; S._shieldUp = false;
  if (R) { R.mana = R.maxMana = 500; R.hp = R.maxHp; }
  return { aim: S._aimAngle };
}, bearing);

/* ═══ ONE ATTACK, WHICHEVER WAY THAT WEAPON ACTUALLY ATTACKS ═══
   swingAttack RETURNS IMMEDIATELY for ranged and staff -- "let the auto-attack
   loop fire the projectile on the shared cadence" (playerActions.js) -- so
   driving every row through it fires nothing at all for four of the six rows.
   The first run of this file did exactly that and reported bow and magic at
   0/8, which reads precisely like the broken hit detection it was written to
   look for.  A harness that cannot fire the weapon is not evidence about the
   weapon, and this comment is here so the next reader does not re-derive it.

   So: specials go through specialAttack (which does cover every slot), melee
   through swingAttack, and ranged/staff hold the fire control just long enough
   for the auto-attack loop to release ONE projectile -- polled rather than
   timed, so the attempt is 1:1 with a shot or is reported as never fired. */
const fire = (P, atk) => P.page.evaluate(({ sp, ranged }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (sp) { try { F.specialAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  if (!ranged) { try { F.swingAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  const n0 = (S.arrows || []).length;
  S.autoAttack = true;
  const t0 = Date.now();
  const iv = setInterval(() => {
    if ((S.arrows || []).length > n0) { clearInterval(iv); S.autoAttack = false; resolve({ ok: true, shot: true }); }
    else if (Date.now() - t0 > 1500) { clearInterval(iv); S.autoAttack = false; resolve({ ok: false, why: "never fired" }); }
  }, 16);
}), { sp: !!atk.special, ranged: atk.slot === "ranged" || atk.slot === "staff" });

const monsterHp = (P) => H.readState(P, (S) => {
  const m = (S.monsters || [])[0];
  return m ? m.curHp : null;
});

/* ═══ THE DUEL MUST BE LIVE FOR *EVERY* ATTEMPT, NOT JUST EVERY ROW ═══
   A duel ends when someone dies, and eight sword swings kill a 118HP target
   mid-row.  Every ranged gate in the client requires S._inDuel -- so once the
   sword row had killed the target, the four ranged rows fired with no duel
   and the client correctly refused to report a single one.  Read off the
   probe as duel=null, gated=0: four rows of zeros that said nothing whatever
   about ranged hit detection.  Re-established before each ATTEMPT, and the
   caller is told whether it took. */
async function ensureDuel(A, B, aId, bId, wsPort, fullHp) {
  const live = () => A.page.evaluate(() => {
    const S = window._gameState.current;
    return !!(S._inDuel && S._inDuel.opponent && S.others && S.others[S._inDuel.opponent]);
  });
  if (await live()) return true;
  /* ═══ WAIT FOR THE TARGET TO BE BACK, THEN HANDSHAKE ═══
     A challenge sent at a corpse mid-respawn is simply dropped, and the
     re-duel silently does not take -- which is how four ranged rows came to
     be fired with no duel and report zeros that said nothing about ranged hit
     detection at all.  mp-duelfeel polls for ALIVE AND WHOLE for the same
     reason; full health rather than merely alive, because a target left on a
     sliver makes the next row look devastating. */
  for (let i = 0; i < 30; i++) {
    const b = await H.serverPlayer(wsPort, bId).catch(() => null);
    if (b && !b.dying && b.hp > 0 && (!fullHp || b.hp >= fullHp)) break;
    await A.page.waitForTimeout(1000);
  }
  await A.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_request', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0 } });
  }, bId);
  await A.page.waitForTimeout(700);
  await B.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_accept', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0 } });
  }, aId);
  await A.page.waitForTimeout(900);
  return live();
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Matrix', nameB: 'Target' });
  /* ═══ KEEP THE TARGET PRESENT ═══
     The target never touches their own controls -- the whole point is that
     they stand still and take it -- and an idle character is logged out after
     two idle minutes (v2.3.1913).  This run is minutes long, and the symptom
     is not an error: the target simply stops existing server-side and every
     row after that measures a weapon against nobody.  The first run of this
     file lost four of its six PvP rows exactly that way (restHp null from row
     three on).  A keystroke is real input, which is all a human standing there
     would be providing. */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await B.page.keyboard.press('Shift').catch(() => {});
      for (let i = 0; i < 10 && !stopAlive; i++) await B.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await A.page.waitForTimeout(1500);

  /* All three weapon styles, the way the game pays them: tut_1 accepted,
     its objective granted, then turned in with an xpCat (required, and a
     turn-in without one is refused whole and silently -- mp-duelfeel's note). */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await A.page.waitForTimeout(1500);
  await H.grant(wsPort, aId, 'item', { invKey: 'snowman', count: 4 }).catch(() => {});
  await A.page.waitForTimeout(900);
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'sword' } });
  });
  await A.page.waitForTimeout(1800);
  const stash = await H.adminPlayer(wsPort, aId)
    .then((r) => ((r.rpg || {}).weaponStash || []).map((w) => w && w.type)).catch(() => []);
  rec.ok('the attacker holds sword, bow and staff before any round (guard)',
    stash.includes('bow') && stash.includes('staff'), { stash });

  /* ── PvE: every attack against a stationary monster ───────────────────── */
  const pve = [];
  for (const atk of ATTACKS) {
    const eq = await H.equipWeapon(A, atk.type, atk.slot === 'staff' ? 'staffWeapon'
      : atk.slot === 'ranged' ? 'rangedWeapon' : 'weapon', atk.slot);
    await A.page.waitForTimeout(1000);
    const seed = await seedMonster(A, atk.range);
    let hits = 0, fired = 0;
    for (let i = 0; i < TRIES; i++) {
      await readyAim(A, BEARING);
      const before = await monsterHp(A);
      const f = await fire(A, atk);
      if (f && f.ok) fired++;
      /* Long enough for a projectile to cross RANGED_RANGE and for a swing to
         resolve its contact-synced damage window (v2.3.2200). */
      await A.page.waitForTimeout(1300);
      const after = await monsterHp(A);
      if (before != null && after != null && after < before) hits++;
    }
    pve.push({ ...atk, eq: !!(eq && eq.ok), fired, hits, seed });
  }

  /* ── PvP: every attack against a duel opponent ────────────────────────── */
  await A.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S._serverMonsters = true; });
  await H.instrumentWire(A);
  /* The real handshake, field for field -- an accept without `from` leaves the
     challenger duelling `undefined`, which silently drops every ranged shot
     (mp-duelfeel learned this the expensive way). */
  await A.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_request', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0 } });
  }, bId);
  await A.page.waitForTimeout(700);
  await B.page.evaluate((t) => {
    const S = window._gameState.current;
    S.channel.send({ type: 'broadcast', event: 'duel_accept', payload: {
      target: t, from: S.myId, fromName: S.myName, wager: 0 } });
  }, aId);
  await A.page.waitForTimeout(1000);
  const duelOn = await H.readState(A, (S) => !!(S._inDuel && S._inDuel.opponent));
  rec.ok('a real duel is running before the PvP rows (guard)', duelOn, { duelOn });

  /* maxHp lives in the PERSISTED blob -- /admin's live view carries hp but no
     maxHp, so a readiness test written against the live record is false
     forever (mp-duelfeel's note). */
  const fullHp = await H.adminPlayer(wsPort, bId)
    .then((r) => ((r.rpg || {}).maxHp) || 0).catch(() => 0);
  rec.ok('the target\'s full health is known (guard)', fullHp > 0, { fullHp });

  /* ═══ ORDER MATTERS: THE LETHAL ROWS GO LAST ═══
     Eight sword swings remove ~100HP and kill a 118HP target, a death ends
     the duel, and a re-duel is far less reliable than simply not needing one
     -- three separate runs lost every ranged row to a duel that had quietly
     ended, reporting zeros that looked exactly like broken ranged hit
     detection.  The four ranged rows together cost the target about 30HP, so
     running them first means all six rows are fought inside the ONE duel this
     suite opens, against a target that is alive throughout. */
  const PVP_ORDER = ATTACKS.filter((a) => a.slot !== 'melee')
    .concat(ATTACKS.filter((a) => a.slot === 'melee'));
  const pvp = [];
  if (duelOn) {
    for (const atk of PVP_ORDER) {
      await H.equipWeapon(A, atk.type, atk.slot === 'staff' ? 'staffWeapon'
        : atk.slot === 'ranged' ? 'rangedWeapon' : 'weapon', atk.slot);
      await A.page.waitForTimeout(1000);
      /* Stand at this row's range from the opponent.  hopTo walks for real --
         movement.js rejects a teleport and then rejects everything after it. */
      const spot = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
      await H.hopTo(A, Math.round(spot.x - Math.cos(BEARING) * atk.range),
        Math.round(spot.y - Math.sin(BEARING) * atk.range)).catch(() => {});
      await A.page.waitForTimeout(600);
      /* ═══ WHY A RANGED ROW SENT NOTHING, ANSWERED RATHER THAN GUESSED ═══
         projectiles.js publishes __btPvpProj for exactly this: gated counts
         frames the outer duel/lock gate passed, noTarget counts those where
         the opponent could not be found in S.others, tested/hits/closest
         report the impact test itself.  Together they separate "the duel
         lapsed", "the peer is invisible" and "the arrow genuinely missed by N
         pixels" -- three very different answers that all look like a zero. */
      await A.page.evaluate(() => {
        window.__btPvpProj = { gated: 0, noTarget: 0, tested: 0, hits: 0, closest: 1e9 };
      });
      const pre = await A.page.evaluate((tid) => {
        const S = window._gameState.current;
        const o = S.others && S.others[tid];
        return {
          duel: S._inDuel ? (S._inDuel.opponent || null) : null,
          sees: !!o,
          gap: o ? Math.round(Math.hypot((o.x != null ? o.x : o.renderX) - S.player.x,
            (o.y != null ? o.y : o.renderY) - S.player.y)) : null,
        };
      }, bId);
      const w0 = await H.wireCounts(A);
      /* ═══ SUM THE DROPS, NOT THE NET ═══
         The target regenerates out of combat, so an endpoint-to-endpoint HP
         delta over a whole row measures damage MINUS regen -- the first run
         reported the bow special at -8, i.e. the target finished healthier
         than it started, which says nothing about whether the special landed.
         Sampled either side of each individual attack and only DECREASES are
         counted, so regen between attacks cannot cancel a real hit. */
      let fired = 0, dropped = 0;
      let skipped = 0;
      for (let i = 0; i < TRIES_PVP; i++) {
        if (!await ensureDuel(A, B, aId, bId, wsPort, fullHp)) { skipped++; continue; }
        /* A death respawns the target in town, so the range this row was set
           up at is gone with it.  Re-walk only when it has actually drifted. */
        const spotNow = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
        const gapNow = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }))
          .then((p) => Math.hypot(spotNow.x - p.x, spotNow.y - p.y));
        if (Math.abs(gapNow - atk.range) > 45) {
          await H.hopTo(A, Math.round(spotNow.x - Math.cos(BEARING) * atk.range),
            Math.round(spotNow.y - Math.sin(BEARING) * atk.range)).catch(() => {});
          await A.page.waitForTimeout(400);
        }
        const aim = await A.page.evaluate((tid) => {
          const S = window._gameState.current, R = S.rpg;
          const o = S.others && S.others[tid];
          if (!o) return null;
          const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
          const ang = Math.atan2(oy - 24 - S.player.y, ox - S.player.x);
          S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = true;
          S._facingAngle = ang; S._targetFacingAngle = ang;
          S.swingTimer = 0; S._lastSwipe = 0; S._shieldUp = false;
          if (R) { R.mana = R.maxMana = 500; }
          return { ang: +ang.toFixed(3), gap: Math.round(Math.hypot(ox - S.player.x, oy - S.player.y)) };
        }, bId);
        if (!aim) break;
        const before = await H.serverPlayer(wsPort, bId).then((p) => (p || {}).hp).catch(() => null);
        const f = await fire(A, atk);
        if (f && f.ok) fired++;
        await A.page.waitForTimeout(1300);
        const after = await H.serverPlayer(wsPort, bId).then((p) => (p || {}).hp).catch(() => null);
        if (before != null && after != null && after < before) dropped += before - after;
      }
      const w1 = await H.wireCounts(A);
      const probe = await A.page.evaluate(() => window.__btPvpProj || null);
      const slotNow = await H.readState(A, (S) => (S.rpg || {}).activeSlot);
      pvp.push({ ...atk, fired, skipped, slotNow, pre, probe,
        sent: (w1.player_attack || 0) - (w0.player_attack || 0),
        hpDrop: +dropped.toFixed(1) });
      /* ═══ A LATER ROW MUST NOT BE MEASURED AGAINST A CORPSE ═══
         Six rows of eight attacks will kill a defender, and a dead one reads
         EXACTLY like a weapon that misses -- the same confusion mp-duelfeel
         records chasing three times.  There is no admin heal, so this waits
         out the game own out-of-combat regen and re-opens the duel if the
         death closed it (a duel ends on a kill).  Reported per row, so a
         reader can see whether the row was fought against a healthy target. */
      const rest = await (async () => {
        for (let w = 0; w < 25; w++) {
          const p = await H.serverPlayer(wsPort, bId).catch(() => null);
          if (p && p.hp != null && fullHp && p.hp >= fullHp) return { hp: p.hp, waited: w };
          await A.page.waitForTimeout(1000);
        }
        const p = await H.serverPlayer(wsPort, bId).catch(() => null);
        return { hp: p ? p.hp : null, waited: 12 };
      })();
      pvp[pvp.length - 1].restHp = rest.hp;
      const still = await H.readState(A, (S) => !!(S._inDuel && S._inDuel.opponent));
      if (!still) {
        await A.page.evaluate((t) => {
          const S = window._gameState.current;
          S.channel.send({ type: 'broadcast', event: 'duel_request', payload: {
            target: t, from: S.myId, fromName: S.myName, wager: 0 } });
        }, bId);
        await A.page.waitForTimeout(700);
        await B.page.evaluate((t) => {
          const S = window._gameState.current;
          S.channel.send({ type: 'broadcast', event: 'duel_accept', payload: {
            target: t, from: S.myId, fromName: S.myName, wager: 0 } });
        }, aId);
        await A.page.waitForTimeout(900);
      }
    }
  }
  await A.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });

  console.log('\n    ── PvE: attacks aimed at a stationary monster in reach ──');
  console.log('    attack            equipped  fired  landed   rate');
  for (const r of pve) {
    console.log(`    ${r.key.padEnd(16)} ${String(r.eq).padEnd(9)} ${String(r.fired).padStart(5)} `
      + `${String(r.hits).padStart(7)}  ${String(Math.round((r.hits / Math.max(1, r.fired)) * 100) + '%').padStart(5)}`);
  }
  console.log('\n    ── PvP (duel): attacks aimed at a stationary opponent in reach ──');
  console.log('    attack            fired  reached wire   opponent HP lost');
  for (const r of pvp) {
    console.log(`    ${r.key.padEnd(16)} ${String(r.fired).padStart(5)} ${String(r.sent).padStart(13)} `
      + `${String(r.hpDrop == null ? '?' : r.hpDrop).padStart(18)}   (target rested to ${r.restHp == null ? '?' : r.restHp})`);
    if (r.pre) console.log(`      duel=${r.pre.duel} sees=${r.pre.sees} gap=${r.pre.gap}`
      + (r.probe ? `  probe gated=${r.probe.gated} noTarget=${r.probe.noTarget} tested=${r.probe.tested} hits=${r.probe.hits} closest=${r.probe.closest === 1e9 ? '-' : r.probe.closest}` : ''));
  }
  console.log('');

  /* ── ASSERTIONS ──
     Only the unarguable one, per row: a stationary target, in reach, aimed
     at, cannot be missed eight times out of eight by a working hit test. */
  for (const r of pve) {
    rec.ok(`PvE ${r.key}: lands on a stationary monster in reach (${r.hits}/${r.fired})`,
      r.fired > 0 && r.hits === r.fired, r);
  }
  for (const r of pvp) {
    /* A row that measured the wrong weapon is worse than a failing row: it is
       a confident wrong answer.  Pin the slot the row actually ended holding. */
    rec.ok(`PvP ${r.key}: fought with the ${r.slot} slot, not a leftover (guard)`,
      r.slotNow === r.slot, r);
    rec.ok(`PvP ${r.key}: a duel was live for every attempt (guard)`, r.skipped === 0, r);
    rec.ok(`PvP ${r.key}: every attempt reaches the wire (${r.sent}/${r.fired})`,
      r.fired > 0 && r.sent >= r.fired, r);
    /* ═══ HP-LOST IS PRINTED, NOT ASSERTED, AND THAT IS DELIBERATE ═══
       This file measures REGISTRY -- did the attack land and get reported --
       which is what was asked about and what the numbers above pin down.  How
       much health the server then removes is a different question with its own
       moving parts (regen between samples, block state, the server dodge roll
       that PvP hits go through), and measured here it was not stable: the same
       sword row read 102 in one run and 0 in another with nothing about the
       sword changed.  An assertion that flaps is worse than none, and DPS
       already has a suite that measures it properly over long bursts
       (mp-duelfeel, burst-and-measure against the server's own numbers).  So
       the column stays visible as a sanity read and claims nothing. */
  }

  stopAlive = true;
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
