/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ELEMENTS } from '@/data/elements.js';
import { lookupCollision } from '@/data/gameSystems.js';
import { getFrame, resolveDirection, cycleMs, hasPose } from '../playerSprites.js';
import { getFrame as getSlimeFrame, hasState as hasSlimeState, frameCount as slimeFrameCount } from '../slimeSprites.js';

/* §9.2.1 Collision-opportunity weapon edge glow — proximity radius (≈20u). */
const COLLISION_GLOW_RANGE_PX = 80;

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

  /* Body is STATIC (archetype-driven circle) — draw once at creation and
     never redraw.  Previously the entityRenderer called body.clear() +
     body.circle() + body.fill() every frame for every monster, which
     flushed the GPU batch and dominated frame time with 14 monsters in
     meadow.  Tinting / size live for archetype's lifetime. */
  const body = new Graphics();
  const size = getMonsterSize(monster.archetype);
  body.circle(0, 0, size);
  body.fill({ color: getMonsterColor(monster.archetype || monster.type) });
  if (monster.isBoss) {
    body.circle(0, 0, size + 3);
    body.stroke({ color: 0xff5e6c, width: 2 });
  }
  container.addChild(body);

  /* Sprite-sheet body for fodder slimes.  Only created here for the
     fodder archetype so non-slime monsters skip the extra display
     object entirely.  Sprite is anchored bottom-center (0.5, 1.0) so
     the "feet" line up at the same Y as the procedural circle's
     bottom; that keeps shadows / damage numbers at the right place
     when the sprite is taller than the circle. */
  const isFodder = (monster.archetype || monster.type) === 'fodder';
  const spriteBody = isFodder ? new Sprite() : null;
  if (spriteBody) {
    spriteBody.anchor.set(0.5, 1.0);
    spriteBody.visible = false;
    container.addChild(spriteBody);
  }

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

  /* Single dynamic Graphics for everything that DOES change per frame:
     status icons, aggro alert, stuck arrows, threat arrow, stun pip.
     One clear + redraw per monster instead of three. */
  const dynGfx = new Graphics();
  container.addChild(dynGfx);

  container._body = body;
  container._spriteBody = spriteBody;
  container._isFodder = isFodder;
  container._hpFill = hpFill;
  container._hpBg = hpBg;
  container._lvlText = lvlText;
  container._dynGfx = dynGfx;
  container._size = size;
  container._monster = monster;
  /* Dirty-flag cache values — skip redraws when nothing relevant changed. */
  container._lastHpPct = -1;
  container._lastLvl = -1;
  container._dynKey = '';
  /* Slime animation cache — skip texture reassignment when state +
     frame haven't changed. */
  container._slimeState = null;
  container._slimeFrame = -1;

  return container;
}

function createPlayerDisplay() {
  const container = new Container();
  container.label = 'localPlayer';

  /* Procedural fallback body — drawn until the sprite sheets resolve
     (and as a permanent fallback if they fail to load). */
  const body = new Graphics();
  container.addChild(body);

  /* Sprite-sheet body — Sprite whose texture flips per frame based on
     player facing + animation pose.  Initially has no texture; when
     the sheet loader finishes, _updatePlayer will assign textures and
     hide the procedural body. */
  const spriteBody = new Sprite();
  spriteBody.anchor.set(0.5, 0.5);
  spriteBody.visible = false;
  container.addChild(spriteBody);

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
  container._spriteBody = spriteBody;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._barsGfx = barsGfx;
  container._comboText = comboText;
  container._nameText = nameText;
  /* Animation cache — track last (pose, dir, frameIdx) so we only
     reassign texture when it actually changes. */
  container._animPose = null;
  container._animDir = null;
  container._animFrame = -1;

  return container;
}

