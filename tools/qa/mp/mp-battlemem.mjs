/* ═══ WHAT AN INTENSE BATTLE HOLDS, ROUND AFTER ROUND (v2.3.3698) ═══
 *
 * The owner, 2026-10-28: "The game definitely crashed because it ran out of
 * memory for me during intense battles (lots of weapon switching, props
 * destroyed, etc.) I want to try to cut the current memory draw to a quarter
 * of what it is now."  mp-membudget fights for ten seconds with the sword
 * alone; this fights the way the owner did.
 *
 * A phone (390 x 844, dpr 3) at the Flame Fields' inner end (mp-membudget's
 * fight), the worker's own sword, bow and staff in hand (H.armWorker, the
 * dev kit's greatsword), god mode armed again every 2 s.  CYCLES rounds of:
 *   - the sword (the 1 key, the game's own swap), its auto attack on the
 *     nearest monster for WEAPON_MS, and its special;
 *   - the bow (2): the same, aimed as a thumb would;
 *   - the staff (3): the same;
 *   - every prop within BLAST_R of you broken (__btWheelBreak.blast: a
 *     slime's blast, which breaks trees and rocks and sets buildings
 *     smouldering);
 * and after each round what the page holds, read with mp-membudget's ruler
 * (memprobe.mjs, after forced GCs): the art loaded from files, the GPU's
 * textures (as they are, and as Pixi's collector leaves them a minute later),
 * the canvases the game draws, decoded sound, the heap and its buffers; and
 * how many things the scene holds (__btSceneCensus), what the hit effects'
 * pools keep, and the GPU's biggest textures at the end.
 *
 * The first round also turns all the way round with each weapon (turnRound),
 * as a fight that moves about does, so every facing's body is drawn.
 *
 * It asserts the rounds settle: the last round ends within ROUND_GROWTH of
 * the second (the first fills the caches a fight fills; the GPU's pictures
 * made before round 2 and first drawn since are left out, mp-membudget's
 * rule), and no page error.
 * The numbers are for finding what a battle holds; the budget's lines are
 * mp-membudget's.
 *
 *   node tools/qa/mp/run.mjs battlemem
 *   BT_BATTLE_CYCLES=n     rounds (6)
 *   BT_BATTLE_MS=ms        each weapon's fight (5000)
 *   BT_BATTLE_QUERY=x      a URL switch on the page
 * Results: tools/qa/mp/out/battlemem.json.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
const CYCLES = +(process.env.BT_BATTLE_CYCLES || 6);
const WEAPON_MS = +(process.env.BT_BATTLE_MS || 5000);
const BLAST_R = 420;
const LOOKS_MS = 45000;
/* MB the last round may end above the second, per kind (mp-membudget's
   TRIP_GROWTH: a reading's own noise) */
const ROUND_GROWTH = { cache: 3, gpuSettled: 4, canvasMB: 3, decodedMB: 1, heapMB: 3, buffersMB: 3 };
const WEAPONS = [['Digit1', 'melee', 'sword'], ['Digit2', 'ranged', 'bow'], ['Digit3', 'staff', 'staff']];

/* the GPU a minute later, as Pixi's collector would leave it (mp-membudget) */
const settledGpu = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!R || !R.texture || !R.gc || !R.gc.run || !window.__btGpuTex) return null;
  const now = R.gc.now != null ? R.gc.now : performance.now();
  for (const src of R.texture.managedTextures || []) {
    if (src && !src.destroyed && src._gcLastUsed >= 0 && now - src._gcLastUsed > 2000) src._gcLastUsed = now - 61000;
  }
  R.gc.run();
  const g = window.__btGpuTex(100000);
  if (!g || typeof g.mb !== 'number') return null;
  return { mb: g.mb, uidNow: typeof g.uidNow === 'number' ? g.uidNow : null,
    held: (g.list || []).filter((r) => typeof r.uid === 'number').map((r) => [r.uid, r.mb]) };
});
/* v2.3.3698: of what the GPU held at `b` and not at `a`, the MB of pictures
   made before `a` was read -- drawn for the first time since (mp-membudget's
   firstDrawsMB, v2.3.3310): a facing first swung in, a monster's death first
   played, is no growth of the battle's */
