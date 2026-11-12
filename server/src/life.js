/* ═══ v2.3.4820: THE LIFE DOOR -- a player's health and life phase go through here ═══
 * (spec: docs/specs/life-door.md; pinned by server/test/life-door.test.mjs)
 *
 * WHY.  A player's health (`ps.hp`) was written by hand in 39 places across
 * 12 files: hits, heals, food, level-ups, the respawn, the join, the spar,
 * the Test panel.  And whether a player is dying was two booleans
 * (`ps.dying`, `ps.dead`) set side by side in five places across four files,
 * so a new state would have been a third boolean beside them (CLAUDE.md:
 * "a phase lives in one field with one transition function").  A rule that
 * should hold for EVERY write -- "a body in its dying seconds is not healed",
 * "a death is the game's to make" -- had to be copied into each place.  The
 * gold door (gold.js, v2.3.4670) and the monster-hit door (hits.js) are the
 * same move for gold and for blows.
 *
 * THE DOORS.
 *   - _hpSet(ps, v, road): a player's health MADE `v`, by its ROAD (a row in
 *     HP_ROADS).  Every write to a player's `.hp` in server/src is one of
 *     these; life-door.test fails a write anywhere else (monsters' `m.hp` and
 *     the few notes that are not a body are listed there, with why).
 *   - _lifeTo(ps, phase, road): the life phase made `phase` ('alive' or
 *     'dying'), by its row in LIFE_ROADS.  ONE field, `ps.life`; the old
 *     booleans `ps.dying` and `ps.dead` are written from it here, together,
 *     so every reader (about 150 of them, server and tests) keeps working
 *     unchanged.  life-door.test fails a write to `.dying`, `.dead` or
 *     `.life` anywhere else.
 *   - _lifeDeadClaim(ps, v): the ONE road left that writes `ps.dead` alone --
 *     the phone's move claiming it, which only happens with the live flag
 *     `serverdead: false` (movement.js, v2.3.4373).  "Dead is the server's
 *     word": with the flag on (the default) nothing but _lifeTo writes it.
 *
 * STEP 1 (this version): NOTHING A PLAYER SEES CHANGES.  Each call passes
 * the exact value its line wrote before (the test holds each call's value
 * to its old line, text for text), and _lifeTo writes the two booleans
 * exactly as the old pairs did.  `ps.life` is new and memory only: never
 * saved (persistence.js names its fields), never on the wire (the peer copy
 * and player_state name theirs).
 *
 * STEP 2a (v2.3.4901, live switch `lifenoheal`): no heal lands on a dying
 * body -- the `kind` column says which rows are heals, and _hpSet refuses
 * them while the body is dying (one line here, not twelve).
 *
 * STEP 2b (next): `ps.life` can carry its `until` (today `ps.respawnAt`) and
 * be saved, so a close in the dying seconds comes back as the same death (the sweep's V2).
 * docs/specs/life-door.md has the list.
 *
 * WHAT IS NOT HERE (on purpose):
 *   - monsters' health (`m.hp`): the monster's own life (`m.alive`, the kill);
 *   - the ARITHMETIC of a hit: _applyDamage (combat.js) still works out the
 *     blow, the block, the shield and the second wind (hit-door.test §10d
 *     pins its callers); it WRITES the result through `hit` here;
 *   - `ps.respawnAt`, `ps._deathKeepsBag`, `ps._respawnOwed`: the death's own
 *     notes, still where they were (step 2 folds them into `ps.life`).
 *
 * No imports: node tests it directly.
 */

/* ── EVERY ROAD A PLAYER'S HEALTH IS WRITTEN BY ──
 * kind: what the write is, for the rules step 2 hangs on the door --
 *   'hit' (a blow lands), 'heal' (up by an amount, capped at the bar),
 *   'fill' (the bar full), 'unset' (a body with no number yet read as full),
 *   'clamp' (the bar shrank under it), 'load' (a character arrives),
 *   'keep' (the same fullness on a new bar), 'set' (a value chosen outright).
 * at: where its one caller is, for people (the test checks the caller's file).
 * A new way to change a player's health is a new row here and one call. */
