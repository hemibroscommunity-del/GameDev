/* ═══ v2.3.4606: WHICH CHARACTER A TAB PLAYS ═══
 *
 * The 2026-11-03 sweep's V5.  A browser keeps the character it plays in ONE
 * slot every tab shares (`bt_passphrase`, the Login Key), and each tab fixes
 * its player id when it starts.  Play A in one tab, then Continue as B (or
 * press Create, or type B's key) in a second: the slot now names B.  Every
 * join of the first tab read the slot afresh -- coming back to it after 5 s,
 * a dropped line, a deploy, the idle logout -- so it:
 *   - joined as B (a new key's id was re-targeted from the slot), put the
 *     second tab out, and folded A's spare armour into B's record;
 *   - or, with an older key, sent A's id with B's key, was refused 'auth',
 *     threw the key away and made a brand-new level-1 A: a wipe to the eye.
 *
 * The owner's decision (2026-11-10, OWNER-LIST section 10): one character
 * per browser; a second tab takes the session over.  So:
 *   - a tab keeps the key it started with (`S._tabKey`) and every join sends
 *     THAT key and its id, never whatever the slot names now;
 *   - when the slot has moved to another character, the tab does not join:
 *     it shows the takeover's own banner ("This account connected from
 *     another window", Play here instead), and that press -- a person's --
 *     joins as this tab's character and gives it the slot back;
 *   - a join never makes a character: 'auth' takes the key road ('key':
 *     the old key kept beside, or the key screen), never a fresh key;
 *   - the per-character caches carry the id they belong to (`_owner`), and a
 *     reader refuses another character's.
 * `?tabid=0` is the one-phone off-ramp: the old road, as it was.
 *
 * No imports: node tests it (server/test/tab-identity.test.mjs).  The
 * networking module passes its own `idOf` (idForKey) and `isNew` (isNewKey).
 */

/** `?tabid=0`: this phone takes the old road (the shared slot at every join). */
export function tabIdOff(search) {
  try {
    let s = search;
    if (s === undefined) s = typeof location !== 'undefined' ? location.search : '';
    return /[?&]tabid=0\b/.test(s || '');
  } catch (e) { return false; }
}

/* Per-character localStorage: cleared whenever the device's character
   changes (charRoster.js activateChar / forgetChar, the picker's restart, the
   typed key), because carrying these into another character is how someone
   else's progress shows up wearing your name (v2.3.1861).  One list, here,
   because the copies drifted (V5: the typed key cleared two of seven). */
export const CHAR_CACHE_KEYS = Object.freeze([
  'bt_rpg', 'bt_stats', 'bt_codex', 'bt_bestiary',
  'bt_materials', 'bt_zones', 'bt_resume',
]);
/* ...and this tab's own copies (sessionStorage) */
export const CHAR_SESSION_KEYS = Object.freeze(['bt_resume', 'bt_resume_now']);

function _isPlayer(id) { return typeof id === 'string' && id.indexOf('bp_') === 0; }

/** Does the shared slot still name this tab's character?  Its own key, or
 *  another key of the same character (another tab on it took a new key). */
export function slotIsMine(tab, slot, idOf) {
  if (!slot || !tab) return false;
  if (tab.key && slot === tab.key) return true;
  const sid = idOf(slot);
  return !!sid && sid === tab.id;
}

/* A new key's id is the worker's, kept beside it: a page that started before
   it knew takes it here (v2.3.3355) -- from THIS tab's key only */
function _idFor(key, id, idOf, isNew) {
  if (key && isNew(key)) {
    const k = idOf(key);
    if (k && k !== id) return k;
  }
  return id;
}

/**
 * The key a join sends and the id it names.
 *   tab   { key, id, claim, off }: the key this tab plays, its id, whether
 *         the player just pressed Play here (claim), the off-ramp;
 *   slot  the shared slot now.
 * Returns { act: 'join', key, id, adopt?, claim? } or { act: 'moved' }:
 *   key    null for a guest (a `?guest=1` or random id sends none, as ever);
 *   adopt  the slot is another key of this character: the tab takes it;
 *   claim  the slot goes back to this tab's key (the player chose here).
 */
