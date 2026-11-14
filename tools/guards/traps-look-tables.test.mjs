/* ═══ v2.3.5325: TRAPS INTO GUARDS, THE LOOK'S TABLES (card V PR 6) ═══
 *
 * Grand plan step 8.2, card V's sixth batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.  The tables are read from the page's own
 * modules, loaded in node (lib/loadSrc.mjs), never copied.
 *
 * TRAPS §93 (one case): every eye style that paints is replaced (`flat`) or pinned to a material that is not the near-black one; a near-black material is never ratio-retinted. Eye styles only: which material of a hat or a pair of glasses is near-black needs the art. Break: src/rendering/traits/eyeStyleColorCatalog.js: `flat: true` gone from EYE_STYLE_PAINTS['one-eye'] -> FAIL (tried 2026-11-14).
 * TRAPS §94 (one case): a part that is "everything but the white" says so (`spare`) and is never also pinned: one-eye and wtf spare 'light' and have no `eyes:` row in MAIN_MATERIAL. Which other part spans two materials needs the art. Break: src/rendering/traits/traitMaterials.js: MAIN_MATERIAL['eyes:one-eye'] = 'dark' -> FAIL (tried 2026-11-14).
 * TRAPS §95 (the rule): no skin tone in SKIN_CATALOG clips more of the skin than Alabaster, the brightest that ships, through the game's own retint (retintSkinPixels) over a dense sample of skin pixels; the reference art's raw (207, 250, 250) would. Break: src/rendering/playerSkins.js: the 'aliencyan' target set to the measured [207, 250, 250] -> FAIL (tried 2026-11-14).
 * TRAPS §106 (the rule): a texture's `.frame` is read in src/rendering/ only where listed (lib/lookReadersKnown.mjs, 110 reads in 22 files today): a new reader fails until its author has read the trap and listed it. Break: src/rendering/deathCrumble.js: a `tex.frame.width` read -> FAIL (tried 2026-11-14).
 * TRAPS §119 (the rule): getBounds() is called in src/rendering/ only where listed (21 calls in 10 files today): a box that sizes something else asks gearSheets.frameBounds. Break: src/rendering/deathCrumble.js: size the crumble from `sb.getBounds()` instead of frameBounds(sb) -> FAIL (tried 2026-11-14).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §93   eyeStyleColorCatalog.js: one-eye's `flat: true` gone            -> FAIL §93
 *         a new style `{ part: 'Iris' }` with MAIN_MATERIAL 'eyes:x' 'dark' -> FAIL §93
 *   §94   traitMaterials.js: MAIN_MATERIAL['eyes:one-eye'] = 'dark'        -> FAIL §94
 *   §95   playerSkins.js: aliencyan's target [207, 250, 250]             -> FAIL §95
 *   §106  deathCrumble.js: `const fw = sb.texture.frame.width;`          -> FAIL §106
 *   §119  deathCrumble.js: sb.getBounds() for frameBounds(sb)              -> FAIL §119
 *
 * Run from the repository's root: node tools/guards/traps-look-tables.test.mjs
 *   --write   lower lib/lookReadersKnown.mjs to what is there (never raises)
 * (cd server && npm test runs it with every other guard and suite).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { loadSrc } from './lib/loadSrc.mjs';
import { lookReaders, renderKnown } from './lib/lookReaders.mjs';
import { KNOWN_FRAME, KNOWN_BOUNDS } from './lib/lookReadersKnown.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── §106, §119: the closed lists ── */
{
  const now = lookReaders();
  if (process.argv.includes('--write')) {
    const low = (known, cur) => { const o = Object.create(null); for (const [n, k] of Object.entries(known)) if (cur[n]) o[n] = Math.min(k, cur[n]); return o; };
    writeFileSync(join(ROOT, 'tools/guards/lib/lookReadersKnown.mjs'), renderKnown({ frame: low(KNOWN_FRAME, now.frame), bounds: low(KNOWN_BOUNDS, now.bounds) }));
    console.log('lib/lookReadersKnown.mjs lowered (nothing raised or added)');
    process.exit(0);
  }
  const over = (known, cur) => Object.entries(cur).filter(([n, k]) => k > (known[n] || 0)).map(([n, k]) => `${n}: ${k} > ${known[n] || 0}`);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  check(`§106: a texture's .frame is read in src/rendering/ only where listed (${sum(now.frame)} in ${Object.keys(now.frame).length} files): size from .orig, copy through drawGearFrame, cut through subTexture`,
    sum(now.frame) >= 20 && over(KNOWN_FRAME, now.frame).length === 0, over(KNOWN_FRAME, now.frame));
  check(`§119: getBounds() is called in src/rendering/ only where listed (${sum(now.bounds)} in ${Object.keys(now.bounds).length} files): a box that sizes something else is frameBounds`,
    sum(now.bounds) >= 5 && over(KNOWN_BOUNDS, now.bounds).length === 0, over(KNOWN_BOUNDS, now.bounds));
  const roomF = sum(KNOWN_FRAME) - sum(now.frame), roomB = sum(KNOWN_BOUNDS) - sum(now.bounds);
  if (roomF > 0 || roomB > 0) console.log(`     (room: ${roomF} .frame, ${roomB} getBounds under the census; --write lowers it)`);
}

