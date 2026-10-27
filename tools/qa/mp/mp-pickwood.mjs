/* ═══ THE PICKAXE KEEPS ITS WOOD (v2.3.3671) ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit's miner, a green
 * bro, swung a GREEN pickaxe: the mining sheets draw the pickaxe in its own
 * wood, the skin's hue family, and the recolour's skin test took its handle and
 * the rim of its head.  toolWood.js finds the pickaxe on the mining sheets and
 * the recolour passes it over (playerSkins recolorBodyToCanvas `toolWood`).
 *
 * Two green bros with no shirt mine copper on the commons, far apart: one
 * plays the game, one plays it with `?pickwood=0`, the game as it was.  Each
 * is photographed alone (every world layer but the figure put away, the rock
 * he mines included) at the same held moments, so both show the same frame of
 * the swing:
 *   1. the new page shows the pickaxe's wood: at least WOOD_MIN px of its tan
 *      in every frame photographed, where the old page shows next to none
 *      (the handle painted green);
 *   2. what the new page no longer paints green is the pickaxe: its green is
 *      the old page's less about what it shows in tan (a quarter more for
 *      the wood's darker side, which the tan test does not count);
 *   3. the bake says what it did (__btPickWood): on, and the mining sheet's
 *      pickaxe kept, on the new page; off on the old; no other sheet touched.
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const DPR = 2;
const CLIP_W = 300, CLIP_H = 320;
const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'green'); localStorage.setItem('bt-shirt', 'none');
  localStorage.setItem('bt-hair', 'none'); localStorage.setItem('bt-headwear', 'none');
} catch (e) {}`;
/* the least of the wood's tan (device px, at pixel ratio 2) the new page shows
   in a frame of the swing, and the most the old page may */
const WOOD_MIN = 60;
const OLD_WOOD_MAX = 8;
/* the moments photographed, as the gesture's phase (frame k x 14 of the
   swing): the pickaxe raised behind the head, coming down, at the rock, and
   raised again */
const MOMENTS = [0.05, 0.3, 0.45, 0.62, 0.95];

/* the page's tools (mp-garmentspecks'): a held clock that creeps, and a render
   hook that draws only the bro's figure layers, without what stood there when
   the mark was made (the rock, the townsfolk) or his name plate */
const KIT = () => {
  if (window.__pw) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  /* the black-screen watchdog would take a frame drawn with the world put
     away for a lost GPU: it skips its judgement while a loading veil is up */
  const veil = document.createElement('div');
  veil.className = 'bt-zone-loading';
  veil.setAttribute('data-qa-pickwood-veil', '');
  veil.style.setProperty('display', 'none', 'important');
  document.body.appendChild(veil);
  const G = window.__pw = {
    on: false, realNow: Date.now, held: null, at: null, foreign: new Set(),
    /* the figure's layers (mp-ghostaudit's): not overlayWorld, where the
       mined rock is lifted over the miner while he works (v2.3.854) */
    keep: new Set(['entities', 'player', 'gatherNodesBack', 'gatherNodes', 'gatherNodesFront', 'gestureFront']),
  };
  G.hold = (t) => { G.at = t; G.held = t; Date.now = () => (G.held += 0.0005); };
  G.rehold = () => { if (G.at != null) G.held = G.at; };
  G.free = () => { Date.now = G.realNow; G.held = null; G.at = null; };
  const rend = app.renderer, orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    try {
      if (G.on) {
        const me = R.playerDisplayRaw();
        for (const layer of world.children) {
          if (!G.keep.has(layer.label)) { hide(layer); continue; }
          for (const c of layer.children) if (G.foreign.has(c)) hide(c);
        }
        if (me && me._uiLayer) hide(me._uiLayer);
      }
    } catch (e) { /* the frame still draws */ }
    G.renders = (G.renders || 0) + 1;
    try { return orig(...a); } finally { for (const o of hidden) o.visible = true; }
  };
  G.markForeign = () => {
    G.foreign.clear();
    const me = R.playerDisplayRaw();
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) if (c !== me && c.visible) G.foreign.add(c);
    }
    return G.foreign.size;
  };
  G.isolate = (on) => { G.on = !!on; };
  G.clip = (W, Hh) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
    const wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y + 52;
    const x = r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y = r.top + (wy - S.camera.y) * (S._worldScaleY || 1);
    return {
      x: Math.max(0, Math.min(window.innerWidth - W, Math.round(x - W / 2))),
      y: Math.max(0, Math.min(window.innerHeight - Hh, Math.round(y - Hh + 40))),
      width: W, height: Hh,
    };
  };
  G.pose = () => {
    const S = window._gameState.current, me = R.playerDisplayRaw();
    return { pose: me ? me._animPose : null, frame: me ? me._animFrame : null, mining: !!(S._extraction && S._extraction.skill === 'mining') };
  };
  return true;
};

