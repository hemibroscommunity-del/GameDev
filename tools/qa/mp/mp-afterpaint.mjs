/* ═══ v2.3.6244: THE DOOR PROMPT PLACED AFTER THE PAINT, AND AS BEFORE (card HB PR 5; `?afterpaint`) ═══
 *
 * The door prompt is placed over the bro's head at the top of the frame after
 * React put it in (src/ui/doorPrompt.js), not inside React's commit: it shows
 * a frame later, never at the wrong place.  `?afterpaint=0` places it in the
 * commit, as before.  This plays both on a phone, at three of the town's doors:
 *   1. with the switch on (the default) the prompt is up, visible, inside
 *      the screen, lying over no other button (mp-wheeldoors' rule);
 *   2. with `?afterpaint=0` the same.
 * Not compared door by door: in either way the prompt is placed when it
 * first shows, as the walk to the door brings it up, and keeps that place
 * while the camera settles (a 2026-11-18 run: the head moved 25 px, the
 * prompt not at all, both ways), so two walks place it where each head was
 * at that moment, tens of px apart.
 * The switch's play for switches-thrown (tools/guards/switches-thrown.test.mjs:
 * a page switch's address in a scenario's text).
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const DOORS = ['bank', 'store', 'saloon'];

async function tour(browser, wsPort, webPort, name, query) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query });
  const out = {};
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' });
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 16; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 16) await P.page.waitForTimeout(500);
    }
    const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(800);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const read = () => P.page.evaluate(() => {
      const S = window._gameState.current;
      const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || ''));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      const c = cv.getBoundingClientRect();
      const head = { x: c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: c.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) - 46 };
      let over = 0;
      for (const q of document.querySelectorAll('button, [role="button"]')) {
        if (q === b || b.contains(q) || q.contains(b)) continue;
        const o = q.getBoundingClientRect();
        if (o.width < 4 || o.height < 4) continue;
        const cs = getComputedStyle(q);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        if (Math.min(r.right, o.right) - Math.max(r.left, o.left) > 2 && Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top) > 2) over++;
      }
      return { text: (b.textContent || '').trim(), vis: getComputedStyle(b).visibility, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), headX: Math.round(head.x), headY: Math.round(head.y), over, vw: window.innerWidth };
    });
    for (const k of DOORS) {
      const d = byId[k];
      if (!d) { out[k] = { missing: true }; continue; }
      const stood = await standAt(d.x, d.y + 30);
      let r = null;
      for (let t0 = Date.now(); Date.now() - t0 < 5000;) {
        r = await read();
        if (r && r.vis === 'visible') break;
        await P.page.waitForTimeout(250);
      }
      await P.page.waitForTimeout(600);   /* the camera settles; read again, still */
      out[k] = { stood, ...(await read() || { none: true }) };
    }
  } finally { await P.ctx.close().catch(() => {}); }
  return out;
}

/* up, visible, inside the screen, over no other button (mp-wheeldoors' rule) */
const shown = (q) => !!q && !q.none && q.vis === 'visible' && q.over === 0 && q.l >= 4 && q.r <= q.vw - 4;

export async function run({ browser, wsPort, webPort, rec }) {
  const on = await tour(browser, wsPort, webPort, 'Painter', '');
  rec.ok(`1. after the paint (the default): at ${DOORS.join(', ')} the Enter prompt is up, visible, inside the screen, over no other button`,
    DOORS.every((k) => on[k] && on[k].stood && /Enter/.test(on[k].text || '') && shown(on[k])), on);
  const off = await tour(browser, wsPort, webPort, 'Painted', 'afterpaint=0');
  rec.ok('2. with ?afterpaint=0 (placed in the commit, as before): the same',
    DOORS.every((k) => off[k] && off[k].stood && /Enter/.test(off[k].text || '') && shown(off[k])), off);
}
