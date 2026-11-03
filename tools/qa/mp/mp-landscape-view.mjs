/* ═══ ONE VISIBLE AREA OF WORLD, WHATEVER THE SCREEN (v2.3.4054) ═══
 *
 * Was (v2.3.2156): the view rule switches axes sideways; portrait is pinned --
 * on the retired old map's town and 'ember'.  Moved onto the world (the Wheel,
 * `world: 'wheel'`) by v2.3.4054, and asked the question that PR answers.
 *
 * A design review the owner shared: "I'd consider establishing a consistent
 * maximum gameplay visibility range regardless of screen dimensions".  The
 * owner: "Cap it for everyone now".  So every screen sees about an upright
 * phone's AREA of world (850 x 1330 game px, its dashboard open), a wide screen zoomed in until it
 * does, and never so far that its short side drops below 680 game px
 * (src/game/viewCap.js; the numbers in docs/specs/view-cap.md).
 *
 * Each screen in the Wheel's BroTown: an upright phone (390 x 844, the
 * dashboard folded as a new bro arrives, and open; 375 x 812 and 430 x 932
 * open), a short upright one (375 x 667, open), a sideways phone
 * (844 x 390), and three computers playing the sideways layout as players do
 * (`wide: true`): 1366 x 768, 1920 x 1080, 2560 x 1080.  On each:
 *   1. the cap is in force (the probe says so) and the live view is the
 *      rule's: the camera's view (S._viewW/H) is __btWorldView('wheel'), and
 *      the renderer's scale (S._worldScaleX/Y, what every tap and aim converts
 *      with: TRAPS §210) is its scale -- one number for all of them;
 *   2. the cap only ever zooms IN (scale >= the scale without it,
 *      __btWorldView('wheel', { cap: false })), and the view keeps the
 *      canvas's shape;
 *   3. the area is about an upright phone's (<= 850 x 1330, +1%), OR the short
 *      side stopped at 680 (the letterbox stop);
 *   4. the short side is never below 680 where the screen had more before;
 * and the upright phone is UNCHANGED (scale with = without the cap), folded
 * and open.  Then:
 *   5. `?viewcap=0` on the sideways phone: the old wide view, live.
 * The table of before and after, per screen, is printed for the PR and the
 * spec.
 */
import * as H from './harness.mjs';

const REF_AREA = 850 * 1330;   /* viewCap.js REF_W x REF_H at the default zoom */
const SHORT_MIN = 680;         /* viewCap.js SHORT_MIN */

const read = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const c = document.querySelector('canvas');
  const r = c ? c.getBoundingClientRect() : { width: 0, height: 0 };
  const on = window.__btWorldView ? window.__btWorldView('wheel') : null;
  const off = window.__btWorldView ? window.__btWorldView('wheel', { cap: false }) : null;
  return {
    zone: S.currentZone,
    canvasW: Math.round(r.width), canvasH: Math.round(r.height),
    viewW: Math.round(S._viewW || 0), viewH: Math.round(S._viewH || 0),
    scaleX: +(S._worldScaleX || 0).toFixed(4), scaleY: +(S._worldScaleY || 0).toFixed(4),
    on, off,
    topBar: (document.body.innerText.match(/BroTown/) || [null])[0],
  };
});

async function intoWorld(browser, wsPort, webPort, name, opts) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, world: 'wheel', ...opts });
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
  await P.page.waitForTimeout(2500);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(600);
  return P;
}

const SCREENS = [
  { tag: 'upright 390x844 folded', name: 'Upview', opts: { viewport: { width: 390, height: 844 }, touch: true }, upright: true },
  { tag: 'upright 390x844 open', name: 'Upopen', opts: { viewport: { width: 390, height: 844 }, touch: true }, upright: true, unfold: true },
  /* v2.3.4054: the other upright phones, open: 850 (the reference's width) is the widest of them */
  { tag: 'upright 375x812 open', name: 'Miniopen', opts: { viewport: { width: 375, height: 812 }, touch: true }, upright: true, unfold: true },
  { tag: 'upright 430x932 open', name: 'Maxopen', opts: { viewport: { width: 430, height: 932 }, touch: true }, upright: true, unfold: true },
  /* ...and a SHORT upright phone (an SE's 667 pt), on the character floor:
     974 x 1158 (1.13M), inside the reference, asked as a capped screen is */
  { tag: 'short upright 375x667 open', name: 'Seopen', opts: { viewport: { width: 375, height: 667 }, touch: true }, unfold: true },
  { tag: 'sideways 844x390', name: 'Sideview', opts: { viewport: { width: 844, height: 390 }, touch: true } },
  { tag: 'computer 1366x768', name: 'Lapview', opts: { viewport: { width: 1366, height: 768 }, wide: true } },
  { tag: 'computer 1920x1080', name: 'Deskview', opts: { viewport: { width: 1920, height: 1080 }, wide: true } },
  { tag: 'ultrawide 2560x1080', name: 'Ultraview', opts: { viewport: { width: 2560, height: 1080 }, wide: true } },
];

