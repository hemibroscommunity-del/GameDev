/* NAME PLATES FOR EVERYONE, AND BENCHES THAT FACE THE WATER (v2.3.2071).
 *
 * Owner, two asks in one message:
 *   "Make every persons name or title as a consistent name plate"
 *   "Position the benches so that lengthwise they face the fountain. Tallest
 *    back part should be furthest back from the fountains"
 *
 * The first is checked as a UNIVERSAL, not as a list: every NPC the game
 * spawns has to have a plate, whoever they are, so the test walks whatever
 * NPC_DATA contains rather than naming the five that exist today. That is the
 * difference between "the three I just fixed have plates" and the thing the
 * owner asked for -- a sixth townsperson added later fails this without anyone
 * remembering to update it.
 *
 * The second is geometry, and it is checked against the DRAWN sprite: which
 * way a bench faces is a fact about the art plus its flip, and re-deriving it
 * in the test from the same table the renderer reads would only assert that
 * the table equals itself.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sitter', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2800);

  /* ── 1. EVERY PERSON HAS THE SAME PLATE ── */
  const people = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.npcs || []).map((n) => ({ id: n.id, name: n.name, role: n.plateRole || '' }));
  });
  rec.ok(`the town has townsfolk to label (${people.length})`, people.length >= 4, people);

  /* The renderer's own record of what it painted, one entry per NPC it drew. */
  await P.page.waitForTimeout(1200);
  const plates = await P.page.evaluate(() => (window.__btNpcSprites
    ? window.__btNpcSprites().map((n) => ({ id: n.id, name: n.name,
        plate: n.plate, oldLabelHidden: n.oldLabelHidden }))
    : []));
  rec.ok(`every NPC on screen built a plate (${plates.length} of ${people.length})`,
    plates.length === people.length && plates.every((p) => p.plate), plates);
  rec.ok('...and each one carries that person\'s name',
    plates.length > 0 && plates.every((p) => p.plate && p.plate.name === p.name), plates);
  rec.ok('...and a title under it, in the slot a player\'s level sits in',
    plates.length > 0 && plates.every((p) => p.plate && p.plate.role && p.plate.role.length > 0),
    plates.map((p) => `${p.name}: ${p.plate && p.plate.role}`));
  /* Consistency is the ask, so the OLD above-head label must be gone on all of
     them — one NPC still wearing it is exactly the inconsistency reported. */
  rec.ok('...with the old above-head label retired on every one of them',
    plates.length > 0 && plates.every((p) => p.oldLabelHidden === true), plates);
  /* Same rule for the drop, so five different-sized people are spaced alike
     rather than merely all having a plate: every plate hangs below the feet,
     and each one's gap is the same FRACTION of that person's own height. */
  const drops = plates.map((p) => p.plate && p.plate.y);
  rec.ok(`...all hung below the feet, none over a head (${drops.join(', ')})`,
    drops.every((y) => typeof y === 'number' && y >= 14), plates);
  const ratios = await P.page.evaluate(() => (window.__btNpcSprites
    ? window.__btNpcSprites().map((n) => ({ id: n.id,
        r: n.plate && n.height ? +(n.plate.y / n.height).toFixed(3) : null }))
    : []));
  const rs = ratios.map((r) => r.r).filter((r) => r !== null);
  rec.ok(`...and spaced by the same rule on every body (${rs.join(', ')})`,
    rs.length === plates.length && (Math.max(...rs) - Math.min(...rs)) < 0.04, ratios);

  /* The plate is the one the PLAYER uses — the point of the shared component.
     Compared structurally rather than by size: an NPC's is rasterised smaller
     on purpose (9px against the player's 13). */
  /* ── 2. THE BENCHES FACE THE FOUNTAIN ── */
  const drawn = await P.page.evaluate(() => window.__btWorldProps && window.__btWorldProps());
  rec.ok(`the renderer reported what it drew (${drawn && drawn.length} props)`,
    !!(drawn && drawn.length), drawn && drawn.map((d) => d.id));
  const by = (id) => (drawn || []).find((d) => d.id === id);
  const fountain = by('fountain'), bw = by('bench-w');
  rec.ok('the fountain and the bench are on the map',
    !!(fountain && bw), { fountain: !!fountain, bw: !!bw });
  /* v2.3.2088 (owner: "Remove the banners and bench-e"). Asserted, not merely
     no longer looked for: a second bench reappearing is a thing to hear about. */
  rec.ok('...and the east bench is gone', !by('bench-e'),
    (drawn || []).map((d) => d.id));

  /* ═══ v2.3.2088: THE ART WAS READ BACKWARDS, AND THIS TEST SAID SO ═══
     The line below used to read "unflipped art seats face south-east", and
     the sprite says the opposite: the backrest runs along the upper-right and
     the seat opens toward the LOWER-LEFT.  So the check asserted the mistake,
     passed green on it, and the benches sat with their backs to the water
     through every run of this file — which is the fault the owner reported
     TWICE, once to place them and once again to turn this one round.

     A test that encodes the misreading it was written to catch is worse than
     no test: it converts a visible bug into a green tick. Stated as the
     sprite actually is, once:

         unflipped  seat opens SOUTH-WEST   (backrest north-east)
         flipX      seat opens SOUTH-EAST   (backrest north-west)

     So a bench faces the fountain when the fountain lies in the quadrant its
     seat opens into — south, and WEST when unflipped, EAST when flipped. */
  {
    const dx = fountain.x - bw.x, dy = fountain.y - bw.y;
    const deg = Math.round(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI);
    rec.ok(`the fountain is SOUTH of the bench, so the backrest is the far side`,
      dy > 0, { dx, dy, deg });
    /* flipX true => seat opens south-EAST => the fountain must be east of it. */
    rec.ok(`...and on the side the seat opens into (flipX ${bw.flipX}, fountain ${dx > 0 ? 'EAST' : 'WEST'})`,
      bw.flipX === true && dx > 0, { dx, flipX: bw.flipX });
    rec.ok(`...on a real diagonal, not edge-on (${deg} deg below horizontal)`,
      deg >= 25 && deg <= 55, { deg });
  }

  /* The bench may not be drawn over the fountain or over another prop — the
     placement was measured that way and nothing else enforces it. */
  const hit = (a, b) => !(a.x + a.width / 2 <= b.x - b.width / 2
    || b.x + b.width / 2 <= a.x - a.width / 2
    || a.y <= b.y - b.height || b.y <= a.y - a.height);
  const clashes = [];
  for (const o of drawn) {
    if (o.id === bw.id) continue;
    if (hit(bw, o)) clashes.push(`${bw.id} over ${o.id}`);
  }
  rec.ok('the bench is not drawn on top of another prop', clashes.length === 0, clashes);

  /* ── 3. THE OBJECTS ARE UNWALKABLE ──
     Owner: "It should be obvious but make sure the objects are unwalkable."
     It was not obvious and it was not true: only four of the twelve props
     carried a footprint, and the four that did blocked a narrow strip of
     their base -- the forge stopped you across 330 px of its 551, and only
     for the bottom 110 px of a 500 px building.

     Checked two ways, because the grid and the game can disagree.  First that
     the client's collision grid marks every prop's own centre solid -- the
     grid is built from propFootprint at 16 px cells, so a prop with no
     footprint silently contributes nothing and this is what catches that.
     Then that a real walk actually stops, which is the only claim a player
     can make. */
  const solid = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable && S._tiledWalkable.town;
    if (!grid || !grid.length) return { grid: false };
    const m = await import('/src/data/worldProps.js').catch(() => null);
    return { grid: true, gh: grid.length, gw: grid[0].length, hasModule: !!m };
  });
  rec.ok('the client built a collision grid for town', solid.grid, solid);
  /* Sampled through the renderer's own prop record, so the test asks about
     the props that were actually DRAWN rather than its own copy of the list. */
  const blocked = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable.town;
    const gh = grid.length, gw = grid[0].length;
    const W = 52 * 32, H = 55 * 32;
    const at = (x, y) => {
      const gx = Math.floor(x * gw / W), gy = Math.floor(y * gh / H);
      return !(grid[gy] && grid[gy][gx]);          /* false in the grid = solid */
    };
    return (window.__btWorldProps ? window.__btWorldProps() : []).map((p) => ({
      id: p.id, blocks: p.blocks,
      /* one body-height above the base is inside any real footprint */
      solidAtBase: at(p.x, p.y - 4),
    }));
  });
  /* v2.3.2088: the gate banners are GONE (owner), so there is no walkable
     exception left — every prop in town is solid.  v2.3.2078 had made the two
     of them walkable because banner-gate-e stood on the staircase that is the
     town's only exit; removing the art removes the exception with it. */
  const soft = blocked.filter((b) => !b.solidAtBase).map((b) => b.id);
  rec.ok(`every prop in town is solid, with no exceptions left `
       + `(${blocked.length - soft.length} of ${blocked.length})`,
    blocked.length >= 10 && soft.length === 0, { soft });
  rec.ok('...and no gate banner remains to stand on the stairs',
    !blocked.some((b) => String(b.id).startsWith('banner-gate')),
    blocked.map((b) => b.id));

  /* THE WALK.  Straight north into the fountain from open cobble: the player
     has to stop south of its basin instead of strolling through the water. */
  const fountainProp = (await P.page.evaluate(() => (window.__btWorldProps
    ? window.__btWorldProps().find((p) => p.id === 'fountain') : null)));
  await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current;
    S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
  }, { x: fountainProp.x, y: fountainProp.y + 210 });
  await P.page.waitForTimeout(500);
  await P.page.keyboard.down('w');
  await P.page.waitForTimeout(2600);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(300);
  const stop = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { x: Math.round(S.player.x), y: Math.round(S.player.y) };
  });
  /* The basin's south edge, from the prop's own reported footprint. */
  const basinY = fountainProp.footprint ? fountainProp.footprint.y1 : fountainProp.y;
  rec.ok(`walking north into the fountain stops you at its rim (y ${stop.y}, basin ends at ${Math.round(basinY)})`,
    stop.y > basinY - 2, { stop, basinY, footprint: fountainProp.footprint });
  rec.ok('...and you did actually walk (you are not just where you were put)',
    stop.y < fountainProp.y + 205, { stop, from: fountainProp.y + 210 });

  /* Stand south of the fountain so the shot frames the bench, the water beside
     it and the townsfolk's plates -- the picture a reviewer needs to see what
     the numbers above describe. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.player.x = 860; S.player.y = 1180; S.player.vx = 0; S.player.vy = 0;
  });
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => {
    try { window.__broShopBus && window.__broShopBus.setOpen(false); } catch (e) {}
  });
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(500);
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/plazaplate.png' }).catch(() => {});
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
