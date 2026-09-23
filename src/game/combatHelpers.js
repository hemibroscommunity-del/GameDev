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
import { propMaterial, propSwingContact } from '@/data/worldProps.js';   /* v2.3.2702: what a prop is made of, and where a swing meets one */
import { rollMonsterShard } from '@/data/shards.js';   /* v2.3.2233 */
import { prog3Live } from '@/data/prog3.js';          /* v2.3.2615: is the T1 track still load-bearing for this character? */

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
/* ═══ v2.3.2307: ONE LADDER FOR "WHERE WILL THIS SHOT GO" ═══
 * The bow's firing direction was a five-branch chain written out at the fire
 * site. The owner now wants an ARROW on the right control showing where the
 * shot will go -- and an arrow that re-derives that chain would be right the
 * day it ships and wrong the next time someone edits one of the five branches.
 *
 * That is not hypothetical: v2.3.2254-2262 is exactly this failure. Four
 * separate mechanisms fed one 4-way fallback, and shots went due EAST while
 * every individual piece looked correct. TRAPS #44 and mp-aimpath exist
 * because of it.
 *
 * So the ladder lives here, the fire site calls it, and the HUD arrow calls
 * it. `src` is returned for the QA probe: a test that can only see the ANGLE
 * cannot tell "the lock" from "the last drag that happened to agree with it".
 *
 * NOT shared with the SPECIAL's ladder (playerActions.js), which is genuinely
 * different -- four branches floored at zero with the lock applied after, from
 * a different origin. Merging them would be a behaviour change wearing a
 * refactor's clothes. */
/* ═══ v2.3.2543: ...AND ONE ANSWER FOR "WHERE DOES IT COME FROM" ═══
 * The ladder above settles the shot's DIRECTION from an origin it is handed.
 * This settles that origin, for the same reason and after the same bug.
 *
 * OWNER, after playing the merged bow rework: sometimes the sight line is
 * visibly on a monster and the bow will not fire, and sometimes it is visibly
 * off one and fires anyway.  Wrong in BOTH directions is never a radius that
 * needs a nudge -- a circle a few px too small misses on the edges and never
 * fires early.  It is two pieces of code disagreeing about the same line.
 *
 * THEY DISAGREED ABOUT THE ORIGIN, AND ONLY ABOUT THE ORIGIN.  effectsRenderer
 * publishes the bow grip twice on adjacent lines: `_bowGripX/Y`, the absolute
 * world point, and `_bowGripDX/DY`, the same point as an offset from the
 * player.  The drawn beam read the OFFSET and tracked the player live; the fire
 * gate and the shot site read the ABSOLUTE.  Both are written inside
 * `_updateBowShot`, which returns early unless `S._bowShowing` -- true only for
 * the 360 ms of BOW_SHOT_MS after a shot (and a held block).  So between
 * volleys the absolute pair stops being rewritten and FREEZES at the world
 * point of the last shot, while the offset pair keeps tracking.
 *
 * The gap is then exactly how far the player has walked since they last fired,
 * with no bound on it, which is why the same build does both things:
 *   - walk sideways and re-point at a monster -> the drawn line is on him, the
 *     stale ray is parallel and offset, nothing fires;
 *   - keep the old heading -> the drawn line clears him, the stale ray still
 *     crosses him, and an arrow goes out at a line nobody was shown.
 * Measured at 140 px of divergence for a 140 px step, with the two rays held
 * parallel by construction so the origin is the only variable: mp-bowgate.
 *
 * WHY A HELPER RATHER THAN COPYING THE OFFSET EXPRESSION TO THE GATE.  Three
 * call sites need this point -- the gate, the shot that follows it, and the
 * line that promises both -- and the whole value of the sight line is that it
 * cannot disagree with the shot.  A third inline copy of `player + delta` is
 * the same shape of trap the note above this one was written about, one layer
 * down: right the day it ships, wrong the next time the grip moves.
 *
 * The fallback is the player's own position, which is what every one of these
 * sites already fell back to before the grip has ever been published (a bow
 * that has not fired yet, or art that never loaded). */
