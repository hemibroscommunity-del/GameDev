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
 *   6. (v2.3.5040) the worker's restart.  A phone behind its lock screen
 *      does not run, and neither does its worker; bodyBake.js's watch read
 *      the wall's clock, so back from a lock of 20 s or more with a job
 *      waiting it let every worker go as "silent", and none was ever
 *      started again: the page baked for the rest of the sitting.  So:
 *      6a. with a job waiting, the page AND its workers are frozen for 25 s
 *          (the browser's page process stopped, SIGSTOP: a thread held in a
 *          loop, mp-tabsleep's way, leaves the worker running beside it, and
 *          it answers), once hidden first, as a phone's lock is, and once
 *          with no visibility event at all (an iPhone does not always send
 *          one: mp-comeback 5): no worker is let go, and the sheets that
 *          waited are the worker's;
 *      6b. a worker that IS stuck (a job of a kind it does not know is never
 *          answered) is still let go after 20 s the page was there to see
 *          (and not while the page is hidden, though it runs: 25 s behind
 *          another tab lets none go), and the page bakes; it is started
 *          again when the page comes back, once: let go a second time, it
 *          stays gone until the next return.
 *
 * Sampled per CLAUDE.md §6: one sheet a pose family (the facings of a family
 * share the code; jog-northeast is the one with a step of its own).
 *
 *   BT_BW_PARTS=play,same,restart   some parts only (all three by default):
 *                                   `play` 2, `same` 1 to 5, `restart` 6
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

const PARTS = (process.env.BT_BW_PARTS || 'play,same,restart').split(',').map((s) => s.trim());
/* 6 (v2.3.5040): how long the page is frozen (bodyBake.js WORKER_MS is 20 s) */
const FROZEN_MS = 25000;
/* the page goes hidden and comes back, as mp-tabsleep and mp-tabwipe make it */
const hide = (P) => P.page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('blur'));
});
const show = (P) => P.page.evaluate(() => {
  delete document.visibilityState; delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new Event('focus'));
});
/* the browser's page processes (the page's thread and its workers are
   threads of one): stopped, nothing in them runs, and the wall's clock goes
   on -- a phone behind its lock screen */
