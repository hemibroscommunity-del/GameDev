#!/usr/bin/env node
/* ═══ v2.3.3561: THE DUNGEONS' ART, AS PROMPTS TO PASTE INTO CHATGPT ═══
 *
 * The owner, on the dungeons' bare arenas ("something to look at inside",
 * docs/specs/dungeons-today.md): "instead of code drawn walls give prompt for
 * me to give chatGPT to draw dungeon walls and any other assets you think
 * would be good".
 *
 * Writes docs/art/DUNGEON-ART-PROMPTS.md -- each dungeon's entrance, its
 * walls and the things that stand inside its arena, and the boss's treasure
 * chest -- and docs/art/dungeon-floors-key.png, the four arenas' floors to
 * attach to the wall chats.  Every prompt is made of the Object Studio's own
 * words (public/tools/style/bible.js HD_STYLE, objectBackground, KEY_MATCH;
 * public/tools/objects/prompts.js promptFor, sheets.js sheetPrompt), so the
 * pictures come back in the style, sizes and flat backgrounds the studio's
 * cutters expect.  The Great Cave's, the Foundry Dome's and the Buried City's
 * entrances and walls are v2.3.3282's (they were in docs/ART-WISHLIST.md),
 * word for word, but the walls now name four floors: the Goo Grotto
 * (v2.3.3540) came after them.  The floors key keeps their three panels where
 * they were and adds the Grotto's as a fourth, so a prompt copied from the old
 * wishlist (or its Copy-button page) still finds its floor by its place.
 *
 * Each inside sheet is laid out here by hand, row by row, and checked against
 * the studio's own sheet frame (sheets.js SHEET, runOf): a row that would not
 * fit at its objects' sizes stops the script.  At most SHEET_KINDS kinds a
 * sheet (past that ChatGPT loses count).
 *
 *     node tools/world/dungeon-art-prompts.mjs          # write both files
 *     node tools/world/dungeon-art-prompts.mjs --check  # exit 1 if either is stale
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HD_STYLE, KEY_MATCH, objectBackground, personScale } from '../../public/tools/style/bible.js';
import { promptFor, FRAME_GAME_PX, sizeWords, fraction } from '../../public/tools/objects/prompts.js';
import { sheetPrompt, runOf, SHEET, SHEET_KINDS } from '../../public/tools/objects/sheets.js';
import { decodePNG, encodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOC = path.join(ROOT, 'docs/art/DUNGEON-ART-PROMPTS.md');
const KEY = path.join(ROOT, 'docs/art/dungeon-floors-key.png');

/* The four, in the order the page gives them (the Goo Grotto first: the one a
   new player reaches).  `floor` is the arena's ground picture (src/data/wheelDungeons.js
   WHEEL_DUNGEON_FLOOR); `key` the flat background its pictures are drawn on
   (green where violet crystals would bleed into magenta). */
