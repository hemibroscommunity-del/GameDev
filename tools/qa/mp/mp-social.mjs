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
  /* v2.3.2926: the card's controls by id (harness.mjs cardActs) -- the
     rearrangement rewrote their copy, and a label is display (TRAPS §29).
     The Threat / TP absences below stay on the labels: a restored button
     would bring its old label back with it. */
  const acts = await H.cardActs(A);
  for (const [label, act] of [['Add Friend', 'friend'], ['Mute', 'mute'], ['Block', 'block'],
    ['Trade', 'trade'], ['Duel', 'duel']]) {
    rec.ok(`the inspect card offers "${label}"`, acts.some((a) => a.act === act && !a.on), acts);
  }
  /* v2.3.1970: and Threat is GONE (v2.3.1917) — see the header. */
  rec.ok('the inspect card no longer offers "Threat"', !btns.some((t) => /^Threat$/.test(t)), btns);
  /* v2.3.1744: TP is removed (owner: "remove it").  Asserted absent rather
     than just dropped from the list above — a silently-restored free
     teleport is exactly the kind of thing that comes back in a refactor. */
  rec.ok('the inspect card no longer offers "TP"', !btns.some((t) => /^TP$/.test(t)), btns);
  const shownName = await H.seesText(A, 'Peer');
  rec.ok("the card names the player being inspected", shownName);

  /* ── v2.3.2926: the portrait is the door to the stats & equipment menu ──
     Owner: "Tapping the character profile picture will bring up a new menu
     that shows stats and equipment.  Don't build it out completely but leave
     a placeholder."  So: the tap opens it, it names the player, and Back
     returns to the card with every action still there. */
  await H.clickAct(A, 'profile');
  await A.page.waitForTimeout(400);
  const prof = await A.page.evaluate(() => {
    const el = document.querySelector('[data-profile]');
    return el ? { text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 160) } : null;
  });
  rec.ok('tapping the portrait opens the stats & equipment menu',
    !!prof && /Stats & Equipment/.test(prof.text) && /Peer/.test(prof.text), prof);
  await H.clickAct(A, 'profile-back');
  await A.page.waitForTimeout(400);
  rec.ok('...and Back returns to the card',
    (await H.cardActs(A)).some((a) => a.act === 'trade') && !(await A.page.$('[data-profile]')));

  /* ── friend ── */
  await H.clickAct(A, 'friend');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  const afterFriend = await H.cardActs(A);
  rec.ok('adding a friend flips the button to "Friend"',
    afterFriend.some((a) => a.act === 'friend' && a.on && /^Friend/.test(a.text)), afterFriend);
  /* v2.3.2926: and the card says so where the eye lands first -- the
     mockup's "🙂 Friend" badge beside the level */
  rec.ok('...and the header shows the Friend badge',
    !!(await A.page.$('.bt-inspect-card [data-rel="friend"]')));
  const friends = await ls(A, 'bt_friends');
  rec.ok('the friend is persisted to storage',
    Array.isArray(friends) && friends.some((f) => f && f.id === bId), friends);

  /* ── mute ── */
  await H.clickAct(A, 'mute');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  rec.ok('muting flips the button to "Muted"',
    (await H.cardActs(A)).some((a) => a.act === 'mute' && a.on && /Muted/.test(a.text)));
  const muted = await ls(A, 'bt_muted');
  rec.ok('the mute is persisted to storage',
    Array.isArray(muted) && muted.some((m) => (m && m.id) === bId || m === bId), muted);

  /* ── block ── */
  await H.clickAct(A, 'block');
  await A.page.waitForTimeout(600);
  await H.openInspect(A, bId);
  rec.ok('blocking flips the button to "Blocked"',
    (await H.cardActs(A)).some((a) => a.act === 'block' && a.on && /Blocked/.test(a.text)));

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
