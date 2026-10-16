/* ═══ v2.3.3266: ANOTHER PLAYER'S SHOT, AS IT FLIES ON THEIR SCREEN ═══
 *
 * Owner, on what #920 found ("Real archers' arrows look 3x slower to everyone
 * else ... Other players' shots fly straight through you on your screen, and
 * a real mage's bolt flies straight on your screen, even though it chases you
 * on the mage's screen, where the hit is decided"): "Yes do the follow up
 * fixes".
 *
 * What a watcher drew of somebody else's shot (visualSystems.js, the remote
 * projectile simulation) and what the shooter's own screen draws
 * (projectiles.js) had come apart three ways:
 *
 *   1. SPEED.  An arrow has flown 24 px a frame since v2.3.2473 (x the bow's
 *      Longshot and the depth, its `_rangeMult`), and the copy on every other
 *      screen still flew the old 8: the damage landed with the drawn arrow a
 *      third of the way there.  But the shot already says how far it reaches
 *      -- its `life` is 90 frames x that same multiplier (monsterCombat, dodge,
 *      playerActions, since v2.3.2592) -- so the watcher reads the multiplier
 *      back off it, flies the copy at the shooter's speed, and ends it at the
 *      shooter's reach, where their own arrow comes down (BOW_RANGE_PX x the
 *      multiplier) -- solid to the end, as theirs is.  For EVERY shooter, an older page's too: nothing new on
 *      the wire for it.  The bow volley flies at its own 0.7 (BOW_VOLLEY
 *      SPEED_K, the `volley` flag says so), and its stagger -- sized by the
 *      shooter in frames of the old 8 px (BOW_VOLLEY.PEER_PX_PER_FRAME) -- is
 *      counted in this speed's frames, so the train is still 200 px apart.
 *      A shot that says its own speed (`speedPx`: the staff specials) keeps
 *      the old meaning exactly, its life in its own frames.
 *   2. THE LINE.  A loosed arrow keeps the line it was shot on (v2.3.2258);
 *      its copy was drawn from where the shooter IS each frame, so it slid
 *      sideways as they walked on.  The copy's line is stamped as it leaves
 *      now, and a volley's later arrows take the first one's.  A bolt still
 *      sweeps round its caster, as it does on the caster's screen (v2.3.2261).
 *   3. THE TARGET.  A shot at a player you have locked, where the hit test
 *      will try them (a duel, No man's land, a sparring clone), names them:
 *      `tg` (`shotTargetId` below).  On every screen the arrow leaves aimed at
 *      them as THAT screen draws them -- the shooter aimed at the lock -- and
 *      ends where it reaches them, the room it has the shooter's own PvP test
 *      (`PEER_SHOT.ARROW_R`); a bolt turns to them every frame and ends at
 *      them, as it homes on the lock on the caster's screen.  A shot that
 *      PIERCES flies on through, as it does on the shooter's screen: every bow
 *      special (playerActions: `pierce: true`), and a plain arrow with the
 *      Piercing stat (`pc`).  A shot without a lock names nobody and flies as
 *      before.  The worker never reads any of it: it only decides where a
 *      drawn shot stops on a screen.
 *
 * Imports nothing, so server/test/peer-shots.test.mjs can run it.  The
 * numbers it is handed (`c`) are the game's own, passed in by the callers:
 * ARROW_SPEED_PX (projectiles.js), BOW_RANGE_PX (gameSystems.js) and the
 * BOW_VOLLEY constants, so there is one copy of each.
 */

export const PEER_SHOT = Object.freeze({
  /* the frames of life a shooter sends an arrow with for each 1.0 of its
     `_rangeMult` (monsterCombat / dodge / playerActions: 90 x bowRangeMult x
     depthK) -- what the multiplier is read back off */
  LIFE_PER_K: 90,
  /* a forged or garbled life cannot make a copy fly at a silly speed */
  K_MIN: 0.25,
  K_MAX: 4,
  /* the room a shot has to reach its target in: projectiles.js's PvP test --
     an arrow PVP_BODY_R 22 + its drawn half 6.6, a special 22 x 1.5 */
  ARROW_R: 28.6,
  SPECIAL_R: 33,
  /* a bolt ends this short of the middle of the body (v2.3.3265) */
  BOLT_STOP: 18,
  /* the longest a copy waits at the bow (frames): visualSystems' old cap */
  HOLD_MAX: 60,
  /* an id is a string of a sane length (a peer wrote it) */
  ID_MAX: 80,
});

