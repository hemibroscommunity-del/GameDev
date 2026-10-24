/* ═══ A TOWNSPERSON'S LINE STAYS OVER HIS HEAD, OFF THE SCREEN WITH HIM (v2.3.3593) ═══
 *
 * The owner: "The npc messages in the games follow you off screen.  That needs
 * to stop."  Since v2.3.3481 a bubble is kept inside the view, and for a
 * speaker past its side the WHOLE bubble moved in -- so a townsperson's line
 * stayed pinned to the screen's side as you walked away from him.
 *
 * In BroTown, on a phone:
 *   1. a townsperson on the screen speaks: his bubble's point is on him, and
 *      the bubble is inside the view
 *   2. you walk away until he is past the screen's side and he speaks again:
 *      the bubble is still over his head, off the screen with him -- not held
 *      at the screen's side
 *   3. no page errors
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* one townsperson, a bubble put on him now, and where it is drawn */
const speak = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const list = Array.isArray(S.npcs) ? S.npcs : Object.values(S.npcs || {});
  const npc = list.find((n) => n && n.id === nid);
  if (!npc) return null;
  npc.chatBubble = { text: 'Testing, testing.', ts: Date.now() };
  return { x: npc.x, camL: S.camera.x, camR: S.camera.x + S._viewW };
}, id);
const drawn = (P, id) => P.page.evaluate((nid) => {
  const m = window.__btChatBubbles;
  const b = m && m.get('npc:' + nid);
  return b ? { tipX: b.tipX, slide: b.slide } : null;
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bubbles', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  /* the townsperson nearest you */
  const npcId = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const list = Array.isArray(S.npcs) ? S.npcs : Object.values(S.npcs || {});
    let best = null, bd = Infinity;
    for (const n of list) {
      if (!n || n.id == null) continue;
      const d = Math.hypot(n.x - S.player.x, n.y - S.player.y);
      if (d < bd) { bd = d; best = n.id; }
    }
    return best;
  });
  rec.ok(`a townsperson stands near the arrival (${npcId})`, npcId != null, npcId);

  /* ── 1 ── on the screen */
  let at = await speak(P, npcId);
  await P.page.waitForTimeout(600);
  let b = await drawn(P, npcId);
  rec.ok('1. on the screen, his bubble\'s point is on him and the bubble is inside the view',
    !!at && !!b && at.x >= at.camL && at.x <= at.camR && b.tipX >= at.camL && b.tipX <= at.camR, { at, b });

  /* ── 2 ── walk away until he is past the screen's side */
  const side = at && at.x < (at.camL + at.camR) / 2 ? 'd' : 'a';   /* away from him */
  await P.page.keyboard.down(side);
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(250);
    at = await speak(P, npcId);
    if (at && (at.x < at.camL - 60 || at.x > at.camR + 60)) break;
  }
  await P.page.keyboard.up(side);
  await P.page.waitForTimeout(500);
  at = await speak(P, npcId);
  await P.page.waitForTimeout(600);
  b = await drawn(P, npcId);
  const off = !!at && (at.x < at.camL || at.x > at.camR);
  rec.ok('2. you walked until he is past the screen\'s side', off, at);
  rec.ok('2b. ...and his bubble is still over his head, off the screen with him (not held at the side)',
    off && !!b && Math.abs(b.tipX - at.x) < 2 && (b.tipX < at.camL || b.tipX > at.camR), { at, b });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('3. no page errors', errs.length === 0, errs.slice(0, 3));
}
