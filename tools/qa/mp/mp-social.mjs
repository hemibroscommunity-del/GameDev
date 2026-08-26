/* The inspect card's social actions: friend, mute, block.
 *
 * Friend/mute/block are CLIENT-LOCAL lists persisted to localStorage (they are
 * not server state), so the assertions check the button flips AND that the
 * list survives into storage — a toggle that only changes a label would look
 * identical on screen and lose the friend on reload.
 *
 * ═══ v2.3.1970: THE THREAT HALF OF THIS FILE WAS TESTING A DELETED FEATURE ═══
 * This scenario used to assert a "Threat" button, click it, and check the
 * consent panel and the cooldown.  v2.3.1917 removed the button (owner: "Also
 * remove the option to kill other players for now") and turned the worker's
 * answer off with it — GameRoom.OPEN_PVP is false and threat.js returns null
 * before doing anything, so pvp_threat now goes nowhere.  The scenario had
 * been failing on that click ever since, and because H.clickText THROWS on a
 * missing button it took the whole run down with it: the two assertions after
 * the threat block never ran at all.
 * Asserted ABSENT rather than simply deleted, exactly as the v2.3.1744 TP
 * removal on the line below is — a silently-restored way to start a
 * non-consensual fight is the kind of thing that comes back in a refactor,
 * and this file is where it would be noticed.
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
    ['Trade', /^Trade$/], ['Duel', /^Duel$/]]) {
    rec.ok(`the inspect card offers "${label}"`, btns.some((t) => pat.test(t)), btns);
  }
  /* v2.3.1970: and Threat is GONE (v2.3.1917) — see the header. */
  rec.ok('the inspect card no longer offers "Threat"', !btns.some((t) => /^Threat$/.test(t)), btns);
  /* v2.3.1744: TP is removed (owner: "remove it").  Asserted absent rather
     than just dropped from the list above — a silently-restored free
     teleport is exactly the kind of thing that comes back in a refactor. */
  rec.ok('the inspect card no longer offers "TP"', !btns.some((t) => /^TP$/.test(t)), btns);
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

  /* ── v2.3.1970: blocking has to SUPPRESS, not just re-label ──
     The block list was only ever checked for its label here, while mute got
     the real test (mp-chat.mjs).  Block is the stronger of the two — it drops
     the line entirely rather than logging it as '[muted]' — and it is the one
     a demo crowd reaches for, so it gets the same treatment: say something,
     and prove it does not arrive. */
  await A.page.keyboard.press('Escape').catch(() => {});
  const before = await H.readState(A, (S) => (S.chatLog || []).length);
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'chat',
      payload: { id: S.myId, name: S.myName, text: 'blocked line', color: '#fff' } });
  });
  await A.page.waitForTimeout(2500);
  const after = await H.readState(A, (S) => (S.chatLog || []).map((c) => c.text));
  rec.ok('a blocked player\'s line never reaches the log at all',
    after.length === before && !after.some((t) => /blocked line/.test(t)), after.slice(-3));

  await A.ctx.close(); await B.ctx.close();
}
