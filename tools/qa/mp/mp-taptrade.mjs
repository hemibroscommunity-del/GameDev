/* ═══ TRADE FROM THE MENU A TAP ON A PLAYER OPENS (v2.3.4931) ═══
 *
 * The owner, 2026-11-12: "Also add trading to the character menu when you tap
 * another player."  (He had just said trading was hard to use.)
 *
 * What a tap on another player opens depends on where you stand (BroTown.jsx,
 * the world tap: otherPlayerAtCss):
 *   - on BroTown's safe ground, the player card (InspectPlayerPanel), whose
 *     Trade tile has opened a trade since v2.3.1132;
 *   - one step out of town, in No man's land (it begins just outside town,
 *     v2.3.3690), the small "Attack <name>?" window (NmlAskCard, v2.3.3253)
 *     -- Attack / Party / Ignore, and NO Trade: the menu he got.
 * Two upright touch phones (390 x 844, every tap a real touch), Tradetap
 * tapping Tradee's body as a player does, then a computer (a real mouse):
 *   1. in BroTown a tap on Tradee opens the player card, its Trade tile on
 *      the screen and on top (a tap on it lands on it);
 *   2. its Trade, tapped: Tradee is asked, taps "Open trade", and BOTH phones
 *      show the trade window ("Trading with ..."); closed;
 *   3. out in No man's land a tap on Tradee opens the small window, now
 *      Attack / Party / Trade / Ignore in the same small window (each 57 px:
 *      wider put a computer's under the minimap), on top,
 *      at the top of the screen; no aim taken;
 *   4. its Trade, tapped: the window goes, nothing is aimed or attacked (no
 *      skull), Tradee is asked, opens it, and BOTH phones show the trade
 *      window; closed;
 *   5. a computer standing there clicks Tradee: the same window, and its
 *      Trade, clicked, asks Tradee too;
 *   6. no page errors.
 * Pictures (deviceScaleFactor 1): tools/qa/mp/out/taptrade-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const VIEW = { width: 1000, height: 780 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `taptrade-${name}.png`) }); } catch (e) { /* a picture only */ } };

/* where on a page another player stands (the tap handler's own arithmetic,
   mp-nmlask's) */
const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

/* a real touch (a phone) or click (a computer) on another player's body */
async function tapPeer(P, id, mouse = false) {
  const pt = await peerOnScreen(P, id);
  if (!pt) return false;
  /* the body, about 20 px over the feet: where a thumb aims at a bro */
  if (mouse) await P.page.mouse.click(pt.x, pt.y - 20);
  else await P.page.touchscreen.tap(pt.x, pt.y - 20);
  await P.page.waitForTimeout(900);
  return true;
}

/* an element's middle, and whether a press there lands on it */
const spotOf = (P, sel) => P.page.evaluate((s) => {
  const b = [...document.querySelectorAll(s)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { x, y, w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top), b: Math.round(r.bottom),
    onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    onTop: !!top && (top === b || b.contains(top)), vh: innerHeight };
}, sel);
async function press(P, sel, mouse = false) {
  const at = await spotOf(P, sel);
  if (!at) return null;
  if (mouse) await P.page.mouse.click(at.x, at.y);
  else await P.page.touchscreen.tap(at.x, at.y);
  return at;
}

/* the small window, as the page has it */
const readAsk = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-nml-ask]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    why: el.getAttribute('data-nml-ask'), id: el.getAttribute('data-nml-ask-id'),
    name: ((el.querySelector('[data-nml-ask-name]') || {}).textContent || '').trim(),
    l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), vh: innerHeight, vw: innerWidth,
    btns: [...el.querySelectorAll('button')].filter((b) => !b.hasAttribute('data-nml-ask-info')).map((b) => {
      const q = b.getBoundingClientRect();
      const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      const onTop = !!top && (top === b || b.contains(top));
      return { t: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height), onTop,
        over: onTop || !top ? null : top.tagName.toLowerCase() + (typeof top.className === 'string' && top.className ? '.' + top.className.split(' ').join('.') : '') + [...top.attributes].filter((x) => /^data-/.test(x.name)).map((x) => '[' + x.name + ']').join('') };
    }),
  };
});

