/* ═══ v2.3.3001: HITS SOUND LIKE WHAT THEY HIT ═══
 *
 * Owner, 2026-10-03: "modify hit sound effects based on material type so
 * hitting wood vs plants etc for props and also against monsters (arrow,
 * melee, magic hit sound for snowmen vs slime etc should all sound like their
 * material type).  Same with when monster projectiles break on you".
 *
 * The SOUNDS are tables in data/gameDisplay.js (BT_AUDIO.HIT_VOICES,
 * PROP_SOUNDS + CROWN_SOUNDS, SHOT_SOUNDS).  This file is WHEN and HOW LOUD,
 * from what the game knows -- one place, so the melee, the lunge, the arrow,
 * the bolt, the worker's echo and the monsters' balls cannot drift apart:
 *
 *   monsterHitSfx  a hit YOU landed (melee, lunge, arrow, bolt): its
 *                  monster's voice (monsterVariants.hitSoundOf) at the call
 *                  site's level, and a stamp on the monster so the worker's
 *                  echo of the same blow is not heard twice.
 *   echoHitSfx     a hit the worker reports that nothing on this screen
 *                  played: a teammate's, and your own abilities' and staff
 *                  splash's.  At ECHO_K of the melee's level, softer with
 *                  distance (earVol), never on a monster you just heard hit,
 *                  at most ECHO_BURST in a moment (a whirlwind into a pack).
 *   shotEndSfx     a monster's ball breaking -- on you, your shield, the
 *                  ground or a rock -- in its own material
 *                  (monsterShots.shotStyleOf), quieter the further off.
 *   heroHitSfx     the worker's blow on you.  When it is the ball that just
 *                  broke on you (a ball of that monster ended at you within
 *                  SHOT_RECENT_MS, or is still in the air coming down on you;
 *                  one blow per ball), the melee clang is not played over it:
 *                  SHOT_CLANG_K of it when you wear armour, nothing when you
 *                  do not -- so a snowball does not sound like a sword.  The
 *                  element's own sound (BT_AUDIO.elemHit, v2.3.2996) is played
 *                  by its own line, untouched.
 *
 * Sound only: nothing here changes a hit, a number or a position. */
import { BT_AUDIO } from '@/data/index.js';
import { hitSoundOf } from '@/data/monsterVariants.js';
import { shotStyleOf, shotThrowerArch } from '@/data/monsterShots.js';

/* How far a sound carries: full within EAR_NEAR world px of you, nothing past
   EAR_FAR, falling as the square in between -- so a fight beside you is heard
   and one across the clearing is a murmur. */
export const EAR_NEAR = 220;
export const EAR_FAR = 1150;
/* A hit nobody here played: about a third of your own melee's level. */
export const ECHO_K = 0.35;
const ECHO_VOL = 0.55;
/* A monster heard hit this recently is not heard again from an echo. */
export const ECHO_GAP_MS = 400;
/* At most this many echo voices in ECHO_WINDOW_MS. */
export const ECHO_BURST = 3;
export const ECHO_WINDOW_MS = 150;
/* A ball of the monster that hit you ended this recently: it was the ball. */
export const SHOT_RECENT_MS = 400;
/* ...and the armour's clang under it plays at this share of its 0.85.  0.3,
   measured (the PROP_SOUNDS method, against sword-hit3): the clang at 0.85
   is 3.5x sword-hit3's loudness -- the loudest thing in combat -- where a
   snowball's crunch on you is 0.74.  At 0.35 the clang would still measure
   1.25, well over the ball; at 0.3 it is ~1.07, armour under a snowball
   rather than a sword on it. */
export const SHOT_CLANG_K = 0.3;
/* A ball that ended within this of you, on the ground, still counts as yours
   (the worker hits within 40 px of the aim point; the drawn ball stops at 16). */
const SHOT_NEAR_PX = 70;

export const hitSoundStats = {
  local: 0, echo: 0, echoSkipped: 0, echoThrottled: 0, shots: 0, ballBlows: 0,
  last: null, lastEcho: null, lastShot: null, lastHero: null,
};

const posOf = (m) => ({
  x: typeof m.renderX === 'number' ? m.renderX : m.x,
  y: typeof m.renderY === 'number' ? m.renderY : m.y,
});

