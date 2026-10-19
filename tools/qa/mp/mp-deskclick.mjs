/* ═══ A CLICK ON SOMETHING YOU USE IS NOT A SWING, AND THE PRIZE FLIES TO THE BAG (v2.3.3470) ═══
 *
 * Owner, 2026-10-18, on a computer: "when you click on a resource on pc it
 * tries to do a combat swing first (or at least plays the combat audio). I
 * hear a bow shot every time I click on an ore to harvest it", "I'm having
 * trouble of the combat swings while interacting with different objects in
 * the world including farming plots too", and "the jump to bag also flies off
 * screen (to far left where black area is not where bag area is)".
 *
 * A mouse's press armed the attack at once (the canvas's onMouseDown: the aim,
 * a swing, a bow's arrow along the cursor and its draw), and only the click
 * that follows the release found the ore, the bed or the townsperson.  Now the
 * press asks the click's own question first (BroTown `_deskPressTarget`), and
 * the harvest's prize flies from where the game is drawn to where the bag is
 * (lifeSkillRewards.js `bagFlightTarget`).
 *
 * On a computer (1280 x 800, a mouse), in the Wheel:
 *   1. guard: a real click on empty ground is still the attack -- a sword
 *      swings -- and one on a prop (a lamp, a bench, a barrel: not something
 *      a click uses) a bow looses at (an arrow, its draw heard; with nothing
 *      in its sight on bare ground the bow holds, as it always has)
 *   2. a bow in hand, a real click on a copper vein in reach starts mining,
 *      and nothing of the attack happens: no arrow, no draw, no swing
 *   3. ...the mining finished (E held), the worker pays the ore, and the
 *      ore's flight starts on the vein, inside the game's column, and ends on
 *      the bag -- never in the black margin
 *   4. a sword in hand, a real click on a tree in reach starts chopping, no
 *      swing
 *   5. a real click on Ace talks to him (his coin flip), no swing
 *   6. an XP label flies from you to its card inside the game's column (it
 *      was drawn the column's left edge too far right, past it)
 *   7. the farm: a real click on a bed in reach works it (the dig is sent),
 *      no swing; a press while kneeling arms nothing
 *   9. ("I can't hear footsteps on pc") a walk's footsteps play
 *      BT_AUDIO.DESK_STEP_K (2.5x) as loud as a phone's (gameDisplay.js:
 *      under the music on a computer's speakers)
 * and on a phone (390 x 844, touch):
 *   8. a harvest's prize still starts on the vein and lands on the bag;
 *  10. its footsteps at the phone's own level, unchanged.
 */
import * as H from './harness.mjs';
import { FARM_BEDS } from '../../../src/data/farmLayout.js';

const DESK = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130] };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (mp-farmwalk) */
/* a click held as a hand holds one -- long enough for the attack loop to
   loose an arrow on a box drawing a few frames a second, as it did on the
   owner's computer (the old press armed it and the loop shot while held) */
const PRESS_MS = 400;

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};
const sumPrefix = (inv, pre) => Object.keys(inv || {}).filter((k) => k.indexOf(pre) === 0).reduce((n, k) => n + (inv[k] || 0), 0);
const paidSince = async (P, wsPort, myId, pre, before) => {
  let got = 0;
  for (let i = 0; i < 30 && got <= 0; i++) {
    got = sumPrefix(await srvInv(wsPort, myId), pre) - before;
    if (got <= 0) await P.page.waitForTimeout(400);
  }
  return got;
};

async function nearest(P, type, used) {
  return P.page.evaluate(([t, sk]) => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1 || sk.includes(n.id)) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  }, [type, used]);
}

async function goTo(P, x, y, ms) {
  await H.hopTo(P, x, y);
  await P.page.waitForTimeout(ms);
  await H.closeNpcDialogue(P).catch(() => {});
}

async function arrive(P, wsPort) {
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
    (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 150000, label: 'into the Wheel, its nodes in' }).catch(() => null);
  for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
    (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
  /* the review is of the clicks: the tutorial's cards and banners stand aside */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return { myId, inW };
}