/* the page's globals the look's modules touch at load */
globalThis.window = globalThis.window || { location: { search: '' }, addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document || { cookie: '', addEventListener() {}, removeEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }) };
const quietly = async (fn) => {
  const keep = [console.error, console.warn, console.log];
  console.error = console.warn = console.log = () => {};
  try { return await fn(); } finally { [console.error, console.warn, console.log] = keep; }
};

/* ── §93, §94: the eye styles' paints ── */
{
  const { EYE_STYLE_PAINTS } = await quietly(() => loadSrc('src/rendering/traits/eyeStyleColorCatalog.js'));
  const { MAIN_MATERIAL } = await quietly(() => loadSrc('src/rendering/traits/traitMaterials.js'));
  const ids = Object.keys(EYE_STYLE_PAINTS);
  /* §93: replaced, or a ratio retint of a material that is not the near-black one */
  const ratioOnDark = ids.filter((id) => {
    const r = EYE_STYLE_PAINTS[id];
    if (r.flat === true) return false;
    const pin = MAIN_MATERIAL['eyes:' + id];
    return pin === undefined || pin === 'dark' || r.spare !== undefined;
  });
  check(`§93: every eye style that paints is replaced (flat) or pinned to a material not the near-black one (${ids.map((id) => id + (EYE_STYLE_PAINTS[id].flat ? ' flat' : ' ' + MAIN_MATERIAL['eyes:' + id])).join(', ')})`,
    ids.length >= 3 && ratioOnDark.length === 0, ratioOnDark);
  check('§93: ...the near-black pupils of one-eye and wtf, and the alien eyes, are replaced',
    ['one-eye', 'wtf', 'alien'].every((id) => EYE_STYLE_PAINTS[id] && EYE_STYLE_PAINTS[id].flat === true));
  /* §94: "everything but the white" is said with `spare`, never with a pin too */
  const both = ids.filter((id) => EYE_STYLE_PAINTS[id].spare !== undefined && MAIN_MATERIAL['eyes:' + id] !== undefined);
  check('§94: an eye style that spares a material is never also pinned to one (a pin names one material; the part spans two)', both.length === 0, both);
  check('§94: ...one-eye and wtf spare the white and have no `eyes:` row in MAIN_MATERIAL',
    ['one-eye', 'wtf'].every((id) => EYE_STYLE_PAINTS[id] && EYE_STYLE_PAINTS[id].spare === 'light' && !('eyes:' + id in MAIN_MATERIAL)));
  const strays = Object.keys(MAIN_MATERIAL).filter((k) => k.startsWith('eyes:') && !EYE_STYLE_PAINTS[k.slice(5)]);
  check('§94: ...and every `eyes:` row names an eye style that paints', strays.length === 0, strays);
}

/* ── §95: a skin tone clips no more than the brightest that ships ── */
{
  const { SKIN_CATALOG, retintSkinPixels } = await quietly(() => loadSrc('src/rendering/playerSkins.js'));
  /* a dense sample of the pixels the retint calls skin (bodyRecolor.js
     _isSkin: r > g >= b, r - b > 30, r > 90, r - g > 25), from dim to the
     brightest: its order between two tones is the sheets' order, the retint
     being a target scaled by each pixel's own luminance */
  const px = [];
  for (let r = 91; r <= 255; r++) for (let dg = 26; dg <= r; dg += 5) for (let db = 0; db <= 60; db += 6) {
    const g = r - dg, b = g - db;
    if (g < 0 || b < 0 || r - b <= 30) continue;
    px.push(r, g, b, 255);
  }
  const share = (target) => {
    const d = Uint8ClampedArray.from(px);
    retintSkinPixels(d, target);
    let n = 0, clip = 0;
    for (let i = 0; i < d.length; i += 4) { n++; if (d[i] === 255 || d[i + 1] === 255 || d[i + 2] === 255) clip++; }
    return clip / n;
  };
  const ala = SKIN_CATALOG.find((s) => s.id === 'alabaster');
  const aShare = ala && ala.target ? share(ala.target) : null;
  const rows = SKIN_CATALOG.filter((s) => Array.isArray(s.target)).map((s) => ({ id: s.id, share: share(s.target) }));
  const over = rows.filter((r) => r.share > aShare + 1e-12).map((r) => `${r.id} ${(r.share * 100).toFixed(2)}% > ${(aShare * 100).toFixed(2)}%`);
  check(`§95: no skin tone clips more of the skin than Alabaster through the game's own retint (${rows.length} tones, ${px.length / 4} skin pixels; Alabaster ${aShare === null ? '?' : (aShare * 100).toFixed(2) + '%'})`,
    aShare > 0 && rows.length >= 10 && over.length === 0, over);
  const raw = share([207, 250, 250]);
  check(`§95: ...and the sample tells the reference art's raw measurement from it (the alien's (207, 250, 250): ${(raw * 100).toFixed(2)}%)`, raw > aShare, { raw, aShare });
}

process.exit(failed ? 1 : 0);