export function bowGripPoint(S) {
  if (!S || !S.player) return null;
  var px = S.player.x, py = S.player.y;
  if (typeof px !== 'number' || typeof py !== 'number' || !isFinite(px) || !isFinite(py)) return null;
  var dx = S._bowGripDX, dy = S._bowGripDY;
  if (typeof dx === 'number' && typeof dy === 'number' && isFinite(dx) && isFinite(dy)) {
    return { x: px + dx, y: py + dy };
  }
  return { x: px, y: py };
}

export function rangedAimAngle(S, originX, originY) {
  var lockPt = lockAimPoint(S && S.lockedTarget && S.lockedTarget.ref);
  if (lockPt) {
    return { ang: Math.atan2(lockPt.y - originY, lockPt.x - originX), src: 'lock' };
  }
  /* A thumb steering RIGHT NOW beats any remembered heading. It is the stale
     read of _aimAngle that was wrong at v2.3.2262, not the fresh one. */
  if (S && S._aiming && S._aimAngle != null) return { ang: S._aimAngle, src: 'aiming' };
  if (S && S._lastAimAngle != null) return { ang: S._lastAimAngle, src: 'last' };
  if (S && typeof S._facingAngle === 'number') return { ang: S._facingAngle, src: 'facing' };
  var fd = (S && S._facing) || 'down';
  return {
    ang: fd === 'right' ? 0 : fd === 'up' ? -Math.PI / 2 : fd === 'left' ? Math.PI : Math.PI / 2,
    src: 'facing4',
  };
}

/* ═══ v2.3.2473: HOW LONG A QUEUED BOW SPECIAL WAITS FOR A LINE ═══
 * The bow only looses when its line of sight is on something (monsterCombat's
 * sight gate), so a special pressed while the line is empty is REMEMBERED
 * rather than thrown away -- it goes out on the first frame the line lands.
 * It cannot wait forever: a request made while the player was pointing at
 * nothing, fired half a minute later at whatever wandered past, is a special
 * they did not ask for and cannot predict.  Two and a half seconds is longer
 * than a sweep of the thumb and shorter than a change of mind.
 * Lives here because both ends of the queue need it -- playerActions sets it,
 * monsterCombat consumes it -- and a second copy would drift.
 */
export var BOW_SPECIAL_QUEUE_MS = 2500;

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
  /* ═══ v2.3.2615: A PROG3 CHARACTER MUST NOT BE TOLD THIS ═══
   *
   * Owner: "I raised a combat level without leveling up any of my combat skills
   * which should be impossible (it also played the legacy level up)."
   *
   * It was not a level and nothing was minted — this line is what they saw.
   * distributeKillXpToBuild still runs on every kill with no prog3 gate, so the
   * legacy T1 stats (power / vitality / endurance / agility / mind) still tick
   * over their thresholds, and every crossing fired the old gold banner reading
   * "LEVEL UP!" over "Level 24".  BUILD_LABELS even calls them Melee / Bow /
   * Magic — the same three words as the prog3 combat skills — so the message was
   * indistinguishable from a combat level-up that had not happened.
   *
   * And under prog3 those stats buy NOTHING.  recalcDerived's prog3 branch
   * (src/data/gameSystems.js) and the server's _prog3Recompute (server/src/
   * prog3.js, reached because grids.js _recomputeMaxes returns to it whenever
   * ps.prog3 exists) both derive level, maxHp, maxStamina and maxMana from the
   * prog3 track alone.  Character level is the SUM of the three trained skill
   * levels and cannot move without one of them moving — which is exactly why
   * the owner was right that what they saw should be impossible.  The benefit
   * line below proves the inertness on its own: it reads maxHp minus the maxHp
   * from a moment ago, and for a prog3 character that difference is always 0.
   *
   * So the notice is suppressed rather than reworded.  A dead counter announced
   * politely is still a dead counter announced, and the honest report of a
   * prog3 vitality tick is nothing at all.  The stats keep ticking (the T1 track
   * is still the fail-open path for any blob prog3 adoption could not produce,
   * and a legacy character below still gets its banner) — only the claim goes. */
  if (prog3Live(R)) return;
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
    /* v2.3.2615: carry the LABEL.  A legacy character still gets this banner,
       and it used to read a bare "LEVEL UP! / Level 24" with no hint that the
       24 belonged to Melee rather than to the character — the same confusion
       the prog3 guard above removes, one system older.  The banner names it
       now (BroTown.jsx render site). */
    window._setLevelUpMsg({ kind: stat, label: label, level: newVal, ts: Date.now() });
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

