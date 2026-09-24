/* ═══ v2.3.2922: A FIGURE'S LAYERS MOVE AS ONE ═══
 *
 * Owner: "While wearing torso armor though jogging northeast / northwest
 * there's a subtle flicker that occurs near the neckline where it meets the
 * armor."
 *
 * The cause (sharpPixels.js, v2.3.2922): the armoured figure is stacked
 * sprites -- the masked body, the plate, the greaves -- on one texel grid, and
 * roundPixels snapped each sprite to whole screen pixels on its own.  Their
 * crops start on different fractions of a pixel, so as the camera slid the
 * plate snapped at different moments from the body, and the collar line
 * jumped a pixel against the neck.  NE/NW, because a matched set is one
 * knight sprite in the other six facings.
 *
 * What is proven here:
 *   1. guards: the character batcher is on, and jogging NE/NW in plate and
 *      greaves of one metal (the owner's case) draws the STACKED figure --
 *      plate and greaves sprites up, not a knight sheet; nothing on the page
 *      covers the figure in any picture; the camera steps really moved it;
 *   2. frozen mid-jog, the camera stepped through one screen pixel in tenths
 *      (the vertical slide a diagonal jog makes, every frame): the plate
 *      keeps its place on the body to a small fraction of a pixel on every
 *      step, NE and NW, on four frames of the run;
 *   3. the same measurement on the same build with ?figround=1 (the old
 *      per-sprite snap) sees the plate jump against the body by most of a
 *      pixel -- so a pass in 2 is the fix, not a test that cannot see it.
 *
 * HOW A LAYER'S POSITION IS READ.  Each step is drawn three times: the whole
 * figure (for the pictures), the body sprite ALONE, and the plate sprite
 * ALONE, with the world hidden behind them (the renderer's plain clear
 * colour).  A layer's position is the centre of its brightness over the whole
 * picture.  The character batcher draws each seam between texels as a
 * one-pixel blend, so moving a layer by a tenth of a pixel moves that centre
 * by exactly a tenth, whatever the art looks like; a layer that snaps moves
 * it in jumps.  (Two earlier versions of this check read EDGES off the
 * composite instead -- a brightness threshold, then the centre of the change
 * across the collar -- and both were fooled by the art itself: the head's
 * keyline is a mid brown that sits on any threshold, and the plate's shading
 * slides in and out of any window put round the collar.)
 *
 * Pictures: /tmp/qa-figureseam/.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = '/tmp/qa-figureseam';
const PHONE = { width: 390, height: 844 };
const STEPS = 10;                 /* tenths of a screen pixel */
const FRAMES = [0, 5, 11, 17];    /* pinned-clock offsets, in 60 fps frames: different frames of the run */
const DIRS = { ne: ['w', 'd'], nw: ['w', 'a'] };
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

/* mp-sheen's frozen frame: the game's own renderer arguments off one real
   frame, then the loop held; each draw pins both clocks to one instant. */
const freeze = async (P) => {
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer;
    if (!R.__fsWrapped) {
      const orig = R.update;
      R.update = function (...args) { window.__fsArgs = args; return orig.apply(this, args); };
      R.__fsWrapped = true;
    }
    window.__fsArgs = null;
    const wait = () => (window.__fsArgs ? res() : setTimeout(wait, 16));
    wait();
  }));
  await P.page.evaluate(() => {
    window.__fsReal = window.requestAnimationFrame.bind(window);
    window.__fsHeld = [];
    window.requestAnimationFrame = (cb) => { window.__fsHeld.push(cb); return 0; };
    window.__fsT = Date.now();
    window.__fsPT = performance.now();
    const S = window._gameState.current;
    window.__fsCam = { x: S.camera.x, y: S.camera.y };
  });
};
const thaw = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (window.__fsCam) { S.camera.x = window.__fsCam.x; S.camera.y = window.__fsCam.y; }
  const held = window.__fsHeld || [];
  window.requestAnimationFrame = window.__fsReal;
  window.__fsHeld = null;
  for (const cb of held) window.requestAnimationFrame(cb);
});

/* One draw at frame offset `fi`, the camera `k` tenths of a SCREEN pixel
   down from where it froze.  For the length of the render the world, the
   name plate and -- for `only` 'body' / 'chest' -- every other piece of the
   figure are hidden.  Returns what the stacked figure is made of. */
