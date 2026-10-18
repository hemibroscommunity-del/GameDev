/* ═══ v2.3.3355: NEW LOGIN KEYS, MADE BY THE WORKER ═══
 *
 * docs/specs/login-keys.md.  Step 2 of the owner's login plan: eight words
 * (keywords.js), made here with crypto randomness, kept only as a
 * fingerprint, and good from ANY device -- so a player can move to a new
 * phone by typing their key again, with no pass from the owner.
 *
 *   - A character holds up to LOGIN_KEYS.MAX keys, one for each device it was
 *     handed to: `auth.keys` [{h, d, at, ok}] -- `h` the fingerprint
 *     (`_keyHash`), `d` the device, `at` when made, `ok` when a join first
 *     came with it (0 until then).  `keyidx:<h>` {id, at} finds a key's
 *     character for the login door, which has only the key.
 *   - A phone that says it can take one (the join's `kv: 2`) and comes in
 *     with the OLD key -- from one of the character's devices, as the device
 *     lock (devicelock.js) allows -- is handed a new key after its join is in
 *     (`_keysAfterJoin`): `key_new {key, id}`, PRIVILEGED, to that socket
 *     only, never relayed, never logged.  The phone keeps the old key until
 *     a join with the new one is in (wsClient.js), so a lost message loses
 *     nothing: the old key still works on that device, and its next join is
 *     handed another (not within REMINT_MS of the last, so a phone that
 *     cannot keep one is not a write every join).
 *   - Each device is handed its own key (the worker keeps no key, only its
 *     fingerprint, so it cannot hand one key twice): any of them works on
 *     any device.
 *   - A NEW character's first join registers the key its phone made for
 *     itself, as before, and is handed a new key at once; that first key is
 *     RETIRED the first time the new one is used (`fresh`, `oldGone`): no
 *     device holds it any more.  An existing character's old key is kept --
 *     its other devices still come in with it, and are handed theirs -- held
 *     to its devices by the device lock.
 *   - A new-shaped key the worker never made is never registered: refused
 *     'key' (close CLOSE), as is a key taken back.  Never 'auth', which makes
 *     a phone throw its key away for a fresh character.
 *   - The owner's tools (devicelock.js `_deviceLockAdminRoute`): Forget takes
 *     every new key back too (an intruder may hold one), and "Give it a new
 *     key" (`/api/admin/key-new`) is the full reset for a stolen character:
 *     the player put out, every device forgotten, every key taken back, the
 *     old key retired, and ONE new key shown to the owner to send on.
 *
 * Kill switch `keys2: false`: no key is handed out.  Keys already made still
 * work -- a switch that locked out every player holding one would be worse
 * than the thing it switches off.
 */
import { makeLoginKey, normalizeKeyText, isNewKeyShape } from './keywords.js';
import { cleanDevice, DEVICE_LOCK } from './devicelock.js';

export const LOGIN_KEYS = Object.freeze({
  /* keys a character holds: one a device, as many as its devices */
  MAX: DEVICE_LOCK.MAX,
  /* a device handed a key is not handed another within this */
  REMINT_MS: 10 * 60000,
  /* the close after a 'key' refusal (4016 is the device lock's) */
  CLOSE: 4017,
  /* the close after a 'locked' one (join.js: five wrong keys in a minute) */
  LOCKED_CLOSE: 4018,
  /* the index from a key's fingerprint to its character */
  IDX: 'keyidx:',
});

