/* EMOTES YOU CAN SEE (v2.3.3391, docs/specs/emotes.md)
 *
 * The fun & social plan's check of the code (docs/FUN-SOCIAL-PLAN.md) found
 * the 30 emoji and 12 quick lines unreachable -- their only button was in the
 * toolbar hidden since v14 -- and invisible: a sent emote beeped and nothing
 * drew it.  Two phones:
 *
 *   1. the chat box (opened by tapping your bro) has a smiley; a real finger
 *      on it closes the chat box and opens the picker;
 *   2. a real finger on an emoji sends ONE emote (React's passive touchstart
 *      used to send it twice, TRAPS §131) and closes the picker;
 *   3. the emoji pops over your own head, ~30 CSS px, above the name band;
 *   4. the other phone draws it over YOUR head, and it is gone (destroyed,
 *      not hidden) when its 2.6 s are up;
 *   5. a quick line ("GG") is your speech bubble on the other phone;
 *   6. a relay that is not a listed emote draws nothing anywhere;
 *   7. two taps inside a second send one;
 *   8. a player blocked from the friends list ({id, name} entries) draws no
 *      emote on the blocker's screen;
 *   9. B toggles the picker on a keyboard; a "b" typed in the chat box does
 *      not; the worker's `emotes: false` takes the smiley away.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const POP_MS = 2600;

/* a real finger (CDP), on the middle of the first element matching `sel`,
   only if nothing covers it there */
