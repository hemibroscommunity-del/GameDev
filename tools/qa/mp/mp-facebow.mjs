/* THE FACE TATTOO ON A BOW SHOT (v2.3.2516).
 *
 * Owner (backlog triage 2026-09-14, art item 4): on the jog SOUTH and EAST
 * bow-shot frames the face tattoo covers only the top half of the face.
 *
 * WHY THIS IS PHOTOGRAPHED AND MEASURED OFF THE PHOTOGRAPH, rather than off the
 * bake's own region probe.  `window.__btSkinRegions` reports the face region per
 * frame, and it is keyed by `_bakeTag` -- which only the WALKING bake sets
 * (playerSkins' buildBodySheet).  The attack stand-ins are baked by their own
 * loader in effectsRenderer, the second bake site TRAPS §73 is about, so their
 * regions file themselves under whatever sheet the walking path baked last.
 * Reading that would be measuring the wrong sheet, confidently.
 *
 * So the instrument is the screen: a face tattoo in a colour nothing else on the
 * character can produce, and a count of where its pixels land on the head.  The
 * owner's report is about what the composite LOOKS like, which is the same
 * argument mp-shirtarm's v2.3.2133 section makes after four versions of trusting
 * a number that could not see the defect.
 *
 * THE INK IS MAGENTA ON PURPOSE.  It is the one hue the figure cannot make:
 * skin and hair are warm browns, the tee is white, the trousers olive, and the
 * crimson cape is red-dominant with no blue in it.  "r and b both well above g"
 * therefore means ink and nothing else, which is what lets the count below be a
 * count rather than an estimate.
 *
 *   node tools/qa/mp/run.mjs facebow
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = H.REPO + '/tools/qa/mp/out';
const TAG = process.env.BT_SHOT_TAG || 'now';

/* EVERY cell inked, palette 'b' (#d76ba8).  A full grid is the right probe for
   "which part of the face does the region reach": a band would leave the answer
   dependent on where the band happened to fall. */
const FACE_ART = 'b'.repeat(256);

/* One crop, returned BOTH as a 20x picture and as the ink measurement, so the
   number and the render can never be of different frames.

   ═══ v2.3.3310: THE CROP AND THE BOX ARE ONE FRAME ═══
   The crop used to be measured (H.figureBox) and then photographed
   (page.screenshot) a moment later.  Standing, that moment does not matter.
   JOGGING it does: the figure's place on the screen moves with every frame the
   camera trails it, and on a box drawing a frame every 300-600 ms one frame
   between the two calls moved the whole figure -- name plate and all -- 36 px
   down the crop, so "jog-south" photographed the plate and the crown of the
   head and measured a face 8 rows tall against the control's 14 (the sweep of
   main, part 12; the plate-to-head gap in that picture was the control's
   exactly, so nothing was drawn wrong).  Now the box is worked out and the
   pixels are copied in ONE animation frame: a callback queued from here runs
   after the game's own (queued a frame earlier), so it reads the frame just
   drawn, which is mp-firefight's way of reading a WebGL canvas at all.  The
   box is figureBox's own arithmetic (anchored on __btPlayerDrawn, 40k x 46k
   plus the pad); the DOM is not in the canvas, so nothing needs hiding. */
