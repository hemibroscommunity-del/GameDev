/* Caps conformance audit (v2.3.1203; spec:
 * docs/specs/conformance-audit.md).
 *
 * The deploy-order safety property (handoff rule 19 / CLAUDE.md wire
 * section) hangs on the caps advertisement in join.js: the server
 * lists a capability flag in the state_sync `caps: {...}` literal, and
 * the client gates its legacy fallback path on `S._serverCaps.<flag>`.
 * Both halves rot silently:
 *   - a flag advertised but never read client-side is dead weight that
 *     LOOKS like a live gate (the next session "removes the unused
 *     legacy path" trusting a gate that gates nothing), and
 *   - a flag the client reads but the server never advertises means
 *     the feature is permanently stuck on its legacy path against
 *     every worker, old and new.
 * Until now the pairing was enforced by memory, across two directories
 * (server/src/join.js vs the whole client src/ tree).  This audit
 * makes it mechanical, copying wire-audit.test.mjs's static-extraction
 * shape.
 *
 * Extraction:
 *   - SERVER SIDE: the single-line `caps: { flag: true, ... }` literal
 *     in join.js.  Flags are the `name: true` pairs.  The trailing
 *     `..._liveFlags` spread is RUNTIME state (operator live-ops
 *     overrides, docs/specs/liveops.md) and deliberately OUT of
 *     static-audit scope: it has no static flag names to extract, and
 *     its empty-object default means it never adds a flag the literal
 *     doesn't already carry unless an operator does so on purpose.
 *   - CLIENT SIDE: every `_serverCaps.<flag>` / `_serverCaps?.<flag>`
 *     member read and every `_serverCaps['flag']` bracket read across
 *     src/ (.js + .jsx, recursive).  The lone WRITE site
 *     (`S._serverCaps = msg.caps || {}` in wsClient.js) has no member
 *     access so the regexes skip it naturally.
 *
 * If extraction ever collapses (the caps literal gets split across
 * lines, `_serverCaps` gets renamed), the rot floors below fail loudly
 * instead of the audit passing vacuously (21 flags / 39 gate sites at
 * ship time).                                                          */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* Advertised flags that are DELIBERATELY never read from _serverCaps
 * client-side.  Every entry needs a WHY; an entry whose flag gains a
 * real client gate must be deleted (checked below). */
const CAPS_ALLOWLIST = new Map([
  ['httpAuth', 'handshake negotiation field, not a feature gate — the client SENDS httpAuth:true in join (wsClient.js) rather than reading it from caps'],
  /* v2.3.4911 */
  ['arena', 'for the record: every worker referees its own arena (v2.3.1126), and the page\'s old-worker paths it gated (the entry fee\'s own debit and refunds, the self-reported result and its win credit) are gone; the phone takes the fee and the prizes only from the worker'],
  /* v2.3.3318 */
  ['wheelnear', 'for the record and the tests (mp-wheelnear): the phone ASKS with `wn: 1` in its join, before any caps arrive, and reads a near list by the mark on the message itself (zone_state `mnear`, state_sync `monstersNear`), so it reads right whichever worker sent it; a caps gate would add nothing (server/src/wheelnear.js)'],
  /* v2.3.4801: the worker's half ships first (drawgather.js); the phone's
     bow and staff lanes read them next -- delete each when its gate lands
     (v2.3.4802: the bow's landed, game/bowFeel.js bowFeelOn: its row is gone;
     v2.3.4803: the staff's landed, game/staffFeel.js: its row is gone) */
  /* v2.3.1660: the prog3 entry added at v2.3.1659 is deleted — the
     client gate shipped (wsClient setProg3Enabled), so the audit
     enforces it for real now. */
]);

const here = dirname(fileURLToPath(import.meta.url));
const serverSrc = join(here, '..', 'src');
const clientSrc = join(here, '..', '..', 'src');

