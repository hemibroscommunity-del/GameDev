/* WIND DUNES: THINGS GET SMALLER AND SLOWER AS YOU WALK NORTH (v2.3.2745)
 *
 * Owner: "some maps show distance. So the north part of the image shows the
 * background getting smaller. I'm wondering if the objects in the game,
 * player, monsters, etc can follow a similar perspective changing pattern the
 * more north on the map they get and also slow the movement speed the further
 * north they get to emulate travel distance. I'm thinking of desert winds
 * zone."  Step 1 of 3, client only, behind the `?depth=1` preview switch.
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
  let best = null, start = null;
  for (let tx = 1; tx <= 31; tx++) {
    const open = tx < 31 && !solid(tx * 32 + 16, row * 32 + 16)
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

/* Hold D for `ms` and report how far east the bro got. */
const walkEast = async (P, x, y, ms) => {
  await place(P, x, y);
  await P.page.waitForTimeout(500);
  const x0 = await H.readState(P, (S) => S.player.x);
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(150);
  const s = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  return { dx: s.x - x0, y: s.y };
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
    const want = (await expected(P, 3 * TILE + 16)) / (await expected(P, 29 * TILE + 16));
    const ratio = s.dx > 0 ? n.dx / s.dx : null;
    rec.ok('the walk probes moved (guard)', s.dx > 20 && n.dx > 5 && flat.dx > 20, { s, n, flat });
    rec.ok('in the north the bro covers far less ground per second than in the '
      + 'south — about the same ratio as his size',
      ratio != null && Math.abs(ratio - want) < 0.15, { ratio, want, south: s.dx, north: n.dx });
    rec.ok('...and with the preview off the same northern walk is full speed',
      flat.dx > n.dx * 1.6, { flat: flat.dx, north: n.dx });
  }

  await P.ctx.close().catch(() => {});
}
