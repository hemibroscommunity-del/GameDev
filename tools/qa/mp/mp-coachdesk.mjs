/* ═══ THE COACH CARDS ON A COMPUTER, CLEAR OF WHAT THEY TALK ABOUT (v2.3.3782, v2.3.3812) ═══
 *
 * The QA play-through of the judges' path (2026-10-28): on a computer playing
 * wide, the GEAR UP coach card lay across the pinned quest card's body line
 * (v2.3.3782).  Lane A's judge pass (v2.3.3812, 1440 x 900 and 1280 x 720,
 * the first two minutes): "SAVE YOUR LOGIN KEY" and "YOUR REWARD" still on
 * the quest card, text over text; the WELCOME plate over the Town Hall and
 * Mayor Bro, the very one it tells you to find; its "Follow the gold road"
 * sending players to look for a road in the world; and the chat's header
 * saying "TAP TO CLOSE" on a computer.
 *
 * A computer playing wide at 1440 x 900 and at 1280 x 720, then an upright
 * phone (390 x 844) to show nothing moved there:
 *   1. the WELCOME plate: its words name the map's gold line; on a computer
 *      clear of Mayor Bro; upright where it always was (its top at
 *      max(26%, 150 px));
 *   2. Mayor Bro's first quest taken (the pinned quest card shows);
 *   3. GEAR UP (the dev kit's weapons in the stash) clear of the quest card;
 *   4. SAVE YOUR LOGIN KEY (the lessons before it seeded as done, a shield on
 *      the arm) clear of the quest card, on the screen;
 *   5. the chat's header says "Click to close" on a computer, "Tap" on a
 *      phone;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/coachdesk-<view>-*.png. */
import * as H from './harness.mjs';

const VIEWS = [
  { id: '1440', viewport: { width: 1440, height: 900 }, desk: true },
  { id: '1280x720', viewport: { width: 1280, height: 720 }, desk: true },
  { id: 'phone', viewport: { width: 390, height: 844 }, desk: false },
];
/* every lesson before the login key, done (QuestCoach.jsx LESSONS) */
const BEFORE_KEY = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'points', 'chatTap'];

const rectOf = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return b.width > 0 ? { l: b.left, r: b.right, t: b.top, b: b.bottom } : null;
}, sel);
const crosses = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const fmt = (b) => (b ? `${Math.round(b.l)}-${Math.round(b.r)} x ${Math.round(b.t)}-${Math.round(b.b)}` : 'none');

