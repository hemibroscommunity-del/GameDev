/* THE CHAT SITS ON THE JOYSTICK (v2.3.2123).
 *
 * Four of the four demo reviewers reported this, and Uttam gave the
 * mechanism: "in phone worldchat cover left side of joystick, unable to move
 * jotstick".  Excalibur: "The world chat screen takes up my phone real estate
 * and just won't go away no matter what I do."  Tee asked for a collapse.
 * Alix: "Cant move due to the chat."
 *
 * The geometry says they are right.  The left joystick's TOUCH zone
 * (TouchControls, data-joyzone="L") is `left:0; top:0; width:50%` at
 * z-index 6 — the whole left half of the world.  The chat feed is anchored
 * `left:8; bottom:calc(var(--dash-h) + 8px)` at z-index 25, and its scrollable
 * list is pointerEvents:'auto' so that it can be scrolled.  Higher z, opaque
 * to touch, sitting in the lower left: a finger that lands on a chat line
 * never reaches the joystick zone underneath.
 *
 * WorldChatFeed's own header says "IT DOES NOT EAT TAPS ... a chat feed that
 * swallowed a joystick drag in the lower left would be a worse problem than
 * the one this solves."  That is the intent; this measures whether it holds.
 *
 * ASSERTED WITH elementFromPoint, not with rectangles.  Overlapping boxes are
 * not the bug — the shell overlaps the zone by design and is transparent to
 * touch.  What decides it is what the BROWSER hands the touch to at the point
 * a thumb actually lands, which is the same question H.clickText asks and the
 * one that settled mp-trade (v2.3.2084).
 */
import * as H from './harness.mjs';

/* Where a thumb goes: the visible joystick disc's own centre, read from the
   live element rather than assumed, plus a few points across the disc so a
   near-miss cannot pass by landing in a gap. */
const probe = (P) => P.page.evaluate(() => {
  const disc = document.querySelector('.bt-joystick-base')
    || document.querySelector('.bt-joystick-zone');
  const zone = document.querySelector('[data-joyzone="L"]');
  const chat = document.querySelector('[data-world-chat]');
  if (!disc || !zone) return { err: 'no joystick on screen' };
  const d = disc.getBoundingClientRect();
  const pts = [
    { tag: 'disc centre', x: d.left + d.width / 2, y: d.top + d.height / 2 },
    { tag: 'disc top',    x: d.left + d.width / 2, y: d.top + 6 },
    { tag: 'disc left',   x: d.left + 6,           y: d.top + d.height / 2 },
    { tag: 'disc right',  x: d.right - 6,          y: d.top + d.height / 2 },
    { tag: 'disc bottom', x: d.left + d.width / 2, y: d.bottom - 6 },
  ];
  const inChat = (el) => !!(el && el.closest && el.closest('[data-world-chat]'));
  return {
    disc: { x: Math.round(d.left), y: Math.round(d.top), w: Math.round(d.width), h: Math.round(d.height) },
    chat: chat ? (() => { const c = chat.getBoundingClientRect();
      return { x: Math.round(c.left), y: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height) }; })() : null,
    /* Every descendant that is opaque to touch, with its box — the shell is
       transparent by design, so the question is which child is not. */
    solids: chat ? Array.from(chat.querySelectorAll('*')).filter((el) =>
      getComputedStyle(el).pointerEvents !== 'none').map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height) };
      }).filter((r) => r.w > 0 && r.h > 0) : [],
    hits: pts.map((p) => {
      const el = document.elementFromPoint(p.x, p.y);
      return {
        tag: p.tag,
        el: el ? (el.tagName.toLowerCase()
          + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')
          + (el.getAttribute && el.getAttribute('data-joyzone') ? '[joyzone]' : '')).slice(0, 70) : null,
        stolenByChat: inChat(el),
      };
    }),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Thumbs', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* The corner is only contested once there is chat in it — the feed renders
     nothing at all when empty (its "quiet when empty" rule), so an idle room
     would pass this by having no chat to collide with.  Fill it the way a
     busy room does. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S) return;
    S.chatLog = S.chatLog || [];
    /* KEEP is 40 and the feed grows with content, so a busy room is the
       worst case and the one the reviewers were in — eight people talking.
       Long lines on purpose: they wrap, and a wrapped line is two rows. */
    for (let i = 0; i < 40; i++) {
      S.chatLog.push({ name: 'Crowd' + (i % 8),
        text: 'this is what a real world chat line looks like when someone is actually talking ' + i,
        ts: Date.now() + i });
    }
    /* Through the BUS, not by mutating the array alone: the feed renders on
       chatLogBus and a silent push leaves it drawing the one join line it
       already had — which is exactly how the first cut of this scenario
       measured an empty corner and passed. */
    try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) {}
  });
  await P.page.waitForTimeout(1200);

  const before = await probe(P);
  console.log('    ' + JSON.stringify(before));
  if (before.err) {
    rec.skip('the joystick is reachable under the world chat', before.err);
    await P.ctx.close().catch(() => {});
    return;
  }
  rec.ok('there is world chat on screen to collide with (guard)', !!before.chat, before);

  const stolen = before.hits.filter((h) => h.stolenByChat);
  for (const h of before.hits) console.log(`      ${h.tag}: ${h.el}${h.stolenByChat ? '   <-- CHAT' : ''}`);
  rec.ok('no part of the joystick disc is covered by the world chat',
    stolen.length === 0, stolen);

  /* And the drag actually works: elementFromPoint is the mechanism, this is
     the consequence.  A real touch drag from the disc centre must move the
     player — which is the sentence the reviewers actually wrote. */
  const moved = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const disc = document.querySelector('.bt-joystick-base');
    if (!disc || !S || !S.player) return null;
    const d = disc.getBoundingClientRect();
    const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
    const from = { x: S.player.x, y: S.player.y };
    const t = (x, y) => [new Touch({ identifier: 1, target: document.elementFromPoint(x, y) || document.body,
      clientX: x, clientY: y, pageX: x, pageY: y })];
    const fire = (type, x, y) => {
      const el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
        touches: type === 'touchend' ? [] : t(x, y),
        targetTouches: type === 'touchend' ? [] : t(x, y),
        changedTouches: t(x, y) }));
    };
    fire('touchstart', cx, cy);
    for (let i = 1; i <= 8; i++) fire('touchmove', cx + i * 4, cy);
    await new Promise((r) => setTimeout(r, 700));
    fire('touchend', cx + 32, cy);
    const to = { x: S.player.x, y: S.player.y };
    return { from, to, dist: Math.hypot(to.x - from.x, to.y - from.y) };
  });
  console.log('    drag: ' + JSON.stringify(moved));
  rec.ok('dragging from the joystick centre actually moves the player',
    !!moved && moved.dist > 2, moved);

  await P.ctx.close().catch(() => {});
}
