/* THE CHAT BAR AND THE BUBBLE (v2.3.2896)
 *
 * Owner, three things in one message:
 *   "Instead of having a send button at all, just remove it.  Players can just
 *    use their own phones send button and it works."
 *   "for long messages the messages exceed the chatbar horizontal length and
 *    spill into the background.  Make is so that long text wraps into a
 *    second line."
 *   "make it so that the chat point (closest to the player) is lined up above
 *    the player (not on their face like it is currently)"
 *
 * ── THE SEND BUTTON ──
 * Gone from the composer, so the only way out is the key: Enter, which is
 * what the phone's send key delivers, with enterKeyHint="send" so the key
 * says so.  Asserted both ways -- no Send button in the card, AND Enter still
 * sends and closes it -- because removing the button without the key working
 * would leave a composer you cannot send from.
 *
 * ── THE SPILL ──
 * Pixi's wordWrap breaks only at spaces, so ONE word wider than the wrap (a
 * laugh, a link) stayed on one line, twice the width of its capped bubble.
 * The probe reports the longest laid-out line against the box drawn round it
 * (lineW / boxW, bubble-local px); the text fits when lineW + both side pads
 * is no wider than the box.  Before the fix a sixty-character "haha..." read
 * lineW ~ 600 against boxW 336.
 *
 * ── THE POINT ──
 * The bubble's point hung at a fixed 32 world px over the body's anchor,
 * which since the name plate moved over the head (v2.3.2571) is the
 * forehead.  It now sits a few screen px over the band the plate (or the HP
 * bar) lives on -- S._selfBandTopY for you, other._bandTopY for a peer.
 * Checked on BOTH screens: your own bubble on yours, and your bubble as the
 * other player sees it, which is the half a single-player test cannot see.
 * The before value is kept in the log: on the built client the old point was
 * ~50 screen px below the plate's top.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const UNBROKEN = 'ha'.repeat(30);

/* One bubble's probe, as the renderer last drew it, plus the band it should
   clear -- read in the same evaluate so both are the same frame's. */