/* a coach card whose words match `re`, as drawn */
async function cardFor(P, re, ms) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const c = await P.page.evaluate(() => {
      const el = document.querySelector('[data-coach-card]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return b.width > 0 ? { id: el.getAttribute('data-coach-card'), text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 120), l: b.left, r: b.right, t: b.top, b: b.bottom, vw: innerWidth, vh: innerHeight } : null;
    });
    if (c && re.test(c.text)) return c;
    await P.page.waitForTimeout(400);
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = H.REPO + '/tools/qa/mp/out';
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Coach' + V.id.replace(/\D/g, '').slice(0, 4), wsPort, webPort, viewport: V.viewport,
      ...(V.desk ? { wide: true } : { touch: true }), world: 'wheel' });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const shot = (name) => P.page.screenshot({ path: `${OUT}/coachdesk-${V.id}-${name}.png` }).catch(() => {});
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      const me = await H.readState(P, (S) => S.myId);

      /* 1. the WELCOME plate, and Mayor Bro as drawn */
      let wel = null;
      for (let i = 0; i < 40 && !wel; i++) {
        wel = await P.page.evaluate(() => {
          const w = document.querySelector('[data-quest-banner="welcome"] .bt-quest-plate');
          if (!w) return null;
          const b = w.getBoundingClientRect();
          if (!(b.width > 0)) return null;
          const S = window._gameState.current;
          const n = (S.npcs || []).find((o) => o.id === 'mayor_bro');
          const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
          const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
          const m = n ? { l: cv.left + (n.x - S.camera.x - 30) * sx, r: cv.left + (n.x - S.camera.x + 30) * sx,
            t: cv.top + (n.y - S.camera.y - 120) * sy, b: cv.top + (n.y - S.camera.y + 10) * sy } : null;
          const parent = w.parentElement.getBoundingClientRect();
          return { plate: { l: b.left, r: b.right, t: b.top, b: b.bottom }, mayor: m, text: (w.innerText || '').replace(/\s+/g, ' '),
            top: parseFloat(getComputedStyle(w).top) || 0, layerH: parent.height };
        });
        if (!wel) await P.page.waitForTimeout(250);
      }
      await shot('1-welcome');
      rec.ok(`${V.id} 1. the WELCOME plate names the map's gold line ("${wel && wel.text}")`,
        !!wel && /gold line on your map/.test(wel.text) && !/gold road/.test(wel.text) && (V.desk ? /click him/.test(wel.text) : /tap him/.test(wel.text)), wel);
      if (V.desk) {
        rec.ok(`${V.id} 1. ...clear of Mayor Bro (plate ${fmt(wel && wel.plate)}, Mayor ${fmt(wel && wel.mayor)})`,
          !!wel && !!wel.mayor && !crosses(wel.plate, wel.mayor), wel);
      } else {
        const want = Math.max(0.26 * (wel ? wel.layerH : 0), 150);
        /* (its `top` as set: the drawn box carries the plate's own transform) */
        rec.ok(`${V.id} 1. ...upright where it always was (its top ${wel && Math.round(wel.top)} px, max(26%, 150 px) = ${Math.round(want)})`,
          !!wel && Math.abs(wel.top - want) <= 1, wel);
      }

      /* 2. the first quest, pinned */
      await H.approachNpc(P, 'mayor_bro');
      await H.acceptQuestFromGiver(P).catch(() => null);
      await H.leaveNpc(P, 'mayor_bro').catch(() => {});
      await P.page.waitForTimeout(1500);
      const hud = await rectOf(P, '[data-quest-hud]');
      rec.ok(`${V.id} 2. the pinned quest card shows (${fmt(hud)})`, !!hud, hud);

      /* 3. GEAR UP */
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
      const gear = await cardFor(P, /gear up/i, 30000);
      const hud3 = await rectOf(P, '[data-quest-hud]');
      await shot('3-gearup');
      rec.ok(`${V.id} 3. GEAR UP (${fmt(gear)}) clear of the quest card (${fmt(hud3)})`, !!gear && !crosses(gear, hud3), { gear, hud3 });

      /* 4. SAVE YOUR LOGIN KEY: every lesson before it done, a shield on */
      await P.page.evaluate((ids) => {
        const o = {}; for (const k of ids) o[k] = true;
        try { localStorage.setItem('bt_coach_v1', JSON.stringify(o)); } catch (e) { /* none */ }
      }, BEFORE_KEY);
      await P.page.reload();
      await H.enterWorld(P).catch(() => null);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world again' }).catch(() => null);
      await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.rpg && !S.rpg.shield) S.rpg.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'pine' }; });
      const key = await cardFor(P, /login key/i, 40000);
      const hud4 = await rectOf(P, '[data-quest-hud]');
      await shot('4-loginkey');
      rec.ok(`${V.id} 4. SAVE YOUR LOGIN KEY (${fmt(key)}) clear of the quest card (${fmt(hud4)}) and on the screen`,
        !!key && !crosses(key, hud4) && key.l >= 0 && key.r <= key.vw && key.t >= 0 && key.b <= key.vh, { key, hud4 });

      /* 5. the chat's header */
      await P.page.evaluate(() => { const b = document.querySelector('[data-world-chat-toggle]'); if (b) b.click(); });
      await P.page.waitForTimeout(600);
      const hint = await P.page.evaluate(() => { const h = document.querySelector('[data-world-chat-hint]'); return h ? h.textContent.trim() : null; });
      rec.ok(`${V.id} 5. the chat's header says "${hint}"`, hint == null || (V.desk ? /^Click to close$/i.test(hint) : /^Tap to close$/i.test(hint)), hint);

      rec.ok(`${V.id} 6. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
