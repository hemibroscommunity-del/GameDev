/* ═══ v2.3.5602: THE SWITCHES THE OWNER SETS FROM THE TEST PANEL (card OPS PR 3) ═══
 *
 * The Test panel listed and cleared the live flags, and set a few by their
 * own buttons (the message diet, the expo's one-Wi-Fi limit, the memory
 * savers), but it could not set any other switch to a value: that took a
 * terminal command (`curl ... /api/admin/flags`).  The owner is new to coding
 * and is never asked to run one (CLAUDE.md §1), and two recoveries need a
 * value set: after a dashboard rollback, `newersave` off lets back in the
 * players the newer version saved (OPERATIONS, "Rolling back"; red team
 * RT-2 F4), and `max_players` holds the room to fewer seats.
 *
 * So the panel's "Set a switch" row (SetSwitchRow.jsx) takes a name and a
 * value and sends them through the same `/flags` POST its taps use.  This
 * file is what it knows, with no imports so node can test it
 * (tools/guards/owner-switches.test.mjs):
 *
 *   OWNER_SWITCHES  the switches an owner reaches for, each with what it does
 *                   ON and OFF (or with a number) in plain words; every name a
 *                   worker row of the switch table (the guard holds it);
 *   switchNameOk    the server's own rule for a name (liveops.js
 *                   FLAG_NAME_RE): lower case, digits and _, 1 to 32;
 *   parseValue      on / off / a number from what the owner typed or picked;
 *   confirmWords    the sentence the confirm shows before anything is sent.
 *
 * Any other lower-case name may be typed: the server is the judge, and the
 * row shows its refusal in words.
 */

export const OWNER_SWITCHES = Object.freeze([
  { name: 'newersave', kind: 'onoff',
    on: 'Players saved by a newer version of the server are refused at the door (the safe default).',
    off: 'Players saved by a newer version are let in. Use it right after rolling the server back (OPERATIONS, "Rolling back"); clear it once the fix is out.' },
  { name: 'max_players', kind: 'number', min: 1, max: 120,
    number: (n) => 'The world holds at most ' + n + ' player' + (n === 1 ? '' : 's') + '; anyone more waits at "the world is full". Never more than the server\'s own cap. Clear it to go back to the full cap.' },
  { name: 'ip_sockets', kind: 'number', min: 0, max: 1000,
    number: (n) => (n === 0 ? 'No limit on how many players one internet address may have in the world.'
      : 'One internet address may have at most ' + n + ' player' + (n === 1 ? '' : 's') + ' in the world (16 normally).') },
  { name: 'ip_joins_min', kind: 'number', min: 0, max: 10000,
    number: (n) => (n === 0 ? 'No limit on how often one internet address may join.'
      : 'One internet address may join at most ' + n + ' time' + (n === 1 ? '' : 's') + ' a minute (20 normally).') },
  { name: 'roomrewind', kind: 'onoff',
    on: 'The whole-room rewind can be used (it still asks twice, with the time typed back).',
    off: 'The whole-room rewind answers "off" (the safe default).' },
  /* (each later OPS switch joins this list in its own PR: `roomhealth`,
     `rf_spread`, once their rows are in the switch table) */
]);

const NAME_RE = /^[a-z0-9_]{1,32}$/;   /* liveops.js LIVEOPS.FLAG_NAME_RE */

/** The server's own rule for a switch's name. */
export function switchNameOk(name) {
  return typeof name === 'string' && NAME_RE.test(name);
}

/** The owner's switch of that name, or null. */
export function ownerSwitch(name) {
  return OWNER_SWITCHES.find((s) => s.name === name) || null;
}

/** 'on' / 'off' / a number, as typed or picked -> true / false / the number;
 *  anything else -> null (nothing is sent). */
export function parseValue(text) {
  const t = String(text == null ? '' : text).trim().toLowerCase();
  if (t === 'on' || t === 'true') return true;
  if (t === 'off' || t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Why a name and value would not be sent, in words, or '' when they would. */
export function whyNot(name, value) {
  if (!switchNameOk(name)) return 'A switch\'s name is small letters, digits and _ only (like newersave).';
  if (value === null) return 'Pick on or off, or type a number.';
  const s = ownerSwitch(name);
  if (s && s.kind === 'onoff' && typeof value !== 'boolean') return name + ' is on or off.';
  if (s && s.kind === 'number') {
    if (typeof value !== 'number' || !Number.isInteger(value)) return name + ' is a whole number.';
    if (value < s.min || value > s.max) return name + ' goes from ' + s.min + ' to ' + s.max + '.';
  }
  return '';
}

/** The confirm's sentence: what setting it does, before anything is sent. */
export function confirmWords(name, value) {
  const s = ownerSwitch(name);
  const shown = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  let what = '';
  if (s && s.kind === 'onoff') what = value ? s.on : s.off;
  else if (s && s.kind === 'number') what = s.number(value);
  else what = 'This changes the live game for everyone at once. Clearing it puts back what the server does by itself.';
  return 'Set ' + name + ' to ' + shown + '? ' + what;
}