const H = (kind, at) => Object.freeze({ kind, at });
export const HP_ROADS = Object.freeze({
  /* ── blows ── */
  hit_unset:          H('unset', 'combat.js _applyDamage: a body with no number yet is full'),
  hit:                H('hit',   'combat.js _applyDamage: every blow on a player (hits.js, the burns, PvP)'),
  second_wind:        H('heal',  'combat.js _applyDamage: the second wind'),

  /* ── heals in a fight ── */
  lifesteal_melee:    H('heal',  'combat.js _applyMeleeLifesteal'),
  kill_lifeblood:     H('heal',  'combat.js _resolveMonsterKill: lifeblood\'s on-kill heal'),
  pvp_lifeblood:      H('heal',  'pvpextras.js _pvpKillHeal: lifeblood on a player kill'),
  pvp_refund:         H('heal',  'pvpextras.js _pvpKillHeal: the lifesteal refund'),

  /* ── food and tonics ── */
  eat_unset:          H('unset', 'cooking.js _handleEatRequest'),
  eat:                H('heal',  'cooking.js _handleEatRequest'),
  dish_unset:         H('unset', 'cooking.js _applyDish'),
  dish:               H('heal',  'cooking.js _applyDish'),
  tonic_unset:        H('unset', 'cooking.js _applyShopItem'),
  tonic:              H('heal',  'cooking.js _applyShopItem'),

  /* ── standing still ── */
  regen_hub:          H('heal',  'index.js _tickPlayerRegen: the commons and the safe places'),
  regen_spoke:        H('heal',  'index.js _tickPlayerRegen: the spokes'),
  rest:               H('fill',  'rest.js _handleRest'),

  /* ── a level, and the bar's size ── */
  kill_level_up:      H('fill',  'combat.js _resolveMonsterKill: a kill\'s level-up'),
  bp_level_up:        H('fill',  'grids.js _tryLevelUpFromBuildPoints'),
  bp_earned_level_up: H('fill',  'grids.js _handleBuildPointEarned'),
  skill_level_up:     H('fill',  'grids.js _handleStatsUpdate: a skill level'),
  stats_level_up:     H('fill',  'grids.js _handleStatsUpdate: a level'),
  quest_level_up:     H('fill',  'quests.js _handleQuestTurnIn'),
  prog3_level_up:     H('fill',  'prog3.js _prog3AwardXp'),
  maxes_unset:        H('unset', 'grids.js _recomputeMaxes'),
  maxes_clamp:        H('clamp', 'grids.js _recomputeMaxes'),
  prog3_unset:        H('unset', 'prog3.js _prog3Recompute'),
  prog3_clamp:        H('clamp', 'prog3.js _prog3Recompute'),
  bar_fullness:       H('keep',  'oneformula.js _keepBarFullness'),

  /* ── arriving, and standing up ── */
  join_stored:        H('load',  'join.js _handleJoin: the stored character'),
  join_new:           H('load',  'join.js _handleJoin: a new character'),
  join_respec:        H('fill',  'join.js _handleJoin: the first prog3 respec'),
  join_stand_up:      H('fill',  'join.js _handleJoin: a join at 0 stands you up (joinstandup)'),
  respawn:            H('fill',  'index.js _tickPlayerRespawn'),

  /* ── the spar (spar.js: a clone is a body too) ── */
  spar_clone_new:     H('fill',  'spar.js _sparSpawn: a clone made'),
  spar_down:          H('set',   'spar.js _sparDeath: a clone knocked out'),
  spar_self_ko:       H('fill',  'spar.js _sparDeath: you, by your own clone'),
  spar_up:            H('fill',  'spar.js _sparStandBack'),

  /* ── the Test panel (devtools.js) ── */
  dev_heal:           H('fill',  'devtools.js _devVitals: heal'),
  dev_hp:             H('set',   'devtools.js _devVitals: an hp level, never 0'),
});

