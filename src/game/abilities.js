/* ═══ v2.3.1733: STAMINA ABILITIES — the client half ═══
 *
 * PR 5 of docs/COMBAT-OVERHAUL-PLAN.md.  Two casts, one send each:
 *
 *   castAbility(S, 'bash')   Shield Bash — stun + knockback, 30% stamina
 *   castAbility(S, 'whirl')  Whirlwind  — AoE around you, 40% stamina
 *
 * THIS FILE DECIDES NOTHING.  Every gate below (level, cooldown, stamina,
 * equipment) is a COPY of a gate the worker enforces in abilities.js, and it
 * exists only so a refused cast is refused instantly on the phone instead of
 * a round trip later.  The server re-checks all of it; if the two ever
 * disagree, the server wins and ability_rejected explains why (see
 * wsClient's handler).
 *
 * NO LOCAL DAMAGE, DELIBERATELY.  The ordinary melee swing predicts its own
 * numbers and sends `monster_damage` for the worker to settle — but that
 * path is CLIENT-DRIVEN by construction (it exists because the swing arc is
 * geometry the client already owns).  These abilities are new surface, and
 * new surface starts authoritative (handoff rule zero): targets, damage,
 * stun and knockback are all resolved server-side and arrive as ordinary
 * `monster_hit` events.  That is why the swing sweep in monsterCombat.js is
 * SUPPRESSED for the ability's animation window (_abilitySwingUntil) — the
 * sweep would otherwise send a second, ordinary hit for the same button
 * press and every ability would silently deal double damage.
 */
import { BT_AUDIO, abilityCfg, abilityStaminaCost, abilityUnlocked, isAbilitiesEnabled,
  prog3CharLevel, getActiveWeapon,
  meleeSwingSfx /* v2.3.2260: the lunge borrows the swing's own per-weapon sound */ } from '@/data/index.js';
import { isPlayerDead, pushDmgPopup } from '@/game/combatHelpers.js';

/* Local cooldown clocks, keyed by our OWN constant names (never a client- or
   wire-supplied string), so a plain object is safe here. */
function cdMap(S) {
  if (!S._abilCd) S._abilCd = {};
  return S._abilCd;
}

/* ═══ v2.3.1735: WHICH WAY THE CAST POINTS ═══
 *
 * Owner: "right now the effect is east.  Make it apply in whatever direction
 * the effect is actually triggered."
 *
 * v2.3.1733 resolved the angle as `S._aimAngle ?? (S._lastAimAngle || 0)`,
 * and BOTH fallbacks are east: `_lastAimAngle` is only ever written by the
 * right-stick aim handler (BroTown.jsx), so a player who taps the ability
 * BUTTON without having aimed since load has it undefined — and `|| 0` is
 * zero radians, which is due east.  That is the whole bug: not a renderer
 * that ignores the angle (it honours it), but a cast that hands it east.
 *
 * The chain below ends at the body's own facing, so there is no path that
 * invents a direction the player is not looking.  Ordered by how deliberate
 * the input is, mirroring entityRenderer's own facing ladder (the comment at
 * its `swingActive` block) so the effect points where the body points:
 *   1. actively aiming            — the player is steering right now
 *   2. shield already raised      — bash-out-of-a-block is the signature use
 *   3. last aim                   — they aimed a moment ago
 *   4. smoothed movement facing   — where the body is pointed
 *   5. the legacy 4-way facing    — always set; the real floor
 * Only if EVERY one is missing do we fall through, and then to south (the
 * renderer's own default at visualSystems.js), never to east. */
/* How long the bash pose owns the body.  Matches the _abilitySwingUntil
   window exactly (now + 460) so the shield lowers on the same frame the
   damage-sweep suppression lifts — a pose outliving the window would leave
   the shield up through the next ordinary swing. */
export const BASH_POSE_MS = 460;

