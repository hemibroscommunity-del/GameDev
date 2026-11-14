/* ═══ A MONSTER STRIP'S NUMBERS KEPT DEFLATED A FRAME AT A TIME (v2.3.5257) ═══
 *
 * Card P's backlog, the fire goblin (src/rendering/framePack.js, the planning
 * session's road A').  Two phones at the Flame Fields' goblins: A as it ships,
 * B with ?framepack=0 (the numbers kept whole, as before).
 *   0. A's goblin strips the chip has drawn are packed, none declined, none
 *      failed; B packs nothing;
 *   1. every frame a reader gets from a packed strip (the frame, unpacked) is
 *      the numbers it was, byte for byte, and the whole strip too (A keeps
 *      them for the check: __btFramePackVerify); and every frame of every
 *      goblin strip reads the same colours on A as on B;
 *   2. the worst hit: 2, 4 and 8 arrows landing on frames the cache has not
 *      got, read the readers' way in one task, at full speed and on a slow
 *      phone (the CPU throttled, BT_FP_THROTTLE, 4 unless set): the task's
 *      unpacking stays within UNPACK_MS (and one frame), the rest put off to
 *      the next task;
 *   3. arrows into the goblins: the stuck arrows read packed frames, a hit's
 *      chips are cut from them, no frame fails to unpack, the readers' cache
 *      within its cap;
 *   4. a black screen's rebuild: every packed strip unpacked for the new chip,
 *      every goblin drawn whole, and packed again once drawn;
 *   no page error on either phone.
 *
 *   node tools/qa/mp/run.mjs framepack
 *   BT_FP_QUERY=...     more of the query for both phones
 *   BT_FP_THROTTLE=6    the slow phone slower */
import * as H from './harness.mjs';
import { UNPACK_MS } from '../../../src/rendering/framePack.js';
export const lane = 'full';
const PHONE = { width: 390, height: 844 };

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { id: x.id, x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}
async function fight(P, ms) {
  const t0 = Date.now();
  let fired = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 1200) { await P.page.waitForTimeout(300); continue; }
    if (s.m.d > 420) { await P.page.evaluate(() => { window._gameState.current.autoAttack = false; }); await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.1)); continue; }
    fired += await P.page.evaluate(({ id }) => new Promise((resolve) => {
      const S = window._gameState.current;
      const n0 = (S.arrows || []).length;
      const aim = () => {
        const m = (S.monsters || []).find((x) => x.id === id);
        if (!m || !S.player) return;
        const b = S._bowSight;
        const ox = b && typeof b.ox === 'number' ? b.ox : S.player.x, oy = b && typeof b.oy === 'number' ? b.oy : S.player.y;
        const ang = Math.atan2((typeof m.renderY === 'number' ? m.renderY : m.y) - 30 - oy, (typeof m.renderX === 'number' ? m.renderX : m.x) - ox);
        S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = true; S._facingAngle = ang; S._targetFacingAngle = ang;
      };
      aim(); S.autoAttack = true;
      const iv = setInterval(aim, 60);
      setTimeout(() => { clearInterval(iv); resolve((S.arrows || []).length > n0 ? 1 : 0); }, 900);
    }), { id: s.m.id });
  }
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
  return fired;
}

/* every goblin strip's frames: label -> [{x,y,w,h,hash}] the readers' way */
const HASHES = (cellsByLabel) => {
  const out = {};
  const fnv = (u32, n) => { let h = 2166136261 >>> 0; for (let i = 0; i < n; i++) h = Math.imul(h ^ u32[i], 16777619) >>> 0; return h; };
  for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
    const label = String(src.label || '');
    if (!/fire-goblin/.test(label) || src.destroyed) continue;
    const key = label.replace(/^.*\//, '').replace(/[?#].*$/, '');
    const cells = cellsByLabel ? cellsByLabel[key] : (src.__btCells || []).filter((c) => c.w > 0 && c.h > 0);
    if (!cells) continue;
    const rows = [];
    for (const c of cells) {
      let nums = null, ox = 0, oy = 0;
      if (src.__btFP) { const f = window.__btFramePackFrame(src, c.x, c.y, c.w, c.h, 'qa'); if (f) { nums = f.nums; ox = f.x; oy = f.y; } }
      else nums = src._btNumbers;
      if (!nums) { rows.push({ ...c, hash: null }); continue; }
      const px = new Uint32Array(c.w * c.h);
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) px[y * c.w + x] = nums.pal[nums.idx[(c.y - oy + y) * nums.w + (c.x - ox + x)]];
      rows.push({ x: c.x, y: c.y, w: c.w, h: c.h, hash: fnv(px, px.length) });
    }
    out[key] = { packed: !!src.__btFP, rows };
  }
  return out;
};