/* the trade window on a page: the drawer's title and the bag bus */
const tradeView = (P) => P.page.evaluate(() => {
  const d = document.querySelector('[data-trade-drawer]');
  const t = d && d.querySelector('[data-trade-title]');
  return { drawer: d ? d.getAttribute('data-trade-drawer') : null, title: t ? t.textContent.trim() : '', open: !!(window.__broTradeBagBus && window.__broTradeBagBus.open) };
});
async function waitTrade(P, pred, ms = 20000) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await tradeView(P);
    if (pred(v)) return v;
    await P.page.waitForTimeout(250);
  }
  return v;
}
/* Tradee answers the request with a real touch on "Open trade" */
async function acceptTrade(P) {
  const ok = await H.waitUi(P, () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Open trade' && b.getBoundingClientRect().width > 0),
    { label: 'trade invite', timeout: 20000 }).then(() => true).catch(() => false);
  if (!ok) return false;
  const at = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Open trade' && e.getBoundingClientRect().width > 0);
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await P.page.touchscreen.tap(at.x, at.y);
  return true;
}
/* both close the trade (the drawer's ✕, Esc's button) */
async function closeTrades(...Ps) {
  for (const P of Ps) {
    await P.page.evaluate(() => { const x = document.querySelector('[data-trade-drawer] [data-esc]'); if (x) x.click(); });
    await P.page.waitForTimeout(500);
  }
  for (const P of Ps) await waitTrade(P, (v) => !v.drawer, 8000);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Tradetap', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Tradee', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  await H.enterWorld(B);
  let C = null;
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* real input on a loop: a page logs itself out after two minutes without any */
  let stopAlive = false;
  const keepAlive = (P) => (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.waitMutualSight(A, B);
    keepAlive(A); keepAlive(B);
    const idA = await H.readState(A, (S) => S.myId);
    const idB = await H.readState(B, (S) => S.myId);
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.trade2 && S._serverCaps.nomansland));
    rec.ok('setup: two phones in BroTown, the worker trades two-sided and plays No man\'s land', caps, { caps });
    if (!caps) return;
    for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 10 });
    /* any card a focus tap left up */
    for (const P of [A, B]) await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-close'); if (c) c.click(); });
    /* the quest's banners, and the new-monster card (run 3: a first sight of a
       land's monster put its card over the window the moment it came up) */
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]), [data-new-monster] { visibility: hidden !important; }' }).catch(() => {});
    await A.page.waitForTimeout(1200);

    /* ── 1. BroTown: side by side, as two players stand to trade -- inside
       Tradetap's own self-chat circle (52 world px), which took this tap and
       opened Tradetap's CHAT before v2.3.4931 ── */
    const me1 = await H.serverPlayer(wsPort, idA);
    await H.hopTo(B, me1.x + 34, me1.y, { tries: 30, step: 40 });
    await B.page.waitForTimeout(2000);
    const bar1 = await H.readState(A, (S) => {
      const o = Object.values(S.others || {})[0];
      return { zone: S.currentZone, nml: S._nmlLevel || 0, apart: o ? Math.round(Math.hypot(o.renderX - S.player.x, o.renderY - S.player.y)) : null };
    });
    await tapPeer(A, idB);
    await A.page.waitForSelector('.bt-inspect-card', { timeout: 6000 }).catch(() => null);
    const t1 = await spotOf(A, '.bt-inspect-card [data-act="trade"]');
    const chat1 = await A.page.evaluate(() => [...document.querySelectorAll('input, textarea')].some((e) => /Say something/i.test(e.placeholder || '') && e.getBoundingClientRect().width > 0));
    await shot(A, '1-town-card');
    rec.ok(`1. in BroTown (No man's land ${bar1.nml}), Tradee ${bar1.apart} px beside: a tap on Tradee opens the player card (not the chat: ${chat1}), its Trade on the screen and on top (${t1 && t1.w}x${t1 && t1.h} at ${t1 && t1.t}-${t1 && t1.b} of ${t1 && t1.vh})`,
      bar1.zone === 'wheel' && bar1.nml === 0 && bar1.apart != null && bar1.apart <= 48 && !!t1 && t1.onScreen && t1.onTop && !chat1, { bar1, t1, chat1 });

    /* ── 2. its Trade ── */
    await press(A, '.bt-inspect-card [data-act="trade"]');
    const asked2 = await acceptTrade(B);
    const v2a = await waitTrade(A, (v) => /^Trading with/.test(v.title));
    const v2b = await waitTrade(B, (v) => /^Trading with/.test(v.title));
    await shot(A, '2-town-trade-a');
    await shot(B, '2-town-trade-b');
    rec.ok(`2. its Trade, tapped: Tradee is asked and opens it, and BOTH phones show the trade window ("${v2a && v2a.title}" / "${v2b && v2b.title}")`,
      asked2 && /^Trading with Tradee/.test(v2a.title) && /^Trading with Tradetap/.test(v2b.title), { asked2, v2a, v2b });
    await closeTrades(A, B);

    /* ── out to No man's land: past the Mayor's gate, a dry, quiet spot just
       outside town (the nmlask way, on the ring the town gives onto) ── */
    for (const P of [A, B]) await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await A.page.waitForTimeout(1500);
    await H.devOp(wsPort, 'quests', idA);
    await H.devOp(wsPort, 'quests', idB);
    const G = await H.wheelGeom();
    const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
    let spot = null;
    for (const sid of Object.keys(G.W.byId).filter((k) => typeof G.W.byId[k].ux === 'number')) {
      const s = G.W.byId[sid];
      for (const r of [NML.SAFE_R + 300, NML.SAFE_R + 600, NML.SAFE_R + 900]) {
        const x = Math.round(G.cx + s.ux * r), y = Math.round(G.cy + s.uy * r);
        await H.hopTo(A, x, y, { tries: 90 });
        await A.page.waitForTimeout(1200);
        const ok = await A.page.evaluate(({ x, y }) => {
          const S = window._gameState.current;
          const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
          let clear = true;
          for (let k = 0; k <= 70; k += 10) clear = clear && dry(x + k, y);
          const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 260).length;
          return { clear, near, d: Math.round(Math.hypot(S.player.x - x, S.player.y - y)) };
        }, { x, y });
        if (ok.clear && ok.near === 0 && ok.d < 80) { spot = { sid, x, y }; break; }
      }
      if (spot) break;
    }
    rec.ok(`setup: a dry, quiet spot just out of town (${spot ? `${spot.sid} ${spot.x},${spot.y}` : 'none'})`, !!spot, spot);
    if (!spot) return;
    await H.hopTo(B, spot.x + 70, spot.y, { tries: 90 });
    await B.page.waitForTimeout(2500);
    /* the monsters that wandered close, gone (mp-nmlask's clearNear): a
       monster under the finger beats a player (run 1: one at Tradee's feet
       took the tap) */
    const clearNear = async (P, pid) => {
      const ids = await P.page.evaluate(() => { const S = window._gameState.current; return (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - S.player.x, m.y - S.player.y) < 600).map((m) => m.id); });
      for (const mid of ids) await H.devOp(wsPort, 'hurt', pid, { id: mid, dmg: 10000000 });
      await P.page.waitForTimeout(400);
      await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
    };
    const lv3 = [await H.readState(A, (S) => S._nmlLevel || 0), await H.readState(B, (S) => S._nmlLevel || 0)];

    /* ── 3. a tap in No man's land: the small window, with Trade ── */
    let a3 = null;
    for (let tries = 0; tries < 3 && !a3; tries++) {
      await clearNear(A, idA);
      await tapPeer(A, idB);
      for (let i = 0; i < 12 && !(a3 = await readAsk(A)); i++) await A.page.waitForTimeout(250);
    }
    /* read again once the tap has settled (run 2: every button read as
       covered the moment the window came up, yet the real tap on Trade in
       step 4 landed) */
    if (a3) { await A.page.waitForTimeout(800); a3 = (await readAsk(A)) || a3; }
    const lock3 = await H.readState(A, (S) => (S.lockedTarget ? S.lockedTarget.type + ':' + S.lockedTarget.id : null));
    const card3 = await A.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
    await shot(A, '3-nml-window');
    rec.ok(`3. out of town (No man's land ${lv3.join(' / ')}) a tap on Tradee opens "${a3 && a3.name}" (${a3 && a3.why}), not the card: ${a3 && a3.btns.map((b) => b.t).join(' / ')}`,
      lv3[0] >= 1 && lv3[1] >= 1 && !!a3 && a3.why === 'tap' && a3.id === idB && !card3 && a3.btns.map((b) => b.t).join('|') === 'Attack|Party|Trade|Ignore', { lv3, a3, card3 });
    rec.ok(`3. ...each button a thumb's size and on top (${a3 && a3.btns.map((b) => b.w + 'x' + b.h).join(', ')}), the window ${a3 && a3.w} px at the top, no aim taken`,
      !!a3 && a3.btns.every((b) => b.w >= 54 && b.h >= 40 && b.onTop) && a3.w <= 272 && a3.l >= 8 && a3.r <= a3.vw - 8 && a3.b <= a3.vh * 0.45 && !lock3, { a3, lock3 });

    /* ── 4. its Trade ── */
    await press(A, '[data-nml-ask-trade]');
    await A.page.waitForTimeout(500);
    const gone4 = !(await readAsk(A));
    const asked4 = await acceptTrade(B);
    const v4a = await waitTrade(A, (v) => /^Trading with/.test(v.title));
    const v4b = await waitTrade(B, (v) => /^Trading with/.test(v.title));
    const fight4 = await H.readState(A, (S) => ({ lock: S.lockedTarget ? S.lockedTarget.type : null, red: (S._nmlSelf && S._nmlSelf.red) || 0, skull: S._pvpSkullType || null }));
    await shot(A, '4-nml-trade-a');
    await shot(B, '4-nml-trade-b');
    rec.ok(`4. its Trade, tapped: the window goes, nothing aimed or attacked (${JSON.stringify(fight4)}), Tradee is asked and opens it, and BOTH phones show the trade window ("${v4a && v4a.title}" / "${v4b && v4b.title}")`,
      gone4 && asked4 && !fight4.lock && !fight4.red && !fight4.skull && /^Trading with Tradee/.test(v4a.title) && /^Trading with Tradetap/.test(v4b.title), { gone4, asked4, fight4, v4a, v4b });
    await closeTrades(A, B);

    /* ── 5. a computer: a click on Tradee, and the window's Trade clicked ── */
    C = await H.newPlayer(browser, { name: 'Tradedesk', wsPort, webPort, world: 'wheel', viewport: VIEW, wide: true, dpr: 1 });
    C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(C);
    keepAlive(C);
    const idC = await H.readState(C, (S) => S.myId);
    await H.devOp(wsPort, 'quests', idC);
    await H.devOp(wsPort, 'vitals', idC, { heal: true, god: true, godMinutes: 10 });
    await H.hopTo(C, spot.x + 70, spot.y + 90, { tries: 90 });
    await C.page.waitForTimeout(2500);
    await C.page.evaluate(() => { const c = document.querySelector('.bt-inspect-close'); if (c) c.click(); if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
    await C.page.waitForTimeout(600);
    let c5 = null;
    for (let tries = 0; tries < 3 && !(c5 && c5.id === idB); tries++) {
      await clearNear(C, idC);
      await tapPeer(C, idB, true);
      for (let i = 0; i < 12 && !(c5 = await readAsk(C)); i++) await C.page.waitForTimeout(250);
    }
    await shot(C, '5-desk-window');
    const clicked5 = c5 ? await press(C, '[data-nml-ask-trade]', true) : null;
    const invite5 = await H.waitUi(B, () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Open trade' && b.getBoundingClientRect().width > 0),
      { label: 'desk trade invite', timeout: 20000 }).then(() => true).catch(() => false);
    rec.ok(`5. a computer's click on Tradee opens the same window (${c5 && c5.btns.map((b) => b.t).join(' / ')}), and its Trade, clicked, asks Tradee`,
      !!c5 && c5.id === idB && c5.btns.some((b) => b.t === 'Trade') && !!clicked5 && invite5, { c5, clicked5: !!clicked5, invite5 });
    await B.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Decline'); if (b) b.click(); });

    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
    if (C) await C.ctx.close().catch(() => {});
  }
}
