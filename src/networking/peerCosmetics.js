/* ═══ v2.3.1961: ONE TABLE FOR A PEER'S COSMETIC WIRE KEYS ═══
 *
 * A peer's look reaches this client by two roads, and they used to translate
 * the wire independently:
 *   - the SNAPSHOT road (state_sync's others loop, `player_join`, and the two
 *     self-heal placeholders in wsClient.js), which built the peer object with
 *     hand-written lines like `shirtArtFront: _data.sa || null`;
 *   - the RELAY road (`player_update`, the 2 s `track` fan-out), which ran
 *     `Object.assign(peer, msg.data)` and therefore wrote the SHORT keys
 *     (`sa`, `hr`, `st`, …) onto the peer object.
 *
 * The renderer reads the long names only (`other.shirtArtFront`,
 * `other.headwear`, … — entityRenderer.js `_remoteBodyArt` / the remote draw
 * block, friendPortraits.js, InspectPlayerPanel.jsx), so everything the wire
 * RENAMES arrived once on join and was never refreshed again.  Measured on the
 * tree before this change: of the cosmetics `track` carries, only the ones
 * whose wire name IS the field name (`name`, `color`, `avatar`, `dir`, `zone`,
 * `bt`, `bl`, `rpgLv`, `wpnType`, …) and `equip`, which has its own hand-built
 * rebuild beside the Object.assign, ever changed after join.
 *
 * TWO REACHABLE CONSEQUENCES, both live before v2.3.1961:
 *   1. The v2.3.1112 self-heal.  A peer discovered from a `tick` delta or from
 *      the relay itself (iOS Safari suspends a background tab, so its join is
 *      missed forever) is created with NULL cosmetics and the comment there
 *      promises the 2 s relay "fills in name/avatar/gear moments later".  Name,
 *      avatar and gear did; skin, hair, headwear, shirt, pants, shoes, body
 *      size and every drawing did not — that peer stayed a bald default body
 *      for the rest of the session.
 *   2. The in-world t-shirt toggle (ItemDetailPopup.jsx, the chest picker's
 *      T-Shirt row and the Chest — Layers popup) calls `setShirt`, which moves
 *      `st` mid-session.  Peers never saw it come off or go back on.
 * The DRAWINGS are latent rather than live: the designer (PlayerPaint) is only
 * mounted by NameModal at bootPhase 'create', i.e. on the splash screen, so a
 * drawing cannot change while you are in the world today.  The mapping is
 * correct now either way, and the day the paint panel opens in-world it works
 * without another edit here.
 *
 * WHY A TABLE AND NOT SIX MORE HAND-WRITTEN LINES.  This is the shape of bug
 * TRAPS §13's second receipt warns about: fixing the call site you are looking
 * at instead of the class.  v2.3.1939 shipped `sa` into one gate and not the
 * other and a drawn shirt vanished two seconds after a peer joined; v2.3.1949
 * added `tf`/`tm` to both server gates and to the join road, and they were
 * still missing from the client's `track` payload when this was written.  A
 * per-key list somebody must remember to extend in four places is how that
 * keeps happening, so there is now exactly ONE place: add the key here and
 * every road picks it up.
 *
 * KEYING.  The table is a plain frozen object literal because its keys are
 * OURS — wire abbreviations written in this file, never ids a client chose
 * (CLAUDE.md rule: client-keyed maps must be Object.create(null) or Map, and
 * `'__proto__'` cannot appear here without someone typing it).  Values off the
 * wire are only ever read through hasOwnProperty and only under a key this
 * table names, so a crafted `__proto__` in `msg.data` is not consulted at all.
 *
 * NOT VALIDATION.  Nothing here judges a value; the renderer's own sanitisers
 * do that at the one place a peer string reaches a canvas (sanitizeShirtArt /
 * sanitizePattern / the catalog lookups).  This is a rename table and nothing
 * more, which is what keeps the trust boundary in one place.
 */

