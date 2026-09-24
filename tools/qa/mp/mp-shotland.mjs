/* A SHOT LANDS IN THE BODY, NOT ON AN INVISIBLE EDGE (v2.3.2804).
 *
 * Owner: "make sure the bolts land somewhere in the center of the target before
 * exploding (with some variation from center for variety) and same with arrows.
 * Right now it looks like it hits the same invisible edge on every monster."
 *
 * The hit test is a capsule against a CIRCLE round the body (slime 25, snowman
 * 32, fire goblin 26, skeleton 50, plus the shot's half-thickness), and the hit
 * used to be DRAWN where it registered -- on that ring.  Now the hit still
 * registers there (damage, status, knockback: unchanged), but the shot flies on
 * into the body and the crash, the material burst and the stuck shaft happen
 * where it lands: round the body centre, spread over LAND_CORE.
 *
 * Real shots -- the auto-attack a lock drives, the path a player's shots take --
 * at a pinned slime, snowman, fire goblin and skeleton, N bolts and N arrows at
 * each.
 *
 * v2.3.2805 -- AT THE TORSO.  Owner: "The arrows are grouping around the
 * skeleton's knee. Center it on the torso."  The centre they landed round was
 * the hit circle's (monsterBodyOffsetY), which on the tall figures is the
 * knees or thighs.  A locked shot is now AIMED at the drawn torso
 * (gameSystems monsterTorsoY, combatHelpers lockShotPoint) and lands round it;
 * the circle the shot has to touch is centred where it was aimed, the same
 * size, so it has exactly the room to hit it had before.  So this also shoots a
 * mummy, a fishman and a rock monster, checks each flight line passes through
 * the torso, and moves a skeleton while an arrow flies at it.  For every shot it records where the shot was on the frame the hit
 * REGISTERED and where and when the hit is DRAWN.  Plus a bow special, injected
 * the way mp-stuckarrow does, which must fly the rest of the way in rather than
 * jump there.  One picture per monster and weapon: out/shotland/<key>-<weapon>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/shotland`;
const N = 5;
const DIST = 150;
/* LAND_CORE (projectiles.js): the half-width and half-height of the region a
   shot lands in, round the torso (v2.3.2805; the body centre before).  `r` is
   the hit circle's radius (monsterProjRadius, projectiles.js).  Both mirrored
   here so a change to one without the other shows up as a failure, not a
   silent drift.  `torso` is the drawn figure's torso height above its feet --
   what the owner asked for, read off the art (see monsterTorsoY) -- and `ribs`
   the band the skeleton's arrows must land in: its ribcage, not its knees. */
const MONS = [
  { key: 'slime',    arch: 'fodder',  variant: null,          zone: null,      core: [10, 7],  r: 25, torso: 23 },
  { key: 'snowman',  arch: 'snowman', variant: null,          zone: 'frost',   core: [10, 9],  r: 32, torso: 19 },
  { key: 'goblin',   arch: 'fodder',  variant: 'fireGoblin',  zone: 'ember',   core: [8, 12],  r: 26, torso: 28 },
  { key: 'skeleton', arch: 'fodder',  variant: 'skeleton',    zone: 'sky',     core: [8, 11],  r: 50, torso: 100, band: [88, 114] },
  { key: 'mummy',    arch: 'fodder',  variant: 'mummy',       zone: 'sky',     core: [8, 11],  r: 40, torso: 74,  band: [60, 88] },
  { key: 'fishman',  arch: 'brute',   variant: 'fishman',     zone: 'tidal',   core: [8, 12],  r: 40, torso: 66,  band: [50, 88] },
  { key: 'rock',     arch: 'brute',   variant: 'rockmonster', zone: 'hollows', core: [12, 14], r: 40, torso: 64,  band: [46, 84] },
];
const WEAPONS = ['bolt', 'arrow'];
const LAND_MAX_MS = 700;   /* projectiles.js: a safety cap on the landing flight */
/* the retired "blood spray on bow hits" palette -- none of these may appear */
const BLOOD_DOTS = ['#8a0a0a', '#a01010', '#6e0606', '#c01818'];

