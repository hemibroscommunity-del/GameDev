/* ═══ v2.3.5605: THE OWNER SILENCES FROM THE TEST PANEL (card OPS PR 6) ═══
 *
 * Card MOD's #1897 puts the owner's silence on the room, behind the admin key
 * (server/src/silence.js; docs/specs/silence.md):
 *   GET    /api/admin/silence           every silence still running
 *   POST   /api/admin/silence           {playerId, minutes, note}: minutes 0
 *                                       is until lifted
 *   DELETE /api/admin/silence?id=       lift it
 * A silenced character's words reach nobody; they still play.  The Test
 * panel's chat reports get the buttons (SilenceButtons.jsx); this is what
 * they offer and say, with no imports so node can test it
 * (tools/guards/silence-owner.test.mjs).
 */

export const SILENCE_PATH = '/api/admin/silence';

/** The buttons, in order: what each sends, its label, and its words. */
export const SILENCE_CHOICES = Object.freeze([
  Object.freeze({ key: '1m', minutes: 1, label: '1 min', words: 'for a minute' }),
  Object.freeze({ key: '1h', minutes: 60, label: '1 h', words: 'for an hour' }),
  Object.freeze({ key: '1d', minutes: 1440, label: '1 day', words: 'for a day' }),
  Object.freeze({ key: 'lift', minutes: 0, label: 'Until lifted', words: 'until you lift it' }),
]);

const two = (n) => (n < 10 ? '0' : '') + n;

/** When a silence ends, in words: "until you lift it", "until 14:32 UTC",
 *  or with the day when it is not today's ("until Nov 16, 14:32 UTC"). */
export function untilWords(until, now) {
  const u = Number(until);
  if (!u) return 'until you lift it';
  const d = new Date(u);
  const n = new Date(typeof now === 'number' ? now : Date.now());
  const time = two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ' UTC';
  const sameDay = d.getUTCFullYear() === n.getUTCFullYear() && d.getUTCMonth() === n.getUTCMonth() && d.getUTCDate() === n.getUTCDate();
  if (sameDay) return 'until ' + time;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return 'until ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + time;
}

/** The two taps' first: what the second will do. */
export function askWords(name, choice) {
  return 'Silence ' + name + ' ' + choice.words + '? Their chat reaches nobody; they still play. Tap again to do it.';
}

/** The reply to a silence, in words. */
export function silencedWords(name, reply, now) {
  const on = reply && reply.online ? ' They are online and are told once a minute.' : '';
  return 'Silenced ' + name + ' ' + untilWords(reply && reply.until, now) + '.' + on;
}

/** The reply to a lift, in words. */
export function liftedWords(name, reply) {
  return reply && reply.was === false ? name + ' was not silenced.' : 'Lifted ' + name + '\'s silence: they can chat again.';
}

/** The running silences (GET's reply) as a map: playerId -> until.
 *  v2.3.5605 (mended for sitting 19b): GET's `on` read -- with the switch
 *  thrown (`silence: false`) no silence holds, so none is shown as running
 *  (the row offers its four buttons, which the route then refuses). */
export function silenceMap(reply) {
  const out = Object.create(null);
  if (reply && reply.on === false) return out;
  const list = reply && Array.isArray(reply.silenced) ? reply.silenced : [];
  for (const s of list) if (s && typeof s.playerId === 'string') out[s.playerId] = Number(s.until) || 0;
  return out;
}
