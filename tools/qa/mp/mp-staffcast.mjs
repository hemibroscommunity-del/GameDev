/* THE STAFF CAST: CHARGE, RELEASE, A LIVING BOLT, A HOT HIT (v2.3.2801)
 *
 * Owner, after a side-by-side demo of ideas from an X "pixel wizard" prompt:
 * "Looks good. I want to see what it would look like built as it looks like
 * for my game."  src/rendering/staffCastFx.js is that build.
 *
 * Everything it adds is cosmetic, so the assertions below are mostly about
 * what it must NOT change, and about the few places where "looks right" is a
 * measurable claim:
 *
 *   TIMING    the bolt still leaves on the cooldown the gate uses, and the
 *             crystal reads full on the frame it does (the charge IS the
 *             cooldown, not a wind-up added in front of it)
 *   THE LINE  each bolt is DRAWN leaving the crystal, but it is drawn back on
 *             its real flight line before it can hit anything -- the hit test
 *             never moved, and the crash (v2.3.2505) must land where the eye
 *             last saw the orb
 *   THE STAFF held head-up in every facing (the sword's blade-up flip had
 *             turned it into a broom), kicked toward the target on release,
 *             settled again before the next cast
 *   THE HIT   the old flat purple spray is gone -- the crash replaces it
 *   QUIET     stop casting and the crystal goes dark
 *   A PEER    sees your staff kick and your bolt leave YOUR crystal
 *
 * Screenshots of every facing land in tools/qa/mp/out/staffcast/ -- the
 * owner's question was what it LOOKS like, and these are the answer a run
 * leaves behind. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/staffcast`;

/* A pinned, deep-pool slime at (dx, dy) from the player, locked the way a
   magic player locks (a TAP -- src 'tap' survives the melee-only auto-target
   gate), with auto-attack on.  Town is client-local, so the slime is ours. */
const armTarget = (P, dx, dy, id = 'staffcast-1') => P.page.evaluate(({ dx, dy, id }) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (!F.createMonster || !S.player) return { err: 'no createMonster' };
  S.monsters = (S.monsters || []).filter((m) => m && !String(m.id).startsWith('staffcast-'));
  const m = F.createMonster(id, 'fodder', 2, S.player.x + dx, S.player.y + dy, null);
  if (!m) return { err: 'no monster' };
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0;
  S.monsters = S.monsters.concat([m]);
  S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
  S.autoAttack = true;
  S.arrows = [];
  return { id: m.id, dx, dy };
}, { dx, dy, id });

/* A rAF sampler that runs AFTER the game's own frame (it is requested later),
   so it reads exactly what this frame drew.  Returns a digest, not raw frames. */
