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
  /* the owner's "slime for floral damage": the slime's own splat, not the
     leaf of the element icons */
  flora: { icon: 'slime', color: '#8be36a' },
};

/* Where each icon is, for effectsRenderer's popup icons and the status chips.
   mirror-audit.test.mjs checks every file is in public/. */
export const ELEM_ICON_SRC = {
  'elem-frost': '/icons/ui/elem-frost.webp',
  'elem-flame': '/icons/ui/elem-flame.webp',
  'elem-wind': '/icons/ui/elem-wind.webp',
  slime: '/icons/monsters/slime-remnants.webp',
};

/* The statuses this client carries out.  MIRROR: the values of
   server/src/monsterstatus.js ELEM_HITS (mirror-audit.test.mjs). */
export const ELEM_STATUSES = ['chill', 'burn', 'gust', 'stuck'];

/* Nothing the wire says lasts longer than this, or shoves further. */
const MAX_ST_MS = 5000;
const MAX_KB_PX = 200;

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
  if (p.st === 'chill') R._chillUntil = Math.max(R._chillUntil || 0, t + ms);
  else if (p.st === 'stuck') R._stuckUntil = Math.max(R._stuckUntil || 0, t + ms);
  else if (p.st === 'burn') R._burnUntil = Math.max(R._burnUntil || 0, t + ms);
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

/** The walk's multiplier right now: 0 held, CHILL_MULT chilled, else 1. */
export function elemMoveMult(S, now) {
  if (!S) return 1;
  if (S._stuckUntil && now < S._stuckUntil) return 0;
  if (S._chillUntil && now < S._chillUntil) return CHILL_MULT;
  return 1;
}

/** Held in place by a slime right now? */
export function isStuck(S, now) {
  return !!(S && S._stuckUntil && (typeof now === 'number' ? now : Date.now()) < S._stuckUntil);
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
}
