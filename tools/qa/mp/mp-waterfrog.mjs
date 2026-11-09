/* ═══ v2.3.4355: THE WATER FROG, IN THE WORLD ═══
 *
 * The owner, 2026-11-09: "I added new monster (water frog) on GitHub. It
 * included videos of 5 directions: idle, attack, movement, and death
 * animation (only South). Can you cut it into the right amount of frames to
 * make it look smooth and wire it into the game? I want to replace the fish
 * man monster."
 *
 * A phone in the world (BroTown's commons), a Water Caves monster held beside
 * it -- the page's own, as mp-deathzones holds its -- and the frog read off
 * the renderer's own probe (window.__btMonsterSprite: which frame of how many,
 * mirrored or not), by the renderer's frames and never a test's clock
 * (TRAPS §200):
 *
 *   1. the Water Caves' monster is drawn from the frog's strips (256 px
 *      cells, cropped), not the old fishman's one still;
 *   2. standing still it breathes: the 8 frames of its idle strip, looping;
 *   3. walked each of the eight ways it faces that way -- five drawn sides,
 *      three mirrored -- on the 12 frames of its hop (the two sides with no
 *      video, north and north-east / -west: their 8);
 *   4. a hop that is interrupted is played out to its landing, never held in
 *      the air, and then it breathes;
 *   5. a swing's wind-up (the worker's monster_ability) plays the 12 wind-up
 *      frames over the warning, the blow on its last frame, then the 3 of
 *      recovery; a special's warning (the slam) plays it too;
 *   6. killed, it plays its own death -- all 20 frames, facing you, unmirrored
 *      -- on every kill, a big blow included, never a cut one, and is gone;
 *   7. its feet stay where they were when the death starts (deathOffsetY);
 *   8. the bog lurker still wears the old fishman's still picture;
 *   9. leaving nothing behind: no page error;
 *  10. and out in the Water Caves themselves the worker's own monsters are
 *      the frog, named "Water Frog", their look loaded on the walk there;
 *      one hops over and swings at you.
 *
 * Pictures for the owner's eyes: tools/qa/mp/out/waterfrog/.
 *
 *   node tools/qa/mp/run.mjs waterfrog
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { MONSTER_VARIANTS } from '../../../src/data/monsterVariants.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/waterfrog`;
const DEATH_Y = MONSTER_VARIANTS.fishman.deathOffsetY;

/* the page's own monsters, re-asserted every frame (the worker's set aside) */
const hold = (P, specs) => P.page.evaluate((specs) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaWF || (window.__qaWF = { list: [], keep: S.monsters, server: S._serverMonsters, loop: false });
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const out = [];
  q.list = [];
  for (const sp of specs) {
    const m = F.createMonster(sp.id, 'brute', 2, S.player.x + sp.dx, S.player.y + sp.dy, null);
    if (!m) return { err: 'no monster' };
    m.archetype = sp.variant; m.type = sp.variant;
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
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
      for (const m of q.list) { m.vx = 0; m.vy = 0; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return { ids: out };
}, specs);

const release = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, q = window.__qaWF;
  if (!q) return;
  q.loop = false;
  S.monsters = q.keep || [];
  S._serverMonsters = q.server;
  window.__qaWF = null;
  delete window.__btDeathKind; delete window.__btDeathBig;
});

const sprite = (P, id) => P.page.evaluate((mid) => (window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null), id);

/* every frame the renderer drew over `frames` of its own frames (or until
   `until` says stop): [{ ix, n, sx, y, idle }], with something done first */
