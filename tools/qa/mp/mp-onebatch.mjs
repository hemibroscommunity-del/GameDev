/* ═══ v2.3.3434: ONE DRAWING PROGRAM FOR EVERY SPRITE ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * Three batchers drew the world's sprites -- Pixi's own, the characters'
 * sharp pixels, the Wheel's colour numbers -- each with its own program, and
 * depth order interleaves them: a fight's frame was ~68 batches with the
 * program switched ~51 times.  paletteTex.js's ONE_BATCHER draws all three,
 * each kind read by the very lines of the program it replaces;
 * `?onebatch=0` is the three programs.  Not where the picture is drawn in
 * software, as on this box: there every branch of a program runs for every
 * pixel, so the one program costs all three reads (TRAPS §225), and the game
 * keeps the three; `?onebatch=1` draws with the one anyway, as a phone does.
 *
 * On a phone (390 x 844, 3x) in BroTown and at a fight at the Flame Fields:
 *   1. with `?onebatch=1` the one program linked behind the loading screen
 *      and draws the world (guard); with nothing in the address, on this
 *      box's software renderer, the three programs draw it (a second page);
 *      and the choice, asked about other addresses and chips: a phone's chip
 *      the one program, a software renderer the three, the address first;
 *   2. THE SAME FRAME: the game's frames held, the scene drawn twice with the
 *      one program (identical, or the comparison means nothing), once with
 *      the three programs by the Speed test's own lever (setOneBatchLive:
 *      every draw list marked to be built again), once again with the one --
 *      the same picture: this box's software GPU computes every precision
 *      alike, so a pixel that differs is a difference in the arithmetic, and
 *      none may;
 *   3. fewer batches and far fewer program switches in the frame's draw list
 *      (the lists counted both ways, in the same held frame);
 *   4. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* every render group's batches: how many, and how often the batcher changes */
const COUNT = `(() => {
  const app = window._pixiRenderer.app;
  const out = { batches: 0, switches: 0, by: {} };
  const walk = (c) => {
    if (c.renderGroup) {
      const is = c.renderGroup.instructionSet;
      let prev = null;
      for (let i = 0; i < is.instructionSize; i++) {
        const it = is.instructions[i];
        if (it && it.renderPipeId === 'batch' && it.batcher) {
          const b = it.batcher.name;
          out.batches++;
          out.by[b] = (out.by[b] || 0) + 1;
          if (prev && prev !== b) out.switches++;
          prev = b;
        }
      }
    }
    for (const k of c.children || []) walk(k);
  };
  walk(app.stage);
  return out;
})()`;

