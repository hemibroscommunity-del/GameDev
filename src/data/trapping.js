/* ═══ v2.3.3108: PET TRAPPING — THE PHONE'S COPY OF THE TABLES ═══
 * Plan: docs/PET-TRAPPING-PLAN.md.  Spec: docs/specs/trapping.md.
 *
 * The worker decides everything (server/src/trapping.js, petbook.js): whether
 * an arm is allowed, every roll, every catch, every name.  This copy is what
 * the phone SHOWS before it asks -- the odds on the TRAP button, "Requires
 * Trapping 18" on a grey one, the Traps tab's rows, a name the Pets page will
 * not send -- so it has to say exactly what the worker will do.
 * server/test/mirror-audit.test.mjs holds the two copies together: the odds
 * at every level pair, the XP, the recipe, the kinds and the name rule.
 *
 * No imports, so node can test it. */

export const TRAPPING = Object.freeze({
  TRAP: 'trap_box',
  LEGACY_TRAP: 'basic_trap',
  LOGS: Object.freeze({
    wood_pine_log: 1,
    wood_softwood: 1,
    wood_hardwood: 1,
    wood_cedar_wood: 1,
    wood_maple_wood: 1,
  }),
  MAKE_XP: 40,
  MAX_PER_REQUEST: 50,
  MARK_MS: 15000,
  ARM_RANGE: 480,
  MIN_SHARE: 0.05,
  BEST: 0.01,
  STRETCH_MULT: 0.8,
  STRETCH_LEVELS: 5,
  START_FRAC: 0.5,
  RISE_LEVELS: 20,
  CHECKS: 4,
  XP_K: 25,
  FAR_FROM: 20,
  FAR_STEP: 0.03,
  FAR_MIN: 0.25,
  CATCH_XP_MULT: 10,
});

/** The stretch a monster's level is in: 1 for levels 1-5, 2 for 6-10, ... */
export function trapStretch(monLvl) {
  const L = Math.max(1, Math.floor(Number(monLvl) || 1));
  return Math.ceil(L / TRAPPING.STRETCH_LEVELS);
}

export function trapBestChance(stretch) {
  const s = Math.max(1, Math.floor(Number(stretch) || 1));
  return TRAPPING.BEST * Math.pow(TRAPPING.STRETCH_MULT, s - 1);
}

/** The chance a roll catches; 0 when the monster is above your Trapping. */
export function trapChance(trapLvl, monLvl) {
  const T = Math.max(1, Math.floor(Number(trapLvl) || 1));
  const M = Math.max(1, Math.floor(Number(monLvl) || 1));
  if (M > T) return 0;
  const rise = Math.min(1, TRAPPING.START_FRAC + (1 - TRAPPING.START_FRAC) * (T - M) / TRAPPING.RISE_LEVELS);
  return trapBestChance(trapStretch(M)) * rise;
}

export function trapXpBase(stretch) {
  const s = Math.max(1, Math.floor(Number(stretch) || 1));
  const tier = 1 + TRAPPING.STRETCH_LEVELS * (s - 1);
  return Math.ceil((tier * 1.5 + 5) * TRAPPING.XP_K);
}

export function trapRollXp(stretch, gap) {
  const g = Math.max(0, Math.floor(Number(gap) || 0));
  const far = g <= TRAPPING.FAR_FROM ? 1 : Math.max(TRAPPING.FAR_MIN, 1 - (g - TRAPPING.FAR_FROM) * TRAPPING.FAR_STEP);
  return Math.max(1, Math.round(trapXpBase(stretch) * far));
}

export function trapCatchXp(stretch) {
  return trapXpBase(stretch) * TRAPPING.CATCH_XP_MULT;
}

/** "1%", "0.5%", "0.26%": the true chance, as the button shows it -- two
 *  significant figures, rounded to the nearest (the plan's table). */
export function fmtTrapChance(chance) {
  const p = Math.max(0, Number(chance) || 0) * 100;
  if (!(p > 0)) return '0%';
  const digits = Math.max(0, 1 - Math.floor(Math.log10(p)));
  const f = Math.pow(10, digits);
  return String(Math.round(p * f) / f) + '%';
}

/* ═══ THE NINE KINDS ═══
 * Each land's monsters, tamed.  `home` and `look` are the worker's
 * (server/src/petbook.js PET_KINDS); the names are the phone's -- the second
 * stage's go with the Wheel's recoloured monsters past level 20
 * (src/data/wheelStageLooks.js).  `el` is the element the land's hits carry
 * (server/src/monsterstatus.js), which the ward will take the edge off. */
