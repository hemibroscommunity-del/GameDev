/* ═══ CHAT GOES UNDER THE MENUS (v2.3.2276) ═══
 *
 * Owner: "Chat should always be the bottom layer if any menus open up beside
 * it (want it beneath trade menus, player menus, etc)."
 *
 * ── WHY THIS NEEDS A MEASUREMENT AND NOT A CODE READ ──
 * The z-index numbers in the source are NOT comparable across the tree.
 * `.brotown-wrap` is position:fixed with z-index auto, which makes it a
 * STACKING CONTEXT sitting on the z=0 rung of its parent -- so nothing inside
 * it can outrank a positive-z SIBLING, whatever the numbers say.  Every chat
 * surface is a sibling of the wrap (GameApp mounts ChatBubble and
 * WorldChatFeed outside it; ChatPanel renders after it closes), while the
 * panels chat must go under -- InspectPlayerPanel, the trade window, every
 * `.bt-inspect` -- render INSIDE.  On paper the trade drawer's z 40 beats the
 * feed's 25; in the browser it cannot.
 *
 * So this asks the browser, with elementFromPoint over a real open panel,
 * rather than trusting either set of numbers.  That is also the only way to
 * tell "painted underneath" from "still eating the taps", which is the half
 * the owner actually feels.
 *
 * ── AND THE GUARD THAT WAS NEVER RUNNING ──
 * ChatBubble stands the composer down when a decision surface opens
 * (modalGuardBus).  Its listener called `chatBubbleBus.close()` -- a method
 * that does not exist on that bus -- inside a swallowing try/catch, so the
 * state never changed and the composer's full-play-area tap catcher stayed
 * mounted over whatever had just opened.  The `if (guardActive()) return null`
 * belt did not save it: this component re-renders only on the bus's own
 * subscribe, and a throw is nothing to subscribe to.  What that belt covers is
 * the OTHER order -- panel first, then chat -- which is the order mp-tradetap
 * drives, which is why it read green while the owner's order was broken.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const seedChat = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S) return;
  S.chatLog = S.chatLog || [];
  for (let i = 0; i < 8; i++) {
    S.chatLog.push({ name: 'Crowd' + i, text: 'a world chat line that makes the feed real ' + i, ts: Date.now() + i });
  }
  try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) {}
});

/* Who wins at the centre of the chat feed while a panel is up?  Reported as
   the whole ancestor chain, because "a DIV" is not an answer -- the question
   is which SUBTREE, and the wrap boundary is the thing being measured. */
const whoIsOnTop = (P) => P.page.evaluate(() => {
  const feed = document.querySelector('[data-world-chat]');
  if (!feed) return { err: 'no feed' };
  const b = feed.getBoundingClientRect();
  const x = b.left + b.width / 2, y = b.top + b.height / 2;
  const el = document.elementFromPoint(x, y);
  const chain = [];
  for (let n = el; n && n !== document.body && chain.length < 8; n = n.parentElement) {
    chain.push((n.tagName || '?').toLowerCase()
      + (n.className && typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
      + (n.getAttribute && n.getAttribute('data-world-chat') !== null ? '[data-world-chat]' : ''));
  }
  return {
    at: { x: Math.round(x), y: Math.round(y) },
    inChat: !!(el && el.closest('[data-world-chat]')),
    inWrap: !!(el && el.closest('.brotown-wrap')),
    inPanel: !!(el && (el.closest('.bt-inspect') || el.closest('[data-trade-drawer]'))),
    chain,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Layer', wsPort, webPort, viewport: PHONE, touch: true });
  const B = await H.newPlayer(browser, { name: 'Other', wsPort, webPort, guest: true, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await A.page.waitForTimeout(2500);
  const bId = await H.readState(B, (S) => S.myId);

  await seedChat(A);
  await A.page.waitForTimeout(900);
  /* Open the feed, or its shut state is a 36x36 bell and the overlap the
     question is about does not exist. */
  await A.page.evaluate(() => {
    const b = document.querySelector('[data-world-chat-toggle]');
    if (b && b.getAttribute('aria-expanded') === 'false') b.click();
  });
  await A.page.waitForTimeout(600);
  const feedUp = await A.page.evaluate(() => {
    const f = document.querySelector('[data-world-chat]');
    return !!f && f.getBoundingClientRect().height > 30;
  });
  rec.ok('the world chat feed is open and has real height (guard)', feedUp === true, { feedUp });

  /* ── 1. THE COMPOSER STANDS DOWN WHEN A MENU OPENS ON TOP OF IT ──
     The owner's order, and the one the broken close() left unguarded.  Done
     FIRST, while nothing else is up, so the guard genuinely transitions
     inactive -> active here rather than being already held by an earlier
     phase of this scenario. */
  await A.page.evaluate(() => { try { window.__broChatBubbleBus.setOpen(true); } catch (e) {} });
  await A.page.waitForTimeout(600);
  const composerUp = await A.page.evaluate(() => ({
    busOpen: !!(window.__broChatBubbleBus && window.__broChatBubbleBus.open),
    dom: !!document.querySelector('[data-chat-input]'),
    catcher: !!document.querySelector('[data-chat-dismiss]'),
    guard: window.__btModalGuard ? window.__btModalGuard() : null,
  }));
  console.log('    composer up: ' + JSON.stringify(composerUp));
  rec.ok('the chat composer is open, with its full-play-area catcher (guard)',
    composerUp.busOpen === true && composerUp.dom === true && composerUp.catcher === true, composerUp);

  const opened = await H.openInspect(A, bId).then(() => true).catch(() => false);
  rec.ok('the player menu (InspectPlayerPanel) opened on top of it (guard)', opened === true);
  if (!opened) { await A.ctx.close(); await B.ctx.close(); return; }
  await A.page.waitForTimeout(800);
  const afterPanel = await A.page.evaluate(() => ({
    busOpen: !!(window.__broChatBubbleBus && window.__broChatBubbleBus.open),
    dom: !!document.querySelector('[data-chat-input]'),
    catcher: (() => {
      const d = document.querySelector('[data-chat-dismiss]');
      return d ? { present: true, pe: getComputedStyle(d).pointerEvents } : { present: false };
    })(),
    panel: !!document.querySelector('.bt-inspect-card'),
    guard: window.__btModalGuard ? window.__btModalGuard() : null,
  }));
  console.log('    after the menu opened: ' + JSON.stringify(afterPanel));
  rec.ok('the player menu pushes the guard at all (it never used to)',
    !!(afterPanel.guard && afterPanel.guard.depth >= 1), afterPanel);
  rec.ok('opening a menu closes the chat composer, state and all',
    afterPanel.panel === true && afterPanel.busOpen === false, afterPanel);
  rec.ok('...and its full-play-area tap catcher is gone with it',
    afterPanel.catcher.present === false, afterPanel);

  /* ── 2. AND THE FEED IS PAINTED UNDER THE MENU ──
     Measured rather than reasoned: the z-index numbers in the source are not
     comparable across the .brotown-wrap boundary, so only the browser can say. */
  const top = await whoIsOnTop(A);
  console.log('    at the feed centre with a player menu open: ' + JSON.stringify(top));
  rec.ok('the chat feed does NOT sit on top of an open player menu',
    top.inChat === false, top);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