/** How much of a sound at world (x, y) you hear where you stand: 1 near, 0 far. */
export function earVol(S, x, y) {
  const P = S && S.player;
  if (!P || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const d = Math.hypot(x - P.x, y - P.y);
  if (d <= EAR_NEAR) return 1;
  if (d >= EAR_FAR) return 0;
  const k = 1 - (d - EAR_NEAR) / (EAR_FAR - EAR_NEAR);
  return k * k;
}

/** A hit you landed on monster `m`, at the call site's level `vol` (melee
 *  0.55, lunge 0.5, arrow 0.6, a bolt's 0.22 under its magic).  `src` names
 *  the weapon for the tests; `mat` is the voice when the caller captured it
 *  at the hit (an arrow lands a beat after it hits). */
export function monsterHitSfx(m, vol, src, mat) {
  if (!m) return;
  /* sound only, and called from inside the swing and the arrow loops: nothing
     here may throw into them */
  try {
    const arch = m.archetype || m.type;
    const snd = mat || hitSoundOf(arch);
    const now = Date.now();
    m._hitSndAt = now;
    hitSoundStats.local++;
    hitSoundStats.last = { arch, mat: snd, vol, src: src || null, at: now };
    BT_AUDIO.materialHit(snd, { vol });
    noteVoice(hitSoundStats.last);
  } catch (e) {
    /* never silent: the arrow's own old sample (v2.3.2511's fallback) */
    if (src === 'arrow') { try { BT_AUDIO.play('arrow-hit', { vol: 0.6 }); } catch (e2) { /* audio is best-effort */ } }
  }
}

/* What the voice just played was (BT_AUDIO._lastHit), kept with the hit that
   asked for it: an arrow that snaps plays the bone crack straight after,
   which is the next _lastHit. */
function noteVoice(rec) {
  const h = BT_AUDIO._lastHit;
  if (rec && h) { rec.keys = h.keys; rec.how = h.how; }
}

let _echoAt = [];

/** monster_hit from the worker, for monster `m` (gameEvents.js, inside the
 *  gate that already draws a flash and pieces for hits with no local site).
 *  Returns whether it played. */
export function echoHitSfx(S, p, m) {
  if (!S || !p || !m) return false;
  try {
    /* not a blow: a burn or poison tick, thorns, the second half of a
       collision (the blow itself carries the sound) */
    if (p.status || p.thorns || p.collision) return false;
    const mine = p.attackerId === S.myId;
    /* your own swings, shots and lunges were heard where they landed */
    if (mine && !((p.ability && p.ability !== 'lunge') || p.splash || p.burst)) return false;
    const now = Date.now();
    if (m._hitSndAt && now - m._hitSndAt < ECHO_GAP_MS) { hitSoundStats.echoSkipped++; return false; }
    _echoAt = _echoAt.filter((t) => now - t < ECHO_WINDOW_MS);
    if (_echoAt.length >= ECHO_BURST) { hitSoundStats.echoThrottled++; return false; }
    const at = posOf(m);
    const k = earVol(S, at.x, at.y);
    if (k <= 0.02) return false;
    const vol = ECHO_VOL * ECHO_K * k;
    const arch = m.archetype || m.type;
    const snd = hitSoundOf(arch);
    _echoAt.push(now);
    m._hitSndAt = now;
    hitSoundStats.echo++;
    hitSoundStats.lastEcho = { arch, mat: snd, vol, mine, ability: p.ability || null, splash: !!p.splash, burst: !!p.burst, at: now };
    BT_AUDIO.materialHit(snd, { vol });
    noteVoice(hitSoundStats.lastEcho);
    return true;
  } catch (e) { return false; /* sound only: never into the event handler */ }
}

/* Where each monster's last ball ended: monster id -> { at, how, x, y }.
   Ids are the worker's, so a Map (CLAUDE.md, the '__proto__' rule). */
function shotEnds(S) {
  if (!(S._shotEnds instanceof Map)) S._shotEnds = new Map();
  return S._shotEnds;
}

/** A monster's ball `proj` ending.  why: 'player' (it reached you), 'shield'
 *  (it reached you with your shield raised its way), 'prop' or 'land'
 *  (projectiles.js queueSnowballBurst).  Plays its break, and remembers it so
 *  the worker's blow for it is not a sword's (heroHitSfx). */
export function shotEndSfx(S, proj, why) {
  if (!S || !proj) return;
  try {
    const now = Date.now();
    let how = why === 'player' || why === 'shield' || why === 'prop' ? why : 'land';
    /* the worker already said this one hit you: it broke on you, wherever the
       drawn ball has got to -- and its blow is spent, so nothing is kept for
       one */
    if (proj._srvHit && how !== 'shield') how = 'player';
    if (proj.displayOnly && proj.ownerId != null && !proj._srvHit) {
      const ends = shotEnds(S);
      ends.set(proj.ownerId, { at: now, how, x: proj.x, y: proj.y });
      if (ends.size > 48) { for (const [id, e] of ends) if (now - e.at > 2000) ends.delete(id); }
    }
    const k = how === 'player' || how === 'shield' ? 1 : earVol(S, proj.x, proj.y);
    if (k <= 0.02) return;
    let style = 'goo';
    try { style = shotStyleOf(shotThrowerArch(S, proj), proj.kind); } catch (e) { /* goo, the default thrower's */ }
    hitSoundStats.shots++;
    hitSoundStats.lastShot = { style, how, k, owner: proj.ownerId, at: now };
    BT_AUDIO.shotHit(style, how, k);
  } catch (e) { /* sound only: never into the ball simulator */ }
}

/* Where a ball still flying will come down: it flies a straight line at
   `speed` px a frame for `life` more frames (projectiles.js). */
function landingOf(b) {
  const n = Math.max(0, Number(b.life) || 0) * (Number(b.speed) || 0);
  return { x: b.x + Math.cos(b.ang || 0) * n, y: b.y + Math.sin(b.ang || 0) * n };
}

/** Was the worker's blow from `monsterId` the ball that just broke on you
 *  (or is still in the air, the worker's tick a beat ahead of the drawing)?
 *  ONE blow per ball: a match is spent, so the same monster's swing a moment
 *  later is a swing again. */
export function shotHitMe(S, monsterId, now) {
  if (!S || monsterId == null) return false;
  const t = now || Date.now();
  const P = S.player;
  const ends = S._shotEnds instanceof Map ? S._shotEnds : null;
  const e = ends ? ends.get(monsterId) : null;
  if (e && t - e.at < SHOT_RECENT_MS
      && (e.how === 'player' || e.how === 'shield' || (P && Math.hypot(e.x - P.x, e.y - P.y) < SHOT_NEAR_PX))) {
    ends.delete(monsterId);
    return true;
  }
  /* still flying -- and coming down on you, not on a teammate it was thrown
     at before this monster turned its blow on you */
  const list = S.slimeProjectiles;
  if (P && Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b || !b.displayOnly || b.ownerId !== monsterId || b._srvHit) continue;
      const at = landingOf(b);
      if (Math.hypot(at.x - P.x, at.y - P.y) > SHOT_NEAR_PX * 1.5) continue;
      b._srvHit = true;
      return true;
    }
  }
  return false;
}

