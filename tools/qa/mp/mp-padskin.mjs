/* ═══ v2.3.6640: THE CONTROLLER, PLAYED ON A PHONE (card PAD; `?padskin=0` today's look) ═══
 *
 * The owner, 2026-11-25: "Also want a redesign of the controls area to be
 * more like a controller."  In the Wheel (BroTown), the default controls (the
 * held combat), 430 x 775 upright and 775 x 430 sideways at 3x, real touches
 * (CDP):
 *
 *   1. THE HOUSINGS: two, each flush to its side and docked to the band's
 *      top edge (their foot on it), the middle between them open; the
 *      controller's numbers on the page (window.__btPad) are the ones they
 *      were drawn from;
 *   2. EACH SHOWN CONTROL IN ITS SOCKET: Jump, the skateboard (the context
 *      socket) and Attack, each centred on its socket (2 px), its face the
 *      socket's size, its box `touch-action` as before; the stick's well on
 *      its socket;
 *   3. AN EMPTY SOCKET: a socket whose control is hidden (Block, Special in
 *      town) shows the housing and nothing else, and a touch there reaches
 *      the world (the R zone), not a control;
 *   4. NO BOX SMALLER: with `&padskin=0` (a second page, the same screen)
 *      each control's box is no bigger than here; that page draws no housing
 *      and no painted face (today's look);
 *   5. A PRESS DOES WHAT IT DID: the stick (a drag on the left half) walks;
 *      holding Attack in its socket attacks while held and letting go stops
 *      it (mp-heldcombat's 2, on the controller); after the walk, a weapon
 *      in hand and the press, the controls are where they were.  (A control
 *      that comes in a fight lands in its own socket and moves no other: the
 *      places are the screen's alone, server/test/pad-skin.test 4.)
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs padskin
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 430, height: 775 };
const SIDEWAYS = { width: 775, height: 430 };
const SEL = { jump: '[data-jump]', skate: '[data-ride]', attack: '.bt-rjoy-base', block: '[data-shield]', special: '[data-special]', charge: '[data-charge]' };

/* the page as the test reads it: the housings, each control's box and face,
   the stick's well, the band's top */
const LOOK = (P) => P.page.evaluate((sel) => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const vis = (el) => { if (!el) return false; let e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentElement; } return true; };
  const out = { vw: window.innerWidth, vh: window.innerHeight, pad: window.__btPad ? window.__btPad.layout : null, c: {} };
  out.hl = rect(document.querySelector('[data-padhousing="L"]'));
  out.hr = rect(document.querySelector('[data-padhousing="R"]'));
  const band = getComputedStyle(document.documentElement).getPropertyValue('--sheet-h') || getComputedStyle(document.documentElement).getPropertyValue('--dash-h');
  out.bandTop = window.innerHeight - parseFloat(band);
  for (const k of Object.keys(sel)) {
    const el = document.querySelector(sel[k]);
    if (!el) { out.c[k] = null; continue; }
    const face = el.querySelector('.bt-pad-face');
    out.c[k] = { box: rect(el), face: rect(face), shown: vis(el), ta: getComputedStyle(el).touchAction, painted: !!face };
  }
  out.well = rect(document.querySelector('.bt-joystick-base'));
  out.faces = document.querySelectorAll('.bt-pad').length;
  return out;
}, SEL);

