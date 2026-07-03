/* Wire-protocol conformance audit (v2.3.1151; spec:
 * docs/specs/conformance-audit.md).
 *
 * ARCHITECTURE-HANDOFF rule 13 says: every server-EMITTED event type
 * must be in PRIVILEGED_EVENTS, or any client can forge it through the
 * default-branch rebroadcast.  Until now that rule was enforced by
 * memory — and it failed silently at least once (monster_transform
 * shipped v2.3.856-era, wasn't deny-listed until v2.3.1147).  This
 * audit makes the rule mechanical: it extracts every emitted type
 * from the server source and asserts the deny-list covers it.
 *
 * Static-source extraction, on purpose: importing and instrumenting
 * every emission path can't reach code behind rare branches, but every
 * emission SITE is a string literal in the source.  Two shapes exist:
 *   A) object literals:   { type: 'monster_hit', ... }
 *      (ws.send / broadcast / eventBuffer.push / _dungeonSend all
 *      build one of these)
 *   B) send-helper calls: this._threatSend(id, 'gear_locked', {...})
 *      (the guilds/trade2/pets/threat helper family takes the type as
 *      its second argument)
 *
 * data.js is excluded: its type:'kill' etc. are quest-objective DATA
 * (zero emission sites — verified when this audit was written).
 * If extraction ever collapses (someone renames the helpers, switches
 * quote style, builds types dynamically), the ≥40 floor check fails
 * loudly instead of the audit rotting into a vacuous pass.           */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRIVILEGED_EVENTS } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* Server-emitted types that are DELIBERATELY not privileged — each is
 * also a legitimate client->client relay half, so deny-listing it
 * would break the live handshake it belongs to.  Every entry needs a
 * WHY; grow this list only when a new server emission mirrors an
 * existing client relay (rare — new systems should use fresh
 * server-only type names instead). */
const RELAY_ECHO_ALLOWLIST = new Map([
  ['player_respawned', 'clients broadcast it to peers to clear the corpse sprite; blocking it would leave respawned players rendered dead forever. Forgery is purely visual (index.js deny-list comment).'],
  ['duel_decline', 'client-initiated relay (declining a duel); the server also synthesizes both halves when it cancels a duel (duel.js:82). Deny-listing breaks the client decline.'],
  ['trade_reject', 'client-initiated relay (rejecting a trade offer); the server also emits it as its validation-failure answer (trade.js:90).'],
  ['clan_war_declare', 'the server echoes the declare in the exact shape the client relay already renders (clans.js:249); the legacy client->client declare must keep relaying against old workers.'],
]);

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = readdirSync(srcDir).filter((f) => f.endsWith('.js') && f !== 'data.js');

const extracted = new Map(); // type -> [file:line, ...]
const RE_A = /\btype:\s*'([a-z_0-9]+)'/g;
const RE_B = /_[A-Za-z0-9]+Send\([^,)]+,\s*'([a-z_0-9]+)'/g;
for (const f of files) {
  const lines = readFileSync(join(srcDir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const re of [RE_A, RE_B]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        if (!extracted.has(m[1])) extracted.set(m[1], []);
        extracted.get(m[1]).push(f + ':' + (i + 1));
      }
    }
  });
}

// ── 1. regex-rot floor ──
check('extraction found a plausible type population (>=40)', extracted.size >= 40, extracted.size);

// ── 2. THE audit: every emitted type is privileged or allowlisted ──
{
  const unregistered = [...extracted.keys()]
    .filter((t) => !PRIVILEGED_EVENTS.has(t) && !RELAY_ECHO_ALLOWLIST.has(t))
    .map((t) => ({ type: t, sites: extracted.get(t) }));
  check('every server-emitted type is in PRIVILEGED_EVENTS (or the documented allowlist) — an unregistered type is CLIENT-FORGEABLE via the default rebroadcast; add it to the deny-list in index.js',
    unregistered.length === 0, unregistered);
}

// ── 3. dead entries: everything privileged is actually emitted ──
{
  const dead = [...PRIVILEGED_EVENTS].filter((t) => !extracted.has(t));
  check('no dead PRIVILEGED_EVENTS entries (each is emitted somewhere; a dead entry means an emission was removed or extraction missed a new call shape — investigate, don\'t just delete)',
    dead.length === 0, dead);
}

// ── 4. the allowlist and the deny-list must not overlap ──
{
  const both = [...RELAY_ECHO_ALLOWLIST.keys()].filter((t) => PRIVILEGED_EVENTS.has(t));
  check('allowlist and PRIVILEGED_EVENTS are disjoint (an entry in both means someone privileged a relay type — that BREAKS the live client relay it documents)',
    both.length === 0, both);
}

// ── 5. every allowlist entry still exists in the source ──
{
  const stale = [...RELAY_ECHO_ALLOWLIST.keys()].filter((t) => !extracted.has(t));
  check('no stale allowlist entries (the emission it excuses still exists)', stale.length === 0, stale);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
