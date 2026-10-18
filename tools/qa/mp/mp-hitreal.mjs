/* DOES EVERY WEAPON REGISTER ON THE MONSTERS THE WORKER OWNS? (v2.3.2435)
 *
 * Owner, on the coverage mp-hitmatrix's PvE half actually had: "Yes test
 * against real server monsters that's the only way the game is going to be
 * played everything is server side."
 *
 * He is right, and the gap was real.  mp-hitmatrix seeds its own monster with
 * `S._serverMonsters = false`, 500000 HP, `spd: 0` and `renderX` pinned to the
 * logic position.  That is a good CONTROL — it isolates the client's hit test
 * from everything else, and a failure there can only be the hit test — but it
 * is not the game.  Four things it cannot see, all of them live in production:
 *
 *   1. THE MONSTER MOVES, and the client hit-tests `renderX/renderY` — the
 *      DRAWN position, which for a worker-driven monster trails the logic
 *      position by a few frames of interpolation (v2.3.1111 exists precisely
 *      because a shot at a walking monster used to miss in the travel
 *      direction).  A pinned fixture never exercises that path at all.
 *   2. THE HIT HAS TO REACH THE WORKER AND COME BACK.  In a server zone the
 *      client does NOT decrement `curHp` — every `m.curHp -= dmg` sits behind
 *      `if (!S._serverMonsters)`.  The number only moves when the worker says
 *      so, through `monster_hit`'s hpPct or the tick's `hp` field.  So the
 *      worker's own gates (zone, the 400px melee proximity bound, the
 *      210ms/1200ms hit-cadence floor, the invulnerable phases) are all in the
 *      path here and none of them are in mp-hitmatrix's.
 *   3. MORE THAN ONE BODY SIZE.  The hit radius is per-archetype — 26/27/32/40
 *      and 50 for the five sprite-backed shapes — and the procedural roster
 *      derives one from the drawn figure, the case v2.3.1536 had to fix after
 *      the owner reported "the special arrow correctly hits the slime but not
 *      the procedural ones".  One 'fodder' fixture proves nothing about the
 *      rest, so this walks four zones (see ROSTER).
 *   4. THE MONSTER FIGHTS BACK, and a dead attacker measures nothing.
 *
 * ═══ WHAT A HIT IS HERE, AND WHY IT IS STRONGER THAN THE FIXTURE'S ═══
 * The target's HP falling, read off the client's copy — which in a server zone
 * is not the client's opinion at all: wsClient writes `localM.curHp = md.hp`
 * straight from the tick, and the `monster_hit` handler writes it from the
 * server's authoritative hpPct.  A drop therefore means the whole chain agreed:
 * the client's hit test fired, `monster_damage` reached the worker, the
 * worker's gates passed it, and it settled.  A KILL counts too and is the same
 * evidence taken to its end — nothing else in an empty room can kill it.
 *
 * Beside it, what the CLIENT said on the wire for that monster: its
 * `monster_damage` sends, plus the bow special's `arrow_blast` finale, which
 * carries a coordinate rather than a monster id and is the one damage message
 * that cannot be attributed (arrowblast.js).  The pair is the diagnostic split
 * that matters and neither half gives it alone:
 *     sent 0                -> the CLIENT's hit test missed.
 *     sent >0, no HP drop   -> the client hit and the WORKER refused it.
 *     sent >0, HP dropped   -> registered, end to end.
 *
 * ═══ A REFUSAL THE GAME IS SUPPOSED TO MAKE IS NOT A MISS ═══
 * The snowman burrows mid-fight, on the WORKER's own initiative, and while he
 * is a snow pile the worker denies every hit and the client's own test treats
 * him as intangible.  That is the mechanic, so an attempt he dug under is
 * VOID and re-run rather than scored — counted and printed, never silently
 * dropped.  Rows run until they have TRIES fair attempts.
 *
 * ═══ THE CONTROL, BECAUSE "HP FELL" IS NOT BY ITSELF ATTRIBUTABLE ═══
 * A monster in a live zone can lose health for reasons that are not this
 * attempt: a lingering status, a stuck bow-special chipping from the row
 * before, a hazard.  So each zone opens with an IDLE window of the same shape
 * as an attempt — same target, same duration, no attack — and asserts the
 * number does not move on its own.  Without that, every row below is just
 * "something happened".
 *
 * ═══ THE FIXTURE, SUCH AS IT IS ═══
 * Deliberately thin, because the point is that almost nothing is faked:
 *   - /dev/quests opens the zone gates and /dev/kit hands over the three
 *     starter weapons, so the run does not play the tutorial (devtools.js).
 *   - /dev/vitals heals and grants bounded god mode: the attacker cannot be
 *     killed mid-row by the monster he is standing on.  This does NOT touch
 *     the monster, the hit test, or any gate a hit passes through.
 *   - the zone hop is the game's own `S._devWarp`, which walks the real front
 *     doors leg by leg (zoneTransitions) rather than setting currentZone —
 *     so the per-zone asset load still happens, as CLAUDE.md requires.
 * Everything about the monster — where it is, whether it is moving, how much
 * health it has, whether the hit counts — is the worker's.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const TRIES = 5;                /* attempts per row */
const SETTLE_MS = 1400;         /* flight across the standoff + the round trip that settles it */
/* ═══ v2.3.3321: ...ON A PHONE.  THE SHOT IS OVER WHEN THE SHOT IS OVER ═══
   1400 ms is a phone's number: a staff bolt flies 5 px a FRAME (x _dtScale,
   clamped to 3), 300 px a second at 60 fps, so this file's farthest standoff
   (240 px) is 0.8 s in the air.  On a box drawing a few frames a second the
   same bolt flies 40-75 px a second of wall time, and the window shut with it
   still in the air (said 0) or its claim just sent (said 1, health unmoved:
   "dropped by the worker").  In both runs of the sweep (2026-10-16/17) every
   such miss was a staff shot at 153-239 px, and the bow's 24 px arrows landed.
   So after SETTLE_MS the wait goes on while one of this attempt's shots is
   still flying, and for ANSWER_MS after the last claim it sent for the target
   (the worker answers at once; the page reads the answer between its own slow
   frames), up to SETTLE_MAX_MS. */
const ANSWER_MS = 1500;
const SETTLE_MAX_MS = 8000;
/* ═══ EVERY ROW IS FOUGHT AT ITS OWN WEAPON'S RANGE, AND THAT IS NOT OPTIONAL ═══
   The first working run of this file did not control the distance at all: it
   only ever backed AWAY from a target that had closed, and never walked toward
   one that had not.  The lock holds out to 220 x TARGET_HYST = 275px, so
   `readTarget` happily handed back a slime 212px away and the SWORD rows swung
   at it -- with GS_OUTER_RADIUS 72 of reach.  Five swings, five misses, and a
   row of zeros that reads exactly like broken melee hit detection.  The magic
   rows were worse: 611-663px, right at the staff orb's 675px ceiling
   (mp-orbrange), so the bolts expired in the air.
   An attempt fired from outside the weapon's reach is not evidence about the
   weapon, so the distance is walked to first and an attempt that could not be
   placed is VOID rather than counted. */
const REACH = {
  /* Well inside GS_OUTER_RADIUS 72 plus the monster's own body, with room for
     it to move while the swing resolves its contact-synced window. */
  melee:  { want: 44,  lo: 20,  hi: 66 },
  /* Inside the 220px targeting perimeter so the game's own auto-lock holds,
     and outside the worker's 120px aggro ring so the shot has ground to cross.
     Sticky aggro (10s on being hit, combat.js) closes it anyway after the
     first landed shot -- which is the point: the later attempts in a row are
     fired at a monster running at the camera, which is what the game looks
     like. */
  ranged: { want: 185, lo: 70, hi: 240 },
  staff:  { want: 185, lo: 70, hi: 240 },
};
/* ═══ WALK SLOWLY ENOUGH THAT THE WORKER NEVER REFUSES A STEP ═══
   movement.js caps a move at `500 * dt + 80` px and REJECTS anything over it
   -- and a rejection is not a dropped frame, it is a fork: `ps.x/y` keep the
   old values, `ps.z` is inside the same `if (accept)` so the ZONE does not
   change either, and `ps.lastMoveAt` advances anyway.  So the client walks on,
   the worker's copy stays where it was, and every following move is measured
   from the stale point -- a bigger delta, rejected harder.  That is the whole
   of "movement.js rejects a teleport and then rejects everything after it".

   It cost this file two zones and a row before it was found.  A frozen `ps.z`
   means the worker never spawns or sends the zone you walked into (`srv:true`
   with an empty monster list, twice), and a frozen `ps.x/y` means
   `_handleMonsterDamage`'s `attackerPs.z !== zone` gate silently denies every
   hit -- which reads as a worker dropping legitimate damage.
   70px / 300ms is 233 px/s against a budget that is ~179px per 198ms move, so
   even two bunched steps in one message clear it. */
