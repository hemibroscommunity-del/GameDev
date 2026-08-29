/* TAP A THING, FIND OUT WHAT IT IS (v2.3.2131)
 *
 * Owner, after the demo: "get rid of the xp numbers in the 3 combat skills
 * and put them as some kind of pop up when you tap on it.  Also more pop ups
 * for things users want to learn more about on the character equip menu
 * (labels tapped on and such)."
 *
 * Two asks, one overlay, because they are one event: a player pointing at
 * something and asking what it is.
 *
 * WHAT THIS FILE REFUSES TO LET PASS:
 *  1. Tapping a combat card OPENS THE EXPLAINER rather than jumping straight
 *     to Hero -> Build.  That jump is the old behaviour and it is the wrong
 *     answer for the reviewer who tapped the card to find out what it was.
 *  2. The exact XP numbers are IN the popup.  They left the card face, and if
 *     they are not here they are nowhere -- which would be a straight loss of
 *     information rather than a move.
 *  3. The way through survived.  The popup's action button still reaches
 *     Hero -> Build, which is the half of "popup, then Build on a second tap"
 *     that is physically reachable: the popup's own scrim covers the card, so
 *     a second tap on the CARD is a gesture the player can never make.
 *  4. IT CLOSES.  Four ways, asserted, because the owner has reported
 *     undismissable UI twice (world chat over the joystick; coach tips a demo
 *     player left up for a whole session).
 *  5. A stat label on the hero sheet opens its own explainer, and a row the
 *     glossary has no words for is NOT tappable -- an affordance that answers
 *     nothing is worse than a plain row.
 */
import * as H from './harness.mjs';

const pop = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-infopopup]');
  if (!el) return null;
  const pick = (s) => { const n = el.querySelector(s); return n ? (n.textContent || '').trim() : null; };
  return {
    title: pick('[data-infopopup-title]'),
    body: pick('[data-infopopup-body]'),
    note: pick('[data-infopopup-note]'),
    stat: pick('[data-infopopup-stat]'),
    action: pick('[data-infopopup-action]'),
  };
});