const DUNGEONS = [
  {
    id: 'verdant', name: 'the Goo Grotto', land: 'the Verdant Wilds', levels: '1–5', floor: 'verdant-3',
    under: 'the dungeon under the Verdant Wilds', floorWords: "the Goo Grotto's wet, mossy green stone", key: 'magenta',
    monsters: 'blue slimes and their giant splitting boss',
    entrance: {
      size: 483,
      what: 'the entrance to a dungeon: a low, wide cave mouth in a mound of mossy green-grey rock, thick tree roots and hanging moss draped over its top and ferns at its sides, with sticky blue slime oozing out of the dark opening and dripping off its lip, which is wide enough for three people to walk in side by side',
    },
    front: 'wet, mossy green-grey stone in big rounded blocks, thick tree roots growing down over it, ferns and tufts of moss in its cracks, and a few streaks of sticky blue slime running down it',
    top: 'the same mossy stone, uneven and overgrown with moss, small ferns and roots',
    inside: [
      { id: 'pillar', what: 'broken stone pillars wrapped in moss and roots', ones: 'a tall cracked one, a short stump', count: 2, size: 100, ar: 0.6 },
      { id: 'torch', what: 'wooden torch posts wrapped in moss, unlit, with no flame', ones: 'a straight one, a crooked one', count: 2, size: 110, ar: 0.3 },
      { id: 'boulder', what: 'mossy boulders', ones: 'a big round one, a flat one, one split in two', count: 3, size: 60, ar: 1.4 },
      { id: 'mushroom', what: 'clusters of mushrooms with pale teal caps', ones: 'a tall-stemmed bunch, a low spread, a ring of tiny ones', count: 3, size: 38, ar: 1.2 },
      { id: 'fern', what: 'fern clumps and roots', ones: 'a big fern, a small fern with one flower, a tangle of thick roots coming up out of the ground', count: 3, size: 40, ar: 1.4 },
      { id: 'puddle', what: 'puddles of sticky blue slime lying flat on the ground', ones: 'a round puddle, a long splash, a puddle with an old boot half sunk in it', count: 3, size: 90, fit: 'w', ar: 2.2 },
      { id: 'heap', what: 'a heap of things the slimes swallowed and spat back out, glued together with blue goo: a boot, a frying pan, a rubber duck, a dented helmet and a few gold coins', count: 1, size: 70, fit: 'w', ar: 1.4 },
    ],
    rows: [['pillar', 'torch', 'boulder'], ['mushroom', 'fern'], ['puddle', 'heap']],
  },
  {
    id: 'hollows', name: 'the Great Cave', land: 'the Stone Hollows', levels: '26–30', floor: 'hollows-4',
    under: 'the dungeon under the Stone Hollows', floorWords: "the Great Cave's grey rock", key: 'green',
    monsters: 'amethyst golems',
    entrance: {
      size: 580,
      what: 'the entrance to a dungeon: the mouth of a huge cave in a grey rock outcrop, framed by glowing blue and violet crystals, with mine-cart rails running out of the dark opening, which is wide enough for three people to walk in side by side',
    },
    front: 'rough grey cave rock in big faceted blocks with cracks and chips, a few small blue and violet crystals poking out, and an old wooden mine timber propping it here and there',
    top: 'the same grey rock, rubbly and uneven',
    inside: [
      { id: 'timber', what: 'wooden mine-timber frames, two posts with a beam across their tops', ones: 'a sound one, a sagging one with a cracked beam', count: 2, size: 120, ar: 1.1, kind: 'prop' },
      { id: 'lantern', what: "miner's lantern posts, their lanterns unlit", ones: 'a straight one, a leaning one', count: 2, size: 105, ar: 0.35, kind: 'prop' },
      { id: 'crystal', what: 'clusters of blue and violet crystals', ones: 'a tall blue cluster, a wide violet one, a small mixed one', count: 3, size: 75, ar: 1 },
      { id: 'cart', what: 'an old mine cart tipped on its side with grey ore spilling out', count: 1, size: 120, fit: 'w', ar: 1.6, kind: 'prop' },
      { id: 'stalagmite', what: 'stalagmites of grey rock', ones: 'a short stubby one, a tall thin one, a twin pair', count: 3, size: 70, ar: 0.6 },
      { id: 'rubble', what: 'piles of fallen rubble and broken rock', ones: 'a low heap, a long spill, a heap with a broken pickaxe in it', count: 3, size: 40, ar: 1.8 },
      { id: 'crate', what: 'wooden crates of mining gear', ones: 'one with pickaxe handles sticking out, one with a coil of rope on top, one stacked with sacks', count: 3, size: 45, ar: 1.2, kind: 'prop' },
    ],
    rows: [['timber', 'lantern', 'crystal'], ['cart', 'stalagmite', 'rubble'], ['crate']],
  },
  {
    id: 'thunder', name: 'the Foundry Dome', land: 'the Electric Foundry', levels: '26–30', floor: 'thunder-2',
    under: 'the dungeon of the Electric Foundry', floorWords: "the Foundry Dome's dark iron plates and brass seams", key: 'magenta',
    monsters: 'storm slimes',
    entrance: {
      size: 580,
      what: 'the entrance to a dungeon: a great riveted iron dome with glowing blue windows and a big round doorway at the front, wide enough for three people to walk in side by side, ringed by small iron pylons with blue sparks at their tips',
    },
    front: 'dark riveted iron wall plates joined by brass seams, a thick iron pipe running along it, and a small round porthole of blue glass here and there',
    top: 'the same dark iron, riveted plates joined by brass seams',
    inside: [
      { id: 'coil', what: 'tesla coil towers, copper coils wound round iron posts on riveted iron bases, switched off, with no sparks', ones: 'a tall one, a short one', count: 2, size: 125, ar: 0.5, kind: 'prop' },
      { id: 'lamp', what: 'electric lamp posts with big glass bulbs, switched off', ones: 'a straight one, a bent one', count: 2, size: 110, ar: 0.35, kind: 'prop' },
      { id: 'bench', what: 'a workbench of dark iron covered in dials, levers, wires and one big red switch, with no writing or numbers on its dials', count: 1, size: 150, fit: 'w', ar: 1.6, kind: 'prop' },
      { id: 'jar', what: 'big glass jars with copper lids, full of bright blue liquid', ones: 'a tall one, a round one, a cracked one leaking a little blue puddle', count: 3, size: 60, ar: 0.7, kind: 'prop' },
      { id: 'pipe', what: 'iron pipes coming up out of the floor', ones: 'an elbow with a valve wheel, a T-joint with a round gauge with no numbers, a cracked one', count: 3, size: 70, ar: 0.9, kind: 'prop' },
      { id: 'scrap', what: 'heaps of scrap metal', ones: 'broken cogwheels, bent plates, a pile of loose bolts and springs', count: 3, size: 40, ar: 1.6 },
    ],
    rows: [['coil', 'lamp', 'bench', 'jar'], ['pipe', 'scrap']],
  },
  {
    id: 'sky', name: 'the Buried City', land: 'the Wind Dunes', levels: '41–45', floor: 'sky-3',
    under: 'the dungeon under the Wind Dunes', floorWords: "the Buried City's red sandstone", key: 'magenta',
    monsters: 'mummies',
    entrance: {
      size: 600,
      what: 'the entrance to a dungeon: half-buried terracotta sandstone ruins, broken columns and a giant carved stone face half sunk in sand, its open mouth a dark doorway wide enough for three people to walk in side by side',
    },
    front: 'big blocks of red-orange sandstone, worn smooth and chipped, a carved band of simple worn patterns (no letters), and sand drifted against its foot',
    top: "the same red sandstone, its blocks' tops worn and dusted with sand",
    inside: [
      { id: 'column', what: 'broken red sandstone columns', ones: 'a tall cracked one, a short stump, one fallen on its side in pieces', count: 3, size: 115, ar: 0.5 },
      { id: 'brazier', what: 'stone braziers on carved stands, empty and unlit', ones: 'a tall one, a squat one', count: 2, size: 80, ar: 0.6, kind: 'prop' },
      { id: 'tomb', what: 'a stone sarcophagus with its lid pushed half open and a bandaged foot sticking out', count: 1, size: 160, fit: 'w', ar: 1.9 },
      { id: 'urn', what: 'clay urns and pots', ones: 'a tall urn, a round pot, a cracked one spilling sand', count: 3, size: 50, ar: 0.8, kind: 'prop' },
      { id: 'head', what: 'a giant stone head half buried in a drift of sand', count: 1, size: 90, fit: 'w', ar: 1.3 },
      { id: 'scarab', what: 'small stone scarab statues', ones: 'one whole, one with a chipped horn', count: 2, size: 40, ar: 1.2 },
      { id: 'gold', what: 'little heaps of gold coins and old jewellery', ones: 'a heap of coins, a spilled necklace and rings', count: 2, size: 30, ar: 1.5 },
    ],
    rows: [['column', 'brazier', 'tomb'], ['urn', 'head', 'scarab', 'gold']],
  },
];

