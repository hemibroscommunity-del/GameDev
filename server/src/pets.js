/* ═══ v2.3.1130: SERVER-VALIDATED PET CAPTURE (handoff backlog item G;
 * spec in docs/specs/pets.md) ═══
 *
 * Pet capture was 100% client theatre (MenuBar's trap button): the 20%
 * HP gate checked the CLIENT's monster hp, the chance roll was the
 * player's own Math.random, the pet was minted locally, trapping XP
 * self-awarded -- and two things were worse than the backlog note
 * assumed:
 *   - basic_trap items were sold server-side but NEVER consumed by
 *     anything.  Captures were free.
 *   - The "captured" monster only died on the capturer's own screen
 *     (m.alive=false locally); the authoritative monster kept living
 *     and attacking until the next zone sync resurrected it.
 *
 * The server now owns the attempt end to end: it validates against
 * ITS monster (alive, hp/maxHp <= 20%, in range), ITS trap inventory
 * (one basic_trap consumed per attempt -- the item finally matters),
 * and ITS skill levels; rolls the same formula the client used; kills
 * the monster properly on success (no loot/XP/kill credit -- a capture
 * is not a kill); and becomes the trapping-XP writer.  The pet reaches
 * the client via the authoritative lifeSkills echo -- the client's
 * per-key merge adopts it, which turns the old "echo stomps my pets"
 * bug into the intended flow.
 *
 * Pets were cosmetic + client-side economy only (their loot-vacuum
 * coins were always stomped by the echo), so the join-time adoption
 * below is deliberately forgiving: when the server has no pets on
 * record and the client brought some, adopt a SANITIZED copy (cap 6,
 * whitelisted fields).  Forgery ceiling: six cosmetic pets -- since
 * v2.3.1200 an active pet also widens the owner's loot-pickup radius
 * to PETS.VACUUM_RANGE (the vacuum is economically real now; see
 * _handleLootPickup in index.js), which is the deliberate feature,
 * not a leak: the wider radius only reaches piles the player is
 * already a recipient of.
 *
 * Validation order matters: every rejection happens BEFORE the trap
 * is consumed -- only a real roll spends it. */

import { ARCHETYPES } from './data.js';

export const PETS = {
  HP_THRESHOLD: 0.20,     // capture only below 20% hp (client TRAP_HP_THRESHOLD)
  MAX_SLOTS: 6,           // client MAX_PET_SLOTS
  CAPTURE_RANGE: 200,     // px from player to monster
  BASE_CHANCE: 0.4,       // + trapping/woodcutting bonuses - level penalty
  TRAP_LVL_BONUS: 0.005,
  WC_LVL_BONUS: 0.002,    // "better trap materials"
  LEVEL_PENALTY: 0.05,    // per level the monster is above the player
  CHANCE_MIN: 0.1,
  CHANCE_MAX: 0.95,
  ESCAPE_XP: 5,
  CAPTURE_XP_BASE: 15,
  CAPTURE_XP_PER_LVL: 2,
  /* v2.3.1200: pet loot vacuum range (px), measured from the OWNER's
   * server-known position -- the server does NOT track pet position
   * (the client's S._petX/_petY follow-orbit is pure cosmetics), so
   * the owner's spot + a modestly larger radius stands in for the pet.
   * Geometry: LOOT_PICKUP_RANGE (160) already absorbs the pile-spawn
   * offset + render magnetism + move-throttle lag stack measured from
   * the client's 20 px manual trigger; the pet's trigger point sits up
   * to ~130 px from the player instead (<=50 px follow orbit +
   * PET_LOOT_RADIUS 80 in src/data/gameSystems.js), so +80 keeps the
   * same slack without opening cross-screen theft. */
  VACUUM_RANGE: 240,
};

const PET_NAMES = ['Nibbles', 'Chompy', 'Sparky', 'Dusty', 'Wispy', 'Bubbles', 'Frosty', 'Ember', 'Shade', 'Glimmer', 'Mossy', 'Rocky', 'Zippy', 'Gloop', 'Rumble'];
const PET_PERSONALITIES = ['playful', 'lazy', 'curious', 'anxious', 'bold'];
const PET_ELEMENTS = ['flame', 'venom', 'frost', 'storm', 'stone', 'wind', 'water'];