/** The worker's blow on you (gameEvents.js monster_attack), in place of its
 *  plain monsterHitHero: a ball's is softened (see the header). */
export function heroHitSfx(S, payload, armored) {
  let ball = false;
  try { ball = shotHitMe(S, payload && payload.monsterId); } catch (e) { ball = false; }
  let vol = 0.85;
  if (ball) {
    hitSoundStats.ballBlows++;
    vol = armored ? 0.85 * SHOT_CLANG_K : 0;
  }
  hitSoundStats.lastHero = { ball, armored: !!armored, vol, monsterId: payload ? payload.monsterId : null, at: Date.now() };
  try { if (BT_AUDIO._noteHero) BT_AUDIO._noteHero(armored, ball, vol); } catch (e) { /* a probe */ }
  if (vol > 0) { try { BT_AUDIO.monsterHitHero(armored, { vol }); } catch (e) { /* audio is best-effort */ } }
}

/* QA probe, house style (mp-hitvoices, mp-hitsound). */
if (typeof window !== 'undefined') {
  window.__btHitSounds = {
    stats: hitSoundStats,
    soundOf: (arch) => hitSoundOf(arch),
    earVol: (x, y) => { const S = window._gameState && window._gameState.current; return S ? earVol(S, x, y) : null; },
    shotHitMe: (id) => { const S = window._gameState && window._gameState.current; return S ? shotHitMe(S, id) : null; },
    consts: { EAR_NEAR, EAR_FAR, ECHO_K, ECHO_GAP_MS, ECHO_BURST, ECHO_WINDOW_MS, SHOT_RECENT_MS, SHOT_CLANG_K },
  };
}