/* The floors key's panels, left to right: v2.3.3282's three where they were,
   then the Goo Grotto's. */
const KEY_ORDER = ['hollows', 'thunder', 'sky', 'verdant'];
const keyed = KEY_ORDER.map((id) => DUNGEONS.find((d) => d.id === id));
if (keyed.some((d) => !d) || keyed.length !== DUNGEONS.length) throw new Error('KEY_ORDER must name every dungeon once');

/* The studio's sheet, checked: every row fits the frame at its objects' sizes. */
function insideSheet(d) {
  const byId = Object.create(null);
  for (const e of d.inside) byId[e.id] = { fit: 'h', kind: 'nature', ...e };
  const W = SHEET.w - 2 * SHEET.margin, H = SHEET.h - 2 * SHEET.margin;
  let h = -SHEET.gap;
  for (const ids of d.rows) {
    let w = -SHEET.gap, rh = 0;
    for (const id of ids) {
      const e = byId[id];
      if (!e) throw new Error(`${d.name}: row names "${id}", which is not one of its things`);
      const r = runOf(e);
      w += SHEET.gap + r.w;
      rh = Math.max(rh, r.h);
    }
    if (w > W) throw new Error(`${d.name}: a row is ${Math.round(w)} game px wide, the sheet ${W}`);
    h += SHEET.gap + rh;
  }
  if (h > H) throw new Error(`${d.name}: the rows are ${Math.round(h)} game px tall, the sheet ${H}`);
  const kinds = d.rows.flat();
  if (kinds.length > SHEET_KINDS) throw new Error(`${d.name}: ${kinds.length} kinds, the most a sheet asks for is ${SHEET_KINDS}`);
  if (kinds.length !== d.inside.length || new Set(kinds).size !== kinds.length) throw new Error(`${d.name}: every thing in exactly one row`);
  return { prompt: sheetPrompt({ rows: d.rows, key: d.key }, byId), n: d.inside.reduce((s, e) => s + e.count, 0) };
}

