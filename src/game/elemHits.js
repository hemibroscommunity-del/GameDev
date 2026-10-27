/* ═══ v2.3.2996: WHAT A MONSTER'S ELEMENT DOES TO YOU ═══
 *
 * Owner, 2026-10-03: "eventually I want elemental damage per monster type so
 * using a snowflake icon for instance when hit by a snowman's snowball and
 * slowing down for a second or having burning tick damage from a fire goblin
 * with a fire icon as the damage type.  From desert winds mummy an air icon
 * that blows the character back."  And: "Yeah and slime for floral damage.
 * You can [use] a brief held in place effect".
 *
 * The worker decides all of it (server/src/monsterstatus.js) and says so on
 * the hit's monster_attack: `elem` (the damage type -- the icon), `st` (what
 * it did), `stMs` (for how long) and `kb` (a gust's shove).  This module is
 * the client's half, and it acts ONLY on those fields -- never on a monster's
 * element it looked up for itself -- so a client never slows, holds or shoves
 * itself against a worker that did not:
 *
 *   chill  (frost, the snowman)     you walk at CHILL_MULT          S._chillUntil
 *   burn   (flame, the fire goblin) the worker's ticks; a look here S._burnUntil
 *   gust   (wind, the mummies)      shoved `kb` over `stMs`         S._gust
 *   stuck  (flora, the blue slime)  held in place, no roll          S._stuckUntil
 *
 * BroTown.jsx reads elemMoveMult() into the walk and carries gustStep() out
 * with the ice slide's collision; game/dodge.js asks isStuck() before a roll;
 * effectsRenderer draws the look (frost at the feet, goo, flames, the wind);
 * gameEvents.js puts the element's icon on the number.  No imports, so the
 * server's mirror-audit.test.mjs can read CHILL_MULT and the tables here.
 *
 * ═══ v2.3.3014: AND THE OTHER FOUR ═══
 * "stone stuns briefly; storm shocks nearby players; water slows stamina
 * refill; venom poisons over time" -- the owner: "Yes continue working on
 * those items":
 *
 *   daze   (stone, the rock monster)  no walk, swing, roll or shield  S._dazeUntil
 *   shock  (storm, the Storm Peaks')  the crackle; the arcs the worker
 *                                     sent to whoever stood near      S._shockUntil
 *   soak   (water, the fishman)       the worker refills your stamina
 *                                     slower; the drips are a look    S._soakUntil
 *   poison (venom, the Mire's)        the worker's ticks; a look      S._poisonUntil
 *
 * The daze is carried out like the hold: elemMoveMult() is 0, and
 * combatHelpers.dazeRefused() turns down a swing, a special, an ability, a
 * roll and the shield, saying "Dazed!".
 *
 * ═══ v2.3.3264: AND WHAT A PLAYER'S GEM DOES TO YOU ═══
 * Owner: "Yes the monster only extras should work on players too" -- a hit
 * from a player's enchanted weapon puts the gem's status on you, in the same
 * words on the same fields (server/src/pvpextras.js), on a pvp_hit:
 *   burn (flame), stuck (venom's root, a slime's hold), daze (frost's freeze,
 *   a rock's daze), soak (water), shock (storm: the crackle) -- the words above
 *   -- and three a monster never puts on a player:
 *   slow      (wind)   you walk at the hit's `mult` (SLOW_MULT)  S._slowUntil
 *   fracture  (stone)  you take +6% a stack, `stacks`            S._fractureUntil
 *   thorn     (flora)  attacking bites you back                  S._thornUntil
 * An ability's SHOVE (a bash's, a whirlwind's pull) rides as `kb` without a
 * gust's `st` (applyHitShove: the gust's shove, no wind drawn) -- an ordinary
 * hit on a player shoves nothing (docs/specs/one-formula.md "Not on players
 * yet") -- and a parry STAGGERS whoever it caught --
 * no swing, special, ability or burst for the parry's `ms` (isStaggered,
 * combatHelpers.staggerRefused).
 *
 * ═══ v2.3.3620: THE OWNER'S STRONGER HITS ═══
 * (server/src/monsterstatus.js FREEZE, GOO, STING, WOBBLE; each its own kill
 * switch on the worker, which then simply stops sending the field):
 *   a snowman's chill with `fz`: FROZEN that long first -- no walk, swing,
 *     special, ability, roll or shield, as the daze (isDazed answers for it,
 *     dazeRefused says "Frozen!") -- with ice on you; then the chill's slow
 *                                                           S._frozenUntil
 *   a rock monster's daze with `wb`: after the daze, your steering WOBBLES
 *     that long -- the stick's way turned to and fro (wobbleTurn, BroTown's
 *     walk)                                       S._wobbleFrom / _wobbleUntil
 *   a slime's hold is GOO.MS long now (the same `stuck`), and its STING ticks
 *     arrive as monster_attack `ability: 'sting'` -- a tick, not a blow
 *     (tickKind: the poison's sparks and sound), the leaf on the number.
 */

