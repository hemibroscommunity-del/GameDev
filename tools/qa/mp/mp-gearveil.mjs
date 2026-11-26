/* ═══ A PICK ON THE GEAR TAB IS A MENU: THE REST STEPS BACK; CLOSING RESETS IT (v2.3.4353) ═══
 * The owner (2026-11-05 playtest): the detail menu stayed open on one item and
 * filtered the bag every time the dashboard was opened and closed.  On a phone
 * and a computer, in the Wheel, the Gear tab open:
 *   1. a cell picked: the tab is veiled (data-gear-veil), the other equipment
 *      cells are dimmed, the picked one is not, the card's X pulses;
 *   2. a tap on the veiled space outside any cell puts the pick down;
 *   3. a cell picked, the band CLOSED and opened again: no pick, "All Items".
 * Pictures: tools/qa/mp/out/gearveil-<view>.png. Rules in node: server/test/gear-reset.test.mjs. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];
const look = (P) => P.page.evaluate(() => {
  const tab = document.querySelector('[data-gear-tab]'), g = window.__btGearTab;
  const op = (el) => (el ? Number(getComputedStyle(el).opacity) : null);
  const cells = Array.from(document.querySelectorAll('[data-gear-tab] [data-eqslot]'));
  const x = document.querySelector('[data-gear-card-close]');
  return {
    veil: tab ? tab.getAttribute('data-gear-veil') : null,
    state: g ? g.state() : null,
    picked: op(cells.find((c) => c.getAttribute('data-gear-sel') === '1')),
    others: cells.filter((c) => c.getAttribute('data-gear-sel') !== '1').map(op),
    xAnim: x ? getComputedStyle(x).animationName : null,
    tab: !!tab,
  };
});
const openGear = async (P) => { await H.dashOpen(P, 'dashboard'); await P.page.waitForTimeout(800); };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS) {
    /* v2.3.6688 (card UI2-gear, the tests part): the veil, the dimmed cells and the pulsing ✕ are today's Gear's (three panels, a middle card); under the frame Gear is two panels and a pick turns the OPPOSITE panel into a summary.  So this loop is `?ui2=0`, unchanged; the new Gear's own rules (a pick, the way back, Close keeps it) are the loop below. */
    const P = await H.newPlayer(browser, { name: 'Veil' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', query: 'ui2=0', ...V.opts });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'world' });
      await H.pastWelcome(P).catch(() => {});
      await P.page.addStyleTag({ content: '[data-coach-card], [data-coach-ring], .bt-quest-banner, .bt-quest-plate { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await openGear(P);
      let l0 = await look(P);
      if (!l0.tab) { await P.page.keyboard.press('i').catch(() => {}); await P.page.waitForTimeout(800); l0 = await look(P); }
      rec.ok(`${V.id} 0. the Gear tab is open`, l0.tab === true, l0);
      /* 1. a pick */
      await P.page.evaluate(() => window.__btGearTab.bus.tapCell('sword'));
      await P.page.waitForTimeout(700);
      const l1 = await look(P);
      await P.page.screenshot({ path: join(OUT, `gearveil-${V.id}.png`) }).catch(() => {});
      rec.ok(`${V.id} 1. a cell picked: veiled, the others dimmed (${(l1.others || []).slice(0, 3).join(',')}), the picked bright (${l1.picked}), the X pulses (${l1.xAnim})`,
        l1.veil === '1' && (l1.others || []).length > 0 && l1.others.every((o) => o < 0.5) && l1.picked === 1 && /btCardXPulse/.test(l1.xAnim || ''), l1);
      /* 2. the veiled space puts it down */
      await P.page.evaluate(() => { const r = document.querySelector('[data-gear-tab]'); r.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await P.page.waitForTimeout(500);
      const l2 = await look(P);
      rec.ok(`${V.id} 2. a tap on the veiled space outside any cell puts the pick down`, !l2.state || !l2.state.sel, l2.state);
      /* 3. close and open resets */
      await P.page.evaluate(() => window.__btGearTab.bus.tapCell('sword'));
      await P.page.waitForTimeout(400);
      await P.page.evaluate(() => { const b = document.querySelector('[data-dash-close="open"]'); if (b) b.click(); });
      await P.page.waitForTimeout(800);
      const closedState = await P.page.evaluate(() => window.__btGearTab.state());
      /* v2.3.6681 (card UI2-frame): under the frame Close hides the dashboard and resets neither workspace (the owner's 2026-11-25 master specification), so Gear keeps its pick; the reset below is the old row's (?ui2=0) */
      const frame3 = await P.page.evaluate(() => !!document.querySelector('[data-dash-frame]')).catch(() => false);
      rec.ok(frame3 ? `${V.id} 3. the band closed: Gear keeps its pick (Close resets no workspace)` : `${V.id} 3. the band closed: no pick, All Items`,
        frame3 ? !!closedState.sel && closedState.filter.id === 'sword' : (!closedState.sel && closedState.filter.id === 'all'), closedState);
      rec.ok(`${V.id} 4. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* ══ THE NEW GEAR (the frame's two panels): a pick, the way back, Close keeps it ══
     A tap on a worn cell turns the Inventory into its summary (data-gear-summary,
     data-ws-mode "look"); the same cell again, the summary's ✕ and Esc each
     give the management view back (no pick); Close then open keeps a pick (the
     owner's 2026-11-25 specification: Close resets no workspace).  No veil,
     no dimming, no pulsing ✕ here: those stay in the loop above. */
  const nread = (P) => P.page.evaluate(() => {
    const ws = document.querySelector('[data-gear-ws]'), g = window.__btGearTab;
    return { ws: !!ws, mode: ws ? ws.getAttribute('data-ws-mode') : null, from: ws ? ws.getAttribute('data-ws-from') : null,
      sum: !!document.querySelector('[data-gear-summary]'), veil: !!document.querySelector('[data-gear-veil]'), sel: g && g.state().sel };
  });
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Pick' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    /* the renderer's own clock is slow on this box: tap at the element's middle, then read the page's state before the next tap (TRAPS 200) */
    const press = async (sel) => {
      const b = await P.page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
      if (!b) return false;
      if (V.opts.touch) await P.page.touchscreen.tap(b.x, b.y); else await P.page.mouse.click(b.x, b.y);
      await P.page.waitForTimeout(700);
      return true;
    };
    const CELL = '[data-gear-cell="sword"] [role="button"]';
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'world' });
      await H.pastWelcome(P).catch(() => {});
      await P.page.addStyleTag({ content: '[data-coach-card], [data-coach-ring], .bt-quest-banner, .bt-quest-plate { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'dashboard');
      await P.page.waitForTimeout(800);
      const n0 = await nread(P);
      rec.ok(`new ${V.id} 0. the two panels at rest: management, no summary, no pick`, n0.ws && n0.mode === 'manage' && !n0.sum && !n0.sel, n0);
      await press(CELL);
      const n1 = await nread(P);
      rec.ok(`new ${V.id} 1. a worn cell picked: the summary opens (look), the pick is the sword, no veil over the tab`, n1.mode === 'look' && n1.sum && !!n1.sel && n1.sel.cell === 'sword' && !n1.veil, n1);
      await press(CELL);
      const n2 = await nread(P);
      rec.ok(`new ${V.id} 2. the same cell again: back to management, nothing picked`, n2.mode === 'manage' && !n2.sum && !n2.sel, n2);
      await press(CELL);
      await press('[data-gear-summary] [data-ws-close]');
      const n3 = await nread(P);
      rec.ok(`new ${V.id} 3. the summary's ✕: back to management, nothing picked`, n3.mode === 'manage' && !n3.sum && !n3.sel, n3);
      await press(CELL);
      await P.page.keyboard.press('Escape');
      await P.page.waitForTimeout(700);
      const n4 = await nread(P);
      rec.ok(`new ${V.id} 4. Esc with a summary open: the summary goes, the dashboard stays (the way back is one step)`, n4.mode === 'manage' && !n4.sum && !n4.sel && !!(await P.page.$('[data-dash-frame]')), n4);
      await press(CELL);
      await press('[data-dash-frame] [data-u2="close"]');
      await H.dashOpen(P, 'dashboard');
      await P.page.waitForTimeout(600);
      const n5 = await nread(P);
      rec.ok(`new ${V.id} 5. Close, then open: Gear keeps its pick (Close resets no workspace)`, n5.mode === 'look' && n5.sum && !!n5.sel && n5.sel.cell === 'sword', n5);
      rec.ok(`new ${V.id} 6. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
