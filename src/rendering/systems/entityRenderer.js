/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TILE } from '@/data/constants.js';

const NAME_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 10,
  fontWeight: '700',
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

const HP_BAR_W = 24;
const HP_BAR_H = 3;

/**
 * Creates a monster display object (container with body + HP bar + name).
 */
function createMonsterDisplay(monster) {
  const container = new Container();
  container.label = `monster_${monster.id}`;

  // Body circle
  const body = new Graphics();
  const size = getMonsterSize(monster.archetype);
  container.addChild(body);

  // HP bar background
  const hpBg = new Graphics();
  hpBg.rect(-HP_BAR_W / 2, -size - 10, HP_BAR_W, HP_BAR_H);
  hpBg.fill({ color: 0x000000, alpha: 0.5 });
  container.addChild(hpBg);

  // HP bar fill
  const hpFill = new Graphics();
  container.addChild(hpFill);

  // Level text
  const lvlText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 8 } });
  lvlText.anchor.set(0.5, 1);
  lvlText.y = -size - 12;
  container.addChild(lvlText);

  // Store refs for updates
  container._body = body;
  container._hpFill = hpFill;
  container._hpBg = hpBg;
  container._lvlText = lvlText;
  container._size = size;
  container._monster = monster;

  return container;
}

function getMonsterSize(archetype) {
  const sizes = {
    fodder: 8, swarm: 6, brute: 14, sentinel: 12,
    volatile: 9, stalker: 10, hexer: 10,
  };
  return sizes[archetype] || 8;
}

function getMonsterColor(archetype) {
  const colors = {
    fodder: 0x3dd497, swarm: 0xf5c542, brute: 0xff5e6c,
    sentinel: 0x5b52ff, volatile: 0xea580c, stalker: 0x8890b8,
    hexer: 0xa78bfa,
  };
  return colors[archetype] || 0x3dd497;
}

/**
 * Creates the local player display object.
 */
function createPlayerDisplay() {
  const container = new Container();
  container.label = 'localPlayer';

  // Body
  const body = new Graphics();
  container.addChild(body);

  // Name
  const nameText = new Text({ text: '', style: NAME_STYLE });
  nameText.anchor.set(0.5, 1);
  nameText.y = -28;
  container.addChild(nameText);

  container._body = body;
  container._nameText = nameText;

  return container;
}

/**
 * Creates an "other player" display object.
 */
function createOtherPlayerDisplay() {
  const container = new Container();

  const body = new Graphics();
  container.addChild(body);

  const nameText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  nameText.anchor.set(0.5, 1);
  nameText.y = -24;
  container.addChild(nameText);

  container._body = body;
  container._nameText = nameText;

  return container;
}

/**
 * Manages all entity rendering.
 */
export class EntityRenderer {
  constructor(entityLayer, playerLayer) {
    this.entityLayer = entityLayer;
    this.playerLayer = playerLayer;
    this.monsterDisplays = new Map(); // id -> Container
    this.otherPlayerDisplays = new Map(); // id -> Container
    this.playerDisplay = null;
    this.npcDisplays = new Map();
  }

  /**
   * Updates all entities for the current frame.
   */
  update(S, now) {
    this._updateMonsters(S, now);
    this._updateOtherPlayers(S, now);
    this._updatePlayer(S, now);
    this._updateNPCs(S, now);
  }