/* a shot's colours, in the page: the wood's tan and the skin's green */
async function colours(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let tan = 0, green = 0, any = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;
      any++;
      /* the pickaxe's wood as the game draws it: a warm tan, its green 0.55-0.85
         of its red (the skin test's orange family, paler than the miner's skin) */
      if (r > 80 && r > g && g > b && (r - b) > 40 && g >= 0.55 * r && g <= 0.85 * r && b >= 0.2 * r) tan++;
      else if (g > 70 && g > r * 1.2 && g > b * 1.2) green++;
    }
    return { tan, green, any };
  }, buf.toString('base64'));
}

const SHOTS = process.env.BT_PW_SHOTS ? H.REPO + '/tools/qa/mp/out/pickwood' : null;
async function shoot(P, name) {
  await P.page.evaluate(() => window.__pw.rehold());
  const r0 = await P.page.evaluate(() => window.__pw.renders || 0);
  for (let i = 0; i < 100; i++) {
    await P.page.waitForTimeout(40);
    if ((await P.page.evaluate(() => window.__pw.renders || 0)) >= r0 + 3) break;
  }
  await P.page.evaluate(() => window.__pw.rehold());
  const clip = await P.page.evaluate(({ W, Hh }) => window.__pw.clip(W, Hh), { W: CLIP_W, Hh: CLIP_H });
  const buf = await P.page.screenshot({ clip });
  if (SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(`${SHOTS}/${name}.png`, buf); }
  const pose = await P.page.evaluate(() => window.__pw.pose());
  return { ...await colours(P.page, buf), pose };
}