/* ═══ v2.3.2702: A HIT ON A PROP ═══
   Owner: "make it so that subtle debris comes off the props once they're hit
   by a player projectile ... I still want the bolt projectiles to explode even
   if they hit props with debris, arrow stuck in (with debris), and sword slash
   marks on the props (with debris)."

   ONE QUEUE, NOT A SECOND ONE.  A prop's debris goes into S._debrisBursts, the
   queue the four monster hit sites have fed since v2.3.2200, under a key of its
   own ('prop:<id>') so the renderer's per-target 150ms dedup treats each prop
   as one target.  The record carries every field the hit-materials rewrite
   reads (gy/h for where pieces land, `weapon` for the shape of the spray,
   hitX/hitY for the contact point), so when that lands the props get its
   crisp material pieces with no second change; today's renderer reads x/y,
   kind and tint, and draws its chunks.  `prop`/`scale`/`parts` are what make
   those chunks SUBTLE -- a rock is hit far more often than it is interesting.

   `hit` is { id, x, y, gy, ang, weapon }: the prop's id, the contact point as
   drawn (x/y -- where the arrow or bolt is on screen, or the blade's height for
   a swing), the ground line under it (gy), and the direction the pieces should
   leave in.  A projectile's pieces come BACK off the face (ang = its heading
   + PI); a sword's go the way the blade was travelling. */
export function spawnPropDebris(S, hit) {
  if (!S || !hit) return;
  if (!Number.isFinite(hit.x) || !Number.isFinite(hit.y) || !Number.isFinite(hit.gy)) return;
  var mat = propMaterial(hit.id);
  if (!S._debrisBursts) S._debrisBursts = [];
  if (S._debrisBursts.length >= 24) return;
  S._debrisBursts.push({
    monsterId: 'prop:' + (hit.id || '?'), kind: mat.kind, tint: mat.tint,
    x: hit.x, y: hit.y, gy: hit.gy, h: Math.max(4, hit.gy - hit.y),
    ang: Number.isFinite(hit.ang) ? hit.ang : -Math.PI / 2,
    t0: Date.now(),
    weapon: hit.weapon || null,
    hitX: hit.x, hitY: hit.y,
    prop: true, scale: 0.6, parts: 4,
  });
}

/* v2.3.2702: and what it SOUNDS like -- the same material mixer a monster hit
   goes through (BT_AUDIO.swordHit, v2.3.2452), so a rock rings like a rock
   monster and a bench cracks like wood.  Snow takes the snowball thud, which
   swordHit deliberately does not carry.  Best-effort, like every sound here. */
export function propImpactSound(propId, vol) {
  var mat = propMaterial(propId);
  try {
    if (mat.sound === 'snow') BT_AUDIO.play('snowman-hit', { vol: vol * 0.8 });
    else BT_AUDIO.swordHit({ vol: vol }, mat.sound);
  } catch (e) { /* audio is best-effort */ }
}

/* ═══ v2.3.2702: THE BOLT'S CRASH, IN ONE PLACE ═══
   Lifted verbatim out of the monster-hit block in projectiles.js (v2.3.2505's
   rings and v2.3.1356's dissipation spray), because a bolt that lands on a
   rock has to explode exactly the way one that lands on a monster does -- the
   owner's words -- and two copies of an effect drift the day one is restyled.
   The monster hit, a bolt stopped by a prop, and a peer's bolt stopped by a
   prop all call this.
   WHEN MERGING the staff-cast work (#707, v2.3.2697): its restyle of this crash
   -- `style: 'staff'` on both rings and an S._staffCrashes record in place of
   the 22 dots -- belongs HERE, so that props get it too.
   `color` is a CSS colour (the element's, or the default violet). */
