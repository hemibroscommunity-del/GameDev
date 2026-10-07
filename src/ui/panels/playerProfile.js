/* ═══ v2.3.2926: THE PLAYER PROFILE — ONE SHAPE FOR THE INSPECT CARD ═══
 *
 * Owner, with a second mockup and a written direction: "This is the direction
 * I'm going ... I plan to add somewhere you can view this screen for your
 * character too."  The direction asks for the card to be DATA-DRIVEN -- one
 * profile object, the layout only reading it -- so that
 *   1. the same card shows another player OR yourself (profileFromPeer /
 *      profileFromSelf build the identical shape), and
 *   2. each placeholder below can be swapped for its real system when that
 *      lands, without touching PlayerProfilePanel's layout.
 *
 * REAL, wherever the game already knows it:
 *   name, level, verified Hemi Bro, friend / party, achievement points,
 *   quests completed, clan (tag, name, colour), the three trained combat
 *   levels, all six equipment slots, lifetime kills, the active pet, and how
 *   many farm plots are ready.
 * PLACEHOLDER, only where the game has no such system yet (PROFILE_PREVIEW):
 *   the equipped title, the rarest drop, the Homestead picture, and a sample
 *   pet for a player who has none.  The owner's direction allows exactly
 *   these ("Demo placeholders are acceptable").  Every one is marked
 *   `preview: true`, which the card renders as data-preview="1" -- so a QA
 *   run, or the next session, can find every stand-in on the screen.
 * NEVER A PLACEHOLDER: the clan.  Clans are a real, joinable system, so a
 *   made-up "Frost Bros" on someone who is in no clan would send people
 *   looking for a clan that does not exist.  No clan reads "No Clan", as the
 *   direction asks.  Numbers are never invented either: a count the game
 *   keeps shows the real count, 0 included.
 *
 * WHERE ANOTHER PLAYER'S NUMBERS COME FROM: their `rpgData`, the display blob
 * their client relays every 2s (BroTown.jsx "Extended RPG data for inspect
 * card"; server/src/index.js admits it as a bounded nested object on the
 * `track` road, TRACK_BLOB_MAX_BYTES).  It is CLIENT-REPORTED -- a picture of
 * the player, never a fact to settle anything on -- and it is ABSENT for the
 * first ~2s after they join and while their tab is backgrounded.  Until it
 * lands every number here is null, and the card draws a dash rather than a 0
 * it does not know.  v2.3.2926 adds four fields to the blob for this card
 * (profileRelayFields below); a peer on an older client simply lacks them,
 * and the same null -> dash rule covers it. */

import { prog3HasSkills, prog3SkillLevel } from '@/data/prog3.js';
import { farmBus } from '@/ui/mobile/farmBus.js';   /* v2.3.3127: the worker's farm */
import { activePet } from '@/game/petBook.js';   /* v2.3.3120 */
import { PET_KINDS, petKindName, petDisplayName, worldSafeText } from '@/data/trapping.js';   /* v2.3.3120 */
import { getEquippedSlots, peerEquippedSlots } from '../mobile/sheet/equipModel.js';

/* Pet rarity, from the owner's direction: "White Normal, Blue Rare, Orange
   Elite, Prismatic Godly".  The game has no pet rarity yet, so every real pet
   is Normal until it does; the sample pet is Rare so the colour shows. */
export const PET_RARITY = Object.freeze({
  normal: { label: 'Normal', color: '#F4F0E7' },
  rare: { label: 'Rare', color: '#5CB8FF' },
  elite: { label: 'Elite', color: '#F59A3C' },
  godly: { label: 'Godly', color: null /* prismatic: a CSS gradient, .is-godly */ },
});

/* The owner's mockup content, for the systems that do not exist yet.  One
   object, so removing a placeholder when its system ships is one edit. */
export const PROFILE_PREVIEW = Object.freeze({
  title: { text: 'Fishing Master', iconSrc: '/icons/ui/skill-fishing.webp', preview: true },
  rarestDrop: { name: 'Ancient Ember Crown', rarity: 'Mythic', art: 'crown', preview: true },
  pet: { customName: 'Glacier', speciesName: 'Frost Fox', rarity: 'rare', emoji: '🦊', preview: true },
  /* the farm zone's own art -- since v2.3.3124 the farmstead drawn as the
     game draws it -- by tools/ui/make-homestead-preview.mjs */
  homesteadSrc: '/icons/ui/homestead-preview.webp',
});

const COMBAT_CATS = [['melee', 'sword'], ['bow', 'bow'], ['staff', 'staff']];

/** A finite number, or null -- "not known" must never read as 0. */
function num(v) {
  return (typeof v === 'number' && isFinite(v)) ? v : null;
}

function titleCase(s) {
  return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()).trim();
}

