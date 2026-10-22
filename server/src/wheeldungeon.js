/* ═══ v2.3.3016: DUNGEONS IN THE WHEEL ═══
 *
 * Offered "Dungeons in the Wheel ... the other big missing piece, and a larger
 * job", the owner, 2026-10-03: "Yes continue working on those items".  The
 * World Bible's plan (docs/WORLD-BIBLE.md §8): "On the tapestry, dungeon
 * entrances become places ... Walking in is the loading screen into an
 * instance" -- and dungeon.js's instances (v2.3.1127) are already the private
 * copy, with its own monsters, that walking in should lead to.
 *
 * THE MOUTHS.  A land's landmark is its dungeon's way in: the Great Cave (the
 * Stone Hollows), the Foundry Dome (the Electric Foundry), the Buried City
 * (the Wind Dunes) -- the lands in LANDS.  Where each stands is baked from the
 * plan with the monsters' places (WHEEL_DOORS, tools/world/
 * bake-wheel-spawns.mjs): the landmark, its tier's levels, and the way back
 * out, a step from the mouth on open ground.  The worker has no map.
 *
 * A START is the worker's to judge, as every dungeon_start is
 * (dungeon.js _handleDungeonStart runs its own checks first -- the kill
 * switch, alive, one run each, the room's cap):
 *   - this switch: `wheeldungeons: false` in liveflags closes every mouth and
 *     un-advertises caps.wheeldungeons (join.js), which the client asks before
 *     it shows a mouth or sends one -- an older worker would read `entrance`
 *     as an empty Workshop config and open a dungeon of level-1 fodder;
 *   - a mouth it knows, and the player in the Wheel within DOOR_R of it;
 *   - the config is the worker's alone (the client names only the mouth):
 *     the land's own spawn list, WAVES waves of it, and a boss; the level the
 *     place's top, never above the player's own (the dungeon rule since
 *     v2.3.1127, GDD §36) -- a level-8 player meets a level-8 Great Cave, a
 *     level-40 one its level 30.
 *
 * v2.3.3540: AND A STARTER DUNGEON.  The owner: "I value SIMPLICITY and
 * INTELLIGIBILITY" -- the after-review list's fourth item: the three above are
 * levels 26-45, out of a new player's reach in a first visit, so the Verdant
 * Wilds have a landmark too, the Goo Grotto, in the middle of their first
 * stretch (levels 1-5), about half a minute's walk from town -- where the
 * Mayor's first quest sends a new player for slimes (public/tools/world/
 * plan.js).  And EVERY BOSS IS AT ITS DUNGEON'S LEVEL (data.js
 * DUNGEON_BOSS_UP): it was five levels up, so a level-5 player's level-5
 * dungeon ended on a level-10 boss -- a wall where a fight was meant.
 *
 * ITS MONSTERS are built by the one copy of the stat math, _makeZoneMonster,
 * exactly as the land builds them, with `home`: a kill pays that land's shard
 * and counts for its quests (wheelzone.js _rewardZone), and the client draws
 * the land's own monsters from their own looks.  They stay dead once killed
 * (`noRespawn`, dungeon.js).  The boss is the land's last spawn kind -- its
 * strongest -- at the dungeon's level (v2.3.3540; five levels up until then),
 * scaled as any dungeon boss (dungeon.js _dungeonSpawnBoss: BOSS_MULT x the
 * party's share, dmg x 1.5, its archetype's ability kit).
 *
 * dungeon_started carries `back`, the way back out ({ z: 'wheel', x, y }),
 * and the config `home`; both new, both ignored by a client that never asks.
 * The clear pays as any dungeon's (dungeon.js _dungeonComplete).
 */
import { ZONES, ARCHETYPES, DUNGEON_BOSS_UP } from './data.js';   /* v2.3.3540: + every boss at its dungeon's level */
/* v2.3.3315: the doors of the Wheel this room plays (this._wheelT()) */

