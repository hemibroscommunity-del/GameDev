/* WHERE THE ABILITY BUTTONS SIT, AND WHO GETS THEM (v2.3.2327).
 *
 * Owner: "The shield bash button too far away.  Put it down and to the left of
 * the attack button", and "Change whirlwind so only an option for the melee
 * character (sword equipped) and begins as an option immediately (no level
 * gating)."
 *
 * Both asks are geometry-or-visibility rules that a screenshot cannot settle
 * and that one careless edit can undo, so they are measured.
 *
 * THE HARD CONSTRAINT, which is what actually shapes the layout: the movement
 * joystick's touch zone is the whole LEFT HALF of the play area, not the small
 * disc you can see.  A control that strays over it does not sit on top of the
 * joystick, it stops the joystick's touchstart running at all (v2.3.2123, the
 * world-chat incident).  So "left of the attack disc" has a hard floor at
 * 50vw, and the band between that floor and the disc is 49px at 390 and 34px
 * at 360 -- under one button wide.  Every assertion below exists because some
 * plausible placement violates one of those numbers.
 *
 * GEOMETRY IS DERIVED, NOT QUERIED.  Both joysticks fade after 2s of no input
 * (v2.3.2288), so `.bt-joystick-base` and [data-joyzone] are not reliably in
 * the DOM when the measurement is taken -- the first cut of this file asserted
 * against whichever disc it happened to find (the movement one, on the far
 * left) and against a null zone edge, and reported two failures on a correct
 * build.  RBTN is right:50 bottom:70 w:96 anchored to the dashboard top, and
 * the zone split is exactly 50vw.  Both are exact.
 */
import * as H from './harness.mjs';