/* An entrance: the studio's own prompt for one wide object. */
const entrancePrompt = (d) => promptFor({ count: 1, frame: 'wide', fit: 'w', key: d.key, ...d.entrance });

/* The walls: v2.3.3282's two strips (the arena's walls are drawn from them). */
const ORD = ['first', 'second', 'third', 'fourth'];
const FLOORS = keyed.map((d) => d.name).join(', ');
function wallsPrompt(d) {
  return [
    `A wide picture (3:2, landscape) for BroTown, a top-down 2D action RPG: two strips of dungeon wall for ${d.name}, ${d.under}, one above the other with a band of background between them, each running the full width of the picture.`,
    `1. The top strip is the wall's FRONT, seen from a steep three-quarter top-down angle: ${d.front}. It is a little taller than a person, its top edge level and its bottom edge where it meets the floor.\n2. The bottom strip is the TOP of the same wall, seen from above: ${d.top}, with no front and no edges.`,
    'Both strips repeat side by side: their left and right ends must join with no visible seam. No doors, gaps, torches, creatures or people.',
    `No text, letters or numbers anywhere. ${objectBackground(d.key)} No border.`,
    `Style: ${HD_STYLE}`,
    `Attached are the game's style key and the four dungeons' floors (left to right: ${FLOORS}). Match the style key's pixel size, colours, shading and the way it draws each material, and make the wall belong on the ${ORD[keyed.indexOf(d)]} floor, ${d.floorWords}, but do not copy their tiles. Scale: a person standing beside the wall would be a little shorter than its front.`,
  ].join('\n\n');
}

/* The boss's treasure chest: ONE chest drawn twice, shut and open (the
   studio's "set" prompt asks for different ones, so this is its own). */
const CHEST = { size: 90, fit: 'w' };
function chestPrompt() {
  const share = fraction(CHEST.size / FRAME_GAME_PX);
  return [
    "A square picture of ONE treasure chest drawn TWICE for BroTown, a top-down 2D action RPG, side by side and not touching: on the left, a sturdy wooden treasure chest bound with dark iron bands, shut, with a big brass lock; on the right, the very same chest with its lid thrown open and a heap of gold coins and a few cut gems inside. Both are drawn whole, the same size and from the same angle, with plenty of background around them and nothing cut off. They stand on nothing: no ground, grass, path or shadow under or around them, and the place where each meets the ground is plain to see. Built and used by Bros: well made, a little battered, with a proud repair or a dent here and there.",
    `No text, letters or numbers anywhere. ${objectBackground('magenta')} No border.`,
    `Style: ${HD_STYLE}`,
    `${KEY_MATCH} Scale: ${personScale(FRAME_GAME_PX)}. Each chest is ${sizeWords(CHEST)}, so it fills about ${share} of the picture's width.`,
  ].join('\n\n');
}

const fence = (t) => '```text\n' + t + '\n```';
const keyNote = (d) => (d.key === 'green' ? '- **Green, not magenta:** the crystals are violet, which a magenta background would eat into.' : '- **Background:** magenta, as the Object Studio\'s pictures.');