const drawStep = (P, fi, k, only) => P.page.evaluate(([fi, k, STEPS, only]) => {
  const S = window._gameState.current;
  const R = window._pixiRenderer;
  const app = R.app;
  const res = app.renderer.resolution;
  const sc = S._worldScaleY || 0.8;
  S.camera.y = window.__fsCam.y + (k / STEPS) / (sc * res);
  const pd = R.playerDisplayRaw();
  if (!app.__fsRender) {
    const orig = app.render.bind(app);
    app.__fsRender = orig;
    app.render = function (...a) {
      const hidden = [];
      const d = R.playerDisplayRaw();
      const hide = (c) => { if (c && c.visible) { c.visible = false; hidden.push(c); } };
      if (d && window.__fsOnly) {
        for (let n = d; n && n.parent; n = n.parent) {
          for (const c of n.parent.children) if (c !== n) hide(c);
        }
        hide(d._uiLayer);
        const keep = window.__fsOnly === 'body' ? d._spriteBody : window.__fsOnly === 'chest' ? d._gearChest : null;
        if (keep) for (const c of d.children) if (c !== keep) hide(c);
      }
      try { return orig(...a); } finally { for (const c of hidden) c.visible = true; }
    };
  }
  window.__fsOnly = only;
  const t = window.__fsT + fi * 1000 / 60, pt = window.__fsPT + fi * 1000 / 60;
  const dn = Date.now, pn = performance.now.bind(performance);
  Date.now = () => t; performance.now = () => pt;
  try { R.update(...window.__fsArgs); } finally { Date.now = dn; performance.now = pn; window.__fsOnly = null; }
  const sb = pd && pd._spriteBody, gc = pd && pd._gearChest, gl = pd && pd._gearLegs;
  const lbl = (s) => { try { return String((s && s.texture && s.texture.source && s.texture.source.label) || ''); } catch (e) { return ''; } };
  return {
    facing: S._renderFacing || null,
    chest: !!(gc && gc.visible), legs: !!(gl && gl.visible),
    knight: /\/fullset\//.test(lbl(sb)),
    tex: [sb && sb.texture ? sb.texture.uid : null, gc && gc.texture ? gc.texture.uid : null],
    sharp: window.__btSharp ? window.__btSharp() : null,
    dialogue: !!document.querySelector('.bt-npcdlg, .bt-qoffer, [data-quest-banner="welcome"]'),
  };
}, [fi, k, STEPS, only]);

/* A layer's vertical position: the centre of its brightness over the whole
   picture, in screen pixels.  Brightness ABOVE the clear colour, signed, so a
   pixel half covered counts half -- the linearity the file header relies on. */
function centreY(img) {
  const ch = img.channels;
  const L = (i) => 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
  const bg = L(0);
  let m0 = 0, m1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const w = L((y * img.width + x) * ch) - bg;
      m0 += w; m1 += w * (y + 0.5);
    }
  }
  return m0 > 0 ? m1 / m0 : null;
}
/* Nothing but the clear colour (0x0d0b18) round the picture's edge: nothing
   on the PAGE covers the figure (a welcome plate, a dialogue, a toast), and
   no part of the layer reaches the frame -- a layer cut by the frame would
   lose pixels as it moves, and its centre would drift for that reason. */
function clearBorder(img) {
  const ch = img.channels;
  let n = 0, ok = 0;
  const at = (x, y) => {
    const i = (y * img.width + x) * ch;
    n++;
    if (Math.abs(img.data[i] - 0x0d) <= 3 && Math.abs(img.data[i + 1] - 0x0b) <= 3 && Math.abs(img.data[i + 2] - 0x18) <= 3) ok++;
  };
  for (let x = 0; x < img.width; x++) { at(x, 0); at(x, img.height - 1); }
  for (let y = 1; y < img.height - 1; y++) { at(0, y); at(img.width - 1, y); }
  return n ? ok / n : 0;
}

