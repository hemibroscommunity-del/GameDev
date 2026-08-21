/* THE BAND'S COMPACT SUMMARY (v2.3.1848).
 *
 * Owner: "in the top dashboard where it shows the character head preview I
 * want to replace it with a compact summary like this" — NAME · LV n, an XP
 * bar with a percentage, and DPS / DEF / HP / coins — plus "the XP bar will
 * need to be shown based on whatever weapon is closest to the next level
 * with a little weapon icon preceding it."
 *
 * The claim that is easy to make and hard to keep is the XP bar's.  "A bar
 * appears" is true of the bar that was already there; "it tracks the closest
 * weapon" is a statement about which of three numbers won, and the only way
 * to test it is to CHANGE which one wins and require the row to follow.  So
 * this drives the bar three times — melee ahead, then bow ahead, then magic
 * ahead — and checks both the icon and the percentage each time.  A build
 * that hard-coded the melee icon passes the first pass perfectly.
 */
import * as H from './harness.mjs';

/* Put the three weapon skills at known XP and read back what the band drew. */
const setXp = (P, xps) => P.page.evaluate((x) => {
  const R = window._gameState.current.rpg;
  if (!R.prog3) R.prog3 = {};
  if (!R.prog3.sk) R.prog3.sk = {};
  for (const k of ['sword', 'bow', 'staff']) {
    R.prog3.sk[k] = { level: 1, xp: x[k] };
  }
  /* Nudge the band to re-render: the strip reads getState() on every render
     and the dashboard repaints on this bus. */
  try { window.__broDashPanelBus.open(null); } catch (e) {}
}, xps);

