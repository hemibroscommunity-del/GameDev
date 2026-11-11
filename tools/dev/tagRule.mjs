/* v2.3.4790: the version-tag rule -- a tag only has to be NEW, not higher.
 *
 * The owner, 2026-11-11 (asked "a number only has to be unused on main, not
 * higher than main's?"): yes.  Until v2.3.4790 precheck refused any change
 * whose tag was not ABOVE main's high-water.  With several sessions merging
 * the same afternoon, every merge pushed the high-water past every open
 * lane, so each lane renumbered and pushed again ("renumbered above main
 * again", three times for one lane on 2026-11-10: STATE-MACHINES.md "How
 * the lanes were run" 6) -- and every push is a paid check run since the
 * repo went private (CLAUDE.md §4).  What a tag is FOR is to find a change
 * by grep (rule 25: `v2.3.N: why` in the code); that needs the number to be
 * unique, not ordered.  So:
 *
 *   - a tag is USED when it appears anywhere in main's tree or in any
 *     commit subject on main (a range of two tags uses both ends and
 *     everything between: TRAPS §16, a squash range once hid its tags);
 *   - the tags a change ADDS that are not used are its CLAIM; the ones that
 *     are used are back-references (rule-25 comments cite old tags all the
 *     time) and are fine;
 *   - a change that adds tags but claims none fails: either it only cites
 *     old work (claim a new number for this change) or its number was taken
 *     on main by someone else first (a real collision: renumber).
 *
 * Zero dependencies (precheck and the session brief run in the sandbox).
 * Pure functions here; the git reads stay in their callers.  `selfTest()`
 * is run by precheck itself every time (a few microseconds), so a broken
 * rule fails the gate instead of waving everything through.
 */

const RANGE_MAX = 200; // a range wider than this is prose ("<tag 1>-4000"), not a claim

/** Every tag in `text`, ranges expanded ("<tag A>-B", "<tag A>–B" with an en
 *  dash, "<tag A> - <tag B>").  Returns a Set of numbers.  (The examples here
 *  and in selfTest are built from a prefix so this file claims no tag but its
 *  own: precheck reads added lines.) */
export function tagsIn(text, into = new Set()) {
  const s = String(text || '');
  for (const m of s.matchAll(/v2\.3\.(\d+)(?:\s*[-–—]\s*(?:v2\.3\.)?(\d+))?/g)) {
    const a = +m[1];
    into.add(a);
    if (m[2] != null) {
      const b = +m[2];
      if (b > a && b - a <= RANGE_MAX) for (let n = a + 1; n <= b; n++) into.add(n);
    }
  }
  return into;
}

/** Judge a diff's added tags against the set of tags used on main.
 *  added: [{ n, file, line }]; used: Set<number>.
 *  Returns { verdict: 'none'|'pass'|'fail', claims, backRefs, high } */
export function judgeClaim(added, used) {
  let high = 0;
  for (const n of used) if (n > high) high = n;
  if (!added.length) return { verdict: 'none', claims: [], backRefs: [], high };
  const seen = new Set();
  const claims = [];
  const backRefs = [];
  for (const t of added) {
    if (used.has(t.n)) { backRefs.push(t); continue; }
    if (seen.has(t.n)) continue;
    seen.add(t.n);
    claims.push(t);
  }
  return { verdict: claims.length ? 'pass' : 'fail', claims, backRefs, high };
}

/** The number a new session should take: one above everything used on main
 *  AND everything an in-flight branch already carries, so two sessions
 *  starting the same hour do not pick the same one. */
export function suggestTag(usedOnMain, inFlight = new Set()) {
  let high = 0;
  for (const n of usedOnMain) if (n > high) high = n;
  for (const n of inFlight) if (n > high) high = n;
  return high + 1;
}

/** Throws on a broken rule.  Run by precheck on every call. */
export function selfTest() {
  const eq = (a, b, what) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`tagRule self-test: ${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
  };
  const sorted = (set) => [...set].sort((x, y) => x - y);
  const V = ['v2', '3', ''].join('.'); // the tag prefix, spelled so precheck does not read it
  eq(sorted(tagsIn(`${V}4606-4607: a and ${V}10`)), [10, 4606, 4607], 'a short range');
  eq(sorted(tagsIn(`${V}1576–1579`)), [1576, 1577, 1578, 1579], 'an en-dash range');
  eq(sorted(tagsIn(`${V}5 - ${V}7`)), [5, 6, 7], 'a range with both prefixes');
  eq(sorted(tagsIn(`${V}1-4000`)), [1], 'a prose range is not expanded');
  eq(sorted(tagsIn(`${V}9-3`)), [9], 'a backwards range is one tag');
  const used = new Set([100, 101, 200]);
  // below main's high-water but unused: passes (the whole point)
  eq(judgeClaim([{ n: 150 }], used).verdict, 'pass', 'an unused tag below the high-water');
  // used on main: a collision, fails
  eq(judgeClaim([{ n: 101 }], used).verdict, 'fail', 'a tag already on main');
  // a claim plus back-references: passes, the back-references listed
  const j = judgeClaim([{ n: 100 }, { n: 300 }, { n: 300 }], used);
  eq([j.verdict, j.claims.map((t) => t.n), j.backRefs.map((t) => t.n)], ['pass', [300], [100]], 'a claim with a back-reference');
  eq(judgeClaim([], used).verdict, 'none', 'no tags added');
  eq(suggestTag(used, new Set([250])), 251, 'the suggestion clears in-flight branches');
  return true;
}
