/* ═══ v2.3.4360: THE MARK ON MAYOR BRO FOLLOWS HIM EVERY FRAME ═══
 *
 * The owner, 2026-11-10: "the reticle around mayor bro is pretty obnoxious
 * with movement (the frames are gritty)".
 *
 * The first steps' gold box round Mayor Bro and the big arrow at him are page
 * elements over the canvas.  The box found him 12 times a second and the
 * arrow 4, so as the camera moved both stuttered after him.  Now each is put
 * on him after every frame the game draws (src/ui/afterFrame.js), and the
 * card of words over his head moves with him the same way, held by its own
 * rules (src/ui/mobile/QuestCoach.jsx coachFollow; src/ui/guideArrow.js
 * followFrame).
 *
 * A new character in the world (never the old map), on a phone and on a
 * computer.  The page records, FRAME BY FRAME while the character walks,
 * where the box, the arrow and the card are and where Mayor Bro is by the
 * renderer's own sums:
 *   1. the card is up, the box round him, the arrow at him;
 *   2. walking: on every frame the camera moved, the box's middle is on him
 *      and the arrow at his side, to a pixel and a half (before: many pixels
 *      behind on most frames) -- timed by frames, never by a clock: this box
 *      draws a few a second;
 *   3. ...the arrow does not glide (no transition) and sits on whole device
 *      pixels;
 *   4. ...the card of words moves with him frame by frame too: never a hop
 *      bigger than his own step (before: five frames' worth at once, every
 *      fifth frame);
 *   5. stopped (he may still stroll about on his own): the box is on him on
 *      every frame all the same;
 *   6. no page error.
 * Pictures in tools/qa/mp/out/mayormark/.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];

/* records a row a frame while window.__mmOn: the camera, Mayor Bro's box by
   mayorScreen.js's sums, and the three marks as the page has them */
const RECORDER = `(() => {
  window.__mmRows = []; window.__mmOn = false;
  const step = () => {
    requestAnimationFrame(step);
    if (!window.__mmOn) return;
    try {
      const S = window._gameState && window._gameState.current;
      const n = S && (S.npcs || []).find((o) => o && o.name === 'Mayor Bro');
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      if (!S || !n || !cv || !S.camera) return;
      const cr = cv.getBoundingClientRect(), sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
      const x = typeof n.renderX === 'number' ? n.renderX : n.x, y = typeof n.renderY === 'number' ? n.renderY : n.y;
      const w = 64 * sx, h = 116 * sy;
      const m = { left: cr.left + (x - S.camera.x) * sx - w / 2, top: cr.top + (y - S.camera.y) * sy - h + 14 * sy, w, h };
      const ring = document.querySelector('[data-coach-ring="mayor"]');
      const card = document.querySelector('[data-coach-card="mayor"]');
      const arrow = document.querySelector('[data-guide-arrow]');
      const rr = ring && ring.getBoundingClientRect(), kr = card && card.getBoundingClientRect(), ar = arrow && arrow.getBoundingClientRect();
      const A = window.__btGuideArrow;
      window.__mmRows.push({
        cam: [S.camera.x, S.camera.y], m,
        ring: rr ? [rr.left + rr.width / 2, rr.top + rr.height / 2] : null,
        card: kr ? [kr.left, kr.top] : null,
        arrow: ar && A && A.lesson === 'mayor' ? [ar.left, ar.top, A.side] : null,
        glide: arrow ? arrow.style.transition : null,
      });
    } catch (e) { /* a probe only */ }
  };
  requestAnimationFrame(step);
})();`;

