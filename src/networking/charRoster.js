import { passphraseToId } from './index.js';
import { readShared, writeShared } from './rosterCookie.js';   /* v2.3.2110 */

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
    if (extra.look && typeof extra.look === 'object') e.look = extra.look;   /* v2.3.2193 */
  }
  return e;
}

/* ═══ v2.3.2193: THE APPEARANCE, KEPT SO THE PICKER CAN DRAW A FACE ═══
   Owner, of the Continue window: "In an RPG, I should recognize my character
   visually before I even read the name."  A portrait needs cosmetics, and a
   roster row is a KEY -- it has never held any.  The worker now returns the
   look beside the name in the account preview (server/src/account.js), and
   this keeps it, for the same reason the name is kept: so the second visit
   draws the character with no network at all.

   Stored raw, in the WIRE shape (short keys, `sk`/`hr`/`hc`...), and not
   translated on the way in.  Translating here would put a second copy of
   peerCosmetics' mapping in the storage layer, where it would rot quietly the
   next time a cosmetic key is added -- the picker calls the same
   peerCosmeticsFromWire every peer goes through, so there is one mapping.

   IT IS A LOOK, NOT A MAP OF IDS.  Its keys come from the worker's own
   JOIN_COSMETIC_KEYS allowlist, so rule 4 (Object.create(null) for
   client-keyed maps) does not bite here -- nothing indexes it by anything a
   player typed. */
/* ═══ v2.3.2193: THE LOOKUP BUDGET IS A GENERATION, NOT A BOOLEAN ═══
   `looked` is the once-ever budget that stops a nameless row re-asking the
   worker on every render.  As a boolean it would have made the portrait
   arrive for exactly the wrong rows: a row written by PLAYING already has its
   name and level (rememberChar), so it never qualified for a lookup, so it
   would never learn a look -- the common row, the one you recognise, would
   have been the one stuck on a letter tile, while a migrated row nobody has
   touched got the face.

   A number instead of a flag gives every row already marked `looked` exactly
   ONE more lookup, which is what fills in the look for a roster that predates
   this version.  Bump it again the next time the preview learns a field
   worth back-filling; a row that genuinely has nothing behind it is still
   asked once and then left alone. */
export const LOOKUP_GEN = 2;

/* ═══ v2.3.2195: THE LOOK IS A DIFFERENT QUESTION FROM THE NAME ═══
   Owner, of the picker that shipped hours earlier: "It's not showing a
   portrait of the character."  Their row was showing a letter tile and could
   never have shown anything else.

   THE RACE, exactly.  The client reached Cloudflare Pages a few minutes before
   the worker deploy finished.  In that window the picker made its ONE lookup
   against a worker that did not yet return `look` -- which the client handled
   correctly, treating an absent field as "leave what you have" (rule 19) -- and
   then `describeChar` stamped the row `looked = LOOKUP_GEN` anyway, because
   the answer HAD arrived.  So the budget was spent on the one worker that
   could not answer, and the flag that stops the re-ask is permanent.  The
   generation bump was meant to cover exactly this and could not: it grants one
   retry, and the retry is what got burned.

   The mistake is that ONE flag was answering TWO questions.  They have
   different costs and want different budgets:

     the NAME and LEVEL are why `looked` exists.  A row with nothing behind it
     answers "no" forever, and re-asking every render is what would get a
     player rate-limited -- so that one stays a persistent, once-ever budget.

     the LOOK is a field the WORKER may simply not have known about yet, and a
     worker gains the ability to answer between page loads.  A permanent "asked"
     is the wrong record of "asked something that could not answer".

   So the look re-asks at most ONCE PER PAGE LOAD, out of a set that lives in
   memory and dies with the tab.  Bounded: a roster of ten costs ten sequential
   requests on a load where no look is known and nothing after that, against a
   20/min budget; the load after the worker learns the answer fills them in and
   the set stops asking. */
const _lookAsked = new Set();

/** Record that this row's look was asked for on THIS page load, whatever the
    answer.  Called by the picker at every definitive answer, so a character
    that genuinely has no look costs one request per load rather than one per
    render. */
export function markLookAsked(phrase) { if (phrase) _lookAsked.add(phrase); }

/** Does this row still owe the worker a question?  One place, so the picker's
    fetch and the flags that stop it cannot disagree about what "asked" means. */
export function needsLookup(e) {
  if (!e) return false;
  const wantWho = (!e.name || !e.level) && e.looked !== LOOKUP_GEN;
  const wantLook = !e.look && !_lookAsked.has(e.phrase);
  return wantWho || wantLook;
}