/* One direction: jog, freeze, and for each frame the whole sweep. */
async function sweep(P, dirn, tag) {
  await H.hopTo(P, 1105, 1085).catch(() => {});
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(400);
  for (const k of DIRS[dirn]) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(2200);    /* a whole run cycle, so every frame is already baked */
  await freeze(P);
  await P.page.waitForTimeout(150);
  const box = await H.figureBox(P, { pad: 24 });
  const out = [];
  let info = null;
  for (const fi of FRAMES) {
    const body = [], chest = [];
    let clear = 1, sameFrame = true, dialogue = false, first = null;
    for (let k = 0; k <= STEPS; k++) {
      if (process.env.FS_ALL || k === 0 || k === STEPS) {   /* FS_ALL=1: every step, for the before/after pictures */
        await drawStep(P, fi, k, 'all');
        writeFileSync(`${DIR}/${tag}-${dirn}-f${fi}-k${k}.png`, await P.page.screenshot({ clip: box }));
      }
      for (const only of ['body', 'chest']) {
        const st = await drawStep(P, fi, k, only);
        if (!info) info = st;
        if (!first) first = st;
        if (st.tex[0] !== first.tex[0] || st.tex[1] !== first.tex[1]) sameFrame = false;
        if (st.dialogue) dialogue = true;
        const img = H.decodePng(await P.page.screenshot({ clip: box }));
        clear = Math.min(clear, clearBorder(img));
        (only === 'body' ? body : chest).push(centreY(img));
      }
    }
    const ok = body.every((v) => v != null) && chest.every((v) => v != null);
    const rel = ok ? body.map((b, i) => chest[i] - b) : [];
    const span = (a) => (a.length ? Math.max(...a) - Math.min(...a) : null);
    /* how far each layer strays from a steady glide: 0 for a layer that
       moves a tenth per step, up to ~0.5 for one that snaps */
    const bumpy = (a) => (a.length ? Math.max(...a.map((v, i) => Math.abs(v - (a[0] + (a[a.length - 1] - a[0]) * i / (a.length - 1))))) : null);
    out.push({
      fi, sameFrame, dialogue, clear: +clear.toFixed(3),
      moved: ok ? +(body[STEPS] - body[0]).toFixed(2) : null,
      rel: ok ? +span(rel).toFixed(2) : null,
      bumpyBody: ok ? +bumpy(body).toFixed(2) : null,
      bumpyChest: ok ? +bumpy(chest).toFixed(2) : null,
      rels: rel.map((v) => +v.toFixed(2)),
    });
  }
  await thaw(P);
  for (const k of DIRS[dirn]) await P.page.keyboard.up(k);
  await P.page.waitForTimeout(300);
  return { info, frames: out };
}

