/* ═══ THE COMBAT BUTTONS DO NOT HIDE UNDER THE DASHBOARD (v2.3.2254) ═══
 *
 * Owner: "[shield bash] needs to move up though it's behind the dashboard
 * right now (portrait)."
 *
 * Every one of these controls is anchored in `calc(var(--sheet-h, var(--dash-h))
 * + Npx)` and their N values were each chosen against a different snapshot of
 * that band.  The band moves (v2.3.2118's identity row, the landscape fold,
 * an open sheet), and nothing checked that the stack still cleared it -- so a
 * button could sit under the dashboard and every existing assertion would pass,
 * because a covered element still reports a perfectly good rect.
 *
 * This measures the real rects against the real dashboard, in portrait, with
 * the shield UP so the bash button is on screen.
 */
import * as H from './harness.mjs';

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  window.__centre = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
});

const rects = (P) => P.page.evaluate(() => {
  const one = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), shown };
  };
  /* The dashboard's own top edge: whichever of the band elements is highest. */
  const dashSel = ['.bt-dashboard', '.bt-bottom-dashboard', '[data-dash]', '.bt-navrail',
    /* v2.3.2254: .bt-dashboard above is the same element in BOTH snaps -- it
       simply grows to `expandedSheetHeight + var(--sab)` when a destination is
       open (BottomDashboard, v2.3.2198) -- so the expanded rows measure against
       the real painted top without a second selector.  .bt-land-sheet is the
       sideways side-panel, kept for the landscape case. */
    '.bt-land-sheet'];
  let dashTop = null;
  for (const s of dashSel) {
    const el = document.querySelector(s);
    if (!el) continue;
    const b = el.getBoundingClientRect();
    if (b.height > 0 && (dashTop == null || b.top < dashTop)) dashTop = Math.round(b.top);
  }
  const bus = window.__broDashPanelBus;
  const rootCS = getComputedStyle(document.documentElement);
  const cssBand = rootCS.getPropertyValue('--dash-h');
  const cssSheet = rootCS.getPropertyValue('--sheet-h');
  const cssSab = rootCS.getPropertyValue('--sab');
  return {
    dashTop, cssBand: cssBand.trim(), sheetH: cssSheet.trim(), sab: cssSab.trim(),
    innerH: window.innerHeight,
    mode: (bus && bus.state && bus.state.mode) || null,
    attack: one('.bt-rjoy-base'), shield: one('[data-shield]'),
    /* v2.3.2561: whirl's button exists only while a fight is on, so the lock is
       reported alongside it -- an absent button and a dropped lock are the same
       picture otherwise. */
    lock: !!(window._gameState.current && window._gameState.current.lockedTarget
      && window._gameState.current.lockedTarget.ref),
    bash: one('[data-ability="bash"]'), whirl: one('[data-ability="whirl"]'),
    /* v2.3.2472: the Special button; v2.3.2542 moved it off the movement disc
       and into the right-hand column, so the disc it must clear is the ATTACK
       one now -- `ljoy` stays because the "it is not on the left any more" row
       is worth keeping honest. */
    special: one('[data-special]'), ljoy: one('.bt-joystick-base'),
    /* v2.3.2542: the Element Burst button places itself independently of
       ctlColumn (ElementBurstButton.jsx: right = 50 + discW + 10, level with the
       disc's centre), which is the column's slot 0 within a couple of pixels.
       Measured here so a collision with the cluster is visible rather than
       inferred; it only renders for an enchanted weapon at level 6+, so on this
       fixture it is expected to be absent and the row below says so. */
    burst: one('.bt-burst-btn'),
  };
});

/* Several real phones, because the whole stack is anchored in `calc(band +
   Npx)` and the band's height is device-dependent -- a clearance that holds on
   a 390x844 can be gone on a shorter screen, which is exactly the shape of bug
   being chased here. */
