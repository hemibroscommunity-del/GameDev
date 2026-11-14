/* ═══ v2.3.3553: THE OLD MAP IS RETIRED -- A TEST NEVER LANDS THERE BY ACCIDENT ═══
 *
 * The owner, 2026-10-21, seeing a test's screenshot of today's town ("Town" on
 * the top bar, the old fountain, Ace and Lil Bro where they used to stand):
 * "Hold on you're in the old map (this was retired).  You keep making that
 * mistake so flag it in a way you won't accidentally do that anymore."
 *
 * The world is the Wheel's (CLAUDE.md, "The Wheel is the world", v2.3.2990):
 * players start in its BroTown, and the old lands are closed.  But the phone
 * harness was written for the old map, so a player opened with no `world` has
 * played it (`trial=off&nospawn`) ever since -- and a NEW scenario that forgot
 * `world: 'wheel'` quietly tested a map no player sees.  So:
 *
 *   world: 'wheel'  the world, exactly as a player gets it.  EVERY NEW TEST.
 *   world: 'old'    the retired map, on purpose: only a test OF it.
 *   no world        allowed only for a scenario below, written for the old map
 *                   before 2026-10-21.  Any other scenario run by run.mjs is
 *                   REFUSED: newPlayer throws, naming the fix (harness.mjs).
 *
 * And every picture a test saves from the old map is stamped "OLD MAP ·
 * RETIRED" (harness.mjs, a page.screenshot with a `path`), so it can never be
 * mistaken for the world.  tools/dev/precheck.mjs refuses, before a push, a
 * scenario file not on this list that opens a player without `world`.
 *
 * THIS LIST ONLY EVER SHRINKS.  Never add a name to it: move a scenario to the
 * world (`world: 'wheel'`) when you touch it, and take its name off.
 * server/test/old-map.test.mjs holds it to that (it can only lose names).
 */

/* the scenarios (run.mjs keys) written for the old map, frozen 2026-10-21.
   v2.3.4674: EMPTY -- the owner, 2026-11-11: "You can also delete the old
   unused code (old map etc)" and, of these tests, "Delete, keep a list".  All
   397 are deleted; what each checked is in docs/OLD-MAP-TESTS.md.  The list
   stays (empty) so the harness still refuses a scenario that names no world. */
export const OLD_MAP_LEGACY = Object.freeze(new Set([]));

/* how many it had when it was frozen: old-map.test.mjs fails if it grows */
export const OLD_MAP_LEGACY_FROZEN_AT = 419;

/** The words a refused scenario is stopped with. */
export function oldMapRefusal(scenario) {
  return 'OLD MAP REFUSED: scenario "' + scenario + '" opened a player with no `world`, which plays the RETIRED '
    + 'old map (today\'s town, "Town" on the top bar), not the world players see.  Pass world: \'wheel\' '
    + '(the game as a player gets it), or world: \'old\' only to test the retired map itself '
    + '(tools/qa/mp/oldMap.mjs).';
}

/** Every newPlayer(...) / joinPair(...) call's argument text in a file's
 *  source (the function's own definition left out). */
export function playerCalls(src) {
  const out = [];
  const re = /\b(?:newPlayer|joinPair)\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 20), m.index))) continue;
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth) { const c = src[i]; if (c === '(') depth++; else if (c === ')') depth--; i++; }
    out.push(src.slice(m.index + m[0].length, i - 1));
  }
  return out;
}

/** The calls in a file's source that name no `world`. */
export function callsWithoutWorld(src) {
  return playerCalls(src).filter((a) => !/\bworld\s*:/.test(a));
}

/* The stamp on a saved picture of the old map: drawn just before the shot and
   taken away just after, over everything, catching no touch. */
export const OLD_MAP_STAMP_ID = 'qa-old-map-stamp';
export function stampOn(id) {
  try {
    if (document.getElementById(id)) return;
    const d = document.createElement('div');
    d.id = id;
    /* two lines, sized to the page: it must read whole on a 320 px phone */
    d.innerHTML = '<div style="font:900 clamp(18px,7vw,34px)/1.05 system-ui,sans-serif;letter-spacing:.06em">OLD MAP \u00b7 RETIRED</div>'
      + '<div style="font:800 clamp(11px,3.6vw,16px)/1.25 system-ui,sans-serif;margin-top:4px">not the world players see</div>';
    d.setAttribute('style', 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-8deg);'
      + 'z-index:2147483647;pointer-events:none;box-sizing:border-box;max-width:88vw;padding:10px 14px;'
      + 'border:4px solid #fff;border-radius:10px;background:rgba(190,20,20,.88);color:#fff;text-align:center;'
      + 'box-shadow:0 0 0 4px rgba(190,20,20,.88)');
    document.body.appendChild(d);
  } catch (e) { /* a page with no body: nothing to stamp */ }
}
export function stampOff(id) {
  try { const d = document.getElementById(id); if (d) d.remove(); } catch (e) { /* gone already */ }
}

/* ═══ v2.3.5100: A SCENARIO IS A FILE (grand plan card B, PR 1) ═══
   Since v2.3.5021 run.mjs finds ./mp-<name>.mjs by its name, with no line in
   its table, so a check that read only the table never saw a new scenario:
   old-map.test.mjs passed one that named no world.  These three read what
   the checks and run.mjs read, the same way, from strings (no fs here: the
   harness passes stampOn into the page). */

/** run.mjs's table, as [name, file] pairs, from run.mjs's source. */
export function scenarioTable(runSrc) {
  return [...String(runSrc).matchAll(/^\s+([A-Za-z0-9_]+): \(\) => import\('\.\/([^']+)'\)/gm)].map((m) => [m[1], m[2]]);
}

/** A scenario exports `run`; a few mp-*.mjs are scripts of their own, never run by run.mjs. */
export function isScenarioSource(src) {
  return /^export\s+(?:async\s+)?function\s+run\b|^export\s+(?:const|let)\s+run\b/m.test(String(src));
}

/** The files a table line hides: an mp-<name>.mjs whose <name> is a table
    line that imports ANOTHER file (`landview` is ./mp-landscape-view.mjs, so
    a new mp-landview.mjs would never run by its name: `landview` runs the
    table's).  `fileNames` are the folder's file names. */
export function shadowedFiles(table, fileNames) {
  const byName = new Map(table);
  const out = [];
  for (const f of fileNames) {
    const m = /^mp-(.+)\.mjs$/.exec(f);
    if (m && byName.has(m[1]) && byName.get(m[1]) !== f) out.push(`${f} (the table's \`${m[1]}\` runs ./${byName.get(m[1])})`);
  }
  return out;
}

/** Every scenario, by its file: [name, file] for each mp-*.mjs and each file
    the table names, the table's name kept where it has one.  `read(file)`
    gives a file's source or throws; only files that export `run` are kept. */
export function scenarioFiles(table, fileNames, read) {
  const byFile = new Map();
  for (const f of [...fileNames].sort()) {
    const m = /^mp-(.+)\.mjs$/.exec(f);
    if (m) byFile.set(f, m[1]);
  }
  for (const [name, file] of table) byFile.set(file, name);
  const out = [];
  for (const [file, name] of byFile) {
    let src;
    try { src = read(file); } catch { continue; }
    if (isScenarioSource(src)) out.push([name, file, src]);
  }
  return out;
}
