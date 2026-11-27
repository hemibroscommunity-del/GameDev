/* ═══ v2.3.6841: THE OWNER'S V17 LOOK ON THE REAL SCREENS, BOTH WAYS (card UI4 PR 2) ═══
 *
 * The owner, with the V17 handoff (docs/plan/cards/UI4.md): "Validate these
 * within the actual game before implementing the remaining menus. Do not
 * compromise readability, available screen space, gameplay visibility or
 * device fairness to accommodate a design."  `?v17look` (on by default) gives
 * the kit's roles V17's colours (docs/design/v17/MASTER-IMPLEMENTATION.md:37-49)
 * and the smallest word 12 (V17:49 metadata 12-13); `?v17look=0` the game as
 * it was.  A phone in the world, upright at 390 x 844 and sideways at
 * 844 x 390 (dpr 2), on Bro, the Combat page, the Sword's page and Gear:
 *
 *   1. by default the kit roots wear `ui2-v17`, and `?v17look=0` none;
 *   2. the look's colours are on the real screens: a door (go) the flat
 *      slate #294963 with its #698397 edge, the header's Close (adjust) the
 *      neutral slate #203644, the Sword's number ivory (gold leaves stat
 *      numbers), a chevron #BCC8CC, a point to spend V17's priority cue (the
 *      count #F5CF83, the tile's edge #BC9B60: never commit gold; the Sword
 *      dealt its points, `deal: true`); with `=0` the door is today's gradient;
 *   3. THE SMALLEST WORD: each screen measured with the word at 11 and at 12
 *      (the token set over the page): at 12 no scroll grows, no word is cut
 *      or runs out of its box, every control is still inside the band and
 *      44 x 44; a screen that cannot keeps 11 and is on UI2_V17_SMALL11
 *      (src/game/ui2Tokens.js), and the list is held to the measurement;
 *   4. the pictures, both ways: docs/shots/ui4-look-<screen>-<on|off>[-side].png.
 * With BT_V17_BASE=1 (QA_DIST=dist-base, the base branch's build) only the
 * `=0` pictures are taken, as ui4-look-<screen>-base[-side].png into
 * BT_V17_SHOTS, so the PR proves `=0` is the base to the pixel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
import { UI2_V17_SMALL11 } from '../../../src/game/ui2Tokens.js';
export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = process.env.BT_V17_SHOTS || path.join(ROOT, 'docs', 'shots');
const BASE = process.env.BT_V17_BASE === '1';
const SCREENS = ['bro', 'combat', 'sword', 'gear'];
/* each screen's root (what UI2_V17_SMALL11 names) */
const ROOTS = { bro: '[data-bro-landing]', combat: '[data-combat-hub]', sword: '[data-weapon-page]', gear: '[data-gear-ws]' };

const tap = async (P, sel, ms = 900) => { await P.page.locator(sel).first().tap({ timeout: 15000 }); await P.page.waitForTimeout(ms); };
async function open(P, s) {
  if (s === 'bro') { await H.dashOpen(P, 'hero'); await P.page.waitForTimeout(900); return; }
  if (s === 'combat') { await H.dashOpen(P, 'hero'); await P.page.waitForTimeout(700); await tap(P, '[data-dash-grid="bro"] [data-dest="combat"]'); return; }
  if (s === 'sword') { await open(P, 'combat'); await tap(P, '[data-combat-door="sword"]'); return; }
  if (s === 'gear') { await H.dashOpen(P, 'gear'); await P.page.waitForTimeout(900); }
}
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}

/* in the page: what the band holds (layout read by a test, outside any frame of the game's) */
function measure(rootSel) {
  const band = document.querySelector('.bt-dashboard');
  if (!band) return null;
  const B = band.getBoundingClientRect();
  const root = document.querySelector(rootSel);
  let scroll = 0;
  const cut = [];
  const out = [];
  const small = [];
  let least = 99;
  for (const el of band.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (/(auto|scroll)/.test(cs.overflowY)) scroll += Math.max(0, el.scrollHeight - el.clientHeight);
    if (/(auto|scroll)/.test(cs.overflowX)) scroll += Math.max(0, el.scrollWidth - el.clientWidth);
    const words = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    const r = el.getBoundingClientRect();
    if (words && r.width > 0) {
      if (!el.closest('.u2-badge')) least = Math.min(least, parseFloat(cs.fontSize));   /* a count badge is not a word (V17:49 badge 10-11) */
      if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) cut.push((el.className || el.tagName) + ' "' + el.textContent.trim().slice(0, 20) + '"');
    }
    const press = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'tab';
    if (press && r.width > 0) {
      const hidden = el.closest('[style*="overflow"], .u2-grid, .u2-over-body');   /* a list that scrolls: its rows may leave the view */
      if (!hidden && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.bottom > B.bottom + 0.5 || r.top < B.top - 0.5)) out.push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20));
      if (r.width < 43.5 || r.height < 43.5) small.push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return { root: !!root, scroll: Math.round(scroll), cut, out, small, least };
}
const setSmall = (P, px) => P.page.evaluate((v) => {
  let s = document.getElementById('bt-v17-small');
  if (!s) { s = document.createElement('style'); s.id = 'bt-v17-small'; document.head.appendChild(s); }
  s.textContent = v ? `.ui2.ui2-v17 { --ui2-fs-small: ${v}px !important; }` : '';
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}, px);
/* the colours the look puts on a real screen */
const colours = (P) => P.page.evaluate(() => {
  const cs = (sel, p) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[p] : null; };
  return {
    v17: document.querySelectorAll('.ui2.ui2-v17').length, roots: document.querySelectorAll('.ui2').length,
    door: cs('.bt-dashboard .u2-raised[data-u2-role="go"]:not(.is-glow):not(.is-off):not([aria-pressed="true"])', 'backgroundColor'),
    doorImg: cs('.bt-dashboard .u2-raised[data-u2-role="go"]:not(.is-glow):not(.is-off):not([aria-pressed="true"])', 'backgroundImage'),
    doorEdge: cs('.bt-dashboard .u2-raised[data-u2-role="go"]:not(.is-glow):not(.is-off):not([aria-pressed="true"])', 'borderTopColor'),
    close: cs('.bt-dashboard [data-u2="close"]', 'backgroundColor'),
    num: cs('.bt-dashboard .u2-stat .u2-stat-v', 'color'),
    chev: cs('.bt-dashboard .u2-chev', 'color'),
    pts: cs('.bt-dashboard .u2-at-line-v.is-gold', 'color'),
    plus: cs('.bt-dashboard .u2-wp-attr[data-attr-plus="1"]', 'borderTopColor'),
  };
});

