import { passphraseToId } from './index.js';

/* ═══ v2.3.1923: THE DEVICE'S CHARACTER ROSTER ═══
 *
 * Owner: "instead of [one key] it makes sense to just present you with a list
 * of characters you've made (in order of most recent at the top) to choose
 * from to continue playing.  It should also give you an option to delete the
 * character with an are you sure pop up.  Up to 10 characters per device.
 * Otherwise it won't let you create new ones."
 *
 * THE ONE IDEA THAT MAKES THIS SMALL: a character IS its Login Key.  The
 * server has always keyed everything — auth:, char:, rpg: — off the id
 * derived from the passphrase (server/src/account.js), and nothing on the
 * server has ever cared how many of those one device holds.  So "ten
 * characters per device" needs no new server concept at all: it is a LIST of
 * passphrases in localStorage, and the game boots into whichever one
 * `bt_passphrase` currently names.  This module owns that list.
 *
 * WHAT DELETE MEANS HERE, stated plainly because the word promises more than
 * this does: forgetChar removes the key from THIS DEVICE and frees a slot.
 * It is not a server wipe — the character's record is untouched and its
 * Login Key still reaches it from anywhere.  That is deliberate: a real wipe
 * is irreversible, needs a live socket to authenticate (character_reset,
 * v2.3.1347), and is not what the cap is for.  The confirm dialog says so in
 * the player's words rather than implying a destruction that did not happen.
 *
 * THIS ALSO FIXES A QUIET DATA LOSS.  Before the roster, the device held one
 * key and exactly one spare: switching keys stashed the old one in
 * `bt_passphrase_prev` (v2.3.1143) and creating a replacement character did
 * the same (v2.3.1861), whose own comment admits the player is then "one
 * devtools read from recovering it".  A second switch overwrote the spare and
 * the first character was gone for anyone who had not written its key down.
 * The migration below lifts both of those into the roster on first read, so
 * the character that road used to lose comes back as a row in a list.
 */

/* The owner's number.  It gates CREATION, not storage — see _write. */
export const ROSTER_MAX = 10;

const KEY = 'bt_chars';

/* Per-character localStorage.  Cleared whenever the active key changes, for
   the reason v2.3.1861 gives: carrying these into another character is how
   someone else's progress shows up wearing your name.  One list, used by both
   activate and forget, because two copies drift. */
export const CHAR_CACHE_KEYS = [
  'bt_rpg', 'bt_stats', 'bt_codex', 'bt_bestiary',
  'bt_materials', 'bt_zones', 'bt_resume',
];

/* A bug that appends in a loop must not be able to fill localStorage.  Well
   above ROSTER_MAX (which the UI enforces) so this is never reached in normal
   use — if it ever is, the OLDEST rows go, never the one being written. */
const HARD_BOUND = 50;

function _ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

function _entry(phrase, at, extra) {
  const e = { phrase: phrase, id: passphraseToId(phrase), at: at || 0, name: '', level: 0 };
  if (extra) {
    if (typeof extra.name === 'string' && extra.name) e.name = extra.name;
    if (extra.level > 0) e.level = extra.level | 0;
  }
  return e;
}

function _sorted(list) {
  /* "most recent at the top" (owner).  Stable on ties so a roster where
     nothing has been played yet keeps the order it was written in. */
  return list.map(function (e, i) { return { e: e, i: i }; })
    .sort(function (a, b) { return (b.e.at || 0) - (a.e.at || 0) || a.i - b.i; })
    .map(function (x) { return x.e; });
}

function _write(list) {
  const trimmed = list.length > HARD_BOUND ? _sorted(list).slice(0, HARD_BOUND) : list;
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, list: trimmed })); } catch (e) {}
  return trimmed;
}

/* The stored shape is an OBJECT, not a bare array, and that is load-bearing:
   its presence is the "already migrated" flag.  With a bare array, a player
   who deleted every character would have an empty list, and the migration
   below would helpfully hand them back the key they had just deleted on the
   very next read. */
