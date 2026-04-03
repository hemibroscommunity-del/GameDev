/**
 * Effects Renderer — particles, damage numbers, screen flashes, atmosphere.
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

function cssToHex(css) {
  if (typeof css !== 'string') return 0xffffff;
  return parseInt(css.replace('#', '').replace('rgba(', '').split(',')[0], 16) || 0xffffff;
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

    // Pooled graphics for particles (avoid creating per frame)
    this.particleGfx = new Graphics();
    this.particleLayer.addChild(this.particleGfx);

    // Active damage number texts
    this.dmgTexts = [];
    this.maxDmgTexts = 50;

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
  }

  _updateParticles(S, now) {
    const gfx = this.particleGfx;
    gfx.clear();

    // Hit particles
    const parts = S.hitParticles || [];
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= 0.016;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const alpha = Math.min(1, p.life * 2);
      const color = cssToHex(p.color);
      gfx.circle(p.x, p.y, (p.size || 2) * Math.min(1, p.life * 3));
      gfx.fill({ color, alpha });
    }

    // Death explosion particles
    const explosions = S.deathExplosions || [];
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      const age = (now - exp.ts) / 1000;
      if (age > 2) {
        explosions.splice(i, 1);
        continue;
      }
      const expParts = exp.particles || [];
      for (const p of expParts) {
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
        const age = (now - ring.ts) / 1000;
        if (age > 0.4) {
          S._impactRings.splice(i, 1);
          continue;
        }
        const radius = ring.radius * (1 + age * 3);
        const alpha = Math.max(0, 0.6 - age * 1.5);
        gfx.circle(ring.x, ring.y, radius);
        gfx.stroke({ color: cssToHex(ring.color || '#ffffff'), width: 2, alpha });
      }
    }
  }

  _updateDamageNumbers(S, now) {
    const numbers = S.dmgNumbers || [];

    // Remove old texts
    while (this.dmgTexts.length > this.maxDmgTexts) {
      const old = this.dmgTexts.shift();
      old.destroy();
    }

    // Update existing and create new
    for (let i = numbers.length - 1; i >= 0; i--) {
      const dmg = numbers[i];
      const age = (now - dmg.ts) / 1000;
      if (age > 1.5) {
        numbers.splice(i, 1);
        continue;
      }

      // Find or create text
      if (!dmg._pixiText) {
        const text = new Text({
          text: dmg.text,
          style: {
            ...DMG_STYLE,
            fontSize: dmg.crit ? 18 : 14,
            fill: dmg.color || '#ffffff',
          },
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

  _updateScreenFlash(S, viewW, viewH, now) {
    const gfx = this.flashOverlay;
    gfx.clear();

    // Damage flash
    if (S._damageFlash && now - S._damageFlash < 200) {
      const age = (now - S._damageFlash) / 200;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: (1 - age) * 0.3 });
    }

    // Block flash
    if (S._blockFlash && now - S._blockFlash < 150) {
      const age = (now - S._blockFlash) / 150;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x3498db, alpha: (1 - age) * 0.2 });
    }

    // Low HP warning
    if (S.rpg && S.rpg.hp > 0 && S.rpg.hp / S.rpg.maxHp < 0.25) {
      const pulse = Math.sin(now / 300) * 0.5 + 0.5;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: pulse * 0.12 });
    }

    // Level up flash
    if (S._levelUpFlash && now - S._levelUpFlash < 800) {
      const age = (now - S._levelUpFlash) / 800;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xf5c542, alpha: (1 - age) * 0.25 });
    }

    // Death flash
    if (S._deathFlash && now - S._deathFlash < 500) {
      const age = (now - S._deathFlash) / 500;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x000000, alpha: (1 - age) * 0.6 });
    }

    // Zone transition wipe
    if (S._zoneWipe) {
      const w = S._zoneWipe;
      const age = (now - w.ts) / (w.duration || 800);
      if (age < 1) {
        const alpha = age < 0.5 ? age * 2 : (1 - age) * 2;
        const zone = ZONES[w.toZone || S.currentZone];
        const elem = zone?.element;
        const color = elem ? cssToHex(ELEMENTS[elem]?.color || '#000000') : 0x000000;
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color, alpha: Math.min(1, alpha) });
      } else {
        S._zoneWipe = null;
      }
    }
  }

  _updateAtmosphere(S, viewW, viewH, now) {
    const gfx = this.atmosphereGfx;
    gfx.clear();

    const zone = ZONES[S.currentZone];
    if (!zone?.atmosphere) return;

    // Zone tint
    if (zone.atmosphere.tint) {
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x000000, alpha: 0.05 }); // simplified tint
    }

    // Vignette
    if (zone.atmosphere.vignette) {
      const cx = viewW / 2;
      const cy = viewH / 2;
      const r = Math.max(viewW, viewH) * 0.7;
      // Simple darkened edges
      gfx.rect(0, 0, viewW, 30);
      gfx.fill({ color: 0x000000, alpha: 0.1 });
      gfx.rect(0, viewH - 30, viewW, 30);
      gfx.fill({ color: 0x000000, alpha: 0.1 });
    }

    // Day/night
    if (S._dayNightCache?.nightAlpha > 0) {
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x000020, alpha: S._dayNightCache.nightAlpha * 0.5 });
    }
  }

  _updateGroundLoot(S, now) {
    const gfx = this.lootGfx;
    gfx.clear();

    const loot = S.groundLoot || [];
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      const age = (now - l.ts) / 1000;
      if (age > 30) {
        loot.splice(i, 1);
        continue;
      }
      const bob = Math.sin(now / 300 + l.x) * 2;
      const alpha = age > 25 ? (30 - age) / 5 : 1;

      // Gold coin
      if (l.coins) {
        gfx.circle(l.x, l.y + bob, 4);
        gfx.fill({ color: 0xf5c542, alpha });
      }
      // XP orb
      if (l.xp) {
        gfx.circle(l.x + 6, l.y + bob, 3);
        gfx.fill({ color: 0x5b52ff, alpha });
      }
    }
  }

  _updateGroundSplatter(S) {
    // Only rebuild when splatters change
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
        // Trunk
        gfx.rect(node.x - tw / 2, node.y - th, tw, th);
        gfx.fill({ color: cssToHex(tier?.trunkColor || '#3a2810') });
        // Canopy
        gfx.circle(node.x, node.y - th - cr * 0.5, cr);
        gfx.fill({ color: cssToHex(tier?.canopyColor || '#2a7a1a') });
      } else if (node.nodeType === 'fishSpot') {
        // Animated water circle
        const pulse = Math.sin(now / 600 + node.x) * 0.2 + 1;
        const r = (node._tier?.size || 6) * pulse;
        gfx.circle(node.x, node.y, r);
        gfx.fill({ color: 0x3498db, alpha: 0.35 });
        gfx.circle(node.x, node.y, r * 0.6);
        gfx.fill({ color: 0x3498db, alpha: 0.2 });
      } else {
        // Ore vein
        const size = node._tier?.size || 8;
        gfx.circle(node.x, node.y, size / 2);
        gfx.fill({ color: cssToHex(node._tier?.rockColor || '#6a6a6a') });
        // Streak
        gfx.circle(node.x + 2, node.y - 1, size / 4);
        gfx.fill({ color: cssToHex(node._tier?.streakColor || '#8a8a8a') });
      }

      // HP bar if damaged
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
    this.lootGfx.clear();
    this.splatGfx.clear();
    this.nodeGfx.clear();
    this.flashOverlay.clear();
    this.atmosphereGfx.clear();
    for (const t of this.dmgTexts) t.destroy();
    this.dmgTexts = [];
  }
}