async function pageProcesses(browser) {
  const s = await browser.newBrowserCDPSession();
  try {
    const info = await s.send('SystemInfo.getProcessInfo');
    return (info.processInfo || []).filter((p) => p.type === 'renderer').map((p) => p.id);
  } finally { await s.detach().catch(() => {}); }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 1, world: 'wheel', init: OWN });
  A.page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  try {
    await H.enterWorld(A);
    const inA = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inA, inA);
    if (!inA) return;
    if (PARTS.includes('play')) {
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
    }

    if (PARTS.includes('same')) {
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
    }

    /* ═══ 6 (v2.3.5040): THE WORKER'S RESTART ═══ */
    if (PARTS.includes('restart')) {
      const bw = () => A.page.evaluate(() => window.__btBodyWorker()).catch(() => null);
      /* the bro's drawing changed: his drawn sheets bake again, on the worker
         (2 above), so there is a job in a worker's hands and more in line */
      let ink = 0;
      const askSheets = () => A.page.evaluate((s) => { window.__btMade = []; window.__btSetArt('tattoo', s); }, INK('def0124'[ink++ % 7], 2 + (ink % 3)));
      const settle = async (from, ms = 240000) => {
        const t0 = Date.now();
        let st = null;
        while (Date.now() - t0 < ms) {
          await A.page.waitForTimeout(1000);
          st = await bw();
          if (st && st.asked > from.asked && !st.pending && !st.waiting && st.done + st.failed >= st.asked) break;
        }
        return st;
      };
      await A.page.evaluate(() => { window.__bwBeat = 0; setInterval(() => { window.__bwBeat++; }, 100); });

      /* 6a: frozen with a job waiting */
      for (const how of [{ hidden: true, label: 'hidden first, as a lock screen' }, { hidden: false, label: 'no visibility event at all' }]) {
        const s0 = await bw();
        await askSheets();
        let at = null;
        for (let i = 0; i < 300 && !(at && at.pending >= 1); i++) { await A.page.waitForTimeout(100); at = await bw(); }
        if (how.hidden) await hide(A);
        const beat0 = await A.page.evaluate(() => window.__bwBeat);
        at = await bw();
        const pids = await pageProcesses(browser);
        const tStop = Date.now();
        for (const pid of pids) { try { process.kill(pid, 'SIGSTOP'); } catch (e) { /* gone */ } }
        await new Promise((r) => setTimeout(r, FROZEN_MS));
        for (const pid of pids) { try { process.kill(pid, 'SIGCONT'); } catch (e) { /* gone */ } }
        const frozenMs = Date.now() - tStop;
        const beat1 = await A.page.evaluate(() => window.__bwBeat);
        const woke = await bw();
        if (how.hidden) await show(A);
        console.log(`    frozen ${(frozenMs / 1000).toFixed(1)} s (${how.label}): at the freeze ${JSON.stringify(at)}; awake ${JSON.stringify(woke)}`);
        rec.ok(`6a (${how.label}) guard: the page froze with a job in a worker's hands (${at && at.pending} in hand, ${at && at.waiting} in line), for ${(frozenMs / 1000).toFixed(1)} s, and ran nothing meanwhile (${beat1 - beat0} beats of a 100 ms timer)`,
          !!at && at.pending >= 1 && frozenMs >= 20000 && beat1 - beat0 <= 5, { at, frozenMs, beats: beat1 - beat0 });
        const st = await settle(s0);
        console.log(`    after it: ${JSON.stringify(st)}`);
        rec.ok(`6a (${how.label}): back from ${(frozenMs / 1000).toFixed(0)} s frozen, no worker was let go (let go ${st && st.stalled - s0.stalled}; ${st && st.workers} of ${st && st.pool} at work)`,
          !!st && st.stalled === s0.stalled && !st.dead && st.workers >= 1, st);
        rec.ok(`6a (${how.label}): the sheets that waited through it were baked by the worker (${st && st.done - s0.done} sheets, ${st && st.failed - s0.failed} failed and left to the page)`,
          !!st && st.done - s0.done >= at.pending + at.waiting && st.failed === s0.failed && !st.pending, st);
      }

      /* 6b: a worker that is stuck is let go; started again when the page comes back, once */
      const stick = () => A.page.evaluate(() => {
        const n = window.__btBodyWorker().pool;
        /* a job of a kind the worker does not know is never answered
           (bodyBakeWorker.js onmessage): one for each worker */
        for (let i = 0; i < n; i++) window.__btBodyWorkerBytes(['/sprites/player/stand-south.png'], {}, 128, 128, 'qa-stuck');
      });
      const untilDead = async () => {
        const t0 = Date.now();
        let st = null;
        while (Date.now() - t0 < 90000) { await A.page.waitForTimeout(1000); st = await bw(); if (st && st.dead) break; }
        return { st, s: (Date.now() - t0) / 1000 };
      };
      for (const round of [1, 2]) {
        const s0 = await bw();
        await stick();
        /* round 1: the page is hidden first, and RUNS (a tab behind another:
           its timers go on).  Hidden time is not the watch's: a stuck worker
           is not let go until the page has been there 20 s to see it.  A tick
           may have counted before the hide (4 s at most), so 15 */
        let least = 19;
        if (round === 1) {
          await hide(A);
          await A.page.waitForTimeout(FROZEN_MS);
          const sh = await bw();
          rec.ok(`6b round 1: hidden and running for ${FROZEN_MS / 1000} s, a stuck worker is not let go (hidden time is not counted: ${sh && sh.stalled - s0.stalled} let go, ${sh && sh.workers} of ${s0.pool} kept)`,
            !!sh && !sh.dead && sh.stalled === s0.stalled && sh.workers === s0.pool && sh.pending === s0.pool, sh);
          await show(A);
          least = 15;
        }
        const gone = await untilDead();
        console.log(`    stuck, round ${round}: ${JSON.stringify(gone.st)} after ${gone.s.toFixed(1)} s`);
        rec.ok(`6b round ${round}: a worker that is stuck is still let go, after 20 s the page was there to see (${gone.st && gone.st.stalled - s0.stalled} of ${s0.pool} let go, ${gone.s.toFixed(0)} s${round === 1 ? ' after the page was shown again' : ''})`,
          !!gone.st && gone.st.dead && gone.st.stalled - s0.stalled === s0.pool && gone.st.workers === 0 && gone.s >= least, gone);
        /* nothing brings it back but the page's return: a bake asked now is the page's */
        const s1 = await bw();
        await askSheets();
        await A.page.waitForTimeout(6000);
        const s2 = await bw();
        rec.ok(`6b round ${round}: with no return of the page it stays gone, and the page bakes (${s2 && s2.asked - s1.asked} asked of the worker in 6 s)`,
          !!s2 && s2.dead && s2.workers === 0 && s2.asked === s1.asked, s2);
        /* the page goes away and comes back */
        await hide(A);
        await A.page.waitForTimeout(1500);
        await show(A);
        await A.page.waitForTimeout(500);
        const s3 = await bw();
        await askSheets();
        const st = await settle(s3);
        console.log(`    back, round ${round}: ${JSON.stringify(st)}`);
        rec.ok(`6b round ${round}: the page came back and a worker was started again (${st && st.workers} at work), and baked the next sheets (${st && st.done - s3.done}, ${st && st.failed - s3.failed} failed)`,
          !!st && !st.dead && st.workers >= 1 && st.done - s3.done >= 3 && st.failed === s3.failed, st);
      }
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}
