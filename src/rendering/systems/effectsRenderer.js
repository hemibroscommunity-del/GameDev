/**
 * Effects Renderer — particles, damage numbers, screen flashes, atmosphere,
 * projectiles, telegraphs, lock-on, ambient particles, chat bubbles, building signs.
 * Uses PixiJS Graphics for procedural particles and Text for damage numbers.
 */
import { Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { ELEMENTS } from '@/data/elements.js';
import { ZONES } from '@/data/zones.js';
import { getFrame as getSlimeFrame, hasState as hasSlimeState } from '../slimeSprites.js';
import { getRemnantsTexture as getSnowmanRemnantsTex } from '../snowmanSprites.js';
import { variantSpritesFor } from '../monsterVariantSprites.js';
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from '../../data/monsterVariants.js';

/* Popup icons (XP badge, gold coin, sword/arrow/spell for damage by weapon
   type). Loaded async — entries appear in the registry once each PNG is
   ready. Until then, popups render text-only and the icon is skipped. */
const POPUP_ICONS = {};
const POPUP_ICON_KEYS = ['xp', 'gold', 'sword', 'arrow', 'spell'];
Promise.all(POPUP_ICON_KEYS.map((k) =>
  Assets.load('/icons/popups/' + k + '.png').then((tex) => { POPUP_ICONS[k] = tex; })
)).catch((err) => console.warn('[popup-icons] load failed', err));

/* Gather-node sprites — keyed by node.nodeType. Until each texture is
   loaded, _updateGatherNodes falls through to the procedural drawing path
   below. Source PNGs are ~1000-1250 px; in-game node footprints are
   tier-sized (tier.size ≈ 6-12 px), so each sprite is scaled to a target
   pixel height tuned to feel right next to the player sprite. */
const NODE_SPRITE_SOURCES = {
  tree:     '/sprites/trees/tree-pine.png',
  fishSpot: '/sprites/world/fish-spot.png',
  oreVein:  '/sprites/world/ore-vein.png',
};
const NODE_SPRITE_TEX = {};
/* Target render heights in world px at tierStep 1, scaled up with tier. */
const NODE_SPRITE_HEIGHT_BASE = { tree: 112, fishSpot: 88, oreVein: 88 };
const NODE_SPRITE_ANCHOR_Y = { tree: 1.0, fishSpot: 0.5, oreVein: 1.0 };
Promise.all(Object.entries(NODE_SPRITE_SOURCES).map(([k, path]) =>
  Assets.load(path).then((tex) => { NODE_SPRITE_TEX[k] = tex; })
)).catch((err) => console.warn('[node-sprites] load failed', err));

const DMG_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 14,
  fontWeight: '800',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 3 },
  align: 'center',
});

/* Emoji-safe text style — used when dmg.text contains non-ASCII
   characters (skulls, stars, swords, etc.).  iOS Safari + PixiJS v8
   + stroked Text + emoji glyph is a documented native-crash vector
   (full tab kill, no JS error).  Dropping the stroke and falling
   through to the system emoji font (Apple Color Emoji on iOS)
   sidesteps the WebGL texture path that crashes. */
const DMG_STYLE_EMOJI = new TextStyle({
  fontFamily: '"Apple Color Emoji","Segoe UI Emoji",VT323,monospace',
  fontSize: 14,
  fontWeight: '800',
  fill: '#ffffff',
  align: 'center',
});

/* Cheap ASCII test — anything outside 0x20-0x7E is treated as emoji. */
function isAsciiOnly(s) {
  if (typeof s !== 'string') return true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c > 0x7E) return false;
  }
  return true;
}

const LABEL_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 11,
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

/* Emoji-safe label style for chat bubbles, NPC names, etc. that may
   contain user-supplied or game-supplied emoji.  Same iOS WebGL
   crash class as DMG_STYLE_EMOJI — stripping the dropShadow and
   falling through to the system emoji font sidesteps the bad path. */
