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

  /* ── v2.3.1697: the Overview aggregate grid (Character opens here) ──
     Armour became a SEVENTH cell in a grid that had six, and the fix for
     "seven into a 3-wide grid" was a fourth COLUMN rather than a third row
     — this panel's body is measured in single pixels and its scroll-edge
     fade is deliberately off, so anything below the fold is invisible with
     no cue.  Narrower columns move the risk from vertical to HORIZONTAL,
     so both are measured here: the grid must not overflow its column, and
     no cell's own text may overflow the cell. */
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
  const armourCell = await P.page.evaluate(() => {
    const label = [...document.querySelectorAll('div')]
      .find((d) => d.children.length === 0 && d.textContent.trim() === 'Armour');
    if (!label) return { err: 'no ARMOUR cell on the Overview grid' };
    const cell = label.parentElement;
    const grid = cell.parentElement;
    const over = [...grid.children]
      .flatMap((c) => [...c.children])
      .filter((t) => t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent.trim());
    return {
      value: (cell.lastElementChild || {}).textContent,
      cells: grid.children.length,
      gridOverflowX: grid.scrollWidth - grid.clientWidth,
      clipped: over,
    };
  });
  rec.ok('the Overview grid shows an ARMOUR cell with a real percentage',
    !armourCell.err && /^\d+(\.\d)?%$/.test(String(armourCell.value || '')), armourCell);
  rec.ok('...and the seven-cell grid still fits its column, uncropped',
    !armourCell.err && armourCell.cells === 7
    && armourCell.gridOverflowX <= 1 && armourCell.clipped.length === 0, armourCell);

  /* ── the Build tab renders the allocation screen ── */
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"]').first()
    .click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const disabled = await P.page.locator('[role="button"][aria-disabled="true"][aria-label*=" of "]').count().catch(() => 0);
  rec.ok('every stat is unspendable with an empty pool', disabled === 7, { disabled });
  /* The selector is icon+level chips, so the type names live in
     aria-label rather than in the text — same icon-only recipe as the
     Hero section tabs.  Assert the accessible names, which is also what
     a screen reader gets. */
  const typeLabels = await P.page.locator('[role="button"][aria-label*="level"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))).catch(() => []);
  rec.ok('the combat-type selector offers all three types',
    ['Melee', 'Bow', 'Magic'].every((n) => typeLabels.some((l) => l && l.startsWith(n))), typeLabels);

  /* ═══ THE OWNER'S ACTUAL REQUIREMENT ═══
     "all stats allocable within the active primary combat stat can be
     seen all at once without scrolling."  Measured, not eyeballed: the
     Build section's content must not exceed its own scroll viewport.
     The v2.3.1660 list needed 352px against a 145px body, so five of
     seven stats sat below a fold with no scroll cue — this assertion is
     what stops that regressing quietly. */
  const fit = await P.page.evaluate(() => {
    const btn = document.querySelector('[aria-label*="Crit"], [aria-label*="Defense"]');
    if (!btn) return { err: 'no stat cell found' };
    /* Walk up to the scrolling panel (the one with overflow-y auto). */
    let el = btn.parentElement;
    while (el && getComputedStyle(el).overflowY !== 'auto') el = el.parentElement;
    if (!el) return { err: 'no scroll container' };
    return { scrollH: el.scrollHeight, clientH: el.clientHeight };
  });
  rec.ok('the Build screen fits without scrolling',
    !fit.err && fit.scrollH <= fit.clientH + 1, fit);

  const cells = await P.page.locator('[aria-disabled][role="button"][aria-label*=" of "]').count().catch(() => 0);
  rec.ok('all seven allocatable stats are present at once', cells === 7, { cells });

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
    pillGeom.box.length === 7 && widths.length === 1 && heights.length === 1, pillGeom.box);
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
  await P.page.waitForTimeout(700);
  const barText = await P.page.evaluate(() => {
    const hit = Array.from(document.querySelectorAll('div, span'))
      .map((e) => (e.innerText || '').trim())
      .filter((t) => /\bLv \d+/.test(t) && /MELEE|BOW|MAGIC|SWORD|STAFF/i.test(t));
    return hit.length ? hit[hit.length - 1].replace(/\s+/g, ' ').slice(0, 80) : null;
  });
  rec.ok('the kill XP bar appears', !!barText, barText);
  rec.ok('...showing the prog3 trained level, not the retired weapon-skill one',
    !!barText && /Lv 5\b/.test(barText) && !/Lv 40\b/.test(barText), barText);
  rec.ok('...named the way every other screen names it (MELEE, not SWORD)',
    !!barText && /MELEE/i.test(barText), barText);

  await P.ctx.close().catch(() => {});
}
