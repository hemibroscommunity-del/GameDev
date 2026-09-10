/* ═══ v2.3.1814: THE CHARACTER RECORD, CLIENT SIDE ═══
 *
 * Owner: "character selections in terms of names and traits picked during
 * login should be permanent.  When you load a character using the key it
 * should just bring you into the game not the login menu anymore."
 *
 * A character's look used to live ONLY in this client's trait catalogs —
 * module state, re-picked from scratch on every page load, and re-sent on
 * every join.  Two consequences the owner is asking to end: the creator ran
 * every single session because there was nothing to remember, and your face
 * was a property of the DEVICE rather than of the character, so a Login Key
 * carried your levels to a new phone and left your appearance behind.
 *
 * The record now lives on the worker against the identity (`char:<id>`, see
 * server/src/join.js) and a stored one WINS over whatever a client sends.
 * This module is the client half: one place that turns that wire record back
 * into the catalog selections the renderer reads.
 *
 * WHY ONE MODULE AND NOT TWO CALL SITES.  It is applied from two places —
 * the pre-game screen (deciding whether to skip the creator) and the
 * state_sync handler (a login on a fresh device, where the look exists
 * nowhere locally) — and those two disagreeing is exactly the bug that
 * would present as "my character looks right to everyone except me".
 */
import { setPants, setShoes, setSkin } from '@/rendering/playerSkins.js';
import { setFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { setFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { setEyewear } from '@/rendering/traits/eyewearCatalog.js';   /* v2.3.2361 */
import { setHair } from '@/rendering/traits/hairCatalog.js';
import { setHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { setHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { setEyewearColor } from '@/rendering/traits/eyewearColorCatalog.js';   /* v2.3.2424 */
import { setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { setShirt } from '@/rendering/traits/shirtCatalog.js';
import { setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
/* v2.3.2444: the drawings, the garment patterns and the eye colour.  All
   three stores are localStorage-backed and seed themselves at module boot, so
   on a new device they start blank -- which is the whole bug this adds. */
import { setArt, sanitizeArt } from '@/rendering/traits/playerArt.js';
import { setPattern, sanitizePattern } from '@/rendering/traits/patternCatalog.js';
import { setEyeColor } from '@/rendering/traits/eyeColorCatalog.js';

/* Wire key -> setter.  The keys are the join.data cosmetic abbreviations
   (JOIN_COSMETIC_KEYS in server/src/join.js) because the record is built
   from exactly that allowlisted copy — one vocabulary end to end, so there
   is no translation layer to drift.  Body colours and identity fields are
   handled separately below: they live on the game state, not in a catalog. */
const LOOK_SETTERS = {
  hw: setHeadwear,
  fh: setFacialHair,
  hr: setHair,
  sk: setSkin,
  hc: setHairColor,
  htc: setHatColor,
  fhc: setFacialHairColor,
  ew: setEyewear,   /* v2.3.2361: the setter refuses an id its catalog lacks, so a retired pair falls back to none */
  ewc: setEyewearColor,   /* v2.3.2424: beside htc, its exact counterpart -- a colour the pair no longer offers renders native (eyewearColorTarget), so a retired swatch cannot show a look the picker refuses */
  st: setShirt,
  stc: setShirtColor,
  pt: setPants,
  sh: setShoes,

  /* ═══ v2.3.2444: THE DRAWINGS, THE PATTERNS AND THE EYES ═══
     Measured: the worker keeps 38 keys in the permanent look and this table
     restored 13 of them, so twenty were read off the wire and thrown away --
     and every one of those twenty is a thing PEERS still see, because the
     stored look is forced onto the join frame (join.js) and the 2s relay is a
     delta MERGE that never clears what the new device omits.  That is the
     precise failure this file's header says it exists to prevent, and it had
     been true of every drawing since drawings shipped.

     Sharpest demonstration, inside one client and with no second player: the
     Continue screen paints its portrait from the stored look, so you can SEE
     your tattoo on the card, tap it, and walk into the world without it.

     Each value arrives over the wire, so each goes through the validator the
     PEER path already uses for the same key -- not through the raw setter.
     sanitizeArt is stricter than setArt's own guard in the way that matters:
     setArt accepts any well-formed 256-char string, and a string of 256 'f's
     is well-formed but paints nothing (the v2.3.1945 hazard), so the raw
     setter would persist an inkless drawing into this device's storage. */
  sa: (v) => _art('shirtFront', v),
  sb: (v) => _art('shirtBack', v),
  pa: (v) => _art('pants', v),
  pb: (v) => _art('pantsBack', v),
  ta: (v) => _art('tattoo', v),
  tr: (v) => _art('tattooBack', v),
  tf: (v) => _art('tattooFace', v),
  tm: (v) => _art('tattooArm', v),
  tb: (v) => _art('tattooHeadBack', v),

  sp: (v) => _pat('shirt', v),
  pp: (v) => _pat('pants', v),
  fp: (v) => _pat('shoes', v),

  ec: setEyeColor,
};

/* Restore one drawing, or leave the canvas alone.  Never CLEARS on a missing
   or invalid value: an absent key means "this character has no such drawing",
   and the canvas is already blank on the device this runs on. */
function _art(canvasId, v) {
  const a = sanitizeArt(v);
  if (a) setArt(canvasId, a);
}
function _pat(slot, v) {
  const p = sanitizePattern(v, slot);
  if (p) setPattern(slot, p);
}

/* ═══ v2.3.2444: THE KEYS THAT ARE STORED AND DELIBERATELY NOT RESTORED ═══
   The gap above was invisible because "not in LOOK_SETTERS" and "decided not
   to restore" looked identical.  They are different, so they are written down
   differently: this table is the second answer, with the reason, and
   precheck's look-parity check reads it -- a key that is on the worker's gate
   and in neither table now FAILS a push rather than quietly going missing.

   None of these is an oversight, and restoring any of them would be a bug:

   eqc/eql/eqs/eqst -- equipment layers are DERIVED, not chosen.  chest and
     legs are a pure function of the worn armour (gearCatalog's
     syncArmorLayers, from S.rpg.armor / legsArmor, which the rpg blob
     restores authoritatively), shoulders has only 'none' in its catalog, and
     shirt follows `st`, which IS restored above.  Replaying a look frozen at
     character creation over live gear would overwrite what the player is
     actually wearing.

   bs -- body size is a MenuBar toggle, not a creator trait, and it rides the
     2s relay from the owner's own store, so peers converge on the owner
     within one relay.  Restoring a frozen copy would fight the live toggle.

   hg/fr -- build height and frame are retired: both catalogs were emptied to
     a single entry (v2.3.1996, v2.3.2268), wireHeight/wireFrame answer
     undefined so no new record can carry them, and heightMul answers 1 for
     any id at all.  A legacy record's value renders identically for owner and
     peer, so there is nothing asymmetric left to fix. */
export const LOOK_UNRESTORED = {
  eqc: 'derived from worn armour (rpg blob restores it)',
  eql: 'derived from worn armour (rpg blob restores it)',
  eqs: 'catalog has only none',
  eqst: 'follows st, which is restored',
  bs: 'live MenuBar toggle, converges via the 2s relay',
  hg: 'retired axis, renders identically for everyone',
  fr: 'retired axis, renders identically for everyone',
};

/** True when the worker both supports permanent characters AND has one for
 *  this identity.  Takes the CAP AS A BOOLEAN rather than the caps object on
 *  purpose: server/test/caps-audit scans the client for a literal
 *  `_serverCaps.charLock` read and an advertised flag it cannot find a gate
 *  for is a failure — correctly, since a flag nobody reads gates nothing.
 *  Passing the object would have hidden the read inside this file and let the
 *  audit rot.  So the call site names the flag, and this stays a predicate.
 *  The cap matters as much as the record: against an old worker `char` is
 *  absent from state_sync entirely, and reading that as "no character" would
 *  send an existing player back through the creator with a blank bro. */
export function hasStoredCharacter(charLockCap, rec) {
  return !!(charLockCap && rec && rec.look);
}

/** Apply a stored record to the trait catalogs (and, if given the game
 *  state, the name and body colours).  Safe to call more than once.
 *  Returns the number of traits applied, so a caller can tell "applied an
 *  empty record" from "applied a real one" — the difference between a
 *  character with no hat and a record that failed to load. */
export function applyCharacterRecord(rec, S) {
  if (!rec || !rec.look) return 0;
  let n = 0;
  for (const key of Object.keys(LOOK_SETTERS)) {
    const v = rec.look[key];
    if (v === undefined || v === null) continue;
    /* Each setter is tried on its own.  A catalog that has since dropped an
       id (art retired between versions) throws for THAT trait only — the
       rest of the character still arrives, which is a far better failure
       than a blank bro.  Silent by design: this runs before the game loop,
       where there is no player-facing surface to report it to. */
    try { LOOK_SETTERS[key](v); n++; } catch (e) { /* retired id — skip the trait, keep the character */ }
  }
  if (S) {
    if (rec.name) S.myName = rec.name;
    if (rec.look.bt) S.bodyTorso = rec.look.bt;
    if (rec.look.bl) S.bodyLegs = rec.look.bl;
    if (rec.look.color) S.myColor = rec.look.color;
    if (rec.look.avatar) S.myAvatar = rec.look.avatar;
  }
  return n;
}

/* v2.3.1814 dev probe, house style (__btWorldProps): what the client
   believes about its own character.  mp-charlock reads it to tell "the
   creator was skipped because a record loaded" apart from "the creator was
   skipped because the screen is broken" — from the outside those look the
   same, and only one of them is the feature working. */
if (typeof window !== 'undefined') {
  window.__btCharRecord = () => (window.__btCharRecordVal || null);
}
export function publishCharRecord(rec) {
  if (typeof window !== 'undefined') window.__btCharRecordVal = rec || null;
}