function _keepLook(entry, look) {
  if (look && typeof look === 'object') entry.look = look;
  /* A definitive null means "this key has no character yet" -- drop any look
     we were holding rather than draw a face for someone who no longer exists.
     `undefined` is an OLD WORKER that does not send the field at all, and must
     leave a look we already have alone (rule 19, deploy-order safety). */
  else if (look === null && entry.look) delete entry.look;
}

/* ═══ v2.3.2111: HIGHEST LEVEL AT THE TOP ═══
   Owner: "provide a list of characters ... and sort by highest level character
   on top?  People will probably have a bunch of them."  This SUPERSEDES the
   v2.3.1923 order ("most recent at the top"), and the reason it changed is in
   the same sentence: a roster of two is a history, a roster of eight is a
   collection, and the one you want out of a collection is the one you have put
   the most into — not whichever you happened to open last.

   Last played survives as the TIEBREAK, so a shelf of level-1s still reads in
   the order v2.3.1923 asked for, and the row still says when it was played.
   Stable on a full tie, so a roster where nothing has been played yet keeps
   the order it was written in.

   Level 0 means UNKNOWN, not new: it is a row nobody has looked up yet, and it
   sorts last.  CharacterPicker's lookup pass fills those in (it asks for any
   row missing a name OR a level), so an unknown row does not sit at the bottom
   for longer than the one request it takes to place it. */
function _sorted(list) {
  return list.map(function (e, i) { return { e: e, i: i }; })
    .sort(function (a, b) {
      return (b.e.level || 0) - (a.e.level || 0)
        || (b.e.at || 0) - (a.e.at || 0)
        || a.i - b.i;
    })
    .map(function (x) { return x.e; });
}

/* ═══ v2.3.2110: EVERY WRITE ALSO GOES TO THE SHARED MIRROR ═══
   localStorage stays the working copy; the cookie in rosterCookie.js is the
   only part of this that a NEW ORIGIN can see, and a new origin is what a
   fresh Pages deployment is (see that file's header).  Mirroring here rather
   than at each call site is deliberate: this is the single funnel every
   mutation already goes through, so there is no road that can quietly write
   one store and not the other.

   `tombAdd` is a phrase being forgotten.  It has to travel too, or the next
   build restores the character that was just deleted.  A phrase that is back
   in the live list is not deleted any more and drops out of the tombstones
   in the same breath. */
function _write(list, tombAdd) {
  const trimmed = list.length > HARD_BOUND ? _sorted(list).slice(0, HARD_BOUND) : list;
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, list: trimmed })); } catch (e) {}
  try {
    const shared = readShared();
    let tombs = (shared && shared.tomb) || [];
    if (tombAdd) tombs = [tombAdd].concat(tombs.filter(function (x) { return x !== tombAdd; }));
    /* Phrases are player-supplied (a typed Login Key), so the membership set
       is Object.create(null) — a plain {} no-ops on '__proto__'. */
    const live = Object.create(null);
    trimmed.forEach(function (e) { live[e.phrase] = 1; });
    writeShared(trimmed, tombs.filter(function (x) { return !live[x]; }));
  } catch (e) {}
  return trimmed;
}

/* The shared mirror, guarded once so every caller below can just use it. */
function _shared() {
  try { return readShared(); } catch (e) { return null; }
}

/* ═══ BACKFILL, ONCE PER LOAD ═══
   Everyone who already has a character has a localStorage roster and NO mirror
   — the cookie did not exist when they made it.  readRoster's fast path
   returns early when nothing changed, so without this their mirror would stay
   empty until the next thing that happens to write (a play, a delete), and the
   very build that ships this fix would be the last one they could still be
   found on.  So the first read of a page load with a roster and no mirror
   writes one.

   Once per load, and only when the mirror is genuinely absent: with cookies
   switched off readShared always answers null, and without this flag every
   readRoster — which is called on render, on inRoster, on every remember —
   would re-run a write that cannot stick. */
let _mirrorSeeded = false;

/* A row rebuilt from the mirror.  Not provisional: it was written by a real
   roster on some origin of this same site, which is positive evidence — the
   CharacterPicker drops provisional rows on a "no character" answer, and
   these must not be droppable that way. */
