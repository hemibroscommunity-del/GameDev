/* ═══ v2.3.3882: THE BODY COMES BACK AFTER ITS SHEET FAILED TO LOAD FOR A WHILE ═══
 *
 * A base body sheet (playerSprites.js loadSheet) or its recoloured bake
 * (playerSkins.js buildBodySheet) that failed three times (8 s: a wifi blip, a
 * deploy mid-visit) was missing for the rest of the visit: on a computer (the
 * look palette is off on Windows and Mac) the body drew nothing in that facing
 * until a reload.  docs/specs/retry-looks.md has the rule that brings it back.
 *
 * A computer page (wide, ?lookpalette=0).  For the first BT_BR_FAIL_S (90) s
 * every body sheet of the south-west facing (stand and jog, the head
 * overlays too) fails to load; once they load again and one full step of the
 * later rounds has passed (65 s), each of the eight facings, standing and
 * jogging, must draw its body: held back for one frame, the figure changes by
 * a body's worth of pixels.  BT_BR_SKIN (default 'ebony': the recoloured bake,
 * whose fallback is the base sheet; 'default' draws the base sheet itself).
 * BT_BR_QUERY overrides the address (`lookpalette=0&retrylooks=0` is the game
 * as it was).
 *
 *   node tools/qa/mp/run.mjs bodyretry
 */
import * as H from './harness.mjs';

const VIEW = { width: 1280, height: 800 };
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];
const MIN_PX = 200;   /* device px that change when the body is held back: a body draws over a thousand */

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  const skin = ${JSON.stringify(process.env.BT_BR_SKIN || 'ebony')};
  if (skin !== 'default') localStorage.setItem('bt-skin', skin);
} catch (e) {}
try {
  window.__qaFailUntil = Date.now() + ${JSON.stringify(+(process.env.BT_BR_FAIL_S != null ? process.env.BT_BR_FAIL_S : 90))} * 1000;
  window.__qaFailed = 0;
  const RE = new RegExp('sprites.player.(stand|jog)-southwest[.-]');
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() { return d.get.call(this); },
    set(v) {
      if (Date.now() < window.__qaFailUntil && RE.test(String(v))) { window.__qaFailed++; v = 'data:image/png;base64,AAAA'; }
      d.set.call(this, v);
    },
  });
} catch (e) {}`;

const TOOLS = () => {
  if (window.__qaBR) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const T = window.__qaBR = { renders: 0, hide: false };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const me = R.playerDisplayRaw();
    const s = me && T.hide ? me._spriteBody : null;
    let was = null;
    if (s) { was = s.renderable; s.renderable = false; }
    T.renders++;
    try { return orig(...a); } finally { if (was != null) s.renderable = was; }
  };
  T.body = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const sb = me && me._spriteBody;
    const t = sb && sb.texture;
    return { facing: S._renderFacing, pose: me ? me._animPose : null, visible: !!(sb && sb.visible),
      tex: t ? (t.label === 'EMPTY' ? 'EMPTY' : (t.frame ? Math.round(t.frame.width) + 'x' + Math.round(t.frame.height) : '?')) : null };
  };
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Retrybro', wsPort, webPort, viewport: VIEW, touch: false, wide: true, world: 'wheel', init: INIT, query: process.env.BT_BR_QUERY != null ? process.env.BT_BR_QUERY : 'lookpalette=0' });
  const page = P.page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 180000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    rec.ok('the page tools (guard)', !!(await page.evaluate(TOOLS)));
    const fail = await page.evaluate(() => ({ left: Math.max(0, window.__qaFailUntil - Date.now()), failed: window.__qaFailed }));
    if (fail.left) await page.waitForTimeout(fail.left + 65000);
    const failed = await page.evaluate(() => window.__qaFailed);
    rec.ok(`the south-west body sheets failed to load for a while (${failed} requests) (guard)`, failed > 0);
    const renders = () => page.evaluate(() => window.__qaBR.renders);
    const drawn = async (n = 2) => { const r0 = await renders(); for (let i = 0; i < 200; i++) { await page.waitForTimeout(40); if (await renders() >= r0 + n) return; } };
    const bodyPx = async () => {
      const box = await H.figureBox(P, { pad: 10 });
      if (!box) return null;
      await page.evaluate(() => { window.__qaBR.hide = false; });
      await drawn(2);
      const a = await H.screenshotPixels(P, box);
      await page.evaluate(() => { window.__qaBR.hide = true; });
      await drawn(2);
      const b = await H.screenshotPixels(P, box);
      await page.evaluate(() => { window.__qaBR.hide = false; });
      let n = 0;
      for (let i = 0; i < a.data.length && i < b.data.length; i += 4) {
        if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
      }
      return n;
    };
    const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
    for (const pose of ['stand', 'jog']) {
      for (const [dir, k] of FACINGS) {
        const ang = k * Math.PI / 4;
        await stick(Math.cos(ang), Math.sin(ang));
        await page.waitForTimeout(900);
        if (pose === 'stand') { await stick(0, 0); await page.waitForTimeout(900); }
        let px = await bodyPx();
        /* a facing's first frames can miss while its picture goes up; a lasting loss stays */
        if (px == null || px < MIN_PX) { await page.waitForTimeout(1500); px = await bodyPx(); }
        const b = await page.evaluate(() => window.__qaBR.body());
        rec.ok(`${pose} ${dir} (${b.facing}): the body is drawn (${px} px)`, px != null && px >= MIN_PX, b);
        if (pose === 'jog') { await stick(0, 0); await page.waitForTimeout(400); }
      }
    }
    /* a failed image's bare error Event, left unhandled by some loader, comes
       from the failures this check makes on purpose (it is there with the
       retries off too): counted, not judged */
    const forced = errors.filter((e) => e === 'Event').length;
    if (forced) console.log(`    ${forced} unhandled image error Event(s) from the forced failures`);
    rec.ok('no page errors (besides the forced failures)', errors.length === forced, errors.filter((e) => e !== 'Event').slice(0, 5));
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
