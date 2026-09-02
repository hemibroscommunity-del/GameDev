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

  /* ═══ v2.3.2216: THE LANE SCROLLS NOW, AND THAT IS THE DESIGN ═══
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
  /* The three lanes are the navigation, so they must never scroll away. */
  rec.ok('...with the weapon lanes pinned (sticky) so navigation is always reachable',
    await P.page.evaluate(() => [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .every((l) => getComputedStyle(l).position === 'sticky')));
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
    const first = head.parentElement.querySelector('[role="button"][aria-label*=" of "]');
    if (!first) return { err: 'no stat row' };
    const h = head.getBoundingClientRect(); const f = first.getBoundingClientRect();
    const lane = head.parentElement.getBoundingClientRect();
    return { overlap: Math.round(h.bottom - f.top), intoLane: Math.round(h.top - lane.top) };
  });
  rec.ok('...and the pinned header never covers the lane\'s own first stat',
    !pinned.err && pinned.overlap <= 1 && pinned.intoLane <= 2, pinned);

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

  /* ═══ v2.3.2214 -> v2.3.2216: AND ALL OF THAT, ON A PHONE ═══
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
    await M.page.locator('[aria-label="Hero"], [aria-label^="Hero"]').first()
      .click({ timeout: 8000 }).catch(() => {});
    await M.page.waitForTimeout(600);
    await M.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first()
      .click({ timeout: 8000 }).catch(() => {});
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
}
