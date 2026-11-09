/* ═══ v2.3.4355: A GROUND PICTURE THAT IS LATE IS NOT A GROUND NOBODY MADE ═══
 *
 * The owner, of the expo of 2026-11-05 (the judges on computers that had
 * never opened the game, on the venue's line): "patches of texture like a
 * checker pattern showed all round the outer ring of the view".  The chequer
 * is the Ground Studio's mark for a swatch NOT MADE YET (ground.js
 * composeGround: "chequered, so the gap shows"), and the game's worker drew
 * it for a picture that was made and merely had not finished downloading.
 * public/tools/world/core/ground.js (`opts.late`) and ground-worker.js
 * (A SLOW LINE).  Checked:
 *   1. the town square's piece laid with NO pictures and nothing said late
 *      is chequered: two shades a swatch (the studio's mark stays);
 *   2. the same piece with every swatch said late: one plain colour a swatch,
 *      its plan colour, the land's shapes exactly where they were;
 *   3. only the swatches said late go plain: the others keep the chequer;
 *   4. the worker says late exactly the swatches that HAVE a picture which
 *      has not come, and passes it to the composer;
 *   5. the worker's downloads (read from its source: it is a module worker,
 *      and what it does on a thin line is mp-desksmooth's to play): a
 *      download is cut for stalling, never for its whole time; a quiet one
 *      never starts beside a waiting piece's; the pictures further out are
 *      asked for while it is idle, within the blocks already built; the way
 *      in's pieces share one wait, shorter than the zone gate's quiet.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFor } from '../../public/tools/world/plan.js';
import { wheelBlocks, BLOCK } from '../../public/tools/world/core/worldblocks.js';
import { composeGround, swatchesUnder } from '../../public/tools/world/core/ground.js';
import { WHEEL_LONG, WHEEL_CENTRE } from '../src/wheelspawns.js';
import { GATE_QUIET_MS } from '../../src/game/zoneGate.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* the piece under the town square, as the worker lays it (ground-worker.js chunk) */
const PLAN = planFor('', WHEEL_LONG || 1);
const blocks = wheelBlocks(PLAN, {});
const cat = blocks.catalog();
const WPA = PLAN.worldPxPerArtPx, CHUNK = 128, APRON = 3, K = 3, S = blocks.scale;
const pi = Math.floor(WHEEL_CENTRE[0] / WPA / CHUNK), pj = Math.floor((WHEEL_CENTRE[1] + 288) / WPA / CHUNK);
const M = 8;
function pieceAt(i, j) {
  const rect = { x: blocks.x0 + i * CHUNK - APRON, y: blocks.y0 + j * CHUNK - APRON, w: CHUNK + 2 * APRON, h: CHUNK + 2 * APRON };
  const cx = Math.floor((rect.x - blocks.x0) / S), cy = Math.floor((rect.y - blocks.y0) / S);
  const cw = Math.ceil((rect.x + rect.w - blocks.x0) / S) - cx, ch = Math.ceil((rect.y + rect.h - blocks.y0) / S) - cy;
  const { bp, mm } = blocks.window({ x: cx - M, y: cy - M, w: cw + 2 * M, h: ch + 2 * M });
  return { rect, bp, mm };
}
/* the colours each swatch was drawn in: id -> Set of 'r,g,b' */
function coloursBySwatch(out) {
  const by = new Map();
  for (let p = 0; p < out.mat.length; p++) {
    const id = cat.ids[out.mat[p]];
    if (id === 'water') continue;
    let s = by.get(id);
    if (!s) by.set(id, (s = new Set()));
    if (s.size < 8) s.add(out.data[p * 4] + ',' + out.data[p * 4 + 1] + ',' + out.data[p * 4 + 2]);
  }
  return by;
}
/* a piece near the town square where two grounds meet (the square's own piece is all plaza): the first, nearest it, that
   draws two swatches */
let piece = null, plainOff = null, c0 = null;
find: for (let r = 0; r <= 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
  if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
  const pc = pieceAt(pi + di, pj + dj);
  const out = composeGround(PLAN, pc.bp, pc.mm, pc.rect, Object.create(null), { scale: K });
  const c = coloursBySwatch(out);
  if (c.size >= 2) { piece = pc; plainOff = out; c0 = c; break find; }
}
const lay = (late) => composeGround(PLAN, piece.bp, piece.mm, piece.rect, Object.create(null), { scale: K, late });
const ids = piece ? [...swatchesUnder(piece.bp, piece.mm, piece.rect)].filter((id) => id !== 'water') : [];

/* 1 */
const drawn = c0 ? [...c0.keys()] : [];
check('1. a piece by the town square draws at least two grounds (the test has something to tell apart)', drawn.length >= 2, drawn);
const chequered = drawn.filter((id) => c0.get(id).size === 2);
check('1b. with no pictures and nothing said late, the grounds are chequered -- two shades each (the Ground Studio\'s "not made yet")',
  chequered.length >= 2, c0 ? Object.fromEntries([...c0].map(([k, v]) => [k, v.size])) : null);

