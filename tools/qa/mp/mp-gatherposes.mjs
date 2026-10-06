/* ═══ THE GATHERING POSES ARE MADE THE FIRST TIME THEY CAN BE WANTED (v2.3.3077) ═══
 *
 * The owner's yes to the memory plan (docs/MEMORY-PLAN.md, Phase 4): "Yes do
 * all of them" -- among them "gathering poses built the first time you gather
 * (~27 MB): one small hitch the first time".  The lumberjack, the cook and the
 * fire-lighter were made on the loading screen for every player; now each is
 * made the first time it can be wanted (rendering/standIns.js).
 *
 * On a phone (390 x 844, 3x) in the Wheel:
 *   1. on arrival none of the three is made (window.__btStandIns) and none of
 *      their pictures is held (_pixiRenderer.standInPictures);
 *   2. walking up to a tree with the axe makes the lumberjack BEFORE any tap
 *      ("a tree in reach"); the tap then draws him and puts the body away;
 *   3. a log in the bag makes the fire-lighter ("a log in the bag").  Held
 *      back here by a slow download, a fire lit before he is made shows the
 *      walking body -- never an empty spot, never the two at once -- and the
 *      next fire, once he is made, draws him with the body put away;
 *   4. the fire it lights makes the cook; a tap on the fire with a fish in the
 *      bag starts a cook drawn by him, the body put away;
 *   5. what the three hold once made: what the loading screen no longer pays
 *      for a player who never gathers (and the 2D canvases alive before and
 *      after, from an init script that keeps every canvas the page makes);
 *   6. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const STAND_TREE = [0, -130];   /* where mp-harvestbar stands to chop */
const FIRE_HOLD_MS = 6000;      /* the fire-lighter's download, held back */

/* every 2D canvas the page makes, by weak reference (mp-memledger's) */
const INIT = () => {
  const canv = [];
  const gl = new WeakSet();
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    const el = ce.apply(this, arguments);
    try { if (String(tag).toLowerCase() === 'canvas') canv.push(new WeakRef(el)); } catch (e) { /* ignore */ }
    return el;
  };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const ctx = gc.apply(this, arguments);
    try { if (ctx && /^webgl/.test(String(type))) gl.add(this); } catch (e) { /* ignore */ }
    return ctx;
  };
  window.__canvasMB = () => {
    let b = 0, n = 0;
    for (const r of canv) {
      const el = r.deref();
      if (!el || gl.has(el)) continue;
      const w = el.width | 0, h = el.height | 0;
      if (!w || !h) continue;
      n++; b += w * h * 4;
    }
    return { mb: +(b / 1048576).toFixed(1), n };
  };
};

const poses = (P) => P.page.evaluate(() => (window.__btStandIns ? window.__btStandIns() : null));
const pictures = (P) => P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.standInPictures
  ? window._pixiRenderer.standInPictures() : null));
async function canvases(P) {
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await cdp.detach().catch(() => {});
  return P.page.evaluate(() => window.__canvasMB());
}

/* mp-wheelnodes' walk: H.hopTo's 100 px a hop, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

/* mp-harvestbar's tap on a node */
async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

/* What a phone shows each animation frame for `ms`, started BEFORE `action`
   (a light is 0.7 s, and this box can draw two frames a second): the pose
   asked for or not, the body put away or not, and its figure drawn or not. */
