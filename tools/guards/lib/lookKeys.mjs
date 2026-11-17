/* ═══ v2.3.5781: THE LOOK KEY RULES, ONE COPY (card U2 PR 2; CLAUDE.md §8 row "a stored look key") ═══
 *
 * Moved here from tools/dev/precheck.mjs's checks `look-parity` (v2.3.2445)
 * and `look-blank` (v2.3.2690), word for word, so precheck and the guard
 * (tools/guards/look-keys.test.mjs) run the same two rules:
 *
 *   look-parity  every key the worker stores (JOIN_COSMETIC_KEYS, join.js) is
 *                restored on the owner's own device (LOOK_SETTERS or an
 *                inline rec.look.<k>, characterRecord.js) or declared in
 *                LOOK_UNRESTORED with why; and no table names a key the gate
 *                does not carry.  The symptom it stops: "my character looks
 *                right to everyone except me".
 *   look-blank   every LOOK_SETTERS key has a blank (LOOK_BLANK) and is on the
 *                worker's RECORD_LOOK_KEYS: a key a record lacks means BLANK,
 *                on both sides (owner: "every saved character has same face
 *                tattoo as one").
 *
 * Each gives precheck's rows ({ level, check, msg }) exactly as it printed
 * them.  Node only (the guards run on GitHub with server/'s packages).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

export function lookParityRows(root = ROOT) {
  const read = (f) => readFileSync(join(root, f), 'utf8');
  const rows = [];
  const add = (level, check, msg) => rows.push({ level, check, msg });
  const KNOWN_NON_LOOK = new Set(['name']);   /* identity, not appearance */
  let gate = null, setters = null, inline = null, declared = null;
  try {
    const j = read('server/src/join.js').match(/JOIN_COSMETIC_KEYS\s*=\s*\[([\s\S]*?)\n\];/);
    if (j) gate = [...j[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]);
  } catch { /* handled below */ }
  try {
    const c = read('src/game/characterRecord.js');
    const m = c.match(/const LOOK_SETTERS = \{([\s\S]*?)\n\};/);
    if (m) setters = [...m[1].matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((x) => x[1]);
    inline = [...c.matchAll(/rec\.look\.([A-Za-z0-9_]+)/g)].map((x) => x[1]);
    const u = c.match(/LOOK_UNRESTORED = \{([\s\S]*?)\n\};/);
    if (u) declared = [...u[1].matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((x) => x[1]);
  } catch { /* handled below */ }
  if (!gate || !setters || !declared) {
    add('WARN', 'look-parity',
      'could not parse JOIN_COSMETIC_KEYS or characterRecord\'s tables — check skipped');
  } else {
    const covered = new Set([...setters, ...inline, ...declared, ...KNOWN_NON_LOOK]);
    const orphan = gate.filter((k) => !covered.has(k));
    /* the other direction: a table naming a key the gate does not carry is
       dead weight that reads as coverage */
    const ghosts = [...new Set([...setters, ...declared])]
      .filter((k) => !gate.includes(k) && !KNOWN_NON_LOOK.has(k));
    if (!orphan.length && !ghosts.length) {
      add('PASS', 'look-parity',
        `all ${gate.length} stored look key(s) are restored (${setters.length + inline.length}) `
        + `or declared unrestored (${declared.length})`);
    } else {
      add('FAIL', 'look-parity',
        (orphan.length
          ? `${orphan.length} key(s) the worker STORES are neither restored nor declared in\n`
            + '    src/game/characterRecord.js — peers will see them and the owner will not:\n'
            + `    ${orphan.join(' ')}\n`
            + '    Add a setter to LOOK_SETTERS, or an entry to LOOK_UNRESTORED saying why not.\n'
          : '')
        + (ghosts.length
          ? `    ${ghosts.length} key(s) named in characterRecord are not on the worker's gate `
            + `(dead coverage): ${ghosts.join(' ')}`
          : ''));
    }
  }
  return { rows, gate: gate || [], setters: setters || [] };
}

export function lookBlankRows(root = ROOT) {
  const read = (f) => readFileSync(join(root, f), 'utf8');
  const rows = [];
  const add = (level, check, msg) => rows.push({ level, check, msg });
  let setters = null, blank = null, worker = null;
  try {
    const c = read('src/game/characterRecord.js');
    const m = c.match(/const LOOK_SETTERS = \{([\s\S]*?)\n\};/);
    if (m) setters = [...m[1].matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((x) => x[1]);
    const b = c.match(/const LOOK_BLANK = \{([\s\S]*?)\n\};/);
    if (b) blank = [...b[1].matchAll(/([A-Za-z0-9_]+):\s*(?:'[^']*'|null)/g)].map((x) => x[1]);
  } catch { /* handled below */ }
  try {
    const j = read('server/src/join.js').match(/RECORD_LOOK_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
    if (j) worker = [...j[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]);
  } catch { /* handled below */ }
  if (!setters || !blank || !worker) {
    add('WARN', 'look-blank',
      'could not parse LOOK_SETTERS / LOOK_BLANK (characterRecord.js) or RECORD_LOOK_KEYS (join.js) — check skipped');
  } else {
    const want = new Set(setters);
    const diff = (have, name) => {
      const h = new Set(have);
      const missing = setters.filter((k) => !h.has(k));
      const extra = [...h].filter((k) => !want.has(k));
      return (missing.length ? `    ${name} is missing: ${missing.join(' ')}\n` : '')
        + (extra.length ? `    ${name} has keys LOOK_SETTERS does not: ${extra.join(' ')}\n` : '');
    };
    const out = diff(blank, 'LOOK_BLANK (characterRecord.js)') + diff(worker, 'RECORD_LOOK_KEYS (server/src/join.js)');
    if (!out) {
      add('PASS', 'look-blank', `all ${setters.length} look key(s) have a client blank and are on the worker's list`);
    } else {
      add('FAIL', 'look-blank',
        'a look key must mean the same thing on both sides when a record lacks it:\n' + out.replace(/\n$/, ''));
    }
  }
  return { rows, setters: setters || [] };
}