const STEP_PX = 70;
const STEP_MS = 300;
const DESYNC_PX = 70;           /* client-vs-worker gap that means a step was refused */
const PLACE_TRIES = 14;
/* ═══ EVERY WAIT IN THIS FILE IS BOUNDED, AND THE ROW IS BOUNDED TOO ═══
   A monster respawns on an 18.75s clock (RESPAWN_TIME) and there are six in a
   zone, so something is nearly always alive and a long wait is the exception.
   But the exceptions compound: an attempt can wait for a target, walk up to
   PLACE_TRIES steps, re-sync twice, and poll a settle -- and a row may take
   TRIES * 3 attempts to collect TRIES fair ones.  Multiply that by 24 rows and
   an unlucky run does not fail, it HANGS: the eighth run of this file ran out
   its 30-minute wall clock in frost and produced no table at all, which is
   worse than a red row because it says nothing.
   So the wait is shorter than a respawn (a timeout is a void, and the next
   attempt tries again) and the ROW carries a deadline.  A row that runs out of
   budget reports fewer fair attempts than TRIES and fails its own guard --
   loudly, with its numbers, instead of silently eating the run. */
const TARGET_WAIT_MS = 14000;
const ROW_BUDGET_MS = 150000;   /* 2.5 min: ~4x what a healthy row costs */

/* Three zones, and they are chosen for their HIT RADII rather than the scenery
   -- one 'fodder' fixture is what mp-hitmatrix already has.  The radius is
   per-archetype in projectiles.js, so these are three different hitboxes:

     verdant   blueSlime  -> hitShapeOf 'fodder'   r=27
     ember     fireGoblin                          r=26
     frost     snowman                             r=32   (and it burrows)
     sky       stalker/hexer/volatile -> mummy     r=40, and the mummy sheds
               its bandages at 50% HP and becomes a skeleton at r=50, which
               v2.3.2229 calls the tightest fit in the game.

   These four are the live doors on the World View map (effects.js
   WORLDVIEW_EXITS); hollows, thunder, tidal and mist are commented out up
   there, so their archetypes cannot be reached by walking at all. */
/* `body` is that archetype's hit radius from the table above, and it is used
   for ONE thing: deciding whether a miss is explained (see the assertions).
   Not to reimplement the hit test -- a scenario that recomputed the game's own
   geometry would be checking its own arithmetic (TRAPS #35) -- but as the
   natural bar for "did the target move far enough sideways to be somewhere
   else when the shot arrived".  sky takes the mummy's 40 rather than the
   skeleton's 50, because the smaller number is the stricter test. */
const ROSTER = [
  { zone: 'verdant', body: 27, what: 'blue slimes (r=27)' },
  { zone: 'ember',   body: 26, what: 'fire goblins (r=26)' },
  { zone: 'frost',   body: 32, what: 'snowmen (r=32, and they burrow)' },
  { zone: 'sky',     body: 40, what: 'mummies (r=40) that shed into skeletons (r=50)' },
];

const ATTACKS = [
  { key: 'sword',         type: 'greatsword', slot: 'melee',  stash: 'weapon',       special: false },
  { key: 'sword special', type: 'greatsword', slot: 'melee',  stash: 'weapon',       special: true  },
  { key: 'bow',           type: 'bow',        slot: 'ranged', stash: 'rangedWeapon', special: false },
  { key: 'bow special',   type: 'bow',        slot: 'ranged', stash: 'rangedWeapon', special: true  },
  { key: 'magic',         type: 'staff',      slot: 'staff',  stash: 'staffWeapon',  special: false },
  { key: 'magic special', type: 'staff',      slot: 'staff',  stash: 'staffWeapon',  special: true  },
];

const ranged = (a) => a.slot === 'ranged' || a.slot === 'staff';

/* v2.3.3397: a run of some rows only, to look into one of them --
   BT_HITREAL_ZONES=frost,sky and/or BT_HITREAL_ONLY=bow,bow+special (a "+"
   for the space).  Unset, every zone and every attack, as always. */
const pickRows = (name, all, key) => {
  const want = (process.env[name] || '').split(',').map((w) => w.trim().replace(/\+/g, ' ')).filter(Boolean);
  return want.length ? all.filter((x) => want.includes(x[key])) : all;
};

/* ═══ ONE ATTACK, WHICHEVER WAY THAT WEAPON ACTUALLY ATTACKS ═══
   swingAttack RETURNS IMMEDIATELY for ranged and staff — "let the auto-attack
   loop fire the projectile on the shared cadence" (playerActions.js) — so
   driving every row through it fires nothing at all for four of the six rows.
   mp-hitmatrix's first run did exactly that and reported bow and magic at 0/8,
   which reads precisely like the broken hit detection it was written to look
   for.  Specials go through specialAttack (which covers every slot), melee
   through swingAttack, and ranged/staff hold the fire control just long enough
   for the auto-attack loop to release ONE projectile — polled rather than
   timed, so an attempt is 1:1 with a shot or is reported as never fired. */
