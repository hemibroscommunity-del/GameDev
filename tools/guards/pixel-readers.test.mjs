/* ═══ v2.3.5254: NO CPU READER OF A PACKED PICTURE (card P; the planning session's yes, the gatekeeper's sitting 9) ═══
 *
 * p256.js reads a picture from its 256-colour twin as colour numbers, and
 * once the chip has them it PACKS the page's copy: deflated, `src.resource`
 * emptied (p256.js `pack`).  That is right only while nothing reads the
 * picture back on the CPU afterwards, as p256.js says: "Nothing reads an
 * effect's picture back on the CPU".  The trap's box broke it (#1763, found
 * at sitting 9 by review, not by a test): its twin was packed a second after
 * upload, and a missed trap cuts the box into pieces from its pixels
 * (trapFx.js _missBreak -> wheelShatter.js cutPicture), which found them
 * empty.  This guard finds the next one.  It fails:
 *
 *   1. a file that reaches a loaded picture's page copy (`x.source.resource`,
 *      `src.resource`, `source.resource`) and is not on READERS below, with
 *      what it does there: a new reader names itself here and says why it
 *      never reads a packed copy; and a listed file that no longer reaches
 *      one comes off;
 *   2. a caller of the shatter (wheelShatter.js: WheelShatter, cutPicture,
 *      framePx) not on SHATTERS below, or a listed one gone;
 *   3. a picture a shatter caller cuts that p256.js would pack: an address
 *      one of the patterns wantedPath tests matches (read from p256.js's own
 *      source), or one with a twin in src/data/p256Files.js (`?p256=1` packs
 *      every twin).  Each caller's pictures are found where its code gets
 *      them, not typed here;
 *   4. a file on READERS that names an address p256.js would pack, unless
 *      NAMES_PACKED says which reader reads that picture and why it is read
 *      before the pack.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14 (and put back):
 *   3. p256.js WORLD_ICONS: `ore-obsidian)` -> `ore-obsidian|trap-box)` (the
 *      trap back, the planning session's own proof)                   -> FAIL 3
 *   1. a new file src/rendering/zzReader.js with
 *      `export const f = (t) => t.source.resource;`                  -> FAIL 1
 *   2. zzReader.js instead: `import { WheelShatter } from './wheelShatter.js';`
 *      and `export const g = () => new WheelShatter(null);`           -> FAIL 2
 *   4. hotArrowFx.js: `export const A_ZZ = '/sprites/fx/portal-beam.webp';`
 *      added at its end                                                -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/pixel-readers.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { P256_FILES } from '../../src/data/p256Files.js';
import { ORE_ART } from '../../src/data/oreArt.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700)));
};
const text = (p) => readFileSync(join(ROOT, p), 'utf8');

/* Every file that reaches a loaded picture's page copy, and what it does
   there.  "Never a p256 picture" means: none of the pictures it is handed is
   one p256.js reads (check 4 holds the files that name one). */
