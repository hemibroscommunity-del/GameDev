/* ═══ v2.3.5289: EXPERIENCE AND LEVELS' DOOR (grand plan step 4.3, card R PR 10) ═══
 * (spec docs/specs/xp-door.md; pinned by server/test/xp-door.test.mjs)
 *
 * Every change to a character's experience and levels goes through this
 * door, as gold, the bag, the stashes, the build points and a quest's state
 * have theirs.  Before it they were written by hand in about thirty places
 * across ten files, each reading the count its own way (`s.xp || 0`,
 * `sk.xp +=`, `ps.level || 1`...).
 *
 * THE TRACKS (XP_TRACKS): an object holding `{level, xp}`:
 *   life    a life skill, `ps.lifeSkills[key]` (Mining, Cooking, Trapping...)
 *   skill   a combat skill, `ps.prog3.sk[cat]` (Melee, Bow, Magic)
 *   char    the character itself, `ps.level` and `ps.xp` (the level the
 *           highest skill gives; the old grid's running XP total)
 *
 * FOUR VERBS, each call naming its road (XP_ROADS):
 *   xpGive(t, n, road)            experience INTO a track (its row's read)
 *   xpLevelUp(t, need, road)      ONE level up: `need` taken from its XP, its
 *                                 level one more -- a level-up is the door's;
 *                                 the caller's loop says when, and does what a
 *                                 level brings (points, messages)
 *   xpSet(t, field, v, road)      a track's `level` or `xp` MADE `v` (a load,
 *                                 a heal, the character level, the cap)
 *   xpMake(holder, key, level, road)  a whole track made, `{level, xp: 0}`
 *                                 (a broken skill healed, the owner's lever)
 * A road the table has not got, a road of another verb, a field the road
 * does not name, or a track that is no object throws, nothing written.
 *
 * STEP 1, NOTHING CHANGES: each road keeps the exact read its place had
 * (`read`, below); xp-door.test replays each old line against the door.
 *
 * NOT HERE, with why (xp-door.test lists each): a stored record shaped
 * before it is a live player's (the migrations, the sanitizers); a build
 * made up in memory (the power index); and what is not a character's
 * experience at all (a monster's reward, a pet's own, a party roster's copy,
 * a hit's record, a harvest's report, a meal's timer).  A pet's experience
 * is the pet's (petbook.js, its own record `pets:`): out.
 *
 * No imports: node tests it bare. */

export const XP_TRACKS = Object.freeze(['life', 'skill', 'char']);
export const XP_VERBS = Object.freeze(['give', 'levelUp', 'set', 'make']);
export const XP_FIELDS = Object.freeze(['level', 'xp']);

/* How a road reads a count before it adds (the place's own line, step 1):
     plain    `t.xp + n` (`sk.xp += amount`)
     inc      `+t.level + 1`, as `sk.level++` reads it (a number, always)
     orZero   `(t.xp || 0) + n`
     orBoth   `(t.xp || 0) + (n || 0)`
     orOne    a level read `(t.level || 1)` */
export const XP_READS = Object.freeze({
  plain: (v) => v,
  inc: (v) => +v,
  orZero: (v) => v || 0,
  orBoth: (v) => v || 0,
  orOne: (v) => v || 1,
});

const R = (verb, track, at, read = null, field = null) => Object.freeze({ verb, track, at, read, field });

