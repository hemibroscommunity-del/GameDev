/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ELEMENTS } from '@/data/elements.js';

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

function cssColorToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}

function createMonsterDisplay(monster) {
  const container = new Container();
  container.label = `monster_${monster.id}`;

  const body = new Graphics();
  const size = getMonsterSize(monster.archetype);
  container.addChild(body);

  const hpBg = new Graphics();
  hpBg.rect(-HP_BAR_W / 2, -size - 10, HP_BAR_W, HP_BAR_H);
  hpBg.fill({ color: 0x000000, alpha: 0.5 });
  container.addChild(hpBg);

  const hpFill = new Graphics();
  container.addChild(hpFill);

  const lvlText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 8 } });
  lvlText.anchor.set(0.5, 1);
  lvlText.y = -size - 12;
  container.addChild(lvlText);

  // Status effect indicator
  const statusGfx = new Graphics();
  container.addChild(statusGfx);

  container._body = body;
  container._hpFill = hpFill;
  container._hpBg = hpBg;
  container._lvlText = lvlText;
  container._statusGfx = statusGfx;
  container._size = size;
  container._monster = monster;

  return container;
}

function createPlayerDisplay() {
  const container = new Container();
  container.label = 'localPlayer';

  const body = new Graphics();
  container.addChild(body);

  // §5.9.5 Combo Chain weapon-glow underlay — drawn behind weaponGfx so the
  // weapon silhouette sits on top of the element-color halo.
  const weaponGlowGfx = new Graphics();
  container.addChild(weaponGlowGfx);

  // Weapon visual
  const weaponGfx = new Graphics();
  container.addChild(weaponGfx);

  // HP / Energy / Mana bars — drawn above the head when in a combat zone.
  const barsGfx = new Graphics();
  container.addChild(barsGfx);

  // §5.9.5 Combo Chain count badge — sits above the bars.
  const comboText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 10 } });
  comboText.anchor.set(0.5, 1);
  container.addChild(comboText);

  const nameText = new Text({ text: '', style: NAME_STYLE });
  nameText.anchor.set(0.5, 1);
  nameText.y = -28;
  container.addChild(nameText);

  container._body = body;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._barsGfx = barsGfx;
  container._comboText = comboText;
  container._nameText = nameText;

  return container;
}