const setup = (P, opts) => P.page.evaluate((o) => {
  const S = window._gameState.current;
  S.rpg.shield = o.shield ? { name: 'Pine Shield', type: 'shield' } : null;
  S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
  S.rpg.rangedWeapon = { type: 'bow', name: 'Pine Bow', gearBase: 'wood', dmg: 3 };
  S.rpg.activeSlot = o.slot;
  /* ═══ v2.3.2561: A FIGHT, BECAUSE WHIRLWIND'S BUTTON NOW NEEDS ONE ═══
     Owner, after playing v2.3.2542: the button disappears out of combat rather
     than greying.  This file measures WHERE the buttons sit, so it needs them
     on screen -- a monster inside the 220px perimeter is what puts whirl there.

     The lock is ALSO written by hand, which is normally the wrong move (a
     fixture that writes the lock tests the fixture -- mp-rbutton §B/§D exist
     precisely to prove updateTargeting acquires it on its own, and mp-ability
     drives the same auto-acquire path).  It is deliberate here: the RANGED lane
     does not auto-acquire at all (targeting.js `autoAcquires` -- for a bow the
     tap IS the targeting system), so without it the bow row below would find
     whirl absent for TWO reasons and could no longer fail if the weapon rule
     broke.  Both slots get the same fight, so the only thing that moves between
     the two measurements is the weapon. */
  S._serverMonsters = false;
  const mx = S.player.x + 90, my = S.player.y;
  const mon = {
    id: 'slot_fodder', arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: mx, y: my, renderX: mx, renderY: my, spawnX: mx, spawnY: my, targetX: mx, targetY: my,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  };
  S.monsters = [mon];
  S.lockedTarget = { type: 'monster', id: mon.id, ref: mon, src: 'tap' };
  window.__pin = !!o.shieldUp;
  if (!window.__pinned) {
    window.__pinned = true;
    const tick = () => { const S2 = window._gameState.current;
      if (S2) { S2._shieldUp = !!window.__pin; S2._shieldKb = false; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
}, opts);

const boxes = (P) => P.page.evaluate(() => {
  const b = (sel) => { const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
      h: Math.round(r.height), r2: Math.round(r.right), b2: Math.round(r.bottom) }; };
  const zone = b('[data-joyzone="L"]');
  const dash = document.querySelector('.bt-dashboard');
  const dashTop = dash ? Math.round(dash.getBoundingClientRect().top) : null;
  /* The ATTACK disc is the SECOND .bt-joystick-base (the first is movement). */
  const discs = [...document.querySelectorAll('.bt-joystick-base')].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), r2: Math.round(r.right), y: Math.round(r.top), b2: Math.round(r.bottom) };
  });
  const S = window._gameState.current;
  return { vw: window.innerWidth, leftZoneEnds: zone ? Math.round(zone.right) : null,
    dashTop, discs, shield: b('[data-shield]'),
    /* v2.3.2561: reported so the whirl rows below cannot pass or fail for a
       reason the fixture quietly lost -- a dropped lock would take the button
       away on its own and look exactly like the weapon rule working. */
    lock: !!(S && S.lockedTarget && S.lockedTarget.ref),
    bash: b('[data-ability="bash"]'), whirl: b('[data-ability="whirl"]') };
});

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [w, h] of [[390, 844], [360, 800]]) {
    const P = await H.newPlayer(browser, { name: `Geo${w}`, wsPort, webPort,
      touch: true, viewport: { width: w, height: h } });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2600);

    await setup(P, { shield: true, shieldUp: true, slot: 'melee' });
    await P.page.waitForTimeout(800);
    const g = await boxes(P);
    console.log(`    ${w} melee+shieldUp: ${JSON.stringify(g)}`);
    rec.ok(`${w}: guard: the seeded fight is still live, so whirl's button has its reason to exist (v2.3.2561)`,
      g.lock === true, g);
    rec.ok(`${w}: both ability buttons are on screen with a sword, the shield up and a fight on (guard)`,
      !!g.bash && !!g.whirl, g);
    if (g.bash) {
      /* The attack disc and the movement zone are DERIVED, not queried: both
         joysticks fade after 2s of no input, so `.bt-joystick-base` and
         [data-joyzone] are not reliably present when the shot is taken -- the
         first cut of this asserted against whichever disc it happened to find
         (the movement one, on the far left) and against a null zone edge.
         RBTN is right:50 bottom:70 w:96, anchored to the dashboard's top, and
         the zone split is exactly 50vw. Both are exact. */
      const disc = { x: w - 50 - 96, r2: w - 50, y: g.dashTop - 70 - 96, b2: g.dashTop - 70 };
      const zoneEnds = w / 2;
      rec.ok(`${w}: the bash button stays OUT of the movement joystick's touch zone`,
        g.bash.x >= zoneEnds, { bashX: g.bash.x, zoneEnds });
      rec.ok(`${w}: ...and clear of the dashboard`, g.bash.b2 <= g.dashTop, { b2: g.bash.b2, dashTop: g.dashTop });
      rec.ok(`${w}: ...and does not cover the shield button`,
        g.bash.r2 <= g.shield.x || g.bash.x >= g.shield.r2, { bash: g.bash, shield: g.shield });
      rec.ok(`${w}: it is DOWN and to the LEFT of the attack disc`,
        g.bash.x < disc.x && (g.bash.y + g.bash.h / 2) > (disc.y + disc.b2) / 2,
        { bash: g.bash, disc });
      /* Left-and-down is not enough on its own -- it must also not LIE ON the
         disc. Rect intersection, both axes, for bash and for whirl above it. */
      const hits = (b) => !(b.r2 <= disc.x || b.x >= disc.r2 || b.b2 <= disc.y || b.y >= disc.b2);
      rec.ok(`${w}: ...and overlaps neither the disc nor its rounded corner`,
        !hits(g.bash) && !hits(g.whirl), { bash: g.bash, whirl: g.whirl, disc });
    }

    /* Whirl's new rule: sword only. */
    await setup(P, { shield: true, shieldUp: true, slot: 'ranged' });
    await P.page.waitForTimeout(700);
    const bow = await boxes(P);
    console.log(`    ${w} bow: bash=${!!bow.bash} whirl=${!!bow.whirl}`);
    rec.ok(`${w}: guard: the fight is still live across the weapon swap, so the row below is about the WEAPON`,
      bow.lock === true, bow);
    rec.ok(`${w}: with a BOW out, Whirlwind is gone entirely (not just greyed)`, !bow.whirl, bow.whirl);
    rec.ok(`${w}: ...and Shield Bash is still there, because the shield is still up`, !!bow.bash, bow.bash);

    if (w === 390) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/geo-after.png` });
    await P.ctx.close().catch(() => {});
  }
}
