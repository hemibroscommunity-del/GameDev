/* ═══ v2.3.3066: THE POST OFFICE'S MAIL ═══
 *
 * The worker settles every delivery through _creditPlayer (server/src/
 * inbox.js): a sale, a refund, a trade's payout, a duel's wager coming back,
 * the daily reward -- paid at once to a player online, parked in their inbox
 * otherwise and drained at their next join.  The game heard each as an
 * `inbox_delivered` event and printed a line in chat ("📫 You received ...",
 * gameEvents.js), and the daily reward not even that.  So the mail was a
 * chat line that scrolled away, and what came while you were away arrived in
 * a burst under the loading screen.
 *
 * The Wheel's Post Office (data/wheelBuildingDoors.js WHEEL_HALL_DOORS) is
 * where it is kept now: each delivery of this visit, newest first -- the
 * ones that drained at your join included, which is "while you were away".
 * Nothing new on the wire: this only remembers what the event already says.
 * Kept in S._mail, MAIL_KEEP of them; nothing stored.
 *
 * No imports, so node can read its rules.
 */
export const MAIL_KEEP = 30;

/* an inventory key as words: 'ore_black_steel_ore' -> 'Black steel ore' */
const PREFIX = ['ore', 'fish', 'log', 'gem', 'food', 'bar', 'seed', 'item'];
const KEEP_AFTER = ['ore', 'log', 'bar'];   /* "Iron ore", not "Iron" */
export function itemWords(invKey) {
  const k = typeof invKey === 'string' && invKey ? invKey : 'item';
  let parts = k.split('_').filter(Boolean);
  if (parts.length > 1 && PREFIX.includes(parts[0])) {
    const pre = parts[0];
    parts = parts.slice(1);
    if (KEEP_AFTER.includes(pre) && parts[parts.length - 1] !== pre) parts.push(pre);
  }
  const w = parts.join(' ');
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** One delivery (an inbox_delivered entry: { kind, source, note, payload })
 *  as a line of mail: { what, note, kind, source }. */
/* v2.3.3122: a pet in the mail, in words, with no imports (see the header):
   its own name, else its kind's, and its level ("Snowball, Lv 4"). */
function petWords(pet) {
  if (!pet || typeof pet !== 'object') return 'A pet';
  const kind = typeof pet.kind === 'string' && /^[a-z]{2,16}$/.test(pet.kind) ? pet.kind.charAt(0).toUpperCase() + pet.kind.slice(1) : 'Pet';
  const name = typeof pet.name === 'string' && pet.name ? pet.name.replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 16) : '';
  return (name ? name + ' the ' + kind : 'A ' + kind) + ', Lv ' + Math.max(1, Math.floor(Number(pet.lv) || 1));
}

export function mailLine(e) {
  const p = (e && e.payload) || {};
  const kind = e && typeof e.kind === 'string' ? e.kind : 'item';
  const source = e && typeof e.source === 'string' ? e.source : '';
  let what;
  if (kind === 'gold') what = `+${Math.max(0, Math.round(Number(p.amount) || 0))} gold`;
  else if (kind === 'item') what = source === 'daily' ? 'A daily chest' : `${Math.max(1, Math.round(Number(p.count) || 1))}× ${itemWords(p.invKey)}`;
  else if (kind === 'weapon') what = (p.weapon && typeof p.weapon.name === 'string' && p.weapon.name) || 'A weapon';
  else if (kind === 'gear') what = (p.piece && typeof p.piece.name === 'string' && p.piece.name) || 'A piece of gear';
  else if (kind === 'pet') what = petWords(p.pet);   /* v2.3.3122: a pet (a sale, a trade, an unsold one back) */
  else what = 'A delivery';
  let note = e && typeof e.note === 'string' ? e.note : '';
  if (!note && source === 'daily') note = 'Daily reward';
  return { what, note: note.slice(0, 120), kind, source };
}

/** Keep delivery `e` in S._mail (oldest first, at most MAIL_KEEP). */
export function recordMail(S, e, now = Date.now()) {
  if (!S || !e) return null;
  if (!Array.isArray(S._mail)) S._mail = [];
  const m = Object.assign(mailLine(e), { ts: now });
  S._mail.push(m);
  if (S._mail.length > MAIL_KEEP) S._mail.splice(0, S._mail.length - MAIL_KEEP);
  return m;
}

/** The mail, newest first. */
export function mailList(S) {
  return S && Array.isArray(S._mail) ? S._mail.slice().reverse() : [];
}

/** "just now", "5 min ago", "2 h ago" */
export function mailAge(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}
