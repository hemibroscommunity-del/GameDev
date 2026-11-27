/* ═══ v2.3.6209: A DYING MONSTER'S SHADOW SITS UNDER ITS FEET (card EN) ═══
 *
 * The owner, 2026-11-27, playing the world on an iPhone: "The skeletons shadow
 * during death animation (of mummy - skeleton is second phase) is far too low".
 * A monster's shadow hung from the bottom of its frame's 256 px cell (less its
 * look's at-rest `feetRow`); a death strip is cut at its own scale and place, and
 * the skeleton's first frames end on row 126 -- its shadow lay ~110 px under it.
 * The mend (src/game/frameFoot.js): a dying body's shadow hangs from that
 * frame's own lowest painted row.
 *
 * One phone (375 x 667 upright, the owner's) in the world's BroTown; the worker's
 * monsters set aside for the while and the page's own put beside you (as
 * mp-waterfrog does).  The light's own list of casters says where each shadow
 * hangs (window.__btLightFx.probe: py); the monster's sprite says where its cell's
 * anchor is drawn and how big a row is (window.__btMonsterSprite); the frame's
 * painted bottom is read HERE from the served file, not from the page:
 *   1. a mummy is drawn, and the worker's transform (monster_transform, the
 *      owner's first hit) makes it the skeleton: its run strips drawn;
 *   2. while it walks -- a mummy, the shred, the skeleton running east and west
 *      -- its shadow hangs where it always did (the look's rule: the cell's
 *      bottom less its `feetRow`), to a pixel: the mend moves no living frame;
 *   3. killed (the strip's death, `normal`), at EVERY frame of the death the
 *      shadow hangs from that frame's painted feet, within 2 px -- the first
 *      frame, the last, and every one between; killed facing east and facing
 *      west (the mirror);
 *   4. THE SAMPLE (card EN step 3; the owner's rule of 2026-10-28, a sample now
 *      and the full audit as the other choice): one of every other look family
 *      with a death strip -- the water frog, the rock golem (the thorn shambler
 *      is its art in green), the storm eye, the fire goblin, the rotcap (the
 *      mire wisp's key), the slime, the snowman -- alive and dying, the same two
 *      rules; the list of any off by more than 2 px is printed;
 *   5. pictures for the owner: the skeleton's death, frame by frame, in
 *      tools/qa/mp/out/deathshadow/ (docs/shots/skeleton-death-shadow-*.webp are
 *      made from them);
 *   6. no page error.
 *
 *   node tools/qa/mp/run.mjs deathshadow           (DS_SAMPLE=0: the skeleton only)
 */
import * as H from './harness.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { MONSTER_VARIANTS } from '../../../src/data/monsterVariants.js';
import { decodePng8 } from '../../../src/rendering/png8Decode.js';
export const lane = 'full';

const PHONE = { width: 375, height: 667 };
/* the most frames of a death's strip one drawn frame may skip (the renderer's own) */
const BURST_MAX_SKIP = Number((/const BURST_MAX_SKIP = (\d+);/.exec(readFileSync(join(H.REPO, 'src/rendering/systems/entityRenderer.js'), 'utf8')) || [])[1]) || 2;
const OUT = `${H.REPO}/tools/qa/mp/out/deathshadow`;
const TOL = 2;   /* px on the phone's page: "off by more than a few pixels" is the card's line */

/* each frame's painted bottom (the row under its lowest pixel whose alpha is not 0), from the served file */
async function footsOf(rel, fh) {
  const dec = await decodePng8(new Uint8Array(readFileSync(join(H.REPO, 'public', rel))), async (z) => inflateSync(z), 1);
  if (!dec) throw new Error('not a palette PNG: ' + rel);
  const n = Math.floor(dec.w / fh), out = [];
  for (let i = 0; i < n; i++) {
    let by = 0;
    for (let y = fh - 1; y >= 0 && !by; y--) {
      const row = y * dec.stride + i * fh;
      for (let x = 0; x < fh; x++) if (dec.alpha[dec.idx[row + x]] !== 0) { by = y + 1; break; }
    }
    out.push(by);
  }
  return out;
}

/* the looks: the archetype the page's monster wears, its death strip, its cell */
const SKELETON = { key: 'skeleton', death: '/sprites/monsters/skeleton/death.png', fh: 256 };
const SAMPLE = [
  { key: 'fishman', death: '/sprites/monsters/water-frog/death.png', fh: 256 },
  { key: 'rockmonster', death: '/sprites/monsters/rock-golem/death.png', fh: 256 },
  { key: 'stormEye', death: '/sprites/monsters/storm-eye/death.png', fh: 256 },
  { key: 'fireGoblin', death: '/sprites/monsters/fire-goblin/death.png', fh: 256 },
  { key: 'mireWisp', death: '/sprites/monsters/rotcap/death.png', fh: 256 },
  { key: 'fodder', death: '/sprites/monsters/slime-death-v10.png', fh: 128 },
  { key: 'snowman', death: '/sprites/monsters/snowman-death.png', fh: 128 },
];

