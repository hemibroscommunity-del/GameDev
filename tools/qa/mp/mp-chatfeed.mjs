/* THE CHAT WINDOW: WHO IS ONLINE, AND WHAT THEY SAID (v2.3.1980).
 *
 * Owner: "Add players online count and a world chat toggle on chat window."
 *
 * ── WHY THIS NEEDS TWO REAL BROWSERS AND A REAL WORKER ──
 * Both halves are claims about OTHER PEOPLE, and a single tab cannot make
 * either one false. The count is the room's population, which only the
 * worker knows; the feed's whole purpose is to show you lines you did not
 * type. A mocked check would prove the markup renders and nothing about
 * whether the number is right or the message arrives.
 *
 * ── THE THIRD THING BEING DEFENDED ──
 * This window used to build and broadcast its own `chat` payload rather
 * than calling the game's sender, and that copy did not know about "/p".
 * So party chat typed HERE -- the composer the game actually opens when you
 * tap your own character -- went out over the room relay to every player in
 * the world. The last assertions drive that exact input and check the other
 * tab hears nothing, because a private lane that silently isn't private is
 * the kind of bug you only find out about after someone has used it.
 */
import * as H from './harness.mjs';

const openChat = (P) => P.page.evaluate(() => {
  window.__broChatBubbleBus.setOpen(true);
});

/* v2.3.2037: the feed left this window. It used to be an inline list behind
   a "World chat" toggle inside the composer; it is now the always-on World
   Chat section in the lower left (WorldChatFeed.jsx), so the reader points
   there and the toggle fields are gone. Everything this file exists to prove
   -- the online count, cross-player delivery, and above all that "/p" does
   not leak to the room -- is unchanged and still checked below. */
const readHeader = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-chat-online]');
  const list = document.querySelector('[data-world-chat-lines]');
  return {
    online: c ? +c.getAttribute('data-chat-online') : null,
    onlineText: c ? c.textContent.trim() : null,
    listCount: list ? +list.getAttribute('data-world-chat-lines') : null,
    listText: list ? list.textContent : null,
  };
});

/** Type a line into the chat window and press Enter, as a player would. */
const say = async (P, text) => {
  await openChat(P);
  await P.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await P.page.fill('[data-chat-input]', text);
  await P.page.press('[data-chat-input]', 'Enter');
  await P.page.waitForTimeout(900);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Talker', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Listener', wsPort, webPort, guest: true });
  await H.enterWorld(B);
  /* v2.3.2155: the corner rests as a bell -- press it, or the list this
     scenario reads does not exist. */
  await H.openWorldChat(A);
  await H.openWorldChat(B);
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(1500);

  /* ── THE WINDOW OPENS AND CARRIES A HEADER ── */
  await openChat(A);
  await A.page.waitForTimeout(600);
  let h = await readHeader(A);
  rec.ok('the chat window shows a players-online count', h.online !== null, h);
  rec.ok(`...and it counts BOTH players in the room, not just you (${h.online})`,
    h.online === 2, h);
  rec.ok('...and says so in words, not just an attribute',
    !!h.onlineText && /2\s*online/.test(h.onlineText), { text: h.onlineText });
  /* v2.3.2037: no toggle to check any more. mp-worldchat.mjs asserts it is
     gone and that the section replacing it is placed and readable; this file
     keeps to what only two live players can show. */
  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-chatfeed-closed.png' }).catch(() => {});

  /* ── A LINE FROM THE OTHER PLAYER LANDS IN IT ──
     The point of the whole feature: before this, a message you did not
     happen to be looking at when the bubble popped was gone for good. */
  await say(B, 'anyone selling ore');
  await A.page.waitForTimeout(1200);
  h = await readHeader(A);
  rec.ok("another player's message appears in the feed",
    !!h.listText && h.listText.includes('anyone selling ore'), { list: h.listText });
  rec.ok('...attributed to them by name',
    !!h.listText && h.listText.includes('Listener'), { list: h.listText });

  /* ── AND YOUR OWN ── */
  await say(A, 'i have twelve');
  h = await readHeader(A);
  rec.ok('your own message appears in the feed too',
    !!h.listText && h.listText.includes('i have twelve'), { list: h.listText });

  /* ...and actually reached the other player, i.e. routing the composer
     through the game's sender did not break sending. */
  const heard = await B.page.evaluate(() => {
    const S = window._gameState.current;
    return ((S && S.chatLog) || []).map((m) => m.text).join(' | ');
  });
  rec.ok('...and the other player received it', heard.includes('i have twelve'), { heard });

  /* ── THE PARTY-CHAT LEAK ──
     "/p ..." with no party is a local hint and NOTHING on the wire. Before
     v2.3.1980 this composer relayed the raw line to the whole room. */
  const bBefore = await B.page.evaluate(() =>
    ((window._gameState.current.chatLog) || []).length);
  await say(A, '/p meet me behind the forge');
  await A.page.waitForTimeout(1200);
  h = await readHeader(A);
  rec.ok('"/p" is recognised as party chat, not shouted at the room',
    !!h.listText && !h.listText.includes('/p meet me behind the forge'), { list: h.listText });
  rec.ok('...and it tells you why nothing was sent',
    !!h.listText && /part(y|ies)/i.test(h.listText), { list: h.listText });
  const bAfter = await B.page.evaluate(() => ({
    n: ((window._gameState.current.chatLog) || []).length,
    text: ((window._gameState.current.chatLog) || []).map((m) => m.text).join(' | '),
  }));
  rec.ok('...and the other player never saw a word of it',
    !bAfter.text.includes('meet me behind the forge'), { before: bBefore, after: bAfter.n, text: bAfter.text });

  /* A look at it, for the times a number passes and the layout is still
     wrong (same reason mp-lockon keeps one). Git-ignored. */
  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-chatfeed.png' }).catch(() => {});

  /* ── THE COUNT FOLLOWS THE ROOM, WHILE THE WINDOW IS OPEN ──
     Polled rather than read once: the worker announces the leave when it
     notices the socket is gone, and the client has a 10s ghost sweep behind
     that, so the honest claim is "it drops", not "it drops within 2.5s".
     Reading it once was how the first run of this scenario found that the
     count never updated at all while the window stayed open.

     v2.3.2037: the composer is REOPENED first. Sending now always closes it
     (the feed it used to stay open for has moved to the lower-left World Chat
     section), so by this point the window carrying the count is gone and the
     old wording -- "without reopening the window" -- described a state that
     no longer happens. Reopening restores what this block is actually about:
     the count updating live while you are looking at it, rather than being
     frozen at whatever it was when the window opened. */
  await openChat(A);
  await A.page.waitForTimeout(500);
  await B.ctx.close();
  let dropped = null;
  for (let i = 0; i < 30; i++) {
    await A.page.waitForTimeout(700);
    dropped = await readHeader(A);
    if (dropped.online === 1) break;
  }
  rec.ok('the count drops while you are looking at it, not frozen at the '
       + 'value it had when the window opened',
    dropped && dropped.online === 1, dropped);

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors in the chat window', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