/* ── THE LIFE PHASE ──
 * 'alive': up and playing.  'dying': the dying seconds (index.js
 * _handlePlayerDeath to _tickPlayerRespawn), or a spar clone knocked out.
 * The old booleans read from it: dying = dead = (life === 'dying'). */
export const LIFE = Object.freeze({ ALIVE: 'alive', DYING: 'dying' });
const L = (to, at) => Object.freeze({ to, at });
export const LIFE_ROADS = Object.freeze({
  death:          L('dying', 'index.js _handlePlayerDeath'),
  spar_down:      L('dying', 'spar.js _sparDeath: a clone knocked out'),
  respawn:        L('alive', 'index.js _tickPlayerRespawn'),
  join_new:       L('alive', 'join.js _handleJoin: a new body'),
  spar_clone_new: L('alive', 'spar.js _sparSpawn: a clone made'),
  spar_up:        L('alive', 'spar.js _sparStandBack: revived'),
  dev_heal:       L('alive', 'devtools.js _devVitals: heal'),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* A wrong road is a programming slip the test catches before it ships (every
   call names a literal row); throwing here keeps one that slipped past from
   writing a body's health or phase by a road nobody chose. */
function hpRoad(road) {
  if (typeof road !== 'string' || !own(HP_ROADS, road)) throw new Error('life door: no hp road "' + road + '" (life.js HP_ROADS)');
  return HP_ROADS[road];
}
function lifeRoad(road, to) {
  const row = typeof road === 'string' && own(LIFE_ROADS, road) ? LIFE_ROADS[road] : null;
  if (!row) throw new Error('life door: no life road "' + road + '" (life.js LIFE_ROADS)');
  if (row.to !== to) throw new Error('life door: road "' + road + '" goes to ' + row.to + ', not ' + to);
  return row;
}

/** The phase a body is in, for a reader that wants the one field (a body
    made before the door, or a test's hand-made one, reads from its booleans). */
export function lifeOf(ps) {
  if (!ps) return LIFE.ALIVE;
  if (ps.life === LIFE.ALIVE || ps.life === LIFE.DYING) return ps.life;
  return ps.dying ? LIFE.DYING : LIFE.ALIVE;
}

export const lifeMethods = {
  /** v2.3.4901: step 2a's switch -- on unless `lifenoheal: false` in the live flags */
  _lifeNoHealOn() {
    const f = this && this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'lifenoheal') && !f.lifenoheal);
  },

  /** A player's health made `v` by `road`.  Step 1: `v` is what the caller's
      own line worked out before the door, written as it is.  Returns it. */
  _hpSet(ps, v, road) {
    const row = hpRoad(road);
    /* v2.3.4901: STEP 2a -- NO HEAL ON A DYING BODY.  A `heal` row is refused
       while the body is in its dying seconds: the hp stays as it is and the
       answer is the hp unchanged.  Most heals already checked (food, the
       regen tick, a PvP kill's heals); the melee lifesteal and lifeblood's
       on-kill heal did not, so a monster killed by a blow already in flight
       as you fell could raise a dying body above 0.  One check here, for
       every heal row, today's and tomorrow's.  A fill (a level-up, a rest),
       a load and a respawn are not heals and are not touched.  Off with
       `lifenoheal: false` in the live flags (the step-1 write, as it is). */
    if (row.kind === 'heal' && lifeOf(ps) === LIFE.DYING && this._lifeNoHealOn()) return ps.hp;
    ps.hp = v;
    return ps.hp;
  },

  /** The life phase made `to` by `road`: the one field, and the two old
      booleans from it (step 1: exactly the pairs the old lines wrote). */
  _lifeTo(ps, to, road) {
    lifeRoad(road, to);
    const dying = to === LIFE.DYING;
    ps.life = to;
    ps.dying = dying;
    ps.dead = dying;
    return ps;
  },

  /** The phone's move claiming `dead` -- only with `serverdead: false`
      (movement.js; v2.3.4373 made the worker's word the default).  The old
      road, kept whole behind its switch: it writes `ps.dead` alone. */
  _lifeDeadClaim(ps, v) {
    ps.dead = !!v;
    return ps.dead;
  },
};
