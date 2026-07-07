/* ═══ COMBAT HELPERS — build progression, peer damage smoothing, shield arc, lifesteal ═══ */
/* v2.3.765: moved verbatim from src/ui/BroTown.jsx lines 139-406 as the first
   behavior-frozen extraction of the rebuild-in-place plan (docs/REBUILD-PLAN.md).
   No logic changes; all version-tag comments preserved. The only edit is the
   explicit imports below — in BroTown.jsx these three symbols resolved via the
   module-level DATA destructure / Object.assign(globalThis, DATA); an extracted
   module must never rely on those globals because it evaluates before BroTown's
   globalThis assignments run. The defensive typeof guards in the code are kept
   verbatim. window._gameState / window._setLevelUpMsg stay as runtime lookups
   by design (they are wired up inside the BroTown component each render). */
import { xpRequired, recalcDerived, BT_AUDIO } from '@/data/index.js';

/* Use-trained Tier-1 stat progression (GDD §1.1, §1.2, §1.4).
   Per-level budget = 5 T1 points; threshold per +1 stat = xpRequired/5.
   No per-stat ceiling in this prototype — the lifetime cap is the total
   T1 budget (5/level × 99 earned levels = 495 points, GDD §1.4), so a
   locked-pure build can reach ~495 in one stat and clear the §4.1
   tier-20 gate at stat 200.  Diverges from the GDD §1.4 99-per-stat
   ceiling intentionally; reconciliation is a deferred follow-up.

   Two-phase model:
   1. Each combat action increments `_buildUse[stat]` by an action-
      magnitude weight (damage dealt, damage taken, stamina spent, mana
      spent).  No stat XP is granted yet.
   2. On monster kill, `distributeKillXpToBuild` divides `killXp`
      proportionally across stats by their share of `_buildUse`, then
      resets the tally so the next encounter starts clean.
   Net result: total stat XP per kill = monster XP exactly, distributed
   by relative usage frequency — matches the user's request and GDD
   invariant. */

/* v2.3.153: relabel the T1 stats to the weapon-class names the user
   talks about (Power -> Melee, Agility -> Archery, Mind -> Magic).
   Vitality / Endurance keep their existing names since they don't
   correspond to a weapon. Used by both the dmgNumbers floater
   (pushStatIncreaseNotice) and the LEVEL UP banner (levelUpMsg). */
var BUILD_LABELS = {
  power: 'Melee', vitality: 'Vitality', endurance: 'Endurance',
  agility: 'Archery', mind: 'Magic',
};
/* Icon for each stat's level-up banner. Combat falls through to
   '/icons/popups/xp.webp' in the banner render itself. */
var BUILD_ICONS = {
  power:     '/icons/popups/sword.webp',
  vitality:  '/icons/popups/heart.webp',
  endurance: '/icons/ui/bar-stam.webp',
  agility:   '/icons/popups/arrow.webp',
  mind:      '/icons/popups/spell.webp',
};

/* ─── Peer damage-number smoothing (spec: smooth-peer-damage-numbers.md) ───
   Other players' hits arrive coalesced when the watcher's socket / main
   thread hitches: several server ticks deliver in one JS turn, so a burst
   of floaters all get a near-identical ts and the anti-overlap stacker
   lays them out as a vertical column ("all at once").  These give *incoming
   peer* numbers a tiny playback buffer (the same idea as the remote-position
   interpolation buffer) so a burst drips out at a live cadence.  The local
   player's own numbers stay immediate -- only attackerId !== myId entries
   enqueue, so self-feedback keeps zero latency. */
var PEER_DMG_MIN_SPACING_MS = 80;   /* min gap between released peer numbers per source (~live attack cadence) */
var PEER_DMG_MAX_HOLD_MS    = 600;  /* force-release a queued number after this; bounds lag (<= 1200ms float TTL) */
var PEER_DMG_QUEUE_CAP      = 12;   /* per-source queue cap; collapse oldest beyond this */

/* Stable per-source key: monsterId when the server zone gives us one, else a
   coarse position bucket for client-local monster_dmg_at (carries only x,y). */
