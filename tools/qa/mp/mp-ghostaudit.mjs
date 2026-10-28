/* ═══ v2.3.3668: THE GHOST AUDIT -- EVERY ANIMATION, NOTHING OF THE BODY UNDER IT ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".
 *
 * The bugs of that kind found so far were each found one at a time, by the
 * owner: the plain body flashing under the armour (v2.3.3577), bare hands over
 * the plate while fishing (v2.3.3623), a band of belly in the mining swing
 * (v2.3.3622).  This walks a bro through EVERY animation his own screen draws,
 * frame by frame, and photographs each frame alone:
 *   - his body is painted in colours nothing else wears: GREEN skin, a YELLOW
 *     tee, PINK trousers, BLUE boots, no hair, under an iron plate and greaves;
 *     so any of those colours where the armour should be is the body showing
 *     through, whichever piece of code drew it;
 *   - every world layer is hidden but the ones the figure is drawn in, and in
 *     those everything that was already standing there before the animation
 *     began (the tree he chops, the fire he cooks on): the figure stands on
 *     the canvas's own colour;
 *   - the game's clock is HELD (Date.now, which every renderer reads) and
 *     stepped, so each frame is the frame asked for, not whichever one a slow
 *     machine happened to draw;
 *   - after each animation, nothing of it may be left on screen: no stand-in
 *     piece still showing, and the walking body back.
 *
 * Three outfits: the full set, the plate alone, the greaves alone.  The
 * animations: standing and jogging (8 facings), the hit (8), the roll (8), the
 * loot pickup, the sword's swing, the bow's draw and the staff's cast (8
 * each), the jump (8), and mining, fishing, chopping, lighting a fire and
 * cooking.
 *
 * Each frame goes to tools/qa/mp/out/ghost/<outfit>-<family>-<n>.png with its
 * pose in ghost/index.json; tools/qa/ghost_audit_report.py counts the colours
 * in each and draws the contact sheets (ghost/sheets/).  This scenario's own
 * checks are the ones a number can make:
 *   1. every family drew frames (guard);
 *   2. the walking body is put away while a stand-in draws (never both);
 *   3. under the full set, no trousers, tee or boots colour in any frame
 *      (GHOST_PX tolerance);
 *   4. after each animation, nothing of it is left and the body is back.
 *
 *   node tools/qa/mp/run.mjs ghostaudit
 *   BT_GHOST_ONLY=stand,jog   only those families
 *   BT_GHOST_OUTFITS=full     only that outfit (full, plate, greaves; bare, no armour, only when named)
 *   BT_GHOST_SHIRT=print      v2.3.3696: the tee striped and printed
 *   BT_GHOST_DIRS=east,south  v2.3.3750: only those facings, every family (a sample)
 *   v2.3.3738, the double jump's flip (family `flip`, not in the default run):
 *   BT_GHOST_ONLY=flip BT_GHOST_DIRS=east,south,north BT_GHOST_HAT=top-hat
 *   BT_GHOST_HAIR=wavy BT_GHOST_LOOK=plain (the game's own colours)
 *   BT_GHOST_SKIN=ebony BT_GHOST_SPECIES=alien (v2.3.3738: the skin the head wears)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 900, height: 700 };
const DPR = 2;
const CLIP_W = 220, CLIP_H = 230;      /* CSS px round the figure: room for a swing, a roll and the lumberjack's axe */
const GHOST_PX = 6;                    /* device px of trousers/tee/boots colour forgiven a frame (antialiased edges) */
const SWORD_SWING_MS = 300;            /* entityRenderer.js */
const BOW_SHOT_MS = 360;

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  /* v2.3.3752: BT_LOOK_INLINE=1 -- the armour's look bakes on the page, not
     the worker (whose canvas is ~200x slower on the QA box: lookArmour.js) */
  if (${JSON.stringify(process.env.BT_LOOK_INLINE || '')} === '1') window.__btLookBakeInline = true;
  /* v2.3.3738: BT_GHOST_LOOK=plain -- the game's own colours, for pictures a
     person looks at (the flip's before/after); the ghost colours otherwise */
  if (${JSON.stringify(process.env.BT_GHOST_LOOK || '')} !== 'plain') {
    localStorage.setItem('bt-skin', 'green');
    localStorage.setItem('bt-pants', 'pink');
    localStorage.setItem('bt-shoes', 'blue');
    localStorage.setItem('bt-shirt', 'tshirt');
    localStorage.setItem('bt-shirtcolor', 'yellow');
  }
  /* v2.3.3738: BT_GHOST_HAT / BT_GHOST_HAIR -- a hat and hair on the head
     (the flip carries the head pieces now); none by default */
  localStorage.setItem('bt-hair', ${JSON.stringify(process.env.BT_GHOST_HAIR || 'none')});
  localStorage.setItem('bt-headwear', ${JSON.stringify(process.env.BT_GHOST_HAT || 'none')});
  /* v2.3.3738: BT_GHOST_SKIN / BT_GHOST_SPECIES -- the owner: the flip's head
     "will need to be recolored to whatever color the character is" */
  if (${JSON.stringify(process.env.BT_GHOST_SKIN || '')}) localStorage.setItem('bt-skin', ${JSON.stringify(process.env.BT_GHOST_SKIN || '')});
  if (${JSON.stringify(process.env.BT_GHOST_SPECIES || '')}) localStorage.setItem('bt-species', ${JSON.stringify(process.env.BT_GHOST_SPECIES || '')});
  /* v2.3.3696: BT_GHOST_SHIRT=print -- the tee striped (ART_PALETTE 5) with
     a block printed on the chest (ART_PALETTE 10, mp-gatherlook's), to see
     where a print and a pattern sit on every frame */
  if (${JSON.stringify(process.env.BT_GHOST_SHIRT || '')} === 'print') {
    localStorage.setItem('bt-shirtpat', 'stripe-v:5');
    let art = '';
    for (let i = 0; i < 256; i++) { const x = i % 16, y = (i / 16) | 0; art += (x >= 5 && x <= 10 && y >= 4 && y <= 9) ? 'a' : '0'; }
    localStorage.setItem('bt-shirtart', art);
  }
} catch (e) {}`;

/* the eight facings: the keys that walk that way, and the way as an angle */
const FACINGS = [
  ['east', ['d'], 0], ['southeast', ['s', 'd'], Math.PI / 4], ['south', ['s'], Math.PI / 2],
  ['southwest', ['s', 'a'], 3 * Math.PI / 4], ['west', ['a'], Math.PI], ['northwest', ['w', 'a'], -3 * Math.PI / 4],
  ['north', ['w'], -Math.PI / 2], ['northeast', ['w', 'd'], -Math.PI / 4],
].filter(([d]) => !process.env.BT_GHOST_DIRS || process.env.BT_GHOST_DIRS.split(',').includes(d));   /* v2.3.3750: BT_GHOST_DIRS=east,south,... samples the facings */

/* v2.3.3752: BT_GHOST_METAL=copper -- the kit's copper pieces instead of its
   iron (the look palette's armour, sampled in each metal the kit has) */
const METAL = process.env.BT_GHOST_METAL === 'copper' ? 'copper' : 'iron';
const OUTFITS = {
  full: { chest: METAL + 'plate', legs: METAL + 'greaves' },
  plate: { chest: METAL + 'plate', legs: 'none' },
  greaves: { chest: 'none', legs: METAL + 'greaves' },
  /* v2.3.3685: no armour -- every colour drawn, nothing to hide; for a hole
     in the figure (the background seen through it), only when asked:
     BT_GHOST_OUTFITS=bare */
  /* v2.3.3696: no armour, the tee seen whole (BT_GHOST_OUTFITS=bare; not in
     the default run) -- the mining shirt's print and pattern */
  bare: { chest: 'none', legs: 'none' },
};

/* installed once in the page: the clock that can be held, the isolation
   applied just before every render, and a render counter */
const PAGE_TOOLS = () => {
  if (window.__qaGhost) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  const G = window.__qaGhost = {
    renders: 0, on: false,
    /* every layer a figure of the bro is drawn in: the walking body
       (player, entities), the swing and other stand-ins (gatherNodes: the
       first trial's swing photos were empty with it hidden), the gathering
       figures (gatherNodesBack/Front), the gesture's arm (gestureFront) */
    keep: new Set(['entities', 'player', 'gatherNodesBack', 'gatherNodes', 'gatherNodesFront', 'gestureFront']),
    foreign: new Set(), hidLayers: new Set(), hidObjs: new Set(),
    realNow: Date.now, held: null, anchor: null,
  };
  /* the held clock creeps half a microsecond a read: code that works "until
     N ms have passed" (a time-sliced job) still finishes -- frozen outright,
     the first trial's page spun at 400% CPU and never drew again -- while a
     frame's few thousand reads move the pose a millisecond or two at most */
  G.hold = (t) => { G.held = t; Date.now = () => (G.held += 0.0005); };
  G.free = () => { Date.now = G.realNow; G.held = null; };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    try {
      if (G.on) {
        for (const layer of world.children) {
          if (!G.keep.has(layer.label)) {
            if (layer.visible) { layer.visible = false; G.hidLayers.add(layer); }
            continue;
          }
          for (const c of layer.children) if (G.foreign.has(c) && c.visible) { c.visible = false; G.hidObjs.add(c); }
        }
        const me = R.playerDisplayRaw();
        if (me && me._uiLayer && me._uiLayer.visible) { me._uiLayer.visible = false; G.hidObjs.add(me._uiLayer); }
      }
      /* a jog in place: the figure keeps its keys (and so its pose) but not
         the ground it covers */
      if (G.anchor) {
        const S = window._gameState.current;
        S.player.x = G.anchor.x; S.player.y = G.anchor.y;
      }
    } catch (e) { /* the frame still draws */ }
    G.renders++;
    return orig(...a);
  };
  /* everything standing in the kept layers now, but the walking body: it is
     hidden while the animation is photographed */
  G.markForeign = () => {
    G.foreign.clear();
    const me = R.playerDisplayRaw();
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) if (c !== me && c.visible) G.foreign.add(c);
    }
    return G.foreign.size;
  };
  G.isolate = (on) => {
    G.on = !!on;
    if (!on) {
      for (const l of G.hidLayers) l.visible = true;
      for (const o of G.hidObjs) o.visible = true;
      G.hidLayers.clear(); G.hidObjs.clear();
    }
  };
  /* what of the animation is still showing: kept-layer pieces visible now
     that were not standing there before it began */
  G.leftovers = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const px = (S.player.x - S.camera.x) * (S._worldScaleX || 1), py = (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    const out = [];
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) {
        if (c === me || !c.visible || G.foreign.has(c)) continue;
        const label = c.label || c.constructor.name;
        /* v2.3.3684: and the campfire a light leaves: since v2.3.3666 the light's
           fire IS the campfire (campfireFx adopts it), the point of lighting one */
        if (/^(monster_|npc_|wheelObject|peer_|player_|campfire$)/.test(label)) continue;
        let b = null;
        try { b = c.getBounds(); } catch (e) { /* none */ }
        if (!b || b.width < 2 || b.x > px + 120 || b.x + b.width < px - 120 || b.y > py + 90 || b.y + b.height < py - 170) continue;
        /* the picture it draws, so a leftover can be named */
        let tex = null;
        try {
          const t = c.texture, src = t && t.source;
          const res = src && src.resource;
          tex = (t && t.label) || (src && src.label) || (res && res.src ? String(res.src).split('/').pop().split('?')[0] : null)
            || (src ? `${src.width}x${src.height}` : null);
        } catch (e) { /* none */ }
        out.push({ layer: layer.label, label, w: Math.round(b.width), h: Math.round(b.height), tex, alpha: +(c.alpha || 0).toFixed(2),
          x: Math.round(b.x - px), y: Math.round(b.y - py), kids: c.children ? c.children.length : 0 });
      }
    }
    return { bodyVisible: !!(me && me.visible), pieces: out };
  };
  /* what else stands within the photograph's reach of the bro now (kept
     layers, visible, not his walking body): a clear spot has nothing */
  G.crowd = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const px = (S.player.x - S.camera.x) * (S._worldScaleX || 1), py = (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    const box = { l: px - 140, r: px + 140, t: py - 200, b: py + 110 };
    const what = [];
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) {
        if (c === me || !c.visible) continue;
        let b = null;
        try { b = c.getBounds(); } catch (e) { continue; }
        if (!b || b.x + b.width < box.l || b.x > box.r || b.y + b.height < box.t || b.y > box.b) continue;
        what.push((c.label || c.constructor.name) + '@' + layer.label);
      }
    }
    return what;
  };
  /* this frame's pose, as the renderers drew it */
  G.meta = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const fig = (k) => { try { const f = window[k] ? window[k]() : null; return f && f.visible ? { x: f.x, y: f.y } : null; } catch (e) { return null; } };
    /* v2.3.3684: the fire-lighter's own frame (its probe, __btFireFigure().fi),
       so the report names its frames 0-7 and not the hidden body's */
    let fireK = null;
    try { const f = window.__btFireFigure ? window.__btFireFigure() : null; if (f && f.visible && typeof f.fi === 'number') fireK = f.fi; } catch (e) { /* none */ }
    return {
      t: G.held, pose: fireK != null ? 'fire' : (me ? me._animPose || null : null), frame: fireK != null ? fireK : (me ? me._animFrame : null),
      facing: S._renderFacing || S._facing || null, bodyVisible: !!(me && me.visible),
      bodySprite: !!(me && me._spriteBody && me._spriteBody.visible),
      standInBody: S._standInBody === true, swing: !!S._swordSwinging, bow: !!S.autoAttack,
      ex: S._extraction ? S._extraction.skill : null, fire: !!S._firemaking,
      chop: fig('__btChopFigure'), cook: fig('__btCookFigure'), fireFig: fig('__btFireFigure'),
      x: S.player.x, y: S.player.y,
      /* v2.3.3738: BT_GHOST_LAYERS=1 -- every visible piece of the figure,
         named by its picture, with its alpha and tint (which layer paints what) */
      layers: window.__qaGhostLayers && me ? (() => {
        const out = [];
        const walk = (c, depth) => {
          if (!c || !c.visible || depth > 4) return;
          let tex = null;
          try { const t = c.texture, src = t && t.source, res = src && src.resource; tex = (t && t.label) || (src && src.label) || (res && res.src ? String(res.src).split('/').pop().split('?')[0] : null) || (src ? src.width + 'x' + src.height : null); } catch (e) { /* none */ }
          if (tex || c.constructor.name === 'Graphics') out.push({ label: c.label || c.constructor.name, tex, a: +(c.alpha).toFixed(2), tint: c.tint != null ? c.tint : null, blend: c.blendMode || null, depth });
          for (const k of c.children || []) walk(k, depth + 1);
        };
        walk(me, 0);
        return out;
      })() : undefined,
    };
  };
  return true;
};

/* mp-gatherlook's walk, tap and nodes (mp-harvestbar's walk, checked against
   the worker) */
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
    /* or E, the computer's own way in (desktopControls runInteract) */
    await P.page.keyboard.press('e');
    await P.page.waitForTimeout(400);
    if (await H.readState(P, done)) return true;
  }
  return false;
}
const nearestNode = (P, type) => P.page.evaluate((t) => {
  const S = window._gameState.current, p = S.player;
  let best = null, d = Infinity;
  for (const n of S.gatherNodes || []) {
    if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
    const dd = Math.hypot(n.x - p.x, n.y - p.y);
    if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
  }
  return best;
}, type);
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out/ghost');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const only = process.env.BT_GHOST_ONLY ? new Set(process.env.BT_GHOST_ONLY.split(',')) : null;
  const want = (f) => !only || only.has(f);
  const outfits = (process.env.BT_GHOST_OUTFITS || 'full,plate,greaves').split(',').filter((o) => OUTFITS[o]);
  const P = await H.newPlayer(browser, { name: 'Ghostbro', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const index = [];
  const summary = {};
  const page = P.page;
  /* the next two drawn frames */
  /* a page that reloaded under the audit (its tools gone) stops it loudly:
     every photograph after would be the plain page */
  const renders = async () => {
    const r = await page.evaluate(() => (window.__qaGhost ? window.__qaGhost.renders : -1));
    if (r < 0) throw new Error('the page reloaded under the audit (its tools are gone)');
    return r;
  };
  const drawn = async (n = 2) => {
    const r0 = await renders();
    for (let i = 0; i < 200; i++) {
      await page.waitForTimeout(40);
      if (await renders() >= r0 + n) return true;
    }
    return false;
  };
  /* the figure's anchor on the page: the stand-in's when one draws, else the bro's */
  const anchor = () => page.evaluate(() => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const m = window.__qaGhost.meta();
    const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
    let wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y + 52;
    const sf = m.chop || m.cook || m.fireFig;
    if (sf && m.standInBody) { wx = sf.x; wy = sf.y; }
    return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1), meta: m };
  });
  let shotN = 0;
  const seen = new Set();
  /* one photograph of the held frame, unless that pose's frame was taken already */
  const take = async (outfit, family, tag) => {
    await drawn(2);
    const a = await anchor();
    const m = a.meta;
    const key = `${outfit}|${family}|${tag}|${m.pose}|${m.frame}|${m.standInBody}|${m.swing}|${Math.round((m.t || 0) / 10)}`;
    const dedupe = `${outfit}|${family}|${tag}|${m.pose}|${m.frame}|${m.bodyVisible}|${m.standInBody}`;
    if (family !== 'swing' && family !== 'bow' && family !== 'chop' && family !== 'cook' && family !== 'fire' && seen.has(dedupe)) return null;
    seen.add(dedupe);
    const clip = {
      x: Math.max(0, Math.min(VIEW.width - CLIP_W, Math.round(a.x - CLIP_W / 2))),
      y: Math.max(0, Math.min(VIEW.height - CLIP_H, Math.round(a.y - CLIP_H + 50))),
      width: CLIP_W, height: CLIP_H,
    };
    const file = `${outfit}-${family}-${String(++shotN).padStart(4, '0')}.png`;
    await page.screenshot({ path: join(OUT, file), clip }).catch(() => {});
    const row = { file, outfit, family, tag, key, clip, feet: { x: Math.round((a.x - clip.x) * DPR), y: Math.round((a.y - clip.y) * DPR) }, ...m };
    index.push(row);
    return row;
  };
  /* step the held clock across `ms` from `t0`, a photograph every `step` */
  const sweep = async (outfit, family, tag, t0, ms, step) => {
    let n = 0;
    for (let t = 0; t <= ms; t += step) {
      await page.evaluate((T) => window.__qaGhost.hold(T), t0 + t);
      if (await take(outfit, family, tag)) n++;
    }
    return n;
  };
  const keysDown = async (ks) => { for (const k of ks) await page.keyboard.down(k); };
  const keysUp = async (ks) => { for (const k of ks) await page.keyboard.up(k); };
  /* the mouse over the canvas, `dist` CSS px from the bro the way `ang` points */
  const aim = async (ang, dist = 150) => {
    const c = await page.evaluate(() => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
    });
    await page.mouse.move(c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist);
    return c;
  };
  /* face a way: a short step that way, then stand */
  const face = async (keys, ang) => {
    await aim(ang);
    await keysDown(keys);
    await page.waitForTimeout(160);
    await keysUp(keys);
    await page.waitForTimeout(450);
  };
  const begin = async () => {
    await page.evaluate(() => { window.__qaGhost.free(); window.__qaGhost.anchor = null; window.__qaGhost.markForeign(); window.__qaGhost.isolate(true); });
  };
  const end = async (outfit, family) => {
    await page.evaluate(() => { window.__qaGhost.free(); window.__qaGhost.anchor = null; });
    await page.waitForTimeout(1600);
    const left = await page.evaluate(() => window.__qaGhost.leftovers());
    await page.evaluate(() => window.__qaGhost.isolate(false));
    /* every facing's leftovers kept, not only the last one's */
    const s = summary[`${outfit}/${family}`] || (summary[`${outfit}/${family}`] = { frames: 0 });
    const L = s.leftovers || (s.leftovers = { bodyVisible: true, pieces: [], after: [] });
    L.bodyVisible = L.bodyVisible && left.bodyVisible;
    for (const p of left.pieces) L.pieces.push(p);
    if (!left.bodyVisible || left.pieces.length) L.after.push(index.length ? index[index.length - 1].tag : null);
    return left;
  };
  const count = (outfit, family) => index.filter((r) => r.outfit === outfit && r.family === family).length;

  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]), [data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await page.waitForTimeout(2500);
    const tools = await page.evaluate(PAGE_TOOLS);
    if (process.env.BT_GHOST_LAYERS) await page.evaluate(() => { window.__qaGhostLayers = true; });   /* v2.3.3738 */
    rec.ok('the page\'s clock can be held and the figure photographed alone (guard)', !!tools);
    if (!tools) return;
    /* the black-screen watchdog (BroTown.jsx) judges a screen that is nearly
       all the canvas's own colour as a lost GPU: two strikes rebuild the
       renderer, four reload the page -- and a figure photographed alone IS
       that screen (the first trials: the page reloaded mid-sweep, plain and
       unisolated).  It does not judge behind a loading veil, so one is laid,
       hidden, for the whole audit */
    await page.evaluate(() => {
      const v = document.createElement('div');
      v.className = 'bt-zone-loading';
      v.setAttribute('data-qa-ghost-veil', '');
      v.style.setProperty('display', 'none', 'important');
      document.body.appendChild(v);
    });

    /* a clear spot on the commons, south of the town's middle: nothing standing
       within the photograph but the bro */
    /* the least crowded of a few spots on the commons: whatever stands
       there is hidden for the photographs anyway (markForeign), so a spot
       with nothing in reach is only the safest, not a need -- the commons
       have none (the first run tried ten) */
    const G = await H.wheelGeom();
    let spot = null, crowd = null, best = Infinity;
    for (const [dx, dy] of [[1350, -1350], [0, 1900], [1900, 0], [-1900, 0], [0, -1900], [1350, 1350]]) {
      const at = { x: Math.round(G.cx + dx), y: Math.round(G.cy + dy) };
      await H.hopTo(P, at.x, at.y, { tries: 80 });
      await page.waitForTimeout(1200);
      const c = await page.evaluate(() => window.__qaGhost.crowd());
      console.log(`    spot ${at.x},${at.y}: ${c.length ? c.join(', ') : 'clear'}`);
      if (c.length < best) { best = c.length; spot = at; crowd = c; }
      if (c.length <= 1) break;
    }
    if (spot) { await H.hopTo(P, spot.x, spot.y, { tries: 80 }); await page.waitForTimeout(1200); }
    rec.ok(`a quiet spot on the commons for the photographs (${spot ? spot.x + ',' + spot.y + ', ' + best + ' things in reach, hidden' : 'none'}) (guard)`, !!spot, crowd);
    if (!spot) return;

    /* the kit's armour, worn the way a player wears it (mp-armourflash):
       the rendered layer follows the piece the worker says is worn
       (gearCatalog.js syncArmorLayers), so a layer set on the page alone
       was undone after the first photograph */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' }).catch(() => {});
    await page.waitForFunction((m) => {
      const R = window._gameState.current.rpg || {};
      return !!((R.armorStash || []).concat(R.armor ? [R.armor] : []).some((x) => x && x.mat === m && x.gid)
        && (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []).some((x) => x && x.mat === m && x.gid));
    }, METAL, { timeout: 15000, polling: 250 }).catch(() => null);   /* the kit's pieces of the metal */
    const wear = (o) => page.evaluate(([o, metal]) => {
      const S = window._gameState.current, R = S.rpg;
      const put = (stash, slot, want) => {
        if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
        if (!want) return null;
        const i = (R[stash] || []).findIndex((x) => x && x.mat === metal && x.gid);
        if (i < 0) return null;
        R[slot] = R[stash][i]; R[stash].splice(i, 1);
        return R[slot].gid;
      };
      const t = put('armorStash', 'armor', o.chest !== 'none');
      const l = put('legsStash', 'legsArmor', o.legs !== 'none');
      if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
      S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
      return { t, l };
    }, [o, METAL]);

    for (const outfit of outfits) {
      const o = OUTFITS[outfit];
      await wear(o);
      const worn = await H.waitFor(P, () => ({ chest: window.__btGetGear('chest'), legs: window.__btGetGear('legs') }),
        (v) => v.chest === o.chest && v.legs === o.legs, { timeout: 15000, label: outfit + ' worn' }).catch(() => null);
      rec.ok(`${outfit}: the armour worn the real way (chest ${o.chest}, legs ${o.legs}) (guard)`, !!worn, worn);
      await page.waitForTimeout(2500);
      const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));

      /* ── standing, every facing ── */
      if (want('stand')) {
        for (const [dir, keys, ang] of FACINGS) {
          await face(keys, ang);
          await begin();
          const t0 = await page.evaluate(() => Date.now());
          await sweep(outfit, 'stand', dir, t0, 1600, 100);
          await end(outfit, 'stand');
        }
      }
      /* ── jogging in place, every facing ── */
      if (want('jog')) {
        for (const [dir, keys, ang] of FACINGS) {
          await aim(ang);
          await begin();
          await page.evaluate((h) => { window.__qaGhost.anchor = h; }, here);
          await keysDown(keys);
          await page.waitForTimeout(500);
          const t0 = await page.evaluate(() => Date.now());
          await sweep(outfit, 'jog', dir, t0, 1400, 50);
          await keysUp(keys);
          await end(outfit, 'jog');
        }
      }
      /* ── the hit's flinch ── */
      if (want('hit')) {
        for (const [dir, keys, ang] of FACINGS) {
          await face(keys, ang);
          await begin();
          const t0 = await page.evaluate(() => { const T = Date.now(); window.__qaGhost.hold(T); window._gameState.current._hitFlash = T; return T; });
          await sweep(outfit, 'hit', dir, t0, 240, 30);
          await end(outfit, 'hit');
        }
      }
      /* ── the roll ── */
      if (want('dodge')) {
        for (const [dir, keys, ang] of FACINGS) {
          await H.devOp(wsPort, 'vitals', myId, { heal: true });
          await face(keys, ang);
          await begin();
          await keysDown(keys);
          await page.keyboard.press('Space');
          const r = await H.waitFor(P, (S) => (S._dodgeRoll ? { s: S._dodgeRoll.startTime, d: S._dodgeRoll.durMs } : null), (v) => !!v, { timeout: 3000, label: 'a roll' }).catch(() => null);
          await keysUp(keys);
          if (r) await sweep(outfit, 'dodge', dir, r.s, Math.max(200, (r.d || 500) - 20), 40);
          await end(outfit, 'dodge');
          await H.hopTo(P, here.x, here.y, { tries: 10 });
        }
      }
      /* ── the loot pickup ── */
      if (want('pickup')) {
        await face(['s'], Math.PI / 2);
        await begin();
        const t0 = await page.evaluate(() => { const T = Date.now(); window.__qaGhost.hold(T); window._gameState.current._lootFreezeUntil = T + 1000; return T; });
        await sweep(outfit, 'pickup', 'south', t0, 980, 40);
        await end(outfit, 'pickup');
      }
      /* ── the sword's swing, the bow's draw, the staff's cast ── */
      const weapons = [['swing', 'greatsword', 'weapon', 'melee'], ['bow', 'bow', 'rangedWeapon', 'ranged'], ['staff', 'staff', 'staffWeapon', 'staff']];
      for (const [family, type, slot, active] of weapons) {
        if (!want(family)) continue;
        const eq = await H.equipWeapon(P, type, slot, active);
        await page.waitForTimeout(1500);
        summary[`${outfit}/${family}`] = { frames: 0, equip: eq };
        for (const [dir, keys, ang] of FACINGS) {
          await face(keys, ang);
          const c = await aim(ang);
          await begin();
          await page.mouse.down();
          let t0 = null;
          if (family === 'swing') {
            const sw = await H.waitFor(P, (S) => (S._swordSwinging && S.swingTimer ? S.swingTimer : null), (v) => !!v, { timeout: 4000, label: 'a swing' }).catch(() => null);
            if (sw) { t0 = sw; await sweep(outfit, family, dir, t0, SWORD_SWING_MS - 10, 30); }
          } else {
            await page.waitForTimeout(250);
            t0 = await page.evaluate(() => Date.now());
            await sweep(outfit, family, dir, t0, family === 'bow' ? 1200 : 900, 60);
          }
          await page.mouse.up();
          void c;
          await end(outfit, family);
        }
      }
      /* ── the jump ── */
      if (want('jump')) {
        for (const [dir, keys, ang] of FACINGS) {
          await face(keys, ang);
          await begin();
          await page.keyboard.press('x');
          const j = await H.waitFor(P, (S) => (S._jump ? (S._jump.startedAt || S._jump.t0 || S._jump.start || null) : null), (v) => !!v, { timeout: 3000, label: 'a jump' }).catch(() => null);
          const t0 = j || await page.evaluate(() => Date.now());
          await sweep(outfit, 'jump', dir, t0, 600, 40);
          await end(outfit, 'jump');
        }
      }
      /* ── v2.3.3738: the double jump's flip, the roll's tumble in the air:
         only when named (BT_GHOST_ONLY=flip).  A jump (X), then X again half
         way through it; the flip is swept on its own clock.  BT_GHOST_DIRS
         limits the facings (the owner: three are enough to look at) ── */
      if (only && only.has('flip')) {
        const dirs = process.env.BT_GHOST_DIRS ? new Set(process.env.BT_GHOST_DIRS.split(',')) : null;
        for (const [dir, keys, ang] of FACINGS) {
          if (dirs && !dirs.has(dir)) continue;
          await face(keys, ang);
          await begin();
          /* the jump and its flip from inside the page, where a slow frame
             cannot land the jump between the two presses: the second press
             goes the moment the jump is a third of the way through (the flip
             may start from FLIP_FROM, 0.15); tried up to three times */
          let f = null;
          for (let k = 0; k < 3 && !f; k++) {
            f = await page.evaluate(async () => {
              const S = window._gameState.current;
              const key = (t) => window.dispatchEvent(new KeyboardEvent(t, { code: 'KeyX', key: 'x', bubbles: true }));
              key('keydown'); key('keyup');
              for (let i = 0; i < 300; i++) {
                const j = S._jump;
                if (j && !j.flip && (Date.now() - j.t0) / j.dur >= 0.33) { key('keydown'); key('keyup'); break; }
                if (j && j.flip) break;
                await new Promise((r) => setTimeout(r, 5));
              }
              const j = S._jump;
              return j && j.flip ? { t0: j.t0, dur: j.dur } : null;
            });
            if (!f) await page.waitForTimeout(2500);
          }
          if (f) await sweep(outfit, 'flip', dir, f.t0, f.dur * 0.98, Math.max(20, f.dur / 14));
          await end(outfit, 'flip');
        }
      }
      /* ── the harvests: mining, chopping, fishing, a fire and a cook (the
         gathering figures and poses), on the nearest of each to the spot ── */
      if (outfit !== 'greaves') {
        const harvest = async (family, type, skill) => {
          if (!want(family)) return;
          const n = await nearestNode(P, type);
          if (!n) { summary[`${outfit}/${family}`] = { frames: 0, why: 'no ' + type }; return; }
          await travel(P, wsPort, myId, n.x + STAND[type][0], n.y + STAND[type][1]);
          await page.waitForTimeout(1200);
          await begin();
          const ok = await tapNode(P, n.id, (S) => !!S._extraction);
          const st = await H.waitFor(P, (S) => (S._extraction ? { skill: S._extraction.skill, hid: S._standInBody === true } : null),
            (v) => !!v && v.skill === skill && (skill === 'mining' || skill === 'fishing' || v.hid), { timeout: 8000, label: family }).catch(() => null);
          summary[`${outfit}/${family}`] = { frames: 0, started: ok, state: st };
          if (st) {
            const t0 = await page.evaluate(() => Date.now());
            await sweep(outfit, family, 'south', t0, 1800, 60);
          }
          await page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
          await end(outfit, family);
        };
        await harvest('mine', 'oreVein', 'mining');
        await harvest('chop', 'tree', 'woodcutting');
        /* a fire, then a cook on it, a little south of the tree */
        if (want('fire') || want('cook')) {
          await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
          await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
          await H.waitFor(P, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready', { timeout: 30000, label: 'fire-lighter' }).catch(() => null);
          const me0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
          await travel(P, wsPort, myId, me0.x, me0.y + 240);
          await page.waitForTimeout(800);
          await begin();
          await page.evaluate(() => {
            const bus = window._itemDetailBus;
            const S = window._gameState && window._gameState.current;
            if (bus && S && S.rpg) bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
          });
          await page.locator('button:visible', { hasText: 'Light fire' }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
          await page.evaluate(() => {
            const b = [...document.querySelectorAll('button')].find((x) => /Light fire/.test(x.textContent || '') && x.offsetParent);
            if (b) b.click();
          });
          const lit = await H.waitFor(P, (S) => !!S._firemaking && S._standInBody === true, (v) => v, { timeout: 8000, label: 'lighting' }).catch(() => null);
          summary[`${outfit}/fire`] = { frames: 0, started: !!lit };
          if (lit) {
            /* v2.3.3668: the light's own fire, drawn in code on the log from
               the strike since v2.3.3666 (campfireFx), is not the figure:
               hidden while the light is photographed, on a build with the
               switch, so its yellows are never read as the tee */
            await page.evaluate(() => (window.__btCampfireHide ? window.__btCampfireHide(true) : null)).catch(() => {});
            /* v2.3.3684: from the light's own start (its frames are 67 ms each,
               the light over in about half a second: a sweep from "now" began
               part way through and photographed three of its eight frames) */
            const t0 = await page.evaluate(() => { const fm = window._gameState.current._firemaking; return (fm && fm.startedAt) || Date.now(); });
            await sweep(outfit, 'fire', 'south', t0, 1800, 30);
            await page.evaluate(() => (window.__btCampfireHide ? window.__btCampfireHide(false) : null)).catch(() => {});
          }
          await end(outfit, 'fire');
          await page.keyboard.press('Escape').catch(() => {});
          const camp = await H.waitFor(P, (S) => ({ fire: !!S._campfire, lighting: !!S._firemaking, cook: window.__btStandIns().cook }),
            (v) => v.fire && !v.lighting && v.cook.state === 'ready', { timeout: 20000, label: 'a campfire, and the cook made' }).catch(() => null);
          if (camp && want('cook')) {
            await begin();
            let cooking = null;
            for (let k = 0; k < 4 && cooking !== 'cooking'; k++) {
              await page.evaluate(() => {
                const S = window._gameState.current, n = S._campfire;
                const cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
                const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y = rc.top + (n.y - S.camera.y) * (S._worldScaleY || 1);
                const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
                cv.dispatchEvent(new MouseEvent('mousedown', o)); cv.dispatchEvent(new MouseEvent('mouseup', o)); cv.dispatchEvent(new MouseEvent('click', o));
              });
              cooking = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'cooking', { timeout: 3000, label: 'a cook' }).catch(() => null);
            }
            summary[`${outfit}/cook`] = { frames: 0, started: cooking === 'cooking' };
            if (cooking === 'cooking') {
              await H.waitFor(P, (S) => S._standInBody === true, (v) => v, { timeout: 5000, label: 'the cook drawn' }).catch(() => null);
              const t0 = await page.evaluate(() => Date.now());
              await sweep(outfit, 'cook', 'south', t0, 1800, 60);
            }
            await page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
            await end(outfit, 'cook');
          }
        }
        await harvest('fish', 'fishSpot', 'fishing');
        /* back to the spot for the next outfit */
        await travel(P, wsPort, myId, spot.x, spot.y);
        await page.waitForTimeout(1000);
      }
      for (const fam of ['stand', 'jog', 'hit', 'dodge', 'pickup', 'swing', 'bow', 'staff', 'jump', 'flip' /* v2.3.3738 */, 'mine', 'chop', 'fire', 'cook', 'fish']) {
        if (!want(fam)) continue;
        const s = summary[`${outfit}/${fam}`] || (summary[`${outfit}/${fam}`] = {});
        s.frames = count(outfit, fam);
      }
    }
    writeFileSync(join(OUT, 'index.json'), JSON.stringify({ index, summary }, null, 1));

    /* the checks a number can make here; the colours are counted by the report */
    for (const [k, s] of Object.entries(summary)) {
      rec.ok(`${k}: ${s.frames} frames photographed (guard)`, s.frames > 0, s.equip || null);
      const both = index.filter((r) => `${r.outfit}/${r.family}` === k && r.standInBody && r.bodyVisible);
      rec.ok(`${k}: the walking body is never drawn with a stand-in (${both.length} frames with both)`, both.length === 0, both.slice(0, 3).map((r) => r.file));
      const L = s.leftovers;
      rec.ok(`${k}: after it, nothing of it is left (${L ? L.pieces.length : '?'} pieces) and the body is back (${L && L.bodyVisible})`,
        !!L && L.bodyVisible && L.pieces.length === 0, L);
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    try { writeFileSync(join(OUT, 'index.json'), JSON.stringify({ index, summary }, null, 1)); } catch (e) { /* none */ }
    await P.ctx.close().catch(() => {});
  }
  void GHOST_PX; void BOW_SHOT_MS;
}