function createOtherPlayerDisplay() {
  const container = new Container();

  /* Procedural fallback body — drawn until /sprites/player sheets
     resolve (and as a permanent fallback if they fail to load). */
  const body = new Graphics();
  container.addChild(body);

  /* Sprite-sheet body — same loader / texture cache the local player
     uses, just driven by the other player's velocity + facing. */
  const spriteBody = new Sprite();
  spriteBody.anchor.set(0.5, 0.5);
  spriteBody.visible = false;
  container.addChild(spriteBody);

  const weaponGfx = new Graphics();
  container.addChild(weaponGfx);

  const nameText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  nameText.anchor.set(0.5, 1);
  nameText.y = -24;
  container.addChild(nameText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._weaponGfx = weaponGfx;
  container._nameText = nameText;
  /* Animation cache mirrors the local player display. */
  container._animPose = null;
  container._animDir = null;
  container._animFrame = -1;

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
    const SLIME_DEATH_MS = 100; /* matches Canvas 2D's _dDur — short fast dissolve */

    for (const m of monsters) {
      const arch = m.archetype || m.type;
      const isFodder = arch === 'fodder';

      /* Slime death animation — first observation of alive=false on a
         fodder slime starts the death timer + plays the splat SFX.
         Mirrors the Canvas 2D path in BroTown.jsx ~11397.  Animation
         runs SLIME_DEATH_MS then the display is hidden + cleaned up. */
      if (!m.alive && isFodder && m._slimeDeathStart == null) {
        m._slimeDeathStart = now;
        try {
          if (typeof window !== 'undefined' && window.BT_AUDIO) {
            window.BT_AUDIO.play('slime-death', { vol: 0.425 });
          }
        } catch {}
      }

      /* Dead-monster handling: render the death sprite for fodder
         within the death window; otherwise hide and skip. */
      if (!m.alive) {
        const deathT = m._slimeDeathStart != null ? now - m._slimeDeathStart : null;
        if (isFodder && deathT != null && deathT >= 0 && deathT < SLIME_DEATH_MS && hasSlimeState('death')) {
          activeIds.add(m.id);
          const display = this.monsterDisplays.get(m.id);
          if (display && display._spriteBody) {
            const fc = slimeFrameCount('death');
            const t = deathT / SLIME_DEATH_MS;
            const frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
            const tex = getSlimeFrame('death', frameIdx);
            const sb = display._spriteBody;
            if (tex && (display._slimeState !== 'death' || display._slimeFrame !== frameIdx)) {
              display._slimeState = 'death';
              display._slimeFrame = frameIdx;
              sb.texture = tex;
            }
            sb.scale.x = 50 / 128;
            sb.scale.y = 50 / 128;
            sb.tint = 0xffffff;
            sb.visible = true;
            display.x = m.x;
            display.y = m.y;
            display.visible = true;
            display._body.visible = false;
            /* Clear any leftover dynamic content (aggro arrow, status
               icons) so it doesn't linger on the death frame. */
            if (display._dynGfx) {
              display._dynGfx.clear();
              display._dynKey = '';
            }
          }
        }
        continue;
      }

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

      const size = display._size;

      /* Slime sprite — fodder archetype gets its own animated sheet
         (idle / shoot / hit).  Priority: hit > shoot > idle, mirroring
         the Canvas 2D path in BroTown.jsx ~11635.  Falls back to the
         procedural circle until sheets resolve. */
      if (display._isFodder && display._spriteBody) {
        const spriteBody = display._spriteBody;
        const hittingNow = m._hitAnimEnd && now < m._hitAnimEnd && hasSlimeState('hit');
        const shootingNow = m._shootAnimEnd && now < m._shootAnimEnd && hasSlimeState('shoot');
        const idleAvail = hasSlimeState('idle');
        const state = hittingNow ? 'hit' : shootingNow ? 'shoot' : (idleAvail ? 'idle' : null);
        if (state) {
          let frameIdx;
          const fc = slimeFrameCount(state);
          if (state === 'hit') {
            const dur = Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            const t = (now - m._hitAnimStart) / dur;
            frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
          } else if (state === 'shoot') {
            const dur = Math.max(1, m._shootAnimEnd - m._shootAnimStart);
            const t = (now - m._shootAnimStart) / dur;
            frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
          } else {
            /* Idle loop — per-monster phase offset so a group doesn't
               pulse in lockstep.  120 ms/frame matches Canvas 2D. */
            const phaseOff = ((m.spawnX || 0) | 0) % 600;
            frameIdx = Math.floor((now + phaseOff) / 120) % fc;
          }
          if (display._slimeState !== state || display._slimeFrame !== frameIdx) {
            display._slimeState = state;
            display._slimeFrame = frameIdx;
            const tex = getSlimeFrame(state, frameIdx);
            if (tex) spriteBody.texture = tex;
          }
          /* Hit reaction squash — quick stretch + flatten on top of
             the sheet swap.  Peaks at 40% into the window then eases
             back to neutral, matching Canvas 2D's _hitSquashX/Y. */
          let sqx = 1, sqy = 1;
          if (hittingNow) {
            const hp = (now - m._hitAnimStart) / Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            if (hp < 0.4) { const k = hp / 0.4; sqx = 1 + 0.35 * k; sqy = 1 - 0.30 * k; }
            else { const k = (hp - 0.4) / 0.6; sqx = 1.35 - 0.35 * k; sqy = 0.70 + 0.30 * k; }
          }
          /* Render the sprite at 50 px tall (matches Canvas 2D _dSize),
             anchored bottom-center so feet sit on the ground.  Sprite
             frames are 128 px so base scale = 50/128. */
          const baseScale = 50 / 128;
          spriteBody.scale.x = baseScale * sqx;
          spriteBody.scale.y = baseScale * sqy;
          spriteBody.y = size; /* feet at the circle's bottom edge */
          spriteBody.tint = 0xffffff;
          spriteBody.visible = true;
          body.visible = false;
        } else {
          spriteBody.visible = false;
          body.visible = true;
        }
      }

      // Emoji — once per monster.  Hidden when the slime sprite is
      // rendering so the actual slime art isn't covered by a floating
      // green-circle emoji.
      if (!display._emoji) {
        const emojiText = new Text({
          text: m.emoji || '🟢',
          style: { fontSize: Math.max(8, size), align: 'center' },
        });
        emojiText.anchor.set(0.5, 0.5);
        display.addChild(emojiText);
        display._emoji = emojiText;
      }
      if (display._spriteBody && display._spriteBody.visible) {
        display._emoji.visible = false;
      } else if (!display._emoji.visible) {
        display._emoji.visible = true;
      }

      // HP bar — only redraw when the % changed (>0.01 movement).
      const curHp = m.curHp != null ? m.curHp : m.hp;
      const hpPct = Math.max(0, curHp / m.hp);
      if (Math.abs(hpPct - display._lastHpPct) > 0.01) {
        display._lastHpPct = hpPct;
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
      }

      // Level text — only update when level changes.
      if (m.level !== display._lastLvl) {
        display._lastLvl = m.level;
        display._lvlText.text = `Lv${m.level}`;
      }

      /* Single dynamic Graphics — clear once and redraw all dynamic bits
         (statuses, aggro alert, threat arrow, stun, stuck arrows) here.
         Skip the entire pass when nothing relevant has changed since last
         frame — most monsters most frames have no dynamic content. */
      const statuses = m.statuses || {};
      const statusKeys = Object.keys(statuses);
      const numStatuses = statusKeys.length;
      const aggroFlash = m._aggroTs && now - m._aggroTs < 600;
      const threatArrow = m._aggroed && S.player;
      const stunActive = m._stunUntil && now < m._stunUntil;
      const stuckCount = (m._stuckArrows && m._stuckArrows.length) || 0;
      /* Hash of "did the dynamic state change?" — pulse animations need
         per-frame redraw, so we still rebuild every frame when any of
         {aggro flash, threat arrow, stun, statuses, stuck arrows}
         is active.  When NONE are active, skip entirely. */
      const dynActive = numStatuses > 0 || aggroFlash || threatArrow || stunActive || stuckCount > 0;
      if (dynActive || display._dynKey !== '') {
        const dynGfx = display._dynGfx;
        dynGfx.clear();
        display._dynKey = dynActive ? '1' : '';

        if (numStatuses > 0) {
          let sx = -size;
          for (const statusId of statusKeys) {
            const statusData = statuses[statusId];
            if (!statusData) continue;
            const elemForStatus = Object.values(ELEMENTS || {}).find(e => e?.status === statusId);
            const sColor = elemForStatus ? cssColorToHex(elemForStatus.color) : 0xffffff;
            const ratio = 0.25;
            const winSize = (statusData.maxDur || 0) * ratio;
            let depth = 0;
            if (winSize > 0 && statusData.remaining <= winSize) {
              depth = Math.max(0, Math.min(1, (winSize - statusData.remaining) / winSize));
            }
            const pulseHz = depth > 0 ? (1.5 + depth * 3.5) : 0;
            const pulse = depth > 0 ? (1 + Math.sin(now / 1000 * pulseHz * 2 * Math.PI) * 0.2) : 1;
            const r = 3 * pulse;
            let color = sColor;
            if (depth > 0) {
              const lerp = (a, b, t) => Math.round(a + (b - a) * t);
              const sr = (sColor >> 16) & 0xff;
              const sg = (sColor >> 8) & 0xff;
              const sb = sColor & 0xff;
              color = (lerp(sr, 255, depth * 0.7) << 16) | (lerp(sg, 255, depth * 0.7) << 8) | lerp(sb, 255, depth * 0.7);
            }
            dynGfx.circle(sx, -size - 16, r);
            dynGfx.fill({ color: color, alpha: 0.85 });
            sx += 8;
          }
        }

        if (aggroFlash) {
          const age = (now - m._aggroTs) / 600;
          dynGfx.circle(0, -size - 20, 4);
          dynGfx.fill({ color: 0xff5e6c, alpha: 1 - age });
        }

        if (threatArrow) {
          const tx = S.player.x - m.x;
          const ty = S.player.y - m.y;
          const tlen = Math.sqrt(tx * tx + ty * ty);
          if (tlen > 0.001) {
            const ang = Math.atan2(ty, tx);
            const baseY = -size - 12;
            const cx = Math.cos(ang), cy = Math.sin(ang);
            const tipL = 10, halfW = 3;
            dynGfx.poly([
              cx * tipL,        baseY + cy * tipL,
              -cy * halfW,      baseY + cx * halfW,
              cy * halfW,       baseY - cx * halfW,
            ]);
            dynGfx.fill({ color: 0xD68A3C, alpha: 0.7 });
          }
        }

        if (stunActive) {
          dynGfx.circle(0, -size - 18, 5);
          dynGfx.fill({ color: 0xf5c542, alpha: 0.5 + Math.sin(now / 100) * 0.3 });
        }

        if (stuckCount > 0) {
          for (const sa of m._stuckArrows) {
            if (!sa || !Number.isFinite(sa.ang) || !Number.isFinite(sa.ox) || !Number.isFinite(sa.oy)) continue;
            const ax = Math.cos(sa.ang) * (size * 0.5) + sa.ox;
            const ay = Math.sin(sa.ang) * (size * 0.5) + sa.oy;
            dynGfx.moveTo(ax - Math.cos(sa.ang) * 5, ay - Math.sin(sa.ang) * 5);
            dynGfx.lineTo(ax + Math.cos(sa.ang) * 5, ay + Math.sin(sa.ang) * 5);
            dynGfx.stroke({ color: cssColorToHex(sa.color || '#8B6914'), width: 1.5, alpha: 0.8 });
          }
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
      const torso = other.bt || '#2563eb';
      const legs = other.bl || '#1e3a5f';
      const head = other.color || '#5b52ff';
      const bodyW = 14;
      const bodyH = 22;
      const isMoving = Math.abs(other._smoothVx || 0) > 0.01 || Math.abs(other._smoothVy || 0) > 0.01;
      const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;

      /* Sprite-sheet body — same as local player.  Other players
         broadcast their facing in `other._facing` (4-cardinal, same
         as S._facing), but when moving we derive an 8-compass
         direction from their interpolated velocity for diagonal
         frames. */
      let facing;
      if (isMoving) {
        const ang = Math.atan2(other._smoothVy || 0, other._smoothVx || 0);
        const sector = Math.round(ang / (Math.PI / 4));
        facing = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][((sector % 8) + 8) % 8];
      } else {
        facing = other._facing || 'south';
      }
      const isHit = other._hitFlash && (now - other._hitFlash) < 250;
      const pose = isHit ? 'hit' : (isMoving ? 'jog' : 'stand');
      const spritesAvailable = hasPose(pose) || hasPose('stand');
      let useSprite = false;
      if (spritesAvailable) {
        const spriteBody = display._spriteBody;
        const { dir, mirror } = resolveDirection(facing);
        let frameIdx = 0;
        if (pose === 'jog') {
          frameIdx = Math.floor((now / cycleMs('jog', dir)) * 24) % 24;
        } else if (pose === 'hit') {
          const hitT = (now - (other._hitFlash || 0)) / 250;
          frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
        }
        let tex = getFrame(pose, dir, frameIdx);
        if (!tex) tex = getFrame('stand', dir, 0);
        if (tex) {
          if (display._animPose !== pose || display._animDir !== dir || display._animFrame !== frameIdx) {
            display._animPose = pose;
            display._animDir = dir;
            display._animFrame = frameIdx;
            spriteBody.texture = tex;
          }
          /* Same east-direction size compensation as the local player —
             keeps every player rendered at the same visual scale. */
          const sizeMul = (dir === 'east') ? (pose === 'hit' ? 0.88 : 1.10) : 1.0;
          spriteBody.scale.x = (mirror ? -1 : 1) * sizeMul;
          spriteBody.scale.y = sizeMul;
          spriteBody.tint = 0xffffff;
          spriteBody.visible = true;
          body.visible = false;
          if (display._procDrawn) {
            body.clear();
            display._procDrawn = false;
          }
          useSprite = true;
        } else {
          spriteBody.visible = false;
          body.visible = true;
        }
      } else {
        display._spriteBody.visible = false;
        body.visible = true;
      }

      /* Procedural fallback body — only drawn when sprite path is
         unavailable.  Skip rebuild when idle and no color/torso
         changes. */
      if (!useSprite) {
        const colorKey = torso + '|' + legs + '|' + head;
        if (isMoving || display._lastColorKey !== colorKey || display._lastIsMoving !== isMoving) {
          display._lastColorKey = colorKey;
          display._lastIsMoving = isMoving;
          display._procDrawn = true;
          body.clear();
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
          body.fill({ color: cssColorToHex(head) });
        }
      }

      const nextName = other.name || 'Anon';
      if (display._lastName !== nextName) {
        display._lastName = nextName;
        display._nameText.text = nextName;
      }
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
    if (!this.playerDisplay || this.playerDisplay.destroyed) {
      this.playerDisplay = createPlayerDisplay();
      this.playerLayer.addChild(this.playerDisplay);
    } else if (this.playerDisplay.parent !== this.playerLayer) {
      /* Defensive re-attach.  Something on zone change was detaching
         the playerDisplay from the player layer (or removing it from
         the scene graph altogether) and the user reported the avatar
         going invisible in other zones.  This re-parents it every
         frame if it's missing.  Cheap when already attached (no-op). */
      this.playerLayer.addChild(this.playerDisplay);
    }

    const P = S.player;
    const display = this.playerDisplay;
    /* Force visibility every frame — same defensive concern as the
       parent re-attach above. */
    display.visible = true;
    display.x = P.x;
    display.y = P.y;

    const body = display._body;

    const torso = S.bodyTorso || '#2563eb';
    const legs = S.bodyLegs || '#1e3a5f';
    const head = S.myColor || '#5b52ff';
    const slim = S.bodySize === 'slim';
    const bw = slim ? 12 : 16;
    const bh = slim ? 22 : 24;
    const isMoving = Math.abs(P.vx || 0) > 0.01 || Math.abs(P.vy || 0) > 0.01;
    const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;

    /* Sprite-sheet body — preferred when sheets have loaded.  Picks
       (pose, dir, frameIdx) from facing + movement.
       When moving, derive an 8-compass facing from velocity (vx, vy)
       so we get the diagonal sheets (northeast / northwest / etc)
       instead of being stuck on whichever cardinal S._facing was set
       to last.  When idle, fall back to S._facing (4-cardinal from
       the input layer). */
    let facing;
    if (isMoving) {
      const vx = P.vx || 0;
      const vy = P.vy || 0;
      /* atan2 returns radians in (-PI, PI]; +x is east, +y is south
         (screen-down).  Bin into 8 sectors of 45° starting at east. */
      const ang = Math.atan2(vy, vx);
      const sector = Math.round(ang / (Math.PI / 4));
      facing = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][((sector % 8) + 8) % 8];
    } else {
      facing = S._facing || 'south';
    }
    const isHit = S._hitFlash && (now - S._hitFlash) < 250;
    const pose = isHit ? 'hit' : (isMoving ? 'jog' : 'stand');
    const spritesAvailable = hasPose(pose) || hasPose('stand');
    if (spritesAvailable) {
      const spriteBody = display._spriteBody;
      const { dir, mirror } = resolveDirection(facing);
      let frameIdx = 0;
      if (pose === 'jog') {
        frameIdx = Math.floor((now / cycleMs('jog', dir)) * 24) % 24;
      } else if (pose === 'hit') {
        const hitT = (now - (S._hitFlash || 0)) / 250;
        frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
      }
      let tex = getFrame(pose, dir, frameIdx);
      if (!tex) tex = getFrame('stand', dir, 0);
      if (tex) {
        if (display._animPose !== pose || display._animDir !== dir || display._animFrame !== frameIdx) {
          display._animPose = pose;
          display._animDir = dir;
          display._animFrame = frameIdx;
          spriteBody.texture = tex;
        }
        /* Per-direction scale multiplier — east source video framed
           the character smaller than the other directions, so the
           sprite needs an upscale to read at the same apparent size.
           Canvas 2D landed on 1.06×; in the Pixi path 1.06 was still
           noticeably smaller, so bumped to 1.15× (between Canvas's
           1.06 and the original 1.18 the user once flagged as too
           large).  Hit-pose east is the opposite — source frames
           the character bigger — keep the 0.88× shrink.
           Applies to BOTH east and the mirrored W/NW/SE since they
           share the east sheet. */
        const sizeMul = (dir === 'east') ? (pose === 'hit' ? 0.88 : 1.10) : 1.0;
        spriteBody.scale.x = (mirror ? -1 : 1) * sizeMul;
        spriteBody.scale.y = sizeMul;
        /* No tint multiply — the sprites are pre-colored.  Multiplying
           by S.bodyTorso (default #2563eb) was darkening the avatar
           because Pixi's tint is a per-channel multiply against white.
           If body-color customisation comes back later it'll need a
           filter or per-pixel recolor pass, not raw tint. */
        spriteBody.tint = 0xffffff;
        spriteBody.visible = true;
        body.visible = false;
        if (display._procDrawn) {
          /* Free the procedural Graphics paths once the sprite path
             takes over — prevents the old shapes from sitting in the
             scene graph indefinitely. */
          body.clear();
          display._procDrawn = false;
        }
      } else {
        spriteBody.visible = false;
        body.visible = true;
      }
    } else {
      display._spriteBody.visible = false;
      body.visible = true;
    }

    /* Procedural fallback body — only drawn when sprite path is
       unavailable.  Skip rebuild when idle and no color change. */
    if (body.visible) {
      const colorKey = torso + '|' + legs + '|' + head + '|' + bw + '|' + bh;
      if (isMoving || display._lastColorKey !== colorKey || display._lastIsMoving !== isMoving) {
        display._lastColorKey = colorKey;
        display._lastIsMoving = isMoving;
        display._procDrawn = true;
        body.clear();
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
        body.fill({ color: cssColorToHex(head) });
      }
    }

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

        // §9.2.1 Collision-opportunity weapon edge glow.
        // Scan monsters within COLLISION_GLOW_RANGE_PX; pick the most-urgent
        // (lowest remaining duration) status the player's swipe element would
        // collide against. Render an outer halo in the setup element's colour
        // with intensity 0.15 → 0.6 as the status nears expiry.
        if (elem && S.monsters && S.player) {
          const px = S.player.x, py = S.player.y;
          let bestRatio = Infinity;          // lower = more urgent
          let bestSetupColor = null;
          let bestSetupKey = null;
          const range2 = COLLISION_GLOW_RANGE_PX * COLLISION_GLOW_RANGE_PX;
          for (let mi = 0; mi < S.monsters.length; mi++) {
            const mm = S.monsters[mi];
            if (!mm || !mm.alive || !mm.statuses) continue;
            const ddx = mm.x - px, ddy = mm.y - py;
            if (ddx * ddx + ddy * ddy > range2) continue;
            for (const sid in mm.statuses) {
              const sd = mm.statuses[sid];
              if (!sd || !sd.element || sd.element === elem) continue;
              if (!lookupCollision(sd.element, elem)) continue;
              const r = (sd.maxDur > 0) ? (sd.remaining / sd.maxDur) : 1;
              if (r < bestRatio) {
                bestRatio = r;
                bestSetupColor = (ELEMENTS[sd.element] || {}).color || '#ffffff';
                bestSetupKey = sd.element;
              }
            }
          }
          if (bestSetupColor && bestRatio < Infinity) {
            // 0.15 base → 0.60 at expiry. ratio=1 (just applied) → 0.15;
            // ratio=0 (expiring) → 0.60.
            const oppAlpha = 0.15 + (1 - Math.max(0, Math.min(1, bestRatio))) * 0.45;
            const oppColor = cssColorToHex(bestSetupColor);
            if (wpn.type === 'bow') {
              weaponGlowGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
              weaponGlowGfx.stroke({ color: oppColor, width: 6, alpha: oppAlpha });
            } else if (wpn.type === 'staff') {
              weaponGlowGfx.circle(wpnX, wpnY - 12, 5);
              weaponGlowGfx.stroke({ color: oppColor, width: 2, alpha: oppAlpha });
            } else {
              const len = wpn.type === 'greatsword' ? 14 : 10;
              weaponGlowGfx.moveTo(wpnX, wpnY + 2);
              weaponGlowGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
              weaponGlowGfx.stroke({ color: oppColor, width: (wpn.type === 'greatsword' ? 6 : 5), alpha: oppAlpha });
            }
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

    // §5.9.5 Combo Chain count + §5.7.7 Resonance streak — combined badge.
    const comboText = display._comboText;
    const combo = S.combo;
    const rs = S.player && S.player._resonanceStreak;
    const rsActive = rs && rs.count > 0 && (now - (rs.lastTs || 0) < 10000);
    if ((combo && combo.count > 0) || rsActive) {
      const c = (combo && combo.count) || 0;
      const cStr = c > 0 ? 'x' + c : '';
      const rStr = rsActive ? '↯' + rs.count : '';
      comboText.text = cStr + (cStr && rStr ? ' ' : '') + rStr;
      comboText.style.fill = c >= 3 ? '#f5c542' : c === 2 ? '#f2b441' : (rsActive ? '#a0c8ff' : '#ffffff');
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

      /* NPC body is static (color + optional quest marker); only redraw
         when the quest flag flips.  NPCs don't move and their color
         doesn't change. */
      const body = display._body;
      const hasQuest = !!npc._hasQuest;
      if (display._lastQuest !== hasQuest || display._lastColor !== npc.color) {
        display._lastQuest = hasQuest;
        display._lastColor = npc.color;
        body.clear();
        body.circle(0, 0, 14);
        body.fill({ color: cssColorToHex(npc.color || '#5b52ff'), alpha: 0.7 });
        body.circle(0, 0, 14);
        body.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
        if (hasQuest) {
          body.circle(0, -22, 5);
          body.fill({ color: 0xf5c542 });
        }
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
    /* Called on zone change AND on full renderer destroy.  Preserve the
       playerDisplay (and petDisplay) across zones — the local player is
       the one entity that persists.  Destroying + recreating it caused
       the sprite to render invisibly in some zones (probably a frame
       race between layer reattachment and the next _updatePlayer pass).
       app.destroy({children:true}) handles full cleanup at shutdown. */
    for (const [, d] of this.monsterDisplays) d.destroy({ children: true });
    this.monsterDisplays.clear();
    for (const [, d] of this.otherPlayerDisplays) d.destroy({ children: true });
    this.otherPlayerDisplays.clear();
    for (const [, d] of this.npcDisplays) d.destroy({ children: true });
    this.npcDisplays.clear();
    /* playerDisplay + petDisplay intentionally NOT destroyed here. */
  }
}