function peerDmgKey(monsterId, x, y) {
  if (monsterId !== null && monsterId !== undefined) return 'm:' + monsterId;
  return 'p:' + Math.round((x || 0) / 24) + ':' + Math.round((y || 0) / 24);
}

function enqueuePeerDamage(S, key, floater) {
  if (!S._peerDmgQueue) S._peerDmgQueue = {};
  var q = (S._peerDmgQueue[key] = S._peerDmgQueue[key] || []);
  floater.recvTs = Date.now();
  q.push(floater);
  /* Bound growth: collapse the oldest if one source's queue runs away
     (sustained arrival rate > release rate). */
  if (q.length > PEER_DMG_QUEUE_CAP) q.splice(0, q.length - PEER_DMG_QUEUE_CAP);
}

/* Drain -- called once per frame from the main loop.  Releases at most one
   queued number per source per frame, spaced by MIN_SPACING, force-flushing
   any head past MAX_HOLD so heavy DPS can't build an ever-growing backlog. */
function releasePeerDamage(S, now) {
  var Q = S._peerDmgQueue;
  if (!Q) return;
  /* Zone change: drop queued numbers from the previous zone so a stale
     position never spawns into the new one.  Centralizes the clear across
     every zone-transition path (dmgNumbers itself is never explicitly
     cleared either -- it ages out -- so this stays in parity, just faster). */
  if (S._peerDmgZone !== S.currentZone) {
    S._peerDmgQueue = {};
    S._peerDmgLastRel = {};
    S._peerDmgZone = S.currentZone;
    return;
  }
  var L = S._peerDmgLastRel || (S._peerDmgLastRel = {});
  for (var key in Q) {
    var q = Q[key];
    if (!q || !q.length) continue;
    var last = L[key] || 0;
    var head = q[0];
    var held = now - head.recvTs;
    if (now - last >= PEER_DMG_MIN_SPACING_MS || held >= PEER_DMG_MAX_HOLD_MS) {
      head.ts = now;            /* restart the float animation from release time */
      delete head.recvTs;
      S.dmgNumbers.push(head);
      q.shift();
      L[key] = now;
    }
    if (!q.length) delete Q[key];
  }
}

function pushStatIncreaseNotice(R, stat, beforeMax) {
  var S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  if (!S || !S.dmgNumbers || !S.player) return;
  var label = BUILD_LABELS[stat] || stat;
  var newVal = R[stat] || 0;
  var benefit = '';
  if      (stat === 'vitality')  benefit = '+' + Math.max(0, (R.maxHp      || 0) - (beforeMax.hp   || 0)) + ' HP';
  else if (stat === 'mind')      benefit = '+' + Math.max(0, (R.maxMana    || 0) - (beforeMax.mp   || 0)) + ' mana';
  else if (stat === 'endurance') benefit = '+' + Math.max(0, (R.maxStamina || 0) - (beforeMax.stam || 0)) + ' stamina';
  else if (stat === 'power')     benefit = '+0.8 base damage';
  else if (stat === 'agility')   benefit = 'speed +0.12%';
  /* Small in-world floater (silver as of v2.3.153 -- matches the
     banner color so the two pieces of feedback read as the same
     event). */
  pushDmgPopup(S, S.player.x, S.player.y - 70, label + ' level ' + newVal + '!', '#c0c0c0');
  /* Benefit (green) — sits just under the title. */
  if (benefit) {
    pushDmgPopup(S, S.player.x, S.player.y - 55, benefit, '#3dd497');
  }
  try { if (typeof BT_AUDIO !== 'undefined' && BT_AUDIO.beep) BT_AUDIO.beep(900, 0.06, 0.10, 'sine'); } catch (e) {}
  /* Fire the big banner with kind=stat so it renders in silver with
     the weapon icon. window._setLevelUpMsg is exposed inside the
     BroTown component each render. */
  if (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function') {
    window._setLevelUpMsg({ kind: stat, level: newVal, ts: Date.now() });
  }
}