function createOtherPlayerDisplay() {
  const container = new Container();

  const body = new Graphics();
  container.addChild(body);

  const weaponGfx = new Graphics();
  container.addChild(weaponGfx);

  const nameText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  nameText.anchor.set(0.5, 1);
  nameText.y = -24;
  container.addChild(nameText);

  container._body = body;
  container._weaponGfx = weaponGfx;
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
    this.monsterDisplays = new Map();
    this.otherPlayerDisplays = new Map();
    this.playerDisplay = null;
    this.npcDisplays = new Map();
    this.petDisplay = null;
  }

  update(S, now) {
    this._updateMonsters(S, now);
    this._updateOtherPlayers(S, now);
    this._updatePlayer(S, now);
    this._updateNPCs(S, now);
    this._updatePet(S, now);
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

      display.x = m.x;
      display.y = m.y;
      display.visible = m.alive;

      // Redraw body
      const body = display._body;
      const size = display._size;
      body.clear();

      // Zone element tint blended with archetype color
      let color = getMonsterColor(m.archetype || m.type);
      body.circle(0, 0, size);
      body.fill({ color });

      if (m.isBoss) {
        body.circle(0, 0, size + 3);
        body.stroke({ color: 0xff5e6c, width: 2 });
      }

      // Emoji
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

      display._lvlText.text = `Lv${m.level}`;

      // Status effects
      const statusGfx = display._statusGfx;
      statusGfx.clear();
      const statuses = m.statuses || {};
      let sx = -size;
      for (const [statusId, statusData] of Object.entries(statuses)) {
        if (!statusData) continue;
        const elemForStatus = Object.values(ELEMENTS || {}).find(e => e?.status === statusId);
        const sColor = elemForStatus ? cssColorToHex(elemForStatus.color) : 0xffffff;
        statusGfx.circle(sx, -size - 16, 3);
        statusGfx.fill({ color: sColor, alpha: 0.8 });
        sx += 8;
      }

      // Aggro alert
      if (m._aggroTs && now - m._aggroTs < 600) {
        const age = (now - m._aggroTs) / 600;
        body.circle(0, -size - 20, 4);
        body.fill({ color: 0xff5e6c, alpha: 1 - age });
      }

      // Stun indicator
      if (m._stunUntil && now < m._stunUntil) {
        body.circle(0, -size - 18, 5);
        body.fill({ color: 0xf5c542, alpha: 0.5 + Math.sin(now / 100) * 0.3 });
      }

      // Stuck arrows
      if (m._stuckArrows) {
        for (const sa of m._stuckArrows) {
          const ax = Math.cos(sa.ang) * (size * 0.5) + sa.ox;
          const ay = Math.sin(sa.ang) * (size * 0.5) + sa.oy;
          body.moveTo(ax - Math.cos(sa.ang) * 5, ay - Math.sin(sa.ang) * 5);
          body.lineTo(ax + Math.cos(sa.ang) * 5, ay + Math.sin(sa.ang) * 5);
          body.stroke({ color: cssColorToHex(sa.color || '#8B6914'), width: 1.5, alpha: 0.8 });
        }
      }
    }

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
      if (!other || (other.zone || other.z || 'town') !== S.currentZone) continue;
      activeIds.add(id);

      let display = this.otherPlayerDisplays.get(id);
      if (!display) {
        display = createOtherPlayerDisplay();
        display.label = `other_${id}`;
        this.entityLayer.addChild(display);
        this.otherPlayerDisplays.set(id, display);
      }

      // Use pre-computed interpolated position
      display.x = other.renderX || other.x || 0;
      display.y = other.renderY || other.y || 0;

      const body = display._body;
      body.clear();
      const torso = other.bt || '#2563eb';
      const legs = other.bl || '#1e3a5f';
      const bodyW = 14;
      const bodyH = 22;
      const isMoving = Math.abs(other._smoothVx || 0) > 0.01 || Math.abs(other._smoothVy || 0) > 0.01;
      const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;

      // Shadow
      body.ellipse(0, 20, 9, 3.5);
      body.fill({ color: 0x000000, alpha: 0.15 });

      // Legs with walk animation
      const legSwing = isMoving ? Math.sin(now / 80) * 3 : 0;
      body.rect(-bodyW / 2, 2 + bobY + legSwing, bodyW / 2 - 1, bodyH / 2);
      body.fill({ color: cssColorToHex(legs) });
      body.rect(1, 2 + bobY - legSwing, bodyW / 2 - 1, bodyH / 2);
      body.fill({ color: cssColorToHex(legs) });

      // Torso
      body.roundRect(-bodyW / 2, -bodyH / 2 + bobY, bodyW, bodyH / 2 + 4, 3);
      body.fill({ color: cssColorToHex(torso) });

      // Head
      body.circle(0, -bodyH / 2 - 4 + bobY, 6);
      body.fill({ color: cssColorToHex(other.color || '#5b52ff') });

      display._nameText.text = other.name || 'Anon';
      display._nameText.y = -24 + bobY;
    }

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

    const body = display._body;
    body.clear();

    const torso = S.bodyTorso || '#2563eb';
    const legs = S.bodyLegs || '#1e3a5f';
    const slim = S.bodySize === 'slim';
    const bw = slim ? 12 : 16;
    const bh = slim ? 22 : 24;
    const isMoving = Math.abs(P.vx || 0) > 0.01 || Math.abs(P.vy || 0) > 0.01;
    const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;

    // Shadow
    body.ellipse(0, 20, 10, 4);
    body.fill({ color: 0x000000, alpha: 0.15 });

    // Legs with walk animation
    const legSwing = isMoving ? Math.sin(now / 80) * 3 : 0;
    body.rect(-bw / 2, 2 + bobY + legSwing, bw / 2 - 1, bh / 2);
    body.fill({ color: cssColorToHex(legs) });
    body.rect(1, 2 + bobY - legSwing, bw / 2 - 1, bh / 2);
    body.fill({ color: cssColorToHex(legs) });

    // Torso
    body.roundRect(-bw / 2, -bh / 2 + bobY, bw, bh / 2 + 4, 3);
    body.fill({ color: cssColorToHex(torso) });

    // Head
    body.circle(0, -bh / 2 - 4 + bobY, 7);
    body.fill({ color: cssColorToHex(S.myColor || '#5b52ff') });

    // Weapon visual
    const weaponGfx = display._weaponGfx;
    const weaponGlowGfx = display._weaponGlowGfx;
    weaponGfx.clear();
    weaponGlowGfx.clear();
    if (S.rpg) {
      const facing = S._facing || 'down';
      const facingX = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
      const facingY = facing === 'down' ? 1 : facing === 'up' ? -1 : 0;
      const wpnX = facingX * 10 || (facing === 'down' ? 6 : -6);
      const wpnY = facingY * 5 + bobY;

      const activeSlot = S.rpg.activeSlot || 'melee';
      const wpn = activeSlot === 'melee' ? S.rpg.weapon : S.rpg.rangedWeapon;
      if (wpn) {
        const elem = wpn.element1;
        const wpnColor = elem && ELEMENTS[elem] ? cssColorToHex(ELEMENTS[elem].color) : 0xaaaaaa;

        // §5.9.5 Combo glow tier — None/Faint/Medium/Bright by combo count.
        // Bright tier adds a subtle pulse. Glow only renders when an element
        // is present on the weapon (no element = no element-color halo).
        const comboTier = (S.combo && S.combo.count) || 0;
        if (comboTier > 0 && elem) {
          const pulse = comboTier >= 3 ? 0.85 + Math.sin(now / 220) * 0.15 : 1;
          const glowAlpha = (comboTier === 1 ? 0.22 : comboTier === 2 ? 0.45 : 0.65) * pulse;
          const glowExtra = 2 + comboTier * 1.5;

          if (wpn.type === 'bow') {
            weaponGlowGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
            weaponGlowGfx.stroke({ color: wpnColor, width: 2 + glowExtra, alpha: glowAlpha });
          } else if (wpn.type === 'staff') {
            // Glow orb expands slightly with tier; halo around the staff tip.
            weaponGlowGfx.circle(wpnX, wpnY - 12, 3 + comboTier * 1.2);
            weaponGlowGfx.fill({ color: wpnColor, alpha: glowAlpha });
            weaponGlowGfx.moveTo(wpnX, wpnY + 10);
            weaponGlowGfx.lineTo(wpnX, wpnY - 10);
            weaponGlowGfx.stroke({ color: wpnColor, width: 2 + glowExtra, alpha: glowAlpha * 0.6 });
          } else {
            const len = wpn.type === 'greatsword' ? 14 : 10;
            weaponGlowGfx.moveTo(wpnX, wpnY + 2);
            weaponGlowGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
            const baseW = wpn.type === 'greatsword' ? 3 : 2;
            weaponGlowGfx.stroke({ color: wpnColor, width: baseW + glowExtra, alpha: glowAlpha });
          }
        }

        if (wpn.type === 'bow') {
          // Bow arc
          weaponGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
          weaponGfx.stroke({ color: 0x8B6914, width: 2 });
          // String
          weaponGfx.moveTo(wpnX + Math.cos(-0.8) * 8, wpnY + Math.sin(-0.8) * 8);
          weaponGfx.lineTo(wpnX + Math.cos(0.8) * 8, wpnY + Math.sin(0.8) * 8);
          weaponGfx.stroke({ color: 0xaaaaaa, width: 1, alpha: 0.6 });
        } else if (wpn.type === 'staff') {
          // Staff line with orb
          weaponGfx.moveTo(wpnX, wpnY + 10);
          weaponGfx.lineTo(wpnX, wpnY - 10);
          weaponGfx.stroke({ color: 0x8B6914, width: 2 });
          weaponGfx.circle(wpnX, wpnY - 12, 3);
          weaponGfx.fill({ color: wpnColor, alpha: 0.8 });
        } else {
          // Sword/greatsword
          const len = wpn.type === 'greatsword' ? 14 : 10;
          weaponGfx.moveTo(wpnX, wpnY + 2);
          weaponGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
          weaponGfx.stroke({ color: 0xcccccc, width: wpn.type === 'greatsword' ? 3 : 2 });
          // Element glow at tip
          if (elem) {
            weaponGfx.circle(wpnX + (facingX * len || len * 0.7), wpnY - len * 0.3, 2);
            weaponGfx.fill({ color: wpnColor, alpha: 0.6 });
          }
        }
      }

      // Shield visual
      if (S.rpg.shield && S.isBlocking) {
        const shieldX = -facingX * 8 || 8;
        weaponGfx.roundRect(shieldX - 5, -4 + bobY, 10, 14, 2);
        weaponGfx.fill({ color: 0x3498db, alpha: 0.6 });
        weaponGfx.roundRect(shieldX - 5, -4 + bobY, 10, 14, 2);
        weaponGfx.stroke({ color: 0x5dade2, width: 1 });
      }
    }

    // Swing animation
    if (S.isSwinging && S.swingTimer) {
      const swAge = (now - S.swingTimer) / 400;
      if (swAge < 1) {
        const swArc = (1 - swAge) * Math.PI * 1.5;
        const swDir = S._facingAngle || 0;
        const swR = 20;
        weaponGfx.arc(0, bobY, swR, swDir - swArc / 2, swDir + swArc / 2);
        weaponGfx.stroke({ color: 0xffffff, width: 2, alpha: (1 - swAge) * 0.5 });
      }
    }

    // HP / Energy / Mana bars — only outside town. Stacked above the head.
    const barsGfx = display._barsGfx;
    barsGfx.clear();
    const inCombatZone = S.currentZone && S.currentZone !== 'town';
    if (inCombatZone && S.rpg) {
      const R = S.rpg;
      const barW = 24;
      const barH = 2;
      const barX = -barW / 2;
      const gap = 1;
      const baseY = -bh / 2 - 16 + bobY;
      const drawBar = (yOffset, pct, fillColor) => {
        const y = baseY + yOffset;
        barsGfx.rect(barX, y, barW, barH);
        barsGfx.fill({ color: 0x000000, alpha: 0.55 });
        if (pct > 0) {
          barsGfx.rect(barX, y, barW * Math.min(1, pct), barH);
          barsGfx.fill({ color: fillColor, alpha: 0.95 });
        }
        barsGfx.rect(barX, y, barW, barH);
        barsGfx.stroke({ color: 0xffffff, width: 0.5, alpha: 0.25 });
      };
      const hpPct = (R.hp || 0) / (R.maxHp || 1);
      const hpColor = hpPct > 0.5 ? 0x3dd497 : hpPct > 0.25 ? 0xf5c542 : 0xff5e6c;
      drawBar(0, hpPct, hpColor);
      const stPct = (R.stamina || 0) / (R.maxStamina || 100);
      drawBar(barH + gap, stPct, 0xf2b441);
      const mnPct = (R.mana || 0) / (R.maxMana || 1);
      drawBar((barH + gap) * 2, mnPct, 0x5b9bd5);
      // Push the name up so the bars don't overlap it.
      display._nameText.y = baseY - 4;
    } else {
      display._nameText.y = -28 + bobY;
    }

    // §5.9.5 Combo Chain count — small badge above the bars.
    const comboText = display._comboText;
    const combo = S.combo;
    if (combo && combo.count > 0) {
      const c = combo.count;
      const col = c >= 3 ? '#f5c542' : c === 2 ? '#f2b441' : '#ffffff';
      comboText.text = 'x' + c;
      comboText.style.fill = col;
      comboText.alpha = 1;
      comboText.y = display._nameText.y - 12;
    } else {
      comboText.alpha = 0;
    }

    // Name
    display._nameText.text = S.myName || 'You';

    // Death / invuln
    if (S.rpg && S.rpg.hp <= 0) {
      display.alpha = 0.4;
    } else if (S._respawnInvuln && now < S._respawnInvuln) {
      display.alpha = 0.6 + Math.sin(now / 100) * 0.2;
    } else {
      display.alpha = 1;
    }

    // Stun
    if (S._stunUntil && now < S._stunUntil) {
      body.circle(0, -bh / 2 - 14 + bobY, 6);
      body.fill({ color: 0x000000, alpha: 0.5 });
    }
  }

  _updatePet(S, now) {
    const pet = S._activePet;
    if (!pet) {
      if (this.petDisplay) { this.petDisplay.visible = false; }
      return;
    }

    if (!this.petDisplay) {
      this.petDisplay = new Container();
      this.petDisplay.label = 'pet';
      const petBody = new Graphics();
      this.petDisplay.addChild(petBody);
      this.petDisplay._body = petBody;
      const petName = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 7 } });
      petName.anchor.set(0.5, 1);
      petName.y = -12;
      this.petDisplay.addChild(petName);
      this.petDisplay._nameText = petName;
      this.entityLayer.addChild(this.petDisplay);
    }

    this.petDisplay.visible = true;
    this.petDisplay.x = pet.x || S.player.x + 20;
    this.petDisplay.y = pet.y || S.player.y + 15;

    const petBody = this.petDisplay._body;
    petBody.clear();
    const bounce = Math.sin(now / 300) * 2;
    petBody.circle(0, bounce, 6);
    petBody.fill({ color: cssColorToHex(pet.color || '#f5c542') });
    petBody.circle(0, bounce, 6);
    petBody.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

    this.petDisplay._nameText.text = pet.name || '🐾';
    this.petDisplay._nameText.y = -10 + bounce;
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

      const body = display._body;
      body.clear();
      body.circle(0, 0, 14);
      body.fill({ color: cssColorToHex(npc.color || '#5b52ff'), alpha: 0.7 });
      body.circle(0, 0, 14);
      body.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

      // Quest marker
      if (npc._hasQuest) {
        body.circle(0, -22, 5);
        body.fill({ color: 0xf5c542 });
      }
    }

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
    if (this.petDisplay) {
      this.petDisplay.destroy({ children: true });
      this.petDisplay = null;
    }
  }
}
