/* ═══ v2.3.4357: THE ROTCAP, IN THE WORLD ═══
 *
 * The owner, 2026-11-09: "Also this for poison land" -- and which of the
 * Poison Forest's two stand-ins it replaces: "Both".
 *
 * A phone in the world, the land's two monsters held beside it (the page's
 * own, as mp-waterfrog holds its frog) and read off the renderer's probe
 * (window.__btMonsterSprite), by the renderer's frames (TRAPS §200):
 *
 *   1. both of the land's keys are drawn from the rotcap's two strips;
 *   2. walked each of the eight ways the ordinary one shows that side -- five
 *      drawn, three mirrored -- on the four frames of its shuffle;
 *   3. standing still it plays the same four by the clock, not one held frame;
 *   4. the great one is the same mushroom, bigger and in its dark tint;
 *   5. killed, each plays its own death -- the 12 frames, in order, to the
 *      last -- on every kill, a big blow included, never a cut one;
 *   6. no page error;
 *   7. and out in the Poison Forest itself the worker's own monsters are
 *      rotcaps, named "Rotcap" and "Great Rotcap", their look loaded on the
 *      walk there; one spits at you, in the green of its own spots.
 *
 * Pictures for the owner's eyes: tools/qa/mp/out/rotcap/.
 *
 *   node tools/qa/mp/run.mjs rotcap
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { MONSTER_VARIANTS } from '../../../src/data/monsterVariants.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/rotcap`;

/* the page's own monsters, re-asserted every frame (the worker's set aside) */
const hold = (P, specs) => P.page.evaluate((specs) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaRC || (window.__qaRC = { list: [], keep: S.monsters, server: S._serverMonsters, loop: false });
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const out = [];
  q.list = [];
  for (const sp of specs) {
    const m = F.createMonster(sp.id, sp.variant === 'bogLurker' ? 'brute' : 'fodder', 2, S.player.x + sp.dx, S.player.y + sp.dy, null);
    if (!m) return { err: 'no monster' };
    m.archetype = sp.variant; m.type = sp.variant; m.element = 'venom';
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0;
    /* (its own little brain on this page kept quiet: a swing or a spit of its
       own would be a blow this test did not ask for) */
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

const release = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, q = window.__qaRC;
  if (!q) return;
  q.loop = false;
  S.monsters = q.keep || [];
  S._serverMonsters = q.server;
  window.__qaRC = null;
  delete window.__btDeathKind; delete window.__btDeathBig;
});

const sprite = (P, id) => P.page.evaluate((mid) => (window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null), id);

/* every frame the renderer drew over `frames` of its own (or until `until`):
   the sprite and the sparks, with the monster walked first if asked */
const watch = (P, id, frames, act, until) => P.page.evaluate(([mid, frames, act, until]) => new Promise((resolve) => {
  const m = window.__qaRC.list.find((x) => x.id === mid);
  const out = [];
  let n = 0;
  const stop = until ? new Function('s', 'm', 'out', `return (${until});`) : null;
  const step = () => {
    if (act && act.kind === 'walk' && n < act.steps) { m.x += act.dx; m.y += act.dy; m.renderX = m.x; m.renderY = m.y; }
    const s = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
    out.push(s ? { ix: s.ix, n: s.n, sx: s.sx, sy: s.sy, vis: s.visible, facing: s.facing, idle: s.idlePose, tint: s.baseTint } : null);
    n++;
    if (n >= frames || (stop && s && stop(s, m, out))) resolve(out); else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), [id, frames, act || null, until || null]);

const boxOf = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current, m = (S.monsters || []).find((x) => x.id === mid);
  if (!m || !S.camera) return null;
  const c = document.querySelector('canvas').getBoundingClientRect();
  const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
  const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 40 - S.camera.y) * ky;
  return { x: Math.max(0, Math.round(cx - 130)), y: Math.max(0, Math.round(cy - 130)), width: 260, height: 220 };
}, id);

async function drawn(P, id, ms = 30000) {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await sprite(P, id);
    if (s && s.visible && s.texAlive !== false) return s;
    await P.page.waitForTimeout(300);
  }
  return s;
}