const firstDrawsMB = (a, b) => {
  if (!a || !b || typeof a.uidNow !== 'number' || !Array.isArray(a.held) || !Array.isArray(b.held)) return null;
  const before = new Set(a.held.map(([u]) => u));
  let mb = 0;
  for (const [u, m] of b.held) if (u < a.uidNow && !before.has(u)) mb += m;
  return +mb.toFixed(1);
};

/* the nearest live monster, and where you are */
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

/* one weapon's fight: its auto attack on, the aim kept on the nearest
   monster (as a thumb on the stick keeps it), walking in when it is out of
   reach; then its special.  Returns what it fired. */
async function fightWith(P, slot, ms) {
  const reach = slot === 'melee' ? 70 : 420;
  const t0 = Date.now();
  let fired = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 1200) { await P.page.waitForTimeout(300); continue; }
    if (s.m.d > reach) {
      await P.page.evaluate(() => { window._gameState.current.autoAttack = false; });
      await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.1));
      continue;
    }
    fired += await P.page.evaluate(({ id, slot }) => new Promise((resolve) => {
      const S = window._gameState.current;
      const n0 = (S.arrows || []).length, sw0 = S.swingTimer || 0;
      const aim = () => {
        const m = (S.monsters || []).find((x) => x.id === id);
        if (!m || !S.player) return;
        const b = slot === 'ranged' ? S._bowSight : null;
        const ox = b && typeof b.ox === 'number' ? b.ox : S.player.x;
        const oy = b && typeof b.oy === 'number' ? b.oy : S.player.y;
        const ang = Math.atan2((typeof m.renderY === 'number' ? m.renderY : m.y) - 30 - oy, (typeof m.renderX === 'number' ? m.renderX : m.x) - ox);
        S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = slot !== 'melee';
        S._facingAngle = ang; S._targetFacingAngle = ang;
      };
      aim();
      S.autoAttack = true;
      const iv = setInterval(aim, 60);
      setTimeout(() => {
        clearInterval(iv);
        resolve(((S.arrows || []).length > n0 || (S.swingTimer || 0) > sw0) ? 1 : 0);
      }, 900);
    }), { id: s.m.id, slot });
  }
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
  const special = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    try { if (F.specialAttack) { F.specialAttack(); return true; } } catch (e) { /* no special now */ }
    return false;
  });
  await P.page.waitForTimeout(700);
  return { fired, special };
}

/* v2.3.3698: a fight turns: the weapon used toward each of the eight
   facings in turn (a thumb on the stick sweeping round), so its body is drawn
   in every facing, as a battle that moves about draws it.  Returns how many
   facings it fired in. */
async function turnRound(P, slot) {
  let fired = 0;
  for (let k = 0; k < 8; k++) {
    fired += await P.page.evaluate(({ ang, slot }) => new Promise((resolve) => {
      const S = window._gameState.current;
      const n0 = (S.arrows || []).length, sw0 = S.swingTimer || 0;
      const aim = () => {
        S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = slot !== 'melee';
        S._facingAngle = ang; S._targetFacingAngle = ang;
      };
      aim();
      S.autoAttack = true;
      const iv = setInterval(aim, 60);
      setTimeout(() => {
        clearInterval(iv);
        S.autoAttack = false;
        resolve(((S.arrows || []).length > n0 || (S.swingTimer || 0) > sw0) ? 1 : 0);
      }, 900);
    }), { ang: k * Math.PI / 4, slot });
  }
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
  return fired;
}

/* BT_BATTLE_CENSUS=1 (with QA_DIST=dist-prof, an unminified build): which
   code made each canvas -- the page's own and the GPU's canvas textures --
   by the stack at its making (mp-tabwipe's QA_TW_CENSUS, for every canvas) */