/* mp-ghostaudit's walk, tap and nodes */
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
      const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
      cv.dispatchEvent(new MouseEvent('mousedown', o));
      cv.dispatchEvent(new MouseEvent('mouseup', o));
      cv.dispatchEvent(new MouseEvent('click', o));
    }, id);
    await P.page.waitForTimeout(400);
    if (await H.readState(P, done)) return true;
    await P.page.keyboard.press('e');
    await P.page.waitForTimeout(400);
    if (await H.readState(P, done)) return true;
  }
  return false;
}
/* the copper veins near the bro, nearest first */
const veins = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.gatherNodes || []).filter((n) => n.nodeType === 'oreVein' && n.alive && (n.gatherLvl || 1) === 1)
    .map((n) => ({ id: n.id, x: n.x, y: n.y, d: Math.round(Math.hypot(n.x - p.x, n.y - p.y)) }))
    .sort((a, b) => a.d - b.d);
});
const STAND_ORE = [0, -70];   /* where a miner stands, from his vein (mp-ghostaudit STAND) */

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const pages = [];
  try {
    const NEW = await H.newPlayer(browser, { name: 'Pickwood', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK });
    pages.push(NEW);
    const OLD = await H.newPlayer(browser, { name: 'Pickgreen', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK, query: 'pickwood=0' });
    pages.push(OLD);
    NEW.page.on('pageerror', (e) => errors.push('new ' + String(e && e.message || e)));
    OLD.page.on('pageerror', (e) => errors.push('old ' + String(e && e.message || e)));
    await Promise.all([H.enterWorld(NEW), H.enterWorld(OLD)]);
    const inWorld = async (P, label) => H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.z === 'wheel' && !v.l && v.n > 0, { timeout: 120000, label }).catch(() => null);
    const [inN, inO] = await Promise.all([inWorld(NEW, 'the new page into the world'), inWorld(OLD, 'the old page into the world')]);
    rec.ok('both pages in the world (guard)', !!inN && !!inO, { inN, inO });
    if (!inN || !inO) return;
    const ids = [];
    for (const P of [NEW, OLD]) {
      const id = await H.readState(P, (S) => S.myId);
      ids.push(id);
      await H.devOp(wsPort, 'quests', id);   /* the Mayor's gate open (the worker's own quests) */
      await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 30 });
      await H.grant(wsPort, id, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
    }
    await NEW.page.waitForTimeout(2500);
    const kits = await Promise.all([NEW.page.evaluate(KIT), OLD.page.evaluate(KIT)]);
    rec.ok('both pages can hold their clocks and draw the bro alone (guard)', kits[0] === true && kits[1] === true, kits);
    const probe0 = await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => (window.__btPickWood ? window.__btPickWood() : null))));
    rec.ok('the new page keeps the pickaxe, the old one does not (guard)',
      !!probe0[0] && probe0[0].on === true && !!probe0[1] && probe0[1].on === false, probe0);

    /* each bro to his own vein: the nearest for one, the next for the other */
    const vs = await veins(NEW);
    rec.ok(`two copper veins on the commons (guard: ${vs.length})`, vs.length >= 2, vs.slice(0, 3));
    if (vs.length < 2) return;
    const mine = [vs[0], vs[1]];
    const went = await Promise.all([NEW, OLD].map((P, i) => travel(P, wsPort, ids[i], mine[i].x + STAND_ORE[0], mine[i].y + STAND_ORE[1])));
    rec.ok('both bros stand at their veins (guard)', went[0] && went[1], went);
    await NEW.page.waitForTimeout(1200);
    /* the rock and everything else standing there are marked before the
       harvest starts, so the photograph is the miner alone */
    await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => window.__pw.markForeign())));
    const started = await Promise.all([NEW, OLD].map((P, i) => tapNode(P, mine[i].id, (S) => !!S._extraction)));
    const mining = await Promise.all([NEW, OLD].map((P) => H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null),
      (v) => v === 'mining', { timeout: 8000, label: 'mining' }).catch(() => null)));
    rec.ok('both bros mine (guard)', mining[0] === 'mining' && mining[1] === 'mining', { started, mining });
    if (mining[0] !== 'mining' || mining[1] !== 'mining') return;
    await NEW.page.waitForTimeout(600);

    /* the swing's frames: once the harvest waits for the gesture, the frame
       is the gesture's phase (gesturePose01, ex.cueFrame01 chased by ex._posF:
       entityRenderer), so setting both picks the same frame on both pages --
       frame floor(k x 14) for each moment k */
    const waiting = await Promise.all([NEW, OLD].map((P) => H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null),
      (v) => v === 'ready', { timeout: 30000, label: 'the gesture window' }).catch(() => null)));
    rec.ok('both harvests wait for the gesture (guard)', waiting[0] === 'ready' && waiting[1] === 'ready', waiting);
    if (waiting[0] !== 'ready' || waiting[1] !== 'ready') return;
    const rows = [];
    for (const k of MOMENTS) {
      /* the phase set, the clock held, and whatever stands there now (the
         rock, its crack) put away for the photograph */
      await Promise.all([NEW, OLD].map((P) => P.page.evaluate((k) => {
        const ex = window._gameState.current._extraction;
        if (ex) { ex.cueFrame01 = k; ex._posF = k; }
        window.__pw.hold(Date.now());
        window.__pw.markForeign();
        window.__pw.isolate(true);
      }, k)));
      const n = await shoot(NEW, `mine-${k}-new`);
      const o = await shoot(OLD, `mine-${k}-old`);
      await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => { window.__pw.isolate(false); window.__pw.free(); })));
      const same = n.pose.pose === o.pose.pose && n.pose.frame === o.pose.frame;
      rows.push({ k, n, o, same });
      console.log(`    mine at ${k}: new tan ${n.tan} green ${n.green} | old tan ${o.tan} green ${o.green} | ${n.pose.pose}/${n.pose.frame}${same ? '' : ' vs ' + o.pose.pose + '/' + o.pose.frame}`);
    }
    rec.ok(`every moment is the mining pose's same frame on both pages, five frames apart (guard: ${rows.filter((r) => r.same && r.n.pose.pose === 'mine').length} of ${rows.length})`,
      rows.every((r) => r.same && r.n.pose.pose === 'mine' && r.n.any > 0 && r.o.any > 0) && new Set(rows.map((r) => r.n.pose.frame)).size === rows.length,
      rows.map((r) => [r.n.pose, r.o.pose, r.n.any, r.o.any]));
    for (const r of rows) {
      rec.ok(`frame ${r.n.pose.frame}: the pickaxe shows its wood (${r.n.tan} px of tan; ${r.o.tan} as it was)`,
        r.n.tan >= WOOD_MIN && r.o.tan <= OLD_WOOD_MAX, { n: r.n, o: r.o });
      /* the wood's shadow side is darker than the tan test, so a quarter more
         (and a little) may leave the green than the tan counts */
      rec.ok(`frame ${r.n.pose.frame}: what is no longer green is the pickaxe (green ${r.n.green}, ${r.o.green} as it was, ${r.n.tan} now tan)`,
        r.n.green <= r.o.green && r.o.green - r.n.green <= 1.25 * r.n.tan + 30, { n: r.n, o: r.o });
    }

    /* ── what the bake did ── */
    const after = await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => window.__btPickWood())));
    const keys = Object.keys(after[0].kept || {});
    const body = keys.find((k) => /^mine-south\./.test(k));
    console.log('    the new page\'s mining bakes, pickaxe pixels kept:', JSON.stringify(after[0].kept));
    rec.ok(`the new page kept the mining sheet's pickaxe (${body ? after[0].kept[body] : 'none'} px)`, !!body && after[0].kept[body] >= 8000, after[0].kept);
    rec.ok('only the mining sheets were touched', keys.length > 0 && keys.every((k) => /^mine-south(-head)?\./.test(k)), keys);
    rec.ok('the old page kept nothing', Object.keys(after[1].kept || {}).length === 0, after[1].kept);
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    for (const P of pages) await P.ctx.close().catch(() => {});
  }
}