export function joinIdentity(tab, slot, idOf, isNew) {
  const id = tab && tab.id;
  if (!_isPlayer(id)) return { act: 'join', key: null, id };
  if (tab.off) {
    /* the old road (v2.3.3355): the slot, a new key's id taken from it */
    return { act: 'join', key: slot || null, id: _idFor(slot, id, idOf, isNew) };
  }
  const own = tab.key || null;
  if (own && slot === own) return { act: 'join', key: own, id: _idFor(own, id, idOf, isNew) };
  if (slot && slotIsMine(tab, slot, idOf)) return { act: 'join', key: slot, id, adopt: true };
  if (own && tab.claim) return { act: 'join', key: own, id: _idFor(own, id, idOf, isNew), claim: true };
  return { act: 'moved' };
}

/** A join refused 'auth' (the key is not this id's): 'mint' a fresh key and
 *  character only on the old road; otherwise the key road ('key'), which
 *  never makes a character (TRAPS 209). */
export function authRefusal(tab) {
  return tab && tab.off ? 'mint' : 'key';
}

/**
 * A new key the worker handed THIS tab's character (`key_new`).
 *   tabKey     the tab plays the new key from now on;
 *   tabOld     the old key it replaces, kept in memory for the fallback;
 *   writeSlot  the shared slot takes it only while it still names this
 *              character (another tab's choice is never overwritten);
 *   keepOld    the old key for the shared spare (`bt_passphrase_old`);
 *   swapFrom   the roster row renamed: this tab's own key's row, never the
 *              row of whatever key the slot holds (that is another
 *              character's row when another tab switched).
 */
export function keyNewPlan(tab, slot, newKey, idOf, isNew) {
  const off = !!(tab && tab.off);
  const from = off ? (slot || null) : ((tab && tab.key) || null);
  const mine = off || slotIsMine(tab, slot, idOf);
  const oldOne = from && from !== newKey && !isNew(from) ? from : null;
  return {
    tabKey: newKey,
    tabOld: oldOne || (tab && tab.old) || null,
    writeSlot: mine,
    keepOld: mine ? oldOne : null,
    swapFrom: from,
  };
}

/** The old key a refused new key goes back to: this tab's own (memory), or
 *  the shared spare -- only a key of THIS tab's character. */
export function fallbackKey(tab, sharedOld, idOf) {
  if (tab && tab.off) return sharedOld || null;
  if (!tab) return null;
  if (tab.old && idOf(tab.old) === tab.id) return tab.old;
  if (sharedOld && idOf(sharedOld) === tab.id) return sharedOld;
  return null;
}

/** The key whose list row this tab stamps with its name, level and id (the
 *  30 s heartbeat, joinTown): its own -- the slot's was another character's
 *  row when another tab switched -- and only while that row is still on the
 *  device (the slot, or the list), so a row another tab removed is not put
 *  back every 30 s. */
export function rowKey(tab, slot, inList) {
  if (tab && tab.off) return slot || null;
  const k = tab && tab.key;
  if (!k) return null;
  return (k === slot || inList(k)) ? k : null;
}

/** Is this cached copy (bt_rpg, the resume snapshot) this character's?  One
 *  stamped with another id is not; an unstamped one (written before
 *  v2.3.4606) is taken as before, so nobody's first load after this ships
 *  starts cold. */
export function ownedBy(obj, id) {
  if (!obj || typeof obj !== 'object') return false;
  return obj._owner == null || obj._owner === id;
}

/** Stamp a cached copy with the character it belongs to -- a guest's random
 *  id too, so a `?guest=1` tab's saves are never read as the player's. */
export function stampOwner(obj, id) {
  if (obj && typeof obj === 'object' && typeof id === 'string' && id) obj._owner = id;
  return obj;
}