  _updateMonsters(S, now) {
    const monsters = S.monsters || [];
    const activeIds = new Set();

    for (const m of monsters) {
      if (!m.alive && (!m._deathTs || now - m._deathTs > 2000)) continue;
      activeIds.add(m.id);

      let display = this.monsterDisplays.get(m.id);
      if (!display) {
        display = createMonsterDisplay(m);
        this.entityLayer.addChild(display);
        this.monsterDisplays.set(m.id, display);
      }

      // Position
      display.x = m.x;
      display.y = m.y;
      display.visible = m.alive;

      // Redraw body
      const body = display._body;
      const size = display._size;
      body.clear();

      const color = getMonsterColor(m.archetype || m.type);
      body.circle(0, 0, size);
      body.fill({ color });

      // Boss ring
      if (m.isBoss) {
        body.circle(0, 0, size + 3);
        body.stroke({ color: 0xff5e6c, width: 2 });
      }

      // Emoji in center
      if (!display._emoji) {
        const emojiText = new Text({
          text: m.emoji || '🟢',
          style: { fontSize: Math.max(8, size), align: 'center' },
        });
        emojiText.anchor.set(0.5, 0.5);
        display.addChild(emojiText);
        display._emoji = emojiText;
      }

      // HP bar
      const hpPct = Math.max(0, (m.curHp || m.hp) / m.hp);
      const hpFill = display._hpFill;
      hpFill.clear();
      if (hpPct < 1) {
        const hpColor = hpPct > 0.5 ? 0x3dd497 : hpPct > 0.25 ? 0xf5c542 : 0xff5e6c;
        hpFill.rect(-HP_BAR_W / 2, -size - 10, HP_BAR_W * hpPct, HP_BAR_H);
        hpFill.fill({ color: hpColor });
        display._hpBg.visible = true;
      } else {
        display._hpBg.visible = false;
      }

      // Level text
      display._lvlText.text = `Lv${m.level}`;
    }

    // Remove stale displays
    for (const [id, display] of this.monsterDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.monsterDisplays.delete(id);
      }
    }
  }

  _updateOtherPlayers(S, now) {
    const others = S.others || {};
    const activeIds = new Set();

    for (const [id, other] of Object.entries(others)) {
      if (!other || other.z !== S.currentZone) continue;
      activeIds.add(id);

      let display = this.otherPlayerDisplays.get(id);
      if (!display) {
        display = createOtherPlayerDisplay();
        display.label = `other_${id}`;
        this.entityLayer.addChild(display);
        this.otherPlayerDisplays.set(id, display);
      }

      // Lerp position
      const targetX = other.x || 0;
      const targetY = other.y || 0;
      display.x += (targetX - display.x) * 0.3;
      display.y += (targetY - display.y) * 0.3;

      // Body
      const body = display._body;
      body.clear();
      const torso = other.bt || '#2563eb';
      const legs = other.bl || '#1e3a5f';
      const bodyW = 14;
      const bodyH = 22;

      // Legs
      body.rect(-bodyW / 2, 2, bodyW / 2 - 1, bodyH / 2);
      body.fill({ color: cssColorToHex(legs) });
      body.rect(1, 2, bodyW / 2 - 1, bodyH / 2);
      body.fill({ color: cssColorToHex(legs) });

      // Torso
      body.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH / 2 + 4, 3);
      body.fill({ color: cssColorToHex(torso) });

      // Head
      body.circle(0, -bodyH / 2 - 4, 6);
      body.fill({ color: cssColorToHex(other.color || '#5b52ff') });

      // Name
      display._nameText.text = other.name || 'Anon';
    }

    // Remove stale
    for (const [id, display] of this.otherPlayerDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.otherPlayerDisplays.delete(id);
      }
    }
  }

  _updatePlayer(S, now) {
    if (!this.playerDisplay) {
      this.playerDisplay = createPlayerDisplay();
      this.playerLayer.addChild(this.playerDisplay);
    }

    const P = S.player;
    const display = this.playerDisplay;
    display.x = P.x;
    display.y = P.y;

    // Body
    const body = display._body;
    body.clear();

    const torso = S.bodyTorso || '#2563eb';
    const legs = S.bodyLegs || '#1e3a5f';
    const slim = S.bodySize === 'slim';
    const bw = slim ? 12 : 16;
    const bh = slim ? 22 : 24;

    // Legs
    body.rect(-bw / 2, 2, bw / 2 - 1, bh / 2);
    body.fill({ color: cssColorToHex(legs) });
    body.rect(1, 2, bw / 2 - 1, bh / 2);
    body.fill({ color: cssColorToHex(legs) });

    // Torso
    body.roundRect(-bw / 2, -bh / 2, bw, bh / 2 + 4, 3);
    body.fill({ color: cssColorToHex(torso) });

    // Head
    body.circle(0, -bh / 2 - 4, 7);
    body.fill({ color: cssColorToHex(S.myColor || '#5b52ff') });

    // Name
    display._nameText.text = S.myName || 'You';

    // Death state
    display.alpha = S.rpg && S.rpg.hp <= 0 ? 0.4 : 1;
  }

  _updateNPCs(S, now) {
    const npcs = S.npcs || [];
    const activeIds = new Set();

    for (const npc of npcs) {
      if (!npc.alive) continue;
      activeIds.add(npc.id);

      let display = this.npcDisplays.get(npc.id);
      if (!display) {
        display = new Container();
        display.label = `npc_${npc.id}`;

        const body = new Graphics();
        display.addChild(body);
        display._body = body;

        const nameText = new Text({
          text: npc.name,
          style: { ...NAME_STYLE, fontSize: 9, fill: npc.color || '#ffffff' },
        });
        nameText.anchor.set(0.5, 1);
        nameText.y = -28;
        display.addChild(nameText);

        const avatarText = new Text({
          text: npc.avatar || '👤',
          style: { fontSize: 16, align: 'center' },
        });
        avatarText.anchor.set(0.5, 0.5);
        display.addChild(avatarText);
        display._avatar = avatarText;

        this.entityLayer.addChild(display);
        this.npcDisplays.set(npc.id, display);
      }

      display.x = npc.x;
      display.y = npc.y;

      // Body circle
      const body = display._body;
      body.clear();
      body.circle(0, 0, 14);
      body.fill({ color: cssColorToHex(npc.color || '#5b52ff'), alpha: 0.7 });
      body.circle(0, 0, 14);
      body.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    }

    // Remove stale
    for (const [id, display] of this.npcDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.npcDisplays.delete(id);
      }
    }
  }

  clear() {
    for (const [, d] of this.monsterDisplays) d.destroy({ children: true });
    this.monsterDisplays.clear();
    for (const [, d] of this.otherPlayerDisplays) d.destroy({ children: true });
    this.otherPlayerDisplays.clear();
    for (const [, d] of this.npcDisplays) d.destroy({ children: true });
    this.npcDisplays.clear();
    if (this.playerDisplay) {
      this.playerDisplay.destroy({ children: true });
      this.playerDisplay = null;
    }
  }
}

function cssColorToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}
