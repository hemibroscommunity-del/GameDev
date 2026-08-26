/* ═══ v2.3.1970: WHAT A ROOM FULL OF STRANGERS DOES ═══
 *
 * mp-party / mp-chat / mp-social all drive the happy path through the real
 * UI, which is what they are for.  This one drives the paths the UI does not
 * offer — because a public demo is exactly where somebody opens the console
 * and finds out what the socket accepts.  Everything here goes down the wire
 * that the client already holds open (S.channel), NOT through a button, so
 * it tests the worker's answer rather than the input's maxLength.
 *
 * The four things it pins, and why each earned a place:
 *
 *  1. A CHAT LINE IS NOT UNBOUNDED.  Room chat had no case in the router
 *     switch, so it fell to the default rebroadcast and relayed byte-for-byte
 *     up to MAX_INBOUND_BYTES (16 KB).  The only thing that RENDERS a chat
 *     line is a PIXI Text in the world layer with a Graphics sized from the
 *     measured text (effectsRenderer._renderChatBubble), and chat is the one
 *     relay v2.3.1575 deliberately did not zone-scope — so one message was a
 *     ~17,000px texture on every screen in the world.  Asserted on the
 *     BUBBLE's own measurements (window.__btChatBubble) and on the page
 *     staying alive, not on the state field alone: a clamp that never
 *     reaches the renderer is not a clamp.
 *
 *  2. THE SENDER IS THE SERVER'S OPINION.  The client reads payload.id /
 *     payload.name off the wire and only falls back to the server-stamped
 *     msg.from when they are absent, so a forged pair used to win outright —
 *     the v2.3.1150 comment in PRIVILEGED_EVENTS says as much in passing
 *     ("any client could impersonate the server there").  Impersonating the
 *     player next to you is the first thing a demo troll tries.
 *
 *  3. AN INVITE NOBODY ANSWERS GOES AWAY.  The worker forgets the invite
 *     after PARTY.INVITE_TTL (60s); the CARD had no clock at all, and since
 *     v2.3.1966 it is portalled above the dashboard on purpose — so a dead
 *     invite parked a 240px panel over the top of the screen until you tapped
 *     it.  Most invites in a demo crowd are never answered, so this is the
 *     common case.
 *
 *  4. THE INVITE GATES REACH THE PLAYER.  Inviting yourself and inviting
 *     somebody already partied are both refused server-side (party.test.mjs
 *     §2/§3 pins that).  What is NOT pinned there is that the refusal becomes
 *     something the player can SEE — a party_error the client turns into a
 *     popup — rather than a tap that does nothing.
 */
import * as H from './harness.mjs';

/* Send a raw event AS this player, overriding whatever fields we like — the
   point of the exercise.  H.sendEvent forces `id: S.myId` first, which is the
   one thing check 2 has to be able to lie about. */
const raw = (P, event, payload) => P.page.evaluate(({ e, p }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.channel) return { __noChannel: true };
  S.channel.send({ type: 'broadcast', event: e, payload: p });
  return { sent: e };
}, { e: event, p: payload });