/* The walk while chilled.  MIRROR: server/src/monsterstatus.js CHILL.MULT
   (mirror-audit.test.mjs pins the pair; the worker never reads it). */
export const CHILL_MULT = 0.55;

/* Each element's look on a hit: its icon (effectsRenderer POPUP_ICON_SRC
   keys) and its colour, for the effects drawn round you. */
export const ELEM_LOOK = {
  frost: { icon: 'elem-frost', color: '#9fd8ff' },
  flame: { icon: 'elem-flame', color: '#ff9a3c' },
  wind: { icon: 'elem-wind', color: '#e6edf3' },
  /* v2.3.3044: the LEAF, the floral element's own icon.  v2.3.2996 read the
     owner's "slime for floral damage" as "draw the slime" and used its loot
     splat; the owner, seeing it: "Slime attack for combat messages should be
     floral icon.  I think we're using leaf for that.  Right now it's just the
     slime remnant sprite which is wrong." */
  flora: { icon: 'elem-flora', color: '#8be36a' },
  /* v2.3.3014 */
  stone: { icon: 'elem-stone', color: '#c9b48a' },
  storm: { icon: 'elem-storm', color: '#f5e663' },
  water: { icon: 'elem-water', color: '#5fb8ff' },
  venom: { icon: 'elem-venom', color: '#a6e24a' },
};

/* Where each icon is, for effectsRenderer's popup icons and the status chips.
   mirror-audit.test.mjs checks every file is in public/. */
export const ELEM_ICON_SRC = {
  'elem-frost': '/icons/ui/elem-frost.webp',
  'elem-flame': '/icons/ui/elem-flame.webp',
  'elem-wind': '/icons/ui/elem-wind.webp',
  'elem-flora': '/icons/ui/elem-flora.webp',   /* v2.3.3044: was the slime's splat (slime-remnants.webp) */
  /* v2.3.3014 */
  'elem-stone': '/icons/ui/elem-stone.webp',
  'elem-storm': '/icons/ui/elem-storm.webp',
  'elem-water': '/icons/ui/elem-water.webp',
  'elem-venom': '/icons/ui/elem-venom.webp',
};

/* The statuses this client carries out.  MIRROR: the values of
   server/src/monsterstatus.js ELEM_HITS, and since v2.3.3264 pvpextras.js
   PVP_STATUSES (mirror-audit.test.mjs). */
export const ELEM_STATUSES = ['chill', 'burn', 'gust', 'stuck', 'daze', 'shock', 'soak', 'poison', 'slow', 'fracture', 'thorn'];

/* v2.3.3264: a wind gem's slow, when the wire says no `mult`.  MIRROR:
   server/src/pvpextras.js PVP_EXTRAS.SLOW_MULT (mirror-audit.test.mjs) --
   a monster's slow (elemental.js elementMoveMult). */
export const SLOW_MULT = 0.4;

/* v2.3.3264: how long a blow's shove takes to carry out (the gust's own
   shove is GUST.MS, on the wire as stMs). */
const KB_MS = 180;

/* v2.3.3620: a freeze and a wobble the wire says are held to these (the
   worker's are 600 and 1000 ms) */
const MAX_FREEZE_MS = 2000;
const MAX_WOBBLE_MS = 3000;
/* how far, and how quickly, a wobble turns your steering: up to WOBBLE_ANG
   either way, a full sway every WOBBLE_PERIOD_MS, easing off as it ends */
export const WOBBLE_ANG = 0.6;
export const WOBBLE_PERIOD_MS = 460;

/* Nothing the wire says lasts longer than this, or shoves further.
   MAX_KB_PX MIRROR: server/src/pvpextras.js PVP_EXTRAS.SHOVE_MAX (v2.3.3264,
   mirror-audit.test.mjs) -- the longest shove the worker grants a player. */
const MAX_ST_MS = 5000;
export const MAX_KB_PX = 200;

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** The look for element `elem` ({ icon, color }), or null. */
export function elemLook(elem) {
  return own(ELEM_LOOK, elem) ? ELEM_LOOK[elem] : null;
}

/** Is this monster_attack a burn's tick (or the fire trail's), not a blow? */
export function isBurnTick(p) {
  return !!p && (p.ability === 'burn' || p.ability === 'firetrail');
}

/**
 * v2.3.3014: damage the worker resolved that is NOT a blow -- a burn's tick,
 * the fire trail's, a poison's, or a storm's arc from someone near you.  No
 * flinch, no camera kick, no blood, no armour clang: 'burn', 'poison' or
 * 'shock' (what it sounds and sparkles like), else null.  v2.3.3264: and on
 * a pvp_hit a venom root's tick ('poison') and a thorn's prick ('thorn').
 */
