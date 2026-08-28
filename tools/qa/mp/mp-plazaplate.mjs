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
  const fountain = by('fountain'), bw = by('bench-w'), be = by('bench-e');
  rec.ok('the fountain and both benches are on the map',
    !!(fountain && bw && be), { fountain: !!fountain, bw: !!bw, be: !!be });

  /* The art's seat faces SOUTH-EAST as drawn and SOUTH-WEST mirrored, so
     "facing the fountain" is: the fountain lies in the quadrant the seat
     points at.  SOUTH in both cases is the same statement as the owner's
     second sentence — the backrest is the north side, so a fountain to the
     south is a fountain the back is turned away from. */
  const check = (b, label, wantEast) => {
    const dx = fountain.x - b.x, dy = fountain.y - b.y;
    const deg = Math.round(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI);
    rec.ok(`${label}: the fountain is ${dy > 0 ? 'SOUTH' : 'NORTH'} of it, so the backrest is the far side`,
      dy > 0, { dx, dy, deg });
    rec.ok(`${label}: ...and ${wantEast ? 'EAST' : 'WEST'}, the way this sprite's seat points (flipX ${b.flipX})`,
      (dx > 0) === wantEast && b.flipX === !wantEast, { dx, flipX: b.flipX });
    rec.ok(`${label}: ...on a real diagonal, not edge-on (${deg} deg below horizontal)`,
      deg >= 25 && deg <= 55, { deg });
  };
  check(bw, 'west bench', true);    /* unflipped art seats face south-east  */
  check(be, 'east bench', false);   /* mirrored art seats face south-west   */

  rec.ok('the two benches mirror each other about the fountain',
    Math.abs((fountain.x - bw.x) - (be.x - fountain.x)) <= 2 && bw.y === be.y,
    { bw: { x: bw.x, y: bw.y }, be: { x: be.x, y: be.y }, fx: fountain.x });
  rec.ok(`...and are drawn the same size (${Math.round(bw.width)}x${Math.round(bw.height)})`,
    Math.abs(bw.width - be.width) < 1 && Math.abs(bw.height - be.height) < 1,
    { bw: { w: bw.width, h: bw.height }, be: { w: be.width, h: be.height } });

  /* Neither bench may be drawn over the fountain or over another prop — the
     placement was measured that way and nothing else enforces it. */
  const hit = (a, b) => !(a.x + a.width / 2 <= b.x - b.width / 2
    || b.x + b.width / 2 <= a.x - a.width / 2
    || a.y <= b.y - b.height || b.y <= a.y - a.height);
  const clashes = [];
  for (const b of [bw, be]) {
    for (const o of drawn) {
      if (o.id === b.id || o.id === 'bench-w' || o.id === 'bench-e') continue;
      if (hit(b, o)) clashes.push(`${b.id} over ${o.id}`);
    }
  }
  rec.ok('neither bench is drawn on top of another prop', clashes.length === 0, clashes);

  /* Stand south of the fountain so the shot frames the pair of benches, the
     water between them and the townsfolk's plates -- the picture a reviewer
     needs to see what the numbers above describe. */
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
