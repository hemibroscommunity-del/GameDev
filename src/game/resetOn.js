/* ═══ v2.3.5203: A RESET, AT THE ONE DOOR OF ITS EDGE (grand plan step 5.3, step 2; card L PR 3) ═══
 * (spec: docs/specs/state-resets.md; held by tools/guards/state-ledger.test.mjs
 * and server/test/state-resets.test.mjs)
 *
 * WHY.  The state ledger (src/state/, card U) lists every field of `S` and
 * every top-of-file variable, each "the sitting, never reset" until someone
 * says otherwise.  A reset written by hand in each system's own place -- its
 * own zone check, its own timer -- is how the zone-local leftovers drifted
 * (zoneTransitions.js clearZoneLocalFx, the 2026-11-03 sweep's V11 G3-6: five
 * of nine ways of changing place skipped the list).  So a reset is
 * REGISTERED here, beside its state in its own system's file, and the edge's
 * ONE door runs them all:
 *
 *   resetOn(edge, fn, system)   at the top of the system's file: when `edge`
 *                               happens, fn(S, info) puts its state back
 *   runResets(edge, S, info)    the door's one call (zone: changeZone, on a
 *                               real change of place)
 *
 * THE EDGES are card D's three: `zone` (a change of place: a death's respawn
 * and a dungeon's door change it too), `death` and `rejoin`.  An edge with no
 * one door on the page runs nothing: no door calls it (the spec says which
 * door each edge has, and which have none yet).
 *
 * A RESET CLEARS STATE.  It never starts a sound, a screen or an effect (TRAPS
 * §305): what it puts back is the stale thing gone, nothing more.  A reset
 * that throws is counted and the next runs (`resetStats`); the door never
 * sees it.
 *
 * EACH SYSTEM HAS ITS SWITCH (the plan's rule 4): `?<system>reset=0` (lower
 * case, the system's name without its hyphen: `?townsfolkreset=0`) turns that
 * system's resets off, and its old behaviour, where a reset replaced one, back
 * on (`resetsOn(system)`).  Read at the edge, never cached; each by its
 * literal name in resetSwitches() below, where card T's scanner reads it.
 *
 * No imports: node tests it directly.
 */

export const RESET_EDGES = Object.freeze(['zone', 'death', 'rejoin']);

/* the registered resets, an edge's list in the order the files registered
   them; filled once, as the game's modules load (a ledger row: `kept`, it is
   the registry) */
const _byEdge = { zone: [], death: [], rejoin: [] };

/* what ran: for the Test panel and the suite (a ledger row: `kept`) */
export const resetStats = { runs: 0, ran: 0, threw: 0, off: 0, lastThrew: null, refused: 0 };

/* EACH SYSTEM'S SWITCH, BY ITS LITERAL NAME (v2.3.5203, the planning
   session's call): card T's switch table (tools/guards/lib/switches.mjs)
   rows every `?name=` the page reads, and its scanner (switchScan.mjs) sees
   a name only where it is read as a literal.  So a system that registers a
   reset adds its line here, and its row (`?<system>reset`, side page) there,
   in the same PR; state-resets.test fails a registered system with no line.
   A system with no line has no switch: its resets always run. */
function resetSwitches(search) {
  const q = new URLSearchParams(search);
  return {
    audio: q.get('audioreset') !== '0',
    townsfolk: q.get('townsfolkreset') !== '0',
    movement: q.get('movementreset') !== '0',   /* v2.3.5204 */
    social: q.get('socialreset') !== '0',       /* v2.3.5204 */
    skills: q.get('skillsreset') !== '0',       /* v2.3.5205 */
    combat: q.get('combatreset') !== '0',       /* v2.3.5206 */
    wire: q.get('wirereset') !== '0',           /* v2.3.5207 */
  };
}

/** A system's switch: false when the page says `?<system>reset=0`. */
export function resetsOn(system) {
  try {
    const search = typeof location !== 'undefined' && location && location.search;
    if (!search) return true;
    const on = resetSwitches(search);
    return Object.prototype.hasOwnProperty.call(on, system) ? on[system] : true;
  } catch (e) { return true; }
}

/** The systems that have a switch (the suite holds every registered system to one). */
export function resetSwitchSystems() {
  return Object.keys(resetSwitches(''));
}

/** Register `fn` to run at `edge`'s one door, for `system` (its switch).
 *  Called at a module's top as it loads, so a wrong call is REFUSED and
 *  counted, never thrown: a throw there would stop the page's modules
 *  loading.  The suite fails a refusal; the census reads each call (a named
 *  function, a known edge, a system's name: the ledger names all three). */
export function resetOn(edge, fn, system) {
  const ok = Object.prototype.hasOwnProperty.call(_byEdge, edge)
    && typeof fn === 'function'
    && typeof system === 'string' && /^[a-z][a-z-]*$/.test(system);
  if (!ok) { resetStats.refused++; return false; }
  const list = _byEdge[edge];
  if (!list.some((r) => r.fn === fn)) list.push({ fn, system });
  return true;
}

/** The door's one call.  Runs every reset of `edge` whose system's switch is
 *  on; returns the names that ran (for the suite). */
export function runResets(edge, S, info) {
  const list = _byEdge[edge];
  if (!list || !S) return [];
  resetStats.runs++;
  const ran = [];
  for (const r of list) {
    if (!resetsOn(r.system)) { resetStats.off++; continue; }
    /* the names are for the suite and the Test panel: a built page's
       minifier renames functions, so nothing decides by them */
    try { r.fn(S, info || null); ran.push(r.fn.name); resetStats.ran++; }
    catch (e) { resetStats.threw++; resetStats.lastThrew = r.fn.name || r.system; }
  }
  return ran;
}

/** What is registered: [{ edge, fn, system }] (the suite reads it). */
export function resetsListed() {
  const out = [];
  for (const edge of RESET_EDGES) for (const r of _byEdge[edge]) out.push({ edge, fn: r.fn.name, system: r.system });
  return out;
}
