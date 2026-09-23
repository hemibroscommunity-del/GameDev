/* ═══ A MAGIC ORB REACHES AS FAR AS AN ARROW (v2.3.2387) ═══
 *
 * Owner: "extend magic projectile range to what it was before (should be same
 * as arrow).  It just needs to travel further."
 *
 * ── WHY THE EXISTING COVERAGE SAID NOTHING ──
 * mp-orbline measures the magic special end to end -- three orbs, one ray, in
 * succession, each landing its own hit -- and it was green throughout. It never
 * looks at how FAR any of them gets, because distance was never the question it
 * was written to ask. Nothing else in the suite reads a projectile's reach at
 * all, which is how the staff sat at half the bow's for ~1000 versions.
 *
 * ── THE THING THIS PINS ──
 * The two weapons are bounded by DIFFERENT MECHANISMS in projectiles.js: the
 * arrow plants at 675 px or the screen edge, and the staff is EXCLUDED from
 * that guard (`if (!a.isStaff && _released)`), so an orb's only limit is
 * running out of `life`. That asymmetry is deliberate and staying, which means
 * nothing structural stops the two drifting apart again -- only a number does.
 * So this file measures the number, from four independent directions.
 *
 * ── AND IT MEASURES DISTANCE, NOT THE CONSTANT ──
 * Asserting STAFF_LIFE === 135 would pass on a build where projectiles.js had
 * stopped reading it. Section 2 flies a real orb in a real client and watches
 * `dist` climb, which is the observable a player actually experiences.
 */
import * as H from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAFF_RANGE_PX, STAFF_LIFE, STAFF_ORB_SPEED_PX } from '../../../src/data/gameSystems.js';
import { WORLD_ZOOM, TILE } from '../../../src/data/constants.js';

const PHONE = { width: 390, height: 844 };

/* The dev warp, the same one mp-lockchip drives: the zone matters to F2 (only
   Desert Winds spawns stalkers, and only there are they re-skinned as the
   transforming mummy), and walking there would be most of the run. */
const zoneOf = (P) => H.readState(P, (S) => S.currentZone);
const warpTo = async (P, zone, tries = 45) => {
  await P.page.evaluate((z) => {
    const S = window._gameState && window._gameState.current;
    if (S) S._devWarp = { to: z, legs: 0, t: Date.now(), nextAt: 0 };
  }, zone);
  for (let i = 0; i < tries; i++) {
    await P.page.waitForTimeout(1000);
    if ((await zoneOf(P)) === zone) return true;
  }
  return false;
};

/* The screen corner in world px, on the reference phone in a combat zone --
   the distance an orb has to clear to reach a monster you can SEE. Derived
   from worldViewport's own rule rather than hardcoded, so a WORLD_ZOOM change
   moves it. */