const mark = (P) => P.page.evaluate(() => {
  const c = window.__btCoach ? window.__btCoach() : null;
  const A = window.__btGuideArrow;
  return { showing: c ? c.showing : null, follow: c ? c.follow : null, arrow: A ? A.lesson : null,
    ring: !!document.querySelector('[data-coach-ring="mayor"]'), holder: (document.querySelector('[data-coach-follow="mayor"]') || { style: {} }).style.transform || '' };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out/mayormark');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS.filter((v) => !process.env.MM_ONLY || v.id === process.env.MM_ONLY)) {
    const P = await H.newPlayer(browser, { name: 'Mark' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', init: RECORDER, ...V.opts });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });

      /* 1. the card, the box and the arrow, all up */
      let m0 = null;
      for (const t0 = Date.now(); Date.now() - t0 < 60000;) {
        m0 = await mark(P);
        if (m0.showing === 'mayor' && m0.ring && m0.arrow === 'mayor') break;
        await P.page.waitForTimeout(300);
      }
      await P.page.screenshot({ path: join(OUT, `${V.id}-1-standing.png`) }).catch(() => {});
      rec.ok(`${V.id} 1. "Talk to Mayor Bro" is up: the box round him and the arrow at him`, !!m0 && m0.showing === 'mayor' && m0.ring && m0.arrow === 'mayor', m0);

      /* 2-4. walk past him, there and back, recording every frame */
      await P.page.evaluate(() => { window.__mmRows = []; window.__mmOn = true; });
      for (const key of ['a', 'd', 's', 'w']) {
        await P.page.keyboard.down(key);
        /* (by frames: about 8 of them a leg, however slow this box draws) */
        const n0 = await P.page.evaluate(() => window.__mmRows.length);
        for (const t0 = Date.now(); Date.now() - t0 < 12000;) {
          await P.page.waitForTimeout(120);
          if (await P.page.evaluate((n) => window.__mmRows.length - n, n0) >= 8) break;
        }
        if (key === 'a') await P.page.screenshot({ path: join(OUT, `${V.id}-2-walking.png`) }).catch(() => {});
        await P.page.keyboard.up(key);
        await P.page.waitForTimeout(150);
      }
      const rows = await P.page.evaluate(() => { window.__mmOn = false; return window.__mmRows; });
      const dpr = await P.page.evaluate(() => window.devicePixelRatio || 1);
      /* the frames the camera moved in, with the box up */
      const moved = rows.filter((r, i) => i > 0 && r.ring && (Math.abs(r.cam[0] - rows[i - 1].cam[0]) > 0.5 || Math.abs(r.cam[1] - rows[i - 1].cam[1]) > 0.5));
      const off = (r) => Math.max(Math.abs(r.ring[0] - (r.m.left + r.m.w / 2)), Math.abs(r.ring[1] - (r.m.top + r.m.h / 2)));
      const worst = moved.reduce((a, r) => Math.max(a, off(r)), 0);
      const travelled = rows.length ? Math.max(...rows.map((r) => Math.hypot(r.cam[0] - rows[0].cam[0], r.cam[1] - rows[0].cam[1]))) : 0;
      rec.ok(`${V.id} 2. walking: on all ${moved.length} frames the camera moved in (it went ${Math.round(travelled)} world px), the box's middle is on Mayor Bro, ${worst.toFixed(2)} px off at the most`,
        moved.length >= 8 && travelled > 40 && worst <= 1.5, { frames: rows.length, moved: moved.length, worst, travelled: Math.round(travelled) });
      /* the arrow: from his left, its corner 62 px left of his box and at his middle */
      const arr = moved.filter((r) => r.arrow);
      const want = (r) => (r.arrow[2] === 'left' ? [r.m.left - 6 - 56, r.m.top + r.m.h / 2 - 28]
        : [r.m.left + r.m.w / 2 - 28, r.arrow[2] === 'above' ? r.m.top - 6 - 56 : r.m.top + r.m.h + 6]);
      /* (above or below it is kept inside the screen's edges: only its own side is held to) */
      const aoff = (r) => (r.arrow[2] === 'left' ? Math.max(Math.abs(r.arrow[0] - want(r)[0]), Math.abs(r.arrow[1] - want(r)[1])) : Math.abs(r.arrow[1] - want(r)[1]));
      const aworst = arr.reduce((a, r) => Math.max(a, aoff(r)), 0);
      rec.ok(`${V.id} 3. ...and the arrow is at him on all ${arr.length} of them, ${aworst.toFixed(2)} px off at the most`, arr.length >= 6 && aworst <= 1.5, { arr: arr.length, aworst });
      const onDev = arr.every((r) => Math.abs(r.arrow[0] * dpr - Math.round(r.arrow[0] * dpr)) < 0.02 && Math.abs(r.arrow[1] * dpr - Math.round(r.arrow[1] * dpr)) < 0.02);
      rec.ok(`${V.id} 3. ...with no glide after him, on whole device pixels`, arr.length > 0 && arr.every((r) => r.glide === 'none') && onDev, { glide: arr[0] && arr[0].glide, dpr });
      /* the card of words: frame by frame it steps no further than he does
         (it is held by the screen's edge or its other rules on some frames,
         so less is fine; a hop is not), and it does step with him */
      let hop = 0, stepped = 0, pairs = 0;
      const jumps = [];
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        if (!a.card || !b.card) continue;
        const his = Math.max(Math.abs(b.m.left - a.m.left), Math.abs(b.m.top - a.m.top));
        const its = Math.max(Math.abs(b.card[0] - a.card[0]), Math.abs(b.card[1] - a.card[1]));
        if (his < 0.5) continue;
        pairs++;
        if (its > 0.3) stepped++;
        /* (a JUMP is the card's rules changing its side of him -- above him
           to below him as he nears the top of the screen, right of the quest
           card -- which a render does, once; it is counted, not a step) */
        if (its - his > 24) { jumps.push({ i, by: Math.round(its), top: Math.round(b.m.top), from: a.card.map(Math.round), to: b.card.map(Math.round) }); continue; }
        hop = Math.max(hop, its - his);
      }
      rec.ok(`${V.id} 4. ...and the card of words moves with him: it stepped on ${stepped} of the ${pairs} frames he moved in, never more than ${hop.toFixed(2)} px further than he did (${jumps.length} change(s) of side)`,
        pairs >= 8 && stepped >= pairs * 0.5 && hop <= 2 && jumps.length <= 2, { pairs, stepped, hop, jumps });
      if (jumps.length) console.log('    the card changed side: ' + JSON.stringify(jumps));

      /* 5. stopped: he may stroll about on his own -- the box is on him all the same */
      await P.page.waitForTimeout(1200);
      await P.page.evaluate(() => { window.__mmRows = []; window.__mmOn = true; });
      for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
        await P.page.waitForTimeout(150);
        if (await P.page.evaluate(() => window.__mmRows.length) >= 10) break;
      }
      const rest = await P.page.evaluate(() => { window.__mmOn = false; return window.__mmRows; });
      const m5 = await mark(P);
      const withRing = rest.filter((r) => r.ring);
      const worst5 = withRing.reduce((a, r) => Math.max(a, off(r)), 0);
      const strolled = rest.length ? Math.max(...rest.map((r) => Math.hypot(r.m.left - rest[0].m.left, r.m.top - rest[0].m.top))) : 0;
      await P.page.screenshot({ path: join(OUT, `${V.id}-3-stopped.png`) }).catch(() => {});
      rec.ok(`${V.id} 5. stopped: the box is on him on all ${withRing.length} frames, ${worst5.toFixed(2)} px off at the most (he strolled ${strolled.toFixed(1)} px on his own; the follow has moved the marks in ${m5 && m5.follow ? m5.follow.frames : 0} frames)`,
        withRing.length >= 8 && worst5 <= 1.5 && !!m5 && m5.showing === 'mayor' && !!m5.follow && m5.follow.id === 'mayor' && m5.follow.frames > 0, { m5, worst5, strolled });
      rec.ok(`${V.id} 6. no page error`, errors.length === 0, errors);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
