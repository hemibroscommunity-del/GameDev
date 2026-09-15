/* WHERE THE COMBAT BUTTONS SIT, AND WHO GETS THEM (v2.3.2327, rebuilt v2.3.2562).
 *
 * Owner, after playing the merged build and sending a screenshot: "the
 * placement of the buttons isn't ideal.  I'd like the whirlwind and special
 * attack buttons diagonally above the left joystick (directionally above but
 * diagonal to provide enough space between them for not accidentally pressing
 * the other one) and the shield block button to the diagonal bottom left of
 * that right joystick (as a mental separation for combat purpose further away
 * from the other buttons on its own side)."
 *
 * Every clause of that is a geometry rule a screenshot cannot settle and one
 * careless edit can undo, so every clause is measured.  The earlier asks this
 * file was built for are still here, re-pointed rather than dropped: whirl is
 * still the sword's alone (v2.3.2327), and nothing may lap onto the attack disc.
 *
 * ═══ THE GAP IS THE FEATURE, SO IT IS A NUMBER ═══
 * "Enough space ... for not accidentally pressing the other one" is NOT "they
 * do not overlap" -- two buttons shoulder to shoulder also do not overlap, and
 * that is the layout being complained about.  The clear air between them is
 * measured and floored, and printed at every width, because whether the number
 * is big enough for a real thumb is a judgement only the owner can make.
 *
 * ═══ THE LEFT HALF IS THE MOVEMENT ZONE, AND THAT IS THE HAZARD ═══
 * `[data-joyzone="L"]` is the full-height LEFT HALF at z6 (TouchControls), and
 * these two buttons now sit on top of it.  Its touchstart begins a walk and a
 * swipe across it dodges, so a press that leaked would move the player instead
 * of firing.  Worse, `lM`/`lE` are bound to WINDOW (BroTown ~9345), so a leak
 * would not even need the zone element in the propagation path.
 *
 * That claim CANNOT be settled by a rectangle, and it cannot be settled by
 * `el.dispatchEvent` either: dispatchEvent hands the event straight to the
 * target without hit-testing, so it proves the handler is wired and says
 * nothing about whether a finger can reach the control, nor about what else
 * the same finger would have hit (TRAPS 67 -- a gesture shipped broken for 173
 * versions behind exactly that kind of green test).  So the press rows below
 * use `page.touchscreen.tap` at real coordinates and assert the OUTCOME on
 * both sides: the ability fired, AND the player did not start moving.  The
 * converse is asserted too -- the movement surface still works where no button
 * covers it -- because that is the half a "swallow the touch" change breaks.
 *
 * GEOMETRY IS DERIVED, NOT QUERIED.  Both joysticks fade after 2s of no input
 * (v2.3.2288), so `.bt-joystick-base` and [data-joyzone] are not reliably in
 * the DOM when the measurement is taken -- the first cut of this file asserted
 * against whichever disc it happened to find (the movement one, on the far
 * left) and against a null zone edge, and reported two failures on a correct
 * build.  RBTN is right:50 bottom:70 w:96/108 anchored to the dashboard top,
 * and the zone split is exactly 50vw.  Both are exact.
 */
import * as H from './harness.mjs';

/* Shield state is PINNED on a rAF loop rather than set once: the game writes
   `_shieldUp` every frame from its own toggle, so a single assignment is
   overwritten before the measurement lands. */