const cornerPx = (cssW, cssH, WORLD_ZOOM, TILE) => {
  const scale = Math.max(
    0.75 / WORLD_ZOOM, cssW / Math.round(390 * WORLD_ZOOM),
    cssW / (32 * TILE), cssH / (32 * TILE), 0.50,
  );
  const W = cssW / scale, Hh = cssH / scale;
  return Math.hypot(W / 2 - 24, Hh / 2 - 24);
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* ════════════ 1. THE ARITHMETIC, AT THE SOURCE ════════════ */
  rec.ok('the staff range constant is the arrow\'s own 675px cap',
    STAFF_RANGE_PX === 675, { STAFF_RANGE_PX });
  rec.ok('...and life x speed lands exactly on it (no rounding drift)',
    STAFF_LIFE * STAFF_ORB_SPEED_PX === STAFF_RANGE_PX,
    { STAFF_LIFE, STAFF_ORB_SPEED_PX, product: STAFF_LIFE * STAFF_ORB_SPEED_PX });
  rec.ok('...which is very nearly DOUBLE the 340px it shipped at',
    STAFF_RANGE_PX / 340 > 1.9, { was: 340, now: STAFF_RANGE_PX });

  const P = await H.newPlayer(browser, { name: 'Mage', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* The corner an orb has to clear, computed from the client's OWN constants
     so this cannot drift from the game. */
  const corner = cornerPx(390, 615, WORLD_ZOOM, TILE);
  console.log('    screen corner on a 390x844 phone: ' + corner.toFixed(0) + ' px');
  rec.ok('an orb now clears the screen CORNER (it used to die short of it)',
    STAFF_RANGE_PX > corner && 340 < corner,
    { corner: +corner.toFixed(0), was: 340, now: STAFF_RANGE_PX, WORLD_ZOOM });

  /* ════════════ 2. A REAL ORB, FLYING ════════════
     The observable a player feels. Fire a basic staff shot and watch `dist`
     climb until the orb is gone; the peak is the reach. */
  const flight = await P.page.evaluate(({ LIFE }) => new Promise((resolve) => {
    const S = window._gameState.current, R = S.rpg;
    R.activeSlot = 'staff';
    R.mana = R.maxMana = 500;
    S.arrows = [];
    S._aimAngle = 0;
    /* Spawned with the SHIPPED constant, in the shape monsterCombat uses.
       What this section measures is the projectile SIM -- that 135 ticks of
       life actually carries an orb 675 px, which is a property of
       projectiles.js and not of the number. That the GAME sets that life is a
       different claim, covered by section 3 (which fires the real special
       through the real bridge) and section 5 (which reads all four sites). */
    S.arrows.push({
      ang: 0, dist: 14, dmg: 1, life: LIFE, maxLife: LIFE,
      hitIds: new Set(), isStaff: true,
    });
    /* rAF, not setInterval: the sim advances on the render frame, so polling
       on any other clock reads a stale dist and undercounts the last hop. */
    let peak = 0, samples = 0;
    const step = () => {
      const a = (S.arrows || [])[0];
      samples++;
      if (a && typeof a.dist === 'number') peak = Math.max(peak, a.dist);
      if (!a || samples > 600) { resolve({ peak: Math.round(peak), samples, gone: !a }); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { LIFE: STAFF_LIFE });
  console.log('    flew: ' + JSON.stringify(flight));
  rec.ok('the projectile sim carries an orb its full life in a real client (guard)',
    flight.samples > 1, flight);
  /* One frame of slack: the last tick can overshoot or fall just short. */
  /* Tolerance is four frames, and it is asymmetric on purpose: the orb is
     REMOVED on the frame its life expires, so the last dist a sampler can
     observe is always a hop or three short of the true reach. What this has to
     separate is 675 from 340, and 640 does that with a wide margin. */
  rec.ok('...and STAFF_LIFE ticks of it is 675px of travel, not 340',
    flight.peak >= STAFF_RANGE_PX - STAFF_ORB_SPEED_PX * 4 && flight.peak <= STAFF_RANGE_PX + STAFF_ORB_SPEED_PX,
    { peak: flight.peak, want: STAFF_RANGE_PX, floor: STAFF_RANGE_PX - STAFF_ORB_SPEED_PX * 4 });

  /* ════════════ 3. THE SPECIAL GOES WITH IT ════════════
     Three orbs, each solving its life from the SAME reach, so the distance
     does not depend on which orb you are. That is this file's claim and it is
     unchanged.

     ═══ v2.3.2464: WHAT THE SPEEDS ARE IS NO LONGER THIS FILE'S BUSINESS ═══
     This block used to assert the three flew at three DIFFERENT speeds --
     v2.3.2262's fast/medium/slow, an owner request. The owner has since
     replaced it: "I want magic special to change to 3 evenly spaced out orbs.
     Maybe like one every .2 seconds until it hits the 3rd orb." Evenly spaced
     takes ONE speed; three speeds keep opening the gaps for the whole flight,
     which is a fan rather than a line.

     So the assertion is inverted rather than deleted, because the direction is
     load-bearing either way: one speed is now the thing that must not silently
     regress. The SPACING itself -- the 200ms launch step, and that the gaps
     hold as the orbs travel -- belongs to mp-solospecial, which measures it in
     flight. Here it is only the range that is at stake, and with one speed
     there is one life and all three plainly land on STAFF_RANGE_PX. */
  const orbs = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    /* specialAttack REFUSES without a real weapon in the slot -- getActiveWeapon
       returns nothing and it bails silently, which is what an empty orb list
       means. Minted from the game's own tier table (mp-orbline's shape), never
       a literal tierMult. */
    const t = (F.WOODWORKING_TIERS || {}).pine;
    if (t) R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
    R.activeSlot = 'staff'; R.mana = R.maxMana = 500; S._lastSwipe = 0;
    S.arrows = []; S._aimAngle = 0;
    if (!F.specialAttack || !R.staffWeapon) return null;
    F.specialAttack();
    return (S.arrows || []).filter((a) => a.isSpecial && a.isStaff)
      .map((a) => ({ life: a.life, speedPx: a.speedPx, reach: Math.round(a.life * a.speedPx), big: !!a.big }));
  });
  console.log('    special orbs: ' + JSON.stringify(orbs));
  /* v2.3.2715: against a worker with caps.bigOrb the special is ONE big bolt,
     and it must reach exactly as far as the orbs it replaced. */
  if (orbs && orbs.length === 1 && orbs[0].big) {
    rec.ok('the one-bolt special reaches the same 675px the orbs did',
      Math.abs(orbs[0].reach - STAFF_RANGE_PX) <= 3, orbs);
  } else if (orbs && orbs.length === 3) {
    rec.ok('all three special orbs reach the same 675px',
      orbs.every((o) => Math.abs(o.reach - STAFF_RANGE_PX) <= 3), orbs);
    rec.ok('...and all three fly at ONE speed, so the volley stays evenly spaced',
      new Set(orbs.map((o) => o.speedPx)).size === 1, orbs.map((o) => o.speedPx));
  } else {
    rec.skip('all three special orbs reach the same 675px', 'specialAttack bridge absent');
  }

  /* ════════════ 4. THE PEER MIRROR ════════════
     What YOU see of someone ELSE's orb. This is the site a range change
     forgets: it lives in networking/gameEvents.js, not in the combat files, so
     a stale value there kills a remote caster's orb at 340px on your screen
     while it flies 675 on theirs -- a desync nobody would trace back to a
     range retune.

     NOT DRIVEN LIVE, and deliberately not faked. processGameEvent is module
     scope inside the bundle with no window handle, so the inbound switch
     cannot be reached from the page; the honest options were a second real
     client firing a real staff (a much larger fixture than this change needs)
     or reading the source. Section 5 does the latter and covers all four
     sites at once. An earlier draft of this file invented a
     `window.__btGameEvents` to poke -- precheck's qa-handles gate rejected it,
     correctly: a test that reads a handle nothing defines is not testing
     anything. */

  /* ════════════ 5. NO STRAY LITERAL LEFT BEHIND ════════════
     Four modules spawn staff projectiles and they live in four different
     places -- combat, dodge, the special, and the peer mirror. The whole point
     of the shared constant is that a future retune cannot half-land, so this
     asserts the old literal is GONE rather than trusting that it is. Read off
     disk, because a bundled client cannot tell you which module a number came
     from. */
  const SITES = [
    'src/game/monsterCombat.js',
    'src/game/dodge.js',
    'src/game/playerActions.js',
    'src/networking/gameEvents.js',
  ];
  const srcOf = (f) => readFileSync(join(H.REPO, f), 'utf8');
  const strays = SITES.filter((f) => /\?\s*68\s*:/.test(srcOf(f)));
  rec.ok('no spawn site still carries the old 68-tick literal', strays.length === 0, { strays });
  const unwired = SITES.filter((f) => !/STAFF_LIFE|STAFF_RANGE_PX/.test(srcOf(f)));
  rec.ok('...and all four read the shared constant', unwired.length === 0, { unwired });

  /* ════════════ 6. DESERT WINDS, WITH REAL MONSTERS ════════════
     Owner (F2): magic orbs vanish early in Desert Winds.

     EVERY SECTION ABOVE FIRES INTO EMPTY AIR.  That is on purpose -- they
     measure the range mechanism -- but it means none of them can see the
     reported bug, which is about what happens when there is something in the
     way.  The triage says plainly that this cannot be judged from code
     (§2.5: "Staff orbs vanishing in Desert Winds -- cannot judge from code"),
     and names two inferred suspects: the orb dying on its FIRST hit against a
     nearer or mid-transform mummy (orbs do not pierce), or an impact at the
     skeleton's body centre reading as a short flight.

     So this flies real orbs in the real zone and records what actually
     happens.  Desert Winds is where it matters because stalkers spawn only
     here and are re-skinned as the mummy, which transforms to a skeleton on
     its first point of damage -- so the archetype under an orb can change
     mid-flight, which is a thing no other zone does. */
  /* The per-zone quest gate and the Mayor gate both bounce a fresh character
     back from a spoke silently, which is what driveDevWarp's own failure
     message tells you to fix -- so clear them the way mp-lockchip does before
     asking for the warp. */
  const myId = await H.readState(P, (S) => S.myId);
  await fetch('http://127.0.0.1:' + wsPort + '/api/admin/dev/quests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId }),
  }).catch(() => {});
  await P.page.waitForTimeout(1200);
  const skyThere = await warpTo(P, 'sky');
  rec.ok('we can reach Desert Winds (guard)', skyThere, { zone: await zoneOf(P) });
  if (skyThere) {
    /* Real monsters, from the worker, not seeded: the whole question is what
       the zone's own population does to an orb. */
    let pop = 0;
    for (let i = 0; i < 40; i++) {
      pop = await P.page.evaluate(() => (window._gameState.current.monsters || []).length);
      if (pop > 0) break;
      await P.page.waitForTimeout(1000);
    }
    rec.ok(`the zone has its own monsters to fly through (guard: ${pop})`, pop > 0, { pop });

    /* FIRE THE REAL WAY.  Sections 2 and 3 push a projectile or call the
       special bridge; this holds the attack the way a thumb does and lets
       monsterCombat's own fire site spawn the orb, because a bug about what
       the game does to its orbs cannot be reproduced by hand-rolling one. */
    const flights = await P.page.evaluate(() => new Promise((resolve) => {
      const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
      const t = (F.WOODWORKING_TIERS || {}).pine;
      if (t) R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine',
        name: 'Pine Staff', tier: 'common' };
      R.activeSlot = 'staff'; R.mana = R.maxMana = 999;
      S.arrows = [];
      S._shieldUp = false;
      /* Aim at the FARTHEST monster in the zone and hold the attack: that is
         the shape of the complaint -- a shot at something across the sand. */
      const ms = (S.monsters || []).filter((m) => m && m.alive !== false);
      let far = null, fd = -1;
      for (const m of ms) {
        const d = Math.hypot(m.x - S.player.x, m.y - S.player.y);
        if (d > fd) { fd = d; far = m; }
      }
      if (!far) { resolve({ err: 'no monster' }); return; }
      const ang = Math.atan2((far.y - 48) - S.player.y, far.x - S.player.x);
      S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
      S.lockedTarget = { type: 'monster', id: far.id, ref: far, src: 'tap', at: Date.now() };
      S.autoAttack = true;

      /* Track every orb from spawn to disappearance, and note the state of the
         world at the moment it goes: how far it got, how much life was left,
         and what the nearest monster to it was.  A life-expired orb and an orb
         that hit something are the two candidate causes, and they are told
         apart by exactly this: life at death, and whether anything was close
         enough to be hit. */
      const seen = new Map();
      const done = [];
      const t0 = Date.now();
      const step = () => {
        const live = (S.arrows || []).filter((a) => a.isStaff);
        const liveSet = new Set(live);
        for (const a of live) {
          if (!seen.has(a)) seen.set(a, { peak: 0, life0: a.life, special: !!a.isSpecial });
          const rec2 = seen.get(a);
          rec2.peak = Math.max(rec2.peak, a.dist || 0);
          rec2.life = a.life;
          rec2.x = a._renderX; rec2.y = a._renderY;
          rec2.hits = a.hitIds ? a.hitIds.size : 0;
        }
        for (const [a, r] of seen) {
          if (liveSet.has(a)) continue;
          /* GONE THIS FRAME -- and the orb OBJECT is still in hand, because
             this Map holds a reference to it and projectiles.js only dropped
             it from S.arrows.  That is the difference between guessing and
             knowing: the hit and the removal happen in the SAME frame
             (`if (hit && !a.pierce) return false`), so a sampler that reads
             hitIds off the previous frame's snapshot always sees zero and
             every death looks like life expiry.  Read off the corpse instead. */
          const hitIds = a.hitIds ? Array.from(a.hitIds) : [];
          const lifeAtDeath = +(a.life || 0).toFixed(1);
          const ex = a._renderX != null ? a._renderX : r.x;
          const ey = a._renderY != null ? a._renderY : r.y;
          let near = null, nd = 1e9;
          for (const m of (S.monsters || [])) {
            if (!m || m.alive === false) continue;
            const off = (window._gameFns && window._gameFns.monsterBodyOffsetY)
              ? window._gameFns.monsterBodyOffsetY(m.arch || m.archetype || m.type) : 0;
            const mx = m.renderX != null ? m.renderX : m.x;
            const my = (m.renderY != null ? m.renderY : m.y) - off;
            const d = Math.hypot(mx - (ex || 0), my - (ey || 0));
            if (d < nd) { nd = d; near = m; }
          }
          const victim = hitIds.length
            ? (S.monsters || []).find((m) => m && m.id === hitIds[hitIds.length - 1]) : null;
          /* WHERE THE IMPACT WAS DRAWN, against where the orb actually died.
             The hit test is a circle at the monster's BODY CENTRE
             (renderY - monsterBodyOffsetY: 48 on a mummy, 60 on a skeleton),
             so an orb ends its flight at chest height -- and Desert Winds is
             made of exactly those two shapes.  If the crash ring is spawned
             anywhere else, the orb disappears in one place and the only
             feedback appears in another, which is what "it vanished" would
             look like from the outside. */
          const ring = (S._impactRings || [])[(S._impactRings || []).length - 1] || null;
          done.push({
            fxDy: (ring && ey != null) ? Math.round(ring.y - ey) : null,
            fxDx: (ring && ex != null) ? Math.round(ring.x - ex) : null,
            /* THE CAUSE, named rather than inferred: life ran out, or something
               was hit and a non-piercing orb died on it. */
            why: lifeAtDeath <= 0 ? 'life' : (hitIds.length ? 'hit' : 'other'),
            dist: Math.round(a.dist != null ? a.dist : r.peak),
            lifeAtDeath, life0: r.life0, special: r.special,
            hitCount: hitIds.length,
            victimArch: victim ? (victim.arch || victim.archetype || victim.type) : null,
            victimHp: victim ? victim.curHp : null,
            victimD: victim ? Math.round(Math.hypot(
              (victim.renderX != null ? victim.renderX : victim.x) - S.player.x,
              (victim.renderY != null ? victim.renderY : victim.y) - S.player.y)) : null,
            /* The orb's END POINT to the victim's BODY CENTRE -- the quantity
               the hit test itself works in.  Comparing the orb's `dist` to the
               victim's distance from the player instead looks like the same
               claim and is not: `dist` is measured from where the shot was
               RELEASED and the victim's distance from where the player is NOW,
               and in this zone the player is being chased the whole time, so
               the two drift apart by however far he was pushed. */
            victimGap: victim ? Math.round(Math.hypot(
              (victim.renderX != null ? victim.renderX : victim.x) - (ex || 0),
              ((victim.renderY != null ? victim.renderY : victim.y)
                - ((window._gameFns && window._gameFns.monsterBodyOffsetY)
                  ? window._gameFns.monsterBodyOffsetY(victim.arch || victim.archetype || victim.type) : 0))
              - (ey || 0))) : null,
            aimedAtD: Math.round(fd),
            nearestD: Math.round(nd),
            nearestArch: near ? (near.arch || near.archetype || near.type) : null,
          });
          seen.delete(a);
        }
        if (done.length >= 6 || Date.now() - t0 > 12000) {
          S.autoAttack = false;
          resolve({ done, waited: Date.now() - t0, monsters: (S.monsters || []).length });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
    console.log('    sky flights: ' + JSON.stringify(flights, null, 1));
    const done = (flights && flights.done) || [];
    rec.ok(`orbs flew and ended in Desert Winds (guard: ${done.length} tracked)`,
      done.length >= 3, { waited: flights && flights.waited, monsters: flights && flights.monsters });

    /* ═══ THE FINDING: NOTHING VANISHES -- THE ORBS ARE HITTING ═══
       Every orb in every run ended with `why: 'hit'`, one id in hitIds, and a
       victim standing at very nearly the orb's own flight distance -- a mummy
       or a skeleton that had walked into the line, most often the one charging
       the player.  Orbs do not pierce, so an orb that meets something dies on
       it.  That is the designed behaviour and it is what the owner is seeing.

       Asserted rather than merely logged, because the OPPOSITE finding -- an
       orb dying in open air with life left -- is the actual range bug, and this
       is the line that would report it.  A death with life remaining and
       nothing hit is what "vanishing" would have to look like. */
    const orphans = done.filter((d) => d.why === 'other');
    rec.ok(`no orb died in open air with life to spare (the "vanishing" claim): ${orphans.length} such`,
      orphans.length === 0, orphans);
    const hits = done.filter((d) => d.why === 'hit');
    /* The bound is the biggest hit circle in this zone with room to spare: the
       staff's radius is 40 on a mummy and 50 on a skeleton (x staffAoeMult),
       plus the orb's own capsule, and the victim keeps walking between the
       frame the orb died on and the frame this samples.  What it has to rule
       out is an orb ending in open sand, which would be hundreds of px. */
    /* NOT `hits.length > 0`.  How many of six orbs get intercepted depends on
       where the worker spawned six monsters and which way they happened to be
       walking -- observed runs have ranged from all six to none -- and a test
       whose colour is decided by that is a coin flip, not a test.  This says
       only that every interception that DID happen ended on its victim.  The
       deterministic pin for the fix is the aimed shot below. */
    rec.ok(`...and every interception ended ON the monster it hit, not in open sand (${hits.length} of ${done.length} were hits)`,
      hits.every((d) => d.victimGap != null && d.victimGap <= 110),
      hits.map((d) => ({ gap: d.victimGap, arch: d.victimArch, dist: d.dist })));

    /* ═══ THE DEFECT: THE CRASH WAS DRAWN SOMEWHERE ELSE ═══
       The hit test is a circle at the monster's BODY CENTRE (48 above the feet
       on a mummy, 60 on a skeleton) and the crash ring was spawned at `m.x,
       m.y` -- the feet.  Measured before the fix, over six flights: 22-37 px
       below and 23-42 px to the side of where the orb actually went out, on a
       zone whose monsters are drawn 120 px tall, so the ring flashed behind
       the sprite while the orb winked out in mid-air.  That gap IS the body
       offset, which is why only Desert Winds -- the mummy/skeleton zone --
       reads as "vanishing" and a slime zone does not.

       The bound is 12px rather than 0 because the monster keeps walking
       between the frame the orb died on and the frame this samples, and the
       ring is a world position that does not follow it. */
    const withFx = done.filter((d) => d.why === 'hit' && d.fxDy != null);
    if (withFx.length) {
      const worst = withFx.reduce((w, d) => Math.max(w, Math.hypot(d.fxDx, d.fxDy)), 0);
      console.log('    worst crash-to-orb gap: ' + Math.round(worst) + 'px');
      rec.ok(`the orb's crash is drawn where the orb died, not at the monster's feet (worst gap ${Math.round(worst)}px)`,
        worst <= 12, withFx.map((d) => ({ dx: d.fxDx, dy: d.fxDy, arch: d.victimArch })));
    } else {
      rec.skip("the orb's crash is drawn where the orb died", 'no hit carried an impact ring');
    }

    /* ═══ THE AIMED SHOT: THE FIX, PINNED RATHER THAN OBSERVED ═══
       The pass above is the REPRODUCTION -- it records what the zone does to a
       held attack -- and it cannot be relied on to produce an interception on
       any given run.  So the crash-position fix gets a shot that is aimed on
       purpose: straight at a live mummy or skeleton in this zone, from wherever
       the player is standing.  Those are the two shapes whose body offsets (48
       and 60) are the whole of the defect, and they are the only two shapes
       Desert Winds contains. */
    /* RETRIED, and not because the aim is approximate for its own sake: an orb
       does not start at the player's centre (it leaves the staff grip) and the
       target is walking, so a line drawn from S.player to where a monster was
       when the shot left can miss a 40px circle 300px away.  Rather than
       reimplement the grip offset here -- a test that recomputes the game's own
       geometry is asserting against its own copy of it -- each attempt simply
       re-aims at whatever is nearest NOW.  The monsters in this zone charge the
       player, so successive attempts are fired at shorter range and the
       angular tolerance grows until one connects. */
    let aimed = null;
    for (let shot = 0; shot < 6; shot++) {
      aimed = await P.page.evaluate(() => new Promise((resolve) => {
      const S = window._gameState.current, F = window._gameFns || {};
      const offOf = (m) => (F.monsterBodyOffsetY
        ? F.monsterBodyOffsetY(m.arch || m.archetype || m.type) : 0);
      S.autoAttack = false; S.arrows = []; S._impactRings = [];
      const ms = (S.monsters || []).filter((m) => m && m.alive !== false);
      let tgt = null, td = 1e9;
      for (const m of ms) {
        const d = Math.hypot(m.x - S.player.x, m.y - S.player.y);
        if (d < td) { td = d; tgt = m; }
      }
      if (!tgt) { resolve({ err: 'no monster' }); return; }
      const tx = tgt.renderX != null ? tgt.renderX : tgt.x;
      const ty = (tgt.renderY != null ? tgt.renderY : tgt.y) - offOf(tgt);
      const ang = Math.atan2(ty - S.player.y, tx - S.player.x);
      const a = { ang, dist: 14, dmg: 1, life: 135, maxLife: 135,
        hitIds: new Set(), isStaff: true };
      S.arrows.push(a);
      const arch = tgt.arch || tgt.archetype || tgt.type;
      let n = 0;
      const step = () => {
        n++;
        if (!(S.arrows || []).includes(a) || n > 400) {
          const ring = (S._impactRings || [])[0] || null;
          const m2 = (S.monsters || []).find((x) => x && x.id === tgt.id);
          resolve({
            arch, startD: Math.round(td), n,
            why: (a.life <= 0) ? 'life' : (a.hitIds.size ? 'hit' : 'other'),
            dist: Math.round(a.dist),
            bodyOff: offOf(tgt),
            /* The two numbers the fix is about: how far the crash was drawn
               from where the orb actually went out. */
            fxDx: ring ? Math.round(ring.x - a._renderX) : null,
            fxDy: ring ? Math.round(ring.y - a._renderY) : null,
            rings: (S._impactRings || []).length,
            victimGap: m2 ? Math.round(Math.hypot(
              (m2.renderX != null ? m2.renderX : m2.x) - a._renderX,
              ((m2.renderY != null ? m2.renderY : m2.y) - offOf(m2)) - a._renderY)) : null,
          });
          return;
        }
        requestAnimationFrame(step);
      };
        requestAnimationFrame(step);
      }));
      console.log(`    aimed shot ${shot + 1}: ` + JSON.stringify(aimed));
      if (aimed && aimed.why === 'hit') break;
      await P.page.waitForTimeout(500);
    }
    if (aimed && aimed.why === 'hit') {
      rec.ok(`an orb aimed at a ${aimed.arch} ${aimed.startD}px away ends ON it (gap ${aimed.victimGap}px)`,
        aimed.victimGap != null && aimed.victimGap <= 110, aimed);
      /* THE HEADLINE.  Before the fix this gap was the monster's body offset --
         the crash was spawned at m.x/m.y, the FEET, while the hit test had just
         fired against a circle at the body centre 48 or 60px above them.  The
         orb winked out at chest height and the ring flashed at the ankles of a
         120px sprite that covered it.  Two world px of slack for the sampler
         catching the monster mid-step. */
      rec.ok(`...and its crash is drawn AT the orb, not ${aimed.bodyOff}px down at the ${aimed.arch}'s feet (offset ${aimed.fxDx},${aimed.fxDy})`,
        aimed.fxDx != null && Math.hypot(aimed.fxDx, aimed.fxDy) <= 2, aimed);
      rec.ok('...and the crash really is drawn (two rings, the outer flash and the inner pulse)',
        aimed.rings >= 2, aimed);
    } else {
      rec.skip('an orb aimed at a live mummy or skeleton ends on it',
        `the aimed shot did not connect (why: ${aimed && aimed.why})`);
    }

    /* ═══ AND THE CONTROL: THE ZONE ITSELF DOES NOT SHORTEN AN ORB ═══
       The whole reason F2 is a reproduction job and not a fix-first one is
       that "orbs vanish in Desert Winds" could have been the zone doing
       something to them.  Fired into empty sand, away from every monster, an
       orb here goes exactly as far as it does anywhere else -- so the range
       mechanism is sound and the interception above is the whole story. */
    /* RETRIED, because a clear line is not something this scenario can demand
       of a live zone: six monsters converge on the player the whole time, and
       the first attempt was intercepted at 359px by one that walked into a
       corridor which was 112 degrees clear when the shot was aimed.  Each
       attempt re-aims at the widest gap available AT THAT MOMENT; an attempt
       that gets hit is discarded rather than asserted on, because an
       intercepted shot cannot answer the question this control is asking. */
    let openAir = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      openAir = await P.page.evaluate(({ LIFE }) => new Promise((resolve) => {
      const S = window._gameState.current;
      S.autoAttack = false; S.lockedTarget = null; S.arrows = [];
      /* Away from every monster: take the direction with the largest angular
         gap to the nearest one rather than assuming any compass point is
         clear -- the spawn placement is the worker's, not ours. */
      let best = 0, bestGap = -1;
      for (let deg = 0; deg < 360; deg += 5) {
        const ang = (deg * Math.PI) / 180;
        let worst = 1e9;
        for (const m of (S.monsters || [])) {
          if (!m || m.alive === false) continue;
          const d = Math.abs(Math.atan2(
            Math.sin(Math.atan2(m.y - S.player.y, m.x - S.player.x) - ang),
            Math.cos(Math.atan2(m.y - S.player.y, m.x - S.player.x) - ang)));
          worst = Math.min(worst, d);
        }
        if (worst > bestGap) { bestGap = worst; best = ang; }
      }
      S.arrows.push({ ang: best, dist: 14, dmg: 1, life: LIFE, maxLife: LIFE,
        hitIds: new Set(), isStaff: true });
      const a0 = S.arrows[0];
      let peak = 0, n = 0;
      const step = () => {
        n++;
        if (typeof a0.dist === 'number') peak = Math.max(peak, a0.dist);
        if (!(S.arrows || []).includes(a0) || n > 600) {
          resolve({ peak: Math.round(peak), hit: a0.hitIds ? a0.hitIds.size : 0,
            lifeLeft: +(a0.life || 0).toFixed(1), gapDeg: Math.round((bestGap * 180) / Math.PI) });
          return;
        }
        requestAnimationFrame(step);
      };
        requestAnimationFrame(step);
      }), { LIFE: STAFF_LIFE });
      console.log(`    open-air attempt ${attempt + 1}: ` + JSON.stringify(openAir));
      if (openAir && openAir.hit === 0) break;
      await P.page.waitForTimeout(400);
    }
    if (openAir.hit === 0) {
      rec.ok(`an orb fired into open sand here still goes the full 675px (${openAir.peak}px)`,
        openAir.peak >= STAFF_RANGE_PX - STAFF_ORB_SPEED_PX * 4, openAir);
    } else {
      rec.skip('an orb fired into open sand here still goes the full 675px',
        'no clear line: the zone population boxed the shot in');
    }
  }

  await P.ctx.close().catch(() => {});
}
