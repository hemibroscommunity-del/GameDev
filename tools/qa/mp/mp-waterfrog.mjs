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
 *      three mirrored -- on the 12 frames of its hop (from behind, the side
 *      with no video: its 8);
 *   4. a hop that is interrupted is played out to its landing, never held in
 *      the air, and then it breathes;
 *   5. a swing's wind-up (the worker's monster_ability) plays the 12 wind-up
 *      frames over the warning, the blow on its last frame, then the 3 of
 *      recovery; a special's warning (the slam) plays it too; and as each
 *      warning ends its water is drawn in code -- a spray the way it faces,
 *      a ring for the slam -- once, and gone again;
 *   6. killed, it plays its own death -- all 20 frames, facing you, unmirrored
 *      -- on every kill, a big blow included, never a cut one, and is gone;
 *   7. its feet stay where they were when the death starts (deathOffsetY);
 *   8. (the bog lurker, which kept the old picture, is mp-rotcap's now);
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
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONSTER_VARIANTS } from '../../../src/data/monsterVariants.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/waterfrog`;
const DEATH_Y = MONSTER_VARIANTS.fishman.deathOffsetY;
const DEATH_MS = MONSTER_VARIANTS.fishman.deathMs;   /* v2.3.4362: 570, three times as fast as first cut */
/* the most frames of a death's strip one drawn frame may skip (the renderer's own) */
const BURST_MAX_SKIP = Number((/const BURST_MAX_SKIP = (\d+);/.exec(readFileSync(join(H.REPO, 'src/rendering/systems/entityRenderer.js'), 'utf8')) || [])[1]) || 2;
const WIND_SHARE = MONSTER_VARIANTS.fishman.attackWindShare;   /* v2.3.4362: 0.5, the wind-up over the last half of a warning */

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
  /* its water in flight.  A blow is over in half a second and a picture
     takes this box longer than that to take, so: slow motion (the client's
     own QA switch, window.__btBlowFxRate), a short warning of its own, wait
     by the page's frames until this frog's water is a third of the way out,
     the picture, and the clock put back */
  const waterShot = async (id, name, payload) => {
    await P.page.evaluate(([mid, payload]) => new Promise((resolve) => {
      const S = window._gameState.current;
      window.__btBlowFxRate = 0.02;
      window.__btDispatch({ type: 'monster_ability', payload: Object.assign({ monsterId: mid, zone: S.currentZone, x: S.player.x, y: S.player.y, ax: S.player.x, ay: S.player.y }, payload) });
      let n = 0;
      const step = () => {
        const w = window.__btWaterAttack ? window.__btWaterAttack() : null;
        const b = w && w.live.find((x) => x.id === mid);
        if ((b && b.age >= 150) || ++n > 2400) resolve(!!b); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), [id, payload]);
    const b = await boxOf(P, id);
    if (b) await P.page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: Math.max(0, b.x - 40), y: Math.max(0, b.y - 20), width: 340, height: 300 } }).catch(() => {});
    await P.page.evaluate(() => { window.__btBlowFxRate = 1; });
    await P.page.waitForTimeout(900);
  };
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(2500);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
    await P.page.waitForTimeout(600);

    /* v2.3.4361: THE WATER'S SPRITES ARE THE FROG'S.  In BroTown with no frog
       near, none are held (128 of them were, in every land: the memory
       check's heap line); they come with its look and go with it. */
    const poolNow = () => P.page.evaluate(() => { const w = window.__btWaterAttack ? window.__btWaterAttack() : null; return w ? { pool: w.pool, wanted: w.wanted, made: w.made } : null; });
    const poolWhen = async (want, ms = 8000) => { let v = null; for (const t0 = Date.now(); Date.now() - t0 < ms;) { v = await poolNow(); if (v && v.pool === want) break; await P.page.waitForTimeout(200); } return v; };
    {
      const p0 = await poolNow();
      rec.ok('0. in BroTown with no frog near, no water sprites are held: the picture they are cut from is made (the loading screen), the pool is not',
        !!p0 && p0.pool === 0 && p0.wanted === false && p0.made === true, p0);
    }

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
    {
      const p1 = await poolWhen(128);
      rec.ok('1. ...and with its look came its water\'s sprites: the pool of 128, made as the look loads, before any blow', !!p1 && p1.pool === 128 && p1.wanted === true, p1);
    }
    rec.ok('1. ...from the frog\'s 15 strips: an idle and an attack for five sides, a hop for four, and the death',
      !!(strips && strips.length === 15 && ['idle', 'attack'].every((k) => ['s', 'sw', 'e', 'n', 'ne'].every((d) => strips.indexOf(`${k}-${d}.png`) >= 0))
        && ['s', 'sw', 'n', 'ne'].every((d) => strips.indexOf(`hop-${d}.png`) >= 0) && strips.indexOf('death.png') >= 0), strips);
    rec.ok('1. ...256 px cells, cropped to the art', !!(first && first.texW === 256 && first.trimmed), first && { texW: first.texW, trimmed: first.trimmed });
    /* what the look costs while you are near it (zoneTextures' own count of
       each packed strip): measured at 21.9 MB (v2.3.4355), held to 24, where
       it would be 41.5 uncropped -- about the fire goblin's, the other look
       with strips for all it does */
    const mem = await P.page.evaluate(() => { const st = window.__btStripTrim().filter((x) => x.bundle === 'waterFrog'); return { packed: st.reduce((a, x) => a + x.packedBytes, 0), full: st.reduce((a, x) => a + x.fullBytes, 0), n: st.length, numbers: st.filter((x) => x.numbers).length }; });
    /* v2.3.4359: ...and held as COLOUR NUMBERS, a byte a pixel -- a quarter of
       that -- every strip of it: they share one list of 256 colours
       (tools/art/strip256.mjs --shared; src/rendering/picsNumbers.js) */
    rec.ok(`1. ...every one of its ${mem.n} strips held as colour numbers, a byte a pixel: ${(mem.packed / 4 / 1048576).toFixed(1)} MB on the graphics chip, not ${(mem.packed / 1048576).toFixed(1)}`,
      mem.n === 15 && mem.numbers === mem.n, mem);
    rec.ok(`1. ...${(mem.packed / 1048576).toFixed(1)} MB of pictures once cropped (${(mem.full / 1048576).toFixed(1)} MB uncropped): under 24 MB`, mem.packed > 0 && mem.packed < 24 * 1048576, mem);
    await P.page.waitForTimeout(900);

    /* WF_FROM=death: the strips' guard (1), then straight to the deaths (6-7)
       and the Water Caves (10) -- a quicker look at the death's pace */
    if (process.env.WF_FROM !== 'death') {
    /* ── 2. the breath ── */
    const breath = live(await watch(P, id, 400, null, 'out.length > 20 && new Set(out.filter(Boolean).map((f) => f.ix)).size >= 8'));
    rec.ok('2. standing still it breathes: all 8 frames of its idle strip, not one held frame',
      breath.length > 0 && breath.every((f) => f.n === 8 && !f.idle) && uniq(breath.map((f) => f.ix)).length === 8, { n: uniq(breath.map((f) => f.n)), seen: uniq(breath.map((f) => f.ix)).sort((a, b) => a - b), frames: breath.length });
    await shot(id, '1-idle-south');

    /* ── 3. the eight ways ── */
    const WAYS = [
      ['south', 0, 1, 12, false], ['southwest', -1, 1, 12, false], ['west', -1, 0, 12, true], ['northwest', -1, -1, 12, true],
      ['north', 0, -1, 8, false], ['northeast', 1, -1, 12, false], ['east', 1, 0, 12, false], ['southeast', 1, 1, 12, true],
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
      /* v2.3.4362: the rest of a hop is 7 frames at 28 ms now, a fifth of a
         second -- this box can draw that in one frame or two.  So: in order
         and ending in its breath always; and where the box drew three frames
         of it or more, on to the hop's last third (the frame-by-frame rule
         is the water-frog suite's, `hopFinishPos`) */
      rec.ok(`4. stopped in the air, it plays the hop out to its landing (its frames in order to the end${hop.length >= 3 ? '' : ': this box drew ' + hop.length + ' of them'}), never held there, and then breathes`,
        hop.length > 0 && rising && fr[fr.length - 1].n === 8
        && (hop.length < 3 || (Math.max(...hop) >= 8 && uniq(hop.filter((v) => v !== 0)).length >= 2)), { hop: uniq(hop), last: fr[fr.length - 1] });
    }

    /* ── 5. the wind-up, the blow, the recovery ── */
    for (const [label, payload, ms] of [['a swing', { ability: 'swing', phase: 'windup', ms: 2400 }, 2400], ['the slam', { ability: 'slam', phase: 'telegraph', ms: 2400, radius: 88 }, 2400]]) {
      /* THE BLOW IS DRAWN IF A FRAME SEES IT IN TIME.  The renderer starts a
         blow only on a frame within WATER_FX.LATE_MS (400 ms) of the warning's
         end (one first seen later was off screen: it is not started), and it
         lasts about half a second.  This box can go longer than that between
         two frames; when it did (the frames' own times say so), the warning
         is played again -- up to three times -- and it is that try which is
         held to every check below. */
      let blows0 = 0, fr = [], stalled = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
      blows0 = await P.page.evaluate((mid) => (window.__btWaterAttack ? window.__btWaterAttack().recent.filter((r) => r.id === mid).length : -1), id);
      fr = await P.page.evaluate(([mid, payload, ms]) => new Promise((resolve) => {
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
        const firstAfter = fr.find((f) => f.t >= ms);
        const drew = await P.page.evaluate((mid) => window.__btWaterAttack().recent.filter((r) => r.id === mid).length, id);
        if (drew > blows0 || !(firstAfter && firstAfter.t - ms > 380) || attempt === 2) break;
        stalled++;
        console.log(`    (this box drew no frame for ${firstAfter.t - ms} ms as ${label}'s warning ended: played again)`);
        await P.page.waitForTimeout(1500);
      }
      const atk = fr.filter((f) => f.n === 15);
      const wind = atk.filter((f) => f.t < ms), rec3 = atk.filter((f) => f.t >= ms);
      const inOrder = atk.every((f, i) => i === 0 || f.ix >= atk[i - 1].ix);
      /* (the arithmetic of it, frame by frame, is the water-frog suite's;
         here: the real event starts it, and what is drawn follows the rule
         at whatever pace this box draws) */
      /* v2.3.4362: the wind-up is played over the LAST HALF of the warning
         (twice as fast: the owner).  How many of its frames are seen is this
         box's frame rate; what is held is that every frame drawn is the one
         the rule gives for its own time (to a frame), that none is drawn in
         the first half (it breathes), and never a recovery frame early. */
      const half = ms * WIND_SHARE, from = ms - half;
      const ruled = (f) => Math.max(0, Math.min(11, Math.floor(((f.t - from) / half) * 12)));
      const offRule = wind.filter((f) => Math.abs(f.ix - ruled(f)) > 1);
      const tooSoon = atk.filter((f) => f.t < from - 60);
      rec.ok(`5. ${label}'s warning: it breathes through the first half, then the wind-up frames over the last half, each the frame its own time gives, in order, never a recovery frame before the blow (${wind.length} drawn)`,
        wind.length > 0 && inOrder && wind.every((f) => f.ix <= 11) && offRule.length === 0 && tooSoon.length === 0,
        { wind: wind.map((f) => [f.t, f.ix, ruled(f)]), tooSoon: tooSoon.map((f) => [f.t, f.ix]) });
      const last = wind[wind.length - 1];
      /* (a frame drawn in the wind-up's last two fifths is one of the blow's;
         where this box drew none that late, the rule above has held the one
         it did draw) */
      rec.ok(`5. ...the blow's frames on screen as the warning ends (frame ${last && last.ix} at ${last && last.t} of ${ms} ms)`, !!last && (last.ix >= 7 || ms - last.t > half * 0.42), last);
      rec.ok(`5. ...then only the recovery (frames 12-14), and back to its breath`,
        rec3.every((f) => f.ix >= 12) && fr[fr.length - 1].n === 8, { rec: rec3.map((f) => [f.t, f.ix]), last: fr[fr.length - 1] });
      /* its water, drawn in code as the warning ends (the owner: "I intend
         for you to draw the water attacks in code actually") */
      const wa = await P.page.evaluate((mid) => { const w = window.__btWaterAttack ? window.__btWaterAttack() : null; return w ? { on: w.on, made: w.made, pool: w.pool, mine: w.recent.filter((r) => r.id === mid) } : null; }, id);
      const mine = wa && wa.mine[wa.mine.length - 1];
      const want = label === 'a swing' ? 'spray' : 'ring';
      rec.ok(`5. ...and as it ends its water is drawn in code: ${label === 'a swing' ? 'a spray the way it faces (south)' : 'a ring at the worker\'s radius (88)'}, once${stalled ? ` (the warning played ${stalled + 1} times: this box stalled across the blow)` : ''}`,
        !!wa && wa.on && wa.made && wa.pool === 128 && wa.mine.length === blows0 + 1 && !!mine && mine.kind === want
        && (want === 'ring' ? mine.reach === 88 : (mine.dir[0] === 0 && mine.dir[1] === 1)), wa);
      if (label === 'a swing') {
        await watch(P, id, 300, { kind: 'ability', payload: { ability: 'swing', phase: 'windup', ms: 3000 } }, 's.n === 15 && s.ix >= 9');
        await shot(id, '3-attack-south');
        await P.page.waitForTimeout(1400);
        await waterShot(id, '3-attack-south-water', { ability: 'swing', phase: 'windup', ms: 500 });
      } else {
        await waterShot(id, '3-slam-water', { ability: 'slam', phase: 'telegraph', ms: 500, radius: 88 });
      }
    }
    /* ...and from the side and the front-left (pictures) */
    for (const [facing, ux, uy] of [['east', 1, 0], ['southwest', -1, 1]]) {
      await watch(P, id, 40, { kind: 'walk', steps: 40, dx: 1.2 * ux, dy: 1.2 * uy });
      await P.page.waitForTimeout(1200);
      await shot(id, `1-idle-${facing}`);
      await watch(P, id, 300, { kind: 'ability', payload: { ability: 'swing', phase: 'windup', ms: 3000 } }, 's.n === 15 && s.ix >= 10');
      await shot(id, `3-attack-${facing}`);
      await P.page.waitForTimeout(1400);
      await waterShot(id, `3-attack-${facing}-water`, { ability: 'swing', phase: 'windup', ms: 500 });
    }
    /* no water was drawn anywhere but at a blow: nothing lit now */
    {
      const wa = await P.page.evaluate(() => window.__btWaterAttack());
      rec.ok('5. ...and between blows no water is left on screen', wa.lit === 0 && wa.live.length === 0, { lit: wa.lit });
    }

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
          /* (until it is gone, by what is drawn: a slow box's death is
             stretched -- below -- so no clock says when; 20 s at the most) */
          const last = out[out.length - 1];
          const over = Date.now() - from > 1500 && (last.gone || last.vis === false);
          if (over || Date.now() - from > 20000) resolve(out); else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), [id, big]);
      const dead = fr.filter((f) => !f.gone && f.n === 20 && f.vis);
      const seen = uniq(dead.map((f) => f.ix));
      /* v2.3.4362: the death is 570 ms now (three times as fast: the owner),
         so how many of its 20 frames are SEEN is this box's frame rate; what
         is held is the pace -- by the frames' own times, it is at its last
         frame 570 ms after its first (and one frame of this box's), and not
         before half of that */
      /* THE RENDERER'S OWN CLOCK FOR A DEATH (entityRenderer `_burstStep`,
         v2.3.2491): it advances by the real time between two frames it
         draws, but never by more than BURST_MAX_SKIP frames of the strip --
         so a phone at 30 or 60 frames a second plays the death in its 570
         ms, and a machine drawing slower than that sees every other frame
         of it, stretched, and not a jump to the end.  The same sum here,
         from the frames' own times, says which frame each drawn frame
         should be. */
      const perFrame = DEATH_MS / 20, cap = perFrame * BURST_MAX_SKIP;
      let clock = 0;
      const ruled = dead.map((f, i) => { if (i) clock += Math.min(f.t - dead[i - 1].t, cap); return Math.min(19, Math.floor(clock / perFrame)); });
      const offRule = dead.map((f, i) => [f.t, f.ix, ruled[i]]).filter((r) => Math.abs(r[1] - r[2]) > 1);
      const gap = dead.reduce((a, f, i) => (i ? Math.max(a, f.t - dead[i - 1].t) : a), 0);
      const lastAt = (dead.find((f) => f.ix === 19) || {}).t;
      const t0 = dead.length ? dead[0].t : 0;
      /* (to its last frame -- unless this box is so slow that the renderer
         let the body go first: it holds a death two seconds past its length
         and its start's grace at the most, BURST_MAX_STRETCH_MS) */
      const heldOut = dead.length > 0 && dead[dead.length - 1].t - dead[0].t > DEATH_MS + 2000;
      rec.ok(`6. ${label}: it plays its own death -- the 20-frame strip, in order, ${Math.max(...seen) === 19 ? 'to its last frame' : 'as far as this box drew before the body was let go (frame ' + Math.max(...seen) + ')'}, unmirrored (${seen.length} of its frames seen)`,
        dead.length > 0 && dead.every((f, i) => i === 0 || f.ix >= dead[i - 1].ix) && (Math.max(...seen) === 19 || heldOut) && dead.every((f) => f.sx > 0),
        { seen, frames: dead.length, facingBefore: before && before.facing });
      rec.ok(`6. ...at its pace: ${DEATH_MS} ms a death, each frame drawn the one the renderer's clock gives for its time (here ${lastAt === undefined ? 'the body was let go before its last frame' : 'its last frame came ' + (lastAt - t0) + ' ms in'}: this box's frames are up to ${gap} ms apart, and a death skips ${BURST_MAX_SKIP} frames of its strip at the most)`,
        dead.length > 1 && offRule.length === 0, { offRule: offRule.slice(0, 4), frames: dead.map((f, i) => [f.t - t0, f.ix, ruled[i]]).slice(0, 12) });
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

    /* (8. the bog lurker kept the old fishman picture until v2.3.4357: it is
       the great rotcap now -- mp-rotcap) */
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