export const WHEEL_DUNGEON = {
  /* the lands whose landmark is a dungeon today, and each arena's look (a
     Workshop terrain pack, src/data/gameSystems.js DUNGEON_TERRAIN_PACKS).
     MIRROR: src/game/wheelDungeons.js WHEEL_DUNGEON_HOMES (mirror-audit) */
  LANDS: { hollows: 'crystal_mine', thunder: 'thunder_spire', sky: 'sky_temple',
    verdant: 'toxic_swamp' },   /* v2.3.3540: the Goo Grotto, the starter dungeon (levels 1-5) */
  ZONE: 'wheel',
  /* how near the mouth (game px) a start is taken: the client offers it
     within 200, so a tap at the edge of that is never refused for drift */
  DOOR_R: 260,
  WAVES: 3,
  BOSS_MULT: 4,
  /* the arena, in tiles: big enough that an upright phone draws it at the
     Wheel's own character size -- a zone smaller than the screen is zoomed in
     until it fills it, and the Workshop's 28 x 22 drew the bro two and a half
     times his size.  MIRROR: src/data/wheelDungeons.js WHEEL_ARENA
     (mirror-audit) */
  WIDTH: 36,
  HEIGHT: 52,
  /* a wave stands from this row down to the arena's middle: the rows above
     it are under the top bar, where the player's middle never goes
     (BroTown.jsx _HEAD_MARGIN), and a monster there could not be reached */
  TOP_ROW: 5,
  /* a party member this near the mouth when the leader opens it comes in too
     (dungeon.js _dungeonPullPartyMembers): the Wheel is one zone, so "in the
     leader's zone" alone would pull a member from across the map */
  PARTY_R: 600,
  /* ═══ v2.3.3573: A DUNGEON BUILT FOR A PARTY -- THE GOO GROTTO ═══
     The owner: "I want the goo grotto dungeon to be very difficult without a
     party of 2-3 people.  I'm assuming most people will be around lvl 10 and
     have iron equipment ... with all stat points allocated before they
     attempt it."  A land here is a dungeon of `level`, WHOEVER comes in (the
     dungeon rule's "never above yours" does not hold for it), whose boss is
     sized for `size` players however few come in (dungeon.js
     _dungeonSpawnBoss: the party's share is at least that size's).
       - WHY THE LEVEL.  At the players' own level a level-10 player in iron
         with every point spent shrugs off ~88% of a monster's blow (the
         armour, Defense and Dodge multiply), kills a slime in two swings, and
         a sword's kills give back 90% of what each slime dealt: in the
         simulator (tools/dungeon-sim) a level-10 Grotto sized for three,
         twice the slimes, twice their health and hits, was still cleared
         alone ~60% of the time.  A monster above you is what this game
         makes dangerous: your points lose a fifth of their worth a level
         above you and all of it at five (prog3.js prog3Edge) -- so the
         Grotto's slimes are SIX above its players, past the point where a
         level or two gained in the run brings any back.
       - WHAT IT MEASURED (32 runs each, a level-10 build in iron, every
         point spent, five fish, an average player): alone 0-25% cleared
         (sword 0%, bow 25%, staff 19%), two 75-91%, three 100%; a careful
         player alone 0-28%; at level 12 a sword clears it alone 96% -- a
         level-10 party's dungeon, and a level-12 sword's to solo.  The
         study's tables: docs/specs/grotto-party.md.
     MIRROR: src/data/wheelDungeons.js WHEEL_DUNGEON_PARTY (mirror-audit),
     which the phone shows on the world map and at the mouth against
     caps.partydungeon.  KILL SWITCH (lower case, TRAPS §117):
     `partydungeon: false` in the live flags -- the Grotto of v2.3.3540
     again, its level the place's top and never above yours, its boss sized
     by who is inside -- and un-advertises the cap (the phone shows the
     place's levels again). */
  PARTY: { verdant: { level: 16, size: 3 } },
};

/* v2.3.3540: the mouths' lands IN ORDER -- caps.dungeonLands is how many of
   them this worker opens (join.js), and the phone offers the first that many
   (src/game/wheelDungeons.js) */
