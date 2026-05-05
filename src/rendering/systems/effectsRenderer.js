/**
 * Effects Renderer — particles, damage numbers, screen flashes, atmosphere,
 * projectiles, telegraphs, lock-on, ambient particles, chat bubbles, building signs.
 * Uses PixiJS Graphics for procedural particles and Text for damage numbers.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ELEMENTS } from '@/data/elements.js';
import { ZONES } from '@/data/zones.js';

const DMG_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 14,
  fontWeight: '800',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 3 },
  align: 'center',
});

const LABEL_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 11,
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

function cssToHex(css) {
  if (typeof css !== 'string') return 0xffffff;
  const clean = css.replace('#', '');
  if (clean.length === 6) return parseInt(clean, 16) || 0xffffff;
  return 0xffffff;
}

/**
 * Manages all visual effects.
 */
export class EffectsRenderer {
  constructor(layers) {
    this.particleLayer = layers.particles;
    this.dmgLayer = layers.damageNumbers;
    this.atmosphereLayer = layers.atmosphere;
    this.screenFXLayer = layers.screenFX;
    this.lootLayer = layers.groundLoot;
    this.splatLayer = layers.groundSplatter;
    this.nodeLayer = layers.gatherNodes;
    this.projectileLayer = layers.projectiles;
    this.telegraphLayer = layers.telegraphs;
    this.overlayLayer = layers.overlayWorld;
    this.hudLayer = layers.hud;

    // Pooled graphics
    this.particleGfx = new Graphics();
    this.particleLayer.addChild(this.particleGfx);

    this.projectileGfx = new Graphics();
    this.projectileLayer.addChild(this.projectileGfx);

    this.telegraphGfx = new Graphics();
    this.telegraphLayer.addChild(this.telegraphGfx);

    this.overlayGfx = new Graphics();
    this.overlayLayer.addChild(this.overlayGfx);

    this.hudGfx = new Graphics();
    this.hudLayer.addChild(this.hudGfx);

    // Active damage number texts
    this.dmgTexts = [];
    this.maxDmgTexts = 50;

    // Chat bubble texts
    this.chatTexts = new Map();

    // Screen flash overlay
    this.flashOverlay = new Graphics();
    this.screenFXLayer.addChild(this.flashOverlay);

    // Atmosphere overlay
    this.atmosphereGfx = new Graphics();
    this.atmosphereLayer.addChild(this.atmosphereGfx);

    // Loot graphics
    this.lootGfx = new Graphics();
    this.lootLayer.addChild(this.lootGfx);

    // Splatter graphics
    this.splatGfx = new Graphics();
    this.splatLayer.addChild(this.splatGfx);

    // Node graphics
    this.nodeGfx = new Graphics();
    this.nodeLayer.addChild(this.nodeGfx);
  }

  /**
   * Updates all effects for the current frame.
   */
  update(S, viewW, viewH, now) {
    this._updateParticles(S, now);
    this._updateDamageNumbers(S, now);
    this._updateScreenFlash(S, viewW, viewH, now);
    this._updateAtmosphere(S, viewW, viewH, now);
    this._updateGroundLoot(S, now);
    this._updateGroundSplatter(S);
    this._updateGatherNodes(S, now);
    this._updateProjectiles(S, now);
    this._updateTelegraphs(S, now);
    this._updateOverlays(S, now);
    this._updateHUD(S, viewW, viewH, now);
  }

  /* ── Particles ── */
  _updateParticles(S, now) {
    const gfx = this.particleGfx;
    gfx.clear();

    // Hit particles
    const parts = S.hitParticles || [];
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (isNaN(p.x) || isNaN(p.y)) { parts.splice(i, 1); continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.04;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      gfx.circle(p.x, p.y, (p.size || 2) * Math.min(1, p.life * 3));
      gfx.fill({ color: cssToHex(p.color), alpha: Math.min(1, p.life * 2) });
    }

    // Death explosion particles
    const explosions = S.deathExplosions || [];
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      const age = (now - exp.ts) / 1000;
      if (age > 2) { explosions.splice(i, 1); continue; }
      const expParts = exp.particles || [];
      for (const p of expParts) {
        if (isNaN(p.vx) || isNaN(p.vy)) continue;
        const px = exp.x + p.vx * age * 60;
        const py = exp.y + p.vy * age * 60 + age * age * 30;
        const pAlpha = Math.max(0, 1 - age / (p.life || 1));
        if (pAlpha <= 0) continue;
        gfx.circle(px, py, (p.size || 2) * pAlpha);
        gfx.fill({ color: cssToHex(p.color), alpha: pAlpha });
      }
    }

