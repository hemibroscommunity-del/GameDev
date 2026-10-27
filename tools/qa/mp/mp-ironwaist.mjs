/* ═══ NO TROUSERS AT THE WAIST OF A FULL IRON SET (v2.3.3645) ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit's bro in pink
 * trousers and full iron, jogging north-east or north-west, showed a strip of
 * pink at the waist between the plate and the greaves: 21-23 px on frames 1
 * and 2, 7-15 on frames 11 to 13.  Two causes (docs/specs/iron-waist.md):
 *   - the armour bake's fishing-rod restore ran on every pose, and pink
 *     trousers pass its colour test, so the erase's cut trousers came back
 *     (maskedBake.js, the fishing pose only now);
 *   - the chain belt the bake paints over the waist stopped a row or two above
 *     the greaves on frames 11 to 13 (tools/gear/bridge-ne-belt.mjs).
 *
 * A bro in pink trousers and full iron jogs in place north-east, then
 * north-west, his clock held and stepped through the whole stride; each step
 * is photographed alone (the figure's layers only):
 *   1. at most WAIST_MAX px of the trousers' pink on any frame of either way;
 *   2. every frame of the stride was seen;
 *   3. the guards: the iron worn, no page error.
 *
 *   node tools/qa/mp/run.mjs ironwaist      (BT_IW_SHOTS=1 keeps the photos)
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const DPR = 2;
const CLIP_W = 220, CLIP_H = 230;
const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'green'); localStorage.setItem('bt-pants', 'pink'); localStorage.setItem('bt-shoes', 'blue');
  localStorage.setItem('bt-hair', 'none'); localStorage.setItem('bt-headwear', 'none');
} catch (e) {}`;
/* the most of the trousers' pink (device px, pixel ratio 2) one frame may show:
   an antialiased edge (mp-ghostaudit's GHOST_PX) */
const WAIST_MAX = 6;
const STEP_MS = 20, SWEEP_MS = 1600;
const FACINGS = [['northeast', ['w', 'd'], -Math.PI / 4], ['northwest', ['w', 'a'], -3 * Math.PI / 4]];

/* the page's tools (mp-garmentspecks'): a held clock that creeps, a render hook
   that draws only the bro's figure layers, and an anchor for a jog in place */
const KIT = () => {
  if (window.__iw) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  const veil = document.createElement('div');
  veil.className = 'bt-zone-loading';
  veil.setAttribute('data-qa-ironwaist-veil', '');
  veil.style.setProperty('display', 'none', 'important');
  document.body.appendChild(veil);
  const G = window.__iw = {
    on: false, realNow: Date.now, held: null, at: null, anchor: null, foreign: new Set(),
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
      if (G.anchor) { const S = window._gameState.current; S.player.x = G.anchor.x; S.player.y = G.anchor.y; }
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
      y: Math.max(0, Math.min(window.innerHeight - Hh, Math.round(y - Hh + 50))),
      width: W, height: Hh,
    };
  };
  G.pose = () => {
    const me = R.playerDisplayRaw();
    return { pose: me ? me._animPose : null, dir: me ? me._animDir : null, frame: me ? me._animFrame : null };
  };
  return true;
};

/* the trousers' pink in a photograph, counted in the page */
async function pinkOf(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let pink = 0, any = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;
      any++;
      if (r > 110 && b > 70 && r > b && g < r * 0.72 && b > g * 1.15) pink++;
    }
    return { pink, any };
  }, buf.toString('base64'));
}