const PHONES = [
  { width: 390, height: 844, tag: 'iPhone 13/14/15' },
  { width: 375, height: 667, tag: 'iPhone SE / 8' },
  { width: 360, height: 640, tag: 'small Android' },
  { width: 430, height: 932, tag: 'iPhone Pro Max' },
  /* ═══ THE INSTALLED LAUNCH (v2.3.2254) ═══
     The reason a browser-tab sweep can pass while the owner's phone shows a
     button under the band.  Standalone (added to the home screen) the page
     draws under the home indicator, so env(safe-area-inset-bottom) becomes
     ~34px -- and --dash-h counts it (v2.3.2178) while --sheet-h, which is
     what every floating control actually anchors to, does not.  The band
     grows DOWNWARD-inclusive and the controls do not move: the whole stack
     loses one inset of clearance.  env() cannot be set in a headless
     browser, so this overrides the same #bt-sab-probe the landscape suite
     already drives (v2.3.2178's note: "the QA harness simulates a
     standalone launch by overriding the probe"). */
  { width: 390, height: 844, tag: 'iPhone 13 STANDALONE', sab: 34 },
  { width: 430, height: 932, tag: 'iPhone Pro Max STANDALONE', sab: 34 },
  /* ═══ THE OWNER'S ACTUAL SCREEN (v2.3.2254) ═══
     A native 1290x2796 screenshot -- an iPhone Pro Max, 430x932 CSS at 3x --
     with the game installed to the home screen AND the dashboard sheet OPEN
     on the bag.  Measured off that capture: the band's painted top edge sits
     at CSS y 581.7, and the shield button (CSS x 308..356, so exactly its 48px
     width) is CUT OFF there with roughly 18 CSS px of it behind the band.

     The closed-bar rows above did not cover this: stampSheetH takes a
     DIFFERENT branch when mode === 'expanded' (expandedSheetHeight, not
     barHeight), so a fix verified with the sheet shut proves nothing about the
     state the owner is actually playing in.  Both insets, so the expanded
     branch is pinned with and without the home indicator. */
  { width: 430, height: 932, tag: 'Pro Max SHEET OPEN', expand: 'bag' },
  { width: 430, height: 932, tag: 'Pro Max STANDALONE + SHEET OPEN', sab: 34, expand: 'bag' },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const ph of PHONES) await onePhone({ browser, wsPort, webPort, rec }, ph);
}

