/* ═══ ON A COMPUTER, THE BUTTONS A CLICK AIMS AT ARE THE ONES IT REACHES (v2.3.3343) ═══
 *
 * Owner, 2026-10-18: "Make sure all actions/buttons can be completed in
 * landscape mode and on the computer."
 *
 * Two the UI review's numbered pictures (tools/qa/ui-review) marked COVERED on
 * a computer, each a click that landed on something else:
 *   1. at a building's door, the "Enter" button lay under the keyboard-keys
 *      strip (.bt-kb-hints, outside the game's wrap, so it paints over the
 *      prompt whatever the z-index): a click on the button's left half hit a
 *      key chip and hid the strip.  The strip now stands aside while a prompt
 *      is up -- the prompt shows its own key (E) on a computer;
 *   2. the Daily Rewards window's ✕ (and the right of its Season tab) lay in
 *      the minimap's box, under the world map's invisible "open" button: a
 *      click on the ✕ opened the world map.  That button lets clicks through
 *      while the window is up, as it does for every .bt-inspect window.
 * Both by a REAL mouse click (1440 x 900, the game in its centred column).
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };

async function standAt(P, x, bootsY) {
  for (let k = 0; k < 4; k++) {
    const dy = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const g = window.__btPlayerGround ? window.__btPlayerGround() : null;
      return g ? g.y - S.player.y : 0;
    });
    await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
    await P.page.waitForTimeout(700);
    const g = await P.page.evaluate(() => (window.__btPlayerGround ? window.__btPlayerGround() : null));
    if (!g || Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Deskreach', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
    await P.page.waitForTimeout(2000);
    rec.ok('a computer, its keyboard strip up (guard)', await P.page.evaluate(() => matchMedia('(pointer:fine)').matches
      && !!document.querySelector('.bt-kb-hints') && getComputedStyle(document.querySelector('.bt-kb-hints')).display !== 'none'));

    /* 1. the bank's door: the Enter button answers a click on its left half */
    const door = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []).find((d) => d.id === 'bank') || null);
    if (door) await standAt(P, door.x, door.y + 30);
    await P.page.waitForTimeout(1000);
    /* a new bro walking past Mayor Bro gets his welcome, whose backdrop covers
       the screen: put away, as "Not now" does, before the door is judged */
    for (let i = 0; i < 3; i++) {
      const dlg = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg-scrim'));
      if (!dlg) break;
      await P.page.evaluate(() => { const U = window._uiPanels || {}; if (U.quest) U.quest(null); });
      await P.page.waitForTimeout(700);
    }
    const btn = await P.page.evaluate(() => {
      const b = document.querySelector('button.bt-interact-prompt');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const pts = [[0.2, 0.5], [0.5, 0.5], [0.8, 0.5]].map(([fx, fy]) => {
        const el = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        return !!(el && b.contains(el));
      });
      const strip = document.querySelector('.bt-kb-hints');
      return { x: r.left + r.width * 0.25, y: r.top + r.height / 2, text: b.textContent.replace(/\s+/g, ' ').trim(), answers: pts,
        strip: strip ? getComputedStyle(strip).display : 'none' };
    });
    rec.ok('at the bank\'s door the Enter button answers a click anywhere on it (the key strip stands aside)',
      !!btn && btn.answers.every(Boolean) && btn.strip === 'none', btn);
    if (btn) await P.page.mouse.click(btn.x, btn.y);
    await P.page.waitForTimeout(1200);
    const opened = await P.page.evaluate(() => {
      const e = document.querySelector('[data-building-panel]');
      return e ? e.getAttribute('data-building-panel') : null;
    });
    rec.ok('...and a mouse click on its left half opens the bank', opened === 'bank', { opened });
    await P.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open(null));
    await P.page.waitForTimeout(600);

    /* walk away: with no prompt up, the strip is back */
    if (door) await standAt(P, door.x, door.y + 330);
    await P.page.waitForTimeout(800);
    const back = await P.page.evaluate(() => ({ prompt: !!document.querySelector('button.bt-interact-prompt'),
      strip: document.querySelector('.bt-kb-hints') ? getComputedStyle(document.querySelector('.bt-kb-hints')).display : 'gone' }));
    rec.ok('...and away from the door the key strip is back', !back.prompt && back.strip !== 'none', back);

    /* 2. the Daily Rewards window's ✕ */
    await P.page.evaluate(() => window.__btDailyRewards && window.__btDailyRewards.open('season'));
    await P.page.waitForTimeout(1200);
    const x = await P.page.evaluate(() => {
      const c = document.querySelector('[data-daily-close]');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const m = document.querySelector('[data-world-map-open]');
      const mr = m ? m.getBoundingClientRect() : null;
      const inMapBox = !!(mr && r.left < mr.right && r.right > mr.left && r.top < mr.bottom && r.bottom > mr.top);
      /* the middle of the part of the ✕ that lies in the minimap's box: where
         the click went to the map */
      const px = inMapBox ? (Math.max(r.left, mr.left) + Math.min(r.right, mr.right)) / 2 : r.left + r.width / 2;
      const py = inMapBox ? (Math.max(r.top, mr.top) + Math.min(r.bottom, mr.bottom)) / 2 : r.top + r.height / 2;
      const at = document.elementFromPoint(px, py);
      return { x: px, y: py, inMapBox, answers: !!(at && c.contains(at)),
        what: at ? at.tagName.toLowerCase() + (at.getAttribute('data-world-map-open') != null ? '[data-world-map-open]' : '') : null };
    });
    rec.ok('the Daily Rewards ✕ lies in the minimap\'s box (guard: else the next check proves nothing)', !!x && x.inMapBox, x);
    rec.ok('the Daily Rewards ✕ answers a click there, though it lies in the minimap\'s box',
      !!x && x.answers, x);
    if (x) await P.page.mouse.click(x.x, x.y);
    await P.page.waitForTimeout(900);
    const after = await P.page.evaluate(() => ({ window: !!document.querySelector('[data-daily-rewards]'),
      map: !!(window.__btWorldMap && window.__btWorldMap.open) }));
    rec.ok('...and the click closes the window, opening no world map', !after.window && !after.map, after);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
