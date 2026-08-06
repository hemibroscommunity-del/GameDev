/* The SERVER friends system (v2.3.1324): request → accept → mutual → DM.
 *
 * Distinct from the local bt_friends follow list the inspect card also writes
 * (mp-social covers that one).  This is the real wire flow: friend_request,
 * friend_request_in, friend_accept, friend_sync, friend_dm — and the DM has
 * to survive as the client-side archive, because the server delivers its
 * offline backlog exactly once and then clears it.
 *
 * Driven entirely through the dashboard's Friends panel, which is what an
 * iPhone player actually taps.
 */
import * as H from './harness.mjs';

const openFriends = async (P) => {
  /* v2.3.1637: the nav rail is icon-only, so the old clickText(P,
     'Friends') matched nothing — openDest taps the rail button by its
     accessible name, which is still a real tap on the real control. */
  await H.openDest(P, 'Friends');
  await P.page.waitForTimeout(900);
};

const thread = (P, fid) => P.page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem('bt_dm:' + k) || '[]'); } catch { return 'unparseable'; }
}, fid);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Mate', nameB: 'Bro' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  rec.ok('the worker advertises the friends capability',
    await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.friends)));

  /* ── A sends the request from the inspect card ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Add Friend');
  await A.page.waitForTimeout(1500);

  /* ── B sees it under Requests ── */
  await openFriends(B);
  const reqTab = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => /^Requests \(1\)$/.test(b.textContent.trim())),
  { label: 'B has 1 request', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the friend request reaches the other player', reqTab, await H.buttonTexts(B));
  if (!reqTab) { await A.ctx.close(); await B.ctx.close(); return; }

  await H.clickText(B, 'Requests (1)');
  await B.page.waitForTimeout(600);
  rec.ok('the request names the sender', await H.seesText(B, 'wants to be Bros'));
  await H.clickText(B, 'Accept');
  await B.page.waitForTimeout(2500);

  /* ── mutual on both sides ──
     The tab chip and the dashboard's own nav button both read "Friends", so
     select the chip by its exact "Friends (n)" text.  A substring match picks
     whichever comes first in the DOM, which is not the one that switches
     tabs.  And these chips fire on POINTERUP, so they need a real Playwright
     click — an element.click() in page script dispatches only a click event
     and does nothing here. */
  const FRIENDS_TAB = /^Friends \(\d+\)$/;
  const openTab = async (P) => {
    await P.page.locator('button', { hasText: FRIENDS_TAB }).first()
      .click({ timeout: 8000 }).catch(() => {});
    await P.page.waitForTimeout(800);
  };
  await openTab(B);
  rec.ok('the accepter now lists the requester as a friend', await H.seesText(B, 'Mate'),
    await H.buttonTexts(B));

  await openFriends(A);
  await openTab(A);
  const aHasB = await H.waitUi(A, () => /\bBro\b/.test(document.body.textContent || ''),
    { label: 'A lists B', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the requester now lists the accepter as a friend', aHasB, await H.buttonTexts(A));

  /* ── DM ──
     Message lives behind the row's "•••" overflow menu, not on the row
     itself (v2.3.1323 replaced the ▾ chevron with it). */
  const opened = await A.page.locator('button[aria-label^="Actions for"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('a friend row has an actions menu', opened, await H.buttonTexts(A));
  await A.page.waitForTimeout(500);
  const messaged = opened
    && await H.clickText(A, 'Message', { timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the actions menu offers "Message"', messaged, await H.buttonTexts(A));
  if (messaged) {
    await A.page.waitForTimeout(600);
    await A.page.locator('input[placeholder="Message…"]').first().fill('dm from the harness');
    await H.clickText(A, 'Send');
    await A.page.waitForTimeout(2000);

    const bThread = await thread(B, aId);
    rec.ok('the DM reaches the other player',
      Array.isArray(bThread) && bThread.some((m) => /dm from the harness/.test(m.text || '')), bThread);

    const aThread = await thread(A, bId);
    rec.ok('the sender keeps their own copy of the DM',
      Array.isArray(aThread) && aThread.some((m) => m.mine && /dm from the harness/.test(m.text || '')), aThread);
  }

  await A.ctx.close(); await B.ctx.close();
}