/* a world point (game px) on the page, and what is on top there */
const pagePoint = (P, wx, wy) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const px = cv.left + (x - S.camera.x) * S._worldScaleX, py = cv.top + (y - S.camera.y) * S._worldScaleY;
  const top = document.elementFromPoint(px, py);
  return { x: Math.round(px), y: Math.round(py), top: top ? top.tagName : null };
}, [wx, wy]);

/* everything of the attack from now on, watched every frame: a swing (the
   swing's clock moved), an arrow made, the bow's shot heard (bowLoose since
   v2.3.3498, the draw's squeak gone), the attack held */
const watchAttack = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const st = window.__btCues && window.__btCues.stats;
  const w = { auto: false, swing0: S.swingTimer || 0, arrows: 0, seen: new Set(S.arrows || []),
    draw0: st && st.played ? (st.played.bowLoose || 0) : 0, frames: 0 };
  window.__btDeskPress = null;
  window.__dcWatch = w;
  const tick = () => {
    if (window.__dcWatch !== w) return;
    w.frames++;
    if (S.autoAttack) w.auto = true;
    for (const a of S.arrows || []) if (!w.seen.has(a)) { w.seen.add(a); w.arrows++; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const readWatch = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const w = window.__dcWatch, st = window.__btCues && window.__btCues.stats;
  window.__dcWatch = null;
  if (!w) return null;
  for (const a of S.arrows || []) if (!w.seen.has(a)) { w.seen.add(a); w.arrows++; }
  return { auto: w.auto, swung: (S.swingTimer || 0) !== w.swing0, arrows: w.arrows, frames: w.frames,
    draws: (st && st.played ? (st.played.bowLoose || 0) : 0) - w.draw0,
    press: window.__btDeskPress ? window.__btDeskPress.kind : null };
});
const quiet = (w) => !!w && !w.auto && !w.swung && w.arrows === 0 && w.draws === 0;

/* v2.3.3470: the footsteps a short walk plays, by the volume each step was
   played at (BT_AUDIO.play's own `vol`) */
async function stepVolumes(P) {
  await P.page.evaluate(() => {
    const A = window.BT_AUDIO;
    window.__dcSteps = [];
    if (!A.__dcPlay) {
      const op = A.play;
      A.__dcPlay = op;
      A.play = function (key, opts) {
        if (/^(step-|footstep-)/.test(String(key))) (window.__dcSteps || []).push(+((opts && opts.vol) || 0).toFixed(4));
        return op.call(this, key, opts);
      };
    }
    const a = document.activeElement; if (a && a.blur) a.blur();
  });
  await P.page.keyboard.down('d'); await P.page.waitForTimeout(1600); await P.page.keyboard.up('d');
  await P.page.keyboard.down('a'); await P.page.waitForTimeout(1600); await P.page.keyboard.up('a');
  await P.page.waitForTimeout(300);
  return P.page.evaluate(() => ({ vols: (window.__dcSteps || []).slice(), k: window.BT_AUDIO._deskStepK ? window.BT_AUDIO._deskStepK() : null }));
}

/* the game's column, and the canvas in it */
const column = (P) => P.page.evaluate(() => {
  const r = document.getElementById('root').getBoundingClientRect();
  const c = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const bag = document.querySelector('[aria-label="Bag"]');
  const b = bag ? bag.getBoundingClientRect() : null;
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, cv: { l: c.left, r: c.right, t: c.top, b: c.bottom },
    bag: b && b.width > 1 ? { x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left, r: b.right, t: b.top, b: b.bottom } : null };
});
const lastFlight = (P) => P.page.evaluate(() => { const f = window.__btBagFlights || []; return f.length ? f[f.length - 1] : null; });
const inBox = (p, b, pad = 0) => !!p && p[0] >= b.l - pad && p[0] <= b.r + pad && p[1] >= b.t - pad && p[1] <= b.b + pad;