/* ═══ v2.3.2260: THE DASH'S OWN NUMBERS, IN ONE PLACE ═══
 * The lunge and the bash both close the distance by the same per-frame
 * integration in BroTown's movement block, and it had these as bare literals
 * (13 and 260) at the two ends of the codebase that have to agree.  Named and
 * shared, because the measurement that forced them to change -- a dash fired
 * at 220px arriving 57px short -- is a relationship BETWEEN them and the
 * ability's declared `reach`, not a property of either one.
 *
 * DASH_STEP_PX is per 60fps-frame and is multiplied by S._dtScale, so
 * DASH_MAX_STEP_PX is the real guard: the worker's anti-teleport rejects a
 * move over ~80px in one step, and a rejected correction snaps the player back
 * to where the dash began -- the exact miss the dash exists to prevent.
 * DASH_WINDOW_MS is a BACKSTOP for a target that keeps running; arrival is
 * what normally ends the move. */
export const DASH_STEP_PX = 26;
export const DASH_MAX_STEP_PX = 60;
export const DASH_WINDOW_MS = 420;
export const DASH_STOP_PX = 46;   /* contact range: just outside the body */
/* ═══ v2.3.2263: THE WINDOW IS A TRAVEL BUDGET, SO IT HAS TO KNOW THE TRAVEL ═══
 * Owner: "Sword dash deals damage when attacking using the proximity based
 * targeted attack but not when you tap to lock on a monster from across the
 * screen.  Maybe it is a server anti cheat issue.  It always says miss."
 *
 * It is not the anti-cheat, and that was worth ruling out before touching the
 * worker: replaying a real 560px lunge against a real GameRoom -- move packets
 * at the client's own MOVE_GAP_SOLO_MS (66ms), 103px apart, then the ability --
 * the worker accepted every packet (500 px/s x dt + 80px burst leaves ~10px of
 * headroom at that cadence) and the lunge LANDED, 500 -> 490 hp.  The server
 * is not what is refusing this.
 *
 * The client is, by arithmetic.  DASH_STEP_PX x 60 is 1560 px/s, so a FIXED
 * 420ms window is a hard travel budget of ~655px (~504 on a phone dropping to
 * the _dtScale clamp).  Tap-to-lock has no range limit at all -- it is a
 * screen-space hit test, which is what makes the 675px bow snipe work -- and on
 * the owner's viewport the world is ~716px across and ~1340px tall, so a
 * monster he can see and tap is routinely further away than the dash can reach
 * in 420ms.  The window then expires mid-flight, `_endDash(true)` strikes from
 * wherever he got to, and the worker range-checks a player still hundreds of px
 * away against `reach` 240 and answers whiff.  "Always says miss" is exactly
 * what a budget shorter than the screen produces.
 *
 * So the window becomes what it was always described as -- a BACKSTOP -- by
 * being derived from the gap it actually has to close, floored at the old 420
 * (nothing gets shorter) and capped by a reach that is deliberately a little
 * wider than the screen.  The cap is enforced on the TRAVEL as well as on the
 * clock, or the lunge would quietly become a traversal move: at full speed the
 * capped window alone would carry ~1350px, and a lock retained while walking
 * away would be a free 2.5s-cooldown teleport across half a zone. */
export const DASH_MAX_REACH_PX = 900;
/* The step, expressed as the loop actually spends it. */
export const DASH_SPEED_PX_PER_MS = DASH_STEP_PX * 60 / 1000;   /* 1.56 */
/* Frames get dropped, and the loop's own _dtScale clamp of 3 caps recovery at
   DASH_MAX_STEP_PX per frame -- 60 x 20fps = 1200 px/s against the nominal
   1560.  MEASURED, rather than trusted: mp-dashhit's far round reports the
   speed it actually achieved, and across runs on the same build that is 596 to
   1254 px/s with _dtScale pinned at its clamp of 3 -- i.e. the loop can spend
   less than half the nominal step, and the owner's phone is not a faster
   machine than the one measuring it.  3.0 covers the slowest of those.
   BEING GENEROUS HERE IS FREE, which is why it is not tuned finer: the window
   is not what bounds the move.  Arrival ends it, the travel cap ends it, a
   dead target ends it, a wall ends it -- and applyAbilityStrike re-stamps
   _abilitySwingUntil to 460ms on arrival, so a window longer than the travel
   needs does not hold the attack button down either.  The only case that
   spends the whole clock is a target outrunning a 1560 px/s lunge, which no
   monster in the game does. */