const fire = (P, atk, tid) => P.page.evaluate(({ sp, rg, tid }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (sp && rg) {
    /* ═══ v2.3.2473: A SPECIAL THAT WAS QUEUED IS NOT A SPECIAL THAT FIRED ═══
       This reported ok the moment specialAttack() returned without throwing,
       which was safe while the call always launched something.  A bow special
       pressed with nothing on the sight line is now QUEUED instead (it spends
       no mana and starts no cooldown), so an unverified ok scored it as a shot
       that was fired and then mysteriously missed -- five of them in the frost
       row, every one recorded as "unexplained".  A test that cannot tell "the
       shot missed" from "there was no shot" is the same failure mode as
       TRAPS §28's "not found": it reports the wrong thing confidently.
       So the arrow count is the witness, exactly as the ranged branch below
       already uses it.  Short poll, because the special launches synchronously
       (playerActions pushes into S.arrows in the call) -- what is being waited
       for is one frame of slack, not a cadence.

       RANGED SPECIALS ONLY (`sp && rg`), and the first cut of this got it
       wrong: `sword special` also carries special:true, and a melee special
       pushes NO arrows at all -- it is a swing.  Witnessing it on S.arrows
       would have voided all five attempts of every sword-special row and
       reported the melee registry as broken.  The bow is the only weapon whose
       special can be queued (the staff is not sight-gated), but the staff
       special does push arrows, so including it costs nothing and keeps the
       branch keyed on "is this a projectile" rather than on one weapon. */
    const m0 = (S.arrows || []).length;
    try { F.specialAttack(); } catch (e) { return resolve({ err: String(e) }); }
    const t1 = Date.now();
    const iv1 = setInterval(() => {
      if ((S.arrows || []).length > m0) { clearInterval(iv1); return resolve({ ok: true, shot: true }); }
      if (Date.now() - t1 > 400) {
        clearInterval(iv1);
        return resolve({ ok: false, why: 'special queued, never launched',
          queued: !!window._gameState.current._bowSpecialQueued });
      }
    }, 16);
    return;
  }
  if (sp) { try { F.specialAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  if (!rg) { try { F.swingAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  const n0 = (S.arrows || []).length;
  S.autoAttack = true;
  const t0 = Date.now();
  /* ═══ v2.3.3397: THE THUMB STAYS ON THE TARGET UNTIL THE SHOT LEAVES ═══
     The aim was set once, before this, and the bow looses only while its
     sight is on something (monsterCombat's gate): a slime that hopped while
     the cadence came round took the line off it, and the row voided the
     attempt as "never fired" (the verdant bow row, 8 of 15, twice running;
     the line 35-53 px from its centre when it gave up).  A player keeps the
     stick on what they are shooting, so this does too: every poll re-aims at
     the target where it is drawn, from the point the sight casts from (or
     you, for the staff), and the attempt is measured from where the target
     was when the shot left (`at`). */
  const aimNow = () => {
    const m = tid != null ? (S.monsters || []).find((x) => x.id === tid) : null;
    if (!m || !S.player) return null;
    const tx = typeof m.renderX === 'number' ? m.renderX : m.x;
    const ty = typeof m.renderY === 'number' ? m.renderY : m.y;
    const ay = ty - ((F.monsterBodyOffsetY && F.monsterBodyOffsetY(m.archetype || m.type)) || 0);
    const b = S.rpg && S.rpg.activeSlot === 'ranged' ? S._bowSight : null;
    const ox = b && typeof b.ox === 'number' ? b.ox : S.player.x;
    const oy = b && typeof b.oy === 'number' ? b.oy : S.player.y;
    const ang = Math.atan2(ay - oy, tx - ox);
    S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = true;
    S._facingAngle = ang; S._targetFacingAngle = ang;
    return { x: Math.round(tx), y: Math.round(ty), aimY: Math.round(ay) };
  };
  let at = aimNow();
  /* ...and a shot is a shot when it LEAVES: the cadence clock (`swingTimer`,
     stamped only when one does, and zeroed by aimAt) as well as the list.
     At point blank an arrow can be loosed, hit and taken off the list inside
     one frame, between two polls: that row's "never fired" had its sight on
     the target and its clock stamped 170-590 ms before giving up. */
  const iv = setInterval(() => {
    if ((S.arrows || []).length > n0 || (S.swingTimer || 0) >= t0) { clearInterval(iv); S.autoAttack = false; resolve({ ok: true, shot: true, at }); }
    else if (Date.now() - t0 > 1500) {
      clearInterval(iv); S.autoAttack = false;
      /* v2.3.3397: ...and WHY.  The bow looses only while its sight is on
         something (monsterCombat `_bowSight.d`), and the verdant bow row lost
         8 of its 15 attempts this way twice running: what the sight saw, and
         how far the line passed from the target's centre when it gave up. */
      const b = S._bowSight;
      const m = (S.monsters || []).find((x) => x.id === tid);
      let off = null;
      if (b && m && typeof b.ox === 'number') {
        const tx = typeof m.renderX === 'number' ? m.renderX : m.x;
        const ty = (typeof m.renderY === 'number' ? m.renderY : m.y) - ((F.monsterBodyOffsetY && F.monsterBodyOffsetY(m.archetype || m.type)) || 0);
        const dd = Math.hypot(tx - b.ox, ty - b.oy);
        const da = Math.atan2(ty - b.oy, tx - b.ox) - b.ang;
        off = { d: Math.round(dd), side: Math.round(Math.sin(da) * dd), ahead: Math.cos(da) > 0 };
      }
      resolve({ ok: false, why: 'never fired', diag: {
        sight: b ? { id: b.id, d: b.d == null ? null : Math.round(b.d), age: Date.now() - b.at } : null,
        off, alive: !!(m && m.alive), cd: Date.now() - (S.swingTimer || 0),
        aiming: !!S._aiming, shield: !!S._shieldUp } });
    } else {
      const a2 = aimNow();
      if (a2) at = a2;
    }
  }, 16);
}), { sp: !!atk.special, rg: ranged(atk), tid: tid || null });

/* Who the GAME says we are fighting, plus everything an attempt needs to know
   about it.  The lock is the game's own auto-acquisition (targeting.js), and
   taking the target FROM it rather than choosing one and hoping is the whole
   trick: while `S.autoAttack` is on, monsterCombat overwrites `S._aimAngle`
   toward the locked monster on every frame, so a scenario that picked its own
   target and aimed at it by hand would be measuring one monster and shooting
   at another.  Falls back to the nearest live monster when nothing is locked
   (a melee row can be standing on something before the perimeter fires). */
const readTarget = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (!S || !S.player) return null;
  const live = (m) => m && m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0);
  /* A snow pile is invulnerable server-side and intangible to the client's own
     hit test, so a shot at one is a CORRECT miss.  Excluded from the pick
     rather than fired at and scored: frost's snowmen burrow when they are hit,
     and the first run of this file spent three whole rows firing at piles and
     reported them as five voids each. */
  /* v2.3.3397: ...and not one whose straight walk from here crosses the zone's
     way out (the return marker, map tile 9): the placer walks that line, and a
     run lost a whole ember bow row walking out of the zone seven times
     (2026-10-18).  Over it is within two tiles of its middle; the first 64 px
     of the walk do not count, since you arrive beside the way out: counted
     from where you stand, as mp-tapswing's rule does, every monster in ember
     was refused. */
  const outs = [];
  for (let ty = 0; ty < (S.map || []).length; ty++) {
    const row = S.map[ty] || [];
    for (let tx = 0; tx < row.length; tx++) if (row[tx] === 9) outs.push([tx * 32 + 16, ty * 32 + 16]);
  }
  const P0 = S.player;
  const passesOut = (m) => outs.some(([ox, oy]) => {
    const vx = m.x - P0.x, vy = m.y - P0.y, L = Math.hypot(vx, vy) || 1;
    const t0 = Math.min(1, 64 / L);
    const t = Math.max(t0, Math.min(1, ((ox - P0.x) * vx + (oy - P0.y) * vy) / (L * L)));
    return Math.hypot(P0.x + vx * t - ox, P0.y + vy * t - oy) < 2 * 32;
  });
  const usable = (m) => live(m) && m._burPhase !== 'pile' && !m._invulnerable && !passesOut(m);
  const lk = (S.lockedTarget && S.lockedTarget.type === 'monster') ? S.lockedTarget.ref : null;
  let m = usable(lk) ? lk : null;
  let via = m ? 'lock' : null;
  if (!m) {
    const near = (S.monsters || []).filter(usable)
      .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
                    - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
    m = near || null; via = m ? 'nearest' : null;
  }
  if (!m) return null;
  const rx = typeof m.renderX === 'number' ? m.renderX : m.x;
  const ry = typeof m.renderY === 'number' ? m.renderY : m.y;
  return {
    id: m.id, via, arch: m.archetype || m.type,
    hp: m.curHp, maxHp: m.maxHp, alive: !!m.alive,
    /* v2.3.2221's burrow phase, mirrored onto the monster by wsClient from the
       tick's `ph` — reported as well as filtered on, so a row that went void
       says WHY it did. */
    burrow: m._burPhase || null, invuln: !!m._invulnerable,
    gap: Math.round(Math.hypot(rx - S.player.x, ry - S.player.y)),
    x: Math.round(rx), y: Math.round(ry),
    /* The aim point the game itself would use for this monster
       (combatHelpers lockAimPoint = the body centre, not the feet). */
    aimY: Math.round(ry - ((F.monsterBodyOffsetY && F.monsterBodyOffsetY(m.archetype || m.type)) || 0)),
    px: Math.round(S.player.x), py: Math.round(S.player.y),
  };
});

const targetById = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const m = (S.monsters || []).find((x) => x.id === mid);
  /* GONE is not the same as ALIVE-AT-FULL.  A killed monster is dropped from
     the array before its respawn, so "not found" has to read as dead — the
     first cut returned null here and the caller scored a clean kill as an
     attempt that could not be measured. */
  if (!m) return { id: mid, gone: true, alive: false, hp: 0 };
  const rx = typeof m.renderX === 'number' ? m.renderX : m.x;
  const ry = typeof m.renderY === 'number' ? m.renderY : m.y;
  return { id: mid, gone: false, alive: !!m.alive, hp: m.curHp,
    x: Math.round(rx), y: Math.round(ry),
    burrow: m._burPhase || null, invuln: !!m._invulnerable };
}, id);

/* Aim at the body centre by hand as well as leaving the lock to it.  Belt and
   braces on purpose: the lock only writes the aim while `S.autoAttack` is on
   or a TAPPED lock is held (targeting engagedStance), so the melee and special
   rows — which set neither — would otherwise fire on whatever residue the last
   row left behind.  _lastAimAngle as well as _aimAngle because that is the one
   field that means "the direction the player asked for" (v2.3.2261). */
