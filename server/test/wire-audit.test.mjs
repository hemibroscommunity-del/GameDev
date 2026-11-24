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
import { readFileSync } from 'node:fs';
import { srcFiles } from './src-walk.mjs';
import { visit, wordsAt } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the census reads the syntax tree (card DG PR 2) */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRIVILEGED_EVENTS } from '../src/index.js';
import { RELAY_ECHOES } from '../src/wire/lists.js';   /* v2.3.5181 */

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
 * server-only type names instead).
 * v2.3.5181: MADE FROM THE WIRE TABLE (server/src/wire/lists.js
 * RELAY_ECHOES; card K): every row marked `privileged: 'echo'`, its why the
 * row's `echo:` note (wire-table.test §4 fails an echo row with none).  An
 * entry is that mark on the row, never a line here. */
const RELAY_ECHO_ALLOWLIST = RELAY_ECHOES;

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = srcFiles().filter((f) => f !== 'data.js');   /* v2.3.5060: in depth, a folder's files too (src-walk.mjs) */

/* v2.3.6441 (card DG PR 2): read off the syntax tree, never a pattern of
   text: a `type` written out, or held in a name the tree can follow (`const T
   = 'quest_' + 'bonus'`, plants2 SEND-3: a new type with no out row that the
   pattern walked past), a ternary of two; and a send helper's second
   argument the same way. */
const extracted = new Map(); // type -> [file:line, ...]
const note = (t, at) => { if (!/^[a-z_0-9]+$/.test(t)) return; if (!extracted.has(t)) extracted.set(t, []); extracted.get(t).push(at); };
for (const f of files) {
  visit(readFileSync(join(srcDir, f), 'utf8'), {
    ObjectProperty(path) {
      const k = path.node.key;
      if (path.node.computed || (k.name || k.value) !== 'type') return;
      /* a `type` inside a payload (`payload: { type: BURST_ABILITY_KIND }`, an
         ability's kind) or a row's trust (`trust: { type: 'request' }`) is no frame's */
      const holder = path.parentPath.parentPath;
      if (holder && holder.isObjectProperty() && !holder.node.computed && ['payload', 'trust'].includes(holder.node.key.name || holder.node.key.value)) return;
      for (const t of wordsAt(path.node.value, path) || []) note(t, f + ':' + path.node.loc.start.line);
    },
    CallExpression(path) {
      const c = path.node.callee;
      const n = (c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed ? c.property.name : (c.type === 'Identifier' ? c.name : null);
      if (!n || !/^_[A-Za-z0-9]+Send$/.test(n) || path.node.arguments.length < 2) return;
      for (const t of wordsAt(path.node.arguments[1], path) || []) note(t, f + ':' + path.node.loc.start.line);
    },
  });
}

// ── 1. the census's floor (it was the regex's; the tree's since v2.3.6441) ──
check('extraction found a plausible type population (>=40)', extracted.size >= 40, extracted.size);

// ── 2. THE audit: every emitted type is privileged or allowlisted ──
{
  const unregistered = [...extracted.keys()]
    .filter((t) => !PRIVILEGED_EVENTS.has(t) && !RELAY_ECHO_ALLOWLIST.has(t))
    .map((t) => ({ type: t, sites: extracted.get(t) }));
  check('every server-emitted type is in PRIVILEGED_EVENTS (or the documented allowlist) — an unregistered type is CLIENT-FORGEABLE via the default rebroadcast; give it its row in server/src/wire/out.js (it is then privileged)',
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
