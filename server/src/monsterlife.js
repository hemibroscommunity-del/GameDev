/* ═══ v2.3.4843: A WORLD MONSTER'S LIFE, AND ITS ONE RESET ═══
 * (STATE-MACHINES.md "what is left": "the bigger one reset for a whole life";
 * the sweep's V7, S1-1 opacity.)
 *
 * A world monster dies and comes back as the SAME object with the same id
 * (wheelzone.js), so whatever it was doing in its last life -- a wind-up, a
 * ball in the air, a swell, a stun -- lives on unless the respawn wipes it.
 * The respawn (index.js _tickMonsters) did that with a hand list of fields
 * from six systems, each added after its own incident (v2.3.1709, 2215, 2221,
 * 2224, 3120, 3513, 3634, 4011, 4403), and nothing said when a new field was
 * missing from it.  Now:
 *
 *   - `m.life` counts the monster's lives (absent at spawn, read as 1; +1 at
 *     each respawn), so a thing that belongs to one life can say which;
 *   - `_monsterNewLife(m, now)` is the ONE reset, and MONSTER_LIFE below names
 *     every per-monster `_` field the worker writes: wiped for a new life
 *     (RESET, NEW), or kept on purpose, with why (KEPT).
 *     server/test/monster-newlife.test.mjs reads every write of an `m._` field in server/src
 *     and fails one in no list, so the next new field cannot slip.
 *
 * NEW are the fields the old list missed (none of them bit hard: each is
 * short, or rewritten before it is read, but each is a piece of a past life
 * a fresh one should not carry): a stun, the swing's movement freeze, the
 * sticky aggro pull, the swell's radius and its hit-the-killer mark, the
 * burrow's contact clock, the wander leg and the fire trail's last spot.
 * Kill switch: `monsterlife: false` -- the old list only, and no `m.life`.
 */

export const MONSTER_LIFE = Object.freeze({
  /* the old hand list (v2.3.1709 ... v2.3.4403), unchanged */
  RESET: Object.freeze([
    '_holdUntil', '_holdImmuneUntil',
    '_bwUntil', '_bwTarget', '_bwKind',
    '_burPhase', '_burUntil', '_burTarget', '_invulnUntil', '_burCd', '_burFloor',
    '_burstUntil', '_burstKiller', '_burstSlot', '_burstDone',
    '_tgPhase', '_tgUntil', '_tgAim', '_tgTarget', '_tgRadius',
    '_projImpactAt', '_projTargetId', '_projTx', '_projTy', '_projFromX', '_projFromY',
    '_kbDebt', '_armedBy', '_trapJudgeAt',
  ]),
  /* v2.3.4843: the ones it missed (above) */
  NEW: Object.freeze({
    _stunUntil: 0, _attackingUntil: 0,
    _aggroOverrideUntil: 0, _aggroOverrideTarget: null,
    _burstR: 0, _burstHitKiller: false, _burContactNextAt: 0,
    _wanderTx: null, _wanderTy: null, _wanderPausedUntil: 0,
    _ftX: null, _ftY: null,
  }),
  /* kept across lives on purpose -- each with its reason */
  KEPT: Object.freeze({
    _tgNextAt: 'a kit\'s cooldown: a fresh life may not cast at once (v2.3.3634)',
    _tgLost: 'stamped AT the respawn when a target is dropped (v2.3.2295)',
    _gustPx: 'set by each roar before its shove reads it (telegraph.js)',
    _gustMs: 'set by each roar before its shove reads it (telegraph.js)',
    _hk: 'the one formula\'s health scale, a property of the monster (oneformula.js)',
    _scaled: 'the spawn scale, a property of the monster (spawnscale.js)',
    _summoned: 'what made the monster, not what it did',
    /* cleared by _clearMonsterMove (monstermoves.js), which the reset calls */
    _mvKind: 'move', _mvPhase: 'move', _mvUntil: 'move', _mvTarget: 'move', _mvAim: 'move',
    _mvStep: 'move', _mvHit: 'move', _mvBalls: 'move', _mvDir: 'move', _mvLeft: 'move',
    _mvHits: 'move', _mvCd: 'move', _mvGapAt: 'move', _enrageCued: 'move',
    _mvStepped: 'move (a step\'s mark, rewritten each step)', _mvStepK: 'move (a step\'s mark, rewritten each step)',
    /* a dungeon's monsters and boss never respawn: their instance ends */
    _dungeonBoss: 'dungeon', _split: 'dungeon', _splitFloor: 'dungeon',
    _abilities: 'dungeon', _abilityPattern: 'dungeon', _nextAbilityAt: 'dungeon',
    _pendingAbility: 'dungeon', _abilityPhase: 'dungeon', _phaseUntil: 'dungeon',
    _chargeUntil: 'dungeon', _chargeSpeed: 'dungeon', _chargeAngle: 'dungeon',
    _hpSeen: 'dungeon', _hurtAt: 'dungeon', _combatSince: 'dungeon',
    _enrageStacks: 'dungeon', _enrageBaseDmg: 'dungeon',
  }),
});

