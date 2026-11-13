/* ═══ A LOOK WITH DRAWINGS, BAKED ON A WORKER (v2.3.4930) ═══
 *
 * The crowd tour (docs/specs/held-sweep.md, a-ink, b-fish): another player's
 * tattoo, trouser print or eye style was a body sheet recoloured on the page
 * as each pose and facing first came on screen, 114 to 720 ms a sheet.  The
 * same bake now runs on a worker (src/rendering/bodyBake.js,
 * bodyBakeWorker.js).  This proves it the same picture and off the page:
 *
 *   1. every pose family once (stand, jog, the jog-northeast clean-up, hit,
 *      roll, mine, fish, pickup), in two looks with drawings (tattoos on the
 *      chest, face and arms, trousers drawn and patterned, boots patterned, an
 *      eye style that erases, an eye colour) and the plain default: the
 *      page's bake (buildBodySheet's own steps) against the worker's, byte by
 *      byte, and the packed cells the same;
 *   1c. a peer's stand-ins (a sword body, a bow torso strip, the jog legs);
 *   1b. the head sheets an armoured player shows (jog, hit, mine, pickup),
 *      the same way;
 *   5. (v2.3.5014) a drawn shirt (a print, a pattern, a colour; mirrored):
 *      gearSheets.js's dressing on the page against the worker's, byte by
 *      byte, one sheet a pose family (the 128 px sheets sliced raw, the
 *      256 px ones, the swing's upscaled one that is not packed), and a
 *      stand-in's strips (the swing, the bow, the cook's one frame, the
 *      chop's twin: effectsRenderer.js _dressedShirtFrame).  In play
 *      (another player's print in a hit, a roll, mining) it is the crowd
 *      tour's d-prints that measures it: the stand and jog prints are drawn
 *      from colour numbers (lookShirtFrame.js) and never come here;
 *   2. the game's own path: behind the loading screen the page bakes, as
 *      before; in play (the bro's drawing changed in the world, which bakes
 *      his drawn sheets again, as a stranger's do when they walk up) the
 *      worker bakes, none fails, and the page's part of each (the texture
 *      made) is under 4 ms.
 *
 * Sampled per CLAUDE.md §6: one sheet a pose family (the facings of a family
 * share the code; jog-northeast is the one with a step of its own).
 */
import * as H from './harness.mjs';

const INK = (c, every) => Array.from({ length: 256 }, (_, i) => ((i % every) < 2 ? c : '0')).join('');
const ART = {
  pants: INK('3', 5), pantsBack: INK('6', 4), tattoo: INK('1', 3), tattooFace: INK('c', 7),
  tattooArm: INK('9', 4), tattooHeadBack: INK('0', 2), tattooBack: INK('5', 3),
  pantsPattern: 'stripe-v:4', shoesPattern: 'check:2', mirror: false,
};
const SHEETS = [['stand', 'south'], ['jog', 'east'], ['jog', 'northeast'], ['hit', 'north'], ['dodge', 'east'],
  ['mine', 'south'], ['fish', 'south'], ['pickup', 'south']];
/* the head sheets (every family that ships one: playerSkins getPickupHeadFrame) */
const HEADS = [['jog', 'east'], ['jog', 'south'], ['hit', 'north'], ['mine', 'south'], ['pickup', 'south']];
/* a peer's stand-ins: [file, fw, fh (null: square), facing, a torso strip, flipped] */
const STANDINS = [['/sprites/player/sword-south-body.png', 320, 320, 'south', false, false],
  ['/sprites/player/bow-east-torso.png', 214, 241, 'east', true, true],
  ['/sprites/player/jog-east-legs.png', null, null, 'east', false, false]];
/* v2.3.5014: the drawn shirt's sheets: [pose, facing] (stand, jog, jog-northeast, hit, roll at 256 px, mine (its print
   anchored), fish, pickup at 256 px, the swing: upscaled and not packed) */
const SHIRTS = [['stand', 'south'], ['jog', 'east'], ['jog', 'northeast'], ['hit', 'north'], ['dodge', 'east'],
  ['mine', 'south'], ['fish', 'south'], ['pickup', 'south'], ['swing', 'east']];
/* ...and a stand-in's strips (effectsRenderer.js _dressedShirtFrame): the swing, the bow, the cook's one pinned frame,
   the chop's twin; `k` the pattern's cell scale for the pose (SHIRT_PATTERN_K) */
const SHIRT_STRIPS = [{ file: 'swing-east', fw: 402, k: 188 / 94.5 }, { file: 'bowshot-east', fw: 214, k: 188 / 94.5 },
  { file: 'cook-south', fw: 213, one: 22, k: 85 / 25.5 }, { file: 'chop-west-220', fw: 240, twin: 12, k: 170 / 94.5 }];
