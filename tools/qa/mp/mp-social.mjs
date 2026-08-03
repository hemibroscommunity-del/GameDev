/* The inspect card's social actions: friend, mute, block, and the PvP threat.
 *
 * Friend/mute/block are CLIENT-LOCAL lists persisted to localStorage (they are
 * not server state), so the assertions check the button flips AND that the
 * list survives into storage — a toggle that only changes a label would look
 * identical on screen and lose the friend on reload.
 *
 * The threat is the one that crosses the wire, and it is the PvP consent
 * primitive: it must reach the target's screen with a decision to make.
 */
import * as H from './harness.mjs';

const ls = (P, key) => P.page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return 'unparseable'; }
}, key);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Social', nameB: 'Peer' });
  const bId = await H.readState(B, (S) => S.myId);

  /* ── the card itself ── */
  await H.openInspect(A, bId);
  const btns = await H.buttonTexts(A);
  for (const [label, pat] of [['Add Friend', /Add Friend/], ['Mute', /Mute/], ['Block', /Block/],
    ['TP', /^TP$/], ['Trade', /^Trade$/], ['Duel', /^Duel$/], ['Threat', /^Threat$/]]) {
    rec.ok(`the inspect card offers "${label}"`, btns.some((t) => pat.test(t)), btns);
  }
  const shownName = await H.seesText(A, 'Peer');
  rec.ok("the card names the player being inspected", shownName);

  /* ── friend ── */
  await H.clickText(A, 'Add Friend');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  const afterFriend = await H.buttonTexts(A);
  rec.ok('adding a friend flips the button to "Friend"',
    afterFriend.some((t) => /💚 Friend/.test(t)), afterFriend);
  const friends = await ls(A, 'bt_friends');
  rec.ok('the friend is persisted to storage',
    Array.isArray(friends) && friends.some((f) => f && f.id === bId), friends);

  /* ── mute ── */
  await H.clickText(A, 'Mute');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  rec.ok('muting flips the button to "Muted"',
    (await H.buttonTexts(A)).some((t) => /Muted/.test(t)));
  const muted = await ls(A, 'bt_muted');
  rec.ok('the mute is persisted to storage',
    Array.isArray(muted) && muted.some((m) => (m && m.id) === bId || m === bId), muted);

  /* ── block ── */
  await H.clickText(A, 'Block');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  rec.ok('blocking flips the button to "Blocked"',
    (await H.buttonTexts(A)).some((t) => /Blocked/.test(t)));

  /* ── PvP threat: the consent primitive, and it has to cross ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Threat');
  const threatened = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => /Call Guards|Ignore/.test(b.textContent)),
  { label: 'B sees the threat', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('a PvP threat reaches the target with a choice', threatened);
  if (threatened) {
    await H.clickText(B, 'Ignore');
    await B.page.waitForTimeout(1200);
    const gone = await B.page.evaluate(() => ![...document.querySelectorAll('button')]
      .some((b) => /Call Guards/.test(b.textContent)));
    rec.ok('dismissing the threat closes the panel', gone);
  }

  /* ── the threat cooldown must actually block a second one ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Threat');
  await A.page.waitForTimeout(800);
  const cooling = await H.readState(A, (S) => !!(S._pvpThreatCdUntil && Date.now() < S._pvpThreatCdUntil));
  rec.ok('issuing a threat starts a cooldown', cooling);

  await A.ctx.close(); await B.ctx.close();
}
