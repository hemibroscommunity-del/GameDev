/* WIND DUNES: THINGS GET SMALLER AND SLOWER AS YOU WALK NORTH (v2.3.2745)
 *
 * Owner: "some maps show distance. So the north part of the image shows the
 * background getting smaller. I'm wondering if the objects in the game,
 * player, monsters, etc can follow a similar perspective changing pattern the
 * more north on the map they get and also slow the movement speed the further
 * north they get to emulate travel distance. I'm thinking of desert winds
 * zone."  Step 1 of 3, client only, behind the `?depth=1` preview switch.
 * v2.3.2790, step 2: the worker measures its monsters in the same curve and
 * advertises caps.zoneDepth, which turns the drawing on with no override
 * (section 1b); `window.__btDepth` still forces it either way.
 *
 * WHAT THIS ASKS THE GAME:
 *   - with the switch OFF, nothing in the dunes changes (scale exactly 1), so
 *     shipping the code is a no-op until the owner turns it on;
 *   - with it ON, your body is full size at the south edge and ~0.42 at the
 *     north edge, read off the CONTAINER scale the renderer really drew;
 *   - a monster is drawn at 1.5 x the same curve at its own y;
 *   - walking east-west (y held, so the curve is constant) covers less ground
 *     per second in the north than in the south, by about the same ratio;
 *   - worldview is still the only zone with `playerScale` (the dunes use their
 *     own `depth` key, which mp-wvscale's negative relies on).
 */
import * as H from './harness.mjs';

const TILE = 32;
const SHOTS = new URL('./out/', import.meta.url).pathname;
const shot = (P, name) => P.page.screenshot({ path: `${SHOTS}/dunedepth-${name}.png` }).catch(() => {});
const SOUTH_Y = 30 * TILE;
const NORTH_Y = 3 * TILE;

const expected = (P, y) => P.page.evaluate((yy) => {
  const z = window.__btZones && window.__btZones.sky;
  const d = z && z.depth;
  if (!d) return null;
  const t = Math.max(0, Math.min(1, 1 - yy / (z.h * 32)));
  return d.near + (d.far - d.near) * Math.pow(t, d.curve);
}, y);

/* The widest clear east-west run on row `ty`, per the client's own isSolid. */
const clearRow = (P, ty) => P.page.evaluate((row) => {
  const solid = window.__btIsSolid;
  if (!solid) return null;
  /* v2.3.2790: ...and nowhere within 3 tiles of the way home (tile 9).  A
     walk that crosses it LEAVES the zone, and the first cut of this read the
     World View's own vista slowdown as the dunes' -- a pass for the wrong
     reason, caught only when the probe reported currentZone. */
  const map = (window._gameState.current || {}).map || [];
  const nearMarker = (tx, ty) => {
    for (let y = ty - 3; y <= ty + 3; y++) for (let x = tx - 3; x <= tx + 3; x++) {
      if (map[y] && map[y][x] === 9) return true;
    }
    return false;
  };
  let best = null, start = null;
  for (let tx = 1; tx <= 31; tx++) {
    const open = tx < 31 && !nearMarker(tx, row) && !solid(tx * 32 + 16, row * 32 + 16)
      && !solid(tx * 32 + 16, row * 32 + 4) && !solid(tx * 32 + 16, row * 32 + 28);
    if (open && start == null) start = tx;
    if (!open && start != null) {
      if (!best || tx - start > best.len) best = { from: start, len: tx - start };
      start = null;
    }
  }
  return best;
}, ty);

const place = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

/* Hold D and read the SPEED the movement step computed (|P.vx|, px per
   60fps frame), plus how far the bro actually got.
   v2.3.2790: the speed, not the distance, is the verdict.  The first cut
   measured distance and it lied twice: a straight hop to the south row
   crossed the zone's way home (tile 9, [1..2, 28]) and the "dunes" walks
   were really World View walks under ITS vista slowdown; and the dunes'
   monsters wander into the row, where a body blocks the walk.  P.vx is set
   from finalSpd before collision runs, so a monster in the way cannot move
   it, and the zone is recorded so a walk that left the dunes cannot pass. */