/** Wire key -> the long field name the renderer reads off a peer.
 *  Only keys the wire RENAMES belong here: `name`, `color`, `avatar`, `dir`,
 *  `zone`, `bt`, `bl`, `rpgLv`, `rpgHp`, `rpgMaxHp`, `wpnType`, `wpnMat`,
 *  `rep`, `aw` and friends already arrive under the field name the renderer
 *  reads, so the relay's Object.assign carries them correctly on its own. */
export const PEER_COSMETIC_FIELDS = Object.freeze({
  hw: 'headwear',
  fh: 'facialhair',
  hr: 'hair',
  sk: 'skin',
  hc: 'hairColor',
  htc: 'hatColor',
  fhc: 'facialHairColor',
  st: 'shirt',
  stc: 'shirtColor',
  ec: 'eyeColor',            /* v2.3.1930 */
  sa: 'shirtArtFront',       /* v2.3.1939 */
  sb: 'shirtArtBack',        /* v2.3.1939 */
  pa: 'pantsArt',            /* v2.3.1940 */
  ta: 'tattooArt',           /* v2.3.1940 */
  tf: 'faceTattooArt',       /* v2.3.1949 */
  tm: 'armTattooArt',        /* v2.3.1949 */
  tb: 'headBackTattooArt',   /* v2.3.2043 */
  tr: 'bodyBackTattooArt',   /* v2.3.2148 */
  sp: 'shirtPattern',        /* v2.3.1941 */
  pp: 'pantsPattern',        /* v2.3.1941 */
  fp: 'shoesPattern',        /* v2.3.1944 */
  pt: 'pants',
  sh: 'shoes',
  bs: 'bodySize',
  /* v2.3.1953: height and frame. The server relays both in
     TRACK_COSMETIC_KEYS, so without these two lines a build change
     mid-session was frozen on peers' screens exactly like the rest --
     the relay wrote the short keys and the renderer read the long ones. */
  hg: 'buildHeight',
  fr: 'buildFrame',
});

/** Per-key fallback for a snapshot that carries nothing under that key.  Null
 *  for everything the renderer treats as "not worn / not drawn"; `bs` is the
 *  one field with a real default, because there is no such thing as a body
 *  with no size and 'slim' is what every builder used before this table. */
const PEER_COSMETIC_DEFAULTS = Object.freeze({ bs: 'slim' });

const KEYS = Object.freeze(Object.keys(PEER_COSMETIC_FIELDS));

function _fallback(k) { return PEER_COSMETIC_DEFAULTS[k] || null; }

/** SNAPSHOT road: the full cosmetic set for a peer, as long field names.
 *  Every field is present in the result — an absent or blank wire value
 *  becomes the fallback, exactly as the hand-written `_data.sa || null` lines
 *  did — so it is safe to spread into a peer object being built from scratch,
 *  including the two self-heal placeholders (call it with `{}` there and the
 *  peer starts with the same nulls it always had). */
export function peerCosmeticsFromWire(wire) {
  const src = wire || {};
  const out = {};
  for (let i = 0; i < KEYS.length; i++) {
    const k = KEYS[i];
    out[PEER_COSMETIC_FIELDS[k]] = (Object.prototype.hasOwnProperty.call(src, k) && src[k])
      || _fallback(k);
  }
  return out;
}

/** RELAY road: apply a `track` fan-out to an existing peer, in place.
 *  DELTA SEMANTICS ON PURPOSE — only keys the payload actually carries are
 *  written.  `track` omits a drawing entirely when the canvas is blank
 *  (v2.3.1939: "nobody who has not opened the designer pays a byte"), so
 *  treating an absent key as "cleared" would wipe every peer's drawings on
 *  their first relay.  The consequence, stated plainly: a drawing ERASED
 *  mid-session would not clear on peers' screens.  That is unreachable today
 *  (the designer is splash-only, see the header) and the fix when it becomes
 *  reachable is for the sender to relay an explicit null, not for this
 *  function to guess. */
export function applyPeerCosmetics(peer, wire) {
  if (!peer || !wire || typeof wire !== 'object') return peer;
  for (let i = 0; i < KEYS.length; i++) {
    const k = KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(wire, k)) continue;
    peer[PEER_COSMETIC_FIELDS[k]] = wire[k] || _fallback(k);
  }
  return peer;
}
