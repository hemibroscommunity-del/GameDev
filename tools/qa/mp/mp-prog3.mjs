/* Prog3: the trained-skill combat rebuild, end to end through the real UI
 * (v2.3.1660; server core v2.3.1659; design docs/PROGRESSION-REDESIGN.md).
 *
 * What only THIS harness can prove (the server suite pins the math with a
 * mocked DO; here a real browser talks to the real worker):
 *
 *  - the respec actually reaches a fresh browser: caps.prog3 advertised,
 *    rpg.prog3 adopted from player_state, level/pools re-derived to the
 *    new formulas without the echo fighting the local recalc
 *  - the Character sheet's Build tab renders the allocation screen (three
 *    trained skills + seven stat rows) instead of the legacy launchers
 *  - a spend with an empty pool is refused end to end: the [+] buttons are
 *    disabled in the DOM, AND a forged raw prog3_allocate leaves the
 *    server's blob untouched (the deny is the server's, not just the UI's)
 *  - the persisted blob is stamped _v ≥ 10 with the respecced shape
 */
import * as H from './harness.mjs';
/* v2.3.1727: the retune moved HP_PER_LEVEL — read the constant rather than
   re-typing its value into an assertion (see the maxHp check below). */
import { PROG3 } from '../../../src/data/prog3.js';

/* v2.3.2199: the open lane's control count, derived from the constant
   tables the UI itself maps (4 ATK + 5 BODY = 9 against a prog3x worker;
   this harness always runs against the local worker, which advertises
   it) — a hand-typed 7 here went stale the day the dmg/elem stats
   shipped, which is exactly the trap the v2.3.1727 note above names. */