const bubbleOn = (P, key, peer) => P.page.evaluate(({ key, peer }) => {
  const S = window._gameState && window._gameState.current;
  const m = window.__btChatBubbles;
  const b = m && m.get(key);
  if (!S || !b) return null;
  const band = peer ? ((S.others || {})[key] || {})._bandTopY : S._selfBandTopY;
  const ws = S._worldScaleY || S._worldScaleX || 1;
  return {
    tipY: b.tipY, band: typeof band === 'number' ? band : null, ws,
    gapPx: typeof band === 'number' ? (band - b.tipY) * ws : null,
    lineW: b.lineW, boxW: b.boxW, breakWords: b.breakWords,
    /* the top of the drawn body, for "above the head" -- local only */
    headY: !peer && typeof S._bodyFootY === 'number' && typeof S._bodyDrawH === 'number'
      ? S._bodyFootY - S._bodyDrawH : null,
  };
}, { key, peer });

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Talky', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Hears', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  await A.page.waitForTimeout(1200);

  /* ── 1. NO SEND BUTTON, AND THE KEY SAYS SEND ── */
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await A.page.waitForTimeout(300);
  const card = await A.page.evaluate(() => {
    const t = document.querySelector('[data-chat-input]');
    const c = t && t.closest('.bt-chat-noselect');
    return {
      found: !!c,
      buttons: c ? [...c.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim()) : [],
      enterKeyHint: t ? (t.getAttribute('enterkeyhint') || t.enterKeyHint || null) : null,
    };
  });
  console.log('    composer: ' + JSON.stringify(card));
  rec.ok('the composer is open (guard)', card.found, card);
  rec.ok('...with no Send button in it',
    card.found && !card.buttons.some((l) => /^send$/i.test(l)), card.buttons);
  rec.ok('...and the phone’s key labelled "send" instead', card.enterKeyHint === 'send', card);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-composer.png` });

  /* ── 2. THE KEY SENDS ── */
  await A.page.locator('[data-chat-input]').first().fill(UNBROKEN);
  await A.page.locator('[data-chat-input]').first().press('Enter');
  await A.page.waitForTimeout(700);
  const closed = await A.page.evaluate(() => !document.querySelector('[data-chat-input]'));
  rec.ok('Enter (the phone’s send key) sends and closes the composer', closed);
  const sent = await H.readState(A, (S) => (S.chatLog || []).some((c) => c.id === S.myId && /^(ha)+$/.test(c.text || '')));
  rec.ok('...and the line is in the chat', sent);

  /* ── 3. THE LONG WORD STAYS IN ITS BUBBLE, ON BOTH SCREENS ── */
  let own = null;
  for (let i = 0; i < 20 && !own; i++) {
    own = await bubbleOn(A, aId, false);
    if (!own) await A.page.waitForTimeout(250);
  }
  console.log('    own bubble: ' + JSON.stringify(own));
  rec.ok('your bubble is drawn (guard)', !!own, own);
  rec.ok('a word longer than the line breaks onto the next one',
    !!own && own.breakWords === true && own.lineW + 16 <= own.boxW + 0.5, own);

  /* ── 4. THE POINT IS OVER THE NAME, NOT ON THE FACE ── */
  rec.ok('the band line over your head is published (guard)', !!own && own.band != null, own);
  rec.ok('your bubble’s point sits above your name plate, not below its top',
    !!own && own.gapPx != null && own.gapPx >= 1 && own.gapPx <= 12, own);
  if (own && own.headY != null) {
    rec.ok('...which puts it above the top of your head', own.tipY < own.headY, own);
  } else {
    rec.skip('...which puts it above the top of your head', 'no drawn-body height published this frame');
  }
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-own.png` });

  /* The other player's view of the same line. */
  let peer = null;
  for (let i = 0; i < 20 && !peer; i++) {
    peer = await bubbleOn(B, aId, true);
    if (!peer) await B.page.waitForTimeout(250);
  }
  console.log('    as the peer sees it: ' + JSON.stringify(peer));
  rec.ok('the other player sees the bubble (guard)', !!peer, peer);
  rec.ok('...its long word wrapped inside the bubble there too',
    !!peer && peer.lineW + 16 <= peer.boxW + 0.5, peer);
  rec.ok('...and its point above the speaker’s name plate on their screen as well',
    !!peer && peer.gapPx != null && peer.gapPx >= 1 && peer.gapPx <= 12, peer);
  await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-peer.png` });

  /* ── 5. AND THE TOWNSFOLK ──
     An NPC's position is his FEET, so the old 32 px anchor put his bubble's
     point at his knees.  A line is handed to Mayor Bro directly (his chat
     timer pushed out so his own chatter cannot replace it mid-check). */
  const npcId = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((x) => x && x.id === 'mayor_bro') || (S.npcs || [])[0];
    if (!n) return null;
    n.chatBubble = { text: 'Welcome to Bro Town!', ts: Date.now() };
    n.chatTimer = 60000;
    return n.id;
  });
  rec.ok('a townsperson is there to speak (guard)', !!npcId, { npcId });
  await A.page.waitForTimeout(500);
  const nb = npcId ? await A.page.evaluate((id) => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((x) => x && x.id === id);
    const b = window.__btChatBubbles && window.__btChatBubbles.get('npc:' + id);
    const ws = S._worldScaleY || S._worldScaleX || 1;
    return n && b ? { tipY: b.tipY, head: n._headTopY, feet: n.y, gapPx: (n._headTopY - b.tipY) * ws } : null;
  }, npcId) : null;
  console.log('    npc bubble: ' + JSON.stringify(nb));
  rec.ok('the NPC’s bubble points down at the top of his head, not at his knees',
    !!nb && typeof nb.head === 'number' && nb.gapPx >= 1 && nb.gapPx <= 12 && nb.tipY < nb.feet - 60, nb);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