export const monsterLifeMethods = {
  _monsterLifeOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'monsterlife') && !f.monsterlife);
  },

  /* The ONE reset for a new life (index.js _tickMonsters' respawn edge).
     Returns nothing; the caller marks the monster dirty. */
  _monsterNewLife(m, now) {
    if (!m) return;
    m.alive = true;
    m.hp = m.maxHp;
    m.x = m.spawnX;
    m.y = m.spawnY;
    /* v2.3.2295: a respawn drops the target too -- same reasoning as
       the aggro-loss stamp (index.js). */
    if (m.targetId) m._tgLost = now;
    m.targetId = null;
    m.atkCd = 0;
    /* ═══ v2.3.1709: A RESPAWNED MONSTER COMES BACK CLEAN ═══
       Owner, playtesting before judging: "the slimes were apparently brand
       new ones that I had freshly killed in that zone.  I saw no damage from
       any other person on them.  And new ones that spawned still attributed
       the loot to that other person."  `m.statuses` was never cleared, so a
       burn another player landed OUTLIVED the monster it was on, and every
       DoT tick credited them through _applyMonsterDot into dmgByPlayer -- the
       loot then said it was somebody else's.  dmgByPlayer is reset at the end
       of _resolveMonsterKill too; it is cleared HERE as well on purpose:
       anything that lands damage between the kill and the respawn puts credit
       back onto a corpse.  Belt and braces on the field that decides who owns
       the loot. */
    m.statuses = Object.create(null); // v2.3.1709: null-proto, rule 4
    m.dmgByPlayer = Object.create(null);
    /* The old hand list, each row after its incident:
       v2.3.3513 a hold (elemental.js HOLD); v2.3.2215 a wind-up must not
       survive death (a swing from a previous life at a target no longer
       there); v2.3.2221/2223 the burrow (a monster back untouchable, or a
       mound of snow that never reassembles; its COOLDOWN is cleared: a fresh
       monster may burrow again as soon as it drops to half); v2.3.2224 the
       death fuse (a slime exploding on arrival at full health); v2.3.3634 a
       kit's wind-up (a mummy killed mid-roar roared at its spawn 6-19 s
       later; the cooldown `_tgNextAt` stays); v2.3.4403 a ball in the air
       (it landed ~19 s late, nothing drawn; the sweep's V7) and the
       knock-back debt (a new life does not glide back to where the last was
       pushed from); v2.3.3120 the trap marks (trapping.js: a mark is on THIS
       life). */
    m._holdUntil = 0; m._holdImmuneUntil = 0;
    m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;
    m._burPhase = null; m._burUntil = 0; m._burTarget = null;
    m._invulnUntil = 0; m._burCd = 0; m._burFloor = 0;
    m._burstUntil = 0; m._burstKiller = null; m._burstSlot = null;
    m._burstDone = false;
    m._tgPhase = null; m._tgUntil = 0; m._tgAim = null; m._tgTarget = null; m._tgRadius = 0;
    m._projImpactAt = 0; m._projTargetId = null; m._projTx = 0; m._projTy = 0;
    m._projFromX = undefined; m._projFromY = undefined;
    m._kbDebt = 0;
    m._armedBy = null; m._trapJudgeAt = 0;
    /* v2.3.4011: and a move (monstermoves.js): nothing in flight, nothing
       cooling, not enraged */
    if (this._clearMonsterMove) this._clearMonsterMove(m);
    /* v2.3.4843: the rest of a past life (MONSTER_LIFE.NEW), and the count */
    if (!this._monsterLifeOff()) {
      for (const k of Object.keys(MONSTER_LIFE.NEW)) m[k] = MONSTER_LIFE.NEW[k];
      m.life = (Number(m.life) > 0 ? Math.floor(Number(m.life)) : 1) + 1;
    }
    /* Revert any in-life variant transform (mummy -> skeleton) so a
       respawned monster comes back in its original form with the original
       spd.  Stamped at spawn time and restored here on respawn. */
    if (m.spawnVariant !== undefined) {
      m.variant = m.spawnVariant;
      const respawnSpd = m.spawnVariant ? this._variantSpeed(m.spawnVariant) : null;
      if (respawnSpd != null) m.spd = respawnSpd;
      else if (m.spawnSpd != null) m.spd = m.spawnSpd;
    }
  },
};
