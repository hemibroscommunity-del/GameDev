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
import { setHair } from '@/rendering/traits/hairCatalog.js';
import { setHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { setHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { setShirt } from '@/rendering/traits/shirtCatalog.js';
import { setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';

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
  st: setShirt,
  stc: setShirtColor,
  pt: setPants,
  sh: setShoes,
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
