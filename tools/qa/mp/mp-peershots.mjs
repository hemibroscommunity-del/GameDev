/* ═══ ANOTHER PLAYER'S SHOT ON YOUR SCREEN, ON TWO PHONES (v2.3.3266) ═══
 *
 * Owner, on what #920 found ("Real archers' arrows look 3x slower to everyone
 * else ... Other players' shots fly straight through you on your screen, and
 * a real mage's bolt flies straight on your screen"): "Yes do the follow up
 * fixes".  src/game/peerShots.js, docs/specs/peer-shots.md.
 *
 * Two phones in the Wheel: A shoots, B is shot at and records every frame of
 * every copy of A's shots it draws (S._remoteProjectiles).  A locks B (a
 * player locked outside a safe zone: what the PvP hit test tries, and what a
 * shot now names).  Checked:
 *   1. a locked ARROW: A's relay names B (`tg`); on B's screen the copy flies
 *      the bow's own speed per 60 Hz frame (it was 8, a third), on one straight
 *      line, and ends at B, short of its reach;
 *   2. the LINE holds: A shoots walking sideways; B's copy stays on the line it
 *      left on while A's figure walks on;
 *   3. a locked BOLT chases: B walks across its path; the copy turns after B
 *      and ends at them;
 *   4. the VOLLEY: three copies, ~200 px apart at its own speed (0.7 of the
 *      bow), piercing, so they fly on past B as A's do;
 *   5. an arrow with no target (an old page's relay, dispatched on B as one
 *      arrives): the bow's speed, out to its reach (675 x its multiplier),
 *      solid all the way, as the shooter's own is;
 *   6. no page errors on either phone.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const GAP = 330;   /* A stands this far from B */