async function watchDuring(P, kind, ms, action) {
  await P.page.evaluate(([k, lim]) => {
    const S = window._gameState.current;
    const fig = () => {
      const f = k === 'chop' ? window.__btChopFigure : k === 'cook' ? window.__btCookFigure : window.__btFireFigure;
      return f ? !!f().visible : false;
    };
    const on = () => (k === 'fire' ? !!(S._firemaking && !(S._firemaking.doneAt && Date.now() > S._firemaking.doneAt))
      : !!(S._extraction && S._extraction.skill === (k === 'chop' ? 'woodcutting' : 'cooking')));
    const out = window.__qaWatch = [];
    const t0 = performance.now();
    const step = () => {
      out.push({ t: Math.round(performance.now() - t0), on: on(), hid: S._standInBody === true, fig: fig(),
        state: window.__btStandIns()[k].state });
      if (performance.now() - t0 < lim) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [kind, ms]);
  await action();
  await P.page.waitForTimeout(ms + 300);
  return P.page.evaluate(() => window.__qaWatch || []);
}

const watchFrames = (P, kind, ms) => P.page.evaluate(async ([k, lim]) => {
  const S = window._gameState.current;
  const fig = () => {
    const f = k === 'chop' ? window.__btChopFigure : k === 'cook' ? window.__btCookFigure : window.__btFireFigure;
    return f ? !!f().visible : false;
  };
  /* a light is drawn until its doneAt; the record lingers a tick past it */
  const on = () => (k === 'fire' ? !!(S._firemaking && !(S._firemaking.doneAt && Date.now() > S._firemaking.doneAt))
    : !!(S._extraction && S._extraction.skill === (k === 'chop' ? 'woodcutting' : 'cooking')));
  const out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < lim) {
    await new Promise((res) => requestAnimationFrame(res));
    out.push({ t: Math.round(performance.now() - t0), on: on(), hid: S._standInBody === true, fig: fig(),
      state: window.__btStandIns()[k].state });
  }
  return out;
}, [kind, ms]);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Posebro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]), [data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(3000);

    /* 1 */
    const p0 = await poses(P), pic0 = await pictures(P), cv0 = await canvases(P);
    console.log(`    arriving: ${JSON.stringify(p0)} ${JSON.stringify(pic0)} canvases ${JSON.stringify(cv0)}`);
    rec.ok('arriving, none of the three poses is made (the loading screen made all three until now)',
      !!p0 && p0.chop.state === 'idle' && p0.cook.state === 'idle' && p0.fire.state === 'idle', p0);
    rec.ok('...and none of their pictures is held', !!pic0 && pic0.chop.n === 0 && pic0.cook.n === 0 && pic0.fire.n === 0, pic0);

    /* 2 */
    await H.grant(wsPort, myId, 'item', { invKey: 'woodcutting_axe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).woodcutting_axe || 0, (n) => n > 0,
      { timeout: 20000, label: 'the axe' }).catch(() => 0);
    await closeTalk(P);
    const tree = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'tree' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
      }
      return best;
    });
    rec.ok('a tier-1 tree on the commons (guard)', !!tree, tree);
    if (!tree) return;
    const stillIdle = await poses(P);
    rec.ok('...the axe in the bag alone makes nothing (no tree in reach yet)', stillIdle && stillIdle.chop.state === 'idle', stillIdle);
    await travel(P, wsPort, myId, tree.x + STAND_TREE[0], tree.y + STAND_TREE[1]);
    await closeTalk(P);
    const chopMade = await H.waitFor(P, (S) => ({ p: window.__btStandIns().chop, ex: S._extraction ? S._extraction.skill : null,
      near: S._nearNode ? S._nearNode.nodeType : null }), (v) => v.p.state === 'ready', { timeout: 30000, label: 'the lumberjack made' }).catch(() => null);
    console.log(`    at the tree: ${JSON.stringify(chopMade)}`);
    rec.ok(`walking up to a tree with the axe makes the lumberjack before any tap (${chopMade && chopMade.p.why}, ${chopMade && chopMade.p.ms} ms to make)`,
      !!chopMade && chopMade.p.why === 'a tree in reach' && chopMade.ex === null, chopMade);
    await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; });
    await tapNode(P, tree.id, (S) => !!S._extraction);
    const chopF = await watchFrames(P, 'chop', 2500);
    const chopOn = chopF.filter((f) => f.on);
    const chopDrawn = chopOn.filter((f) => f.fig && f.hid);
    rec.ok(`the tap: he is drawn and the body put away (${chopDrawn.length} of ${chopOn.length} chopping frames)`,
      chopOn.length > 0 && chopDrawn.length === chopOn.length, chopF.slice(0, 6));
    await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null;
      if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    /* away from the tree, so a tap on the fire is not a tap on the tree */
    await travel(P, wsPort, myId, tree.x + STAND_TREE[0], tree.y + STAND_TREE[1] + 240);

    /* 3 */
    let held = 0;
    await P.page.route('**/sprites/skills/firemaking-strip*', async (route) => {
      held++;
      await new Promise((res) => setTimeout(res, FIRE_HOLD_MS));
      await route.continue().catch(() => {});
    });
    const beforeLog = await poses(P);
    rec.ok('the fire-lighter is not made before a log is in the bag', beforeLog && beforeLog.fire.state === 'idle', beforeLog);
    await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
    const asked = await H.waitFor(P, () => window.__btStandIns().fire, (v) => v.state !== 'idle',
      { timeout: 20000, label: 'the fire-lighter asked for' }).catch(() => null);
    rec.ok(`a log in the bag asks for the fire-lighter (${asked && asked.why})`, !!asked && asked.why === 'a log in the bag', asked);
    /* the Bag's way: the log's item card, "Light fire" (mp-cooktap's) */
    const openLog = () => P.page.evaluate(() => {
      const bus = window._itemDetailBus;
      const S = window._gameState && window._gameState.current;
      if (bus && S && S.rpg) bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
    });
    /* The card is let settle first (Playwright's own click waits for it to
       stop moving, ~9 s on this box), then its button is pressed at once, so
       the watch spans the light. */
    let clicked = [];
    const light = async () => {
      await H.waitFor(P, (S) => !S._firemaking, (v) => v, { timeout: 5000, label: 'no light under way' }).catch(() => {});
      await openLog();
      await P.page.locator('button:visible', { hasText: 'Light fire' }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await P.page.waitForTimeout(1500);
      const fire = await watchDuring(P, 'fire', 2500, async () => {
        clicked.push(await P.page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find((x) => /Light fire/.test(x.textContent || '') && x.offsetParent);
          if (!b) return false;
          b.click();
          return true;
        }));
      });
      return fire;
    };
    const fire1 = await light();
    const lit1 = fire1.filter((f) => f.on);
    const notMade = lit1.filter((f) => f.state !== 'ready');
    console.log(`    the first light, the fire-lighter held back (${held} request held, clicked ${JSON.stringify(clicked)}): ${JSON.stringify(fire1.slice(0, 6))}`);
    rec.ok(`a fire lit before he is made shows the walking body: not put away, no figure (${notMade.length} frames while he was being made)`,
      notMade.length > 0 && notMade.every((f) => !f.hid && !f.fig), { first: lit1.slice(0, 5), held });
    rec.ok('...and never the body and a figure at once, nor neither', lit1.every((f) => !(f.fig && !f.hid) && !(f.hid && !f.fig)), lit1.filter((f) => (f.fig && !f.hid) || (f.hid && !f.fig)).slice(0, 4));
    const fireMade = await H.waitFor(P, () => window.__btStandIns().fire, (v) => v.state === 'ready',
      { timeout: FIRE_HOLD_MS + 20000, label: 'the fire-lighter made' }).catch(() => null);
    rec.ok(`once his download lands he is made (${fireMade && fireMade.ms} ms, the held ${FIRE_HOLD_MS} ms in it)`, !!fireMade, fireMade);
    await P.page.unroute('**/sprites/skills/firemaking-strip*').catch(() => {});
    const fire2 = await light();
    const lit2 = fire2.filter((f) => f.on);
    console.log(`    the next light (clicked ${JSON.stringify(clicked)}): ${JSON.stringify(fire2.slice(0, 6))}`);
    rec.ok(`the next fire draws him, the body put away (${lit2.filter((f) => f.fig && f.hid).length} of ${lit2.length} lighting frames)`,
      lit2.length > 0 && lit2.every((f) => f.fig && f.hid), lit2.slice(0, 5));

    /* 4 */
    const camp = await H.waitFor(P, (S) => ({ fire: !!S._campfire, lighting: !!S._firemaking, cook: window.__btStandIns().cook }),
      (v) => v.fire && !v.lighting && v.cook.state === 'ready', { timeout: 20000, label: 'a campfire, and the cook made' }).catch(() => null);
    rec.ok(`the fire it lit makes the cook (${camp && camp.cook.why}, ${camp && camp.cook.ms} ms)`,
      !!camp && /campfire/.test(camp.cook.why || ''), camp);
    const at = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const n = S._campfire;
      if (!n) return null;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
    });
    /* nothing left over the fire (an item card), named if something is */
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.waitForTimeout(400);
    const over = at ? await P.page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? (el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) : null;
    }, at) : null;
    if (at) await P.page.touchscreen.tap(at.x, at.y);
    const cooking = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'cooking',
      { timeout: 6000, label: 'a cook' }).catch(() => null);
    rec.ok('a tap on the fire with a fish in the bag starts a cook (guard)', cooking === 'cooking', { at, over, cooking });
    if (cooking === 'cooking') {
      const cookF = await watchFrames(P, 'cook', 2000);
      const cookOn = cookF.filter((f) => f.on);
      rec.ok(`...drawn by the cook, the body put away (${cookOn.filter((f) => f.fig && f.hid).length} of ${cookOn.length} cooking frames)`,
        cookOn.length > 0 && cookOn.every((f) => f.fig && f.hid), cookF.slice(0, 5));
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
    }

    /* 5 */
    const p1 = await poses(P), pic1 = await pictures(P), cv1 = await canvases(P);
    const held1 = pic1 ? +(pic1.chop.mb + pic1.cook.mb + pic1.fire.mb).toFixed(1) : 0;
    console.log(`    all three made: ${JSON.stringify(p1)} ${JSON.stringify(pic1)} canvases ${JSON.stringify(cv1)}`);
    rec.ok(`made, the three hold ${held1} MB (lumberjack ${pic1 && pic1.chop.mb}, cook ${pic1 && pic1.cook.mb}, fire-lighter ${pic1 && pic1.fire.mb}) -- `
      + `what the loading screen no longer makes for a player who never gathers; 2D canvases alive ${cv0.mb} -> ${cv1.mb} MB`,
      !!pic1 && held1 >= 15 && pic1.chop.n > 0 && pic1.cook.n > 0 && pic1.fire.n > 0, { pic1, cv0, cv1 });

    /* 6 */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