/* the page's own monsters, re-asserted every frame (the worker's set aside) */
const hold = (P, specs) => P.page.evaluate((specs) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaDS || (window.__qaDS = { list: [], keep: S.monsters, server: S._serverMonsters, loop: false });
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const out = [];
  q.list = [];
  for (const sp of specs) {
    const m = F.createMonster(sp.id, 'brute', 2, S.player.x + sp.dx, S.player.y + sp.dy, null);
    if (!m) return { err: 'no monster' };
    m.archetype = sp.variant; m.type = sp.variant;
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0;
    m._atkCd = Date.now() + 1e11;
    m.renderX = m.x; m.renderY = m.y; m.vx = 0; m.vy = 0;
    q.list.push(m);
    out.push(m.id);
  }
  S.lockedTarget = null; S.autoAttack = false;
  if (!q.loop) {
    q.loop = true;
    const tick = () => {
      if (!q.loop) return;
      S._serverMonsters = false;
      if (S.monsters.length !== q.list.length || q.list.some((m, i) => S.monsters[i] !== m)) S.monsters = q.list.slice();
      for (const m of q.list) { m.vx = 0; m.vy = 0; if (m.alive) m._atkCd = Date.now() + 1e11; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return { ids: out };
}, specs);

const sprite = (P, id) => P.page.evaluate((mid) => (window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null), id);

async function drawn(P, id, pred, ms = 40000) {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await sprite(P, id);
    if (s && s.visible && s.texAlive !== false && (!pred || pred(s))) return s;
    await P.page.waitForTimeout(300);
  }
  return s;
}

/* every frame the renderer drew, until `until` or `frames`: the sprite and its shadow's ground point.
   act: { walk: dx } moves it a step a frame; { kill: true } kills it first (the strip's death, forced) */
const watch = (P, id, frames, act) => P.page.evaluate(([mid, frames, act]) => new Promise((resolve) => {
  const m = window.__qaDS.list.find((x) => x.id === mid);
  const out = [];
  let n = 0;
  const from = Date.now();
  if (act && act.kill) {
    window.__btDeathKind = 'normal';
    m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
  }
  const step = () => {
    if (act && act.walk && m.alive) { m.x += act.walk; m.renderX = m.x; }
    const s = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
    const p = window.__btLightFx ? window.__btLightFx.probe() : null;
    const c = p && p.shadows ? (p.shadows.list || []).find((x) => String(x.key) === 'm:' + mid) : null;
    const d = window.__btMonsterDeath ? window.__btMonsterDeath(mid) : null;
    out.push(s ? { t: Date.now() - from, ix: s.ix, n: s.n, sx: s.sx, sy: s.sy, y: s.y,
      dy: s.dy != null ? s.dy : (m.renderY != null ? m.renderY : m.y), ds: s.ds, ay: s.ay, oh: s.oh, foot: s.foot,
      vis: s.visible, on: !!(p && p.on), py: c ? c.py : null, flat: c ? c.flat : null, cut: !!(d && d.kind && d.kind !== 'normal') } : { t: Date.now() - from, gone: true });
    n++;
    const last = out[out.length - 1];
    const over = act && act.kill ? (Date.now() - from > 1500 && (last.gone || last.vis === false)) || Date.now() - from > 20000 : n >= frames;
    if (over) resolve(out); else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), [id, frames, act || null]);

const DS_DEFAULT = 1.5;   /* entityRenderer MONSTER_SIZE_MULT, when the probe does not say (main before v2.3.6209) */
/* the shadow's lift above the cell's anchor, as drawn; and as the rules want it */
const liftOf = (f) => +((f.dy + f.y * (f.ds || DS_DEFAULT)) - f.py).toFixed(1);
const aliveWant = (key, f) => {
  const v = MONSTER_VARIANTS[key];
  return v && v.feetRow > 0 && v.feetRow < 256 ? (256 - v.feetRow) * Math.abs(f.sy) * (f.ds || DS_DEFAULT) : 0;
};
const deathWant = (f, foots, fh) => {
  const foot = foots[f.ix];
  const ay = f.ay != null ? f.ay : 1;
  return Math.max(0, ay * fh - foot) * Math.abs(f.sy) * (f.ds || DS_DEFAULT);
};

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Shade', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 20000);
  const tag = process.env.DS_TAG || 'shot';
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(2500);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});

    /* ── 1. the mummy, and its second phase ── */
    const skFoots = await footsOf(SKELETON.death, SKELETON.fh);
    const phase2 = async (dx, dy = 10) => {
      const id = `ds-mummy-${Date.now()}`;
      await hold(P, [{ id, variant: 'mummy', dx, dy }]);
      const m0 = await drawn(P, id);
      const alive = [];
      alive.push(...(await watch(P, id, 12, { walk: dx > 0 ? -1 : 1 })).map((f) => Object.assign(f, { key: 'mummy' })));
      await P.page.evaluate((mid) => {
        const S = window._gameState.current;
        window.__btDispatch({ type: 'monster_transform', payload: { id: mid, zone: S.currentZone, fromVariant: 'mummy', toVariant: 'skeleton' } });
      }, id);
      alive.push(...(await watch(P, id, 10)).map((f) => Object.assign(f, { key: 'mummy' })));   /* the shred (the mummy's strip) */
      const sk = await drawn(P, id, (s) => s.n === 8, 30000);
      return { id, m0, sk, alive };
    };
    const runs = [];
    for (const dx of [70, -70]) {
      const ph = await phase2(dx);
      rec.ok(`1. a mummy is drawn, and the worker's transform makes it the skeleton (its run strip of 8 drawn; guard) [${dx > 0 ? 'right' : 'left'} of you]`,
        !!(ph.m0 && ph.m0.visible && ph.m0.texAlive && ph.sk && ph.sk.visible && ph.sk.n === 8), { m0: ph.m0 && ph.m0.n, sk: ph.sk && ph.sk.n });
      /* it runs a few frames the way it will face as it dies: east on the right of you, then west on the left */
      const walk = dx > 0 ? 2 : -2;
      const run = (await watch(P, ph.id, 14, { walk })).map((f) => Object.assign(f, { key: 'skeleton' }));
      const death = await watch(P, ph.id, 0, { kill: true });
      runs.push({ dx, alive: ph.alive.concat(run), death });
    }
    /* ── 2. living frames: the look's own rule, unmoved ── */
    for (const r of runs) {
      const lv = r.alive.filter((f) => f && f.vis && f.py != null);
      const bad = lv.filter((f) => Math.abs(liftOf(f) - aliveWant(f.key, f)) > 1);
      rec.ok(`2. alive, its shadow hangs where it always did -- the cell's bottom (the mummy and skeleton have no feetRow) -- in ${lv.length} frames walking, shredding and running ${r.dx > 0 ? 'east' : 'west'}`,
        lv.length >= 10 && lv.some((f) => f.on) && bad.length === 0, bad.slice(0, 4).map((f) => ({ key: f.key, n: f.n, ix: f.ix, lift: liftOf(f), want: aliveWant(f.key, f) })));
    }
    /* ── 3. the skeleton's death, every frame ── */
    for (const r of runs) {
      const dead = r.death.filter((f) => f && !f.gone && f.vis && f.n === skFoots.length && f.py != null);
      const rows = dead.map((f) => ({ ix: f.ix, sx: f.sx, foot: skFoots[f.ix], lift: liftOf(f), want: +deathWant(f, skFoots, SKELETON.fh).toFixed(1) }));
      const off = rows.filter((x) => Math.abs(x.lift - x.want) > TOL);
      const ixs = [...new Set(rows.map((x) => x.ix))];
      const worst = rows.reduce((a, x) => Math.max(a, Math.abs(x.lift - x.want)), 0);
      console.log(`  skeleton death ${r.dx > 0 ? 'east' : 'west'}: ${rows.map((x) => `#${x.ix} foot ${x.foot} lift ${x.lift}/${x.want}`).join('; ')}`);
      rec.ok(`3. the skeleton dies its strip (not a cut), and at every one of its frames drawn (${ixs.length} of ${skFoots.length}: first ${Math.min(...ixs)}, last ${Math.max(...ixs)}) its shadow hangs from that frame's painted feet within ${TOL} px (worst ${worst.toFixed(1)} px), facing ${r.dx > 0 ? 'east' : 'west'}`,
        dead.length >= 4 && !r.death.some((f) => f && f.cut) && ixs.indexOf(0) >= 0 && ixs.indexOf(skFoots.length - 1) >= 0 && off.length === 0,
        off.slice(0, 6));
    }
    {
      /* the way it ran just before it died: its run frames' mirror (sx's sign) */
      const faced = runs.map((r) => { const a = r.alive.filter((f) => f && f.vis && f.key === 'skeleton'); return a.length ? Math.sign(a[a.length - 1].sx) : 0; });
      rec.ok('3. ...and the two were killed facing opposite ways (the run strip mirrored for one): the mirror is covered',
        runs.length === 2 && faced[0] !== 0 && faced[1] !== 0 && faced[0] !== faced[1], faced);
    }

    /* ── 4. the sample: every other look family with a death strip ── */
    if (process.env.DS_SAMPLE !== '0') {
      const report = [];
      for (const L of SAMPLE) {
        const foots = await footsOf(L.death, L.fh);
        const id = `ds-${L.key}-${Date.now()}`;
        await hold(P, [{ id, variant: L.key, dx: 70, dy: 10 }]);
        const s0 = await drawn(P, id);
        if (!s0 || !s0.visible) { report.push({ key: L.key, drawn: false }); continue; }
        const alive = (await watch(P, id, 12, { walk: 2 })).filter((f) => f && f.vis && f.py != null);
        const aliveOff = alive.filter((f) => Math.abs(liftOf(f) - aliveWant(L.key, f)) > 1);
        const death = (await watch(P, id, 0, { kill: true })).filter((f) => f && !f.gone && f.vis && f.n === foots.length && f.py != null);
        const rows = death.map((f) => ({ ix: f.ix, lift: liftOf(f), want: +deathWant(f, foots, L.fh).toFixed(1) }));
        const worst = rows.reduce((a, x) => Math.max(a, Math.abs(x.lift - x.want)), 0);
        report.push({ key: L.key, drawn: true, alive: alive.length, aliveOff: aliveOff.length, deathFrames: [...new Set(rows.map((x) => x.ix))].length,
          of: foots.length, worst: +worst.toFixed(1), off: rows.filter((x) => Math.abs(x.lift - x.want) > TOL).slice(0, 3) });
      }
      for (const x of report) console.log(`  sample ${x.key}: ${x.drawn ? `alive ${x.alive} frames (${x.aliveOff} moved), death ${x.deathFrames} of ${x.of} frames, worst ${x.worst} px` : 'not drawn'}`);
      const seen = report.filter((x) => x.drawn && x.deathFrames >= 2);
      rec.ok(`4. the sample: ${seen.length} of ${SAMPLE.length} look families drawn and killed; alive, no shadow moved; dying, every frame's shadow at its own feet within ${TOL} px`,
        seen.length >= SAMPLE.length - 1 && report.every((x) => !x.drawn || (x.aliveOff === 0 && x.off.length === 0)),
        report.filter((x) => !x.drawn || x.aliveOff || x.off.length));
    }

    /* ── 5. pictures: one more skeleton's death, held at a frame for each picture ──
       (a picture takes this box about a second, and the death is 1.2 s: the death's own clock --
       entityRenderer's burst clock on the monster, `_burstClock`, keyed on `_slimeDeathStart` -- is held
       at the middle of each frame every frame, QA only, so each picture shows one frame: its last step
       read as long ago, so the renderer's catch-up step -- at most BURST_MAX_SKIP frames -- lands on it) */
    {
      /* in open ground, away from the Town Hall's steps, townsfolk and names (DS_PIC_HOP="dx,dy": another
         spot, from where you came into the world) */
      const hop = (process.env.DS_PIC_HOP || '0,900').split(',').map(Number);
      const at = await H.readState(P, (S) => [S.player.x, S.player.y]);
      await H.hopTo(P, at[0] + hop[0], at[1] + hop[1], { tries: 80 }).catch(() => {});
      await P.page.waitForTimeout(2000);
      const ph = await phase2(150, 70);   /* on the grass, right of you and below */
      await watch(P, ph.id, 6);
      const ms = MONSTER_VARIANTS.skeleton.deathMs;
      await P.page.evaluate(([mid, ms, fc, skip]) => {
        const m = window.__qaDS.list.find((x) => x.id === mid);
        window.__btDeathKind = 'normal';
        m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
        const h = window.__qaDSHold = { T: 0, on: true, fc: fc, skip: skip };
        const tick = () => {
          if (!h.on) return;
          const k = Date.now() - 50;
          m._slimeDeathStart = k;
          m._burstClock = { key: k, t: h.T - (ms / h.fc) * h.skip, last: 0, win: ms };
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, [ph.id, ms, skFoots.length, BURST_MAX_SKIP]);
      const shots = [];
      for (const ix of [0, 1, 2, 4, 6, 8, 11, 15]) {
        await P.page.evaluate(([T]) => { window.__qaDSHold.T = T; }, [((ix + 0.5) / skFoots.length) * ms]);
        let s = null;
        for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
          s = await sprite(P, ph.id);
          if (s && s.visible && s.n === skFoots.length && s.ix === ix) break;
          await P.page.waitForTimeout(60);
        }
        if (!s || s.ix !== ix) continue;
        await P.page.waitForTimeout(250);
        /* the whole phone, 375 x 667 upright, as the owner plays it */
        await P.page.screenshot({ path: `${OUT}/${tag}-${String(ix).padStart(2, '0')}.png` }).catch(() => {});
        shots.push(ix);
      }
      await P.page.evaluate(() => { window.__qaDSHold.on = false; });
      rec.ok(`5. pictures of the skeleton's death for the owner: frames ${shots.join(', ')} (${OUT})`, shots.length >= 6, shots);
    }

    rec.ok('6. no page error', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
