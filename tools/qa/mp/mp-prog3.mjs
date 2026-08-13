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
  rec.ok('maxHp re-derives to the prog3 formula (100 + level×2)', adopted && adopted.maxHp === 106, adopted);
  rec.ok('the allocation pool starts empty', adopted && adopted.pool === 0 && adopted.sword === 1, adopted);

  /* ── the Build tab renders the allocation screen ── */
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
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
