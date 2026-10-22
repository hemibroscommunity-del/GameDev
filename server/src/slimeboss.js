/* ═══ v2.3.3558: THE GIANT SLIME SPLITS ═══
 *
 * The owner, 2026-10-22, of the dungeon boss: "I think a giant slime that
 * explodes and spawns small (normal size slimes) like 8-10 maybe but shrinks
 * in size afterwards would be a good boss. Maybe it does 3 rounds of that
 * before it finally just becomes a normal slime then after you kill that you
 * defeat the dungeon".
 *
 * WHICH BOSS.  The Goo Grotto's (LANDS: the Verdant Wilds' dungeon, the
 * starter, its boss a Blue Slime drawn twice your height since v2.3.3556's
 * "Make boss slime huge"), and since v2.3.3562 the Foundry Dome's (the
 * Electric Foundry's dungeon, levels 26-30, its boss a giant Storm Slime --
 * the owner's "Yes" to "the Foundry Dome gets the splitting slime boss": its
 * waves are slimes too).  The Great Cave's golem and the Buried City's mummy
 * keep their one big boss; a land here is one line.
 *
 * ONE HEALTH BAR.  The boss keeps the health v2.3.3556 gave it (four wave
 * monsters' worth, x the party's share).  Each time it has lost another
 * quarter -- at 75%, 50% and 25% (`splitShare`: (n - i) / (n + 1), so the
 * phone draws the marks from `bn` alone) -- it SPLITS:
 *   - it swells for SWELL_MS, the blue slime's own warning (telegraph.js
 *     SLIME_BURST.SWELL_MS), and nothing can hurt it meanwhile: it sits at
 *     its mark, and the damageable gate refuses a boss at its mark
 *     (combat.js _monsterDamageable);
 *   - it goes off as a blue slime does, the blast of SLIME_BURST.DMG through
 *     the one door's `burst` row (hits.js; telegraph.js _telegraphHitPlayer),
 *     at every player within BLAST_R of it, sized to its swollen body.  Every
 *     splitting boss goes off, whether or not its kind bursts on death
 *     (v2.3.3562: a storm slime does not, and the Foundry Dome's giant
 *     would have swelled and gone off with no blast, the phone drawing a
 *     shockwave that hurt nobody); the row gives the blast its land's status
 *     -- a storm slime's arcs to whoever stands near the one it hit;
 *   - SPAWN[i] of the dungeon's own slimes fly out of it (the wave monster's
 *     maker, wheeldungeon.js: their health, hits, shards, quests, and a blue
 *     slime's own burst when it dies), held still LAND_MS while they land;
 *   - and it shrinks a step: the phone draws it k0^((bn - bs) / bn) times a
 *     slime (gameSystems.js bossSizeK), k0 its whole size, so after the third
 *     split it is a normal slime's size.
 * The last quarter is exactly one wave slime's health (the boss is four), so
 * "it finally just becomes a normal slime" is true of its health too.
 *
 * NO HIT SKIPS A SPLIT.  While a split is left, no hit takes it below the
 * next mark (combat.js `_monsterHpFloor`, beside the damageable gate, read by
 * every place a monster loses health:
 * combat.js twice, abilities.js, index.js _applyMonsterDot, hits.js' thorns),
 * and at the mark it cannot be hurt until it has split (the damageable gate).
 * A crit that would have taken it from full to nothing stops at 75%.
 *
 * THE END.  Its last form dies as any of its kind does -- a blue slime swells
 * and goes off first (telegraph.js _startSlimeBurst), a storm slime just dies
 * -- and then every slime it threw out that is still alive pops (no reward:
 * nobody killed it), so the kill IS the win: the run clears on the next tick
 * (dungeon.js _tickDungeons, which waits for every monster).
 *
 * THE WIRE.  The boss's full mapping (dungeon.js _dungeonPushZoneState,
 * spawnscale.js monsterSnapWire, join.js state_sync) carries `bs` (splits
 * done) and `bn` (splits in all) beside v2.3.3556's `boss: 1`, on a
 * splitting boss alone -- every other monster's wire is byte for byte what it
 * was.  A split re-pushes the zone (as a summon does: the new slimes need the
 * full snapshot) and is told on dungeon_boss_ability, already privileged:
 * `split` / `telegraph` (ms, scale) then `split` / `execute` (radius, the new
 * slimes' ids), and at the end `split` / `pop` (the slimes that popped).  An older phone whitelists the ability names it knows and
 * draws nothing for `split`: the boss stays drawn huge to the end, the slimes
 * simply appear.  No new message type, no caps flag.
 *
 * Kill switch (lower case, TRAPS §117): `slimeboss: false` in the live flags
 * -- a boss made after it is the one big boss of v2.3.3556.
 */
import { SLIME_BURST } from './telegraph.js';
import { WHEEL_DUNGEON } from './wheeldungeon.js';
import { ZONES } from './data.js';

