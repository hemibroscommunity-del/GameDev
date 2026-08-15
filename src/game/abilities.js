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
     isSwinging drives the sword stand-in the renderer draws.  The damage
     sweep that normally rides along with it is suppressed for this window
     (monsterCombat.js reads _abilitySwingUntil) — see the header. */
  var aim = (typeof S._aimAngle === 'number') ? S._aimAngle : (S._lastAimAngle || 0);
  S._abilitySwingUntil = now + 460;
  S._abilityFx = { kind: kind, at: now, ang: aim, radius: cfg.radius };
  S.swingTimer = now;
  S.isSwinging = true;
  S._specialAttack = true;   /* wide arc stand-in — a bash/whirl is a big swing */
  S._swingAng = aim;
  S.screenShake = kind === 'whirl' ? 5 : 3;

  /* Peers render the swing from this broadcast — the same event the ordinary
     swing sends, because the stand-in they draw is the same one.  Sent here
     rather than from the (suppressed) sweep. */
  if (S.channel) {
    var w = getActiveWeapon(R);
    try {
      S.channel.send({ type: 'broadcast', event: 'player_swing', payload: {
        id: S.myId, ts: now, special: true, wpn: (w && w.type) || 'sword', ang: aim,
      } });
    } catch (e) {}
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