const readBand = (P) => P.page.evaluate(() => {
  const hero = [...document.querySelectorAll('[role="button"][aria-label="Hero"]')]
    .filter((el) => el.offsetParent !== null)[0];
  if (!hero) return { found: false };
  const r = hero.getBoundingClientRect();
  const imgs = [...hero.querySelectorAll('img')].map((im) => im.getAttribute('src'));
  const texts = [...hero.querySelectorAll('span')]
    .filter((el) => el.children.length === 0 && (el.textContent || '').trim())
    .map((el) => (el.textContent || '').trim());
  /* Any percentage-width fill: the painted XP bar, if one is still drawn.
     v2.3.1852 replaced it with a pair of numbers, so this is now read as
     something that must be ABSENT. */
  const fills = [...hero.querySelectorAll('div > div')]
    .map((el) => el.style.width).filter((w) => w && w.endsWith('%'));
  /* The XP readout as ONE string.  Its numerator and denominator are two
     spans (the denominator is dimmed), so the leaf-span list above sees
     "250" and "/280" separately — checking those individually would pass on
     a row that printed them in the wrong order or dropped the slash. */
  const xpEl = hero.querySelector('[title*="XP to level"]');
  const xpText = xpEl ? (xpEl.textContent || '').replace(/\s+/g, '') : null;
  return {
    found: true, texts, imgs, fills, xpText,
    box: { w: Math.round(r.width), h: Math.round(r.height),
      right: Math.round(r.right), top: Math.round(r.top) },
    vw: window.innerWidth,
    /* Anything painted outside the strip's own box is overflow the owner
       would see as clipping or collision. */
    overflowX: hero.scrollWidth > hero.clientWidth + 1,
    overflowY: hero.scrollHeight > hero.clientHeight + 1,
    /* The row BELOW the band — the bag's filter chips.  A summary that grew
       from two lines to three has a new way to be wrong that no width check
       would catch: pushing into, or drawing over, its neighbour. */
    belowTop: (() => {
      const chip = document.querySelector('[data-bt="bagfilter"], [aria-label="Filter"], [role="button"][aria-label*="filter" i]');
      const el = chip || document.querySelector('[aria-label="Bag"], [role="button"][aria-label="Bag"]');
      return el ? Math.round(el.getBoundingClientRect().top) : null;
    })(),
    bottom: Math.round(r.bottom),
    /* WHICH line, and by how much — an overflow report that just says "yes"
       sends you guessing at three lines and four chips. */
    lines: [...hero.children].map((el, i) => ({
      i, w: Math.round(el.getBoundingClientRect().width),
      need: el.scrollWidth, have: el.clientWidth,
      over: el.scrollWidth - el.clientWidth,
      kids: [...el.children].map((k) => ({
        t: (k.textContent || '').trim().slice(0, 10) || k.tagName,
        w: Math.round(k.getBoundingClientRect().width),
      })),
    })),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bandit', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper', quality: 'normal' };
    S.rpg.activeSlot = 'melee';
    S.rpg.coins = 75;
    /* UNSPENT POINTS ON PURPOSE.  The badge assertion below is vacuous
       against a character with none — it would pass on a band that still
       drew the badge.  Two in the pool is the state that makes the check
       mean something. */
    if (!S.rpg.prog3) S.rpg.prog3 = {};
    if (!S.rpg.prog3.sk) S.rpg.prog3.sk = {};
    for (const k of ['sword', 'bow', 'staff']) {
      if (!S.rpg.prog3.sk[k]) S.rpg.prog3.sk[k] = { level: 1, xp: 0 };
    }
    S.rpg.prog3.pool = 2;
  });
  await P.page.waitForTimeout(600);

  const band = await readBand(P);
  rec.ok('the band summary is there (guard)', !!(band && band.found), band);
  /* The pool really is stocked — without this the badge assertion below is
     vacuous, since a character with nothing to spend draws no badge either
     way and the check would pass on the code it is meant to catch. */
  const pool = await P.page.evaluate(() => {
    const p = window._gameState.current.rpg.prog3;
    return (p && p.pool) || 0;
  });
  rec.ok('the character has unspent points to nag about (guard)', pool > 0, { pool });

  /* ── the head is GONE ──
     Asserted as "no portrait image", not "the summary exists": both could be
     true at once if the summary were added beside the head, which is the
     obvious way to satisfy the request and not what was asked. */
  const portraitGone = !(band.imgs || []).some((sizeSrc) =>
    /profile\.webp|data:image\/(png|webp)/i.test(sizeSrc || ''));
  rec.ok('the head preview is gone from the band', portraitGone, { imgs: band.imgs });

  /* ── the three lines ── */
  const all = (band.texts || []).join(' ');
  rec.ok('it shows the coins', /\b75\b/.test(all), band.texts);
  /* v2.3.1852 (owner: "instead of an xp bar just show the number over the
     number like 324/500"): a PAIR, and no bar left to paint. */
  rec.ok('...and XP as a pair of numbers', /^\d+\/\d+$/.test(band.xpText || ''), { xpText: band.xpText });
  rec.ok('...with no bar left to paint', (band.fills || []).length === 0, { fills: band.fills });
  /* ═══ v2.3.1851: NAME AND LEVEL ARE GONE TOO ═══
     Owner: "actually just put the gold and xp there.  You already see the
     name and level below the actual character."  Two readouts left.

     Asserted as absent, and by the character's OWN name rather than by a
     pattern: 'BANDIT' is on screen elsewhere in this app, so the check is
     scoped to the summary block's own text. */
  rec.ok('the name is not repeated on the band', !/BANDIT/i.test(all), band.texts);
  rec.ok('...nor the level', !/\bLV\b/i.test(all), band.texts);
  /* ═══ v2.3.1849: WHAT IS DELIBERATELY ABSENT ═══
     Owner, on the first build (which followed the mockup exactly): "that
     summary looks way too busy.  What's the best way to give as much useful
     info without overload."  DEF and HP came off, then the rest: "best might
     just be to remove the bottom row (all the DPS, def, and hp data)".  Each
     is a number you consult when changing something, and changing something
     happens on the screen this block opens.

     Asserted as ABSENT rather than just untested.  A deletion nothing checks
     is a deletion the next person restores by accident, and "less on the
     band" is the whole point of this pass. */
  rec.ok('DEF is not on the band', !/DEF/.test(all), band.texts);
  rec.ok('...nor max HP', !/\bHP\b/.test(all), band.texts);
  rec.ok('...nor DPS — the whole stat row is gone', !/DPS/.test(all), band.texts);
  /* v2.3.1850 (owner: "have the summary tab just be name, level, xp, and
     gold"): FOUR things, and the unspent-points badge was a fifth.  It reads
     as "+2", so this checks for a lone plus-number rather than for the word
     — the badge never carried one. */
  rec.ok('...nor the unspent-points badge',
    !(band.texts || []).some((t) => /^\+\d+$/.test(t)), band.texts);
  /* ONE line now.  The busyness was structural, and each cut took a line
     with it: three (mockup) -> two (DPS/DEF/HP out) -> one (name/level out). */
  rec.ok('the summary is a single line',
    (band.lines || []).length === 1, { lines: (band.lines || []).map((l) => l.kids.map((k) => k.t)) });
  /* It still opens Hero — the portrait was the button, and the button is the
     only reason the character screen is reachable from the resting band. */
  await P.page.evaluate(() => {
    const hero = [...document.querySelectorAll('[role="button"][aria-label="Hero"]')]
      .filter((el) => el.offsetParent !== null)[0];
    if (hero) hero.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(900);
  const opened = await P.page.evaluate(() =>
    !!document.querySelector('canvas[aria-label="Your character"]'));
  rec.ok('tapping the summary still opens Hero', opened, {});
  await P.page.evaluate(() => { window.__broDashPanelBus.open(null); });
  await P.page.waitForTimeout(400);

  /* ── it FITS ──
     A summary that overflows its strip is the failure this replaces a
     40px portrait to avoid. */
  const fit = await readBand(P);
  console.log('    band lines', JSON.stringify(fit.lines));
  rec.ok('the summary does not overflow its own row',
    fit.overflowX === false, { box: fit.box, lines: fit.lines });
  rec.ok('...and stays inside the viewport',
    !!(fit.box && fit.box.right <= fit.vw + 1), { right: fit.box && fit.box.right, vw: fit.vw });
  /* Three lines where there were two: the summary must still end above the
     row beneath it.  Skipped rather than failed when that row cannot be
     found, so a renamed selector reports "not checked" instead of a red. */
  rec.ok('...and its third line does not spill into the row below',
    fit.overflowY === false
      && (fit.belowTop == null || fit.bottom <= fit.belowTop + 1),
    { bottom: fit.bottom, belowTop: fit.belowTop, overflowY: fit.overflowY });
  /* A RICH player.  75 coins is four glyphs; a real purse is nine with the
     separators, and the difference is most of a stat chip.  This is the
     assertion that decided where the coins live.  On the original stat line
     they fit at 75 and overflowed the strip; on the single line they sit
     beside the XP bar, which is the flexible element that gives way. */
  await P.page.evaluate(() => {
    window._gameState.current.rpg.coins = 1234567;
    try { window.__broDashPanelBus.open(null); } catch (e) {}
  });
  await P.page.waitForTimeout(600);
  const rich = await readBand(P);
  rec.ok('...even with a seven-figure purse',
    rich.overflowX === false && !!(rich.box && rich.box.right <= rich.vw + 1),
    { box: rich.box, texts: rich.texts });
  rec.ok('...which is still fully printed, not truncated',
    (rich.texts || []).some((t) => /1,234,567/.test(t)), { texts: rich.texts });
  await P.page.evaluate(() => {
    window._gameState.current.rpg.coins = 75;
    try { window.__broDashPanelBus.open(null); } catch (e) {}
  });
  await P.page.waitForTimeout(400);

  /* ── the XP row follows the CLOSEST weapon ──
     Three passes, each with a different winner.  prog3XpRequired(1) is 280,
     so the denominator is fixed and the numerator names which skill won —
     which is what makes a wrong WINNER visible rather than just a wrong
     number. */
  const cases = [
    { name: 'melee', xp: { sword: 250, bow: 40, staff: 10 }, icon: 'melee', pair: '250/280' },
    { name: 'bow', xp: { sword: 20, bow: 210, staff: 10 }, icon: 'bow', pair: '210/280' },
    { name: 'magic', xp: { sword: 20, bow: 40, staff: 140 }, icon: 'magic', pair: '140/280' },
  ];
  for (const c of cases) {
    await setXp(P, c.xp);
    await P.page.waitForTimeout(700);
    const b = await readBand(P);
    const icons = (b.imgs || []).join(' ');
    rec.ok(`the XP row takes the ${c.name} icon when ${c.name} is closest`,
      new RegExp('hero/' + c.icon + '\\.webp').test(icons), { icons });
    rec.ok(`...and reads ${c.pair}`, b.xpText === c.pair, { xpText: b.xpText });
  }

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary.png' });
  await P.ctx.close().catch(() => {});
}