export const DASH_SLOW_FRAME_ALLOW = 3.0;
export const DASH_WINDOW_MAX_MS = Math.round(
  DASH_MAX_REACH_PX / DASH_SPEED_PX_PER_MS * DASH_SLOW_FRAME_ALLOW) + 90;   /* ~869 */
/* The gap a lunge has to close, and the window that covers it.  One function
   so the dash record and the swing clock cannot disagree about how long the
   move lasts -- they are the same number and they were both literals. */
export function dashWindowMs(S, target) {
  if (!S || !S.player || !target) return DASH_WINDOW_MS;
  const tx = (typeof target.renderX === 'number') ? target.renderX : target.x;
  const ty = (typeof target.renderY === 'number') ? target.renderY : target.y;
  if (typeof tx !== 'number' || typeof ty !== 'number') return DASH_WINDOW_MS;
  const dx = tx - S.player.x, dy = ty - S.player.y;
  const gap = Math.max(0, Math.sqrt(dx * dx + dy * dy) - DASH_STOP_PX);
  const need = Math.round(gap / DASH_SPEED_PX_PER_MS * DASH_SLOW_FRAME_ALLOW) + 90;
  return Math.min(DASH_WINDOW_MAX_MS, Math.max(DASH_WINDOW_MS, need));
}
/* The shockwave's opening, 120° — the SAME span as the shield's own guard
   cone (BLOCK_ARC_HALF = PI/3 either side, src/data/gameSystems.js), so the
   shove is drawn across exactly the face of the shield that threw it. */
export const BASH_ARC_SPAN = (Math.PI / 3) * 2;

/* The cast's shockwave.  ONE function, called for our own cast and again
   from gameEvents when a PEER's bash arrives, so the two can never drift
   into different-looking effects for the same ability — and so BASH_ARC_SPAN
   has exactly one reader.  x/y is the caster's chest, not their feet. */
export function pushAbilityRings(S, x, y, kind, ang, radius) {
  if (!S) return;
  if (!S._impactRings) S._impactRings = [];
  /* Same ts, different maxR + duration — the element nova's recipe
     (gameEvents element_nova).  Staggering the ts instead would start the
     second ring at a NEGATIVE age, and the renderer's (1 - age) width and
     alpha terms both read > 1 there, so it would pop in over-bright. */
  const isBash = kind === 'bash';
  const a = isBash ? ang : null;
  const span = isBash ? BASH_ARC_SPAN : null;
  const r = radius || 70;
  S._impactRings.push({
    x: x, y: y, ts: Date.now(), color: isBash ? '#D8A94D' : '#F2C14E',
    maxR: r / 1.5, duration: 380, ang: a, span: span,
  });
  S._impactRings.push({
    x: x, y: y, ts: Date.now(), color: '#FFFFFF',
    maxR: r / 2.2, duration: 240, ang: a, span: span,
  });
}

const _FACE_ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
export function resolveCastAngle(S) {
  if (!S) return Math.PI / 2;
  if (typeof S._aimAngle === 'number') return S._aimAngle;
  if (S._shieldUp && typeof S._shieldAngle === 'number') return S._shieldAngle;
  if (typeof S._lastAimAngle === 'number') return S._lastAimAngle;
  if (typeof S._facingAngle === 'number') return S._facingAngle;
  const f = _FACE_ANG[S._facing];
  return (typeof f === 'number') ? f : Math.PI / 2;
}

/* Everything the button needs to draw itself: unlocked, ready, affordable.
   One function so the button and the cast agree by construction. */
