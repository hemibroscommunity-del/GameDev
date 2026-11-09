/* ═══ v2.3.4356: THE STORM EYE, IN THE WORLD ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".
 *
 * A phone in the world, an Electric Foundry monster held beside it (the
 * page's own, as mp-waterfrog holds its frog) and read off the renderer's
 * probes (window.__btMonsterSprite, window.__btStormSparks), by the
 * renderer's frames and never a test's clock (TRAPS §200):
 *
 *   1. it is drawn from the eye's two strips (256 px cells, cropped);
 *   2. turned each of the eight ways it shows that side -- five views, three
 *      mirrored;
 *   3. it floats: its picture lifted off the ground and bobbing, while the
 *      monster itself stays where it is;
 *   4. arcs crackle over it, drawn in code: lit on some frames and dark on
 *      others, on its body;
 *   5. as a warning of its ends -- a spit's, its lunge's -- lightning is
 *      thrown off it, once;
 *   6. killed, it plays its own death -- the 12 frames, in order, to the last
 *      -- on every kill, a big blow included, never a cut one, and is gone,
 *      its arcs with it;
 *   7. no page error;
 *   8. and out in the Electric Foundry itself the worker's own monsters are
 *      the eye, named "Storm Eye", their look loaded on the walk there; one
 *      spits at you: a ball in its lightning's pale blue, arcs round it.
 *
 * Pictures for the owner's eyes: tools/qa/mp/out/stormeye/.
 *
 *   node tools/qa/mp/run.mjs stormeye
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { MONSTER_VARIANTS } from '../../../src/data/monsterVariants.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/stormeye`;
const HOVER = MONSTER_VARIANTS.stormEye.hover;

/* the page's own monsters, re-asserted every frame (the worker's set aside) */
const hold = (P, specs) => P.page.evaluate((specs) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaSE || (window.__qaSE = { list: [], keep: S.monsters, server: S._serverMonsters, loop: false });
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const out = [];
  q.list = [];
  for (const sp of specs) {
    const m = F.createMonster(sp.id, 'fodder', 2, S.player.x + sp.dx, S.player.y + sp.dy, null);
    if (!m) return { err: 'no monster' };
    m.archetype = 'stormEye'; m.type = 'stormEye'; m.element = 'storm';
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
  const S = window._gameState.current, q = window.__qaSE;
  if (!q) return;
  q.loop = false;
  S.monsters = q.keep || [];
  S._serverMonsters = q.server;
  window.__qaSE = null;
  delete window.__btDeathKind; delete window.__btDeathBig;
});

const sprite = (P, id) => P.page.evaluate((mid) => (window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null), id);

/* every frame the renderer drew over `frames` of its own (or until `until`):
   the sprite and the sparks, with the monster walked first if asked */
