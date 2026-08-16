/* Two-sided trade (trade2) through the real UI, end to end.
 *
 * This is the flow with actual money on it, so the assertions are about
 * SETTLEMENT, not about panels appearing: gold and items have to end up in the
 * other player's bag, and the anti-switch confirm reset has to actually fire
 * when an offer changes after a confirm.  Both sides are seeded through the
 * shipped operator grant endpoint, so the before/after numbers are exact.
 *
 * Offers are read out of the OTHER player's rendered lane rather than from
 * client state, because that lane is the whole safety story: what B is about
 * to agree to is whatever B can see.  A test that read A's own staging mirror
 * would pass even if the snapshot never crossed the wire.
 */
import * as H from './harness.mjs';

/* Text of the "<name> offers" well, i.e. what THIS player sees the OTHER one
 * putting up.  Anchors on the lane header and reads the well right after it,
 * so it can never accidentally match a number elsewhere on the page. */
/* The header carries a second "confirmed ✓" span ONLY once they confirm, so
 * match on the first child's text and never on the child count. */
const LANE_FN = `() => {
  const hdr = [...document.querySelectorAll('div')].find((d) => d.children.length >= 1
    && d.children[0].tagName === 'SPAN' && /\\boffers$/.test((d.children[0].textContent || '').trim()));
  if (!hdr) return null;
  const well = hdr.nextElementSibling;
  return { header: hdr.textContent.trim(), body: well ? well.innerText.replace(/\\s+/g, ' ').trim() : null };
}`;

function otherLane(P) {
  return P.page.evaluate(`(${LANE_FN})()`);
}