export const XP_ROADS = Object.freeze({
  /* ── a life skill (gathering.js: every harvest, craft and cook pays here) ── */
  life_make:       R('make', 'life', 'gathering.js _addLifeSkillXp: a skill that is no object, made level 1'),
  life_xp:         R('give', 'life', 'gathering.js _addLifeSkillXp: the XP a harvest, a craft or a cook pays', 'orZero'),
  life_level:      R('levelUp', 'life', 'gathering.js _addLifeSkillXp: a level-up', 'orOne'),
  trap_ready:      R('make', 'life', 'trapping.js _trapSkillReady: a broken Trapping or Woodworking, made level 1'),
  trap_bootstrap:  R('make', 'life', 'trapping.js trapBootstrapGuard: a first join\'s claimed Trapping, back to level 1'),
  wood_ready:      R('make', 'life', 'hardenedwood.js _handleMakeHardenedWood: a missing Woodworking, made level 1'),

  /* ── a combat skill (prog3.js) ── */
  skill_xp:        R('give', 'skill', 'prog3.js _prog3AwardXp: a fight\'s XP (a quest\'s, flat)', 'plain'),
  skill_level:     R('levelUp', 'skill', 'prog3.js _prog3AwardXp: a level-up (its points are the points door\'s)', 'inc'),
  skill_cap:       R('set', 'skill', 'prog3.js _prog3AwardXp: at the level cap the XP is 0', null, 'xp'),

  /* ── the character ── */
  char_level:      R('set', 'char', 'prog3.js _prog3Recompute: the character level, the highest skill', null, 'level'),
  grid_level_heal: R('set', 'char', 'grids.js _addCombatXp: a missing level made 1', null, 'level'),
  grid_xp:         R('give', 'char', 'grids.js _addCombatXp: a kill\'s XP, the old grid\'s running total', 'orBoth'),
  bp_level_heal:   R('set', 'char', 'grids.js _tryLevelUpFromBuildPoints: a missing level made 1', null, 'level'),
  bp_level:        R('set', 'char', 'grids.js _tryLevelUpFromBuildPoints: a level from five build points', null, 'level'),
  build_level:     R('set', 'char', 'grids.js _recomputeMaxes: the old grid\'s level, from the build\'s total', null, 'level'),
  join_level:      R('set', 'char', 'join.js _handleJoin: the stored character\'s level', null, 'level'),
  join_xp:         R('set', 'char', 'join.js _handleJoin: the stored character\'s XP', null, 'xp'),
  join_new_level:  R('set', 'char', 'join.js _handleJoin: a new character\'s first level (its claim, capped)', null, 'level'),
  join_new_xp:     R('set', 'char', 'join.js _handleJoin: a new character\'s first XP (its claim, capped)', null, 'xp'),

  /* ── the owner's Test panel (devtools.js, behind the admin key) ── */
  dev_life:        R('make', 'life', 'devtools.js _devLifeSkill: a life skill set to a level'),
  dev_skill:       R('make', 'skill', 'devtools.js _devCombatLevel: a combat skill set to a level'),
  dev_trapping:    R('make', 'life', 'devtools.js _devTrapping: Trapping set to a level'),
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function roadFor(road, verb) {
  const row = typeof road === 'string' && own(XP_ROADS, road) ? XP_ROADS[road] : null;
  if (!row) throw new Error('xp door: no road "' + road + '" (xp.js XP_ROADS)');
  if (row.verb !== verb) throw new Error('xp door: road "' + road + '" is a ' + row.verb + ', not a ' + verb);
  return row;
}
function trackOk(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) throw new Error('xp door: a track is an object ({level, xp})');
}

/** Experience INTO a track by `road` (its row's read).  Returns the XP. */
export function xpGive(t, n, road) {
  const row = roadFor(road, 'give');
  trackOk(t);
  const add = row.read === 'orBoth' ? (n || 0) : n;
  t.xp = XP_READS[row.read](t.xp) + add;
  return t.xp;
}

/** ONE level up by `road`: `need` taken from the track's XP, its level one
 *  more (read by the row).  Returns the new level. */
export function xpLevelUp(t, need, road) {
  const row = roadFor(road, 'levelUp');
  trackOk(t);
  t.xp -= need;
  t.level = XP_READS[row.read](t.level) + 1;
  return t.level;
}

/** A track's `field` (`level` or `xp`, the road's own) MADE `v`. */
export function xpSet(t, field, v, road) {
  const row = roadFor(road, 'set');
  trackOk(t);
  if (field !== row.field) throw new Error('xp door: road "' + road + '" sets ' + row.field + ', not ' + field);
  t[field] = v;
  return v;
}

/** A whole track made under `holder[key]`: `{level, xp: 0}`.  Returns it. */
export function xpMake(holder, key, level, road) {
  roadFor(road, 'make');
  if (!holder || typeof holder !== 'object') throw new Error('xp door: no holder for the track');
  if (typeof key !== 'string' || !key || BAD_KEYS.has(key)) throw new Error('xp door: a track\'s key is a plain name');
  holder[key] = { level, xp: 0 };
  return holder[key];
}
