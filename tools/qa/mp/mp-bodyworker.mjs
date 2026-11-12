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
 *   1b. the head sheets an armoured player shows (jog, hit, mine, pickup),
 *      the same way;
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
    rec.ok('the drawn heads carried the face drawing, and an eye style that erases (guard)',
      hres.filter((r) => r.ink).length >= 5 && hres.filter((r) => r.blank).length >= 2, { ink: hres.filter((r) => r.ink).length, blank: hres.filter((r) => r.blank).length });
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}