export const PET_KINDS = Object.freeze({
  snowling: Object.freeze({ home: 'frost', look: 'snowman', el: 'frost', name: 'Snowling', name2: 'Glacier Snowling' }),
  gobling: Object.freeze({ home: 'ember', look: 'fireGoblin', el: 'flame', name: 'Gobling', name2: 'Cinder Gobling' }),
  mumling: Object.freeze({ home: 'sky', look: 'mummy', el: 'wind', name: 'Mumling', name2: 'Gilded Mumling' }),
  pebbling: Object.freeze({ home: 'hollows', look: 'rockmonster', el: 'stone', name: 'Pebbling', name2: 'Amethyst Pebbling' }),
  sparklet: Object.freeze({ home: 'thunder', look: 'fodder', el: 'storm', name: 'Sparklet', name2: 'Storm Sparklet' }),
  finling: Object.freeze({ home: 'tidal', look: 'fishman', el: 'water', name: 'Finling', name2: 'Coral Finling' }),
  wisplet: Object.freeze({ home: 'mist', look: 'mireWisp', el: 'venom', name: 'Wisplet', name2: 'Spectral Wisplet' }),
  lurkling: Object.freeze({ home: 'mist', look: 'bogLurker', el: 'venom', name: 'Lurkling', name2: 'Shade Lurkling' }),
  dewdrop: Object.freeze({ home: 'verdant', look: 'blueSlime', el: 'flora', name: 'Dewdrop', name2: 'Jade Dewdrop' }),
});

/** The kind a Wheel monster would become (the worker's petKindOf).  `m` is
 *  the phone's monster: `home`, and the look it spawned as (`variant`, else
 *  `archetype`/`type`). */
export function petKindOfMonster(m) {
  const home = m && typeof m.home === 'string' ? m.home : '';
  const look = (m && (m.variant || m.spawnVariant)) || '';
  const arch = (m && (m.arch || m.archetype)) || '';
  switch (home) {
    case 'frost': return 'snowling';
    case 'ember': return 'gobling';
    case 'sky': return 'mumling';
    case 'hollows': return 'pebbling';
    case 'thunder': return 'sparklet';
    case 'tidal': return 'finling';
    case 'mist': return (look === 'bogLurker' || (!look && arch === 'brute')) ? 'lurkling' : 'wisplet';
    case 'verdant': return 'dewdrop';
    default: return null;
  }
}

/** A pet's stage-coloured kind name ("Gobling", "Cinder Gobling"). */
export function petKindName(kind, stage) {
  const k = kind && Object.prototype.hasOwnProperty.call(PET_KINDS, kind) ? PET_KINDS[kind] : null;
  if (!k) return 'Pet';
  return Number(stage) >= 2 ? k.name2 : k.name;
}

/** What to call a pet: its own name, else its kind's. */
export function petDisplayName(pet) {
  if (!pet) return '';
  return (typeof pet.name === 'string' && pet.name) ? pet.name : petKindName(pet.kind, pet.stage);
}

/** A pet's size badge: Big from 1.18 (server PETBOOK.BIG_AT). */
export const PET_BIG_AT = 1.18;

/** A pet works at your Trapping level until you catch up with it (a traded
 *  pet above you keeps its own level for when you do). */
export function petEffectiveLevel(pet, trapLvl) {
  const lv = Math.max(1, Math.floor(Number(pet && pet.lv) || 1));
  const T = Math.max(1, Math.floor(Number(trapLvl) || 1));
  return Math.min(lv, T);
}

/* ═══ A NAME — the worker's rule exactly (server/src/petbook.js) ═══
 * 2-16 letters, numbers, spaces, hyphens or apostrophes; no emoji (an emoji in
 * the world's outlined text is a known iPhone Safari crash). */
export const PET_NAME = Object.freeze({ MIN: 2, MAX: 16 });
export function cleanPetName(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return null;
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < PET_NAME.MIN || s.length > PET_NAME.MAX) return null;
  if (!/^[\p{L}\p{N} '-]+$/u.test(s)) return null;
  if (!/[\p{L}\p{N}]/u.test(s)) return null;
  return s;
}

/* What each refusal says, in the game's words.  Keyed by the worker's codes
   (trapping.js / petbook.js). */
export const TRAP_WORDS = Object.freeze({
  off: 'Trapping is resting for now',
  'not-now': 'Not right now',
  'not-here': 'Traps work out in the lands',
  'no-monster': 'Nothing to trap there',
  'safe-ground': 'No trapping on safe ground',
  'too-far': 'Get closer to set a trap',
  level: 'Your Trapping level is too low',
  'no-trap': 'You need a box trap (Woodworker)',
  'pets-unavailable': 'Your pets are not ready yet',
  'pets-full': 'Your collection is full',
  'catch-cap': 'Your traps need a rest',
  'too-fast': 'Slow down a little',
  share: 'You had to help kill it',
  'bad-log': 'That is not a log',
  'no-logs': 'You need a log for each trap',
  'no-pet': 'That pet is not yours',
  'bad-name': 'Names are 2-16 letters, numbers or spaces',
  confirm: 'Tap again to confirm',
});