const bubbleOf = (P) => P.page.evaluate(() => window.__btChatBubble || null);
const alive = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return !!(S && S.myId && S.currentZone);
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Griefer', nameB: 'Victim' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── 1. the oversized line ──
     4 KB, not 16 KB: MAX_INBOUND_BYTES drops the whole frame at 16 KB, so a
     genuinely maximal message would be refused by the size gate and prove
     nothing about the clamp underneath it.  4 KB is 20x the clamp and
     comfortably inside the frame — the same reasoning anticheat.test.mjs's
     avatar fixture spells out. */
  const errsBefore = B.logs.length;
  await raw(A, 'chat', { id: aId, name: 'Griefer', text: 'X'.repeat(4000), color: '#fff' });
  await B.page.waitForTimeout(2500);
  const longLine = await H.readState(B, (S) => {
    const l = (S.chatLog || []).filter((c) => /^X+$/.test(c.text || ''));
    return l.length ? l[l.length - 1].text.length : -1;
  });
  rec.ok('an oversized chat line still arrives (it is not silently swallowed)',
    longLine > 0, longLine);
  rec.ok('...but clamped, not 4000 characters of it', longLine > 0 && longLine <= 200, longLine);
  const bub = await bubbleOf(B);
  /* The renderer is the thing that was actually at risk. A bubble whose wrap
     box is 320 world px and whose text is clamped cannot be more than a few
     dozen lines tall; before the clamp this was hundreds. */
  rec.ok('...and the bubble it drew is a bubble, not a wall',
    !!bub && bub.wrapWidth <= 400, bub);
  rec.ok('the receiving client is still running after it', await alive(B));
  rec.ok('...with no page error on the way through',
    B.logs.length === errsBefore, B.logs.slice(errsBefore, errsBefore + 3));

  /* ── 1b. rapid spam ──
     The relay token bucket (RELAY_BURST 8 / 4 per s) is the worker's answer;
     what this checks is the CLIENT's — that twenty lines in a row leave it
     playable and its log bounded, rather than growing without limit. */
  const errsSpam = B.logs.length;
  for (let i = 0; i < 20; i++) await raw(A, 'chat', { id: aId, name: 'Griefer', text: 'spam ' + i, color: '#fff' });
  await B.page.waitForTimeout(3000);
  const logLen = await H.readState(B, (S) => (S.chatLog || []).length);
  rec.ok('twenty lines in a row leave the log bounded (it keeps the last 40)',
    logLen <= 41, logLen);
  rec.ok('...and the client still playable', await alive(B));
  rec.ok('...with no page error', B.logs.length === errsSpam, B.logs.slice(errsSpam, errsSpam + 3));

  /* ── 1c. unicode and emoji survive the round trip ──
     The clamp is a .slice() on a JS string, so a line that ends inside a
     surrogate pair is the failure mode worth naming; this one is short
     enough that nothing is cut, which is the case a real player hits. */
  await raw(A, 'chat', { id: aId, name: 'Griefer', text: '🎉 héllo 世界 🛡', color: '#fff' });
  await B.page.waitForTimeout(2000);
  const uni = await H.readState(B, (S) => (S.chatLog || []).map((c) => c.text).filter((t) => /世界/.test(t || '')));
  rec.ok('emoji and non-latin text cross intact', uni.length === 1 && /🎉/.test(uni[0]), uni);

  /* ── 2. the forged sender ── */
  await raw(A, 'chat', { id: 'bp_not_a_real_player', name: 'Mayor Bro', text: 'give me your gold', color: '#f00' });
  await B.page.waitForTimeout(2500);
  const forged = await H.readState(B, (S) => {
    const l = (S.chatLog || []).filter((c) => /give me your gold/.test(c.text || ''));
    return l.length ? { id: l[l.length - 1].id, name: l[l.length - 1].name } : null;
  });
  rec.ok('a chat line arrives with the SENDER the server knows, not the one claimed',
    !!forged && forged.id === aId, forged);
  rec.ok('...and under their real name, so nobody can wear yours',
    !!forged && forged.name !== 'Mayor Bro', forged);

  /* ── 3. an invite nobody answers ──
     Waited out rather than simulated: the card's whole problem was that
     nothing on the client was counting, so a test that pokes the clock would
     pass against the bug.  Checked mid-flight first, so a card that never
     appeared cannot masquerade as one that expired. */
  await raw(A, 'party_invite', { target: bId });
  const cardUp = await H.waitUi(B, () => /Party Invite/.test(document.body.innerText),
    { label: 'B sees the invite', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the invite card appears (guard)', cardUp);
  if (cardUp) {
    await B.page.waitForTimeout(5000);
    const stillUp = await B.page.evaluate(() => /Party Invite/.test(document.body.innerText));
    rec.ok('...and is still up five seconds in (so the wait below means something)', stillUp);
    /* 60s TTL + slack for the setTimeout and a React commit. */
    await B.page.waitForTimeout(62000);
    const gone = await B.page.evaluate(() => !/Party Invite/.test(document.body.innerText));
    rec.ok('an invite nobody answers takes itself off the screen', gone);
    rec.ok('...and leaves the player in no party', !(await H.readState(B, (S) => !!S._party)));
  }

  /* ── 4. the invite gates, as the player experiences them ── */
  const partyOf = (P) => H.readState(P, (S) => (S._party && S._party.members ? S._party.members.length : 0));
  await raw(A, 'party_invite', { target: aId });      // invite yourself
  await A.page.waitForTimeout(1500);
  rec.ok('inviting yourself does not make you a party of one', (await partyOf(A)) === 0);
  const selfCard = await A.page.evaluate(() => /Party Invite/.test(document.body.innerText));
  rec.ok('...and does not put an invite card on your own screen', !selfCard);

  /* Now form a real party so the "already partied" refusal has something to
     refuse.  Driven over the wire, not through the card, because the card is
     mp-party's job and this scenario is about the gates. */
  await raw(A, 'party_invite', { target: bId });
  await B.page.waitForTimeout(1200);
  await raw(B, 'party_accept', { target: aId });
  await B.page.waitForTimeout(2500);
  rec.ok('a two-member party formed for the busy check (guard)', (await partyOf(A)) === 2, await partyOf(A));

  /* B is partied; A invites them AGAIN.  The worker answers target-busy, and
     what matters here is that the answer becomes something visible. */
  /* POLLED, not slept through: a damage popup is pruned at a 1200ms TTL
     (BroTown.jsx's dmgNumbers loop), so a single read a second and a half
     later finds an empty array and reads as "no feedback" when the popup
     came and went. */
  await raw(A, 'party_invite', { target: bId });
  const busySeen = await H.waitFor(A,
    (S) => (S.dmgNumbers || []).map((p) => String(p.text || '')),
    (l) => l.some((t) => /already in a party/i.test(t)),
    { timeout: 8000, label: 'the already-partied notice' }).catch((e) => String(e));
  rec.ok('inviting someone already in your party TELLS you so',
    Array.isArray(busySeen) && busySeen.some((t) => /already in a party/i.test(t)), busySeen);

  await A.ctx.close(); await B.ctx.close();
}
