/* ═══ v2.3.3267: YOUR SPARRING CLONES ARE MONSTERS TO YOUR WEAPONS ═══
 *
 * The owner, after the first spar (v2.3.3265): "attacks need to hit the clone
 * even when you aren't locked on target", and "the block shield button needs
 * to appear while in combat for any of the 3 combat types. It was not there."
 *
 * Both were one thing: the page asked about a player only when it was locked
 * on one -- the duel's rule (a duel locks you onto the other, duelLock.js) and
 * No man's land's (a lock is the choice to fight, nmlAsk.js).  A clone was a
 * player like any other there, so with nothing locked:
 *   - the bow never loosed at one (its sight gate, projectiles.js
 *     firstSightHit, looked for monsters and the lock alone);
 *   - an arrow or a bolt flew through one (the impact test tried the lock);
 *   - a swing in its face sent nothing (monsterCombat.js's PvP claim waits for
 *     a lock or a duel);
 *   - and the shield button stayed away: it shows with a lock, a blow in the
 *     last five seconds or a MONSTER in reach (shieldToggle.js), and between a
 *     clone's blows there was none of them.
 *
 * So to your weapons a clone is now what a monster is: the sword finds the
 * nearest one by itself (targeting.js, the melee auto target, as it finds a
 * monster), the bow fires when one is on its line, arrows and bolts hit any
 * clone they reach and every swing lands on the clones in its arc, and the
 * shield button is up while one is near.  A bow or staff still locks one only
 * when you tap it, as it locks a monster (v2.3.2258).
 *
 * Only YOUR clones, which fight you and nobody else (server spar.js
 * _sparPair): every blow still names the clone it hits (`target`), so no
 * other player is ever touched by it, and No man's land's choice (v2.3.3253)
 * is untouched.
 *
 * ═══ v2.3.3268: ...AND SO IS A PLAYER YOU CHOSE TO ATTACK ═══
 * The owner: "I want attacks against real players to hit them even when not
 * locked on target but only if you select the attack option that pops up on
 * the window. I also want to be able to use shield for when battles happen
 * against real players in no mans land".
 *
 * In No man's land your weapons tried a real player only while you were
 * LOCKED on them (the window's Attack aims: nmlAsk.js nmlAim).  Tap a monster
 * or the ground and the lock went, and with it every hit on them.  Now Attack
 * is a choice that LASTS: nmlAim -- the window's Attack, or a tap on the one
 * who attacked you, which needs no window -- records the player as a FOE
 * (`chooseFoe`), and to your weapons a foe is what a clone is: the sword's
 * automatic target takes the nearest one as it takes the nearest monster, the
 * bow looses when one is on its line, an arrow or a bolt that reaches one hits
 * them, a swing lands on each in its arc, locked or not, every blow naming
 * them as its `target`.  For as long as the FIGHT lasts: the choice lapses
 * (`isLiveFoe` forgets them, and a tap asks again) the moment No man's land's
 * rule says you can no longer fight them (either of you out of it, levels too
 * far apart, a party), when they leave, or after FIGHT_QUIET_MS with no blow
 * between you either way.  A stray shot through a player you have NOT chosen
 * still does nothing and asks (projectiles.js _nmlStrayShot).
 *
 * And while a fight is on -- a clone or a foe near you, or a player who has
 * hit you or been hit by you within FIGHT_QUIET_MS (`fightingNow`), near and
 * able to fight you -- the shield button stays up for every weapon
 * (`fightOn`), its guard facing the nearest of them (`fightersNear`).
 *
 * The rule is No man's land's own (noMansLand.js nmlCanAttack), handed in once
 * by that module (`setFoeRule`), so this file still imports nothing and
 * server/test/spar.test.mjs runs it. */

/* a clone (v2.3.3268: or a foe, or your attacker) this near (px) keeps the
   shield button up: a fight is on.  About a phone's screen; a bow or staff
   clone fights from 280-400 px (spar.js band), a real archer further. */
export const FIGHT_R = 900;

/** Is `id` one of your sparring clones, alive and drawn in your zone? */
export function isLiveClone(S, id) {
  const sp = S && S._spar;
  if (!sp || !sp.ids || id == null || !sp.ids.has(String(id))) return false;
  const o = S.others ? S.others[id] : null;
  if (!o || o._isDead || o.dead || o._away) return false;
  const z = o.zone || o.z || 'town';
  return !S.currentZone || z === S.currentZone;
}

/** Where a clone is drawn on this screen, or null. */
export function clonePos(o) {
  if (!o) return null;
  const x = (typeof o.renderX === 'number' && isFinite(o.renderX)) ? o.renderX : o.x;
  const y = (typeof o.renderY === 'number' && isFinite(o.renderY)) ? o.renderY : o.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  return { x, y };
}

/** Your live clones, as { id, o, x, y }. */
export function liveClones(S) {
  const out = [];
  const sp = S && S._spar;
  if (!sp || !sp.ids || !sp.ids.size || !S.others) return out;
  for (const id of sp.ids) {
    if (!isLiveClone(S, id)) continue;
    const o = S.others[id];
    const p = clonePos(o);
    if (p) out.push({ id, o, x: p.x, y: p.y });
  }
  return out;
}