async function sample(P, tag, rec) {
  const res = await P.page.evaluate(async (pad) => {
    const grab = () => new Promise((done) => requestAnimationFrame(() => {
      try {
        const S = window._gameState && window._gameState.current;
        const cv = document.querySelector('canvas');
        const dr = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
        if (!S || !S.player || !cv || !cv.width || !dr) { done({ err: 'no figure' }); return; }
        const r = cv.getBoundingClientRect();
        const ws = S._worldScaleX || 1;
        const k = Math.max(0.05, ws / (2 / 3));
        const fx = (dr.x - S.camera.x) * ws, fy = (dr.footY - S.camera.y) * (S._worldScaleY || 1);
        const w = Math.round(40 * k) + pad * 2, h = Math.round(46 * k) + pad * 2;
        const x = Math.round(fx - 20 * k - pad), y = Math.round(fy - 44 * k - pad);
        if (x < 0 || y < 0 || x + w > r.width || y + h > r.height) { done({ err: 'off the screen', x, y, w, h }); return; }
        const sx = cv.width / r.width, sy = cv.height / r.height;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.imageSmoothingEnabled = false;
        g.drawImage(cv, x * sx, y * sy, w * sx, h * sy, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 40 && d[i] + d[i + 1] + d[i + 2] > 48) lit++;
        done({ c, d, lit: lit / (w * h) });
      } catch (e) { done({ err: String(e && e.message || e) }); }
    }));
    /* a frame the game did not draw reads empty; the next one is tried */
    let got = null;
    for (let i = 0; i < 6; i++) {
      got = await grab();
      if (got && got.c && got.lit > 0.3) break;
    }
    if (!got || !got.c) return got && got.err ? { err: got.err } : null;
    const c = got.c, d = got.d;
    const rows = new Array(c.height).fill(0);
    let ink = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] < 40) continue;
        /* magenta: red AND blue both clear of green. */
        if (d[i] > d[i + 1] + 22 && d[i + 2] > d[i + 1] + 22) { rows[y]++; ink++; }
      }
    }
    /* ═══ A ROW COUNTS ONLY IF IT IS ACTUALLY INKED ═══
     * The first cut took the span from the FIRST to the LAST row holding a
     * single magenta pixel, and that held right up until the character turned
     * up wearing the crimson cape: its panels run down both sides of the torso
     * and their darker tones pass a "red and blue both clear of green" test, so
     * the measured reach on the standing control went from 14 rows to 42 and the
     * ratio gate below stopped meaning anything.  Measured on that frame, the
     * separation is not subtle -- the face is 100+ inked pixels per row and the
     * cape's edge is one to three:
     *
     *     rows 380..659 (the face)      >= 100 px/row   = 14 source rows
     *     rows 660..1219 (the cape)     1-3 px/row
     *
     * So the span is taken over rows carrying a real share of the ink's own
     * widest row.  Derived from this frame's peak rather than a constant,
     * because the crop scales with the zoom and a fixed pixel floor would drift
     * with it.  What the claim is about is how far down the FACE the drawing
     * reaches, and a row with two stray pixels in it is not the face. */
    const peak = Math.max(0, ...rows);
    const FLOOR = Math.max(1, peak * 0.25);
    let top = -1, bot = -1;
    for (let y = 0; y < c.height; y++) {
      if (rows[y] < FLOOR) continue;
      if (top < 0) top = y;
      bot = y;
    }
    const SC = 20;
    const big = document.createElement('canvas');
    big.width = c.width * SC; big.height = c.height * SC;
    const bg = big.getContext('2d');
    bg.imageSmoothingEnabled = false;
    bg.fillStyle = '#14202a'; bg.fillRect(0, 0, big.width, big.height);
    bg.drawImage(c, 0, 0, big.width, big.height);
    return { ink, top, bot, peak, h: c.height, w: c.width, lit: +got.lit.toFixed(2), rows, url: big.toDataURL('image/png') };
  }, 10);
  if (!res || res.err) { rec.ok(`a crop of the figure for "${tag}" (guard)`, false, res); return null; }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/facebow-${TAG}-${tag}.png`, Buffer.from(res.url.split(',')[1], 'base64'));
  delete res.url;
  return res;
}

/* ═══ v2.3.2746: INKED BEFORE THE CHARACTER EXISTS ═══
   v2.3.2690 (#706) made a character's look its STORED RECORD, written once at
   the creator's join.  This scenario used to create a character, write the
   face tattoo into storage and reload to make it "take" -- which now, and
   correctly, reloads an un-inked character, because the record says so.  So
   the tattoo (and the bald head that keeps hair off the forehead) are in
   storage before the page's first script runs, and the creator's join carries
   them into the record, the way a player who drew in the creator arrives. */
const SEED = `try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(FACE_ART)});
  localStorage.setItem('bt-hair', 'none');
} catch (e) {}`;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort,
    viewport: { width: 390, height: 844 }, init: SEED });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const set = await P.page.evaluate((face) => ({ ok: localStorage.getItem('bt-facetattoo') === face }), FACE_ART);
  rec.ok('a full-coverage face tattoo is this character\'s own (guard)', !!(set && set.ok), set);
  let inWorld = null;
  for (let i = 0; i < 12; i++) {
    inWorld = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      return { has: !!(S && S.rpg && S.player), zone: S && S.zone,
        route: window.__btBootRoute || null };
    });
    if (inWorld && inWorld.has) break;
    await P.page.waitForTimeout(800);
  }
  rec.ok('the character is in the world (guard)', !!(inWorld && inWorld.has), inWorld);
  if (!inWorld || !inWorld.has) { await P.ctx.close().catch(() => {}); return; }
  /* BALD, and it is not a detail: hair covers the forehead, which is the
     half that already worked, and would hide the control. */
  await P.page.evaluate(() => { try { if (window.__btSetHair) window.__btSetHair('none'); } catch (e) {} });
  await P.page.waitForTimeout(600);

  /* ── THE CONTROL: the WALKING body, which the owner says is fine ──
     Every claim about the bow frames is a comparison against this. */
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(400);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(800);
  const idle = await sample(P, 'control-idle-south', rec);
  rec.ok('CONTROL: the walking body carries the face tattoo (guard — with no '
    + 'ink on screen at all, every count below would be zero and every claim '
    + 'would pass)', !!(idle && idle.ink > 30), idle && { ink: idle.ink });

  /* The bow shot, re-armed every frame: the window is ~400ms and nothing on the
     player display says a shot is happening (mp-capeattack's v2.3.2190 note). */
  await P.page.evaluate(() => {
    window.__pinBow = { a: null };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinBow;
      if (S && S.rpg && S.player && p && p.a !== null) {
        S.rpg.rangedWeapon = S.rpg.rangedWeapon || { name: 'Pine Bow', type: 'bow' };
        S.rpg.activeSlot = 'ranged';
        S._facingAngle = p.a; S._targetFacingAngle = p.a;
        S._aimAngle = p.a; S._mouseAimAngle = p.a;
        S._bowShotAt = Date.now(); S._bowShotAng = p.a;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const out = {};
  /* south = sector 2, east = sector 0 — the two the owner named.  Each is taken
     JOGGING (the key stays down), which is the state in the report: the moving
     bow shot is the one that draws the leg-erased torso strip whose top row
     lands at jaw height. */
  for (const [tag, sector, key] of [['jog-south', 2, 's'], ['jog-east', 0, 'd']]) {
    await P.page.evaluate((a) => { window.__pinBow = { a }; }, sector * Math.PI / 4);
    await P.page.keyboard.down(key);
    await P.page.waitForTimeout(900);
    out[tag] = await sample(P, tag, rec);
    await P.page.keyboard.up(key);
    await P.page.evaluate(() => { window.__pinBow = { a: null }; });
    await P.page.waitForTimeout(700);
  }

  for (const k of Object.keys(out)) {
    const s = out[k];
    console.log(`    ${k}: ${s && s.ink} ink px, inked rows ${s && s.top}..${s && s.bot} `
      + `of ${s && s.h} (peak ${s && s.peak}/row)  (idle control: ${idle && idle.ink} px, `
      + `rows ${idle && idle.top}..${idle && idle.bot}, peak ${idle && idle.peak})`);
  }

  rec.ok('both bow-shot frames were photographed with ink on them (guard)',
    Object.values(out).every((s) => s && s.ink > 0),
    Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v && v.ink])));

  /* THE CLAIM.  The face region used to end at the torso band's topmost row,
     which on a bow strip is the JAW -- so the drawing was fitted into the
     forehead and everything below it went bare.  A full-coverage grid on a head
     should therefore reach roughly as far down the figure as it does standing;
     measured against the idle control rather than against an absolute, because
     the bow poses are their own art at their own scale. */
  const reach = (s) => (s && s.bot >= 0 && s.top >= 0) ? (s.bot - s.top + 1) : 0;
  const idleReach = reach(idle);
  rec.ok('THE FACE TATTOO REACHES THE JAW ON A MOVING BOW SHOT — the region is '
    + 'seeded from the head\'s own box now, not from the torso band\'s first '
    + 'row, which on these strips sits at jaw height because the bow arms are '
    + 'raised',
    idleReach > 0 && ['jog-south', 'jog-east'].every((k) => reach(out[k]) >= idleReach * 0.75),
    { idleReach, south: reach(out['jog-south']), east: reach(out['jog-east']),
      ratioSouth: idleReach ? +(reach(out['jog-south']) / idleReach).toFixed(2) : null,
      ratioEast: idleReach ? +(reach(out['jog-east']) / idleReach).toFixed(2) : null });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
