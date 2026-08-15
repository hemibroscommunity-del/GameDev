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
  prog3CharLevel, getActiveWeapon } from '@/data/index.js';
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
  var visible = abilityUnlocked(level, kind);
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

  try { S.channel && S.channel.send({ type: 'ability', payload: { kind: kind } }); } catch (e) {}

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
    BT_AUDIO.beep(180, 0.16, 0.22, 'square');
    setTimeout(function () { return BT_AUDIO.beep(120, 0.12, 0.18, 'sawtooth'); }, 70);
  } else {
    BT_AUDIO.beep(320, 0.12, 0.18, 'sawtooth');
    setTimeout(function () { return BT_AUDIO.beep(420, 0.12, 0.16, 'sawtooth'); }, 80);
    setTimeout(function () { return BT_AUDIO.beep(520, 0.14, 0.14, 'sawtooth'); }, 160);
  }
  return true;
}