/** How many farm plots are ready to harvest (FarmPanel's own ready test). */
export function farmPlotsReady(lifeSkills, nowSec) {
  /* v2.3.3127: the WORKER's farm once this tab has heard about it (farmBus:
     on join, or the Feed & Seed window) -- ripe by the worker's clock.  The
     browser-only plots below are only a farm against an old worker. */
  if (farmBus.view && typeof nowSec !== 'number') return farmBus.ripeCount();
  const plots = lifeSkills && lifeSkills.farmPlots;
  if (!plots || typeof plots !== 'object') return 0;
  const t = typeof nowSec === 'number' ? nowSec : Date.now() / 1000;
  let n = 0;
  for (const k of Object.keys(plots)) {
    const p = plots[k];
    if (p && p.plantedAt && t >= p.plantedAt + (p.growTime || 0)) n++;
  }
  return n;
}

/* v2.3.3120: the pet out with you is the pets RECORD's (game/petBook.js
   activePet); the old lifeSkills pair only against an old worker. */
function activePetOf(R, S) {
  if (S) return activePet(S);
  const ls = R && R.lifeSkills;
  const i = ls ? ls.activePet : null;
  return (i != null && Array.isArray(ls.pets)) ? (ls.pets[i] || null) : null;
}

/* What a card says about a pet, from the record's shape or the old one. */
function petCardOf(pet) {
  if (!pet) return null;
  if (pet.kind && Object.prototype.hasOwnProperty.call(PET_KINDS, pet.kind)) {
    return {
      customName: worldSafeText(petDisplayName(pet)) || 'Pet',
      speciesName: petKindName(pet.kind, pet.stage),
      rarity: pet.gold ? 'godly' : 'normal',
      emoji: '🐾',
      kind: pet.kind, stage: num(pet.stage) || 1, gold: pet.gold === true,
      level: num(pet.lv) || 1,
      preview: false,
    };
  }
  return {
    customName: pet.name || 'Pet',
    speciesName: pet.archetype ? titleCase(pet.archetype) : null,
    rarity: 'normal',
    emoji: pet.emoji || '🐾',
    level: num(pet.level),
    preview: false,
  };
}

/** The fields this card adds to the 2s rpgData relay (BroTown.jsx builds the
 *  rest).  Short and flat on purpose: the blob rides every relay, to every
 *  player, every two seconds.  Each is omitted rather than zeroed when there
 *  is nothing to say, so a peer reading it can tell "none" from "old client". */
export function profileRelayFields(R, S) {
  const out = {};
  if (!R) return out;
  /* the three trained levels (prog3), read the way the stat screen reads them */
  if (prog3HasSkills(R)) {
    out.combat = { melee: prog3SkillLevel(R, 'sword'), bow: prog3SkillLevel(R, 'bow'), staff: prog3SkillLevel(R, 'staff') };
  }
  const pet = activePetOf(R, S);
  if (pet) {
    const c = petCardOf(pet);
    out.petInfo = {
      name: String(c.customName || '').slice(0, 24),
      species: String(c.speciesName || '').slice(0, 24),
      level: c.level || 1,
      /* v2.3.3120: what it is, so a peer's card draws its picture */
      ...(c.kind ? { kind: c.kind, stage: c.stage, gold: c.gold } : {}),
    };
  }
  out.farmReady = farmPlotsReady(R.lifeSkills);
  /* the SERVER's kill count (combat.js _resolveMonsterKill) when the worker
     sends it -- the number the Hero sheet's Record shows, so your card and
     your own sheet cannot disagree */
  if (typeof R.svKills === 'number') out.svKills = R.svKills;
  return out;
}

function petFromRelay(info, emoji) {
  if (info && typeof info === 'object') {
    /* v2.3.3120: a peer's word, shown only (never in the world's outlined
       text, and a kind we do not know is no kind) */
    const kind = typeof info.kind === 'string' && Object.prototype.hasOwnProperty.call(PET_KINDS, info.kind) ? info.kind : null;
    return {
      customName: typeof info.name === 'string' && info.name ? worldSafeText(info.name).slice(0, 24) || 'Pet' : 'Pet',
      speciesName: kind ? petKindName(kind, info.stage) : (info.species ? titleCase(info.species) : null),
      rarity: info.gold === true ? 'godly' : 'normal',
      emoji: emoji || '🐾',
      ...(kind ? { kind, stage: num(info.stage) || 1, gold: info.gold === true } : {}),
      level: num(info.level),
      preview: false,
    };
  }
  /* an older client relays only the emoji */
  if (typeof emoji === 'string' && emoji) {
    return { customName: 'Pet', speciesName: null, rarity: 'normal', emoji, level: null, preview: false };
  }
  return null;
}

