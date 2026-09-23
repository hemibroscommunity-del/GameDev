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
import { setArt, sanitizeArt, emptyArt } from '@/rendering/traits/playerArt.js';   /* v2.3.2690: + emptyArt, to clear a canvas the record does not have */
import { setPattern, sanitizePattern } from '@/rendering/traits/patternCatalog.js';
import { setEyeColor } from '@/rendering/traits/eyeColorCatalog.js';
import { setEyeStyle } from '@/rendering/traits/eyeStyleCatalog.js';   /* v2.3.2643 */
import { setSpecies } from '@/rendering/traits/speciesCatalog.js';   /* v2.3.2682 */

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
  sc: setSpecies,   /* v2.3.2682: the species.  Same guarantee as 'es': the setter refuses an id its catalog lacks, so a retired species falls back to the human.  Restoring it never touches 'sk' -- the skin rides its own key */
  es: setEyeStyle,   /* v2.3.2643: the eye STYLE, not the eye colour ('ec', in the drawings block below).  Same guarantee as 'ew': the setter refuses an id its catalog lacks, so a retired style falls back to the eyes the body sheets paint */
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

/* ═══ v2.3.2690: THE RECORD IS THE WHOLE LOOK, BLANKS INCLUDED ═══
   Owner: "Looks like there's a bug where every saved character has same face
   tattoo as one."

   These used to restore a drawing when the record had one and otherwise
   LEAVE THE CANVAS ALONE, on the reasoning that "an absent key means this
   character has no such drawing, and the canvas is already blank on the
   device this runs on."  The first half is right and is why this change is
   safe.  The second half stopped being true at v2.3.1923: a device holds up
   to ten characters now, and the canvases are ONE set in localStorage, so
   switching from a tattooed character to a plain one kept the tattoo -- on
   the owner's screen, in the join frame and on the relay, and so on everyone
   else's.

   The join frame omits a blank drawing (wsClient: "only sent when something
   is actually drawn"), so a character without one has NO key in its record
   rather than an empty one, and "absent" is the only way the record can say
   "blank".  So a missing or invalid value now CLEARS the canvas.  Drawings
   are made only in the creator, which is exactly where the record is written
   (join.js _loadOrCreateCharacter), so the record holds every drawing its
   character has -- with one known exception, a back tattoo or trouser back
   drawn before v2.3.2431 put them on the join frame, which was never saved
   and is cleared too (docs/specs/identity.md, "What it costs").  The worker
   enforces the same rule on what it relays (join.js _stampRecordLook). */
function _art(canvasId, v) {
  setArt(canvasId, sanitizeArt(v) || emptyArt());
}
function _pat(slot, v) {
  setPattern(slot, sanitizePattern(v, slot) || '');
}
/* ═══ v2.3.2690: WHAT A KEY THE RECORD DOES NOT HAVE MEANS ═══
   The same bug has a second door.  A record is written ONCE, at creation,
   from the keys the join frame carried THEN -- so a character made before eye
   colour (v2.3.1930), eyewear (2361), its colour (2424), eye styles (2643) or
   species (2682) has no such key at all, and "nothing to apply" left whatever
   this device held: on a device that has made a monkey, every older character
   walked in as a monkey.  None of
   those can have been picked for that character since (the creator only makes
   new characters), so the answer is the blank the creator's own Reset writes
   (BroTown resetLook): 'none' for a thing you wear, 'default' for a colour.
   The drawings and patterns take null, which their setters above turn into an
   empty canvas and no pattern.

   Every LOOK_SETTERS key has an entry -- precheck's look-blank check fails a
   push that adds a setter without one, and holds this table's keys equal to
   the worker's RECORD_LOOK_KEYS (join.js), which applies the same rule to
   what other players are sent. */
const LOOK_BLANK = {
  hw: 'none', fh: 'none', hr: 'none', ew: 'none', sc: 'none', es: 'none', st: 'none',
  sk: 'default', hc: 'default', htc: 'default', fhc: 'default', ewc: 'default',
  stc: 'default', pt: 'default', sh: 'default', ec: 'default',
  sa: null, sb: null, pa: null, pb: null, ta: null, tr: null, tf: null, tm: null, tb: null,
  sp: null, pp: null, fp: null,
};

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

   wpnMat -- the weapon's material is derived from the weapon you are holding
     (its gearBase), and the weapon lives in the rpg blob, which the worker
     restores authoritatively.  It rides the 2s relay from live state, so peers
     follow the weapon actually in your hand rather than a snapshot.  Found by
     the look-parity check below on its first run, which is the check working.

   hg/fr -- build height and frame are retired: both catalogs were emptied to
     a single entry (v2.3.1996, v2.3.2268), wireHeight/wireFrame answer
     undefined so no new record can carry them, and heightMul answers 1 for
     any id at all.  A legacy record's value renders identically for owner and
     peer, so there is nothing asymmetric left to fix. */
export const LOOK_UNRESTORED = {
  wpnMat: 'derived from the held weapon (rpg blob restores it)',
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
    /* v2.3.2690: a look key the record lacks is set to its BLANK, not left
       as this device had it -- see LOOK_BLANK.  Not counted in `n`: blanking
       is not applying, and `n` is how a caller tells a real record from an
       empty one. */
    if (v === undefined || v === null) {
      if (Object.prototype.hasOwnProperty.call(LOOK_BLANK, key)) {
        try { LOOK_SETTERS[key](LOOK_BLANK[key]); } catch (e) { /* a store that cannot write keeps what it has */ }
      }
      continue;
    }
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
