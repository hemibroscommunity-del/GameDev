/* THE BAND'S COMPACT SUMMARY (v2.3.1848) — AND ITS RETIREMENT (v2.3.2320).
 *
 * Owner, then: "in the top dashboard where it shows the character head preview
 * I want to replace it with a compact summary like this" — NAME · LV n, an XP
 * bar with a percentage, and DPS / DEF / HP / coins.
 *
 * Owner, since, four more times: cut the stat row, cut the name and level, cut
 * the XP pair ("the dashboard menu has the 3 skills on it already for xp"),
 * and finally "move gold amount display to very top right on the top bar that
 * lists the zone name".  Each cut because something else on screen already
 * said it — and the last one empties the block, so the summary is gone.
 *
 * WHAT THIS FILE IS NOW, in two halves:
 *
 *   1. The summary's ABSENCE, and the two things that outlived it: the row it
 *      lived in still has to fit, and the character screen still has to be one
 *      tap away — it was the summary that made it so, and now it is the rail's
 *      Character button.  Where the gold WENT is mp-goldrail's subject, not
 *      this one's.
 *
 *   2. The three combat skill cards below it, unchanged and still the bulk of
 *      this file.  The claim that is easy to make and hard to keep is the XP
 *      bar's: "a bar appears" is true of the bar that was already there, while
 *      "it tracks the closest weapon" is a statement about which of three
 *      numbers won.  So this drives the bar three times — melee ahead, then
 *      bow ahead, then magic ahead — and checks both the icon and the
 *      percentage each time.  A build that hard-coded the melee icon passes
 *      the first pass perfectly.
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
      /* v2.3.2131: the numbers moved to the popup and the BAR became the
         thing that carries them -- it reads the eased value and publishes it
         where its own width is computed from.  pairText above stays: it is
         now the assertion that no digits are left on the card face. */
      prog: (() => { const b = el.querySelector('[data-xpbar]');
        const v = b && b.getAttribute('data-xpprog'); return v == null || v === '' ? null : +v; })(),
      thresh: (() => { const b = el.querySelector('[data-xpbar]');
        const v = b && b.getAttribute('data-xpthresh'); return v == null || v === '' ? null : +v; })(),
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

  /* ═══ v2.3.2320: THE SUMMARY IS GONE, AND THAT IS THE ASSERTION NOW ═══
   * Owner, in the same message that asked for wider nav buttons: "Move gold
   * amount display to very top right on the top bar that lists the zone name."
   *
   * The purse was the last thing left in this strip — the portrait went at
   * v2.3.1848, the stat row at v2.3.1849, the name and level and the XP pair
   * at v2.3.1853/1857 — so moving it empties the block, and IdentityStrip's
   * band branch returns null while BottomDashboard stops mounting it.
   *
   * The eight assertions that stood here measured the summary's contents and
   * are not rewritten to "check the same thing in the header": that is
   * mp-goldrail's job, and it does it properly (one count on the screen, in
   * both orientations, drilled and not).  What is kept here is what only this
   * file was ever watching — that the row the summary lived in still fits, and
   * that the ONE job the summary did besides reading out numbers, being the
   * way to the character screen, still has an owner.
   *
   * Every absence below is asserted against a SEVEN-FIGURE purse.  A band with
   * 75 coins in it and a band with none look identical to a regex that is
   * looking for a comma. */
  await P.page.evaluate(() => {
    window._gameState.current.rpg.coins = 1234567;
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
  });
  await P.page.waitForTimeout(700);

  const band = await readBand(P);
  rec.ok('the band summary is GONE — the strip retired with its last readout',
    !band.found, band);

  const inBand = await P.page.evaluate(() => {
    const dash = document.querySelector('.bt-dashboard');
    if (!dash) return { dash: false };
    const leaves = [...dash.querySelectorAll('*')]
      .filter((el) => !el.children.length && (el.textContent || '').trim())
      .map((el) => (el.textContent || '').trim());
    /* The identity row is the absolute row that owns the fold chip. */
    const fold = dash.querySelector('[data-dash-fold]');
    const row = fold ? fold.parentElement : null;
    const r = row ? row.getBoundingClientRect() : null;
    return {
      dash: true,
      gold: leaves.filter((t) => t.indexOf('1,234,567') !== -1),
      row: r ? { w: Math.round(r.width), right: Math.round(r.right) } : null,
      over: row ? row.scrollWidth - row.clientWidth : null,
      kids: row ? [...row.children].map((k) => (k.getAttribute('data-dash-fold') ? 'CLOSE'
        : (k.querySelector('.bt-navrail') || k.classList.contains('bt-navrail')) ? 'rail'
          : ((k.textContent || '').trim().slice(0, 12) || k.tagName))) : null,
      vw: window.innerWidth,
    };
  });
  rec.ok('...and no gold count is left anywhere in the band',
    inBand.dash && inBand.gold.length === 0, inBand.gold);
  rec.ok('...the identity row now holds the CLOSE pill and the rail, nothing else',
    !!inBand.kids && inBand.kids.length === 2
      && inBand.kids[0] === 'CLOSE' && inBand.kids[1] === 'rail', inBand.kids);
  /* The overflow check the old block did on the strip, done on the ROW — which
     is the thing that was actually overflowing.  With the purse in here the
     row's children came to 486 inside 382 and the rail hung off the phone. */
  rec.ok('...and the row fits inside itself and inside the phone',
    inBand.over !== null && inBand.over <= 1
      && !!inBand.row && inBand.row.right <= inBand.vw + 1, inBand);

  /* ── HERO IS STILL REACHABLE ──
     The summary was a button: the portrait was the way to the character screen
     from the resting band (v2.3.1637), and the whole block inherited that job
     at v2.3.1848.  Retiring it is only safe because the rail's own Character
     button is right there — so this taps THAT, for real, through the harness's
     hit-testing opener rather than by dispatching an event at a node.  A
     synthetic dispatch would pass on a button buried under something else,
     which is the failure mode this row has actually had. */
  await H.openDest(P, 'Character', { timeout: 8000 });
  await P.page.waitForTimeout(900);
  const opened = await P.page.evaluate(() =>
    !!document.querySelector('canvas[aria-label="Your character"]'));
  rec.ok('Hero is still one real tap away, from the rail instead of the summary',
    opened, {});
  await P.page.evaluate(() => { window.__broDashPanelBus.toBar(); });
  await P.page.waitForTimeout(400);
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
  /* ═══ v2.3.2131: THE DIGITS ARE GONE FROM THE CARD ═══
     This asserted the opposite until now -- that every card printed its XP as
     a pair -- and the owner asked for exactly that to stop: "get rid of the xp
     numbers in the 3 combat skills and put them as some kind of pop up when
     you tap on it."  So the claim flips, and it is worth flipping rather than
     deleting: "no digits" is the requirement, and a later pass that quietly
     puts a number back on this card should fail here. */
  rec.ok('no card prints XP digits on its face any more',
    three && pills.every((p) => p.pairText === null),
    pills.map((p) => `${p.label}=${p.pairText}`));
  /* THE PROPERTY THAT SURVIVED THE MOVE.  Each card still shows its OWN
     skill's progress rather than a shared number -- 250 / 210 / 140 against
     the same 280 -- only now the bar carries it instead of the text.  Read
     off the bar's published value, which is the number its width is drawn
     from. */
  rec.ok('...but each bar still shows that skill\'s own progress, not a shared one',
    three && melee.prog === 250 && bow.prog === 210 && magic.prog === 140
      && pills.every((p) => p.thresh === 280),
    pills.map((p) => `${p.label}=${p.prog}/${p.thresh}`));
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
  /* ═══ v2.3.2131: THREE GEOMETRY ASSERTIONS RETIRED WITH THE PAIR ═══
     What stood here measured the pair's box: that it spanned the card rather
     than one column (v2.3.1862), that its denominator sat hard against the
     right rim (v2.3.1863), and that it cleared the bar above it.  All three
     were about placing digits on a card that no longer carries any, so they
     are removed rather than adapted -- there is nothing left for them to be
     true or false about, and the "no digits" assertion above is what now
     guards that ground.

     The card's own geometry is still asserted, below and unchanged: the bar
     is half the card, the fill matches the numbers, the level survives the
     badge, and nothing clips at either width. */
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
  /* v2.3.2131: read off the bar, for the reason given at the 390 case -- the
     digits moved to the popup and the bar carries the value now. */
  rec.ok('...and still read their own skill',
    narrow.length === 3 && narrow[0].prog === 250
      && narrow[1].prog === 210 && narrow[2].prog === 140
      && narrow.every((p) => p.thresh === 280),
    narrow.map((p) => `${p.prog}/${p.thresh}`));
  await N.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary-360.png' });

  /* ═══ v2.3.1922: THE CARD MUST AGREE WITH THE CHARACTER ═══
     Owner, on a returning character: "the combat stats appear as 0" — three
     cards reading LV 0 beside a Build panel reading Lv 3.  The card's XP came
     from the prog3 blob while its LEVEL fell back to the legacy `weaponSkills`
     corpse, which prog3 characters carry zeroed.

     Honest limit, stated rather than papered over: the bug only appears while
     caps.prog3 is not yet in, and the cap is a module variable set from
     state_sync that no page-side hook can clear — so THIS harness (where the
     worker advertises the cap immediately) cannot reproduce the race.  What it
     can pin is the invariant the owner actually noticed: whatever the card
     prints must be what the character has.  A future change that reaches the
     legacy branch under any condition this suite can create fails here. */
  await N.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    if (!R.prog3) R.prog3 = {};
    if (!R.prog3.sk) R.prog3.sk = {};
    R.prog3.sk.sword = { level: 8, xp: 120 };
    R.prog3.sk.bow = { level: 3, xp: 40 };
    R.prog3.sk.staff = { level: 1, xp: 10 };
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
  });
  await N.page.waitForTimeout(700);
  const levelled = await readPills(N);
  const wantLv = await N.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    return ['sword', 'bow', 'staff'].map((k) => (R.prog3.sk[k] || {}).level);
  });
  rec.ok('the cards print the level the character actually has',
    levelled.length === 3 && levelled.every((p, i) => p.lvlText === 'LV ' + wantLv[i]),
    { got: levelled.map((p) => p.lvlText), want: wantLv.map((v) => 'LV ' + v) });
  /* The specific shape of the failure: prog3SkillLevel floors at 1, so a
     rendered 0 can ONLY have come from the legacy corpse. */
  rec.ok('...and never LV 0, which only the legacy fallback can produce',
    levelled.every((p) => p.lvlText !== 'LV 0'), levelled.map((p) => p.lvlText));

  /* ═══ v2.3.1920: THE WIDEST PAIR THE FORMATTER CAN PRODUCE ═══
     Owner: "It looks like there's room to make the 3 combat skill xp numbers
     a little bigger and chunkier", and there was — but "0/280" is the pair a
     FRESH character shows, and sizing type against the shortest string it
     will ever hold is how you ship a number that fits on day one and clips
     at level 20.  xpShort caps each side at four characters ("9.9k"), so the
     worst case is roughly "9.9k/9.9k".  Driven here at BOTH widths, on the
     narrow phone first because 360 is where the card is 80px, not 94. */
  /* ═══ v2.3.2131: STILL DRIVEN WIDE, FOR A DIFFERENT REASON ═══
     This used to size the card against the widest string xpShort could
     produce ("9.9k/9.9k"), because the pair was the thing that clipped.  The
     pair is gone, so that reasoning is gone with it -- but the CASE is worth
     keeping: at level 20 the card holds "LV 20" instead of "LV 1", and a
     card that fits on day one and clips at level 20 is precisely the failure
     the original note was written about.  Same number, same two widths, now
     asserting the card that is actually rendered. */
  const WIDEST = 9990;
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
    rec.ok(`a level-20 card still fits at ${label}`,
      wide.length === 3 && wide.every((p) => p.clipped === false),
      wide.map((p) => ({ lvl: p.lvlText, pill: p.pillW, rows: p.rows.filter((r) => r.over > 0) })));
    /* And the digits stay off it at the extreme too.  The card is tightest
       here, which is exactly where a future pass would be tempted to squeeze
       a number back in. */
    rec.ok(`...and still prints no XP digits at ${label}`,
      wide.length === 3 && wide.every((p) => p.pairText === null),
      wide.map((p) => p.pairText));
    await who.page.screenshot({ path: `/home/user/GameDev/tools/qa/mp/out/bandsummary-wide-${label}.png` });
  }

  await N.ctx.close().catch(() => {});
  await P.ctx.close().catch(() => {});
}
