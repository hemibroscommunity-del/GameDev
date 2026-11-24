/* ═══ ONE VISIBLE AREA OF WORLD, WHATEVER THE SCREEN (v2.3.4084) ═══
 *
 * Was (v2.3.2156): the view rule switches axes sideways; portrait is pinned --
 * on the retired old map's town and 'ember'.  Moved onto the world (the Wheel,
 * `world: 'wheel'`) by v2.3.4084, and asked the question that PR answers.
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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

/* viewCap.js REF_W x REF_H, measured at 0.77 and grown by 0.77 / VIEW_OUT each
   way (v2.3.6580: the default is 0.79, so the reference is 0.77/0.79 of it;
   read from the files, so the next change of the default needs no edit here) */
const _src = (f, re) => Number(re.exec(readFileSync(join(H.REPO, f), 'utf8'))[1]);
const _k = _src('src/game/viewCap.js', /VIEW_OUT_REF: ([0-9.]+)/) / _src('src/game/viewCap.js', /VIEW_OUT_DEFAULT: ([0-9.]+),/);
const REF_AREA = 850 * 1330 * _k * _k;
const SHORT_MIN = 680;         /* viewCap.js SHORT_MIN */
/* v2.3.6581: the owner's pick, "Ok I like 0.79" (v2.3.6580), written once here
   (the one number to change when they pick again).  An upright phone sees
   1024 / VIEW_OUT game px of height (the reference zone's depth): 1296 at 0.79,
   1330 at ?zoom=0.77.  Part 1 of v2.3.6580 mended REF_AREA but left the 1330. */
const OWNER_VIEW = 0.79;
const BRO_WORLD_PX = 105.7;    /* the bro, crown to foot, in world px (S._bodyDrawH) */

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
    bufW: c ? c.width : 0, bufH: c ? c.height : 0, dpr: window.devicePixelRatio,
    bodyCss: S._bodyDrawH ? +(S._bodyDrawH * (S._worldScaleY || 1)).toFixed(1) : null,
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
  /* v2.3.6581: the owner's phone (a Pro Max, 430 x 932, in Safari): 430 x ~813 with the
     dashboard folded, so a 430 x 775 canvas, at 3x -- at the default view and at ?zoom=0.77 */
  { tag: 'owner phone 430x813 folded', name: 'Ownview', opts: { viewport: { width: 430, height: 813 }, touch: true, dpr: 3 }, upright: true, fold: true, owner: true },
  { tag: 'owner phone 430x813 folded ?zoom=0.77', name: 'Ownold', opts: { viewport: { width: 430, height: 813 }, touch: true, dpr: 3, query: 'zoom=0.77' }, upright: true, fold: true, owner: true, viewOut: 0.77 },
  { tag: 'upright 390x844 folded', name: 'Upview', opts: { viewport: { width: 390, height: 844 }, touch: true }, upright: true },
  { tag: 'upright 390x844 open', name: 'Upopen', opts: { viewport: { width: 390, height: 844 }, touch: true }, upright: true, unfold: true },
  /* v2.3.4084: the other upright phones, open: 850 (the reference's width) is the widest of them */
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
    if (sc.fold) {
      const band = await H.foldBand(P).catch(() => null);
      rec.ok(`${sc.tag}: the dashboard is folded (guard)`, band && band.now === 'min', band);
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
      /* v2.3.6581: the height is 1024 / the view in force (1296 at 0.79, 1330 at 0.77), the view the owner's pick */
      const VO = sc.viewOut || OWNER_VIEW;
      rec.ok(`${sc.tag}: an upright phone is UNCHANGED by the cap (${off && off.W}x${off && off.H}), and sees 1024 / ${VO} = ${(1024 / VO).toFixed(0)} game px of height, the view ${on && on.viewOut}`,
        !!on && !!off && near(on.scale, off.scale, 1e-4) && near(on.H, 1024 / VO, 3) && on.viewOut === VO, { on, off });
    } else {
      const short = Math.min(on.W, on.H);
      /* 3. an upright phone's area, or stopped at the letterbox */
      rec.ok(`${sc.tag}: sees about an upright phone's area (${on.W}x${on.H} = ${(area(on) / 1e6).toFixed(2)}M px^2, was ${(area(off) / 1e6).toFixed(2)}M) or stopped at a ${SHORT_MIN} short side`,
        area(on) <= REF_AREA * 1.01 || near(short, SHORT_MIN, 2), { on, off });
      /* 4. never a letterbox the screen did not have */
      rec.ok(`${sc.tag}: the short side is ${short} (never below ${SHORT_MIN} where it had more)`,
        short >= Math.min(SHORT_MIN, Math.min(off.W, off.H)) - 2, { on, off });
    }
    if (sc.owner) {
      /* the owner's screen shape: the bro and the drawn canvas, said as numbers.  Folded, 430 x 775
         css, the scale is VIEW_OUT x 775 / 1024; the bro 105.7 world px x that (63.3 CSS px at 0.79,
         61.7 at 0.77 -- 2.6% more).  The canvas is drawn at the phone's own 1.5 pixels a CSS pixel
         (renderRes.js PHONE_RES, the owner's "1.5 looks fine nothing below that", v2.3.6503, not the
         screen's 3): 645 x 1163 device px, the same at either view; the pixel budget (4.30 million
         at 0.79) is nowhere near reached by 0.75 million. */
      const VO = sc.viewOut || OWNER_VIEW;
      const want = BRO_WORLD_PX * VO * g.canvasH / 1024;
      rec.ok(`${sc.tag}: the canvas is ${g.canvasW}x${g.canvasH} css, the bro ${g.bodyCss} CSS px tall (${want.toFixed(1)} wanted: ${BRO_WORLD_PX} world px x ${VO} x ${g.canvasH} / 1024)`,
        g.canvasW === 430 && g.canvasH >= 770 && g.canvasH <= 780 && near(g.bodyCss, want, 1), g);
      rec.ok(`${sc.tag}: the canvas is drawn at ${g.bufW}x${g.bufH} device px (a phone's 1.5 a CSS px: ${Math.round(g.canvasW * 1.5)}x${Math.round(g.canvasH * 1.5)}, on a ${g.dpr}x screen)`,
        near(g.bufW, g.canvasW * 1.5, 2) && near(g.bufH, g.canvasH * 1.5, 3), g);
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