export function abilityStatus(S, kind) {
  var R = S && S.rpg;
  var cfg = abilityCfg(kind);
  if (!R || !cfg) return { visible: false };
  var level = prog3CharLevel(R);
  /* ═══ v2.3.2252: SHIELD BASH IS GATED ON THE SHIELD, NOT ON A LEVEL ═══
     Owner: "Make shield bash an ability for any level (no gates) the only
     requirement is you must have your shield held.  Then the button for shield
     bash appears."  So its button is a function of the STANCE, not of
     progression: a shield in hand and that shield raised.

     Written as a per-kind requirement rather than an `if (kind === 'bash')`
     branch, so the rule reads as data and the next ability with a stance
     requirement declares one instead of adding a second branch.

     `visible` is also what castAbility:141 gates on, so this is simultaneously
     the button rule and the cast rule on touch AND desktop -- they cannot
     disagree, which is the whole reason this function exists. */
  var needsHeld = cfg.needsHeldShield === true;
  var visible = abilityUnlocked(level, kind)
    && (!needsHeld || (!!R.shield && !!(S && S._shieldUp)));
  var now = Date.now();
  var readyAt = cdMap(S)[kind] || 0;
  var cost = abilityStaminaCost(R, kind);
  return {
    visible: visible,
    cost: cost,
    cdLeft: Math.max(0, readyAt - now),
    cdFrac: readyAt > now ? Math.min(1, (readyAt - now) / cfg.cooldownMs) : 0,
    afford: (R.stamina || 0) >= cost,
    equipped: cfg.needs === 'shield' ? !!R.shield : !!R.weapon,
  };
}