const FRAME_MS = 1000 / 60;

/** How a peer's shot flies on this screen.
 *  `p`: the payload as it arrived; `life`: its life in frames, already clamped
 *  (gameEvents.js); `c`: { arrowPx, reachPx, volleyK, peerPx } -- the game's
 *  ARROW_SPEED_PX, BOW_RANGE_PX, BOW_VOLLEY.SPEED_K and
 *  BOW_VOLLEY.PEER_PX_PER_FRAME.
 *  Returns { speedPx, reach, holdFrames, pierce }:
 *    speedPx    px per 60 Hz frame, or null for the type's own (a bolt's 5);
 *    reach      px from where it leaves, where an arrow ends -- null when
 *               its life ends it (a bolt, or a shot that says its own speed);
 *    holdFrames how long a bow volley's arrow waits at the bow;
 *    pierce     it flies on through the player it hits. */
export function peerShotFlight(p, life, c) {
  const isStaff = !!(p && p.isStaff);
  const sent = (p && Number(p.speedPx) > 0) ? Math.min(20, Number(p.speedPx)) : null;
  const delayMs = (p && Number(p.delayMs) > 0) ? Number(p.delayMs) : 0;
  const out = { speedPx: sent, reach: null, holdFrames: 0, pierce: false };
  if (isStaff) return out;
  out.pierce = !!(p.isSpecial || p.pc);
  if (sent != null) {
    /* a shot that names its speed: its delay is in its own frames (v2.3.2848) */
    out.holdFrames = delayMs > 0 ? Math.min(PEER_SHOT.HOLD_MAX, Math.round(delayMs / FRAME_MS)) : 0;
    return out;
  }
  const k = Math.max(PEER_SHOT.K_MIN, Math.min(PEER_SHOT.K_MAX, (Number(life) || PEER_SHOT.LIFE_PER_K) / PEER_SHOT.LIFE_PER_K));
  out.speedPx = c.arrowPx * k * (p.volley ? c.volleyK : 1);
  out.reach = c.reachPx * k;
  /* the shooter sized the wait for an arrow flying peerPx a frame (playerActions
     volleyDelayMs(i, PEER_PX_PER_FRAME)): the same px of gap at this speed */
  out.holdFrames = delayMs > 0 ? Math.min(PEER_SHOT.HOLD_MAX, (delayMs / FRAME_MS) * c.peerPx / out.speedPx) : 0;
  return out;
}

/** The player a shot of YOURS is aimed at and may hit, for its relay's `tg`:
 *  the player you have locked, when projectiles.js's PvP test will try them --
 *  your duel opponent, or anyone locked outside a safe zone.  Every locked
 *  shot leaves along the line to the lock (projectiles.js `lockPt`), which is
 *  what lets a watcher aim the copy at them.  null for anything else. */
export function shotTargetId(S, zoneSafe) {
  const lt = S && S.lockedTarget;
  if (!lt || lt.type !== 'player' || lt.id == null) return null;
  const id = String(lt.id);
  if (!id || id.length >= PEER_SHOT.ID_MAX) return null;
  if (S._inDuel) return String(S._inDuel.opponent) === id ? id : null;
  return zoneSafe ? null : id;
}

/** Where the player a peer's shot names (`tg`) is drawn on THIS screen: you
 *  where you are, anyone else where their copy is drawn.  null when they are
 *  not here, or have no place yet. */
export function peerShotTargetAt(S, id) {
  if (!S || id == null) return null;
  const me = id === S.myId;
  const o = me ? S.player : (S.others ? S.others[id] : null);
  if (!o) return null;
  const x = (!me && typeof o.renderX === 'number') ? o.renderX : o.x;
  const y = (!me && typeof o.renderY === 'number') ? o.renderY : o.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  return { x, y };
}

/** Where a peer's arrow reaches a target at (tx, ty) this frame, if it does:
 *  the frame's step from (x0, y0) to (x1, y1) passes within `r` of it.  The
 *  segment, not the point, as the shooter's own test sweeps it (v2.3.2426). */
export function stepReaches(x0, y0, x1, y1, tx, ty, r) {
  const sx = x1 - x0, sy = y1 - y0, l2 = sx * sx + sy * sy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((tx - x0) * sx + (ty - y0) * sy) / l2)) : 1;
  return Math.hypot(tx - (x0 + t * sx), ty - (y0 + t * sy)) < r;
}