const SHOTS = process.env.BT_IW_SHOTS ? H.REPO + '/tools/qa/mp/out/ironwaist' : null;

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const P = await H.newPlayer(browser, { name: 'Ironwaist', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK });
  const page = P.page;
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId).catch(() => {});
    /* the kit's iron, worn the way a player wears it (mp-ghostaudit's wear) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' }).catch(() => {});
    await H.waitFor(P, () => {
      const R = window._gameState.current.rpg || {};
      return !!((R.armorStash || []).concat(R.armor ? [R.armor] : []).some((x) => x && x.mat === 'iron' && x.gid)
        && (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []).some((x) => x && x.mat === 'iron' && x.gid));
    }, (v) => v, { timeout: 15000, label: 'the iron pieces' }).catch(() => null);
    const worn = await page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg;
      const put = (stash, slot) => {
        if (R[slot] && R[slot].mat === 'iron') return R[slot].gid;
        if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
        const i = (R[stash] || []).findIndex((x) => x && x.mat === 'iron' && x.gid);
        if (i < 0) return null;
        R[slot] = R[stash][i]; R[stash].splice(i, 1);
        return R[slot].gid;
      };
      const t = put('armorStash', 'armor'), l = put('legsStash', 'legsArmor');
      if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
      S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
      return { t, l };
    });
    rec.ok('the iron plate and greaves are worn (guard)', !!worn.t && !!worn.l, worn);
    const G = await H.wheelGeom();
    await H.hopTo(P, Math.round(G.cx + 1350), Math.round(G.cy - 1350), { tries: 80 });
    await page.waitForTimeout(4000);   /* the armour's masked bakes */
    const kit = await page.evaluate(KIT);
    rec.ok('the page can hold its clock and draw the bro alone (guard)', kit === true, kit);
    if (kit !== true) return;

    const results = {};
    for (const [dir, keys, ang] of FACINGS) {
      /* face that way, then jog in place there */
      const c = await page.evaluate(() => {
        const S = window._gameState.current;
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      await page.mouse.move(c.x + Math.cos(ang) * 150, c.y + Math.sin(ang) * 150);
      await page.evaluate(() => { const S = window._gameState.current; window.__iw.anchor = { x: S.player.x, y: S.player.y }; window.__iw.markForeign(); });
      for (const k of keys) await page.keyboard.down(k);
      await page.waitForTimeout(1500);
      const t0 = await page.evaluate(() => Date.now());
      const seen = {};
      for (let dt = 0; dt < SWEEP_MS; dt += STEP_MS) {
        await page.evaluate((T) => { window.__iw.hold(T); window.__iw.isolate(true); }, t0 + dt);
        const r0 = await page.evaluate(() => window.__iw.renders || 0);
        for (let i = 0; i < 60; i++) {
          await page.waitForTimeout(30);
          if ((await page.evaluate(() => window.__iw.renders || 0)) >= r0 + 2) break;
        }
        await page.evaluate(() => window.__iw.rehold());
        const clip = await page.evaluate(({ W, Hh }) => window.__iw.clip(W, Hh), { W: CLIP_W, Hh: CLIP_H });
        const buf = await page.screenshot({ clip });
        const pose = await page.evaluate(() => window.__iw.pose());
        const m = await pinkOf(page, buf);
        if (pose.pose !== 'jog') continue;
        const f = pose.frame;
        if (!seen[f] || m.pink > seen[f].pink) {
          seen[f] = { pink: m.pink, any: m.any };
          if (SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(`${SHOTS}/${dir}-${String(f).padStart(2, '0')}.png`, buf); }
        }
      }
      await page.evaluate(() => { window.__iw.isolate(false); window.__iw.free(); window.__iw.anchor = null; });
      for (const k of keys) await page.keyboard.up(k);
      await page.waitForTimeout(600);
      results[dir] = seen;
      const frames = Object.keys(seen).map(Number).sort((a, b) => a - b);
      console.log(`    ${dir}: ${frames.length} frames, pink per frame ${JSON.stringify(Object.fromEntries(frames.map((f) => [f, seen[f].pink])))}`);
    }
    for (const [dir] of FACINGS) {
      const seen = results[dir] || {};
      const frames = Object.keys(seen).map(Number);
      const worst = frames.reduce((a, f) => (seen[f].pink > a.pink ? { f, pink: seen[f].pink } : a), { f: null, pink: 0 });
      rec.ok(`${dir}: every frame of the stride photographed (guard: ${frames.length} of 24)`, frames.length >= 22 && frames.every((f) => seen[f].any > 500), frames.length);
      rec.ok(`${dir}: no trousers at the waist (${worst.pink} px of pink at most, frame ${worst.f}; at most ${WAIST_MAX})`, worst.pink <= WAIST_MAX,
        Object.fromEntries(frames.map((f) => [f, seen[f].pink])));
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