const aimAt = (P, t) => P.page.evaluate(({ ax, ay }) => {
  const S = window._gameState.current, R = S.rpg;
  /* ═══ v2.3.2473: A BOW IS AIMED FROM THE GRIP, NOT FROM THE FEET ═══
     This measured the angle from the player's ORIGIN, and the bow has fired
     from the teal GRIP since v2.3.1979 -- whose note is about exactly this
     geometry: "Measured from the player's feet (as it was), the arrow's flight
     line came out PARALLEL to the line that hits, passing 9-32px to the side
     of a 27px slime."  An angle taken from one point and flown from another
     offset by ~28px is a line that misses by up to 28px at every range.

     It never showed before because nothing checked: the bow fired whatever the
     angle was and the arrow either connected or did not, and a row that landed
     4 of 5 read as a live monster moving.  v2.3.2473's sight gate is the first
     thing that asks the question, and it asks it from the grip -- so an aim
     built from the feet now suppresses the shot outright and the row reports
     "never fired".
     Measured on this build before the fix: 13 of 15 verdant bow attempts never
     fired, against a slime whose gate radius (25 + the arrow's 6.6) is 31.6 --
     only just wider than the 28px offset, so the fixture was always on the
     edge of missing and the gate simply made that visible.

     ═══ v2.3.2543: ...AND THE GRIP IT AIMS FROM IS THE LIVE ONE ═══
     The paragraph above was right that this fixture must measure from whatever
     point the gate casts from, and it named the wrong field.  It read the
     ABSOLUTE `_bowGripX/Y`, on the stated grounds that this is "the number the
     gate uses" and the published offset is only "a copy of it".  That was true
     when it was written and is no longer: the owner's own report (the line is
     on the monster and the bow will not fire, the line is off it and it does)
     was that same absolute pair going stale.  effectsRenderer writes it inside
     `_updateBowShot`, which returns unless `S._bowShowing` -- the 360ms of
     BOW_SHOT_MS after a shot -- so between volleys it freezes at the world
     point of the last shot while the player walks away from it.  The gate and
     the fire site now read the LIVE grip (bowGripPoint, combatHelpers) and so
     must this, or the fixture points from one place while the game tests from
     another, which is the exact defect this comment was written about, with
     the two ends swapped.

     Preferring `_bowSight.ox/oy` is deliberate: that is not a copy of the
     gate's origin, it is the origin the gate actually cast from on its last
     frame, published beside the answer.  The offset expression behind it is
     the fallback for the melee and staff rows (where `_bowSight` is null by
     design) and for the first frame of a row, and the feet remain the floor
     before the renderer has ever painted a bow. */
  const _rangedNow = R && (R.activeSlot === 'ranged');
  const _sight = _rangedNow ? S._bowSight : null;
  const _gripDX = (typeof S._bowGripDX === 'number') ? S._bowGripDX : 0;
  const _gripDY = (typeof S._bowGripDY === 'number') ? S._bowGripDY : 0;
  const _fx = (_sight && typeof _sight.ox === 'number') ? _sight.ox
    : (_rangedNow ? S.player.x + _gripDX : S.player.x);
  const _fy = (_sight && typeof _sight.oy === 'number') ? _sight.oy
    : (_rangedNow ? S.player.y + _gripDY : S.player.y);
  const ang = Math.atan2(ay - _fy, ax - _fx);
  S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = true; S._aimSrc = 'stick';
  S._facingAngle = ang; S._targetFacingAngle = ang;
  S.swingTimer = 0; S._lastSwipe = 0; S._shieldUp = false;
  /* Every attempt starts with an empty sky.  The bow special STICKS in the
     monster and chips every 500ms for four seconds (projectiles.js), so
     without this the row after it measures the previous attempt's arrow. */
  S.arrows = [];
  if (R) { R.mana = R.maxMana; }
  return { ang: +ang.toFixed(3) };
}, { ax: t.x, ay: t.aimY });

/* Where a monster is RIGHT NOW, by id, relative to the player.  Read fresh on
   every step of the walk below: the target is walking too, and a placer that
   aims at where it was reads as "could not get in range" against a monster
   that is standing still relative to the player. */
const gapTo = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const m = (S.monsters || []).find((x) => x.id === mid);
  if (!m || !S.player) return null;
  const rx = typeof m.renderX === 'number' ? m.renderX : m.x;
  const ry = typeof m.renderY === 'number' ? m.renderY : m.y;
  return { x: Math.round(rx), y: Math.round(ry),
    px: Math.round(S.player.x), py: Math.round(S.player.y),
    gap: Math.round(Math.hypot(rx - S.player.x, ry - S.player.y)),
    alive: !!m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) };
}, id);

/* Walk to this weapon's range of THIS monster -- toward it or away from it,
   whichever the gap needs.  Walks for real, one bounded step per iteration:
   movement.js rejects a teleport and then rejects everything after it, and its
   cap is 500 px/s (STEP_PX / STEP_MS is 375). */
async function placeAt(P, id, reach) {
  let g = await gapTo(P, id);
  for (let i = 0; i < PLACE_TRIES && g && g.alive; i++) {
    if (g.gap >= reach.lo && g.gap <= reach.hi) return g;
    const dx = g.px - g.x, dy = g.py - g.y;
    const d = Math.hypot(dx, dy) || 1;
    const goal = { x: g.x + (dx / d) * reach.want, y: g.y + (dy / d) * reach.want };
    await P.page.evaluate(({ gx, gy, step }) => {
      const S = window._gameState.current;
      const ddx = gx - S.player.x, ddy = gy - S.player.y;
      const dd = Math.hypot(ddx, ddy);
      if (dd < 4) return;
      const k = Math.min(step, dd);
      S.player.x += (ddx / dd) * k;
      S.player.y += (ddy / dd) * k;
    }, { gx: Math.round(goal.x), gy: Math.round(goal.y), step: STEP_PX });
    await P.page.waitForTimeout(STEP_MS);
    g = await gapTo(P, id);
  }
  return g;
}

/* v2.3.2701: step OFF a line a prop stands on -- see the covered void in the
   row loop.  placeAt only walks along the line to the target, so without this
   a monster behind a rock is walked back to behind the same rock every time.
   The side is chosen with the game's own probes: clear of every footprint
   (with the player's collision pad and a little), and with nothing between
   that spot and the target. */
async function sidestep(P, g, boots, grip) {
  const goal = await P.page.evaluate(({ q, boots, grip }) => {
    const S = window._gameState.current, z = S.currentZone;
    const boxes = (window.__btBlockers && window.__btBlockers(z)) || [];
    const inBox = (x, y) => boxes.some((b) => x >= b.x0 - 14 && x <= b.x1 + 14 && y >= b.y0 - 14 && y <= b.y1 + 14);
    const dx = q.x - q.px, dy = q.y - q.py, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    /* v2.3.3397: for a shot, the line the game asks about -- its ground
       track, from your boots to the aim point carried back by the bow
       grip's offset (`grip`; a staff bolt has none) and down as far
       (projectiles.js `_ox`, `_goy`), and the chest line as well */
    /* the boots' depth the game stamps on a shot (trackShot keeps the last
       one, per zone), else the stand-in's plant below you (entityRenderer) */
    const gdy = typeof window.__hrGdy === 'number' ? window.__hrGdy
      : (typeof S._standInFootY === 'number' && S.player ? S._standInFootY - S.player.y : 52);
    const gx = boots && grip && typeof S._bowGripDX === 'number' ? S._bowGripDX : 0;
    const gy = boots && grip && typeof S._bowGripDY === 'number' ? S._bowGripDY : 0;
    const clear = (sx, sy) => !window.__btAttackBlocked(z, sx, sy, q.x, q.y)
      && (!boots || !window.__btAttackBlocked(z, sx, sy + gdy, q.x - gx, q.aimY - gy + gdy));
    for (const k of [90, -90, 170, -170, 250, -250]) {
      const sx = q.px + nx * k, sy = q.py + ny * k;
      if (!inBox(sx, sy) && clear(sx, sy)) return { x: Math.round(sx), y: Math.round(sy) };
    }
    return null;
  }, { q: g, boots: !!boots, grip: !!grip });
  if (!goal) return false;
  for (let i = 0; i < PLACE_TRIES; i++) {
    const done = await P.page.evaluate(({ gx, gy, step }) => {
      const S = window._gameState.current;
      const ddx = gx - S.player.x, ddy = gy - S.player.y, dd = Math.hypot(ddx, ddy);
      if (dd < 6) return true;
      const k = Math.min(step, dd);
      S.player.x += (ddx / dd) * k; S.player.y += (ddy / dd) * k;
      return false;
    }, { gx: goal.x, gy: goal.y, step: STEP_PX });
    if (done) return true;
    await P.page.waitForTimeout(STEP_MS);
  }
  return false;
}

/* ═══ DID THE WORKER COME WITH US? ═══
   Read after every walk, because a refused step is invisible from the browser:
   the client draws the player exactly where it put them and the game feels
   fine.  Only the worker's own copy says otherwise, and every gate that
   matters here -- the zone the hit is claimed in, the 400px melee proximity
   bound -- is measured against that copy.  On a divergence the client is
   SNAPPED BACK to the worker's position: agreeing with the server is the only
   move guaranteed to be accepted next, and leaving the two forked is how one
   refused step becomes a run that never lands another hit. */
async function resync(P, wsPort, id) {
  /* Let the walk's last `move` reach the worker before asking it where we
     are.  Without this the read lands mid-flight and reports a divergence of
     one or two steps that is simply the packet still on the wire -- which is
     not a desync, and voiding an attempt for it throws away a fair shot.
     One move gap plus a little (the client sends at >=1 Hz, ~198ms solo). */
  await P.page.waitForTimeout(320);
  const sp = await H.serverPlayer(wsPort, id).catch(() => null);
  if (!sp || typeof sp.x !== 'number') return { ok: false, why: 'no server view' };
  const cli = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, z: S.currentZone }));
  const gap = Math.round(Math.hypot(sp.x - cli.x, sp.y - cli.y));
  const zoneSplit = sp.zone !== cli.z;
  if (gap <= DESYNC_PX && !zoneSplit) return { ok: true, gap };
  await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current;
    S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
  }, { x: sp.x, y: sp.y });
  await P.page.waitForTimeout(400);
  return { ok: false, gap, zoneSplit, srvZone: sp.zone, cliZone: cli.z };
}

