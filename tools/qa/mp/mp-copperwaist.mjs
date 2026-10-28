/* ═══ THE CHAIN AT THE WAIST IN THE ARMOUR'S OWN METAL (v2.3.3733) ═══
 *
 * The owner, 2026-10-28, testing before the judges: "Northeast and northwest
 * jog while wearing full copper armor the midsection with the belt is either
 * gray (matching iron) or leaves gaps (northwest jog)".
 *
 * North-east has no painted knight figure, so that jog (and north-west, its
 * mirror) draws the player's own body cut away under the armour, with the
 * chain belt PAINTED into its waist (maskedBake.js, v2.3.1347).  The plate
 * and greaves are the steel art with the metal's tint (materialTints.js), but
 * the chain was copied in as drawn: steel grey in every metal.  It takes the
 * chest's tint now (docs/specs/copper-waist.md).
 *
 * A bro in pink trousers wears each metal's plate and greaves and jogs in
 * place; his clock is held and stepped through the stride, and each step is
 * photographed alone (the figure's layers only):
 *   1. copper, north-east and north-west: at most GREY_MAX px of grey (no
 *      warmth, not dark) at the waist on any frame -- the copper plate,
 *      greaves and chain all carry the copper hue;
 *   2. no trousers at the waist in any metal or way (mp-ironwaist's pink);
 *   3. every frame of the stride was seen where the whole stride is swept;
 *   4. the guards: the metal worn, no page error.
 *
 *   node tools/qa/mp/run.mjs copperwaist
 *   BT_CW_SHOTS=1    keeps the photos (tools/qa/mp/out/copperwaist)
 *   BT_CW_ALL=1      every way in every metal, the whole stride (long)
 *   BT_CW_METALS=copper,iron   BT_CW_DIRS=northeast,east   pick the runs
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const DPR = 2;
const CLIP_W = 260, CLIP_H = 230;
const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'green'); localStorage.setItem('bt-pants', 'pink'); localStorage.setItem('bt-shoes', 'blue');
  localStorage.setItem('bt-hair', 'none'); localStorage.setItem('bt-headwear', 'none');
} catch (e) {}`;
const WAIST_MAX = 6;          /* mp-ironwaist's allowance of pink */
const GREY_MAX = 12;          /* an antialiased edge's worth of grey on a copper bro */
const STEP_MS = 20;
const ALL = !!process.env.BT_CW_ALL;
const DIRS = {
  east: [['d'], 0], northeast: [['w', 'd'], -Math.PI / 4], north: [['w'], -Math.PI / 2],
  northwest: [['w', 'a'], -3 * Math.PI / 4], west: [['a'], Math.PI], southwest: [['s', 'a'], 3 * Math.PI / 4],
  south: [['s'], Math.PI / 2], southeast: [['s', 'd'], Math.PI / 4],
};
const KEYED = ['northeast', 'northwest'];
const METALS = (process.env.BT_CW_METALS || 'copper,iron,blacksteel').split(',');
const PICK_DIRS = process.env.BT_CW_DIRS ? process.env.BT_CW_DIRS.split(',') : Object.keys(DIRS);
/* the whole stride for the two ways the bug is in (or every way with BT_CW_ALL);
   a short sweep -- a few frames -- elsewhere */
const sweepFor = (metal, dir) => (ALL || (KEYED.includes(dir) && metal === 'copper') ? 1600 : 160);

/* mp-ironwaist's kit: a held clock, the bro's figure drawn alone, a jog in place */
const KIT = () => {
  if (window.__iw) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  const veil = document.createElement('div');
  veil.className = 'bt-zone-loading';
  veil.setAttribute('data-qa-copperwaist-veil', '');
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

/* the trousers' pink, and grey (no warmth, not dark: the steel chain; copper is
   red over blue) in the waist band -- 35-75% down the figure, below
   the head (the back of the head carries a grey sliver of its own on frame 23,
   the same before and after) -- counted in the page.  The aim's reticle is kept
   out of the photo by aiming far off. */
async function countsOf(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const W = img.width, Hh = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, Hh).data;
    let top = Hh, bot = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 13) + Math.abs(d[i + 1] - 11) + Math.abs(d[i + 2] - 24) >= 30) { const y = (i / 4 / W) | 0; if (y < top) top = y; bot = y; }
    }
    const h = bot - top + 1, w0 = top + h * 0.35, w1 = top + h * 0.75;
    let pink = 0, any = 0, grey = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;
      any++;
      if (r > 110 && b > 70 && r > b && g < r * 0.72 && b > g * 1.15) pink++;
      const y = (i / 4 / W) | 0, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (y >= w0 && y <= w1 && mx >= 80 && mx - mn <= 40 && r <= b + 20) grey++;
    }
    return { pink, any, grey };
  }, buf.toString('base64'));
}