export const SLIME_BOSS = {
  /* the dungeons (by land) whose boss splits: the Goo Grotto and, since
     v2.3.3562, the Foundry Dome (both lands' dungeon monsters are slimes) */
  LANDS: { verdant: 1, thunder: 1 },
  SPLITS: 3,
  /* slimes out at each split (the owner: "like 8-10"): fewer as it shrinks */
  SPAWN: [10, 9, 8],
  /* the warning, unhittable and still: the blue slime's own swell */
  SWELL_MS: SLIME_BURST.SWELL_MS,
  /* how big it swells (the phone's `_burstScale`): a slime's is 3.5, but the
     boss is already 4.6 times a slime at its first split */
  SWELL_SCALE: 1.3,
  /* its blast's reach at each split, as wide as its swollen body looks,
     never less than a blue slime's own (SLIME_BURST.RADIUS): a slime's body
     is 24 px, x its size (4.59, 2.76, 1.66) x the swell, x 1.3 -- the share
     v2.3.2226 drew a slime's own blast past its swollen body */
  BLAST_R: [180, 115, 110],
  /* where the slimes land: a ring round it, out past its body (24 px x 4.59) */
  RING: [125, 230],
  /* the slimes hold still while they land, and do not swing at once */
  LAND_MS: 600,
  FIRST_SWING_MS: 1100,
};

/* The health share (of its max) at which split i (0-based) of n comes: every
   quarter for three.  The phone draws the marks on the boss's bar by this. */
export function splitShare(i, n) {
  return (n - i) / (n + 1);
}

/* What a splitting boss adds to its full wire mapping: splits done and in
   all.  Nothing for any other monster. */