export const petMethods = {
  _petSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  // Whitelist/clamp a pet list from any untrusted source (join
  // bootstrap or legacy adoption).  Ids are regenerated -- client ids
  // are freeform strings and double as React keys, so collisions from
  // a forged list would be the client's own problem, but regenerating
  // keeps the stored blob canonical.
  _sanitizePets(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const p of raw.slice(0, PETS.MAX_SLOTS)) {
      if (!p || typeof p !== 'object') continue;
      const arch = (typeof p.archetype === 'string' && ARCHETYPES[p.archetype]) ? p.archetype : 'fodder';
      out.push({
        id: 'pet-' + Date.now() + '-' + Math.floor(Math.random() * 999999),
        archetype: arch,
        element: PET_ELEMENTS.includes(p.element) ? p.element : null,
        name: (typeof p.name === 'string' && p.name.trim()) ? p.name.slice(0, 24) : PET_NAMES[Math.floor(Math.random() * PET_NAMES.length)],
        level: Math.max(1, Math.min(100, Math.floor(Number(p.level)) || 1)),
        emoji: (typeof p.emoji === 'string' && p.emoji) ? p.emoji.slice(0, 8) : ARCHETYPES[arch].emoji,
        color: (typeof p.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(p.color)) ? p.color : ARCHETYPES[arch].color,
        captured_at: (typeof p.captured_at === 'number' && p.captured_at > 0) ? p.captured_at : Date.now(),
        personality: PET_PERSONALITIES.includes(p.personality) ? p.personality : PET_PERSONALITIES[Math.floor(Math.random() * PET_PERSONALITIES.length)],
      });
    }
    return out;
  },

  /* Join hook.  Two jobs: (a) sanitize whatever pets the server
   * already holds (old bootstraps took rpgLifeSkills wholesale with
   * zero field validation); (b) one-time legacy adoption -- players
   * whose captures only ever lived client-side get them onto the
   * server record, sanitized, IF the server has none (a non-empty
   * server list always wins; it's the authoritative history). */
  _petsAdoptOnJoin(ps, data) {
    if (!ps) return;
    if (!ps.lifeSkills) ps.lifeSkills = {};
    const held = ps.lifeSkills.pets;
    if (Array.isArray(held) && held.length > 0) {
      ps.lifeSkills.pets = this._sanitizePets(held);
      if ((ps.lifeSkills.activePet === null || ps.lifeSkills.activePet === undefined) && ps.lifeSkills.pets.length > 0) {
        ps.lifeSkills.activePet = 0;
      }
      return;
    }
    const clientPets = data && data.rpgLifeSkills && Array.isArray(data.rpgLifeSkills.pets) ? data.rpgLifeSkills.pets : null;
    if (clientPets && clientPets.length > 0) {
      ps.lifeSkills.pets = this._sanitizePets(clientPets);
      if ((ps.lifeSkills.activePet === null || ps.lifeSkills.activePet === undefined) && ps.lifeSkills.pets.length > 0) {
        ps.lifeSkills.activePet = 0;
      }
    }
  },

  // pet_capture -- explicit switch case.  Synchronous (no storage
  // awaits): validate everything, spend the trap, roll, settle.
  _handlePetCapture(session, payload) {
    const res = (obj) => this._petSend(session.id, 'pet_capture_result', obj);
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return res({ captured: false, error: 'not-now' });
    const monsterId = payload && payload.monsterId;
    const list = this.monsters[ps.z] || [];
    const m = list.find((x) => x.id === monsterId);
    if (!m || !m.alive) return res({ captured: false, error: 'no-monster' });
    if (m.maxHp > 0 && m.hp / m.maxHp > PETS.HP_THRESHOLD) return res({ captured: false, error: 'too-healthy' });
    const dx = m.x - ps.x, dy = m.y - ps.y;
    if (Math.sqrt(dx * dx + dy * dy) > PETS.CAPTURE_RANGE) return res({ captured: false, error: 'too-far' });
    if (!ps.lifeSkills) ps.lifeSkills = {};
    if (!Array.isArray(ps.lifeSkills.pets)) ps.lifeSkills.pets = [];
    if (ps.lifeSkills.pets.length >= PETS.MAX_SLOTS) return res({ captured: false, error: 'slots-full' });
    if (!ps.inventory || (ps.inventory.basic_trap || 0) < 1) return res({ captured: false, error: 'no-trap' });

    // Everything validated -- the trap is spent on the ATTEMPT.
    ps.inventory.basic_trap -= 1;
    if (ps.inventory.basic_trap <= 0) delete ps.inventory.basic_trap;

    const trapLvl = (ps.lifeSkills.trapping && ps.lifeSkills.trapping.level) || 1;
    const wcLvl = (ps.lifeSkills.woodcutting && ps.lifeSkills.woodcutting.level) || 1;
    const chance = Math.max(PETS.CHANCE_MIN, Math.min(PETS.CHANCE_MAX,
      PETS.BASE_CHANCE + trapLvl * PETS.TRAP_LVL_BONUS + wcLvl * PETS.WC_LVL_BONUS
      - Math.max(0, (m.level || 1) - (ps.level || 1)) * PETS.LEVEL_PENALTY));

    if (Math.random() > chance) {
      this._addLifeSkillXp(ps, 'trapping', PETS.ESCAPE_XP);
      this._saveRpg(session.id, ps);
      this._queuePlayerStateFlush(session.id);
      return res({ captured: false, chance });
    }

    const arch = ARCHETYPES[m.arch] ? m.arch : 'fodder';
    const pet = {
      id: 'pet-' + Date.now() + '-' + Math.floor(Math.random() * 999999),
      archetype: arch,
      element: m.element || null,
      name: PET_NAMES[Math.floor(Math.random() * PET_NAMES.length)],
      level: Math.max(1, Math.min(100, m.level || 1)),
      emoji: m.emoji || ARCHETYPES[arch].emoji,
      color: m.color || ARCHETYPES[arch].color,
      captured_at: Date.now(),
      personality: PET_PERSONALITIES[Math.floor(Math.random() * PET_PERSONALITIES.length)],
    };
    ps.lifeSkills.pets.push(pet);
    if (ps.lifeSkills.activePet === null || ps.lifeSkills.activePet === undefined) {
      ps.lifeSkills.activePet = ps.lifeSkills.pets.length - 1;
    }
    // The capture removes the monster FOR EVERYONE (the old client-only
    // m.alive=false left the authoritative monster attacking).  Not a
    // kill: no loot pile, no XP/gold shares, no quest credit.  World
    // monsters respawn on the normal clock; dungeon-instance monsters
    // honor noRespawn (a captured wave member counts as cleared).
    m.alive = false;
    m.hp = 0;
    m.targetId = null;
    m.respawnAt = m.noRespawn ? 0 : Date.now() + this._monsterRespawnMs(ps.z); // v2.3.1983: population-scaled, like the kill path
    this._markMonsterDirty(ps.z, m.id);
    this._addLifeSkillXp(ps, 'trapping', PETS.CAPTURE_XP_BASE + (m.level || 1) * PETS.CAPTURE_XP_PER_LVL);
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    res({ captured: true, pet, chance });
  },
};