/** Your live clones within `r` px of you, nearest first, in targeting.js's
 *  candidate shape: { m: the clone, id, x, y, d2, spar: true }. */
export function clonesNear(S, r) {
  const out = [];
  const P = S && S.player;
  if (!P || !(r > 0)) return out;
  const r2 = r * r;
  for (const c of liveClones(S)) {
    const dx = c.x - P.x, dy = c.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= r2) out.push({ m: c.o, id: c.id, x: c.x, y: c.y, d2, spar: true });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/* ── v2.3.3268: the players you chose to attack ── */

/* A fight with a player is ON while a blow has passed between the two of you
   (either way: gameEvents.js pvp_hit -> notePvpBlow) this recently, and a
   choice to attack them lasts this long past the last blow, or past the
   choice itself.  A minute with nothing thrown either way and the fight is
   over: a stray shot an hour later is not the choice you made (the owner's
   v2.3.3253 rule: "I want attacking other players to be intentional"). */
export const FIGHT_QUIET_MS = 60000;

let _foeRule = null;   /* (S, id) => may you fight them now: noMansLand.js nmlCanAttack */
/** No man's land hands its rule in (noMansLand.js, once, as it loads). */
export function setFoeRule(fn) { _foeRule = typeof fn === 'function' ? fn : null; }

/* S.others is keyed by ids off the wire: only its own keys (CLAUDE.md) */
function peerOf(S, key) {
  const o = S && S.others;
  return o && Object.prototype.hasOwnProperty.call(o, key) ? o[key] : null;
}

/** A blow between you and another player, either way -- yours on them, theirs
 *  on you, blocked or dodged too (gameEvents.js, pvp_hit).  It keeps the fight
 *  with them on.  A Map (an id off the wire), kept short. */
export function notePvpBlow(S, payload, now) {
  if (!S || !payload || S.myId == null) return false;
  const me = String(S.myId);
  const a = payload.attacker != null ? String(payload.attacker) : null;
  const t = payload.target != null ? String(payload.target) : null;
  const other = a === me ? t : (t === me ? a : null);
  if (other == null || other === me) return false;
  if (!(S._pvpBlows instanceof Map)) S._pvpBlows = new Map();
  if (S._pvpBlows.size >= 32 && !S._pvpBlows.has(other)) S._pvpBlows.clear();
  S._pvpBlows.set(other, typeof now === 'number' ? now : Date.now());
  return true;
}

function blowAt(S, key) {
  const m = S && S._pvpBlows;
  return (m instanceof Map && m.get(key)) || 0;
}

/** You chose to attack `id`: the window's Attack, or hitting back the one who
 *  attacked you (nmlAsk.js nmlAim).  A Map (an id off the wire), kept short. */
export function chooseFoe(S, id, now) {
  if (!S || id == null) return;
  if (!(S._nmlFoes instanceof Map)) S._nmlFoes = new Map();
  if (S._nmlFoes.size >= 32 && !S._nmlFoes.has(String(id))) S._nmlFoes.clear();
  S._nmlFoes.set(String(id), typeof now === 'number' ? now : Date.now());
}

/** Is `id` a player you chose to attack, drawn, up and still yours to fight?
 *  The choice LAPSES -- forgotten, so a new window asks -- when No man's land's
 *  rule no longer lets you fight them (either of you out of it, levels too far
 *  apart, a party), when they are not here any more, or after FIGHT_QUIET_MS
 *  with no blow between you.  While you are locked on them by your own hand
 *  (the window's Attack aims; not the sword's automatic target, which holds a
 *  foe only while the choice does) the choice stays fresh: you are aiming at
 *  them. */
export function isLiveFoe(S, id, now) {
  const m = S && S._nmlFoes;
  if (!(m instanceof Map) || id == null) return false;
  const key = String(id);
  if (!m.has(key)) return false;
  const t = typeof now === 'number' ? now : Date.now();
  const lt = S.lockedTarget;
  if (lt && lt.type === 'player' && lt.nml && lt.src !== 'auto' && String(lt.id) === key) m.set(key, t);
  const o = peerOf(S, key);
  const last = Math.max(m.get(key) || 0, blowAt(S, key));
  if (!o || !_foeRule || !_foeRule(S, key) || !(t - last < FIGHT_QUIET_MS)) { m.delete(key); return false; }
  return !(o._isDead || o.dead || o._away);
}

/** The players you chose to attack, live, as { id, o, x, y }. */
export function liveFoes(S, now) {
  const out = [];
  const m = S && S._nmlFoes;
  if (!(m instanceof Map) || !m.size) return out;
  for (const id of [...m.keys()]) {
    if (!isLiveFoe(S, id, now)) continue;
    const o = peerOf(S, id);
    const p = clonePos(o);
    if (p) out.push({ id, o, x: p.x, y: p.y });
  }
  return out;
}

/** Is `id` one your weapons hit without a lock -- a clone of yours, or a foe? */
export function isLiveFighter(S, id) {
  return isLiveClone(S, id) || isLiveFoe(S, id);
}

/** Your clones and your foes, live, once each: { id, o, x, y }. */
export function liveFighters(S) {
  const out = liveClones(S);
  for (const f of liveFoes(S)) if (!out.some((c) => String(c.id) === String(f.id))) out.push(f);
  return out;
}

/** The players you are fighting NOW: a blow between you within FIGHT_QUIET_MS
 *  (the one who hit you, or the one you hit), drawn, up, and No man's land
 *  still letting the two of you fight -- as { id, o, x, y }.  Not targets of
 *  yours unless you chose them (a foe: the window's Attack, or a tap on the
 *  one who attacked you, which aims at once), but the fight with them is on:
 *  the shield is wanted. */
export function fightingNow(S, now) {
  const out = [];
  const m = S && S._pvpBlows;
  if (!(m instanceof Map) || !m.size) return out;
  const t = typeof now === 'number' ? now : Date.now();
  for (const [id, at] of [...m]) {
    if (!(t - at < FIGHT_QUIET_MS)) { m.delete(id); continue; }
    const o = peerOf(S, id);
    if (!o || o._isDead || o.dead || o._away || !_foeRule || !_foeRule(S, id)) continue;
    const p = clonePos(o);
    if (p) out.push({ id, o, x: p.x, y: p.y });
  }
  return out;
}

/** Your clones and foes near you -- the ones your weapons take without a lock
 *  -- within `r` px, nearest first, in targeting.js's candidate shape
 *  ({ m, id, x, y, d2 }, `spar` or `foe`): the sword's automatic target takes
 *  the nearest of these as it takes the nearest monster. */
export function chosenNear(S, r) {
  const out = [];
  const P = S && S.player;
  if (!P || !(r > 0)) return out;
  const r2 = r * r;
  for (const c of liveClones(S)) {
    const dx = c.x - P.x, dy = c.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= r2) out.push({ m: c.o, id: c.id, x: c.x, y: c.y, d2, spar: true });
  }
  for (const f of liveFoes(S)) {
    if (out.some((q) => String(q.id) === String(f.id))) continue;
    const dx = f.x - P.x, dy = f.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= r2) out.push({ m: f.o, id: f.id, x: f.x, y: f.y, d2, foe: true });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/** The fight round you within `r` px, nearest first, in targeting.js's
 *  candidate shape ({ m, id, x, y, d2 }): your clones (`spar`), your foes
 *  (`foe`) and the players you are fighting now (`fight`: the one who hit
 *  you).  The shield faces the nearest; any of them keeps its button up. */
export function fightersNear(S, r) {
  const out = chosenNear(S, r);
  const P = S && S.player;
  if (!P || !(r > 0)) return out;
  const r2 = r * r;
  for (const c of fightingNow(S)) {
    if (out.some((q) => String(q.id) === String(c.id))) continue;
    const dx = c.x - P.x, dy = c.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= r2) out.push({ m: c.o, id: c.id, x: c.x, y: c.y, d2, fight: true });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out;
}

/** Is a fight on -- a clone, a foe, or a player you are fighting, within
 *  FIGHT_R?  (The shield and Special buttons stay up: shieldToggle.js,
 *  SpecialButton.jsx.) */
export function fightOn(S) {
  return fightersNear(S, FIGHT_R).length > 0;
}

/** The players a shot of yours may hit on this screen, ids in order: the duel
 *  opponent or the player you have locked where your PvP test tries them
 *  (`lockPid`, the old one-target rule), then each of your live clones and
 *  (v2.3.3268) the foes you chose. */
export function shotPlayerTargets(S, lockPid) {
  const out = [];
  if (lockPid != null) out.push(String(lockPid));
  for (const c of liveFighters(S)) if (out.indexOf(String(c.id)) < 0) out.push(String(c.id));
  return out;
}

/** Your live clones and foes a swing from (px, py) toward `ang` reaches on
 *  this screen: within `reach` (+ `slack`, a stride: the worker sees them a
 *  tick later) and inside the swing's `arc` -- as { id, o, x, y, ang }, the
 *  bearing to each.  monsterCombat claims a hit on each, naming it
 *  (v2.3.3267; v2.3.3268: the foes too). */
export function fightersInSwing(S, px, py, ang, reach, arc, slack) {
  const out = [];
  if (typeof px !== 'number' || typeof py !== 'number' || !isFinite(ang)) return out;
  const R = (Number(reach) || 0) + (Number(slack) || 0);
  const half = (Number(arc) || 0) / 2;
  for (const c of liveFighters(S)) {
    const dx = c.x - px, dy = c.y - py;
    if (dx * dx + dy * dy > R * R) continue;
    const a = Math.atan2(dy, dx);
    const diff = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
    if (Math.abs(diff) > half) continue;
    out.push({ id: c.id, o: c.o, x: c.x, y: c.y, ang: a });
  }
  return out;
}