const walkEast = async (P, x, y, ms) => {
  await H.hopTo(P, 16 * TILE + 16, y < 16 * TILE ? 8 * TILE : 24 * TILE);   /* via the middle, clear of the marker */
  await H.hopTo(P, x, y);
  await P.page.waitForTimeout(500);
  const x0 = await H.readState(P, (S) => S.player.x);
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(Math.round(ms / 2));
  const mid = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { vx: Math.abs(S.player.vx || 0), y: S.player.y, zone: S.currentZone,
      k: window.__btZoneDepth ? window.__btZoneDepth(S.currentZone, S.player.y) : null };
  });
  await P.page.waitForTimeout(ms - Math.round(ms / 2));
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(150);
  const x1 = await H.readState(P, (S) => S.player.x);
  return Object.assign(mid, { dx: x1 - x0, clean: mid.zone === 'sky' && Math.abs(mid.y - y) < 24 });
};

/* The container scale the renderer drew, and the y it was drawn at (a spot
   inside a dune is pushed out, so the asked-for y is not the real one). */
const drawn = (P) => P.page.evaluate(() => {
  const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
  const S = window._gameState.current;
  return d ? { scale: d.scale, y: S.player.y } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Horizon', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const wvOnly = await P.page.evaluate(() => Object.entries(window.__btZones || {})
    .filter(([, v]) => v && v.playerScale).map(([id]) => id));
  rec.ok('worldview is still the only zone with playerScale — the dunes carry '
    + 'their own `depth` key', wvOnly.length === 1 && wvOnly[0] === 'worldview', wvOnly);

  await H.warpToZone(P, { wsPort, label: 'Wind Dunes', zoneId: 'sky' });
  const inDunes = await H.readState(P, (S) => S.currentZone === 'sky');
  rec.ok('the bro reached Wind Dunes (guard)', inDunes === true);
  if (!inDunes) { await P.ctx.close().catch(() => {}); return; }

  const midX = 16 * TILE;

  /* ═══ 1. SWITCH OFF: NOTHING CHANGES ═══ */
  await P.page.evaluate(() => { window.__btDepth = false; });
  await place(P, midX, NORTH_Y);
  await P.page.waitForTimeout(600);
  const offNorth = await drawn(P);
  await shot(P, 'north-off');
  await place(P, midX, SOUTH_Y);
  await P.page.waitForTimeout(600);
  const offSouth = await drawn(P);
  /* The body's resting container scale is not 1 in every zone (the build
     scale rides on it), so "unchanged" is north == south, not == 1. */
  const base = offSouth && offSouth.scale;
  rec.ok('with the preview OFF the bro is the same size at the north edge as '
    + 'the south — shipping this changes nothing until it is switched on',
    !!offNorth && !!base && Math.abs(offNorth.scale - base) < 0.001, { offNorth, offSouth });

  /* ═══ 1b. v2.3.2790: NO OVERRIDE -- THE WORKER DECIDES ═══
     This worker measures its monsters in the curve (server depth.js) and
     says so in caps.zoneDepth, so with no console override and no ?depth=
     in the URL the curve draws for everyone.  A worker without the cap
     would leave it behind the preview -- that half is the unit of
     _previewOn and is not re-driven here. */
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.zoneDepth));
  rec.ok('the local worker advertises caps.zoneDepth (guard)', caps === true, { caps });
  await P.page.evaluate(() => { delete window.__btDepth; });
  await place(P, midX, NORTH_Y);
  await P.page.waitForTimeout(600);
  const liveNorth = await drawn(P);
  const liveWant = liveNorth ? await expected(P, liveNorth.y) : null;
  rec.ok('with no override, the curve draws because the WORKER claims it — '
    + 'the north edge is small for every player, no ?depth=1 needed',
    !!liveNorth && !!base && Math.abs(liveNorth.scale / base - liveWant) < 0.02,
    { live: liveNorth && base ? liveNorth.scale / base : null, liveWant });

  /* ═══ 2. SWITCH ON: THE CURVE ═══ */
  await P.page.evaluate(() => { window.__btDepth = true; });
  await place(P, midX, SOUTH_Y);
  await P.page.waitForTimeout(600);
  const southD = await drawn(P);
  await shot(P, 'south-on');
  const south = southD && base ? southD.scale / base : null;
  const southWant = southD ? await expected(P, southD.y) : null;
  await place(P, midX, NORTH_Y);
  await P.page.waitForTimeout(600);
  const northD = await drawn(P);
  await shot(P, 'north-on');
  const north = northD && base ? northD.scale / base : null;
  const northWant = northD ? await expected(P, northD.y) : null;
  rec.ok('at the south edge the bro is (nearly) full size',
    south != null && Math.abs(south - southWant) < 0.02 && south > 0.9, { south, southWant, southD });
  rec.ok('at the north edge the bro is drawn at about half size — far away',
    north != null && Math.abs(north - northWant) < 0.02 && north < 0.55 && north > 0.3,
    { north, northWant, northD });

  /* ═══ 3. MONSTERS FOLLOW THE SAME CURVE ═══ */
  await P.page.waitForTimeout(1200);
  const mons = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const out = [];
    for (const m of Object.values(S.monsters || {})) {
      if (!m || m.alive === false) continue;
      const s = window.__btMonsterScale ? window.__btMonsterScale(m.id) : null;
      if (!s) continue;
      if (m._tgUntil && m._tgUntil > Date.now()) continue;   /* mid wind-up throb */
      if (m._spawnFxAt && Date.now() - m._spawnFxAt < 1500) continue;   /* growing in */
      out.push({ id: m.id, y: m.renderY != null ? m.renderY : m.y, scale: s.scale, base: s.baseMult });
    }
    return out;
  });
  const checked = [];
  for (const m of mons) checked.push(Object.assign(m, { want: m.base * await expected(P, m.y) }));
  const monOk = checked.length > 0 && checked.every((m) => Math.abs(m.scale - m.want) < 0.06);
  if (checked.length) {
    rec.ok('every monster on screen is drawn at 1.5 x the depth curve at its own y',
      monOk, checked.slice(0, 6));
    const ys = checked.map((m) => m.y);
    if (Math.max(...ys) - Math.min(...ys) > 200) {
      const byY = checked.slice().sort((a, b) => a.y - b.y);
      rec.ok('...so a northern monster is smaller than a southern one',
        byY[0].scale < byY[byY.length - 1].scale, { north: byY[0], south: byY[byY.length - 1] });
    }
  } else {
    rec.skip('monsters follow the depth curve', 'no settled monster reported a scale');
  }

  /* ═══ 3b. A FAR PLATE IS STILL READABLE ═══
     The body goes to 0.42 but the plate is floored at 0.8 of its 15 CSS px
     (entityRenderer PLATE_DEPTH_FLOOR) -- the owner asked for legible plates
     once already. `cssSize` is the size on screen, not the design number. */
  const plates = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const pl = window.__btMonsterPlates;
    const byId = new Map(Object.values(S.monsters || {}).filter(Boolean).map((m) => [m.id, m]));
    return ((pl && pl.plates) || []).filter((p) => p.hasPill && p.cssSize && !p.hidden).map((p) => {
      const m = byId.get(p.id);
      return { id: p.id, css: p.cssSize, y: m ? (m.renderY != null ? m.renderY : m.y) : null };
    }).filter((p) => p.y != null);
  });
  const far = plates.filter((p) => p.y < 16 * TILE);
  if (far.length) {
    rec.ok('a monster plate in the far north is still at least ~12 CSS px — '
      + 'smaller than at your feet, but readable',
      far.every((p) => p.css >= 11.5), far.slice(0, 4));
  } else {
    rec.skip('a far monster plate is readable', 'no plated monster in the north half', plates.slice(0, 4));
  }

  /* ═══ 4. WALKING NORTH IS SLOWER ═══ */
  const rowS = await clearRow(P, 29);
  const rowN = await clearRow(P, 3);
  if (!rowS || !rowN || rowS.len < 6 || rowN.len < 6) {
    rec.skip('walking in the north is slower', 'no clear east-west run', { rowS, rowN });
  } else {
    await P.page.evaluate(() => { window.__btDepth = false; });
    const flat = await walkEast(P, rowN.from * TILE + 16, 3 * TILE + 16, 1200);
    await P.page.evaluate(() => { window.__btDepth = true; });
    const s = await walkEast(P, rowS.from * TILE + 16, 29 * TILE + 16, 1200);
    const n = await walkEast(P, rowN.from * TILE + 16, 3 * TILE + 16, 1200);
    const want = (await expected(P, n.y)) / (await expected(P, s.y));
    const ratio = s.vx > 0 ? n.vx / s.vx : null;
    rec.ok('the walk probes moved, inside the dunes, on the rows asked for (guard)',
      s.clean && n.clean && flat.clean && s.dx > 20 && n.dx > 5 && flat.dx > 5, { s, n, flat });
    rec.ok('in the north the bro walks far slower than in the south — the same '
      + 'ratio as his size',
      ratio != null && Math.abs(ratio - want) < 0.05, { ratio, want, south: s.vx, north: n.vx });
    rec.ok('...and with the curve off the same northern walk is full speed',
      flat.vx > 0 && Math.abs(flat.vx - s.vx / (s.k || 1)) < 0.05 * flat.vx, { flat: flat.vx, south: s.vx, sk: s.k });
  }

  /* ═══ 5. v2.3.2790: YOUR REACH SHRINKS WITH YOU ═══
     Owner: "Yes fix my reach."  The reach ring (effectsRenderer, the same
     GS_OUTER_RADIUS x meleeRangeMult x depthK product monsterCombat's hit
     test uses) is read beside a far monster with the curve off and on, from
     the SAME spot -- so the ratio is the curve and nothing else, whatever
     this character's RANGE stat is. */
  const target = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = Object.values(S.monsters || {}).filter((m) => m && m.alive !== false);
    ms.sort((a, b) => (a.renderY != null ? a.renderY : a.y) - (b.renderY != null ? b.renderY : b.y));
    const m = ms[0];
    return m ? { id: m.id, x: m.renderX != null ? m.renderX : m.x, y: m.renderY != null ? m.renderY : m.y } : null;
  });
  if (!target || target.y > 16 * TILE) {
    rec.skip('your reach shrinks with you', 'no monster in the north half to stand beside', target);
  } else {
    await H.hopTo(P, target.x + 60, target.y);
    /* The ring draws only with the SWORD active and a live target (the lock
       wins; effectsRenderer), and targeting may re-pick between frames -- so
       the slot, the lock and the curve are set and the ring read inside one
       evaluate, a few animation frames apart.  The first cut set the lock
       once and read it later, and skipped about one run in three. */
    const ringAt = (on) => P.page.evaluate(async ({ v, id }) => {
      const S = window._gameState.current;
      window.__btDepth = v;
      const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
      let r = null;
      for (let i = 0; i < 12 && !r; i++) {
        const m = Object.values(S.monsters || {}).find((q) => q && q.id === id && q.alive !== false);
        if (!m) return null;
        if (S.rpg) S.rpg.activeSlot = 'melee';
        S.lockedTarget = { type: 'monster', ref: m };
        await frame(); await frame();
        const got = window.__btReachRing ? window.__btReachRing() : null;
        if (got && got.id === id) r = got;
      }
      return r ? { outer: r.outer, hitR: r.hitR, r: r.r, py: S.player.y,
        k: window.__btZoneDepth ? window.__btZoneDepth('sky', S.player.y) : null } : null;
    }, { v: on, id: target.id });
    const flatR = await ringAt(false);
    const deepR = await ringAt(true);
    rec.ok('your reach: the reach ring drew beside the locked far monster, both ways (guard)',
      !!flatR && !!deepR, { flatR, deepR });
    if (flatR && deepR) {
      rec.ok('your reach: beside a far monster, your sword\'s reach is the flat reach x the curve at your feet',
        Math.abs(deepR.outer / flatR.outer - deepR.k) < 0.02, { flat: flatR.outer, deep: deepR.outer, k: deepR.k });
      rec.ok('your reach: ...and the ring is still reach + the (smaller) body -- what is drawn is what hits',
        Math.abs(deepR.r - (deepR.outer + deepR.hitR)) < 0.01 && deepR.hitR < flatR.hitR, { flatR, deepR });
    }
  }

  /* ═══ 6. v2.3.2879: AN ARROW STUCK IN A FAR MONSTER IS FAR TOO ═══
     Owner: "Arrows shot at far away mummies in desert winds at small
     perspective are still large."  The arrow in flight shrank with the curve
     (v2.3.2790); the shaft it left in the body did not.  One shaft is stuck
     in the northernmost monster and the size it is DRAWN at is read with
     the curve off and on -- the ratio must be the curve at that monster's
     feet, the size its body is drawn. */
  const farM = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = Object.values(S.monsters || {}).filter((m) => m && m.alive !== false && !(m.curHp <= 0));
    ms.sort((a, b) => (a.renderY != null ? a.renderY : a.y) - (b.renderY != null ? b.renderY : b.y));
    return ms[0] ? { id: ms[0].id, y: ms[0].renderY != null ? ms[0].renderY : ms[0].y } : null;
  });
  /* the northernmost live monster, wherever the worker happened to put it --
     any y short of the south edge has a curve below 1 to measure */
  if (!farM || farM.y > 28 * TILE) {
    rec.skip('a shaft stuck in a far monster is drawn at its depth', 'no live monster north of the south edge', farM);
  } else {
    const stuckAt = (on) => P.page.evaluate(async ({ v, id }) => {
      const S = window._gameState.current;
      window.__btDepth = v;
      const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
      let got = null;
      for (let i = 0; i < 12 && !got; i++) {
        const m = Object.values(S.monsters || {}).find((q) => q && q.id === id);
        if (!m) return null;
        m._stuckArrows = [{ ang: 0.3, ox: 0, oy: -20, isStaff: false, color: null }];
        await frame(); await frame();
        const pr = window._pixiRenderer && window._pixiRenderer.stuckScaleProbe ? window._pixiRenderer.stuckScaleProbe() : null;
        if (pr && pr.id === id && pr.spriteScale) got = Object.assign({}, pr,
          { curve: window.__btZoneDepth ? window.__btZoneDepth('sky', m.renderY != null ? m.renderY : m.y) : null });
      }
      const m = Object.values(S.monsters || {}).find((q) => q && q.id === id);
      if (m) m._stuckArrows = [];
      return got;
    }, { v: on, id: farM.id });
    const flatS = await stuckAt(false);
    const deepS = await stuckAt(true);
    rec.ok('a shaft stuck in the far monster was drawn, both ways (guard)', !!flatS && !!deepS, { flatS, deepS });
    if (flatS && deepS) {
      const ratio = deepS.spriteScale / flatS.spriteScale;
      rec.ok(`a shaft stuck in a far monster (y ${deepS.y}) is drawn at the curve there: x${ratio.toFixed(3)}, curve ${deepS.curve}`,
        deepS.curve < 0.95 && Math.abs(ratio - deepS.curve) < 0.03, { flatS, deepS, ratio });
    }
  }

  await P.ctx.close().catch(() => {});
}