const STAT_ROWS = Object.keys(PROG3.ATK).length + Object.keys(PROG3.BODY).length;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Respec', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── the respec reaches the client ── */
  const adopted = await H.waitFor(P, (S) => {
    const R = S && S.rpg;
    return {
      caps: !!(S && S._serverCaps && S._serverCaps.prog3),
      p3: !!(R && R.prog3 && R.prog3.sk),
      level: R && R.level,
      maxHp: R && R.maxHp,
      pool: (R && R.prog3 && R.prog3.pool) || 0,
      sword: (R && R.prog3 && R.prog3.sk && R.prog3.sk.sword && R.prog3.sk.sword.level) || 0,
    };
  }, (v) => v.caps && v.p3, { timeout: 20000, label: 'prog3 adoption' }).catch(() => null);
  rec.ok('worker advertises caps.prog3 and the client adopts rpg.prog3', !!adopted, adopted);
  rec.ok('fresh character is level 3 (Σ of three level-1 trained skills)', adopted && adopted.level === 3, adopted);
  /* v2.3.1727: derived from the CLIENT mirror rather than the literal 106
     that was here.  The point of this assertion is that the client's
     recalcDerived agrees with the worker's _prog3Recompute — a hand-typed
     total silently stops testing that the moment either side is retuned,
     and re-typing the new number would just re-arm the same trap. */
  const expectHp = 100 + 3 * PROG3.HP_PER_LEVEL;
  rec.ok(`maxHp re-derives to the prog3 formula (100 + level×${PROG3.HP_PER_LEVEL})`,
    adopted && adopted.maxHp === expectHp, { ...adopted, expectHp });
  rec.ok('the allocation pool starts empty', adopted && adopted.pool === 0 && adopted.sword === 1, adopted);

  /* ── v2.3.1697: the aggregate stat readout (Character opens here) ──
     Armour became a SEVENTH cell in a grid that had six, and the fix for
     "seven into a 3-wide grid" was a fourth COLUMN rather than a third row
     — this panel's body is measured in single pixels and its scroll-edge
     fade is deliberately off, so anything below the fold is invisible with
     no cue.  Narrower columns move the risk from vertical to HORIZONTAL,
     so both are measured here: the block must not overflow its column, and
     no cell's own text may overflow the cell.

     ═══ v2.3.1972: THIS WAS FAILING ON THE SPELLING AND ON THE SHAPE ═══
     Both halves went red against a perfectly working screen, and both were
     this file being stale rather than the panel being broken:
       - the cell is labelled "Armor", not "Armour", and always has been
         (HeroExpanded's defenseCells);
       - it is a <span> inside a two-span row, so a `querySelectorAll('div')`
         search for a childless div could never have matched it under EITHER
         spelling;
       - and the flat 4x2 grid became two COLUMNS at v2.3.1890 (owner:
         "every stat is being treated as its own card... I'd switch to a
         character-sheet/list format"), Offense 4 + Defense 3, so
         `grid.children.length === 7` was asking about a container that no
         longer exists.
     Rewritten to find the ROW by its label span and count the seven rows
     inside the two-column block that holds them — which keeps the two things
     the assertions were actually for (the number is real, nothing is
     clipped) while letting the layout be whatever the owner last drew. */
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
  const armourCell = await P.page.evaluate(() => {
    /* A stat row is a div of exactly two spans: label, then value. */
    const rows = [...document.querySelectorAll('div')].filter((d) =>
      d.children.length === 2 && d.children[0].tagName === 'SPAN' && d.children[1].tagName === 'SPAN');
    const row = rows.find((d) => (d.children[0].textContent || '').trim() === 'Armor');
    if (!row) return { err: 'no ARMOR row on the character sheet',
      sawRows: rows.map((d) => (d.children[0].textContent || '').trim()).slice(0, 20) };
    /* row -> the group's list wrapper -> the group column -> the two-column
       block that holds Offense and Defense together. */
    const block = row.parentElement.parentElement.parentElement;
    const statRows = rows.filter((d) => block.contains(d));
    const over = statRows
      .flatMap((d) => [...d.children])
      .filter((t) => t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent.trim());
    return {
      value: (row.children[1].textContent || '').trim(),
      cells: statRows.length,
      gridOverflowX: block.scrollWidth - block.clientWidth,
      clipped: over,
    };
  });
  rec.ok('the character sheet shows an ARMOR row with a real percentage',
    !armourCell.err && /^\d+(\.\d)?%$/.test(String(armourCell.value || '')), armourCell);
  rec.ok('...and all seven stats still fit their column, uncropped',
    !armourCell.err && armourCell.cells === 7
    && armourCell.gridOverflowX <= 1 && armourCell.clipped.length === 0, armourCell);

  /* ── the Build tab renders the allocation screen ──
     v2.3.1972: "Points" is in the selector because v2.3.1849 renamed the tab
     (owner: "instead of build name it points") and the aria-label only falls
     back to "Build — N points" when there IS a badge.  This scenario's
     character has an EMPTY pool by design (asserted above), so the badge is
     absent and the label reads "Points" — which is why every Build assertion
     below it went red at once while the screen was fine.  All three spellings
     are listed rather than swapped, so the file survives the rename going
     either way. */
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first()
    .click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const disabled = await P.page.locator('[role="button"][aria-disabled="true"][aria-label*=" of "]').count().catch(() => 0);
  rec.ok('every stat is unspendable with an empty pool', disabled === STAT_ROWS, { disabled, STAT_ROWS });
  /* The selector is icon+level chips, so the type names live in
     aria-label rather than in the text — same icon-only recipe as the
     Hero section tabs.  Assert the accessible names, which is also what
     a screen reader gets. */
  const typeLabels = await P.page.locator('[role="button"][aria-label*="level"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))).catch(() => []);
  rec.ok('the combat-type selector offers all three types',
    ['Melee', 'Bow', 'Magic'].every((n) => typeLabels.some((l) => l && l.startsWith(n))), typeLabels);

  /* ═══ v2.3.2222: THE LANE SCROLLS NOW, AND THAT IS THE DESIGN ═══
     History of this guard, because it has flipped and the flip is on
     purpose.  v2.3.1660: "all stats ... can be seen all at once without
     scrolling" -- after five of seven sat below an uncued fold.  v2.3.2176
     relaxed it to "the OPEN lane's controls are all in view" when the
     accordion needed more than the band.  v2.3.2214 defended that at three
     phone sizes after the ninth stat fell off the screen.

     Then the owner: "a larger display of the allocable combat stats.  The
     accordion type display will need to scroll down to show them all.  I'm
     thinking each stat container needs to be about twice as large."  Rows
     went 21px -> 48px, one full-width column, and the lane scrolls.

     So what does the v2.3.1660 incident still forbid?  Not scrolling -- a
     player who could not know a stat existed.  The property is restated as
     the four things that actually protect against that:
       1. every one of the lane's controls is rendered (present at once);
       2. the FIRST is fully in view at rest -- the screen opens onto stats;
       3. the LAST is fully in view once the lane is scrolled to the bottom
          -- nothing is unreachable;
       4. every row clears the 44pt line, which is the reason for the size.
     A half-visible row at the fold is the scroll cue, and the lane headers
     stay sticky (asserted below) so the three weapons never leave. */
  const laneFit = await P.page.evaluate(async () => {
    const btn = document.querySelector('[aria-label*="Crit"], [aria-label*="Defense"]');
    if (!btn) return { err: 'no stat cell found' };
    let el = btn.parentElement;
    while (el && getComputedStyle(el).overflowY !== 'auto') el = el.parentElement;
    if (!el) return { err: 'no scroll container' };
    const vh = window.innerHeight;
    const rows = () => [...document.querySelectorAll('[role="button"][aria-label*=" of "]')];
    const box = () => el.getBoundingClientRect();
    const floor = () => Math.min(box().bottom, vh);
    /* THE CEILING IS THE PINNED STACK, NOT THE PANEL'S TOP.  The section
       tabs and the open lane's header are position:sticky inside this same
       scroller, so a row can be inside the panel's box and still be under
       them -- the first draft of this guard measured against box().top and
       passed a row the player could not see (a screenshot at max scroll
       showed ELEM POWER peeking out from under the tabs).  So: the lowest
       bottom edge of any sticky element in the scroller is the ceiling. */
    const ceiling = () => {
      /* Only elements that are actually STUCK count -- a sticky element
         sitting in normal flow (the collapsed BOW/MAGIC headers near the
         bottom) is not a ceiling.  Stuck means its top is at the scroller's
         top plus its own `top` offset; the first draft walked every sticky
         element within 80px of the last one and chained straight through
         the collapsed lanes, reporting a ceiling 100px lower than the real
         one. */
      let c = box().top;
      for (const e of el.querySelectorAll('*')) {
        const cs = getComputedStyle(e);
        if (cs.position !== 'sticky') continue;
        const b = e.getBoundingClientRect();
        const stuckAt = box().top + (parseFloat(cs.top) || 0);
        if (b.height > 0 && Math.abs(b.top - stuckAt) <= 1.5 && b.bottom > c) c = b.bottom;
      }
      return c;
    };
    const inView = (r) => { const b = r.getBoundingClientRect(); return b.top >= ceiling() - 1 && b.bottom <= floor() + 1; };
    const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    el.scrollTop = 0; await settle();
    const all = rows();
    const firstIn = all.length ? inView(all[0]) : false;
    const heights = all.map((r) => Math.round(r.getBoundingClientRect().height));
    const targets = all.map((r) => {
      const i = r.querySelector('[data-stat-info]');
      return i ? Math.round(Math.min(i.getBoundingClientRect().width, i.getBoundingClientRect().height)) : null;
    });
    /* REACHABLE means: there is a scroll position at which the last row is
       wholly visible between the pinned stack and the floor.  Scroll so its
       bottom meets the floor (clamped to the end of the content), then ask
       whether its top clears the ceiling. */
    const last = all[all.length - 1];
    let lastIn = false, lastAtMax = null;
    if (last) {
      const want = el.scrollTop + (last.getBoundingClientRect().bottom - floor());
      el.scrollTop = Math.max(0, Math.min(want, el.scrollHeight - el.clientHeight)); await settle();
      lastIn = inView(last);
      el.scrollTop = el.scrollHeight; await settle();
      const b = last.getBoundingClientRect();
      lastAtMax = Math.round(Math.min(b.bottom, floor()) - Math.max(b.top, ceiling()));   /* px of it still showing */
    }
    el.scrollTop = 0;
    return { cells: all.length, firstIn, lastIn, lastAtMax, minRow: Math.min(...heights), minInfo: Math.min(...targets.filter((t) => t != null)),
      panel: Math.round(box().height), over: Math.max(0, el.scrollHeight - el.clientHeight) };
  });
  rec.ok('every one of the open lane\'s controls is rendered (present at once)',
    !laneFit.err && laneFit.cells === STAT_ROWS, laneFit);
  rec.ok('...the first is fully in view at rest — the screen opens onto stats',
    !laneFit.err && laneFit.firstIn, laneFit);
  rec.ok('...the last is fully in view once scrolled to — nothing is unreachable',
    !laneFit.err && laneFit.lastIn, laneFit);
  /* And a flick that overshoots to the very end must not bury it: at max
     scroll the last row is still WHOLLY between the pinned stack and the
     floor.  This is why the resting DPS strip moved above the lanes: with
     it and two collapsed lanes under the last row, a scroll to the end left
     a 14px sliver of ELEM POWER peeking out from under the tabs. */
  rec.ok('...and a scroll that overshoots to the end still shows all of it',
    !laneFit.err && laneFit.lastAtMax >= laneFit.minRow - 1, laneFit);
  rec.ok('...every row clears the 44pt line, which is what "twice as large" bought',
    !laneFit.err && laneFit.minRow >= 44, laneFit);
  rec.ok('...and every ℹ️ is a real thumb target, not a glyph',
    !laneFit.err && laneFit.minInfo >= 30, laneFit);

  /* ═══ v2.3.2326: AND FOR EVERY LANE, NOT JUST THE ONE WE LANDED ON ═══
     The laneFit block above measures whichever lane prog3ActiveCat happens to
     open for this character -- always Melee here -- and Melee is the ONE lane
     that is fine.  The three lane headers stack, so each lane's first stat row
     starts 29px lower than the last:

         Melee open   row1 118.25..166.25   fully visible at every width
         Bow   open   row1 147.25..195.25   43.75px of 48 at 390, 21.75 at 320
         Magic open   row1 176.25..224.25   14.75px at 390, ZERO at 320

     So with Magic selected on a 320px phone the first allocable stat is
     entirely below the fold, and the scroll-edge fade is deliberately off
     (HeroExpanded v2.3.2288, owner: "the last row is faded at the bottom"), so
     nothing on screen says it is there.  That is the v2.3.1660 incident --
     "a player who could not know a stat existed" -- live, and no assertion
     could see it because none of them ever selected a different lane.

     This loop selects each lane in turn and demands the same answer from all
     three.  It is expected to FAIL until the columns land: a guard that goes
     green the moment you write it is measuring nothing. */
  const firstRowByLane = await P.page.evaluate(async () => {
    const out = [];
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    /* Remember what was open, and put it back at the end. This probe walks all
       three lanes, and everything below it is written against the lane
       prog3ActiveCat picked -- leaving Magic open cost five later assertions
       their screen the first time round. */
    const was = (document.querySelector('[data-prog3-lane][aria-expanded="true"]') || {})
      .dataset ? document.querySelector('[data-prog3-lane][aria-expanded="true"]').dataset.prog3Lane : null;
    const press = async (el) => {
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      el.dispatchEvent(new PointerEvent('pointerup', o));
      await wait(); await new Promise((r2) => setTimeout(r2, 260));
    };
    for (const k of ['sword', 'bow', 'staff']) {
      const head = document.querySelector(`[data-prog3-lane="${k}"]`);
      if (!head) { out.push({ k, err: 'no lane' }); continue; }
      if (head.getAttribute('aria-expanded') !== 'true') await press(head);
      const btn = document.querySelector('[role="button"][aria-label*=" of "]');
      if (!btn) { out.push({ k, err: 'no stat row' }); continue; }
      let sc = btn.parentElement;
      while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
      if (sc) sc.scrollTop = 0;
      await wait();
      const b = btn.getBoundingClientRect();
      const p = sc ? sc.getBoundingClientRect() : null;
      /* The ceiling is the pinned stack, exactly as the block above defines it. */
      let ceil = p ? p.top : 0;
      if (sc) {
        for (const e of sc.querySelectorAll('*')) {
          const cs = getComputedStyle(e);
          if (cs.position !== 'sticky') continue;
          const bb = e.getBoundingClientRect();
          const stuckAt = p.top + (parseFloat(cs.top) || 0);
          if (bb.height > 0 && Math.abs(bb.top - stuckAt) <= 1.5 && bb.bottom > ceil) ceil = bb.bottom;
        }
      }
      const floor = p ? Math.min(p.bottom, window.innerHeight) : window.innerHeight;
      out.push({ k, top: Math.round(b.top), h: Math.round(b.height),
        visible: Math.round(Math.max(0, Math.min(b.bottom, floor) - Math.max(b.top, ceil))),
        full: b.top >= ceil - 1 && b.bottom <= floor + 1 });
    }
    /* Put the screen back the way we found it. */
    if (was) {
      const back = document.querySelector(`[data-prog3-lane="${was}"]`);
      if (back && back.getAttribute('aria-expanded') !== 'true') await press(back);
      let sc0 = document.querySelector('[role="button"][aria-label*=" of "]');
      sc0 = sc0 && sc0.parentElement;
      while (sc0 && getComputedStyle(sc0).overflowY !== 'auto') sc0 = sc0.parentElement;
      if (sc0) sc0.scrollTop = 0;
      await wait();
    }
    return out;
  });
  console.log('    first stat row, per lane: ' + JSON.stringify(firstRowByLane));
  rec.ok('EVERY combat lane opens onto its first stat row, not just the default one',
    firstRowByLane.every((r) => r.full === true), firstRowByLane);
  /* And it should be the SAME row position whichever lane you picked -- a
     layout where the answer depends on which of three you chose is the shape
     of the bug above, even when all three happen to clear the fold. */
  const tops = firstRowByLane.filter((r) => r.top != null).map((r) => r.top);
  rec.ok('...at the same height for all three, so the choice cannot push it under the fold',
    tops.length === 3 && (Math.max(...tops) - Math.min(...tops)) <= 1, { tops });


  /* ═══ v2.3.2315: THE ACCORDION ACTUALLY CLOSES ═══
     Owner: "the stat allocation accordion menu doesn't collapse when I tap on
     it."  It did not: the header called setBuildCat(sk.key), a SET rather
     than a toggle, so tapping the open lane re-selected the lane it was
     already on.

     THREE TAPS, because a one-tap test cannot tell a toggle from a break.
     "It closed" would also pass on a build that closed and could never
     reopen, and "a second lane opens" would pass on the old set-only code --
     which is the exact behaviour being replaced. So: close it, reopen it,
     then move to a different lane. */
  const laneState = () => P.page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-prog3-lane]')];
    return {
      lanes: rows.length,
      open: rows.filter((r) => r.getAttribute('aria-expanded') === 'true')
        .map((r) => r.getAttribute('data-prog3-lane')),
    };
  });
  /* ═══ v2.3.2326: THIS TEST WAS WHY THE BUG SHIPPED TWICE ═══
     It dispatched PointerEvents STRAIGHT AT THE ELEMENT, which is not a tap --
     it is a function call wearing a tap's clothes.  It cannot miss, cannot be
     covered, cannot be cancelled, and cannot be stolen by a scroller, so it
     was green through two rounds of the owner reporting the exact behaviour it
     claims to pin ("the stat allocation accordion menu doesn't collapse",
     then "tapping on the open accordion doesn't close it again").

     What it could not see, measured with real CDP touch events on the running
     game: the lane header lives in the sheet's scroller, and at ~15px of
     finger travel the browser calls the touch a scroll, fires pointercancel,
     and sends NO pointerup -- so the onPointerUp toggle never ran.  Every real
     thumb drifts that far on a 28px row.

         drift  0-12px   pointerup delivered      lane closes
         drift 16-32px   POINTERCANCEL instead    nothing happens

     So the tap is a REAL TOUCH now, through CDP, with drift -- the same
     fingerTap idea mp-notifbell uses (v2.3.2175, for the same class of bug in
     the world-chat bell).  DRIFT IS THE POINT: a pixel-perfect tap passes on
     the broken build too, which is what a synthetic dispatch was really
     asserting all along. */
  const tapLane = async (key, drift = 18) => {
    const at = await P.page.evaluate((k) => {
      const el = document.querySelector(`[data-prog3-lane="${k}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      /* Report what is really at that point: a lane below the fold answers
         nothing, and a tap aimed there measures the wrong screen. */
      const hit = document.elementFromPoint(x, y);
      return { x, y, onLane: !!(hit && hit.closest && hit.closest(`[data-prog3-lane="${k}"]`)) };
    }, key);
    if (!at || !at.onLane) return false;
    const cdp = await P.page.context().newCDPSession(P.page);
    /* Upward drift: these headers sit at the TOP of the scroller, so a
       downward drag there is an overscroll that moves nothing, and an upward
       one at the bottom likewise.  Either way the panel does not move, which
       is precisely the case the fix has to recover -- a gesture the browser
       confiscated for a scroll that never happened. */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] });
    for (let i = 1; i <= 4; i++) {
      await new Promise((r) => setTimeout(r, 22));
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: at.x, y: at.y + (drift * i) / 4 }] });
    }
    await new Promise((r) => setTimeout(r, 22));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    return true;
  };

  const l0 = await laneState();
  rec.ok('exactly one lane is open to begin with (guard)',
    l0.lanes === 3 && l0.open.length === 1, l0);
  const wasOpen = l0.open[0];
  if (wasOpen) {
    rec.ok('the open lane can be tapped (guard)', await tapLane(wasOpen), {});
    await P.page.waitForTimeout(350);
    const l1 = await laneState();
    rec.ok('tapping the OPEN lane collapses it -- the whole ask',
      l1.open.length === 0, { before: wasOpen, after: l1 });

    await tapLane(wasOpen);
    await P.page.waitForTimeout(350);
    const l2 = await laneState();
    /* Without this a build that collapsed and stuck would look fixed. */
    rec.ok('...and tapping it again re-opens it, so the collapse is not a trap',
      l2.open.length === 1 && l2.open[0] === wasOpen, l2);

    /* Scrolled into view first, on purpose and with a note: with one lane open
       its seven stat rows push the other two headers ~413px BELOW the panel
       (measured at 390x844: panel 653..844, bow header top 1257).  A tap aimed
       at a rect that is off screen lands on whatever is really there, so this
       would otherwise be measuring the wrong thing -- and the layout fact it
       exposes is asserted on its own below. */
    const other = ['sword', 'bow', 'staff'].find((k) => k !== wasOpen);
    await P.page.evaluate(() => {
      const el = document.querySelector('[data-prog3-lane]');
      for (let n = el; n; n = n.parentElement)
        if (n.scrollHeight - n.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) { n.scrollTop = n.scrollHeight; break; }
    });
    await P.page.waitForTimeout(300);
    await tapLane(other, -18);
    await P.page.waitForTimeout(350);
    const l3 = await laneState();
    /* One at a time is the design, and the toggle must not have broken it. */
    rec.ok('...while tapping a DIFFERENT lane still switches to it, one open at a time',
      l3.open.length === 1 && l3.open[0] === other, { other, l3 });
    /* Put the screen back the way the rest of this file expects it, from the
       TOP of the scroller where a downward drift cannot move anything. */
    await P.page.evaluate(() => {
      const el = document.querySelector('[data-prog3-lane]');
      for (let n = el; n; n = n.parentElement)
        if (n.scrollHeight - n.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) { n.scrollTop = 0; break; }
    });
    await P.page.waitForTimeout(250);
    await tapLane(wasOpen);
    await P.page.waitForTimeout(300);

    /* ═══ v2.3.2326: AND THE OTHER TWO COMBAT TYPES ARE REACHABLE ═══
       HeroExpanded's v2.3.2176 note says "the three weapons stay on screen at
       all times ... the NAVIGATION is sticky", and that is how this screen is
       supposed to avoid repeating the v2.3.1660 incident (things below an
       uncued fold, with the scroll-edge fade deliberately off).

       Measured at 390x844 with one lane open, it does not hold: the panel is
       653..844 and the other two headers sit at 1257 and 1286 -- 413px below
       it, with no cue.  Each header is sticky INSIDE ITS OWN LANE div, and a
       collapsed lane IS its header, so it has no travel to stick through.
       They do all appear together once you scroll to the bottom, which is
       where the claim came from.

       Asserted as "reachable from somewhere", which is the honest current
       contract, and printed either way so the number is visible when this
       screen is redesigned. */
    const reach = await P.page.evaluate(() => {
      const el = document.querySelector('[data-prog3-lane]');
      let sc = null;
      for (let n = el; n; n = n.parentElement)
        if (n.scrollHeight - n.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) { sc = n; break; }
      const look = () => {
        const p = sc ? sc.getBoundingClientRect() : null;
        return [...document.querySelectorAll('[data-prog3-lane]')].map((x) => {
          const b = x.getBoundingClientRect();
          return { k: x.getAttribute('data-prog3-lane'), top: Math.round(b.top),
            on: p ? (b.bottom > p.top + 1 && b.top < p.bottom - 1) : true };
        });
      };
      const was = sc ? sc.scrollTop : 0;
      if (sc) sc.scrollTop = 0;
      const atTop = look();
      if (sc) sc.scrollTop = sc.scrollHeight;
      const atBottom = look();
      if (sc) sc.scrollTop = was;
      return { atTop, atBottom,
        onAtTop: atTop.filter((l) => l.on).length,
        onAtBottom: atBottom.filter((l) => l.on).length };
    });
    console.log('    lane reachability — at top: ' + JSON.stringify(reach.atTop));
    console.log('                     at bottom: ' + JSON.stringify(reach.atBottom));
    /* v2.3.2326: onAtTop, not onAtBottom.  This printed onAtTop and asserted
       only the bottom, because when it was written the answer at the top was
       1 and the honest contract was "reachable from somewhere".  With the
       lanes side by side it is 3 at rest, which is the whole point of the
       change, so the printed number becomes the assertion. */
    rec.ok('all three combat types are on screen AT REST, without scrolling for them',
      reach.onAtTop === 3, reach);
  }

  /* ═══ v2.3.2315: AND THE TWO THINGS HE HAS TO READ ARE READABLE ═══
     Owner: "the expand and unexpand up/down arrows and level label needs to
     increase in size for legibility."  Both were 10px, and the arrow was
     COL.muted -- the dimmest, smallest thing on a row it is the affordance
     for. Asserted as a floor rather than an exact value so a later type
     retune is free to go bigger, and read off the RENDERED style so a change
     that only edits a constant somewhere else cannot pass. */
  const legibility = await P.page.evaluate(() => {
    const lane = document.querySelector('[data-prog3-lane]');
    if (!lane) return null;
    const spans = [...lane.querySelectorAll('span')];
    const arrow = spans.find((x) => /[\u25B2\u25BC]/.test(x.textContent || ''));
    const lv = spans.find((x) => /^LV\s/.test((x.textContent || '').trim()));
    const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : null);
    return { arrow: px(arrow), lv: px(lv),
      arrowColor: arrow ? getComputedStyle(arrow).color : null };
  });
  rec.ok('the expand/collapse arrow is big enough to read', !!legibility && legibility.arrow >= 13, legibility);
  rec.ok('...and the level label with it', !!legibility && legibility.lv >= 12, legibility);

  /* The three lanes are the navigation, so they must never scroll away. */
  /* ═══ v2.3.2326: THE PROPERTY, NOT THE DECLARATION ═══
     This asked whether every lane header carried `position: sticky`, which is
     a fact about CSS and not about the player.  It was green the whole time
     the other two combat types were sitting 413px below the panel with no cue
     -- because sticky resolves inside each element's OWN containing block, and
     a collapsed lane WAS its header, so it had nothing to stick through.  The
     declaration was present and the effect was absent.
     What the assertion was always for: the three weapons never scroll away.
     Ask that instead, at the top, the middle and the bottom of the scroll --
     and while we are here, ask the thing nobody asked, which is whether each
     one is a thumb-sized target. */
  const navAlways = await P.page.evaluate(async () => {
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let sc = document.querySelector('[role="button"][aria-label*=" of "]');
    sc = sc && sc.parentElement;
    while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
    if (!sc) return { err: 'no scroll container' };
    const look = () => {
      const p = sc.getBoundingClientRect();
      return [...document.querySelectorAll('[data-prog3-lane]')].map((x) => {
        const b = x.getBoundingClientRect();
        return { k: x.getAttribute('data-prog3-lane'),
          on: b.bottom > p.top + 1 && b.top < p.bottom - 1,
          h: Math.round(b.height) };
      });
    };
    const at = {};
    for (const [tag, pos] of [['top', 0], ['mid', sc.scrollHeight / 2], ['max', sc.scrollHeight]]) {
      sc.scrollTop = pos; await wait();
      at[tag] = look();
    }
    sc.scrollTop = 0; await wait();
    return at;
  });
  console.log('    navigation through the scroll: ' + JSON.stringify(navAlways));
  rec.ok('the three combat types never scroll away — all on screen at top, middle and end',
    !navAlways.err && ['top', 'mid', 'max'].every((t) => navAlways[t].length === 3
      && navAlways[t].every((l) => l.on)), navAlways);
  rec.ok('...and each is a real thumb target, not a strip',
    !navAlways.err && navAlways.top.every((l) => l.h >= 44), navAlways.top);
  /* ═══ v2.3.2326: THE FAILURE THAT WOULD LOOK LIKE FONT RENDERING ═══
     A column is a fixed 44px box holding a two-line stack: icon 18 + gap 2 +
     the LV line.  That last number is only 15 if someone SETS it -- left to
     `normal`, Source Sans 3 gives 1.2-1.3, the stack becomes 37 in 35, and a
     centred flex column overflows symmetrically: half a pixel off the icon's
     top, half off the LV's descenders.  In a screenshot that reads as bad type
     rendering, not as a bug, and not one existing assertion measures this box
     -- minRow measures stat rows, pillGeom walks pills.  It would ship, and
     the report would be "the columns look squashed" with nothing to point at.
     So: ask the box directly. */
  const colFit = await P.page.evaluate(() => [...document.querySelectorAll('[data-prog3-lane]')]
    .map((c) => ({ k: c.getAttribute('data-prog3-lane'),
      scrollH: c.scrollHeight, clientH: c.clientHeight,
      scrollW: c.scrollWidth, clientW: c.clientWidth })));
  console.log('    column fit: ' + JSON.stringify(colFit));
  rec.ok('no combat column overflows its own box, vertically or horizontally',
    colFit.every((c) => c.scrollH <= c.clientH + 1 && c.scrollW <= c.clientW + 1), colFit);
  /* ═══ v2.3.2176b: AND THE PIN DOES NOT LAND ON THE FIRST STAT ═══
     The assertion above passed on a build where the open lane's header sat
     32px BELOW where it belonged, on top of its own Crit row -- because it
     checked the DECLARATION and not the effect.  (The lane box carried
     overflow:hidden, which makes it a scroll container, so `sticky` resolved
     against the lane instead of the panel and pushed the header down into
     it.)  A screenshot caught it; this checks it: the open header's bottom
     is at or above the first control's top, and the header sits at the top
     of its own lane, not somewhere inside it. */
  const pinned = await P.page.evaluate(() => {
    const head = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .find((l) => l.getAttribute('aria-expanded') === 'true');
    if (!head) return { err: 'no open lane' };
    /* v2.3.2326: the body is a SIBLING of the selector now, not a child of a
       lane, which is the whole point -- it is why the first stat row lands at
       the same y whichever weapon you picked.  So it is found the way the
       markup says to find it, through aria-controls, rather than by walking up
       to a parent that no longer holds it. */
    const bodyId = head.getAttribute('aria-controls');
    const body = bodyId && document.getElementById(bodyId);
    const first = (body || head.parentElement).querySelector('[role="button"][aria-label*=" of "]');
    if (!first) return { err: 'no stat row' };
    const h = head.getBoundingClientRect(); const f = first.getBoundingClientRect();
    return { overlap: Math.round(h.bottom - f.top), viaAriaControls: !!body };
  });
  rec.ok('...and the pinned selector never covers the first stat it controls',
    !pinned.err && pinned.overlap <= 1, pinned);

  const cells = await P.page.locator('[aria-disabled][role="button"][aria-label*=" of "]').count().catch(() => 0);
  rec.ok('all allocatable stats are present at once', cells === STAT_ROWS, { cells, STAT_ROWS });

  /* ═══ v2.3.1710: AND ALL SEVEN ARE THE SAME SIZE ═══
     Owner: "Character build stat allocation pills should all be the same
     size."  v2.3.1703 had laid them out as two grids — the three attack
     stats 3-wide, the four body stats 2-wide — which made a body pill 187px
     against an attack pill's 123px on this viewport.
     Measured rather than eyeballed, because the failure mode is a SECOND
     grid appearing next time someone needs to buy one group more width; the
     no-scroll assertion above would stay green through exactly that change.
     Label clipping is measured with it: uniformity bought by squeezing every
     pill down to the widest label's breaking point would satisfy the letter
     of the owner's ask and lose the point of v2.3.1703 (an 8px label nobody
     could read). */
  const pillGeom = await P.page.evaluate(() => {
    const pills = [...document.querySelectorAll('[role="button"][aria-label*=" of "]')];
    const box = pills.map((p) => {
      const r = p.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height),
        stat: (p.getAttribute('aria-label') || '').split(',')[0] };
    });
    const clipped = pills
      .flatMap((p) => [...p.querySelectorAll('div')])
      .filter((t) => t.children.length === 0 && t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent.trim());
    const fonts = pills
      .flatMap((p) => [...p.querySelectorAll('div')])
      .filter((t) => t.children.length === 0)
      .map((t) => parseFloat(getComputedStyle(t).fontSize));
    return { box, clipped, minFont: fonts.length ? Math.min(...fonts) : null };
  });
  const widths = [...new Set((pillGeom.box || []).map((b) => b.w))];
  const heights = [...new Set((pillGeom.box || []).map((b) => b.h))];
  rec.ok('every allocation pill is exactly one size',
    pillGeom.box.length === STAT_ROWS && widths.length === 1 && heights.length === 1, pillGeom.box);
  rec.ok('...with no label cropped to buy that uniformity',
    (pillGeom.clipped || []).length === 0, pillGeom.clipped);
  /* The 10px floor is this project's own (v2.3.1239), and v2.3.1703 exists
     because it had been broken here. */
  rec.ok('...and nothing on a pill below the 10px font floor',
    pillGeom.minFont !== null && pillGeom.minFont >= 10, { minFont: pillGeom.minFont });

  /* ── an empty-pool spend is refused SERVER-side, not just greyed out ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'prog3_allocate', payload: { stat: 'hp' } });
  });
  await P.page.waitForTimeout(1200);
  const admin = await H.adminPlayer(wsPort, myId);
  const blob = admin && admin.rpg;
  rec.ok('forged empty-pool spend leaves the server blob untouched',
    blob && blob.prog3 && (blob.prog3.alloc.hp || 0) === 0 && (blob.prog3.pool || 0) === 0,
    blob && blob.prog3);
  rec.ok('the persisted blob is respecced and stamped (_v ≥ 10)',
    blob && typeof blob._v === 'number' && blob._v >= 10 && blob.prog3.sk.staff.level === 1,
    blob && { _v: blob._v });

  /* ── v2.3.1686: the transient XP bar reads the TRAINED skill ──
     Owner: "I see an XP bar appear after killing monsters which would be
     fine if it represented one of the three active combat skills you're
     actually earning xp in."
     It was reading the LEGACY `weaponSkills` map, which prog3 retired — so
     it showed a level and a fill that no kill was feeding.
     The two tracks are seeded with deliberately different levels here, so
     the assertion can only pass by reading the right one: if the bar says
     Lv 40 it is still on the dead map, Lv 5 means prog3. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R) return;
    R.weaponSkills = R.weaponSkills || {};
    R.weaponSkills.sword = { level: 40, xp: 999 };      /* the retired track */
    if (R.prog3 && R.prog3.sk) R.prog3.sk.sword = { level: 5, xp: 7 };
    S._hudPopups = S._hudPopups || [];
    S._hudPopups.push({ id: 'qa-xp', target: 'xpBar', text: '+12 XP',
      color: '#60a5fa', ts: Date.now() });
  });
  /* ═══ v2.3.1874: THE READOUT MOVED, THE QUESTION DID NOT ═══
     The transient top-centre bar this used to read is retired — a kill's XP
     now flies from the character into the combat CARD for its skill (see
     XpFlyOverlay / mp-xpfly).  The owner report behind these assertions is
     unchanged though ("an XP bar ... which would be fine if it represented
     one of the three active combat skills you're actually earning xp in"), so
     they are re-pointed at the card rather than deleted: the two tracks are
     still seeded with different levels above, and the card can still only
     show the right one by reading prog3. */
  /* Back to the resting dashboard first: the cards live there, and this
     scenario has been sitting on the Build screen.  The bar these assertions
     used to read floated over everything, so it needed no such step — the
     card is part of the dashboard and only exists when the dashboard does. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(700);
  const cardText = await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .find((e) => /Melee level/i.test(e.getAttribute('aria-label') || ''));
    if (!el) return null;
    return { aria: el.getAttribute('aria-label'), title: el.getAttribute('title') || '' };
  });
  rec.ok('the melee combat card is on screen to receive the XP', !!cardText, cardText);
  rec.ok('...showing the prog3 trained level, not the retired weapon-skill one',
    !!cardText && /level 5\b/i.test(cardText.aria) && !/level 40\b/i.test(cardText.aria), cardText);
  rec.ok('...named the way every other screen names it (Melee, not Sword)',
    !!cardText && /Melee/i.test(cardText.aria), cardText);

  await P.ctx.close().catch(() => {});

  /* ═══ v2.3.2326: THE COLUMNS, ON THE NARROW PHONES, WITH POINTS TO SPEND ═══
     Three columns share one row, so width is the thing that can go wrong, and
     it goes wrong worst where there is least of it AND most to show: 320px
     with an unspent-points badge on every column.  A default harness character
     has an EMPTY pool by design (asserted at the top of this file), so without
     seeding it this would be measuring the easy case -- no badge, no brass.
     The recipe is mp-landscape-dash's (:541-549), which is the only other
     non-empty-pool render in the suite.
     320x568 is deliberately in the list even though nothing else in this file
     goes that narrow: it is the width at which the OLD layout put Magic's
     first stat row entirely below the fold. */
  for (const [w, h] of [[390, 844], [360, 800], [320, 568]]) {
    const N = await H.newPlayer(browser, { name: `Col${w}`, wsPort, webPort,
      viewport: { width: w, height: h }, touch: true });
    await H.enterWorld(N);
    await N.page.waitForTimeout(2200);
    await N.page.evaluate(() => {
      const S = window._gameState && window._gameState.current; const R = S && S.rpg;
      if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; }
      if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true });
    });
    const gotThere = await H.openDest(N, 'Character').then(() => true).catch(() => false);
    await N.page.waitForTimeout(500);
    await N.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
      .first().click({ timeout: 8000 }).catch(() => {});
    await N.page.waitForTimeout(800);
    rec.ok(`${w}x${h}: the Build screen opened with points to spend (guard)`, gotThere === true, { gotThere });

    const fit = await N.page.evaluate(() => {
      const cols = [...document.querySelectorAll('[data-prog3-lane]')];
      /* Every childless text node inside a column: the ones that would silently
         ellipsise if a label outgrew its third of the row. */
      const leaves = cols.flatMap((c) => [...c.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim())
        .map((e) => ({ t: (e.textContent || '').trim(),
          sw: e.scrollWidth, cw: e.clientWidth,
          fs: parseFloat(getComputedStyle(e).fontSize) })));
      return {
        n: cols.length,
        badges: cols.filter((c) => c.querySelector('[aria-label*="points to spend"]')).length,
        boxes: cols.map((c) => ({ k: c.getAttribute('data-prog3-lane'),
          w: Math.round(c.getBoundingClientRect().width),
          h: Math.round(c.getBoundingClientRect().height),
          overflowY: c.scrollHeight - c.clientHeight,
          overflowX: c.scrollWidth - c.clientWidth })),
        clipped: leaves.filter((l) => l.sw > l.cw + 1),
        minFont: leaves.length ? Math.min(...leaves.map((l) => l.fs)) : null,
      };
    });
    console.log(`    ${w}x${h} columns: ${JSON.stringify(fit)}`);
    rec.ok(`${w}x${h}: three columns, each carrying its unspent-points badge (guard)`,
      fit.n === 3 && fit.badges === 3, fit);
    rec.ok(`${w}x${h}: no column overflows its own box`,
      fit.boxes.every((b) => b.overflowY <= 1 && b.overflowX <= 1), fit.boxes);
    rec.ok(`${w}x${h}: ...and every column is still a 44px thumb target`,
      fit.boxes.every((b) => b.h >= 44), fit.boxes);
    rec.ok(`${w}x${h}: ...with nothing on a column clipped to an ellipsis`,
      fit.clipped.length === 0, fit.clipped);
    rec.ok(`${w}x${h}: ...and nothing below the 9px type floor`,
      fit.minFont !== null && fit.minFont >= 9, { minFont: fit.minFont });

    /* ═══ v2.3.2326: THE BADGE MUST NOT SIT ON THE LABEL ═══
       The unspent-points badge is absolutely positioned so that it costs the
       two text lines no width.  That is the right call and it has a sharp
       edge: an absolute element cannot change its siblings' scrollWidth, so
       the clipping check above passes while the label runs clean underneath
       the number.  Caught by LOOKING at a 320px shot -- "MELE1", "MAGI1" --
       after every assertion on this screen was green.  Overlap is a question
       about two boxes, so ask it about two boxes. */
    const badgeFit = await N.page.evaluate(() => [...document.querySelectorAll('[data-prog3-lane]')]
      .map((c) => {
        const badge = c.querySelector('[aria-label*="points to spend"]');
        /* Matched against the aria-label's own name, NOT against /^[A-Z]+$/ --
           the first cut did that and skipped every column silently, because
           the caps are textTransform and the DOM text is still "Melee".  A
           guard that skips is a guard that passes. */
        const name = (c.getAttribute('aria-label') || '').split(',')[0].trim();
        const label = [...c.querySelectorAll('span')]
          .find((e) => e.children.length === 0 && (e.textContent || '').trim() === name);
        if (!badge || !label) {
          return { k: c.getAttribute('data-prog3-lane'), skip: true,
            why: !badge ? 'no badge (empty pool?)' : `no span reading "${name}"` };
        }
        const b = badge.getBoundingClientRect(), l = label.getBoundingClientRect();
        return { k: c.getAttribute('data-prog3-lane'), text: label.textContent.trim(),
          overlap: Math.round(Math.max(0, Math.min(b.right, l.right) - Math.max(b.left, l.left))) };
      }));
    console.log(`    ${w}x${h} badge vs label: ${JSON.stringify(badgeFit)}`);
    rec.ok(`${w}x${h}: all three columns were actually measurable (guard)`,
      badgeFit.every((b) => !b.skip), badgeFit);
    rec.ok(`${w}x${h}: the points badge does not sit on top of the weapon's name`,
      badgeFit.every((b) => b.skip || b.overlap === 0), badgeFit);

    /* And the reason the whole change exists: the first spendable stat is
       fully on screen for EVERY weapon, at the width where it was not. */
    const rows = await N.page.evaluate(async () => {
      const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const out = [];
      for (const k of ['sword', 'bow', 'staff']) {
        const head = document.querySelector(`[data-prog3-lane="${k}"]`);
        if (!head) { out.push({ k, err: 'no column' }); continue; }
        if (head.getAttribute('aria-expanded') !== 'true') {
          const r = head.getBoundingClientRect();
          const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
          head.dispatchEvent(new PointerEvent('pointerdown', o));
          head.dispatchEvent(new PointerEvent('pointerup', o));
          await wait(); await new Promise((r2) => setTimeout(r2, 240));
        }
        const first = document.querySelector('[role="button"][aria-label*=" of "]');
        if (!first) { out.push({ k, err: 'no stat row' }); continue; }
        let sc = first.parentElement;
        while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
        if (sc) sc.scrollTop = 0;
        await wait();
        const b = first.getBoundingClientRect();
        const p = sc ? sc.getBoundingClientRect() : null;
        const sel = document.querySelector('[data-prog3-lane]').parentElement.getBoundingClientRect();
        const ceil = p ? Math.max(p.top, sel.bottom) : sel.bottom;
        const floor = p ? Math.min(p.bottom, window.innerHeight) : window.innerHeight;
        out.push({ k, top: Math.round(b.top),
          visible: Math.round(Math.max(0, Math.min(b.bottom, floor) - Math.max(b.top, ceil))),
          full: b.top >= ceil - 1 && b.bottom <= floor + 1 });
      }
      return out;
    });
    console.log(`    ${w}x${h} first stat row: ${JSON.stringify(rows)}`);
    rec.ok(`${w}x${h}: every weapon opens onto its first spendable stat`,
      rows.every((r) => r.full === true), rows);
    const tops = rows.filter((r) => r.top != null).map((r) => r.top);
    rec.ok(`${w}x${h}: ...at the same height for all three`,
      tops.length === 3 && (Math.max(...tops) - Math.min(...tops)) <= 1, { tops });

    await N.ctx.close().catch(() => {});
  }

  /* ═══ v2.3.2214 -> v2.3.2222: AND ALL OF THAT, ON A PHONE ═══
     Everything above runs on this scenario's player at the harness's default
     1000x780 viewport, which is how v2.3.2199's ninth stat shipped off the
     bottom of a phone while CI was green.  So the same four properties are
     re-measured at three real device sizes, 375x667 deliberately among them:
     it is the smallest phone the game supports and the one that caught the
     first fix for that bug being one pixel from wrong. */
  for (const [w, h] of [[390, 844], [375, 667], [430, 932]]) {
    const M = await H.newPlayer(browser, { name: `Fit${w}`, wsPort, webPort,
      viewport: { width: w, height: h }, touch: true });
    await H.enterWorld(M);
    await M.page.waitForTimeout(2200);
    /* ═══ v2.3.2326: THIS LOOP HAS BEEN MEASURING A CLOSED DASHBOARD ═══
       It reached for [aria-label="Hero"] and swallowed the failure with
       .catch(() => {}), so when that stopped finding anything the three phone
       runs simply never opened the sheet -- and every assertion below reported
       "no stat cell found" rather than saying the navigation had failed.
       Fifteen red lines, at all three device sizes, on a screen that was fine:
       the block that works ten lines up uses H.openDest(P, 'Character'), which
       knows about the rail AND the More drawer and which label the rail
       actually carries.  Use the same door.
       The clicks are guarded now instead of silenced -- a scenario that cannot
       reach its own screen must say so where it happened. */
    const reached = await H.openDest(M, 'Character').then(() => true).catch(() => false);
    rec.ok(`${w}x${h}: the character sheet opened (guard)`, reached === true, { reached });
    await M.page.waitForTimeout(600);
    const onBuild = await M.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
      .first().click({ timeout: 8000 }).then(() => true).catch(() => false);
    rec.ok(`${w}x${h}: ...and the Build tab with it (guard)`, onBuild === true, { onBuild });
    await M.page.waitForTimeout(700);
    const fitPhone = await M.page.evaluate(async () => {
      const btn = document.querySelector('[aria-label*="Crit"], [aria-label*="Defense"]');
      if (!btn) return { err: 'no stat cell found' };
      let el = btn.parentElement;
      while (el && getComputedStyle(el).overflowY !== 'auto') el = el.parentElement;
      if (!el) return { err: 'no scroll container' };
      const vh = window.innerHeight;
      const rows = [...document.querySelectorAll('[role="button"][aria-label*=" of "]')];
      const box = () => el.getBoundingClientRect();
      /* The floor is whichever comes first: the panel's own bottom edge, or
         the bottom of the screen.  Measuring only against the panel is how a
         control that hangs off the phone still reads as "in view". */
      const floor = () => Math.min(box().bottom, vh);
      const ceiling = () => {           /* the STUCK tabs + lane header; see the desktop block */
        let c = box().top;
        for (const e of el.querySelectorAll('*')) {
          const cs = getComputedStyle(e);
          if (cs.position !== 'sticky') continue;
          const b = e.getBoundingClientRect();
          const stuckAt = box().top + (parseFloat(cs.top) || 0);
          if (b.height > 0 && Math.abs(b.top - stuckAt) <= 1.5 && b.bottom > c) c = b.bottom;
        }
        return c;
      };
      const inView = (r) => { const b = r.getBoundingClientRect(); return b.top >= ceiling() - 1 && b.bottom <= floor() + 1; };
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.scrollTop = 0; await settle();
      const firstIn = rows.length ? inView(rows[0]) : false;
      const last = rows[rows.length - 1];
      let lastIn = false, lastAtMax = null;
      if (last) {
        const want = el.scrollTop + (last.getBoundingClientRect().bottom - floor());
        el.scrollTop = Math.max(0, Math.min(want, el.scrollHeight - el.clientHeight)); await settle();
        lastIn = inView(last);
        el.scrollTop = el.scrollHeight; await settle();
        const b = last.getBoundingClientRect();
        lastAtMax = Math.round(Math.min(b.bottom, floor()) - Math.max(b.top, ceiling()));
      }
      el.scrollTop = 0;
      return { cells: rows.length, firstIn, lastIn, lastAtMax,
        minRow: Math.min(...rows.map((r) => Math.round(r.getBoundingClientRect().height))),
        panel: Math.round(box().height) };
    });
    rec.ok(`${w}x${h}: the open lane's ${STAT_ROWS} controls are all there (guard)`,
      !fitPhone.err && fitPhone.cells === STAT_ROWS, fitPhone);
    rec.ok(`${w}x${h}: ...the first is fully in view at rest`,
      !fitPhone.err && fitPhone.firstIn, fitPhone);
    rec.ok(`${w}x${h}: ...and the last is fully in view once scrolled to`,
      !fitPhone.err && fitPhone.lastIn, fitPhone);
    rec.ok(`${w}x${h}: ...and still wholly showing after an overshoot to the end`,
      !fitPhone.err && fitPhone.lastAtMax >= fitPhone.minRow - 1, fitPhone);
    rec.ok(`${w}x${h}: ...with every row at 44px or more`,
      !fitPhone.err && fitPhone.minRow >= 44, fitPhone);
    await M.ctx.close().catch(() => {});
  }

  /* ── THE POINTS SCREEN WITH THE CAP ABSENT (v2.3.2414) ───────────────────
     Owner, on production: combat levels reading 0 while the panel one tap
     behind them read Lv 1 for the same character in the same second.

     prog3Live is cap AND blob; prog3HasSkills is blob only.  v2.3.1901,
     v2.3.1902 and v2.3.1922 each moved ONE readout onto the blob-only gate.
     HeroExpanded's Build tab was missed all three times, and it does not
     merely print a wrong number -- it swaps the WHOLE SCREEN to a legacy
     six-tile grid whose levels come from R[key] || 0, the three T1 stats
     v2.3.1659 froze at 0 for every prog3 character.  So that grid cannot
     print anything but Lv 0.

     Driven by stripping caps.prog3 out of state_sync in an init script -- a
     legitimate rule-19 deploy state (new client, old worker), and the state
     the owner was in.  The blob is untouched throughout, which is the point:
     the server knows the level, the screen refuses to read it. */
  const OLD = await H.newPlayer(browser, {
    name: 'CapOff', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
    init: () => {
      const RealWS = window.WebSocket;
      window.WebSocket = function (...a) {
        const ws = new RealWS(...a);
        ws.addEventListener('message', (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m && m.type === 'state_sync' && m.caps) delete m.caps.prog3;
            else return;
            Object.defineProperty(e, 'data', { value: JSON.stringify(m) });
          } catch (err) { /* not ours */ }
        }, true);
        return ws;
      };
      window.WebSocket.prototype = RealWS.prototype;
    },
  });
  await H.enterWorld(OLD);
  await OLD.page.waitForTimeout(3000);

  const capOff = await H.readState(OLD, (S) => ({
    cap: !!((S._serverCaps || {}).prog3),
    sk: (S.rpg && S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.sword && S.rpg.prog3.sk.sword.level) || null,
  }));
  rec.ok('cap-off client: the worker capability really is absent (guard)', capOff.cap === false, capOff);
  rec.ok('cap-off client: ...while the BLOB still carries the trained level (guard: '
       + 'if this were missing the screen would be right to fall back)', capOff.sk === 1, capOff);

  await H.openDest(OLD, 'Character');
  await OLD.page.waitForTimeout(700);
  await H.clickSel(OLD, '[aria-label="Points"]').catch(() => {});
  await OLD.page.waitForTimeout(1200);

  const tiles = await OLD.page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div')) {
      const t = (el.textContent || '').trim();
      const m = /^(Melee|Bow|Magic)\s*Lv\s*(\d+)/.exec(t);
      if (m && el.querySelectorAll('div').length < 6) out.push({ name: m[1], lv: Number(m[2]) });
    }
    return out.filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i);
  });
  console.log('    cap-off Points tiles: ' + JSON.stringify(tiles));
  rec.ok(`cap-off: the three combat tiles render (guard: ${tiles.length})`, tiles.length === 3, tiles);
  /* THE ASSERTION.  prog3SkillLevel floors at Math.max(1, ...) and cannot
     return 0, so a rendered 0 could only ever have come from the legacy
     read this fix replaced. */
  rec.ok('cap-off: no combat tile reads Lv 0 — the level comes from the blob, not the cap',
    tiles.length === 3 && tiles.every((t) => t.lv >= 1), tiles);

  await OLD.ctx.close().catch(() => {});
}
