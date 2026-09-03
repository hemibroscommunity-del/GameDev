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
import { xpRequired, recalcDerived, BT_AUDIO, BLOCK_ARC_HALF, monsterBodyOffsetY } from '@/data/index.js';
import { hitMaterialOf, isRemnantSkull } from '@/data/monsterVariants.js'; /* v2.3.2200: hit-feedback material table; v2.3.2233: remnant guard */
import { rollMonsterShard } from '@/data/shards.js';   /* v2.3.2233 */

/* ═══ v2.3.1979: WHERE A LOCKED TARGET ACTUALLY IS, FOR AIMING ═══
   Owner: "Tap to lock on enemy sometimes does not hit the target.  I was
   locked on to a blue slime shooting with bow and the arrows were on a flight
   path that wasn't targeted at its center and flew beside it without damaging
   it."

   Measured (tools/qa/mp/mp-lockaim.mjs, before the fix): a locked bow shot's
   flight line passed 9.4, 11.2, 17.1, 17.1 and 32.0 px to the SIDE of the
   slime's hit centre on five headings, against a 27 px body.  Four connected
   anyway; the 32 px one drew no blood.  That is exactly what "sometimes does
   not hit" feels like from the inside -- the aim is wrong every single time
   and the body is just big enough to absorb most of it.

   Two separate errors put it there, and both are about aiming at a DIFFERENT
   point than the hit-test measures from:

   1. THE ORIGIN.  Every aim site computed atan2(target - PLAYER), but a bow
      arrow does not launch from the player -- projectiles.js nocks it at the
      teal bow grip (v2.3.937) and freezes that offset at release, so the
      flight line is the aim line shifted sideways by 20-44 px.  Parallel
      lines never meet: the arrow arrived beside the slime by exactly the
      perpendicular share of the grip offset, at every range.  Aim has to
      start where the arrow starts.

   2. THE TARGET POINT.  The aim read m.x / m.y (the logic position) while
      the hit-test reads m.renderX / m.renderY (v2.3.1111, because server
      monsters draw ~4 frames behind their logic position).  On a walking
      monster the aim led the hitbox.  Same scenario, with the two positions
      pulled 26 px apart by hand: 38.6 px of miss and no damage at all.

   And a landmine found while measuring: the old sites wrote
   `(lt.x || 0)` / `(monsterBodyY(lt) || 0)`.  A monster whose position had
   gone NaN therefore aimed at 0 -- the WORLD ORIGIN -- and the whole volley
   flew off toward the top-left corner of the map at a constant bearing.
   Returning null here says "no usable lock" so callers fall back to the
   facing, instead of confidently shooting at nothing. */
export function lockAimPoint(t) {
  if (!t) return null;
  var x = (typeof t.renderX === 'number' && isFinite(t.renderX)) ? t.renderX : t.x;
  var y = (typeof t.renderY === 'number' && isFinite(t.renderY)) ? t.renderY : t.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return null;
  /* Same body-centre offset the projectile hit-test applies (0 for NPCs and
     anything without an archetype, i.e. aim at the feet as before). */
  return { x: x, y: y - (monsterBodyOffsetY(t.archetype || t.type) || 0) };
}

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
/* v2.3.1311 (owner canonical taxonomy): the six combat parents are
   Melee / Bow / Magic / Vitality / Defense / STAMINA — this map used
   to say 'Archery' (vs 'Bow' everywhere else) and 'Endurance' (the
   parent's canonical NAME is Stamina; only the storage key stays
   'endurance').  Floaters/banners now match the Hero menu. */
