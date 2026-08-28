/* A LOCKED-ON BOW SHOT HAS TO ACTUALLY HIT (v2.3.1979).
 *
 * Owner: "Tap to lock on enemy sometimes does not hit the target.  I was
 * locked on to a blue slime shooting with bow and the arrows were on a flight
 * path that wasn't targeted at its center and flew beside it without damaging
 * it."
 *
 * ── WHY A SCENARIO AND NOT AN EYEBALL ──
 * "Sometimes" is the tell.  The miss is geometric, not random: the arrow's
 * flight line is PARALLEL to the line that would hit, offset by however far
 * the bow grip sits from the player's feet.  That offset is fixed, so whether
 * a given shot misses depends on how much of it lies perpendicular to the shot
 * — i.e. on the facing — and on how big the target is.  A human sees
 * "sometimes"; a measurement sees a constant.
 *
 * MEASURED HERE, on the code before the fix: the flight line passed 9.4, 11.2,
 * 17.1, 17.1 and 32.0 px to the side of the slime's hit centre on five
 * headings, against a 27 px body.  Four connected anyway.  The 32 px one drew
 * no blood at all.  That is the whole bug report, in numbers.
 *
 * ── WHY "PERPENDICULAR OFFSET" AND NOT "CLOSEST APPROACH" ──
 * The obvious metric — how close did the arrow get — cannot tell a hit from a
 * miss, because the hit-test DELETES the arrow the moment it comes inside the
 * radius.  The closest position anyone can sample is therefore the radius
 * itself, and the first draft of this scenario duly reported ~28px for hits
 * and misses alike.  What separates them is the flight LINE: the perpendicular
 * distance from the target's hit centre to the ray the arrow travels along.
 * Zero is dead centre, and it stays meaningful whether the arrow survives to
 * be sampled again or not.
 *
 * Fired for real: bow equipped, lock set, auto-attack left to do its thing.
 * Injecting an arrow would test the simulator and skip the aim, which is the
 * half that is wrong.
 */
import * as H from './harness.mjs';

/* Realistic engagements: a bow's reach is 675px, so 220-320 is mid-fight.
   Three headings because the grip offset's perpendicular share changes with
   the shot's direction — the reason this reads as "sometimes". */
