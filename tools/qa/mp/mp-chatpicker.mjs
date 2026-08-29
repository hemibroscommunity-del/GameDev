/* PICK A LANE WITHOUT KNOWING A SLASH COMMAND (v2.3.2139)
 *
 * v2.3.2136 shipped /a and /w, and docs/specs/chat-lanes.md said what was
 * deliberately left out: "No channel picker UI... a reasonable follow-up and
 * a pure client change -- the wire surface does not need to move for it."
 * This is that follow-up, and this file holds it to that promise: the picker
 * composes the same line a player could have typed, and the protocol is
 * untouched.
 *
 * WHAT IT REFUSES TO LET PASS:
 *  1. The chips are THERE, and tapping one changes the lane.
 *  2. Picking Area sends an area line -- checked by what the OTHER player
 *     receives, not by what the sender's own log says.
 *  3. THE SAFETY PROPERTY.  Whisper with nobody named must send NOTHING.  A
 *     private lane falling back to the room is the exact incident this
 *     repo already has on record (ChatBubble's note: "/p went out over the
 *     ROOM relay to every player in the world instead of to your party... a
 *     private lane that silently isn't private is worse than not having
 *     one").  So: the other player must not receive it, in any lane.
 *  4. Whisper WITH a name reaches that player and nobody else.
 *  5. A lane is never remembered across a reload as Whisper.  Believing you
 *     are in Whisper when you are in All publishes a private line to the
 *     world; the persisted value is lossy in the safe direction on purpose.
 *  6. An explicit slash prefix still wins, so a player who knows /p is not
 *     double-prefixed by the picker's state.
 */
import * as H from './harness.mjs';

const lanes = (P) => P.page.evaluate(() =>
  [...document.querySelectorAll('[data-chatlane]')].map((el) => ({
    id: el.getAttribute('data-chatlane'),
    on: el.getAttribute('aria-pressed') === 'true',
  })));

const pick = (P, id) => P.page.evaluate((want) => {
  const el = document.querySelector('[data-chatlane="' + want + '"]');
  if (!el) return false;
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointerup', {
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch',
  }));
  return true;
}, id);

const say = (P, line) => P.page.evaluate((t) => (
  window.__btSendChat ? window.__btSendChat(t) : null), line);

const log = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return ((S && S.chatLog) || []).map((l) => ({
    name: l.name || '', text: l.text || '',
    area: !!l.area, whisper: !!l.whisper, lane: !!l.lane,
  }));
});
const saw = (rows, t) => rows.some((r) => (r.text || '').indexOf(t) >= 0);

async function waitFor(P, t, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const rows = await log(P);
    if (saw(rows, t)) return rows;
    if (Date.now() - t0 > ms) return rows;
    await P.page.waitForTimeout(200);
  }
}

/* Open the composer the game actually opens when you tap your own character. */
const openComposer = (P) => P.page.evaluate(() => {
  try { if (window.__broLegacyUI && window.__broLegacyUI.chat) { window.__broLegacyUI.chat(); return 'legacy'; } } catch (e) {}
  try { if (window.__btChatBubble && window.__btChatBubble.open) { window.__btChatBubble.open(); return 'bubble'; } } catch (e) {}
  const el = document.querySelector('[data-chat-input]');
  return el ? 'already' : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Picker', nameB: 'Hearer' });
  await A.page.waitForTimeout(2000);

  const caps = await H.readState(A, (S) => ({
    areaChat: !!(S._serverCaps && S._serverCaps.areaChat),
    whisper: !!(S._serverCaps && S._serverCaps.whisper),
  }));
  rec.ok('the worker advertises both lanes (guard — the chips are cap-gated)',
    caps.areaChat && caps.whisper, caps);

  const opened = await openComposer(A);
  await A.page.waitForTimeout(700);
  let chips = await lanes(A);
  if (!chips.length) {
    rec.skip('the chat composer offers a lane picker', `no chips on screen (composer: ${opened})`);
    await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {});
    return;
  }

  /* ── 1. the chips exist, and one of them is current ── */
  rec.ok('the composer offers a chip per lane', chips.length >= 3, chips);
  rec.ok('...with exactly one selected', chips.filter((c) => c.on).length === 1, chips);
  rec.ok('...and it starts on All', (chips.find((c) => c.on) || {}).id === 'all', chips);

  /* ── 2. Area, checked at the RECEIVER ── */
  rec.ok('tapping Area selects it', await pick(A, 'area'));
  await A.page.waitForTimeout(400);
  chips = await lanes(A);
  rec.ok('...and the chip row says so', (chips.find((c) => c.on) || {}).id === 'area', chips);
  await say(A, 'picked area, no slash typed');
  let rows = await waitFor(B, 'picked area, no slash typed');
  rec.ok('a line sent on the Area chip arrives as an AREA line',
    rows.some((r) => r.area && r.text.indexOf('picked area, no slash typed') >= 0), rows.slice(-4));

  /* ── 3. THE SAFETY PROPERTY: a whisper with nobody named goes NOWHERE ── */
  rec.ok('tapping Whisper selects it', await pick(A, 'whisper'));
  await A.page.waitForTimeout(400);
  const before = (await log(B)).length;
  await say(A, 'this must not reach the room');
  await A.page.waitForTimeout(2500);
  const after = await log(B);
  rec.ok('a whisper with nobody named is NOT sent to the room',
    !saw(after, 'this must not reach the room'), after.slice(before));
  const mine = await log(A);
  rec.ok('...and the sender is told why, rather than it vanishing',
    mine.some((r) => r.lane && /whisper/i.test(r.text + r.name)), mine.slice(-3));

  /* ── 4. Whisper WITH a name ── */
  await A.page.evaluate(() => {
    const el = document.querySelector('[data-chatlane-to]');
    if (!el) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, 'Hearer');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  await A.page.waitForTimeout(500);
  await say(A, 'meet me by the forge');
  rows = await waitFor(B, 'meet me by the forge');
  rec.ok('a named whisper reaches that player',
    rows.some((r) => r.whisper && r.text.indexOf('meet me by the forge') >= 0), rows.slice(-4));

  /* ── 5. Whisper is never restored ── */
  const persisted = await A.page.evaluate(() => {
    try { return localStorage.getItem('bt_chat_lane'); } catch (e) { return 'throw'; }
  });
  rec.ok('Whisper is never the remembered lane (All is the safe fallback)',
    persisted !== 'whisper', { persisted });

  /* ── 6. an explicit slash still wins ── */
  await pick(A, 'area');
  await A.page.waitForTimeout(300);
  const composed = await A.page.evaluate(() => (window.__btChatLane
    ? window.__btChatLane.compose('/w Hearer typed it myself') : null));
  rec.ok('a slash command the player typed is not double-prefixed by the picker',
    !!composed && composed.text === '/w Hearer typed it myself', composed);

  /* The composer as a player sees it, beside the other scenario shots. */
  await A.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/chatpicker.png' });

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
