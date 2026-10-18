/* ═══ v2.3.3406: THE METAL SHINE DRAWN IN THE FRAME, NOT IN A PASS A PIECE ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * Every piece of metal on screen shone through a filter of its own -- a render
 * pass each, which on a phone's graphics chip sets the whole frame aside and
 * picks it up again.  lightfx/sheenBatch.js draws the ordinary shine where the
 * piece is drawn instead.  On a phone (390 x 844, 3x) in BroTown, a player in
 * iron plate, greaves and a greatsword:
 *   1. the three pieces shine IN THE FRAME: the probe's `batched` 3 and no
 *      filter on any of them; the batcher's program was built behind the
 *      loading screen (guard);
 *   2. THE SAME PICTURE: the game held, one frame drawn with the shine in the
 *      frame, in a pass a piece (window.__btSheenPass) and in the frame again
 *      -- the passes and the frame no more than 2 levels (of 255) apart on any
 *      channel and any pixel (the pass rounded the piece to an 8-bit picture
 *      before its shine: the soft edges and highlights move a level or two);
 *      the frame drawn twice the same, to the pixel (guard);
 *   3. it is really the shine: the same frame with the shine off differs from
 *      both, over the metal (guard);
 *   4. fewer passes: the render-target switches a frame, counted on the
 *      context -- six fewer for the three pieces;
 *   5. a GRADED piece (elite plate and greaves) is still a pass of its own --
 *      its edge needs the pixels round it -- while the sword stays in the
 *      frame; a sweep pinned across the metal (QA's pictures) is the filter's;
 *   6. what it costs: the frame's time with the shine in the frame and in
 *      passes (this box draws in software: read the ratio);
 *   7. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const batchProbe = (P) => P.page.evaluate(() => (window.__btSheenBatch ? window.__btSheenBatch() : null));
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => { if (window.__btSetGear) window.__btSetGear(s, i); }, { s: slot, i: id });
const glintAt = (P, p) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.glint(v); }, p);
const setWeapon = (P, base, quality) => P.page.evaluate(([b, q]) => {
  const w = window._gameState.current.rpg.weapon;
  if (!w) return false;
  w.gearBase = b;
  w.quality = q;
  return true;
}, [base, quality]);
const setArmourGrade = (P, q) => P.page.evaluate((v) => {
  const R = window._gameState.current.rpg;
  R.armor = Object.assign({}, R.armor || {}, { quality: v });
  R.legsArmor = Object.assign({}, R.legsArmor || {}, { quality: v });
}, q);

/* The game's loop held and the whole frame -- the light's update included, so
   the shine is re-routed for the setting -- drawn by hand at one pinned time
   (mp-sheen's freeze / drawFrozen), its pixels read straight off the canvas. */
const freeze = async (P) => {
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer;
    if (!R.__sbWrapped) {
      const orig = R.update;
      R.update = function (...args) { window.__sbArgs = args; return orig.apply(this, args); };
      R.__sbWrapped = true;
    }
    window.__sbArgs = null;
    const wait = () => (window.__sbArgs ? res() : setTimeout(wait, 16));
    wait();
  }));
  await P.page.evaluate(() => {
    if (window.__sbHeld) return;
    window.__sbReal = window.requestAnimationFrame.bind(window);
    window.__sbHeld = [];
    window.requestAnimationFrame = (cb) => { window.__sbHeld.push(cb); return 0; };
    window.__sbT = Date.now();
    window.__sbPT = performance.now();
  });
};
const thaw = (P) => P.page.evaluate(() => {
  if (!window.__sbHeld) return;
  const held = window.__sbHeld;
  window.requestAnimationFrame = window.__sbReal;
  window.__sbHeld = null;
  for (const cb of held) window.requestAnimationFrame(cb);
});

/* draw the frozen frame `n` times (the first draw after a switch re-routes
   the pieces; the last is read), keep the box's pixels in the page under
   `name` and count the frame's render-target switches */