/**
 * Another player.  `ip` is the snapshot the card was opened with; `live` is
 * their current S.others entry (null once they leave), read on every refresh
 * so the numbers fill in when their relay lands.  `rel` is { friend, party }.
 */
export function profileFromPeer(ip, live, rel) {
  const snap = ip || {};
  const o = live || snap;
  const rd = (o.rpgData && typeof o.rpgData === 'object') ? o.rpgData
    : (snap.rpgData && typeof snap.rpgData === 'object') ? snap.rpgData : null;
  const has = !!rd;
  const r = rd || {};
  /* ONLY the tag the WORKER stamps (clans.js _clanStampTag), never the
     client-reported copy in rpgData: the stamp is how the server stops a
     player wearing a clan they are not in ("This is what kills forgery"),
     and rpgData rides the relay unstamped.  The NAME is only in rpgData, so
     it is shown only when that blob agrees with the stamped tag. */
  const tag = o.clanTag || snap.clanTag || null;
  const cb = r.combat && typeof r.combat === 'object' ? r.combat : null;
  const bro = o.bro || snap.bro || null;
  return {
    isSelf: false,
    loaded: has,
    id: snap.id,
    name: o.name || snap.name || 'Player',
    color: o.color || snap.color || null,
    characterLevel: num(o.rpgLv) || num(snap.rpgLv),
    isHemiBroVerified: !!bro,
    broTokenId: bro,
    relationship: { friend: !!(rel && rel.friend), party: !!(rel && rel.party) },
    achievementPoints: has ? num(r.ap) : null,
    questsCompleted: has ? num(r.quests) : null,
    equippedTitle: PROFILE_PREVIEW.title,
    clan: tag ? {
      tag,
      name: (r.clanTag === tag && typeof r.clanName === 'string' && r.clanName) ? r.clanName : null,
      color: o.clanColor1 || snap.clanColor1 || null,
    } : null,
    combat: cb ? { melee: num(cb.melee), bow: num(cb.bow), staff: num(cb.staff) } : null,
    equipment: peerEquippedSlots(o),
    showcase: {
      lifetimeKills: has ? (num(r.svKills) != null ? num(r.svKills) : num(r.kills)) : null,
      rarestDrop: PROFILE_PREVIEW.rarestDrop,
    },
    /* nothing until the blob lands (a 2s gap -- the sample pet would be a
       claim about a player we have not heard from yet); then their real pet,
       or the sample */
    /* v2.3.3120: their real pet, or none -- not the sample Frost Fox every
       player without a pet used to show */
    pet: has ? petFromRelay(r.petInfo, o.pet || snap.pet) : null,
    homestead: { previewSrc: PROFILE_PREVIEW.homesteadSrc, plotsReady: has ? num(r.farmReady) : null },
  };
}

/** You.  Read straight from your own state, so it is always loaded. */
export function profileFromSelf(S) {
  const R = (S && S.rpg) || {};
  const cs = R._compStats || {};
  const clan = S && S._clanData;
  const pet = activePetOf(R, S);
  const combat = {};
  for (const [key, cat] of COMBAT_CATS) combat[key] = prog3SkillLevel(R, cat);
  return {
    isSelf: true,
    loaded: true,
    id: S && S.myId,
    name: (S && S.myName) || 'You',
    color: (S && S.myColor) || null,
    characterLevel: num(R.level),
    isHemiBroVerified: !!R._bro,
    broTokenId: R._bro || null,
    relationship: null,
    achievementPoints: num(R.achievementPoints) || 0,
    questsCompleted: num(cs.questsCompleted) || 0,
    equippedTitle: PROFILE_PREVIEW.title,
    clan: clan && clan.tag ? { tag: clan.tag, name: clan.name || null, color: clan.color1 || null } : null,
    combat,
    equipment: getEquippedSlots(R).map((s) => ({
      slot: s.slot, label: s.label, iconSrc: s.iconSrc, ghost: !!s.ghost,
      name: (s.item && typeof s.item.name === 'string') ? s.item.name : null,
    })),
    showcase: {
      lifetimeKills: num(R.svKills) != null ? R.svKills : (num(cs.monstersKilled) || 0),
      rarestDrop: PROFILE_PREVIEW.rarestDrop,
    },
    pet: petCardOf(pet),   /* v2.3.3120: yours, or none (was the sample Frost Fox) */
    homestead: { previewSrc: PROFILE_PREVIEW.homesteadSrc, plotsReady: farmPlotsReady(R.lifeSkills) },
  };
}

/** 12800 -> "12.8K", the mockup's compact count; exact below 10,000. */
export function compactCount(n) {
  if (n == null) return '–';
  if (n < 10000) return Number(n).toLocaleString('en-US');
  if (n < 1e6) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'K';
  return (Math.floor(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '') + 'M';
}