const sameFrame = (P) => P.page.evaluate(async (COUNT) => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  const count = () => (0, eval)(COUNT);
  const rebuildAll = () => { const walk = (c) => { if (c.renderGroup) c.renderGroup.structureDidChange = true; for (const k of c.children || []) walk(k); }; walk(app.stage); };
  w.__obHeld = [];
  w.__obRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__obHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  const grab = () => { R.render(app.stage); const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const cmp = (a, b, mark) => {
    let n = 0, maxd = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) { n++; if (d > maxd) maxd = d; if (mark) { mark[i] = 255; mark[i + 1] = 0; mark[i + 2] = 255; mark[i + 3] = 255; } }
    }
    return { n, maxd };
  };
  rebuildAll();
  const on1 = grab();
  const one = count();
  const on2 = grab();
  const liveOff = w.__btOneBatchLive(false);
  const off = grab();
  const three = count();
  const liveOn = w.__btOneBatchLive(true);
  const on3 = grab();
  const mark = new Uint8Array(on1);
  const diff = cmp(on1, off, mark);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g2 = cv.getContext('2d');
  const img = g2.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) img.data.set(mark.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
  g2.putImageData(img, 0, 0);
  const png = cv.toDataURL('image/png');
  cv.width = 0; cv.height = 0;
  const held = w.__obHeld;
  w.requestAnimationFrame = w.__obRaf;
  w.__obHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  return { W, H: Hh, px: W * Hh, steady: cmp(on1, on2), diff, back: cmp(on1, on3), one, three, png, liveOff, liveOn };
}, COUNT);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'onebatch', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'onebatch=1' });
  /* (the default page only says which programs draw: at 1x, so the two
     pages are not both drawing a 3x screen in software on the way in) */
  const Q = await H.newPlayer(browser, { name: 'threebatch', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = null;
  try {
    await H.enterWorld(P);
    await H.enterWorld(Q);
    const inWheel = (X) => H.waitFor(X, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    const okP = await inWheel(P), okQ = await inWheel(Q);
    rec.ok('both phones in the Wheel (guard)', !!okP && !!okQ, { okP, okQ });
    if (!okP || !okQ) return;
    stopAlive = H.keepAlive(P, 15000);
    await P.page.waitForTimeout(5000);

    /* 1 */
    const stP = await P.page.evaluate((C) => ({ ob: window.__btOneBatch && window.__btOneBatch(), n: (0, eval)(C) }), COUNT).catch(() => null);
    const stQ = await Q.page.evaluate((C) => ({ ob: window.__btOneBatch && window.__btOneBatch(), n: (0, eval)(C) }), COUNT).catch(() => null);
    rec.ok(`the one program linked and draws the world (${JSON.stringify(stP && stP.ob)}; batches by batcher ${JSON.stringify(stP && stP.n.by)}) (guard)`,
      !!stP && stP.ob && stP.ob.on === true && (stP.n.by['bt-one'] || 0) > 0 && !stP.n.by.sharp && !stP.n.by['bt-palette'], stP);
    rec.ok(`with nothing in the address, this box's software renderer keeps the three programs (${stQ && stQ.ob && stQ.ob.why}: "${String(stQ && stQ.ob && stQ.ob.renderer).slice(0, 60)}"; ${JSON.stringify(stQ && stQ.n.by)})`,
      !!stQ && stQ.ob && stQ.ob.on === false && stQ.ob.why === 'software' && /swiftshader/i.test(stQ.ob.renderer || '') && !(stQ.n.by['bt-one']) && (stQ.n.by.sharp || 0) > 0, stQ);
    await Q.ctx.close().catch(() => {});
    /* the choice for other addresses and chips (the names as each browser gives them) */
    const CHIPS = [
      ['', 'Apple GPU', true],
      ['', 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', true],
      ['', 'Mali-G78', true],
      ['', 'ANGLE (Qualcomm, Adreno (TM) 650, OpenGL ES 3.2)', true],
      ['', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', false],
      ['', 'llvmpipe (LLVM 15.0.7, 256 bits)', false],
      ['', 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', false],
      ['?onebatch=0', 'Apple GPU', false],
      ['?trial=wheel&onebatch=1', 'llvmpipe (LLVM 15.0.7, 256 bits)', true],
      ['?onebatch=10', 'Apple GPU', true],
    ];
    const asked = await P.page.evaluate((C) => C.map(([q, r]) => window.__btOneBatchChoice(q, r)), CHIPS);
    const wrong = CHIPS.filter((c, i) => !asked[i] || asked[i].on !== c[2]).map((c, i) => [c[0], c[1].slice(0, 30), asked[CHIPS.indexOf(c)]]);
    rec.ok(`the choice: a phone's chip the one program, a software renderer the three, the address first (${CHIPS.length - wrong.length} of ${CHIPS.length})`,
      wrong.length === 0, wrong);

    /* 2 and 3 */
    await P.page.evaluate(() => { const S = window._gameState.current; S.player.godMode = true; });
    const spots = [['brotown', null]];
    try {
      const { WHEEL_SPAWNS } = await import('../../../server/src/wheelspawns.js');
      const g = WHEEL_SPAWNS.ember.points[0];
      spots.push(['fight', [g[0], g[1] + 40]]);
    } catch (e) { /* BroTown only */ }
    for (const [tag, at] of spots) {
      if (at) {
        /* the walk there on the three programs: this box draws the one at
           half the frames a second (TRAPS §225), and the walk is frames */
        await P.page.evaluate(() => window.__btOneBatchLive(false));
        await H.hopTo(P, at[0], at[1], { tries: 400, step: 140, gap: 200 });
        await P.page.evaluate(() => window.__btOneBatchLive(true));
        await P.page.waitForTimeout(5000);
      }
      const r = await sameFrame(P);
      writeFileSync(join(OUT, `onebatch-${tag}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      console.log(`    ${tag}: ${r.W}x${r.H}; twice ${r.steady.n} px apart; three programs ${r.diff.n} px apart (most ${r.diff.maxd}); back ${r.back.n}; batches ${r.one.batches} with ${r.one.switches} switches (three programs: ${r.three.batches}, ${r.three.switches})`);
      rec.ok(`${tag}: the same frame drawn twice is the same frame (${r.steady.n} px apart) (guard)`, r.steady.n === 0, r.steady);
      rec.ok(`${tag}: drawn by the three programs it is the SAME frame (${r.diff.n} px apart, most ${r.diff.maxd}) -- out/onebatch-${tag}.png`, r.diff.n === 0, r.diff);
      rec.ok(`${tag}: and by the one again, the same frame (${r.back.n} px apart)`, r.back.n === 0, r.back);
      rec.ok(`${tag}: the Speed test's lever turned the three on and the one back (${r.liveOff}, ${r.liveOn}; ${JSON.stringify(r.three.by)})`,
        r.liveOff === false && r.liveOn === true && !r.three.by['bt-one'] && (r.one.by['bt-one'] || 0) > 0, { liveOff: r.liveOff, liveOn: r.liveOn, three: r.three.by, one: r.one.by });
      rec.ok(`${tag}: fewer batches (${r.one.batches} against ${r.three.batches}) and far fewer program switches (${r.one.switches} against ${r.three.switches})`,
        r.one.batches < r.three.batches && r.one.switches * 3 <= r.three.switches + 3, { one: r.one, three: r.three });
    }

    /* 4 */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
    await Q.ctx.close().catch(() => {});
  }
}