export function castAbility(S, kind) {
  var R = S && S.rpg;
  var cfg = abilityCfg(kind);
  if (!R || !cfg) return false;
  /* Deploy-order gate (rule 19): against a worker that does not advertise
     caps.abil the `ability` type would be relayed as a broadcast and never
     settled, so the cast would cost a predicted bar and do nothing. */
  if (!isAbilitiesEnabled()) return false;
  if (isPlayerDead(S)) return false;
  /* Same rule as swingAttack/specialAttack: a life-skill animation owns the
     body, and an ability mid-chop leaves the harvest running underneath. */
  if (S._extraction) return false;
  if (S._playerStunUntil && Date.now() < S._playerStunUntil) return false;

  var st = abilityStatus(S, kind);
  if (!st.visible) return false;
  if (st.cdLeft > 0) return false;
  if (!st.equipped) {
    pushDmgPopup(S, S.player.x, S.player.y - 30,
      cfg.needs === 'shield' ? 'No shield equipped!' : 'No weapon equipped!', '#D8A94D', { ts: Date.now() });
    return false;
  }
  if (!st.afford) {
    /* Say so.  The whole reason ability_rejected got a handler this version
       is that a silent refusal reads as a broken button (v2.3.1716). */
    pushDmgPopup(S, S.player.x, S.player.y - 30, 'Not enough energy!', '#F2C14E', { ts: Date.now() });
    return false;
  }

  var now = Date.now();
  cdMap(S)[kind] = now + cfg.cooldownMs;
  /* Predict the bar drop for snappy feedback; the worker's player_state
     lands within the tick and overwrites it (rule 20). */
  R.stamina = Math.max(0, (R.stamina || 0) - st.cost);

  /* ═══ v2.3.2252: A BASH NAMES ITS TARGET AND DASHES TO IT ═══
     Owner: "Shield bash almost never makes contact with the enemy.  Make
     yourself always dash to the enemy and make contact whenever you use shield
     bash."

     Two halves, and it needs both.  The worker's own scan is feet-to-feet at
     70px while the player's collision ring parks them 58-84px from a monster's
     feet -- against a mummy or a skeleton the bash could not land even while
     touching.  So the cast NAMES the monster it is committing to, and the
     worker validates that one against the longer `reach` (see its comment):
     the server still owns the damage and still range-checks, it just checks
     the distance the move is actually allowed to close.

     The target is the one already on screen -- the lock, which is the nearest
     enemy unless the player tapped another (v2.3.2251).  No second search, so
     the monster you are pointed at is the monster you bash.
     `targetId` is additive and optional: an older worker ignores it and falls
     back to its radius scan, and a newer worker with an older client does the
     same, so this ships in either order with no caps flag. */
  /* v2.3.2258: sworddash is the same move with a sword's numbers, so it takes
     the same declared target and the same frame-by-frame dash. */
  var _dashKind = (kind === 'bash' || kind === 'sworddash');
  var _bashLt = (_dashKind && S.lockedTarget && S.lockedTarget.type === 'monster')
    ? S.lockedTarget.ref : null;
  var _bashId = _bashLt && _bashLt.id != null ? _bashLt.id : null;
  /* THE DASH.  Integrated per frame by BroTown's movement block (never a
     position jump), because the worker's anti-teleport rejects a step over
     ~80px and a rejected correction would guarantee the miss it is meant to
     fix.  It stops at the target's edge rather than inside it, so the shove
     lands from contact range instead of shoving from on top of them. */
  /* ═══ v2.3.2260: THE WINDOW WAS SHORTER THAN THE REACH ═══
     Owner (of the sword lunge): "I want the character to zoom to the enemy AND
     make a swing at it (all in one motion)."  Measured on the real function
     before changing anything -- fire at a locked monster and sample the
     player's position:

         gap 150px  ->  closed to 46px   (contact: arrived)
         gap 220px  ->  closed to 103px  (stopped 57px short)

     The dash is declared at `reach` 240 and a lock is acquired out to ~220, so
     the case it fails is the ordinary one.  260ms at 13px per 60fps-frame is
     ~200px of travel IF every frame lands, and DASH_STEP_PX is multiplied by
     _dtScale, which is itself clamped to 3 -- so on a phone that drops frames
     the clock runs out with the player in open ground.

     Both terms move, and the window stops being what decides: the step is
     roughly doubled so the close reads as a ZOOM rather than a jog, and the
     window becomes a BACKSTOP for a target that keeps running rather than the
     thing that ends the move.  ARRIVAL ends it (the `_bdist <= _bstop` branch
     in BroTown's movement block), which is what the owner asked for.

     THE PER-FRAME CAP IS NOT DECORATION: the worker's anti-teleport rejects a
     step over ~80px, and DASH_STEP_PX x the _dtScale clamp of 3 is 78 -- one
     tuning nudge from a rejected move that would snap the player back to where
     the dash began and guarantee the miss this exists to fix.  Capped well
     under it, so the speed can be tuned without re-deriving the validator. */
  /* v2.3.2263: derived from the gap, not a literal -- see dashWindowMs.
     `travelled` is the other half of the cap: the clock alone would let a
     full-speed lunge carry ~1350px, which is a traversal move rather than a
     swing.  Both are recorded on the dash so the movement block enforces them
     without re-deriving either. */
  var _dashWin = _bashLt ? dashWindowMs(S, _bashLt) : DASH_WINDOW_MS;
  if (_bashLt) {
    S._bashDash = { targetId: _bashId, ref: _bashLt, startTime: now, until: now + _dashWin,
      travelled: 0, maxTravel: DASH_MAX_REACH_PX };
  } else {
    S._bashDash = null;
  }

  /* ═══ v2.3.2260: THE LUNGE STRIKES WHEN IT ARRIVES, NOT WHEN IT LEAVES ═══
     The second half of "all in one motion".  Everything below -- the swing
     animation, the peer broadcast, the rings, the sound, and the `ability`
     message the WORKER resolves the hit from -- used to fire on the press,
     while the player was still travelling.  So the swing played at the old
     position and was over before arrival, and the worker measured the hit from
     where the dash STARTED (combat-side: _handleAbility reads ps.x/ps.y the
     moment the message lands, with the declared-target `reach` fallback doing
     the real work).  Two events, in the wrong order.

     For sworddash the strike is now stashed and fired by the movement block
     when the dash ends -- so the sequence is close, then hit, and the worker
     range-checks from where the player actually ended up, which is strictly
     more likely to connect than where they began.

     BASH IS DELIBERATELY UNCHANGED.  Its shove and stun landing on the press
     is what the owner tuned in v2.3.2252, its pose is a shield rather than a
     swing, and it was not what was asked about.  It still gets the longer,
     faster dash above, which is the half of v2.3.2252's own directive ("make
     yourself always dash to the enemy and make contact") that was falling
     short for the same reason.

     THE SUPPRESSION AND THE SWING CLOCK ARE STAMPED NOW, NOT AT ARRIVAL.  The
     press set S.autoAttack, so without them the auto-attack loop would fire an
     ORDINARY swing during the ~150ms of travel and bill the same thumb twice.
     swingTimer holds the loop off for its whole cooldown and _abilitySwingUntil
     covers travel + the strike's own 460ms window; applyAbilityStrike re-stamps
     both when it lands. */
  var _defer = (kind === 'sworddash' && !!_bashLt);
  if (_defer) {
    S._dashStrike = { kind: kind, targetId: _bashId, at: now };
    S.swingTimer = now;
    /* v2.3.2263: the SAME window the dash got.  These were both
       DASH_WINDOW_MS, and leaving this one a literal while the dash grew would
       let the auto-attack loop fire an ordinary swing partway through a long
       lunge -- billing one thumb twice, which is the exact thing this line
       exists to prevent. */
    S._abilitySwingUntil = now + _dashWin + 460;
    return true;
  }
  S._dashStrike = null;
  applyAbilityStrike(S, kind, _bashId);
  return true;
}