function dungeonSection(d) {
  const sheet = insideSheet(d);
  const out = [];
  out.push(`### ${cap(d.name)}: dungeon entrance`, '');
  out.push(`- **In the game:** where ${possessive(d.land)} dungeon starts${d.id === 'verdant' ? ' (levels 1–5, on the way to the Mayor\'s first slimes)' : ` (levels ${d.levels})`}. Today it is a dark oval drawn in code.`);
  out.push('- **Attach:** your style key.');
  out.push("- **How:** ask for a wide 3:2 picture, as the Object Studio does. Send it in chat: a session cuts it out and draws it at the dungeon's mouth.");
  out.push('', fence(entrancePrompt(d)), '');
  out.push(`### ${cap(d.name)}: dungeon walls`, '');
  out.push(`- **In the game:** the walls round ${d.name}'s arena. Today they are one flat colour.`);
  out.push('- **Attach:** your style key, and `docs/art/dungeon-floors-key.png` (the four dungeons\' floors, left to right: ' + FLOORS + ').');
  out.push(keyNote(d));
  out.push('- **How:** send it in chat: a session makes each strip repeat seamlessly (the Ground Studio\'s cut) and draws the arena\'s walls from it.');
  out.push('', fence(wallsPrompt(d)), '');
  out.push(`### ${cap(d.name)}: inside the arena`, '');
  out.push(`- **In the game:** ${sheet.n} things to stand round ${d.name}'s arena, where its ${d.monsters} fight you. Today the arena is a bare floor.`);
  out.push('- **Attach:** your style key.');
  out.push(keyNote(d));
  out.push('- **How:** one wide sprite sheet. Send it in chat: a session cuts every object out by the count in its rows (the Object Studio\'s object finder) and stands them round the arena\'s edges, clear of the middle where you fight and of the way out. The torches or lamps go either side of the way out.');
  out.push('', fence(sheet.prompt), '');
  return out.join('\n');
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const possessive = (s) => (s.endsWith('s') ? s + "'" : s + "'s");

function doc() {
  const [grotto, ...rest] = DUNGEONS;
  return [
    '# The dungeons\' art: prompts for ChatGPT (v2.3.3561)',
    '',
    '<!-- GENERATED by tools/world/dungeon-art-prompts.mjs: edit the script, then run it. -->',
    '',
    'The owner, on the dungeons\' bare arenas: "instead of code drawn walls give prompt for me to give chatGPT to draw dungeon walls and any other assets you think would be good".',
    '',
    'Each dungeon gets three pictures: its **entrance** (today a dark oval drawn in code), its **walls** (today one flat colour), and a sheet of **things to stand inside** its arena (today a bare floor). One more, the **boss\'s treasure chest**, is shared by all four.',
    '',
    '- **One chat each.** Attach what each item lists, and never the bro (docs/WORLD-BIBLE.md §6): he is simpler pixel art than the world, and ChatGPT copies what it sees.',
    '- **Send each result in chat**, and a session fits it in: the "In the game" line says where it goes.',
    '- **Your style key** is the one you attach to every Object Studio chat. `docs/art/dungeon-floors-key.png` is in the repo; it shows the four arenas\' floors, so the walls belong on them.',
    '- Every prompt is the Object Studio\'s own words (`public/tools/style/bible.js`, `public/tools/objects/prompts.js`), so the pictures come back in the size and style its cutters expect.',
    '',
    '## Make these first: the Goo Grotto and the chest (4 chats)',
    '',
    'The Goo Grotto is the one dungeon a reviewer can reach in their first half hour: levels 1–5, about 30 seconds\' walk from BroTown, in the middle of the slimes the Mayor\'s first quest sends you to. The other three are for levels 26–45.',
    '',
    dungeonSection(grotto),
    '### The boss\'s treasure chest (all four dungeons)',
    '',
    '- **In the game:** what the boss leaves where it falls, with the dungeon\'s reward inside (the boss chest, being built). One chest for all four dungeons.',
    '- **Attach:** your style key.',
    '- **How:** a square picture. Send it in chat: a session cuts the two out, the shut chest and the open one.',
    '',
    fence(chestPrompt()),
    '',
    `## Then the other three (9 chats)`,
    '',
    ...rest.map(dungeonSection),
    '## Not dungeons, but worth it before the review',
    '',
    '- **The keepers, sheet 1 of 2** (docs/ART-WISHLIST.md, "The keepers"): Woodworker Bro and Farmer Bro are two of the six townsfolk a new player meets in the first half hour (the tour, docs/specs/demo-quest-line.md), and today both are stand-in pictures a script made. That one sheet draws them both, with four more keepers.',
    '- **The Foundry Slime** (docs/ART-WISHLIST.md, "Monsters"): the Foundry Dome\'s storm slimes are the starter slime recoloured. Worth making with the Foundry Dome\'s other pictures, so its fight looks like its own.',
    '',
    '## When the pictures come back (for the session that fits them in)',
    '',
    '- **Entrances:** cut out like any Object Studio picture (`public/tools/style/process.js`), drawn at the mouth (`src/rendering/wheelDoors.js`) at 2 px a game px, its foot at the mouth; the code\'s oval, glow and name stay until each one\'s picture is in.',
    '- **Walls:** each strip made seamless by the Ground Studio\'s cut (`seamless` in process.js); the front along the arena\'s top wall, the top all round (`src/data/wheelDungeons.js` WHEEL_DUNGEON_FLOOR\'s `wall` colour today). Loaded behind the dungeon\'s loading screen with its floor and freed when you leave (CLAUDE.md, the zone-asset exception).',
    '- **Inside:** cut by count (`objectsIn` in process.js, the rows\' order naming each); stood round the edges and either side of the way out, never in the middle third where the fight is; the big ones solid at their feet, the flat ones (puddles, scrap, coins) walked over; loaded and freed with the arena like the walls.',
    '- **The chest:** both pictures held with the arena; the shut one where the boss falls, the open one once its reward is taken.',
    '',
  ].join('\n');
}

/* The four floors, each its swatch at 640 px (nearest) and the top-left 320
   px of that, on the key's grey -- the v2.3.3282 key's own recipe, its three
   panels to the bit, with the Goo Grotto's floor added on the right. */
function floorsKey() {
  const PANEL = 320, GAP = 24, SCALED = 640, BG = [214, 214, 220];
  const W = GAP + keyed.length * (PANEL + GAP), H = PANEL + 2 * GAP;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255; }
  keyed.forEach((d, n) => {
    const src = decodePNG(fs.readFileSync(path.join(ROOT, 'public/world/ground', d.floor + '-A.png')));
    const k = src.width / SCALED;
    const x0 = GAP + n * (PANEL + GAP);
    /* nearest pixel as Pillow picks it: the step ADDED pixel by pixel from
       half a step in (its float rounding, so the old key's three panels come
       out to the bit) */
    const picks = [];
    for (let v = k / 2, i = 0; i < PANEL; i++, v += k) picks.push(Math.min(src.width - 1, Math.floor(v)));
    for (let y = 0; y < PANEL; y++) {
      const sy = Math.min(src.height - 1, picks[y]);
      for (let x = 0; x < PANEL; x++) {
        const s = (sy * src.width + picks[x]) * 4, o = ((GAP + y) * W + x0 + x) * 4;
        out[o] = src.data[s]; out[o + 1] = src.data[s + 1]; out[o + 2] = src.data[s + 2]; out[o + 3] = 255;
      }
    }
  });
  return encodePNG(W, H, out);
}

const check = process.argv.includes('--check');
const text = doc();
const png = floorsKey();
if (check) {
  const docOld = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
  const keyOld = fs.existsSync(KEY) ? decodePNG(fs.readFileSync(KEY)) : null;
  const keyNew = decodePNG(png);
  const keySame = !!keyOld && keyOld.width === keyNew.width && keyOld.height === keyNew.height && Buffer.compare(Buffer.from(keyOld.data.buffer), Buffer.from(keyNew.data.buffer)) === 0;
  const ok = docOld === text && keySame;
  console.log(ok ? 'dungeon art prompts: up to date' : `dungeon art prompts: STALE (${docOld === text ? '' : 'the doc'}${docOld === text || keySame ? '' : ' and '}${keySame ? '' : 'the floors key'}): run node tools/world/dungeon-art-prompts.mjs`);
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(DOC, text);
fs.writeFileSync(KEY, png);
console.log(`wrote ${path.relative(ROOT, DOC)} (${text.length} bytes) and ${path.relative(ROOT, KEY)}`);