/* hold E until the harvest in hand is done (mp-deskharvest's step 1) */
async function finishByE(P) {
  await P.page.keyboard.down('e');
  const done = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : 'gone'), (v) => v === 'gone',
    { timeout: 90000, label: 'held E finishes it' }).catch(() => 'timeout');
  await P.page.keyboard.up('e');
  return done;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ A COMPUTER ═══ */
  const P = await H.newPlayer(browser, { name: 'Clickhand', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  const used = [];
  try {
    const { myId, inW } = await arrive(P, wsPort);
    /* every quest done: no Mayor's welcome over the screen, the farm's deed */
    await H.devOp(wsPort, 'quests', myId).catch(() => {});
    const armed = await H.armWorker(P, wsPort, myId, ['bow']);
    const sw = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.waitForTimeout(1200);
    const desk = await P.page.evaluate(() => matchMedia('(pointer:fine)').matches && !!window._gameState.current._isDesktop);
    rec.ok('a computer is in the Wheel with its tools, a bow and a sword (guard)', !!inW && desk && armed.includes('bow') && sw.ok, { inW, desk, armed, sw });
    const hold = (kind) => (kind === 'bow' ? H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged') : H.equipWeapon(P, 'greatsword', 'weapon', 'melee'));

    /* ── 1. guard: on empty ground, or at a prop, the press is the attack ── */
    {
      await H.closeNpcDialogue(P).catch(() => {});
      const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const at = await pagePoint(P, me.x - 160, me.y + 150);
      await hold('sword');
      await P.page.waitForTimeout(500);
      await watchAttack(P);
      await P.page.mouse.click(at.x, at.y, { delay: PRESS_MS });
      await P.page.waitForTimeout(900);
      const ws = await readWatch(P);
      rec.ok(`1. guard: a click on empty ground (on the ${at.top}) is the attack -- the sword swings (the press: ${ws && ws.press})`,
        at.top === 'CANVAS' && !!ws && ws.press === 'attack' && ws.swung, { at, ws });
      /* a prop that is not a building, what a bow looses at (its sight opens
         on a prop on the arrow's ground track, v2.3.3206): the nearest of the
         town's own, walked to, then clicked from 170 px south of it */
      const PROPS = ['barrel', 'crate', 'lamp', 'bench', 'trough', 'hitch', 'noticeboard', 'well', 'cart', 'signpost', 'haybale'];
      const findProp = () => P.page.evaluate((ids) => {
        const S = window._gameState.current, W = window.__btWheelObjects;
        const boxes = W.blockers();
        let best = null;
        for (const o of W.near(S.player.x, S.player.y, 1600)) {
          if (ids.indexOf(o.id) < 0) continue;
          const b = boxes.find((q) => q.oi === o.i);
          if (!b) continue;
          const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
          const d = Math.hypot(cx - S.player.x, cy - S.player.y);
          if (!best || d < best.d) best = { id: o.id, oi: o.i, cx, cy, y1: b.y1, d: Math.round(d) };
        }
        return best;
      }, PROPS);
      let prop = await findProp();
      if (prop) {
        await goTo(P, prop.cx, prop.y1 + 170, 1200);
        prop = (await findProp()) || prop;
      }
      const pt = prop ? await pagePoint(P, prop.cx, prop.cy) : null;
      await hold('bow');
      await P.page.waitForTimeout(600);
      await watchAttack(P);
      if (pt) await P.page.mouse.click(pt.x, pt.y, { delay: PRESS_MS });
      await P.page.waitForTimeout(1200);
      const wb = await readWatch(P);
      rec.ok(`1. guard: a click on a ${prop && prop.id} ${prop && prop.d} px off (on the ${pt && pt.top}) is the attack -- the bow looses at it (${wb && wb.arrows} arrow, ${wb && wb.draws} draw; the press: ${wb && wb.press})`,
        !!pt && pt.top === 'CANVAS' && !!wb && wb.press === 'attack' && (wb.arrows > 0 || wb.draws > 0), { prop, pt, wb });
    }

    /* ── 9. footsteps a computer can hear ── */
    {
      const st = await stepVolumes(P);
      const v = st.vols;
      rec.ok(`9. a computer's footsteps play ${st.k}x a phone's: ${v.length} steps at ${v.length ? Math.min(...v) : '-'}-${v.length ? Math.max(...v) : '-'} (a phone's 0.13-0.20)`,
        st.k === 2.5 && v.length >= 3 && v.every((x) => x >= 0.13 * 2.5 * 0.98 && x <= 0.2 * 2.5 * 1.02), st);
    }

    /* ── 2-3. a bow in hand, a click on a copper vein ── */
    {
      const node = await nearest(P, 'oreVein', used);
      used.push(node && node.id);
      await goTo(P, node.x + STAND.oreVein[0], node.y + STAND.oreVein[1], 1500);
      await hold('bow');
      await P.page.waitForTimeout(600);
      const before = sumPrefix(await srvInv(wsPort, myId), 'ore_');
      const flights0 = await P.page.evaluate(() => (window.__btBagFlights || []).length);
      const at = await pagePoint(P, node.x, node.y - 40);
      await watchAttack(P);
      await P.page.mouse.click(at.x, at.y, { delay: PRESS_MS });
      const st = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'mining', { timeout: 6000, label: 'mining starts' }).catch(() => null);
      await P.page.waitForTimeout(700);
      const w = await readWatch(P);
      rec.ok(`2. a bow in hand, a real click on a copper vein in reach (on the ${at.top}) starts mining (${st}) and nothing of the attack happens: ${w && w.arrows} arrows, ${w && w.draws} draws, swing ${w && w.swung}, attack held ${w && w.auto} (the press: ${w && w.press})`,
        at.top === 'CANVAS' && st === 'mining' && quiet(w) && w.press === 'gather', { at, st, w });
      const done = await finishByE(P);
      const got = await paidSince(P, wsPort, myId, 'ore_', before);
      const fl = await H.waitFor(P, () => (window.__btBagFlights || []).length, (n) => n > flights0, { timeout: 8000, label: 'the ore flies' }).catch(() => 0);
      const f = await lastFlight(P);
      const col = await column(P);
      const vein = await pagePoint(P, node.x, node.y);
      const toBag = !!f && (f.kind === 'bag' ? !!col.bag && Math.hypot(f.to[0] - col.bag.x, f.to[1] - col.bag.y) < 2 : f.kind === 'fold');
      rec.ok(`3. the mining finished (${done}), the worker paid the ore (+${got}), and its flight starts on the vein, in the game's column (${f && f.from}), and ends on the ${f && f.kind} (${f && f.to}) inside the column (${Math.round(col.l)}..${Math.round(col.r)})`,
        done === 'gone' && got >= 1 && fl > flights0 && !!f && inBox(f.from, col.cv) && Math.hypot(f.from[0] - vein.x, f.from[1] - vein.y) < 90
          && inBox(f.to, col) && toBag, { done, got, f, col, vein });
    }

    /* ── 4. a sword in hand, a click on a tree ── */
    {
      const node = await nearest(P, 'tree', used);
      used.push(node && node.id);
      await goTo(P, node.x + STAND.tree[0], node.y + STAND.tree[1], 1500);
      await hold('sword');
      await P.page.waitForTimeout(600);
      const at = await pagePoint(P, node.x, node.y - 60);
      await watchAttack(P);
      await P.page.mouse.click(at.x, at.y, { delay: PRESS_MS });
      const st = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'woodcutting', { timeout: 6000, label: 'chopping starts' }).catch(() => null);
      await P.page.waitForTimeout(700);
      const w = await readWatch(P);
      rec.ok(`4. a sword in hand, a real click on a tree in reach (on the ${at.top}) starts chopping (${st}) with no swing (swing ${w && w.swung}, the press: ${w && w.press})`,
        at.top === 'CANVAS' && st === 'woodcutting' && quiet(w) && w.press === 'gather', { at, st, w });
      await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
    }

    /* ── 5. a click on Ace ── */
    {
      const ace = await H.readState(P, (S) => { const n = (S.npcs || []).find((m) => m && m.flip); return n ? { x: n.x, y: n.y, name: n.name } : null; });
      if (ace) await goTo(P, ace.x, ace.y + 70, 1500);
      await hold('sword');
      await P.page.waitForTimeout(500);
      const at = ace ? await pagePoint(P, ace.x, ace.y - 20) : null;
      await P.page.evaluate(() => { window.__btNpcTap = null; });
      await watchAttack(P);
      if (at) await P.page.mouse.click(at.x, at.y, { delay: PRESS_MS });
      await P.page.waitForTimeout(900);
      const w = await readWatch(P);
      const tap = await P.page.evaluate(() => window.__btNpcTap || null);
      rec.ok(`5. a real click on ${ace && ace.name} (on the ${at && at.top}) talks to him (${tap && tap.result}) with no swing (swing ${w && w.swung}, the press: ${w && w.press})`,
        !!ace && !!at && at.top === 'CANVAS' && !!tap && tap.npc === ace.name && tap.result !== 'miss' && quiet(w) && w.press === 'talk', { ace, at, tap, w });
      for (let i = 0; i < 3; i++) { await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(250); }
    }

    /* ── 6. an XP label flies inside the game's column ── */
    {
      const col = await column(P);
      const me = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        return { x: cv.left + (S.player.x - S.camera.x) * S._worldScaleX, y: cv.top + (S.player.y - S.camera.y) * S._worldScaleY };
      });
      const path = await P.page.evaluate(async () => {
        const S = window._gameState.current;
        window.__btPushXp(S, { target: 'xpBar', text: '+37 XP', cat: 'sword' });
        const out = [];
        const t0 = performance.now();
        while (performance.now() - t0 < 1800) {
          const el = document.querySelector('[data-xpfly]');
          if (el) { const r = el.getBoundingClientRect(); if (r.width > 0) out.push([Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]); }
          await new Promise((res) => setTimeout(res, 60));
        }
        return out;
      });
      const first = path[0] || null;
      rec.ok(`6. an XP label flies from you (first seen ${first}, you at ${Math.round(me.x)},${Math.round(me.y)}) and every place it is drawn is inside the game's column (${Math.round(col.l)}..${Math.round(col.r)}; ${path.length} samples)`,
        path.length >= 3 && Math.abs(first[0] - me.x) < 40 && path.every((p) => inBox(p, col, 2)), { path: path.slice(0, 30), col, me });
    }

    /* ── 7. the farm ── */
    {
      await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
      const visit = await H.waitFor(P, () => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
        (v) => !!v, { timeout: 8000, label: 'Visit Your Farm' }).catch(() => null);
      if (visit) await P.page.mouse.click(visit.x, visit.y);
      const onFarm = await H.waitFor(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') }),
        (v) => v.zone === 'farm_home' && !v.hold && !v.veil, { timeout: 30000, label: 'onto the farm' }).catch(() => null);
      await P.page.evaluate(() => {
        window.__dcFarmActs = [];
        const S = window._gameState.current;
        const orig = S.channel.send.bind(S.channel);
        S.channel.send = (m) => { if (m && m.type === 'farm_act') window.__dcFarmActs.push(JSON.parse(JSON.stringify(m.payload))); return orig(m); };
      });
      const B0 = FARM_BEDS[0];
      await H.hopTo(P, B0.x + B0.w / 2, B0.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
      await P.page.waitForTimeout(1200);
      await hold('sword');
      await P.page.waitForTimeout(500);
      const at = await pagePoint(P, B0.x + B0.w / 2, B0.y + B0.h * 0.6);
      await P.page.evaluate(() => { window.__btBedTap = null; });
      await watchAttack(P);
      await P.page.mouse.click(at.x, at.y, { delay: PRESS_MS });
      const kneel = await H.waitFor(P, (S) => !!S._farmWork, (v) => v, { timeout: 3000, label: 'kneeling' }).catch(() => false);
      const tap = await P.page.evaluate(() => window.__btBedTap || null);   /* this click's (the next press takes the probe) */
      /* a press while kneeling: nothing armed, and the click it ends with is the farm's */
      const w = await readWatch(P);
      const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const away = await pagePoint(P, me.x + 180, me.y + 160);
      await watchAttack(P);
      const kneeling = await H.readState(P, (S) => !!S._farmWork);
      await P.page.mouse.click(away.x, away.y, { delay: PRESS_MS });
      await P.page.waitForTimeout(600);
      const wk = await readWatch(P);
      const acts = await H.waitFor(P, () => (window.__dcFarmActs || []).slice(), (a) => a.length >= 1, { timeout: 6000, label: 'the dig sent' }).catch(() => []);
      rec.ok(`7. on the farm (${onFarm && onFarm.zone}), a real click on a bed in reach (on the ${at.top}) works it (${JSON.stringify(tap)}, sent ${JSON.stringify(acts[0] || null)}) with no swing (the press: ${w && w.press})`,
        !!onFarm && at.top === 'CANVAS' && !!tap && tap.bed === 0 && tap.used && kneel && acts.length >= 1 && quiet(w) && w.press === 'farm', { onFarm, at, tap, kneel, acts, w });
      rec.ok(`7. ...and a press while kneeling arms nothing (kneeling ${kneeling}: swing ${wk && wk.swung}, attack held ${wk && wk.auto})`,
        !kneeling || (quiet(wk) && wk.press == null), { kneeling, wk });
    }
    rec.ok('the computer: no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ═══ 8. A PHONE ═══ */
  const L = await H.newPlayer(browser, { name: 'Clickphone', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const lerr = [];
  L.page.on('pageerror', (e) => lerr.push(String((e && e.message) || e).slice(0, 200)));
  const stopL = H.keepAlive(L, 15000);
  try {
    const { myId } = await arrive(L, wsPort);
    const node = await nearest(L, 'oreVein', []);
    await goTo(L, node.x + STAND.oreVein[0], node.y + STAND.oreVein[1], 2500);
    const before = sumPrefix(await srvInv(wsPort, myId), 'ore_');
    const flights0 = await L.page.evaluate(() => (window.__btBagFlights || []).length);
    const disc = await L.page.evaluate(() => {
      const el = document.querySelector('.bt-rjoy-base');
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await L.page.touchscreen.tap(disc.x, disc.y);
    await H.waitFor(L, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready', { timeout: 90000, label: 'the window opens' }).catch(() => null);
    /* the gesture on the button, as a finger makes it (mp-deskharvest step 5) */
    const g = await L.page.evaluate(async (o) => {
      const S = window._gameState.current;
      const fire = (t, px, py) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: px, clientY: py, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 }));
      fire('pointerdown', o.x, o.y);
      const t0 = performance.now();
      let step = 0, next = t0;
      while (performance.now() - t0 < 9000) {
        while (performance.now() < next) { /* 16 ms */ }
        next += 16;
        const k = step % 12, v = k < 6 ? -30 + 60 * k / 6 : 30 - 60 * (k - 6) / 6;
        fire('pointermove', o.x + Math.sin(step) * 3, o.y + v);
        step++;
        if (!S._extraction || S._extraction.status !== 'ready') break;
      }
      fire('pointerup', o.x, o.y);
      return S._extraction ? S._extraction.status : 'gone';
    }, disc);
    const got = await paidSince(L, wsPort, myId, 'ore_', before);
    await H.waitFor(L, () => (window.__btBagFlights || []).length, (n) => n > flights0, { timeout: 8000, label: 'the ore flies' }).catch(() => 0);
    const f = await lastFlight(L);
    const col = await column(L);
    const vein = await pagePoint(L, node.x, node.y);
    const onBag = !!f && (f.kind === 'bag' ? !!col.bag && Math.hypot(f.to[0] - col.bag.x, f.to[1] - col.bag.y) < 2 : f.kind === 'fold');
    rec.ok(`8. a phone: the mining paid (${g}, +${got}), its flight starts on the vein (${f && f.from} by ${Math.round(vein.x)},${Math.round(vein.y)}) and lands on the ${f && f.kind} (${f && f.to})`,
      g === 'gone' && got >= 1 && !!f && Math.hypot(f.from[0] - vein.x, f.from[1] - vein.y) < 90 && onBag && inBox(f.to, { l: 0, r: PHONE.width, t: 0, b: PHONE.height }), { g, got, f, vein, col });
    /* ── 10. a phone's footsteps unchanged ── */
    const st = await stepVolumes(L);
    rec.ok(`10. a phone's footsteps at its own level, unchanged: ${st.vols.length} steps at ${st.vols.length ? Math.min(...st.vols) : '-'}-${st.vols.length ? Math.max(...st.vols) : '-'} (x${st.k})`,
      st.k === 1 && st.vols.length >= 3 && st.vols.every((x) => x >= 0.13 * 0.98 && x <= 0.2 * 1.02), st);
    rec.ok('the phone: no page errors', lerr.length === 0, lerr.slice(0, 4));
  } finally {
    stopL();
    await L.ctx.close().catch(() => {});
  }
}
