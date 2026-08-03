/* Chat, chat bubbles, mute enforcement and emotes.
 *
 * Mute gets a real test here rather than in the social scenario, because
 * flipping the button is not the feature — SUPPRESSING THE MESSAGE is.  The
 * mute list is stored as bare ids and chat.js reads it with .includes(), so a
 * future refactor that stores {id,name} objects (as the friends list does)
 * would silently stop muting anyone while the button still lit up.  This
 * catches exactly that.
 */
import * as H from './harness.mjs';

/* Sending does NOT close the chat bar (only the ✕ does), so toggle it open
   only when it is actually shut — a blind toggle would close it on the second
   message and every later assertion would fail for the wrong reason. */
async function say(P, text) {
  const isOpen = () => P.page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'Send'));
  if (!(await isOpen())) {
    await P.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.chat());
    await P.page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'Send'),
    null, { timeout: 8000 });
  }
  /* the input immediately before this Send button — never another panel's */
  const input = P.page.locator('button:has-text("Send")').locator('xpath=preceding-sibling::input[1]').first();
  await input.fill(text);
  await H.clickText(P, 'Send');
  await P.page.waitForTimeout(1200);
}

const log = (P) => H.readState(P, (S) => (S.chatLog || []).map((c) => ({ id: c.id, text: c.text, muted: !!c.muted })));

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Talker', nameB: 'Listener' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── a message crosses ── */
  await say(A, 'hello from the harness');
  const heard = await H.waitFor(B, (S) => (S.chatLog || []).map((c) => c.text),
    (l) => l.some((t) => /hello from the harness/.test(t)),
    { timeout: 15000, label: 'B hears A' }).then(() => true).catch(() => false);
  rec.ok('a chat message reaches the other player', heard, await log(B));

  /* ── and shows as a bubble over the speaker ── */
  const bubble = await H.readState(B, (S) => (S.chatBubbles && S.chatBubbles[Object.keys(S.chatBubbles)[0]]) || null);
  rec.ok('the message renders as a chat bubble', !!bubble && /hello from the harness/.test(bubble.text || ''), bubble);

  /* ── the sender does not hear their own message twice ── */
  const aOwn = (await log(A)).filter((c) => c.id === bId);
  rec.ok('the sender does not echo their own line back from the server', aOwn.length === 0, aOwn);

  /* ── mute must SUPPRESS, not just relabel ── */
  await H.openInspect(B, aId);
  await H.clickText(B, 'Mute');
  await B.page.waitForTimeout(800);
  await say(A, 'this line should be muted');
  await B.page.waitForTimeout(1500);
  const bLog = await log(B);
  const muteLine = bLog.find((c) => c.id === aId && c.muted);
  rec.ok('a muted player\'s message is suppressed',
    !!muteLine && muteLine.text === '[muted]' && !bLog.some((c) => /this line should be muted/.test(c.text)),
    bLog.slice(-3));

  /* ── unmute restores ── */
  await H.openInspect(B, aId);
  await H.clickText(B, 'Muted');
  await B.page.waitForTimeout(800);
  await say(A, 'audible again');
  const back = await H.waitFor(B, (S) => (S.chatLog || []).map((c) => c.text),
    (l) => l.some((t) => /audible again/.test(t)), { timeout: 12000, label: 'unmuted' })
    .then(() => true).catch(() => false);
  rec.ok('unmuting restores the messages', back, (await log(B)).slice(-3));

  /* ── emotes ── */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    /* the emote wheel writes through the same bus the panel uses */
    if (S.channel) S.channel.send({ type: 'broadcast', event: 'emote', payload: { id: S.myId, emoji: '👋' } });
  });
  const emoted = await H.waitFor(B, (S) => {
    const o = S.others || {};
    const k = Object.keys(o)[0];
    return k && o[k].emote ? o[k].emote.emoji : null;
  }, (v) => v === '👋', { timeout: 12000, label: 'emote crosses' }).then(() => true).catch(() => false);
  rec.ok('an emote reaches the other player', emoted);

  await A.ctx.close(); await B.ctx.close();
}