const sample = (P, ms, retreat = 0) => P.page.evaluate(({ ms, retreat }) => new Promise((resolve) => {
  const S0 = window._gameState.current;
  const out = { casts: [], frames: [], bolts: [], flat: 0, crashesLeft: 0, maxRotDev: 0, behind: [] };
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const live = new Map();
  let lastCast = S0._staffCastAt || 0, lastCharge = null;
  const t0 = Date.now();
  const tick = () => {
    const S = window._gameState.current;
    const now = Date.now();
    /* backing away while casting: a staff bolt rides the caster's current
       position, so this is what used to spin a bolt round (review, F4) */
    if (retreat) S.player.x -= retreat;
    const w = window.__btWeapon || null;
    const fx = window.__btStaffFx ? window.__btStaffFx() : null;
    if (S._staffCastAt && S._staffCastAt !== lastCast) {
      out.casts.push({ at: S._staffCastAt, ang: S._staffCastAng, cad: S._staffCadenceMs, chargeBefore: lastCharge });
      lastCast = S._staffCastAt;
    }
    out.frames.push({
      t: now, rot: w ? w.rotation : null, sy: w ? w.scaleY : null,
      tipX: S._staffTipX, tipY: S._staffTipY, tipAge: S._staffTipAt ? now - S._staffTipAt : null,
      px: S.player.x, py: S.player.y, lastCast,
      charge: fx ? fx.charge : null, rhythm: fx ? fx.rhythm : null,
      orbit: fx ? fx.sparks.orbit : null,
    });
    if (fx) lastCharge = fx.charge;
    for (const a of (S.arrows || [])) {
      if (!a || !a.isStaff || a.isSpecial) continue;
      let r = live.get(a);
      /* Only bolts seen on their FIRST drawn frame count for the launch
         check: one already in flight when sampling began has no first frame
         here, and would be measured mid-air against the crystal. */
      if (!r && a._fxPx != null) {
        r = { born: now - a._fxSeen < 40, firstDx: a._fxPx, firstDy: a._fxPy, tipX: S._staffTipX, tipY: S._staffTipY,
              off: Math.hypot(a._fxOx || 0, a._fxOy || 0) };
        live.set(a, r);
      }
      /* _fxRx/_fxRy: the real position the renderer drew FROM this frame.
         _renderX may already be one sim step further on by the time a rAF
         sampler reads it, which is a frame of motion, not an offset. */
      if (r) { r.lastDx = a._fxPx; r.lastDy = a._fxPy; r.lastRx = a._fxRx; r.lastRy = a._fxRy; }
      if (typeof a._fxRot === 'number') out.maxRotDev = Math.max(out.maxRotDev, angDiff(a._fxRot, a.ang));
    }
    for (const [a, r] of live) {
      if ((S.arrows || []).includes(a)) continue;
      r.hit = a.hitIds ? a.hitIds.size : 0;
      /* where the crash SHOULD be drawn: the real line plus whatever drawing
         offset the orb still had -- i.e. where the eye last saw it */
      if (r.hit && fx && fx.lastCrash) {
        r.res = Math.hypot(a._fxResX || 0, a._fxResY || 0);
        r.crashGap = Math.hypot(fx.lastCrash.x - (a._renderX + (a._fxResX || 0)), fx.lastCrash.y - (a._renderY + (a._fxResY || 0)));
      }
      out.bolts.push(r);
      live.delete(a);
    }
    for (const p of (S.hitParticles || [])) if (p && (p.type === 'magic' || p.color === '#a78bfa')) out.flat++;
    out.behind.push(!!S._staffTipBehind);
    if (now - t0 < ms) { requestAnimationFrame(tick); return; }
    out.crashesLeft = (S._staffCrashes || []).length;
    out.probe = fx;
    resolve(out);
  };
  requestAnimationFrame(tick);
}), { ms, retreat });