export const WHEEL_DUNGEON_LAND_IDS = Object.freeze(Object.keys(WHEEL_DUNGEON.LANDS));

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const wheelDungeonMethods = {
  /* KILL SWITCH (lower case, TRAPS §117): `wheeldungeons: false` */
  _wheelDungeonsOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'wheeldungeons') && !f.wheeldungeons);
  },

  /* v2.3.3573: the party dungeon row of land `id` ({ level, size }), or null
     -- none at all under `partydungeon: false` */
  _wheelDungeonParty(id) {
    if (!own(WHEEL_DUNGEON.PARTY, id)) return null;
    const f = this._liveFlags;
    if (f && typeof f === 'object' && own(f, 'partydungeon') && !f.partydungeon) return null;
    return WHEEL_DUNGEON.PARTY[id];
  },

  /* The mouth of land `id`, baked, or null. */
  _wheelDoor(id) {
    const WHEEL_DOORS = this._wheelT().WHEEL_DOORS;
    if (!own(WHEEL_DUNGEON.LANDS, id) || !WHEEL_DOORS || !own(WHEEL_DOORS, id)) return null;
    const d = WHEEL_DOORS[id];
    return d && Array.isArray(d.at) && Array.isArray(d.back) && Array.isArray(d.levels) ? d : null;
  },

  /* A start at mouth `id` by `ps`: { cfg, back } -- or { error: [code, message] }.
     Nothing from the client but the mouth's name reaches the config. */
  _wheelDungeonConfig(ps, id) {
    if (this._wheelDungeonsOff()) return { error: ['closed', 'This way is closed for now'] };
    const door = this._wheelDoor(id);
    const zone = door && own(ZONES, id) ? ZONES[id] : null;
    if (!door || !zone || !Array.isArray(zone.spawns) || !zone.spawns.length) return { error: ['not-here', 'There is no way in here'] };
    if (!ps || ps.z !== WHEEL_DUNGEON.ZONE || typeof ps.x !== 'number' || typeof ps.y !== 'number'
      || Math.hypot(ps.x - door.at[0], ps.y - door.at[1]) > WHEEL_DUNGEON.DOOR_R) {
      return { error: ['not-here', 'Walk up to its mouth first'] };
    }
    /* v2.3.3573: a party dungeon (the Goo Grotto) is its own level whoever
       comes in; any other, the place's top and never above yours */
    const party = this._wheelDungeonParty(id);
    const top = party ? party.level : Math.max(1, Math.round(Number(door.levels[1]) || 1));
    const lvl = party ? party.level : Math.max(1, Math.min(top, Math.round(ps.level || 1)));
    const last = zone.spawns[zone.spawns.length - 1];
    const bossArch = last && own(ARCHETYPES, last.arch) ? last.arch : 'brute';
    return {
      cfg: {
        name: String(door.name || 'Dungeon').slice(0, 24),
        terrain: WHEEL_DUNGEON.LANDS[id],
        width: WHEEL_DUNGEON.WIDTH,
        height: WHEEL_DUNGEON.HEIGHT,
        waves: WHEEL_DUNGEON.WAVES,
        monsterLevel: lvl,
        element: zone.element || null,
        monsters: [],
        hasBoss: true,
        bossArchetype: bossArch,
        bossMultiplier: WHEEL_DUNGEON.BOSS_MULT,
        home: id,
        levels: party ? [party.level, party.level] : [Number(door.levels[0]) || 1, top],
        /* v2.3.3573: the boss is sized for at least this many (dungeon.js
           _dungeonSpawnBoss); 0 for a dungeon sized by who is inside */
        partySize: party ? party.size : 0,
      },
      back: { z: WHEEL_DUNGEON.ZONE, x: door.back[0], y: door.back[1] },
    };
  },

  /* One of the land's monsters for this run (dungeon.js places it): built
     as the land builds it, at `lvl`, with its home, staying dead once dead. */
  _wheelDungeonMonster(inst, spawn, lvl, idSuffix) {
    const home = inst.cfg.home;
    const zone = own(ZONES, home) ? ZONES[home] : null;
    if (!zone) return null;
    const m = this._makeZoneMonster(home, zone, spawn, 'dm-' + inst.id + '-' + idSuffix, 0, 0, Math.min(100, Math.max(1, lvl)));
    if (!m) return null;
    m.home = home;
    m.noRespawn = true;
    m.respawnAt = 0;
    return m;
  },

  /* A wave: the land's whole spawn list, across the arena's upper half, every
     monster AT THE DUNGEON'S LEVEL.
     v2.3.3556: it rolled +0..2 levels each (the Workshop's jitter, dungeon.js),
     so the dungeon said one level -- its top bar "(Lv28-28)" -- and fought
     three, and its boss, at the dungeon's level since v2.3.3540, was weaker
     than the waves before it.  The owner values "SIMPLICITY and
     INTELLIGIBILITY": the dungeon is one level, everything in it is that
     level, and the boss is the big one (dungeon.js: four times a wave
     monster's whole health).  The Workshop keeps its jitter. */
  _wheelDungeonWave(inst) {
    const list = this.monsters[inst.zone];
    const zone = own(ZONES, inst.cfg.home) ? ZONES[inst.cfg.home] : null;
    if (!list || !zone) return;
    let n = 0;
    for (const spawn of zone.spawns) {
      for (let c = 0; c < (spawn.count || 0); c++) {
        const lvl = inst.cfg.monsterLevel;
        const m = this._wheelDungeonMonster(inst, spawn, lvl, inst.wave + '-' + (n++));
        if (!m) continue;
        m.x = m.spawnX = (3 + Math.random() * (inst.cfg.width - 6)) * this.TILE;
        m.y = m.spawnY = (WHEEL_DUNGEON.TOP_ROW + Math.random() * (inst.cfg.height / 2 - WHEEL_DUNGEON.TOP_ROW)) * this.TILE;
        list.push(m);
        this._markMonsterDirty(inst.zone, m.id);
      }
    }
  },

  /* The boss's body: the land's last spawn kind, at the dungeon's level
     (v2.3.3540: five levels up until then; dungeon.js scales it and gives it
     its kit). */
  _wheelDungeonBossBody(inst) {
    const zone = own(ZONES, inst.cfg.home) ? ZONES[inst.cfg.home] : null;
    if (!zone || !zone.spawns.length) return null;
    return this._wheelDungeonMonster(inst, zone.spawns[zone.spawns.length - 1], inst.cfg.monsterLevel + DUNGEON_BOSS_UP, 'boss');
  },
};