async function dress(P, wsPort) {
  await H.enterWorld(P);
  for (let i = 0; i < 30; i++) {
    const ok = await P.page.evaluate(() => !!(window._gameState && window._gameState.current && window._gameState.current.channel && window.__btLightFx && window._pixiRenderer)).catch(() => false);
    if (ok) break;
    await P.page.waitForTimeout(500);
  }
  /* every quest done, so no NPC opens a dialogue over the figure on the
     cobble (the Mayor's stands right beside it) */
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId).catch(() => {});
  await P.page.waitForTimeout(800);
  await H.clickText(P, 'CLOSE').catch(() => {});
  await H.closeNpcDialogue(P).catch(() => {});
  /* the WELCOME plate (v2.3.2890) fades over the top of the screen for a
     new character; its own Skip tutorial button takes it down and keeps
     every later card away */
  for (let i = 0; i < 60; i++) {
    const up = await P.page.evaluate(() => {
      const b = document.querySelector('[data-skip-tutorial]');
      if (b) b.click();
      return !!document.querySelector('[data-quest-banner="welcome"]');
    }).catch(() => true);
    if (!up) break;
    await P.page.waitForTimeout(250);
  }
  /* the owner's case: plate and greaves of one metal; every glint sweep held
     off, so nothing but the camera changes between two steps */
  await P.page.evaluate(() => {
    window.__btSetGear('chest', 'steelplate');
    window.__btSetGear('legs', 'steelgreaves');
    if (window.__btLightFx) window.__btLightFx.glint(-1);
  });
  await P.page.waitForTimeout(2500);
}

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(DIR, { recursive: true });
  const results = {};
  /* the same build twice: as shipped, and with ?figround=1 (the old snap).
     One at a time, so neither is ever in the other's pictures. */
  for (const [tag, query] of [['now', ''], ['old', '?figround=1']]) {
    const P = await H.newPlayer(browser, { name: tag === 'now' ? 'Seam' : 'Snap', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, init: COACH_OFF });
    opened.push(P);
    if (query) await P.page.goto(`http://localhost:${webPort}/${query}`, { waitUntil: 'domcontentloaded' });
    await dress(P, wsPort);
    results[tag] = {};
    for (const dirn of Object.keys(DIRS)) results[tag][dirn] = await sweep(P, dirn, tag);
    await P.ctx.close().catch(() => {});
    opened.splice(opened.indexOf(P), 1);
  }
  writeFileSync(`${DIR}/results.json`, JSON.stringify(results, null, 1));
  for (const tag of ['now', 'old']) {
    for (const dirn of Object.keys(DIRS)) {
      for (const f of results[tag][dirn].frames) {
        console.log(`    ${tag} ${dirn} f${f.fi}: plate vs body moves ${f.rel}px, figure moved ${f.moved}px, off a steady glide: body ${f.bumpyBody} plate ${f.bumpyChest}, clear ${f.clear}${f.sameFrame ? '' : ' FRAME CHANGED'}${f.dialogue ? ' DIALOGUE' : ''}  ${JSON.stringify(f.rels)}`);
      }
    }
  }

  /* ── 1. guards ── */
  for (const dirn of Object.keys(DIRS)) {
    const D = dirn.toUpperCase();
    const i = results.now[dirn].info;
    rec.ok(`the character batcher is on (guard, ${D})`, !!(i && i.sharp && i.sharp.enabled), i && i.sharp);
    rec.ok(`jogging ${D} in plate + greaves draws the STACKED figure: plate and greaves sprites up, no knight sheet (guard)`,
      !!i && i.facing === (dirn === 'ne' ? 'northeast' : 'northwest') && i.chest && i.legs && !i.knight, i);
    const fr = results.now[dirn].frames;
    rec.ok(`${D}: nothing on the page covers the figure, and it sits clear of the frame, in every picture (guard)`,
      fr.every((f) => f.clear >= 0.99 && !f.dialogue), fr.map((f) => ({ fi: f.fi, clear: f.clear, dialogue: f.dialogue })));
    rec.ok(`${D}: one animation frame held through each sweep, and the camera steps moved the figure the whole pixel (guard)`,
      fr.every((f) => f.sameFrame && f.moved != null && Math.abs(Math.abs(f.moved) - 1) <= 0.15), fr.map((f) => ({ fi: f.fi, sameFrame: f.sameFrame, moved: f.moved })));
  }

  /* ── 2. the fix: the plate keeps its place on the body ── */
  for (const dirn of Object.keys(DIRS)) {
    const fr = results.now[dirn].frames;
    /* measured: 0.02-0.10px as fixed, 0.57-0.71px with the old snap (a
       layer's centre moves in two half-steps as its top and bottom corners
       snap separately; the collar EDGE itself jumped a whole pixel) */
    rec.ok(`${dirn.toUpperCase()}: as the camera slides a pixel in tenths, the plate keeps its place on the body within 0.2px (the old snap moved it most of a pixel)`,
      fr.every((f) => f.rel != null && f.rel <= 0.2), fr.map((f) => ({ fi: f.fi, rel: f.rel, rels: f.rels })));
  }

  /* ── 3. the test can see the bug: the old snap, same build ── */
  const oldAll = Object.keys(DIRS).flatMap((d) => results.old[d].frames);
  const oldWorst = Math.max(...oldAll.map((f) => f.rel || 0));
  const oldGuard = oldAll.every((f) => f.clear >= 0.99 && !f.dialogue && f.sameFrame);
  rec.ok('with ?figround=1 (the old per-sprite snap) the same sweep sees the plate jump against the body by most of a pixel',
    oldGuard && oldWorst >= 0.45, { oldWorst, frames: Object.fromEntries(Object.keys(DIRS).map((d) => [d, results.old[d].frames.map((f) => ({ fi: f.fi, rel: f.rel, rels: f.rels }))])) });
}