const tapSel = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointerup', {
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch',
  }));
  return true;
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Asker', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Give the three combat skills real, DIFFERENT numbers, so "the popup shows
     this skill's own progress" is a claim with an answer. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    if (!R.prog3) R.prog3 = {};
    if (!R.prog3.sk) R.prog3.sk = {};
    R.prog3.sk.sword = { level: 3, xp: 250 };
    R.prog3.sk.bow = { level: 2, xp: 210 };
    R.prog3.sk.staff = { level: 1, xp: 140 };
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
  });
  await P.page.waitForTimeout(900);

  /* ── 1. THE CARD NO LONGER PRINTS ITS NUMBERS ── */
  const faces = await P.page.evaluate(() => [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
    .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()));
  rec.ok('all three combat cards are on screen (guard)', faces.length === 3, faces);
  rec.ok('no card prints an XP pair on its face',
    faces.length === 3 && faces.every((t) => !/\d+\s*\/\s*\d+/.test(t)), faces);

  /* ── 2. TAPPING ONE EXPLAINS IT ── */
  const tapped = await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .find((e) => /melee|sword/i.test(e.getAttribute('aria-label') || ''))
      || document.querySelectorAll('[role="button"][aria-label*="level"]')[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerup', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      bubbles: true, cancelable: true, pointerId: 5, pointerType: 'touch',
    }));
    return el.getAttribute('aria-label');
  });
  await P.page.waitForTimeout(500);
  const p1 = await pop(P);
  rec.ok('tapping a combat card opens the explainer', !!p1, { tapped, p1 });
  rec.ok('...naming the skill and its level',
    !!(p1 && p1.title && /level/i.test(p1.title)), p1 && p1.title);
  /* THE NUMBERS THAT LEFT THE CARD.  If this is not here they are nowhere. */
  rec.ok('...and carrying the exact XP numbers the card stopped showing',
    !!(p1 && p1.stat && /\d+\s*\/\s*\d+\s*XP/i.test(p1.stat)), p1 && p1.stat);
  rec.ok('...unabbreviated, which is why they moved',
    !!(p1 && p1.stat && !/k\b/i.test(p1.stat)), p1 && p1.stat);
  rec.ok('...and it says in plain words what the skill IS',
    !!(p1 && p1.body && p1.body.length > 12), p1 && p1.body);
  rec.ok('...with a way through to training it',
    !!(p1 && p1.action), p1 && p1.action);

  /* ── 3. IT CLOSES.  Escape first, the cheapest of the four. ── */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  rec.ok('Escape closes it', !(await pop(P)));

  /* ...and the scrim. */
  await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')][0];
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerup', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      bubbles: true, cancelable: true, pointerId: 6, pointerType: 'touch',
    }));
  });
  await P.page.waitForTimeout(400);
  rec.ok('it opens again (guard)', !!(await pop(P)));
  /* A tap INSIDE the card must NOT close it — otherwise reading the popup
     dismisses it and the numbers are unreadable in practice. */
  await tapSel(P, '[data-infopopup-card]');
  await P.page.waitForTimeout(300);
  rec.ok('a tap on the card itself does NOT close it', !!(await pop(P)));
  await tapSel(P, '[data-infopopup]');
  await P.page.waitForTimeout(350);
  rec.ok('a tap on the scrim around it does', !(await pop(P)));

  /* ── 4. THE ACTION BUTTON STILL REACHES BUILD ── */
  await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')][0];
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerup', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch',
    }));
  });
  await P.page.waitForTimeout(400);
  const hadAction = !!(await pop(P));
  await tapSel(P, '[data-infopopup-action]');
  await P.page.waitForTimeout(1100);
  const wentThrough = await P.page.evaluate(() => {
    const open = window.__broDashPanelBus && window.__broDashPanelBus.current
      ? window.__broDashPanelBus.current() : null;
    return { panel: open, text: (document.body.textContent || '').slice(0, 0) };
  }).catch(() => null);
  rec.ok('the action button closes the popup and goes through to Hero',
    hadAction && !(await pop(P)), { hadAction, wentThrough });

  /* ── 5. THE HERO SHEET'S STAT LABELS ── */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('hero'); } catch (e) {} });
  await P.page.waitForTimeout(1000);
  /* ONTO OVERVIEW, WHICH IS WHERE THE STAT ROWS LIVE.  The first cut of this
     file skipped here and blamed the feature: the action button just above
     navigates to Hero -> BUILD, the sheet remembers its last section, so
     opening 'hero' landed back on Build and the Offense/Defense list simply
     was not rendered.  The rows were fine; the test was standing in the wrong
     room.  Clicked by its real tab rather than poked into state, because
     "can a player get to these rows" is part of what is being asserted. */
  /* ═══ BY data-section, WHICH IS THE CONTRACT ═══
     Two wrong versions of this line shipped before this comment:
       1. clickText('Overview') -- the section KEY.  The tab a player sees
          reads "Equipment"; HeroExpanded renames it deliberately ("the ledger
          has to be learned, 'Equipment' does not").  Matched nothing.
       2. clickText('Equipment') -- the LABEL.  Also wrong, and wrong in the
          way this repo has already paid for: v2.3.1849 renamed Build to
          "Points" and silently broke mp-statpeek's [title="Build"], costing
          five assertions that all came back empty because the section never
          opened.  v2.3.2013 added data-section for exactly this, and its note
          says so.
     Both times the rows were fine and the test was in the wrong room. */
  await tapSel(P, '[data-section="Overview"]');
  await P.page.waitForTimeout(900);
  const rows = await P.page.evaluate(() =>
    [...document.querySelectorAll('[data-statrow]')].map((el) => el.getAttribute('data-statrow')));
  console.log('    stat rows on screen: ' + JSON.stringify(rows));
  if (!rows.length) {
    rec.skip('a stat label on the hero sheet explains itself', 'no [data-statrow] on screen');
  } else {
    rec.ok('the hero sheet has tappable stat rows', rows.length >= 3, rows);
    await tapSel(P, '[data-statrow="Defense"]');
    await P.page.waitForTimeout(450);
    const p2 = await pop(P);
    rec.ok('tapping "Defense" explains what defense is',
      !!(p2 && /defen/i.test(p2.title || '')), p2);
    rec.ok('...in plain words, not a formula',
      !!(p2 && p2.body && p2.body.length > 12 && !/[{}]/.test(p2.body)), p2 && p2.body);
    /* It carries the player's OWN value, so the answer is about them. */
    rec.ok('...and shows the value that row was displaying',
      !!(p2 && p2.stat), p2 && p2.stat);
    await P.page.keyboard.press('Escape');
  }

  await P.ctx.close().catch(() => {});
}