const READERS = {
  'src/rendering/bakeByAddress.js': 'frameInput: a bake\'s frame cut from its sheet (a body or armour sheet), never a p256 picture',
  'src/rendering/cacheBytes.js': 'counts the page copy\'s bytes; reads no pixel',
  'src/rendering/gearSheets.js': 'the gear and effect strips it loads and packs itself, read before they are drawn (a twin through packedTwinAsNumbers)',
  'src/rendering/gpuOnly.js': 'lets a canvas copy go once the chip has it; reads no pixel',
  'src/rendering/headFrames.js': 'names a source for the probe; reads no pixel',
  'src/rendering/heldNumbers.js': 'the strips\' numbers door: readSourceRect reads a canvas or its numbers',
  'src/rendering/hitMaterialFx.js': 'propChips: the hit world object\'s picture (the Wheel\'s objects), never a p256 picture',
  'src/rendering/hotArrowFx.js': 'buildHotArrowArt: the pine arrow, read at its load, never a p256 picture',
  'src/rendering/keepAsImage.js': 'keeps a canvas made on the device as an image of itself (toBlob), never a p256 picture',
  'src/rendering/lookArmour.js': 'lets a look sheet\'s page copy go; reads no pixel',
  'src/rendering/lookPalette.js': 'sends a look sheet\'s numbers to the chip and lets the page copy go; reads no picture',
  'src/rendering/npcSprites.js': 'lets the townsfolk\'s cropped canvases go; reads no pixel',
  'src/rendering/p256.js': 'the pack itself, and the twins\' first read',
  'src/rendering/paletteDraw.js': 'drawSourceRect: draws a picture or its colour numbers',
  'src/rendering/paletteTex.js': 'sends colour numbers to the chip (a packed one is unpacked first: p256.js installP256Upload)',
  'src/rendering/picsOnce.js': 'puts pictures back after a lost chip',
  'src/rendering/pixiApp.js': 'the asset cache\'s count (__btTex); reads no pixel',
  'src/rendering/pixiRenderer.js': 'QA probes of the player\'s own figure (a baked body), never a p256 picture',
  'src/rendering/propGround.js': 'readArtBottoms: a building\'s or prop\'s picture for its shadow, never a p256 picture',
  'src/rendering/releaseCanvasTexture.js': 'lets a canvas go; reads no pixel',
  'effectsRenderer.js': 'the popups\' cut, the chop strip\'s crop, the bakes\' probe (NAMES_PACKED below)',
  'entityRenderer.js': 'QA probes of the masked bodies (bakes made on the device), never a p256 picture',
  'src/rendering/systems/minimapRenderer.js': 'names a texture\'s kind for the probe; reads no pixel',
  'src/rendering/traits/eyeStyleColorCatalog.js': 'a QA probe of the eye bakes, never a p256 picture',
  'src/rendering/weaponSprites.js': 'softBake: a weapon\'s own strip, never a p256 picture',
  'src/rendering/wheelGround.js': 'lets the ground\'s page copy go; reads no pixel',
  'src/rendering/wheelLife.js': 'the Wheel\'s objects\' colour numbers (`_btPal`), never packed by p256.js',
  'src/rendering/wheelShatter.js': 'cutPicture: the shatter (SHATTERS below)',
  'src/rendering/zoneTextures.js': 'the strips\' door (loadTrackedStrip), the monsters\' strips',
  'src/ui/mobile/dash/MapPanel.jsx': 'the map\'s thumbnail: a zone\'s ground picture, never a p256 picture',
};

/* A file on READERS that names an address p256.js would pack, the reader it
   reads that picture through, and why the pack never comes first. */
const NAMES_PACKED = {
  'effectsRenderer.js': '_tightPopupIcon cuts the heart popup and the eight element marks (v2.3.5258) through readSourceRect as they load (_loadPopupIcon), before they are ever drawn: p256.js packs only what the chip already has. Its other page-copy reads are the chop strip (_cropChop) and the bakes\' probe (__btFxBakes), neither a p256 picture.',
};

/* The shatter's callers, and where each one's pictures come from. */
const SHATTERS = {
  'src/rendering/trapFx.js': 'the trap\'s box: controlsPreload.js TRAP_ICON_URL, loaded by effectsRenderer.js and handed over',
  'effectsRenderer.js': 'the mined-out rock: ORE_TEX, from src/data/oreArt.js',
  'src/rendering/wheelObjects.js': 'the Wheel\'s objects: their bakes under /world/objects/',
};

/* v2.3.5254: a big file goes by its name alone (tests-by-system: a suite never
   names one by its folder, so it survives the big files' split); every other
   by its path from the root */
const BIG = ['effectsRenderer.js', 'entityRenderer.js'];
const keyOf = (path) => { const n = path.split('/').pop(); return BIG.includes(n) ? n : path; };
const code = new Map([...codeOf(['src']).entries()].map(([f, c]) => [keyOf(f), c]));
const REACH = /(?:\.source\??\.resource\b|\b(?:src|_src|source)\??\.resource\b)/;

/* 1: the closed list of files that reach a page copy */
{
  const found = [...code.entries()].filter(([, c]) => REACH.test(c)).map(([f]) => f).sort();
  const fresh = found.filter((f) => !READERS[f]);
  const gone = Object.keys(READERS).filter((f) => !found.includes(f));
  check(`1. the ${found.length} files that reach a loaded picture's page copy are the known ones (a new one names itself in READERS with why it never reads a packed copy)`, fresh.length === 0, { fresh });
  check('1b. ...and a file that no longer reaches one comes off the list', gone.length === 0, { gone });
}

