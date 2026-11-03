/* ═══ v2.3.3985: MONSTERS DIE IN PIECES THAT FIT THEM ═══
 *
 * The owner: "Make actual monster death animations", and "Death animation
 * idea label zones for each monster that can apply physics and effects for."
 * Each look's own death comes from its labelled zones (src/data/
 * monsterDeathZones.js, played by src/rendering/monsterDeathZonesFx.js;
 * docs/specs/monster-death-zones.md).
 *
 * One phone (390 x 844) in the world's BroTown; the worker's monsters set
 * aside for the while (as mp-silhouette does) and a monster of the page's
 * own put beside you, of every look with zones -- the slime and the blue one
 * (its recoloured sheets), the snowman, the fire goblin, the skeleton, the
 * mummy, the fishman, the bog lurker, the rock monster and the thorn
 * shambler -- and the snowman and the skeleton again walking east (their
 * side views).  Each is killed with its own death forced
 * (window.__btDeathKind = 'own', the QA override of the roll), in 5x slow
 * motion (window.__btDeathSlow), and:
 *   1. its look is loaded and its living body drawn first (guard);
 *   2. it dies its OWN death, of that look, in that view, in one piece per
 *      zone (at most 8), opening on the beat -- the flash over it -- before
 *      the pieces part;
 *   3. the pieces wear the monster's own colour, never the killing blow's
 *      red, at its own shape (no squash left on the root);
 *   4. the pieces come down and lie still on the ground (a sinking one
 *      under it, as it should);
 *   5. the corpse goes away afterwards, and everything the death made is let
 *      go (window.__btDeathZones: none live, as many let go as made);
 * then:
 *   6. ten slimes killed together: at most 8 own deaths, the rest today's;
 *   7. the same slime, unforced, killed twice at the same spot: the same
 *      death both times (every phone sees the same);
 *   8. `?deathkind=own` on the address plays the own death with no QA
 *      override; `?deathzones=0` turns it off (today's death plays instead);
 *  10. v2.3.3985, THE OWNER'S REFINEMENTS ("premade sections like head,
 *      eyes, arms, torso, legs, etc. that can separate and simulate physics
 *      based on the direction they're hit in"), on a sample of looks (the
 *      snowman, the fire goblin, the skeleton, the rock monster, the fishman
 *      and the slime), each killed by a REAL monster_hit from you through
 *      the game's own handler (window.__btDispatch: game/deathBlow.js writes
 *      the blow down), the monster on your right:
 *        - an ordinary kill (a plain hit) is the gentler collapse, a crit the
 *          explosion: big on the probe, more pieces thrown than the ordinary;
 *        - its eyes are pieces of their own where its face shows;
 *        - the pieces travel AWAY from you: their mean moves right; and with
 *          the monster on your LEFT (two of them), left;
 *        - and every one let go once over;
 *  11. `?deathbig=1` makes an unforced kill the big one (the owner's switch);
 *   9. nothing threw.
 * Pictures for the owner's eyes: tools/qa/mp/out/deathzones/.
 *
 *   node tools/qa/mp/run.mjs deathzones
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { deathZonesFor, MAX_PIECES, MAX_LIVE } from '../../../src/data/monsterDeathZones.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/deathzones`;
/* slow motion (window.__btDeathSlow): this box draws a few frames a second
   and a screenshot stalls it, so a 5x death (mp-deathcut's) could be over
   before the probes had read it (TRAPS §200) */
const SLOW = 12;
const LOOKS = [
  { key: 'slime', arch: 'fodder', variant: null, look: 'slime', zk: 'fodder' },
  { key: 'blueslime', arch: 'fodder', variant: 'blueSlime', look: 'slime', zk: 'blueSlime' },
  { key: 'snowman', arch: 'snowman', variant: null, look: 'snowman', zk: 'snowman' },
  { key: 'goblin', arch: 'fodder', variant: 'fireGoblin', look: 'fireGoblin', zk: 'fireGoblin' },
  { key: 'skeleton', arch: 'fodder', variant: 'skeleton', look: 'skeleton', zk: 'skeleton' },
  { key: 'mummy', arch: 'fodder', variant: 'mummy', look: 'mummy', zk: 'mummy', noTransform: true },
  { key: 'fishman', arch: 'brute', variant: 'fishman', look: 'fishman', zk: 'fishman' },
  { key: 'boglurker', arch: 'brute', variant: 'bogLurker', look: 'bogLurker', zk: 'bogLurker' },
  { key: 'rock', arch: 'brute', variant: 'rockmonster', look: 'rockmonster', zk: 'rockmonster' },
  { key: 'thorn', arch: 'brute', variant: 'thornShambler', look: 'thornShambler', zk: 'thornShambler' },
  { key: 'snowman-east', arch: 'snowman', variant: null, look: 'snowman', zk: 'snowman', east: true },
  { key: 'skeleton-east', arch: 'fodder', variant: 'skeleton', look: 'skeleton', zk: 'skeleton', east: true },
];

