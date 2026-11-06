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
const openGear = async (P) => { await P.page.evaluate(() => { const b = document.querySelector('[data-nav="dashboard"]'); if (b) b.click(); }); await P.page.waitForTimeout(800); };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Veil' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
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
      rec.ok(`${V.id} 3. the band closed: no pick, All Items`, !closedState.sel && closedState.filter.id === 'all', closedState);
      rec.ok(`${V.id} 4. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
