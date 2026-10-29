/* ═══ v2.3.3870: THE MONKEY'S FACE AND SHIRT AFTER A FACING'S PICTURES WERE LET GO ═══
 *
 * The owner, 2026-10-29, on a computer: the monkey's lighter-brown face (the
 * species' muzzle, _placeSpecies) "disappeared" facing W and SW, and the shirt
 * with its print with it -- then S and SW, then back after what may have been
 * a reload.  Intermittent and per facing: a picture a facing had not drawn for
 * a while.  Pixi's garbage collector lets go of a texture, and of a sprite's
 * GPU data, unused for gcMaxUnusedTime (60 s); each facing of the species
 * piece is its own texture, so turning away for a minute lets it go, and
 * turning back must bring it up again.
 *
 * Here the collector is set to 1.5 s and run every 0.5 s, so every facing's
 * pictures are let go between visits.  A computer (wide), the monkey in a
 * striped and printed tee, the old path (?lookpalette=0, as a computer plays);
 * BT_SGC_QUERY overrides it.  For each facing, three visits apart: the muzzle
 * sprite and the shirt are each held back for one frame, and the figure must
 * change by a piece's worth of pixels -- a sprite that says it is drawn and
 * paints nothing is the bug.
 *
 *   node tools/qa/mp/run.mjs speciesgc
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 1280, height: 800 };
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];
const MIN_PX = 12;   /* device px that change when the piece is held back */

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-species', 'monkey');
  localStorage.setItem('bt-skin', 'monkeybrown');
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'yellow');
  localStorage.setItem('bt-shirtpat', 'stripe-v:5');
  let art = '';
  for (let i = 0; i < 256; i++) { const x = i % 16, y = (i / 16) | 0; art += (x >= 5 && x <= 10 && y >= 4 && y <= 9) ? 'a' : '0'; }
  localStorage.setItem('bt-shirtart', art);
} catch (e) {}
/* a request that fails: every picture of the monkey's south-west and of the
   tee's south-west sheets fails to load for the first BT_SGC_FAIL_S seconds of
   the page (the loading screen and every retry), as a wifi blip or a deploy
   mid-visit does, then loads again */