export function orbCrashFx(S, x, y, color) {
  if (!S || !Number.isFinite(x) || !Number.isFinite(y)) return;
  if (!S._impactRings) S._impactRings = [];
  /* Outer expanding ring — the "crash" flash. */
  S._impactRings.push({
    x: x, y: y, ts: Date.now(),
    color: color, maxR: 26, duration: 320,
  });
  /* Inner brighter ring 40 ms later for double-pulse
     intensity. Use a startDelay field rather than
     setting ts in the future — future-ts caused the
     render to compute negative ages and weird radii on
     the first frame after spawn (same family of bug
     as the swingTimer +300 player-flicker on cast). */
  S._impactRings.push({
    x: x, y: y, ts: Date.now(), startDelay: 40,
    color: color, maxR: 14, duration: 220,
  });
  /* Dissipation — radial particle spray outward, with a
     small upward bias so embers drift like sparks. */
  if (!S.hitParticles) S.hitParticles = [];
  for (var _op = 0; _op < 22; _op++) {
    var _oa = (_op / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    var _osp = 2 + Math.random() * 4;
    S.hitParticles.push({
      x: x + Math.cos(_oa) * 4,
      y: y + Math.sin(_oa) * 4,
      vx: Math.cos(_oa) * _osp,
      vy: Math.sin(_oa) * _osp - 0.7,
      life: 0.45 + Math.random() * 0.4,
      color: color,
      size: 1 + Math.random() * 2.2,
    });
  }
}

/* ═══ v2.3.2702: A MARK LEFT ON A PROP ═══
   A slash from a sword, or an arrow standing in the rock -- anything that is
   drawn ON the prop and has to sort with it (behind you when the rock is, in
   front when it is).  Queued as a fact; effectsRenderer owns the drawing and
   the lifetime.  `rec` is { kind: 'slash'|'arrow', id, x, y, gy, face, ang,
   ttl, ...extra }: the prop, where on it as drawn (x/y), the ground line
   under that point (gy), which face, and the angle to draw at.  Bounded, and
   tagged with the zone so a mark cannot follow you through a door. */
export function markProp(S, rec) {
  if (!S || !rec || !rec.id) return;
  if (!Number.isFinite(rec.x) || !Number.isFinite(rec.y)) return;
  if (!S._propMarks) S._propMarks = [];
  rec.zone = S.currentZone;
  rec.t0 = rec.t0 || Date.now();
  S._propMarks.push(rec);
  if (S._propMarks.length > 32) S._propMarks.splice(0, S._propMarks.length - 32);
}

/* ═══ v2.3.2702: A SWORD SWING THAT LANDS ON A PROP ═══
   The swing's own hit test only ever asks about monsters, so a blade that met
   a rock went through it without a mark.  This asks the rock: the swing's fan
   (propSwingContact) from the swinger's feet, and on a contact -- chips off the
   face the way the blade was travelling, the material's sound, and a SLASH
   MARK drawn on the prop.  No mark on a back face ('n'): the camera cannot see
   it, and a gash painted over the front of the art for a cut on the far side
   is a mark in the wrong place.  The chips still fly -- those you would see
   over the top.
   Purely visual.  It changes nothing about what the swing hits.
   BLADE_H is the height the edge is drawn at through the contact frame, so the
   mark sits where the blade was seen to land rather than on the ground line. */
var PROP_BLADE_H = 30;
var _propSlashFlip = 0;
export function propSwingHit(S, px, py, ang, reach, halfArc) {
  if (!S) return null;
  var c = propSwingContact(S.currentZone, px, py, ang, reach, halfArc);
  if (!c) return null;
  var dir = Math.atan2(c.y - py, c.x - px);
  var y = c.y - PROP_BLADE_H;
  spawnPropDebris(S, { id: c.id, x: c.x, y: y, gy: c.y, ang: dir, weapon: 'sword' });
  propImpactSound(c.id, 0.35);
  if (c.face !== 'n') {
    /* Across the swing, not along it: the edge travels tangentially, so the
       cut runs perpendicular to the line from the swinger to the contact --
       level on a face you are standing in front of, upright on a side face --
       tipped either way in turn so a flurry reads as separate cuts. */
    var tilt = ((_propSlashFlip++ & 1) ? 1 : -1) * (0.38 + Math.random() * 0.14);
    markProp(S, { kind: 'slash', id: c.id, x: c.x, y: y, gy: c.y, face: c.face,
      ang: dir + Math.PI / 2 + tilt, ttl: 4500 });
  }
  return c;
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
