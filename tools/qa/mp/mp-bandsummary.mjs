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
  try { window.__broDashPanelBus.toBar(); } catch (e) {}
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
    /* The purse's own centre — the coin icon and its number as one unit. */
    coinMid: (() => {
      const im = hero.querySelector('img[src*="gold"]');
      if (!im) return null;
      const wrap = im.parentElement;
      const b = wrap.getBoundingClientRect();
      return Math.round(b.left + b.width / 2);
    })(),
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

/* ═══ v2.3.1856: THE SKILL CARDS ═══
 * The pill became a stacked micro-card (owner's mockup): icon and level
 * across the top, the XP pair on its own line, a full-width bar along the
 * bottom.  The probe reads each piece SEPARATELY now — in the one-line pill
 * the numbers lived inside the bar, so "the bar's text" was the pair; here
 * they are siblings, and a probe that still read the bar would report null
 * and every assertion built on it would go quiet rather than red.
 */
const readPills = (P) => P.page.evaluate(() => {
  const els = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
    .filter((el) => el.getBoundingClientRect().width > 0
      && /^(Melee|Bow|Magic) level/i.test(el.getAttribute('aria-label') || ''));
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right),
      t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width) }; };
  return els.map((el) => {
    const img = el.querySelector('img');
    /* The bar is the only descendant holding a percentage-width child. */
    const bar = [...el.querySelectorAll('div')]
      .filter((d) => [...d.children].some((c) => c.style && /%$/.test(c.style.width || '')))[0] || null;
    const fill = bar ? [...bar.children].filter((c) => /%$/.test(c.style.width || ''))[0] : null;
    /* The pair, the level and the badge are three leaf texts. */
    const leaves = [...el.querySelectorAll('div, span')]
      .filter((n) => (n.textContent || '').trim() && !n.querySelector('div, span') === false ? false : true);
    const texts = [...el.querySelectorAll('div, span')]
      .filter((n) => {
        const t = (n.textContent || '').trim();
        return t && n.querySelectorAll('div').length === 0 && t.length < 20;
      });
    const pairEl = texts.filter((n) => /^\d[\d.k]*\/\d[\d.k]*$/.test((n.textContent || '').replace(/\s+/g, '')))[0] || null;
    /* The DENOMINATOR's own span — the dimmed half.  v2.3.1863 anchors the
       pair to the card's right rim, and the containing div spans the whole
       card either way, so its box says nothing about where the glyphs sit.
       This is the element whose right edge IS the claim. */
    const denomEl = pairEl ? [...pairEl.querySelectorAll('span')]
      .filter((n) => /^\//.test((n.textContent || '').trim()))[0] || null : null;
    const lvlEl = texts.filter((n) => /^LV\s*\d+$/i.test((n.textContent || '').trim()))[0] || null;
    const badgeEl = texts.filter((n) => /^\+\d+$/.test((n.textContent || '').trim()))[0] || null;
    /* Row overflow, per row rather than for the card: the card is a column,
       so a too-wide TOP row is what spills, and the card's own scrollWidth
       reports it late. */
    /* ═══ v2.3.1858: MEASURE THE ELEMENT THAT CLIPS ═══
       This walked the card's direct children and compared each one's
       scrollWidth to its clientWidth — and it reported "not clipped" while
       the card on screen read "250/28".  A child with `overflow: hidden`
       does NOT grow its parent's scrollWidth, so the overflow was invisible
       one level up: the row containing the pair looked fine because the pair
       swallowed its own spill.
       So EVERY text leaf is measured, not just the rows. */
    /* ═══ v2.3.1858: MEASURE WHATEVER CLIPS ═══
       Two wrong versions of this shipped before the screenshot showed the
       card reading "250/28":
         1. it compared the card's direct CHILDREN — but a descendant with
            `overflow: hidden` does not grow its parent's scrollWidth, so the
            spill was invisible one level up;
         2. it then measured text LEAVES — and the element that clips is the
            pair's wrapper, which holds a dimmed <span> for the denominator
            and so is not a leaf.  The leaf inside it fits perfectly; the box
            around it is the one cutting the text off.
       There is no clever subset.  Every descendant is measured, and any one
       whose content is wider than its box counts. */
    const rows = [...el.querySelectorAll('div, span')]
      .filter((n) => (n.textContent || '').trim())
      .map((r) => ({
        need: r.scrollWidth, have: r.clientWidth, over: r.scrollWidth - r.clientWidth,
        t: (r.textContent || '').trim().slice(0, 12),
      }));
    return {
      label: el.getAttribute('aria-label'),
      icon: box(img), bar: box(bar), pair: box(pairEl), lvl: box(lvlEl),
      denom: box(denomEl),
      cardRight: Math.round(el.getBoundingClientRect().right),
      cardH: Math.round(el.getBoundingClientRect().height),
      pairText: pairEl ? (pairEl.textContent || '').replace(/\s+/g, '') : null,
      lvlText: lvlEl ? (lvlEl.textContent || '').trim() : null,
      badgeText: badgeEl ? (badgeEl.textContent || '').trim() : null,
      /* Do the badge and the level OVERLAP?  v2.3.1859 grew the level to
         13.5px and the card rendered "LV ǂ2" — the corner badge sitting on
         the digit.  Every width check passed, because overlap is not
         clipping: both boxes were within their own bounds, on top of each
         other.  Rect intersection is the only thing that sees it. */
      badgeHitsLvl: (() => {
        if (!badgeEl || !lvlEl) return false;
        const a = badgeEl.getBoundingClientRect(), b = lvlEl.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      })(),
      fillW: fill ? fill.style.width : null,
      pillW: Math.round(el.getBoundingClientRect().width),
      rows,
      clipped: rows.some((r) => r.over > 1),
    };
  });
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

  /* ── what the band says now ── */
  const all = (band.texts || []).join(' ');
  rec.ok('it shows the coins', /\b75\b/.test(all), band.texts);
  /* ═══ v2.3.1853: EVERYTHING ELSE IS GONE FROM THE BAND ═══
     Four rounds of cuts, each because something else on screen already said
     it: the portrait, then DPS/DEF/HP, then the name and level, and now the
     XP pair — owner: "actually just put the coins there.  The dashboard
     menu has the 3 skills on it already for xp."

     Every one is asserted ABSENT.  A removal nothing checks is one the next
     person restores by accident, and "less on the band" has been the whole
     direction of this pass. */
  rec.ok('...and nothing else — no stat row', !/DPS|DEF|\bHP\b/.test(all), band.texts);
  rec.ok('...no name or level', !/BANDIT/i.test(all) && !/\bLV\b/i.test(all), band.texts);
  rec.ok('...no XP pair', !/\d+\/\d+/.test(all), band.texts);
  rec.ok('...and no bar left to paint', (band.fills || []).length === 0, { fills: band.fills });
  rec.ok('...nor the unspent-points badge',
    !(band.texts || []).some((t) => /^\+\d+$/.test(t)), band.texts);
  /* v2.3.1857 (owner: "center the coins within that extra space, remove the
     dot to the left of it").  Centred is asserted as a MEASUREMENT — the
     purse's midpoint against the strip's — because "it moved right a bit"
     and "it is centred" look the same in a screenshot. */
  rec.ok('the coins are centred in the strip',
    !!(band.coinMid != null && band.box
      && Math.abs(band.coinMid - (band.box.right - band.box.w / 2)) <= 2),
    { coinMid: band.coinMid, stripMid: band.box && Math.round(band.box.right - band.box.w / 2) });

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
  await P.page.evaluate(() => { window.__broDashPanelBus.toBar(); });
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
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
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
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
  });
  await P.page.waitForTimeout(400);

  /* ═══ v2.3.1853: THE XP MOVED TO THE THREE COMBAT PILLS ═══
     Owner: "just put the icons to the left of the bar and overall level to
     the right of the bar.  A number in the bar numerator and denominator on
     the same line."

     Every assertion here is bound to a three-pills guard: `[].every(...)`
     is TRUE, so a selector that found nothing would have "passed" the
     geometry checks — which is exactly what the first run of this did.

     Three claims per pill, and the ORDER is the one that would pass by
     accident: "an icon, a bar and a level exist somewhere in this pill" is
     true of almost any arrangement of them, so the geometry is checked —
     icon left of bar, level right of bar.

     The pills read their OWN skill, which is the part a shared readout
     would fake: the three are given different XP and each must print its
     own pair, not the biggest or the first. */
  await setXp(P, { sword: 250, bow: 210, staff: 140 });
  await P.page.waitForTimeout(700);
  const pills = await readPills(P);
  /* Printed on every run, not just failures: the sizing of this card has
     been revised five times, and each round starts by asking how much room
     each readout actually has.  "needs 43, has 34" is the number that ends
     the argument. */
  console.log('    card text', JSON.stringify((pills[0] || {}).rows));
  rec.ok('all three combat cards were found (guard)', pills.length === 3,
    { pills: pills.map((p) => p.label) });
  const three = pills.length === 3;   /* .every() on [] is TRUE — see above */
  const [melee, bow, magic] = pills;
  rec.ok('each card shows its XP as a pair',
    three && pills.every((p) => p.pairText && /^\d[\d.k]*\/\d[\d.k]*$/.test(p.pairText)),
    pills.map((p) => p.pairText));
  /* Its OWN skill's numbers: 250 / 210 / 140 against the same 280. */
  rec.ok('...and it is that skill\'s own progress, not a shared number',
    three && melee.pairText === '250/280' && bow.pairText === '210/280'
      && magic.pairText === '140/280',
    pills.map((p) => `${p.label}=${p.pairText}`));
  rec.ok('...and its level, spelled LV n',
    three && pills.every((p) => /^LV\s*\d+$/i.test(p.lvlText || '')),
    pills.map((p) => p.lvlText));

  /* ═══ v2.3.1858: HALF THE CARD IS THE ICON ═══
     Owner: "the 3 combat icons need to take up half of the pill space.  You
     can shrink down the xp bar to make room for that."

     Asserted as a RATIO of the card, not as a pixel size: the card is 94px
     at 390 and 80 at 360, so any fixed number is right on one phone and
     wrong on the other — and "the icon got bigger" would be satisfied by
     one extra pixel. */
  rec.ok('the icon takes about half the card\'s width',
    three && pills.every((p) => p.icon && p.icon.w / p.pillW >= 0.42 && p.icon.w / p.pillW <= 0.55),
    pills.map((p) => ({ card: p.pillW, icon: p.icon && p.icon.w,
      pct: p.icon && Math.round((p.icon.w / p.pillW) * 100) })));
  /* ...and it is a real picture, not a wide sliver: square, and most of the
     card's height too. */
  rec.ok('...and most of its height',
    three && pills.every((p) => p.icon && p.icon.b - p.icon.t >= p.cardH * 0.6),
    pills.map((p) => ({ cardH: p.cardH, iconH: p.icon && (p.icon.b - p.icon.t) })));

  /* The three readouts moved into the right column beside it — the whole
     point of the split, and the thing a naive "make the icon bigger" would
     have broken by overlapping them. */
  rec.ok('the level and the bar sit RIGHT of the icon',
    three && pills.every((p) => p.lvl && p.bar && p.icon
      && p.lvl.l >= p.icon.r - 1 && p.bar.l >= p.icon.r - 1),
    pills.map((p) => ({ icon: p.icon, lvl: p.lvl, bar: p.bar })));
  rec.ok('...with the level above the bar',
    three && pills.every((p) => p.bar.t >= p.lvl.t),
    pills.map((p) => ({ lvl: p.lvl, bar: p.bar })));
  /* ═══ v2.3.1862: THE PAIR SPANS THE CARD ═══
     Owner: "try to make the xp text just wider."  It could not get wider
     inside the right-hand column — 41px, all of it needed at 8.8, ceiling
     measured at 9.0 — so it moved to the card's full width along the bottom.
     Asserted as a RATIO of the card, not a pixel count, because the card is
     94px at 390 and 80 at 360; and asserted BELOW the bar, because "it is
     wide" would also be true of a pair that had landed on top of the level. */
  rec.ok('the XP pair spans the whole card, not one column',
    three && pills.every((p) => p.pair && p.pair.w >= p.pillW * 0.85),
    pills.map((p) => ({ card: p.pillW, pair: p.pair && p.pair.w,
      pct: p.pair && Math.round((p.pair.w / p.pillW) * 100) })));
  /* v2.3.1863: hard against the right rim.  Measured on the denominator's
     glyphs, not the containing box — the box spans the card whether the text
     is centred or not, so it would pass either way. */
  rec.ok('...ending hard against the card\'s right edge',
    three && pills.every((p) => p.denom && p.cardRight - p.denom.r <= 6),
    pills.map((p) => ({ cardRight: p.cardRight, denomRight: p.denom && p.denom.r,
      gap: p.denom && (p.cardRight - p.denom.r) })));
  rec.ok('...along the bottom, clear of the bar above it',
    three && pills.every((p) => p.pair && p.bar && p.pair.t >= p.bar.b - 1),
    pills.map((p) => ({ bar: p.bar, pair: p.pair })));
  /* The bar SHRANK, which is what paid for the icon.  Asserted so a later
     pass cannot quietly widen it back across the card and re-break the
     half. */
  rec.ok('...and the bar is now about half the card, not all of it',
    three && pills.every((p) => p.bar && p.bar.w <= p.pillW * 0.62),
    pills.map((p) => ({ card: p.pillW, bar: p.bar && p.bar.w })));
  /* The painted fill, not just the text — a card whose numbers moved while
     its fill did not is the bug a text-only check would miss. */
  rec.ok('...and the fill matches the numbers',
    three && !!melee.fillW && Math.abs(parseFloat(melee.fillW) - (250 / 280) * 100) < 1,
    { fillW: three && melee.fillW });
  rec.ok('the level survives an unspent-points badge',
    three && pills.every((p) => /^LV\s*\d+$/i.test(p.lvlText || '') && p.badgeText === '+2'),
    pills.map((p) => ({ lvl: p.lvlText, badge: p.badgeText })));
  rec.ok('...without the badge sitting ON the level',
    three && pills.every((p) => p.badgeHitsLvl === false),
    pills.map((p) => ({ lvl: p.lvlText, badge: p.badgeText, overlap: p.badgeHitsLvl })));
  /* It has to FIT.  360 is the narrowest phone this layout supports; the
     card is 80px there, and the top row is the one that spills. */
  rec.ok('...and no row is clipped at this width',
    three && pills.every((p) => p.clipped === false),
    pills.map((p) => ({ pill: p.pillW, rows: p.rows })));

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary.png' });

  /* ═══ THE NARROW PHONE ═══
     360 is the smallest width this layout supports, and it is the one the
     pill sizing is actually constrained by: 80px of pill against 94 at 390.
     The component has a `tight` branch for it, and a branch no test ever
     renders is a branch that is wrong the first time someone opens the game
     on a small phone.  Same assertions, one viewport down. */
  const N = await H.newPlayer(browser, { name: 'Narrow', wsPort, webPort, viewport: { width: 360, height: 780 }, touch: true });
  await H.enterWorld(N);
  await N.page.waitForTimeout(3000);
  await N.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    if (!R.prog3) R.prog3 = {};
    if (!R.prog3.sk) R.prog3.sk = {};
    R.prog3.sk.sword = { level: 1, xp: 250 };
    R.prog3.sk.bow = { level: 1, xp: 210 };
    R.prog3.sk.staff = { level: 1, xp: 140 };
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
  });
  await N.page.waitForTimeout(700);
  const narrow = await readPills(N);
  rec.ok('the three pills are there at 360 too (guard)', narrow.length === 3,
    { n: narrow.length });
  rec.ok('...and their numbers still fit',
    narrow.length === 3 && narrow.every((p) => p.clipped === false),
    narrow.map((p) => ({ pill: p.pillW, rows: p.rows })));
  rec.ok('...and still read their own skill',
    narrow.length === 3 && narrow[0].pairText === '250/280'
      && narrow[1].pairText === '210/280' && narrow[2].pairText === '140/280',
    narrow.map((p) => p.pairText));
  await N.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary-360.png' });

  /* ═══ v2.3.1920: THE WIDEST PAIR THE FORMATTER CAN PRODUCE ═══
     Owner: "It looks like there's room to make the 3 combat skill xp numbers
     a little bigger and chunkier", and there was — but "0/280" is the pair a
     FRESH character shows, and sizing type against the shortest string it
     will ever hold is how you ship a number that fits on day one and clips
     at level 20.  xpShort caps each side at four characters ("9.9k"), so the
     worst case is roughly "9.9k/9.9k".  Driven here at BOTH widths, on the
     narrow phone first because 360 is where the card is 80px, not 94. */
  const WIDEST = 9990;   /* -> "9.9k", the longest xpShort output */
  for (const [who, label] of [[N, '360'], [P, '390']]) {
    await who.page.evaluate((xp) => {
      const R = window._gameState.current.rpg;
      if (!R.prog3) R.prog3 = {};
      if (!R.prog3.sk) R.prog3.sk = {};
      /* A level high enough that the threshold is four characters too, so
         BOTH halves of the pair are at their widest. */
      for (const k of ['sword', 'bow', 'staff']) R.prog3.sk[k] = { level: 20, xp };
      try { window.__broDashPanelBus.toBar(); } catch (e) {}
    }, WIDEST);
    await who.page.waitForTimeout(700);
    const wide = await readPills(who);
    rec.ok(`the widest possible XP pair still fits at ${label}`,
      wide.length === 3 && wide.every((p) => p.clipped === false),
      wide.map((p) => ({ pair: p.pairText, pill: p.pillW, rows: p.rows.filter((r) => r.over > 0) })));
    /* Not clipped is not the same as not OVERLAPPING: the pair is absolutely
       positioned across the card's bottom, so it can run under the level and
       the bar without either box reporting an overflow. */
    rec.ok(`...without colliding with the level at ${label}`,
      wide.length === 3 && wide.every((p) => p.pair && p.lvl && p.pair.t >= p.lvl.b - 1),
      wide.map((p) => ({ pair: p.pair, lvl: p.lvl })));
    await who.page.screenshot({ path: `/home/user/GameDev/tools/qa/mp/out/bandsummary-wide-${label}.png` });
  }

  await N.ctx.close().catch(() => {});
  await P.ctx.close().catch(() => {});
}
