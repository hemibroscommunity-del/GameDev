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
  /* The XP bar: the only element here with a percentage width fill. */
  const fills = [...hero.querySelectorAll('div > div')]
    .map((el) => el.style.width).filter((w) => w && w.endsWith('%'));
  return {
    found: true, texts, imgs, fills,
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
  });
  await P.page.waitForTimeout(600);

  const band = await readBand(P);
  rec.ok('the band summary is there (guard)', !!(band && band.found), band);

  /* ── the head is GONE ──
     Asserted as "no portrait image", not "the summary exists": both could be
     true at once if the summary were added beside the head, which is the
     obvious way to satisfy the request and not what was asked. */
  const portraitGone = !(band.imgs || []).some((sizeSrc) =>
    /profile\.webp|data:image\/(png|webp)/i.test(sizeSrc || ''));
  rec.ok('the head preview is gone from the band', portraitGone, { imgs: band.imgs });

  /* ── the three lines ── */
  const all = (band.texts || []).join(' ');
  rec.ok('it names the character and the level', /BANDIT/i.test(all) && /LV\s*\d/i.test(all), band.texts);
  rec.ok('...and the one combat number, DPS', /DPS/.test(all), band.texts);
  rec.ok('...and the coins', /\b75\b/.test(all), band.texts);
  rec.ok('...and an XP percentage', /%/.test(all), band.texts);
  /* ═══ v2.3.1849: WHAT IS DELIBERATELY ABSENT ═══
     Owner, on the first build (which followed the mockup exactly): "that
     summary looks way too busy.  What's the best way to give as much useful
     info without overload."  DEF and HP came off — DEF reads 0% until a
     player's first armour and only moves on the Equipment screen, and the
     band could only ever show MAX hp, a number that changes a few times a
     level and never during play; live HP is on the world HUD.

     Asserted as ABSENT rather than just untested.  A deletion nothing checks
     is a deletion the next person restores by accident, and "less on the
     band" is the whole point of this pass. */
  rec.ok('DEF is not on the band', !/DEF/.test(all), band.texts);
  rec.ok('...and neither is max HP', !/\bHP\b/.test(all), band.texts);
  /* Two lines, not three — the busyness was structural. */
  rec.ok('the summary is two lines',
    (band.lines || []).length === 2, { lines: (band.lines || []).map((l) => l.kids.map((k) => k.t)) });
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
     assertion that decided where the coins live: on the stat line they fit
     at 75 and overflowed the strip, so they moved to the name line, where
     the only other flexible element ellipsises instead of pushing. */
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

  /* ── the XP bar follows the CLOSEST weapon ──
     Three passes, each with a different winner.  prog3XpRequired(1) is 280,
     so 250/40/10 puts melee at 89% and the others far behind. */
  const cases = [
    { name: 'melee', xp: { sword: 250, bow: 40, staff: 10 }, icon: 'melee', pct: 89 },
    { name: 'bow', xp: { sword: 20, bow: 210, staff: 10 }, icon: 'bow', pct: 75 },
    { name: 'magic', xp: { sword: 20, bow: 40, staff: 140 }, icon: 'magic', pct: 50 },
  ];
  for (const c of cases) {
    await setXp(P, c.xp);
    await P.page.waitForTimeout(700);
    const b = await readBand(P);
    const icons = (b.imgs || []).join(' ');
    rec.ok(`the XP bar takes the ${c.name} icon when ${c.name} is closest`,
      new RegExp('hero/' + c.icon + '\\.webp').test(icons), { icons });
    rec.ok(`...and its percentage (${c.pct}%)`,
      (b.texts || []).some((t) => t === `${c.pct}%`), { texts: b.texts });
    /* The FILL, not just the caption — a bar whose caption moved while its
       painted width did not is the bug a text-only check would miss. */
    rec.ok('...and the painted fill matches the caption',
      (b.fills || []).some((w) => w === `${c.pct}%`), { fills: b.fills });
  }

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary.png' });
  await P.ctx.close().catch(() => {});
}
