/* ═══ v2.3.3723: THE HIDDEN SETTINGS (spec: docs/specs/hidden-settings.md;
 * the plan: docs/HIDDEN-SERVER-PLAN.md) ═══
 *
 * The owner, 2026-10-28: "Just hiding what you can in the server code (like
 * anti bot, tuning, maybe other things that would be valuable to a copier)
 * seems like the only necessary step."  The repository is public, so every
 * number in it is a copier's (and a bot maker's) for the reading.  A number
 * only the server ever uses can live somewhere else: here.
 *
 * One stored record, `hidden_settings` (ARCHITECTURE-HANDOFF rule 2), holds
 * the owner's private values.  The code keeps a PUBLIC PLACEHOLDER for every
 * one (today's value: it is in the public history already), and the record is
 * merged over the placeholders when the room starts.  An empty record changes
 * nothing, so a deploy of this changes nothing either.
 *
 *   - Validated on the way in, both ways: a name this worker does not know, a
 *     value that is not a finite number, one outside its range or a fraction
 *     where a whole number belongs is DROPPED on read (its placeholder holds)
 *     and REFUSED (400) on write.  A record from a newer worker (`v` above
 *     HIDDEN.V) is read as empty and never written over.
 *   - Edited from the Test panel behind the admin key (devtools.js
 *     /dev/hidden, so admin.js's auth, its fail-closed 404 and its audit log
 *     are inherited).  A change is live at once: the merged table is rebuilt
 *     in the same run as the write.  No redeploy.
 *   - NEVER SENT TO A PHONE.  Not through the caps (the `liveflags` map IS
 *     spread over every phone's caps, which is exactly why this is its own
 *     record and not a flag), not in a refusal's words, not anywhere.
 *     hidden-settings.test §4 plays a room with every value set to a marker
 *     and reads every message every phone got.
 *   - `hidden_off` in the live flags (a lower-case kill switch, liveops.test
 *     §8) puts every value back to its placeholder at once, without touching
 *     the record: clear the flag and the private values are back.
 *
 * A range is a SAFETY RAIL, not a secret: it is what keeps a typo on a phone
 * from flagging every player or withholding an honest player's wood.  The two
 * hour caps' floors are the honest bound itself (gathering.js
 * HONEST_CYCLE_MIN_MS: 2,384 an hour), the property node-respawn §3c holds
 * the placeholder to: a cap below it would fire on a real player.
 *
 * Hot paths read `this._hid()` (synchronous: one flag read and an object);
 * a caller that may run on a bare object (a test's stub) reads hiddenOf(this).
 */
import { BOTFP } from './botfp.js';
import { HONEST_CYCLE_MIN_MS } from './gathering.js';

export const HIDDEN = {
  KEY: 'hidden_settings',
  V: 1,
  OFF_FLAG: 'hidden_off',
};

/* the honest bound an hour cap may never go under (see the header) */
const HONEST_PER_HOUR = Math.ceil(3600000 / HONEST_CYCLE_MIN_MS);
const HOUR = 3600000, DAY = 86400000;

/* name -> {dflt, lo, hi, int, words}.  `dflt` is the PUBLIC placeholder and
   comes from the table that has always held it, so the code reading the
   placeholder and this list can never disagree.  `words` is what the Test
   panel shows the owner. */