/* Something alive and hittable to shoot at.  Six rows of five attempts empties
   a six-monster zone, and the worker brings them back on an 18.75s clock
   (RESPAWN_TIME) -- so "no target" is nearly always "wait", not "broken".  The
   first run of this file did not wait and lost three whole frost rows to it,
   scoring an empty zone as five voids apiece. */
async function waitForTarget(P, ms) {
  const t0 = Date.now();
  for (;;) {
    const t = await readTarget(P);
    if (t) return t;
    if (Date.now() - t0 > ms) return null;
    await P.page.waitForTimeout(1000);
  }
}

/* Poll the target's health rather than sleeping a fixed window at it.  A hit
   settles when the worker says so -- `monster_hit`'s hpPct or the next tick --
   and the round trip is tens of ms on localhost but the tick is on its own
   clock, so a fixed wait is either wasteful or flaky and there is no single
   number that is neither.  Returns as soon as the number moves. */
async function settle(P, id, before, ms) {
  const t0 = Date.now();
  /* ═══ AND WATCH FOR IT GOING UNTOUCHABLE WHILE THE SHOT IS IN THE AIR ═══
     The snowman's burrow is STARTED BY THE WORKER'S OWN AI (index.js
     _startBurrow), mid-fight, in response to standing in one — so a monster
     that was a fair target when the attempt began can be a snow pile by the
     time the shot lands, and the server correctly refuses every hit on a pile
     (_monsterDamageable).  The first full run of this file scored that as a
     miss: three frost magic-special attempts read `hp 24 -> 24` with all three
     orbs registered client-side, which looks exactly like a worker dropping
     legitimate damage.  It was the mechanic working.  Reported, so the caller
     can void the attempt instead of counting it. */
  let dug = false;
  for (;;) {
    const a = await targetById(P, id);
    if (a.burrow === 'pile' || a.invuln) dug = true;
    if (a.gone || !a.alive) return Object.assign(a, { dug });
    if (before != null && a.hp != null && a.hp < before) return Object.assign(a, { dug });
    const el = Date.now() - t0;
    if (el > SETTLE_MAX_MS) return Object.assign(a, { dug, cut: true });
    if (el > ms) {
      /* v2.3.3321: past the phone's window -- over only once nothing of this
         attempt is still flying and the last claim has had its answer */
      const s = await shotState(P, id);
      if (!s.flying && !(s.sinceLast != null && s.sinceLast < ANSWER_MS)) return Object.assign(a, { dug, waited: el });
    }
    await P.page.waitForTimeout(120);
  }
}

/* v2.3.3397: what the bow's sight is on, two frames after the aim was set (so
   the gate has cast with it): `id` a monster's id, `prop:<oi>`, or null. */
const bowSightNow = (P) => P.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const S = window._gameState.current, b = S._bowSight;
  r(b ? { id: b.id, d: b.d == null ? null : Math.round(b.d), age: Date.now() - b.at } : null);
}))));

/* v2.3.3397: WHERE EACH SHOT OF THIS ATTEMPT ENDED.  A miss the target
   barely moved for (frost, ~80 px, 2-3 px across: this run and part-13's)
   printed only "no claim" -- not whether the arrow went into another monster,
   into a rock, or fell spent at its range.  Called right after fire(): every
   arrow in S.arrows is this attempt's (aimAt empties it), and each is watched
   until it sticks (`stuckIn`), plants (`planted`, `_inProp` when it is in a
   prop), starts its spent drop (`planting`) or leaves the list.  Read back with
   the attempt's claims on OTHER monsters. */
const trackShot = (P, tid) => P.page.evaluate((tid) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const shots = (S.arrows || []).slice();
  const pos = (a) => ({ x: Math.round(a._renderX != null ? a._renderX : a.x), y: Math.round(a._renderY != null ? a._renderY : a.y) });
  const w = { t0: Date.now(), shots, tr: shots.map((a) => ({ from: pos(a), ang: Math.round((a.ang || 0) * 1000) / 1000, why: null, at: null, ms: null })),
    /* the closest each flight came to the target's hit centre (the segment
       between two looks, against where the target was drawn), and what the
       target was doing then: a miss the line passed inside, with the target
       not burrowed, is the hit test's to answer for */
    near: null };
  const tgtNow = () => {
    const m = tid != null ? (S.monsters || []).find((x) => x.id === tid) : null;
    if (!m) return null;
    const tx = typeof m.renderX === 'number' ? m.renderX : m.x;
    const ty = (typeof m.renderY === 'number' ? m.renderY : m.y) - ((F.monsterBodyOffsetY && F.monsterBodyOffsetY(m.archetype || m.type)) || 0);
    return { x: tx, y: ty, ph: m._burPhase || null, burst: !!m._burstUntil, alive: !!m.alive };
  };
  const segD = (ax, ay, bx, by, px, py) => {
    const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
    return Math.hypot(ax + vx * t - px, ay + vy * t - py);
  };
  const prev = new Map();
  /* the boots' depth under you the game stamped on the shot (combatHelpers
     shotGroundDy), for sidestep's look at the ground */
  for (const a of shots) if (a && typeof a._gdy === 'number' && isFinite(a._gdy)) { window.__hrGdy = a._gdy; break; }
  if (window.__hrShotIv) clearInterval(window.__hrShotIv);
  window.__hrShot = w;
  window.__hrShotIv = setInterval(() => {
    let open = 0;
    /* a volley's later arrows leave after fire() has seen the first */
    if (Date.now() - w.t0 < 1500) {
      for (const a of (S.arrows || [])) {
        if (a && w.shots.indexOf(a) < 0) { w.shots.push(a); w.tr.push({ from: pos(a), ang: Math.round((a.ang || 0) * 1000) / 1000, why: null, at: null, ms: null }); }
      }
    }
    const tg = tgtNow();
    w.shots.forEach((a, i) => {
      const t = w.tr[i];
      if (t.why) return;
      if (tg && !a.planted && !a.planting && !a._held) {
        const p1 = pos(a), p0 = prev.get(a) || p1;
        const d = segD(p0.x, p0.y, p1.x, p1.y, tg.x, tg.y);
        if (!w.near || d < w.near.d) w.near = { d: Math.round(d), ms: Date.now() - w.t0, ph: tg.ph, burst: tg.burst, alive: tg.alive };
        prev.set(a, p1);
      }
      let why = null;
      if (a.stuckIn) why = 'stuck:' + (a.stuckIn.id || '?');
      else if (a.planted) why = a._inProp ? 'prop' : 'ground';
      else if (a.planting) why = 'spent';
      else if ((S.arrows || []).indexOf(a) < 0) why = 'gone';
      if (why) { t.why = why; t.ms = Date.now() - w.t0; } else open++;
      t.at = pos(a);
    });
    if (!open || Date.now() - w.t0 > 6000) { clearInterval(window.__hrShotIv); window.__hrShotIv = null; }
  }, 16);
}, tid == null ? null : tid);
const shotEnd = (P, mid, since) => P.page.evaluate(({ mid, since }) => {
  const w = window.__hrShot;
  const others = (window.__hitReal || []).filter((r) => r.id !== mid && r.at >= since).map((r) => r.id);
  return { ends: w ? w.tr : [], others, near: w ? w.near : null };
}, { mid, since });

/* v2.3.3321: is a shot of ours still in the air, and how long ago did the last
   claim for this monster go?  aimAt empties S.arrows before every attempt, so
   whatever is in it is this attempt's; an arrow stuck in a monster (the bow
   special's chip) is not flying. */
const shotState = (P, mid) => P.page.evaluate((id) => {
  const S = window._gameState.current;
  const flying = (S.arrows || []).some((a) => a && !a.stuckIn && !(typeof a.life === 'number' && a.life <= 0));
  let last = 0;
  for (const r of (window.__hitReal || [])) if (r.id === id && r.at > last) last = r.at;
  return { flying, sinceLast: last ? Date.now() - last : null };
}, mid);

/* v2.3.3321: NOTHING TO FIGHT, AND WHOSE LIST SAYS SO.  One run found no live
   monster in ember for ten minutes on end (four rows of voids), and nothing
   said whether the worker had stopped bringing them back or the phone had
   lost its copy of the zone.  Both halves, for the row's guard to print. */
