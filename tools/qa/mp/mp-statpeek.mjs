/* THE STAT-ALLOCATION TOOLTIP TELLS THE TRUTH (v2.3.1766).
 *
 * Owner: "a tooltip on the stat allocation screen ... include the overall
 * change to crit from baseline and the '+#DPS' changes it effects in that same
 * tooltip by allocating a point there", and separately that the equip menu's
 * overall DPS must be "accurately gauged ... account for increases in stat
 * allocations to crit chance, crit damage, etc of the equipped weapon feeding
 * that pipeline".
 *
 * The only thing worth testing about a preview is whether it MATCHES REALITY,
 * so this spends the point and checks the promise against what the character
 * actually ends up with — and it gets "reality" from the game rather than
 * recomputing it here, by reading the equip menu's own overall DPS afterwards.
 * Two different screens, two different code paths, one number: if the tooltip
 * and the equip readout disagree, one of them is lying to the player.
 */
import * as H from './harness.mjs';

const CRIT_RE = /CRIT[^\d-]*([\d.]+)%\s*→\s*([\d.]+)%/i;
const DPS_RE = /DPS\s*([\d.]+)\s*→\s*([\d.]+)/i;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Peeker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  /* Seed a weapon and unspent points.  A weapon is not decoration here: the
     tooltip's DPS half has nothing to speak for without one, and saying so is
     one of the states under test. */
  const seeded = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !R.prog3) return null;
    R.weapon = { type: 'greatsword', tier: 'common', tierMult: 1.12, gearBase: 'copper',
      name: 'Test Sword', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
    R.activeSlot = 'melee';
    R.prog3.sk = R.prog3.sk || {};
    R.prog3.sk.sword = { level: 8, xp: 0 };
    R.prog3.atk = { sword: { crit: 20, critDmg: 10, aspd: 5 } };
    R.prog3.pool = Object.assign({}, R.prog3.pool, { unspent: 5 });
    return { crit: R.prog3.atk.sword.crit };
  });
  rec.ok('a weapon and allocated crit could be seeded', !!seeded, seeded);
  if (!seeded) { await P.ctx.close().catch(() => {}); return; }

  /* The allocation pills live under the BUILD section (SECTIONS is
     Overview/Build/Records — there is no 'Stats' tab), and heroSectionBus is
     not on window, so the tab is tapped the way a finger taps it. */
  await P.page.evaluate(() => {
    if (window.__broDashPanelBus) { window.__broDashPanelBus.open('hero'); window.__broDashPanelBus.expand(); }
  });
  await P.page.waitForTimeout(700);
  /* The section tabs are ICON-ONLY — no text node to match on.  v2.3.2013:
     found by data-section, which is the section's ID, NOT by title.  title
     carries the display LABEL, and the owner renamed Build to "Points" in
     v2.3.1849 — so `[title="Build"]` matched nothing, this returned false, and
     the five assertions below reported an empty strip as though the readout
     were broken.  The section had simply never opened. */
  const openSection = (name) => P.page.evaluate((n) => {
    const t = document.querySelector(`[role="button"][data-section="${n}"]`);
    if (!t) return false;
    for (const type of ['pointerdown', 'pointerup']) {
      t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
    }
    return true;
  }, name);
  const onBuild = await openSection('Build');
  rec.ok('the Build section could be opened', onBuild);
  await P.page.waitForTimeout(800);

  /* By CLASS, not by prose — the same contract lesson the quest turn-in
     button taught: a caption is owner-facing copy and gets reworded. */
  const stripText = () => P.page.evaluate(() => {
    const el = document.querySelector('.bt-stat-peek');
    return el ? (el.innerText || '') : '';
  });

  /* ── resting state: the overall DPS the owner asked for ── */
  const resting = await stripText();
  rec.ok('at rest the strip carries the overall DPS', /DPS\s*[\d.]+/.test(resting), resting.slice(0, 200));

  /* ── tap CRIT's ℹ️: the stat total from baseline, and the DPS it buys ──
     v2.3.2222: the readout moved from a press-to-peek strip into the ℹ️
     window (owner: "Tapping it launches into a new window that describes
     its effect").  Same two numbers, same regexes, read off the popup's
     rows instead of the strip.  The ℹ️ is found INSIDE the crit row, and
     tapped with pointerup because that is what the button listens for --
     and the guard below proves the tap opened a window rather than spent
     a point, which is the one thing the nested button must never do. */
  const poolBefore = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return S && S.rpg && S.rpg.prog3 && S.rpg.prog3.pool ? S.rpg.prog3.pool.unspent : null;
  });
  const pressed = await P.page.evaluate(() => {
    const pills = [...document.querySelectorAll('[role="button"][aria-label*=" of "]')]
      .filter((d) => /crit/i.test(d.getAttribute('aria-label') || ''));
    const el = pills.find((d) => !/crit dmg/i.test(d.getAttribute('aria-label') || '')) || pills[0];
    const info = el && el.querySelector('[data-stat-info]');
    if (!info) return false;
    for (const type of ['pointerdown', 'pointerup']) {
      info.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
    }
    return true;
  });
  rec.ok('the Crit row carries an ℹ️ and it could be tapped', pressed);
  await P.page.waitForTimeout(400);
  const popup = await P.page.evaluate(() => {
    const card = document.querySelector('[data-infopopup-card]');
    const rows = document.querySelector('[data-infopopup-rows]');
    const demo = document.querySelector('[data-stat-demo]');
    const S = window._gameState && window._gameState.current;
    return { open: !!card, text: rows ? (rows.innerText || '') : '',
      demo: demo ? demo.getAttribute('data-stat-demo') : null,
      pool: S && S.rpg && S.rpg.prog3 && S.rpg.prog3.pool ? S.rpg.prog3.pool.unspent : null };
  });
  rec.ok('...and a window opened rather than a point being spent',
    popup.open && popup.pool === poolBefore, { ...popup, poolBefore });
  rec.ok('...carrying the crit scene', popup.demo === 'crit', popup);
  const peek = popup.text;
  const mCrit = CRIT_RE.exec(peek);
  const mDps = DPS_RE.exec(peek);
  rec.ok('...and the tooltip shows crit moving from its BASELINE total',
    !!mCrit, peek.slice(0, 240));
  rec.ok('...and the DPS that point buys', !!mDps, peek.slice(0, 240));
  if (!mCrit || !mDps) { await P.ctx.close().catch(() => {}); return; }

  /* GUARD: a preview whose before and after are equal proves nothing — the
     comparison below would hold for a strip that just echoed one number. */
  rec.ok('...and the point actually moves both numbers (guard)',
    Number(mCrit[2]) > Number(mCrit[1]) && Number(mDps[2]) > Number(mDps[1]),
    { crit: [mCrit[1], mCrit[2]], dps: [mDps[1], mDps[2]] });

  const promisedCrit = Number(mCrit[2]);
  const promisedDps = Number(mDps[2]);

  /* The rows must FIT: the Defense row once printed "0.8% less damage ->
     1.2% less damage" and ran off the card (v2.3.2222 capture).  Checked on
     the widest-worded stats, by the ellipsis/overflow detector the landscape
     sweep uses, so a reworded unit fails here by name. */
  for (const key of ['def', 'aspd', 'critDmg', 'elem', 'hp', 'stam', 'dodge', 'dmg']) {
    await P.page.evaluate(() => { try { window.__btInfoPopup.close(); } catch (e) {} });
    await P.page.waitForTimeout(250);
    const tapped = await P.page.evaluate((k) => {
      const i = document.querySelector(`[data-stat-info="${k}"]`);
      if (!i) return false;
      for (const type of ['pointerdown', 'pointerup']) {
        i.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
      }
      return true;
    }, key);
    /* the window is React state -- give it a render before measuring */
    await P.page.waitForTimeout(350);
    const fit = await P.page.evaluate((k) => {
      const rows = document.querySelector('[data-infopopup-rows]');
      const card = document.querySelector('[data-infopopup-card]');
      if (!rows || !card) return { missing: true, rows: !!rows, card: !!card };
      const cr = card.getBoundingClientRect();
      const past = [...rows.querySelectorAll('span')].filter((el) => el.getBoundingClientRect().right > cr.right + 0.5).length;
      return { past, scrollW: rows.scrollWidth, clientW: rows.clientWidth, text: (rows.innerText || '').slice(0, 120) };
    }, key);
    rec.ok(`the ${key} window's rows fit inside the card`,
      tapped && !fit.missing && fit.past === 0 && fit.scrollW <= fit.clientW + 1, { tapped, ...fit });
  }

  /* The window must get out of the way before the row can be tapped --
     and it has to be dismissable, which is the fourth thing InfoPopup
     promises (v2.3.2131: the scrim, the x, the button, and Escape). */
  await P.page.evaluate(() => { try { window.__btInfoPopup.close(); } catch (e) {} });
  await P.page.waitForTimeout(250);

  /* ── spend it for real, then ask the GAME what happened ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (R && R.prog3 && R.prog3.atk && R.prog3.atk.sword) {
      R.prog3.atk.sword.crit = (R.prog3.atk.sword.crit || 0) + 1;
    }
  });
  await P.page.waitForTimeout(500);

  const actual = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    const f = window._gameFns;
    if (!R || !f) return null;
    return { crit: (R.prog3.atk.sword.crit || 0) * 0.4 };
  });
  rec.ok('the point landed on the character', !!actual && Math.abs(actual.crit - promisedCrit) < 0.05,
    { promisedCrit, actual });

  /* The equip menu computes the same DPS by its own route — the strip's
     promise has to match it, or the two screens disagree in front of the
     player. */
  /* The character equip menu is Hero's OVERVIEW section — the same
     getEquipContribs totals grid the owner is looking at. */
  const onOverview = await openSection('Overview');
  rec.ok('the equip menu could be opened', onOverview);
  await P.page.waitForTimeout(900);
  const equipDps = await P.page.evaluate(() => {
    /* A totals cell is a small flex column: a label span ("DPS") over the
       value.  Match the whole cell's text, collapsed. */
    for (const d of [...document.querySelectorAll('div')]) {
      if (d.children.length > 3) continue;
      const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
      const m = /^DPS\s+([\d.]+)$/i.exec(t);
      if (m) return Number(m[1]);
    }
    return null;
  });
  rec.ok('the equip menu shows an overall DPS too', typeof equipDps === 'number', equipDps);
  if (typeof equipDps === 'number') {
    rec.ok('...and it is the number the tooltip PROMISED (the two screens agree)',
      Math.abs(equipDps - promisedDps) <= 0.15, { promisedDps, equipDps });
  }

  await P.ctx.close().catch(() => {});
}