const coins = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
const wood = (P) => H.readState(P, (S) => ((S.rpg || {}).inventory || {}).wood || 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Trader', nameB: 'Buyer' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── seed both sides ── */
  await H.grant(wsPort, aId, 'gold', { amount: 500 });
  await H.grant(wsPort, aId, 'item', { invKey: 'wood', count: 6 });
  await H.grant(wsPort, bId, 'gold', { amount: 300 });
  await A.page.waitForTimeout(1500);
  const aCoins0 = await coins(A), bCoins0 = await coins(B), aWood0 = await wood(A);
  rec.ok('operator grant reaches live players', aCoins0 >= 500 && bCoins0 >= 300 && aWood0 === 6,
    { aCoins0, bCoins0, aWood0 });

  /* ── A opens the trade from the inspect card ── */
  await H.openInspect(A, bId);
  rec.ok('inspect card offers Trade', (await H.buttonTexts(A)).includes('Trade'));
  await H.clickText(A, 'Trade');

  /* ── B gets the invite and opens it ── */
  const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('B receives the trade invite', gotInvite);
  if (!gotInvite) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Open trade');

  /* ── both sides land in the live window ── */
  const live = (P) => H.waitUi(P, () => [...document.querySelectorAll('button')]
    .some((b) => /Confirm trade|Add an item or gold/.test(b.textContent)),
  { label: 'live trade window', timeout: 20000 });
  await live(A); await live(B);
  rec.ok('both sides reach the live trade window', true);

  /* Empty on both sides => Confirm is really disabled, not merely styled so. */
  const emptyConfirm = await A.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Add an item or gold/.test(x.textContent));
    return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
  });
  rec.ok('an empty trade cannot be confirmed', !!emptyConfirm && emptyConfirm.disabled === true, emptyConfirm);

  /* ── A stages 100 gold through the real input ── */
  const goldInput = A.page.locator('input[type="number"]').first();
  await goldInput.fill('100');
  await A.page.waitForTimeout(1200);

  /* ── A taps a bag tile to stage an item (the in-modal Bag tray) ── */
  const staged = await A.page.evaluate(() => {
    /* Bag tiles are the tray buttons whose label is glyph + bare count. */
    const tile = [...document.querySelectorAll('button')]
      .find((b) => b.offsetParent && /^\S{1,3}\s*\d+(\/\d+)?$/.test(b.innerText.replace(/\n/g, ' ').trim()));
    if (!tile) return null;
    const before = tile.innerText.replace(/\n/g, ' ').trim();
    tile.click();
    return before;
  });
  await A.page.waitForTimeout(1200);
  rec.ok('bag tray exposes a stageable item', !!staged, { staged });

  /* ── v2.3.1752: MORE THAN ONE ──
     Owner: "allow additional quantities of stuff to be traded (it only
     allowed me to put up one of the fire goblin remains)."  Staging used to be
     one control doing three jobs — a bag tap added floor(have/4) and wrapped
     to zero past the top — so a small stack stepped by 1 and there was no way
     to go down or to name a number.  A's grant is 6 wood, so this drives the
     new + stepper up to 3 and back down to 2 through the real buttons and
     reads the staged quantity off A's own lane. */
  /* The trade window is a pure renderer of server truth held in REACT state,
     not on window._gameState — so the staged number is read where the player
     reads it: off the stepper itself, which renders "qty/have". */
  const stagedQty = async () => A.page.evaluate(() => {
    const inc = [...document.querySelectorAll('button')]
      .find((x) => x.offsetParent && (x.getAttribute('aria-label') || '').startsWith('One more'));
    if (!inc) return null;
    const box = inc.previousElementSibling;
    const t = box ? (box.textContent || '').trim() : '';
    const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
    return m ? { qty: Number(m[1]), have: Number(m[2]) } : { raw: t };
  });
  const tapStep = (label) => A.page.evaluate((aria) => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => x.offsetParent && (x.getAttribute('aria-label') || '').startsWith(aria));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, label);
  await tapStep('One more');
  await A.page.waitForTimeout(700);
  await tapStep('One more');
  await A.page.waitForTimeout(900);
  const upTo3 = await stagedQty();
  rec.ok('the + stepper stages more than one of the same item',
    !!upTo3 && upTo3.qty >= 3, upTo3);
  await tapStep('One fewer');
  await A.page.waitForTimeout(900);
  const downTo2 = await stagedQty();
  rec.ok('...and the − stepper takes one back off',
    !!downTo2 && !!upTo3 && downTo2.qty === upTo3.qty - 1, { upTo3, downTo2 });
  /* Back to a single unit so the settlement assertions below are unchanged. */
  for (let i = 0; i < 4; i++) {
    const q = await stagedQty();
    if (!q || q.qty <= 1) break;
    await tapStep('One fewer');
    await A.page.waitForTimeout(500);
  }
  const backTo1 = await stagedQty();
  rec.ok('the stepper can walk a stack all the way back down to one',
    !!backTo1 && backTo1.qty === 1, backTo1);

  /* ── the staged offer must be visible ON B's SCREEN ── */
  /* An expression, not a function literal: page.evaluate given a STRING
     evaluates it as an expression, so `() => {...}` would just produce a
     function object and never run the check. */
  const crossed = await H.waitUi(B,
    `(() => { const l = (${LANE_FN})(); return !!(l && /100/.test(l.body || '')); })()`,
    { label: "B sees A's staged gold", timeout: 15000 }).then(() => true).catch(() => false);
  const lane = await otherLane(B);
  rec.ok("B's screen shows what A staged", crossed && /Gold/.test(lane?.body || ''), lane);

  /* ── A confirms ── */
  await H.clickText(A, 'Confirm trade');
  const locked = await H.waitUi(A, () => [...document.querySelectorAll('button')]
    .some((b) => /Confirmed/.test(b.textContent)), { label: 'A confirm locks', timeout: 12000 })
    .then(() => true).catch(() => false);
  rec.ok('confirming locks the button to "Confirmed ✓"', locked);

  /* ── ANTI-SWITCH: change the offer after confirming; both confirms reset ── */
  await goldInput.fill('120');
  await A.page.waitForTimeout(2000);
  const stillConfirmed = await A.page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => /Confirmed/.test(b.textContent)));
  rec.ok('changing an offer resets the confirm (anti-switch)', !stillConfirmed, { stillConfirmed });

  /* ── both confirm for real ── */
  await H.clickText(A, 'Confirm trade');
  await A.page.waitForTimeout(800);
  await H.clickText(B, 'Confirm trade');

  /* ── settlement ── */
  const done = await H.waitUi(A, () => /Trade complete/.test(document.body.innerText),
    { label: 'A sees Trade complete', timeout: 25000 }).then(() => true).catch(() => false);
  rec.ok('the trade completes', done);

  await A.page.waitForTimeout(3000);
  const aCoins1 = await coins(A), bCoins1 = await coins(B);
  const aWood1 = await wood(A), bWood1 = await wood(B);
  rec.ok('gold actually moved A -> B', aCoins1 === aCoins0 - 120 && bCoins1 === bCoins0 + 120,
    { aCoins0, aCoins1, bCoins0, bCoins1 });
  rec.ok('the item actually moved A -> B', aWood1 === aWood0 - 1 && bWood1 === 1,
    { aWood0, aWood1, bWood1 });

  await A.ctx.close(); await B.ctx.close();
}