/* 2 */
const all = Object.create(null);
for (const id of ids) all[id] = true;
const plainOn = lay(all);
const c1 = coloursBySwatch(plainOn);
check('2. every swatch said late: one plain colour each, no chequer', [...c1.values()].every((s) => s.size === 1), Object.fromEntries([...c1].map(([k, v]) => [k, v.size])));
{
  let same = plainOn.mat.length === plainOff.mat.length;
  for (let p = 0; same && p < plainOn.mat.length; p++) if (plainOn.mat[p] !== plainOff.mat[p]) same = false;
  check('2b. ...and the land\'s shapes are exactly where they were (the same swatch under every pixel)', same);
  const e = cat.catalog[cat.index[chequered[0]]];
  const want = e && e.color ? e.color.join(',') : null;
  check('2c. ...in the swatch\'s plan colour (the chequer\'s lighter square)', !!want && c1.get(chequered[0]).has(want) && c0.get(chequered[0]).has(want), { want, got: [...c1.get(chequered[0])] });
}

/* 3 */
{
  const one = Object.create(null);
  one[chequered[0]] = true;
  const c = coloursBySwatch(lay(one));
  check('3. only the swatch said late goes plain; a swatch nobody has made keeps the chequer', c.get(chequered[0]).size === 1 && c.get(chequered[1]).size === 2,
    { late: chequered[0], [chequered[0]]: c.get(chequered[0]).size, [chequered[1]]: c.get(chequered[1]).size });
}

/* 4, 5: the worker's source */
const gw = readFileSync(join(ROOT, 'public/tools/world/core/ground-worker.js'), 'utf8');
const num = (name) => { const m = new RegExp('const ' + name + ' = (\\d+);').exec(gw); return m ? Number(m[1]) : null; };
const fn = (name) => { const a = gw.indexOf('function ' + name + '('); if (a < 0) return ''; const b = gw.indexOf('\n}\n', a); return gw.slice(a, b + 3); };
{
  const chunk = fn('chunk');
  check('4. the worker says late the swatches that have a picture which has not come',
    /for \(const id of ids\) if \(swatches\[id\] && !tiles\[id\]\) \(late \|\| \(late = Object\.create\(null\)\)\)\[id\] = true;/.test(chunk));
  check('4b. ...and passes it to the composer', /composeGround\(PLAN, bp, mm, rect, tiles, \{[^}]*\blate\b/.test(chunk));
}
{
  const ff = fn('fetchFile');
  check('5. a download is read a part at a time, and each part pushes the cut back', /getReader\(\)/.test(ff) && /parts\.push\(value\);\s*alive\(\);/.test(ff) && /setTimeout\(giveUp, DL_STALL_MS\)/.test(ff));
  check('5b. ...no flat time from start to last byte any more', !/DL_TIMEOUT_MS/.test(gw) && num('DL_STALL_MS') >= 10000 && num('DL_MAX_MS') >= 60000, { stall: num('DL_STALL_MS'), max: num('DL_MAX_MS') });
  const pump = fn('pump');
  check('5c. a quiet download never starts beside one a piece is waiting for, DL_QUIET at a time',
    /if \(dlLine\[0\]\.urgentAt == null\) \{\s*if \(dlActive >= DL_QUIET\) break;[\s\S]*for \(const j of dlNow\) if \(j\.urgentAt != null\)[\s\S]*if \(waited\) break;/.test(pump) && num('DL_QUIET') >= 1 && num('DL_QUIET') < num('DL_PARALLEL'));
  const idle = fn('idleBlock');
  check('5d. the pictures further out are asked for while the worker is idle, once the blocks round you are built', /if \(!next\) \{ farPrefetch\(\); return; \}/.test(idle));
  /* all of FAR_REACH lies in the 3 x 3 blocks the idle builder has built: it builds none of its own */
  const blockPx = BLOCK * S * WPA;
  check('5e. ...within the blocks already built (FAR_REACH at most a block), and further than the pieces\' own two', num('FAR_REACH') <= blockPx && num('FAR_REACH') > num('PREFETCH') * CHUNK * WPA,
    { FAR_REACH: num('FAR_REACH'), blockPx, near: num('PREFETCH') * CHUNK * WPA });
  const far = fn('farPrefetch');
  check('5f. ...quietly (never as a waiting piece\'s), and never one already fetched this visit', /want\(k, false\)/.test(far) && !/want\(k, true\)/.test(far) && /everFetched\.has\(k\)/.test(far));
  const tileOf = fn('tileOf');
  check('5g. the way in\'s pieces share one wait for their pictures', /if \(wait === 'gate'\) \{\s*if \(!gateUntil\) gateUntil = performance\.now\(\) \+ GATE_WAIT_MS;\s*left = gateUntil - performance\.now\(\);/.test(tileOf));
  check('5h. ...shorter than the zone gate\'s quiet, so the wait is never taken for a hung load', num('GATE_WAIT_MS') > num('PIECE_WAIT_MS') && num('GATE_WAIT_MS') < GATE_QUIET_MS, { GATE_WAIT_MS: num('GATE_WAIT_MS'), GATE_QUIET_MS });
  const wt = readFileSync(join(ROOT, 'src/game/wheelTrial.js'), 'utf8');
  check('5i. the game marks the gate\'s pieces as its fill\'s', /wheelChunk\(i, j, false, fill\)/.test(wt) && /gate: gate \|\| 0/.test(wt));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