/* ═══ v2.3.2260: THE HALF OF A CAST THAT CAN BE MADE TO WAIT ═══
 * Extracted from castAbility unchanged in behaviour, so that a lunge can run
 * it on ARRIVAL instead of on the press (see the note above).  Everything
 * here is "the ability going off": the message the worker resolves from, the
 * animation, what peers see, the rings and the sound.  Everything that must
 * happen on the PRESS -- the cooldown, the stamina, the dash record, the
 * sweep suppression -- stays in castAbility.
 *
 * Called with the target id the cast committed to so the worker's declared-
 * target fallback still names the same monster it named before.
 */
export function applyAbilityStrike(S, kind, targetId) {
  var R = S && S.rpg;
  var cfg = abilityCfg(kind);
  if (!R || !cfg) return false;
  var now = Date.now();
  try {
    S.channel && S.channel.send({ type: 'ability',
      payload: targetId != null ? { kind: kind, targetId: targetId } : { kind: kind } });
  } catch (e) {}

  /* ═══ THE ANIMATION, WITHOUT THE HIT ═══
     The damage sweep that normally rides along with a swing is suppressed
     for this window (monsterCombat.js reads _abilitySwingUntil) — see the
     header.  Kept for BOTH kinds even though bash no longer raises
     isSwinging: a swing already in flight when the button lands would
     otherwise keep its sweep and bill the same press twice. */
  var aim = resolveCastAngle(S);
  S._abilitySwingUntil = now + 460;
  S._abilityFx = { kind: kind, at: now, ang: aim, radius: cfg.radius };
  S.swingTimer = now;
  S._swingAng = aim;
  S.screenShake = kind === 'whirl' ? 5 : 3;

  /* ═══ v2.3.1735: A BASH LOOKS LIKE A SHIELD, NOT A SWORD ═══
     Owner: "just display the shield being held during the course of the
     animation in the direction it was triggered.  Right now it displays the
     sword special attack."

     It did, literally: v2.3.1733 set _specialAttack, which is the flag the
     melee SPECIAL uses — so bash borrowed the sword stand-in body AND the
     painted golden crescent keyed to it (effectsRenderer SWORD_SLASH, drawn
     under `if (S._specialAttack …)`).  Shoving someone with a shield read as
     a greatsword flourish.

     Bash now takes a pose of its own, modelled on the dodge roll
     (S._dodgeRoll, v2.3.1534): a stamped window that owns the body's facing
     while it runs and expires on its own.  Whirlwind KEEPS the swing
     stand-in — it genuinely is a big all-round swing, and the owner asked
     only for bash to change.

     NOT S._shieldUp, deliberately.  That flag is the real block: wsClient
     puts `blocking: !!S._shieldUp` on every move message, so posing with it
     would tell the worker you are guarding — billing the v2.3.1731 block
     stamina ON TOP of the bash's own 30%, opening a parry window, and
     handing out free mitigation for the length of the animation.  A visual
     must not buy defence. */
  if (kind === 'bash') {
    S._bashPose = { ang: aim, t0: now, until: now + BASH_POSE_MS };
  } else {
    S.isSwinging = true;
    S._specialAttack = true;   /* wide arc stand-in — a whirl is a big swing */
  }

  /* Peers render this from the broadcast.  `bash` rides on the EXISTING
     player_swing rather than earning a new event type: a new server-emitted
     type would need a PRIVILEGED_EVENTS line (wire-audit), and this is one
     boolean on a payload peers already parse.  Without it a watching player
     sees a sword slash while the caster sees a shield. */
  if (S.channel) {
    var w = getActiveWeapon(R);
    try {
      S.channel.send({ type: 'broadcast', event: 'player_swing', payload: {
        id: S.myId, ts: now, special: true, wpn: (w && w.type) || 'sword', ang: aim,
        bash: kind === 'bash',
      } });
    } catch (e) {}
  }

  /* The shockwave, pointed down the cast.  Two rings at different rates read
     as a shove leaving the shield rather than a flat circle — the same
     two-ring recipe the element nova uses (gameEvents element_nova).  Drawn
     as an ARC for bash because the ability itself is directional (the worker
     picks the nearest monster within cfg.radius), so a full ring would
     promise a 360° hit the server never rolls. */
  pushAbilityRings(S, S.player.x, S.player.y - 10, kind, aim, cfg.radius);

  /* v2.3.1735: the whirlwind's vortex (owner art), centred on the caster
     because that is where the gather pulls everything TO.  Read by
     effectsRenderer._updateWhirlVortex, which no-ops until the sheet is
     committed. */
  if (kind === 'whirl') {
    S._whirlFx = { t0: now, x: S.player.x, y: S.player.y - 10, radius: cfg.radius };
  }

  if (kind === 'bash') {
    /* v2.3.1737: the owner's shield-impact sample replaces the two-tone
       synth stand-in v2.3.1733 shipped.  Fired here, on the CAST, not on the
       hit: the cast is the button press, so the sound is immediate feedback
       that the ability went off — and a bash that whiffs (the worker rolls
       the targets) should still sound like you swung the shield, exactly as
       the swing SFX plays on a missed swing.
       Falls back to the old beeps if the sample has not decoded yet — the
       manifest loads on demand, so the very first bash of a session can land
       before it is ready, and silence would read as a broken button. */
    /* play() returns the {src,gain} handle on success and NULL when the
       sample is not decoded yet (it kicks the load and gives up on this
       call), so the test is truthiness — an early `!== false` here would
       have counted that null as a success and left the first bash silent. */
    var _bashSfx = null;
    try { _bashSfx = BT_AUDIO.play('shield-bash', { vol: 0.9 }); } catch (e) { _bashSfx = null; }
    if (!_bashSfx) {
      BT_AUDIO.beep(180, 0.16, 0.22, 'square');
      setTimeout(function () { return BT_AUDIO.beep(120, 0.12, 0.18, 'sawtooth'); }, 70);
    }
  } else if (kind === 'sworddash') {
    /* ═══ v2.3.2260: A LUNGE SOUNDS LIKE A SWORD ═══
       This branch was `else`, so sworddash -- added at v2.3.2258 and never
       given a sound of its own -- fell into WHIRLWIND's wind-impact sample.
       The owner asked for the lunge to "make a swing at it"; it should sound
       like the swing it is.  meleeSwingSfx is the same per-weapon rotation the
       ordinary swing and the tapped swing both use (v2.3.1798), so a lunge with
       a greatsword and a swing with a greatsword cannot drift apart. */
    try { BT_AUDIO.play(meleeSwingSfx(R), { vol: 0.9 }); } catch (e) {}
  } else {
    /* v2.3.1738: the owner's wind-impact sample, same shape as bash above —
       fired on the cast, with the synth stand-in kept as the fallback for the
       window before the sample decodes. */
    var _whirlSfx = null;
    try { _whirlSfx = BT_AUDIO.play('whirlwind', { vol: 0.9 }); } catch (e) { _whirlSfx = null; }
    if (!_whirlSfx) {
      BT_AUDIO.beep(320, 0.12, 0.18, 'sawtooth');
      setTimeout(function () { return BT_AUDIO.beep(420, 0.12, 0.16, 'sawtooth'); }, 80);
      setTimeout(function () { return BT_AUDIO.beep(520, 0.14, 0.14, 'sawtooth'); }, 160);
    }
  }
  return true;
}

