/* LIL BRO, THE SECOND WALKING NPC (v2.3.2064).
 *
 * Owner: "Add another little bro for a sprite sheet."
 *
 * THE ASSERTION THAT MATTERS IS THE FACING. A walk sheet's row order is not
 * something you can read off the code, and this sheet is NOT ordered like the
 * shopkeeper's -- its rows 3 and 5 are swapped, so a NPC built on the
 * "obvious" constant would face the wrong way whenever it walked a diagonal.
 * That is the same class of bug as the moonwalk: invisible in review, obvious
 * in play, and nothing else in the suite would catch it.
 *
 * So this drives him in all eight compass directions and reads back WHICH
 * STRIP the renderer bound, against the direction he was actually moving.
 */
import * as H from './harness.mjs';

const DIRS = [
  ['east', 1, 0], ['southeast', 1, 1], ['south', 0, 1], ['southwest', -1, 1],
  ['west', -1, 0], ['northwest', -1, -1], ['north', 0, -1], ['northeast', 1, -1],
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);

  const npc = await H.readState(P, (S) =>
    (S.npcs || []).filter((n) => n && n.id === 'lil_bro')
      .map((n) => ({ id: n.id, name: n.name, x: n.x, y: n.y, sprite: n.sprite }))[0] || null);
  rec.ok('Lil Bro is in town', !!npc, npc);
  rec.ok('...standing on the map that ships, not off its edge',
    !!npc && npc.x > 0 && npc.x < 52 * 32 && npc.y > 0 && npc.y < 55 * 32, npc);

  /* His art is loaded before play, not on first sighting (CLAUDE.md's
     preloading law) -- the walk strips ride the same manifest every NPC
     sprite does, so this is a real check that they were listed. */
  const drawn = await P.page.evaluate(() => {
    const all = window.__btNpcSprites ? window.__btNpcSprites() : [];
    return all.find((n) => n.id === 'lil_bro') || null;
  });
  rec.ok('...and is drawn, so his strips were preloaded rather than missing',
    !!drawn && drawn.height > 0, drawn);
  /* A child, not an adult in a small shirt: the import convention normalises
     every figure to the same height, so a kid who is NOT shorter than the
     mayor means the scale was never applied. */
  const mayor = await P.page.evaluate(() => {
    const all = window.__btNpcSprites ? window.__btNpcSprites() : [];
    return all.find((n) => n.id === 'mayor_bro') || null;
  });
  rec.ok(`...and drawn shorter than the grown-ups (${Math.round(drawn.height)}px `
       + `against Mayor Bro's ${mayor ? Math.round(mayor.height) : '?'})`,
    !!mayor && drawn.height < mayor.height * 0.95, { lil: drawn.height, mayor: mayor && mayor.height });

  /* ── 1. THE ART ITSELF IS FILED UNDER THE RIGHT DIRECTION ──
     This is the check the whole import hinges on. A walk sheet's row order is
     not readable from code, and THIS sheet is not ordered like the
     shopkeeper's: its rows 3 and 5 are swapped, so the obvious constant would
     have filed north-west's art as north-east and vice versa. An NPC would
     then face the wrong way on every diagonal -- invisible in review, obvious
     in play.

     Measured in the browser because the strips are webp: draw frame 0 of each
     to a canvas and count FACE skin either side of the figure's centre. The
     west/east pair calibrates the rule (a left profile puts the face left),
     and the diagonals are then read against it. */
  const facing = await P.page.evaluate(async () => {
    const load = (src) => new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
    });
    const out = {};
    for (const d of ['west', 'east', 'northwest', 'northeast', 'north', 'south']) {
      const img = await load(`/sprites/npc/lil-bro-walk-${d}.webp`);
      if (!img) { out[d] = null; continue; }
      const fw = Math.round(img.width / 4), fh = img.height;
      const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
      const px = cx.getImageData(0, 0, fw, fh).data;
      /* Opaque bounds, then the HEAD band -- the face lives there, and below
         it the bare arms would swamp the count. */
      let x0 = fw, x1 = 0, y0 = fh, y1 = 0;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (px[(y * fw + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      const hb0 = y0, hb1 = y0 + Math.round((y1 - y0) * 0.30);
      let L = 0, R = 0, hx0 = fw, hx1 = 0;
      for (let y = hb0; y < hb1; y++) for (let x = 0; x < fw; x++) {
        if (px[(y * fw + x) * 4 + 3] > 40) { if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; }
      }
      const hc = (hx0 + hx1) / 2;
      for (let y = hb0; y < hb1; y++) for (let x = 0; x < fw; x++) {
        const i = (y * fw + x) * 4;
        const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
        /* face skin: warm, light, red clearly above blue */
        if (a > 120 && r > 170 && r > g + 40 && g > b && (r - b) > 60) {
          if (x < hc) L++; else R++;
        }
      }
      out[d] = { L, R };
    }
    return out;
  });
  console.log('   face-skin per strip', JSON.stringify(facing));

  rec.ok('every strip decoded (guard: the checks below read pixels)',
    Object.values(facing).every((v) => v), facing);
  /* The calibration: a LEFT profile must put the face on the left. */
  rec.ok(`the WEST strip really is a left profile (${facing.west.L} left / ${facing.west.R} right)`,
    facing.west.L > facing.west.R * 2, facing.west);
  rec.ok(`the EAST strip really is a right profile (${facing.east.L} / ${facing.east.R})`,
    facing.east.R > facing.east.L * 2, facing.east);
  /* And the diagonals, read against that same rule. This is the pair the
     sheet had in the opposite order from the shopkeeper's. */
  /* A RATIO, not a bare inequality. The first cut asked only for R > L, which
     the wrong-order build satisfied 21 to 20 -- a one-pixel margin on a
     near-symmetric back view, i.e. it passed by accident. Real north-east is
     0 left to 177 right. */
  rec.ok(`the NORTH-EAST strip shows the right of the face, like east does `
       + `(${facing.northeast.L} / ${facing.northeast.R})`,
    facing.northeast.R > facing.northeast.L * 3 + 20, facing.northeast);
  rec.ok('...and NORTH-WEST does not -- the two are not the same file twice',
    facing.northwest.R < facing.northeast.R, { nw: facing.northwest, ne: facing.northeast });
  rec.ok(`the NORTH strip hides the face, as a back view must `
       + `(${facing.north.L + facing.north.R} skin px against south's `
       + `${facing.south.L + facing.south.R})`,
    (facing.north.L + facing.north.R) < (facing.south.L + facing.south.R) * 0.5, facing);

  /* ── 2. AND THE RENDERER POINTS HIM THE WAY HE WALKS ── */
  const results = [];
  for (const [want, dx, dy] of DIRS) {
    await P.page.evaluate(([ddx, ddy]) => {
      const S = window._gameState.current;
      const n = (S.npcs || []).find((q) => q && q.id === 'lil_bro');
      if (!n) return;
      /* Pin the wander AI and steer him along the axis under test. */
      n.pathRadius = 0;
      /* v2.3.2086: his anchor moved to (970, 1250) when the bank came back
         onto the map at (1230, 1290) -- the old one put him inside its art.
         v2.3.2087: and south again to (960, 1400), clear of the spawn's
         proximity ring (mp-townexit). */
      n.x = 960; n.y = 1400;
      n.spawnX = 960 + ddx * 400; n.spawnY = 1400 + ddy * 400;
      n.targetX = n.spawnX; n.targetY = n.spawnY;
    }, [dx, dy]);
    await P.page.waitForTimeout(800);
    const got = await P.page.evaluate(() => {
      const all = window.__btNpcSprites ? window.__btNpcSprites() : [];
      const n = all.find((q) => q.id === 'lil_bro');
      return n ? n.walkDir : null;
    });
    results.push({ want, got });
  }
  console.log('   facings', JSON.stringify(results));
  rec.ok('the renderer reports a facing (guard)',
    results.every((r) => r.got), results);
  const wrong = results.filter((r) => r.got !== r.want);
  rec.ok(`he faces the way he walks in all eight directions `
       + `(${results.length - wrong.length}/${results.length})`,
    wrong.length === 0, wrong);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((q) => q && q.id === 'lil_bro');
    if (n) { n.pathRadius = 130; n.spawnX = 960; n.spawnY = 1400; }
    S.player.x = 960; S.player.y = 1540;
  });
  await P.page.waitForTimeout(1400);
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/lil-bro.png' }).catch(() => {});

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
