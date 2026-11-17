/* ═══ v2.3.5713 (card SEC PR 14): THE DEV CONSOLE SHOWS NO KEY ═══
 * The developer console (`?dev=1&debug=1`, DebugOverlay.jsx) recorded the
 * `join` frame whole -- the Login Key (`phrase`) and the device pass
 * (`device`, the device lock's) in plain sight in the WS tab -- and its
 * State tab drew the page's state whole, this tab's keys (`_tabKey`,
 * `_tabKeyOld`, `_joinKey`) and its tokens with it.  A screenshot of the
 * console for a bug report was a screenshot of the account.  Now what the
 * console RECORDS and SHOWS is blanked here; the game's own frames and state
 * are untouched (nothing a player sees changes).  No imports, so node tests
 * it (tools/guards/devblank.test.mjs: a page module, so not a worker suite, TRAPS §277).
 *   - frames: `join`'s phrase, device and verify token; `key_new`'s key;
 *     `state_sync`'s httpToken;
 *   - state: the keys and tokens below, at any depth the State tab or the
 *     console's `get` reaches.
 */
export const BLANK = '(hidden)';

/* each frame type, the fields that are a key or a token */
export const FRAME_SECRETS = Object.freeze({
  join: Object.freeze(['phrase', 'device', 'verify']),
  key_new: Object.freeze(['key']),
  state_sync: Object.freeze(['httpToken']),
});

/* the page state's fields that are a key or a token (wsClient.js's S) */
export const STATE_SECRETS = Object.freeze(new Set(['_tabKey', '_tabKeyOld', '_joinKey', '_verifyToken', '_httpToken', 'phrase', 'passphrase']));

const present = (v) => v !== undefined && v !== null && v !== '';

/** A frame as the console records it: a copy with its secrets blanked (the
 *  frame itself, as sent or received, is never touched).  Anything not an
 *  object, or a type with none, comes back as it was. */
export function blankFrame(frame) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return frame;
  const fields = Object.prototype.hasOwnProperty.call(FRAME_SECRETS, frame.type) ? FRAME_SECRETS[frame.type] : null;
  if (!fields) return frame;
  let out = null;
  for (const f of fields) {
    if (!present(frame[f])) continue;
    if (!out) out = { ...frame };
    out[f] = BLANK;
  }
  /* a frame whose fields ride in its payload (`{type, payload: {...}}`) */
  const p = frame.payload;
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    let q = null;
    for (const f of fields) {
      if (!present(p[f])) continue;
      if (!q) q = { ...p };
      q[f] = BLANK;
    }
    if (q) { if (!out) out = { ...frame }; out.payload = q; }
  }
  return out || frame;
}

/** A state value as the console shows it, under its field's name. */
export function blankStateValue(key, value) {
  return STATE_SECRETS.has(key) && present(value) ? BLANK : value;
}

/** An object as the console prints it: a copy with its own secret fields
 *  blanked (one level: the State tab blanks each level as it draws it). */
export function blankShallow(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  let out = null;
  for (const k of Object.keys(obj)) {
    if (STATE_SECRETS.has(k) && present(obj[k])) { if (!out) out = { ...obj }; out[k] = BLANK; }
  }
  return out || obj;
}

/** A dotted path's last field, for a State tab pointed straight at one. */
export function blankAtPath(path, value) {
  const parts = String(path || '').split('.').filter(Boolean);
  return parts.length ? blankStateValue(parts[parts.length - 1], value) : value;
}