const LABEL_STYLE_EMOJI = new TextStyle({
  fontFamily: '"Apple Color Emoji","Segoe UI Emoji",VT323,monospace',
  fontSize: 11,
  fill: '#ffffff',
  align: 'center',
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

    /* Tracked Sprite instances for slime projectiles. We attach the
       sprite to proj._pixiSprite for fast lookup, and keep parallel
       entries here so we can destroy orphans after the simulator
       drops a projectile from S.slimeProjectiles. */
    this.slimeProjSprites = [];

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
    /* No pre-pruning of this.dmgTexts.  The previous shift+destroy loop
       killed the oldest Text but left the matching dmg._pixiText back-
       reference pointing at a destroyed object — next frame's
       `text.x = dmg.x` blew up with `null is not an object (evaluating
       'this._position.x=e')` (a Pixi v8 internal accessor on destroyed
       Text).  Age-based cleanup below (1.5 s TTL) handles bounding by
       itself; with reasonable spawn rates we never hold more than a few
       dozen dmg numbers concurrently. */
    for (let i = numbers.length - 1; i >= 0; i--) {
      const dmg = numbers[i];
      const age = (now - dmg.ts) / 1000;
      const ttl = dmg.ttl || 1.5;
      if (age > ttl) {
        if (dmg._pixiText && !dmg._pixiText.destroyed) { dmg._pixiText.destroy(); }
        if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) { dmg._pixiIcon.destroy(); }
        if (dmg._pixiSub  && !dmg._pixiSub.destroyed)  { dmg._pixiSub.destroy(); }
        dmg._pixiText = null;
        dmg._pixiIcon = null;
        dmg._pixiSub  = null;
        numbers.splice(i, 1);
        continue;
      }
      /* Defensive: treat a destroyed Text as missing and rebuild.
         Catches the case where some other path (e.g. zone change clear)
         destroyed the Text while the dmg entry was still alive. */
      if (dmg._pixiText && dmg._pixiText.destroyed) {
        dmg._pixiText = null;
      }
      if (dmg._pixiIcon && dmg._pixiIcon.destroyed) {
        dmg._pixiIcon = null;
      }
      if (dmg._pixiSub && dmg._pixiSub.destroyed) {
        dmg._pixiSub = null;
      }
      if (!dmg._pixiText) {
        /* Pick the emoji-safe style when text contains non-ASCII to
           avoid the iOS Safari WebGL emoji-stroke crash. */
        const baseStyle = isAsciiOnly(dmg.text) ? DMG_STYLE : DMG_STYLE_EMOJI;
        /* Categorize popup by structure (ASCII-only patterns):
             damage  = optional non-letter prefix then optional dash and digits
             xp      = "+N XP"
             gold    = "+N G"
           Centralized here so the 40+ push sites don't each need recoloring. */
        const t = dmg.text || '';
        let displayColor = dmg.color || '#ffffff';
        if (/^[^A-Za-z+]*-?\d+$/.test(t)) {
          displayColor = '#ff8c1a';
        } else if (/^\+\d+\s*XP$/.test(t)) {
          displayColor = '#60a5fa';
        } else if (/^\+\d+\s*G$/.test(t)) {
          displayColor = '#f5c542';
        }
        /* Anti-overlap: place new popup below the lowest existing nearby one
           so kill-shot popups (damage, XP, gold spawned in one frame at slightly
           different Y) don't visually overlap. We compute a target Y rather
           than just adding a fixed offset, because the spawn Ys differ. */
        const SPACING = 26;
        let lowestY = -Infinity;
        let hasNeighbor = false;
        for (let j = 0; j < numbers.length; j++) {
          if (j === i) continue;
          const o = numbers[j];
          if (!o._pixiText || o._pixiText.destroyed) continue;
          if (Math.abs(o.x - dmg.x) > 60) continue;
          const oAge = (now - o.ts) / 1000;
          if (oAge > 0.6) continue;
          const oY = o.y + (o._stackOffset || 0) - oAge * 40;
          if (Math.abs(oY - dmg.y) > 50) continue;
          hasNeighbor = true;
          if (oY > lowestY) lowestY = oY;
        }
        dmg._stackOffset = hasNeighbor ? (lowestY + SPACING) - dmg.y : 0;
        const baseFontSize = dmg.crit ? 27 : 21;
        /* Special-attack hits render at 2x so the heavy hit reads clearly. */
        const fontSize = dmg.special ? baseFontSize * 2 : baseFontSize;
        const text = new Text({
          text: dmg.text,
          style: { ...baseStyle, fontSize, fill: displayColor },
        });
        /* Pixi v8 TextStyle stores fields privately; the spread above may drop
           overrides. Set fill and fontSize explicitly to guarantee they apply. */
        text.style.fill = displayColor;
        text.style.fontSize = fontSize;
        text.anchor.set(0.5, 0.5);
        this.dmgLayer.addChild(text);
        this.dmgTexts.push(text);
        dmg._pixiText = text;
        /* Icon: explicit dmg.iconKey wins; otherwise fall back to detecting
           gold from text pattern. Damage popups need an explicit iconKey
           because the text alone doesn't tell us the weapon type. */
        let iconKey = dmg.iconKey;
        if (!iconKey) {
          if (/^\+\d+\s*G$/.test(t)) iconKey = 'gold';
        }
        if (iconKey && POPUP_ICONS[iconKey]) {
          const tex = POPUP_ICONS[iconKey];
          const icon = new Sprite(tex);
          icon.anchor.set(0, 0.5);
          /* Cap icon height at 22 px regardless of fontSize.  At the
             previous fontSize-tied scale, special-crit hits put a
             54 px icon next to a single-digit number, eating most of
             the popup width. */
          const targetH = Math.min(fontSize, 22);
          icon.scale.set(targetH / tex.height);
          this.dmgLayer.addChild(icon);
          dmg._pixiIcon = icon;
        }
        /* Optional muted-gray suffix Text drawn on the same line as the
           main number (e.g. "11" with "block 14" after it for mitigated
           hits).  Smaller font + #888 fill gives a secondary read without
           a second popup floating separately. */
        if (dmg.subText) {
          const subSize = Math.max(11, Math.round(fontSize * 0.65));
          const sub = new Text({
            text: dmg.subText,
            style: { ...baseStyle, fontSize: subSize, fill: '#888' },
          });
          sub.style.fill = '#888';
          sub.style.fontSize = subSize;
          sub.anchor.set(0, 0.5);
          this.dmgLayer.addChild(sub);
          this.dmgTexts.push(sub);
          dmg._pixiSub = sub;
        }
      }
      const text = dmg._pixiText;
      text.x = dmg.x;
      text.y = dmg.y + (dmg._stackOffset || 0) - age * 40;
      /* Fade over 80% of ttl so longer-lived popups (kill messages with
         ttl=2.5) actually stay visible, not invisible most of their life. */
      text.alpha = Math.max(0, 1 - age / (ttl * 0.8));
      /* Spawn pop: scale 1.6 -> 1.0 over 120ms (ease-out) so the number
         visibly punches in on the first hit, then settles. Crit wiggle
         layers on top after the pop has decayed. */
      const POP_DUR = 0.12;
      const POP_AMOUNT = 0.6;
      let popBoost = 0;
      if (age < POP_DUR) {
        const t = 1 - age / POP_DUR;
        popBoost = POP_AMOUNT * t * t;
      }
      const critWiggle = dmg.crit ? Math.sin(age * 8) * 0.1 : 0;
      text.scale.set(1 + popBoost + critWiggle);
      if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) {
        /* Place icon flush to the right of the text. Text anchor is
           (0.5, 0.5), so the right edge sits at text.x + text.width/2.
           Gap scales with fontSize because special-attack popups render
           at 2x.  Min 10 px because the prior 4 px floor still let the
           magic icon clip the last digit on fire-goblin hits ("32"
           reading as "3[magic]").  Stroked text extends a few px past
           text.width on iOS canvas rendering. */
        const _iconGap = Math.max(10, (text.style.fontSize || 21) * 0.35);
        dmg._pixiIcon.x = text.x + text.width / 2 + _iconGap;
        dmg._pixiIcon.y = text.y;
        dmg._pixiIcon.alpha = text.alpha;
      }
      if (dmg._pixiSub && !dmg._pixiSub.destroyed) {
        /* Sub text sits after the icon if there is one, otherwise flush
           to the right edge of the main text.  Anchor is (0, 0.5) so
           setting .x places its left edge. */
        const _subGap = Math.max(10, (text.style.fontSize || 21) * 0.35);
        let subX = text.x + text.width / 2 + _subGap;
        if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) {
          subX = dmg._pixiIcon.x + (dmg._pixiIcon.width || 0) + _subGap;
        }
        dmg._pixiSub.x = subX;
        dmg._pixiSub.y = text.y;
        dmg._pixiSub.alpha = text.alpha;
        dmg._pixiSub.scale.set(text.scale.x);
      }
    }
    /* Compact dmgTexts: drop refs to destroyed Text instances
       (destroyed during age expiry above).  Keeps the array bounded
       without the dangerous shift+destroy from before. */
    if (this.dmgTexts.length > 0) {
      let w = 0;
      for (let r = 0; r < this.dmgTexts.length; r++) {
        const t = this.dmgTexts[r];
        if (t && !t.destroyed) {
          if (w !== r) this.dmgTexts[w] = t;
          w++;
        }
      }
      if (w !== this.dmgTexts.length) this.dmgTexts.length = w;
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

    /* Track aim rotation rate for the mid-flight arrow bend.  Arrows
       lean slightly in the direction the player is currently rotating
       their aim — a visual flourish that hints at "tracking" motion. */
    if (S._aimAngle != null) {
      if (this._lastAimAngle != null) {
        let d = S._aimAngle - this._lastAimAngle;
        // Wrap to [-π, π] so a 359°→1° tick doesn't read as a -358° spin.
        while (d > Math.PI)  d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        // Smooth so single-frame jitter doesn't whiplash the bend.
        this._aimRate = (this._aimRate || 0) * 0.7 + d * 0.3;
      }
      this._lastAimAngle = S._aimAngle;
    } else {
      this._aimRate = 0;
    }
    /* Cap and scale — visible bend up to ~20° at fast aim sweeps,
       zero when standing still.  Negative because a clockwise sweep
       (positive d in screen-y-down) should bend the arrow CCW for a
       trailing-tail effect. */
    const bend = -Math.max(-0.6, Math.min(0.6, (this._aimRate || 0) * 6));

    // Local arrows
    const arrows = S.arrows || [];
    for (const a of arrows) {
      if (!a._renderX) continue;
      const elemColor = a._projElem && ELEMENTS[a._projElem] ? cssToHex(ELEMENTS[a._projElem].color) : 0xc8c8d0;
      const fadeA = Math.min(1, a.life / 20);

      /* Motion-blur trail — push the current position into a small
         ring buffer per arrow, then draw fading line segments back
         through the history.  Older segments are thinner + more
         transparent, so the eye reads the trail as a single linear
         streak that visually extends the arrow's path.
         Stuck arrows / hit arrows don't need this.
         Bow heavy attacks (isSpecial without _isStaffProj) keep the
         arrow trail style — the orb trail belongs to staff/ice. */
      this._updateProjectileTrail(a, gfx, fadeA, /* isStaffProj */ a._isStaffProj || a.ice);

      const isBowHeavy = a.isSpecial && !a._isStaffProj && !a.ice;
      if (isBowHeavy) {
        /* Heavy bow shot — draw the arrow normally with a bright
           element-tinted halo around it.  Reads as a powered shot
           (clearly distinct from a regular arrow) without hiding the
           arrow itself in an orb. */
        gfx.circle(a._renderX, a._renderY, 13);
        gfx.fill({ color: 0xf5c542, alpha: fadeA * 0.25 });
        gfx.circle(a._renderX, a._renderY, 9);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.45 });
        gfx.circle(a._renderX, a._renderY, 5);
        gfx.fill({ color: 0xfff2a8, alpha: fadeA * 0.55 });
        this._drawArrow(gfx, a._renderX, a._renderY, a.ang + bend, elemColor, fadeA);
      } else if (a.isSpecial || a.ice) {
        /* Staff special / ice — bigger yellow glow ring so specials
           read as distinct from regular projectiles. Three concentric
           circles:
            – outer yellow halo for the "special" tell
            – mid element-tinted glow
            – bright element-tinted core */
        const sz = a._isStaffProj ? 2.0 : 1.6;
        gfx.circle(a._renderX, a._renderY, 16 * sz);
        gfx.fill({ color: 0xf5c542, alpha: fadeA * 0.22 });
        gfx.circle(a._renderX, a._renderY, 12 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.35 });
        gfx.circle(a._renderX, a._renderY, 7 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.9 });
        gfx.circle(a._renderX, a._renderY, 7 * sz);
        gfx.stroke({ color: 0xfff2a8, width: 1.5, alpha: fadeA * 0.85 });
      } else if (a._isStaffProj) {
        gfx.circle(a._renderX, a._renderY, 5);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.8 });
        gfx.circle(a._renderX, a._renderY, 9);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.2 });
      } else {
        /* Detailed arrow — wooden shaft + colored arrowhead +
           colored fletching.  Drawn rotated so the math is
           local-coords-friendly.  ang_eff = a.ang + bend so arrows
           in flight visibly tilt in the direction the player is
           rotating their aim. */
        this._drawArrow(gfx, a._renderX, a._renderY, a.ang + bend, elemColor, fadeA);
      }
    }

    /* Stuck arrows — embedded in monster bodies after a hit.  Drawn
       half-length per the Canvas 2D path (BroTown.jsx ~11756). */
    const monsters = S.monsters || [];
    for (const m of monsters) {
      if (!m || !m._stuckArrows || !m._stuckArrows.length) continue;
      for (const sa of m._stuckArrows) {
        const sx = m.x + (sa.ox || 0);
        const sy = m.y + (sa.oy || 0);
        const color = (sa.color && cssToHex(sa.color)) || 0x8b6914;
        if (sa.isStaff) {
          this._drawStuckMagicShard(gfx, sx, sy, sa.ang, color);
        } else {
          this._drawStuckArrow(gfx, sx, sy, sa.ang, color);
        }
      }
    }

    // Remote projectiles
    const remote = S._remoteProjectiles || [];
    for (const rp of remote) {
      if (!rp._renderX) continue;
      this._updateProjectileTrail(rp, gfx, 1.0, !!rp.isStaff);
      if (rp.isStaff) {
        gfx.circle(rp._renderX, rp._renderY, 4);
        gfx.fill({ color: 0xa855f7, alpha: 0.8 });
      } else {
        this._drawArrow(gfx, rp._renderX, rp._renderY, rp.ang + bend, 0xd4a574, 0.9);
      }
    }

    /* Slime projectiles — uses the slime-projectile-v1 sheet via the
       slimeSprites loader, scaled down so the orb reads at ~50 px.
       We reap orphaned sprites whose proj is no longer in the
       simulator's array. */
    const slimeProjs = S.slimeProjectiles || [];
    const liveProjs = new Set(slimeProjs);
    for (let i = this.slimeProjSprites.length - 1; i >= 0; i--) {
      const entry = this.slimeProjSprites[i];
      if (!liveProjs.has(entry.proj) || !entry.sprite || entry.sprite.destroyed) {
        if (entry.sprite && !entry.sprite.destroyed) entry.sprite.destroy();
        if (entry.proj) entry.proj._pixiSprite = null;
        this.slimeProjSprites.splice(i, 1);
      }
    }
    /* Projectile rendering -- variants can override the slime-orb art
       per zone.  Resolves the active zone's variant (e.g. ember.fodder
       -> fireGoblin) and uses its projectile.tex if defined.  Rotation
       comes from the variant's baseAng so the sprite nose lines up
       with sp.ang regardless of the source pose. */
    let projTex = null;
    let projBaseAng = 0;
    let projScale = 0.08;
    const zoneOverrides = ZONE_VARIANT_MAP[S.currentZone] || null;
    if (zoneOverrides) {
      for (const baseArch of Object.keys(zoneOverrides)) {
        const variantKey = zoneOverrides[baseArch];
        const vSprites = variantSpritesFor(variantKey);
        const variant = MONSTER_VARIANTS[variantKey];
        const tex = vSprites && vSprites.projectile ? vSprites.projectile.get() : null;
        if (tex) {
          projTex = tex;
          projBaseAng = vSprites.projectile.baseAng || 0;
          projScale = (variant && variant.projectileScalePx ? variant.projectileScalePx : 16) / 256;
          break;
        }
      }
    }
    if (!projTex && hasSlimeState('projectile')) {
      projTex = getSlimeFrame('projectile', 0);
      projBaseAng = 0;
      /* 128 px source -> 0.2 = ~25 px on-screen.  0.08 (v2.1.79) was
         a 10 px dot -- so small the player couldn't see slime
         projectiles flying at all.  0.2 is the middle ground:
         clearly visible, still smaller than the slime body. */
      projScale = 0.2;
    }
    if (projTex) {
      for (const sp of slimeProjs) {
        let sprite = sp._pixiSprite;
        if (!sprite || sprite.destroyed) {
          sprite = new Sprite(projTex);
          sprite.anchor.set(0.5, 0.5);
          sprite.scale.set(projScale);
          this.projectileLayer.addChild(sprite);
          sp._pixiSprite = sprite;
          this.slimeProjSprites.push({ proj: sp, sprite });
        }
        if (sprite.texture !== projTex) {
          sprite.texture = projTex;
          sprite.scale.set(projScale);
        }
        sprite.x = sp.x;
        sprite.y = sp.y;
        sprite.rotation = projBaseAng !== 0 ? (sp.ang || 0) - projBaseAng : 0;
      }
    }
  }

  /** Push the projectile's current render position into a small
   *  ring-buffer trail on the projectile object, then draw the trail
   *  as fading line segments behind it.  Each successive segment is
   *  thinner + more transparent, so the streak reads as motion blur
   *  the eye strings into a linear path.
   *
   *  Trail position is captured ONCE per render frame.  At the
   *  arrow's typical speed (8 px/frame), an 8-point trail covers
   *  ~64 px = a clear streak that doesn't lag behind reality. */
  _updateProjectileTrail(p, gfx, fadeA, isOrb) {
    const TRAIL_LEN = 8;
    if (!p._trail) p._trail = [];
    /* Skip recording if we just teleported (e.g. zone change reset).
       A jump in distance > 80 px between samples means re-spawn. */
    const last = p._trail[p._trail.length - 1];
    if (last) {
      const dx = p._renderX - last.x;
      const dy = p._renderY - last.y;
      if (dx * dx + dy * dy > 80 * 80) p._trail.length = 0;
    }
    p._trail.push({ x: p._renderX, y: p._renderY });
    if (p._trail.length > TRAIL_LEN) p._trail.shift();
    if (p._trail.length < 2) return;
    /* Draw segments oldest -> newest.  i=1 at oldest segment,
       i=trail.length-1 at newest. */
    for (let i = 1; i < p._trail.length; i++) {
      const t = i / (p._trail.length - 1);   // 0..1, 1 = closest to head
      const a0 = p._trail[i - 1];
      const a1 = p._trail[i];
      gfx.moveTo(a0.x, a0.y);
      gfx.lineTo(a1.x, a1.y);
      gfx.stroke({
        /* Dark brown for arrows, lighter for orbs. */
        color: isOrb ? 0xc8c8d0 : 0x5a3820,
        width: 0.4 + t * 1.6,
        alpha: fadeA * (0.05 + t * 0.45),
      });
    }
  }

  /** Trace a closed polygon path via moveTo/lineTo and fill it.
   *  More reliable than gfx.poly() in Pixi v8 — earlier version
   *  used poly() and arrows rendered invisible. */
  _fillPoly(gfx, pts, color, alpha) {
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.fill({ color, alpha });
  }

  /** Draw a detailed arrow centered on (cx, cy) rotated by `ang`.
   *  Body is 16 px long: dark brown shaft + lighter brown highlight
   *  strip + brown arrowhead + brown fletching.  Matches the stuck-
   *  arrow rendering so a live arrow and a stuck one read as the
   *  same wooden missile. */
  _drawArrow(gfx, cx, cy, ang, headColor /* unused — kept for signature compat */, alpha) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    /* Shaft 16 px long, 3 px wide — dark brown wood. */
    this._fillPoly(gfx, [pt(-8, -1.5), pt(8, -1.5), pt(8, 1.5), pt(-8, 1.5)], 0x3a2210, alpha);
    /* Highlight strip across the top half of the shaft for relief —
       same recipe as the stuck arrow. */
    this._fillPoly(gfx, [pt(-8, -1.5), pt(8, -1.5), pt(8, -0.7), pt(-8, -0.7)], 0x5a3820, alpha * 0.85);
    /* Arrowhead triangle — lighter brown to read as a metal-ish tip
       on the wooden shaft. */
    this._fillPoly(gfx, [pt(9, 0), pt(5, -3.5), pt(5, 3.5)], 0x6a4830, alpha);
    /* Fletching at the tail end — slightly warmer brown. */
    this._fillPoly(gfx, [pt(-8, -2.5), pt(-5, -2.5), pt(-5, -1), pt(-8, -1)], 0x5a3820, alpha * 0.85);
    this._fillPoly(gfx, [pt(-8, 1), pt(-5, 1), pt(-5, 2.5), pt(-8, 2.5)], 0x5a3820, alpha * 0.85);
  }

  /** Stuck arrow on a monster — half-length, fletching at the air end,
   *  arrowhead buried in the body.  Center (cx, cy) is the impact point. */
  _drawStuckArrow(gfx, cx, cy, ang, color) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    /* Shaft 13 px out, 2.4 px wide. */
    this._fillPoly(gfx, [pt(-11, -1.2), pt(2, -1.2), pt(2, 1.2), pt(-11, 1.2)], 0x3a2210, 0.9);
    /* Highlight strip along the top half of the shaft for relief. */
    this._fillPoly(gfx, [pt(-11, -1.2), pt(2, -1.2), pt(2, -0.4), pt(-11, -0.4)], 0x5a3820, 0.85);
    /* Fletching at the tail end. */
    this._fillPoly(gfx, [pt(-11, -3), pt(-8, -3), pt(-8, -1.5), pt(-11, -1.5)], color, 0.8);
    this._fillPoly(gfx, [pt(-11, 1.5), pt(-8, 1.5), pt(-8, 3), pt(-11, 3)], color, 0.8);
    /* Tip just protruding from the body. */
    this._fillPoly(gfx, [pt(3, 0), pt(1.5, -2), pt(1.5, 2)], color, 0.95);
  }

  /** Embedded magic shard from a staff bolt. */
  _drawStuckMagicShard(gfx, cx, cy, ang, color) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    this._fillPoly(gfx, [pt(4, 0), pt(-2, -2), pt(-2, 2)], color, 0.66);
    gfx.circle(cx, cy, 3);
    gfx.fill({ color, alpha: 0.27 });
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

    /* Bow / staff line of sight — a beam-shaped ribbon (filled
       polygon) running along the aim direction, drawn while the
       bow/staff is the active slot AND the player is aiming, locked
       on, or auto-attacking.  The two long edges are sine-wavy and
       the wave PHASE shifts with `now`, so the borders shimmer +
       drift along the beam — reads like a flowing energy stream
       rather than a hard hitscan line.  Top and bottom edges run
       180° out of phase so the beam pulses width-wise. */
    {
      const slot = S.rpg && S.rpg.activeSlot;
      const isRanged = slot === 'ranged' || slot === 'staff';
      const isLocked = !!(S.lockedTarget && S.lockedTarget.ref);
      if (isRanged && (S._aiming || isLocked || S.autoAttack) && S.player) {
        const P = S.player;
        let aimA;
        if (isLocked) {
          const lt = S.lockedTarget.ref;
          aimA = Math.atan2((lt.y || 0) - P.y, (lt.x || 0) - P.x);
        } else if (S._aimAngle != null) {
          aimA = S._aimAngle;
        } else {
          aimA = 0;
        }
        const lineLen = 280;
        const halfW = 2;          // half-width of beam at neutral
        const waveAmp = 1.6;      // edge wave amplitude in px
        const waveLen = 42;       // px per wave cycle along the beam
        const phase = (now / 600) * Math.PI * 2;  // ~600 ms per wave-shift
        const segments = 24;
        const cosA = Math.cos(aimA), sinA = Math.sin(aimA);
        // Perpendicular unit vector (rotate aim by +90°).
        const perpX = -sinA, perpY = cosA;
        const top = [];
        const bot = [];
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const dist = t * lineLen;
          const bx = P.x + cosA * dist;
          const by = P.y + sinA * dist;
          // Wave moves backward along the beam over time (phase increases).
          const wavePos = (dist / waveLen) * Math.PI * 2 - phase;
          const topW = halfW + Math.sin(wavePos) * waveAmp;
          const botW = halfW + Math.sin(wavePos + Math.PI) * waveAmp;
          top.push(bx + perpX * topW, by + perpY * topW);
          bot.push(bx - perpX * botW, by - perpY * botW);
        }
        // Build closed polygon: top forward, then bottom in reverse.
        gfx.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) gfx.lineTo(top[i], top[i + 1]);
        for (let i = bot.length - 2; i >= 0; i -= 2) gfx.lineTo(bot[i], bot[i + 1]);
        gfx.closePath();
        gfx.fill({ color: 0xffffff, alpha: 0.2 });
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

  /** Build (or reposition) a chat bubble for `key` over `(sx, sy)` —
   *  white rounded rectangle background + pointer tip + text.  Pooled
   *  per key as { container, bg (Graphics), text (Text), hasEmoji }
   *  in this.chatTexts.  Source can be either a player or an NPC. */
  _renderChatBubble(key, sx, sy, text, age, totalMs = 5000) {
    const hasEmoji = !isAsciiOnly(text);
    let entry = this.chatTexts.get(key);
    if (entry && entry.text && entry.text.destroyed) {
      this.chatTexts.delete(key);
      entry = null;
    }
    if (!entry || entry.hasEmoji !== hasEmoji) {
      if (entry && entry.container && !entry.container.destroyed) entry.container.destroy({ children: true });
      const container = new Container();
      const bg = new Graphics();
      container.addChild(bg);
      const baseStyle = hasEmoji ? LABEL_STYLE_EMOJI : LABEL_STYLE;
      const txt = new Text({
        text: '',
        style: { ...baseStyle, fontSize: 11, fill: '#1a1428',
                 wordWrap: true, wordWrapWidth: 140 },
      });
      txt.anchor.set(0.5, 0);
      container.addChild(txt);
      entry = { container, bg, text: txt, hasEmoji, lastText: '' };
      this.overlayLayer.addChild(container);
      this.chatTexts.set(key, entry);
    }
    /* Update text content + recompute bg only when text changed. */
    if (entry.lastText !== text) {
      entry.lastText = text;
      entry.text.text = text;
      const tw = entry.text.width;
      const th = entry.text.height;
      const padX = 8, padY = 6, tipH = 6, radius = 8;
      const bw = Math.min(160, tw + padX * 2);
      const bh = th + padY * 2;
      entry.bg.clear();
      entry.bg.roundRect(-bw / 2, -bh - tipH, bw, bh, radius);
      entry.bg.fill({ color: 0xffffff, alpha: 0.92 });
      /* Pointer tip — small downward triangle from the bubble bottom
         to a point at (0, 0) which is the source's top-of-head. */
      entry.bg.moveTo(-5, -tipH);
      entry.bg.lineTo(0, 0);
      entry.bg.lineTo(5, -tipH);
      entry.bg.lineTo(-5, -tipH);
      entry.bg.fill({ color: 0xffffff, alpha: 0.92 });
      /* Center the text inside the bubble. */
      entry.text.x = 0;
      entry.text.y = -bh - tipH + padY;
    }
    entry.container.x = sx;
    entry.container.y = sy - 32;
    entry.container.alpha = age > totalMs - 500 ? (totalMs - age) / 500 : 1;
    entry.container.visible = true;
    return entry;
  }

  _updateChatBubbles(S, now) {
    const bubbles = S.chatBubbles || {};
    const activeKeys = new Set();

    /* Player + others' bubbles. */
    const allSources = { [S.myId]: S.player };
    for (const [id, o] of Object.entries(S.others || {})) {
      allSources[id] = o;
    }
    for (const [pid, bubble] of Object.entries(bubbles)) {
      if (!bubble || !bubble.text) continue;
      const age = now - bubble.ts;
      if (age > 5000) continue;
      const source = allSources[pid];
      if (!source) continue;
      const sx = source.renderX || source.x || 0;
      const sy = source.renderY || source.y || 0;
      this._renderChatBubble(pid, sx, sy, bubble.text, age);
      activeKeys.add(pid);
    }

    /* NPC bubbles — entity-bound, lives on npc.chatBubble.
       Keyed with 'npc:' prefix to avoid colliding with player IDs. */
    for (const npc of (S.npcs || [])) {
      if (!npc || !npc.chatBubble || !npc.chatBubble.text) continue;
      const age = now - npc.chatBubble.ts;
      if (age > 5000) continue;
      const key = 'npc:' + npc.id;
      this._renderChatBubble(key, npc.x, npc.y, npc.chatBubble.text, age);
      activeKeys.add(key);
    }

    /* Hide stale; drop references to anything destroyed externally. */
    for (const [key, entry] of this.chatTexts) {
      if (!entry || !entry.container || entry.container.destroyed) {
        this.chatTexts.delete(key);
        continue;
      }
      if (!activeKeys.has(key)) entry.container.visible = false;
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

  /* ── Ground Loot ──
   * Each loot entry gets:
   *   - Procedural draw on the shared lootGfx (glow, ring, coin stack).
   *   - Optional Sprite (slime remnants splat).
   *   - Optional Text labels (weapon name, coin count, death-drop
   *     timer + item count + bag emoji).
   * Texts are pooled per loot — created lazily, hidden when not
   *  applicable, destroyed when the loot expires/splices.
   */
  _disposeLoot(l) {
    if (l._pixiSprite && !l._pixiSprite.destroyed) l._pixiSprite.destroy();
    if (l._pixiLabel && !l._pixiLabel.destroyed) l._pixiLabel.destroy();
    if (l._pixiTimer && !l._pixiTimer.destroyed) l._pixiTimer.destroy();
    if (l._pixiCount && !l._pixiCount.destroyed) l._pixiCount.destroy();
    if (l._pixiIcon && !l._pixiIcon.destroyed) l._pixiIcon.destroy();
    if (l._pixiCoinSprite && !l._pixiCoinSprite.destroyed) l._pixiCoinSprite.destroy();
    if (l._pixiCoinLabel && !l._pixiCoinLabel.destroyed) l._pixiCoinLabel.destroy();
    l._pixiSprite = l._pixiLabel = l._pixiTimer = l._pixiCount = l._pixiIcon = null;
    l._pixiCoinSprite = l._pixiCoinLabel = null;
  }

  /** Draw a gold-coin sprite + "<n>G" label centered at (l.x, anchorY),
   *  layered ABOVE any remnants/wreck sprite already added for this loot
   *  entry.  Uses dedicated _pixiCoinSprite / _pixiCoinLabel slots so it
   *  doesn't collide with the remnants' _pixiSprite. */
  _renderCoinOverlay(l, anchorY, alpha) {
    const goldTex = POPUP_ICONS.gold;
    if (goldTex) {
      if (!l._pixiCoinSprite || l._pixiCoinSprite.destroyed) {
        const sp = new Sprite(goldTex);
        sp.anchor.set(0.5, 0.5);
        this.lootLayer.addChild(sp);
        l._pixiCoinSprite = sp;
      }
      l._pixiCoinSprite.x = l.x;
      l._pixiCoinSprite.y = anchorY;
      l._pixiCoinSprite.alpha = alpha;
      l._pixiCoinSprite.scale.set(12 / (l._pixiCoinSprite.texture.width || 12));
      l._pixiCoinSprite.visible = true;
    }
    if (!l._pixiCoinLabel || l._pixiCoinLabel.destroyed) {
      l._pixiCoinLabel = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700', fill: '#f5c542' } });
      l._pixiCoinLabel.anchor.set(0.5, 0);
      this.lootLayer.addChild(l._pixiCoinLabel);
    }
    const cStr = l.coins + 'G';
    if (l._pixiCoinLabel.text !== cStr) l._pixiCoinLabel.text = cStr;
    l._pixiCoinLabel.x = l.x;
    l._pixiCoinLabel.y = anchorY + 7;
    l._pixiCoinLabel.alpha = alpha;
  }

  _updateGroundLoot(S, now) {
    const gfx = this.lootGfx;
    gfx.clear();

    const loot = S.groundLoot || [];
    /* Track which loot entries we've created Pixi children for so we
       can dispose orphans.  When the player picks loot up, BroTown
       removes the entry from S.groundLoot — without this set we'd
       never see those entries again and their pooled Sprite/Text
       children would leak in the lootLayer (visible as a "stuck"
       slime remnant splat after pickup). */
    if (!this._knownLoot) this._knownLoot = new Set();
    const activeLoot = new Set();

    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      const age = (now - l.ts) / 1000;
      if (l._expired || age > 30) {
        this._disposeLoot(l);
        this._knownLoot.delete(l);
        loot.splice(i, 1);
        continue;
      }
      activeLoot.add(l);
      this._knownLoot.add(l);
      /* Fodder + variant loot has no bob; it's a settled puddle/pile. */
      const isFodder = l.skull === 'fodder' || !!MONSTER_VARIANTS[l.skull];
      const bob = isFodder ? 0 : Math.sin(age * 3) * 2;
      const alpha = age > 25 ? (30 - age) / 5 : 1;

      if (l.isDeathDrop) {
        /* Pulsing red-orange aura that gets faster + brighter as the
           grace timer ticks down.  Sense of urgency for the player to
           grab their loot before it despawns. */
        const timeLeft = l.expiry ? (l.expiry - Date.now()) / 1000 : 30;
        const urgency = Math.max(0, Math.min(1, 1 - timeLeft / 30));
        const pulseRate = 2 + urgency * 6;
        const auraAlpha = (0.2 + Math.sin(age * pulseRate) * 0.15 + urgency * 0.2) * alpha;
        gfx.circle(l.x, l.y + bob, 18);
        gfx.fill({ color: 0xea580c, alpha: auraAlpha });
        const ringColor = urgency > 0.7 ? 0xff5e6c : 0xea580c;
        gfx.circle(l.x, l.y + bob, 15);
        gfx.stroke({ color: ringColor, width: 2, alpha });
        /* Bag emoji icon. */
        if (!l._pixiIcon || l._pixiIcon.destroyed) {
          l._pixiIcon = new Text({ text: '💀', style: { ...LABEL_STYLE_EMOJI, fontSize: 18 } });
          l._pixiIcon.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(l._pixiIcon);
        }
        l._pixiIcon.x = l.x;
        l._pixiIcon.y = l.y + 6 + bob;
        l._pixiIcon.alpha = alpha;
        /* Timer text below. */
        if (!l._pixiTimer || l._pixiTimer.destroyed) {
          l._pixiTimer = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 8, fontWeight: '700' } });
          l._pixiTimer.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiTimer);
        }
        const tStr = Math.ceil(timeLeft) + 's';
        if (l._pixiTimer.text !== tStr) l._pixiTimer.text = tStr;
        l._pixiTimer.style.fill = urgency > 0.7 ? '#ff5e6c' : '#ea580c';
        l._pixiTimer.x = l.x;
        l._pixiTimer.y = l.y + 22 + bob;
        l._pixiTimer.alpha = alpha;
        /* Item count above. */
        if (!l._pixiCount || l._pixiCount.destroyed) {
          l._pixiCount = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700' } });
          l._pixiCount.anchor.set(0.5, 1);
          this.lootLayer.addChild(l._pixiCount);
        }
        const itemTotal = (l.deathItems || []).reduce((s, it) => s + (it.qty || 0), 0);
        const cStr = itemTotal + ' items';
        if (l._pixiCount.text !== cStr) l._pixiCount.text = cStr;
        l._pixiCount.x = l.x;
        l._pixiCount.y = l.y - 12 + bob;
        l._pixiCount.alpha = alpha;
        if (timeLeft <= 0) l._expired = true;
        continue;
      }

      if (l.isWeapon && l.weapon) {
        /* Tier-colored aura + ring + emoji + name label. */
        const tierColor = cssToHex(l.tierColor || '#8890b8');
        const auraPulse = 0.3 + Math.sin(age * 4) * 0.15;
        gfx.circle(l.x, l.y + bob, 14);
        gfx.fill({ color: tierColor, alpha: auraPulse * alpha });
        gfx.circle(l.x, l.y + bob, 12);
        gfx.stroke({ color: tierColor, width: 2, alpha });
        /* Weapon icon (emoji). */
        if (!l._pixiIcon || l._pixiIcon.destroyed) {
          const emoji = l.weapon.type === 'sword' ? '⚔️'
                      : l.weapon.type === 'bow'   ? '🏹'
                      : l.weapon.type === 'staff' ? '🪄'
                      : l.weapon.type === 'greatsword' ? '🗡️'
                      : '⚔️';
          l._pixiIcon = new Text({ text: emoji, style: { ...LABEL_STYLE_EMOJI, fontSize: 16 } });
          l._pixiIcon.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(l._pixiIcon);
        }
        l._pixiIcon.x = l.x;
        l._pixiIcon.y = l.y + 5 + bob;
        l._pixiIcon.alpha = alpha;
        /* Name label. */
        if (!l._pixiLabel || l._pixiLabel.destroyed) {
          l._pixiLabel = new Text({ text: l.weapon.name || '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700' } });
          l._pixiLabel.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiLabel);
        }
        if (l._pixiLabel.text !== (l.weapon.name || '')) l._pixiLabel.text = l.weapon.name || '';
        l._pixiLabel.style.fill = l.tierColor || '#8890b8';
        l._pixiLabel.x = l.x;
        l._pixiLabel.y = l.y + 18 + bob;
        l._pixiLabel.alpha = alpha;
        continue;
      }

      if (isFodder) {
        /* Pick the remnants art for this kill.  Variants supply their
           own remnants texture via variantSprites; raw fodder uses the
           slime splat.  Falls back to the slime sheet if the variant
           remnants haven't loaded yet. */
        const variant = MONSTER_VARIANTS[l.skull] || null;
        const variantSprites = variant ? variantSpritesFor(l.skull) : null;
        const variantRemnTex = variantSprites && variantSprites.remnants ? variantSprites.remnants.get() : null;
        const slimeRemnantsTex = hasSlimeState('remnants') ? getSlimeFrame('remnants', 0) : null;
        const remnTex = variantRemnTex || slimeRemnantsTex;
        if (remnTex) {
          if (!l._pixiSprite || l._pixiSprite.destroyed) {
            const sp = new Sprite(remnTex);
            sp.anchor.set(0.5, 0.5);
            this.lootLayer.addChild(sp);
            l._pixiSprite = sp;
          }
          if (l._pixiSprite.texture !== remnTex) l._pixiSprite.texture = remnTex;
          l._pixiSprite.x = l.x;
          l._pixiSprite.y = l.y + bob;
          l._pixiSprite.alpha = alpha;
          /* Slime splat renders at 48 px on-screen; variant remnants
             use their own remnantsScalePx (default 48). */
          const targetPx = variantRemnTex ? (variant.remnantsScalePx || 48) : 48;
          l._pixiSprite.scale.set(targetPx / (l._pixiSprite.texture.width || targetPx));
          l._pixiSprite.visible = true;
          /* Coin sits ON TOP of the remnants when gold rides on this drop.
             10 px above center so the player can see there's gold to grab
             without picking up the skull blindly. */
          if (l.coins) this._renderCoinOverlay(l, l.y - 10 + bob, alpha);
          continue;
        }
      }

      const snowmanRemnantsTex = l.skull === 'snowman' ? getSnowmanRemnantsTex() : null;
      if (snowmanRemnantsTex) {
        /* Snowman death-scene sprite (pooled per loot).  Larger than the
           slime splat — the art is a full broken-snowman scene.  No
           bob and no expiry-fade: the art reads as a settled wreck on
           the ground, not a hovering pickup. */
        if (!l._pixiSprite || l._pixiSprite.destroyed) {
          const sp = new Sprite(snowmanRemnantsTex);
          sp.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(sp);
          l._pixiSprite = sp;
        }
        l._pixiSprite.x = l.x;
        l._pixiSprite.y = l.y;
        l._pixiSprite.alpha = 1;
        l._pixiSprite.scale.set(48 / (l._pixiSprite.texture.width || 128));
        l._pixiSprite.visible = true;
        /* Coin sits on top of the wreck when gold rides on this drop. */
        if (l.coins) this._renderCoinOverlay(l, l.y - 14, alpha);
        continue;
      }

      /* Standard coin / xp drop — gold glow + multi-circle "stack" + count. */
      if (l.rare) {
        /* Rare loot — pulsing gold halo. */
        gfx.circle(l.x, l.y + bob, 16);
        gfx.fill({ color: 0xf5c542, alpha: 0.25 * alpha });
        gfx.circle(l.x, l.y + bob, 14);
        gfx.stroke({ color: 0xf5c542, width: 1.5, alpha: (0.4 + Math.sin(age * 4) * 0.3) * alpha });
      }
      if (l.coins) {
        /* Glow base. */
        gfx.circle(l.x, l.y + bob, 10);
        gfx.fill({ color: 0xf5c542, alpha: 0.3 * alpha });
        /* Coin icon sprite (matches HUD/popup gold icon).  Falls back
           to the procedural multi-circle stack while the PNG is loading. */
        const goldTex = POPUP_ICONS.gold;
        if (goldTex) {
          if (!l._pixiSprite || l._pixiSprite.destroyed) {
            const sp = new Sprite(goldTex);
            sp.anchor.set(0.5, 0.5);
            this.lootLayer.addChild(sp);
            l._pixiSprite = sp;
          }
          l._pixiSprite.x = l.x;
          l._pixiSprite.y = l.y + 3 + bob;
          l._pixiSprite.alpha = alpha;
          l._pixiSprite.scale.set(14 / (l._pixiSprite.texture.width || 14));
          l._pixiSprite.visible = true;
        } else {
          gfx.circle(l.x - 3, l.y + 2 + bob, 4);
          gfx.fill({ color: 0xf5c542, alpha });
          gfx.circle(l.x + 2, l.y + 3 + bob, 3.5);
          gfx.fill({ color: 0xe8b830, alpha });
          gfx.circle(l.x, l.y + 4 + bob, 3);
          gfx.fill({ color: 0xd4a020, alpha });
        }
        /* "<n>G" label. */
        if (!l._pixiLabel || l._pixiLabel.destroyed) {
          l._pixiLabel = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700', fill: '#f5c542' } });
          l._pixiLabel.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiLabel);
        }
        const cStr = l.coins + 'G';
        if (l._pixiLabel.text !== cStr) l._pixiLabel.text = cStr;
        l._pixiLabel.x = l.x;
        l._pixiLabel.y = l.y + 14 + bob;
        l._pixiLabel.alpha = alpha;
      }
      if (l.xp) {
        gfx.circle(l.x + 6, l.y + bob, 3);
        gfx.fill({ color: 0x5b52ff, alpha });
      }
    }

    /* Orphan sweep — anything we've rendered before that's no longer
       in the active loot list (picked up, despawned by gameplay code,
       etc.) gets its Pixi children disposed. */
    if (this._knownLoot.size > activeLoot.size) {
      for (const l of this._knownLoot) {
        if (!activeLoot.has(l)) {
          this._disposeLoot(l);
          this._knownLoot.delete(l);
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

  /* ── Gather Nodes ──
   * Per-node procedural body on the shared nodeGfx, plus pooled
   * Text objects on the node itself for the tier badge, the resource
   * emoji, and the 3-line proximity tooltip (shown when the player
   * is within 50 units).
   */
  _disposeNode(node) {
    if (node._pixiTier && !node._pixiTier.destroyed) node._pixiTier.destroy();
    if (node._pixiEmoji && !node._pixiEmoji.destroyed) node._pixiEmoji.destroy();
    if (node._pixiTip1 && !node._pixiTip1.destroyed) node._pixiTip1.destroy();
    if (node._pixiTip2 && !node._pixiTip2.destroyed) node._pixiTip2.destroy();
    if (node._pixiTip3 && !node._pixiTip3.destroyed) node._pixiTip3.destroy();
    if (node._pixiSprite && !node._pixiSprite.destroyed) node._pixiSprite.destroy();
    node._pixiTier = node._pixiEmoji = node._pixiTip1 = node._pixiTip2 = node._pixiTip3 = node._pixiSprite = null;
  }

  _updateGatherNodes(S, now) {
    const gfx = this.nodeGfx;
    gfx.clear();

    const nodes = S.gatherNodes;
    if (!nodes) return;

    /* Prune harvested nodes: dispose their Pixi children, then splice
       them out of S.gatherNodes so they don't accumulate frame after
       frame.  Without this, dead-but-still-in-array nodes left zombie
       sprites in the world (harvest didn't visually clear the resource)
       and crowded the proximity check, so the player would walk up to a
       dead-looking tree/ore and get no interaction prompt. */
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (!nodes[i].alive) {
        this._disposeNode(nodes[i]);
        nodes.splice(i, 1);
      }
    }

    /* Player position for proximity-tooltip distance test. */
    const px = S.player ? S.player.x : 0;
    const py = S.player ? S.player.y : 0;

    for (const node of nodes) {
      /* Array is pre-filtered to alive nodes above. */

      const tier = node._tier;
      const tierLvl = node.gatherLvl || 1;
      const tierStep = Math.min(10, Math.max(1, Math.ceil(tierLvl / 10)));

      const spriteTex = NODE_SPRITE_TEX[node.nodeType];
      if (spriteTex) {
        if (!node._pixiSprite || node._pixiSprite.destroyed) {
          node._pixiSprite = new Sprite(spriteTex);
          node._pixiSprite.anchor.set(0.5, NODE_SPRITE_ANCHOR_Y[node.nodeType] ?? 0.5);
          /* Add at bottom of nodeLayer so the tier badge, emoji, and
             proximity tips (added with plain addChild elsewhere) stack
             above every sprite. */
          this.nodeLayer.addChildAt(node._pixiSprite, 0);
        }
        const targetH = (NODE_SPRITE_HEIGHT_BASE[node.nodeType] ?? 24) * (1 + (tierStep - 1) * 0.15);
        const baseScale = targetH / spriteTex.height;
        /* Restore the gentle breathe-pulse the old procedural pond had. */
        const pulse = node.nodeType === 'fishSpot' ? (1 + Math.sin(now / 600 + node.x) * 0.04) : 1;
        node._pixiSprite.scale.set(baseScale * pulse);
        node._pixiSprite.x = node.x;
        node._pixiSprite.y = node.y;
      } else if (node.nodeType === 'tree') {
        const tw = tier?.trunkW || 3;
        const th = tier?.trunkH || 8;
        const cr = tier?.canopyR || 6;
        gfx.rect(node.x - tw / 2, node.y - th, tw, th);
        gfx.fill({ color: cssToHex(tier?.trunkColor || '#3a2810') });
        gfx.circle(node.x, node.y - th - cr * 0.5, cr);
        gfx.fill({ color: cssToHex(tier?.canopyColor || '#2a7a1a') });
      } else if (node.nodeType === 'fishSpot') {
        const pulse = Math.sin(now / 600 + node.x) * 0.2 + 1;
        const r = (tier?.size || 6) * pulse;
        gfx.circle(node.x, node.y, r);
        gfx.fill({ color: 0x3498db, alpha: 0.35 });
        gfx.circle(node.x, node.y, r * 0.6);
        gfx.fill({ color: 0x3498db, alpha: 0.2 });
      } else {
        const size = tier?.size || 8;
        gfx.circle(node.x, node.y, size / 2);
        gfx.fill({ color: cssToHex(tier?.rockColor || '#6a6a6a') });
        gfx.circle(node.x + 2, node.y - 1, size / 4);
        gfx.fill({ color: cssToHex(tier?.streakColor || '#8a8a8a') });
      }

      /* HP bar — width scales with tier so high-tier nodes get a
         more visible damage indicator. */
      if (node.hp < node.maxHp) {
        const pct = node.hp / node.maxHp;
        const barW = 14 + tierStep * 4;
        gfx.rect(node.x - barW / 2, node.y + 8 + tierStep * 2, barW, 3);
        gfx.fill({ color: 0x000000, alpha: 0.5 });
        gfx.rect(node.x - barW / 2, node.y + 8 + tierStep * 2, barW * pct, 3);
        gfx.fill({ color: 0x3dd497 });
      }

      /* Tier badge — small dot to the upper-right with the gatherLvl
         number on top.  Always visible so the player can see which
         resources are higher level at a glance. */
      const tierColor = '#8890b8';   // RESOURCE_TIERS lookup happens in BroTown.jsx; default ok
      gfx.circle(node.x + 10 + tierStep * 2, node.y - 8, 4);
      gfx.fill({ color: cssToHex(tierColor), alpha: 0.9 });
      if (!node._pixiTier || node._pixiTier.destroyed) {
        node._pixiTier = new Text({
          text: '',
          style: { fontFamily: 'VT323, monospace', fontSize: 8, fontWeight: '700',
                   fill: '#ffffff', align: 'center' },
        });
        node._pixiTier.anchor.set(0.5, 0.5);
        this.nodeLayer.addChild(node._pixiTier);
      }
      const tierStr = String(tierLvl);
      if (node._pixiTier.text !== tierStr) node._pixiTier.text = tierStr;
      node._pixiTier.x = node.x + 10 + tierStep * 2;
      node._pixiTier.y = node.y - 7;

      /* Emoji label above the node — node.emoji set by gameplay code. */
      if (node.emoji) {
        if (!node._pixiEmoji || node._pixiEmoji.destroyed) {
          node._pixiEmoji = new Text({
            text: node.emoji,
            style: { ...LABEL_STYLE_EMOJI, fontSize: 8 + tierStep * 2 },
          });
          node._pixiEmoji.anchor.set(0.5, 1);
          this.nodeLayer.addChild(node._pixiEmoji);
        }
        if (node._pixiEmoji.text !== node.emoji) node._pixiEmoji.text = node.emoji;
        node._pixiEmoji.x = node.x;
        node._pixiEmoji.y = node.y - (10 + tierStep * 3);
      }

      /* Proximity tooltip — 3 lines of info shown when player is
         within 50 units.  Shown/hidden via .visible to avoid the
         per-frame Text construction cost. */
      const dx = px - node.x, dy = py - node.y;
      const near = dx * dx + dy * dy < 50 * 50;
      if (near) {
        const skill = node.skill || 'mining';
        const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
        const skillLvl = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills[skill]?.level) || 1;
        const verb = skill === 'woodcutting' ? 'Chop' : skill === 'fishing' ? 'Fish' : 'Mine';

        const yBase = node.y + 18 + tierStep * 2;
        const ensureTip = (key, text, color, dy) => {
          let t = node[key];
          if (!t || t.destroyed) {
            t = new Text({
              text: '',
              style: { fontFamily: 'VT323, monospace', fontSize: 7, fontWeight: '700',
                       fill: color, align: 'center' },
            });
            t.anchor.set(0.5, 0);
            this.nodeLayer.addChild(t);
            node[key] = t;
          }
          if (t.text !== text) t.text = text;
          t.style.fill = color;
          t.x = node.x;
          t.y = yBase + dy;
          t.visible = true;
        };
        ensureTip('_pixiTip1', node.spotName || node.name || '', '#ffffffb3', 0);
        ensureTip('_pixiTip2', `${node.name || ''} (Lv${tierLvl})`, '#ffffff80', 8);
        ensureTip('_pixiTip3', `${verb} (${skillLabel} Lv${skillLvl})`, '#3dd497', 16);
      } else {
        if (node._pixiTip1) node._pixiTip1.visible = false;
        if (node._pixiTip2) node._pixiTip2.visible = false;
        if (node._pixiTip3) node._pixiTip3.visible = false;
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
    /* Icons live on dmg entries (dmg._pixiIcon) which are owned by
       game state, not this list. Walking the dmgLayer is the most
       reliable way to drop any orphaned icon Sprites on clear. */
    for (let i = this.dmgLayer.children.length - 1; i >= 0; i--) {
      const c = this.dmgLayer.children[i];
      if (c instanceof Sprite && !c.destroyed) c.destroy();
    }
    for (const [, entry] of this.chatTexts) {
      /* Entry shape changed (now { container, bg, text, ... }); destroy the
         container which cascades to its children. */
      if (entry && entry.container && !entry.container.destroyed) {
        entry.container.destroy({ children: true });
      }
    }
    this.chatTexts.clear();
    if (this._levelText) { this._levelText.destroy(); this._levelText = null; }
  }
}