async function fingerTap(P, sel) {
  const at = await P.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { err: 'no ' + sel };
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) return { err: sel + ' is covered by ' + (hit ? hit.outerHTML.slice(0, 80) : 'nothing') };
    return { x, y };
  }, sel);
  if (at.err) return at;
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return at;
}
const popOf = (P, id) => P.page.evaluate((id) => {
  const m = window.__btEmotePops;
  const p = m && m.get(id);
  return p ? Object.assign({}, p) : null;
}, id);
async function waitPop(P, id, emoji, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const p = await popOf(P, id);
    if (p && (!emoji || p.emoji === emoji)) return p;
    await P.page.waitForTimeout(120);
  }
  return null;
}
const pickerUp = (P) => P.page.evaluate(() => !!document.querySelector('[data-emote-picker]'));

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Waver', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  await A.page.waitForTimeout(1200);
  await H.instrumentWire(A);

  /* ── 1. THE CHAT BOX'S SMILEY OPENS THE PICKER ── */
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await A.page.waitForTimeout(300);
  const smiley = await A.page.evaluate(() => !!document.querySelector('[data-chat-emotes]'));
  rec.ok('the chat box has the emotes smiley', smiley);
  const t1 = await fingerTap(A, '[data-chat-emotes]');
  rec.ok('...a real finger can reach it', !t1.err, t1);
  await A.page.waitForTimeout(500);
  const after1 = await A.page.evaluate(() => ({
    chat: !!document.querySelector('[data-chat-input]'),
    picker: !!document.querySelector('[data-emote-picker]'),
    emoji: document.querySelectorAll('[data-emote-picker] [data-emote]').length,
  }));
  console.log('    after the smiley: ' + JSON.stringify(after1));
  rec.ok('...which closes the chat box and opens the picker, all 42 emotes on it',
    !after1.chat && after1.picker && after1.emoji === 42, after1);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/emotes-picker.png` });

  /* ── 2. ONE TAP, ONE EMOTE ── */
  const w0 = (await H.wireCounts(A)).emote || 0;
  const t2 = await fingerTap(A, '[data-emote-picker] [data-emote="🎉"]');
  /* the other phone is watched from now: the pop lasts 2.6 s, and this box
     can spend that long on the checks and pictures below (a picture alone
     can take a second here) -- so each phone's picture is taken the moment
     its pop is seen, of the middle of the screen only */
  const MID = { x: 95, y: 220, width: 200, height: 260 };
  const peerP = waitPop(B, aId, '🎉', 4000).then(async (p) => {
    if (p) await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/emotes-peer.png`, clip: MID }).catch(() => {});
    return p;
  });
  /* your own pop, read past its overshoot (350 ms) and pictured at once */
  await A.page.waitForTimeout(350);
  const own = await waitPop(A, aId, '🎉', 3000);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/emotes-own.png`, clip: MID }).catch(() => {});
  rec.ok('a real finger reaches the 🎉 button', !t2.err, t2);
  const w1 = (await H.wireCounts(A)).emote || 0;
  rec.ok('...and sends exactly ONE emote (React\'s passive touchstart sent two, TRAPS §131)', w1 - w0 === 1, { sent: w1 - w0 });
  rec.ok('...and the picker closes', !(await pickerUp(A)));

  /* ── 3. YOUR OWN EMOJI OVER YOUR HEAD ── */
  console.log('    own pop: ' + JSON.stringify(own));
  rec.ok('your 🎉 is drawn over your head', !!own, own);
  rec.ok('...about 30 CSS px tall at rest (24-36)', !!own && own.screenPx >= 24 && own.screenPx <= 36, own);
  rec.ok('...above the name band', !!own && own.band != null && own.y < own.band, own);

  /* ── 4. THE OTHER PHONE DRAWS IT OVER YOUR HEAD, THEN LETS IT GO ── */
  const seen = await peerP;
  console.log('    as the peer sees it: ' + JSON.stringify(seen));
  rec.ok('the other phone draws your 🎉 over your head', !!seen && seen.emoji === '🎉', seen);
  await B.page.waitForTimeout(POP_MS + 900);
  const gone = await popOf(B, aId);
  rec.ok('...and lets it go when its 2.6 s are up (destroyed, its probe gone)', gone === null, gone);

  /* ── 5. A QUICK LINE IS YOUR SPEECH BUBBLE ── */
  await A.page.waitForTimeout(1100);   /* past the one-a-second limit */
  await A.page.evaluate(() => window.__broLegacyUI.emotesOpen());
  await A.page.waitForSelector('[data-emote-picker]', { timeout: 5000 });
  const t5 = await fingerTap(A, '[data-emote-picker] [data-emote="GG"]');
  rec.ok('a real finger reaches the GG line', !t5.err, t5);
  let bub = null;
  for (let i = 0; i < 25 && !bub; i++) {
    bub = await B.page.evaluate((id) => {
      const S = window._gameState.current;
      const b = S.chatBubbles && S.chatBubbles[id];
      const drawn = window.__btChatBubbles && window.__btChatBubbles.get(id);
      return b && b.text === 'GG' && drawn ? { text: b.text, drawn: true } : null;
    }, aId);
    if (!bub) await B.page.waitForTimeout(150);
  }
  rec.ok('the other phone shows "GG" as your speech bubble', !!bub, bub);
  rec.ok('...and draws no emoji for a quick line', (await popOf(B, aId)) === null);

  /* ── 6. NOT A LISTED EMOTE: NOTHING, ANYWHERE ── */
  await A.page.waitForTimeout(1100);
  await A.page.evaluate(() => window._gameState.current.channel.send({ type: 'broadcast', event: 'emote', payload: { emoji: 'free text over a head' } }));
  await B.page.waitForTimeout(1500);
  const junk = await B.page.evaluate((id) => {
    const S = window._gameState.current;
    const o = S.others && S.others[id];
    return { pop: !!(window.__btEmotePops && window.__btEmotePops.get(id)), stamped: !!(o && o.emote && o.emote.emoji === 'free text over a head'), bubble: !!(S.chatBubbles && S.chatBubbles[id] && S.chatBubbles[id].text === 'free text over a head') };
  }, aId);
  rec.ok('a relay that is not a listed emote draws nothing on the other phone', !junk.pop && !junk.stamped && !junk.bubble, junk);

  /* ── 7. TWO PICKS INSIDE A SECOND SEND ONE ──
     Through the picker's own sender (BroTown's sendEmote, the QA door
     __broLegacyUI.emoteSend), back to back in one go: two finger taps on this
     box can be more than a second apart. */
  await A.page.waitForTimeout(1100);
  const w2 = (await H.wireCounts(A)).emote || 0;
  await A.page.evaluate(() => { window.__broLegacyUI.emoteSend('👋'); window.__broLegacyUI.emoteSend('🔥'); });
  await A.page.waitForTimeout(300);
  const w3 = (await H.wireCounts(A)).emote || 0;
  rec.ok('two emotes picked inside a second send one', w3 - w2 === 1, { sent: w3 - w2 });
  await A.page.waitForTimeout(1100);
  await A.page.evaluate(() => window.__broLegacyUI.emoteSend('👏'));
  await A.page.waitForTimeout(300);
  rec.ok('...and one a second later goes', ((await H.wireCounts(A)).emote || 0) - w3 === 1);

  /* ── 8. BLOCKED FROM THE FRIENDS LIST: NOT DRAWN ── */
  await B.page.evaluate((id) => localStorage.setItem('bt_blocked', JSON.stringify([{ id, name: 'Waver' }])), aId);
  await A.page.waitForTimeout(1200);
  await A.page.evaluate(() => window._gameState.current.channel.send({ type: 'broadcast', event: 'emote', payload: { emoji: '💀' } }));
  await B.page.waitForTimeout(1500);
  const blocked = await popOf(B, aId);
  rec.ok('a player blocked from the friends list ({id, name}) draws no emote', blocked === null, blocked);
  await B.page.evaluate(() => localStorage.removeItem('bt_blocked'));

  /* ── 9. B ON A KEYBOARD, AND THE WORKER'S SWITCH ── */
  await A.page.keyboard.press('b');
  await A.page.waitForTimeout(300);
  const bOpen = await pickerUp(A);
  await A.page.keyboard.press('b');
  await A.page.waitForTimeout(300);
  const bShut = !(await pickerUp(A));
  rec.ok('B opens the picker and B again shuts it', bOpen && bShut, { bOpen, bShut });
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await A.page.locator('[data-chat-input]').first().focus();
  await A.page.keyboard.press('b');
  await A.page.waitForTimeout(300);
  rec.ok('...but a "b" typed in the chat box does not', !(await pickerUp(A)));
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(false));
  await A.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = Object.assign({}, S._serverCaps, { emotes: false }); });
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await A.page.waitForTimeout(200);
  const offSmiley = await A.page.evaluate(() => !!document.querySelector('[data-chat-emotes]'));
  rec.ok('the worker\'s `emotes: false` takes the smiley away', !offSmiley);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
