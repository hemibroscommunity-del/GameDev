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
const TARGET_WAIT_MS = 26000;   /* > the 18.75s monster respawn (RESPAWN_TIME) */

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
const ROSTER = [
  { zone: 'verdant', what: 'blue slimes (r=27)' },
  { zone: 'ember',   what: 'fire goblins (r=26)' },
  { zone: 'frost',   what: 'snowmen (r=32, and they burrow)' },
  { zone: 'sky',     what: 'mummies (r=40) that shed into skeletons (r=50)' },
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
const fire = (P, atk) => P.page.evaluate(({ sp, rg }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (sp) { try { F.specialAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  if (!rg) { try { F.swingAttack(); } catch (e) { return resolve({ err: String(e) }); } return resolve({ ok: true }); }
  const n0 = (S.arrows || []).length;
  S.autoAttack = true;
  const t0 = Date.now();
  const iv = setInterval(() => {
    if ((S.arrows || []).length > n0) { clearInterval(iv); S.autoAttack = false; resolve({ ok: true, shot: true }); }
    else if (Date.now() - t0 > 1500) { clearInterval(iv); S.autoAttack = false; resolve({ ok: false, why: 'never fired' }); }
  }, 16);
}), { sp: !!atk.special, rg: ranged(atk) });

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
  const usable = (m) => live(m) && m._burPhase !== 'pile' && !m._invulnerable;
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
  return { id: mid, gone: false, alive: !!m.alive, hp: m.curHp,
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
  const ang = Math.atan2(ay - S.player.y, ax - S.player.x);
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
    if (Date.now() - t0 > ms) return Object.assign(a, { dug });
    await P.page.waitForTimeout(120);
  }
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
     Shift, because it is real input to the window and nothing in the game. */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Shift').catch(() => {});
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
  }), { mid, since });

  const rows = [];
  const zoneNotes = [];

  for (const stop of ROSTER) {
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

    for (const atk of ATTACKS) {
      const eq = await H.equipWeapon(P, atk.type, atk.stash, atk.slot);
      await P.page.waitForTimeout(900);
      /* ═══ IS THE SOCKET STILL UP? ═══
         Read before the row rather than inferred from its zeros.  See the
         keepalive in run() for what takes it down and why; the point of
         reading it HERE is that a logged-out client fires nothing, lands
         nothing, and reports it as six rows of a broken weapon. */
      const link = await H.readState(P, (S) => S._realtimeStatus || 'unknown');
      const row = { zone: stop.zone, key: atk.key, eq: !!(eq && eq.ok), link,
        fired: 0, fairs: 0, landed: 0, sent: 0, blast: 0, void: 0, neverFired: 0, dug: 0,
        gaps: [], skipGaps: [], missed: [], desync: [], kills: 0, arch: null };
      const reach = REACH[atk.slot];
      /* Attempts that could not be PLACED (out of the weapon's reach, nothing
         alive to shoot at) or that the monster burrowed under are void, and a
         row of five tries that voids three has measured two things.  So the
         row runs until it has TRIES FAIR attempts, with a hard ceiling so a
         zone that will not cooperate ends rather than hangs. */
      for (let i = 0; i < TRIES * 3 && row.fairs < TRIES; i++) {
        await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; });
        const pick = await waitForTarget(P, TARGET_WAIT_MS);
        if (!pick) { row.void++; continue; }
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
        row.arch = row.arch || g.arch;
        await aimAt(P, g);
        const since = Date.now();
        const f = await fire(P, atk);
        if (f && f.ok) row.fired++; else { row.void++; row.neverFired++; continue; }
        const after = await settle(P, g.id, g.hp, SETTLE_MS);
        const said = await sentFor(g.id, since);
        const landed = after.gone || !after.alive
          || (g.hp != null && after.hp != null && after.hp < g.hp);
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
          /* A miss is recorded with the WORKER's own view of the attacker, so
             "the shot missed" and "the worker was looking at a player standing
             somewhere else" are never confused for one another again. */
          const sp = await H.serverPlayer(wsPort, id).catch(() => null);
          row.missed.push({ id: g.id, gap: g.gap, hp: g.hp, after: after.hp, said, via: g.via,
            srv: sp ? { zone: sp.zone, x: Math.round(sp.x), y: Math.round(sp.y) } : null,
            cli: { x: g.px, y: g.py } });
        }
      }
      await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
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
      + `${String(r.kills).padStart(6)}  ${gaps}`
      + `${r.blast ? `   (+${r.blast} blast)` : ''}`
      + `${r.void ? `   (${r.void} void: ${r.dug} burrowed, ${r.neverFired} never fired, gaps ${JSON.stringify(r.skipGaps)})` : ''}`);
    if (r.missed.length) console.log(`      missed: ${JSON.stringify(r.missed)}`);
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
    rec.ok(`${r.zone} ${r.key}: the client registers every attempt as a hit (${r.sent + r.blast}/${r.fairs})`,
      r.fairs > 0 && r.sent + r.blast >= r.fairs, r);
    rec.ok(`${r.zone} ${r.key}: the WORKER settles every attempt (${r.landed}/${r.fairs})`,
      r.fairs > 0 && r.landed === r.fairs, r);
  }

  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
