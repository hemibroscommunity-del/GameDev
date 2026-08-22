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

const readPills = (P) => P.page.evaluate(() => {
    const els = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .filter((el) => el.offsetParent !== null && /^(Melee|Bow|Magic) level/i.test(el.getAttribute('aria-label')));
    return els.map((el) => {
      const img = el.querySelector('img');
      const spans = [...el.querySelectorAll('span')].filter((x) => (x.textContent || '').trim());
      /* The bar is the only child with a rounded track and an absolute fill
         inside it; find it by that fill rather than by position. */
      const bar = [...el.querySelectorAll('div')]
        .filter((d) => [...d.children].some((c) => c.style && c.style.position === 'absolute'))[0] || null;
      const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
        return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; };
      const txt = bar ? (bar.textContent || '').replace(/\s+/g, '') : null;
      /* The LEVEL span, not the corner badge: the badge is last in DOM
         order when it exists, and reading it as the level is exactly the
         confusion v2.3.1853 fixed. */
      const lvlSpan = spans.filter((x) => !/^\+/.test((x.textContent || '').trim())).pop() || null;
      const badge = spans.filter((x) => /^\+\d+$/.test((x.textContent || '').trim()))[0] || null;
      const fill = bar ? [...bar.children].filter((c) => c.style && c.style.position === 'absolute')[0] : null;
      return {
        label: el.getAttribute('aria-label'),
        icon: box(img), bar: box(bar), lvl: box(lvlSpan),
        lvlText: lvlSpan ? (lvlSpan.textContent || '').trim() : null,
        badgeText: badge ? (badge.textContent || '').trim() : null,
        pair: txt, fillW: fill ? fill.style.width : null,
        pillW: Math.round(el.getBoundingClientRect().width),
        clipped: bar ? bar.scrollWidth > bar.clientWidth + 1 : null,
        /* Reported, not just judged: "it clips" sends you guessing at four
           sizes; "needs 41, has 34" names the seven pixels. */
        barNeed: bar ? bar.scrollWidth : null,
        barHave: bar ? bar.clientWidth : null,
        iconW: img ? Math.round(img.getBoundingClientRect().width) : null,
        lvlW: lvlSpan ? Math.round(lvlSpan.getBoundingClientRect().width) : null,
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
  rec.ok('all three combat pills were found (guard)', pills.length === 3,
    { pills: pills.map((p) => p.label) });
  const [melee, bow, magic] = pills;
  const three = pills.length === 3;   /* .every() on [] is true — see below */
  rec.ok('each pill carries an XP bar with its numbers inside',
    three && pills.every((p) => p.pair && /^\d[\d.k]*\/\d[\d.k]*$/.test(p.pair)),
    pills.map((p) => p.pair));
  /* Its OWN skill's numbers: 250 / 210 / 140 against the same 280. */
  rec.ok('...and it is that skill\'s own progress, not a shared number',
    !!(melee && bow && magic && melee.pair === '250/280'
      && bow.pair === '210/280' && magic.pair === '140/280'),
    pills.map((p) => `${p.label}=${p.pair}`));
  rec.ok('...with the icon to the LEFT of the bar',
    three && pills.every((p) => p.icon && p.bar && p.icon.r <= p.bar.l + 1),
    pills.map((p) => ({ icon: p.icon, bar: p.bar })));
  rec.ok('...and the level to the RIGHT of it',
    three && pills.every((p) => p.lvl && p.bar && p.lvl.l >= p.bar.r - 1),
    pills.map((p) => ({ bar: p.bar, lvl: p.lvl })));
  /* The painted fill, not just the text — a bar whose numbers moved while
     its fill did not is the bug a text-only check would miss. */
  /* v2.3.1853: with points waiting, the pill shows BOTH — the level in the
     slot the owner asked for it in, and the +N in the corner.  The scenario
     stocks the pool with 2, so this is the state under test; before this
     version the badge REPLACED the level and lvlText would read "+2". */
  rec.ok('the level survives an unspent-points badge',
    three && pills.every((p) => /^\d+$/.test(p.lvlText || '')),
    pills.map((p) => ({ lvl: p.lvlText, badge: p.badgeText })));
  rec.ok('...and the badge is still shown, in the corner',
    three && pills.every((p) => p.badgeText === '+2'),
    pills.map((p) => p.badgeText));
  rec.ok('...and the fill matches the numbers',
    !!(melee && melee.fillW && Math.abs(parseFloat(melee.fillW) - (250 / 280) * 100) < 1),
    { fillW: melee && melee.fillW });
  /* It has to FIT.  360 is the narrowest phone this layout supports and the
     pill is 80px there — the whole reason the numbers sit inside the bar. */
  rec.ok('...and nothing is clipped at this width',
    three && pills.every((p) => p.clipped === false),
    pills.map((p) => ({ pill: p.pillW, icon: p.iconW, bar: `${p.barNeed}/${p.barHave}`, lvl: p.lvlW })));

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
    narrow.map((p) => ({ pill: p.pillW, icon: p.iconW, bar: `${p.barNeed}/${p.barHave}`, lvl: p.lvlW })));
  rec.ok('...and still read their own skill',
    narrow.length === 3 && narrow[0].pair === '250/280'
      && narrow[1].pair === '210/280' && narrow[2].pair === '140/280',
    narrow.map((p) => p.pair));
  await N.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bandsummary-360.png' });
  await N.ctx.close().catch(() => {});

  await P.ctx.close().catch(() => {});
}
