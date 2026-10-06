/* ═══ THE RIGHT STICK SHOWS WHAT A TAP DOES, AND THE TAP DOES IT (v2.3.3087) ═══
 *
 * The owner: "I'd like the right joystick button to have an icon that
 * represents the action like this current jump, the sword for attack, etc. so
 * maybe chat bubble for speaking, door for entering door if that's a thing
 * etc", "Speaking to NPCs I mean".
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown:
 *   1. at the foot of the bank's steps the stick shows a DOOR, and a tap on
 *      the stick's zone opens the bank -- no jump;
 *   2. beside Ace it shows a speech BUBBLE, and a tap opens his coin flip --
 *      no jump;
 *   3. out on the commons with nothing about, it shows the JUMP arrow and a
 *      tap jumps;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/tapact-{door,talk}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const icon = (P) => P.page.evaluate(() => { const d = document.querySelector('.bt-rjoy-base'); return d ? d.getAttribute('data-ricon') : null; });
const jumps = (P) => P.page.evaluate(() => (window.__btJumpBtn ? window.__btJumpBtn().count : 0));
/* a real finger's tap on the right stick's zone, where it lands */
/* the Mayor's quest offer pops up when you pass him (v2.3.1701) and its scrim
   takes every tap: shut whatever dialog is up, as a player would */
const closeDialogs = async (P) => {
  for (let i = 0; i < 4; i++) {
    const up = await P.page.evaluate(() => { const s = document.querySelector('.bt-npcdlg-scrim'); if (s) s.click(); return !!s; });
    if (!up) return;
    await P.page.waitForTimeout(300);
  }
};
const tapStick = (P, id) => P.page.evaluate((id) => {
  const z = document.querySelector('[data-joyzone="R"]');
  const b = z.getBoundingClientRect();
  const x = b.left + b.width * 0.7, y = b.top + b.height * 0.3;
  const el = document.elementFromPoint(x, y) || z;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
  const S = window._gameState.current; S.autoAttack = false; S._aiming = false;
  return el.tagName + '.' + String(el.className || '').slice(0, 30);
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `tapact-${name}.png`), clip: { x: 150, y: 520, width: 240, height: 260 } }).catch(() => {});
  const P = await H.newPlayer(browser, { name: 'Actbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* a phone, not a keyboard (mp-wheeldoors' habit) */
    await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(900);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
      }
      return false;
    };

    /* ── 1. a door ── */
    let doors = [];
    for (let i = 0; i < 40 && !doors.length; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (!doors.length) await P.page.waitForTimeout(500);
    }
    const bank = doors.find((d) => d.id === 'bank');
    rec.ok('the bank\'s door is known (guard)', !!bank, doors.map((d) => d.id));
    if (bank) {
      await standAt(bank.x, bank.y + 30);
      const at = await H.waitFor(P, (S) => ({ nb: S.nearBuilding, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
        (v) => v.nb != null && v.ic === 'door', { timeout: 8000, label: 'the door picture' }).catch(() => null);
      await shot('door');
      rec.ok(`at the bank's steps the right stick shows a DOOR (${at ? at.ic : await icon(P)})`, !!at, at);
      await closeDialogs(P);
      const j0 = await jumps(P);
      const where = await tapStick(P, 81);
      let panel = null;
      for (let i = 0; i < 12 && !panel; i++) {
        await P.page.waitForTimeout(250);
        panel = await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
      }
      const j1 = await jumps(P);
      rec.ok(`...and a tap on the stick goes in: the bank opens (${panel}), no jump`, !!panel && j1 === j0, { panel, j0, j1, where });
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
      await P.page.waitForTimeout(500);
    }

    /* ── 2. a character: Ace (his coin flip opens only when you speak to him) ── */
    const ace = await P.page.evaluate(() => { const S = window._gameState.current; const n = (S.npcs || []).find((q) => q.name === 'Ace'); return n ? { x: n.x, y: n.y } : null; });
    rec.ok('Ace stands in the Wheel\'s Brotown (guard)', !!ace, ace);
    if (ace) {
      await H.hopTo(P, ace.x + 40, ace.y + 30, { step: 100, gap: 260, tries: 90 });
      const near = await H.waitFor(P, (S) => ({ n: S._nearNpc ? S._nearNpc.name : null, nb: S.nearBuilding, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
        (v) => v.n === 'Ace' && v.ic === 'talk', { timeout: 8000, label: 'the bubble' }).catch(() => null);
      await shot('talk');
      rec.ok(`beside Ace the right stick shows a speech BUBBLE (${near ? near.ic : await icon(P)})`, !!near, near || await H.readState(P, (S) => ({ n: S._nearNpc && S._nearNpc.name, nb: S.nearBuilding })));
      await closeDialogs(P);
      const j0 = await jumps(P);
      await tapStick(P, 82);
      const flip = await H.waitFor(P, () => !!(window.__btAceFlipBus && window.__btAceFlipBus.open), (v) => v, { timeout: 4000, label: 'the flip' }).catch(() => false);
      const j1 = await jumps(P);
      rec.ok(`...and a tap on the stick speaks to him: his coin flip opens, no jump`, !!flip && j1 === j0, { flip, j0, j1 });
      await P.page.evaluate(() => { try { window.__btAceFlipBus && window.__btAceFlipBus.setOpen && window.__btAceFlipBus.setOpen(false); } catch (e) { /* closed anyway */ } });
      await P.page.waitForTimeout(400);
    }

    /* ── 3. nothing about: the jump ── */
    const open = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y + 420 }; });
    await H.hopTo(P, open.x, open.y, { step: 100, gap: 260, tries: 90 });
    const free = await H.waitFor(P, (S) => ({ nb: S.nearBuilding, n: S._nearNpc ? S._nearNpc.name : null, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
      (v) => v.ic === 'jump', { timeout: 8000, label: 'the jump arrow' }).catch(() => null);
    rec.ok(`with no door and nobody beside you it shows the JUMP arrow (${free ? free.ic : await icon(P)})`, !!free, free);
    await closeDialogs(P);
    const j0 = await jumps(P);
    await tapStick(P, 83);
    const j1 = await jumps(P);
    rec.ok(`...and a tap jumps (${j0} -> ${j1})`, j1 === j0 + 1, { j0, j1 });

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