const area = (v) => (v ? v.W * v.H : 0);
const near = (a, b, d = 1.5) => Math.abs(a - b) <= d;

export async function run({ browser, wsPort, webPort, rec }) {
  const table = [];
  for (const sc of SCREENS) {
    const P = await intoWorld(browser, wsPort, webPort, sc.name, sc.opts);
    if (sc.unfold) {
      const band = await H.unfoldBand(P).catch(() => null);
      rec.ok(`${sc.tag}: the dashboard is open (guard)`, band && band.now === 'open', band);
      await P.page.waitForTimeout(1500);
    }
    const g = await read(P);
    console.log(`    ${sc.tag}: ${JSON.stringify(g)}`);
    rec.ok(`${sc.tag}: in the Wheel's BroTown (guard)`, g.zone === 'wheel' && !!g.topBar, g);
    const { on, off } = g;
    rec.ok(`${sc.tag}: the view cap is in force`, !!on && on.viewCap === true, on);
    /* 1. one rule, read by the camera, the renderer and the taps alike */
    rec.ok(`${sc.tag}: the live view is the rule's (${g.viewW}x${g.viewH}), and the scale every tap converts with is its scale (${g.scaleX})`,
      !!on && near(g.viewW, on.W) && near(g.viewH, on.H) && near(g.scaleX, on.scale, 0.002) && near(g.scaleY, on.scale, 0.002), g);
    /* 2. only ever in, the canvas's shape kept */
    rec.ok(`${sc.tag}: the cap only zooms in (${off && off.scale} -> ${on && on.scale}), the view the canvas's shape`,
      !!on && !!off && on.scale >= off.scale - 1e-4 && near(on.W / on.H, off.W / off.H, 0.01), { on, off });
    if (sc.upright) {
      rec.ok(`${sc.tag}: an upright phone is UNCHANGED (${off && off.W}x${off && off.H})`,
        !!on && !!off && near(on.scale, off.scale, 1e-4) && near(on.H, 1330, 3), { on, off });
    } else {
      const short = Math.min(on.W, on.H);
      /* 3. an upright phone's area, or stopped at the letterbox */
      rec.ok(`${sc.tag}: sees about an upright phone's area (${on.W}x${on.H} = ${(area(on) / 1e6).toFixed(2)}M px^2, was ${(area(off) / 1e6).toFixed(2)}M) or stopped at a ${SHORT_MIN} short side`,
        area(on) <= REF_AREA * 1.01 || near(short, SHORT_MIN, 2), { on, off });
      /* 4. never a letterbox the screen did not have */
      rec.ok(`${sc.tag}: the short side is ${short} (never below ${SHORT_MIN} where it had more)`,
        short >= Math.min(SHORT_MIN, Math.min(off.W, off.H)) - 2, { on, off });
    }
    table.push({ screen: sc.tag, canvas: `${g.canvasW}x${g.canvasH}`,
      before: off && `${off.W}x${off.H} ${(area(off) / 1e6).toFixed(2)}M @${off.scale}`,
      after: on && `${on.W}x${on.H} ${(area(on) / 1e6).toFixed(2)}M @${on.scale}` });
    await P.ctx.close().catch(() => {});
  }

  /* 5. the off-ramp for one phone */
  const O = await intoWorld(browser, wsPort, webPort, 'Sideold', { viewport: { width: 844, height: 390 }, touch: true, query: 'viewcap=0' });
  const go = await read(O);
  console.log('    sideways 844x390 ?viewcap=0: ' + JSON.stringify(go));
  rec.ok('?viewcap=0: the cap is off for this tab, and the live view is the old wide one',
    !!go.on && go.on.viewCap === false && !!go.off && near(go.on.scale, go.off.scale, 1e-4)
      && near(go.viewW, go.off.W) && near(go.viewH, go.off.H), go);
  await O.ctx.close().catch(() => {});

  console.log('\n    the view per screen (world px, area, scale), without the cap -> with it:');
  for (const r of table) console.log(`      ${r.screen.padEnd(24)} canvas ${r.canvas.padEnd(10)} ${r.before}  ->  ${r.after}`);
}
