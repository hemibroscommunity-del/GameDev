/* ═══ v2.3.3985: THE BLOW THAT KILLED IT ═══
 *
 * The owner: "premade sections like head, eyes, arms, torso, legs, etc. that
 * can separate and simulate physics based on the direction they're hit in.
 * Death animations are just fun part of the game loop".
 *
 * A monster's own death (rendering/monsterDeathZonesFx.js) throws its pieces
 * along the killing blow, and a BIG finishing blow makes it the explosion.
 * This is where the blow is written down, on the monster (`m._deathBlow`),
 * from what the phone already knows -- nothing new on the wire:
 *
 *   EVERY HIT THE SERVER REPORTS (gameEvents.js monster_hit, on every phone):
 *     the direction is from the attacker toward the monster -- you (S.player)
 *     for your own hits, another player where this phone can see them
 *     (S.others), unknown otherwise (a player off this phone's screen, a
 *     source that is not a player); BIG is what the event marks: a crit
 *     (isCrit), an ability (Shield Bash, Whirlwind, the lunge: `ability`),
 *     an Element Burst (`burst`) or an elemental collision (`collision`).
 *     The last hit is the killing one: monster_kill follows it in the same
 *     flush (combat.js pushes the hit, then resolves the kill).
 *   YOUR OWN SWING OR SHOT, AT ITS CONTACT (combatHelpers.spawnHitDebris,
 *     `mine`): the direction is the blade's swing or the arrow's / bolt's
 *     travel -- better than your position -- and BIG adds a special or a
 *     charged shot, which the server's event does not mark.  So your own
 *     special explodes on YOUR phone; another phone sees it as big only when
 *     it was also a crit (the spec says so).
 *
 * The death reads it once, when it starts (deathBlowOf): a blow older than
 * BLOW_FRESH_MS is no blow (the death's own seeded direction, as before).
 * No imports: node tests it (server/test/death-zones.test.mjs).
 */

export const BLOW_FRESH_MS = 4000;
/* a hit at contact and the server's word on the same hit are this close */
const SAME_HIT_MS = 1500;

function unit(dx, dy) {
  const l = Math.hypot(dx, dy);
  return l > 1e-6 ? [dx / l, dy / l] : null;
}

/** The server's flags that make a blow BIG (the same on every phone). */
export function isBigHit(p) {
  return !!(p && (p.isCrit || p.ability || p.burst || p.collision));
}

/** Write a blow on `m`: `b` is { dx, dy } (a direction, any length) or
 *  { ang }, `big`, `by` (the attacker's id), `mine` (your own), `aim` (at its
 *  contact: the swing's or the shot's own direction), `t`.
 *  The same attacker's hit within SAME_HIT_MS merges (your swing's contact,
 *  then the server's echo of it): a contact's direction wins over a
 *  position's, and BIG from either stays. */
export function noteBlow(m, b) {
  if (!m || !b) return;
  const t = typeof b.t === 'number' ? b.t : Date.now();
  let d = null;
  if (typeof b.ang === 'number' && isFinite(b.ang)) d = [Math.cos(b.ang), Math.sin(b.ang)];
  else if (typeof b.dx === 'number' && typeof b.dy === 'number') d = unit(b.dx, b.dy);
  const o = m._deathBlow;
  const same = !!(o && (t - o.t) < SAME_HIT_MS && (o.by || null) === (b.by || null));
  const aim = !!(b.aim && d);
  m._deathBlow = {
    dx: d ? d[0] : (same ? o.dx : null),
    dy: d ? d[1] : (same ? o.dy : null),
    aim: aim || !!(same && o.aim),
    big: !!b.big || !!(same && o.big),
    by: b.by || (same ? o.by : null),
    mine: !!b.mine || !!(same && o.mine),
    t,
  };
  /* a contact's direction (the swing, the shot's travel) is kept over a
     position's from the echo that follows it */
  if (same && o.aim && !aim && o.dx != null) { m._deathBlow.dx = o.dx; m._deathBlow.dy = o.dy; }
}

/** gameEvents.js monster_hit: the server's report of a hit on `m`. */
export function noteHitBlow(S, p, m) {
  if (!S || !p || !m) return;
  const mx = typeof m.x === 'number' ? m.x : m.renderX, my = typeof m.y === 'number' ? m.y : m.renderY;
  let src = null;
  if (p.attackerId && p.attackerId === S.myId) src = S.player;
  else if (p.attackerId && S.others) src = S.others[p.attackerId] || null;
  const known = !!(src && typeof src.x === 'number' && typeof src.y === 'number' && typeof mx === 'number' && typeof my === 'number');
  noteBlow(m, {
    dx: known ? mx - src.x : undefined, dy: known ? my - src.y : undefined,
    big: isBigHit(p), by: p.attackerId || null,
    mine: !!(p.attackerId && p.attackerId === S.myId),
  });
}

/** The blow that killed `m`, for its death: { known, dx, dy, big } (dx, dy
 *  a unit vector in the world, from the killer toward the monster; 0, 0
 *  unknown), or the blow's absence (known false, big false). */
export function deathBlowOf(m, now) {
  const b = m && m._deathBlow;
  const t = typeof now === 'number' ? now : Date.now();
  if (!b || !(t - b.t < BLOW_FRESH_MS) || t < b.t - 60000) return { known: false, dx: 0, dy: 0, big: false };
  const known = b.dx != null && b.dy != null;
  return { known, dx: known ? b.dx : 0, dy: known ? b.dy : 0, big: !!b.big };
}