const SHOTS = process.env.BT_CW_SHOTS ? H.REPO + '/tools/qa/mp/out/copperwaist' : null;

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const P = await H.newPlayer(browser, {
    name: 'Copperwaist', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel',
    init: LOOK,
  });
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
    /* the kit's copper, worn the way a player wears it (mp-ironwaist's wear) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' }).catch(() => {});
    await H.waitFor(P, () => {
      const R = window._gameState.current.rpg || {};
      return !!((R.armorStash || []).concat(R.armor ? [R.armor] : []).some((x) => x && x.mat === 'copper' && x.gid)
        && (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []).some((x) => x && x.mat === 'copper' && x.gid));
    }, (v) => v, { timeout: 15000, label: 'the copper pieces' }).catch(() => null);
    const worn = await page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg;
      const put = (stash, slot) => {
        if (R[slot] && R[slot].mat === 'copper') return R[slot].gid;
        if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
        const i = (R[stash] || []).findIndex((x) => x && x.mat === 'copper' && x.gid);
        if (i < 0) return null;
        R[slot] = R[stash][i]; R[stash].splice(i, 1);
        return R[slot].gid;
      };
      const t = put('armorStash', 'armor'), l = put('legsStash', 'legsArmor');
      if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
      S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
      return { t, l };
    });
    rec.ok('the copper plate and greaves are worn (guard)', !!worn.t && !!worn.l, worn);
    const G = await H.wheelGeom();
    await H.hopTo(P, Math.round(G.cx + 1350), Math.round(G.cy - 1350), { tries: 80 });
    await page.waitForTimeout(4000);
    const kit = await page.evaluate(KIT);
    rec.ok('the page can hold its clock and draw the bro alone (guard)', kit === true, kit);
    if (kit !== true) return;

    const results = {};
    for (const metal of METALS) {
      /* each metal worn the way a player wears it: the kit's copper or iron
         pieces put on (the server is told, so its next update keeps them);
         black steel, which the kit has no piece of, is the worn iron drawn
         as black steel on this phone (the art is one steel set; a metal is
         its tint) -- checked again at every way, so a server update putting
         the iron back would show */
      await page.evaluate((m) => {
        const S = window._gameState.current, R = S.rpg;
        const want = m === 'blacksteel' ? 'iron' : m;
        const put = (stash, slot) => {
          if (R[slot] && R[slot].mat === want) return R[slot].gid;
          if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
          const i = (R[stash] || []).findIndex((x) => x && x.mat === want && x.gid);
          if (i < 0) return null;
          R[slot] = R[stash][i]; R[stash].splice(i, 1);
          return R[slot].gid;
        };
        const t = put('armorStash', 'armor'), l = put('legsStash', 'legsArmor');
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
        if (m === 'blacksteel') { window.__btSetGear('chest', 'blacksteelplate'); window.__btSetGear('legs', 'blacksteelgreaves'); }
      }, metal);
      await page.waitForTimeout(1500);
      const gearNow = () => page.evaluate(() => [window.__btGetGear('chest'), window.__btGetGear('legs')]);
      const gear = await gearNow();
      rec.ok(`${metal}: the plate and greaves drawn in ${metal} (guard)`, gear[0] === metal + 'plate' && gear[1] === metal + 'greaves', gear);
      await page.waitForTimeout(6000);   /* the metal's masked bakes */
      for (const dir of PICK_DIRS) {
        const [keys, ang] = DIRS[dir];
        const c = await page.evaluate(() => {
          const S = window._gameState.current;
          const r = document.querySelector('canvas').getBoundingClientRect();
          return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
        });
        await page.mouse.move(c.x + Math.cos(ang) * 330, c.y + Math.sin(ang) * 330);
        await page.evaluate(() => { const S = window._gameState.current; window.__iw.anchor = { x: S.player.x, y: S.player.y }; window.__iw.markForeign(); });
        for (const k of keys) await page.keyboard.down(k);
        await page.waitForTimeout(3000);   /* the stride's bakes (a frame not baked yet draws the plain body: mp-wornbake's) */
        const t0 = await page.evaluate(() => Date.now());
        const seen = {};
        for (let dt = 0; dt < sweepFor(metal, dir); dt += STEP_MS) {
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
          if (pose.pose !== 'jog') continue;
          const m = await countsOf(page, buf);
          const f = pose.frame;
          if (!seen[f] || m.grey + m.pink > seen[f].grey + seen[f].pink) {
            seen[f] = m;
            if (SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(`${SHOTS}/${metal}-${dir}-${String(f).padStart(2, '0')}.png`, buf); }
          }
        }
        await page.evaluate(() => { window.__iw.isolate(false); window.__iw.free(); window.__iw.anchor = null; });
        for (const k of keys) await page.keyboard.up(k);
        await page.waitForTimeout(600);
        const g2 = await gearNow();
        if (g2[0] !== metal + 'plate' || g2[1] !== metal + 'greaves') rec.ok(`${metal} ${dir}: still drawn in ${metal} (guard)`, false, g2);
        results[metal + '/' + dir] = seen;
        const frames = Object.keys(seen).map(Number).sort((a, b) => a - b);
        console.log(`    ${metal} ${dir}: ${frames.length} frames, grey ${JSON.stringify(Object.fromEntries(frames.map((f) => [f, seen[f].grey])))} pink ${JSON.stringify(Object.fromEntries(frames.map((f) => [f, seen[f].pink])))}`);
      }
    }
    for (const [k, seen] of Object.entries(results)) {
      const [metal, dir] = k.split('/');
      const frames = Object.keys(seen).map(Number);
      const full = sweepFor(metal, dir) >= 1600;
      const worst = (fld) => frames.reduce((a, f) => (seen[f][fld] > a.n ? { f, n: seen[f][fld] } : a), { f: null, n: 0 });
      rec.ok(`${metal} ${dir}: the stride photographed (guard: ${frames.length} frames)`,
        (full ? frames.length >= 22 : frames.length >= 1) && frames.every((f) => seen[f].any > 500), frames.length);
      const p = worst('pink');
      rec.ok(`${metal} ${dir}: no trousers at the waist (${p.n} px of pink at most, frame ${p.f}; at most ${WAIST_MAX})`, p.n <= WAIST_MAX);
      if (metal === 'copper' && KEYED.includes(dir)) {
        const g = worst('grey');
        rec.ok(`copper ${dir}: no grey at the waist (${g.n} px at most, frame ${g.f}; at most ${GREY_MAX})`, g.n <= GREY_MAX,
          Object.fromEntries(frames.map((f) => [f, seen[f].grey])));
      }
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