async function emptyWhy(P, wsPort, id) {
  const cli = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = S.monsters || [];
    return { zone: S.currentZone, srvMonsters: !!S._serverMonsters, n: ms.length,
      alive: ms.filter((m) => m && m.alive).length,
      hp0: ms.filter((m) => m && m.alive && typeof m.curHp === 'number' && m.curHp <= 0).length,
      link: S._realtimeStatus || null };
  }).catch(() => null);
  const srv = await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/state?id=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } }).then((r) => r.json()).catch(() => null);
  return { cli, srv: srv && srv.ok ? { zone: srv.zone, monsters: srv.monsters || null } : srv };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Live', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S.myId);

  /* ═══ THE CLIENT HANGS ITSELF UP AFTER TWO IDLE MINUTES ═══
     Owner, v2.3.1913: "Sometimes I login to the game and see characters I
     played in separate window hours ago just idle."  So wsClient now calls
     `idleLogout()` at exactly two minutes -- and it measures those minutes
     from `_lastInputAt`, stamped by REAL window-capture touchstart /
     pointerdown / keydown / wheel.  A scenario that drives the game through
     page.evaluate stamps none of them, however busy it looks: it walks, aims,
     fires and kills with no input event anywhere, and at 120s the page closes
     its own socket with code 4006, shows the resume banner and STOPS.

     That is what took the fourth run of this file apart, and it does not look
     like a disconnect from the inside.  The client simply froze -- the player
     stuck at one coordinate, `fire` reporting "never fired" eight times, every
     hit refused because the worker had released the playerState -- and the
     three zones after it read as an empty world with a broken weapon.  Six
     rows of zeros that said nothing whatever about hit detection.

     So: a real keystroke, on a loop, for as long as the run lasts.  It is the
     same remedy mp-hitmatrix uses to keep its duel target present, and it is
     honest -- a human standing there testing weapons has a thumb on the glass.
     Control, because it is real input to the window and nothing in the game
     (Shift was, until v2.3.3006 made it the sprint). */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  const quests = await H.devOp(wsPort, 'quests', id);
  const kit = await H.devOp(wsPort, 'kit', id, { what: 'weapons' });
  await P.page.waitForTimeout(1200);
  const stash = await H.readState(P, (S) => ((S.rpg || {}).weaponStash || []).map((w) => w && w.type));
  rec.ok('the attacker holds sword, bow and staff, and every zone gate is open (guard)',
    !!(quests && quests.ok) && stash.includes('greatsword') && stash.includes('bow') && stash.includes('staff'),
    { stash, finished: quests && quests.finished, kit });

  /* ═══ WHAT THE CLIENT SAYS IT HIT — BOTH WAYS IT CAN SAY IT ═══
     `monster_damage` carries a monsterId, so it attributes: both specials are
     area attacks that can send for several monsters off one press, and every
     row below is a question about one specific monster.

     `arrow_blast` does NOT, and that is not an oversight to route around.  The
     bow special has TWO damage paths: the arrow plants in the target and sends
     ordinary monster_damage on a 500ms client timer, and then it detonates —
     "the final send off" (arrowblast.js v2.3.2279), the first damage message on
     this worker that carries a COORDINATE instead of a monster.  Counting only
     monster_damage therefore under-reports the bow special by exactly its
     finale, which is what the first full run of this file did: it read 4 sends
     against 5 attempts that all landed, and called a working weapon broken.
     Recorded separately and added in, rather than pretended away. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (window.__hitReal) return;
    window.__hitReal = []; window.__hitBlast = [];
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try {
        if (m && m.type === 'monster_damage' && m.payload) {
          window.__hitReal.push({ id: m.payload.monsterId, slot: m.payload.slot, sp: !!m.payload.special, at: Date.now() });
        } else if (m && m.type === 'arrow_blast') {
          window.__hitBlast.push({ at: Date.now() });
        }
      } catch (e) { /* never break the game */ }
      return orig(m);
    };
  });
  const sentFor = (mid, since) => P.page.evaluate(({ mid, since }) => ({
    dmg: (window.__hitReal || []).filter((r) => r.id === mid && r.at >= since).length,
    blast: (window.__hitBlast || []).filter((r) => r.at >= since).length,
    /* v2.3.3321: how long after the shot each claim went, so a hit the worker
       "dropped" says whether its answer had time to come back */
    at: (window.__hitReal || []).filter((r) => r.id === mid && r.at >= since).map((r) => r.at - since),
  }), { mid, since });

  const rows = [];
  const zoneNotes = [];

  for (const stop of pickRows('BT_HITREAL_ZONES', ROSTER, 'zone')) {
    /* v2.3.3397: a zone draws you at its own scale, so the boots' depth a
       shot was stamped with in the last one is not this one's */
    await P.page.evaluate(() => { window.__hrGdy = undefined; }).catch(() => {});
    /* ═══ ARRIVING IS TWO THINGS, AND ONLY ONE OF THEM IS THE ZONE NAME ═══
       The hop is the game's own zone chip: `S._devWarp` walks the real front
       doors leg by leg (zoneTransitions driveDevWarp), per-zone asset load and
       all, rather than setting currentZone -- which would skip the preload and
       break CLAUDE.md's animation law outright.

       But `S.currentZone` flips at the START of the transition and the zone's
       monsters arrive on a snapshot after it, so a run that waits only for the
       name gets an EMPTY zone and reads it as a zone with no monsters in it.
       Two runs of this file lost sky that way (`srv:true, n:0`) while a probe
       standing in the same zone saw all six mummies within six seconds.  So:
       wait for the name, then wait for the MONSTERS, and if they do not come,
       re-issue the warp once before believing it -- a leg that timed out is a
       stalled walk, not an empty world.  What the retry could not fix is
       reported with the worker's own view of where this player is standing,
       because "the client thinks it is in sky" and "the worker agrees" are
       different claims and only the second one spawns anything. */
    const warp = () => P.page.evaluate((to) => {
      const S = window._gameState.current;
      S._devWarp = { to, legs: 0, t: Date.now(), nextAt: 0 };
    }, stop.zone);
    const populated = async (ms) => H.waitFor(P,
      (S) => (S.monsters || []).filter((m) => m.alive).length, (n) => n > 0,
      { timeout: ms, label: `${stop.zone} monsters` }).then(() => true).catch(() => false);

    await warp();
    let arrived = await H.waitFor(P, (S) => S.currentZone, (z) => z === stop.zone,
      { timeout: 70000, label: stop.zone }).then(() => true).catch(() => false);
    let full = arrived && await populated(20000);
    if (!full) {
      await warp();
      arrived = await H.waitFor(P, (S) => S.currentZone, (z) => z === stop.zone,
        { timeout: 70000, label: stop.zone }).then(() => true).catch(() => false);
      full = arrived && await populated(25000);
    }
    await P.page.waitForTimeout(800);
    /* `zone`, not `z`: /api/admin/player's `live` view renames it (admin.js).
       Reading `.z` gives undefined, JSON.stringify drops the key, and the
       diagnostic that was added to answer "does the worker agree we are in
       this zone" silently answered nothing at all -- for a whole run. */
    const srvZone = await H.serverPlayer(wsPort, id).then((p) => (p || {}).zone || null).catch(() => null);
    const world = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return { zone: S.currentZone, srv: !!S._serverMonsters,
        n: (S.monsters || []).filter((m) => m.alive).length,
        arch: [...new Set((S.monsters || []).map((m) => m.archetype || m.type))] };
    });
    rec.ok(`${stop.zone}: standing in a zone the WORKER owns the monsters of (guard)`,
      arrived && world.zone === stop.zone && world.srv === true && world.n > 0,
      Object.assign({ srvZone, retried: !full }, world));
    if (!arrived || !world.srv || !world.n) { zoneNotes.push({ zone: stop.zone, world, srvZone }); continue; }
    zoneNotes.push({ zone: stop.zone, what: stop.what, arch: world.arch, alive: world.n });

    /* God mode BEFORE the first swing, not after: six rows is a couple of
       minutes with a monster standing on you, and a dead attacker's rows are
       zeros that say nothing about the weapon. */
    await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 });

    /* ── the control: does this number move on its own? ───────────────── */
    let ctrl = null;
    {
      const t0 = await readTarget(P);
      if (t0) {
        const before = t0.hp;
        const seen = [];
        for (let i = 0; i < 3; i++) {
          await P.page.waitForTimeout(SETTLE_MS);
          seen.push((await targetById(P, t0.id)).hp);
        }
        ctrl = { id: t0.id, before, seen, moved: seen.some((h) => h != null && h < before) };
        rec.ok(`${stop.zone}: an untouched monster's health does not fall on its own (control)`,
          !ctrl.moved, ctrl);
      }
    }

    for (const atk of pickRows('BT_HITREAL_ONLY', ATTACKS, 'key')) {
      const eq = await H.equipWeapon(P, atk.type, atk.stash, atk.slot);
      await P.page.waitForTimeout(900);
      /* ═══ IS THE SOCKET STILL UP? ═══
         Read before the row rather than inferred from its zeros.  See the
         keepalive in run() for what takes it down and why; the point of
         reading it HERE is that a logged-out client fires nothing, lands
         nothing, and reports it as six rows of a broken weapon. */
      const link = await H.readState(P, (S) => S._realtimeStatus || 'unknown');
      const row = { zone: stop.zone, key: atk.key, slot: atk.slot, eq: !!(eq && eq.ok), link, body: stop.body,
        fired: 0, fairs: 0, landed: 0, sent: 0, blast: 0, void: 0, neverFired: 0, neverWhy: [], dug: 0, covered: 0, inFront: 0,
        gaps: [], skipGaps: [], missed: [], desync: [], kills: 0, arch: null, empty: [], left: 0 };
      const reach = REACH[atk.slot];
      /* Attempts that could not be PLACED (out of the weapon's reach, nothing
         alive to shoot at) or that the monster burrowed under are void, and a
         row of five tries that voids three has measured two things.  So the
         row runs until it has TRIES FAIR attempts, with a hard ceiling so a
         zone that will not cooperate ends rather than hangs. */
      const rowUntil = Date.now() + ROW_BUDGET_MS;
      for (let i = 0; i < TRIES * 3 && row.fairs < TRIES && Date.now() < rowUntil; i++) {
        /* ═══ v2.3.3321: STILL IN THE ZONE? ═══
           placeAt walks toward the monster it picked, and a monster standing
           by the zone's way out takes the walk through it: the game does what
           a door does and the player is in the World View, where nothing
           lives.  One run spent ember's last two rows there, every attempt a
           void ("nothing to fight" -- emptyWhy found both the phone and the
           worker standing in worldview).  Walked back in through the doors,
           as the zone was reached the first time, and the attempt is void. */
        const zNow = await H.readState(P, (S) => S.currentZone).catch(() => null);
        if (zNow !== stop.zone) {
          row.void++; row.left++;
          await warp();
          await H.waitFor(P, (S) => S.currentZone, (z) => z === stop.zone,
            { timeout: 70000, label: `${stop.zone} again` }).catch(() => {});
          await populated(20000);
          await P.page.waitForTimeout(800);
          continue;
        }
        await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; });
        const pick = await waitForTarget(P, TARGET_WAIT_MS);
        if (!pick) {
          row.void++;
          if (row.empty.length < 3) row.empty.push(await emptyWhy(P, wsPort, id));   /* v2.3.3321 */
          continue;
        }
        /* Walk to this weapon's range of the monster we picked, then re-read
           it: the placer walks for real and both of us move while it does. */
        await placeAt(P, pick.id, reach);
        let sync = await resync(P, wsPort, id);
        if (!sync.ok && sync.why !== 'no server view') {
          /* The snap moved us, so the range this attempt was walked to is
             gone with it -- walk it again from where the worker agrees we
             are, and only give up if the second one will not take either. */
          await placeAt(P, pick.id, reach);
          sync = await resync(P, wsPort, id);
        }
        if (!sync.ok) { row.desync.push(sync); row.void++; continue; }
        /* Re-read the game's own lock rather than insisting on `pick`: the walk
           takes a second or two and the auto-target may legitimately have moved
           on (targeting.js).  Whatever it holds NOW is what the shot will fly
           at, so that is what gets measured -- and its gap is checked against
           this weapon's reach either way. */
        const g = await readTarget(P);
        if (!g || g.gap < reach.lo || g.gap > reach.hi || g.burrow === 'pile' || g.invuln) {
          /* Out of the weapon's reach, or a snow pile: a miss from here says
             nothing about hit detection, so it is not scored as one. */
          row.void++;
          row.skipGaps.push(g ? g.gap : null);
          continue;
        }
        /* ═══ v2.3.2701: BEHIND A ROCK IS NOT A MISS ═══
           Since v2.3.2699 a prop really stops an arrow or a bolt (frost has the
           rock ridge and its neighbours), so a ranged shot with one between us
           and the target is SUPPOSED to fall short.  The placer walks to the
           weapon's reach without looking at cover, and the first run after the
           change scored those as misses: every one of the frost bow, bow-special
           and magic-special misses had a rock on the line, by the game's own
           probe.  Void, like a burrow, and counted beside the row -- then step
           off that line so the next attempt is not walked back behind the same
           rock.  The game's question, not this file's arithmetic (TRAPS #35).
           Ranged rows only: the sword does not ask about props yet, so its
           attempts still count. */
        /* v2.3.3397: the bow asks its own sight, below.  The staff has none,
           so it asks the line its bolt is judged on: since v2.3.3206 every
           shot is judged at the shooter's BOOTS (projectiles.js `_goy`; a bolt
           has no grip offset, so its ground track is the drawn line carried
           straight down by `_gdy`), from there to the point under its aim, as
           far as the target's body.  The chest line alone missed it: frost's
           magic row lost a bolt (2026-10-18) with you just north of the rock
           ridge and the snowman at its face -- the chest line ended 2 px short
           of the ridge, the ground track ran into it a step from the boots,
           and the bolt burst on the rock before the tracker's first look
           (`ends: []`).  Both lines are asked, so nothing the old test
           called covered is scored now. */
        if (atk.slot === 'staff' && await P.page.evaluate((q) => {
          const S = window._gameState.current, z = S.currentZone;
          if (!window.__btAttackBlocked) return false;
          if (window.__btAttackBlocked(z, q.px, q.py, q.x, q.y)) return true;
          const gdy = typeof window.__hrGdy === 'number' ? window.__hrGdy
            : (typeof S._standInFootY === 'number' && S.player ? S._standInFootY - S.player.y : 52);
          const dx = q.x - q.px, dy = q.aimY - q.py, L = Math.hypot(dx, dy) || 1;
          const k = Math.max(0, L - q.r) / L;   /* where the bolt meets the body */
          return !!window.__btAttackBlocked(z, q.px, q.py + gdy, q.px + dx * k, q.py + gdy + dy * k);
        }, { ...g, r: stop.body || 0 })) {
          row.void++; row.covered++;
          await sidestep(P, g, true, false);
          continue;
        }
        row.arch = row.arch || g.arch;
        await aimAt(P, g);
        /* ═══ v2.3.3321: ...AND AGAIN, FROM WHERE THE BOW IS HELD NOW ═══
           aimAt measures the angle from the grip the sight cast from on its
           LAST frame, and turning to face the target moves the grip (the bow
           is held on the side you face): an angle taken from the old grip and
           flown from the new one passes beside the target by the grip's move,
           up to ~30 px -- with the monster stepping aside as well, a verdant
           row lost 2 of 5 arrows that way, flown their full length past it.
           Two frames for the renderer to place the bow and the sight to cast
           from it, then the same aim from there. */
        await P.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        /* ...at where the target is NOW: two frames on this box are a few
           hundred ms, and a fire goblin is 20-40 px on by then (aimed at where
           it was, ember's bow row could not fire 8 times in 15).  The shot is
           measured from here too: `g` becomes the point it was fired at. */
        {
          const cur = await targetById(P, g.id);
          if (cur && !cur.gone && cur.alive && cur.x != null) {
            const lift = g.aimY - g.y;
            g.x = cur.x; g.y = cur.y; g.aimY = cur.y + lift;
          }
        }
        await aimAt(P, g);
        /* ═══ v2.3.3397: THE BOW'S OWN SIGHT SAYS WHAT THE ARROW HITS FIRST ═══
           The covered test above asks about a line from the CHEST to the
           monster's feet.  Since v2.3.3206 a shot is judged at the shooter's
           BOOTS (projectiles.js: the drawn point carried back by the grip's
           offset and down to the boots), over the low things bar the one it is
           aimed at: another line, so a rock it missed stopped the arrow --
           frost's unexplained miss of 2026-10-18 ended in a prop 304 ms after
           it left (trackShot), and frost's bow special lost 13 of 15 attempts
           to the chest line.  The bow's sight is that very question, asked by
           the game every frame from the live grip (monsterCombat `_bowSight`:
           the monster's id, or `prop:<oi>`), so a bow row reads it once the
           aim has settled: a prop first is covered (void, and step aside),
           another monster first is void too -- that arrow lands, on it. */
        if (atk.slot === 'ranged') {
          const sight = await bowSightNow(P);
          if (sight && typeof sight.id === 'string' && sight.id.indexOf('prop:') === 0) {
            row.void++; row.covered++;
            await sidestep(P, g, true, true);
            continue;
          }
          if (sight && sight.id != null && sight.id !== g.id) { row.void++; row.inFront++; continue; }
        }
        const since = Date.now();
        const f = await fire(P, atk, g.id);
        if (f && f.ok) row.fired++; else { row.void++; row.neverFired++; if (f && f.diag) row.neverWhy.push(f.diag); continue; }
        if (f.at) { g.x = f.at.x; g.y = f.at.y; g.aimY = f.at.aimY; }   /* v2.3.3397: where it was when the shot left */
        await trackShot(P, g.id).catch(() => {});
        const after = await settle(P, g.id, g.hp, SETTLE_MS);
        const said = await sentFor(g.id, since);
        const landed = after.gone || !after.alive
          || (g.hp != null && after.hp != null && after.hp < g.hp);
        /* v2.3.3397: another monster stepped into the line and took the shot
           (the claim went to it: a frost row's "miss" of 2026-10-18 was
           sm-frost-0 hit instead) -- the hit test working on the wrong
           target, so void, as an arrow the sight saw land elsewhere is above */
        if (!landed && !after.dug) {
          const took = await shotEnd(P, g.id, since).catch(() => null);
          if (took && took.others && took.others.length) { row.void++; row.inFront++; continue; }
        }
        if (!landed && after.dug) {
          /* It burrowed under the shot.  A refusal the game is supposed to
             make, so it is not this weapon's miss -- and not silently dropped
             either: the count is printed beside the row. */
          row.void++; row.dug++;
          continue;
        }
        row.fairs++;
        row.sent += said.dmg; row.blast += said.blast;
        row.gaps.push(g.gap);
        if (after.gone || !after.alive) { row.landed++; row.kills++; }
        else if (landed) row.landed++;
        else {
          /* ═══ A MISS IS ONLY USEFUL IF IT SAYS WHY ═══
             Two facts, because they separate the two answers that matter.

             The WORKER's own view of the attacker: "the shot missed" and "the
             worker was looking at a player standing somewhere else" produce
             identical rows otherwise, and the second is a harness fault.

             And how far the TARGET travelled while the shot was in the air,
             split across and along the line of fire.  A monster that stepped
             most of its own body sideways got out of the way, which is a
             moving target behaving like one; a monster that barely moved and
             was still missed is a hit test to go and look at.  Without the
             number there is no way to tell those apart, and calling either
             one by the other's name is how a real defect gets shrugged off --
             or a working game gets "fixed". */
          const sp = await H.serverPlayer(wsPort, id).catch(() => null);
          const mdx = (after.x != null ? after.x : g.x) - g.x;
          const mdy = (after.y != null ? after.y : g.y) - g.y;
          const ang = Math.atan2(g.aimY - g.py, g.x - g.px);
          row.missed.push({ id: g.id, gap: g.gap, hp: g.hp, after: after.hp, said, via: g.via,
            /* along = toward or away from the shooter, across = sideways out
               of the shot.  Only `across` can dodge a projectile. */
            moved: Math.round(Math.hypot(mdx, mdy)),
            across: Math.round(Math.abs(-mdx * Math.sin(ang) + mdy * Math.cos(ang))),
            along: Math.round(mdx * Math.cos(ang) + mdy * Math.sin(ang)),
            srv: sp ? { zone: sp.zone, x: Math.round(sp.x), y: Math.round(sp.y) } : null,
            cli: { x: g.px, y: g.py },
            /* v2.3.3321: how long the settle waited, and whether it gave up
               at SETTLE_MAX_MS with a shot still in the air */
            waited: after.waited || null, cut: !!after.cut,
            /* v2.3.3397: where its shots ended, and any monster they hit
               instead -- beside where the target was when it was shot at
               and where it was after */
            tgt: { x: g.x, y: g.y, aimY: g.aimY, ax: after.x, ay: after.y },
            shot: await shotEnd(P, g.id, since).catch(() => null) });
        }
      }
      await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
      row.secs = Math.round((Date.now() - (rowUntil - ROW_BUDGET_MS)) / 1000);
      rows.push(row);
    }
  }

  console.log('\n    ── every weapon, against monsters the WORKER owns and moves ──');
  for (const z of zoneNotes) {
    console.log(`    ${z.zone}: ${z.what || '(unreachable)'}${z.arch ? '  [' + z.arch.join(', ') + ']' : ''}`);
  }
  console.log('\n    zone     attack          attempts  client sent  landed   rate   kills  gap px');
  for (const r of rows) {
    const gaps = r.gaps.length ? `${Math.min(...r.gaps)}-${Math.max(...r.gaps)}` : '-';
    console.log(`    ${r.zone.padEnd(8)} ${r.key.padEnd(15)} ${String(r.fairs).padStart(8)} `
      + `${String(r.sent + r.blast).padStart(12)} ${String(r.landed).padStart(7)}  `
      + `${(Math.round((r.landed / Math.max(1, r.fairs)) * 100) + '%').padStart(5)}  `
      + `${String(r.kills).padStart(6)}  ${gaps}  ${r.secs}s`
      + `${r.blast ? `   (+${r.blast} blast)` : ''}`
      + `${r.void ? `   (${r.void} void: ${r.dug} burrowed, ${r.covered} behind a prop, ${r.inFront ? `${r.inFront} with another monster first, ` : ''}${r.neverFired} never fired, `
        + `${r.left ? `${r.left} walked out of the zone, ` : ''}gaps ${JSON.stringify(r.skipGaps)})` : ''}`);
    if (r.missed.length) console.log(`      missed: ${JSON.stringify(r.missed)}`);
    if (r.neverWhy.length) console.log(`      never fired: ${JSON.stringify(r.neverWhy)}`);   /* v2.3.3397 */
    if (r.desync.length) console.log(`      the worker did not follow the walk ${r.desync.length}x: ${JSON.stringify(r.desync)}`);
  }
  console.log('');

  /* ── ASSERTIONS ──
     The same unarguable claim mp-hitmatrix makes, now against a target the
     worker owns: a monster the GAME has locked, aimed at by the game's own aim
     point, well inside the weapon's reach, cannot be missed five times out of
     five by a working hit test.  A miss here is a registry failure, not a
     balance question — which is what makes it assertable rather than
     printable. */
  for (const r of rows) {
    rec.ok(`${r.zone} ${r.key}: the weapon is equipped, and every attempt was fought at its reach (guard)`,
      r.eq && r.fairs === TRIES, r);
    rec.ok(`${r.zone} ${r.key}: the attacker was still logged in when the row ran (guard)`,
      r.link === 'connected', r);
    rec.ok(`${r.zone} ${r.key}: the worker agreed where the attacker was standing, every attempt (guard)`,
      r.desync.length === 0, r);
    /* ═══ WHAT THE SEND COUNT MAY AND MAY NOT BE ASSERTED ON ═══
       Not "every attempt sends one".  The client can land a hit through more
       than one message -- the bow special's arrow_blast carries a coordinate
       rather than a monster id, and an elemental hit leaves a server-side
       status that keeps ticking with nothing further on the wire -- so rows
       legitimately settle more attempts than they sent, and a run measured
       four sends against five landed hits on three separate rows.  Asserting
       a floor there fails working weapons.

       What IS sound, and is the defect class this file exists to catch: an
       attempt where the CLIENT registered a hit and the worker settled
       NOTHING.  That is damage silently dropped between the two, and it is
       exactly what a broken gate looks like -- v2.3.2435's first four-zone
       run showed it on three consecutive attempts (three orbs registered,
       health unmoved) and it turned out to be the worker holding a stale
       position for the attacker.  Every miss must therefore be a miss the
       client agrees with. */
    const swallowed = r.missed.filter((m) => m.said && (m.said.dmg > 0 || m.said.blast > 0));
    rec.ok(`${r.zone} ${r.key}: no attempt the client registered was dropped by the worker (${swallowed.length})`,
      swallowed.length === 0, { swallowed, sent: r.sent, blast: r.blast, fairs: r.fairs });
    /* ═══ 100%, OR A MISS THE TARGET VISIBLY GOT OUT OF THE WAY OF ═══
       Against mp-hitmatrix's pinned fixture the bar is simply 100%: a target
       that cannot move cannot dodge.  These monsters move, and a projectile
       fired at where one IS can arrive where it is NOT -- that is the game
       working, not the hit test failing, and asserting 100% here would fail a
       correct engine roughly once a run.

       So a miss is excused only when the target crossed the line of fire by at
       least its own body radius while the shot was in the air: it was
       somewhere else by the time the shot got there.  Measured across the shot
       axis rather than as raw distance, because a monster charging straight at
       the shooter closes fast and dodges nothing.  Anything else -- a miss on
       a target that stayed put, or any melee miss at all, since an arc is
       evaluated instantly and has nothing to outrun -- is unexplained and
       fails the row. */
    const dodged = (m) => r.slot !== 'melee' && m.across >= r.body;
    const unexplained = r.missed.filter((m) => !dodged(m));
    rec.ok(`${r.zone} ${r.key}: every attempt lands, or the target moved out of the shot `
      + `(${r.landed}/${r.fairs}${r.missed.length ? `, ${r.missed.length - unexplained.length} dodged` : ''})`,
      r.fairs > 0 && r.landed + r.missed.filter(dodged).length === r.fairs && unexplained.length === 0,
      Object.assign({ unexplained }, r));
  }

  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