export function tickKind(p) {
  if (!p) return null;
  if (isBurnTick(p)) return 'burn';
  if (p.ability === 'poison') return 'poison';
  /* v2.3.3620: the goo's sting while it holds you (the poison's sparks and
     sound: goo is green) */
  if (p.ability === 'sting') return 'poison';
  if (p.ability === 'shock') return 'shock';
  /* v2.3.3264: a player's gem on you (a pvp_hit, server pvpextras.js): a
     venom gem's root ticks like a poison, a flora gem's thorns prick back
     when you attack */
  if (p.ability === 'root') return 'poison';
  if (p.ability === 'thorn') return 'thorn';
  return null;
}

/**
 * A monster_attack on YOU said `st`: carry it out.  Returns the status name it
 * applied, or null.  `who` is the player record to mark when it is a peer's
 * (their look only -- a peer's movement is their own client's).
 */
export function applyElemHit(S, p, now, who) {
  if (!S || !p || typeof p.st !== 'string' || ELEM_STATUSES.indexOf(p.st) < 0) return null;
  const ms = Math.max(0, Math.min(MAX_ST_MS, Number(p.stMs) || 0));
  if (!ms) return null;
  const t = typeof now === 'number' ? now : Date.now();
  const R = who || S;
  /* v2.3.3123: the pet out with you took the edge off it -- its land ward
     (server petbook.js _petWard), `wd` the percent.  Yours only: the pet
     flashes and says so (game/trapping.js noteWard, entityRenderer). */
  if (!who && Number(p.wd) > 0) { S._wardAt = t; S._wardPct = Math.min(50, Math.round(Number(p.wd))); S._wardElem = typeof p.elem === 'string' ? p.elem : null; }
  if (p.st === 'chill') {
    R._chillUntil = Math.max(R._chillUntil || 0, t + ms);
    /* v2.3.3620: frozen solid a moment first, when the worker says so */
    const fz = Math.max(0, Math.min(MAX_FREEZE_MS, Number(p.fz) || 0));
    if (fz > 0) { R._frozenUntil = Math.max(R._frozenUntil || 0, t + fz); R._frozenAt = t; }
  }
  else if (p.st === 'stuck') R._stuckUntil = Math.max(R._stuckUntil || 0, t + ms);
  else if (p.st === 'burn') R._burnUntil = Math.max(R._burnUntil || 0, t + ms);
  /* v2.3.3014 */
  else if (p.st === 'daze') {
    R._dazeUntil = Math.max(R._dazeUntil || 0, t + ms);
    /* v2.3.3620: then wobbling, when the worker says so */
    const wb = Math.max(0, Math.min(MAX_WOBBLE_MS, Number(p.wb) || 0));
    if (wb > 0) { R._wobbleFrom = t + ms; R._wobbleUntil = t + ms + wb; }
  }
  else if (p.st === 'soak') R._soakUntil = Math.max(R._soakUntil || 0, t + ms);
  else if (p.st === 'poison') R._poisonUntil = Math.max(R._poisonUntil || 0, t + ms);
  /* v2.3.3264: a player's gem (server pvpextras.js) */
  else if (p.st === 'slow') {
    const m = Number(p.mult);
    R._slowMult = isFinite(m) && m >= 0.2 && m <= 1 ? m : SLOW_MULT;
    R._slowUntil = t + ms;
  } else if (p.st === 'fracture') {
    R._fractureUntil = t + ms;
    R._fractureStacks = Math.max(1, Math.min(5, Math.floor(Number(p.stacks)) || 1));
  } else if (p.st === 'thorn') R._thornUntil = t + ms;
  else if (p.st === 'shock') {
    R._shockUntil = Math.max(R._shockUntil || 0, t + ms);
    R._shockAt = t;
    /* an arc from the player it struck first (the worker's attackerX/Y), or
       none when it struck you yourself */
    const fx = Number(p.attackerX), fy = Number(p.attackerY);
    R._shockFrom = (p.ability === 'shock' && isFinite(fx) && isFinite(fy)) ? { x: fx, y: fy } : null;
  }
  else if (p.st === 'gust') {
    const kb = p.kb;
    if (!Array.isArray(kb) || kb.length !== 2) return null;
    const dx = Number(kb[0]), dy = Number(kb[1]);
    if (!isFinite(dx) || !isFinite(dy)) return null;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1 || len > MAX_KB_PX) return null;
    R._gustAt = t;
    R._gustAng = Math.atan2(dy, dx);
    /* only your own client moves you: a peer's shove arrives in their moves */
    if (!who) R._gust = { dx, dy, t0: t, ms, done: 0 };
  }
  return p.st;
}

/** The walk's multiplier right now: 0 held or dazed, CHILL_MULT chilled,
    a slow's own (v2.3.3264) -- the stronger of the two -- else 1. */