/* the page's own monsters, re-asserted every frame (the worker's set aside) */
const hold = (P, specs) => P.page.evaluate((specs) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaDZ || (window.__qaDZ = { list: [], keep: S.monsters, server: S._serverMonsters, loop: false });
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const out = [];
  q.list = [];
  for (const sp of specs) {
    const m = F.createMonster(sp.id, sp.arch, 2, S.player.x + sp.dx, S.player.y + sp.dy, null);
    if (!m) return { err: 'no monster' };
    if (sp.variant) { m.archetype = sp.variant; m.type = sp.variant; }
    m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
    m._transformStart = sp.noTransform ? 1 : 0;
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
  const S = window._gameState.current, q = window.__qaDZ;
  if (!q) return;
  q.loop = false;
  S.monsters = q.keep || [];
  S._serverMonsters = q.server;
  window.__qaDZ = null;
  delete window.__btDeathKind; delete window.__btDeathSlow;
});

/* walk it east a little, so the renderer turns it that way (its side view) */
const walkEast = (P, id) => P.page.evaluate((mid) => new Promise((resolve) => {
  const m = window.__qaDZ.list.find((x) => x.id === mid);
  let n = 0;
  const step = () => {
    m.x += 3; m.renderX = m.x;
    if (++n < 24) requestAnimationFrame(step); else resolve(true);
  };
  requestAnimationFrame(step);
}), id);

const kill = (P, ids, kind, hit) => P.page.evaluate(async ([mids, k, hit]) => {
  if (k) window.__btDeathKind = k; else delete window.__btDeathKind;
  const ms = window.__qaDZ.list.filter((x) => mids.indexOf(x.id) >= 0);
  /* the killing blow lands first -- its red flash and squash on the living
     body for a frame or two, as a real kill's are (mp-deathcut) */
  const t = Date.now();
  for (const m of ms) { m._hitFlash = t + 1e6; m._hitAnimStart = t - 40000; m._hitAnimEnd = t + 60000; }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  /* v2.3.3985: `hit` -- the killing blow as the worker reports it, through
     the game's own monster_hit handler (it writes the blow down) */
  if (hit) {
    const S = window._gameState.current;
    for (const m of ms) window.__btDispatch({ type: 'monster_hit', payload: Object.assign({ monsterId: m.id, zone: S.currentZone, dmg: 7, attackerId: S.myId, slot: 'melee', hpPct: 0 }, hit) });
  }
  for (const m of ms) { m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000; }
  /* watched from the page, frame by frame (by the renderer's own frames, not
     a test's clock: TRAPS §200): the first death each one drew, and whether
     any frame showed the beat's flash */
  const W = window.__dzWatch = window.__dzWatch || {};
  for (const m of ms) W[m.id] = { first: null, flash: false, frames: 0 };
  let n = 0;
  const look = () => {
    for (const m of ms) {
      const w = W[m.id];
      const d = window.__btMonsterDeath ? window.__btMonsterDeath(m.id) : null;
      if (!d || !d.kind) continue;
      w.frames++;
      if (!w.first) w.first = { kind: d.kind, pieces: d.pieces, own: d.own };
      /* v2.3.3985: where its pieces had got to, a second into the death
         (by the death's own clock: the renderer's frames, TRAPS §200) */
      if (d.own && d.own.drift && d.own.t != null && d.own.t >= 1000 && !w.at1s) w.at1s = { drift: d.own.drift, t: d.own.t };
      if (d.own && d.own.flash) w.flash = true;
    }
    if (++n < 400) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
  return true;
}, [ids, kind, hit || null]);

const state = (P, id) => P.page.evaluate((mid) => ({
  d: window.__btMonsterDeath ? window.__btMonsterDeath(mid) : 'no-probe',
  s: window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null,
  z: window.__btDeathZones ? window.__btDeathZones() : null,
}), id);

const boxOf = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current, m = (S.monsters || []).find((x) => x.id === mid);
  if (!m || !S.camera) return null;
  const c = document.querySelector('canvas').getBoundingClientRect();
  const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
  const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 40 - S.camera.y) * ky;
  return { x: Math.max(0, Math.round(cx - 110)), y: Math.max(0, Math.round(cy - 110)), width: 220, height: 170 };
}, id);