const SHIRT_LOOKS = [
  { name: 'print+pattern+colour', art: INK('7', 3), pattern: 'stripe-v:2', tint: [200, 60, 60], mirror: false },
  { name: 'print-mirrored', art: INK('e', 5), pattern: null, tint: null, mirror: true },
];
const LOOKS = [
  { name: 'drawn', skin: 'green', pants: 'pink', shoes: 'blue', eyeColor: 'blue', eyeStyle: 'one-eye', art: ART },
  { name: 'drawn-mirror', skin: 'ebony', pants: 'red', shoes: 'white', eyeColor: undefined, eyeStyle: 'sleepy', art: { ...ART, mirror: true } },
  { name: 'plain', skin: null, pants: null, shoes: null, eyeColor: undefined, eyeStyle: undefined, art: null },
];
const OWN = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'alabaster'); localStorage.setItem('bt-pants', 'pink');
  localStorage.setItem('bt-tattooart', ${JSON.stringify(INK('3', 3))});
  localStorage.setItem('bt-pantsart', ${JSON.stringify(INK('1', 4))});
} catch (e) {}`;

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 1, world: 'wheel', init: OWN });
  A.page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  try {
    await H.enterWorld(A);
    const inA = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inA, inA);
    if (!inA) return;
    /* 2: in play.  The bro's own drawing changed once in the world: his drawn
       sheets are let go of and baked again (playerSkins _onArtChanged), now
       on the worker (behind the loading screen they were the page's, as
       before: bodyBake.js) */
    const before = await A.page.evaluate(() => (window.__btBodyWorker ? window.__btBodyWorker() : null));
    console.log('    behind the loading screen:', JSON.stringify(before));
    rec.ok(`behind the loading screen the page baked, as before (${before && before.loading} asked there, ${before && before.done} on the worker)`,
      !!before && !before.off && before.loading >= 5 && before.done === 0, before);
    await A.page.evaluate((s) => { window.__btMade = []; window.__btSetArt('tattoo', s); }, INK('b', 2));
    const t0 = Date.now();
    let st = null;
    while (Date.now() - t0 < 240000) {
      await A.page.waitForTimeout(1000);
      st = await A.page.evaluate(() => window.__btBodyWorker()).catch(() => null);
      if (st && st.asked > 0 && !st.pending && st.done + st.failed >= st.asked) break;
    }
    console.log(`    in play: ${JSON.stringify(st)} (${Math.round((Date.now() - t0) / 1000)} s)`);
    rec.ok(`in play, the drawn look's sheets were baked by the worker (${st && st.done} sheets, ${st && st.failed} failed)`,
      !!st && st.done >= 5 && st.failed === 0 && !st.pending, st);
    const made = await A.page.evaluate(() => {
      const m = window.__btMade || [], out = [];
      for (let i = 0; i < m.length; i += 2) if (/^body /.test(m[i])) out.push([m[i], Math.round(m[i + 1] * 10) / 10]);
      return out;
    });
    const worstPage = made.reduce((a, [, ms]) => Math.max(a, ms), 0);
    console.log(`    the page's part, ${made.length} sheets, worst ${worstPage} ms`);
    rec.ok(`the page's part of each sheet the worker baked in play (the texture made) is under 4 ms (worst ${worstPage} ms of ${made.length})`,
      made.length >= 3 && worstPage < 4, made.slice(0, 8));
    const drawn = await A.page.evaluate(() => (window.__btBodySheetKeys ? window.__btBodySheetKeys().filter((k) => /#art/.test(k)).length : 0));
    rec.ok(`the new drawing's sheets are in the game's cache (${drawn})`, drawn >= 3, drawn);

    /* 1: the same sheets both ways */
    const looks = [];
    for (const L of LOOKS) for (const [pose, dir] of SHEETS) looks.push({ ...L, pose, dir });
    const res = await A.page.evaluate((ls) => window.__btBodyWorkerCompare(ls), looks);
    let pageMs = 0, workerMs = 0;
    for (const r of res) {
      pageMs += r.pageMs; workerMs += r.workerMs;
      console.log(`    ${r.look} ${r.pose}-${r.dir}: ${r.W}x${r.H} diff ${r.diff} (worst ${r.worst}) cells ${r.cellsSame} ink ${r.ink} blank ${r.blank} page ${r.pageMs} ms worker ${r.workerMs} ms ${JSON.stringify(r.wt || {}, (k, v) => (typeof v === 'number' ? Math.round(v) : v))} ${r.why || ''}`);
      rec.ok(`${r.look} ${r.pose}-${r.dir}: the worker's sheet is the page's, byte for byte (${r.diff} bytes differ), the same size and cells`,
        r.W === r.wW && r.H === r.wH && r.cellsSame && r.frames === r.wFrames && r.diff === 0, r);
    }
    rec.ok('the drawn looks carried their drawings, and an eye style that erases (guard: the comparison means something)',
      res.filter((r) => r.ink).length >= 14 && res.filter((r) => r.blank).length >= 2, { ink: res.filter((r) => r.ink).length, blank: res.filter((r) => r.blank).length });
    console.log(`    in all: the page's bake ${pageMs} ms, the worker's ${workerMs} ms, ${res.length} sheets`);

    /* 3: the head sheets an armoured player shows, the same way */
    const heads = [];
    for (const L of LOOKS) for (const [pose, dir] of HEADS) heads.push({ name: L.name, skin: L.skin, eyeStyle: L.eyeStyle, art: L.art, pose, dir });
    const hres = await A.page.evaluate((ls) => window.__btHeadWorkerCompare(ls), heads);
    for (const r of hres) {
      console.log(`    head ${r.look} ${r.pose}-${r.dir}: ${r.W}x${r.H} diff ${r.diff} (worst ${r.worst}) cells ${r.cellsSame} ink ${r.ink} blank ${r.blank} page ${r.pageMs} ms worker ${r.workerMs} ms ${r.why || ''}`);
      rec.ok(`head ${r.look} ${r.pose}-${r.dir}: the worker's sheet is the page's, byte for byte (${r.diff} bytes differ), the same size and cells`,
        r.W === r.wW && r.H === r.wH && r.cellsSame && r.frames === r.wFrames && r.diff === 0, r);
    }
    /* 4: a peer's stand-ins with drawings (their sword and bow bodies, a torso strip, the jog legs) */
    const strips = [];
    for (const L of LOOKS) {
      for (const [url, fw, fh, dir, torso, mirror] of STANDINS) strips.push({ name: L.name, skin: L.skin, pants: L.pants, shoes: L.shoes, art: L.art, url, fw, fh, dir, torso, mirror });
    }
    const sres = await A.page.evaluate((ls) => window.__btStandInWorkerCompare(ls), strips);
    for (const r of sres) {
      console.log(`    stand-in ${r.look} ${r.url}: ${r.W}x${r.H} diff ${r.diff} (worst ${r.worst}) cells ${r.cellsSame} ink ${r.ink} page ${r.pageMs} ms worker ${r.workerMs} ms ${r.why || ''}`);
      rec.ok(`stand-in ${r.look} ${r.url.replace(/^.*\//, '')}: the worker's strip is the page's, byte for byte (${r.diff} bytes differ), the same size and cells`,
        r.W === r.wW && r.H === r.wH && r.cellsSame && r.frames === r.wFrames && r.diff === 0, r);
    }
    /* 5: v2.3.5014, a drawn shirt, the same way, and in play on the worker */
    const shirts = [];
    for (const L of SHIRT_LOOKS) for (const [pose, dir] of SHIRTS) shirts.push({ ...L, pose, dir });
    for (const L of SHIRT_LOOKS) for (const strip of SHIRT_STRIPS) shirts.push({ ...L, strip });
    const tres = await A.page.evaluate((ls) => window.__btShirtWorkerCompare(ls), shirts);
    for (const r of tres) {
      console.log(`    shirt ${r.look} ${r.pose}-${r.dir}: ${r.W}x${r.H} diff ${r.diff} (worst ${r.worst}) cells ${r.cellsSame} dressed ${r.dressedPx} px page ${r.pageMs} ms worker ${r.workerMs} ms ${r.why || ''}`);
      rec.ok(`shirt ${r.look} ${r.pose}-${r.dir}: the worker's sheet is the page's, byte for byte (${r.diff} bytes differ), the same size and cells`,
        r.W === r.wW && r.H === r.wH && r.cellsSame && r.frames === r.wFrames && r.diff === 0, r);
    }
    rec.ok('the drawn shirts were dressed (guard: the comparison means something)', tres.length === shirts.length && tres.every((r) => r.dressedPx > 50), tres.map((r) => r.dressedPx));
    rec.ok('the drawn stand-ins carried their drawings (guard)', sres.filter((r) => r.ink).length >= 6, sres.filter((r) => r.ink).length);
    rec.ok('the drawn heads carried the face drawing, and an eye style that erases (guard)',
      hres.filter((r) => r.ink).length >= 5 && hres.filter((r) => r.blank).length >= 2, { ink: hres.filter((r) => r.ink).length, blank: hres.filter((r) => r.blank).length });
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}