export function elemMoveMult(S, now) {
  if (!S) return 1;
  if (S._stuckUntil && now < S._stuckUntil) return 0;
  if (S._dazeUntil && now < S._dazeUntil) return 0;   /* v2.3.3014 */
  if (S._frozenUntil && now < S._frozenUntil) return 0;   /* v2.3.3620 */
  let k = 1;
  if (S._chillUntil && now < S._chillUntil) k = CHILL_MULT;
  if (S._slowUntil && now < S._slowUntil) k = Math.min(k, S._slowMult || SLOW_MULT);   /* v2.3.3264 */
  return k;
}

/**
 * v2.3.3264: a player's ability SHOVING you (a bash, a whirlwind's pull:
 * server pvpextras.js): `kb` with no gust's `st`.  Carried out by the gust's own machinery
 * (gustStep, BroTown's movement block) over KB_MS, with no wind drawn -- the
 * worker granted the room for it.  Yours only: a peer's shove arrives in
 * their moves.  Returns true when it took.
 */
export function applyHitShove(S, p, now) {
  if (!S || !p || p.st === 'gust') return false;
  const kb = p.kb;
  if (!Array.isArray(kb) || kb.length !== 2) return false;
  const dx = Number(kb[0]), dy = Number(kb[1]);
  if (!isFinite(dx) || !isFinite(dy)) return false;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1 || len > MAX_KB_PX) return false;
  S._gust = { dx, dy, t0: typeof now === 'number' ? now : Date.now(), ms: KB_MS, done: 0 };
  return true;
}

/** v2.3.3264: staggered by a parry right now (no swing, special, ability or burst)? */
export function isStaggered(S, now) {
  return !!(S && S._staggerUntil && (typeof now === 'number' ? now : Date.now()) < S._staggerUntil);
}

/** Held in place by a slime right now? */
export function isStuck(S, now) {
  return !!(S && S._stuckUntil && (typeof now === 'number' ? now : Date.now()) < S._stuckUntil);
}

/** v2.3.3014: dazed by a rock monster right now?  v2.3.3620: or frozen by a
    snowman -- every place that asks this refuses the same things. */
export function isDazed(S, now) {
  if (!S) return false;
  const t = typeof now === 'number' ? now : Date.now();
  return !!((S._dazeUntil && t < S._dazeUntil) || (S._frozenUntil && t < S._frozenUntil));
}

/** v2.3.3620: frozen solid by a snowman right now? */
export function isFrozen(S, now) {
  return !!(S && S._frozenUntil && (typeof now === 'number' ? now : Date.now()) < S._frozenUntil);
}

/**
 * v2.3.3620: how far a wobble turns your steering right now, radians (0 when
 * you are not wobbling).  To and fro by WOBBLE_ANG, a sway every
 * WOBBLE_PERIOD_MS, easing off to nothing as it ends -- from the time alone.
 */
export function wobbleTurn(S, now) {
  if (!S || !S._wobbleUntil) return 0;
  const t = typeof now === 'number' ? now : Date.now();
  const from = S._wobbleFrom || 0;
  if (t < from || t >= S._wobbleUntil) return 0;
  const span = Math.max(1, S._wobbleUntil - from);
  const left = 1 - (t - from) / span;
  return WOBBLE_ANG * Math.sin(((t - from) / WOBBLE_PERIOD_MS) * Math.PI * 2) * left;
}

/**
 * The part of a gust's shove due this frame, { x, y } in world px, or null.
 * Eased out over its ms -- a shove is fastest when it lands -- and spent as it
 * is handed out, so a dropped frame does not lose any of it.
 */
export function gustStep(S, now) {
  const g = S && S._gust;
  if (!g) return null;
  const t = Math.max(0, Math.min(1, (now - g.t0) / Math.max(1, g.ms)));
  const e = 1 - (1 - t) * (1 - t);
  const k = e - g.done;
  g.done = e;
  if (t >= 1) S._gust = null;
  return k > 0 ? { x: g.dx * k, y: g.dy * k } : null;
}

/** Death, a respawn or a zone change: every status ends. */
export function clearElemStatuses(S) {
  if (!S) return;
  S._chillUntil = 0; S._stuckUntil = 0; S._burnUntil = 0; S._gust = null;
  S._dazeUntil = 0; S._shockUntil = 0; S._shockFrom = null; S._soakUntil = 0; S._poisonUntil = 0;   /* v2.3.3014 */
  S._slowUntil = 0; S._fractureUntil = 0; S._fractureStacks = 0; S._thornUntil = 0; S._staggerUntil = 0;   /* v2.3.3264 */
  S._frozenUntil = 0; S._wobbleFrom = 0; S._wobbleUntil = 0;   /* v2.3.3620 */
}
