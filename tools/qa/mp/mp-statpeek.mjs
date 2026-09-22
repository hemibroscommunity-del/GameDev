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
    /* v2.3.2592: crit + critDmg are ONE stat, LUCK (1% + 0.3%/pt chance,
       +1%/pt damage). */
    R.prog3.atk = { sword: { luck: 20, aspd: 5 } };
    R.prog3.pool = Object.assign({}, R.prog3.pool, { unspent: 5 });
    return { luck: R.prog3.atk.sword.luck };
  });
  rec.ok('a weapon and allocated luck could be seeded', !!seeded, seeded);
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
  /* v2.3.2593: the Points screen's columns start CLOSED (owner), and every
     assertion below reaches for a cell's ℹ️ — so they are opened first. */
  const openCols = () => H.openPointCols(P);
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
  await openCols();   /* v2.3.2593: the four columns start shut */

  /* By CLASS, not by prose — the same contract lesson the quest turn-in
     button taught: a caption is owner-facing copy and gets reworded. */
  const stripText = () => P.page.evaluate(() => {
    const el = document.querySelector('.bt-stat-peek');
    return el ? (el.innerText || '') : '';
  });

  /* ═══ v2.3.2645: THE STRIP IS GONE BY INSTRUCTION ═══
     Owner: "remove the top row explainer about DPS."  So "at rest the strip
     carries the overall DPS" is now asserting a row the owner asked to have
     taken out, and the honest form of it is the ABSENCE -- the kind of thing
     that creeps back one line at a time unless a test objects.
     Nothing is lost from this scenario's real subject: the DPS numbers it
     exists to check are the ones inside the ℹ️ window, asserted below and
     untouched. */
  const resting = await stripText();
  rec.ok('the DPS explainer strip is gone from the top of the Points screen (owner)',
    resting === '', resting.slice(0, 200));

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
  /* ═══ v2.3.2642: SAY WHICH LANE, DO NOT ASSUME IT ═══
     The old screen made this explicit for free: the scenario tapped the SWORD
     card, so the Luck row it then pressed could only be sword's. The owner's
     grid shows ONE lane's six stats at a time and defaults to the weapon in
     hand, which this fixture sets client-side -- so the default can legitimately
     be a different lane, and it was: the pill under test read "Luck for STAFF,
     0 of 10", i.e. a lane with no weapon and no points. That is what produced
     "1.0% -> 1.3%" and "DPS — (equip a weapon)", and it was the test asking the
     wrong cell rather than the cell answering wrongly.
     So the lane is now SELECTED, by tapping the weapons head until it reads
     sword -- the grid's own control, the way a player would. */
  /* ═══ v2.3.2645: THE LANE IS PICKED IN THE WINDOW NOW ═══
     The head cell stopped being a control in the same change that moved the
     lane choice into the confirm window's tab row, so cycling it selects
     nothing.  The requirement above is unchanged and is the reason this block
     exists -- this scenario must press SWORD's Luck, not whichever lane the
     grid happens to open on -- so it is met the new way: open the cell, then
     tab the window onto sword before reading its numbers.  Done after the
     press, just below, because the tabs only exist once the window is up. */

  const pressed = await P.page.evaluate(() => {
    /* v2.3.2642: the Luck CELL of the owner's grid.  There is no card to
       scope by any more -- all thirteen stats are on one screen, and the
       lane's six belong to whichever weapon the head cell is showing.  The
       seed above puts the luck points on SWORD, and sword is the lane a fresh
       character holds (prog3ActiveCat), so the Luck cell on screen is the one
       this wants without switching anything.
       Kept as an aria-label match rather than a `[data-prog3-row="sword:luck"]`
       lookup on purpose: what this scenario is about is that the handle a
       PLAYER can find opens a window, and the label is what names it. */
    const pills = [...document.querySelectorAll('[data-prog3-grid] [role="button"][aria-label*=" of "]')]
      .filter((d) => /^luck/i.test(d.getAttribute('aria-label') || ''));
    const el = pills[0];
    /* v2.3.2597: and it moved again, onto the [+], because the owner then made
       the cell body inert — "Make the cell body not launch any window anymore
       ... (points or not)" — leaving the [+] the only control in the row.  The
       handle follows the control, so `el` may be the [+] itself or a row
       containing it.  The guard below is unchanged and still the pointed one:
       pressing it must open a window, not spend a point. */
    const info = el && el.hasAttribute('data-stat-info')
      ? el
      : (el && el.querySelector ? el.querySelector('[data-stat-info]') : null);
    if (!info) return false;
    for (const type of ['pointerdown', 'pointerup']) {
      info.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
    }
    return true;
  });
  rec.ok('the Luck row\'s [+] is the explainer handle and it could be pressed', pressed);
  await P.page.waitForTimeout(400);
  /* ...and NOW aim it at sword, per the block above. */
  const aimed = await P.page.evaluate(async () => {
    const tap = (el) => { for (const t of ['pointerdown', 'pointerup'])
      el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch' })); };
    const act = () => {
      const t = [...document.querySelectorAll('[data-infopopup-lanes] [data-infopopup-lane]')]
        .find((e) => e.getAttribute('aria-pressed') === 'true');
      return t ? t.getAttribute('data-infopopup-lane') : null;
    };
    for (let i = 0; i < 3; i++) {
      if (act() === 'sword') return true;
      const tab = document.querySelector('[data-infopopup-lane="sword"]');
      if (!tab) return false;
      tap(tab);
      await new Promise((r) => setTimeout(r, 260));
    }
    return act() === 'sword';
  });
  rec.ok('...and the window\'s tabs could aim it at the SWORD lane (v2.3.2645 — the head no longer selects)', aimed);
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
  rec.ok('...carrying the luck scene', popup.demo === 'luck', popup);
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
  /* v2.3.2592: every row of the new grid, both columns' kinds — the Luck
     window has TWO stat rows (chance and damage) and Range / Special / Move
     Speed print a note instead of a DPS delta, all of which must fit. */
  /* v2.3.2597: a stat is only on screen while ITS category's card is open, so
     the sweep drills into the right one before reaching for each handle.  Under
     the four-column screen all thirteen were mounted at once and a bare
     querySelector found any of them; here the seven shared stats simply are not
     in the DOM while a weapon card is open, which read as "tapped: false,
     missing: true" on every one of them. */
  const SHARED_STATS = ['hp', 'def', 'mana', 'stam', 'dodge', 'move', 'eres'];
  for (const key of ['def', 'aspd', 'luck', 'elem', 'hp', 'stam', 'dodge', 'dmg', 'range', 'special', 'move', 'mana', 'eres']) {
    await P.page.evaluate(() => { try { window.__btInfoPopup.close(); } catch (e) {} });
    await P.page.waitForTimeout(250);
    await H.openPointCols(P, [SHARED_STATS.includes(key) ? 'shared' : 'sword']);
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
      R.prog3.atk.sword.luck = (R.prog3.atk.sword.luck || 0) + 1;
    }
  });
  await P.page.waitForTimeout(500);

  const actual = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    const f = window._gameFns;
    if (!R || !f) return null;
    /* 1% base + 0.3%/pt (PROG3.ATK.luck), as a display percentage. */
    return { crit: 1 + (R.prog3.atk.sword.luck || 0) * 0.3 };
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
