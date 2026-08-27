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
  /* v2.3.1981: against a chatMute-capable worker the muted line is not
     delivered AT ALL (server/src/chatmod.js filters the fan-out), so the
     `[muted]` placeholder this used to assert never gets made — there is
     nothing to make it from.  Both shapes are checked, keyed on the cap,
     because the two halves deploy independently (handoff rule 19) and
     this harness runs against whatever worker is on the port. */
  const serverMute = await H.readState(B, (S) => !!(S._serverCaps && S._serverCaps.chatMute));
  await H.openInspect(B, aId);
  await H.clickText(B, 'Mute');
  await B.page.waitForTimeout(800);
  await say(A, 'this line should be muted');
  await B.page.waitForTimeout(1500);
  const bLog = await log(B);
  const muteLine = bLog.find((c) => c.id === aId && c.muted);
  const textLeaked = bLog.some((c) => /this line should be muted/.test(c.text));
  rec.ok('a muted player\'s message is suppressed',
    serverMute ? (!textLeaked && !muteLine) : (!!muteLine && muteLine.text === '[muted]' && !textLeaked),
    { serverMute, tail: bLog.slice(-3) });
  if (serverMute) {
    /* DURABLE, not just local: the worker echoed its own stored list back
       (chat_mute_list), which is what will still be there on another
       device.  A local-only mute would leave this empty. */
    const stored = await H.readState(B, (S) => (S._serverMutes || []).slice());
    rec.ok('the mute is a server fact (echoed back in chat_mute_list)',
      Array.isArray(stored) && stored.includes(aId), stored);
  }

  /* ── unmute restores ── */
  await H.openInspect(B, aId);
  await H.clickText(B, 'Muted');
  await B.page.waitForTimeout(800);
  await say(A, 'audible again');
  const back = await H.waitFor(B, (S) => (S.chatLog || []).map((c) => c.text),
    (l) => l.some((t) => /audible again/.test(t)), { timeout: 12000, label: 'unmuted' })
    .then(() => true).catch(() => false);
  rec.ok('unmuting restores the messages', back, (await log(B)).slice(-3));

  /* ── report ── */
  /* v2.3.1981: the whole point of the button is that the WORKER hears it.
     This repo's recurring failure (TRAPS #18) is a client->server type that
     looks fine from the browser and never arrives, and the only way to tell
     the difference is to ask for the worker's ACK — chat_report_ack, which
     is what puts the popup below on screen. */
  if (serverMute) {
    await H.openInspect(B, aId);
    await H.clickText(B, 'Report to moderators');
    await B.page.waitForTimeout(400);
    await H.clickText(B, 'Spam');
    const acked = await H.waitFor(B, (S) => S._lastReportAck || null,
      (a) => !!(a && a.ok), { timeout: 12000, label: 'report ack' })
      .then(() => true).catch(() => false);
    rec.ok('a report reaches the worker and is acknowledged', acked,
      await H.readState(B, (S) => S._lastReportAck || null));
    /* And the operator can actually READ it, quoting the server's own copy
       of the line — a report nobody can retrieve is a write-only field, the
       exact shape the v2.3.1148 operator toolkit exists to stop. */
    const seen = await fetch(`http://127.0.0.1:${wsPort}/api/admin/reports?limit=10`,
      { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` }, signal: AbortSignal.timeout(8000) })
      .then((r) => r.json()).catch((e) => ({ error: String(e) }));
    const mine = (seen.reports || []).find((r) => r.by === bId && r.target === aId);
    rec.ok('the operator can read the report, with the server\'s copy of the chat',
      !!mine && mine.reason === 'spam' && (mine.lines || []).some((l) => /this line should be muted|audible again/.test(l.text)),
      mine || seen);
  }

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