/* until its look is in and the living body is drawn (a Wheel monster whose
   look is not ready is not drawn at all) */
async function drawn(P, id, ms = 30000) {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await state(P, id);
    if (s.s && s.s.visible && s.s.texAlive !== false) return s;
    await P.page.waitForTimeout(300);
  }
  return s;
}

async function enter(P, wsPort) {
  await H.enterWorld(P);
  await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.waitForTimeout(600);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Reaper', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 20000);
  try {
    await enter(P, wsPort);

    /* ── 1-5. every look's own death ── */
    /* DZ_LOOKS=snowman,rock: only those (a quicker look at one) */
    const only = (process.env.DZ_LOOKS || '').split(',').filter(Boolean);
    for (const L of LOOKS.filter((x) => !only.length || only.indexOf(x.key) >= 0)) {
      const zones = deathZonesFor(L.zk, L.east ? 'east' : 'south');
      const view = L.east ? 'side' : 'front';
      const h = await hold(P, [{ id: `dz-${L.key}-${Date.now()}`, arch: L.arch, variant: L.variant, dx: L.east ? -40 : 70, dy: 6, noTransform: L.noTransform }]);
      if (h.err) { rec.ok(`${L.key}: spawned (guard)`, false, h); continue; }
      const mid = h.ids[0];
      const alive = await drawn(P, mid);
      rec.ok(`1. ${L.key}: its look loaded and its living body drawn first (guard)`, !!(alive && alive.s && alive.s.visible), alive && alive.s);
      if (!(alive && alive.s && alive.s.visible)) { await release(P); continue; }
      if (L.east) { await walkEast(P, mid); await P.page.waitForTimeout(500); }
      const box = await boxOf(P, mid);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-0-alive.png`, clip: box }).catch(() => {});
      await P.page.evaluate((k) => { window.__btDeathSlow = k; }, SLOW);
      await kill(P, [mid], 'own');
      const t0 = Date.now();
      const at = async (simMs) => { const w = t0 + simMs * SLOW - Date.now(); if (w > 0) await P.page.waitForTimeout(w); };
      /* the first dead frame, and the beat (the page's watcher) */
      await at(150);
      const w0 = await P.page.evaluate((id) => (window.__dzWatch || {})[id] || null, mid);
      const d0 = w0 && w0.first, sawFlash = !!(w0 && w0.flash);
      rec.ok(`2. ${L.key}: dies its own death -- ${L.look}'s, ${view} view, a piece a zone (${zones.length})`,
        !!(d0 && d0.kind === 'own' && d0.own && d0.own.look === L.zk && d0.own.view === view
          && d0.pieces >= Math.max(1, zones.length - 1) && d0.pieces <= Math.min(MAX_PIECES, zones.length)), d0 && { kind: d0.kind, pieces: d0.pieces, own: d0.own });
      rec.ok(`2. ${L.key}: ...opening on the beat (the flash over it) before the pieces part`, sawFlash, d0 && d0.own);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-1-beat.png`, clip: box }).catch(() => {});
      await at(420);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-2-parting.png`, clip: box }).catch(() => {});
      const mid1 = await state(P, mid);
      const d1 = mid1.d;
      if (!d1 && process.env.DZ_DEBUG) {
        console.log('DEBUG', JSON.stringify(await P.page.evaluate((id) => {
          const S = window._gameState.current;
          return { zone: S.currentZone, server: S._serverMonsters, mons: (S.monsters || []).map((m) => [m.id, m.alive, m._slimeDeathStart, m._snowmanDeathStart, m.respawnAt]),
            q: window.__qaDZ && window.__qaDZ.list.length, spr: window.__btMonsterSprite(id), z: window.__btDeathZones() };
        }, mid)), P.logs.slice(-8));
      }
      rec.ok(`3. ${L.key}: the pieces wear its own colour, never the blow's red, at its own shape (no squash left)`,
        !!(d1 && Array.isArray(d1.tints) && d1.tints.every((t) => t != null && t !== 0xff8080)
          && Array.isArray(d1.scale) && Math.abs(Math.abs(d1.scale[0]) - Math.abs(d1.scale[1])) < 1e-3
          && d1.own && d1.own.parted && !d1.own.flash && d1.own.bodyScale && d1.own.bodyScale[0] === 1 && d1.own.bodyScale[1] === 1),
        d1 && { tints: d1.tints, scale: d1.scale, own: d1.own });
      await at(800);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-3-down.png`, clip: box }).catch(() => {});
      await at(1250);
      let settled = await state(P, mid);
      for (let i = 0; i < 6 && !(settled.d && settled.d.rest && settled.d.rest.every(Boolean)); i++) {
        await at(1300 + i * 60);
        settled = await state(P, mid);
      }
      const ds = settled.d;
      rec.ok(`4. ${L.key}: the pieces come down and lie still`, !!(ds && ds.rest && ds.rest.every(Boolean)), ds);
      rec.ok(`4. ${L.key}: ...on the ground, not above or through it (a sinking piece under it)`,
        /* a sagging piece sags with the others (a goblin's flame stays on his
           head): it is the group's lowest point that is on the ground */
        !!(ds && ds.ground && ds.own && ds.ground.every((g, i) => (ds.own.sinks[i] ? g > 0.2 : ds.own.offs[i] === 'slump' ? g < 0.06 : Math.abs(g) < 0.06))
          && (!ds.own.offs.some((o, i) => o === 'slump' && !ds.own.sinks[i])
            || Math.max(...ds.ground.filter((g, i) => ds.own.offs[i] === 'slump' && !ds.own.sinks[i])) > -0.06)),
        ds && { ground: ds.ground, offs: ds.own && ds.own.offs, sinks: ds.own && ds.own.sinks });
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-4-lying.png`, clip: box }).catch(() => {});
      await at(1900);
      await P.page.waitForTimeout(500);
      const gone = await state(P, mid);
      rec.ok(`5. ${L.key}: the corpse goes away afterwards, and everything its death made with it`,
        (!gone.s || gone.d === null || (gone.d && gone.d.done)) && !!(gone.z && gone.z.live === 0 && gone.z.made === gone.z.freed), gone);
      await release(P);
      await P.page.waitForTimeout(250);
    }

    /* ── 6. the cap: ten slimes at once ── */
    {
      const specs = [];
      for (let i = 0; i < 10; i++) specs.push({ id: `dz-cap-${i}-${Date.now()}`, arch: 'fodder', variant: null, dx: -120 + (i % 5) * 60, dy: i < 5 ? -50 : 60 });
      const h = await hold(P, specs);
      const ids = h.ids || [];
      for (const i of ids) await drawn(P, i, 15000);
      await P.page.evaluate((k) => { window.__btDeathSlow = k; }, SLOW);
      await kill(P, ids, 'own');
      await P.page.waitForTimeout(2500);
      const W = await P.page.evaluate(() => window.__dzWatch || {});
      const kinds = ids.map((i) => (W[i] && W[i].first ? W[i].first.kind : null));
      const own = kinds.filter((k) => k === 'own').length;
      rec.ok(`6. ten slimes killed together: at most ${MAX_LIVE} play their own death, the rest today's (${own} own)`,
        own > 0 && own <= MAX_LIVE && kinds.every((k) => k != null) && kinds.filter((k) => k !== 'own').length === kinds.length - own && own === Math.min(MAX_LIVE, ids.length), kinds);
      await P.page.waitForTimeout(1900 * SLOW + 1000);
      const z = await P.page.evaluate(() => (window.__btDeathZones ? window.__btDeathZones() : null));
      rec.ok('6. ...and every one let go once over', !!(z && z.live === 0 && z.made === z.freed), z);
      await release(P);
      await P.page.waitForTimeout(250);
    }

    /* ── 7. unforced, the same death for the same monster at the same spot ── */
    {
      const sid = 'dz-same-slime';
      const kinds = [];
      for (let r = 0; r < 2; r++) {
        const h = await hold(P, [{ id: sid, arch: 'fodder', variant: null, dx: 70, dy: 6 }]);
        await P.page.evaluate(() => { const m = window.__qaDZ.list[0]; m.x = Math.round(m.x); m.y = Math.round(m.y); m.renderX = m.x; m.renderY = m.y; window.__qaDZspot = window.__qaDZspot || [m.x, m.y]; m.x = window.__qaDZspot[0]; m.y = window.__qaDZspot[1]; m.renderX = m.x; m.renderY = m.y; });
        await drawn(P, h.ids[0], 15000);
        await kill(P, [sid], null);
        await P.page.waitForTimeout(1200);
        const W = await P.page.evaluate(() => window.__dzWatch || {});
        kinds.push(W[sid] && W[sid].first ? W[sid].first.kind : null);
        await P.page.waitForTimeout(2200);
        await release(P);
        await P.page.waitForTimeout(400);
      }
      rec.ok(`7. unforced, the same slime at the same spot dies the same death twice (${kinds.join(', ')})`, kinds[0] != null && kinds[0] === kinds[1], kinds);
    }
    /* ── 10. v2.3.3985: the blow -- big or ordinary, its eyes, which way ── */
    /* DZ_BLOW=snowman,rock: only those looks here (a quicker look) */
    const onlyB = (process.env.DZ_BLOW || '').split(',').filter(Boolean);
    const SAMPLE = LOOKS.filter((x) => ['slime', 'snowman', 'goblin', 'skeleton', 'rock', 'fishman'].indexOf(x.key) >= 0
      && (!onlyB.length || onlyB.indexOf(x.key) >= 0));
    const BSLOW = 6;
    const blowDeath = async (L, big, side) => {
      const zones = deathZonesFor(L.zk, 'south');
      const h = await hold(P, [{ id: `dz-b-${L.key}-${big ? 'big' : 'calm'}-${side}-${Date.now()}`, arch: L.arch, variant: L.variant, dx: side * 70, dy: 6, noTransform: L.noTransform }]);
      if (h.err) return { err: h.err };
      const mid = h.ids[0];
      const alive = await drawn(P, mid);
      if (!(alive && alive.s && alive.s.visible)) { await release(P); return { err: 'not drawn' }; }
      await P.page.evaluate((k) => { window.__btDeathSlow = k; delete window.__btDeathBig; }, BSLOW);
      /* a wider picture than the per-look ones: the pieces go a body or two
         away (the hero in it, so the owner sees which way they went) */
      const b0 = await boxOf(P, mid);
      const box = b0 && { x: Math.max(0, b0.x - 70 - (side < 0 ? 40 : 0)), y: b0.y, width: 360, height: b0.height };
      await kill(P, [mid], 'own', big ? { isCrit: true } : {});
      const t0 = Date.now();
      const tag = `${L.key}-${big ? 'big' : 'ordinary'}${side < 0 ? '-left' : ''}`;
      await P.page.waitForTimeout(300 * BSLOW);
      if (box) await P.page.screenshot({ path: `${OUT}/blow-${tag}-1.png`, clip: box }).catch(() => {});
      await P.page.waitForTimeout(Math.max(0, 750 * BSLOW - (Date.now() - t0)));
      if (box) await P.page.screenshot({ path: `${OUT}/blow-${tag}-2.png`, clip: box }).catch(() => {});
      /* until a second of its own clock has gone (the watcher keeps it) */
      let w = null;
      for (let i = 0; i < 40; i++) {
        w = await P.page.evaluate((id) => (window.__dzWatch || {})[id] || null, mid);
        if (w && w.at1s) break;
        await P.page.waitForTimeout(500);
      }
      if (box) await P.page.screenshot({ path: `${OUT}/blow-${tag}-3.png`, clip: box }).catch(() => {});
      const left = 1900 * BSLOW + 600 - (Date.now() - t0);
      if (left > 0) await P.page.waitForTimeout(left);
      const z = await P.page.evaluate(() => (window.__btDeathZones ? window.__btDeathZones() : null));
      await release(P);
      await P.page.waitForTimeout(250);
      return { first: w && w.first, at1s: w && w.at1s, zones, z };
    };
    for (const L of SAMPLE) {
      const calm = await blowDeath(L, false, 1);
      const big = await blowDeath(L, true, 1);
      const c = calm.first && calm.first.own, b = big.first && big.first.own;
      const eyesWant = calm.zones.filter((z) => z.part === 'eyes').length;
      rec.ok(`10. ${L.key}: a plain hit from you is the ordinary death, a crit the big one (the blow written down by the real monster_hit, from your side)`,
        !!(c && b && calm.first.kind === 'own' && big.first.kind === 'own' && c.big === false && b.big === true
          && c.blow && b.blow && c.blow.dx > 0.9 && b.blow.dx > 0.9), { calm: c && { big: c.big, blow: c.blow }, big: b && { big: b.big, blow: b.blow }, err: calm.err || big.err });
      const one = L.key === 'fishman';
      rec.ok(`10. ${L.key}: ...the big one throws ${one ? 'no fewer' : 'more'} pieces than the ordinary (${c && c.thrown} -> ${b && b.thrown})`,
        !!(c && b && (one ? b.thrown >= c.thrown : b.thrown > c.thrown)), { calm: c && c.offs, big: b && b.offs });
      rec.ok(`10. ${L.key}: ...its eyes are pieces of their own (${eyesWant})`, !!(c && b && c.eyes === eyesWant && b.eyes === eyesWant), { calm: c && c.eyes, big: b && b.eyes, zones: c && c.zones });
      const dc = calm.at1s && calm.at1s.drift, db = big.at1s && big.at1s.drift;
      rec.ok(`10. ${L.key}: ...the pieces travel away from you (you on its left: their mean goes right, ${dc && dc.x} / ${db && db.x} px)`,
        !!(dc && db && dc.x > 1 && db.x > 1), { calm: calm.at1s, big: big.at1s });
      rec.ok(`10. ${L.key}: ...and everything let go once over`, !!(big.z && big.z.live === 0 && big.z.made === big.z.freed), big.z);
    }
    for (const L of SAMPLE.filter((x) => x.key === 'snowman' || x.key === 'skeleton')) {
      const r = await blowDeath(L, true, -1);
      const d = r.at1s && r.at1s.drift, o = r.first && r.first.own;
      rec.ok(`10. ${L.key}, on your LEFT: the blow comes from the right and the pieces go left (${d && d.x} px)`,
        !!(o && o.blow && o.blow.dx < -0.9 && d && d.x < -1), { blow: o && o.blow, at1s: r.at1s, err: r.err });
    }

    const thrown = errors.concat(P.logs.filter((l) => /pageerror|threw/.test(l)));
    rec.ok('9. nothing threw (the phone)', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ── 8. the address switches, each on a page of its own ── */
  for (const [query, want, label, wantBig] of [
    ['deathkind=own', 'own', '?deathkind=own plays the own death with no QA override', false],
    ['deathzones=0&deathkind=own', 'normal', '?deathzones=0 turns it off: today\'s death plays (a snowman\'s strip)', null],
    /* v2.3.3985: the owner's switch for the explosion -- an unforced kill
       (no kind asked) is the big own death */
    ['deathbig=1', 'own', '11. ?deathbig=1 makes an unforced kill the big one, its own death', true],
  ]) {
    const Q = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query });
    const stop = H.keepAlive(Q, 20000);
    try {
      await enter(Q, wsPort);
      const h = await hold(Q, [{ id: `dz-q-${Date.now()}`, arch: 'snowman', variant: null, dx: 70, dy: 6 }]);
      const ok = await drawn(Q, h.ids[0]);
      await kill(Q, h.ids, null);
      await Q.page.waitForTimeout(1500);
      const W = await Q.page.evaluate(() => window.__dzWatch || {});
      const f = W[h.ids[0]] && W[h.ids[0]].first;
      rec.ok(/^\d/.test(label) ? label : `8. ${label}`, !!(ok && ok.s && f && f.kind === want && (wantBig == null || !!(f.own && f.own.big) === wantBig)), f);
      await release(Q);
    } finally {
      stop();
      await Q.ctx.close().catch(() => {});
    }
  }
}