/* the worst hit: K frames the cache has not got, read the readers' way (readSourceRect: the frame's
   pixels put on a scratch canvas; then read back, as arrowPin's frameData and bakeChips do) */
/* the cache filled with other strips' frames first (a task of its own), so every pick is cold */
const FLUSH = ({ cellsByLabel, flushLabels }) => {
  let n = 0;
  for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
    const l = String(src.label || '').replace(/^.*\//, '').replace(/[?#].*$/, '');
    if (!src.__btFP || !flushLabels.includes(l)) continue;
    for (const c of cellsByLabel[l] || []) if (window.__btFramePackFrame(src, c.x, c.y, c.w, c.h, 'qa')) n++;
  }
  return n;
};
const WORST = ({ K, cellsByLabel, pickLabels }) => {
  const byLabel = new Map();
  for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
    if (!/fire-goblin/.test(String(src.label || '')) || src.destroyed) continue;
    byLabel.set(String(src.label).replace(/^.*\//, '').replace(/[?#].*$/, ''), src);
  }
  const picks = [];
  for (let round = 0; picks.length < K && round < 40; round++) {
    for (const l of pickLabels) {
      if (picks.length >= K) break;
      const src = byLabel.get(l), cells = cellsByLabel[l] || [];
      if (src && cells[round]) picks.push({ src, c: cells[round] });
    }
  }
  const before = window.__btFramePack ? window.__btFramePack() : null;
  const t0 = performance.now();
  let inflMs = 0, n = 0, waited = 0;
  for (const { src, c } of picks) {
    const cv = document.createElement('canvas'); cv.width = c.w; cv.height = c.h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    let nums = src._btNumbers, ox = 0, oy = 0;
    if (!nums && src.__btFP) { const ti = performance.now(); const f = window.__btFramePackFrame(src, c.x, c.y, c.w, c.h, 'pin'); inflMs += performance.now() - ti; if (f) { nums = f.nums; ox = f.x; oy = f.y; } else waited++; }
    if (!nums) continue;
    const id = new ImageData(c.w, c.h); const o32 = new Uint32Array(id.data.buffer);
    for (let y = 0; y < c.h; y++) { const row = (c.y - oy + y) * nums.w + (c.x - ox); for (let x = 0; x < c.w; x++) o32[y * c.w + x] = nums.pal[nums.idx[row + x]]; }
    g.putImageData(id, 0, 0);
    g.getImageData(0, 0, c.w, c.h);
    cv.width = 0; cv.height = 0;
    n++;
  }
  const ms = performance.now() - t0;
  const after = window.__btFramePack ? window.__btFramePack() : null;
  return { n, waited, ms: +ms.toFixed(2), inflMs: +inflMs.toFixed(2), misses: after && before ? after.misses - before.misses : null, deferred: after && before ? after.deferred - before.deferred : null, px: picks.reduce((a, p) => a + p.c.w * p.c.h, 0) };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const Q = process.env.BT_FP_QUERY || '';
  const mk = (name, query) => H.newPlayer(browser, { name, wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: query || undefined });
  const A = await H.newPlayer(browser, { name: 'fpon', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: Q || undefined, init: 'window.__btFramePackVerify = true;' });
  let B = null;
  const errs = { A: [], B: [] };
  A.page.on('pageerror', (e) => errs.A.push(String((e && e.message) || e).slice(0, 200)));
  let stop = false;
  try {
    for (const P of [A]) {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    }
    const meA = await H.readState(A, (S) => S.myId);
    for (const P of [A]) {
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'quests', me).catch(() => null);
      await P.page.evaluate(() => {
        const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
        keep(); window.__fpGateOpen = setInterval(keep, 100);
      });
    }
    (async () => { while (!stop) { await H.devOp(wsPort, 'vitals', meA, { heal: true, god: true, godMinutes: 8 }).catch(() => null); for (let i = 0; i < 4 && !stop; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
    (async () => { while (!stop) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 4 && !stop; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
    const armed = await H.armWorker(A, wsPort, meA, ['bow']).catch((e) => ['error: ' + (e && e.message)]);
    /* (B is made after A is armed: with a second phone in, the worker's kit
       answered "player not online" for A) */
    if (!armed.includes('bow')) console.log('    no bow:', JSON.stringify(await A.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return { stash: (R.weaponStash || []).map((w) => w && w.type), ranged: R.rangedWeapon && R.rangedWeapon.type, melee: R.meleeWeapon && R.meleeWeapon.type, active: window._gameState.current.activeSlot }; })));
    rec.ok(`A: a bow (guard: ${armed.join(', ') || 'none'})`, armed.includes('bow'));
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    B = await mk('fpoff', ['framepack=0', Q].filter(Boolean).join('&'));
    B.page.on('pageerror', (e) => errs.B.push(String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(B);
    await H.waitFor(B, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'B into the world' }).catch(() => null);
    {
      const meB = await H.readState(B, (S) => S.myId);
      await H.devOp(wsPort, 'quests', meB).catch(() => null);
      await B.page.evaluate(() => {
        const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
        keep(); window.__fpGateOpen = setInterval(keep, 100);
      });
    }
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    const glides = await Promise.all([A, B].map((P) => H.glideTo(P, at[0], at[1] + 40).catch((e) => 'failed: ' + e.message)));
    console.log('    glides:', JSON.stringify(glides));
    for (const P of [A, B]) {
      const t0 = Date.now();
      while (Date.now() - t0 < 60000) {
        const a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
        if (a && a.ready > 0 && a.loading === 0) break;
        await P.page.waitForTimeout(500);
      }
    }
    /* A packs what it has drawn */
    const packed = await H.waitFor(A, () => window.__btFramePack ? window.__btFramePack() : null, (v) => v && v.packedNow >= 4, { timeout: 90000, label: 'A packed' }).catch(() => null);
    await A.page.waitForTimeout(3000);
    const st1 = await A.page.evaluate(() => window.__btFramePack());
    console.log('    A pack:', JSON.stringify(st1));
    const offSt = await B.page.evaluate(() => (window.__btFramePack ? window.__btFramePack() : null));
    rec.ok(`A: the goblins' strips drawn are packed (${st1.packedNow} strips, ${st1.packedMB} MB of numbers as ${st1.heldKB} KB; ${st1.waiting} not drawn yet keep theirs; ${st1.declined} declined, ${st1.failed} failed)`, !!packed && st1.packedNow > 0 && st1.failed === 0 && st1.declined === 0, st1);
    rec.ok(`B (?framepack=0): nothing packed`, !!offSt && offSt.on === false && offSt.packedNow === 0, offSt);
    /* 1. the same frames: every frame of every packed strip, as a reader gets it, against the numbers it was */
    const v1 = await A.page.evaluate(() => {
      let same = 0, diff = [], strips = 0;
      for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
        if (!src.__btFP || !src.__btFPOrig || src.destroyed) continue;
        strips++;
        const O = src.__btFPOrig, st = src.__btFP.st;
        for (const c of src.__btFP.cells) {
          const f = window.__btFramePackFrame(src, c.x, c.y, c.w, c.h, 'qa');
          let ok = !!f;
          for (let y = 0; ok && y < c.h; y++) for (let x = 0; x < c.w; x++) if (f.nums.idx[y * c.w + x] !== O[(c.y + y) * st + c.x + x]) { ok = false; break; }
          if (ok) same++; else diff.push(String(src.label).replace(/^.*\//, '') + '@' + c.x);
        }
        const whole = window.__btStripNumbers(src);
        let wok = !!whole && whole.idx.length === O.length;
        for (let i = 0; wok && i < O.length; i++) if (whole.idx[i] !== O[i]) wok = false;
        if (!wok) diff.push(String(src.label).replace(/^.*\//, '') + ' whole');
      }
      return { same, diff, strips };
    });
    console.log(`    frames: ${v1.same} the same, ${v1.diff.length} differ, over ${v1.strips} packed strips`);
    rec.ok(`1. every frame a reader gets from a packed strip is the numbers it was, byte for byte, and the whole strip too (${v1.same} frames, ${v1.strips} strips)`, v1.same > 0 && v1.diff.length === 0, v1.diff.slice(0, 10));
    const hA = await A.page.evaluate(HASHES, null);
    const cellsByLabel = {};
    for (const [k, v] of Object.entries(hA)) cellsByLabel[k] = v.rows.map(({ x, y, w, h }) => ({ x, y, w, h }));
    const wantB = Object.keys(cellsByLabel).length;
    await H.waitFor(B, () => (window.__btPicNumSources ? window.__btPicNumSources() : []).filter((s) => /fire-goblin/.test(String(s.label || '')) && !s.destroyed).length, (n) => n >= wantB, { timeout: 90000, label: 'B has the goblins\' strips' }).catch(() => null);
    const hB = await B.page.evaluate(HASHES, cellsByLabel);
    let same = 0, diff = [], missing = [];
    for (const [k, v] of Object.entries(hA)) {
      const b = hB[k];
      if (!b) { missing.push(k); continue; }
      v.rows.forEach((r, i) => { if (r.hash !== null && b.rows[i] && r.hash === b.rows[i].hash) same++; else diff.push(`${k}@${r.x},${r.y}`); });
    }
    console.log(`    against B (?framepack=0): ${same} frames the same colours, ${diff.length} differ; strips B has not: ${missing.join(' ')}`);
    /* 2. the worst hit */
    const packedLabels = Object.entries(hA).filter(([, v]) => v.packed).map(([k]) => k);
    const flushLabels = packedLabels.slice(-2), pickLabels = packedLabels.slice(0, Math.max(1, packedLabels.length - 2));
    console.log('    packed strips:', packedLabels.join(' '), '| flush with', flushLabels.join(' '));
    const THR = Number(process.env.BT_FP_THROTTLE || 4);
    const cdpA = await A.ctx.newCDPSession(A.page), cdpB = await B.ctx.newCDPSession(B.page);
    for (const thr of [1, THR]) {
      await cdpA.send('Emulation.setCPUThrottlingRate', { rate: thr }); await cdpB.send('Emulation.setCPUThrottlingRate', { rate: thr });
      for (const K of [2, 4, 8]) {
        await A.page.evaluate(FLUSH, { cellsByLabel, flushLabels });
        await A.page.waitForTimeout(100);
        const wa = await A.page.evaluate(WORST, { K, cellsByLabel, pickLabels });
        await A.page.waitForTimeout(300);
        const after = await A.page.evaluate(() => window.__btFramePack());
        const wb = await B.page.evaluate(WORST, { K, cellsByLabel, pickLabels });
        console.log(`    worst hit at ${thr}x, ${K} arrows on cold frames: A ${wa.ms} ms (unpacking ${wa.inflMs} ms: ${wa.misses} at once, ${wa.deferred} to the next task; warmed since ${after.warmed}), B ${wb.ms} ms (${wb.n} frames)`);
        rec.ok(`2. ${thr}x, ${K} arrows on cold frames: unpacking ${wa.inflMs} ms in the task (budget ${UNPACK_MS} ms and one frame), ${wa.deferred} put off`, wa.n + wa.waited === K && wa.misses + wa.deferred === K, { wa, wb });
      }
      const t = await A.page.evaluate(() => window.__btFramePack());
      console.log(`    at ${thr}x: the most a task unpacked so far ${t.taskMsMax} ms; one frame at most ${t.readMsMax} ms; ${t.misses} unpacked in ${t.readMsSum} ms`);
    }
    await cdpA.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdpB.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    /* 3. arrows into them */
    const r0 = await A.page.evaluate(() => ({ held: window.__btHeld ? window.__btHeld() : null, fp: window.__btFramePack() }));
    await A.page.keyboard.press('Digit2');
    await A.page.waitForTimeout(500);
    const shots = await fight(A, 20000);
    const r1 = await A.page.evaluate(() => ({ held: window.__btHeld ? window.__btHeld() : null, fp: window.__btFramePack() }));
    const chips = await A.page.evaluate(() => {
      const S = window._gameState.current;
      const out = [];
      for (const m of S.monsters || []) {
        if (!m || m.alive === false || m.dead) continue;
        const r = window.__btHitFxChips ? window.__btHitFxChips(m.id, 'bone') : null;
        if (r) out.push(r.chips);
      }
      return out;
    });
    const r2 = await A.page.evaluate(() => ({ held: window.__btHeld ? window.__btHeld() : null, fp: window.__btFramePack() }));
    console.log('    arrows:', shots, 'rounds; reads by:', JSON.stringify(r2.held && r2.held.readsBy), 'pack:', JSON.stringify(r2.fp), 'chips:', JSON.stringify(chips));
    const pinReads = ((r1.held && r1.held.readsBy && r1.held.readsBy.pin) || 0) - ((r0.held && r0.held.readsBy && r0.held.readsBy.pin) || 0);
    rec.ok(`3. arrows into the goblins (guard: ${shots} rounds seen fired, ${pinReads} stuck arrows read their frames)`, shots > 0 || pinReads > 0);
    rec.ok(`3. the stuck arrows read packed frames (${pinReads} pin reads; ${r1.fp.reads - r0.fp.reads} frame reads, ${r1.fp.misses - r0.fp.misses} unpacked)`, pinReads > 0 && r1.fp.reads > r0.fp.reads, { r0, r1 });
    rec.ok(`3. a hit's chips cut from a packed frame (${chips.filter((n) => n > 0).length} goblins gave chips)`, chips.some((n) => n > 0), chips);
    rec.ok(`3. no frame failed to unpack (${r2.fp.failed}), the cache within its cap (${r2.fp.cache.frames} frames, ${r2.fp.cache.kb} KB)`, r2.fp.failed === 0 && r2.fp.cache.frames <= r2.fp.cache.capFrames && r2.fp.cache.kb <= r2.fp.cache.capKB, r2.fp);
    /* 4. a black screen's rebuild */
    const u0 = r2.fp.unpacked;
    await A.page.evaluate(() => { window.__fpOldApp = window._pixiRenderer && window._pixiRenderer.app; if (window._rebuildRenderer) window._rebuildRenderer('qa: frame pack'); });
    const fresh = await H.waitFor(A, () => { const a = window._pixiRenderer && window._pixiRenderer.app; return { fresh: !!a && a !== window.__fpOldApp && !!a.renderer }; }, (v) => v.fresh, { timeout: 30000, label: 'a new renderer' }).catch(() => null);
    await H.waitFor(A, () => window.__btFramePack(), (v) => v.packedNow > 0, { timeout: 60000, label: 'packed again' }).catch(() => null);
    const r3 = await A.page.evaluate(() => {
      const app = window._pixiRenderer.app, R = app.renderer;
      const found = [];
      const walk = (c) => { if (!c || c.destroyed || !c.visible) return; const s = c.texture && c.texture.source; if (s && !s.destroyed && /fire-goblin/.test(String(s.label || '')) && c.alpha > 0.5) found.push(c); for (const k of c.children || []) walk(k); };
      walk(app.stage);
      const res = [];
      const Sprite = found.length ? found[0].constructor : null;
      for (const spr of found.slice(0, 8)) {
        let opaque = -1;
        try { const p = new Sprite(spr.texture); const px = R.extract.pixels({ target: p, resolution: 1 }); opaque = 0; for (let i = 3; i < px.pixels.length; i += 4) if (px.pixels[i] > 128) opaque++; p.destroy(); } catch (e) { opaque = -2; }
        res.push({ opaque, packed: !!spr.texture.source.__btFP });
      }
      return { fp: window.__btFramePack(), res };
    });
    console.log('    after the rebuild:', JSON.stringify(r3));
    rec.ok('4. a black screen\'s rebuild: a new renderer (guard)', !!fresh);
    rec.ok(`4. ...every strip unpacked for it (${r3.fp.unpacked - u0}) and packed again (${r3.fp.packedNow} now)`, r3.fp.unpacked > u0 && r3.fp.packedNow > 0, r3.fp);
    rec.ok(`4. ...and every goblin drawn whole from the new chip (${r3.res.map((r) => r.opaque).join(' ')} solid pixels)`, r3.res.length > 0 && r3.res.every((r) => r.opaque > 200), r3.res);
    rec.ok('no page errors (A)', errs.A.length === 0, errs.A.slice(0, 5));
    rec.ok('no page errors (B)', errs.B.length === 0, errs.B.slice(0, 5));
  } finally {
    stop = true;
    await A.ctx.close().catch(() => {});
    if (B) await B.ctx.close().catch(() => {});
  }
}