/* ═══ v2.3.2258: THE FIRST ATTACK OF AN ENGAGEMENT IS A LUNGE ═══
 * Owner: "For ONLY melee (sword) ... the default first attack will be very
 * similar to 'shield bash' (you can even re-use the mechanic but for sword)
 * and keep the stun enemy effect.  I've been feeling like melee is a little
 * underpowered so this should help."
 *
 * Called from the right control's PRESS -- both surfaces, the zone stick and
 * the contextual disc, because either one can start a fight and the owner did
 * not distinguish them.  Returns true when it took the press, in which case
 * the caller's ordinary swing is skipped: castAbility stamps
 * `_abilitySwingUntil`, which suppresses the normal damage sweep so the hit is
 * billed once, by the worker, at the ability's own numbers.
 *
 * WHAT MAKES IT "THE FIRST ATTACK" is the cooldown, not a per-target flag.  A
 * flag was the first design and it is worse: it needs an owner (clear on lock
 * change? on release? on the monster's death?), and every one of those answers
 * is a way for a player to re-lunge for free by tapping something else and
 * tapping back.  2500ms says "once per engagement" without anything to keep in
 * sync, and it degrades honestly -- a long fight gets another lunge, which is
 * a fair reading of "melee is underpowered" anyway.
 *
 * NOT WHILE THE SHIELD IS UP: that press is bash's, and firing both off one
 * thumb would spend 40% of the bar in a frame.  NOT FOR BOW OR STAFF: "For
 * ONLY melee (sword)", and their slot is the same field targeting reads.
 */