const setup = (P, opts) => P.page.evaluate((o) => {
  const S = window._gameState.current;
  S.rpg.shield = o.shield ? { name: 'Pine Shield', type: 'shield' } : null;
  S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
  S.rpg.rangedWeapon = { type: 'bow', name: 'Pine Bow', gearBase: 'wood', dmg: 3 };
  S.rpg.activeSlot = o.slot;
  S.rpg.stamina = S.rpg.maxStamina || 100;
  S.rpg.mana = S.rpg.maxMana || 100;
  window.__pin = !!o.shieldUp;
  if (!window.__pinned) {
    window.__pinned = true;
    const tick = () => { const S2 = window._gameState.current;
      if (S2) { S2._shieldUp = !!window.__pin; S2._shieldKb = false; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  /* ═══ v2.3.2561: A FIGHT, BECAUSE WHIRLWIND'S BUTTON NOW NEEDS ONE ═══
     Its button disappears out of combat (owner, after playing v2.3.2542), and
     this file measures where the buttons ARE -- so it needs them on screen.  A
     monster inside the 220px perimeter is what puts whirl there, and the same
     fight is what shieldButtonLive and specialButtonLive want.

     The lock is ALSO written by hand, which is normally the wrong move (a
     fixture that writes the lock tests the fixture -- mp-rbutton B/D exist
     precisely to prove updateTargeting acquires it on its own, and mp-ability
     drives that same auto-acquire path).  It is deliberate here: the RANGED
     lane does not auto-acquire at all (targeting.js `autoAcquires` -- for a bow
     the tap IS the targeting system), so without it the bow rows below would
     find whirl absent for TWO reasons and could no longer fail if the weapon
     rule broke.  Both slots get the same fight, so the only thing that moves
     between the two measurements is the weapon. */
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
  /* ═══ RETIRE THE ONBOARDING COACH, THE WAY mp-joyfade DOES ═══
     A fresh character is mid-tutorial, and the coach paints a card over the
     play area AND takes a visibility hold on the left disc
     (game/controlVisibility.js).  Sideways that card lands squarely over the
     movement joystick's centre -- the first run of the reachability probe below
     reported an unnamed 198x49 div inside a full-screen z31 overlay at exactly
     that point, which is the card.  Marking the chain turned in is the same
     retirement mp-joyfade uses, and it keeps this file measuring the LAYOUT
     rather than the tutorial.
     (That the landscape coach card sits over the movement disc at all is a real
     thing, and it is NOT this file's or this change's to fix -- it is the
     landscape onboarding layout, and it predates these buttons.) */
  if (S.rpg) { S.rpg._quests = S.rpg._quests || {}; S.rpg._quests.tut_4 = 'turnedIn'; }
}, opts);

const boxes = (P) => P.page.evaluate(() => {
  const b = (sel) => { const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
      h: Math.round(r.height), r2: Math.round(r.right), b2: Math.round(r.bottom),
      cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; };
  const dash = document.querySelector('.bt-dashboard');
  const dashTop = dash ? Math.round(dash.getBoundingClientRect().top) : null;
  const S = window._gameState.current;
  return { vw: window.innerWidth, vh: window.innerHeight, dashTop,
    /* v2.3.2561: reported so the whirl rows cannot pass or fail for a reason
       the fixture quietly lost -- a dropped lock would take the button away on
       its own and look exactly like a weapon rule working. */
    lock: !!(S && S.lockedTarget && S.lockedTarget.ref),
    shield: b('[data-shield]'), special: b('[data-special]'),
    ljoy: b('.bt-joystick-base'),
    /* v2.3.2562: the attack disc as MEASURED, not derived.  The derived form
       below hangs off the dashboard band, and sideways there is no band
       (v2.3.2168 removed it -- `.bt-dashboard` reports top 0), so every
       landscape coordinate computed from it was nonsense.  Measured first,
       derived only as the portrait fallback for the frames where the disc has
       faded out of the DOM. */
    attack: b('.bt-rjoy-base'),
    bash: b('[data-ability="bash"]'), whirl: b('[data-ability="whirl"]') };
});

/* The movement state a leaked press would disturb.  `_lJoyHeld` is what lS
   sets on touchstart; the position and the dodge flag are what the player
   would actually SEE go wrong. */
const moveState = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return { held: !!S._lJoyHeld, roll: !!S._dodgeRoll,
    x: Math.round(S.player.x), y: Math.round(S.player.y) };
});

const VIEWS = [
  { w: 390, h: 844, tag: '390 portrait' },
  { w: 360, h: 800, tag: '360 portrait' },
  /* v2.3.2562: LANDSCAPE, because the cluster's HEIGHT is where this layout can
     go wrong.  v2.3.2542 rejected a slot for working out ~283px above the band
     on a 390px-tall screen -- "up among the health bars" -- and the left
     cluster's upper slot is the control that could repeat it.  The rise is
     deliberately just over half a button rather than a full one for exactly
     that reason (leftCluster); this is the row that proves it paid off. */
  /* ROTATED INTO, not started in.  Entering the world at 844x390 wedges in the
     character creator -- Playwright resolves `button.bt-cc-play`, calls it
     "visible, enabled and stable", then spends 30s trying to scroll it into
     view and times out.  That is the creator's own landscape fit (its
     neighbours mp-ccfit / mp-cckb / TRAPS 64 own that problem) and nothing to
     do with these buttons, so this view sidesteps it by creating the character
     in portrait and ROTATING -- which is what a player does anyway: nobody
     builds a character sideways and then plays, they turn the phone mid-game.
     It also means the layout is measured after a real orientation change, so
     wireOrientationSync is in the path rather than assumed. */
  { w: 844, h: 390, tag: 'landscape', enterAt: { width: 390, height: 844 } },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const V of VIEWS) await oneView({ browser, wsPort, webPort, rec }, V);
}