try {
  const failS = ${JSON.stringify(+(process.env.BT_SGC_FAIL_S != null ? process.env.BT_SGC_FAIL_S : 90))};
  window.__qaFailUntil = Date.now() + failS * 1000;
  window.__qaFailed = 0;
  const RE = new RegExp('(species.monkey.(southwest|frames.[a-z]+-southwest)|gear.shirt.tshirt.[a-z]+-southwest)');
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
  if (window.__qaSG) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const T = window.__qaSG = { renders: 0, hide: null };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const me = R.playerDisplayRaw();
    const s = me && T.hide ? me[T.hide] : null;
    let was = null;
    if (s) { was = s.renderable; s.renderable = false; }
    T.renders++;
    try { return orig(...a); } finally { if (was != null) s.renderable = was; }
  };
  /* the collector, quick: let go of what was not drawn for 1.5 s, every 0.5 s */
  const gc = rend.gc;
  if (gc) { gc.enabled = false; gc.maxUnusedTime = 1500; gc._frequency = 500; gc.enabled = true; }
  T.gc = !!gc;
  T.state = (k) => {
    const me = R.playerDisplayRaw();
    const s = me && me[k];
    if (!s) return null;
    const t = s.texture, src = t && t.source;
    return {
      visible: !!s.visible, alpha: +s.alpha.toFixed(2),
      empty: !t || t.label === 'EMPTY' || !src,
      res: src && src.resource ? (src.resource.constructor && src.resource.constructor.name) + ' ' + (src.resource.width | 0) + 'x' + (src.resource.height | 0) : null,
      destroyed: !!(src && src.destroyed),
      uid: src ? src.uid : null, frame: t && t.frame ? [t.frame.x, t.frame.y, t.frame.width, t.frame.height] : null,
      gl: src ? !!(rend.texture && rend.texture._glTextures && rend.texture._glTextures[src.uid]) : null,
      kept: window.__btKeptImages ? window.__btKeptImages() : null,
      scale: [+s.scale.x.toFixed(3), +s.scale.y.toFixed(3)], pos: [Math.round(s.x), Math.round(s.y)],
    };
  };
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out/speciesgc');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Monkbro', wsPort, webPort, viewport: VIEW, touch: false, wide: true, world: 'wheel', init: INIT, query: process.env.BT_SGC_QUERY != null ? process.env.BT_SGC_QUERY : 'lookpalette=0' });
  const page = P.page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    await page.waitForTimeout(2000);
    rec.ok('the page tools, the collector quickened (guard)', !!(await page.evaluate(TOOLS)) && (await page.evaluate(() => window.__qaSG.gc)));
    const renders = () => page.evaluate(() => window.__qaSG.renders);
    const drawn = async (n = 2) => { const r0 = await renders(); for (let i = 0; i < 200; i++) { await page.waitForTimeout(40); if (await renders() >= r0 + n) return; } };
    const piecePx = async (k) => {
      const box = await H.figureBox(P, { pad: 10 });
      if (!box) return null;
      await page.evaluate(() => { window.__qaSG.hide = null; });
      await drawn(2);
      const a = await H.screenshotPixels(P, box);
      await page.evaluate((k) => { window.__qaSG.hide = k; }, k);
      await drawn(2);
      const b = await H.screenshotPixels(P, box);
      await page.evaluate(() => { window.__qaSG.hide = null; });
      let n = 0;
      for (let i = 0; i < a.data.length && i < b.data.length; i += 4) {
        if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
      }
      return n;
    };
    const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
    /* the requests load again: wait them out, then a little */
    const fail = await page.evaluate(() => ({ left: Math.max(0, window.__qaFailUntil - Date.now()), failed: window.__qaFailed }));
    /* ...and one full step of the later rounds (their longest is a minute), so
       every picture given up on has been asked for again since */
    if (fail.left) await page.waitForTimeout(fail.left + 65000);
    const failed = await page.evaluate(() => window.__qaFailed);
    console.log(`    ${failed} picture requests failed on purpose while the window was open`);
    const visits = +(process.env.BT_SGC_VISITS || 3);
    for (let v = 1; v <= visits; v++) {
      for (const [dir, k] of FACINGS) {
        const ang = k * Math.PI / 4;
        await stick(Math.cos(ang), Math.sin(ang));
        await page.waitForTimeout(600);
        await stick(0, 0);
        await page.waitForTimeout(900);
        const facing = await H.readState(P, (S) => S._renderFacing);
        const sp = await page.evaluate(() => window.__qaSG.state('_speciesSprite'));
        const sh = await page.evaluate(() => window.__qaSG.state('_gearShirt'));
        /* the figure, for a person to look at: out/speciesgc/<BT_SGC_TAG>-<visit>-<facing>.png */
        try {
          const box = await H.figureBox(P, { pad: 30 });
          if (box) await page.screenshot({ path: join(OUT, `${process.env.BT_SGC_TAG || 'run'}-${v}-${dir}.png`), clip: box });
        } catch (e) { /* the picture is for people, not the check */ }
        const spPx = await piecePx('_speciesSprite');
        const shPx = await piecePx('_gearShirt');
        /* a miss on the first frames of a facing (its picture just uploaded
           again) heals within a moment and is not this check's subject: the
           same facing 1.5 s later, unmoved, decides; a lasting loss stays */
        let spAgain = null, shAgain = null;
        if (spPx == null || spPx < MIN_PX || shPx == null || shPx < MIN_PX) {
          await page.waitForTimeout(1500);
          spAgain = await piecePx('_speciesSprite');
          shAgain = await piecePx('_gearShirt');
          console.log(`    ${dir} visit ${v}: a first-frames miss (muzzle ${spPx}, shirt ${shPx}), 1.5 s on: muzzle ${spAgain}, shirt ${shAgain}`);
        }
        const spOk = (spAgain != null ? spAgain : spPx), shOk = (shAgain != null ? shAgain : shPx);
        rec.ok(`visit ${v} ${dir} (${facing}): the muzzle paints (${spOk} px) and the shirt paints (${shOk} px)`,
          spOk != null && spOk >= MIN_PX && shOk != null && shOk >= MIN_PX, { sp, sh, first: { spPx, shPx } });
        /* a pause long enough for the collector to let go of this facing's pictures once it is left */
        await page.waitForTimeout(400);
      }
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
