/* ═══ v2.3.5082: THE REGISTRY AND ITS MARKS AGREE ═══
 *
 * Card E, PR 3 (grand plan steps 4.4 and 4.7; docs/SHAPES.md part 3).  The
 * storage registry is the markdown table in ARCHITECTURE-HANDOFF rule 2 (and
 * precheck's `storage-keys` parses it, so it takes no new column); what each
 * record holds and whose it is are server/src/storagemarks.js.  This guard
 * holds the two to each other:
 *
 *   1. every prefix (or single key) the registry lists has its marks, and
 *      every mark is a prefix the registry lists: a new record registered
 *      without saying whether it holds value fails here;
 *   2. each mark is from the closed lists (`value`: gold, goods, both, none;
 *      `whose`: player, between, room) and says why;
 *   3. every place an escrow road names (gold.js ESCROW_PLACES, and each
 *      escrow in MAIL_CLASSES) is marked as holding value: the world's sum
 *      counts what it reads from these marks.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. a new registry row `| \`newthing:<pid>\` | x | y |` with no mark  -> FAIL 1
 *   1. `'motd'` deleted from STORAGE_MARKS                              -> FAIL 1
 *   3. `'bank:'` marked `none`                                          -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/storage-marks.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const { STORAGE_MARKS, MARK_VALUES, MARK_WHOSE, marksOf } = await import(pathToFileURL(join(ROOT, 'server/src/storagemarks.js')).href);
const { ESCROW_PLACES, MAIL_CLASSES, GOLD_ROADS } = await import(pathToFileURL(join(ROOT, 'server/src/gold.js')).href);
const { BAG_ROADS, BAG_WHOLE } = await import(pathToFileURL(join(ROOT, 'server/src/bag.js')).href);

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

/* The registry's names: every backticked key in the first cell of each row
   of rule 2's table (`| Prefix | Value | Owner (spec) |`), as a prefix up to
   its first `<`, or whole when it has none (`shop_stock`, `jackpot:draw`). */
function registryNames(md) {
  const lines = md.split('\n');
  const head = lines.findIndex((l) => /^\s*\|\s*Prefix\s*\|\s*Value\s*\|\s*Owner/.test(l));
  if (head < 0) return null;
  const names = new Set();
  for (let i = head + 2; i < lines.length; i++) {
    const l = lines[i];
    if (!/^\s*\|/.test(l)) break;
    const first = l.split('|')[1] || '';
    for (const m of first.matchAll(/`([^`]+)`/g)) {
      const k = m[1].trim();
      names.add(k.indexOf('<') >= 0 ? k.slice(0, k.indexOf('<')) : k);
    }
  }
  return names;
}

/* ── 1. one list of records, in both places ── */
const reg = registryNames(read('docs/ARCHITECTURE-HANDOFF.md'));
check('1: the registry\'s table is found and read (60 records or more)', !!reg && reg.size >= 60, reg && reg.size);
{
  const marks = Object.keys(STORAGE_MARKS);
  const unmarked = [...(reg || [])].filter((k) => !Object.prototype.hasOwnProperty.call(STORAGE_MARKS, k));
  const unregistered = marks.filter((k) => !(reg && reg.has(k)));
  check('1: every record the registry lists has its marks (server/src/storagemarks.js)', unmarked.length === 0, unmarked);
  check('1: every mark is a record the registry lists (ARCHITECTURE-HANDOFF rule 2)', unregistered.length === 0, unregistered);
  /* the reader itself: a planted row is seen, with a prefix and a single key */
  const planted = registryNames('| Prefix | Value | Owner (spec) |\n|---|---|---|\n| `a:<x>` / `b_c:<y>:<z>` | v | o |\n| `one_key` | v | o |\n\nafter');
  check('1: the reader takes `a:<x>` / `b_c:<y>:<z>` as a: and b_c:, and `one_key` whole, and stops at the table\'s end',
    !!planted && [...planted].join() === 'a:,b_c:,one_key');
}

/* ── 2. the closed lists ── */
{
  const bad = Object.entries(STORAGE_MARKS).filter(([, m]) => !MARK_VALUES.includes(m.value) || !MARK_WHOSE.includes(m.whose) || typeof m.why !== 'string' || !m.why).map(([k]) => k);
  check('2: every mark\'s value and whose are from their closed lists, and each says why', bad.length === 0, bad);
  check('2: the lists are SHAPES part 3\'s', MARK_VALUES.join() === 'gold,goods,both,none' && MARK_WHOSE.join() === 'player,between,room' && Object.isFrozen(STORAGE_MARKS));
  check('2: marksOf finds a key by its longest prefix, a single key whole, and nothing else',
    marksOf('rpg:bp_x') === STORAGE_MARKS['rpg:'] && marksOf('rpgsnap:bp_x:20261114') === STORAGE_MARKS['rpgsnap:'] && marksOf('rpgsnap_at:bp_x') === STORAGE_MARKS['rpgsnap_at:']
    && marksOf('shop_stock') === STORAGE_MARKS.shop_stock && marksOf('jackpot:draw') === STORAGE_MARKS['jackpot:draw'] && marksOf('nope:1') === null && marksOf('__proto__') === null);
}

/* ── 3. what an escrow names holds value ── */
{
  const places = new Set(ESCROW_PLACES);
  const roadPlaces = (t) => Object.values(t).filter((r) => r && r.class === 'escrow').flatMap((r) => (Array.isArray(r.other) ? r.other : [r.other]));
  for (const p of [...roadPlaces(GOLD_ROADS), ...roadPlaces(BAG_ROADS), ...roadPlaces(MAIL_CLASSES), ...roadPlaces(BAG_WHOLE)]) places.add(p);
  const bad = [...places].filter((p) => { const m = marksOf(p); return !m || m.value === 'none'; });
  check(`3: every place an escrow names (${places.size}) is marked as holding value`, bad.length === 0, bad);
  const held = Object.entries(STORAGE_MARKS).filter(([, m]) => m.value !== 'none').map(([k]) => k);
  check(`3: ${held.length} records hold value (a change here is a change to what the world's sum counts)`, held.length === 14, held);
}

process.exit(failed ? 1 : 0);