async function oneView({ browser, wsPort, webPort, rec }, V) {
  const { w, h, tag } = V;
  const P = await H.newPlayer(browser, { name: `Geo${w}`, wsPort, webPort,
    touch: true, viewport: V.enterAt || { width: w, height: h } });
  const land = w > h;
  await H.enterWorld(P);
  if (V.enterAt) {
    await P.page.setViewportSize({ width: w, height: h });
    /* The shell re-measures on resize and screen-orientation change
       (game/orientationSync.js); give it frames to land before measuring. */
    await P.page.waitForTimeout(1200);
    const orient = await P.page.evaluate(() => (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'));
    rec.ok(`${tag}: guard: the rotation really took (shell reports ${orient})`,
      orient === 'landscape', { orient, w, h });
  }
  await P.page.waitForTimeout(2600);

  /* ═══ v2.3.2564: PASS 0 -- WITH THE TUTORIAL CARD STILL UP ═══
     Owner, deciding the question §12.8 left open: "Coach card move off the
     combat band (doesn't seem like a big deal either way)."  So the card moved
     (QuestCoach.jsx), and this is the row that proves it.

     Deliberately FIRST and deliberately separate.  Every other pass in this
     file retires the coach so it can measure the layout instead of the
     tutorial -- which is right for them and is exactly why the overlap went
     unseen for a version: the one scenario that hit-tested the band had
     already switched the card off.  This pass keeps it up.

     It also seeds WITHOUT the rAF shield pin the other passes use: the pin
     rewrites `_shieldUp` every frame, so a real tap on Block would be undone
     before it could be read.  Here the tap IS the measurement. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S.rpg.shield) S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
    S.rpg.activeSlot = 'melee';
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._serverMonsters = false;
    const mx = S.player.x + 90, my = S.player.y;
    const mon = { id: 'coach_fodder', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my, renderX: mx, renderY: my, spawnX: mx, spawnY: my, targetX: mx, targetY: my,
      hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [] };
    S.monsters = [mon];
    S.lockedTarget = { type: 'monster', id: mon.id, ref: mon, src: 'tap' };
    S._shieldUp = false;
  });
  await P.page.waitForTimeout(1200);
  const coach = await P.page.evaluate(() => {
    const card = document.querySelector('[data-coach-card]');
    const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), r2: Math.round(b.right),
        b2: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height),
        cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }; };
    const controls = [];
    for (const el of document.querySelectorAll('[data-shield],[data-ability],[data-special],.bt-rjoy-base,.bt-joystick-base')) {
      const b = box(el);
      if (!b || b.w <= 0) continue;
      controls.push({ name: el.getAttribute('data-shield') != null ? 'block'
        : el.getAttribute('data-ability') ? 'ability-' + el.getAttribute('data-ability')
        : el.getAttribute('data-special') != null ? 'special'
        : String(el.className).indexOf('bt-rjoy') >= 0 ? 'attack-disc' : 'move-disc', box: b });
    }
    /* Is the RING still on its target?  Moving the card must not move the
       thing that points at the lesson's control. */
    const ring = document.querySelector('[data-coach-ring]') || null;
    return { card: box(card), lesson: card ? card.getAttribute('data-coach-card') : null,
      ring: box(ring), controls, vh: window.innerHeight };
  });
  console.log(`    ${tag} COACH: ${JSON.stringify(coach)}`);
  if (!coach.card) {
    rec.skip(`${tag}: the coach card vs the combat band`,
      'no tutorial card was up on this fixture at measure time');
  } else {
    const hit = (a, b) => !(a.r2 <= b.x || a.x >= b.r2 || a.b2 <= b.y || a.y >= b.b2);
    const clashes = coach.controls.filter((c) => hit(coach.card, c.box)).map((c) => c.name);
    /* MOVING IT MUST NOT BREAK IT.  Two ways a dodge can go wrong that an
       overlap test cannot see: the card gets shoved off the screen (unreadable)
       or the RING stops pointing at the control the lesson is about.  The ring
       is a separate element anchored to the target rect, so it should not have
       moved at all -- asserted, because "the card cleared the band" would still
       pass if the lesson had quietly stopped gesturing at anything. */
    rec.ok(`${tag}: ...and the card is still fully on screen and readable `
      + `(y ${coach.card.y}..${coach.card.b2} of ${coach.vh}, x ${coach.card.x}..${coach.card.r2})`,
      coach.card.y >= 0 && coach.card.b2 <= coach.vh && coach.card.x >= 0 && coach.card.h >= 40,
      coach.card);
    rec.ok(`${tag}: ...and the spotlight RING still sits on the lesson's own control, `
      + `so it points at something (ring y ${coach.ring && coach.ring.y})`,
      !!(coach.ring && coach.ring.h > 0 && coach.ring.w > 0), coach.ring);
    rec.ok(`${tag}: the tutorial card (lesson "${coach.lesson}") overlaps NO combat control `
      + `-- checked all ${coach.controls.length} of them, not just Block`,
      clashes.length === 0, { card: coach.card, clashes, controls: coach.controls });
    /* THE CLAIM THAT MATTERS: not "it does not overlap" but "the button works".
       A real finger, through the browser's own hit testing -- the card is
       pointerEvents:'auto' since v2.3.2312, so it really would eat the press. */
    const blk = (coach.controls.find((c) => c.name === 'block') || {}).box;
    if (!blk) {
      rec.skip(`${tag}: a real tap on Block with the card up`, 'no Block button on this fixture');
    } else {
      const landed = await P.page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return !!(el && el.closest('[data-shield]'));
      }, [blk.cx, blk.cy]);
      /* ═══ THE PRESS IS DISPATCHED, AND THE REACH IS HIT-TESTED ═══
         Two different claims needing two different instruments, which is the
         whole lesson of TRAPS 67 read carefully rather than as "always use a
         real finger":

           - REACHABILITY -- is the button what a finger at this point hits, or
             is the tutorial card on top of it?  Only hit testing can answer
             that, and the `landed` row above does it with elementFromPoint.
             This is the claim the whole change is about.
           - THE HANDLER -- does the press raise the shield?  Dispatched here,
             the way mp-rbutton drives this same button.

         WHY NOT page.touchscreen.tap FOR THE SECOND ONE.  Measured: a single
         tap delivers ONE touchstart AND ONE mousedown to this element, and
         ShieldButton binds `press` to both (onTouchStart and onMouseDown, since
         v2.3.2242).  So the tap fires toggleShield twice -- up, then straight
         back down with _shieldDroppedWhy 'tap' -- and the row read as "the
         button is dead" when the button had in fact worked perfectly, twice.

         That is almost certainly this emulation and not an iPhone: `press`
         calls preventDefault() on a cancelable touchstart, which is exactly
         what suppresses the compatibility mouse events on iOS Safari, while
         Chromium's CDP touch emulation delivers the synthesized mousedown
         anyway.  It is NOT this change's to fix -- those two handlers predate
         it by 300 versions -- and it is invisible on every other button here
         because Whirl and Special are cooldown-gated, so their second fire is
         refused and nothing shows.  Written down rather than silently worked
         around; it is in the PR's own "found, not fixed" list. */
      await P.page.evaluate(() => {
        window.__blockTouched = 0;
        const el = document.querySelector('[data-shield]');
        if (el) el.addEventListener('touchstart', () => { window.__blockTouched++; }, true);
        window.__touchOn = (sel, type, x, y) => {
          const e2 = document.querySelector(sel);
          if (!e2) return false;
          const t = new Touch({ identifier: 77, target: e2, clientX: x, clientY: y });
          const end = type === 'touchend';
          e2.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
            touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
          return true;
        };
      });
      await P.page.evaluate(([x, y]) => {
        window.__touchOn('[data-shield]', 'touchstart', x, y);
        window.__touchOn('[data-shield]', 'touchend', x, y);
      }, [blk.cx, blk.cy]);
      await P.page.waitForTimeout(400);
      const after = await P.page.evaluate(() => {
        const S = window._gameState.current;
        return { up: !!S._shieldUp, droppedWhy: S._shieldDroppedWhy || null,
          shieldActive: S.shieldActive || 0,
          onCd: !!(S._shieldCdUntil && Date.now() < S._shieldCdUntil),
          touches: window.__blockTouched || 0 };
      });
      const up = after.up;
      rec.ok(`${tag}: a finger at Block's centre reaches BLOCK, not the tutorial card`, landed === true, { blk, landed });
      rec.ok(`${tag}: ...and pressing it with the card up actually raises the shield `
        + `-- the report mp-duelblock exists for ("I think I was unable to block")`,
        up === true, { after, blk });
      await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/coachband-${land ? 'landscape' : w + 'x' + h}.png` });
      await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });
    }
  }

  /* ── PASS A: shield UP.  Bash exists only here (v2.3.2252), and Special does
        NOT (specialButtonLive refuses from behind a raised guard). ── */
  await setup(P, { shield: true, shieldUp: true, slot: 'melee' });
  await P.page.waitForTimeout(800);
  const g = await boxes(P);
  console.log(`    ${tag} melee+shieldUp: ${JSON.stringify(g)}`);
  rec.ok(`${tag}: guard: the seeded fight is still live, so the buttons have their reason to exist`,
    g.lock === true, g);
  rec.ok(`${tag}: with a sword, a shield up and a fight on, Bash / Block / Whirlwind are all on screen`,
    !!g.bash && !!g.shield && !!g.whirl, g);

  /* The attack disc is DERIVED, not queried: both joysticks fade after 2s of no
     input, so neither is reliably in the DOM when the shot is taken.  RBTN is
     right:50 bottom:70 w:96/108, anchored to the dashboard's top. */
  const discW = land ? 108 : 96;
  /* Prefer the disc the browser actually painted; fall back to the arithmetic
     only in portrait, where the dashboard band it hangs from exists. */
  const disc = g.attack
    || (!land && g.dashTop > 0
      ? { x: w - 50 - discW, r2: w - 50, y: g.dashTop - 70 - discW, b2: g.dashTop - 70 }
      : null);
  /* Sideways the dashboard band is the safe-area inset alone (v2.3.2168), so
     `.bt-dashboard` reports top 0 and "clears the band" has nothing to clear.
     The rows that need it say so rather than asserting against a zero. */
  const hasBand = typeof g.dashTop === 'number' && g.dashTop > 0;
  const hits = (a, o) => !(a.r2 <= o.x || a.x >= o.r2 || a.b2 <= o.y || a.y >= o.b2);
  if (!disc) rec.skip(`${tag}: the rows measured against the attack disc`, 'the disc had faded out of the DOM when the shot was taken');
  if (!hasBand) rec.skip(`${tag}: the dashboard-clearance rows`, 'no dashboard band in this orientation (sideways it is the safe-area inset alone, v2.3.2168)');

  /* ═══ v2.3.2562: BASH IS WHERE D9 PUT IT, AND THIS ASK DID NOT MOVE IT ═══
     These rows used to ask for "down and to the LEFT of the attack disc"
     (v2.3.2327's placement) and had been RED since v2.3.2472 moved bash into
     the D9 column above the disc's centre line -- a stale assertion nobody
     re-pointed.  The owner's new ask does not mention Bash, so the correct
     claim is the one D9 makes and this change must preserve. */
  if (g.bash && disc) {
    rec.ok(`${tag}: Bash hugs the attack disc's left edge, 4px clear (bash right ${g.bash.r2}, disc left ${disc.x})`,
      Math.abs((disc.x - g.bash.r2) - 4) <= 1, { bash: g.bash, disc });
    if (hasBand) rec.ok(`${tag}: ...and clear of the dashboard`, g.bash.b2 <= g.dashTop, { b2: g.bash.b2, dashTop: g.dashTop });
    rec.ok(`${tag}: ...and overlaps neither the disc nor its rounded corner`,
      !hits(g.bash, disc), { bash: g.bash, disc });
    rec.ok(`${tag}: ...sitting ABOVE the disc's centre line, which is where D9 put it`,
      (g.bash.y + g.bash.h / 2) < (disc.y + disc.b2) / 2, { bash: g.bash, disc });
  }

  /* ═══ CLAIM: BLOCK IS THE DIAGONAL BOTTOM-LEFT OF THE ATTACK DISC ═══
     Both axes, because "bottom left" is two facts and a button merely below the
     disc (or merely left of it) would pass a one-axis test.  These rows replace
     "does not cover the shield button", which tested only the HORIZONTAL axis
     and so went red the moment D9 stacked Block and Bash in one column -- it
     could not express a vertical stack at all. */
  if (g.shield && disc) {
    rec.ok(`${tag}: Block sits LEFT of the attack disc (${g.shield.r2} <= ${disc.x})`,
      g.shield.r2 <= disc.x, { shield: g.shield, disc });
    rec.ok(`${tag}: ...and BELOW it, so it reads as the diagonal bottom-left corner `
      + `(block top ${g.shield.y} vs disc bottom ${disc.b2})`,
      g.shield.y >= disc.b2, { shield: g.shield, disc });
    if (hasBand) rec.ok(`${tag}: ...and still clears the dashboard band (${g.shield.b2} <= ${g.dashTop})`,
      g.shield.b2 <= g.dashTop, { shield: g.shield, dashTop: g.dashTop });
    if (g.bash) {
      const gap = g.shield.y - g.bash.b2;
      rec.ok(`${tag}: ...and is well clear of Bash -- ${gap}px of air, the "mental separation" the owner asked for`,
        gap >= g.shield.h, { gap, floor: g.shield.h, shield: g.shield, bash: g.bash });
    }
  }

  /* ── PASS B: shield DOWN, so the Special button exists and the left cluster
        can be measured as the pair the owner described. ── */
  await setup(P, { shield: true, shieldUp: false, slot: 'melee' });
  await P.page.waitForTimeout(800);
  const d = await boxes(P);
  console.log(`    ${tag} melee+shieldDown: ${JSON.stringify(d)}`);
  rec.ok(`${tag}: with the guard down, Whirlwind and Special are both on screen`,
    !!d.whirl && !!d.special, d);

  if (d.whirl && d.special) {
    const dx = d.whirl.cx - d.special.cx;
    const dy = d.whirl.cy - d.special.cy;
    const centres = Math.round(Math.hypot(dx, dy));
    const gapX = d.whirl.x - d.special.r2;
    const size = d.special.w;
    console.log(`    ${tag} DIAGONAL: centres ${centres}px apart, clear gap ${gapX}px, buttons ${size}px`);
    rec.ok(`${tag}: both are on the LEFT half (whirl right ${d.whirl.r2}, special right ${d.special.r2}, half ${Math.round(w / 2)})`,
      d.whirl.r2 <= w / 2 && d.special.r2 <= w / 2, d);
    rec.ok(`${tag}: Whirlwind is UP and to the RIGHT of Special -- a diagonal, not a stack and not a row `
      + `(dx ${dx}, dy ${dy})`,
      dx > 0 && dy < 0, { whirl: d.whirl, special: d.special });
    /* The owner's own reason, as a number. */
    rec.ok(`${tag}: ...with ${gapX}px of clear air between them, at least half a button (${Math.round(size / 2)}px)`,
      gapX >= size / 2, { gapX, size, whirl: d.whirl, special: d.special });
    rec.ok(`${tag}: ...and centres ${centres}px apart, more than a button and a half (${Math.round(size * 1.4)}px), `
      + `so a thumb aimed at one is not on the other`,
      centres > size * 1.4, { centres, size });
    if (d.ljoy) {
      rec.ok(`${tag}: ...and both sit ABOVE the movement disc rather than over its circle `
        + `(special bottom ${d.special.b2}, whirl bottom ${d.whirl.b2}, disc top ${d.ljoy.y})`,
        d.special.b2 <= d.ljoy.y && d.whirl.b2 <= d.ljoy.y, { special: d.special, whirl: d.whirl, ljoy: d.ljoy });
    }
    /* ═══ THE HEIGHT CEILING, AND WHY IT IS THAT NUMBER ═══
       This is why landscape is in the view list at all.  The hazard is the
       health bars, and they are drawn on the CANVAS -- there is no element to
       measure and no overlap a rect can catch, which is exactly why v2.3.2542
       expressed the limit as a distance instead: it rejected a slot that worked
       out at ~283px above the dashboard band on a 390px-tall landscape screen
       for putting a combat button "up among the health bars".

       So that is the ceiling, cited rather than invented.  The first cut of
       this row used `h * 0.35` instead, which is a number nobody chose: it
       failed a layout measuring 128px from the top of a 390px screen, on the
       LEFT, while the HUD card zLayers describes sits top-RIGHT at y 10-125.
       A threshold that fails a correct build is worse than no threshold. */
    const CEILING = 283;
    const aboveBand = (g.dashTop || h) - d.whirl.y;
    rec.ok(`${tag}: ...and the upper button stays under the ceiling v2.3.2542 set for "up among the `
      + `health bars" -- ${aboveBand}px above the band, limit ${CEILING}px`,
      aboveBand <= CEILING, { aboveBand, ceiling: CEILING, whirlTop: d.whirl.y, vh: h, dashTop: g.dashTop });
  }

  /* ═══ v2.3.2563: THE iOS EDGE GUARD MUST NOT EAT PART OF A BUTTON ═══
     BroTown parks an 18px transparent strip down the left edge at z40 and
     preventDefaults every touchstart in it, so iOS does not read a bezel swipe
     as its back gesture (v2.3.112).  It is ABOVE this cluster and swallows the
     touch outright -- so when v2.3.2562 anchored Special at LBTN.left (12), the
     leftmost 6px of it silently stopped answering and a 48px button became a
     42px one, under Apple's 44px minimum.

     Two rows, because the rect and the finger are different claims: the box
     must start at or right of the guard, AND a real tap just inside its left
     edge must actually fire.  The tap is the one that would have caught the
     original bug -- the rect was always fine, it was the TOUCH that died. */
  for (const [name, box] of [['Special', d.special], ['Whirlwind', d.whirl]]) {
    if (!box) continue;
    rec.ok(`${tag}: the ${name} button starts clear of the 18px iOS edge guard (left ${box.x})`,
      box.x >= 18, { box, guard: 18 });
  }
  if (d.special) {
    const before = await moveState(P);
    /* 4px inside the button's own left edge: inside the control, and inside the
       guard's old reach.  A tap here fired nothing before this fix. */
    const edgeX = d.special.x + 4;
    await P.page.evaluate(() => { const S = window._gameState.current; S._lastSwipe = 0; S.rpg.mana = S.rpg.maxMana || 100; });
    await P.page.touchscreen.tap(edgeX, d.special.cy);
    await P.page.waitForTimeout(400);
    const spec = await P.page.evaluate(() => (window.__btSpecialBtn ? window.__btSpecialBtn() : null));
    const after = await moveState(P);
    rec.ok(`${tag}: ...and a REAL tap ${edgeX - d.special.x}px inside ${'Special'}'s left edge (x=${edgeX}) actually fires it `
      + `-- the guard is not eating the near edge`,
      !!(spec && spec.cdLeft > 0), { spec, edgeX, special: d.special });
    rec.ok(`${tag}: ...and that edge tap does not walk the player either`,
      after.x === before.x && after.y === before.y && after.held === false, { before, after });
  }

  /* ═══ A REAL FINGER, BECAUSE THE ZONE UNDERNEATH IS THE MOVEMENT INPUT ═══
     page.touchscreen.tap goes through the browser's own hit testing; the
     `el.dispatchEvent` helper this file's neighbours use does not, and so
     cannot tell a reachable button from an unreachable one, nor notice that
     the same finger ALSO started a walk (TRAPS 67). */
  if (d.whirl) {
    const before = await moveState(P);
    await P.page.touchscreen.tap(d.whirl.cx, d.whirl.cy);
    await P.page.waitForTimeout(400);
    const after = await moveState(P);
    const fired = await P.page.evaluate(() => (window.__btAbilityStatus ? window.__btAbilityStatus('whirl').cdLeft : -1));
    rec.ok(`${tag}: a REAL finger on the Whirlwind button casts it (cooldown ${Math.round(fired)}ms)`,
      fired > 0, { fired, whirl: d.whirl });
    rec.ok(`${tag}: ...and does NOT start a walk on the movement zone underneath it`,
      after.held === false && after.roll === false && after.x === before.x && after.y === before.y,
      { before, after });
  }
  if (d.special) {
    const before = await moveState(P);
    await P.page.touchscreen.tap(d.special.cx, d.special.cy);
    await P.page.waitForTimeout(400);
    const after = await moveState(P);
    const spec = await P.page.evaluate(() => (window.__btSpecialBtn ? window.__btSpecialBtn() : null));
    rec.ok(`${tag}: a REAL finger on the Special button fires it (cooldown ${spec && Math.round(spec.cdLeft)}ms)`,
      !!(spec && spec.cdLeft > 0), spec);
    rec.ok(`${tag}: ...and does NOT start a walk either`,
      after.held === false && after.roll === false && after.x === before.x && after.y === before.y,
      { before, after });
  }
  /* ...and the CONVERSE, which is the half a "swallow the touch" change can
     silently break: the movement surface must still answer where no button
     covers it.  Asked through elementFromPoint, the same question a finger
     asks, at a point low on the left half beside the cluster. */
  {
    const zx = Math.round(w * 0.12);
    const zy = d.ljoy ? d.ljoy.cy : Math.round(h * 0.75);
    /* ═══ ASK BY ANCESTRY, NOT BY THE LEAF'S OWN NAME ═══
       The first cut matched on the hit element's own class and reported a bare
       "DIV" in landscape -- which read as "something unknown is covering the
       joystick" and was nothing of the sort: at the disc's centre the topmost
       element is the joystick's own KNOB, a separate unclassed sprite div
       inside the base (TouchControls' note: "the knob is a SEPARATE 42px sprite
       at zIndex 1").  That is the movement control, so the honest question is
       not what the leaf is called but what it BELONGS to. */
    const hit = await P.page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { name: null, movement: false };
      const cls = String(el.className || '');
      const name = el.getAttribute('data-ability') ? 'ability-' + el.getAttribute('data-ability')
        : el.getAttribute('data-special') ? 'special'
        : el.getAttribute('data-shield') ? 'shield'
        : el.getAttribute('data-joyzone') ? 'zone-' + el.getAttribute('data-joyzone')
        : cls.indexOf('bt-joystick') >= 0 ? 'joystick'
        : el.tagName + (cls ? '.' + cls.split(' ').filter(Boolean).join('.') : '');
      /* Part of the movement control: the left zone, the left corner box, the
         base, or anything nested inside them. */
      const movement = !!el.closest('[data-joyzone="L"], [data-disc="L"], .bt-joystick-zone, .bt-joystick-base');
      /* ...and definitely NOT one of the buttons that just moved onto this half. */
      const onButton = !!el.closest('[data-ability], [data-special]');
      /* If it is neither, SAY WHAT IT IS.  A bare "DIV" is the shape of a
         report that sends the next person guessing (TRAPS 28), and whatever
         sits over the movement disc sideways is worth naming exactly. */
      const chain = [];
      for (let n = el, i = 0; n && i < 6; n = n.parentElement, i++) {
        const c = String(n.className || '').split(' ').filter(Boolean).join('.');
        const r = n.getBoundingClientRect();
        chain.push(n.tagName + (n.id ? '#' + n.id : '') + (c ? '.' + c : '')
          + ' z=' + getComputedStyle(n).zIndex
          + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      return { name, movement, onButton, chain };
    }, [zx, zy]);
    console.log(`    ${tag} zone probe at ${zx},${zy} -> ${hit.name} (movement=${hit.movement})`);
    rec.ok(`${tag}: the movement surface is still reachable beside the cluster -- a finger at ${zx},${zy} `
      + `lands on the joystick, not on an ability button (got ${hit.name})`,
      hit.movement === true && hit.onButton === false, { hit, zx, zy });
  }

  /* ═══ v2.3.2562: BLOCK MUST STILL BE PRESSABLE WHERE IT LANDED ═══
     Moving a control into a band nothing has occupied recently is exactly how
     a button ends up perfect and unreachable, and this one has a history: the
     owner's report behind mp-duelblock was "I think I was unable to block".
     A rect cannot see it -- a covered button reports a perfectly good box
     (TRAPS 39) -- so this asks the browser what a finger would actually hit,
     and names whatever answers if it is not the button. */
  if (g.shield) {
    const blockHit = await P.page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { self: false, name: null, chain: [] };
      const chain = [];
      for (let n = el, i = 0; n && i < 5; n = n.parentElement, i++) {
        const c = String(n.className || '').split(' ').filter(Boolean).join('.');
        const r = n.getBoundingClientRect();
        chain.push(n.tagName + (n.id ? '#' + n.id : '') + (c ? '.' + c : '')
          + ' z=' + getComputedStyle(n).zIndex + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      return { self: !!el.closest('[data-shield]'), name: chain[0], chain };
    }, [g.shield.cx, g.shield.cy]);
    console.log(`    ${tag} BLOCK reach at ${g.shield.cx},${g.shield.cy}: ${JSON.stringify(blockHit)}`);
    rec.ok(`${tag}: a finger at the Block button's centre lands on the Block button (got ${blockHit.name})`,
      blockHit.self === true, blockHit);
  }

  /* ═══ WHIRL'S OWN RULE: SWORD ONLY -- AND SPECIAL MUST NOT MOVE WHEN IT GOES ═══
     The bow takes Whirlwind away (v2.3.2327) while the fight, the mana and the
     Special button all stay, so this is the cleanest way to put Special on
     screen WITHOUT its neighbour.  That matters beyond the weapon rule: since
     v2.3.2561 Whirlwind also vanishes out of combat, so Special is routinely
     drawn alone -- and a control that shifts when its neighbour hides is worse
     than either problem alone.  Slots are keyed by control for exactly this
     reason; this is the row that proves it. */
  await setup(P, { shield: true, shieldUp: false, slot: 'ranged' });
  await P.page.waitForTimeout(700);
  const bow = await boxes(P);
  console.log(`    ${tag} bow: whirl=${!!bow.whirl} special=${!!bow.special}`);
  rec.ok(`${tag}: guard: the fight is still live across the weapon swap, so the row below is about the WEAPON`,
    bow.lock === true, bow);
  rec.ok(`${tag}: with a BOW out, Whirlwind is gone entirely (not just greyed)`, !bow.whirl, bow.whirl);
  if (bow.special && d.special) {
    rec.ok(`${tag}: ...and the Special button did NOT move to fill the gap -- same pixels, neighbour or no neighbour`,
      bow.special.x === d.special.x && bow.special.y === d.special.y,
      { withWhirl: d.special, alone: bow.special });
  }

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/abilslot-${land ? 'landscape' : w + 'x' + h}.png` });
  await P.ctx.close().catch(() => {});
}