const watch = (P, id, frames, act, until) => P.page.evaluate(([mid, frames, act, until]) => new Promise((resolve) => {
  const m = window.__qaWF.list.find((x) => x.id === mid);
  const S = window._gameState.current;
  const out = [];
  let n = 0;
  /* eslint-disable-next-line no-new-func */
  const stop = until ? new Function('s', 'm', 'out', `return (${until});`) : null;
  if (act && act.kind === 'ability') window.__btDispatch({ type: 'monster_ability', payload: Object.assign({ monsterId: mid, zone: S.currentZone }, act.payload) });
  if (act && act.kind === 'kill') {
    if (act.big != null) window.__btDeathBig = act.big;
    m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
  }
  const step = () => {
    if (act && act.kind === 'walk' && n < act.steps) { m.x += act.dx; m.y += act.dy; m.renderX = m.x; m.renderY = m.y; }
    const s = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
    if (s) out.push({ ix: s.ix, n: s.n, sx: s.sx, sy: s.sy, y: s.y, size: s.size, idle: s.idlePose, vis: s.visible, facing: s.facing, top: s.bounds && s.bounds.top, bottom: s.bounds && s.bounds.bottom });
    else out.push(null);
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
  const P = await H.newPlayer(browser, { name: 'Frogger', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
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

    /* WF_FROM=caves: only the Water Caves' own (10), a quicker look */
    const cavesOnly = process.env.WF_FROM === 'caves';
    if (!cavesOnly) {
    /* ── 1. the frog's strips ── */
    const spawn = async (variant, dx = 80, dy = 10) => {
      const h = await hold(P, [{ id: `wf-${variant}-${Date.now()}`, variant, dx, dy }]);
      return h.ids ? h.ids[0] : null;
    };
    let id = await spawn('fishman');
    const first = await drawn(P, id);
    const strips = await P.page.evaluate(() => (window.__btStripTrim ? window.__btStripTrim().filter((s) => s.bundle === 'waterFrog').map((s) => s.url.replace(/\?.*$/, '').split('/').pop()) : null));
    rec.ok('1. the Water Caves\' monster is drawn, its look loaded as a monster of the world\'s is (guard)', !!(first && first.visible && first.texAlive), first);
    rec.ok('1. ...from the frog\'s 16 strips: an idle, a hop and an attack for five sides, and the death',
      !!(strips && strips.length === 16 && ['idle', 'hop', 'attack'].every((k) => ['s', 'sw', 'e', 'n', 'ne'].every((d) => strips.indexOf(`${k}-${d}.png`) >= 0)) && strips.indexOf('death.png') >= 0), strips);
    rec.ok('1. ...256 px cells, cropped to the art', !!(first && first.texW === 256 && first.trimmed), first && { texW: first.texW, trimmed: first.trimmed });
    await P.page.waitForTimeout(900);

    /* ── 2. the breath ── */
    const breath = live(await watch(P, id, 400, null, 'out.length > 20 && new Set(out.filter(Boolean).map((f) => f.ix)).size >= 8'));
    rec.ok('2. standing still it breathes: all 8 frames of its idle strip, not one held frame',
      breath.length > 0 && breath.every((f) => f.n === 8 && !f.idle) && uniq(breath.map((f) => f.ix)).length === 8, { n: uniq(breath.map((f) => f.n)), seen: uniq(breath.map((f) => f.ix)).sort((a, b) => a - b), frames: breath.length });
    await shot(id, '1-idle-south');

    /* ── 3. the eight ways ── */
    const WAYS = [
      ['south', 0, 1, 12, false], ['southwest', -1, 1, 12, false], ['west', -1, 0, 12, true], ['northwest', -1, -1, 8, true],
      ['north', 0, -1, 8, false], ['northeast', 1, -1, 8, false], ['east', 1, 0, 12, false], ['southeast', 1, 1, 12, true],
    ];
    for (const [facing, ux, uy, n, mirror] of WAYS) {
      const k = Math.hypot(ux, uy);
      const fr = live(await watch(P, id, 60, { kind: 'walk', steps: 60, dx: 1.2 * ux / k, dy: 1.2 * uy / k }));
      const tail = fr.slice(Math.floor(fr.length / 3));
      rec.ok(`3. walked ${facing}: it faces ${facing}, ${mirror ? 'mirrored' : 'as drawn'}, on its ${n}-frame hop`,
        tail.length > 0 && tail.every((f) => f.facing === facing && f.n === n && (f.sx < 0) === mirror) && uniq(tail.map((f) => f.ix)).length >= Math.min(n, 6),
        { facing: uniq(tail.map((f) => f.facing)), n: uniq(tail.map((f) => f.n)), mirrored: uniq(tail.map((f) => f.sx < 0)), seen: uniq(tail.map((f) => f.ix)).length });
      /* a picture of it in the air, this way */
      await watch(P, id, 200, { kind: 'walk', steps: 200, dx: 1.2 * ux / k, dy: 1.2 * uy / k }, `s.n === ${n} && s.ix === ${Math.floor(n * 0.45)}`);
      await shot(id, `2-hop-${facing}`);
    }

    /* ── 4. a hop is finished, then the breath ── */
    {
      /* walk south until it is in the air, and stop there */
      await watch(P, id, 300, { kind: 'walk', steps: 300, dx: 0, dy: 1.2 }, 's.n === 12 && s.ix === 5');
      const fr = live(await watch(P, id, 600, null, 's.n === 8 && out.length > 4'));
      /* (this box draws a few frames a second, so not every frame is seen:
         in order, on to the hop's last third, and then the breath) */
      const hop = fr.filter((f) => f.n === 12).map((f) => f.ix);
      const rising = hop.every((v, i) => i === 0 || v >= hop[i - 1] || v === 0);
      rec.ok('4. stopped in the air, it plays the hop out to its landing (its frames in order to the end), never held there, and then breathes',
        hop.length > 0 && rising && Math.max(...hop) >= 8 && uniq(hop.filter((v) => v !== 0)).length >= 2 && fr[fr.length - 1].n === 8, { hop: uniq(hop), last: fr[fr.length - 1] });
    }

    /* ── 5. the wind-up, the blow, the recovery ── */
    for (const [label, payload, ms] of [['a swing', { ability: 'swing', phase: 'windup', ms: 2400 }, 2400], ['the slam', { ability: 'slam', phase: 'telegraph', ms: 2400, radius: 88 }, 2400]]) {
      const t0 = await P.page.evaluate(() => Date.now());
      const fr = await P.page.evaluate(([mid, payload, ms]) => new Promise((resolve) => {
        const S = window._gameState.current;
        const out = [];
        const from = Date.now();
        window.__btDispatch({ type: 'monster_ability', payload: Object.assign({ monsterId: mid, zone: S.currentZone, x: S.player.x, y: S.player.y, ax: S.player.x, ay: S.player.y }, payload) });
        const step = () => {
          const s = window.__btMonsterSprite(mid), t = Date.now() - from;
          if (s) out.push({ t, ix: s.ix, n: s.n });
          if (t > ms + 600) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, payload, ms]);
      const atk = fr.filter((f) => f.n === 15);
      const wind = atk.filter((f) => f.t < ms), rec3 = atk.filter((f) => f.t >= ms);
      const inOrder = atk.every((f, i) => i === 0 || f.ix >= atk[i - 1].ix);
      /* (the arithmetic of it, frame by frame, is the water-frog suite's;
         here: the real event starts it, and what is drawn follows the rule
         at whatever pace this box draws) */
      rec.ok(`5. ${label}'s warning: the wind-up frames spread over it, in order, never a recovery frame before the blow`,
        wind.length > 0 && inOrder && wind.every((f) => f.ix <= 11) && uniq(wind.map((f) => f.ix)).length >= 3, { wind: wind.map((f) => [f.t, f.ix]) });
      const last = wind[wind.length - 1];
      rec.ok(`5. ...the blow's frames on screen as the warning ends (frame ${last && last.ix} at ${last && last.t} of ${ms} ms)`, !!last && last.ix >= 7, last);
      rec.ok(`5. ...then only the recovery (frames 12-14), and back to its breath`,
        rec3.every((f) => f.ix >= 12) && fr[fr.length - 1].n === 8, { rec: rec3.map((f) => [f.t, f.ix]), last: fr[fr.length - 1] });
      if (label === 'a swing') {
        await watch(P, id, 300, { kind: 'ability', payload: { ability: 'swing', phase: 'windup', ms: 3000 } }, 's.n === 15 && s.ix >= 9');
        await shot(id, '3-attack-south');
        await P.page.waitForTimeout(3600);
      }
      void t0;
    }
    /* ...and from the side and the front-left (pictures) */
    for (const [facing, ux, uy] of [['east', 1, 0], ['southwest', -1, 1]]) {
      await watch(P, id, 40, { kind: 'walk', steps: 40, dx: 1.2 * ux, dy: 1.2 * uy });
      await P.page.waitForTimeout(1200);
      await shot(id, `1-idle-${facing}`);
      await watch(P, id, 300, { kind: 'ability', payload: { ability: 'swing', phase: 'windup', ms: 3000 } }, 's.n === 15 && s.ix >= 10');
      await shot(id, `3-attack-${facing}`);
      await P.page.waitForTimeout(3600);
    }

    /* ── 6-7. the death ── */
    for (const [label, big, facingWalk] of [['an ordinary kill', false, null], ['a big blow', true, [-1, 0]], ['a third kill', false, [1, -1]]]) {
      await release(P);
      await P.page.waitForTimeout(300);
      id = await spawn('fishman');
      await drawn(P, id);
      if (facingWalk) await watch(P, id, 40, { kind: 'walk', steps: 40, dx: 1.2 * facingWalk[0], dy: 1.2 * facingWalk[1] });
      await P.page.waitForTimeout(1000);
      const before = await sprite(P, id);
      const fr = await P.page.evaluate(([mid, big]) => new Promise((resolve) => {
        const m = window.__qaWF.list.find((x) => x.id === mid);
        const out = [];
        window.__btDeathBig = big;
        m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000;
        const from = Date.now();
        const step = () => {
          const s = window.__btMonsterSprite(mid), d = window.__btMonsterDeath ? window.__btMonsterDeath(mid) : null;
          out.push(s ? { t: Date.now() - from, ix: s.ix, n: s.n, sx: s.sx, y: s.y, size: s.size, vis: s.visible, cut: !!(d && d.kind && d.kind !== 'normal') } : { t: Date.now() - from, gone: true });
          if (Date.now() - from > 4200) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, big]);
      const dead = fr.filter((f) => !f.gone && f.n === 20 && f.vis);
      const seen = uniq(dead.map((f) => f.ix));
      rec.ok(`6. ${label}: it plays its own death -- the 20-frame strip, in order, to its last frame, unmirrored`,
        dead.length > 0 && dead.every((f, i) => i === 0 || f.ix >= dead[i - 1].ix) && Math.max(...seen) === 19 && seen.length >= 10 && dead.every((f) => f.sx > 0),
        { seen, frames: dead.length, facingBefore: before && before.facing });
      rec.ok(`6. ...never a cut or a zone death in its place`, fr.every((f) => !f.cut), fr.filter((f) => f.cut).slice(0, 2));
      rec.ok(`7. ...its feet where they were: the strip hangs ${DEATH_Y} lower, in its cell's own measure (deathOffsetY)`,
        dead.length > 0 && dead.every((f) => Math.abs((f.y - f.size) - DEATH_Y) < 0.01), dead[0] && { y: dead[0].y, size: dead[0].size });
      rec.ok(`6. ...and then it is gone`, !!fr[fr.length - 1].gone || fr[fr.length - 1].vis === false, fr[fr.length - 1]);
      if (label === 'an ordinary kill') {
        /* pictures of it, a fresh one killed slowly */
        await release(P); await P.page.waitForTimeout(300);
        id = await spawn('fishman'); await drawn(P, id); await P.page.waitForTimeout(700);
        await P.page.evaluate((mid) => { const m = window.__qaWF.list.find((x) => x.id === mid); m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000; }, id);
        for (const want of [2, 6, 9, 11, 14, 19]) {
          const t0 = Date.now();
          while (Date.now() - t0 < 4000) { const s = await sprite(P, id); if (!s || (s.n === 20 && s.ix >= want)) break; await P.page.waitForTimeout(15); }
          await shot(id, `4-death-${String(want).padStart(2, '0')}`);
        }
      }
    }

    /* ── 8. the bog lurker keeps the old picture ── */
    await release(P);
    await P.page.waitForTimeout(300);
    const lurk = await spawn('bogLurker');
    const ls = await drawn(P, lurk);
    await P.page.waitForTimeout(600);
    const lfr = live(await watch(P, lurk, 40, { kind: 'walk', steps: 40, dx: 1.2, dy: 0 }));
    rec.ok('8. the bog lurker still wears the old fishman\'s one still picture a side (its own now)',
      !!(ls && ls.visible) && lfr.length > 0 && lfr.every((f) => f.n === 1), { n: uniq(lfr.map((f) => f.n)), first: ls && { visible: ls.visible, tint: ls.tint } });
    await shot(lurk, '5-bog-lurker');
    await release(P);
    }

    /* ── 10. the Water Caves' own: the worker's monsters, walked out to ── */
    {
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.tidal.points[0];
      /* past Mayor Bro's first quest: a new character is turned back at a
         land's edge ("Speak to Mayor Bro first") */
      await H.devOp(wsPort, 'tour', me, { at: 'smith_1' }).catch(() => {});
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await P.page.waitForTimeout(1500);
      await H.hopTo(P, at[0] + 160, at[1] + 160, { tries: 200 });
      await P.page.waitForTimeout(3000);
      const read = () => P.page.evaluate(() => {
        const S = window._gameState.current;
        return (S.monsters || []).filter((m) => m.home === 'tidal' && m.alive !== false).map((m) => {
          const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
          return { id: m.id, arch: m.archetype || m.type, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)),
            s: sp ? { vis: sp.visible, alive: sp.texAlive, n: sp.n, name: sp.plate && sp.plate.name } : null };
        }).sort((a, b) => a.d - b.d);
      });
      let real = await read();
      const t0 = Date.now();
      while (Date.now() - t0 < 30000 && !real.some((m) => m.s && m.s.vis)) { await P.page.waitForTimeout(1000); real = await read(); }
      const seen = real.filter((m) => m.s && m.s.vis);
      rec.ok(`10. in the Water Caves the worker's own monsters are the frog: ${seen.length} drawn near you from its strips, named "Water Frog"`,
        seen.length >= 1 && seen.every((m) => m.arch === 'fishman' && m.s.alive && [1, 8, 9, 12, 15].indexOf(m.s.n) >= 0 && m.s.name === 'Water Frog'), real.slice(0, 6));
      const art = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
      rec.ok('10. ...its look loaded as you walked to it, as every land\'s is (the preloading law)', !!art && art.looks.fishman === 'ready', art);
      await P.page.screenshot({ path: `${OUT}/6-water-caves.png` }).catch(() => {});
      /* stand among them: one comes for you and swings (you are untouchable) */
      if (seen[0]) {
        const m0 = await P.page.evaluate((id) => { const m = (window._gameState.current.monsters || []).find((x) => x.id === id); return m ? { x: m.x, y: m.y } : null; }, seen[0].id);
        if (m0) await H.hopTo(P, m0.x + 50, m0.y + 30, { tries: 30 });
      }
      const swung = await P.page.evaluate(() => new Promise((resolve) => {
        const S = window._gameState.current, from = Date.now();
        const out = { hop: false, atk: false, idle: false };
        const step = () => {
          for (const m of S.monsters || []) {
            if (m.home !== 'tidal') continue;
            const sp = window.__btMonsterSprite(m.id);
            if (!sp || !sp.visible) continue;
            if (sp.n === 15 || sp.n === 9) out.atk = true;
            if (sp.n === 12 || (sp.n === 8 && sp.ix > 0 && !sp.idlePose && m._lastPosChangeAt && Date.now() - m._lastPosChangeAt < 300)) out.hop = true;
            if (sp.n === 8 || sp.n === 1) out.idle = true;
          }
          if ((out.atk && out.hop) || Date.now() - from > 60000) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }));
      rec.ok('10. ...one hops over to you and swings: the worker\'s own moves and wind-ups play the hop and the attack strip', swung.hop && swung.atk, swung);
      await P.page.screenshot({ path: `${OUT}/7-water-caves-fight.png` }).catch(() => {});
    }

    rec.ok('9. no page error', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