const uniq = (a) => [...new Set(a)];
const live = (fr) => fr.filter((f) => f && f.vis);

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Morel', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 20000);
  const shot = async (id, name) => { const b = await boxOf(P, id); if (b) await P.page.screenshot({ path: `${OUT}/${name}.png`, clip: b }).catch(() => {}); };
  const W = MONSTER_VARIANTS.mireWisp, G = MONSTER_VARIANTS.bogLurker;
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(2500);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
    await P.page.waitForTimeout(600);
    const spawn = async (variant, dx = 80, dy = 10) => { const h = await hold(P, [{ id: `rc-${variant}-${Date.now()}`, variant, dx, dy }]); return h.ids ? h.ids[0] : null; };

    /* RC_FROM=forest: only the Poison Forest's own (7), a quicker look */
    if (process.env.RC_FROM !== 'forest') {
    /* ── 1. its strips ── */
    let id = await spawn('mireWisp');
    const first = await drawn(P, id);
    const strips = await P.page.evaluate(() => (window.__btStripTrim ? window.__btStripTrim().filter((s) => s.bundle === 'rotcap') : null));
    const names = strips && strips.map((s) => s.url.replace(/\?.*$/, '').split('/').pop()).sort();
    const mb = strips ? strips.reduce((a, x) => a + x.packedBytes, 0) / 1048576 : 0;
    rec.ok('1. the Poison Forest\'s spitter is drawn from the rotcap\'s two strips, 256 px cells cropped to the art (guard)',
      !!(first && first.visible && first.texAlive) && !!names && names.join() === 'death.png,walk.png' && first.texW === 256 && first.trimmed && first.n === 20, { names, first: first && { n: first.n, texW: first.texW } });
    rec.ok(`1. ...${mb.toFixed(2)} MB of pictures once cropped, for both of the land's monsters: under 4 MB`, mb > 0 && mb < 4, { mb });
    await P.page.waitForTimeout(600);

    /* ── 2. the eight ways ── */
    const WAYS = [['south', 0, 1, 0, false], ['southwest', -1, 1, 2, false], ['west', -1, 0, 1, true], ['northwest', -1, -1, 4, true],
      ['north', 0, -1, 3, false], ['northeast', 1, -1, 4, false], ['east', 1, 0, 1, false], ['southeast', 1, 1, 2, true]];
    for (const [facing, ux, uy, side, mirror] of WAYS) {
      const k = Math.hypot(ux, uy);
      const fr = live(await watch(P, id, 50, { kind: 'walk', steps: 50, dx: 1.2 * ux / k, dy: 1.2 * uy / k }));
      const tail = fr.slice(Math.floor(fr.length / 3));
      rec.ok(`2. walked ${facing}: it shows its ${['front', 'side', 'front-left', 'back', 'back-right'][side]} side, ${mirror ? 'mirrored' : 'as drawn'}, shuffling on its four frames`,
        tail.length > 0 && tail.every((f) => f.facing === facing && f.n === 20 && Math.floor(f.ix / 4) === side && (f.sx < 0) === mirror) && uniq(tail.map((f) => f.ix)).length >= 2,
        { facing: uniq(tail.map((f) => f.facing)), ix: uniq(tail.map((f) => f.ix)), mirrored: uniq(tail.map((f) => f.sx < 0)) });
      await shot(id, `1-facing-${facing}`);
    }

    /* ── 3. standing still ── */
    {
      await P.page.waitForTimeout(900);
      const fr = live(await watch(P, id, 500, null, 'out.length > 12 && new Set(out.filter(Boolean).map((f) => f.ix)).size >= 3'));
      rec.ok('3. standing still it plays its shuffle by the clock (three or more of its four frames seen), not one held frame',
        uniq(fr.map((f) => f.ix)).length >= 3 && fr.every((f) => !f.idle && Math.floor(f.ix / 4) === 2), { ix: uniq(fr.map((f) => f.ix)) });
    }

    /* ── 4. the great one ── */
    await release(P);
    await P.page.waitForTimeout(300);
    const pair = await hold(P, [{ id: `rc-w-${Date.now()}`, variant: 'mireWisp', dx: -70, dy: 20 }, { id: `rc-g-${Date.now()}`, variant: 'bogLurker', dx: 80, dy: 20 }]);
    const sw = await drawn(P, pair.ids[0]), sg = await drawn(P, pair.ids[1]);
    await P.page.waitForTimeout(700);
    const a = await sprite(P, pair.ids[0]), g = await sprite(P, pair.ids[1]);
    rec.ok(`4. the great one is the same mushroom, bigger (${G.liveScalePx} against ${W.liveScalePx}) and in its dark tint; the ordinary one in its own colours`,
      !!(sw && sg && a && g) && g.n === 20 && a.n === 20 && Math.abs(Math.abs(g.sx) / Math.abs(a.sx) - G.liveScalePx / W.liveScalePx) < 0.02 && g.baseTint === G.tint && a.baseTint === 0xffffff,
      { a: a && { sx: a.sx, tint: a.baseTint }, g: g && { sx: g.sx, tint: g.baseTint } });
    {
      const b = await boxOf(P, pair.ids[1]);
      if (b) await P.page.screenshot({ path: `${OUT}/2-both.png`, clip: { x: Math.max(0, b.x - 150), y: b.y, width: 390, height: 240 } }).catch(() => {});
    }

    /* ── 5. the death ── */
    for (const [label, variant, big] of [['the ordinary one, an ordinary kill', 'mireWisp', false], ['the ordinary one, a big blow', 'mireWisp', true], ['the great one', 'bogLurker', false]]) {
      await release(P);
      await P.page.waitForTimeout(300);
      id = await spawn(variant);
      await drawn(P, id);
      await P.page.waitForTimeout(600);
      const fr = await P.page.evaluate(([mid, big]) => new Promise((resolve) => {
        const m = window.__qaRC.list.find((x) => x.id === mid);
        const out = [];
        window.__btDeathBig = big;
        m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
        const from = Date.now();
        const step = () => {
          const s = window.__btMonsterSprite(mid), d = window.__btMonsterDeath ? window.__btMonsterDeath(mid) : null;
          out.push(s ? { t: Date.now() - from, ix: s.ix, n: s.n, sx: s.sx, vis: s.visible, cut: !!(d && d.kind && d.kind !== 'normal') } : { t: Date.now() - from, gone: true });
          if (Date.now() - from > 3400) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, big]);
      const dead = fr.filter((f) => !f.gone && f.n === 12 && f.vis);
      const seen = uniq(dead.map((f) => f.ix));
      /* (this box draws a few frames a second: not every frame is seen) */
      rec.ok(`5. ${label}: it plays its own death -- the 12-frame strip, in order, to its last frame -- never a cut one, and is gone`,
        dead.length > 0 && dead.every((f, i) => i === 0 || f.ix >= dead[i - 1].ix) && Math.max(...seen) === 11 && seen.length >= 3 && fr.every((f) => !f.cut)
        && (!!fr[fr.length - 1].gone || fr[fr.length - 1].vis === false), { seen, frames: dead.length, last: fr[fr.length - 1] });
      if (variant === 'mireWisp' && !big) {
        await release(P); await P.page.waitForTimeout(300);
        id = await spawn('mireWisp'); await drawn(P, id); await P.page.waitForTimeout(600);
        await P.page.evaluate((mid) => { const m = window.__qaRC.list.find((x) => x.id === mid); m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000; }, id);
        for (const want of [2, 5, 8, 11]) {
          const t0 = Date.now();
          while (Date.now() - t0 < 3000) { const s = await sprite(P, id); if (!s || (s.n === 12 && s.ix >= want)) break; await P.page.waitForTimeout(15); }
          await shot(id, `3-death-${String(want).padStart(2, '0')}`);
        }
      }
    }
    await release(P);
    }

    /* ── 7. the Poison Forest's own: the worker's monsters, walked out to ── */
    {
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.mist.points[0];
      await H.devOp(wsPort, 'tour', me, { at: 'smith_1' }).catch(() => {});
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.hopTo(P, at[0] + 140, at[1] - 140, { tries: 200 });
      await P.page.waitForTimeout(3000);
      const read = () => P.page.evaluate(() => {
        const S = window._gameState.current;
        return (S.monsters || []).filter((m) => m.home === 'mist' && m.alive !== false).map((m) => {
          const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
          return { id: m.id, arch: m.archetype || m.type, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)),
            s: sp ? { vis: sp.visible, alive: sp.texAlive, n: sp.n, name: sp.plate && sp.plate.name } : null };
        }).sort((a, b) => a.d - b.d);
      });
      let real = await read();
      const t0 = Date.now();
      while (Date.now() - t0 < 30000 && !real.some((m) => m.s && m.s.vis)) { await P.page.waitForTimeout(1000); real = await read(); }
      const seen = real.filter((m) => m.s && m.s.vis);
      const NAME = { mireWisp: 'Rotcap', bogLurker: 'Great Rotcap' };
      rec.ok(`7. in the Poison Forest the worker's own monsters are rotcaps: ${seen.length} drawn from its strips, each named for its size, none a slime or a fishman`,
        seen.length >= 1 && real.every((m) => m.arch === 'mireWisp' || m.arch === 'bogLurker') && seen.every((m) => m.s.alive && (m.s.n === 20 || m.s.n === 12) && m.s.name === NAME[m.arch]), real.slice(0, 8));
      const art = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
      rec.ok('7. ...their look loaded as you walked to it, as every land\'s is (the preloading law)',
        !!art && Object.keys(art.looks).some((k) => (k === 'mireWisp' || k === 'bogLurker') && art.looks[k] === 'ready'), art);
      await P.page.screenshot({ path: `${OUT}/4-forest.png` }).catch(() => {});
      const spit = await P.page.evaluate(() => new Promise((resolve) => {
        const from = Date.now();
        const step = () => {
          const ms = window.__btMonsterShots ? window.__btMonsterShots() : null;
          const mine = ms && (ms.shots || []).find((x) => x.arch === 'mireWisp');
          if (mine || Date.now() - from > 60000) resolve(mine || null); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }));
      rec.ok('7. ...one spits at you: the slime\'s glob in the green of its own spots (0x9bd43f)', !!spit && spit.tint === 0x9bd43f && spit.style === 'goo', spit);
      await P.page.screenshot({ path: `${OUT}/5-forest-fight.png` }).catch(() => {});
    }

    rec.ok('6. no page error', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
