/* ═══ v2.3.3954: MONSTERS DIE IN PIECES THAT FIT THEM ═══
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
const SLOW = 5;
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

const kill = (P, ids, kind) => P.page.evaluate(async ([mids, k]) => {
  if (k) window.__btDeathKind = k; else delete window.__btDeathKind;
  const ms = window.__qaDZ.list.filter((x) => mids.indexOf(x.id) >= 0);
  /* the killing blow lands first -- its red flash and squash on the living
     body for a frame or two, as a real kill's are (mp-deathcut) */
  const t = Date.now();
  for (const m of ms) { m._hitFlash = t + 1e6; m._hitAnimStart = t - 40000; m._hitAnimEnd = t + 60000; }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (const m of ms) { m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 120000; }
  return true;
}, [ids, kind]);

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
    for (const L of LOOKS) {
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
      /* the first dead frame, and the beat */
      let first = null, sawFlash = false;
      for (let i = 0; i < 30; i++) {
        const s = await state(P, mid);
        if (s.d && s.d.kind) { first = first || s; if (s.d.own && s.d.own.flash) sawFlash = true; if (s.d.own && s.d.own.parted) break; }
        await P.page.waitForTimeout(80);
      }
      const d0 = first && first.d;
      rec.ok(`2. ${L.key}: dies its own death -- ${L.look}'s, ${view} view, a piece a zone (${zones.length})`,
        !!(d0 && d0.kind === 'own' && d0.own && d0.own.look === L.zk && d0.own.view === view
          && d0.pieces >= Math.max(1, zones.length - 1) && d0.pieces <= Math.min(MAX_PIECES, zones.length)), d0 && { kind: d0.kind, pieces: d0.pieces, own: d0.own });
      rec.ok(`2. ${L.key}: ...opening on the beat (the flash over it) before the pieces part`, sawFlash, d0 && d0.own);
      await at(150);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-1-beat.png`, clip: box }).catch(() => {});
      await at(420);
      if (box) await P.page.screenshot({ path: `${OUT}/${L.key}-2-parting.png`, clip: box }).catch(() => {});
      const mid1 = await state(P, mid);
      const d1 = mid1.d;
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
        !!(ds && ds.ground && ds.own && ds.ground.every((g, i) => (ds.own.sinks[i] ? g > 0.2 : Math.abs(g) < 0.06))), ds && { ground: ds.ground, offs: ds.own && ds.own.offs, sinks: ds.own && ds.own.sinks });
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
      await P.page.waitForTimeout(1500);
      const kinds = [];
      for (const i of ids) { const s = await state(P, i); kinds.push(s.d ? s.d.kind : null); }
      const own = kinds.filter((k) => k === 'own').length;
      rec.ok(`6. ten slimes killed together: at most ${MAX_LIVE} play their own death, the rest today's (${own} own)`,
        own > 0 && own <= MAX_LIVE && kinds.every((k) => k != null) && kinds.filter((k) => k !== 'own').length === kinds.length - own && own === Math.min(MAX_LIVE, ids.length), kinds);
      await P.page.waitForTimeout(1900 * SLOW);
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
        await P.page.waitForTimeout(700);
        const s = await state(P, sid);
        kinds.push(s.d ? s.d.kind : null);
        await P.page.waitForTimeout(2200);
        await release(P);
        await P.page.waitForTimeout(400);
      }
      rec.ok(`7. unforced, the same slime at the same spot dies the same death twice (${kinds.join(', ')})`, kinds[0] != null && kinds[0] === kinds[1], kinds);
    }
    const thrown = errors.concat(P.logs.filter((l) => /pageerror|threw/.test(l)));
    rec.ok('9. nothing threw (the phone)', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ── 8. the address switches, each on a page of its own ── */
  for (const [query, want, label] of [
    ['deathkind=own', 'own', '?deathkind=own plays the own death with no QA override'],
    ['deathzones=0&deathkind=own', 'normal', '?deathzones=0 turns it off: today\'s death plays (a snowman\'s strip)'],
  ]) {
    const Q = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query });
    const stop = H.keepAlive(Q, 20000);
    try {
      await enter(Q, wsPort);
      const h = await hold(Q, [{ id: `dz-q-${Date.now()}`, arch: 'snowman', variant: null, dx: 70, dy: 6 }]);
      const ok = await drawn(Q, h.ids[0]);
      await kill(Q, h.ids, null);
      let s = null;
      for (let i = 0; i < 20; i++) { await Q.page.waitForTimeout(150); s = await state(Q, h.ids[0]); if (s.d && s.d.kind) break; }
      rec.ok(`8. ${label}`, !!(ok && ok.s && s && s.d && s.d.kind === want), s && s.d);
      await release(Q);
    } finally {
      stop();
      await Q.ctx.close().catch(() => {});
    }
  }
}