function _fromShared(e) {
  return { phrase: e.phrase, id: passphraseToId(e.phrase), at: e.at || 1, name: e.name || '', level: e.level || 0 };
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
  const shared = _shared();
  /* ═══ v2.3.2112: AN EMPTY LIST IS NOT AN ANSWER ═══
   * Owner: "I've been able to continue playing characters from earlier builds
   * before.  The main site is always Brotown.net.  I think all characters are
   * in local storage so can't they be retrieved from there?"
   *
   * They can, and they were not.  `stored` used to be trusted whenever it
   * PARSED — and an empty array parses.  So the very first read on a device
   * whose `bt_player` had not landed yet (a Login-Key sign-in, whose reload
   * lands before anything is played; the boot check's ensureChar; the login
   * screen's own roster count) seeded nothing, wrote `{"v":1,"list":[]}`, and
   * that empty list became the permanent answer.  The character was never
   * lost — `bt_passphrase` still names it and the boot check still walks
   * straight into it, which is why continuing kept working — but Continue's
   * list stayed empty forever, because the one road that could have built it
   * had already been marked done.  Reproduced in
   * tools/qa/roster-mirror.test.mjs.
   *
   * So only a NON-EMPTY list is an answer; an empty one falls through and
   * seeds again.  The "already migrated" flag was there to stop a player who
   * deleted every character being handed them back on the next read — and
   * that job now belongs to the tombstones (v2.3.2110), which say which
   * phrases were deliberately forgotten and are honoured by both roads below.
   * A flag that also swallowed the never-migrated case was answering two
   * questions with one bit. */
  if (stored && stored.length) {
    /* ═══ v2.3.2110: AN ESTABLISHED ORIGIN STILL LISTENS TO THE MIRROR ═══
       The restore below only fires on an origin that has never had a roster.
       That covers the reported case (a fresh build's hostname) but not its
       mirror image: a character MADE on the new build, opened later on the
       stable URL that already has a roster of its own.  Without this pass
       that character would be invisible there for good, and the player would
       be back to "which link was it on".

       Additions only, minus tombstones.  This never overwrites a local row —
       the local copy is the one with the real play times on it, and the
       mirror's `at` is whatever the other origin last knew. */
    const dead = Object.create(null);
    const have = Object.create(null);
    if (shared) shared.tomb.forEach(function (p) { dead[p] = 1; });
    stored.forEach(function (e) { have[e.phrase] = 1; });
    let changed = false;
    const merged = stored.filter(function (e) {
      if (!dead[e.phrase]) return true;
      changed = true;                    /* a delete made elsewhere, honoured here */
      return false;
    });
    if (shared) shared.list.forEach(function (e) {
      if (have[e.phrase] || dead[e.phrase]) return;
      have[e.phrase] = 1;
      merged.push(_fromShared(e));
      changed = true;
    });
    if (!shared && !_mirrorSeeded && merged.length) { _mirrorSeeded = true; changed = true; }
    if (!changed) return _sorted(stored);
    return _sorted(_write(merged));
  }
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
  const dead0 = Object.create(null);
  if (shared) shared.tomb.forEach(function (p) { dead0[p] = 1; });
  const named = !!(player && typeof player.name === 'string' && player.name.trim());
  if (cur && named && !dead0[cur]) {
    seeded.push(_entry(cur, Date.now(), { name: player.name.trim(), level: (rpg && rpg.level) || 0 }));
  } else if (cur && !dead0[cur] && rpg && rpg.power !== undefined) {
    /* ═══ v2.3.2112: PLAYED, BUT NOT LABELLED ═══
       `bt_player` is the evidence this seed asks for, and it is the right
       question — a key alone is minted silently on every first boot and
       vouches for nothing.  But it is not the ONLY evidence: `bt_rpg` is a
       character's saved progress, written all over the game, and a device
       holding one has unmistakably played.  Seeded PROVISIONALLY because it
       carries no name, which is exactly the row the picker already knows how
       to finish: it asks the worker once, keeps the row with the name it gets
       back, and drops it if there is no character behind the key.  Without
       this, a device whose `bt_player` was missing at the wrong moment had no
       road back into the list at all. */
    const e = _entry(cur, 1, { level: rpg.level || 0 });
    e.provisional = true;
    seeded.push(e);
  }
  if (prev && prev !== cur && !dead0[prev]) {
    const e = _entry(prev, 1);
    e.provisional = true;
    seeded.push(e);
  }
  /* ═══ v2.3.2110: ...OR A DEVICE THAT IS ONLY NEW BECAUSE THE BUILD IS ═══
     Everything above reads localStorage, which a fresh Pages deployment does
     not share with the deployment before it — so on that origin the two legacy
     keys are absent and the seed is empty.  The shared mirror is the one store
     that DOES cross that gap (rosterCookie.js), and this is the read it exists
     for: the roster the player built on the last build, restored before they
     have seen a screen. */
  const dead = Object.create(null);
  const have = Object.create(null);
  seeded.forEach(function (e) { have[e.phrase] = 1; });
  if (shared) {
    shared.tomb.forEach(function (p) { dead[p] = 1; });
    shared.list.forEach(function (e) {
      if (have[e.phrase] || dead[e.phrase]) return;
      have[e.phrase] = 1;
      seeded.push(_fromShared(e));
    });
  }
  _write(seeded);
  return _sorted(seeded);
}

