/* ═══ v2.3.3111: PET TRAPPING — THE PHONE'S COPY OF THE TABLES ═══
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
 * Plain data, so node can test it (its one import is plain data too). */
import { WHEEL_STAGE_LOOKS, WHEEL_STAGE_DEFAULT } from './wheelStageLooks.js';

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

/** The kind an OLD pet (lifeSkills.pets, before v2.3.3111) most likely was --
 *  the worker's oldPetKind (server/src/petbook.js), for drawing an old pet
 *  against an old worker.  Its element names its land; the archetype splits
 *  the Poison Forest's two and stands in when the element was lost. */
export function petKindOfOld(p) {
  const el = p && typeof p.element === 'string' ? p.element : '';
  const arch = p && typeof p.archetype === 'string' ? p.archetype : '';
  const BY_EL = { frost: 'snowling', flame: 'gobling', wind: 'mumling', stone: 'pebbling', storm: 'sparklet', water: 'finling', flora: 'dewdrop' };
  const BY_ARCH = { snowman: 'snowling', brute: 'pebbling', stalker: 'mumling', hexer: 'mumling', volatile: 'mumling' };
  if (el === 'venom') return arch === 'brute' ? 'lurkling' : 'wisplet';
  if (Object.prototype.hasOwnProperty.call(BY_EL, el)) return BY_EL[el];
  if (Object.prototype.hasOwnProperty.call(BY_ARCH, arch)) return BY_ARCH[arch];
  return 'dewdrop';
}

/** Text that may be drawn in the WORLD's outlined type: no emoji or other
 *  pictographs (the iPhone Safari crash, nodeLabels.js).  A name the worker
 *  cleaned is already safe; an old pet's may not be. */
export function worldSafeText(s) {
  return typeof s === 'string' ? s.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').trim() : '';
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

/* ═══ WHAT A PET LOOKS LIKE ═══
 * Each kind is drawn from one row of the pet sheet (src/data/petSheet.js,
 * GENERATED by tools/make_pet_sheet.py from the monsters' own walk art) in its
 * monster's colour: the Poison Forest's two are reskins (src/data/
 * monsterVariants.js mireWisp, bogLurker: a slime tinted violet, a fishman
 * tinted murk), the blue slime's recolour is baked into its row.  A second-
 * stage pet wears the Wheel's stage-two colour of its look, in PLACE of its
 * own (wheelStageLooks.js: violet x cyan would be black), and a golden one
 * gold -- sprite tints, so no colour costs memory. */
export const PET_ART = Object.freeze({
  snowling: Object.freeze({ base: 'snowman', tint: 0xffffff }),
  gobling: Object.freeze({ base: 'fireGoblin', tint: 0xffffff }),
  mumling: Object.freeze({ base: 'mummy', tint: 0xffffff }),
  pebbling: Object.freeze({ base: 'rockmonster', tint: 0xffffff }),
  sparklet: Object.freeze({ base: 'slime', tint: 0xffffff }),
  finling: Object.freeze({ base: 'fishman', tint: 0xffffff }),
  wisplet: Object.freeze({ base: 'slime', tint: 0x7a5fa8 }),
  lurkling: Object.freeze({ base: 'fishman', tint: 0x5f7a5a }),
  dewdrop: Object.freeze({ base: 'blueSlime', tint: 0xffffff }),
});
export const PET_GOLD_TINT = 0xffd86b;

/** The sprite tint a pet is drawn in. */
export function petTint(pet) {
  if (!pet) return 0xffffff;
  if (pet.gold === true) return PET_GOLD_TINT;
  const kind = pet.kind && Object.prototype.hasOwnProperty.call(PET_ART, pet.kind) ? pet.kind : null;
  if (!kind) return 0xffffff;
  const stage = Math.floor(Number(pet.stage) || 1);
  if (stage >= 2) {
    const table = Object.prototype.hasOwnProperty.call(WHEEL_STAGE_LOOKS, stage) ? WHEEL_STAGE_LOOKS[stage] : null;
    const look = PET_KINDS[kind].look;
    if (table && Object.prototype.hasOwnProperty.call(table, look)) return table[look].tint;
    if (table) return WHEEL_STAGE_DEFAULT.tint;
  }
  return PET_ART[kind].tint;
}

/** How much bigger a pet is drawn for its level: a little, up to a fifth. */
export function petLevelScale(lv) {
  return 1 + Math.min(0.2, Math.max(0, (Math.floor(Number(lv) || 1) - 1) * 0.005));
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