var BUILD_LABELS = {
  power: 'Melee', vitality: 'Vitality', endurance: 'Stamina',
  agility: 'Bow', mind: 'Magic',
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
  /* ═══ v2.3.2232: PRIME THE ZONE STAMP BEFORE THE EMPTY-QUEUE BAILOUT ═══
     This zone check used to sit BELOW `if (!Q) return`, and _peerDmgQueue is
     created lazily by the first enqueue -- so for the whole span before any
     peer damage arrived, this function returned early and _peerDmgZone was
     never stamped.  The first peer number of a session therefore arrived,
     was queued, and was WIPED on the very next frame by a zone-change clear
     for a zone change that had not happened.  Exactly one number, silently,
     per session; found while testing the weapon marks (mp-dmgicon), which
     is the only reason a bug this quiet was ever going to surface.
     Stamping first is also strictly more correct on its own terms: the
     stamp describes where we ARE, not where the queue is. */
  if (S._peerDmgZone !== S.currentZone) {
    /* Zone change: drop queued numbers from the previous zone so a stale
       position never spawns into the new one.  Centralizes the clear across
       every zone-transition path (dmgNumbers itself is never explicitly
       cleared either -- it ages out -- so this stays in parity, just
       faster). */
    S._peerDmgQueue = {};
    S._peerDmgLastRel = {};
    S._peerDmgZone = S.currentZone;
    return;
  }
  var Q = S._peerDmgQueue;
  if (!Q) return;
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
  /* v2.3.1207: 0.8 was the retired pre-v2.3.912 stat rate — the real
     coefficient is 0.1667 base dmg per point (calcDisplayDmgRange /
     the server's _computeAttackDamage stat term).  The loadout copy of
     this drift was fixed in v2.3.912; this floater (and the dashboard
     build-cell tooltip, fixed alongside) was missed. */
  else if (stat === 'power')     benefit = '+0.17 base damage';
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
  return Math.abs(d) <= BLOCK_ARC_HALF; /* v2.3.1705: the shared half-angle */
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


/* ═══ v2.3.2233: ONE LOCAL REMNANT PER MONSTER LIFE ═══
 *
 * Owner: "Slime remnants still have dozens dropping as loot now."  MEASURED:
 * one fodder slime left 47 piles in 2.5 seconds (tools/qa/mp/mp-remnant.mjs).
 *
 * In a server zone the client never sets `alive = false` -- the worker owns
 * the kill -- so a monster whose hp has reached 0 sits at `curHp <= 0 &&
 * alive` until monster_kill arrives.  Both local kill blocks test exactly
 * that, and neither remembered having fired: every DoT tick and every
 * further hit inside that window minted another pile.  The exploding slime
 * made it impossible to miss, because its fuse HOLDS that state for 1600ms
 * by design (v2.3.2226 doubled it) -- but the bug is not the slime's.  Any
 * monster lingering between its last point of damage and the worker's kill
 * event does this.
 *
 * And these are not decoration: groundLoot.js credits a skull pile straight
 * into the bag on pickup (remnantInvKey), and remnant piles are exempt from
 * the 60s despawn, so they accumulate and every one of them is claimable.
 * That is the owner's "dozens in my bag then fixes the amounts" -- the
 * authoritative inventory sync correcting what the client invented.
 *
 * The flag lives on the monster object and is cleared where the client
 * revives one (monsterCombat's respawn branch), so a monster that dies again
 * next life drops its one pile again.
 */
export function dropLocalRemnantOnce(S, m) {
  if (!S || !S.groundLoot || !m) return false;
  if (!isRemnantSkull(m.type)) return false;
  if (m._localRemnantDropped) return false;
  m._localRemnantDropped = true;
  S.groundLoot.push({
    x: m.x + (Math.random() - 0.5) * 12,
    y: m.y + (Math.random() - 0.5) * 12,
    coins: 0,
    xp: 0,
    skull: m.type,
    skullEmoji: '\u{1F9B4}',
    ts: Date.now(),
    shard: rollMonsterShard(S.currentZone),
  });
  return true;
}

/* v2.3.1188: the ONE way to spawn a floating damage/notice popup.  The
   ~417 hand-rolled `S.dmgNumbers.push({x,y,text,color,ts})` literals
   across ~39 files all collapse onto this.  `extra` merges over the
   defaults, so the handful of non-default sites (ttl, iconKey/special,
   stacked `ts: Date.now() + n` render-order nudges, precomputed `now`
   timestamps) pass exactly what they differ by and nothing else. */
/* v2.3.1357: global live-popup budget.  Every popup mints a freshly
   rasterized Pixi Text (a synchronous canvas draw); profiling a 12-
   monster pack fight showed the popup field reaching 80+ live Texts
   and dominating the frame (avg -55ms and the 400ms+ spikes vanished
   with popups suppressed).  +100-HP fights run several times longer,
   so the churn is now sustained — the owner's "running badly" report.
   Over budget, the OLDEST default-ttl popup is expired by aging it out
   (ts=0): the renderer's own age cleanup destroys its Text on the next
   frame — the ONE sanctioned destroy path (never prune the array here;
   see the destroyed-Text crash note in effectsRenderer).  Long-lived
   popups (custom ttl: kill banners, warnings) are never dropped. */
var MAX_LIVE_POPUPS = 24;
function pushDmgPopup(S, x, y, text, color, extra) {
  var p = { x: x, y: y, text: text, color: color, ts: Date.now() };
  if (extra) for (var k in extra) p[k] = extra[k];
  var list = S.dmgNumbers;
  if (list.length >= MAX_LIVE_POPUPS) {
    for (var i = 0; i < list.length; i++) {
      if (!list[i].ttl && list[i].ts !== 0) { list[i].ts = 0; break; }
    }
  }
  list.push(p);
}

/* v2.3.1338: spawn-Y for a damage number on a monster — just ABOVE its
   floating HP bar (owner: numbers rise from over the bar, not over the
   sprite body).  entityRenderer stamps _popupTopOff each frame from the
   real bar geometry (variant/snowman/fodder sprite tops all differ);
   `fallback` is the site's old hand-tuned offset, used until the first
   render stamp (freshly spawned monster) or in headless paths. */
/* v2.3.1638: floor for the no-stamp path.  The stamp is missing only
   transiently — a monster minted fresh by a zone snapshot before the
   renderer's first frame, or before the HP-bar texture resolves — but the
   per-site `fallback` values (-10, -20, -22, -30, -35) were hand-tuned in
   the renderer's LOCAL space back when the stamp was too, so on their own
   they now spawn the popup ON the monster.  Real stamped values run
   -102 (procedural) to -189 (fodder slime); -120 clears a typical bar
   without flinging the number off the top of a short one. */
var POPUP_NO_STAMP_Y = -120;
function monsterPopupY(m, fallback) {
  var y = (m.y != null ? m.y : m.renderY) || 0;
  if (m._popupTopOff != null) return y + m._popupTopOff;
  var off = fallback != null ? fallback : -30;
  /* min, not max: these are negative offsets, so the LOWER number is the
     higher popup.  A site that deliberately passes something taller than
     the floor keeps its own value. */
  return y + Math.min(off, POPUP_NO_STAMP_Y);
}

/* v2.3.1421: clear the per-swing melee dedup flags on every entity.
   Called at every swing START (manual tap, auto-swing, and the sword
   SPECIAL).  Previously the flags only cleared 450ms after a swing
   began (the swing-end sweep in monsterCombat), so a special fired
   right after a normal swing inherited the previous swing's
   "already hit" marks and silently skipped those monsters — the
   owner's "special right after a normal swing doesn't register the
   hit". */
function clearSwingHitFlags(S) {
  if (!S) return;
  if (S.monsters) S.monsters.forEach(function (m) { if (m) m._hitThisSwing = false; });
  if (S.npcs) S.npcs.forEach(function (n) { if (n) n._hitThisSwing = false; });
  if (S.others) Object.values(S.others).forEach(function (o) { if (o) o._hitThisSwing = false; });
}

/* v2.3.1473 (owner: "don't ... allow them to keep attacking during the
   death animation"): the single death test every attack path gates on.
   Mirrors BroTown's own `_playerDead` idiom (which already zeroes the
   movement stick), so a corpse can't swing, shoot or fire a special
   while the skeleton animation plays.  hp<=0 covers the server-monster
   window (hp is restored only on respawn); _dying covers the local path,
   where the handler restores hp on a timeout but holds the animation. */
export function isPlayerDead(S) {
  return !!(S && (S._dying || (S.rpg && S.rpg.hp <= 0)));
}

/* ═══ v2.3.1702: THE WORKER OWNS PLAYER HP IN SERVER ZONES ═══
   Headless measurement (Ember Hollow, one fire goblin, no input): the
   client's S.rpg.hp read 66 while the worker's stored blob read 96, and
   a later run played a whole local death sequence — skeleton animation,
   respawn timer — for a character the worker still had alive at 40 HP.

   Cause: the local monster AI in monsterCombat.js subtracts player HP
   itself, and it has no `_serverMonsters` gate.  In a server zone the
   worker is ALSO running its own copy of that monster and applying its
   own damage (_monsterStrikePlayer), so the hit lands twice — once on
   the worker's number, once on the client's.  It goes unnoticed for
   ordinary monsters only because the local AI early-returns for them
   (`S._serverMonsters && !usesClientSideMovement(m)`).  The variants
   that DO run their AI locally in MP — fireGoblin, skeleton — take the
   full double.  Between player_state echoes the client drifts down at
   twice the real rate, and if it crosses 0 first the player watches
   themselves die while the server never agrees.

   The network path already did this right: the monster_attack handler
   in gameEvents.js has carried `if (!S._serverMonsters)` around its HP
   write since the MP port, and monster HP has the twin gate
   (`if (!S._serverMonsters) m.curHp -= dmg`).  This is the same rule for
   the local-AI side of player HP, in one place so the eight call sites
   can't drift apart again.

   Everything ELSE the local AI does on a hit — popup, flash, screen
   shake, SFX, defense XP, build-use tracking — still runs.  Only the
   number is deferred to the authoritative echo. */
export function hurtPlayerLocal(S, R, amount) {
  var amt = Number(amount) || 0;
  if (!R || amt <= 0) return;
  if (S && S._serverMonsters) return; /* player_state carries the truth */
  R.hp -= amt;
}

/* ═══ v2.3.2200: HIT FEEDBACK SPAWNERS (one home, four call sites) ═══
 *
 * Owner: hits should throw material off the monster and leave marks on
 * the ground.  These two helpers are the only writers of the debris
 * queue and the on-hit decal path, called from the local melee sweep,
 * the two projectile impact sites, and the monster_hit handler (peer +
 * server-rolled hits) — so all four kinds of hit read identically.
 * They only ENQUEUE; effectsRenderer owns textures and lifetimes
 * (sprite-based, per the owner's "code-drawn effects look bad" call).
 *
 * spawnHitDebris: directional burst of the monster's material.
 * Renderer-side dedup (per-monster 150ms gap) lives with the sprites,
 * but the queue is still hard-capped here so a hit storm can't grow an
 * unbounded array between frames (the hitParticles-400 posture). */
export function spawnHitDebris(S, m, angle) {
  if (!S || !m) return;
  var mat = hitMaterialOf(m.archetype || m.type);
  if (!S._debrisBursts) S._debrisBursts = [];
  if (S._debrisBursts.length >= 24) return;
  S._debrisBursts.push({
    monsterId: m.id, kind: mat.kind, tint: mat.tint,
    x: (typeof m.renderX === 'number') ? m.renderX : m.x,
    y: ((typeof m.renderY === 'number') ? m.renderY : m.y) - monsterBodyOffsetY(m.archetype || m.type),
    ang: (typeof angle === 'number') ? angle : -Math.PI / 2,
    t0: Date.now(),
  });
}

/* spawnGroundDecal: one persistent mark at the monster's feet.  Rides
   the EXISTING S.groundSplatter array (cap 80, TTL/fade in
   effectsRenderer + stateCleanup) — on-hit marks are small and
   probabilistic (50%) so a fight doesn't flush the cap; kills keep
   their bigger multi-mark burst at the call site.  `color` may
   override the material decal tint (element kills). */
export function spawnGroundDecal(S, x, y, arch, opts) {
  if (!S) return;
  var o = opts || {};
  if (o.chance != null && Math.random() > o.chance) return;
  var mat = hitMaterialOf(arch);
  if (!S.groundSplatter) S.groundSplatter = [];
  S.groundSplatter.push({
    x: x + (Math.random() - 0.5) * (o.spread != null ? o.spread : 18),
    y: y + (Math.random() - 0.5) * (o.spread != null ? o.spread : 12),
    color: o.color || mat.decal,
    size: o.size != null ? o.size : 4 + Math.random() * 4,
    ts: Date.now(),
    element: o.element || null,
  });
  if (S.groundSplatter.length > 80) S.groundSplatter.splice(0, S.groundSplatter.length - 80);
}

export {
  clearSwingHitFlags,
  pushDmgPopup,
  monsterPopupY,
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