function _raw() {
  const s = _ls(KEY);
  if (!s) return null;
  try {
    const o = JSON.parse(s);
    if (!o || !Array.isArray(o.list)) return null;
    return o.list.filter(function (e) { return e && typeof e.phrase === 'string' && e.phrase; });
  } catch (e) { return null; }
}

function _json(k) { try { return JSON.parse(_ls(k)); } catch (e) { return null; } }

export function readRoster() {
  const stored = _raw();
  if (stored) return _sorted(stored);
  /* ═══ FIRST READ ON A DEVICE THAT PREDATES THE ROSTER ═══
     Seed from the two keys the old model could be holding — but a key is not
     a character, and the difference matters here more than anywhere else.

     `bt_passphrase` is minted SILENTLY on first boot, before any screen is
     shown (the myId initialiser in BroTown.jsx), so every brand-new device
     already has one.  Seeding it unconditionally would open the picker on a
     phone that has never played with one "Unnamed character" in the list —
     a character that does not exist anywhere, offered as something to
     continue.  So the current key is seeded only against EVIDENCE it has
     been played: `bt_player`, which is written on every PLAY and carries the
     name, so the row arrives already labelled and needs no lookup.

     The stashed spare has no local evidence either way — nothing about the
     character it belongs to survived the switch that stashed it. It is
     seeded PROVISIONALLY: the picker resolves it against the worker once,
     keeps it if there is a character behind it, and drops it if there is
     not.  That is the only way a key whose owner is unknown can be offered
     honestly.

     Anything this misses self-heals: the boot check asks the worker whether
     the active key has a character on every load, and remembers it when the
     answer is yes. */
  const seeded = [];
  const cur = _ls('bt_passphrase');
  const prev = _ls('bt_passphrase_prev');
  const player = _json('bt_player');
  const rpg = _json('bt_rpg');
  if (cur && player && typeof player.name === 'string' && player.name.trim()) {
    seeded.push(_entry(cur, Date.now(), { name: player.name.trim(), level: (rpg && rpg.level) || 0 }));
  }
  if (prev && prev !== cur) {
    const e = _entry(prev, 1);
    e.provisional = true;
    seeded.push(e);
  }
  _write(seeded);
  return _sorted(seeded);
}

export function rosterCount() { return readRoster().length; }
export function rosterFull() { return rosterCount() >= ROSTER_MAX; }

export function activePhrase() { return _ls('bt_passphrase'); }

/* Is this key one of the device's characters?  The create road asks it: a key
   that is already somebody must not be reused for a new character, because
   the worker locks `char:<id>` on first join and would hand the OLD character
   back wearing the new one's ceremony (the charLock bug, v2.3.1861). */
export function inRoster(phrase) {
  if (!phrase) return false;
  return readRoster().some(function (e) { return e.phrase === phrase; });
}
export function isActive(phrase) { return !!phrase && _ls('bt_passphrase') === phrase; }

/* Upsert.  Called wherever the game learns something true about the key it is
   currently playing — the name and level come from the live character, not
   from a lookup, which is why a roster built by PLAYING never needs the
   network to render itself. */
export function rememberChar(phrase, info) {
  if (!phrase) return readRoster();
  const list = readRoster().slice();
  const i = list.findIndex(function (e) { return e.phrase === phrase; });
  if (i >= 0) {
    const e = list[i];
    e.at = Date.now();
    if (info && typeof info.name === 'string' && info.name) e.name = info.name;
    if (info && info.level > 0) e.level = info.level | 0;
    e.id = passphraseToId(phrase);
    delete e.provisional;
  } else {
    list.push(_entry(phrase, Date.now(), info));
  }
  return _sorted(_write(list));
}

