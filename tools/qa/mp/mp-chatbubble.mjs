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
 *
 * ── v2.3.3858: OVER THE HEAD, ON THE NAME'S PLACE, WHITE ──
 * The owner: "for character messages I'd rather have chat bubbles right above
 * character head and just cover nameplate during chat.  Make chat bubble
 * background white and the chat font black".  The point now comes down to
 * the band's bottom (S._selfChatTipY / other._chatTipY, over the head), the
 * plate steps aside while the bubble is up and comes back after it, and every
 * bubble -- a player's as a townsperson's -- is the white one, black words.
 * And this scenario plays the world (`world: 'wheel'`), off the old map's list.
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
  /* v2.3.3858: the point's place over the head (the band's bottom), and the
     band's top it now sits below, covering the plate */
  const o = peer ? ((S.others || {})[key] || {}) : null;
  const band = peer ? o._chatTipY : S._selfChatTipY;
  const bandTop = peer ? o._bandTopY : S._selfBandTopY;
  const ws = S._worldScaleY || S._worldScaleX || 1;
  return {
    tipY: b.tipY, band: typeof band === 'number' ? band : null, bandTop: typeof bandTop === 'number' ? bandTop : null, ws,
    gapPx: typeof band === 'number' ? (band - b.tipY) * ws : null,
    skin: b.skin, ink: b.ink,
    plateUp: !peer && typeof window.__btPlateBox === 'function' ? !!window.__btPlateBox() : null,
    lineW: b.lineW, boxW: b.boxW, breakWords: b.breakWords,
    /* the top of the drawn body, for "above the head" -- local only */
    headY: !peer && typeof S._bodyFootY === 'number' && typeof S._bodyDrawH === 'number'
      ? S._bodyFootY - S._bodyDrawH : null,
  };
}, { key, peer });

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Talky', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  A.page.on('pageerror', (e) => console.log('    PAGEERROR A ' + String(e && e.message).slice(0, 200)));
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Hears', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  B.page.on('pageerror', (e) => console.log('    PAGEERROR B ' + String(e && e.message).slice(0, 200)));
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

  /* ── 4. THE POINT IS OVER THE HEAD, ON THE NAME'S PLACE (v2.3.3858) ── */
  await A.page.evaluate(() => { window.__btProbe = true; });
  await A.page.waitForTimeout(300);
  own = (await bubbleOn(A, aId, false)) || own;
  rec.ok('the band line over your head is published (guard)', !!own && own.band != null, own);
  rec.ok('your bubble’s point sits just over your head, at the band’s bottom (the plate’s place)',
    !!own && own.gapPx != null && own.gapPx >= 1 && own.gapPx <= 12 && own.bandTop != null && own.tipY > own.bandTop, own);
  rec.ok('...your name plate steps aside while the bubble is up', !!own && own.plateUp === false, own);
  rec.ok('...and the bubble is white with black words', !!own && own.skin === 'plain' && /^(#?0{6}|0|0x0+|black)$/i.test(String(own.ink)), own);
  if (own && own.headY != null) {
    rec.ok('...which puts it above the top of your head', own.tipY < own.headY, own);
  } else {
    rec.skip('...which puts it above the top of your head', 'no drawn-body height published this frame');
  }
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-own.png` });

  /* The other player's view of the same line -- said again, as the checks
     and the picture above can outlast the bubble's 5 s on this slow box */
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  /* (not the same line again: a repeat is not sent twice) */
  await A.page.locator('[data-chat-input]').first().fill('he' + UNBROKEN);
  await A.page.locator('[data-chat-input]').first().press('Enter');
  let peer = null;
  for (let i = 0; i < 40 && !peer; i++) {
    peer = await bubbleOn(B, aId, true);
    if (!peer) await B.page.waitForTimeout(250);
  }
  console.log('    as the peer sees it: ' + JSON.stringify(peer));
  if (!peer) console.log('    DEBUG peer: ' + JSON.stringify(await B.page.evaluate((id) => { const S = window._gameState.current; return { bub: S.chatBubbles && S.chatBubbles[id] ? { t: S.chatBubbles[id].text.slice(0, 10), age: Date.now() - S.chatBubbles[id].ts } : null, other: !!(S.others && S.others[id]), zone: S.others && S.others[id] ? (S.others[id].zone || S.others[id].z) : null, cur: S.currentZone, keys: window.__btChatBubbles ? [...window.__btChatBubbles.keys()] : null }; }, aId)));
  rec.ok('the other player sees the bubble (guard)', !!peer, peer);
  rec.ok('...its long word wrapped inside the bubble there too',
    !!peer && peer.lineW + 16 <= peer.boxW + 0.5, peer);
  rec.ok('...and its point just over the speaker’s head, on the plate’s place, on their screen as well',
    !!peer && peer.gapPx != null && peer.gapPx >= 1 && peer.gapPx <= 12 && peer.bandTop != null && peer.tipY > peer.bandTop, peer);
  rec.ok('...white with black words there too', !!peer && peer.skin === 'plain', peer);
  await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-peer.png` });

  /* v2.3.3858: the bubble gone (5 s), the plate is back */
  let back = null;
  for (let i = 0; i < 30; i++) {
    await A.page.waitForTimeout(250);
    back = await A.page.evaluate(() => ({ bubble: !!(window.__btChatBubbles && window.__btChatBubbles.size && [...window.__btChatBubbles.keys()].some((k) => !String(k).startsWith('npc:'))),
      plate: typeof window.__btPlateBox === 'function' ? !!window.__btPlateBox() : null }));
    if (!back.bubble && back.plate) break;
  }
  rec.ok(`the bubble gone, your name plate is back (${JSON.stringify(back)})`, !!back && back.plate === true, back);

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

  /* ── 6. v2.3.3858: PICTURES -- upright, sideways, a computer playing wide ──
     A line kept fresh on the speaker's own screen while the picture is taken
     (a screenshot on this box outlasts the bubble's 5 s).  Each shot is the
     band round the speaker: tools/qa/mp/out/chatbubble-<view>.png */
  const talk = async (P, line) => {
    /* said through the game's own composer, then kept fresh */
    await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(true)).catch(() => {});
    const open = await P.page.waitForSelector('[data-chat-input]', { timeout: 8000 }).then(() => true).catch(() => false);
    if (open) { await P.page.locator('[data-chat-input]').first().fill(line); await P.page.locator('[data-chat-input]').first().press('Enter'); }
    await P.page.waitForTimeout(600);
    return keep(P, line);
  };
  const keep = (P, line) => P.page.evaluate((t) => {
    const S = window._gameState.current;
    if (!S.chatBubbles) S.chatBubbles = Object.create(null);
    S.chatBubbles[S.myId] = { text: t, ts: Date.now() };
    clearInterval(window.__cbKeep);
    const until = Date.now() + 15000;
    window.__cbKeep = setInterval(() => {
      if (Date.now() > until) { clearInterval(window.__cbKeep); return; }
      if (!S.chatBubbles) S.chatBubbles = Object.create(null);
      S.chatBubbles[S.myId] = { text: t, ts: Date.now() };
    }, 400);
  }, line);
  const shotAround = async (P, name) => {
    const at = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
      return { x: cv.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1), vw: innerWidth, vh: innerHeight };
    });
    const w = Math.min(360, at.vw), h = Math.min(260, at.vh);
    const x = Math.max(0, Math.min(at.vw - w, at.x - w / 2)), y = Math.max(0, Math.min(at.vh - h, at.y - h + 60));
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/chatbubble-${name}.png`, clip: { x, y, width: w, height: h } }).catch(() => {});
  };
  /* the listener steps aside, so only the speaker's plate is in the picture */
  const pa = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, pa.x + 160, pa.y + 40, { tries: 30 }).catch(() => {});
  await A.page.waitForTimeout(1200);
  await talk(A, 'Anyone up for the Goo Grotto?');
  await shotAround(A, 'upright');
  await A.page.setViewportSize({ width: 844, height: 390 });
  await A.page.waitForTimeout(1500);
  await talk(A, 'Anyone up for the Goo Grotto?');
  await shotAround(A, 'sideways');
  const D = await H.newPlayer(browser, { name: 'Desky', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel', wide: true });
  await H.enterWorld(D);
  await H.waitFor(D, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' }).catch(() => null);
  await D.page.waitForTimeout(2000);
  await talk(D, 'Anyone up for the Goo Grotto?');
  await D.page.waitForTimeout(800);
  const dSkin0 = await D.page.evaluate(() => { const S = window._gameState.current; const b = window.__btChatBubbles && window.__btChatBubbles.get(S.myId); return b ? b.skin : null; });
  await shotAround(D, 'computer');
  const dSkin = dSkin0;
  rec.ok(`a computer's bubble is the white one too (${dSkin})`, dSkin === 'plain', dSkin);
  await D.ctx.close().catch(() => {});

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