async function onePhone(browser, wsPort, webPort, rec, side) {
  const vp = side ? { width: 844, height: 390 } : { width: 390, height: 844 };
  const tag = side ? '844 x 390' : '390 x 844';
  const sfx = side ? '-side' : '';
  const P = await H.newPlayer(browser, { name: side ? 'Lookside' : 'Lookbro', wsPort, webPort, world: 'wheel', viewport: vp, touch: true, dpr: 2, query: BASE ? 'v17look=0' : '' });
  try {
    await H.enterWorld(P);
    const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
    rec.ok(`${tag}: in the world (guard)`, !!w, w);
    if (!w) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'combat', myId, { skill: 'sword', level: 12, deal: true }).catch(() => null);
    await H.devOp(wsPort, 'combat', myId, { skill: 'bow', level: 9 }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const modes = BASE ? ['base'] : ['on', 'off'];
    for (const mode of modes) {
      if (mode === 'off') {
        await P.page.goto(P.page.url().replace(/([?&])v17look=[^&]*/, '$1').replace(/[?&]$/, '') + (P.page.url().includes('?') ? '&' : '?') + 'v17look=0', { waitUntil: 'domcontentloaded' });
        await H.enterWorld(P);
        await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world again' }).catch(() => null);
        await P.page.waitForTimeout(1500);
      }
      for (const s of SCREENS) {
        await open(P, s);
        const C = await colours(P);
        if (mode === 'on') {
          if (s === 'bro') rec.ok(`1a. ${tag}: by default every kit root wears ui2-v17 (${C.v17} of ${C.roots})`, C.roots > 0 && C.v17 === C.roots, C);
          if (s === 'bro' || s === 'sword') {
            rec.ok(`2a. ${tag} ${s}: a door is the flat slate #294963 with its #698397 edge; Close the neutral slate #203644`,
              C.door === 'rgb(41, 73, 99)' && /none/.test(C.doorImg || '') && C.doorEdge === 'rgb(105, 131, 151)' && C.close === 'rgb(32, 54, 68)', C);
          }
          if (s === 'sword') rec.ok(`2d. ${tag} sword: points to spend wear V17's priority cue, not commit gold: the count #F5CF83, a tile's edge #BC9B60`,
            C.pts === 'rgb(245, 207, 131)' && C.plus === 'rgb(188, 155, 96)', C);
          if (s === 'sword') rec.ok(`2b. ${tag} sword: the stat's number ivory, the chevron #BCC8CC (gold leaves them)`, C.num === 'rgb(241, 240, 233)' && (C.chev === null || C.chev === 'rgb(188, 200, 204)'), C);
          /* 3. the smallest word: 11 against 12 */
          await setSmall(P, 11);
          const M11 = await P.page.evaluate(measure, ROOTS[s]);
          await setSmall(P, 0);
          const M12 = await P.page.evaluate(measure, ROOTS[s]);
          const keeps = UI2_V17_SMALL11.some((sel) => /^\[/.test(sel) ? sel === ROOTS[s] : false);
          const holds = M11 && M12 && M12.root && M12.scroll <= M11.scroll && M12.cut.length <= M11.cut.length && M12.out.length <= M11.out.length && M12.small.length <= M11.small.length;
          console.log(`     v17 type ${tag} ${s}: 11 -> scroll ${M11 && M11.scroll}, cut ${M11 && M11.cut.length}, out ${M11 && M11.out.length}; 12 -> scroll ${M12 && M12.scroll}, cut ${M12 && M12.cut.length}, out ${M12 && M12.out.length}, least ${M12 && M12.least}${keeps ? ' (keeps 11)' : ''}`);
          rec.ok(`3. ${tag} ${s}: ${keeps ? 'on the keep-11 list, and 12 would not hold' : 'the smallest word 12 holds what 11 held: no more scroll, no word cut, every control in the band'}`,
            keeps ? !holds : holds, { M11, M12 });
        } else {
          if (s === 'bro') rec.ok(`1b. ${tag}: ${mode === 'base' ? 'the base build' : '?v17look=0'}: no kit root wears ui2-v17 (${C.roots} roots)`, C.roots > 0 && C.v17 === 0, C);
          if (s === 'bro' && mode === 'off') rec.ok(`2c. ${tag}: with =0 a door is today's gradient`, /gradient/.test(C.doorImg || ''), C);
        }
        const f = await bandShot(P, `ui4-look-${s}-${mode}${sfx}.png`);
        rec.ok(`4. ${tag} ${s} ${mode}: the picture`, !!f, f);
      }
    }
  } finally { await P.ctx.close().catch(() => {}); }
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await onePhone(browser, wsPort, webPort, rec, false);
  await onePhone(browser, wsPort, webPort, rec, true);
}