function row(group, dflt, lo, hi, int, words) {
  return Object.freeze({ group, dflt, lo, hi, int: !!int, words });
}
export const HIDDEN_SPEC = Object.freeze({
  // ── anti-bot: the per-harvest floors (botfp.js) ──
  ENT_FLOOR: row('botfp', BOTFP.ENT_FLOOR, 0, 0.5, false, 'Harvest gesture: least path entropy (also caps a forged perfect)'),
  TV_FLOOR: row('botfp', BOTFP.TV_FLOOR, 0, 50, false, 'Harvest gesture: least timing variance'),
  VC_FLOOR: row('botfp', BOTFP.VC_FLOOR, 0, 1, false, 'Harvest gesture: least speed change'),
  SYNTH_MIN_FLOORS: row('botfp', BOTFP.SYNTH_MIN_FLOORS, 1, 3, true, 'Floors that must trip at once to call a gesture scripted'),
  // ── anti-bot: the checks over many harvests ──
  EVAL_EVERY: row('botfp', BOTFP.EVAL_EVERY, 1, 500, true, 'Run the many-harvest checks every this many harvests'),
  COLLAPSE_MIN_N: row('botfp', BOTFP.COLLAPSE_MIN_N, 8, BOTFP.RING, true, 'Harvests needed before "every gesture the same" is judged'),
  ENT_VAR_FLOOR: row('botfp', BOTFP.ENT_VAR_FLOOR, 0, 0.05, false, '"Every gesture the same": entropy spread under this'),
  VC_VAR_FLOOR: row('botfp', BOTFP.VC_VAR_FLOOR, 0, 0.05, false, '"Every gesture the same": speed-change spread under this'),
  INTERVAL_MAX_MS: row('botfp', BOTFP.INTERVAL_MAX_MS, 1000, 600000, true, 'Gaps between harvests longer than this (ms) are walks, not rhythm'),
  INTERVAL_MIN_N: row('botfp', BOTFP.INTERVAL_MIN_N, 4, BOTFP.INTERVALS, true, 'Gaps needed before the harvest rhythm is judged'),
  INTERVAL_CV_FLOOR: row('botfp', BOTFP.INTERVAL_CV_FLOOR, 0, 1, false, 'Harvest rhythm too even: spread over mean under this'),
  // ── anti-bot: the score ──
  SCORE_SYNTH: row('botfp', BOTFP.SCORE_SYNTH, 0, 100, false, 'Score: a scripted-looking gesture'),
  SCORE_REPLAY: row('botfp', BOTFP.SCORE_REPLAY, 0, 100, false, 'Score: a gesture replayed exactly'),
  SCORE_COLLAPSE: row('botfp', BOTFP.SCORE_COLLAPSE, 0, 100, false, 'Score: every gesture the same'),
  SCORE_INTERVAL: row('botfp', BOTFP.SCORE_INTERVAL, 0, 100, false, 'Score: harvest rhythm too even'),
  SCORE_HALF_LIFE_MS: row('botfp', BOTFP.SCORE_HALF_LIFE_MS, 60000, DAY, true, 'The score halves every this many ms'),
  // ── anti-bot: the flag ──
  FLAG_AT: row('botfp', BOTFP.FLAG_AT, 1, 1000, false, 'The score that flags a player'),
  FLAG_MIN_GAP_MS: row('botfp', BOTFP.FLAG_MIN_GAP_MS, 60000, 7 * DAY, true, 'At most one flag a player every this many ms'),
  STARTLESS_FLAG_AT: row('botfp', BOTFP.STARTLESS_FLAG_AT, 1, 100000, true, 'Harvests sent without a start before a flag'),
  // ── anti-bot: the fleet (one device, many accounts) ──
  FLEET_MIN_IDS: row('botfp', BOTFP.FLEET_MIN_IDS, 2, 16, true, 'Fleet: accounts on one device'),
  FLEET_ACTIVE_MIN: row('botfp', BOTFP.FLEET_ACTIVE_MIN, 1, 16, true, 'Fleet: of which this many harvested heavily this hour'),
  FLEET_ACTIVE_STRIKES: row('botfp', BOTFP.FLEET_ACTIVE_STRIKES, 1, 100000, true, 'Fleet: harvests in the hour that count as heavy'),
  // ── the economic hour caps: floors are the honest bound (header) ──
  HARVEST_HOUR_CAP: row('caps', BOTFP.HARVEST_HOUR_CAP, HONEST_PER_HOUR, 100000, true, 'Harvests a skill an hour before grants are withheld'),
  COOK_HOUR_CAP: row('caps', BOTFP.COOK_HOUR_CAP, HONEST_PER_HOUR, 100000, true, 'Cooks an hour before grants are withheld'),
});

/* every placeholder, frozen: what the room reads with no record, a broken
   one or the kill switch thrown */
export const HIDDEN_PLACEHOLDERS = Object.freeze(Object.fromEntries(
  Object.entries(HIDDEN_SPEC).map(([k, s]) => [k, s.dflt])));

/* why a value cannot be stored, or null when it can */
export function hiddenRefusal(name, value) {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(HIDDEN_SPEC, name)) return 'unknown setting';
  const s = HIDDEN_SPEC[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'not a number';
  if (s.int && !Number.isInteger(value)) return 'must be a whole number';
  if (value < s.lo || value > s.hi) return 'must be from ' + s.lo + ' to ' + s.hi;
  return null;
}

/* the stored record's values that hold, every other one dropped.  A record
   from a newer worker reads as empty (its shape is not ours to judge). */
export function cleanHidden(rec) {
  const out = Object.create(null);
  if (!rec || typeof rec !== 'object' || typeof rec.s !== 'object' || !rec.s) return out;
  if (typeof rec.v === 'number' && rec.v > HIDDEN.V) return out;
  for (const name of Object.keys(rec.s)) {
    if (hiddenRefusal(name, rec.s[name]) === null) out[name] = rec.s[name];
  }
  return out;
}

