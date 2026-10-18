/* /roll AND /flip, ROLLED BY THE WORKER (v2.3.3364, docs/specs/dice.md)
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md).  Two phones:
 *
 *   1. "/roll" typed in the chat box (Enter) asks the worker, once; both
 *      phones show the same line in the chat ("🎲 rolled 57 (1-100)") and the
 *      number over the roller's head as his speech bubble;
 *   2. a second "/roll" inside 5 s is held on the phone, with words;
 *   3. "/flip" is heads or tails, the same on both phones; "/roll 20" is 1-20;
 *   4. a phone that sends its own dice_roll shows nothing anywhere;
 *   5. against a worker without caps.dice, "/roll" is the plain chat line it
 *      always was.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* the dice lines in a phone's chat log since `from` */
const diceLines = (P, from) => P.page.evaluate((from) => (window._gameState.current.chatLog || []).slice(from)
  .filter((l) => l && l.dice).map((l) => ({ id: l.id, name: l.name, text: l.text })), from);
const logLen = (P) => P.page.evaluate(() => (window._gameState.current.chatLog || []).length);
async function waitDice(P, from, n = 1, timeout = 6000) {
  const t0 = Date.now();
  let got = [];
  while (Date.now() - t0 < timeout) {
    got = await diceLines(P, from);
    if (got.length >= n) return got;
    await P.page.waitForTimeout(120);
  }
  return got;
}
async function typeLine(P, text) {
  await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await P.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await P.page.locator('[data-chat-input]').first().fill(text);
  await P.page.locator('[data-chat-input]').first().press('Enter');
  await P.page.waitForTimeout(200);
}
const numberOf = (text) => { const m = /rolled (\d+) \(1-(\d+)\)/.exec(text || ''); return m ? { v: +m[1], max: +m[2] } : null; };

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Roller', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  await A.page.waitForTimeout(1200);
  await H.instrumentWire(A);
  rec.ok('the worker says caps.dice', await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.dice)));

  /* ── 1. "/roll" IN THE CHAT BOX ── */
  let a0 = await logLen(A), b0 = await logLen(B);
  const w0 = (await H.wireCounts(A)).dice || 0;
  await typeLine(A, '/roll');
  const mine = await waitDice(A, a0);
  const theirs = await waitDice(B, b0);
  const w1 = (await H.wireCounts(A)).dice || 0;
  console.log('    roller sees ' + JSON.stringify(mine) + ', watcher sees ' + JSON.stringify(theirs));
  rec.ok('"/roll" asks the worker once', w1 - w0 === 1, { sent: w1 - w0 });
  const n1 = mine[0] && numberOf(mine[0].text);
  rec.ok('...and the roller\'s chat says "🎲 rolled N (1-100)" in his name', mine.length === 1 && mine[0].id === aId && mine[0].name === 'Roller' && !!n1 && n1.max === 100 && n1.v >= 1 && n1.v <= 100, mine);
  rec.ok('...the watcher\'s chat the same line and the same number', theirs.length === 1 && theirs[0].id === aId && theirs[0].text === (mine[0] && mine[0].text), theirs);
  const said = await A.page.evaluate(() => (window._gameState.current.chatLog || []).some((l) => l && !l.dice && /^\/roll/.test(String(l.text || ''))));
  rec.ok('...and "/roll" itself is not posted', !said);
  let bub = null;
  for (let i = 0; i < 25 && !bub; i++) {
    bub = await B.page.evaluate((id) => {
      const S = window._gameState.current;
      const b = S.chatBubbles && S.chatBubbles[id];
      const drawn = window.__btChatBubbles && window.__btChatBubbles.get(id);
      return b && drawn ? { text: b.text } : null;
    }, aId);
    if (!bub) await B.page.waitForTimeout(150);
  }
  rec.ok('the watcher sees the number over the roller\'s head', !!bub && !!n1 && bub.text === '🎲 ' + n1.v, { bub, n1 });
  await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/dice-peer.png` }).catch(() => {});

  /* ── 2. AGAIN TOO SOON: HELD ON THE PHONE ── */
  a0 = await logLen(A);
  const w2 = (await H.wireCounts(A)).dice || 0;
  await A.page.evaluate(() => window.__btSendChat('/roll'));
  await A.page.waitForTimeout(400);
  const held = await A.page.evaluate((from) => (window._gameState.current.chatLog || []).slice(from).map((l) => l.text), a0);
  rec.ok('a second "/roll" inside 5 s is not sent', ((await H.wireCounts(A)).dice || 0) - w2 === 0);
  rec.ok('...and the phone says when it may roll again', held.some((t) => /^Roll again in \d s$/.test(t)), held);

  /* ── 3. "/flip" AND "/roll 20" ── */
  await A.page.waitForTimeout(5200);
  a0 = await logLen(A); b0 = await logLen(B);
  await A.page.evaluate(() => window.__btSendChat('/flip'));
  const fa = await waitDice(A, a0), fb = await waitDice(B, b0);
  rec.ok('"/flip" is heads or tails, the same on both phones', fa.length === 1 && /^🪙 flipped (heads|tails)$/.test(fa[0].text) && fb.length === 1 && fb[0].text === fa[0].text, { fa, fb });
  await A.page.waitForTimeout(5200);
  a0 = await logLen(A); b0 = await logLen(B);
  await A.page.evaluate(() => window.__btSendChat('/roll 20'));
  const ra = await waitDice(A, a0), rb = await waitDice(B, b0);
  const n3 = ra[0] && numberOf(ra[0].text);
  rec.ok('"/roll 20" is 1-20, the same on both phones', !!n3 && n3.max === 20 && n3.v >= 1 && n3.v <= 20 && rb.length === 1 && rb[0].text === ra[0].text, { ra, rb });

  /* ── 4. A PHONE'S OWN ROLL GOES NOWHERE ── */
  b0 = await logLen(B);
  a0 = await logLen(A);
  await A.page.evaluate(() => window._gameState.current.channel.send({ type: 'broadcast', event: 'dice_roll', payload: { kind: 'roll', value: 100, max: 100 } }));
  await B.page.waitForTimeout(1800);
  rec.ok('a phone that sends its own dice_roll shows nothing on the other phone', (await diceLines(B, b0)).length === 0);
  rec.ok('...nor on its own', (await diceLines(A, a0)).length === 0);

  /* ── 5. NO caps.dice: THE PLAIN LINE ── */
  await A.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = Object.assign({}, S._serverCaps, { dice: false }); });
  await A.page.waitForTimeout(5200);
  b0 = await logLen(B);
  const w5 = (await H.wireCounts(A)).dice || 0;
  await A.page.evaluate(() => window.__btSendChat('/roll'));
  let plain = [];
  for (let i = 0; i < 25 && !plain.length; i++) {
    plain = await B.page.evaluate((from) => (window._gameState.current.chatLog || []).slice(from).filter((l) => l && l.text === '/roll').map((l) => l.text), b0);
    if (!plain.length) await B.page.waitForTimeout(150);
  }
  rec.ok('against a worker without caps.dice, "/roll" is a plain chat line, and no ask is sent', plain.length === 1 && ((await H.wireCounts(A)).dice || 0) === w5, { plain });
}