/* ═══ v2.3.2110: WALKING STRAIGHT IN ON A BUILD YOU HAVE NEVER OPENED ═══
 * Owner: "The continue button should allow them to continue their character
 * from previous builds."  Restoring the roster makes that button work — but
 * on the origin the player actually lands on, the door only appears because
 * this device has no `bt_passphrase`, and the myId initialiser is about to
 * MINT one (BroTown.jsx).  A brand-new key has no character, so the boot check
 * routes to the login screen, and the player is asked to pick something they
 * were already playing five minutes ago on the previous link.
 *
 * So the initialiser asks here first: if this origin has never had a roster
 * and the mirror is holding EXACTLY ONE character, adopt it as the device's
 * key.  The player lands in the world, which is what "continue" means, with no
 * key typed and no list to read.
 *
 * ═══ v2.3.2111: ...AND ONLY WHEN THERE IS NOTHING TO CHOOSE ═══
 * Owner: "Can you actually provide a list of characters like you did before
 * when people try to join the game ... People will probably have a bunch of
 * them."  v2.3.2110 adopted the most recent of however many came across, which
 * on a restored device is a choice made FOR the player — and worse, silently:
 * they land as one character with no sign the other seven survived the build,
 * which is the exact anxiety ("it shows empty") this was meant to answer.
 *
 * One row is not a choice, so it still walks straight in.  Two or more and
 * this declines, no key is adopted, and the login door appears — where the
 * picker now opens by itself onto the list (LoginScreen).  The list IS the
 * answer at that point: it shows every character that made it across, sorted
 * so the biggest is the first thing read.
 *
 * THE THREE GUARDS ARE THE WHOLE DESIGN, because this must not fire on the
 * road that LOOKS the same:
 *   - a device already holding a key is not being restored, it is being
 *     played, and nothing here may touch it;
 *   - an origin with its OWN roster is not new, so an absent key means the
 *     player deleted the active character (forgetChar clears it) and the door
 *     is the correct destination — adopting there would silently walk them
 *     into a different character right after a delete;
 *   - a provisional row is a key the migration GUESSED at (charRoster header).
 *     Guessing wrong here means auto-joining as somebody who may not exist, so
 *     those rows stay for the picker, which resolves them against the worker.
 * Returns the adopted phrase, or null when any guard says no.
 */
export function adoptSharedPhrase() {
  try {
    if (_ls('bt_passphrase')) return null;
    if (_raw()) return null;
    const shared = _shared();
    if (!shared || !shared.list.length) return null;
    const list = readRoster().filter(function (e) { return !e.provisional; });
    /* v2.3.2111: exactly one, or the player picks — see the note above. */
    if (list.length !== 1) return null;
    const phrase = list[0].phrase;
    localStorage.setItem('bt_passphrase', phrase);
    return phrase;
  } catch (e) { return null; }
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
    if (info) _keepLook(e, info.look);                             /* v2.3.2193 */
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
  _keepLook(list[i], info.look);                                   /* v2.3.2193 */
  list[i].looked = LOOKUP_GEN;   /* asked; a miss must not re-ask on every render */
  /* Confirmed by the worker, so it is no longer a guess the migration made. */
  delete list[i].provisional;
  return _sorted(_write(list));
}

/* ═══ v2.3.2194: THE ROW IS STALE, ASK AGAIN ═══
   After a restart the character IS level 1 and this device is still holding
   the number it had a second ago.  Clearing the level and the asked-flag puts
   the row back in `needsLookup`, so the picker's own effect re-asks the worker
   on the next render -- the same road a never-looked-up row takes, rather than
   a second path that writes a level the client guessed at.

   The NAME and the LOOK are kept: a restart resets progression, not who the
   character is (server/src/persistence.js keeps char:<id> and auth:<id>), so
   throwing them away would blank the row and make a portrait re-fetch for
   nothing. */
export function relookChar(phrase) {
  if (!phrase) return readRoster();
  const list = readRoster().slice();
  const i = list.findIndex(function (e) { return e.phrase === phrase; });
  if (i < 0) return _sorted(list);
  list[i].level = 0;
  delete list[i].looked;
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
  /* v2.3.2110: the tombstone rides along, so the delete crosses to the other
     origins of this site instead of being undone by the next build's restore. */
  _write(list, phrase);
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
      adopt: adoptSharedPhrase,
      MAX: ROSTER_MAX,
    };
  }
} catch (e) {}