const SHOTS = [
  { label: 'due east, mid range',   dx: 260,  dy: 0 },
  { label: 'due west, mid range',   dx: -260, dy: 0 },
  { label: 'east and a bit north',  dx: 240,  dy: -90 },
  { label: 'south-west, closer',    dx: -150, dy: 120 },
  { label: 'nearly straight down',  dx: 30,   dy: 220 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* A bow in the ranged slot, auto-attack on, and the monsters made local so
     the client's own hit-test is the thing under test (a server zone would
     settle the damage on the worker and hide a client aim error). */
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S || !S.rpg) return null;
    S.rpg.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 };
    S.rpg.activeSlot = 'ranged';
    S.autoAttack = true;
    S._serverMonsters = false;
    return { slot: S.rpg.activeSlot, bow: !!S.rpg.rangedWeapon };
  });
  rec.ok('the archer is holding a bow (guard)', !!armed && armed.bow && armed.slot === 'ranged', armed);
  if (!armed || !armed.bow) return;

  /* ── THE MEASUREMENT ──
     Not "closest approach": an arrow that connects is REMOVED by the hit-test
     the moment it comes within the radius, so the closest position anyone can
     observe is the radius itself.  The first run of this scenario measured
     exactly that and reported ~28px for hits and misses alike, which is a
     number that cannot tell them apart.

     What separates them is the FLIGHT LINE: the perpendicular distance from
     the target's hit centre to the ray the arrow is travelling along (its
     frozen launch origin plus its heading).  Zero means dead centre; the hit
     radius is the pass/fail line; and it stays meaningful whether or not the
     arrow survives to be sampled again. */
  await P.page.evaluate(() => {
    window.__aim = { perp: Infinity, samples: 0, atMin: null, gripOff: null };
    const tick = () => {
      const st = window._gameState.current;
      const m = window.__mon;
      if (m && st && st.arrows && st.arrows.length && st.player) {
        /* 23 = the fodder body-centre offset (monsterBodyOffsetY); written out
           here on purpose so the scenario measures against the game's number
           rather than re-importing the function that might be wrong. */
        const hx = (typeof m.renderX === 'number') ? m.renderX : m.x;
        const hy = ((typeof m.renderY === 'number') ? m.renderY : m.y) - 23;
        for (const a of st.arrows) {
          if (!a._released || a.planting || a.planted) continue;
          const ox = st.player.x + (a._ox || 0), oy = st.player.y + (a._oy || 0);
          /* |(T - O) x dir| — the sideways miss, in pixels. */
          const d = Math.abs((hx - ox) * Math.sin(a.ang) - (hy - oy) * Math.cos(a.ang));
          window.__aim.samples++;
          if (d < window.__aim.perp) {
            window.__aim.perp = d;
            window.__aim.atMin = { ang: +a.ang.toFixed(4), dist: Math.round(a.dist),
              ox: Math.round(a._ox || 0), oy: Math.round(a._oy || 0),
              want: +Math.atan2(hy - oy, hx - ox).toFixed(4) };
          }
        }
      }
      if (st && st._bowGripX != null && st.player) {
        window.__aim.gripOff = { ox: Math.round(st._bowGripX - st.player.x),
          oy: Math.round(st._bowGripY - st.player.y) };
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const shoot = async (dx, dy) => {
    await P.page.evaluate(({ dx, dy }) => {
      const S = window._gameState.current;
      S.arrows = [];
      S.player.vx = 0; S.player.vy = 0;
      const mx = S.player.x + dx, my = S.player.y + dy;
      S.monsters = [{
        id: 'qa_aim_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
        x: mx, y: my, renderX: mx, renderY: my,
        spawnX: mx, spawnY: my, targetX: mx, targetY: my,
        hp: 99999, curHp: 99999, maxHp: 99999, dmg: 0, level: 1, gold: 0, xp: 1,
        /* spd is NOT optional.  Left off, the local monster AI does
           `m.x += dx / dist * m.spd` -> NaN, the monster's position stops being
           a number, and the aim code's `(lt.x || 0)` turns that NaN into 0 —
           i.e. every arrow flies at the world origin.  The first run of this
           scenario measured exactly that (ang -2.25 on every heading, which is
           the bearing from the player to 0,0).  Zero keeps the target still,
           which is what an AIM test wants; the moving case is below. */
        spd: 0,
        alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
        respawnAt: 0, moveTimer: 0, _stuckArrows: [],
      }];
      window.__mon = S.monsters[0];
      S.lockedTarget = { type: 'monster', id: 'qa_aim_1', ref: S.monsters[0] };
      S.swingTimer = 0;                       /* let the auto-attack fire now */
      window.__aim.perp = Infinity; window.__aim.samples = 0; window.__aim.atMin = null;
      window.__hpAtStart = window.__mon.curHp;
    }, { dx, dy });
    /* Long enough for an arrow to cross 260px at 8px/frame plus the 110ms
       nock, and for the sampler to see the whole flight. */
    await P.page.waitForTimeout(2200);
    return P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = window.__mon;
      return {
        perp: window.__aim.perp === Infinity ? null : +window.__aim.perp.toFixed(1),
        samples: window.__aim.samples,
        atMin: window.__aim.atMin,
        grip: window.__aim.gripOff,
        /* Did the fixture survive the frame loop, and is the lock still on it?
           Both were silent failure modes in the first run of this scenario. */
        alive: !!(S.monsters || []).some((x) => x === m),
        locked: !!(S.lockedTarget && S.lockedTarget.ref === m),
        hpLost: m ? (window.__hpAtStart - m.curHp) : null,
      };
    });
  };

  /* The radius the fodder hit-test uses for a non-staff arrow (projectiles.js,
     v2.3.1824: the blob's measured half-width). */
  const R = 27;
  let worst = 0;
  for (const s of SHOTS) {
    const got = await shoot(s.dx, s.dy);
    rec.ok(`${s.label}: an arrow was actually in flight (guard)`, got.samples > 0, got);
    if (!got.samples) continue;
    if (got.perp > worst) worst = got.perp;
    rec.ok(`${s.label}: the flight path passes through the slime, ${got.perp}px off centre against a ${R}px body`,
      got.perp < R, got);
    rec.ok(`${s.label}: ...and the slime takes damage for it`, got.hpLost > 0, { hpLost: got.hpLost, perp: got.perp });
  }

  /* The headline number.  Before this fix these five headings measured 9.4,
     11.2, 17.1, 17.1 and 32.0px of sideways miss against a 27px body, and the
     32px one drew no blood at all.  A budget of a third of the body keeps the
     claim honest without pinning it to a frame-timing exact zero. */
  rec.ok(`the worst-aimed of the ${SHOTS.length} headings is ${worst.toFixed(1)}px off centre (budget ${Math.round(R / 3)}px)`,
    worst < R / 3, { worst: +worst.toFixed(1), radius: R });

  /* ═══ A WALKING TARGET ═══
     The second half of the fix, isolated.  A server-driven monster DRAWS at
     renderX/renderY, which trails its logic x/y by about four frames of
     motion; the projectile hit-test was taught to use the rendered position in
     v2.3.1111, but the aim kept reading the logic position, so a shot at a
     walking monster led its own hitbox.  Here the two are pulled apart by hand
     (a 26px lead, roughly four frames of a chasing monster) so the scenario
     says which of the two points the arrow flies at — a real walk would move
     both and prove nothing. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.arrows = [];
    const mx = S.player.x + 260, my = S.player.y;
    S.monsters = [{
      id: 'qa_aim_2', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my - 26,                 /* logic position: 26px ahead */
      renderX: mx, renderY: my,          /* ...where it is actually DRAWN */
      spawnX: mx, spawnY: my, targetX: mx, targetY: my, spd: 0,
      hp: 99999, curHp: 99999, maxHp: 99999, dmg: 0, level: 1, gold: 0, xp: 1,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    window.__mon = S.monsters[0];
    S.lockedTarget = { type: 'monster', id: 'qa_aim_2', ref: S.monsters[0] };
    S.swingTimer = 0;
    window.__aim.perp = Infinity; window.__aim.samples = 0; window.__aim.atMin = null;
    window.__hpAtStart = window.__mon.curHp;
  });
  await P.page.waitForTimeout(2200);
  const walk = await P.page.evaluate(() => ({
    perp: window.__aim.perp === Infinity ? null : +window.__aim.perp.toFixed(1),
    samples: window.__aim.samples, atMin: window.__aim.atMin,
    hpLost: window.__mon ? (window.__hpAtStart - window.__mon.curHp) : null,
  }));
  rec.ok('a walking target is shot where it is DRAWN, not where its logic position leads',
    walk.samples > 0 && walk.perp < R / 3, walk);
  rec.ok('...and it takes the damage', walk.hpLost > 0, { hpLost: walk.hpLost, perp: walk.perp });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while shooting', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