async function onePhone({ browser, wsPort, webPort, rec }, phone) {
  const P = await H.newPlayer(browser, {
    name: 'Lay' + phone.width, wsPort, webPort,
    viewport: { width: phone.width, height: phone.height }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  if (phone.sab) {
    await P.page.evaluate((px) => {
      const st = document.createElement('style');
      st.textContent = '#bt-sab-probe{padding-bottom:' + px + 'px!important}';
      document.head.appendChild(st);
      window.dispatchEvent(new Event('resize'));
    }, phone.sab);
    await P.page.waitForTimeout(900);
  }
  await installTouch(P);
  /* A shield in hand, a monster near, and the shield RAISED — the only state
     in which the bash button exists (v2.3.2252). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
    /* v2.3.2472: a weapon in the active slot, because the Special button
       measured below refuses to exist without one (specialButtonLive) and a
       fresh character starts bare -- weapons begin in the bag. */
    if (S.rpg && !S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    if (S.rpg) S.rpg.activeSlot = S.rpg.activeSlot || 'melee';
    S._serverMonsters = false;
    S.monsters = [{
      id: 'lay_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 80, y: S.player.y, renderX: S.player.x + 80, renderY: S.player.y,
      hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
  });
  await P.page.waitForTimeout(700);
  if (phone.expand) {
    await P.page.evaluate((d) => { window.__broDashPanelBus.open(d); }, phone.expand);
    await P.page.waitForTimeout(900);
  }
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); if (c) { window.__touch(c.el, 'touchstart', c.x, c.y, 20); window.__touch(c.el, 'touchend', c.x, c.y, 20); } });
  await P.page.waitForTimeout(400);

  const r = await rects(P);
  const tag = `${phone.tag} ${phone.width}x${phone.height}`;
  if (phone.sab) {
    rec.ok(`${tag}: guard: the standalone inset really took (--sab is ${r.sab})`,
      Math.round(parseFloat(r.sab) || 0) === phone.sab, r);
  }
  console.log(`    LAYOUT ${tag}: ` + JSON.stringify(r));
  rec.ok(`${tag}: the dashboard band was found (guard)`,
    typeof r.dashTop === 'number' && r.dashTop > 0, r);
  /* GUARD, and it caught a real silent pass: the first version of the expanded
     rows measured a sheet that had never opened and went green anyway.  A row
     that claims to test the open sheet must prove the sheet is open. */
  rec.ok(`${tag}: guard: the sheet snap is what this row claims (${r.mode})`,
    r.mode === (phone.expand ? 'expanded' : 'bar'), { mode: r.mode, wanted: phone.expand ? 'expanded' : 'bar' });

  /* ═══ THE ROOT CAUSE, PINNED DIRECTLY (v2.3.2254) ═══
     Every assertion above is a CONSEQUENCE -- a button that happens to clear a
     band on one device at one size.  The defect itself is that two numbers
     describing the same band disagreed: --dash-h counts the home-indicator
     inset (v2.3.2178) and --sheet-h did not, so the controls hung 34px too low
     on an installed phone.  Pin the numbers, not just their symptom, and the
     next person who edits either formula fails here instead of on a phone.

     Portrait only: sideways --dash-h is the inset ALONE (v2.3.2168 removed the
     band), and the two are equal there for a different reason. */
  const _band = parseFloat(r.cssBand) || 0, _sheet = parseFloat(r.sheetH) || 0;
  rec.ok(`${tag}: --sheet-h and --dash-h agree (${_sheet} vs ${_band}) -- the controls hang from the same band the dashboard paints`,
    Math.abs(_sheet - _band) < 0.6, { sheetH: _sheet, dashH: _band, sab: r.sab });
  /* ...and the band PAINTS what it claims, so agreeing on a wrong number is
     not a pass either. */
  rec.ok(`${tag}: the band paints the height it declares (top ${r.dashTop} vs innerH ${r.innerH} - dash-h ${_band})`,
    Math.abs(r.dashTop - (r.innerH - _band)) <= 2, { dashTop: r.dashTop, innerH: r.innerH, dashH: _band });
  rec.ok(`${tag}: guard: the shield is up, so the bash button exists`,
    !!r.bash && r.bash.shown === true, r.bash);
  /* ═══ v2.3.2561: AND WHIRL EXISTS BECAUSE THERE IS A FIGHT ═══
     Its button disappears out of combat now (owner, after playing v2.3.2542),
     and the clearance loop below skips any box it cannot find -- so without
     this guard a whirl that stopped rendering would take its own assertion off
     the board and the suite would go green one row shorter (TRAPS §28).  The
     fixture above already seeds a monster 80px away, which is inside the 220px
     perimeter, so updateTargeting acquires the lock with no tap. */
  rec.ok(`${tag}: guard: a monster is in the perimeter, so the whirl button exists to be measured`,
    !!r.whirl && r.whirl.shown === true && r.lock === true, { whirl: r.whirl, lock: r.lock });

  /* THE CLAIM.  Every combat control's BOTTOM edge must sit above the
     dashboard's top edge -- not merely its top edge, or a button half-swallowed
     by the band still passes. */
  for (const [name, box] of [['attack', r.attack], ['shield', r.shield], ['bash', r.bash], ['whirl', r.whirl]]) {
    if (!box || !box.shown) continue;
    rec.ok(`${tag}: the ${name} button sits clear of the dashboard (bottom ${box.bottom} vs dash top ${r.dashTop})`,
      box.bottom <= r.dashTop, { name, box, dashTop: r.dashTop });
  }
  /* ...and the bash button clears the ATTACK DISC.
     ═══ v2.3.2327: "CLEAR" IS BOTH AXES, NOT JUST THE VERTICAL ONE ═══
     This asked `bash.bottom + 8 <= attack.top`, which is not "clear of" -- it
     is "ABOVE", and it was written (v2.3.2254) when above is where the button
     lived.  The owner has since moved it: "Put it down and to the left of the
     attack button."  Down-and-left passes the real test and fails this one,
     because the button now shares the disc's rows while sitting entirely to
     its left (measured at 390x844: bash right 243, disc left 244).
     Rewritten as the claim the sentence always made -- the two boxes do not
     intersect -- which is true of the old placement and the new one, and which
     would have caught a genuine overlap that the vertical-only form let past
     on any layout where the button moved sideways. */
  if (r.bash && r.attack && r.bash.shown && r.attack.shown) {
    const gap = 4;
    const clear = r.bash.right + gap <= r.attack.left
      || r.bash.left >= r.attack.right + gap
      || r.bash.bottom + gap <= r.attack.top
      || r.bash.top >= r.attack.bottom + gap;
    rec.ok(`${tag}: the bash button sits clear of the attack disc (no overlap on either axis)`,
      clear, { bash: r.bash, attack: r.attack });
  }
  /* ...and they do not overlap each other. */
  if (r.bash && r.shield && r.bash.shown && r.shield.shown) {
    rec.ok(`${tag}: the bash button does not overlap the shield button`,
      r.bash.bottom <= r.shield.top || r.bash.top >= r.shield.bottom
      || r.bash.right <= r.shield.left || r.bash.left >= r.shield.right,
      { bash: r.bash, shield: r.shield });
  }

  /* ═══ v2.3.2562: THE COLUMN IS DISMANTLED -- THREE CLAIMS, RE-POINTED ═══
     Owner, after playing the merged build: "I'd like the whirlwind and special
     attack buttons diagonally above the left joystick ... and the shield block
     button to the diagonal bottom left of that right joystick (as a mental
     separation for combat purpose further away from the other buttons on its
     own side)."

     These rows asserted D9's column -- one shared right edge, Block level with
     the disc's centre, Bash above it, Whirlwind above that.  Every one of those
     is now false BY REQUEST, so they are re-pointed at what the owner asked
     for rather than deleted: the file still makes a specific, falsifiable claim
     about where every combat control sits, which is the only reason it exists
     (three files once wrote three layout rules, and the drift cost the owner
     v2.3.2254 and v2.3.2327).

     WHAT SURVIVES UNCHANGED, because it was never about the column: nothing may
     touch the attack disc on either axis (a z31 sibling eats every touch in an
     overlap, and the disc is the control pressed most), and everything must
     clear the dashboard band.  Those rows are above and below this block.

     BASH DOES NOT MOVE.  The ask does not mention it, so it keeps slot 1 of
     what is left of the column -- asserted by the exact-pixel pin at the end of
     this block, which is what would catch it being dragged along by a careless
     edit to ctlColumn. */
  /* The right-hand side is Bash and Block now; the Special button left it for
     the left-hand cluster (v2.3.2562) and is measured in the second pass below,
     because specialButtonLive hides it behind the raised guard these rows use. */
  const rightSide = [['shield', r.shield], ['bash', r.bash]]
    .filter(([, b]) => b && b.shown);
  const leftSide = [['whirl', r.whirl]].filter(([, b]) => b && b.shown);
  /* ═══ v2.3.2542: NOTHING ELSE IS PARKED ON TOP OF THE CLUSTER ═══
     One MORE button places itself in this strip without going through
     ctlColumn: Element Burst.  A silent overlap between two z31 siblings is the
     failure D9's own note names, and it cannot be seen in a screenshot of a
     fixture that has no burst weapon.  So: if it is on screen at all, it must
     not sit on any combat button -- on either side, since v2.3.2562 put two of
     them across the screen. */
  if (r.burst && r.burst.shown) {
    for (const [name, box] of [...rightSide, ...leftSide]) {
      const clear = box.right <= r.burst.left || box.left >= r.burst.right
        || box.bottom <= r.burst.top || box.top >= r.burst.bottom;
      rec.ok(`${tag}: the Element Burst button does not overlap ${name}`,
        clear, { burst: r.burst, name, box });
    }
  } else {
    rec.skip(`${tag}: Element Burst vs the column`,
      'no burst button on this fixture (it needs an enchanted weapon at level 6+)');
  }
  if (r.attack && r.attack.shown) {
    for (const [name, box] of [...rightSide, ...leftSide]) {
      const clear = box.right <= r.attack.left
        || box.left >= r.attack.right
        || box.bottom <= r.attack.top
        || box.top >= r.attack.bottom;
      rec.ok(`${tag}: the ${name} button never overlaps the attack disc`,
        clear, { name, box, attack: r.attack });
    }
  }
  /* ── CLAIM 1: Block is DIAGONAL BOTTOM-LEFT of the attack disc ──
     Both axes, because "bottom left" is two facts and a button that was merely
     below it (or merely left of it) would pass a one-axis test. */
  if (r.shield && r.shield.shown && r.attack && r.attack.shown) {
    rec.ok(`${tag}: Block sits LEFT of the attack disc (${r.shield.right} <= ${r.attack.left})`,
      r.shield.right <= r.attack.left, { shield: r.shield, attack: r.attack });
    rec.ok(`${tag}: ...and BELOW it too, so it reads as the diagonal bottom-left corner `
      + `(block top ${r.shield.top} vs disc bottom ${r.attack.bottom})`,
      r.shield.top >= r.attack.bottom, { shield: r.shield, attack: r.attack });
  }
  /* ── CLAIM 2: and it is FAR from Bash, which is the owner's actual reason ──
     "a mental separation for combat purpose further away from the other buttons
     on its own side."  Distance is the feature, so it is a number, not an
     absence of overlap.  One button height of clear air is the floor: less than
     that and the two read as a pair again, which is what the move undid. */
  if (r.shield && r.bash && r.shield.shown && r.bash.shown) {
    const clearGap = r.shield.top - r.bash.bottom;
    const floor = r.shield.bottom - r.shield.top;   /* one button height */
    rec.ok(`${tag}: ...and Block is well clear of Shield Bash -- ${clearGap}px of air, `
      + `at least one button height (${floor}px)`,
      clearGap >= floor, { gap: clearGap, floor, shield: r.shield, bash: r.bash });
  }
  /* ── CLAIM 3: Whirlwind is on the LEFT now, above the movement disc ── */
  if (r.whirl && r.whirl.shown) {
    rec.ok(`${tag}: Whirlwind is on the LEFT half of the screen now (right edge ${r.whirl.right} < ${Math.round(phone.width / 2)})`,
      r.whirl.right <= phone.width / 2, { whirl: r.whirl, halfway: phone.width / 2 });
    if (r.ljoy && r.ljoy.shown) {
      rec.ok(`${tag}: ...and sits ABOVE the movement disc, not over its circle `
        + `(whirl bottom ${r.whirl.bottom} vs disc top ${r.ljoy.top})`,
        r.whirl.bottom <= r.ljoy.top, { whirl: r.whirl, ljoy: r.ljoy });
    }
    if (r.bash && r.bash.shown) {
      rec.ok(`${tag}: ...and is nowhere near Shield Bash any more -- they are on opposite sides`,
        r.whirl.right < r.bash.left, { whirl: r.whirl, bash: r.bash });
    }
  }
  /* ── BASH HELD ITS PIXELS ──
     The ask did not mention Bash, so it must not have drifted.  Its position is
     ctlColumn slot 1: the column's right edge, and one button-plus-gap above
     the disc's centre line.  Recomputed here from the disc's measured box
     rather than hard-coded, so the row survives a legitimate change to the
     disc's own geometry and only fires if BASH moved relative to it. */
  if (r.bash && r.bash.shown && r.attack && r.attack.shown) {
    const size = r.bash.bottom - r.bash.top;
    const discMidY = (r.attack.top + r.attack.bottom) / 2;
    const wantBottom = discMidY + size / 2 - (size + 8);   /* CTL_STACK_GAP */
    rec.ok(`${tag}: Shield Bash did NOT move -- still column slot 1 `
      + `(bottom ${r.bash.bottom}, expected ~${Math.round(wantBottom)})`,
      Math.abs(r.bash.bottom - wantBottom) <= 2, { bash: r.bash, attack: r.attack, wantBottom });
    rec.ok(`${tag}: ...and still hugs the disc's left edge, 4px clear (bash right ${r.bash.right}, disc left ${r.attack.left})`,
      Math.abs((r.attack.left - r.bash.right) - 4) <= 1, { bash: r.bash, attack: r.attack });
  }
  const slug = `${phone.width}x${phone.height}${phone.sab ? '-standalone' : ''}${phone.expand ? '-open' : ''}`;
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnlayout-${slug}.png` });

  /* ═══ SLIDE DOWN FROM ATTACK ONTO THE SHIELD (v2.3.2254) ═══
     Owner: "I'd like it if I can just slide my finger down from the attack
     button to the shield button and have it activate.  Right now if I slide
     my finger down while attacking the shield button doesn't activate."

     Driven as the phone drives it: touchstart ON THE ATTACK DISC, then moves
     dispatched to that same element (the browser routes every later touch to
     the element that took the touchstart -- which is exactly WHY the shield
     never saw the finger), then a touchend inside the shield's box.

     Two claims, and the second is the one that would have shipped broken: the
     guard goes up, AND the special is not spent on the way out.  A downward
     drag is fast and committed, which is precisely what bE's flick classifier
     is looking for. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._shieldUp) { const c = window.__centre('[data-shield]'); if (c) { window.__touch(c.el, 'touchstart', c.x, c.y, 31); window.__touch(c.el, 'touchend', c.x, c.y, 31); } }
  });
  await P.page.waitForTimeout(350);
  const pre = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { shieldUp: !!S._shieldUp, swipe: !!S._hasUsedSwipe, mp: S.rpg ? S.rpg.mp : null };
  });
  rec.ok(`${tag}: guard: the shield starts DOWN for the slide test`, pre.shieldUp === false, pre);

  /* ═══ v2.3.2542: THE SPECIAL BUTTON ORBITS THE ATTACK DISC NOW ═══
     Owner, after playing the merged build: "Move the Special attack button to
     orbit the RIGHT joystick, not the left."  Every row below asserted the
     mirror image of itself at v2.3.2472 ("stays in the left half", "clears the
     movement disc"); the left-half row is KEPT, inverted, because "it really
     did leave the left side" is the half of the move a right-side assertion
     cannot prove on its own.

     Measured HERE rather than with the column rows above because the button is
     hidden while the guard is raised (specialButtonLive) and those rows run
     with the shield deliberately UP so the bash button exists.

     v2.3.2562: its hazard moved BACK with it.  On the right it was the attack
     disc and the right zone; on the left it is the movement layer again
     ([data-joyzone="L"], the full-height left half at z6), so a press that
     leaked would walk or dodge instead of firing.  The geometry claims here are
     that it clears the movement DISC's circle and keeps a real gap from
     Whirlwind beside it.  (That a press is not READ as movement is a different
     claim and cannot be settled by a rect at all -- it is driven with a real
     finger in mp-abilslot, because dispatchEvent does not hit-test, TRAPS 67.) */
  const r2 = await rects(P);
  if (r2.special && r2.special.shown) {
    /* ═══ "IN THE RIGHT HALF" IS MEASURED AT THE CENTRE, NOT AT THE EDGE ═══
       The first cut of this row asked for the whole box to clear 50vw and
       failed at 375 and 360 -- correctly reporting a property the column
       already has and that D9 chose on purpose: the band between the movement
       zone and the disc is 34-49px wide, so ctlColumn pins the column's RIGHT
       edge to the disc and lets the shortfall come out of the movement zone
       (measured here: 7px over at 375, 14px at 360).  Every control in the
       column does that, and the alternative -- sliding right, under the attack
       disc -- is the one overlap that must never happen.
       So the claim is the one that is actually about this button: the thumb
       aims at its CENTRE, and that is on the attack side of the screen. */
    /* ═══ v2.3.2562: IT IS BACK ON THE LEFT, AND THE GAP IS THE POINT ═══
       These rows asserted the attack half, the column's shared right edge and
       the band below Block.  The owner has moved it back: "the whirlwind and
       special attack buttons diagonally above the left joystick (directionally
       above but diagonal to provide enough space between them for not
       accidentally pressing the other one)".  So the claims become the two
       halves of that sentence -- ABOVE the movement disc, and DIAGONAL to
       Whirlwind with a gap big enough to matter.

       THE GAP IS A NUMBER, NOT AN ABSENCE OF OVERLAP.  "Enough space for not
       accidentally pressing the other one" is not "they do not touch": two
       buttons shoulder to shoulder also do not touch, and that is exactly the
       layout the owner is complaining about.  So the clear edge-to-edge gap is
       measured and floored, and the value is printed at every width so the
       owner can judge the number against their own thumb -- which is the one
       part of this nobody can settle from a test. */
    rec.ok(`${tag}: the Special button is on the LEFT half now (right edge ${r2.special.right} <= ${Math.round(phone.width / 2)})`,
      r2.special.right <= phone.width / 2, r2.special);
    rec.ok(`${tag}: ...and sits clear of the dashboard`,
      r2.special.bottom <= r2.dashTop, { special: r2.special, dashTop: r2.dashTop });
    if (r2.attack && r2.attack.shown) {
      rec.ok(`${tag}: ...and is nowhere near the ATTACK disc any more`,
        r2.special.right <= r2.attack.left, { special: r2.special, attack: r2.attack });
    }
    if (r2.ljoy && r2.ljoy.shown) {
      rec.ok(`${tag}: ...sitting ABOVE the movement disc rather than over its circle `
        + `(special bottom ${r2.special.bottom} vs disc top ${r2.ljoy.top})`,
        r2.special.bottom <= r2.ljoy.top, { special: r2.special, ljoy: r2.ljoy });
    }
    if (r2.whirl && r2.whirl.shown) {
      const sMidX = (r2.special.left + r2.special.right) / 2;
      const sMidY = (r2.special.top + r2.special.bottom) / 2;
      const wMidX = (r2.whirl.left + r2.whirl.right) / 2;
      const wMidY = (r2.whirl.top + r2.whirl.bottom) / 2;
      const size = r2.special.bottom - r2.special.top;
      const centres = Math.round(Math.hypot(wMidX - sMidX, wMidY - sMidY));
      /* The clear air between the two boxes. They are separated on the
         HORIZONTAL axis by construction (leftCluster steps a full button plus
         LCTL_THUMB_GAP sideways), so that is the axis the gap lives on. */
      const gapX = Math.round(r2.whirl.left - r2.special.right);
      console.log(`    ${tag} DIAGONAL: centres ${centres}px apart, clear gap ${gapX}px, button ${size}px`);
      rec.ok(`${tag}: Whirlwind sits UP and to the RIGHT of Special -- a diagonal, not a stack or a row `
        + `(dx ${Math.round(wMidX - sMidX)}, dy ${Math.round(wMidY - sMidY)})`,
        wMidX > sMidX && wMidY < sMidY, { special: r2.special, whirl: r2.whirl });
      rec.ok(`${tag}: ...with real air between them -- ${gapX}px clear, at least half a button (${Math.round(size / 2)}px)`,
        gapX >= size / 2, { gapX, size, special: r2.special, whirl: r2.whirl });
      rec.ok(`${tag}: ...and their centres are more than a button apart (${centres}px vs ${size}px), `
        + `so a thumb aimed at one is not on the other`,
        centres > size * 1.4, { centres, size });
      rec.ok(`${tag}: ...and Whirlwind is on the left half too, beside it`,
        r2.whirl.right <= phone.width / 2, r2.whirl);
    }
  } else {
    rec.ok(`${tag}: guard: the Special button is on screen with a monster in the perimeter and the guard down`,
      false, r2.special);
  }

  /* v2.3.2542: a SECOND capture, with the guard down -- the only state in which
     the Special button exists, so the shot above (taken with the shield
     deliberately UP so bash renders) cannot show the full cluster.  Two shots,
     two states, because the cluster's membership changes between them. */
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnlayout-${slug}-special.png` });

  const slid = await P.page.evaluate(() => {
    const a = window.__centre('.bt-rjoy-base');
    const sh = window.__centre('[data-shield]');
    if (!a || !sh) return { err: 'no control' };
    window.__touch(a.el, 'touchstart', a.x, a.y, 40);
    /* Six steps down the gap, all dispatched to the ATTACK disc. */
    for (let i = 1; i <= 6; i++) {
      const f = i / 6;
      window.__touch(a.el, 'touchmove', a.x + (sh.x - a.x) * f, a.y + (sh.y - a.y) * f, 40);
    }
    window.__touch(a.el, 'touchend', sh.x, sh.y, 40);
    const S = window._gameState.current;
    return { shieldUp: !!S._shieldUp, swipe: !!S._hasUsedSwipe, mp: S.rpg ? S.rpg.mp : null };
  });
  rec.ok(`${tag}: sliding from the attack button onto the shield raises the guard`,
    slid.shieldUp === true, slid);
  rec.ok(`${tag}: ...and that slide does not also fire the special`,
    slid.swipe === pre.swipe, { pre, slid });

  await P.ctx.close().catch(() => {});
}