// ── extraction A: advertised flags from the join.js caps literal ──
const advertised = new Map(); // flag -> [file:line]
{
  const lines = readFileSync(join(serverSrc, 'join.js'), 'utf8').split('\n');
  /* v2.3.4520: and the literal's own lines after that one, to its closing
     `},` -- TRAPS §316: a new cap goes on its OWN line, never on the long one */
  let inCaps = false;
  lines.forEach((line, i) => {
    let m0 = line.match(/\bcaps:\s*\{(.*)/);
    if (m0) inCaps = !/\}\s*,?\s*$/.test(line);
    else if (inCaps) {
      if (/^\s*\}\s*,?\s*$/.test(line)) { inCaps = false; return; }
      m0 = [line, line];
    }
    if (!m0) return;
    /* v2.3.3130: or the COUNT of a server table (`cookRows:
       COOKING_RECIPES.length`): a capability that is a number -- how many
       recipes this worker cooks.  Only an UPPER_CASE table's .length, so
       prose in the literal's comments ("part: 2") is never read as a flag. */
    /* v2.3.3315: or a number the ROOM decides with one of its own methods
       (`wheelsize: this._wheelLongNow()`: which Wheel it plays, wheeltables.js) */
    const RE = /([A-Za-z0-9_$]+):\s*(?:true\b|[A-Z][A-Z0-9_]*\.length\b|this\._[A-Za-z0-9_$]+\(\))/g;
    /* v2.3.4545: ...and the caps that follow on lines of their OWN (TRAPS §316: a new cap never goes on the old
       long line).  The literal runs on until the line that closes it (`},`): read to there. */
    const closes = (l) => /\}\s*,?\s*$/.test(l);
    let body = m0[1];
    if (!closes(line)) {
      for (let j = i + 1; j < lines.length && j < i + 200; j++) {
        body += '\n' + lines[j];
        if (closes(lines[j])) break;
      }
    }
    let m;
    while ((m = RE.exec(body))) {
      if (!advertised.has(m[1])) advertised.set(m[1], []);
      advertised.get(m[1]).push('join.js:' + (i + 1));
    }
  });
}

// ── extraction B: client-side _serverCaps gate sites across src/ ──
const referenced = new Map(); // flag -> [file:line]
let gateSites = 0;
const RE_DOT = /_serverCaps\??\.\s*([A-Za-z0-9_$]+)/g;
const RE_BRACKET = /_serverCaps\??\.?\[\s*['"]([A-Za-z0-9_$]+)['"]\s*\]/g;
function walk(dir, rel) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, rel + name + '/'); continue; }
    if (!/\.(js|jsx)$/.test(name)) continue;
    const lines = readFileSync(p, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const re of [RE_DOT, RE_BRACKET]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          if (!referenced.has(m[1])) referenced.set(m[1], []);
          referenced.get(m[1]).push(rel + name + ':' + (i + 1));
          gateSites++;
        }
      }
    });
  }
}
walk(clientSrc, 'src/');

// ── 1. regex-rot floors ──
check('extraction found a plausible advertised-flag population (>=20)', advertised.size >= 20, advertised.size);
check('extraction found a plausible client gate-site population (>=30)', gateSites >= 30, gateSites);

// ── 2. THE audit, server->client: every advertised flag is gated on ──
{
  const dead = [...advertised.keys()]
    .filter((f) => !referenced.has(f) && !CAPS_ALLOWLIST.has(f))
    .map((f) => ({ flag: f, sites: advertised.get(f) }));
  check('every advertised caps flag is read from _serverCaps client-side (or documented in CAPS_ALLOWLIST) — an unread flag is a gate that gates nothing and WILL mislead the next legacy-path cleanup',
    dead.length === 0, dead);
}

// ── 3. THE audit, client->server: every gate reads an advertised flag ──
{
  const orphan = [...referenced.keys()]
    .filter((f) => !advertised.has(f))
    .map((f) => ({ flag: f, sites: referenced.get(f) }));
  check('every client-referenced _serverCaps flag is advertised in the join.js caps literal — an unadvertised flag keeps its feature stuck on the legacy path against EVERY worker',
    orphan.length === 0, orphan);
}

// ── 4. allowlist hygiene: entries must still be advertised... ──
{
  const stale = [...CAPS_ALLOWLIST.keys()].filter((f) => !advertised.has(f));
  check('no stale CAPS_ALLOWLIST entries (each excused flag is still advertised)', stale.length === 0, stale);
}

// ── 5. ...and must not have grown a real client gate ──
{
  const dead = [...CAPS_ALLOWLIST.keys()].filter((f) => referenced.has(f));
  check('no CAPS_ALLOWLIST entry is client-referenced (a referenced flag has a real gate — delete its allowlist excuse)',
    dead.length === 0, dead);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