/* Put ONE pinned, locked monster DIST px east and arm `wpn`. */
const arm = (P, mon, wpn) => P.page.evaluate(({ mon, wpn, dist }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const pine = (F.WOODWORKING_TIERS || {}).pine;
  if (wpn === 'arrow') { R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' }; R.activeSlot = 'ranged'; }
  if (wpn === 'bolt') { R.staffWeapon = { type: 'staff', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Staff', tier: 'common' }; R.activeSlot = 'staff'; }
  R.mana = R.maxMana = 900; R.hp = R.maxHp = 9000;
  S.arrows = []; S._debrisBursts = []; S.hitParticles = [];
  const m = F.createMonster('land-' + mon.key + '-' + wpn + '-' + Date.now(), mon.arch, 2, S.player.x + dist, S.player.y + 2, null);
  if (!m) return { err: 'no monster' };
  if (mon.variant) { m.archetype = mon.variant; m.type = mon.variant; }
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
  m._transformStart = 1;
  m._stuckArrows = [];
  S.monsters = [m];
  S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
  S.autoAttack = false; S.isSwinging = false; S.swingTimer = 0;
  const ang = Math.atan2(2, dist);
  S._facingAngle = ang; S._aimAngle = ang; S._lastAimAngle = ang; S._facing = 'right';
  return { id: m.id, bo: F.monsterBodyOffsetY ? F.monsterBodyOffsetY(m.archetype) : null,
    torso: F.monsterTorsoY ? F.monsterTorsoY(m.archetype) : null };
}, { mon, wpn, dist: DIST });

/* Fire ONE shot at the armed monster and watch it frame by frame until its hit
   is on screen.  Everything is read in the page on the frame it happens. */
const shootOnce = (P, wpn) => P.page.evaluate((wpn) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const m = (S.monsters || [])[0];
  if (!m) { resolve({ err: 'no monster' }); return; }
  const fx0 = window.__btStaffFx ? window.__btStaffFx() : null;
  const crash0 = fx0 ? fx0.crashes : 0;
  const stubs0 = (m._stuckArrows || []).length;
  const db0 = window.__btDebris ? window.__btDebris().map((b) => b.id) : [];
  const flash0 = m._hitFlash || 0;
  const hp0 = m.curHp;
  /* v2.3.2804: one arrow in eight SNAPS (v2.3.2731) instead of leaving a
     shaft -- it lands just the same, and breaks where it lands */
  const t00 = performance.now();
  /* v2.3.2805: the centre a shot lands round is the torso now */
  const bo = F.monsterTorsoY ? F.monsterTorsoY(m.archetype) : (F.monsterBodyOffsetY ? F.monsterBodyOffsetY(m.archetype) : 0);
  /* the damage send -- the frame the hit registered, unchanged by the landing */
  let sendT = null;
  const ch = S.channel;
  const origSend = ch && ch.send;
  if (ch && typeof origSend === 'function') {
    ch.send = function (msg) {
      try { if (msg && msg.type === 'monster_damage' && msg.payload && msg.payload.monsterId === m.id && sendT === null) sendT = performance.now(); } catch (e) { /* probe */ }
      return origSend.apply(this, arguments);
    };
  }
  const out = { lineAt: null, contact: null, land: null, burst: null, crashes: 0, stubs: 0, bursts: 0, flashAtContact: null, flashAtLand: null, blood: 0, transit: 0, frames: 0 };
  let shot = null;
  const t0 = performance.now();
  S.autoAttack = true;
  const tick = () => {
    const now = performance.now();
    out.frames++;
    const arrows = S.arrows || [];
    if (arrows.length) S.autoAttack = false;
    for (const a of arrows) {
      if (!shot) shot = a;
      if (a !== shot) continue;
      /* v2.3.2805: the height its flight line crosses the monster's x at, read
         on its last frame in free flight -- an arrow often registers its hit
         and lands on one frame, so the contact frame is not always seen */
      if (!a._land && !a.stuckIn && !(a.hitIds && a.hitIds.has(m.id)) && typeof a._renderX === 'number' && Math.abs(Math.cos(a.ang)) > 0.2) {
        const _fx = (typeof m.renderX === 'number' ? m.renderX : m.x), _fy = (typeof m.renderY === 'number' ? m.renderY : m.y);
        out.lineAt = _fy - (a._renderY + Math.tan(a.ang) * (_fx - a._renderX));
      }
      if (!out.contact && a.hitIds && a.hitIds.has(m.id)) {
        const front = a.isStaff ? 0 : 28.5;   /* PROJ_BODY.arrow.front: its tip */
        out.ang = a.ang;
        out.contact = { t: now, x: a._renderX + Math.cos(a.ang) * front, y: a._renderY + Math.sin(a.ang) * front,
          landing: !!a._land, cx: (typeof m.renderX === 'number' ? m.renderX : m.x), cy: (typeof m.renderY === 'number' ? m.renderY : m.y) - bo };
        out.flashAtContact = (m._hitFlash || 0) !== flash0;
        out.hpAtContact = m.curHp;
      } else if (out.contact && a._land) {
        out.transit++;
      }
    }
    const fx = window.__btStaffFx ? window.__btStaffFx() : null;
    const crashes = fx ? fx.crashes - crash0 : 0;
    const stubs = (m._stuckArrows || []).length - stubs0;
    const db = window.__btDebris ? window.__btDebris() : [];
    const fresh = db.filter((b) => !db0.includes(b.id));
    for (const p of (S.hitParticles || [])) if (p && BLOOD_DOTS.includes(p.color)) out.blood++;
    const cx = (typeof m.renderX === 'number' ? m.renderX : m.x), cy = (typeof m.renderY === 'number' ? m.renderY : m.y) - bo;
    if (!out.land && wpn === 'bolt' && crashes > 0 && fx.lastCrash) {
      out.land = { t: now, x: fx.lastCrash.x, y: fx.lastCrash.y, cx, cy };
    }
    if (!out.land && wpn === 'arrow' && stubs > 0) {
      const sa = m._stuckArrows[m._stuckArrows.length - 1];
      out.land = { t: now, x: m.x + sa.ox, y: m.y + sa.oy, cx, cy };
    }
    /* a snap is drawn at the arrow's pivot, a head-length (PROJ_BODY.arrow
       front, 28.5) behind the tip that landed */
    const snaps = (window.__btArrowSnapFx ? window.__btArrowSnapFx() : []).filter((sn) => sn.age <= now - t00 + 20);
    if (!out.land && wpn === 'arrow' && snaps.length) {
      const sn = snaps[snaps.length - 1], ang = out.ang != null ? out.ang : (shot ? shot.ang : 0);
      out.land = { t: now, x: sn.x + Math.cos(ang) * 28.5, y: sn.y + Math.sin(ang) * 28.5, cx, cy, snap: true };
    }
    out.snaps = snaps.length;
    if (!out.burst && fresh.length) out.burst = { t: now, x: fresh[0].atX, y: fresh[0].atY, weapon: fresh[0].weapon };
    if (out.land && out.flashAtLand === null) { out.flashAtLand = (m._hitFlash || 0) !== flash0; out.hpAtLand = m.curHp; }
    out.crashes = crashes; out.stubs = stubs; out.bursts = fresh.length;
    const done = out.land && out.burst && now - out.land.t > 120;
    if (done || now - t0 > 4000) {
      if (ch && origSend) ch.send = origSend;
      S.autoAttack = false;
      out.sendT = sendT;
      out.hp0 = hp0;
      out.leftFlying = (S.arrows || []).includes(shot);
      resolve(out);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), wpn);

/* A bow special, injected at the body centre's height like mp-stuckarrow's,
   watched frame by frame from contact to its landing. */
const specialOnce = (P) => P.page.evaluate((dist) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  S.arrows = []; S._debrisBursts = [];
  const m = F.createMonster('land-special-' + Date.now(), 'fodder', 2, S.player.x + dist, S.player.y, null);
  if (!m) { resolve({ err: 'no monster' }); return; }
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
  S.monsters = [m];
  const bo = F.monsterBodyOffsetY ? F.monsterBodyOffsetY(m.archetype) : 0;
  const x0 = S.player.x, y0 = (typeof m.renderY === 'number' ? m.renderY : m.y) - bo;
  const a = { x: x0, y: y0, _renderX: x0, _renderY: y0, _pathX: x0, _pathY: y0,
    ang: 0, dist: 0, life: 100000, _released: true, _bornTs: Date.now(),
    /* a quarter speed: its fly-in covers the same ground in 4x the frames,
       so it is seen in flight even on a machine whose frame steps are big
       (the settle flies at the arrow's own speed, _rangeMult included) */
    _ox: 0, _oy: 0, _rangeMult: 0.25, fromGrip: false,
    isStaff: false, _isStaffProj: false, ice: false,
    isSpecial: true, pierce: true, dmg: 1, baseDmg: 1, hitIds: new Set() };
  S.arrows = [a];
  const db0 = window.__btDebris ? window.__btDebris().map((b) => b.id) : [];
  const out = { contact: null, path: [], land: null, burst: null };
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now();
    if (a.stuckIn && !out.contact) out.contact = { t: now, x: a._renderX, y: a._renderY };
    else if (out.contact && !out.land) {
      out.path.push({ x: a._renderX, y: a._renderY, flying: !!a._landFx, dt: S._dtScale || 1 });
      if (!a._landFx) out.land = { t: now, x: a._renderX, y: a._renderY, cx: (typeof m.renderX === 'number' ? m.renderX : m.x), cy: (typeof m.renderY === 'number' ? m.renderY : m.y) - bo };
    }
    const db = window.__btDebris ? window.__btDebris() : [];
    const fresh = db.filter((b) => !db0.includes(b.id));
    if (!out.burst && fresh.length) out.burst = { t: now, x: fresh[0].atX, y: fresh[0].atY };
    if ((out.land && out.burst) || now - t0 > 4000) {
      out.stickOx = a._stickOx; out.stickOy = a._stickOy;
      S.arrows = []; S.monsters = [];
      resolve(out);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), DIST);

const inCore = (p, core, k) => {
  const dx = (p.x - p.cx) / (core[0] * k), dy = (p.y - p.cy) / (core[1] * k);
  return dx * dx + dy * dy <= 1;
};
const r1 = (v) => Math.round(v * 10) / 10;

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Lander', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const hook = await P.page.evaluate(() => typeof (window._gameFns || {}).preloadZoneArt === 'function' && typeof window.__btStaffFx === 'function' && typeof window.__btDebris === 'function');
  rec.ok('setup: the zone-art hook and the crash / debris probes are there (guard)', hook);
  for (const z of [...new Set(MONS.map((m) => m.zone).filter(Boolean))]) {
    await P.page.evaluate((z) => window._gameFns.preloadZoneArt(z), z).catch(() => {});
  }
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.waitForTimeout(600);

  let blood = 0;
  for (const mon of MONS) {
    for (const wpn of WEAPONS) {
      const armed = await arm(P, mon, wpn);
      if (armed.err) { rec.ok(`${mon.key} ${wpn}: armed (guard)`, false, armed); continue; }
      if (wpn === WEAPONS[0]) {
        /* v2.3.2805: the torso is where the owner asked for it, and inside the
           hit circle -- so a shot aimed at it still crosses the circle */
        rec.ok(`${mon.key}: shots are aimed at and land round its torso, ${armed.torso}px above its feet (measured on the art: ${mon.torso})`,
          armed.torso === mon.torso, armed);
        rec.ok(`${mon.key}: ...which is on the body its hit circle covers (${armed.torso} vs ${armed.bo} +/- ${mon.r})`,
          typeof armed.bo === 'number' && Math.abs(armed.torso - armed.bo) < mon.r, armed);
      }
      await P.page.waitForTimeout(400);
      const shots = [];
      for (let i = 0; i < N; i++) {
        const r = await shootOnce(P, wpn);
        shots.push(r);
        blood += r.blood || 0;
        await P.page.waitForTimeout(wpn === 'bolt' ? 950 : 700);
      }
      /* Every shot that LANDED is judged on where; the frame the hit registered
         is only seen when the landing takes more than that one frame -- always
         for a bolt (5 px a frame), rarely for an arrow, whose 24 px step
         usually carries it into the body on the very frame it hits. */
      const ok = shots.filter((s) => s.land);
      const seen = ok.filter((s) => s.contact && s.land.t > s.contact.t);
      const d = (p) => Math.hypot(p.x - p.cx, p.y - p.cy);
      const rows = ok.map((s) => ({ hitAt: s.contact ? r1(d({ x: s.contact.x, y: s.contact.y, cx: s.contact.cx, cy: s.contact.cy })) : null,
        landAt: r1(d(s.land)), dx: r1(s.land.x - s.land.cx), dy: r1(s.land.y - s.land.cy),
        ms: s.contact ? Math.round(s.land.t - s.contact.t) : null, transit: s.transit, crashes: s.crashes, stubs: s.stubs, bursts: s.bursts,
        burstAt: s.burst ? r1(Math.hypot(s.burst.x - s.land.x, s.burst.y - s.land.y)) : null,
        send: s.sendT != null && s.contact ? Math.round(s.sendT - s.contact.t) : null, snap: !!s.land.snap,
        hp: [s.hp0, s.hpAtContact, s.hpAtLand] }));
      console.log(`    ${mon.key.padEnd(8)} ${wpn.padEnd(5)} ` + rows.map((r) => `${r.hitAt != null ? 'hit@' + r.hitAt + ' ' : ''}land@${r.landAt}(${r.dx},${r.dy})${r.ms != null ? ' ' + r.ms + 'ms' : ''}`).join(' | '));
      const tag = `${mon.key} ${wpn}`;
      rec.ok(`${tag}: every shot hit and was drawn landing (${ok.length}/${N}) (guard)`, ok.length === N, shots.map((s) => ({ contact: !!s.contact, land: !!s.land, left: s.leftFlying })));
      if (!ok.length) continue;
      /* v2.3.2805: the flight line goes through the torso, and the landings sit on it */
      const lines = shots.filter((s) => s.lineAt != null).map((s) => r1(s.lineAt));
      rec.ok(`${tag}: each shot flew at the torso -- its line crosses the monster ${lines.join(', ')}px above the feet (torso ${mon.torso})`,
        lines.length === shots.length && lines.every((v) => Math.abs(v - mon.torso) <= 4), lines);
      if (mon.band) {
        const heights = ok.map((s) => r1(mon.torso - (s.land.y - s.land.cy)));
        rec.ok(`${tag}: ...and landed on it, ${Math.min(...heights)}-${Math.max(...heights)}px above the feet (the torso is ${mon.band[0]}-${mon.band[1]}; the old centre was ${armed.bo})`,
          heights.every((h) => h >= mon.band[0] && h <= mon.band[1]), heights);
      }
      rec.ok(`${tag}: every hit is drawn in the body's core, round its centre (worst ${Math.max(...rows.map((r) => r.landAt))}px out, core ${mon.core[0]}x${mon.core[1]})`,
        ok.every((s) => inCore(s.land, mon.core, 1.25)), rows);
      const spread = Math.max(0, ...ok.flatMap((s, i) => ok.slice(i + 1).map((o) => Math.hypot(s.land.x - o.land.x - (s.land.cx - o.land.cx), s.land.y - o.land.y - (s.land.cy - o.land.cy)))));
      rec.ok(`${tag}: ...and not in one spot: the landings spread ${r1(spread)}px across`, spread >= 4, rows);
      if (wpn === 'bolt') {
        rec.ok(`${tag}: every bolt was seen registering its hit and then flying on (${seen.length}/${ok.length}) (guard)`, seen.length === ok.length, rows);
        const deeper = seen.map((s) => d({ x: s.contact.x, y: s.contact.y, cx: s.contact.cx, cy: s.contact.cy }) - d(s.land));
        rec.ok(`${tag}: ...not bursting on the ring it registers on: each flew on at least 20px further in (least ${r1(Math.min(...deeper))}px; it registered ${Math.min(...rows.map((r) => r.hitAt))}-${Math.max(...rows.map((r) => r.hitAt))}px out)`,
          seen.length > 0 && deeper.every((v) => v >= 20), rows);
        rec.ok(`${tag}: ...drawn all the way in (least ${Math.min(...seen.map((s) => s.transit))} frames in flight after the hit)`,
          seen.length > 0 && seen.every((s) => s.transit >= 1), rows);
        rec.ok(`${tag}: the burst comes after the hit registered and inside LAND_MAX_MS (${Math.min(...rows.map((r) => r.ms))}-${Math.max(...rows.map((r) => r.ms))} ms)`,
          seen.every((s) => s.land.t - s.contact.t > 0 && s.land.t - s.contact.t <= LAND_MAX_MS + 120), rows);
        /* the hit itself is unchanged: registered, and applied, on contact */
        rec.ok(`${tag}: the hit still registers on contact -- sent or taken off the bar by that frame, and nothing more at the landing`,
          seen.every((s) => ((s.sendT != null && s.sendT <= s.contact.t + 1) || (s.hpAtContact < s.hp0)) && s.hpAtLand === s.hpAtContact), rows);
        rec.ok(`${tag}: the monster flashes and recoils when the bolt lands, not when it registers`,
          seen.every((s) => s.flashAtContact === false && s.flashAtLand === true), seen.map((s) => [s.flashAtContact, s.flashAtLand]));
      } else {
        /* the old shaft was pinned one fixed step onto the ENTRY side of the
           body (-rx along the shot, +/-1.5 px); now it is round the centre */
        const meanDx = ok.reduce((x, s) => x + (s.land.x - s.land.cx), 0) / ok.length;
        rec.ok(`${tag}: the shafts sit round the centre, not on the side the arrows came in by (mean ${r1(meanDx)}px along the shot; the old shaft sat 6-14px out on the entry side)`,
          Math.abs(meanDx) <= mon.core[0] * 0.6, rows);
        rec.ok(`${tag}: the monster flashes when the arrow lands`, ok.every((s) => s.flashAtLand === true), ok.map((s) => s.flashAtLand));
      }
      rec.ok(`${tag}: one ${wpn === 'bolt' ? 'crash' : 'stuck shaft (or, one in eight, a snap)'} and one material burst per shot${wpn === 'arrow' ? ` (${ok.filter((s) => s.land.snap).length} snapped)` : ''}`,
        ok.every((s) => (wpn === 'bolt' ? s.crashes === 1 && s.stubs === 0
          : ((s.stubs === 1 && !s.land.snap) || (s.stubs === 0 && s.land.snap && s.snaps === 1)) && s.crashes === 0) && s.bursts === 1), rows);
      rec.ok(`${tag}: ...and the burst leaves from where the shot landed (worst ${Math.max(...rows.map((r) => r.burstAt || 0))}px off)`,
        rows.every((r) => r.burstAt !== null && r.burstAt <= 3), rows);
      /* the picture: the last landing still on screen, the shafts all still in */
      const box = await P.page.evaluate(() => {
        const S = window._gameState.current, m = S.monsters && S.monsters[0];
        if (!m || !S.camera) return null;
        const c = document.querySelector('canvas').getBoundingClientRect();
        const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
        const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 30 - S.camera.y) * ky;
        return { x: Math.max(0, Math.round(cx - 100)), y: Math.max(0, Math.round(cy - 90)), width: 200, height: 150 };
      });
      if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-${wpn}.png`, clip: box }).catch(() => {});
      await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.monsters = []; S.lockedTarget = null; S.arrows = []; });
      await P.page.waitForTimeout(300);
    }
  }
  rec.ok(`the old flat red "blood" dots at the feet are gone (${blood} seen across every arrow and bolt)`, blood === 0, { blood });

  /* ── the bow special: it sticks, and it flies the rest of the way in ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.rangedWeapon) S.rpg.rangedWeapon = { type: 'bow', name: 'QA Bow', tierMult: 1 };
    S.rpg.activeSlot = 'ranged';
  });
  const sp = await specialOnce(P);
  const spPath = (sp.path || []).filter((p) => p.flying).length;
  console.log(`    special: contact ${JSON.stringify(sp.contact)} land ${JSON.stringify(sp.land)} path ${sp.path ? sp.path.length : 0} (${spPath} in flight)`);
  rec.ok('a bow special hits and sticks (guard)', !!(sp.contact && sp.land), sp);
  if (sp.contact && sp.land) {
    const hops = [];
    let prev = sp.contact;
    for (const p of sp.path) { hops.push({ d: Math.hypot(p.x - prev.x, p.y - prev.y), cap: 24 * 0.25 * (p.dt || 1) + 0.5 }); prev = p; }
    rec.ok(`...and flies the rest of the way in, ${r1(Math.hypot(sp.land.x - sp.contact.x, sp.land.y - sp.contact.y))}px over ${hops.length} frames, never faster than it flew (biggest step ${r1(Math.max(...hops.map((h) => h.d)))}px)`,
      spPath >= 2 && hops.every((h) => h.d <= h.cap), { hops, path: sp.path });
    rec.ok(`...sticking round the body centre (anchor ${r1(sp.land.x - sp.land.cx)},${r1(sp.land.y - sp.land.cy)}; its old fixed pose was -8,0)`,
      Math.abs(sp.land.x - sp.land.cx + 8) <= 10 * 0.7 + 0.5 && Math.abs(sp.land.y - sp.land.cy) <= 7 * 0.7 + 0.5, sp);
    rec.ok('...and its burst is drawn when it lands, inside the body', !!sp.burst && sp.burst.t >= sp.land.t - 1
      && Math.hypot(sp.burst.x - sp.land.cx, sp.burst.y - sp.land.cy) <= 27, { burst: sp.burst, land: sp.land });
  }
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.arrows = []; S.lockedTarget = null; });

  /* ── v2.3.2805: the room a torso shot has to hit is the room it always had ──
     The skeleton's hit circle (radius 50, plus the arrow's 6.6) used to be
     centred where a locked shot was aimed.  Aimed at the torso 40 px higher, a
     shot would have had 16.6 px of room above instead of 56.6.  So the monster a
     shot is aimed at is tested round the point it was aimed at: a skeleton that
     steps 40 px either way while the arrow flies is still hit, as it was when
     shots went at its knees, and one that steps 75 px is missed, as it was then.
     On the page clock at 16 ms a frame, so the arrow is in the air for several
     frames after it is loosed whatever this box's frame rate (a slow frame is a
     long step, and the first one can carry it straight into the body) -- which
     is why this runs LAST.  The dark-screen watchdog is told the screen is lit
     (TRAPS §111). */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__wdEverLit = true; S.__wdNext = 1e15; S.__wdDark = 0; });
  await P.page.clock.install();
  await P.page.clock.pauseAt((await P.page.evaluate(() => Date.now())) + 1000);
  await P.page.clock.runFor(200);
  const sk = MONS.find((mm) => mm.key === 'skeleton');
  const moves = [];
  for (const dy of [40, -40, 75, -75]) {
    await arm(P, sk, 'arrow');
    await P.page.clock.runFor(400);
    await P.page.evaluate(() => { const S = window._gameState.current; S.swingTimer = 0; S.autoAttack = true; S.__qaShift = { shot: null, moved: false }; });
    let res = null;
    for (let f = 0; f < 150 && !res; f++) {
      await P.page.clock.runFor(16);
      res = await P.page.evaluate((dy) => {
        const S = window._gameState.current, m = (S.monsters || [])[0], st = S.__qaShift;
        if (!m || !st) return { err: 'no monster' };
        const arrows = S.arrows || [];
        if (arrows.length) { S.autoAttack = false; if (!st.shot) st.shot = arrows[0]; }
        const a = st.shot;
        if (a && !st.moved && a._pathX != null) { m.y += dy; if (typeof m.renderY === 'number') m.renderY += dy; st.moved = true; }
        const hit = !!(a && a.hitIds && a.hitIds.has(m.id));
        if (hit || (a && st.moved && (!arrows.includes(a) || a.planting || a.planted))) return { hit, moved: st.moved, aimAt: a._aimAt === m.id };
        return null;
      }, dy);
    }
    moves.push({ dy, ...(res || { hit: null }) });
    await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.monsters = []; S.arrows = []; S.lockedTarget = null; });
    await P.page.clock.runFor(700);
  }
  console.log('    shifted: ' + JSON.stringify(moves));
  rec.ok('a locked arrow is stamped with the monster it was aimed at, and every shifted shot was loosed (guard)',
    moves.every((mv) => mv.moved === true && mv.aimAt === true), moves);
  const mv = (dy) => moves.find((m2) => m2.dy === dy) || {};
  rec.ok('a skeleton that steps 40 px down while the arrow flies is still hit (aimed at the torso, with the room a shot at its centre had)',
    mv(40).hit === true, moves);
  rec.ok('...and one that steps 40 px up', mv(-40).hit === true, moves);
  rec.ok('...but not one that steps 75 px either way: the room is the same size it was, not bigger',
    mv(75).hit === false && mv(-75).hit === false, moves);
  await P.ctx.close().catch(() => {});
}