    // Impact rings
    if (S._impactRings) {
      for (let i = S._impactRings.length - 1; i >= 0; i--) {
        const ring = S._impactRings[i];
        const age = (now - ring.ts) / (ring.duration || 400);
        if (age >= 1) continue;
        const radius = (ring.maxR || 15) * (0.5 + age);
        gfx.circle(ring.x, ring.y, radius);
        gfx.stroke({ color: cssToHex(ring.color || '#ffffff'), width: (1 - age) * 3, alpha: (1 - age) * 0.6 });
      }
    }

    // Dust puffs
    const dust = S._dustPuffs || [];
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      if (isNaN(d.x) || isNaN(d.y)) { dust.splice(i, 1); continue; }
      d.x += d.vx; d.y += d.vy;
      d.life -= d.decay;
      if (d.life <= 0) { dust.splice(i, 1); continue; }
      gfx.circle(d.x, d.y, d.life * 3);
      gfx.fill({ color: 0xb4aa8c, alpha: d.life * 0.4 });
    }

    // Ambient particles (zone-specific)
    const ambient = S._ambientParticles || [];
    for (let i = ambient.length - 1; i >= 0; i--) {
      const ap = ambient[i];
      ap.x += ap.vx; ap.y += ap.vy;
      ap.life -= 0.01;
      if (ap.life <= 0) { ambient.splice(i, 1); continue; }
      const alpha = Math.min(0.6, ap.life);
      gfx.circle(ap.x, ap.y, ap.size || 1.5);
      gfx.fill({ color: cssToHex(ap.color || '#ffffff'), alpha });
    }

    // Dodge trail afterimages
    const trail = S._dodgeTrail || [];
    for (let i = trail.length - 1; i >= 0; i--) {
      const ghost = trail[i];
      const age = (now - ghost.ts) / 200;
      if (age >= 1) { trail.splice(i, 1); continue; }
      gfx.circle(ghost.x, ghost.y, 8);
      gfx.fill({ color: 0x3498db, alpha: (1 - age) * 0.3 });
    }

    // General particles (fireflies/pollen)
    if (S._particles) {
      const isNight = S._dayNightCache?.isNight || false;
      for (const p of S._particles) {
        if (isNight) {
          const glow = Math.sin(now / 400 + p.phase) * 0.5 + 0.5;
          gfx.circle(p.x, p.y, p.size);
          gfx.fill({ color: 0xc8ff64, alpha: glow * 0.6 });
        } else {
          const a = Math.sin(now / 600 + p.phase) * 0.3 + 0.3;
          gfx.circle(p.x, p.y, p.size * 0.7);
          gfx.fill({ color: 0xffffc8, alpha: a });
        }
      }
    }
  }

  /* ── Damage Numbers ── */
  _updateDamageNumbers(S, now) {
    const numbers = S.dmgNumbers || [];
    while (this.dmgTexts.length > this.maxDmgTexts) {
      const old = this.dmgTexts.shift();
      old.destroy();
    }
    for (let i = numbers.length - 1; i >= 0; i--) {
      const dmg = numbers[i];
      const age = (now - dmg.ts) / 1000;
      if (age > 1.5) {
        if (dmg._pixiText) { dmg._pixiText.destroy(); }
        numbers.splice(i, 1);
        continue;
      }
      if (!dmg._pixiText) {
        const text = new Text({
          text: dmg.text,
          style: { ...DMG_STYLE, fontSize: dmg.crit ? 18 : 14, fill: dmg.color || '#ffffff' },
        });
        text.anchor.set(0.5, 0.5);
        this.dmgLayer.addChild(text);
        this.dmgTexts.push(text);
        dmg._pixiText = text;
      }
      const text = dmg._pixiText;
      text.x = dmg.x;
      text.y = dmg.y - age * 40;
      text.alpha = Math.max(0, 1 - age / 1.2);
      text.scale.set(1 + (dmg.crit ? Math.sin(age * 8) * 0.1 : 0));
    }
  }

  /* ── Screen Flashes ── */
  _updateScreenFlash(S, viewW, viewH, now) {
    const gfx = this.flashOverlay;
    gfx.clear();

    if (S._damageFlash && now - S._damageFlash < 200) {
      const age = (now - S._damageFlash) / 200;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: (1 - age) * 0.3 });
    }
    if (S._blockFlash && now - S._blockFlash < 200) {
      const age = (now - S._blockFlash) / 200;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x60a5fa, alpha: (1 - age) * 0.12 });
    }
    if (S.rpg && S.rpg.hp > 0 && S.rpg.hp / S.rpg.maxHp < 0.25) {
      const pulse = Math.sin(now / 300) * 0.5 + 0.5;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: pulse * 0.12 });
    }
    if (S._levelUpFlash && now - S._levelUpFlash < 800) {
      const age = (now - S._levelUpFlash) / 800;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xf5c542, alpha: (1 - age) * 0.25 });
    }
    if (S._deathFlash && now - S._deathFlash < 500) {
      const age = (now - S._deathFlash) / 500;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x000000, alpha: (1 - age) * 0.6 });
    }
    if (S._zoneWipe) {
      const w = S._zoneWipe;
      const age = (now - w.ts) / (w.duration || 800);
      if (age < 1) {
        const alpha = age < 0.5 ? age * 2 : (1 - age) * 2;
        const zone = ZONES[w.toZone || S.currentZone];
        const elem = zone?.element;
        const color = elem && ELEMENTS[elem] ? cssToHex(ELEMENTS[elem].color) : 0x000000;
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color, alpha: Math.min(1, alpha) });
      }
    }
  }

  /* ── Atmosphere ── */
  _updateAtmosphere(S, viewW, viewH, now) {
    const gfx = this.atmosphereGfx;
    gfx.clear();

    const zone = ZONES[S.currentZone];
    if (zone?.atmosphere) {
      if (zone.atmosphere.tint) {
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color: 0x000000, alpha: 0.05 });
      }
      if (zone.atmosphere.vignette) {
        gfx.rect(0, 0, viewW, 30);
        gfx.fill({ color: 0x000000, alpha: 0.1 });
        gfx.rect(0, viewH - 30, viewW, 30);
        gfx.fill({ color: 0x000000, alpha: 0.1 });
      }
    }
    if (S._dayNightCache?.nightAlpha > 0) {
      const isNight = S._dayNightCache.isNight;
      const color = isNight ? 0x0a0a28 : 0x28140a;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color, alpha: S._dayNightCache.nightAlpha });
    }

    // Depth darkness
    const depth = S._currentDepth;
    if (depth && depth !== 'shallow' && S.currentZone !== 'town') {
      const depthAlpha = { mid: 0.1, deep: 0.2, abyss: 0.35, core: 0.5 }[depth] || 0;
      if (depthAlpha > 0) {
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color: 0x000000, alpha: depthAlpha });
      }
    }
  }

  /* ── Projectiles (arrows, staff bolts, remote) ── */
  _updateProjectiles(S, now) {
    const gfx = this.projectileGfx;
    gfx.clear();

    // Local arrows
    const arrows = S.arrows || [];
    for (const a of arrows) {
      if (!a._renderX) continue;
      const elemColor = a._projElem && ELEMENTS[a._projElem] ? cssToHex(ELEMENTS[a._projElem].color) : 0xc8c8d0;
      const fadeA = Math.min(1, a.life / 20);

      if (a.isSpecial || a.ice) {
        const sz = a._isStaffProj ? 1.5 : 1.0;
        gfx.circle(a._renderX, a._renderY, 5 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.8 });
        gfx.circle(a._renderX, a._renderY, 8 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.2 });
      } else if (a._isStaffProj) {
        gfx.circle(a._renderX, a._renderY, 5);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.8 });
        gfx.circle(a._renderX, a._renderY, 9);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.2 });
      } else {
        // Arrow line
        const tailX = a._renderX - Math.cos(a.ang) * 12;
        const tailY = a._renderY - Math.sin(a.ang) * 12;
        gfx.moveTo(tailX, tailY);
        gfx.lineTo(a._renderX, a._renderY);
        gfx.stroke({ color: 0x8B6914, width: 2, alpha: fadeA });
        // Arrowhead
        gfx.circle(a._renderX, a._renderY, 2);
        gfx.fill({ color: elemColor, alpha: fadeA });
      }
    }

    // Remote projectiles
    const remote = S._remoteProjectiles || [];
    for (const rp of remote) {
      if (!rp._renderX) continue;
      if (rp.isStaff) {
        gfx.circle(rp._renderX, rp._renderY, 4);
        gfx.fill({ color: 0xa855f7, alpha: 0.8 });
      } else {
        const tx = rp._renderX - Math.cos(rp.ang) * 10;
        const ty = rp._renderY - Math.sin(rp.ang) * 10;
        gfx.moveTo(tx, ty);
        gfx.lineTo(rp._renderX, rp._renderY);
        gfx.stroke({ color: 0xd4a574, width: 1.5, alpha: 0.9 });
      }
    }
  }

  /* ── Monster Telegraphs ── */
  _updateTelegraphs(S, now) {
    const gfx = this.telegraphGfx;
    gfx.clear();

    const monsters = S.monsters || [];
    for (const m of monsters) {
      if (!m.alive || !m._telegraphUntil) continue;
      const remaining = m._telegraphUntil - now;
      if (remaining <= 0) continue;

      const range = m._telegraphRange || 40;
      const pulse = Math.sin(now / 100) * 0.15 + 0.35;
      gfx.circle(m.x, m.y, range);
      gfx.fill({ color: 0xff0000, alpha: pulse * 0.15 });
      gfx.circle(m.x, m.y, range);
      gfx.stroke({ color: 0xff0000, width: 2, alpha: pulse });
    }
  }

  /* ── Overlays (lock-on, chat bubbles, building signs, aim line) ── */
  _updateOverlays(S, now) {
    const gfx = this.overlayGfx;
    gfx.clear();

    // Lock-on reticle — defensive: a stale ref (e.g. monster killed
    // mid-frame) shouldn't take down the entire effects renderer.
    try {
      if (S.lockedTarget && S.lockedTarget.ref && S.lockedTarget.ref.alive !== false) {
        const lt = S.lockedTarget.ref;
        const lx = lt.x || lt.renderX || 0;
        const ly = lt.y || lt.renderY || 0;
        if (Number.isFinite(lx) && Number.isFinite(ly)) {
          const lockR = 18 + Math.sin(now / 250) * 3;
          gfx.circle(lx, ly, lockR);
          gfx.stroke({ color: 0xff3c3c, width: 2, alpha: 0.8 });
          // Corner marks
          for (let c = 0; c < 4; c++) {
            const ca = (c / 4) * Math.PI * 2 + now / 1500;
            const cx = lx + Math.cos(ca) * lockR;
            const cy = ly + Math.sin(ca) * lockR;
            gfx.circle(cx, cy, 2);
            gfx.fill({ color: 0xff3c3c, alpha: 0.9 });
          }
        }
      }
    } catch (e) {
      if (!this._lockErrLogged) {
        this._lockErrLogged = true;
        console.error('[overlay] lock reticle threw', e && e.message, e && e.stack);
      }
    }

    // Bow aim line
    if (S._aiming && S._aimAngle != null) {
      const P = S.player;
      const aimLen = 80;
      const ex = P.x + Math.cos(S._aimAngle) * aimLen;
      const ey = P.y + Math.sin(S._aimAngle) * aimLen;
      // Dashed effect via segments
      for (let d = 0; d < aimLen; d += 8) {
        if ((d / 8) % 2 === 0) {
          const sx = P.x + Math.cos(S._aimAngle) * d;
          const sy = P.y + Math.sin(S._aimAngle) * d;
          const dx = P.x + Math.cos(S._aimAngle) * Math.min(d + 4, aimLen);
          const dy = P.y + Math.sin(S._aimAngle) * Math.min(d + 4, aimLen);
          gfx.moveTo(sx, sy);
          gfx.lineTo(dx, dy);
          gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.4 * (1 - d / aimLen) });
        }
      }
    }

    // Shield arc
    if (S.isBlocking && S._shieldAngle != null) {
      const P = S.player;
      const shR = 22;
      const startA = S._shieldAngle - 0.6;
      const endA = S._shieldAngle + 0.6;
      gfx.arc(P.x, P.y, shR, startA, endA);
      gfx.stroke({ color: 0x3498db, width: 3, alpha: 0.6 });
    }

    // Player level badge
    if (S.rpg) {
      const P = S.player;
      if (!this._levelText) {
        this._levelText = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 8 } });
        this._levelText.anchor.set(0.5, 0.5);
        this.overlayLayer.addChild(this._levelText);
      }
      this._levelText.text = 'Lv' + (S.rpg.level || 1);
      this._levelText.x = P.x;
      this._levelText.y = P.y + 24;
    }

    // Chat bubbles
    this._updateChatBubbles(S, now);
  }

  _updateChatBubbles(S, now) {
    const bubbles = S.chatBubbles || {};
    const activeIds = new Set();

    // Player + others' bubbles
    const allSources = { [S.myId]: S.player };
    for (const [id, o] of Object.entries(S.others || {})) {
      allSources[id] = o;
    }

    for (const [pid, bubble] of Object.entries(bubbles)) {
      const age = now - bubble.ts;
      if (age > 5000) continue;
      activeIds.add(pid);

      const source = allSources[pid];
      if (!source) continue;
      const sx = source.renderX || source.x || 0;
      const sy = source.renderY || source.y || 0;

      let display = this.chatTexts.get(pid);
      if (!display) {
        display = new Text({
          text: '',
          style: { ...LABEL_STYLE, fontSize: 10, fill: '#ffffff', wordWrap: true, wordWrapWidth: 120 },
        });
        display.anchor.set(0.5, 1);
        this.overlayLayer.addChild(display);
        this.chatTexts.set(pid, display);
      }
      display.text = bubble.text || '';
      display.x = sx;
      display.y = sy - 35;
      display.alpha = age > 4500 ? (5000 - age) / 500 : 1;
      display.visible = true;
    }

    // Hide stale
    for (const [pid, display] of this.chatTexts) {
      if (!activeIds.has(pid)) {
        display.visible = false;
      }
    }
  }

  /* ── HUD (screen-space) ── */
  _updateHUD(S, viewW, viewH, now) {
    const gfx = this.hudGfx;
    gfx.clear();

    // Desktop aim reticle
    if (S._mouseWorldX != null && S._mouseWorldY != null) {
      const mx = S._mouseWorldX;
      const my = S._mouseWorldY;
      // Convert to screen-space for HUD layer
      const sx = mx - (S.camera?.x || 0);
      const sy = my - (S.camera?.y || 0);
      gfx.circle(sx, sy, 8);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
      // Crosshair lines
      gfx.moveTo(sx - 12, sy); gfx.lineTo(sx - 5, sy);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx + 5, sy); gfx.lineTo(sx + 12, sy);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx, sy - 12); gfx.lineTo(sx, sy - 5);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx, sy + 5); gfx.lineTo(sx, sy + 12);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    }
  }

  /* ── Ground Loot ── */
  _updateGroundLoot(S, now) {
    const gfx = this.lootGfx;
    gfx.clear();

    const loot = S.groundLoot || [];
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      if (l._expired) { loot.splice(i, 1); continue; }
      const age = (now - l.ts) / 1000;
      if (age > 30) { loot.splice(i, 1); continue; }
      const bob = Math.sin(now / 300 + l.x) * 2;
      const alpha = age > 25 ? (30 - age) / 5 : 1;

      if (l.isWeapon) {
        // Weapon drop — colored square
        const tierColor = cssToHex(l.tierColor || '#ffffff');
        gfx.rect(l.x - 5, l.y + bob - 5, 10, 10);
        gfx.fill({ color: tierColor, alpha });
        gfx.rect(l.x - 5, l.y + bob - 5, 10, 10);
        gfx.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.5 });
      } else {
        if (l.coins) {
          gfx.circle(l.x, l.y + bob, 4);
          gfx.fill({ color: 0xf5c542, alpha });
        }
        if (l.xp) {
          gfx.circle(l.x + 6, l.y + bob, 3);
          gfx.fill({ color: 0x5b52ff, alpha });
        }
      }
    }
  }

  /* ── Ground Splatter ── */
  _updateGroundSplatter(S) {
    const splatters = S.groundSplatter || [];
    if (splatters.length === this._lastSplatCount) return;
    this._lastSplatCount = splatters.length;

    const gfx = this.splatGfx;
    gfx.clear();
    for (const sp of splatters) {
      gfx.circle(sp.x, sp.y, sp.size || 3);
      gfx.fill({ color: cssToHex(sp.color || '#4a0000'), alpha: 0.3 });
    }
  }

  /* ── Gather Nodes ── */
  _updateGatherNodes(S, now) {
    const gfx = this.nodeGfx;
    gfx.clear();

    const nodes = S._gatherNodes || [];
    for (const node of nodes) {
      if (!node.alive) continue;

      if (node.nodeType === 'tree') {
        const tier = node._tier;
        const tw = tier?.trunkW || 3;
        const th = tier?.trunkH || 8;
        const cr = tier?.canopyR || 6;
        gfx.rect(node.x - tw / 2, node.y - th, tw, th);
        gfx.fill({ color: cssToHex(tier?.trunkColor || '#3a2810') });
        gfx.circle(node.x, node.y - th - cr * 0.5, cr);
        gfx.fill({ color: cssToHex(tier?.canopyColor || '#2a7a1a') });
      } else if (node.nodeType === 'fishSpot') {
        const pulse = Math.sin(now / 600 + node.x) * 0.2 + 1;
        const r = (node._tier?.size || 6) * pulse;
        gfx.circle(node.x, node.y, r);
        gfx.fill({ color: 0x3498db, alpha: 0.35 });
        gfx.circle(node.x, node.y, r * 0.6);
        gfx.fill({ color: 0x3498db, alpha: 0.2 });
      } else {
        const size = node._tier?.size || 8;
        gfx.circle(node.x, node.y, size / 2);
        gfx.fill({ color: cssToHex(node._tier?.rockColor || '#6a6a6a') });
        gfx.circle(node.x + 2, node.y - 1, size / 4);
        gfx.fill({ color: cssToHex(node._tier?.streakColor || '#8a8a8a') });
      }

      if (node.hp < node.maxHp) {
        const pct = node.hp / node.maxHp;
        gfx.rect(node.x - 10, node.y + 10, 20, 3);
        gfx.fill({ color: 0x000000, alpha: 0.5 });
        gfx.rect(node.x - 10, node.y + 10, 20 * pct, 3);
        gfx.fill({ color: 0x3dd497 });
      }
    }
  }

  clear() {
    this.particleGfx.clear();
    this.projectileGfx.clear();
    this.telegraphGfx.clear();
    this.overlayGfx.clear();
    this.hudGfx.clear();
    this.lootGfx.clear();
    this.splatGfx.clear();
    this.nodeGfx.clear();
    this.flashOverlay.clear();
    this.atmosphereGfx.clear();
    for (const t of this.dmgTexts) t.destroy();
    this.dmgTexts = [];
    for (const [, t] of this.chatTexts) t.destroy();
    this.chatTexts.clear();
    if (this._levelText) { this._levelText.destroy(); this._levelText = null; }
  }
}