/* p256.js's own rule: the patterns wantedPath tests, read from its source */
const p256 = text('src/rendering/p256.js');
const body = (p256.match(/function wantedPath\([^)]*\)\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
const names = [...body.matchAll(/\b([A-Z][A-Z0-9_]*)\.test\(/g)].map((m) => m[1]);
const patterns = names.map((n) => {
  const m = p256.match(new RegExp(`^const ${n} = (\\/.+\\/[a-z]*);`, 'm'));
  if (!m) return null;
  const lit = m[1], cut = lit.lastIndexOf('/');
  try { return { name: n, re: new RegExp(lit.slice(1, cut), lit.slice(cut + 1)) }; } catch (e) { return null; }
});
check(`p256.js's wantedPath tests ${names.length} patterns, each read (${names.join(', ')})`, names.length > 0 && patterns.every(Boolean), { names });
const bare = (a) => String(a).split('?')[0];
const packedBy = (a) => {
  const p = bare(a);
  const hit = patterns.filter(Boolean).find((x) => x.re.test(p));
  if (hit) return hit.name;
  return P256_FILES[p] ? 'p256Files (a twin: ?p256=1)' : null;
};
check('the rule reads as p256.js means it (an obsidian ore icon is packed; a rock is not)', !!packedBy('/icons/items/ore-obsidian.webp') && !packedBy('/sprites/ore/ore-iron.png'));

/* 2: the shatter's callers */
{
  const SHATTER = /\b(?:WheelShatter|cutPicture|framePx)\b/;
  const found = [...code.entries()].filter(([f, c]) => f !== 'src/rendering/wheelShatter.js' && SHATTER.test(c)).map(([f]) => f).sort();
  const fresh = found.filter((f) => !SHATTERS[f]);
  const gone = Object.keys(SHATTERS).filter((f) => !found.includes(f));
  check(`2. the shatter's ${found.length} callers are the known ones (a new caller says here where its pictures come from)`, fresh.length === 0 && gone.length === 0, { fresh, gone });
}

/* 3: what each caller cuts */
{
  const cp = text('src/rendering/controlsPreload.js');
  const trap = (cp.match(/export const TRAP_ICON_URL = '([^']+)'/) || [])[1];
  const er = code.get('effectsRenderer.js') || '';
  const handed = !!trap && /_fxLoad\(\s*TRAP_ICON_URL\s*\)/.test(er);
  const ore = Object.values(ORE_ART).map((o) => o.url);
  /* the code is read printed tight (esbuild): no spaces to count on */
  const oreOnly = /const tex\s*=\s*ORE_TEX\[/.test(er) && /_oreShatter\.add\(\s*key,\s*tex,/.test(er)
    && (er.match(/_oreShatter\.add\(/g) || []).length === 1 && (er.match(/new WheelShatter\(/g) || []).length === 1;
  const wo = code.get('src/rendering/wheelObjects.js') || '';
  const objects = /['"]\/world\/objects\/['"]/.test(wo) ? ['/world/objects/'] : [];
  const cuts = [
    ...(trap ? [{ who: 'trapFx.js (the trap\'s box)', a: trap }] : []),
    ...ore.map((a) => ({ who: 'effectsRenderer.js (the mined-out rock)', a })),
  ];
  check(`3a. the trap's box is TRAP_ICON_URL (${trap || 'not found'}), loaded by effectsRenderer.js for trapFx.js`, handed);
  check(`3b. effectsRenderer.js shatters only the rocks (ORE_TEX: ${ore.length} pictures)`, oreOnly && ore.length > 0);
  check('3c. wheelObjects.js shatters the Wheel\'s objects, under /world/objects/, which no p256 pattern or twin names',
    objects.length === 1 && !patterns.filter(Boolean).some((x) => /world/.test(x.re.source)) && !Object.keys(P256_FILES).some((k) => k.startsWith('/world/')));
  const bad = cuts.filter((c) => packedBy(c.a)).map((c) => `${c.who}: ${bare(c.a)} (${packedBy(c.a)})`);
  check(`3. no picture the shatter cuts is one p256.js packs (${cuts.length} pictures: a packed one is found empty and never breaks)`, bad.length === 0, bad);
}

/* 4: a reader that names a packed picture says why the pack never comes first */
{
  const ADDR = /['"`](\/(?:sprites|icons)\/[^'"`?$]+)/g;
  const bad = [];
  for (const f of Object.keys(READERS)) {
    const c = code.get(f);
    if (!c) continue;
    const named = [...new Set([...c.matchAll(ADDR)].map((m) => m[1]).filter((a) => packedBy(a)))];
    if (named.length && !NAMES_PACKED[f]) bad.push(`${f}: ${named.slice(0, 4).join(', ')}`);
  }
  check('4. a file that reads page copies and names a picture p256.js packs says, in NAMES_PACKED, why the pack never comes first', bad.length === 0, bad);
  const stale = Object.keys(NAMES_PACKED).filter((f) => {
    const c = code.get(f) || '';
    return ![...c.matchAll(ADDR)].some((m) => packedBy(m[1]));
  });
  check('4b. ...and an entry whose file names none comes off', stale.length === 0, stale);
}

process.exit(failed ? 1 : 0);
