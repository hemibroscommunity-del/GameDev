/* ═══ v2.3.3058: NO MAN'S LAND — THE GAME'S HALF ═══
 *
 * Owner, 2026-10-05: "Add a new 'No man's land' notification when you cross
 * into zones with lvl 6+ monsters.  It'll start at 1.  This means any other
 * player 1 level above or below you can attack you. ..."  The rules are the
 * worker's (server/src/nomansland.js, whose header has all of them); this is
 * what the player sees and does:
 *
 *   - WHERE YOU ARE: `nmlLevelAt` is the worker's own arithmetic on the same
 *     rings (mirror-audit pins the numbers and the centre), so the banner and
 *     the worker never disagree about a line.  `noteNoMansLand`, every frame
 *     from the Wheel's minimap, plays the banner on the way in (the land
 *     banner's red plaque, "No man's land 1") with a line in the chat saying
 *     what it means, a shorter line as the level changes, and one on the way
 *     out.  `nmlHere` feeds the top bar.
 *   - WHO YOU CAN HIT: `nmlCanAttack`, the worker's rule from your side -- the
 *     world tap aims at such a player (BroTown.jsx), so your swings and shots
 *     become player_attack; the worker decides every one of them.
 *   - THE SKULLS: others' from the tick (`sk`), yours from `nml_skull`, both
 *     into the anchors the threat skull already draws from (entityRenderer).
 *   - A DEATH THERE: `nml_loss` -- clear from your own bag what the worker
 *     took, so it is not offered back on your next join (gearstash.js would
 *     refuse it anyway, by id), and say so.
 *
 * Only against a worker that advertises caps.nomansland: an older one would
 * refuse every hit, and an aimed swing that never lands is worse than none.
 */
import { chatLogBus } from '@/ui/mobile/chatLogBus.js';
import { playZoneBanner } from '@/ui/zoneBannerOverlay.js';

import { NML, NML_CENTRE, nmlTierAt, nmlLevelAt } from '@/data/noMansLandRings.js';
export { NML, NML_CENTRE, nmlTierAt, nmlLevelAt };
const WHEEL = 'wheel';
/* how long you must have stood in a new level before it is announced, so a
   walk along a ring's line does not flicker banners (the land banner's own) */
export const NML_DWELL_MS = 600;
export const NML_RED = '#FF6B5E';

export function nmlLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.nomansland === true);
}

/** Your No man's land level right now (0: not in it, or not live). */
export function nmlHere(S) {
  if (!nmlLive(S) || !S.player || S.currentZone !== WHEEL) return 0;
  return nmlLevelAt(WHEEL, S.player.x, S.player.y);
}

/* your level as the worker has it (player_state's `level`, wsClient) -- the
   same number the others' rpgLv carries, so both sides are read alike */
function myLevel(S) {
  const R = S && S.rpg;
  return (R && Number(R.level)) || 1;
}

/** May you aim at `otherId` here?  The worker's rule from your side:
 *  both of you in No man's land, your levels within the lower of the two
 *  levels you stand in, not one party. */
export function nmlCanAttack(S, otherId) {
  if (!nmlLive(S) || !S.player || S.currentZone !== WHEEL || !S.others) return false;
  const o = S.others[otherId];
  if (!o || (o.zone || o.z) !== WHEEL) return false;
  const la = nmlLevelAt(WHEEL, S.player.x, S.player.y);
  const lt = nmlLevelAt(WHEEL, typeof o.x === 'number' ? o.x : o.renderX, typeof o.y === 'number' ? o.y : o.renderY);
  if (la < 1 || lt < 1) return false;
  const theirs = Number(o.rpgLv) || 1;
  if (Math.abs(myLevel(S) - theirs) > Math.min(la, lt)) return false;
  try {
    const pm = S._party && S._party.members;
    if (pm && pm.some((m) => m && String(m.id) === String(otherId))) return false;
  } catch (e) { /* not a party */ }
  return true;
}

