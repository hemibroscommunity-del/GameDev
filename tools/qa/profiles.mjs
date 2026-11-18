/* ═══ v2.3.5860: TWO SLOW PROFILES, MADE ONLY OF KNOBS THAT EXIST (card O2 PR 1; the grand plan's 1.5) ═══
 *
 * The judges play on computers, and the owner on an iPhone; this box draws on
 * a quick processor and serves dist/ from its own disk in a millisecond, so
 * no test meets a slow machine unless asked.  A PROFILE is a name for one
 * slow machine, written only in the test knobs that already exist (no new
 * game switch):
 *   - `cpu`:  BT_QA_CPU_THROTTLE, Chromium's own processor throttle on every
 *             page the harness opens (harness.mjs, v2.3.3321);
 *   - `line`: BT_QA_SLOW, the harness's thin line: every file under the
 *             prefix comes down ONE shared line of that many KB a second,
 *             each after that many ms of silence (harness.mjs, v2.3.4400);
 *   - `lane`: the lane every page plays (`?lane=`, tools/qa/lane.mjs;
 *             src/game/drawLanes.js), in place of the scenario's own.
 *
 * `BT_QA_PROFILE=<name>` sets all three: the harness calls applyProfile()
 * when it loads, before it reads any of them.  An unknown name fails loudly
 * (the run stops, naming the table); so does a knob also set by hand to
 * another value (a run is one profile, or knobs by hand, never a silent mix).
 *
 * The numbers (2026-11-17, chosen, not measured on the machines):
 *   - budget-android: Lighthouse's own "mobile" stand-in is a 4x slowed
 *     processor; a phone's mobile data at its slow end ~250 KB/s, ~150 ms
 *     to the first byte.  The whole site comes down it (`/`): a first visit.
 *   - hotel-laptop: an old laptop at half speed, on a hotel's shared line
 *     (~120 KB/s, ~300 ms), the way the expo's judges met the game
 *     (desksmooth's thin line was /world/ground/:150:300).
 *   Both play the `light` lane: the grand plan's 1.5 ("the `light` lane's
 *   sweeps run under them").
 *
 * No imports: the harness, run.mjs and tools/guards/qa-profiles.test.mjs
 * read it.
 */

export const PROFILES = Object.freeze({
  'budget-android': Object.freeze({
    say: 'A budget Android phone on mobile data: the processor 4x slowed, the whole site down a 250 KB/s line, the light lane',
    cpu: 4,
    line: '/:250:150',
    lane: 'light',
  }),
  'hotel-laptop': Object.freeze({
    say: 'An old laptop on a hotel\'s shared line: the processor 2x slowed, the whole site down a 120 KB/s line, the light lane',
    cpu: 2,
    line: '/:120:300',
    lane: 'light',
  }),
});
export const PROFILE_NAMES = Object.freeze(Object.keys(PROFILES));

/* the knobs a profile sets, and the environment variable each is */
export const PROFILE_KNOBS = Object.freeze({ cpu: 'BT_QA_CPU_THROTTLE', line: 'BT_QA_SLOW' });

/* the thin line's form, exactly as harness.mjs's _slowOf reads it */
export const LINE_FORM = /^(\/[^:]*):(\d+)(?::(\d+))?$/;

/** The profile named, or null for none ('' / undefined).  An unknown name
 *  THROWS, naming the table. */
export function profileOf(name) {
  if (name === undefined || name === null || name === '') return null;
  const p = Object.prototype.hasOwnProperty.call(PROFILES, name) ? PROFILES[name] : null;
  if (!p) throw new Error(`BT_QA_PROFILE='${name}' is not a profile (tools/qa/profiles.mjs: ${PROFILE_NAMES.join(', ')})`);
  return p;
}

/** Read BT_QA_PROFILE from `env` and write its knobs into it (the CPU
 *  throttle and the thin line), returning { name, ...profile } or null.
 *  Throws for an unknown name, or for a knob already set to another value. */
export function applyProfile(env = process.env) {
  const name = env.BT_QA_PROFILE;
  const p = profileOf(name);
  if (!p) return null;
  const clash = [];
  for (const [k, v] of Object.entries(PROFILE_KNOBS)) {
    const want = String(p[k]);
    if (env[v] !== undefined && env[v] !== '' && String(env[v]) !== want) clash.push(`${v}=${env[v]} (the profile's is ${want})`);
  }
  if (clash.length) throw new Error(`BT_QA_PROFILE='${name}' sets its own knobs; also set by hand: ${clash.join('; ')}. Use the profile, or the knobs by hand`);
  for (const [k, v] of Object.entries(PROFILE_KNOBS)) env[v] = String(p[k]);
  return Object.freeze({ name, ...p });
}