/** A new key's one spelling, or null when `phrase` is not one. */
export function newKeyOf(phrase) {
  const k = normalizeKeyText(phrase);
  return isNewKeyShape(k) ? k : null;
}

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const loginKeyMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _keysOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'keys2') && !f.keys2);
  },

  _keysTally(k) {
    const c = this._keyCount || (this._keyCount = { made: 0, used: 0, refused: 0, retired: 0, taken: 0, door: 0 });
    c[k] = (c[k] || 0) + 1;
  },

  /** A key's fingerprint: never the key, and never the old key's (btv1). */
  async _keyHash(key) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btk2|' + key));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /* The join's half for a NEW key (join.js _verifyJoinAuth): true, or 'key'.
     Writes nothing -- a first use is stamped once the join is in. */
  async _keyJoinCheck(id, auth, key, out) {
    const h = await this._keyHash(key);
    const e = Array.isArray(auth && auth.keys) ? auth.keys.find((k) => k && k.h === h) : null;
    if (!e) { this._keysTally('refused'); return 'key'; }
    if (out) { out.via = 'new'; out.h = h; out.firstUse = !e.ok; }
    this._keysTally('used');
    return true;
  },

  /* After a join is in (join.js, after the state it is sent): a key's first
     use stamped -- and a new character's first key retired -- or a key
     handed to a phone that came with the old one.  At most one write. */
  async _keysAfterJoin(ws, id, msg, out) {
    if (!out || !id) return;
    const S = this.state.storage;
    const now = Date.now();
    if (out.via === 'new') {
      if (!out.firstUse) return;
      const auth = await S.get('auth:' + id);
      if (!auth || !Array.isArray(auth.keys)) return;
      const next = { ...auth, keys: auth.keys.map((k) => (k && k.h === out.h && !k.ok ? { ...k, ok: now } : k)) };
      if (auth.fresh) {
        /* the key this character's phone made for itself: nobody holds it now */
        delete next.pfHash; delete next.fresh; next.oldGone = 1;
        this._keysTally('retired');
      }
      await S.put('auth:' + id, next);
      return;
    }
    if (out.via !== 'old' && !out.fresh) return;
    if (!msg || msg.kv !== 2 || !this._keysOn()) return;
    const device = cleanDevice(msg.device);
    if (!device) return;
    const auth = await S.get('auth:' + id);
    if (!auth || typeof auth !== 'object' || auth.oldGone) return;
    const keys = Array.isArray(auth.keys) ? auth.keys.filter((k) => k && typeof k.h === 'string') : [];
    const mine = keys.find((k) => k.d === device);
    if (mine && now - (mine.at || 0) < LOGIN_KEYS.REMINT_MS) return;
    const key = makeLoginKey();
    const h = await this._keyHash(key);
    /* this device's old one goes (it never kept it); past MAX the oldest
       never used, else the oldest */
    const gone = keys.filter((k) => k.d === device);
    let list = keys.filter((k) => k.d !== device);
    list.push({ h, d: device, at: now, ok: 0 });
    while (list.length > LOGIN_KEYS.MAX) {
      let i = list.findIndex((k) => !k.ok);
      if (i < 0 || i === list.length - 1) i = 0;
      gone.push(list[i]);
      list.splice(i, 1);
    }
    const next = { ...auth, keys: list };
    if (out.fresh) next.fresh = 1;
    /* the record and the index in one write */
    await S.put({ ['auth:' + id]: next, [LOGIN_KEYS.IDX + h]: { id, at: now } });
    this._keysTally('made');
    if (gone.length) {
      try { await S.delete(gone.map((k) => LOGIN_KEYS.IDX + k.h)); } catch (e) { /* a stale index finds nothing: the record decides */ }
    }
    try { ws.send(JSON.stringify({ type: 'key_new', key, id })); } catch (e) { /* closed: the next join is handed one */ }
  },

  /* The login door's half (account.js): the character a new key belongs to,
     or null.  Reads only. */
  async _keyLookup(key) {
    const S = this.state.storage;
    const h = await this._keyHash(key);
    const idx = await S.get(LOGIN_KEYS.IDX + h);
    const id = idx && typeof idx.id === 'string' ? idx.id : null;
    if (!id) return null;
    const auth = await S.get('auth:' + id);
    /* the record decides: an index left behind by a key taken back finds nothing */
    if (!auth || !Array.isArray(auth.keys) || !auth.keys.some((k) => k && k.h === h)) return null;
    this._keysTally('door');
    return { id, auth };
  },

  /* Every key of a character taken back: its record's list emptied (the
     caller writes the record) and the index entries deleted. */
  async _keysTakeBack(auth) {
    const keys = Array.isArray(auth && auth.keys) ? auth.keys : [];
    if (!keys.length) return 0;
    try { await this.state.storage.delete(keys.filter((k) => k && typeof k.h === 'string').map((k) => LOGIN_KEYS.IDX + k.h)); } catch (e) { /* the record decides */ }
    this._keysTally('taken');
    return keys.length;
  },

  /* for /api/admin/overview */
  _keysInfo() {
    const c = this._keyCount || {};
    return { on: this._keysOn(), made: c.made || 0, used: c.used || 0, refused: c.refused || 0, retired: c.retired || 0, taken: c.taken || 0, door: c.door || 0 };
  },
};
