/* ═══ v2.3.3888: THE ADDRESS'S SWITCHES KEPT THROUGH THE DOOR ═══
 *
 * The game's own reloads (Continue's resume, a pick from the character list,
 * Create new, typing a key, logging out) kept only `?guest=1`, so a switch
 * the owner typed (?lookpalette=0, ?headframes, ?onebatch=0, ...) was gone
 * the moment a character was picked -- and with it the diagnosis it was
 * typed for.  keptQuery() is the page's query MINUS the door's own words,
 * which each reload sets (or must not carry) itself:
 *   create   -- "make a new character" (BroTown deletes it once read)
 *   login    -- "show the door" (logging out)
 *   noresume -- "do not walk back in" (logging out)
 *   play     -- the door's own step
 * Everything else rides along, `guest` (which browser identity this tab is)
 * among it, as before.  An audit of every address read in src (the PR's
 * list) found no other word that acts once or destroys anything.
 * No imports: node can test it (server/test/keep-switches.test.mjs). */
export const DOOR_WORDS = Object.freeze(['create', 'login', 'noresume', 'play']);

/** '?a=1&b' (or '') -- `search` the page's (window.location.search by
    default), `add` [[name, value], ...] set first (the door's own word). */
export function keptQuery(search, add) {
  let s = search;
  if (s === undefined) { try { s = typeof window !== 'undefined' ? window.location.search : ''; } catch (e) { s = ''; } }
  let q;
  try { q = new URLSearchParams(s || ''); } catch (e) { q = new URLSearchParams(''); }
  for (const w of DOOR_WORDS) q.delete(w);
  const out = new URLSearchParams();
  for (const [k, v] of (add || [])) out.set(k, v);
  for (const [k, v] of q) if (!out.has(k)) out.append(k, v);
  /* a bare switch (?headframes) stays bare: URLSearchParams writes it "x=" */
  const str = out.toString().replace(/=(?=&|$)/g, '');
  return str ? '?' + str : '';
}
