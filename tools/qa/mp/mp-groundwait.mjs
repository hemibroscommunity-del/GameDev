/* ═══ v2.3.3709: THE WHEEL'S GROUND WORKER WAITS FOR THE RENDERER'S WORD ═══
 *
 * Found by mp-palette on this box: its colour-numbers phone's ground worker
 * was told "colours, still water" as it started (the renderer had not yet
 * said what it draws), laid the whole visit so -- the GPU ~26 MB fuller, the
 * water still -- and the test's pictures differed by 60%.  The worker's start
 * now waits for the renderer's word (game/wheelTrial.js wheelRendererSaid).
 *
 * Two phones in the world, each with its renderer held back 9 s
 * (`?pixidelay=9000`, as a slow phone's first graphics context), so the trip
 * into BroTown starts the worker first:
 *   1. both in the world, BroTown's ground laid (guard);
 *   2. WITH the wait: the worker was told "colour numbers, moving water" --
 *      after it waited for the renderer -- and the ground's pieces are colour
 *      numbers (R8) and the water moves;
 *   3. CONTROL, `?groundwait=0` (as before): told "colours, still water"
 *      before the renderer came, no piece colour numbers: the race is real;
 *   4. ...and so the GPU holds more with the old way;
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs groundwait
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DELAY = 9000;

const INIT = () => {
  window.__initMsgs = [];
  const pm = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (m) {
    try { if (m && m.type === 'init') window.__initMsgs.push({ moving: m.moving, palette: m.palette, t: Math.round(performance.now()) }); } catch (e) { /* counting only */ }
    return pm.apply(this, arguments);
  };
  window.__pixiAt = null;
  const iv = setInterval(() => { if (window._pixiRenderer && window.__pixiAt == null) { window.__pixiAt = Math.round(performance.now()); clearInterval(iv); } }, 20);
};

const read = (P) => P.page.evaluate(() => {
  const pal = window.__btPalette ? window.__btPalette() : null;
  const g = window.__btGpuTex ? window.__btGpuTex(1) : null;
  const t = window.__btWorldTrial && window.__btWorldTrial.stats;
  const w = window.__btWaves ? window.__btWaves.probe() : null;
  return {
    inits: window.__initMsgs, pixiAt: window.__pixiAt,
    wait: window.__btGroundWait ? window.__btGroundWait() : null,
    resident: t ? t.resident : null, calm: t ? t.calm : null,
    gpu: g && !g.err ? g.mb : null,
    palPieces: pal ? (pal.pieces != null ? pal.pieces : pal.made) : null,
    waves: w ? { moving: w.moving, why: w.why || null } : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Waits', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `pixidelay=${DELAY}`, init: INIT });
  const B = await H.newPlayer(browser, { name: 'Racer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `pixidelay=${DELAY}&groundwait=0`, init: INIT });
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopA = H.keepAlive(A), stopB = H.keepAlive(B);
  try {
    const into = (P) => H.enterWorld(P).then(() => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null));
    await Promise.all([into(A), into(B)]);
    const laid = (P) => P.page.waitForFunction(() => {
      const t = window.__btWorldTrial && window.__btWorldTrial.stats;
      return t && t.resident > 0 && t.loading === 0;
    }, null, { timeout: 90000 }).then(() => true, () => false);
    const [la, lb] = await Promise.all([laid(A), laid(B)]);
    await A.page.waitForTimeout(3000);
    const a = await read(A), b = await read(B);
    console.log(`    waits: ${JSON.stringify(a)}`);
    console.log(`    as before: ${JSON.stringify(b)}`);
    rec.ok(`1. both phones in the world with BroTown's ground laid (${a.resident}, ${b.resident} pieces) (guard)`, la && lb && a.resident > 0 && b.resident > 0, { la, lb });
    const ai = a.inits && a.inits[0], bi = b.inits && b.inits[0];
    rec.ok(`2. WITH the wait: told "colour numbers, moving water" (${ai && ai.palette}, ${ai && ai.moving}) after waiting ${a.wait && a.wait.waited} ms for the renderer (made at ${a.pixiAt} ms), its ground in colour numbers (${a.palPieces} pieces)`,
      !!ai && ai.palette === true && ai.moving === true && a.inits.length === 1 && a.wait && a.wait.on === true && a.wait.waited > 0 && a.palPieces > 0, a);
    rec.ok(`3. CONTROL, as before (?groundwait=0): told "colours, still water" (${bi && bi.palette}, ${bi && bi.moving}) at ${bi && bi.t} ms, before the renderer (${b.pixiAt} ms): the race is real`,
      !!bi && bi.palette === false && bi.moving === false && b.pixiAt != null && bi.t < b.pixiAt, b);
    rec.ok(`4. ...and so the old way holds more on the GPU: ${b.gpu} MB against ${a.gpu}, none of its ${b.resident} ground pieces in colour numbers (${b.palPieces})`,
      b.gpu > a.gpu && b.palPieces === 0, { a: a.gpu, b: b.gpu });
    rec.ok('5. no page errors', errors.length === 0, errors);
  } finally {
    stopA(); stopB();
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
