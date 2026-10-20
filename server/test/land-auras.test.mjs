/* ═══ v2.3.3511: EACH LAND'S SPECKS, HELD TO WHAT THE OWNER ASKED ═══
 *
 * The owner, after a playtest (2026-10-19): "land tree effects: fire looks like
 * sparkles, water looks like sweating" (src/rendering/landAuras.js has the
 * why; its table is src/data/landAuras.js).  On a phone, mp-landauras watches
 * them; this holds the TABLE and the trees' DATA to it, with no browser:
 *   1. the table: every land of the Wheel has its look; each kind's id is its
 *      land's own, its shape one the renderer makes, its start a known place,
 *      a splash only of kinds the land has;
 *   2. FIRE: an ember is a streak drawn the way it flies, rising FASTER as it
 *      goes (g below 0), cooling (each colour of its ramp less green than the
 *      one before), with a smooth flicker and no random blink; smoke and
 *      popping coals; the foot's glow flickers like coals;
 *   3. WATER: on a tree a drip forms on the crown's lower edge, hangs, falls
 *      (g above 0) and splashes in a ring and droplets; nothing is born on
 *      the crown's middle to slide down it (the sweat); on a rock no drip, a
 *      ripple at its foot;
 *   4. the rest with the same eye: the Foundry's sparks are thrown in bursts
 *      and fall, drawn the way they fly, never blinking at random; the
 *      Hollows' crystal glints are a rock's alone;
 *   5. a resource's pool: what its rate keeps alive and a little more, the
 *      kinds the rate makes never past PER_MAX, a splash's kinds sized by its
 *      drips;
 *   6. THE CROWN'S LOWER EDGE in src/data/treeArt.js is the pictures' own:
 *      tools/world/add-tree-art.mjs --measure gives it again from the files in
 *      public/sprites/trees/, and each sample is a row with crown on it and
 *      open air under it, in most of its columns;
 *   7. tierTrees.js treeCrownEdge puts it in world px where the picture is
 *      drawn (treeGeom), none over the trunk's middle.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

const LA = await import('../../src/data/landAuras.js');
const { WHEEL_LANDS } = await import('../../src/data/wheelLands.js');
const { TREE_ART } = await import('../../src/data/treeArt.js');
const { treeGeom, treeCrownEdge, TREE_PX } = await import('../../src/game/tierTrees.js');
const { crownEdge, CROWN_STEP } = await import('../../tools/world/crownedge.mjs');
const { decodePNG } = await import('../../tools/world/png.mjs');
const root = new URL('../../', import.meta.url);
const T = LA.LAND_AURAS;
const part = (land, id) => T[land].parts.find((P) => P.id === id);
const green = (c) => (c >> 8) & 255;

/* ── 1. the table ── */
{
  const lands = Array.isArray(WHEEL_LANDS) ? WHEEL_LANDS : Object.keys(WHEEL_LANDS);
  check(`1a every land of the Wheel has its look (${lands.join(', ')}), and the realms past the gates theirs`,
    lands.length === 8 && lands.every((l) => T[l] && T[l].parts.length > 0) && !!T.dark && !!T.light, lands);
  const FROM = new Set(['crown', 'top', 'all', 'low', 'foot', 'crownEdge', undefined]);
  const bad = [];
  for (const land of Object.keys(T)) {
    const ids = new Set();
    for (const P of T[land].parts) {
      if (!P.id || ids.has(P.id)) bad.push(`${land}: id ${P.id}`);
      ids.add(P.id);
      if (!LA.AURA_TEX.includes(P.tex)) bad.push(`${land}.${P.id}: shape ${P.tex}`);
      if (!FROM.has(P.from)) bad.push(`${land}.${P.id}: from ${P.from}`);
      if (P.on && P.on !== 'tree' && P.on !== 'rock') bad.push(`${land}.${P.id}: on ${P.on}`);
      if (!(P.w >= 0)) bad.push(`${land}.${P.id}: w ${P.w}`);
      if (P.kind !== 'drip' && !(P.life && P.life[0] > 0 && P.life[1] >= P.life[0])) bad.push(`${land}.${P.id}: life`);
      if (!(P.colors && P.colors.length) && !(P.ramp && P.ramp.length >= 2)) bad.push(`${land}.${P.id}: no colour`);
    }
    for (const P of T[land].parts) for (const [id, n] of P.splash || []) if (!ids.has(id) || !(n >= 1)) bad.push(`${land}.${P.id}: splash ${id}`);
  }
  check('1b each kind: its own id, a shape the renderer makes, a known start, a colour, a splash only of its land\'s kinds', bad.length === 0, bad);
  const tex = readFileSync(new URL('src/rendering/landAuras.js', root), 'utf8');
  check('1c the renderer makes every shape the table names, in landAurasWarm', LA.AURA_TEX.every((k) => new RegExp('\\n      ' + k + ': (canvasTexture|streakTexture)\\(').test(tex)), LA.AURA_TEX);
}