export function bossSplitWire(m) {
  return m && m._split ? { bs: m._split.n, bn: m._split.of } : {};
}

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const slimeBossMethods = {
  /* KILL SWITCH: `slimeboss: false` */
  _slimeBossOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'slimeboss') && !f.slimeboss);
  },

  /* Called by dungeon.js _dungeonSpawnBoss once the boss's health is set:
     a Goo Grotto or Foundry Dome boss gets its splits. */
  _slimeBossArm(inst, m) {
    if (!inst || !m || !inst.cfg || !own(SLIME_BOSS.LANDS, inst.cfg.home)) return false;
    if (this._slimeBossOff()) return false;
    m._split = { n: 0, of: SLIME_BOSS.SPLITS, until: 0 };
    m._splitFloor = this._slimeBossMark(m);
    return true;
  },

  /* The health its next split comes at, or 0 with none left. */
  _slimeBossMark(m) {
    const s = m && m._split;
    if (!s || s.n >= s.of) return 0;
    return Math.max(1, Math.floor((m.maxHp || 0) * splitShare(s.n, s.of)));
  },

  /* Run each dungeon tick while the boss is up (dungeon.js _tickDungeons),
     before its ability script.  True while it is swelling or has just split,
     so the script casts nothing this tick. */
  _slimeBossTick(inst, players, now) {
    const list = this.monsters[inst.zone];
    if (!list) return false;
    const m = list.find((x) => x && x._dungeonBoss && x.alive && x._split);
    if (!m) return false;
    const s = m._split;
    if (s.until) {
      if (now < s.until) {
        m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
        return true;
      }
      this._slimeBossSplit(inst, players, m, now);
      return true;
    }
    if (s.n >= s.of || !(m._splitFloor > 0) || m.hp > m._splitFloor || m.hp <= 0) return false;
    /* AT THE MARK: swell.  Whatever it was casting stops and it stands
       still; nothing can hurt it until it goes off, as it sits at its mark
       (combat.js _monsterDamageable). */
    s.until = now + SLIME_BOSS.SWELL_MS;
    m._abilityPhase = null; m._pendingAbility = null; m._chargeUntil = 0;
    m._attackingUntil = Math.max(m._attackingUntil || 0, s.until);
    m.atkCd = Math.max(m.atkCd || 0, s.until + 600);
    m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;   /* no swing wound up out of a swell */
    m._nextAbilityAt = Math.max(m._nextAbilityAt || 0, s.until + 1500);
    this._markMonsterDirty(inst.zone, m.id);
    this._dungeonBossAbilityEvent(inst.zone, players, m, 'split', 'telegraph', {
      ms: SLIME_BOSS.SWELL_MS, scale: SLIME_BOSS.SWELL_SCALE, stage: s.n, of: s.of,
    });
    return true;
  },

  /* The swell is over: it goes off, throws its slimes out and shrinks. */
  _slimeBossSplit(inst, players, m, now) {
    const s = m._split;
    const i = s.n;
    s.until = 0;
    /* the blast, as a blue slime's -- every splitting boss's, whether or not
       its kind bursts on death (v2.3.3562: the Foundry Dome's storm slime
       does not; v2.3.3558 asked _burstsOnDeath, and its giant would have
       swelled, drawn its shockwave and hurt nobody) */
    const radius = SLIME_BOSS.BLAST_R[Math.min(i, SLIME_BOSS.BLAST_R.length - 1)];
    let hit = false;
    const kit = { kind: 'burst', radius, dmgMult: 1, flat: SLIME_BURST.DMG };
    const r2 = radius * radius;
    for (const pid of players) {
      const ps = this.playerState[pid];
      if (!ps || ps.dead || ps.dying || ps.z !== inst.zone) continue;
      const dx = (ps.x || 0) - m.x, dy = (ps.y || 0) - m.y;
      if (dx * dx + dy * dy > r2) continue;
      if (this._telegraphHitPlayer(inst.zone, m, pid, kit) > 0) hit = true;
    }
    /* the slimes */
    const ids = this._slimeBossSpawn(inst, m, SLIME_BOSS.SPAWN[Math.min(i, SLIME_BOSS.SPAWN.length - 1)], now);
    /* and a step smaller: the next mark, or none after the last */
    s.n = i + 1;
    m._splitFloor = this._slimeBossMark(m);
    this._markMonsterDirty(inst.zone, m.id);
    /* the new slimes and its new size (bs) need the full snapshot, as a
       summon's minions do; the event after it says where they came from */
    this._dungeonPushZoneState(inst.zone);
    this._dungeonBossAbilityEvent(inst.zone, players, m, 'split', 'execute', {
      stage: s.n, of: s.of, radius, hit, count: ids.length, ids,
    });
  },

  /* `count` of the land's own slimes (the boss's kind: the last of its spawn
     list, as wheeldungeon.js _wheelDungeonBossBody takes it) round the boss.
     Returns their ids. */
  _slimeBossSpawn(inst, m, count, now) {
    const list = this.monsters[inst.zone];
    const zone = own(ZONES, inst.cfg.home) ? ZONES[inst.cfg.home] : null;
    if (!list || !zone || !Array.isArray(zone.spawns) || !zone.spawns.length) return [];
    const spawn = zone.spawns[zone.spawns.length - 1];
    /* v2.3.3573: the arena's floor, the box every shove keeps a monster in
       (dungeon.js _monsterBox) -- it was (height - 2) tiles down, inside the
       three-row bottom wall */
    const T = this.TILE;
    const box = this._monsterBox(inst.zone) || { x0: 2 * T, x1: (inst.cfg.width - 2) * T, y0: WHEEL_DUNGEON.TOP_ROW * T, y1: (inst.cfg.height - 4) * T };
    const minX = box.x0, maxX = box.x1, minY = box.y0, maxY = box.y1;
    const seq = inst._splitSeq = (inst._splitSeq || 0);
    const ids = [];
    const turn = Math.random() * Math.PI * 2;
    for (let k = 0; k < count; k++) {
      const sm = this._wheelDungeonMonster(inst, spawn, inst.cfg.monsterLevel, 'split' + m._split.n + '-' + (seq + k));
      if (!sm) continue;
      const a = turn + (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = SLIME_BOSS.RING[0] + Math.random() * (SLIME_BOSS.RING[1] - SLIME_BOSS.RING[0]);
      sm.x = sm.spawnX = Math.max(minX, Math.min(maxX, m.x + Math.cos(a) * r));
      sm.y = sm.spawnY = Math.max(minY, Math.min(maxY, m.y + Math.sin(a) * r));
      sm._splitSpawn = true;
      sm._attackingUntil = now + SLIME_BOSS.LAND_MS;
      sm.atkCd = now + SLIME_BOSS.FIRST_SWING_MS;
      list.push(sm);
      this._markMonsterDirty(inst.zone, sm.id);
      ids.push(sm.id);
    }
    inst._splitSeq = seq + count;
    return ids;
  },

  /* Once its last form is dead (after its own burst), every slime it threw
     out that is still alive pops -- killing it is the win.  Run each dungeon
     tick before the "every monster dead" test.  Returns how many popped.
     The phones are told which (split / pop, sent at once, so before the
     tick that says they are dead): each would play its own splat, and twenty
     at once on a bus with no limiter is a roar -- they play one. */
  _slimeBossCleanup(inst) {
    const list = this.monsters[inst.zone];
    if (!list) return 0;
    const boss = list.find((x) => x && x._dungeonBoss && x._split);
    if (!boss || boss.alive) return 0;
    const ids = [];
    for (const x of list) {
      if (!x || !x._splitSpawn || !x.alive) continue;
      /* one already swelling was killed by someone: it goes off and pays as
         any (telegraph.js _resolveSlimeBurst), and the clear waits for it */
      if (x._burstUntil) continue;
      x.alive = false;
      x.hp = 0;
      x.respawnAt = 0;
      this._markMonsterDirty(inst.zone, x.id);
      ids.push(x.id);
    }
    if (ids.length) {
      this._dungeonBossAbilityEvent(inst.zone, this._dungeonZonePlayers(inst.zone), boss, 'split', 'pop', { count: ids.length, ids });
    }
    return ids.length;
  },
};