function addBuildProg(R, stat, amount) {
  if (!R || !amount || amount <= 0) return;
  /* GDD §1.5 — locked stat: share is burned, not redistributed. */
  if (R._statLocks && R._statLocks[stat]) return;
  if (!R._buildProg) R._buildProg = { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
  R._buildProg[stat] = (R._buildProg[stat] || 0) + amount;
  /* v2.3.113: bumped 5x slower per user feedback ("leveling way too
     quickly").  Was Math.max(50, floor(xpRequired/5)) -- now uses
     full xpRequired with a 200 floor.
     v2.3.910: keyed to the STAT'S OWN level, not combat level, so specializing
     (one skill 10->11) costs progressively more than a fresh point (3->4) --
     "pure" builds spend more time for the same combat level than "spread"
     ones.  (Combat level is now the SUM of the stats, so keying the cost to it
     would make leveling stall.) */
  var thresh = Math.max(200, Math.floor(xpRequired(R[stat] || 0)));
  while (R._buildProg[stat] >= thresh) {
    R._buildProg[stat] -= thresh;
    R[stat] = (R[stat] || 0) + 1;
    /* v2.3.1154: HP/Endurance grids — a vitality/endurance level grants
       grid points (WEAPON_PTS_PER_LEVEL parity; the server backfills
       pre-grid saves via its migrations).  v2.3.1157: 2 points per
       level, and the grant stops at stat 100 — earned = min(200,
       2 × stat), the per-skill lifetime pool of the 1000-pt economy. */
    if (stat === 'vitality' && (R.vitality || 0) <= 100) R.hpUnspent = (R.hpUnspent || 0) + 2;
    else if (stat === 'endurance' && (R.endurance || 0) <= 100) R.enduranceUnspent = (R.enduranceUnspent || 0) + 2;
    /* A1 gate accumulator -- combat level-up is blocked until 5 of
       these have ticked since the last level. Counts crossings in any
       T1 stat, mirrors the per-level budget. */
    R._buildPointsThisLvl = (R._buildPointsThisLvl || 0) + 1;
    /* v2.3.154: tell the worker about the build-point tick so its
       MP-side BP gate (build-points-gate-server.md) can count toward
       its own level-up. No-op in SP / pre-worker-update sessions
       (S.channel may be null). Server doesn't need to echo back --
       its level-up will arrive via the existing combat_credit +
       player_state events. */
    try {
      var _S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
      if (_S && _S.channel && typeof _S.channel.send === 'function') {
        _S.channel.send({ type: 'build_point_earned' });
      }
    } catch (e) {}
    var beforeMax = { hp: R.maxHp, mp: R.maxMana, stam: R.maxStamina };
    if (typeof recalcDerived === 'function') recalcDerived(R);
    pushStatIncreaseNotice(R, stat, beforeMax);
  }
}

function addBuildUse(R, stat, weight) {
  if (!R || !weight || weight <= 0) return;
  if (!R._buildUse) R._buildUse = { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
  R._buildUse[stat] = (R._buildUse[stat] || 0) + weight;
}

/* 120° shield arc check per brotown_directional_block_spec Part 3.
   Returns true if an attacker at (ax, ay) is within ±60° of the
   player's current shield facing.  When _shieldAngle is unset
   (non-directional fallback path), returns true to preserve old
   behavior. */
function isAttackInShieldArc(S, ax, ay) {
  if (!S || !S.player) return true;
  if (typeof S._shieldAngle !== 'number') return true;
  var atkFromAng = Math.atan2(ay - S.player.y, ax - S.player.x);
  var d = ((atkFromAng - S._shieldAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return Math.abs(d) <= Math.PI / 3;
}

/* Melee-kill lifesteal — tracks per-monster damage dealt to the player.
   On a melee kill the Cloudflare Worker refunds 90% of the net damage
   that specific monster cost and pushes the new HP via player_state;
   the worker also emits a `lifesteal_credit` event whose handler renders
   the +N HP floater (see WS switch). Client side is responsible for:
   1. Mirroring the per-monster damage map so it stays in sync if the
      worker ever asks for verification (and so debug overlays can show
      it). Tracked in S._dmgFromMonster.
   2. Clearing the entry on kill resolution. The worker independently
      clears its own map; this client-side delete is just hygiene so a
      stale entry doesn't linger if we add a future debug readout.
   Notes on scope:
   - Melee-only by design. Ranged/staff get a vitality side-train
     instead (v2.3.127, distributeKillXpToBuild below). Don't double-
     reward.
   - Worker contract documented at docs/specs/lifesteal-server.md. */
function trackMonsterDamage(S, monsterId, amount) {
  if (!S || monsterId == null || !amount || amount <= 0) return;
  if (!S._dmgFromMonster) S._dmgFromMonster = {};
  S._dmgFromMonster[monsterId] = (S._dmgFromMonster[monsterId] || 0) + amount;
}

function applyMeleeLifesteal(S, R, m) {
  if (!S || !R || !m || m.id == null) return;
  if ((R.activeSlot || 'melee') !== 'melee') return;
  if (!S._dmgFromMonster) return;
  /* Drop the entry so the local map doesn't accumulate stale ids.
     The actual heal + floater come from the server. No HP mutation
     here -- the worker is authoritative and the player_state push
     that follows monster_kill carries the bumped hp. */
  delete S._dmgFromMonster[m.id];
}

function distributeKillXpToBuild(R, killXp) {
  if (!R || !killXp || killXp <= 0) return;
  if (!R._buildUse) R._buildUse = { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
  var activeSlot = R.activeSlot || 'melee';
  /* Bow/magic stat separation — bow kills must not train mind, magic
     kills must not train agility. Zero the incompatible stat's usage
     before the proportional split so a player who briefly cast a
     mana-cost ability mid-bow-fight doesn't get cross-stat training
     when they kill with the bow. */
  if (activeSlot === 'ranged') R._buildUse.mind = 0;
  else if (activeSlot === 'staff') R._buildUse.agility = 0;
  var keys = ['power', 'vitality', 'endurance', 'agility', 'mind'];
  var total = 0;
  keys.forEach(function (k) { total += R._buildUse[k] || 0; });
  if (total <= 0) {
    /* No tracked usage — fallback by weapon type so the bar at least
       moves on a fresh character. */
    var fallbackStat = activeSlot === 'staff'
      ? 'mind'
      : (activeSlot === 'ranged' ? 'agility' : 'power');
    addBuildProg(R, fallbackStat, killXp);
  } else {
    keys.forEach(function (k) {
      var share = (R._buildUse[k] || 0) / total;
      if (share > 0) addBuildProg(R, k, killXp * share);
    });
  }
  /* Magic and bow kills passively train HP — glass cannons still build
     vitality at 25% rate even when they never get hit. Suppressed when
     vitality is locked (GDD §1.5 pure build). Melee builds vit the
     normal way (damage-taken weights _buildUse.vitality). */
  if ((activeSlot === 'ranged' || activeSlot === 'staff')
      && !(R._statLocks && R._statLocks.vitality)) {
    addBuildProg(R, 'vitality', killXp * 0.25);
  }
  /* Reset usage tally for the next encounter — each kill's
     distribution reflects activity since the last kill. */
  R._buildUse = { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
}

/* v2.3.1188: the ONE way to spawn a floating damage/notice popup.  The
   ~417 hand-rolled `S.dmgNumbers.push({x,y,text,color,ts})` literals
   across ~39 files all collapse onto this.  `extra` merges over the
   defaults, so the handful of non-default sites (ttl, iconKey/special,
   stacked `ts: Date.now() + n` render-order nudges, precomputed `now`
   timestamps) pass exactly what they differ by and nothing else. */
function pushDmgPopup(S, x, y, text, color, extra) {
  var p = { x: x, y: y, text: text, color: color, ts: Date.now() };
  if (extra) for (var k in extra) p[k] = extra[k];
  S.dmgNumbers.push(p);
}

export {
  pushDmgPopup,
  BUILD_LABELS,
  BUILD_ICONS,
  peerDmgKey,
  enqueuePeerDamage,
  releasePeerDamage,
  pushStatIncreaseNotice,
  addBuildProg,
  addBuildUse,
  distributeKillXpToBuild,
  isAttackInShieldArc,
  trackMonsterDamage,
  applyMeleeLifesteal,
};