/* B records every copy of A's shots, every frame */
const startWatch = (B, aId) => B.page.evaluate((aId) => {
  const S = window._gameState.current;
  window.__btPeerShotEnds = [];
  const W = window.__qaPeerShots = { shots: [], stop: false };
  const ids = new WeakMap(); let n = 0;
  const loop = () => {
    const live = new Set();
    for (const rp of (S._remoteProjectiles || [])) {
      if (!rp || rp.ownerId !== aId) continue;
      let id = ids.get(rp);
      if (id == null) {
        id = n++; ids.set(rp, id);
        W.shots.push({ id, isStaff: !!rp.isStaff, isSpecial: !!rp.isSpecial, volley: !!rp.volley, tg: rp.tg || null,
          pierce: !!rp.pierce, speedPx: rp.speedPx, reach: rp.reach, life0: rp.life, samples: [], gone: null });
      }
      live.add(id);
      const sh = W.shots[id];
      if (!rp._held && typeof rp._renderX === 'number' && sh.samples.length < 600) {
        const o = S.others && S.others[aId];
        sh.samples.push({ t: Math.round(performance.now()), dt: S._dtScale || 1, dist: rp.dist, x: rp._renderX, y: rp._renderY,
          ang: rp.ang, life: rp.life,
          me: { x: S.player.x, y: S.player.y },
          shooter: o ? { x: o.renderX != null ? o.renderX : o.x, y: o.renderY != null ? o.renderY : o.y } : null });
      }
    }
    for (const sh of W.shots) if (sh.gone == null && !live.has(sh.id)) sh.gone = { t: Math.round(performance.now()), me: { x: S.player.x, y: S.player.y } };
    if (!W.stop) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return true;
}, aId);
let lastEnds = [], lastEndsRaw = [];
const takeWatch = async (B) => {
  const r = await B.page.evaluate(() => { const W = window.__qaPeerShots; if (W) W.stop = true; return { shots: W ? W.shots : [], ends: (window.__btPeerShotEnds || []).splice(0) }; });
  lastEndsRaw = r.ends;
  lastEnds = r.ends.map((e) => e.why + '@' + e.dist);
  return r.shots;
};
/* until B has seen `need` copies and every one is gone, or `ms`: this box draws
   a frame or two a second with two phones up, and the game's clock is held to
   3 frames' worth a draw, so a flight that takes half a second on a phone
   takes several here */
const settle = (B, need, ms) => B.page.evaluate(({ need, ms }) => new Promise((resolve) => {
  const t0 = performance.now();
  const tick = () => {
    const W = window.__qaPeerShots;
    const all = W ? W.shots : [];
    const ok = all.length >= need && all.every((s) => s.gone != null);
    if (ok || performance.now() - t0 > ms) { resolve({ ok, n: all.length, ms: Math.round(performance.now() - t0) }); return; }
    setTimeout(tick, 120);
  };
  tick();
}), { need, ms });
/* a direction from A's figure (on B's screen) with `len` px of open ground,
   away from B, at any height a shot's ground line may be */
const clearRay = (B, aId, len) => B.page.evaluate(({ aId, len }) => {
  const S = window._gameState.current; const o = S.others && S.others[aId];
  if (!o || !window.__btSweepBlockPoint) return null;
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  const away = Math.atan2(oy - S.player.y, ox - S.player.x);
  for (const d of [0, 30, -30, 60, -60, 90, -90, 120, -120]) {
    const a = away + d * Math.PI / 180;
    let clear = true;
    for (const g of [20, 35, 45, 52, 60, 75]) {
      if (window.__btSweepBlockPoint(S.currentZone, ox, oy + g, ox + Math.cos(a) * len, oy + g + Math.sin(a) * len)) { clear = false; break; }
    }
    if (clear) return { ang: a, deg: d };
  }
  return null;
}, { aId, len });

/* A's relays of its shots, as they go out */
const countRelays = (A) => A.page.evaluate(() => {
  const S = window._gameState.current;
  window.__qaRelays = [];
  const ch = S.channel;
  if (ch && !ch.__qaPeerShots) {
    const send = ch.send.bind(ch);
    ch.send = (m) => { try { if (m && m.event === 'player_projectile') window.__qaRelays.push(JSON.parse(JSON.stringify(m.payload))); } catch (e) { /* counting only */ } return send(m); };
    ch.__qaPeerShots = true;
  }
  return true;
});
const relays = (A) => A.page.evaluate(() => (window.__qaRelays || []).slice());

/* A holds the attack, locked on B, until `n` shots have gone out (or `ms`) */
const loose = (A, bId, n, ms) => A.page.evaluate(({ bId, n, ms }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const o = S.others && S.others[bId];
  if (!o) { resolve({ none: true }); return; }
  S.lockedTarget = { type: 'player', id: bId, ref: o };
  S.swingTimer = 0;
  const n0 = (window.__qaRelays || []).length;
  const t0 = performance.now();
  S.autoAttack = true;
  const tick = () => {
    const sent = (window.__qaRelays || []).length - n0;
    if (sent >= n || performance.now() - t0 > ms) {
      S.autoAttack = false;
      resolve({ sent, ms: Math.round(performance.now() - t0) });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { bId, n, ms });

/* the drawn speed of a copy, per 60 Hz frame of game time: how far its drawn
   point moved between two draws, over the frame-rate term of the later one */
function drawnSpeeds(sh) {
  const out = [];
  for (let i = 1; i < sh.samples.length; i++) {
    const a = sh.samples[i - 1], b = sh.samples[i];
    if (b.dist <= a.dist) continue;
    out.push(Math.hypot(b.x - a.x, b.y - a.y) / b.dt);
  }
  return out;
}
const median = (v) => { if (!v.length) return null; const s = v.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
/* the farthest any drawn point lies off the line through the first and last */
function offLine(sh) {
  const s = sh.samples;
  if (s.length < 3) return 0;
  const a = s[0], b = s[s.length - 1];
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let worst = 0;
  for (const p of s) worst = Math.max(worst, Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L);
  return worst;
}
const last = (sh) => sh.samples[sh.samples.length - 1];

/* somewhere GAP px from (bx, by) with a clear line to it, on open ground.
   v2.3.3489: north or south of B first.  A bow's gate counts a target only as
   far as an arrow flies before it comes down short of the screen's edge
   (arrowEdge.js), and the 390 px phone is ~640 world px across: B 330 px to
   A's side was past it once A's camera had settled (the first arrow went out
   while it was still easing after the hop; the next ones never did).  Up and
   down the screen there is room for GAP. */
const clearSpot = (P, bx, by) => P.page.evaluate(({ bx, by, gap }) => {
  const S = window._gameState.current;
  const z = S.currentZone, boots = 52;
  for (const deg of [90, 270, 70, 110, 250, 290, 45, 135, 225, 315, 180, 0]) {
    const a = deg * Math.PI / 180;
    const x = bx + Math.cos(a) * gap, y = by + Math.sin(a) * gap;
    let solid = false;
    for (const [dx, dy] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) if (window.__btIsSolid && window.__btIsSolid(x + dx, y + boots + dy)) solid = true;
    if (solid) continue;
    /* the shot's ground line, there and on past B (the volley flies on), at
       any height a shot's ground line may be */
    const fx = bx - Math.cos(a) * 340, fy = by - Math.sin(a) * 340;
    let hit = !window.__btSweepBlockPoint;
    for (const g of [20, 35, 45, 52, 60, 75]) if (!hit && window.__btSweepBlockPoint(z, x, y + g, fx, fy + g)) hit = true;
    if (!hit) return { x: Math.round(x), y: Math.round(y), deg };
  }
  return null;
}, { bx, by, gap: GAP });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Target', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(B);
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  for (const P of [A, B]) {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') break;
      await P.page.waitForTimeout(500);
    }
  }
  await A.page.waitForTimeout(2500);
  let alive = true;
  const keep = (async () => { while (alive) { for (const P of [A, B]) await P.page.keyboard.press('Control').catch(() => {}); await B.page.waitForTimeout(15000).catch(() => {}); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); };
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* A: a bow and a staff (the kit's), the bow in hand */
  await H.devOp(wsPort, 'kit', aId, { what: 'weapons' });
  await A.page.waitForTimeout(1800);
  const bow = await H.equipWeapon(A, 'bow', 'rangedWeapon', 'ranged');
  await A.page.waitForTimeout(1500);
  /* A stands GAP px from B, with a clear line between */
  const bPos = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
  const spot = await clearSpot(B, bPos.x, bPos.y);
  rec.ok('setup: both in the Wheel, A with a bow, and an open line between them (guard)', bow.ok && !!spot,
    { bow, spot, bPos, zones: [await H.readState(A, (S) => S.currentZone), await H.readState(B, (S) => S.currentZone)] });
  if (!bow.ok || !spot) { await done(); return; }
  await H.hopTo(A, spot.x, spot.y);
  /* until B draws A there, and A draws B */
  let sees = null;
  for (let i = 0; i < 40; i++) {
    const bSees = await B.page.evaluate((aId) => { const S = window._gameState.current; const o = S.others && S.others[aId]; return o ? { x: o.renderX != null ? o.renderX : o.x, y: o.renderY != null ? o.renderY : o.y } : null; }, aId);
    const aSees = await A.page.evaluate((bId) => { const S = window._gameState.current; return !!(S.others && S.others[bId]); }, bId);
    if (bSees && aSees && Math.hypot(bSees.x - spot.x, bSees.y - spot.y) < 30) { sees = bSees; break; }
    await A.page.waitForTimeout(400);
  }
  rec.ok('setup: each phone draws the other where they stand (guard)', !!sees, { sees, spot });
  if (!sees) { await done(); return; }
  await countRelays(A);

  /* ── 1. a locked arrow ── */
  {
    await startWatch(B, aId);
    const r = await loose(A, bId, 1, 6000);
    const st = await settle(B, 1, 45000);
    const shots = (await takeWatch(B)).filter((s) => !s.isStaff && !s.isSpecial);
    const ends = lastEndsRaw.filter((e) => !e.staff && !e.special);
    const sent = (await relays(A)).filter((p) => !p.isStaff && !p.isSpecial);
    const sh = shots[0];
    const p = sent[0];
    rec.ok('1a A\'s arrow names B (`tg`), its relay still saying its reach in its life', r.sent >= 1 && p && p.tg === bId && p.life > 0, { r, p });
    if (!sh || !p) { rec.ok('1b B draws the copy (guard)', false, { st, shots: shots.length, ends: lastEnds, sent }); await done(); return; }
    const k = p.life / 90;
    const sp = median(drawnSpeeds(sh));
    rec.ok(`1b on B's screen it flies the bow's own ${(24 * k).toFixed(1)} px a frame (drawn ${sp == null ? '?' : sp.toFixed(1)}; it was 8)`,
      sp != null && Math.abs(sp - 24 * k) < 24 * k * 0.08 && sh.tg === bId, { sp, k, n: sh.samples.length, tg: sh.tg });
    const e = ends[0];
    const toB = e && e.at ? Math.hypot(e.x - e.at.x, e.y - e.at.y) : null;
    rec.ok(`1c ...and ends because it reached B (${lastEnds.join(', ')}), ${toB == null ? '?' : Math.round(toB)} px from them, short of its ${Math.round(sh.reach)} px reach`,
      st.ok && !!e && e.why === 'target' && e.tg === bId && toB != null && toB < 28.6 + 24 * k * 3.2 && e.dist < sh.reach - 60,
      { st, e, toB, reach: sh.reach, gap: GAP });
    rec.ok(`1d ...on one straight line (${offLine(sh).toFixed(2)} px off it at most, ${sh.samples.length} frames)`, sh.samples.length >= 2 && offLine(sh) < 1.5, { off: offLine(sh), n: sh.samples.length });
  }

  /* ── 2. the line holds while the shooter moves on ── */
  /* Made sure of, not hoped for: on this box B draws a frame or two a second
     and an arrow is gone in three, so A's own walk shows B a few px of it.
     Instead B's DRAWN copy of A is moved 80 px sideways the frame after the
     copy has left -- as a shooter walking on would be drawn -- and the copy
     must stay on its line.  Only the drawn place, and under 100 px: the
     interpolation snaps a copy more than 100 px off back at once
     (visualSystems), and eases a nearer one back over a few frames, so the
     move is still there while the arrow flies.  (Before v2.3.3266 the arrow
     was drawn from where the shooter IS, and would have slid with them.) */
  {
    await startWatch(B, aId);
    await B.page.evaluate((aId) => {
      const S = window._gameState.current;
      window.__qaNudged = null;
      const hook = () => {
        if (window.__qaNudged) return;
        const rp = (S._remoteProjectiles || []).find((q) => q && q.ownerId === aId && !q.isStaff && !q.isSpecial && q._x0 != null);
        const o = S.others && S.others[aId];
        if (rp && o) {
          const rx = typeof o.renderX === 'number' ? o.renderX : o.x;
          o.renderX = rx + 80;
          window.__qaNudged = { at: Math.round(rp.dist) };
          return;
        }
        requestAnimationFrame(hook);
      };
      requestAnimationFrame(hook);
    }, aId);
    const r = await loose(A, bId, 1, 6000);
    const st = await settle(B, 1, 45000);
    const nudged = await B.page.evaluate(() => window.__qaNudged);
    const sh = (await takeWatch(B)).filter((s) => !s.isStaff && !s.isSpecial)[0];
    const moved = sh && sh.samples.length > 1 && sh.samples[0].shooter && last(sh).shooter
      ? Math.max(...sh.samples.map((q) => q.shooter ? Math.hypot(q.shooter.x - sh.samples[0].shooter.x, q.shooter.y - sh.samples[0].shooter.y) : 0)) : 0;
    rec.ok(`2 the shooter's figure moved ${Math.round(moved)} px mid-flight (at ${nudged ? nudged.at : '?'} px): B's copy kept the line it left on (${sh ? offLine(sh).toFixed(2) : '?'} px off it, ${sh ? sh.samples.length : 0} frames)`,
      r.sent >= 1 && st.ok && !!nudged && !!sh && sh.samples.length >= 2 && offLine(sh) < 1.5 && moved >= 30,
      { r, st, nudged, off: sh && offLine(sh), moved, n: sh && sh.samples.length, ends: lastEnds });
    await A.page.waitForTimeout(1500);
  }

  /* ── 3. a locked bolt chases ── */
  {
    const staff = await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
    await A.page.waitForTimeout(1500);
    await startWatch(B, aId);
    const r = await loose(A, bId, 1, 6000);
    /* B walks across the bolt's path the whole time it comes */
    const key = (spot.deg === 0 || spot.deg === 180 || spot.deg === 160 || spot.deg === 200 || spot.deg === 20 || spot.deg === 340) ? 's' : 'd';
    await B.page.keyboard.down(key);
    const st = await settle(B, 1, 60000);
    await B.page.keyboard.up(key);
    const sh = (await takeWatch(B)).filter((s) => s.isStaff && !s.isSpecial)[0];
    const e = lastEndsRaw.filter((q) => q.staff && !q.special)[0];
    const sent = (await relays(A)).filter((p) => p.isStaff && !p.isSpecial).pop();
    const turned = sh && sh.samples.length > 2 ? Math.abs(((last(sh).ang - sh.samples[0].ang + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI : 0;
    const moved = sh && sh.samples.length > 1 ? Math.hypot(last(sh).me.x - sh.samples[0].me.x, last(sh).me.y - sh.samples[0].me.y) : 0;
    const toB = e && e.at ? Math.hypot(e.x - e.at.x, e.y - e.at.y) : null;
    rec.ok(`3 a locked bolt names B and CHASES them: turned ${turned.toFixed(1)} deg as B walked ${Math.round(moved)} px, ending at them (${lastEnds.join(', ')}; ${toB == null ? '?' : Math.round(toB)} px)`,
      staff.ok && r.sent >= 1 && st.ok && sent && sent.tg === bId && !!sh && sh.tg === bId && turned >= 4 && moved >= 20
        && !!e && e.why === 'target' && toB != null && toB < 18 + 16,
      { staff, r, st, turned, moved, toB, e, n: sh && sh.samples.length });
    await H.equipWeapon(A, 'bow', 'rangedWeapon', 'ranged');
    await A.page.waitForTimeout(1500);
    await H.hopTo(B, bPos.x, bPos.y);
    await B.page.waitForTimeout(1500);
  }

  /* ── 4. the volley: 200 px apart, at its own speed, piercing ── */
  {
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.bowvolley));
    await startWatch(B, aId);
    const n0 = (await relays(A)).length;
    /* the special, as the swipe fires it: with the bow's line on B it goes at
       once, else it waits for the next lined-up shot (playerActions), so the
       attack is held until its three arrows have gone */
    await A.page.evaluate((bId) => new Promise((resolve) => {
      const S = window._gameState.current; const o = S.others && S.others[bId];
      S.lockedTarget = { type: 'player', id: bId, ref: o };
      S.rpg.mana = S.rpg.maxMana = 900; S._lastSwipe = 0; S.swingTimer = 0; S.isSwinging = false;
      const n0 = (window.__qaRelays || []).length;
      (window._gameFns || {}).specialAttack && window._gameFns.specialAttack();
      const t0 = performance.now();
      S.autoAttack = true;
      const tick = () => {
        const sp = (window.__qaRelays || []).slice(n0).filter((p) => p && p.isSpecial && !p.isStaff).length;
        if (sp >= 3 || performance.now() - t0 > 8000) { S.autoAttack = false; resolve(sp); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), bId);
    const st = await settle(B, 3, 90000);
    const vs = (await takeWatch(B)).filter((s) => !s.isStaff && s.isSpecial);
    const sent = (await relays(A)).slice(n0).filter((p) => !p.isStaff && p.isSpecial);
    /* the gap: at each moment two are in the air, how far apart */
    const gaps = [];
    if (vs.length >= 2) {
      for (const s0 of vs[0].samples) {
        const s1 = vs[1].samples.find((q) => q.t === s0.t);
        if (s1) gaps.push(Math.round(Math.hypot(s0.x - s1.x, s0.y - s1.y)));
      }
    }
    const k = sent[0] ? sent[0].life / 90 : 1;
    const sp = vs[0] ? median(drawnSpeeds(vs[0])) : null;
    /* how far past B each flew: along its line, from B's place on it */
    const past = vs.map((s) => {
      const s0 = s.samples[0], e = last(s);
      if (!s0 || !e) return null;
      const dx = Math.cos(s0.ang), dy = Math.sin(s0.ang);
      const toB = (e.me.x - s0.x) * dx + (e.me.y - s0.y) * dy;
      return Math.round((e.dist - s0.dist) - toB);
    });
    const vEnds = lastEndsRaw.filter((q) => !q.staff && q.special);
    rec.ok(`4 the volley: ${vs.length} copies, ${sp == null ? '?' : sp.toFixed(1)} px a frame (0.7 of the bow, ${(24 * 0.7 * k).toFixed(1)}), ${[...new Set(gaps)].slice(0, 4).join('/')} px apart, flying on past B (${past.join(', ')} px beyond; ${vEnds.map((q) => q.why).join(', ')})`,
      caps && st.ok && sent.length === 3 && sent.every((p) => p.tg === bId) && vs.length === 3 && vs.every((s) => s.pierce)
        && sp != null && Math.abs(sp - 24 * 0.7 * k) < 24 * 0.7 * k * 0.08 && gaps.length > 0 && gaps.every((g) => g >= 150 && g <= 250)
        && past.every((d) => d != null && d > 60) && vEnds.length === 3 && vEnds.every((q) => q.why !== 'target'),
      { caps, st, sent: sent.length, vs: vs.length, sp, gaps: gaps.slice(0, 12), past, ends: lastEnds });
  }

  /* ── 5. no target: an old page's arrow, out to its reach ── */
  {
    const ray = await clearRay(B, aId, 720);
    rec.ok('5 (guard) a clear 720 px line from A, for an arrow at nobody', !!ray, ray);
    if (ray) {
      await startWatch(B, aId);
      await B.page.evaluate(({ aId, ang }) => {
        const S = window._gameState.current; const o = S.others[aId];
        const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
        window.__btDispatch({ type: 'player_projectile', payload: { id: aId, x: Math.round(ox), y: Math.round(oy), ang, isStaff: false, ts: Date.now(), life: 90 } });
      }, { aId, ang: ray.ang });
      const st = await settle(B, 1, 45000);
      const sh = (await takeWatch(B)).filter((s) => !s.isStaff && !s.isSpecial)[0];
      const e = lastEndsRaw.filter((q) => !q.staff && !q.special)[0];
      const sp = sh ? median(drawnSpeeds(sh)) : null;
      /* drawn solid all the way, as the shooter's own is: the renderer's
         life/20 fade, never under 1 before it gets to its reach */
      const faded = sh ? sh.samples.filter((s) => !(s.life >= 20)) : [];
      rec.ok(`5 an arrow at nobody (an old page's relay) flies 24 px a frame (${sp == null ? '?' : sp.toFixed(1)}) out to its 675 px reach (${e ? e.why + ' at ' + e.dist : '?'}), solid all the way as the shooter's is (${(sh ? sh.samples.length : 0) - faded.length} of ${sh ? sh.samples.length : 0} frames)`,
        st.ok && !!sh && !sh.tg && sp != null && Math.abs(sp - 24) < 2 && !!e && e.why === 'reach' && e.dist >= 675 && e.dist < 675 + 24 * 3 + 1
          && sh.samples.length > 0 && faded.length === 0, { st, sp, e, faded: faded.map((s) => [Math.round(s.dist), s.life]) });
    }
  }

  rec.ok('6 no page errors on either phone', errors.length === 0, errors.slice(0, 5));
  await done();
}