/* ═══ KNOWING WHO A KEY IS, WITHOUT CLAIMING TO HAVE PLAYED IT ═══
   The boot check asks the worker, on every load, whether the key this device
   holds has a character.  That answer belongs in the roster — it is how a key
   the migration could not vouch for locally gets its row at all — but it is
   NOT a play, and the difference is visible: `at` is what "most recent at the
   top" sorts on (owner), so bumping it here would float whichever character
   the device happens to be pointed at to the top of the list every time
   anyone walked past the door.  Measured in mp-roster: a character seeded a
   minute old outranked one seeded a second old, purely by being the active
   key on a screen nobody had played from.

   So this upserts the FACTS and leaves the clock alone.  A row it has to
   create starts at `at: 1` — older than any real play, which is exactly what
   is known about it: this key has a character, and this device has never
   played it. */
export function ensureChar(phrase, info) {
  if (!phrase) return readRoster();
  const list = readRoster().slice();
  const i = list.findIndex(function (e) { return e.phrase === phrase; });
  if (i < 0) {
    const e = _entry(phrase, 1, info);
    e.looked = true;
    list.push(e);
  } else {
    if (info && typeof info.name === 'string' && info.name) list[i].name = info.name;
    if (info && info.level > 0) list[i].level = info.level | 0;
    delete list[i].provisional;
  }
  return _sorted(_write(list));
}

/* Fill in a name/level learned from the server for a key we hold but have
   never played on this device (a migrated row, or one just added by key).
   Deliberately does NOT touch `at`: finding out who someone is is not the
   same as playing them, and it must not reshuffle the list under the reader's
   thumb while the lookups land. */
export function describeChar(phrase, info) {
  if (!phrase || !info) return readRoster();
  const list = readRoster().slice();
  const i = list.findIndex(function (e) { return e.phrase === phrase; });
  if (i < 0) return _sorted(list);
  if (typeof info.name === 'string' && info.name) list[i].name = info.name;
  if (info.level > 0) list[i].level = info.level | 0;
  list[i].looked = true;   /* asked once; a miss must not re-ask on every render */
  /* Confirmed by the worker, so it is no longer a guess the migration made. */
  delete list[i].provisional;
  return _sorted(_write(list));
}

/* Remove from THIS DEVICE.  See the header for what this is and is not. */
export function forgetChar(phrase) {
  if (!phrase) return readRoster();
  const list = readRoster().filter(function (e) { return e.phrase !== phrase; });
  /* If the key being forgotten is the one the game would boot into, the boot
     road has to be cleared with it — otherwise the next reload walks straight
     back into the character that was just removed from the list.  The stash
     goes too: it is the pre-roster spare slot, and leaving a deleted key in it
     is how a delete un-deletes itself through the migration above. */
  try {
    if (localStorage.getItem('bt_passphrase') === phrase) {
      localStorage.removeItem('bt_passphrase');
      CHAR_CACHE_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      try { sessionStorage.removeItem('bt_resume'); sessionStorage.removeItem('bt_resume_now'); } catch (e) {}
    }
    if (localStorage.getItem('bt_passphrase_prev') === phrase) localStorage.removeItem('bt_passphrase_prev');
  } catch (e) {}
  _write(list);
  return _sorted(list);
}

/* Make `phrase` the key the game boots into.  Returns true when the active
   character actually CHANGED, which is the caller's cue that it must reload
   rather than just drop the pre-game screen: ids derived from the old phrase
   are already baked into module state by the time anyone can tap a row
   (the same reasoning v2.3.1861 records for the create road). */
export function activateChar(phrase) {
  if (!phrase) return false;
  const cur = _ls('bt_passphrase');
  if (cur === phrase) return false;
  try {
    localStorage.setItem('bt_passphrase', phrase);
    CHAR_CACHE_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    try { sessionStorage.removeItem('bt_resume'); sessionStorage.removeItem('bt_resume_now'); } catch (e) {}
  } catch (e) { return false; }
  return true;
}

/* QA/debug handle, same pattern as window.__broDashPanelBus. */
try {
  if (typeof window !== 'undefined') {
    window.__btRoster = {
      read: readRoster, remember: rememberChar, forget: forgetChar,
      activate: activateChar, describe: describeChar, ensure: ensureChar,
      MAX: ROSTER_MAX,
    };
  }
} catch (e) {}