const r1 = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });

  /* ════════════════ 1. ONE CASTER, PHONE-SIZED ════════════════ */
  const P = await H.newPlayer(browser, { name: 'Caster', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const kit = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    const t = (F.WOODWORKING_TIERS || {}).pine;
    R.staffWeapon = { type: 'staff', tierMult: t ? t.tierMult : 1, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
    R.activeSlot = 'staff';
    R.mana = R.maxMana = 500;
    const r = F.calcDisplayDmgRange ? F.calcDisplayDmgRange(R, R.staffWeapon) : null;
    return { cdMs: r ? r.cdMs : null };
  });
  const armed = await armTarget(P, 200, 0);
  rec.ok('a pinned slime is locked 200px east and the staff is out (guard)', !armed.err, armed);

  await P.page.waitForTimeout(1200);
  const s = await sample(P, 4200);
  const casts = s.casts, bolts = s.bolts;
  console.log('    casts: ' + JSON.stringify(casts.map((c) => ({ cad: c.cad, before: r1(c.chargeBefore) }))));
  rec.ok(`the staff kept casting while we watched (guard: ${casts.length} casts, ${bolts.length} bolts ended)`,
    casts.length >= 3 && bolts.length >= 2, { casts: casts.length, bolts: bolts.length });

  /* TIMING.  The charge is the cooldown, so it must be the SAME cooldown the
     gate used -- the one the item card prices (calcDisplayDmgRange.cdMs). */
  rec.ok(`the crystal fills against the gate's own cooldown (${kit.cdMs} ms)`,
    kit.cdMs > 0 && casts.every((c) => c.cad === kit.cdMs), { card: kit.cdMs, stamped: casts.map((c) => c.cad) });
  const gaps = casts.slice(1).map((c, i) => c.at - casts[i].at);
  rec.ok(`...and adds no wind-up: bolts still leave one cooldown apart (${gaps.join(', ')} ms)`,
    gaps.length >= 2 && gaps.every((g) => g >= kit.cdMs - 5 && g <= kit.cdMs + 260), { gaps, cd: kit.cdMs });
  const withBefore = casts.filter((c) => typeof c.chargeBefore === 'number');
  rec.ok('...and reads full on the frame the bolt leaves',
    withBefore.length >= 2 && withBefore.every((c) => c.chargeBefore >= 0.85), withBefore.map((c) => r1(c.chargeBefore)));
  const mid = s.frames.filter((f) => f.rhythm === 1 && f.charge > 0.3 && f.charge < 0.8);
  rec.ok('...and charges visibly in between: the crystal gathers sparks mid-cooldown',
    mid.length > 0 && s.frames.some((f) => f.orbit > 0), { midFrames: mid.length, maxOrbit: Math.max(0, ...s.frames.map((f) => f.orbit || 0)) });

  /* THE STAFF, held head-up.  scale.y < 0 is the v2.3.1786 blade-up flip,
     which turned the staff's crystal to the floor. */
  const staffFrames = s.frames.filter((f) => f.sy != null);
  rec.ok('the staff is held head-up (no blade-up flip on a staff)',
    staffFrames.length > 0 && staffFrames.every((f) => f.sy > 0), { sy: [...new Set(staffFrames.map((f) => f.sy))] });
  const tipFrames = s.frames.filter((f) => f.tipAge != null && f.tipAge < 100);
  rec.ok('...and its crystal is published live, above the hip line',
    tipFrames.length > s.frames.length * 0.8 && tipFrames.every((f) => f.tipY < f.py),
    { live: tipFrames.length, of: s.frames.length, sample: tipFrames.slice(0, 2).map((f) => ({ tipY: r1(f.tipY), py: r1(f.py) })) });

  /* THE KICK.  The target is east, so the crystal turns clockwise toward it:
     positive rotation, 14 degrees at the first 12 fps step, settled within
     ~350 ms. */
  const after = (lo, hi) => s.frames.filter((f) => f.lastCast && f.t - f.lastCast >= lo && f.t - f.lastCast <= hi && f.rot != null);
  const kickRot = after(20, 200).map((f) => f.rot);
  const settleRot = after(420, 620).map((f) => f.rot);
  rec.ok(`the staff kicks toward the target on release (peak ${r1(Math.max(0, ...kickRot) * 180 / Math.PI)} deg)`,
    kickRot.length > 0 && Math.max(...kickRot) > 0.15, kickRot.map(r1));
  rec.ok('...and settles again before the next cast',
    settleRot.length > 0 && settleRot.every((r) => Math.abs(r) < 0.08), settleRot.map(r1));

  /* THE LINE.  First drawn frame: at the crystal.  Last drawn frame before
     the hit: back on the real line (what the hit test and the crash use). */
  const born = bolts.filter((b) => b.born);
  const firstGap = born.map((b) => Math.hypot(b.firstDx - b.tipX, b.firstDy - b.tipY));
  console.log('    launch offsets: ' + JSON.stringify(born.map((b) => r1(b.off))));
  rec.ok(`every bolt is drawn leaving the crystal (worst ${r1(Math.max(0, ...firstGap))}px off it, ${born.length} seen at birth)`,
    born.length >= 2 && firstGap.every((g) => g <= 4), firstGap.map(r1));
  const hits = bolts.filter((b) => b.hit > 0);
  const lastGap = hits.map((b) => Math.hypot(b.lastDx - b.lastRx, b.lastDy - b.lastRy));
  rec.ok(`...and is back on its real flight line before it hits (worst ${r1(Math.max(0, ...lastGap))}px)`,
    hits.length > 0 && lastGap.every((g) => g <= 2), { hits: hits.length, gaps: lastGap.map(r1) });

  /* THE HIT. */
  rec.ok('the flat purple impact spray is gone (the crash replaces it)', s.flat === 0, { flat: s.flat });
  rec.ok(`every hit crashed through the staff cast (${s.probe && s.probe.crashes} crashes, queue drained)`,
    !!s.probe && s.probe.crashes >= hits.length && s.crashesLeft === 0, { probe: s.probe, left: s.crashesLeft });

  await P.page.screenshot({ path: `${OUT}/east.png`, clip: { x: 95, y: 330, width: 270, height: 170 } }).catch(() => {});

  /* THE LAYER.  The crystal's light is drawn over the body but under anything
     standing in front of him (v2.3.2633's occluders live in gatherNodesFront,
     above `player`), so it is the TOP child of the player layer. */
  rec.ok('the crystal\'s light draws from the top of the player layer (under whatever stands in front of him)',
    !!s.probe && s.probe.frontLayer === 'player' && s.probe.frontOnTop === true, s.probe);
  rec.ok('...and facing the target (east) the staff is in front of him, so nothing is dimmed',
    s.behind.length > 0 && s.behind.every((b) => b === false), { behind: [...new Set(s.behind)] });

  /* CLOSE RANGE.  A slime 90px away is hit inside the first 40px of flight,
     while the bolt is still easing off the crystal: the crash must burst at
     the DRAWN orb, not on the line under it (review, F2).  Not closer: at
     70px the capsule reaches it on the first sim tick, before the bolt has
     ever been drawn -- there is no seen position then, and the line is right.
     v2.3.2785: the bolt now flies on into the slime before it bursts, which
     from 90px carries it past the end of the easing -- nothing left of the
     offset to test.  So the slime stands at 50px: the hit registers on the
     first tick as the note above says, but the bolt is DRAWN from the next
     frame, flying in, and lands about two thirds of the way through its
     easing, with the offset still live. */
  await armTarget(P, 50, 0);
  await P.page.waitForTimeout(1000);
  const near = await sample(P, 3000);
  const nearHits = near.bolts.filter((b) => b.hit > 0 && typeof b.crashGap === 'number');
  console.log('    close range: ' + JSON.stringify({ casts: near.casts.length, bolts: near.bolts.map((b) => ({ hit: b.hit, res: r1(b.res), gap: r1(b.crashGap), born: b.born })), crashes: near.probe && near.probe.crashes }));
  rec.ok(`point blank, the crash is drawn where the orb was seen (worst ${r1(Math.max(0, ...nearHits.map((b) => b.crashGap)))}px, offsets ${nearHits.map((b) => r1(b.res)).join('/')})`,
    nearHits.length >= 2 && nearHits.some((b) => b.res > 1) && nearHits.every((b) => b.crashGap <= 1.5), nearHits);

  /* BACKING AWAY.  A staff bolt rides the caster's current position, so its
     motion on the page includes his; the drawn heading must not (review, F4). */
  await armTarget(P, 230, 0);
  await P.page.waitForTimeout(800);
  const back = await sample(P, 2400, 2.5);
  rec.ok(`backing away while casting, no bolt turns off its heading (worst ${r1(back.maxRotDev * 180 / Math.PI)} deg)`,
    back.casts.length >= 2 && back.maxRotDev < 0.6, { casts: back.casts.length, maxRotDev: back.maxRotDev });

  /* EVERY FACING.  Head-up and above the hip whichever way he faces; one
     picture each for the owner. */
  for (const [name, dx, dy] of [['west', -200, 0], ['north', 0, -190], ['south', 0, 190]]) {
    await armTarget(P, dx, dy);
    await P.page.waitForTimeout(1500);
    const f = await sample(P, 700);
    const fr = f.frames.filter((x) => x.sy != null && x.tipAge != null && x.tipAge < 100);
    rec.ok(`facing ${name}: the staff stands head-up with the crystal above the hip`,
      fr.length > 0 && fr.every((x) => x.sy > 0 && x.tipY < x.py), fr.slice(0, 2).map((x) => ({ sy: x.sy, tipY: r1(x.tipY), py: r1(x.py) })));
    if (name === 'north') {
      /* his back is to us and the staff is carried behind him: its light is
         dimmed rather than painted over his back (review, F3) */
      rec.ok('facing north: the staff is behind him, so the crystal\'s light is dimmed',
        f.behind.length > 0 && f.behind.every((b) => b === true), { behind: [...new Set(f.behind)] });
    }
    const clip = name === 'north' ? { x: 95, y: 250, width: 200, height: 240 }
      : name === 'south' ? { x: 95, y: 330, width: 200, height: 240 }
      : { x: 25, y: 330, width: 270, height: 170 };
    await P.page.screenshot({ path: `${OUT}/${name}.png`, clip }).catch(() => {});
  }

  /* QUIET.  Stop casting: one cooldown and the grace later, no glow. */
  const quiet = await P.page.evaluate(() => new Promise((resolve) => {
    const S = window._gameState.current;
    S.autoAttack = false; S.lockedTarget = null;
    setTimeout(() => resolve(window.__btStaffFx ? window.__btStaffFx() : null), (S._staffCadenceMs || 900) + 700);
  }));
  rec.ok('stop casting and the crystal goes dark', !!quiet && quiet.rhythm === 0 && quiet.drawn.glowFront === 0, quiet);
  await P.ctx.close().catch(() => {});

  /* ════════════════ 2. A PEER SEES YOUR CAST ════════════════
     The staff must be equipped THROUGH THE WORKER so the peer is told what
     you are holding (wpnType rides the player snapshot). */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Caster', nameB: 'Watcher' });
  const aId = await H.readState(A, (S) => S.myId);
  await H.devOp(wsPort, 'kit', aId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  const eq = await H.equipWeapon(A, 'staff', 'staffWeapon', 'staff');
  await A.page.waitForTimeout(1500);
  const bSeesStaff = await H.waitFor(B, (S) => { const o = S.others && S.others[Object.keys(S.others)[0]]; return o ? o.wpnType : null; },
    (t) => t === 'staff', { timeout: 15000, label: 'B sees A holding a staff' }).catch(() => null);
  rec.ok('the watcher is told the caster holds a staff (guard)', bSeesStaff === 'staff', { eq, bSeesStaff });
  await armTarget(A, 200, 0);
  await A.page.waitForTimeout(600);
  const peer = await B.page.evaluate(({ aId, ms }) => new Promise((resolve) => {
    const out = { stamps: 0, tipLive: 0, frames: 0, remote: [] };
    const seen = new Set();
    let last = 0;
    const t0 = Date.now();
    const tick = () => {
      const S = window._gameState.current, o = S.others && S.others[aId];
      out.frames++;
      if (o && o._staffCastAt && o._staffCastAt !== last) { out.stamps++; last = o._staffCastAt; }
      if (o && o._staffTipAt && Date.now() - o._staffTipAt < 100) out.tipLive++;
      for (const rp of (S._remoteProjectiles || [])) {
        if (!rp || !rp.isStaff || rp.isSpecial || seen.has(rp) || rp._fxPx == null || !o) continue;
        seen.add(rp);
        if (Date.now() - rp._fxSeen >= 40) continue;   /* in flight before we looked: no first frame */
        out.remote.push({ gap: Math.hypot(rp._fxPx - o._staffTipX, rp._fxPy - o._staffTipY) });
      }
      if (Date.now() - t0 < ms) { requestAnimationFrame(tick); return; }
      out.probe = window.__btStaffFx ? window.__btStaffFx() : null;
      resolve(out);
    };
    requestAnimationFrame(tick);
  }), { aId, ms: 3500 });
  console.log('    peer: ' + JSON.stringify({ stamps: peer.stamps, tipLive: peer.tipLive, frames: peer.frames, remote: peer.remote.map((r) => r1(r.gap)), lastCast: peer.probe && peer.probe.lastCast }));
  rec.ok(`the watcher sees each of the caster's bolts as a cast (${peer.stamps} stamped)`, peer.stamps >= 2, peer);
  rec.ok('...draws the caster\'s crystal live', peer.tipLive > peer.frames * 0.5, { tipLive: peer.tipLive, frames: peer.frames });
  rec.ok('...and flashes the release at the caster\'s crystal, not their own',
    !!peer.probe && peer.probe.casts >= 1 && peer.probe.lastCast && peer.probe.lastCast.owner === 'peer', peer.probe);
  rec.ok(`...and draws each remote bolt leaving the caster's crystal (worst ${r1(Math.max(0, ...peer.remote.map((r) => r.gap)))}px)`,
    peer.remote.length >= 1 && peer.remote.every((r) => r.gap <= 6), peer.remote);
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