/* the table a room reads: placeholders, the clean stored values over them */
export function mergeHidden(clean) {
  const out = { ...HIDDEN_PLACEHOLDERS };
  if (clean) for (const k of Object.keys(clean)) if (k in out) out[k] = clean[k];
  return Object.freeze(out);
}

/* for code that may run on something other than a GameRoom (a test's stub) */
export function hiddenOf(room) {
  return room && typeof room._hid === 'function' ? room._hid() : HIDDEN_PLACEHOLDERS;
}

export const hiddenMethods = {
  /* Read once a worker's life, before the first socket (index.js fetch) and
     before any admin read.  A failed read keeps the placeholders and is tried
     again next time: never fatal, never written over. */
  async _hiddenEnsure() {
    if (this._hiddenLoaded) return this._hiddenTable;
    let rec = null;
    try { rec = await this.state.storage.get(HIDDEN.KEY); } catch (e) { return this._hid(); }
    this._hiddenRec = rec || null;
    this._hiddenClean = cleanHidden(rec);
    this._hiddenTable = mergeHidden(this._hiddenClean);
    this._hiddenLoaded = true;
    return this._hiddenTable;
  },

  /* Synchronous: the merged table, or the placeholders before the first read
     or with `hidden_off` thrown. */
  _hid() {
    if (typeof this._flagOn === 'function' && this._flagOn(HIDDEN.OFF_FLAG)) return HIDDEN_PLACEHOLDERS;
    return this._hiddenTable || HIDDEN_PLACEHOLDERS;
  },

  /* what the Test panel shows: every setting, its words, range, placeholder,
     the stored value (or null) and the value in force */
  _hiddenView() {
    const live = this._hid();
    const stored = this._hiddenClean || Object.create(null);
    const settings = Object.entries(HIDDEN_SPEC).map(([name, s]) => ({
      name, group: s.group, words: s.words, lo: s.lo, hi: s.hi, int: s.int,
      placeholder: s.dflt,
      stored: name in stored ? stored[name] : null,
      value: live[name],
    }));
    const newer = !!(this._hiddenRec && typeof this._hiddenRec.v === 'number' && this._hiddenRec.v > HIDDEN.V);
    return { ok: true, off: this._flagOn ? this._flagOn(HIDDEN.OFF_FLAG) : false, newer, settings };
  },

  /* The admin route (devtools.js /dev/hidden, behind the admin key):
       GET                     -> the view
       POST {name, value}      -> store one (value null: back to the placeholder)
       DELETE ?name=<n>        -> the same as value null; no name: clear all
     Every write is the whole record, one put, and the table rebuilt in the
     same run, so the next harvest reads it. */
  async _hiddenAdmin(request, url, json) {
    await this._hiddenEnsure();
    if (!this._hiddenLoaded) return json({ ok: false, error: 'the settings could not be read; try again' }, 503);
    if (request.method === 'GET') return json(this._hiddenView());
    if (this._hiddenRec && typeof this._hiddenRec.v === 'number' && this._hiddenRec.v > HIDDEN.V) {
      return json({ ok: false, error: 'stored by a newer worker; not written over' }, 409);
    }
    const next = Object.create(null);
    for (const k of Object.keys(this._hiddenClean || {})) next[k] = this._hiddenClean[k];
    let op = null;
    if (request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const name = body && body.name;
      const value = body ? body.value : undefined;
      if (value === null) {
        if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(HIDDEN_SPEC, name)) return json({ ok: false, error: 'unknown setting' }, 400);
        delete next[name];
        op = { op: 'hidden_clear', name };
      } else {
        const why = hiddenRefusal(name, value);
        if (why) return json({ ok: false, error: String(name) + ': ' + why }, 400);
        next[name] = value;
        /* the audit log names the setting, never the value: the log is
           admin-only, but a private value has no reason to be in two places */
        op = { op: 'hidden_set', name };
      }
    } else if (request.method === 'DELETE') {
      const name = url.searchParams.get('name');
      if (name) {
        if (!Object.prototype.hasOwnProperty.call(HIDDEN_SPEC, name)) return json({ ok: false, error: 'unknown setting' }, 400);
        delete next[name];
        op = { op: 'hidden_clear', name };
      } else {
        for (const k of Object.keys(next)) delete next[k];
        op = { op: 'hidden_clear_all' };
      }
    } else {
      return json({ ok: false, error: 'GET, POST or DELETE' }, 405);
    }
    const rec = { v: HIDDEN.V, s: { ...next }, at: Date.now() };
    await this.state.storage.put(HIDDEN.KEY, rec);
    this._hiddenRec = rec;
    this._hiddenClean = cleanHidden(rec);
    this._hiddenTable = mergeHidden(this._hiddenClean);
    if (typeof this._adminLog === 'function') await this._adminLog(op);
    return json(this._hiddenView());
  },
};