const CENSUS_INIT = () => {
  const made = new WeakMap();
  const all = [];
  window.__btCanvasMaker = made;
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag, o) {
    const el = ce.call(this, tag, o);
    if (String(tag).toLowerCase() === 'canvas') {
      const st = String(new Error().stack || '').split('\n').slice(2, 9).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, '')).join(' < ');
      made.set(el, st);
      try { all.push(new WeakRef(el)); } catch (e) { /* no WeakRef */ }
    }
    return el;
  };
  window.__btCanvasCensus = (depth) => {
    const key = (st) => String(st || '(unknown)').split(' < ').slice(0, depth || 4).join(' < ');
    const page = Object.create(null);
    for (const r of all) {
      const el = r.deref();
      if (!el || !(el.width > 0) || !(el.height > 0)) continue;
      const mb = el.width * el.height * 4 / 1048576;
      if (mb < 0.01) continue;
      const k = key(made.get(el));
      page[k] = page[k] || { n: 0, mb: 0 };
      page[k].n++; page[k].mb += mb;
    }
    const gpu = Object.create(null);
    try {
      const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
      for (const s of (R && R.texture && R.texture.managedTextures) || []) {
        if (!s || s.destroyed || !s.resource || typeof s.resource.getContext !== 'function') continue;
        const mb = (s.pixelWidth || 0) * (s.pixelHeight || 0) * 4 / 1048576;
        const k = key(made.get(s.resource));
        gpu[k] = gpu[k] || { n: 0, mb: 0 };
        gpu[k].n++; gpu[k].mb += mb;
      }
    } catch (e) { /* the renderer moved: the page's count stands */ }
    const top = (o) => Object.entries(o).sort((a, b) => b[1].mb - a[1].mb).slice(0, 25).map(([k, v]) => [+v.mb.toFixed(2), v.n, k]);
    return { page: top(page), gpu: top(gpu) };
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const QUERY = process.env.BT_BATTLE_QUERY || '';
  const CENSUS = !!process.env.BT_BATTLE_CENSUS;
  const init = CENSUS ? `(${MEM_INIT.toString()})(); (${CENSUS_INIT.toString()})();` : MEM_INIT;
  const P = await H.newPlayer(browser, { name: 'battlemem', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init, query: QUERY || undefined });
  const out = { query: QUERY, rounds: [] };
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok(`in the world${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, and untouchable through any rejoin (mp-membudget) */
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__bmGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stopAlive) {
        await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    /* the three weapons, the worker's own */
    const armed = await H.armWorker(P, wsPort, me, ['bow', 'staff']).catch(() => []);
    /* the kit's greatsword into the melee slot, as armWorker does the others:
       the slot cleared on the page, the worker's equip asked, and waited for */
    const swordHeld = () => H.readState(P, (S) => !!(S.rpg.weapon && S.rpg.weapon.type === 'greatsword'));
    for (let t = 0; t < 3 && !(await swordHeld()); t++) {
      await P.page.evaluate(() => { const R = window._gameState.current.rpg; if (R && !(R.weapon && R.weapon.type === 'greatsword')) R.weapon = null; });
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      for (let i = 0; i < 40 && !(await swordHeld()); i++) await P.page.waitForTimeout(250);
    }
    if (await swordHeld()) armed.push('greatsword');
    await P.page.waitForTimeout(800);
    const held = await H.readState(P, (S) => ({ melee: !!(S.rpg.weapon), ranged: !!(S.rpg.rangedWeapon), staff: !!(S.rpg.staffWeapon) }));
    rec.ok(`the sword, the bow and the staff in hand, the worker's (guard: ${JSON.stringify(held)}; armed ${armed.join(', ')})`,
      held.melee && held.ranged && held.staff, held);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    const { sample } = await memSampler(P, browser);
    const take = async (label) => {
      const s = await sample(label);
      const sg = await settledGpu(P);
      s.gpuSettled = sg ? sg.mb : null;
      s.gpuSettledAt = sg;   /* its uids, for firstDrawsMB */
      s.scene = await P.page.evaluate(() => {
        let census = null;
        try {
          const c = window.__btSceneCensus ? window.__btSceneCensus(3) : null;
          if (c) census = { total: c.total, visible: c.visible, top: Object.entries(c.byPath).sort((a, b) => b[1] - a[1]).slice(0, 15) };
        } catch (e) { census = String(e); }
        const brk = window.__btWheelBreak ? { broken: window.__btWheelBreak.broken().length, stats: { ...window.__btWheelBreak.stats } } : null;
        /* every texture on the GPU, compact: the rounds are diffed by uid
           (the order each picture was made in) to name what piles up */
        let gpuAll = null;
        try {
          const g = window.__btGpuTex ? window.__btGpuTex(5000) : null;
          gpuAll = g && g.list ? g.list.map((r) => [r.uid, r.kind, r.w, r.h, r.mb, r.label, r.idleS]) : null;
        } catch (e) { gpuAll = String(e); }
        return { census, brk, gpuAll };
      });
      if (CENSUS) s.census = await P.page.evaluate(() => (window.__btCanvasCensus ? window.__btCanvasCensus(4) : null)).catch(() => null);
      out.rounds.push(s);
      console.log(`    ${label}: cache ${s.cache}, GPU ${s.gpu} (settled ${s.gpuSettled}), canvases ${s.canvasMB} (${s.canvasN}), sound ${s.decodedMB}, heap ${s.heapMB}, buffers ${s.buffersMB}; scene ${s.scene.census && s.scene.census.total} nodes`);
      return s;
    };
    await take('BroTown, on arrival');

    /* to the fight */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    await H.glideTo(P, at[0], at[1] + 40);
    await (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < LOOKS_MS) {
        const a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
        if (!a || (a.ready > 0 && a.loading === 0)) return;
        await P.page.waitForTimeout(500);
      }
    })();
    const there = await near(P);
    rec.ok(`at the Flame Fields' fight (guard: the nearest monster ${there && there.m ? Math.round(there.m.d) : '-'} px off)`, !!(there && there.m && there.m.d < 1200), there);
    if (!there || !there.m) return;
    await take('at the fight, before it');

    for (let c = 1; c <= CYCLES; c++) {
      const did = [];
      for (const [key, slot, name] of WEAPONS) {
        await P.page.keyboard.press(key);
        await P.page.waitForTimeout(400);
        const now = await H.readState(P, (S) => S.rpg.activeSlot);
        const f = await fightWith(P, slot, WEAPON_MS);
        /* the first round turns all the way round with each weapon */
        const turned = c === 1 ? await turnRound(P, slot) : null;
        did.push(`${name}${now === slot ? '' : ` (held ${now})`} ${f.fired} fired${f.special ? ' + special' : ''}${turned != null ? `, ${turned}/8 facings` : ''}`);
      }
      const blast = await P.page.evaluate((r) => {
        const S = window._gameState.current;
        return window.__btWheelBreak && window.__btWheelBreak.blast ? window.__btWheelBreak.blast(S.player.x, S.player.y, r) : null;
      }, BLAST_R);
      await P.page.waitForTimeout(1500);
      /* v2.3.3698: a broken prop's pieces are drawn from the chip's copy, the
         heap's canvas emptied (wheelShatter.js) */
      if (blast && blast.broke > 0 && !out.shardDraw) {
        out.shardDraw = await P.page.evaluate(() => (window.__btWheelObjects && window.__btWheelObjects.shardDraw ? window.__btWheelObjects.shardDraw() : null));
        rec.ok(`a broken prop's pieces draw from the graphics chip, their canvas emptied (${JSON.stringify(out.shardDraw)})`,
          !!out.shardDraw && out.shardDraw.solid > 20 && !!out.shardDraw.canvas && out.shardDraw.canvas[0] === 0 && out.shardDraw.gpuOnly >= 1, out.shardDraw);
      }
      /* v2.3.3698: the sword's and the bow's bodies drawn in the round have
         let go of their canvases (gpuOnly.js emptyOnceDrawn); `?gpucopies`
         keeps them all */
      const bodies = await P.page.evaluate(() => {
        const b = window.__btFxBakes ? window.__btFxBakes() : null;
        if (b && window.__btGpuOnly) b.letGo = window.__btGpuOnly().onceDrawn;   /* the MB given back so far */
        return b;
      });
      if (c === 1) {
        out.bodies = bodies;
        const keep = /gpucopies/.test(QUERY);
        rec.ok(`the weapon bodies drawn in the fight hold no page copy (${JSON.stringify(bodies)})`,
          !!bodies && (keep ? bodies.onChip === 0 : bodies.onChip >= 3 && bodies.deadInUse === 0), bodies);
      }
      const s = await take(`round ${c}: ${did.join(', ')}; ${blast ? `${blast.broke} props broken of ${blast.found}` : 'no blast hook'}; bodies ${bodies ? `${bodies.onChip} on the chip only, ${bodies.kept} kept (${bodies.keptMb} MB)` : '-'}`);
      s.did = did;
      s.blast = blast;
      s.bodies = bodies;
    }

    /* the biggest textures and canvases at the end */
    out.end = await P.page.evaluate(() => ({
      gpuTop: window.__btGpuTex ? (window.__btGpuTex(40).list || []).slice(0, 40) : null,
    }));
    /* the canvases by size, as the last round's sample read them (memprobe) */
    out.end.canvases = (out.rounds[out.rounds.length - 1] || {}).canvasTop || null;
    /* BT_BATTLE_CENSUS: every picture once, what it holds on the page and on
       the GPU, grouped by where it came from (a file's folder, or the code
       that made its canvas) -- the overlap between the counters taken out */
    if (CENSUS) {
      out.truth = await P.page.evaluate(() => {
        const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
        const made = window.__btCanvasMaker;
        const seen = new Set();
        const groups = Object.create(null);
        let pageAll = 0, gpuAll = 0;
        const add = (key, page, gpu) => {
          const g = groups[key] || (groups[key] = { n: 0, page: 0, gpu: 0 });
          g.n++; g.page += page; g.gpu += gpu; pageAll += page; gpuAll += gpu;
        };
        const res = new Set();
        const consider = (src) => {
          if (!src || src.destroyed || seen.has(src)) return;
          seen.add(src);
          const r = src.resource;
          const w = src.pixelWidth || 0, h = src.pixelHeight || 0;
          const onGpu = !!(R && src._gpuData && src._gpuData[R.uid]);
          const bpp = src.format === 'r8unorm' ? 1 : 4;
          const gpu = onGpu ? w * h * bpp / 1048576 : 0;
          let page = 0, key = 'other';
          if (r && typeof r.getContext === 'function') {
            res.add(r);
            page = (r.width || 0) * (r.height || 0) * 4 / 1048576;
            key = 'canvas: ' + String((made && made.get(r)) || '(unknown)').split(' < ').slice(0, 3).join(' < ');
          } else if (r && (r instanceof HTMLImageElement || (typeof ImageBitmap !== 'undefined' && r instanceof ImageBitmap))) {
            page = (r.naturalWidth || r.width || 0) * (r.naturalHeight || r.height || 0) * 4 / 1048576;
            key = 'file: ' + String(src.label || (r.src || '')).replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('/').slice(0, 4).join('/');
          } else if (r && ArrayBuffer.isView(r)) {
            page = r.byteLength / 1048576;
            key = 'buffer: ' + String(src.label || '').split('/').slice(0, 3).join('/');
          } else if (!r) {
            key = 'gpu-only: ' + (src.uploadMethodId || 'render') + ' ' + String(src.label || '').slice(0, 40);
          }
          add(key, page, gpu);
        };
        try { for (const s of (R && R.texture && R.texture.managedTextures) || []) consider(s); } catch (e) { /* none */ }
        try {
          const map = window.__btGpuTexSources ? window.__btGpuTexSources() : [];
          for (const s of map) consider(s);
        } catch (e) { /* none */ }
        const top = Object.entries(groups).map(([k, v]) => [+(v.page + v.gpu).toFixed(2), +v.page.toFixed(2), +v.gpu.toFixed(2), v.n, k]).sort((a, b) => b[0] - a[0]).slice(0, 40);
        return { pageMB: +pageAll.toFixed(1), gpuMB: +gpuAll.toFixed(1), top };
      }).catch((e) => ({ err: String(e) }));
      console.log(`    every picture once: page ${out.truth.pageMB} MB + GPU ${out.truth.gpuMB} MB`);
      for (const row of (out.truth.top || []).slice(0, 30)) console.log(`      ${row[0]} MB (page ${row[1]}, GPU ${row[2]}) x${row[3]}  ${String(row[4]).slice(0, 170)}`);
    }
    console.log(`    the GPU's biggest at the end: ${JSON.stringify((out.end.gpuTop || []).slice(0, 15))}`);
    console.log(`    canvases by size at the end: ${JSON.stringify(out.end.canvases)}`);

    /* the rounds settle */
    const rounds = out.rounds.filter((r) => /^round /.test(r.label));
    if (rounds.length >= 3) {
      const a = rounds[1], b = rounds[rounds.length - 1];
      /* v2.3.3698: the GPU's growth less what was first drawn since (mp-membudget's rule) */
      const first = firstDrawsMB(a.gpuSettledAt, b.gpuSettledAt) || 0;
      const grew = Object.entries(ROUND_GROWTH).map(([k, lim]) => [k, +((b[k] || 0) - (a[k] || 0) - (k === 'gpuSettled' ? first : 0)).toFixed(1), lim]);
      if (first) console.log(`    the GPU's growth from round 2 leaves out ${first} MB of pictures made before it and first drawn since`);
      const over = grew.filter(([, d, lim]) => d > lim);
      rec.ok(`the rounds settle: round ${rounds.length} ends within each line of round 2 (${grew.map(([k, d, lim]) => `${k} ${d >= 0 ? '+' : ''}${d}/${lim}`).join(', ')})`,
        over.length === 0, { grew, a: a.label, b: b.label });
    }
    /* what the GPU gained from round 2 to the last round, by uid */
    if (rounds.length >= 3 && Array.isArray(rounds[1].scene.gpuAll) && Array.isArray(rounds[rounds.length - 1].scene.gpuAll)) {
      const had = new Set(rounds[1].scene.gpuAll.map((r) => r[0]));
      const gained = rounds[rounds.length - 1].scene.gpuAll.filter((r) => !had.has(r[0]));
      const byKey = {};
      for (const r of gained) {
        const k = `${r[1]} ${r[2]}x${r[3]} ${r[5] || '(no label)'}`;
        if (!byKey[k]) byKey[k] = { n: 0, mb: 0 };
        byKey[k].n++; byKey[k].mb += r[4];
      }
      out.gained = Object.entries(byKey).sort((a, b) => b[1].mb - a[1].mb).map(([k, v]) => [k, v.n, +v.mb.toFixed(2)]);
      const lost = rounds[1].scene.gpuAll.filter((r) => !new Set(rounds[rounds.length - 1].scene.gpuAll.map((q) => q[0])).has(r[0]));
      console.log(`    the GPU from round 2 to the last: ${gained.length} textures new (${gained.reduce((a, r) => a + r[4], 0).toFixed(1)} MB), ${lost.length} gone (${lost.reduce((a, r) => a + r[4], 0).toFixed(1)} MB)`);
      console.log(`    new, by kind and size: ${JSON.stringify(out.gained.slice(0, 30))}`);
    }
    const peak = (k) => Math.max(...out.rounds.map((r) => r[k] || 0));
    rec.ok(`the peaks over the battle: cache ${peak('cache')}, GPU ${peak('gpu')}, canvases ${peak('canvasMB')}, sound ${peak('decodedMB')}, heap ${peak('heapMB')}, buffers ${peak('buffersMB')} MB (a reading)`, true);
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'battlemem.json'), JSON.stringify(out, null, 2));
    await P.ctx.close().catch(() => {});
  }
}