/* ── 2. fire ── */
{
  const E = part('ember', 'ember');
  check('2a an ember is a streak drawn the way it flies, stretched with its speed', E && E.tex === 'ember' && E.orient === true && E.stretch > 0 && E.thick, E);
  check('2b ...thrown up off the crown and RISING FASTER as it goes (v up, g below 0), curling more as it climbs', E.v[1] < 0 && E.g < 0 && E.curl === true && (E.from === 'crown' || E.from === 'top'), E);
  check('2b2 ...glowing: a streak in a glow of its own, big enough to see on a phone (core a quarter of `thick`, 2 world px at least, 12 long at least)',
    /\n      ember: streakTexture\(/.test(readFileSync(new URL('src/rendering/landAuras.js', root), 'utf8')) && E.thick[0] / 4 >= 2 && E.size[0] >= 12, { size: E.size, thick: E.thick });
  check('2c ...cooling as it goes: each colour of its ramp less green than the one before, white-yellow to a dull red',
    E.ramp.length >= 3 && E.ramp.every((c, i) => i === 0 || green(c) < green(E.ramp[i - 1])) && green(E.ramp[0]) > 200 && green(E.ramp[E.ramp.length - 1]) < 80, E.ramp.map((c) => c.toString(16)));
  check('2d ...shrinking as it goes out, a smooth flicker and NO random blink (the twinkle)', E.grow && E.grow[1] < E.grow[0] && E.flick > 0 && !E.blink, E);
  const smoke = part('ember', 'smoke'), pop = part('ember', 'pop');
  check('2e smoke: soft dark puffs, not lights, swelling as they climb', smoke && smoke.tex === 'puff' && !smoke.add && smoke.grow[1] > smoke.grow[0] && smoke.v[1] < 0
    && smoke.colors.every((c) => ((c >> 16) & 255) < 90), smoke);
  check('2f a coal popping at its foot, up and back down to the ground', pop && pop.from === 'foot' && pop.v[1] < 0 && pop.g > 0 && pop.toGround === true && pop.orient === true, pop);
  check('2g the foot\'s glow flickers like coals (two waves), no ember kind blinks at random',
    T.ember.base && T.ember.base.coal === true && !T.ember.base.flicker && T.ember.parts.every((P) => !P.blink));
}

/* ── 3. water ── */
{
  const D = part('tidal', 'drip');
  check('3a a drip forms on a TREE\'s crown\'s lower edge, hangs a moment, then falls (g above 0)',
    D && D.on === 'tree' && D.kind === 'drip' && D.from === 'crownEdge' && D.hang[0] >= 100 && D.hang[1] <= 600 && D.g >= 400, D);
  const sp = Object.fromEntries(D.splash || []);
  const ring = part('tidal', 'splash'), bead = part('tidal', 'bead');
  check('3b ...and splashes where it lands: a ring spreading over the ground (squashed, growing) and two droplets jumping back down',
    sp.splash === 1 && sp.bead === 2 && ring.kind === 'ring' && ring.squash < 0.6 && ring.grow[1] > ring.grow[0] && ring.w === 0
      && bead.v[1] < 0 && bead.g > 0 && bead.toGround === true && bead.w === 0, { sp, ring, bead });
  const born = LA.auraPartsFor('tidal', 'tree');
  check('3c nothing on a tree is born in the crown\'s middle to slide down it (the sweat), and no puff sits on the crown',
    !born.some((P) => P.from === 'low') && !born.some((P) => P.tex === 'glow' && (P.from === 'crown' || P.from === 'top')), born.map((P) => `${P.id}:${P.from}`));
  const mist = part('tidal', 'mist');
  check('3d a low mist along the ground at the foot: wide, flat, faint, drifting sideways', mist.from === 'foot' && mist.spread >= 0.3 && mist.squash < 0.6 && mist.alpha <= 0.3 && !mist.add && Math.abs(mist.v[0]) > Math.abs(mist.v[1]), mist);
  const rock = LA.auraPartsFor('tidal', 'rock').map((P) => P.id);
  check(`3e a ROCK has no leaves to drip from: no drip and no splash, a ripple at its foot instead (${rock.join(', ')})`,
    !rock.includes('drip') && !rock.includes('splash') && !rock.includes('bead') && rock.includes('ripple') && part('tidal', 'ripple').from === 'foot');
}

/* ── 4. the rest, with the same eye ── */
{
  const S = part('thunder', 'spark');
  check('4a the Foundry\'s sparks: bursts of streaks thrown from one point, falling as they die, drawn the way they fly, no random blink',
    S && S.burst && S.burst[0] >= 2 && S.tex === 'spark' && S.orient === true && S.g > 0 && !S.blink, S);
  check('4b the arc stays (a little arc jumping now and then)', !!part('thunder', 'arc') && part('thunder', 'arc').zap >= 4);
  const tree = LA.auraPartsFor('hollows', 'tree').map((P) => P.id), rock = LA.auraPartsFor('hollows', 'rock').map((P) => P.id);
  check(`4c the Stone Hollows' crystal glints are a rock's alone (a tree: ${tree.join(', ')}; a rock: ${rock.join(', ')})`,
    !tree.includes('crystal') && !LA.auraPartsFor('hollows', 'tree').some((P) => P.tex === 'glint') && rock.includes('crystal') && rock.includes('dust'));
}

/* ── 5. the pools ── */
{
  const sizes = [0.7, 0.855, 1.9, 2.85, 4.275];
  const bad = [];
  for (const land of Object.keys(T)) {
    for (const type of ['tree', 'rock']) {
      for (const f of sizes) {
        const plan = LA.auraPoolPlan(land, type, f);
        const kinds = LA.auraPartsFor(land, type);
        const byRate = kinds.filter((P) => P.w > 0).reduce((s, P) => s + plan[P.id], 0);
        if (byRate > LA.PER_MAX + kinds.length) bad.push(`${land} ${type} ${f}: ${byRate}`);
        for (const P of kinds) if (!(plan[P.id] >= 2) || (P.zap && plan[P.id] < P.zap)) bad.push(`${land}.${P.id} ${type} ${f}: ${plan[P.id]}`);
        if (Object.keys(plan).length !== kinds.length) bad.push(`${land} ${type}: plan ${Object.keys(plan)}`);
      }
    }
  }
  check('5a every resource\'s pool: two of a kind at the least, a whole arc, the kinds the rate makes about PER_MAX at the most', bad.length === 0, bad.slice(0, 8));
  const pine = LA.auraPoolPlan('tidal', 'tree', 0.855), maple = LA.auraPoolPlan('tidal', 'tree', 4.275);
  check(`5b a splash's ring and droplets sized by the drips that make them (a pine ${pine.drip} drips, ${pine.splash} rings, ${pine.bead} droplets; a maple ${maple.drip}, ${maple.splash}, ${maple.bead})`,
    maple.splash > pine.splash && maple.bead > pine.bead && pine.bead >= pine.splash);
  check('5c the ramp: its ends at 0 and 1, between them in between', LA.auraRampAt([0x000000, 0xffffff], 0) === 0 && LA.auraRampAt([0x000000, 0xffffff], 1) === 0xffffff
    && LA.auraRampAt([0x000000, 0xff0000, 0xffff00], 0.75) === 0xff8000);
  check('5d the fades: \'late\' full until 60% of its life, then out', LA.auraFade('late', 0.3) === 1 && LA.auraFade('late', 0.8) < 0.6 && LA.auraFade('late', 1) === 0 && LA.auraFade('pulse', 0.5) === 1);
}

/* ── 6. the crown's lower edge is the pictures' own ── */
{
  const again = [], air = [];
  for (const lvl of Object.keys(TREE_ART)) {
    const a = TREE_ART[lvl];
    const png = decodePNG(readFileSync(new URL('public' + a.url, root)));
    const m = crownEdge(png.data, png.width, png.height, a.foot, a.trunk);
    if (JSON.stringify(m) !== JSON.stringify(a.crown)) again.push(a.name);
    const solid = (x, y) => y >= 0 && y < png.height && png.data[(y * png.width + x) * 4 + 3] > 24;
    const K = a.crown.length;
    let samples = 0, good = 0;
    for (let i = 0; i < K; i++) {
      const r = a.crown[i];
      if (!r) continue;
      samples++;
      const x0 = Math.round((i * png.width) / K), x1 = Math.round(((i + 1) * png.width) / K);
      let leaf = 0, open = 0;
      for (let x = x0; x < x1; x++) {
        if (solid(x, r) || solid(x, r - 1) || solid(x, r - 2)) leaf++;
        let clear = true;
        for (let y = r + 4; y <= r + 9; y++) if (solid(x, y)) { clear = false; break; }
        if (clear) open++;
      }
      if (leaf * 2 >= x1 - x0 && open * 2 >= x1 - x0) good++;
    }
    air.push({ name: a.name, samples, good, step: a.w / K });
    if (!(a.crown.length === Math.ceil(a.w / CROWN_STEP))) again.push(a.name + ' (count)');
  }
  check('6a src/data/treeArt.js\'s crowns are what add-tree-art.mjs --measure finds in the pictures today', again.length === 0, again);
  check(`6b each crown sample is a row with leaves on it and open air under it (rows +4..+9), in most of its columns (${air.map((x) => `${x.name} ${x.good}/${x.samples}`).join(', ')})`,
    air.every((x) => x.samples >= 10 && x.good >= x.samples * 0.85), air);
  check('6c none over the trunk\'s middle (the trunk is no crown)', Object.values(TREE_ART).every((a) => {
    const K = a.crown.length, mid = Math.floor((a.foot[0] / a.w) * K);
    return a.crown[mid] === 0;
  }));
}

/* ── 7. in the world ── */
{
  const bad = [];
  for (const lvl of Object.keys(TREE_ART).map(Number)) {
    const node = { x: 1000, y: 2000, gatherLvl: lvl, nodeType: 'tree' };
    const g = treeGeom(node), e = treeCrownEdge(node);
    const a = TREE_ART[lvl];
    if (e.length !== a.crown.filter((r) => r > 0).length) bad.push(`${a.name}: ${e.length} spans`);
    for (const s of e) {
      if (!(s.x0 >= g.left - 0.01 && s.x1 <= g.right + 0.01 && s.x1 > s.x0)) bad.push(`${a.name}: span ${s.x0}-${s.x1} outside ${g.left}-${g.right}`);
      if (!(s.y > g.top && s.y < g.footY)) bad.push(`${a.name}: y ${s.y} not between ${g.top} and the foot ${g.footY}`);
      if (s.x0 <= g.footX && s.x1 >= g.footX) bad.push(`${a.name}: a span over the trunk's middle`);
    }
    const i = a.crown.findIndex((r) => r > 0);
    const s0 = e[0];
    if (!(Math.abs(s0.y - (g.top + a.crown[i] * TREE_PX)) < 1e-6)) bad.push(`${a.name}: first span's y`);
  }
  check('7a treeCrownEdge: every span inside the picture as drawn, between its top and its foot, never over the trunk\'s middle', bad.length === 0, bad.slice(0, 6));
  const cover = Object.keys(TREE_ART).map(Number).map((lvl) => {
    const node = { x: 0, y: 0, gatherLvl: lvl, nodeType: 'tree' };
    const g = treeGeom(node);
    return treeCrownEdge(node).reduce((t, s) => t + (s.x1 - s.x0), 0) / (g.right - g.left);
  });
  check(`7b the edge runs under most of each crown, the trunk aside (${cover.map((c) => Math.round(c * 100) + '%').join(', ')} of each picture's width)`, cover.every((c) => c >= 0.6 && c < 1), cover);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