export function maybeSwordDash(S) {
  if (!S || !S.rpg || !S.player) return false;
  var slot = S.rpg.activeSlot;
  if (slot === 'ranged' || slot === 'staff') return false;
  if (S._shieldUp) return false;
  var lt = S.lockedTarget;
  if (!lt || lt.type !== 'monster' || !lt.ref) return false;
  var m = lt.ref;
  if (m.alive === false || (m.curHp != null && m.curHp <= 0)) return false;
  var st = abilityStatus(S, 'sworddash');
  if (!st.visible || !st.equipped || st.cdLeft > 0 || !st.afford) return false;
  return castAbility(S, 'sworddash') === true;
}

/* Dev probe, house style (__btAtkMark, __btPlayerDrawn): the lunge fires from
   inside a touch handler, and a scenario cannot press a button and then ask
   "was that a lunge or an ordinary swing?" without one -- both stamp
   swingTimer.  Exposed as the same call the press makes, so the test drives
   the real function rather than a re-implementation of its rules. */
if (typeof window !== 'undefined') {
  window.__btMaybeSwordDash = function () {
    try { return maybeSwordDash(window._gameState && window._gameState.current); }
    catch (e) { return null; }
  };
}

/* Companion probe: WHY a lunge was refused.  A boolean false from
   __btMaybeSwordDash has five possible causes and a scenario that cannot tell
   them apart reports "it does not work" for a fixture that simply has no
   sword. */
if (typeof window !== 'undefined') {
  window.__btAbilityStatus = function (kind) {
    try { return abilityStatus(window._gameState && window._gameState.current, kind); }
    catch (e) { return null; }
  };
}