/* a socket's centre on the page, from the right housing's box and the layout */
const SOCKET = (L, k) => {
  const s = L.pad.sockets[k];
  return { x: L.hr.r - s.x, y: L.hr.b - s.y, d: s.d };
};
const near = (a, b, tol) => !!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      /* ── 4 first: today's boxes, on a page with the switch thrown ── */
      const O = await H.newPlayer(browser, { name: label === 'upright' ? 'Padoff' : 'Padoffs', wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: 'padskin=0' });
      players.push(O);
      O.page.on('pageerror', (e) => errs.push(label + ' off: ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(O);
      const inO = await H.waitFor(O, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: the page with \`&padskin=0\` is in the Wheel (guard)`, !!inO, inO);
      await O.page.waitForTimeout(2500);
      const off = await LOOK(O);
      rec.ok(`4a. ${label}: \`&padskin=0\` is today's look: no housing, no painted face`, !off.hl && !off.hr && off.faces === 0, { hl: off.hl, faces: off.faces });
      await O.ctx.close().catch(() => {});

      /* ── the controller ── */
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Padbro' : 'Padside', wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: 'wheelwhole' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2500);
      const L = await LOOK(P);
      if (label === 'upright' && process.env.PAD_SHOTS) await P.page.screenshot({ path: process.env.PAD_SHOTS + '/pad-upright.png' });
      if (label === 'sideways' && process.env.PAD_SHOTS) await P.page.screenshot({ path: process.env.PAD_SHOTS + '/pad-sideways.png' });

      /* 1 */
      rec.ok(`1a. ${label}: two housings, flush to their sides, their feet on the band's top (${L.bandTop} px)`,
        !!L.hl && !!L.hr && !!L.pad && Math.abs(L.hl.l) <= 1 && Math.abs(L.hr.r - L.vw) <= 1
        && Math.abs(L.hl.b - L.bandTop) <= 1 && Math.abs(L.hr.b - L.bandTop) <= 1, { hl: L.hl, hr: L.hr, bandTop: L.bandTop });
      if (!L.hl || !L.hr || !L.pad) continue;
      rec.ok(`1b. ${label}: the middle open (${Math.round(L.hr.l - L.hl.r)} px), the housings the layout's size`,
        L.hr.l - L.hl.r >= 40 && Math.abs(L.hr.w - L.pad.right.w) <= 1 && Math.abs(L.hl.w - L.pad.left.w) <= 1, { pad: [L.pad.left, L.pad.right] });

      /* 2 */
      for (const [k, sock] of [['jump', 'jump'], ['skate', 'ctx'], ['attack', 'attack']]) {
        const c = L.c[k], S0 = SOCKET(L, sock);
        rec.ok(`2a. ${label}: ${k} in its socket (box ${c && Math.round(c.box.w)} px, face ${c && c.face && Math.round(c.face.w)} of ${S0.d})`,
          !!c && near(c.box, S0, 2) && !!c.face && near(c.face, S0, 2) && Math.abs(c.face.w - S0.d) <= 1.5, { c, S0 });
      }
      const st = L.pad.stick, wellAt = { x: L.hl.l + st.x, y: L.hl.b - st.y };
      rec.ok(`2b. ${label}: the stick's well on its socket (${L.well && Math.round(L.well.w)} px)`, near(L.well, wellAt, 2) && Math.abs(L.well.w - st.disc) <= 1.5, { well: L.well, wellAt, st });
      rec.ok(`2c. ${label}: each control's touch-action as with the switch thrown`,
        ['jump', 'skate', 'attack'].every((k) => L.c[k] && off.c[k] && L.c[k].ta === off.c[k].ta), ['jump', 'skate', 'attack'].map((k) => [k, L.c[k] && L.c[k].ta, off.c[k] && off.c[k].ta]));

      /* 3 */
      const empty = await P.page.evaluate(([pts]) => pts.map(([k, x, y]) => {
        const el = document.elementFromPoint(x, y);
        return { k, joyzone: el ? el.getAttribute('data-joyzone') : null, tag: el ? (el.className || el.tagName).toString().slice(0, 40) : null };
      }), [[['block', SOCKET(L, 'block').x, SOCKET(L, 'block').y], ['special', SOCKET(L, 'special').x, SOCKET(L, 'special').y]]]);
      rec.ok(`3. ${label}: Block's and Special's sockets empty in town, a touch there reaches the world`,
        !L.c.block && !L.c.special && empty.every((e) => e.joyzone === 'R'), { empty, block: L.c.block, special: L.c.special });

      /* 4b */
      const small = ['jump', 'skate', 'attack'].filter((k) => !L.c[k] || !off.c[k] || L.c[k].box.w + 0.5 < off.c[k].box.w);
      rec.ok(`4b. ${label}: no control's box smaller than with \`&padskin=0\``, small.length === 0,
        ['jump', 'skate', 'attack'].map((k) => [k, L.c[k] && Math.round(L.c[k].box.w), off.c[k] && Math.round(off.c[k].box.w)]));

      /* 5a: the stick walks */
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const p0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const sx = Math.round(L.vw * 0.25), sy = Math.round(L.hl.t - 60);
      await touch('touchStart', [{ x: sx, y: sy, id: 1 }]);
      for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: sx + i * 8, y: sy, id: 1 }]); await P.page.waitForTimeout(60); }
      await P.page.waitForTimeout(1200);
      await touch('touchEnd', [{ x: sx + 48, y: sy, id: 1 }]);
      const p1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      rec.ok(`5a. ${label}: a drag on the left half walks (${Math.round(p1.x - p0.x)} px east)`, p1.x - p0.x > 20, { p0, p1 });

      /* 5b: Attack held attacks while held (the held combat: S.autoAttack), a weapon in hand */
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
      await P.page.waitForTimeout(1500);
      /* v2.3.6640: the disc takes a touch only once BroTown's resolver raises
         it (pointer-events auto, TouchControls v2.3.2246) after the kit; part
         1's run read 5b red sideways once on a loaded box (unseen in the next
         run): wait for the disc to be live, not for a fixed time */
      await P.page.waitForFunction(() => { const b = document.querySelector('.bt-rjoy-base'); return !!b && getComputedStyle(b).pointerEvents === 'auto'; }, null, { timeout: 8000 }).catch(() => null);
      const M = await LOOK(P);
      const A = M.c.attack && M.c.attack.box;
      let held = null, after = null;
      let probe = null;
      if (A && process.env.PAD_SHOTS) await P.page.screenshot({ path: process.env.PAD_SHOTS + '/pad-5b-' + label + '.png' });
      if (A) probe = await P.page.evaluate(([x, y]) => { const out = []; for (const el of document.elementsFromPoint(x, y).slice(0, 6)) { const cs = getComputedStyle(el); out.push(((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + '').slice(0, 50) + ' z' + cs.zIndex + ' pe' + cs.pointerEvents + ' op' + cs.opacity); } const b = document.querySelector('.bt-rjoy-base'); return { at: out, basePe: b && getComputedStyle(b).pointerEvents, zonePe: b && getComputedStyle(b.parentElement).pointerEvents, zoneOp: b && getComputedStyle(b.parentElement).opacity }; }, [A.x, A.y]);
      if (A) {
        await touch('touchStart', [{ x: A.x, y: A.y, id: 2 }]);
        /* held: read until it holds (the renderer's clock on this box, TRAPS §200), at most 3 s */
        for (let i = 0; i < 10 && held !== true; i++) { await P.page.waitForTimeout(300); held = await H.readState(P, (S) => !!S.autoAttack); }
        await touch('touchEnd', [{ x: A.x, y: A.y, id: 2 }]);
        for (let i = 0; i < 10 && after !== false; i++) { await P.page.waitForTimeout(300); after = await H.readState(P, (S) => !!S.autoAttack); }
      }
      rec.ok(`5b. ${label}: holding Attack in its socket attacks while held (${held}) and letting go stops it (${after})`, held === true && after === false, { A, held, after, probe });
      /* 5c: after the walk, the kit and the press, nothing moved */
      const moved = ['jump', 'skate', 'attack'].filter((k) => !M.c[k] || !L.c[k] || !near(M.c[k].box, L.c[k].box, 1));
      rec.ok(`5c. ${label}: the controls stay in their sockets (after a walk, a weapon, a press)`, moved.length === 0, ['jump', 'skate', 'attack'].map((k) => [k, L.c[k] && L.c[k].box, M.c[k] && M.c[k].box]));
      await P.ctx.close().catch(() => {});
    }
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
  rec.ok('6. no page errors', errs.length === 0, errs.slice(0, 5));
}