const shot = (P, box, name, n = 2) => P.page.evaluate(({ b, k, nm }) => {
  const R = window._pixiRenderer, gl = R.app.renderer.gl;
  if (!gl.__sbBf) {
    const bind = gl.bindFramebuffer.bind(gl);
    gl.bindFramebuffer = (t, f) => { window.__sbBfN = (window.__sbBfN || 0) + 1; return bind(t, f); };
    gl.__sbBf = true;
  }
  const dn = Date.now, pn = performance.now.bind(performance);
  Date.now = () => window.__sbT;
  performance.now = () => window.__sbPT;
  try {
    for (let i = 0; i < k; i++) { window.__sbBfN = 0; R.update(...window.__sbArgs); }
  } finally { Date.now = dn; performance.now = pn; }
  const dpr = gl.drawingBufferWidth / gl.canvas.clientWidth;
  const x = Math.max(0, Math.floor(b.x * dpr)), w = Math.min(gl.drawingBufferWidth - x, Math.ceil(b.width * dpr));
  const yTop = Math.max(0, Math.floor(b.y * dpr)), h = Math.min(gl.drawingBufferHeight - yTop, Math.ceil(b.height * dpr));
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(x, gl.drawingBufferHeight - yTop - h, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  (window.__sbShots || (window.__sbShots = {}))[nm] = px;
  return { w, h, switches: window.__sbBfN };
}, { b: box, k: n, nm: name });

/* two kept pictures compared in the page: pixels apart, and by how much */
const cmp = (P, a, b) => P.page.evaluate(([x, y]) => {
  const A = window.__sbShots[x], B = window.__sbShots[y];
  let n = 0, maxd = 0;
  const by = [0, 0, 0];   /* pixels 1, 2 and 3+ levels apart */
  for (let i = 0; i < A.length; i += 4) {
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    if (d) { n++; if (d > maxd) maxd = d; by[Math.min(d, 3) - 1]++; }
  }
  return { n, maxd, of: A.length / 4, by };
}, [a, b]);

/* Mean frame interval and the game's own work over `ms` */
const frameTime = (P, ms) => P.page.evaluate((dur) => new Promise((res) => {
  window.perfTracker && window.perfTracker.reset && window.perfTracker.reset();
  const ts = [];
  const t0 = performance.now();
  const f = (t) => {
    ts.push(t);
    if (t - t0 < dur) { requestAnimationFrame(f); return; }
    const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
    d.sort((x, y) => x - y);
    const a = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
    const m = (k) => (a.length ? +(a.reduce((s, x) => s + (x[k] || 0), 0) / a.length).toFixed(2) : null);
    res({ n: d.length, mean: +(d.reduce((s, x) => s + x, 0) / d.length).toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2),
      work: m('workMs'), app: m('appMs'), effects: m('effectsMs'), entity: m('entityMs') });
  };
  requestAnimationFrame(f);
}), ms);

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  const A = await H.newPlayer(browser, { name: 'Ironside', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, init: COACH_OFF });
  opened.push(A);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  const myId = await H.readState(A, (S) => S.myId);
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(1500);
  await H.clickText(A, 'CLOSE').catch(() => {});
  await A.page.waitForTimeout(600);

  await setGear(A, 'chest', 'ironplate');
  await setGear(A, 'legs', 'irongreaves');
  const wOk = await setWeapon(A, 'iron', 'normal');
  await setArmourGrade(A, 'normal');
  await glintAt(A, -1);   /* every sweep held off: the shine alone, as the game plays */
  await A.page.waitForTimeout(1000);

  /* ── 1. in the frame ── */
  const sb = await batchProbe(A);
  rec.ok('the shine\'s batcher is on and was built behind the loading screen (guard)', !!sb && sb.on && sb.built, sb);
  const p1 = await probe(A);
  const g1 = p1 && p1.glint;
  rec.ok('an iron greatsword is in hand (guard)', wOk);
  rec.ok(`the sword, the plate and the greaves shine in the frame: ${g1 && g1.batched} drawn there, ${g1 && g1.lit} in a pass of their own`,
    !!g1 && g1.batched === 3 && g1.lit === 0 && (g1.keys || []).slice().sort().join(',') === 'self:c,self:l,self:w', g1);

  const fb = await H.figureBox(A, { pad: 34 });
  const box = fb ? { x: fb.x, y: fb.y, width: fb.width, height: fb.height } : null;
  rec.ok('the figure is on screen (guard)', !!box, box);
  if (!box) return;

  /* ── 2-4. one frame, every way ── */
  await freeze(A);
  await A.page.waitForTimeout(150);
  const f1 = await shot(A, box, 'frame');
  await shot(A, box, 'frame2');
  await A.page.evaluate(() => window.__btSheenPass(true));
  const pass = await shot(A, box, 'pass');
  const gp = await probe(A);
  await A.page.evaluate(() => window.__btSheenPass(false));
  await shot(A, box, 'back');
  await A.page.evaluate(() => window.__btLightFx.sheen(false));
  await shot(A, box, 'off');
  await A.page.evaluate(() => window.__btLightFx.sheen(true));
  await shot(A, box, 'on');
  await thaw(A);

  const steady = await cmp(A, 'frame', 'frame2');
  const vsPass = await cmp(A, 'frame', 'pass');
  const back = await cmp(A, 'frame', 'back');
  const vsOff = await cmp(A, 'frame', 'off');
  await A.page.evaluate(() => { window.__sbShots = null; });
  rec.ok(`the frame drawn twice is the same frame (${steady.n} px apart) (guard)`, steady.n === 0, steady);
  rec.ok(`with every piece in a pass of its own the pieces really were filtered (${gp && gp.glint.lit} passes, ${gp && gp.glint.batched} in the frame) (guard)`,
    !!gp && gp.glint.lit === 3 && gp.glint.batched === 0, gp && gp.glint);
  /* the old pass rounded each piece to an 8-bit picture before the shine and
     again after; here it is rounded once.  That moves a pixel a level or two,
     at the metal's soft edges and on its highlights -- never more: a shine
     laid out wrongly (its box, the sun's side, the figure's frame) moves the
     highlights by many levels (the shine itself adds up to ~60 here) */
  rec.ok(`THE SAME PICTURE: the frame's shine against the passes' -- no pixel more than 2 levels (of 255) apart: ${vsPass.by[0]} px 1 apart, ${vsPass.by[1]} 2 apart, ${vsPass.by[2]} more (of ${vsPass.of})`,
    vsPass.maxd <= 2, vsPass);
  rec.ok(`...and back in the frame it is the frame again (${back.n} px apart)`, back.n === 0, back);
  rec.ok(`it is the shine: with it off the same frame differs over the metal (${vsOff.n} px, by up to ${vsOff.maxd}) (guard)`,
    vsOff.n > 200 && vsOff.maxd >= 8, vsOff);
  rec.ok(`fewer passes: ${f1.switches} render-target switches a frame in the frame, ${pass.switches} with a pass a piece (six fewer for three pieces)`,
    pass.switches - f1.switches >= 6, { inFrame: f1.switches, passes: pass.switches });

  /* ── 5. what stays a pass ── */
  await setArmourGrade(A, 'elite');
  await A.page.waitForTimeout(900);
  const pg = await probe(A);
  const gg = pg && pg.glint;
  rec.ok(`elite plate and greaves keep a pass of their own (their edge needs the pixels round them), the sword stays in the frame: ${gg && gg.lit} passes, ${gg && gg.batched} in the frame`,
    !!gg && gg.lit === 2 && gg.batched === 1 && gg.graded === 2, gg);
  await setArmourGrade(A, 'normal');
  await glintAt(A, 0.5);
  await A.page.waitForTimeout(700);
  const ps = await probe(A);
  rec.ok(`a sweep pinned across the metal is the filter's band: ${ps && ps.glint.lit} passes, ${ps && ps.glint.batched} in the frame`,
    !!ps && ps.glint.lit === 3 && ps.glint.batched === 0, ps && ps.glint);
  await glintAt(A, -1);
  await A.page.waitForTimeout(700);
  const pb = await probe(A);
  rec.ok('...and let go, back in the frame', !!pb && pb.glint.batched === 3 && pb.glint.lit === 0, pb && pb.glint);

  /* ── 6. the cost ── (this box draws a 3x frame in software, a few a
     second: each way timed twice, in turn, and the two windows added) */
  const tA = [], tB = [];
  const ROUNDS = Number(process.env.BT_SB_ROUNDS || 2);
  for (let r = 0; r < ROUNDS; r++) {
    await A.page.evaluate(() => window.__btSheenPass(false));
    await A.page.waitForTimeout(600);
    tA.push(await frameTime(A, 6000));
    await A.page.evaluate(() => window.__btSheenPass(true));
    await A.page.waitForTimeout(600);
    tB.push(await frameTime(A, 6000));
  }
  await A.page.evaluate(() => window.__btSheenPass(false));
  const avg = (xs, k) => +(xs.reduce((a, x) => a + (x[k] || 0) * x.n, 0) / Math.max(1, xs.reduce((a, x) => a + x.n, 0))).toFixed(2);
  const sum = (xs) => ({ n: xs.reduce((a, x) => a + x.n, 0), mean: avg(xs, 'mean'), work: avg(xs, 'work'), app: avg(xs, 'app'), effects: avg(xs, 'effects'), entity: avg(xs, 'entity') });
  const tIn = sum(tA), tPass = sum(tB);
  console.log('    frame (interval / game work, ms): in the frame ' + JSON.stringify(tIn) + '  a pass a piece ' + JSON.stringify(tPass));
  rec.ok('frames were timed both ways (guard)', tIn.n > 6 && tPass.n > 6, { tIn, tPass });

  const errs = (A.logs || []).filter((l) => /pageerror|lightFx threw|glint|sheen|TypeError|ReferenceError|WebGL: INVALID/.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
}