const watch = (P, id, frames, act, until) => P.page.evaluate(([mid, frames, act, until]) => new Promise((resolve) => {
  const m = window.__qaSE.list.find((x) => x.id === mid);
  const out = [];
  let n = 0;
  const stop = until ? new Function('s', 'm', 'out', `return (${until});`) : null;
  const step = () => {
    if (act && act.kind === 'walk' && n < act.steps) { m.x += act.dx; m.y += act.dy; m.renderX = m.x; m.renderY = m.y; }
    const s = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
    const w = window.__btStormSparks ? window.__btStormSparks() : null;
    out.push(s ? { ix: s.ix, n: s.n, sx: s.sx, y: s.y, size: s.size, vis: s.visible, facing: s.facing, my: m.y, eyes: w && w.live.eyes, lit: w && w.live.lit, zaps: w && w.live.zaps } : null);
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
  const P = await H.newPlayer(browser, { name: 'Sparky', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 20000);
  const shot = async (id, name) => { const b = await boxOf(P, id); if (b) await P.page.screenshot({ path: `${OUT}/${name}.png`, clip: b }).catch(() => {}); };
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(2500);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
    await P.page.waitForTimeout(600);
    const spawn = async (dx = 80, dy = 10) => { const h = await hold(P, [{ id: `se-${Date.now()}`, dx, dy }]); return h.ids ? h.ids[0] : null; };

    /* SE_FROM=foundry: only the Electric Foundry's own (8), a quicker look */
    const foundryOnly = process.env.SE_FROM === 'foundry';
    let id = null;
    if (!foundryOnly) {
    /* ── 1. its strips ── */
    id = await spawn();
    const first = await drawn(P, id);
    const strips = await P.page.evaluate(() => (window.__btStripTrim ? window.__btStripTrim().filter((s) => s.bundle === 'stormEye') : null));
    const names = strips && strips.map((s) => s.url.replace(/\?.*$/, '').split('/').pop()).sort();
    rec.ok('1. the Electric Foundry\'s monster is drawn, its look loaded as a monster of the world\'s is (guard)', !!(first && first.visible && first.texAlive), first);
    rec.ok('1. ...from the eye\'s two strips, 256 px cells cropped to the art', !!names && names.join() === 'death.png,views.png' && first.texW === 256 && first.trimmed && first.n === 5, { names, first: first && { texW: first.texW, n: first.n } });
    const mb = strips ? strips.reduce((a, x) => a + x.packedBytes, 0) / 1048576 : 0;
    rec.ok(`1. ...${mb.toFixed(2)} MB of pictures once cropped: under 3 MB`, mb > 0 && mb < 3, { mb });
    await P.page.waitForTimeout(700);

    /* ── 2. the eight ways ── */
    const WAYS = [['south', 0, 1, 0, false], ['southwest', -1, 1, 2, false], ['west', -1, 0, 1, true], ['northwest', -1, -1, 4, true],
      ['north', 0, -1, 3, false], ['northeast', 1, -1, 4, false], ['east', 1, 0, 1, false], ['southeast', 1, 1, 2, true]];
    for (const [facing, ux, uy, view, mirror] of WAYS) {
      const k = Math.hypot(ux, uy);
      const fr = live(await watch(P, id, 40, { kind: 'walk', steps: 40, dx: 1.2 * ux / k, dy: 1.2 * uy / k }));
      const tail = fr.slice(Math.floor(fr.length / 2));
      rec.ok(`2. turned ${facing}: it shows its ${['front', 'side', 'front-left', 'back', 'back-right'][view]} view, ${mirror ? 'mirrored' : 'as drawn'}`,
        tail.length > 0 && tail.every((f) => f.facing === facing && f.n === 5 && f.ix === view && (f.sx < 0) === mirror), { facing: uniq(tail.map((f) => f.facing)), ix: uniq(tail.map((f) => f.ix)), mirrored: uniq(tail.map((f) => f.sx < 0)) });
      await shot(id, `1-facing-${facing}`);
    }

    /* ── 3. it floats ── */
    {
      const fr = live(await watch(P, id, 700, null, `out.length > 12 && (() => { const ys = out.filter(Boolean).map((f) => f.size - f.y); return Math.max(...ys) - Math.min(...ys) > ${HOVER.bob}; })()`));
      const lifts = fr.map((f) => +(f.size - f.y).toFixed(2));
      rec.ok(`3. it floats: its picture lifted ${Math.min(...lifts)}-${Math.max(...lifts)} (the table: ${HOVER.px} +/- ${HOVER.bob}), bobbing, while the monster stays where it is`,
        lifts.every((l) => l >= HOVER.px - HOVER.bob - 0.01 && l <= HOVER.px + HOVER.bob + 0.01) && Math.max(...lifts) - Math.min(...lifts) > HOVER.bob && uniq(fr.map((f) => f.my)).length === 1,
        { min: Math.min(...lifts), max: Math.max(...lifts), my: uniq(fr.map((f) => f.my)) });
    }

    /* ── 4. its arcs ── */
    {
      const made = await P.page.evaluate(() => { const w = window.__btStormSparks(); return { on: w.on, made: w.made, pool: w.pool }; });
      const fr = live(await watch(P, id, 900, null, 'out.length > 30 && out.filter((f) => f && f.lit > 0).length >= 6 && out.filter((f) => f && f.lit === 0).length >= 3'));
      const litN = fr.filter((f) => f.lit > 0).length, dark = fr.filter((f) => f.lit === 0).length;
      rec.ok(`4. arcs crackle over it, drawn in code: lit on ${litN} of ${fr.length} frames and dark on ${dark} (a crackle, not a glow), from a pool made once`,
        made.on && made.made && made.pool === 112 && fr.every((f) => f.eyes === 1) && litN >= 6 && dark >= 3 && fr.every((f) => f.lit <= 3),
        { made, litN, dark, n: fr.length, eyes: uniq(fr.map((f) => f.eyes)), lit: uniq(fr.map((f) => f.lit)) });
      await watch(P, id, 600, null, 's && out[out.length - 1] && out[out.length - 1].lit >= 2');
      await shot(id, '2-arcs');
    }

    /* ── 5. the zap ── */
    for (const [label, payload] of [['a spit', { ability: 'throw', phase: 'windup', ms: 500 }], ['its lunge', { ability: 'lunge', phase: 'telegraph', ms: 700, radius: 80 }]]) {
      const z = await P.page.evaluate(([mid, payload]) => new Promise((resolve) => {
        const S = window._gameState.current;
        const n0 = window.__btStormSparks().recent.filter((r) => r.id === mid).length;
        window.__btBlowFxRate = 0.06;
        window.__btDispatch({ type: 'monster_ability', payload: Object.assign({ monsterId: mid, zone: S.currentZone, x: S.player.x, y: S.player.y, ax: S.player.x, ay: S.player.y }, payload) });
        const from = Date.now();
        let before = 0, n = 0;
        const step = () => {
          const w = window.__btStormSparks(), t = Date.now() - from;
          if (t < payload.ms - 60 && w.live.zaps > 0) before++;
          const mine = w.recent.filter((r) => r.id === mid);
          if ((mine.length > n0 && w.live.zaps > 0 && t > payload.ms + 900) || ++n > 900) resolve({ n0, n1: mine.length, before, zaps: w.live.zaps, lit: w.live.lit, last: mine[mine.length - 1], t });
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, payload]);
      rec.ok(`5. as ${label}'s warning ends, lightning is thrown off it, drawn in code: once, and not before`,
        !!z && z.n1 === z.n0 + 1 && z.before === 0 && z.zaps === 1 && z.lit >= 4 && !!z.last && z.last.reach > 40, z);
      const b = await boxOf(P, id);
      if (b) await P.page.screenshot({ path: `${OUT}/3-zap-${label === 'a spit' ? 'spit' : 'lunge'}.png`, clip: { x: Math.max(0, b.x - 30), y: Math.max(0, b.y - 20), width: 320, height: 280 } }).catch(() => {});
      await P.page.evaluate(() => { window.__btBlowFxRate = 1; });
      await P.page.waitForTimeout(900);
    }
    {
      const w = await P.page.evaluate(() => window.__btStormSparks());
      rec.ok('5. ...and gone again after it: no zap left drawn', w.live.zaps === 0, w.live);
    }

    /* ── 6. the death ── */
    for (const [label, big, walk] of [['an ordinary kill', false, null], ['a big blow', true, [-1, 0]], ['a third kill', false, [1, -1]]]) {
      await release(P);
      await P.page.waitForTimeout(300);
      id = await spawn();
      await drawn(P, id);
      if (walk) await watch(P, id, 30, { kind: 'walk', steps: 30, dx: 1.2 * walk[0], dy: 1.2 * walk[1] });
      await P.page.waitForTimeout(600);
      const fr = await P.page.evaluate(([mid, big]) => new Promise((resolve) => {
        const m = window.__qaSE.list.find((x) => x.id === mid);
        const out = [];
        window.__btDeathBig = big;
        m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
        const from = Date.now();
        const step = () => {
          const s = window.__btMonsterSprite(mid), d = window.__btMonsterDeath ? window.__btMonsterDeath(mid) : null, w = window.__btStormSparks();
          out.push(s ? { t: Date.now() - from, ix: s.ix, n: s.n, sx: s.sx, vis: s.visible, cut: !!(d && d.kind && d.kind !== 'normal'), eyes: w.live.eyes } : { t: Date.now() - from, gone: true, eyes: w.live.eyes });
          if (Date.now() - from > 3200) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, big]);
      const dead = fr.filter((f) => !f.gone && f.n === 12 && f.vis);
      const seen = uniq(dead.map((f) => f.ix));
      /* (this box draws a few frames a second: not every frame is seen) */
      rec.ok(`6. ${label}: it plays its own death -- the 12-frame strip, in order, to its last frame, unmirrored`,
        dead.length > 0 && dead.every((f, i) => i === 0 || f.ix >= dead[i - 1].ix) && Math.max(...seen) === 11 && seen.length >= 3 && dead.every((f) => f.sx > 0), { seen, frames: dead.length });
      rec.ok('6. ...never a cut or a zone death in its place, and its arcs stop with it', fr.every((f) => !f.cut) && fr.slice(2).every((f) => f.eyes === 0), fr.filter((f) => f.cut || f.eyes).slice(0, 3));
      rec.ok('6. ...and then it is gone', !!fr[fr.length - 1].gone || fr[fr.length - 1].vis === false, fr[fr.length - 1]);
      if (label === 'an ordinary kill') {
        await release(P); await P.page.waitForTimeout(300);
        id = await spawn(); await drawn(P, id); await P.page.waitForTimeout(600);
        await P.page.evaluate((mid) => { const m = window.__qaSE.list.find((x) => x.id === mid); m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000; }, id);
        for (const want of [2, 5, 7, 9]) {
          const t0 = Date.now();
          while (Date.now() - t0 < 3000) { const s = await sprite(P, id); if (!s || (s.n === 12 && s.ix >= want)) break; await P.page.waitForTimeout(15); }
          await shot(id, `4-death-${String(want).padStart(2, '0')}`);
        }
      }
    }
    await release(P);
    }

    /* ── 8. the Electric Foundry's own: the worker's monsters, walked out to ── */
    {
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.thunder.points[0];
      /* past Mayor Bro's first quest: a new character is turned back at a
         land's edge ("Speak to Mayor Bro first") */
      await H.devOp(wsPort, 'tour', me, { at: 'smith_1' }).catch(() => {});
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.hopTo(P, at[0] - 160, at[1] - 160, { tries: 200 });
      await P.page.waitForTimeout(3000);
      const read = () => P.page.evaluate(() => {
        const S = window._gameState.current;
        return (S.monsters || []).filter((m) => m.home === 'thunder' && m.alive !== false).map((m) => {
          const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
          return { id: m.id, arch: m.archetype || m.type, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)),
            s: sp ? { vis: sp.visible, alive: sp.texAlive, n: sp.n, name: sp.plate && sp.plate.name } : null };
        }).sort((a, b) => a.d - b.d);
      });
      let real = await read();
      const t0 = Date.now();
      while (Date.now() - t0 < 30000 && !real.some((m) => m.s && m.s.vis)) { await P.page.waitForTimeout(1000); real = await read(); }
      const seen = real.filter((m) => m.s && m.s.vis);
      rec.ok(`8. in the Electric Foundry the worker's own monsters are the eye: ${seen.length} drawn from its strips, named "Storm Eye", none a slime`,
        seen.length >= 1 && real.every((m) => m.arch === 'stormEye') && seen.every((m) => m.s.alive && m.s.n === 5 && m.s.name === 'Storm Eye'), real.slice(0, 6));
      const art = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
      rec.ok('8. ...its look loaded as you walked to it, as every land\'s is (the preloading law)', !!art && art.looks.stormEye === 'ready', art);
      await P.page.screenshot({ path: `${OUT}/5-foundry.png` }).catch(() => {});
      if (seen[0]) {
        const m0 = await P.page.evaluate((mid) => { const m = (window._gameState.current.monsters || []).find((x) => x.id === mid); return m ? { x: m.x, y: m.y } : null; }, seen[0].id);
        if (m0) await H.hopTo(P, m0.x - 110, m0.y - 60, { tries: 30 });
      }
      /* it spits: a ball in its lightning's pale blue, arcs round it */
      const spit = await P.page.evaluate(() => new Promise((resolve) => {
        const from = Date.now();
        const out = { shot: null, ball: false, zap: false, eyes: 0 };
        const step = () => {
          const w = window.__btStormSparks(), ms = window.__btMonsterShots ? window.__btMonsterShots() : null;
          out.eyes = Math.max(out.eyes, w.live.eyes);
          if (w.live.shots > 0) out.ball = true;
          if (w.live.zaps > 0) out.zap = true;
          const flying = ms && (ms.flying || ms.shots || []);
          if (flying && flying.length && !out.shot) out.shot = flying[0];
          if ((out.ball && out.zap && out.shot) || Date.now() - from > 60000) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }));
      rec.ok('8. ...one spits at you: lightning off it as it lets go, and the ball it throws has arcs round it', spit.ball && spit.zap && spit.eyes >= 1, spit);
      rec.ok('8. ...the ball in the pale blue of its lightning (0x9fe3ff), the slime\'s glob', !!spit.shot && (spit.shot.tint === 0x9fe3ff || spit.shot.color === 0x9fe3ff), spit.shot);
      await P.page.screenshot({ path: `${OUT}/6-foundry-fight.png` }).catch(() => {});
    }

    rec.ok('7. no page error', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