/* a line in the chat, from the game (system) */
export function nmlSay(S, text) {
  if (!S || !text) return;
  try {
    S.chatLog = [...(S.chatLog || []).slice(-50), { id: 'nml-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: '', text, color: NML_RED, ts: Date.now(), system: true }];
    chatLogBus.bump();
  } catch (e) { /* a line is never worth a frame */ }
}

const _note = { cur: 0, since: 0, shown: 0, told: Object.create(null) };
/** Every frame in the Wheel (wheelMinimap.js): the banner on the way in, a
 *  line as the level changes, a line on the way out. */
export function noteNoMansLand(S) {
  /* a lock taken under the rule (BroTown's tap, `nml`) goes when the rule no
     longer allows the fight -- either of you out of it, levels apart, one
     party -- so a swing is never sent at someone the worker will refuse */
  try {
    const lt = S && S.lockedTarget;
    if (lt && lt.nml && lt.type === 'player' && !nmlCanAttack(S, lt.id)) S.lockedTarget = null;
  } catch (e) { /* the worker refuses it anyway */ }
  const lvl = nmlHere(S);
  const now = Date.now();
  if (lvl !== _note.cur) { _note.cur = lvl; _note.since = now; return; }
  if (lvl === _note.shown || now - _note.since < NML_DWELL_MS) return;
  const was = _note.shown;
  _note.shown = lvl;
  if (S) S._nmlLevel = lvl;
  if (!lvl) {
    if (was) nmlSay(S, "You left No man's land. Players can no longer attack you.");
    return;
  }
  const rule = `players within ${lvl} level${lvl === 1 ? '' : 's'} of yours`;
  if (!was) {
    try { playZoneBanner('nml-' + lvl, S, { title: `No man's land ${lvl}`, plain: true, color: NML_RED }); } catch (e) { /* the line still says it */ }
    if (!_note.told.first) {
      _note.told.first = true;
      nmlSay(S, `☠ No man's land ${lvl}: ${rule} can attack you here. Killed by one, you lose your bag; attack one and you carry a red skull for 20 minutes.`);
    } else {
      nmlSay(S, `☠ No man's land ${lvl}: ${rule} can attack you.`);
    }
  } else {
    nmlSay(S, `☠ No man's land ${lvl}: ${rule} can attack you.`);
  }
}
export function resetNoMansLandNote() { _note.cur = 0; _note.since = 0; _note.shown = 0; }

/** The tick's `sk` for another player ('r' | 'w' | absent) into the threat
 *  skull's anchor (entityRenderer reads S._threatMarks). */
export function nmlPeerSkull(S, pid, sk) {
  if (!S || !pid) return;
  const type = sk === 'r' ? 'red' : sk === 'w' ? 'white' : null;
  const marks = S._threatMarks || (S._threatMarks = Object.create(null));
  const had = marks[pid];
  if (type) marks[pid] = { type, until: Date.now() + 5000, nml: true };
  else if (had && had.nml) delete marks[pid];
}

/** `nml_skull` {red, white} (ms left): your own skull. */
export function applyNmlSkull(S, payload) {
  if (!S || !payload) return;
  const red = Math.max(0, Number(payload.red) || 0), white = Math.max(0, Number(payload.white) || 0);
  const now = Date.now();
  const wasRed = S._pvpSkullType === 'red';
  S._nmlSelf = { red, white, at: now };
  if (red > 0) { S._pvpSkullType = 'red'; S._pvpSkullUntil = now + red; }
  else if (white > 0) { S._pvpSkullType = 'white'; S._pvpSkullUntil = now + white; }
  else { S._pvpSkullType = null; S._pvpSkullUntil = 0; }
  if (red > 0 && !wasRed) nmlSay(S, '☠ You attacked a player: a red skull for 20 minutes of play. Die with it and you lose everything you carry and wear.');
}

const WORN = ['weapon', 'rangedWeapon', 'staffWeapon', 'armor', 'legsArmor', 'shield', 'amulet'];
/* a red skull's whole bag; the cosmetic outfit list (gearStash) is never
   taken -- the worker cannot tell a worn outfit piece from a spare */
const RED_LISTS = ['armorStash', 'legsStash', 'shieldStash', 'amuletStash'];
const sigOf = (p) => (p && typeof p === 'object' ? [p.name, p.gearBase, p.tierMult, p.tier].join('|') : '');

/** `nml_loss`: what a death in No man's land took -- cleared from your own
 *  copies of the bag (and, a red skull's, of what you wore), so nothing is
 *  re-offered on your next join, and said.
 *
 *  A bag loss names each piece it took ({field, gid} or, for a piece with no
 *  id, {field, sig}) and only those leave your lists: the worker takes the
 *  spare weapons and the spare armour, legs and (v2.3.3082, once this game
 *  has told it which is on your arm: game/shieldWear.js) shields it can tell
 *  from what you wear, and no outfit piece (server/src/nomansland.js says
 *  why), so clearing whole lists here would throw away what it left you --
 *  and the next join would bring it back from the worker's copy anyway. */
export function applyNmlLoss(S, payload, save) {
  if (!S || !payload) return;
  const R = S.rpg;
  S._nmlConfiscatedAt = Date.now();   /* wsClient's armour rescue stands down */
  if (R) {
    R.weaponStash = [];
    if (payload.red) {
      for (const f of WORN) R[f] = null;
      for (const f of RED_LISTS) if (Array.isArray(R[f])) R[f] = [];
      R.coins = 0;
    } else {
      for (const g of (Array.isArray(payload.gear) ? payload.gear : [])) {
        const list = g && RED_LISTS.indexOf(g.field) >= 0 && Array.isArray(R[g.field]) ? R[g.field] : null;
        if (!list) continue;
        const at = g.gid ? list.findIndex((p) => p && p.gid === g.gid) : list.findIndex((p) => p && !p.gid && sigOf(p) === g.sig);
        if (at >= 0) list.splice(at, 1);
      }
    }
    try { if (typeof save === 'function') save(S); } catch (e) { /* the echo still carries the worker's state */ }
  }
  const who = payload.by ? payload.by : 'your death';
  nmlSay(S, payload.red
    ? `☠ ${payload.by ? payload.by + ' killed you while you carried a red skull' : 'You died with a red skull'}: you lost everything you carried and wore, and your gold.`
    : `☠ ${who} took your bag in No man's land: its items and your spare weapons, armour and shields. What you wear is still yours.`);
}
