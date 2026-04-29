/* ═══ CANVAS 2D RENDERER ═══ */
/* Bulk extracted from gameLoop.js lines 4710-10726 */
/* This contains all 26+ Canvas 2D render systems. */
/* Target for replacement with PixiJS. */

import {
  TILE, ZONES, ELEMENTS, TOWN_BUILDINGS,
  FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS,
  ZONE_RESOURCES,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, RARITY_TIERS,
  ARCHETYPES, BT_AUDIO,
  TILE_SOLID, TILE_COLORS, NPC_DATA, BUILDINGS,
  COLS, ROWS, TOWN_W, TOWN_H,
  MASKS, ELEMENTAL_MINIGAMES,
  QUEST_CHAINS, QUEST_STATUS, CLAN_COLORS, REPUTATION,
  getTileColor, drawMask, getStatVisuals,
  getShieldStats, getAmuletBonus,
  SKILL_GUILDS, GUILD_RANKS,
  AMULET_TIERS, AMULET_GEM_STATS, SHIELD_GEM_STATS,
  TOWN_EXITS, DEPTH_CONFIG, DEPTH_TIERS,
  PLAYER_COLORS, PLAYER_COLORS as _PC,
  getActiveWeapon,
  TORCH_RADIUS_BASE, DARKNESS_RADIUS,
  flavorName,
  ELEMENT_FLAVOR,
  RESOURCE_TIERS,
  getEffectiveness,
  spawnWeaponHitFX, spawnElementStatusFX, getElementDeathFX, getCollisionDeathFX,
  LIFE_SKILLS,
} from "@/data/index.js";

import { wsrvUrl } from "@/networking/index.js";

/* Babel helpers */
function _slicedToArray(r, e) { if (Array.isArray(r)) return r; if (Symbol.iterator in Object(r)) { const a = []; let f = true; const t = r[Symbol.iterator](); for (let n; !(f = (n = t.next()).done) && (a.push(n.value), a.length !== e); f = true); return a; } }
function _typeof(o) { return typeof o; }

/**
 * Renders one frame of the game using Canvas 2D.
 * Called from the game loop after simulation has updated state.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} S - Game state (stateRef.current)
 * @param {number} W - Viewport width (logical pixels)
 * @param {number} H - Viewport height (logical pixels)
 * @param {Object} P - Player object (S.player)
 * @param {Object} K - Keys state (S.keys)
 * @param {Array} map - Current zone tile map (S.map)
 * @param {Array} nfts - NFT catalogue array
 */
export function renderFrame(ctx, canvas, S, W, H, P, K, map, nfts) {
        /* ── RENDER ── */
        /* Screen shake */
        var shakeX = 0,
          shakeY = 0;
        if (S.screenShake > 0.1) {
          shakeX = (Math.random() - 0.5) * S.screenShake * 2;
          shakeY = (Math.random() - 0.5) * S.screenShake * 2;
          S.screenShake *= 0.85; /* decay */
        } else {
          S.screenShake = 0;
        }
        ctx.save();
        ctx.translate(shakeX, shakeY);
        ctx.clearRect(-10, -10, W + 20, H + 20);
        var now = Date.now(); /* cached once per frame — was called 64 times */
        var cx = S.camera.x,
          cy = S.camera.y;

        /* Tiles */
        var startCol = Math.max(0, Math.floor(cx / TILE));
        var endCol = Math.min(COLS - 1, Math.floor((cx + W) / TILE));
        var startRow = Math.max(0, Math.floor(cy / TILE));
        var endRow = Math.min(ROWS - 1, Math.floor((cy + H) / TILE));

        /* Day/night cycle disabled per user request — perpetual daylight.
           Stub the cache so any code reading it still works. */
        if (!S._dayNightCache) {
          S._dayNightCache = { nightAlpha: 0, ts: now };
        }
        var nightAlpha = 0;
        var zoneElem = ((_ZONES$S$currentZone8 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone8 === void 0 ? void 0 : _ZONES$S$currentZone8.element) || null;
        var _loop2 = function _loop2(r) {
          var _loop3 = function _loop3(cl) {
            var _map$r;
            var tile = (_map$r = map[r]) === null || _map$r === void 0 ? void 0 : _map$r[cl];
            if (tile === undefined) return 1; // continue
            var sx = cl * TILE - cx,
              sy = r * TILE - cy;

            /* Zone-tinted base colors */
            if (tile === 0 || tile === 5) {
              /* Grass — zone palette with subtle texture variation */
              var baseGreen = getTileColor(0, S.currentZone);
              var shade = (cl * 17 + r * 31) % 5;
              ctx.fillStyle = baseGreen;
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              /* Grass texture — small darker/lighter patches */
              ctx.fillStyle = "rgba(0,0,0,".concat(0.02 + shade * 0.01, ")");
              if (shade < 2) ctx.fillRect(sx + 4 + shade * 3, sy + 2 + shade * 5, 6, 5);
              if (shade > 2) ctx.fillRect(sx + 12 + shade * 2, sy + 14 + shade * 3, 5, 4);

              /* ═══ ZONE-SPECIFIC GROUND DETAILS — rendered every other frame for performance ═══ */
              var _ze = zoneElem;
              if (_ze && S._frameCount % 2 === 0) { if (_ze === 'flame') {
                /* Scorched cracks and ember glow spots */
                if ((cl * 13 + r * 29) % 7 === 0) {
                  ctx.strokeStyle = 'rgba(180,60,10,.2)';
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.moveTo(sx + 4, sy + 6);
                  ctx.lineTo(sx + TILE - 3, sy + TILE - 4);
                  ctx.stroke();
                }
                if ((cl + r * 3) % 11 === 0) {
                  ctx.fillStyle = "rgba(255,100,20,".concat(0.08 + Math.sin(now / 800 + cl + r) * 0.04, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 3 + Math.sin(now / 600 + cl) * 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (_ze === 'frost') {
                /* Ice crystal patterns on ground */
                if ((cl * 7 + r * 11) % 5 === 0) {
                  ctx.fillStyle = 'rgba(200,230,255,.12)';
                  ctx.fillRect(sx + 8, sy + 4, 8, 2);
                  ctx.fillRect(sx + 11, sy + 2, 2, 6);
                }
                /* Frost sparkle */
                if ((cl + r) % 9 === 0) {
                  var fsp = Math.sin(now / 400 + cl * 2 + r) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(220,240,255,".concat(fsp * 0.2, ")");
                  ctx.beginPath();
                  ctx.arc(sx + 10 + cl % 8, sy + 12 + r % 6, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (_ze === 'venom') {
                /* Toxic puddle sheen and spore dots */
                if ((cl * 9 + r * 17) % 13 === 0) {
                  ctx.fillStyle = 'rgba(60,180,60,.08)';
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 5, 0, Math.PI * 2);
                  ctx.fill();
                }
                if ((cl + r * 5) % 7 === 0) {
                  ctx.fillStyle = 'rgba(80,220,80,.15)';
                  ctx.beginPath();
                  ctx.arc(sx + 6 + cl % 12, sy + 8 + r % 10, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (_ze === 'storm') {
                /* Lightning scorch marks */
                if ((cl * 11 + r * 23) % 17 === 0) {
                  ctx.strokeStyle = 'rgba(140,100,200,.15)';
                  ctx.lineWidth = 0.7;
                  ctx.beginPath();
                  ctx.moveTo(sx + TILE / 2, sy + 2);
                  ctx.lineTo(sx + TILE / 2 + 3, sy + TILE / 2);
                  ctx.lineTo(sx + TILE / 2 - 2, sy + TILE - 3);
                  ctx.stroke();
                }
              } else if (_ze === 'stone') {
                /* Gravel texture and mineral glints */
                if ((cl + r) % 3 === 0) {
                  ctx.fillStyle = 'rgba(100,90,70,.12)';
                  ctx.fillRect(sx + 3 + cl % 5, sy + 4 + r % 6, 3, 2);
                  ctx.fillRect(sx + 14 + cl % 4, sy + 16 + r % 3, 2, 2);
                }
              } else if (_ze === 'wind') {
                /* Wind streaks — horizontal lines */
                if ((cl + r * 3) % 5 === 0) {
                  ctx.strokeStyle = 'rgba(180,200,220,.1)';
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.moveTo(sx, sy + 10 + r % 8);
                  ctx.lineTo(sx + TILE, sy + 8 + r % 10);
                  ctx.stroke();
                }
              } else if (_ze === 'water') {
                /* Damp sheen */
                if ((cl * 3 + r * 7) % 5 === 0) {
                  ctx.fillStyle = 'rgba(60,140,200,.06)';
                  ctx.fillRect(sx + 2, sy + 6, TILE - 4, 3);
                }
              } else if (_ze === 'dark') {
                /* Creeping shadow tendrils */
                if ((cl + r * 7) % 6 === 0) {
                  ctx.fillStyle = "rgba(20,10,40,".concat(0.12 + Math.sin(now / 1200 + cl * 3 + r * 5) * 0.06, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 4 + Math.sin(now / 900 + r) * 2, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (_ze === 'light') {
                /* Golden shimmer patches */
                if ((cl + r * 3) % 5 === 0) {
                  var gShim = Math.sin(now / 600 + cl * 2 + r * 3) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(245,200,60,".concat(gShim * 0.08, ")");
                  ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
                }
              } else {
                /* Default grass blades for town/meadow */
                if ((cl + r * 7) % 3 === 0) {
                  ctx.strokeStyle = 'rgba(80,160,50,.15)';
                  ctx.lineWidth = 0.5;
                  var gx = sx + 8 + cl * 13 % 12,
                    gy = sy + 20 + r * 17 % 8;
                  ctx.beginPath();
                  ctx.moveTo(gx, gy);
                  ctx.lineTo(gx + Math.sin(now / 1500 + cl) * 1, gy - 4);
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(gx + 3, gy + 1);
                  ctx.lineTo(gx + 3 + Math.sin(now / 1800 + r) * 1, gy - 3);
                  ctx.stroke();
                }
              }
              } /* end zone detail frame skip */
            } else if (tile === 8) {
              /* Zone exit — glowing portal */
              var _pulse2 = Math.sin(now / 300 + cl + r) * 0.15 + 0.85;
              var exit = TOWN_EXITS.find(function (ex) {
                return Math.abs(ex.tx - cl) <= 1 && Math.abs(ex.ty - r) <= 1;
              });
              ctx.fillStyle = exit ? exit.color : '#5b52ff';
              ctx.globalAlpha = _pulse2 * 0.6;
              ctx.fillRect(sx - 2, sy - 2, TILE + 5, TILE + 5);
              ctx.globalAlpha = 1.0;
            } else if (tile === 9) {
              /* Return to town exit — green glow */
              var _pulse3 = Math.sin(now / 400 + cl) * 0.2 + 0.8;
              ctx.fillStyle = '#3dd497';
              ctx.globalAlpha = _pulse3 * 0.5;
              ctx.fillRect(sx - 2, sy - 2, TILE + 5, TILE + 5);
              ctx.globalAlpha = 1.0;
            } else if (tile === 10) {
              var _ZONES$S$currentZone13, _ELEMENTS$ZONES$S$cur2;
              /* Dungeon entrance — dramatic swirling portal */
              var _dPulse = Math.sin(now / 250 + cl * 2) * 0.25 + 0.75;
              var _dElemCol = (_ZONES$S$currentZone13 = ZONES[S.currentZone]) !== null && _ZONES$S$currentZone13 !== void 0 && _ZONES$S$currentZone13.element ? ((_ELEMENTS$ZONES$S$cur2 = ELEMENTS[ZONES[S.currentZone].element]) === null || _ELEMENTS$ZONES$S$cur2 === void 0 ? void 0 : _ELEMENTS$ZONES$S$cur2.color) || '#ff5e6c' : '#ff5e6c';
              /* Outer glow — zone element colored */
              ctx.fillStyle = _dElemCol;
              ctx.globalAlpha = _dPulse * 0.15;
              ctx.beginPath();
              ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE * 1.2, 0, Math.PI * 2);
              ctx.fill();
              /* Red/purple base glow */
              ctx.fillStyle = '#ff5e6c';
              ctx.globalAlpha = _dPulse * 0.3;
              ctx.fillRect(sx - 3, sy - 3, TILE + 7, TILE + 7);
              ctx.globalAlpha = _dPulse * 0.2;
              ctx.fillStyle = '#a855f7';
              ctx.beginPath();
              ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE * 0.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1.0;
              /* Dark portal center — deeper void */
              var voidGrad = ctx.createRadialGradient(sx + TILE / 2, sy + TILE / 2, 0, sx + TILE / 2, sy + TILE / 2, TILE * 0.4);
              voidGrad.addColorStop(0, '#050010');
              voidGrad.addColorStop(1, '#1a0a2e');
              ctx.fillStyle = voidGrad;
              ctx.beginPath();
              ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE * 0.38, 0, Math.PI * 2);
              ctx.fill();
              /* Swirling orbit ring */
              ctx.strokeStyle = "rgba(168,85,247,".concat(0.3 + Math.sin(now / 200) * 0.15, ")");
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE * 0.55, now / 400, now / 400 + Math.PI * 1.4);
              ctx.stroke();
              /* Swirling particles — more and element-tinted */
              for (var dp = 0; dp < 5; dp++) {
                var dpa = now / 300 + dp * Math.PI * 2 / 5;
                var dpR = TILE * 0.45 + Math.sin(now / 200 + dp) * 3;
                var dpCol = dp % 2 === 0 ? 'rgba(255,94,108,.5)' : "rgba(168,85,247,.5)";
                ctx.fillStyle = dpCol;
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + Math.cos(dpa) * dpR, sy + TILE / 2 + Math.sin(dpa) * dpR, 1.5 + Math.sin(now / 150 + dp) * 0.5, 0, Math.PI * 2);
                ctx.fill();
              }
              /* Inner sparkle */
              var spkA = Math.sin(now / 100) * 0.5 + 0.5;
              ctx.fillStyle = "rgba(255,255,255,".concat(spkA * 0.3, ")");
              ctx.beginPath();
              ctx.arc(sx + TILE / 2 + Math.sin(now / 300) * 3, sy + TILE / 2 + Math.cos(now / 250) * 3, 1, 0, Math.PI * 2);
              ctx.fill();
            } else if (tile === 11) {
              /* Fence — chain-link barrier */
              ctx.fillStyle = S.currentZone === 'wasteland' ? '#2a2218' : getTileColor(0, S.currentZone);
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              ctx.fillStyle = '#4a4a4a';
              ctx.fillRect(sx, sy, 3, TILE);
              ctx.fillRect(sx + TILE - 3, sy, 3, TILE);
              ctx.fillStyle = '#5a5a5a';
              ctx.fillRect(sx, sy + 4, TILE, 2);
              ctx.fillRect(sx, sy + TILE / 2, TILE, 2);
              ctx.fillRect(sx, sy + TILE - 6, TILE, 2);
              ctx.strokeStyle = 'rgba(150,150,150,.3)';
              ctx.lineWidth = 0.5;
              for (var fx = 4; fx < TILE; fx += 8) {
                ctx.beginPath();
                ctx.moveTo(sx + fx, sy);
                ctx.lineTo(sx + fx + 4, sy + TILE / 2);
                ctx.lineTo(sx + fx, sy + TILE);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx + fx + 4, sy);
                ctx.lineTo(sx + fx, sy + TILE / 2);
                ctx.lineTo(sx + fx + 4, sy + TILE);
                ctx.stroke();
              }
              ctx.fillStyle = '#6a6a6a';
              ctx.fillRect(sx, sy, TILE, 3);
            } else if (tile === 12) {
              /* Gate — climbable opening with warning stripes */
              ctx.fillStyle = S.currentZone === 'wasteland' ? '#2a2218' : getTileColor(0, S.currentZone);
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              ctx.save();
              ctx.beginPath();
              ctx.rect(sx, sy, TILE, TILE);
              ctx.clip();
              for (var si = -TILE; si < TILE * 2; si += 12) {
                ctx.fillStyle = 'rgba(245,197,66,.2)';
                ctx.beginPath();
                ctx.moveTo(sx + si, sy);
                ctx.lineTo(sx + si + 6, sy);
                ctx.lineTo(sx + si + 6 + TILE, sy + TILE);
                ctx.lineTo(sx + si + TILE, sy + TILE);
                ctx.fill();
              }
              ctx.restore();
              ctx.strokeStyle = '#8a7a4a';
              ctx.lineWidth = 2;
              ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
              var gPulse = 0.5 + Math.sin(now / 400) * 0.3;
              ctx.fillStyle = "rgba(245,197,66,".concat(gPulse, ")");
              ctx.font = 'bold 7px "VT323", monospace';
              ctx.textAlign = 'center';
              ctx.fillText('CLIMB', sx + TILE / 2, sy + TILE / 2 + 3);
            } else if (tile === 13) {
              /* House building — wooden walls with roof */
              ctx.fillStyle = '#7a5a3a';
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              /* Wood plank lines */
              ctx.strokeStyle = 'rgba(0,0,0,.15)';
              ctx.lineWidth = 0.5;
              for (var ly = 4; ly < TILE; ly += 6) {
                ctx.beginPath();
                ctx.moveTo(sx, sy + ly);
                ctx.lineTo(sx + TILE, sy + ly);
                ctx.stroke();
              }
              /* Roof (top tiles) */
              ctx.fillStyle = '#a04020';
              ctx.fillRect(sx - 2, sy, TILE + 4, 5);
              /* Window */
              ctx.fillStyle = 'rgba(255,240,150,.4)';
              ctx.fillRect(sx + TILE / 2 - 4, sy + 10, 8, 8);
              ctx.strokeStyle = '#5a3a1a';
              ctx.lineWidth = 1;
              ctx.strokeRect(sx + TILE / 2 - 4, sy + 10, 8, 8);
              ctx.beginPath();
              ctx.moveTo(sx + TILE / 2, sy + 10);
              ctx.lineTo(sx + TILE / 2, sy + 18);
              ctx.stroke();
            } else if (tile === 14) {
              /* Farm plot — tilled soil with furrows */
              ctx.fillStyle = '#5a4a2a';
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              ctx.strokeStyle = 'rgba(0,0,0,.15)';
              ctx.lineWidth = 0.5;
              for (var fy = 4; fy < TILE; fy += 5) {
                ctx.beginPath();
                ctx.moveTo(sx + 2, sy + fy);
                ctx.lineTo(sx + TILE - 2, sy + fy);
                ctx.stroke();
              }
              /* Small seed dots */
              ctx.fillStyle = 'rgba(100,180,60,.3)';
              for (var sd = 0; sd < 3; sd++) {
                ctx.beginPath();
                ctx.arc(sx + 8 + sd * 8, sy + TILE / 2, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (tile === 15) {
              /* Bed — sleep to recharge */
              ctx.fillStyle = '#6a4a5a';
              ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
              /* Bed frame */
              ctx.fillStyle = '#8a6a3a';
              ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
              /* Pillow */
              ctx.fillStyle = '#e0d0c0';
              ctx.fillRect(sx + 6, sy + 6, 10, 6);
              /* Blanket */
              ctx.fillStyle = '#4a6a9a';
              ctx.fillRect(sx + 6, sy + 14, TILE - 12, 10);
              /* ZZZ pulse */
              var zzPulse = 0.4 + Math.sin(now / 600) * 0.3;
              ctx.fillStyle = "rgba(150,180,255,".concat(zzPulse, ")");
              ctx.font = 'bold 8px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💤', sx + TILE / 2, sy - 2);
            } else {
              ctx.fillStyle = getTileColor(tile, S.currentZone);
            }
            ctx.fillRect(sx, sy, TILE + 1, TILE + 1);

            /* Decorations */
            if (tile === 1) {
              /* Path — cobblestone pattern */
              ctx.fillStyle = 'rgba(0,0,0,.06)';
              if ((cl + r) % 2 === 0) {
                ctx.fillRect(sx + 2, sy + 2, 6, 6);
                ctx.fillRect(sx + 18, sy + 14, 8, 6);
              } else {
                ctx.fillRect(sx + 10, sy + 4, 8, 5);
                ctx.fillRect(sx + 4, sy + 18, 6, 8);
              }
              ctx.fillStyle = 'rgba(255,255,255,.03)';
              ctx.fillRect(sx + 12, sy + 10, 4, 3);
            } else if (tile === 3) {
              var _ownerB;
              /* Building — pixel-art composite with per-building theming */
              /* Determine which building this tile belongs to */
              var ownerB = null;
              if (S.currentZone === 'town') {
                for (var bi2 = 0; bi2 < BUILDINGS.length; bi2++) {
                  var bb = BUILDINGS[bi2];
                  if (cl >= bb.bx && cl < bb.bx + bb.bw && r >= bb.by && r < bb.by + bb.bh) {
                    ownerB = bb;
                    break;
                  }
                }
              }
              var bCol = ((_ownerB = ownerB) === null || _ownerB === void 0 ? void 0 : _ownerB.color) || '#4a3a5c';
              var isTop = ownerB ? r === ownerB.by : false;
              var isBot = ownerB ? r === ownerB.by + ownerB.bh - 1 : false;
              var isLeft = ownerB ? cl === ownerB.bx : false;
              var isRight = ownerB ? cl === ownerB.bx + ownerB.bw - 1 : false;

              /* Wall base — warm stone with color influence */
              var wallR = parseInt(bCol.slice(1, 3), 16) || 74;
              var wallG = parseInt(bCol.slice(3, 5), 16) || 58;
              var wallB = parseInt(bCol.slice(5, 7), 16) || 92;
              ctx.fillStyle = "rgb(".concat(Math.min(255, wallR + 30), ",").concat(Math.min(255, wallG + 25), ",").concat(Math.min(255, wallB + 20), ")");
              ctx.fillRect(sx, sy, TILE, TILE);

              /* Brick mortar lines */
              ctx.strokeStyle = 'rgba(0,0,0,.08)';
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(sx, sy + TILE * 0.33);
              ctx.lineTo(sx + TILE, sy + TILE * 0.33);
              ctx.moveTo(sx, sy + TILE * 0.66);
              ctx.lineTo(sx + TILE, sy + TILE * 0.66);
              ctx.stroke();
              if (r % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.5, sy);
                ctx.lineTo(sx + TILE * 0.5, sy + TILE * 0.33);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.25, sy + TILE * 0.33);
                ctx.lineTo(sx + TILE * 0.25, sy + TILE * 0.66);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.75, sy + TILE * 0.66);
                ctx.lineTo(sx + TILE * 0.75, sy + TILE);
                ctx.stroke();
              } else {
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.25, sy);
                ctx.lineTo(sx + TILE * 0.25, sy + TILE * 0.33);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.75, sy + TILE * 0.33);
                ctx.lineTo(sx + TILE * 0.75, sy + TILE * 0.66);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx + TILE * 0.5, sy + TILE * 0.66);
                ctx.lineTo(sx + TILE * 0.5, sy + TILE);
                ctx.stroke();
              }

              /* Roof — top row gets a peaked/colored roof */
              if (isTop) {
                /* Dark eave overhang */
                ctx.fillStyle = "rgba(".concat(Math.max(0, wallR - 40), ",").concat(Math.max(0, wallG - 40), ",").concat(Math.max(0, wallB - 30), ",1)");
                ctx.fillRect(sx - 2, sy, TILE + 4, 8);
                /* Roof tiles with building color */
                ctx.fillStyle = bCol;
                ctx.fillRect(sx - 2, sy - 4, TILE + 4, 7);
                /* Roof highlight */
                ctx.fillStyle = 'rgba(255,255,255,.12)';
                ctx.fillRect(sx, sy - 4, TILE, 3);
                /* Roof edge line */
                ctx.strokeStyle = 'rgba(0,0,0,.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx - 2, sy + 3);
                ctx.lineTo(sx + TILE + 2, sy + 3);
                ctx.stroke();
              }

              /* Bottom row — foundation/door area */
              if (isBot) {
                /* Foundation strip */
                ctx.fillStyle = 'rgba(0,0,0,.1)';
                ctx.fillRect(sx, sy + TILE - 4, TILE, 4);
                /* Door — center bottom tiles */
                if (!isLeft && !isRight) {
                  ctx.fillStyle = "rgb(".concat(Math.max(0, wallR - 30), ",").concat(Math.max(0, wallG - 20), ",").concat(Math.max(0, wallB - 10), ")");
                  ctx.fillRect(sx + 6, sy + 4, TILE - 12, TILE - 6);
                  /* Door frame */
                  ctx.strokeStyle = 'rgba(0,0,0,.2)';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(sx + 6, sy + 4, TILE - 12, TILE - 6);
                  /* Door handle */
                  ctx.fillStyle = '#f5c542';
                  ctx.beginPath();
                  ctx.arc(sx + TILE - 10, sy + TILE / 2 + 2, 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              /* Windows — interior tiles get windows */
              if (!isTop && !isBot && (r + cl) % 2 === 0) {
                var winGlow = isNight ? '#f5c542' : isDusk ? '#daa520' : 'rgba(200,180,140,.5)';
                /* Window pane */
                ctx.fillStyle = winGlow;
                ctx.fillRect(sx + 8, sy + 6, 10, 12);
                /* Window frame — cross */
                ctx.strokeStyle = "rgb(".concat(Math.max(0, wallR - 20), ",").concat(Math.max(0, wallG - 15), ",").concat(Math.max(0, wallB - 10), ")");
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx + 13, sy + 6);
                ctx.lineTo(sx + 13, sy + 18);
                ctx.moveTo(sx + 8, sy + 12);
                ctx.lineTo(sx + 18, sy + 12);
                ctx.stroke();
                /* Window sill */
                ctx.fillStyle = 'rgba(0,0,0,.15)';
                ctx.fillRect(sx + 7, sy + 18, 12, 2);
                /* Night glow effect */
                if (isNight) {
                  ctx.fillStyle = 'rgba(245,197,66,.08)';
                  ctx.beginPath();
                  ctx.arc(sx + 13, sy + 12, 12, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              /* Edge shadows for depth */
              if (isLeft) {
                ctx.fillStyle = 'rgba(0,0,0,.08)';
                ctx.fillRect(sx, sy, 3, TILE);
              }
              if (isRight) {
                ctx.fillStyle = 'rgba(0,0,0,.12)';
                ctx.fillRect(sx + TILE - 3, sy, 3, TILE);
              }
            } else if (tile === 4) {
              /* Tree — zone-specific variants */
              var sway = Math.sin(now / 1200 + cl * 3 + r * 7) * 1.5;
              if (zoneElem === 'flame') {
                /* CHARRED STUMP — blackened trunk, no canopy, ember glow */
                ctx.fillStyle = 'rgba(0,0,0,.1)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 2, sy + TILE / 2 + 12, 8, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2a1a0a';
                ctx.fillRect(sx + TILE / 2 - 3, sy + TILE / 2 - 2, 6, 16);
                /* Broken top */
                ctx.fillStyle = '#1a0a00';
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2 - 4, sy + TILE / 2 - 2);
                ctx.lineTo(sx + TILE / 2, sy + TILE / 2 - 8);
                ctx.lineTo(sx + TILE / 2 + 4, sy + TILE / 2 - 2);
                ctx.fill();
                /* Ember glow at base */
                ctx.fillStyle = "rgba(255,80,20,".concat(0.1 + Math.sin(now / 900 + cl) * 0.06, ")");
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2 + 10, 4, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'frost') {
                /* FROZEN TREE — ice-covered, blue-white canopy */
                ctx.fillStyle = 'rgba(0,0,0,.08)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 2, sy + TILE / 2 + 12, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6a7a8a';
                ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2 + 2, 4, 12);
                ctx.fillStyle = '#8aaac0';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway * 0.3, sy + TILE / 2 - 6, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#a0c8e0';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway * 0.3 - 1, sy + TILE / 2 - 7, 8, 0, Math.PI * 2);
                ctx.fill();
                /* Ice crystals */
                ctx.fillStyle = 'rgba(200,230,255,.25)';
                ctx.fillRect(sx + TILE / 2 - 6 + sway * 0.3, sy + TILE / 2 - 10, 2, 4);
                ctx.fillRect(sx + TILE / 2 + 4 + sway * 0.3, sy + TILE / 2 - 8, 2, 3);
              } else if (zoneElem === 'venom') {
                /* TWISTED FUNGAL TREE — gnarled with mushroom caps */
                ctx.fillStyle = 'rgba(0,0,0,.1)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 2, sy + TILE / 2 + 12, 9, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#3a2a18';
                ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2, 4, 14);
                /* Leaning trunk */
                ctx.fillStyle = '#2a1a10';
                ctx.fillRect(sx + TILE / 2 - 3 + sway, sy + TILE / 2 - 4, 3, 8);
                /* Mushroom cap canopy */
                ctx.fillStyle = '#2a6a20';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway, sy + TILE / 2 - 6, 10, 0, Math.PI * 2);
                ctx.fill();
                /* Glowing spots on cap */
                ctx.fillStyle = 'rgba(80,255,80,.2)';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway - 3, sy + TILE / 2 - 8, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway + 4, sy + TILE / 2 - 5, 2, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'dark') {
                /* SHADOW TREE — black twisted silhouette */
                ctx.fillStyle = 'rgba(0,0,0,.15)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 2, sy + TILE / 2 + 12, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#0a0a15';
                ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2 + 2, 4, 12);
                ctx.fillStyle = '#0f0f20';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2 - 6, 11, 0, Math.PI * 2);
                ctx.fill();
                /* Purple aura */
                ctx.fillStyle = "rgba(60,20,80,".concat(0.08 + Math.sin(now / 1500 + cl) * 0.04, ")");
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2 - 4, 14, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'water') {
                /* KELP/SEAWEED — swaying vertical strands */
                ctx.fillStyle = 'rgba(0,0,0,.06)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2, sy + TILE / 2 + 12, 6, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                for (var strand = 0; strand < 3; strand++) {
                  var sOff = strand * 5 - 5;
                  var sSway = Math.sin(now / 800 + cl + strand * 2) * 3;
                  ctx.strokeStyle = strand % 2 === 0 ? '#1a5a30' : '#2a6a40';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(sx + TILE / 2 + sOff, sy + TILE / 2 + 12);
                  ctx.quadraticCurveTo(sx + TILE / 2 + sOff + sSway, sy + TILE / 2, sx + TILE / 2 + sOff + sSway * 0.5, sy + TILE / 2 - 8);
                  ctx.stroke();
                }
              } else if (zoneElem === 'light') {
                /* WHITE BIRCH — pale trunk, golden leaves */
                ctx.fillStyle = 'rgba(0,0,0,.08)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 3, sy + TILE / 2 + 12, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#d0c8b8';
                ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2 + 2, 4, 12);
                ctx.fillStyle = '#c0a840';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway, sy + TILE / 2 - 6, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#dac050';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway - 1, sy + TILE / 2 - 7, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,240,150,.2)';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway - 3, sy + TILE / 2 - 9, 5, 0, Math.PI * 2);
                ctx.fill();
              } else {
                /* Default green tree */
                ctx.fillStyle = 'rgba(0,0,0,.12)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + 3, sy + TILE / 2 + 12, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#5a3a1e';
                ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2 + 2, 4, 12);
                ctx.fillStyle = '#0d3608';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway, sy + TILE / 2 - 6, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a5a10';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway - 1, sy + TILE / 2 - 7, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(100,200,80,.2)';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + sway - 3, sy + TILE / 2 - 9, 5, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (tile === 5) {
              /* Flower/decoration — zone-specific variants */
              var fsway = Math.sin(now / 900 + cl * 5 + r * 3) * 1;
              if (zoneElem === 'stone') {
                /* CRYSTAL DEPOSIT — glinting mineral clusters */
                var cColors = ['#6a8aff', '#8a6aff', '#50c0f0', '#aa80ff'];
                var cc = cColors[(cl * 7 + r * 3) % cColors.length];
                ctx.fillStyle = cc;
                /* Crystal shards */
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2 - 3, sy + TILE / 2 + 6);
                ctx.lineTo(sx + TILE / 2 - 1, sy + TILE / 2 - 6);
                ctx.lineTo(sx + TILE / 2 + 1, sy + TILE / 2 + 6);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2 + 2, sy + TILE / 2 + 4);
                ctx.lineTo(sx + TILE / 2 + 4, sy + TILE / 2 - 4);
                ctx.lineTo(sx + TILE / 2 + 6, sy + TILE / 2 + 4);
                ctx.fill();
                /* Glint */
                ctx.fillStyle = "rgba(255,255,255,".concat(Math.sin(now / 500 + cl * 3) * 0.2 + 0.2, ")");
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2 - 5, 1.5, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'wind') {
                /* CLOUD WISP — drifting translucent puff */
                var cDrift = Math.sin(now / 1500 + cl * 2) * 4;
                ctx.fillStyle = 'rgba(220,230,240,.15)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + cDrift, sy + TILE / 2, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(240,245,255,.1)';
                ctx.beginPath();
                ctx.ellipse(sx + TILE / 2 + cDrift - 2, sy + TILE / 2 - 1, 5, 3, 0, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'light') {
                /* GOLDEN GRASS — shimmering golden tufts */
                var gg = Math.sin(now / 700 + cl + r) * 0.5 + 0.5;
                ctx.strokeStyle = "rgba(220,180,40,".concat(0.3 + gg * 0.2, ")");
                ctx.lineWidth = 0.7;
                for (var gb = 0; gb < 3; gb++) {
                  var gbx = sx + 6 + gb * 7,
                    gby = sy + TILE / 2 + 6;
                  ctx.beginPath();
                  ctx.moveTo(gbx, gby);
                  ctx.lineTo(gbx + fsway * 1.5, gby - 8 - gb * 2);
                  ctx.stroke();
                }
                /* Golden tip sparkle */
                ctx.fillStyle = "rgba(255,220,80,".concat(gg * 0.3, ")");
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 + fsway * 1.5, sy + TILE / 2 - 6, 1.5, 0, Math.PI * 2);
                ctx.fill();
              } else if (zoneElem === 'venom') {
                /* SMALL MUSHROOM — toxic cap on thin stem */
                ctx.strokeStyle = '#5a6a40';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2, sy + TILE / 2 + 8);
                ctx.lineTo(sx + TILE / 2, sy + TILE / 2);
                ctx.stroke();
                var mCols = ['#4ade80', '#22c55e', '#86efac'];
                ctx.fillStyle = mCols[(cl * 3 + r * 7) % 3];
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2 - 1, 4, Math.PI, 0);
                ctx.fill();
                /* Glow spots */
                ctx.fillStyle = 'rgba(150,255,150,.3)';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2 - 1, sy + TILE / 2 - 2, 1, 0, Math.PI * 2);
                ctx.fill();
              } else {
                /* Default flower */
                var colors = ['#ff6b9d', '#f5c542', '#a78bfa', '#fb923c', '#f472b6', '#60a5fa'];
                var fc = colors[(cl * 7 + r * 13) % colors.length];
                ctx.strokeStyle = '#3a8a2a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2, sy + TILE / 2 + 8);
                ctx.lineTo(sx + TILE / 2 + fsway, sy + TILE / 2 - 2);
                ctx.stroke();
                ctx.fillStyle = fc;
                var _fx = sx + TILE / 2 + fsway,
                  _fy = sy + TILE / 2 - 2;
                for (var p = 0; p < 5; p++) {
                  var pa = p / 5 * Math.PI * 2 + now / 2000;
                  ctx.beginPath();
                  ctx.arc(_fx + Math.cos(pa) * 3, _fy + Math.sin(pa) * 3, 2, 0, Math.PI * 2);
                  ctx.fill();
                }
                ctx.fillStyle = '#f5c542';
                ctx.beginPath();
                ctx.arc(_fx, _fy, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (tile === 2) {
              /* Water — zone-specific fluid rendering */
              var _t3 = now / 600;
              if (zoneElem === 'flame') {
                /* LAVA — molten orange-red with bright surface cracks */
                ctx.fillStyle = '#8a2a0a';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = "rgba(255,120,20,".concat(0.3 + Math.sin(_t3 + cl + r) * 0.15, ")");
                ctx.fillRect(sx + 2, sy + 2, TILE - 3, TILE - 3);
                /* Bright cracks */
                ctx.strokeStyle = "rgba(255,200,50,".concat(0.4 + Math.sin(_t3 * 1.5 + cl * 3) * 0.2, ")");
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(sx + 4, sy + 6 + Math.sin(_t3 + r) * 2);
                ctx.lineTo(sx + TILE - 4, sy + TILE - 5 + Math.sin(_t3 + cl) * 2);
                ctx.stroke();
                /* Surface glow pulse */
                if ((cl + r) % 3 === 0) {
                  ctx.fillStyle = "rgba(255,220,80,".concat(0.15 + Math.sin(_t3 * 2 + cl * 2) * 0.1, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 3, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (zoneElem === 'frost') {
                /* ICE — pale blue with crystalline patterns */
                ctx.fillStyle = '#8ab4d0';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = 'rgba(200,230,255,.2)';
                ctx.fillRect(sx + 3, sy + 3, TILE - 5, TILE - 5);
                /* Crystal fracture lines */
                ctx.strokeStyle = 'rgba(255,255,255,.18)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2, sy + 2);
                ctx.lineTo(sx + TILE - 4, sy + TILE / 2);
                ctx.lineTo(sx + TILE / 2, sy + TILE - 2);
                ctx.stroke();
                /* Sparkle */
                if ((cl + r * 3) % 5 === 0) {
                  var isp = Math.sin(_t3 * 2 + cl + r) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(255,255,255,".concat(isp * 0.3, ")");
                  ctx.beginPath();
                  ctx.arc(sx + 8 + cl % 10, sy + 8 + r % 8, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (zoneElem === 'dark') {
                /* VOID — deep purple-black with shifting darkness */
                ctx.fillStyle = '#0a0515';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = "rgba(60,20,80,".concat(0.3 + Math.sin(_t3 * 0.7 + cl + r * 2) * 0.15, ")");
                ctx.fillRect(sx + 1, sy + 1, TILE - 1, TILE - 1);
                /* Void shimmer */
                if ((cl + r) % 4 === 0) {
                  ctx.fillStyle = "rgba(120,40,180,".concat(0.1 + Math.sin(_t3 + cl * 4) * 0.08, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 4, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (zoneElem === 'venom') {
                /* TOXIC BOG — murky green water */
                ctx.fillStyle = '#1a4a25';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = 'rgba(60,180,80,.1)';
                var bx1 = Math.sin(_t3 * 0.8 + cl + r) * 3;
                ctx.fillRect(sx + 6 + bx1, sy + 10, 12, 2);
                /* Bubbles */
                if ((cl * 7 + r * 11) % 9 === 0) {
                  var bub = Math.sin(_t3 * 1.5 + cl) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(80,200,80,".concat(bub * 0.2, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2 + Math.sin(_t3 + r) * 3, sy + TILE / 2, 2, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else {
                /* Default water */
                ctx.fillStyle = '#2468a0';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = 'rgba(100,180,255,.12)';
                var wx1 = Math.sin(_t3 + cl + r * 2) * 4;
                ctx.fillRect(sx + 6 + wx1, sy + 8, 14, 2);
                ctx.fillStyle = 'rgba(255,255,255,.08)';
                var wx2 = Math.sin(_t3 * 1.3 + cl * 2 + r) * 3;
                ctx.fillRect(sx + 10 + wx2, sy + 20, 10, 1.5);
                if ((cl + r * 3) % 7 === 0) {
                  var sparkle = Math.sin(_t3 * 2 + cl) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(255,255,255,".concat(sparkle * 0.2, ")");
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            } else if (tile === 6) {
              /* Sand — zone-specific variant */
              if (zoneElem === 'frost') {
                /* SNOW DRIFTS — white/pale blue */
                var snowShade = (cl * 13 + r * 17) % 3;
                var snows = ['#dce8f0', '#e8f0f8', '#d0e0ea'];
                ctx.fillStyle = snows[snowShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                /* Wind texture */
                ctx.fillStyle = 'rgba(255,255,255,.1)';
                if ((cl + r) % 4 === 0) ctx.fillRect(sx + 2, sy + 10 + r % 6, TILE - 4, 1);
                /* Sparkle */
                if ((cl * 7 + r * 3) % 11 === 0) {
                  var ssp = Math.sin(now / 500 + cl + r) * 0.5 + 0.5;
                  ctx.fillStyle = "rgba(255,255,255,".concat(ssp * 0.25, ")");
                  ctx.beginPath();
                  ctx.arc(sx + 10 + cl % 8, sy + 6 + r % 12, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else {
                /* Default sand */
                var sandShade = (cl * 13 + r * 17) % 3;
                var sands = ['#d4b483', '#c9a96e', '#dfc08a'];
                ctx.fillStyle = sands[sandShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = 'rgba(0,0,0,.04)';
                if ((cl + r) % 3 === 0) ctx.fillRect(sx + 6, sy + 10, 2, 1);
                if ((cl * 3 + r * 7) % 5 === 0) ctx.fillRect(sx + 18, sy + 22, 1, 1);
                if ((cl * 7 + r * 11) % 23 === 0) {
                  ctx.fillStyle = 'rgba(255,255,255,.3)';
                  ctx.beginPath();
                  ctx.arc(sx + TILE / 2, sy + TILE / 2, 2, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            } else if (tile === 7) {
              /* Stone — zone-specific variants */
              if (zoneElem === 'flame') {
                /* VOLCANIC ROCK — dark with ember veins */
                var vShade = (cl * 11 + r * 7) % 3;
                var vrocks = ['#3a2a1a', '#4a2a18', '#352218'];
                ctx.fillStyle = vrocks[vShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.strokeStyle = "rgba(255,100,20,".concat(0.15 + Math.sin(now / 1000 + cl) * 0.05, ")");
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx + 3, sy + 6);
                ctx.lineTo(sx + TILE - 4, sy + TILE - 5);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,140,40,.08)';
                ctx.fillRect(sx + 2, sy + 2, TILE / 2, TILE / 3);
              } else if (zoneElem === 'storm') {
                /* JAGGED PEAKS — purplish crags */
                var jShade = (cl * 11 + r * 7) % 3;
                var jrocks = ['#4a4060', '#3a3050', '#5a4a6a'];
                ctx.fillStyle = jrocks[jShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.strokeStyle = 'rgba(160,120,240,.1)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx + TILE / 2, sy);
                ctx.lineTo(sx + TILE / 2 + 3, sy + TILE);
                ctx.stroke();
                ctx.fillStyle = 'rgba(180,140,255,.06)';
                ctx.fillRect(sx + 2, sy + 2, TILE / 2, TILE / 3);
              } else if (zoneElem === 'stone') {
                /* CAVE WALL — layered sediment */
                var cShade = (cl * 11 + r * 7) % 4;
                var cwalls = ['#4a4240', '#3a3634', '#524a46', '#484240'];
                ctx.fillStyle = cwalls[cShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                /* Layered sediment lines */
                ctx.strokeStyle = 'rgba(0,0,0,.1)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx, sy + TILE / 3);
                ctx.lineTo(sx + TILE, sy + TILE / 3 + 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(sx, sy + TILE * 2 / 3);
                ctx.lineTo(sx + TILE, sy + TILE * 2 / 3 - 1);
                ctx.stroke();
                /* Mineral glint */
                if ((cl + r * 3) % 7 === 0) {
                  ctx.fillStyle = "rgba(200,180,120,".concat(Math.sin(now / 700 + cl * 3) * 0.1 + 0.1, ")");
                  ctx.beginPath();
                  ctx.arc(sx + 8 + cl % 8, sy + 10 + r % 6, 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (zoneElem === 'light') {
                /* CRYSTAL SPIRE — golden translucent */
                ctx.fillStyle = '#b0a060';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = "rgba(255,220,80,".concat(0.15 + Math.sin(now / 400 + cl + r) * 0.08, ")");
                ctx.fillRect(sx + 2, sy + 2, TILE - 3, TILE - 3);
                ctx.fillStyle = 'rgba(255,255,200,.12)';
                ctx.fillRect(sx + 3, sy + 2, 4, TILE - 4);
              } else if (zoneElem === 'dark') {
                /* DARK ALTAR — black stone with purple runes */
                ctx.fillStyle = '#1a1520';
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.strokeStyle = "rgba(100,40,160,".concat(0.2 + Math.sin(now / 600 + cl * 2 + r) * 0.1, ")");
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2, 5, 0, Math.PI * 2);
                ctx.stroke();
              } else if (zoneElem === 'water') {
                /* CORAL — reddish rock with organic texture */
                var coShade = (cl * 7 + r * 13) % 3;
                var corals = ['#8a4a5a', '#7a5a4a', '#9a5060'];
                ctx.fillStyle = corals[coShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.fillStyle = 'rgba(255,150,140,.1)';
                ctx.beginPath();
                ctx.arc(sx + TILE / 2, sy + TILE / 2, 4, 0, Math.PI * 2);
                ctx.fill();
              } else {
                /* Default stone */
                var stoneShade = (cl * 11 + r * 7) % 4;
                var stones = ['#6b6b6b', '#5a5a5a', '#7a7a7a', '#636363'];
                ctx.fillStyle = stones[stoneShade];
                ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
                ctx.strokeStyle = 'rgba(0,0,0,.15)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx + 5, sy + 8);
                ctx.lineTo(sx + TILE - 8, sy + TILE - 6);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,.06)';
                ctx.fillRect(sx + 2, sy + 2, TILE / 2, TILE / 3);
              }
            }
          };
          for (var cl = startCol; cl <= endCol; cl++) {
            if (_loop3(cl)) continue;
          }
        };
        for (var r = startRow; r <= endRow; r++) {
          _loop2(r);
        }

        /* Ambient particles — fireflies at night, leaves during day */
        if (!S._particles) S._particles = Array.from({
          length: 40
        }, function () {
          return {
            x: Math.random() * TOWN_W,
            y: Math.random() * TOWN_H,
            vx: (Math.random() - .5) * .3,
            vy: (Math.random() - .5) * .3,
            phase: Math.random() * Math.PI * 2,
            size: Math.random() * 2 + 1
          };
        });
        S._particles.forEach(function (p) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = TOWN_W;
          if (p.x > TOWN_W) p.x = 0;
          if (p.y < 0) p.y = TOWN_H;
          if (p.y > TOWN_H) p.y = 0;
          var ppx = p.x - cx,
            ppy = p.y - cy;
          if (ppx < -10 || ppx > W + 10 || ppy < -10 || ppy > H + 10) return;
          if (isNight) {
            /* Fireflies */
            var glow = Math.sin(now / 400 + p.phase) * 0.5 + 0.5;
            ctx.fillStyle = "rgba(200,255,100,".concat(glow * 0.6, ")");
            ctx.beginPath();
            ctx.arc(ppx, ppy, p.size, 0, Math.PI * 2);
            ctx.fill();
            /* Glow halo */
            ctx.fillStyle = "rgba(200,255,100,".concat(glow * 0.15, ")");
            ctx.beginPath();
            ctx.arc(ppx, ppy, p.size * 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            /* Floating dust/pollen */
            var a = Math.sin(now / 600 + p.phase) * 0.3 + 0.3;
            ctx.fillStyle = "rgba(255,255,200,".concat(a, ")");
            ctx.beginPath();
            ctx.arc(ppx, ppy, p.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        /* Collectible rendering removed */

        /* Render player trail */
        if (S.trail.length > 1) {
          for (var _i41 = 0; _i41 < S.trail.length; _i41++) {
            var t = S.trail[_i41];
            var age = (now - t.ts) / 800; /* 0 to 1 */
            if (age >= 1) continue;
            var _tx22 = t.x - cx,
              _ty23 = t.y - cy;
            var alpha = (1 - age) * 0.4;
            var size = (1 - age) * 4 + 1;
            ctx.fillStyle = "rgba(91,82,255,".concat(alpha, ")");
            ctx.beginPath();
            ctx.arc(_tx22, _ty23 + 8, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        /* Building signs — large prominent signboards (town only) */
        if (S.currentZone === 'town') BUILDINGS.forEach(function (b, bi) {
          var bsx = (b.bx + b.bw / 2) * TILE - cx;
          var bsy = b.by * TILE - cy - 6;
          if (bsx < -150 || bsx > W + 150 || bsy < -80 || bsy > H + 80) return;
          var isNear = S.nearBuilding === bi;

          /* Sign board — larger, with shadow */
          ctx.font = 'bold 11px "Space Mono", monospace';
          ctx.textAlign = 'center';
          var labelText = b.label;
          var tw = ctx.measureText(labelText).width;
          var signW = Math.max(tw + 36, 70);
          var signH = 24;
          var signR = 6;
          var signY = bsy - signH - 4;

          /* Sign shadow */
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          ctx.beginPath();
          ctx.roundRect(bsx - signW / 2 + 2, signY + 2, signW, signH, signR);
          ctx.fill();

          /* Sign background */
          ctx.fillStyle = isNear ? 'rgba(91,82,255,.9)' : 'rgba(20,15,30,.85)';
          ctx.beginPath();
          ctx.roundRect(bsx - signW / 2, signY, signW, signH, signR);
          ctx.fill();

          /* Sign border */
          ctx.strokeStyle = isNear ? 'rgba(255,255,255,.5)' : 'rgba(245,197,66,.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(bsx - signW / 2, signY, signW, signH, signR);
          ctx.stroke();

          /* Sign post — thin line from sign to building */
          ctx.strokeStyle = 'rgba(100,80,60,.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bsx, signY + signH);
          ctx.lineTo(bsx, bsy);
          ctx.stroke();

          /* Icon */
          ctx.font = '14px sans-serif';
          ctx.fillText(b.icon, bsx - tw / 2 - 6, signY + signH - 6);

          /* Label text */
          ctx.font = 'bold 10px "Space Mono", monospace';
          ctx.fillStyle = isNear ? '#fff' : '#f5c542';
          ctx.fillText(labelText, bsx + 6, signY + signH - 8);

          /* "TAP TO ENTER" hint when near — pulsing */
          if (isNear && b.action) {
            var pulse = Math.sin(now / 300) * 0.15 + 0.85;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = 'rgba(91,82,255,.7)';
            ctx.beginPath();
            ctx.roundRect(bsx - 40, signY + signH + 6, 80, 16, 4);
            ctx.fill();
            ctx.font = 'bold 8px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('TAP TO ENTER', bsx, signY + signH + 17);
            ctx.globalAlpha = 1;
          }
        });

        /* ═══ ZONE EXIT LABELS — show where paths lead ═══ */
        if (S.currentZone === 'town') {
          TOWN_EXITS.forEach(function (ex) {
            var _ZONES$ex$zoneId;
            var lx, ly;
            if (ex.dir === 'north') {
              lx = ex.tx * TILE + TILE - cx;
              ly = TILE * 1.5 - cy;
            }
            if (ex.dir === 'south') {
              lx = ex.tx * TILE + TILE - cx;
              ly = (ZONES.town.h - 2) * TILE - cy;
            }
            if (ex.dir === 'east') {
              lx = (ZONES.town.w - 2) * TILE - cx;
              ly = ex.ty * TILE + TILE - cy;
            }
            if (ex.dir === 'west') {
              lx = TILE * 2 - cx;
              ly = ex.ty * TILE + TILE - cy;
            }
            if (lx < -80 || lx > W + 80 || ly < -30 || ly > H + 30) return;
            /* Glowing label */
            ctx.font = 'bold 9px "Space Mono", monospace';
            ctx.textAlign = 'center';
            var pulse = Math.sin(now / 500) * 0.2 + 0.8;
            ctx.fillStyle = ex.color;
            ctx.globalAlpha = pulse;
            ctx.fillText(ex.label, lx, ly);
            ctx.globalAlpha = 1;
            /* Element icon */
            var elem = (_ZONES$ex$zoneId = ZONES[ex.zoneId]) === null || _ZONES$ex$zoneId === void 0 ? void 0 : _ZONES$ex$zoneId.element;
            if (elem) {
              var lvl = ZONES[ex.zoneId].level;
              ctx.font = '7px sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,.5)';
              ctx.fillText('Lv' + lvl[0] + '-' + lvl[1], lx, ly + 10);
            }
          });
        } else {
          /* In combat zones — show return exits */
          var _zone5 = ZONES[S.currentZone];
          var zW = _zone5.w,
            zH = _zone5.h;
          var retExits = [{
            x: 0,
            y: Math.floor(zH / 2),
            label: '← Town'
          }, {
            x: zW - 1,
            y: Math.floor(zH / 2),
            label: 'Town →'
          }, {
            x: Math.floor(zW / 2),
            y: 0,
            label: 'Town ↑'
          }, {
            x: Math.floor(zW / 2),
            y: zH - 1,
            label: 'Town ↓'
          }];
          retExits.forEach(function (re) {
            var _S$map$re$y;
            if (((_S$map$re$y = S.map[re.y]) === null || _S$map$re$y === void 0 ? void 0 : _S$map$re$y[re.x]) !== 9) return;
            var lx = re.x * TILE + TILE / 2 - cx,
              ly = re.y * TILE + TILE / 2 - cy;
            if (lx < -60 || lx > W + 60 || ly < -20 || ly > H + 20) return;
            ctx.font = 'bold 8px "Space Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#3dd497';
            ctx.globalAlpha = Math.sin(now / 400) * 0.2 + 0.8;
            ctx.fillText(re.label, lx, ly - 4);
            ctx.globalAlpha = 1;
          });

          /* Dungeon entrance labels */
          if (S.currentZone !== 'town') {
            var _S$map4;
            var _zone6 = ZONES[S.currentZone];
            var _zW = _zone6.w,
              _zH = _zone6.h;
            var dungX = Math.floor(_zW / 2),
              dungY = Math.floor(_zH * 0.3);
            if (((_S$map4 = S.map) === null || _S$map4 === void 0 || (_S$map4 = _S$map4[dungY]) === null || _S$map4 === void 0 ? void 0 : _S$map4[dungX]) === 10) {
              var dlx = dungX * TILE + TILE - cx,
                dly = dungY * TILE + TILE / 2 - cy;
              if (dlx > -60 && dlx < W + 60 && dly > -30 && dly < H + 30) {
                var _S$rpg13, _S$rpg14;
                ctx.font = 'bold 9px "Space Mono", monospace';
                ctx.textAlign = 'center';
                var dPulse = Math.sin(now / 300) * 0.2 + 0.8;
                ctx.fillStyle = '#ff5e6c';
                ctx.globalAlpha = dPulse;
                var _currentDepth = S._currentDepth || 'shallow';
                var _clearKey2 = S.currentZone + '_' + _currentDepth;
                var _isCleared = (_S$rpg13 = S.rpg) === null || _S$rpg13 === void 0 || (_S$rpg13 = _S$rpg13.lifeSkills) === null || _S$rpg13 === void 0 || (_S$rpg13 = _S$rpg13.dungeonClears) === null || _S$rpg13 === void 0 ? void 0 : _S$rpg13[_clearKey2];
                var _nextDepth5 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[_currentDepth];
                if (_nextDepth5) {
                  var _dc5 = DEPTH_CONFIG[_nextDepth5];
                  var lr = _dc5.lvlRange || [1, 10];
                  if (_isCleared) {
                    /* Already cleared — will warp to next depth */
                    ctx.fillStyle = '#3dd497';
                    ctx.fillText('🌀 Warp → ' + _nextDepth5.toUpperCase(), dlx, dly - 10);
                    ctx.font = '7px sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,.5)';
                    ctx.fillText('Lv ' + lr[0] + '-' + lr[1] + ' · Cleared ✓', dlx, dly + 2);
                  } else {
                    /* Not cleared — dungeon fight */
                    ctx.fillText('⚔️ Dungeon → ' + _nextDepth5.charAt(0).toUpperCase() + _nextDepth5.slice(1), dlx, dly - 10);
                    ctx.font = '7px sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,.5)';
                    ctx.fillText('Lv ' + lr[0] + '-' + lr[1] + ' · Clear to unlock', dlx, dly + 2);
                  }
                } else if (_currentDepth === 'core' && (_S$rpg14 = S.rpg) !== null && _S$rpg14 !== void 0 && (_S$rpg14 = _S$rpg14._questFlags) !== null && _S$rpg14 !== void 0 && _S$rpg14.endgameUnlocked) {
                  ctx.fillStyle = '#F1C40F';
                  ctx.fillText('✦ Endgame Portals Available', dlx, dly - 6);
                } else if (_currentDepth === 'core') {
                  ctx.fillText('⚔️ Final Dungeon', dlx, dly - 6);
                } else {
                  ctx.fillText('⚔️ Zone Complete!', dlx, dly - 6);
                }
                ctx.globalAlpha = 1;
              }
            }
          }
        }

        /* Draw other players — pure velocity-driven movement with smoothed velocity */
        var _now = Date.now();
        Object.values(S.others).forEach(function (o) {
          /* Only render players in the same zone */
          var oZone = o.zone || 'town';
          if (oZone !== S.currentZone) return;

          if (o.renderX === undefined) { o.renderX = o.x; o.renderY = o.y; }

          /* Smooth velocity — EMA prevents micro-jumps between ticks */
          var rawVx = o._vx || 0;
          var rawVy = o._vy || 0;
          if (o._smoothVx === undefined) { o._smoothVx = rawVx; o._smoothVy = rawVy; }
          o._smoothVx += (rawVx - o._smoothVx) * 0.15;
          o._smoothVy += (rawVy - o._smoothVy) * 0.15;

          var dx2 = o.x - o.renderX;
          var dy2 = o.y - o.renderY;
          var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 > 100) {
            o.renderX = o.x;
            o.renderY = o.y;
          } else {
            var isMoving2 = Math.abs(o._smoothVx) > 0.005 || Math.abs(o._smoothVy) > 0.005;
            if (isMoving2) {
              o.renderX += o._smoothVx;
              o.renderY += o._smoothVy;
              if (dist2 > 30) {
                o.renderX += dx2 * 0.03;
                o.renderY += dy2 * 0.03;
              }
            } else {
              if (dist2 > 0.5) {
                o.renderX += dx2 * 0.15;
                o.renderY += dy2 * 0.15;
              } else {
                o.renderX = o.x;
                o.renderY = o.y;
              }
            }
          }

          var oMoving = Math.abs(o.renderX - (o._prevRX || o.renderX)) > 0.05 || Math.abs(o.renderY - (o._prevRY || o.renderY)) > 0.05;
          o._prevRX = o.renderX;
          o._prevRY = o.renderY;
          var ox = o.renderX - cx,
            oy = o.renderY - cy;
          if (ox < -40 || ox > W + 40 || oy < -40 || oy > H + 40) return;

          /* Other player shadow */
          ctx.fillStyle = 'rgba(0,0,0,.15)';
          ctx.beginPath();
          ctx.ellipse(ox, oy + 20, 9, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          /* Facing direction — discrete (for rectangle fallback) */
          var oDx = o.renderX - (o._facePrevX || o.renderX);
          var oDy = o.renderY - (o._facePrevY || o.renderY);
          o._facePrevX = o.renderX;
          o._facePrevY = o.renderY;
          var oAdx = Math.abs(oDx),
            oAdy = Math.abs(oDy);
          var oWasUD = o._facing === 'up' || o._facing === 'down';
          var oVB = oWasUD ? 1.3 : 0.7;
          if (oAdx > 0.03 || oAdy > 0.03) {
            if (oAdy > oAdx * oVB) o._facing = oDy > 0 ? 'down' : 'up';else if (oAdx > oAdy * (oWasUD ? 0.7 : 1.3)) o._facing = oDx > 0 ? 'right' : 'left';
          }
          var oDir = o._facing || 'down';
          var oFlip = oDir === 'right';
          var oSide = oDir === 'left' || oDir === 'right';

          /* Continuous facing angle — smooth 360° for NFT */
          if (oAdx > 0.02 || oAdy > 0.02) {
            o._targetAngle = Math.atan2(oDy, oDx);
          }
          if (o._fAngle === undefined) o._fAngle = Math.PI / 2;
          if (o._targetAngle !== undefined) {
            var aDiff = o._targetAngle - o._fAngle;
            while (aDiff > Math.PI) aDiff -= Math.PI * 2;
            while (aDiff < -Math.PI) aDiff += Math.PI * 2;
            o._fAngle += aDiff * (oMoving ? 0.18 : 0.08);
            while (o._fAngle > Math.PI) o._fAngle -= Math.PI * 2;
            while (o._fAngle < -Math.PI) o._fAngle += Math.PI * 2;
          }

          /* Animation vars (were missing — fix) */
          var oFp = now / 80;
          var oSwing = oMoving ? Math.sin(oFp) * 0.5 : 0;
          var oAnimBob = oMoving ? Math.abs(Math.sin(oFp)) * 2.5 : 0;
          var oTC = o.bt || '#2563eb';
          var oLC = o.bl || '#1e3a5f';

          /* Other player body — check for NFT avatar */
          var oBS = o.bodySize === 'armored' ? 'armored' : 'slim';
          var otw = oBS === 'slim' ? 16 : 28,
            oth = oBS === 'slim' ? 16 : 24;
          var oaw = oBS === 'slim' ? 3 : 5,
            oah2 = oBS === 'slim' ? 14 : 22;
          var olw = oBS === 'slim' ? 6 : 10,
            olh = oBS === 'slim' ? 10 : 16,
            olg = oBS === 'slim' ? 2 : 4;
          var osw = oBS === 'slim' ? 7 : 12,
            osh = oBS === 'slim' ? 4 : 6;
          var ohw = oBS === 'slim' ? 2.5 : 3.5,
            ohh = 3;
          var oHR = oBS === 'slim' ? 12 : 16;
          var oArmY = oBS === 'slim' ? 8 : 10,
            oLegY = oBS === 'slim' ? 18 : 26;

          /* Check if other player has a processed NFT avatar */
          var _oHasNft = false;
          if (o.avatar) {
            var oNftImg = loadAvatarImg(o.avatar);
            _oHasNft = oNftImg instanceof HTMLCanvasElement ? oNftImg.width > 0 : oNftImg && oNftImg.complete && oNftImg.naturalWidth;
          }
          if (_oHasNft) {
            /* ═══ OTHER PLAYER — NFT 360° BODY ═══ */
            var _oNftImg = loadAvatarImg(o.avatar);
            var oNftDir = getNftDirectional(_oNftImg, o.avatar);
            var oNftSz = oNftDir.size;
            var oFA = o._fAngle !== undefined ? o._fAngle : Math.PI / 2;

            /* Leg metrics from angle */
            var oTurnFromCam = oFA - Math.PI / 2;
            var oTurnAbs = Math.abs((oTurnFromCam % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            var oSideAmt = Math.sin(oTurnAbs);
            var oMirrorLegs = Math.cos(oFA) > 0;

            /* Draw legs */
            ctx.save();
            ctx.translate(ox, oy + oAnimBob);
            var oNLegY = 8;
            var oLegSpread = olg + (1 - oSideAmt) * 2;
            var oLegNarrow = oSideAmt > 0.4;
            if (oMirrorLegs) ctx.scale(-1, 1);
            if (oLegNarrow) {
              ctx.save();
              ctx.translate(0, oNLegY);
              ctx.rotate(oSwing);
              ctx.fillStyle = oLC;
              ctx.fillRect(-olw / 2, 0, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-osw / 2, olh - 2, osw, osh);
              ctx.restore();
              ctx.globalAlpha = 0.55;
              ctx.save();
              ctx.translate(0, oNLegY);
              ctx.rotate(-oSwing);
              ctx.fillStyle = oLC;
              ctx.fillRect(-olw / 2, 2, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-osw / 2, olh, osw, osh);
              ctx.restore();
              ctx.globalAlpha = 1;
            } else {
              var oNLs = oMoving ? Math.sin(oFp) * 1.5 : 0;
              var oNRs = oMoving ? Math.sin(oFp + Math.PI) * 1.5 : 0;
              var oHS = oLegSpread / 2;
              ctx.fillStyle = oLC;
              ctx.fillRect(-(oHS + olw), oNLegY + oNLs, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-(oHS + olw) - 0.5, oNLegY + olh - 2 + oNLs, osw, osh);
              ctx.fillStyle = oLC;
              ctx.fillRect(oHS, oNLegY + oNRs, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(oHS - 0.5, oNLegY + olh - 2 + oNRs, osw, osh);
            }
            ctx.restore();

            /* Draw 360° NFT */
            var oNftY = oy + oAnimBob - oNftSz / 2 - 4;
            drawNft360(ctx, oNftDir, ox, oNftY, oFA, oNftSz);
          } else {
            /* ═══ OTHER PLAYER — ORIGINAL RECTANGLE BODY ═══ */
            ctx.save();
            ctx.translate(ox, oy + oAnimBob);
            if (oSide) {
              if (oDir === 'left') ctx.scale(-1, 1);
              ctx.globalAlpha = 0.55;
              ctx.save();
              ctx.translate(0, oArmY);
              ctx.rotate(-oSwing);
              ctx.fillStyle = oTC;
              ctx.fillRect(-oaw / 2, 0, oaw, oah2);
              ctx.fillStyle = '#f0c68a';
              ctx.fillRect(-ohw / 2, oah2 - 2, ohw, ohh);
              ctx.restore();
              ctx.save();
              ctx.translate(0, oLegY);
              ctx.rotate(oSwing);
              ctx.fillStyle = oLC;
              ctx.fillRect(-olw / 2, 0, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-osw / 2, olh - 2, osw, osh);
              ctx.restore();
              ctx.globalAlpha = 1;
              ctx.fillStyle = oTC;
              ctx.fillRect(-otw / 2 + 1, 3, otw - 2, oth);
              ctx.save();
              ctx.translate(0, oArmY);
              ctx.rotate(oSwing);
              ctx.fillStyle = oTC;
              ctx.fillRect(-oaw / 2, 0, oaw, oah2);
              ctx.fillStyle = '#f0c68a';
              ctx.fillRect(-ohw / 2, oah2 - 2, ohw, ohh);
              ctx.restore();
              ctx.save();
              ctx.translate(0, oLegY);
              ctx.rotate(-oSwing);
              ctx.fillStyle = oLC;
              ctx.fillRect(-olw / 2, 0, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-osw / 2, olh - 2, osw, osh);
              ctx.restore();
            } else {
              var oLS2 = oMoving ? Math.sin(oFp) * 1.2 : 0;
              var oRS2 = oMoving ? Math.sin(oFp + Math.PI) * 1.2 : 0;
              ctx.fillStyle = oTC;
              ctx.fillRect(-(otw / 2 + oaw), oArmY - 3 + oRS2, oaw, oah2);
              ctx.fillStyle = '#f0c68a';
              ctx.fillRect(-(otw / 2 + oaw) + 0.5, oArmY - 3 + oah2 - 1 + oRS2, ohw, ohh);
              ctx.fillStyle = oLC;
              ctx.fillRect(-(olg / 2 + olw), oLegY - 5 + oLS2, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(-(olg / 2 + olw) - 0.5, oLegY - 5 + olh - 2 + oLS2, osw, osh);
              ctx.fillStyle = oTC;
              ctx.fillRect(-otw / 2, 4, otw, oth);
              ctx.fillStyle = oLC;
              ctx.fillRect(olg / 2, oLegY - 5 + oRS2, olw, olh);
              ctx.fillStyle = '#2a1a0e';
              ctx.fillRect(olg / 2 - 0.5, oLegY - 5 + olh - 2 + oRS2, osw, osh);
              ctx.fillStyle = oTC;
              ctx.fillRect(otw / 2, oArmY - 3 + oLS2, oaw, oah2);
              ctx.fillStyle = '#f0c68a';
              ctx.fillRect(otw / 2 + 0.5, oArmY - 3 + oah2 - 1 + oLS2, ohw, ohh);
            }
            ctx.restore();
          } /* end else (original rectangle body for other player) */

          /* Other player head — skip if NFT 360° body drawn */
          if (!_oHasNft) {
            var oHeadY = oBS === 'slim' ? -6 : -12;
            ctx.fillStyle = '#f0c68a';
            ctx.beginPath();
            ctx.arc(ox, oy + oHeadY + oAnimBob, oHR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3b2414';
            ctx.beginPath();
            ctx.arc(ox, oy + oHeadY - 2 + oAnimBob, oHR, Math.PI, Math.PI * 2);
            ctx.fill();

            /* Other player avatar head — overrides default */
            if (o.mask) {
              /* §MASK — Draw other player's mask */
              if (o.mask === 'crown') {
                /* Crown: draw avatar first, then crown */
                if (o.avatar) {
                  var img = loadAvatarImg(o.avatar);
                  var ready = img instanceof HTMLCanvasElement ? img.width > 0 : img.complete && img.naturalWidth;
                  if (ready) {
                    ctx.save();
                    if (oFlip) {
                      ctx.translate(ox, 0);
                      ctx.scale(-1, 1);
                      ctx.translate(-ox, 0);
                    }
                    ctx.beginPath();
                    ctx.arc(ox, oy + oHeadY + oAnimBob, oHR, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, ox - oHR, oy + oHeadY - oHR + oAnimBob, oHR * 2, oHR * 2);
                    ctx.restore();
                  }
                }
                drawMask(ctx, o.mask, ox, oy + oHeadY + oAnimBob, oHR, now);
              } else {
                drawMask(ctx, o.mask, ox, oy + oHeadY + oAnimBob, oHR, now);
              }
            } else if (o.avatar) {
              var _img = loadAvatarImg(o.avatar);
              var _ready = _img instanceof HTMLCanvasElement ? _img.width > 0 : _img.complete && _img.naturalWidth;
              if (_ready) {
                ctx.save();
                if (oFlip) {
                  ctx.translate(ox, 0);
                  ctx.scale(-1, 1);
                  ctx.translate(-ox, 0);
                }
                ctx.beginPath();
                ctx.arc(ox, oy + oHeadY + oAnimBob, oHR, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(_img, ox - oHR, oy + oHeadY - oHR + oAnimBob, oHR * 2, oHR * 2);
                ctx.restore();
              }
            }

            /* §ANNIV — Other player cape */
            if (o.cape) {
              ctx.save();
              ctx.translate(ox, oy + oAnimBob);
              var ocW = oBS === 'slim' ? 16 : 22;
              var ocH = oBS === 'slim' ? 20 : 26;
              var ocY = oBS === 'slim' ? 4 : 2;
              var ocSwing = oIsMoving ? Math.sin(now / 150) * 2.5 : Math.sin(now / 600) * 0.8;
              var ocGrd = ctx.createLinearGradient(0, ocY, 0, ocY + ocH);
              ocGrd.addColorStop(0, '#1a1a1a');
              ocGrd.addColorStop(0.7, '#1a1a1a');
              ocGrd.addColorStop(1, '#d4a030');
              ctx.fillStyle = ocGrd;
              ctx.beginPath();
              ctx.moveTo(-ocW / 2 + 2, ocY);
              ctx.lineTo(ocW / 2 - 2, ocY);
              ctx.lineTo(ocW / 2 + ocSwing + 1, ocY + ocH);
              ctx.lineTo(-ocW / 2 + ocSwing - 1, ocY + ocH);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#f5c542';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(-ocW / 2 + ocSwing - 1, ocY + ocH);
              ctx.lineTo(ocW / 2 + ocSwing + 1, ocY + ocH);
              ctx.stroke();
              ctx.restore();
            }
          } /* end !_oHasNft head */
          /* Name tag */
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          /* Build display name with clan tag */
          var displayName = o.clanTag ? '[' + o.clanTag + '] ' + o.name : o.name;
          ctx.fillStyle = 'rgba(0,0,0,.6)';
          var ntw = ctx.measureText(displayName).width;
          ctx.fillRect(ox - ntw / 2 - 3, oy - 22, ntw + 6, 12);
          /* Clan tag in clan color, name in player color */
          if (o.clanTag && o.clanColor1) {
            ctx.fillStyle = o.clanColor1;
            var tagText = '[' + o.clanTag + '] ';
            ctx.textAlign = 'left';
            ctx.fillText(tagText, ox - ntw / 2, oy - 13);
            ctx.fillStyle = o.color;
            ctx.fillText(o.name, ox - ntw / 2 + ctx.measureText(tagText).width, oy - 13);
            ctx.textAlign = 'center';
          } else {
            ctx.fillStyle = o.color;
            ctx.fillText(displayName, ox, oy - 13);
          }

          /* Clan logo — tiny 8x8 pixel badge next to name */
          if (o.clanLogo) {
            var logoSize = 10,
              px2 = 10 / CLAN_LOGO_SIZE;
            var lx = ox + ntw / 2 + 4,
              ly = oy - 22;
            for (var _lr = 0; _lr < CLAN_LOGO_SIZE; _lr++) for (var lc = 0; lc < CLAN_LOGO_SIZE; lc++) {
              var _o$clanLogo$_lr;
              var ci = (_o$clanLogo$_lr = o.clanLogo[_lr]) === null || _o$clanLogo$_lr === void 0 ? void 0 : _o$clanLogo$_lr[lc];
              if (ci >= 0 && ci < CLAN_COLORS.length) {
                ctx.fillStyle = CLAN_COLORS[ci];
                ctx.fillRect(lx + lc * px2, ly + _lr * px2, px2 + 0.5, px2 + 0.5);
              }
            }
          }

          /* §19 PvP skull indicator — red skull (active threat) or white skull (rescinded) */
          if (o.pvpSkull) {
            var skullColor = o.pvpSkull === 'red' ? '#ff5e6c' : '#ccc';
            var skullPulse = o.pvpSkull === 'red' ? 0.7 + Math.sin(now / 200) * 0.3 : 0.6;
            ctx.globalAlpha = skullPulse;
            ctx.font = '12px sans-serif';
            ctx.fillText(o.pvpSkull === 'red' ? '💀' : '☠️', ox, oy - 32);
            ctx.globalAlpha = 1;
          }

          /* Other player HP bar + level */
          if (o.rpgLv) {
            var oBarW = 20,
              oBarH = 2.5,
              oBarY = oy - 24 + oAnimBob;
            var oHpPct = (o.rpgHp || 50) / (o.rpgMaxHp || 50);
            ctx.fillStyle = 'rgba(0,0,0,.5)';
            ctx.fillRect(ox - oBarW / 2, oBarY, oBarW, oBarH);
            ctx.fillStyle = oHpPct > 0.5 ? '#3dd497' : oHpPct > 0.25 ? '#f5c542' : '#ff5e6c';
            ctx.fillRect(ox - oBarW / 2, oBarY, oBarW * oHpPct, oBarH);
            ctx.font = 'bold 6px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            ctx.fillText('Lv' + o.rpgLv, ox, oBarY - 1);
          }
          /* Other player badges */
          if (o.badges && o.badges.length > 0) {
            ctx.font = '7px sans-serif';
            var oBadgeStr = o.badges.map(function (bid) {
              var a = BT_ACHIEVEMENTS.find(function (x) {
                return x.id === bid;
              });
              return a ? a.icon : '';
            }).join('');
            ctx.fillText(oBadgeStr, ox, oy - 30);
          }
          /* Other player shield visual */
          if (o._shieldUp) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(_now / 150) * 0.15;
            var shieldFaceA = oDir === 'right' ? 0 : oDir === 'up' ? -Math.PI / 2 : oDir === 'left' ? Math.PI : Math.PI / 2;
            var shX = ox + Math.cos(shieldFaceA) * 12;
            var shY = oy + oAnimBob + 6 + Math.sin(shieldFaceA) * 8;
            /* Shield circle */
            ctx.strokeStyle = '#5b9bd5';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#5b9bd5';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(shX, shY, 14, shieldFaceA - 1.2, shieldFaceA + 1.2);
            ctx.stroke();
            /* Inner fill */
            ctx.fillStyle = 'rgba(91,155,213,.15)';
            ctx.beginPath();
            ctx.arc(shX, shY, 13, shieldFaceA - 1.2, shieldFaceA + 1.2);
            ctx.lineTo(shX, shY);
            ctx.fill();
            ctx.restore();
          }

          /* Other player swing visual — enhanced white arc */
          if (o._swingTs && _now - o._swingTs < 350) {
            var swAge2 = (_now - o._swingTs) / 350;
            var swAlpha = 1 - swAge2;
            var swFaceA = oDir === 'right' ? 0 : oDir === 'up' ? -Math.PI / 2 : oDir === 'left' ? Math.PI : Math.PI / 2;
            var swArc = 1.6;
            var swRadius = 38;
            var swStartA = swFaceA - swArc / 2 + swAge2 * swArc;
            var swColor = o.wpnE1 && ELEMENTS[o.wpnE1] ? ELEMENTS[o.wpnE1].color : '#fff';
            ctx.save();
            /* Large white glow arc */
            ctx.globalAlpha = swAlpha * 0.6;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(ox, oy + oAnimBob + 8, swRadius, swFaceA - swArc / 2, swFaceA - swArc / 2 + swAge2 * swArc);
            ctx.stroke();
            /* Inner colored blade line */
            ctx.globalAlpha = swAlpha * 0.9;
            ctx.strokeStyle = swColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = swColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(ox, oy + oAnimBob + 8);
            ctx.lineTo(ox + Math.cos(swStartA) * swRadius, oy + oAnimBob + 8 + Math.sin(swStartA) * swRadius);
            ctx.stroke();
            /* Sweeping trail */
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ox, oy + oAnimBob + 8, swRadius * 0.7, swFaceA - swArc / 2, swFaceA - swArc / 2 + swAge2 * swArc);
            ctx.stroke();
            ctx.restore();
          }
        });

        /* ═══ REMOTE PROJECTILES — arrows and staff bolts from other players ═══ */
        if (S._remoteProjectiles && S._remoteProjectiles.length > 0) {
          S._remoteProjectiles = S._remoteProjectiles.filter(function(rp) {
            rp.dist += rp.isStaff ? 5 : 8;
            rp.life--;
            if (rp.life <= 0) return false;
            /* Find the owner's current position for origin */
            var owner = S.others[rp.ownerId];
            var originX = owner ? (owner.renderX || owner.x) : rp.x;
            var originY = owner ? (owner.renderY || owner.y) : rp.y;
            var px2 = originX + Math.cos(rp.ang) * rp.dist;
            var py2 = originY + Math.sin(rp.ang) * rp.dist;
            var sx2 = px2 - cx, sy2 = py2 - cy;
            if (sx2 < -40 || sx2 > W + 40 || sy2 < -40 || sy2 > H + 40) return false;
            ctx.save();
            if (rp.isStaff) {
              /* Staff bolt — glowing orb */
              ctx.globalAlpha = 0.8;
              ctx.fillStyle = '#a855f7';
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
              ctx.fill();
              /* Trail */
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.arc(sx2 - Math.cos(rp.ang) * 6, sy2 - Math.sin(rp.ang) * 6, 3, 0, Math.PI * 2);
              ctx.fill();
            } else {
              /* Arrow — line with head */
              ctx.globalAlpha = 0.9;
              ctx.strokeStyle = '#d4a574';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(sx2 - Math.cos(rp.ang) * 10, sy2 - Math.sin(rp.ang) * 10);
              ctx.lineTo(sx2, sy2);
              ctx.stroke();
              /* Arrowhead */
              ctx.fillStyle = '#aaa';
              ctx.beginPath();
              ctx.moveTo(sx2, sy2);
              ctx.lineTo(sx2 - Math.cos(rp.ang - 0.3) * 5, sy2 - Math.sin(rp.ang - 0.3) * 5);
              ctx.lineTo(sx2 - Math.cos(rp.ang + 0.3) * 5, sy2 - Math.sin(rp.ang + 0.3) * 5);
              ctx.fill();
            }
            ctx.restore();
            return true;
          });
        }

        /* ═══ ARROW PROJECTILES ═══ */
        /* ═══ ARROWS — travel along LOS, follow aim direction ═══ */
        if (S.arrows && S.arrows.length > 0) {
          /* Determine current aim angle for LOS tracking */
          var curAim;
          if (S.lockedTarget && S.lockedTarget.ref) {
            var lt2 = S.lockedTarget.ref;
            curAim = Math.atan2((lt2.y || 0) - P.y, (lt2.x || 0) - P.x);
          } else if (S._aiming) {
            curAim = S._aimAngle || 0;
          } else {
            var fd2 = S._facing || 'down';
            curAim = fd2 === 'right' ? 0 : fd2 === 'up' ? -Math.PI / 2 : fd2 === 'left' ? Math.PI : Math.PI / 2;
          }
          S.arrows = S.arrows.filter(function (a) {
            var _S$rpg15;
            var activeWpn = S.rpg ? getActiveWeapon(S.rpg) : {
              element1: null,
              element2: null
            };
            var pDmg = S.rpg ? calcWeaponDmg(activeWpn.type || 'greatsword', S.rpg.power || 0, activeWpn.tierMult || 1) : 10;
            a.dist += a.isStaff ? 5 : 8;
            a.life--;
            /* Projectiles follow the active LOS while aiming */
            if (S._aiming || S.lockedTarget && S.lockedTarget.ref) a.ang = curAim;
            /* Position = player + angle × distance */
            var ax2 = P.x + Math.cos(a.ang) * a.dist;
            var ay2 = P.y + Math.sin(a.ang) * a.dist;
            if (a.life <= 0) return false;
            /* Hit detection */
            var hit = false;
            if (S.monsters) S.monsters.forEach(function (m) {
              if (!m.alive || a.hitIds.has(m.id) || hit) return;
              if (Math.sqrt(Math.pow(m.x - ax2, 2) + Math.pow(m.y - ay2, 2)) < (a.isStaff ? 30 : 18)) {
                a.hitIds.add(m.id);

                /* §9 — Apply element status on arrow hit */
                var arrowElem = a.isSpecial ? activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element2 : activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element1;
                if (arrowElem) {
                  var _ELEMENTS$arrowElem;
                  var statusId = (_ELEMENTS$arrowElem = ELEMENTS[arrowElem]) === null || _ELEMENTS$arrowElem === void 0 ? void 0 : _ELEMENTS$arrowElem.status;
                  if (statusId) applyStatus(m, statusId, S.player, Date.now());
                }

                /* §10.3 — Check for collision */
                var arrowCollision = null;
                if (arrowElem && S.rpg) {
                  arrowCollision = resolveCollision(m, arrowElem, S.player, S.rpg, Date.now());
                }

                /* Boss invulnerability check */
                if (m._invulnerable) {
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: 'IMMUNE',
                    color: '#888',
                    ts: Date.now()
                  });
                  a.hit = true;
                  return;
                }
                m.curHp -= a.dmg;

                /* Report arrow damage to server */
                if (S._serverMonsters && S.channel) {
                  var arrowTotalDmg = a.dmg;
                  if (arrowCollision) arrowTotalDmg += arrowCollision.damage;
                  S.channel.send({ type: 'monster_damage', payload: {
                    monsterId: m.id, zone: S.currentZone, dmg: arrowTotalDmg, isCrit: false, element: null
                  }});
                }

                /* Collision damage + feedback on arrow hit */
                if (arrowCollision) {
                  var _ELEMENTS$arrowCollis;
                  m.curHp -= arrowCollision.damage;
                  var coll = arrowCollision.collision;
                  var elemCol = ((_ELEMENTS$arrowCollis = ELEMENTS[arrowCollision.triggerElement]) === null || _ELEMENTS$arrowCollis === void 0 ? void 0 : _ELEMENTS$arrowCollis.color) || '#fff';
                  S.dmgNumbers.push({
                    x: m.x + 8,
                    y: m.y - 30,
                    text: '💥' + arrowCollision.damage + ' ' + coll.name,
                    color: elemCol,
                    ts: Date.now()
                  });
                  if (arrowCollision.manaRestored > 0) {
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 45,
                      text: '+' + arrowCollision.manaRestored + ' MP',
                      color: '#3b82f6',
                      ts: Date.now()
                    });
                  }
                  BT_AUDIO.collisionSound(arrowCollision.setupElement, arrowCollision.triggerElement, arrowCollision.manaRestored);
                  for (var cp = 0; cp < 12; cp++) {
                    S.hitParticles.push({
                      x: m.x + (Math.random() - 0.5) * 6,
                      y: m.y + (Math.random() - 0.5) * 6,
                      vx: (Math.random() - 0.5) * 5,
                      vy: (Math.random() - 0.5) * 5 - 2,
                      life: 0.7,
                      color: elemCol,
                      size: 2 + Math.random() * 2
                    });
                  }
                  S.screenShake = Math.max(S.screenShake, 4);
                  BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
                  var isNew = discoverCollision(coll.id);
                  if (isNew) {
                    S.dmgNumbers.push({
                      x: P.x,
                      y: P.y - 60,
                      text: '📖 NEW: ' + coll.name + '!',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                    BT_AUDIO.collect();
                  }
                }
                if (a.isStaff) BT_AUDIO.magicHit({ vol: 0.3 });
                else BT_AUDIO.play('arrow-hit', { vol: 0.6 });
                var kba = Math.atan2(m.y - ay2, m.x - ax2);
                m.x += Math.cos(kba) * 5;
                m.y += Math.sin(kba) * 5;
                /* ═══ Weapon-specific hit FX for ranged ═══ */
                var rangedWpnType = a.isStaff ? 'staff' : 'bow';
                var rangedHitFX = spawnWeaponHitFX(m.x, m.y, kba, rangedWpnType, false);
                rangedHitFX.forEach(function (p) {
                  return S.hitParticles.push(p);
                });
                /* ═══ STUCK ARROW — embed in monster ═══ */
                if (!m._stuckArrows) m._stuckArrows = [];
                if (m._stuckArrows.length < 6) {
                  m._stuckArrows.push({
                    ang: a.ang,
                    ox: (Math.random() - 0.5) * 8,
                    oy: (Math.random() - 0.5) * 8,
                    isStaff: a.isStaff || false,
                    color: projElem && ELEMENTS[projElem] ? ELEMENTS[projElem].color : '#8B6914'
                  });
                }
                if (!S.dmgNumbers) S.dmgNumbers = [];
                S.dmgNumbers.push({
                  x: m.x,
                  y: m.y - 10,
                  text: a.dmg + '',
                  color: '#ff9',
                  ts: Date.now()
                });
                /* Kill check — use same reward path as melee kills */
                if (m.curHp <= 0) {
                  m.alive = false;
                  m.respawnAt = Date.now() + 30000;
                  m.statuses = {};

                  /* Quest kill tracking */
                  if (S.rpg) {
                    var _R9 = S.rpg;
                    if (!_R9._questKills) _R9._questKills = {};
                    Object.keys(QUEST_CHAINS).forEach(function (qid) {
                      var _R9$_quests;
                      if (((_R9$_quests = _R9._quests) === null || _R9$_quests === void 0 ? void 0 : _R9$_quests[qid]) === QUEST_STATUS.active) _R9._questKills[qid] = (_R9._questKills[qid] || 0) + 1;
                    });

                    /* Death feedback — simplified Grand Slam for arrows */
                    var isCrit = a.dmg > pDmg; /* special arrows count as crit */
                    BT_AUDIO.deathBoom();
                    S.screenShake = isCrit ? 6 : 3;

                    /* Death particles — element-specific for arrow kills */
                    var killAngle = a.ang;
                    var arrowDeathParts = [];
                    var _arrowKillElem = arrowElem || projElem || null;
                    var _arrowKillColl = arrowCollision ? arrowCollision.collision : null;
                    if (_arrowKillColl) {
                      var collFx = getCollisionDeathFX(m.x, m.y, _arrowKillColl.id, killAngle, {
                        fodder: 8,
                        brute: 15,
                        swarm: 6,
                        sentinel: 12,
                        volatile: 9,
                        stalker: 10,
                        hexer: 10
                      }[m.archetype || 'fodder'] || 10, isCrit ? 2 : 1);
                      collFx.forEach(function (p) {
                        return arrowDeathParts.push(p);
                      });
                    } else if (_arrowKillElem) {
                      var elemFx = getElementDeathFX(m.x, m.y, _arrowKillElem, killAngle, m.color, {
                        fodder: 8,
                        brute: 15,
                        swarm: 6,
                        sentinel: 12,
                        volatile: 9,
                        stalker: 10,
                        hexer: 10
                      }[m.archetype || 'fodder'] || 10, isCrit ? 2 : 1);
                      elemFx.particles.forEach(function (p) {
                        return arrowDeathParts.push(p);
                      });
                    } else {
                      for (var dp = 0; dp < 15; dp++) {
                        arrowDeathParts.push({
                          x: m.x,
                          y: m.y,
                          vx: Math.cos(killAngle + (Math.random() - 0.5) * 1.5) * (2 + Math.random() * 4),
                          vy: Math.sin(killAngle + (Math.random() - 0.5) * 1.5) * (2 + Math.random() * 4) - 2,
                          life: 1,
                          color: m.color,
                          size: 1.5 + Math.random() * 2
                        });
                      }
                    }
                    arrowDeathParts.forEach(function (dp) {
                      return S.hitParticles.push(dp);
                    });
                    /* Death explosion with kill type */
                    var _arrowBodySize = {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[m.archetype || 'fodder'] || 10;
                    S.deathExplosions.push({
                      x: m.x,
                      y: m.y,
                      ts: Date.now(),
                      emoji: m.emoji,
                      particles: arrowDeathParts,
                      isGrandSlam: isCrit,
                      killScale: isCrit ? 2 : 1,
                      killType: isStaffProj ? 'magic' : 'ranged',
                      killElement: _arrowKillElem,
                      killCollision: (_arrowKillColl === null || _arrowKillColl === void 0 ? void 0 : _arrowKillColl.id) || null,
                      weaponType: isStaffProj ? 'staff' : 'bow',
                      killAngle: killAngle,
                      bodyColor: m.color,
                      bodySize: _arrowBodySize,
                      archetype: m.archetype || 'fodder',
                      stuckArrows: m._stuckArrows || []
                    });

                    /* Drop loot on ground */
                    S.groundLoot.push({
                      x: m.x + (Math.random() - 0.5) * 15,
                      y: m.y + (Math.random() - 0.5) * 15,
                      coins: m.gold || m.coins || 2,
                      xp: 0,
                      skull: m.type,
                      skullEmoji: '🦴',
                      ts: Date.now()
                    });

                    /* Weapon drop chance */
                    var dropChance = Math.min(0.15, 0.03 + (m.level || 1) * 0.001);
                    if (Math.random() < dropChance) {
                      var _zone7 = ZONES[S.currentZone];
                      var _zoneElem2 = _zone7 === null || _zone7 === void 0 ? void 0 : _zone7.element;
                      var dropRoll = Math.random();
                      var dropTier,
                        dropE1 = null,
                        dropE2 = null,
                        dropName = '',
                        dropVolatile = false;
                      if (dropRoll < 0.60) {
                        dropTier = 'common';
                      } else if (dropRoll < 0.85) {
                        dropTier = 'elemental';
                        dropE1 = _zoneElem2 || 'flame';
                      } else if (dropRoll < 0.97) {
                        dropTier = 'fusion';
                        dropE1 = _zoneElem2 || 'flame';
                        var palette = ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind'].filter(function (e) {
                          return e !== dropE1;
                        });
                        dropE2 = palette[Math.floor(Math.random() * palette.length)];
                        var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
                        dropVolatile = volPairs.some(function (_ref19) {
                          var _ref20 = _slicedToArray(_ref19, 2),
                            a2 = _ref20[0],
                            b = _ref20[1];
                          return dropE1 === a2 && dropE2 === b || dropE1 === b && dropE2 === a2;
                        });
                      } else {
                        dropTier = 'shift';
                        dropE1 = _zoneElem2 || 'flame';
                        dropE2 = 'adaptive';
                      }
                      var dropTypes = ['greatsword', 'sword', 'bow', 'staff'];
                      var dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                      var tierMult = RARITY_TIERS[dropTier].mult;
                      if (dropTier === 'common') dropName = WEAPON_TYPES[dropType].label;else if (dropTier === 'elemental') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + ' ' + WEAPON_TYPES[dropType].label;else if (dropTier === 'fusion') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + (dropE2.charAt(0).toUpperCase() + dropE2.slice(1)) + ' ' + WEAPON_TYPES[dropType].label;else dropName = 'Prismatic ' + WEAPON_TYPES[dropType].label;
                      S.groundLoot.push({
                        x: m.x + (Math.random() - 0.5) * 20,
                        y: m.y + (Math.random() - 0.5) * 20,
                        ts: Date.now(),
                        isWeapon: true,
                        weapon: {
                          type: dropType,
                          tier: dropTier,
                          tierMult: tierMult,
                          element1: dropE1,
                          element2: dropE2,
                          name: dropName,
                          isVolatile: dropVolatile
                        },
                        tierColor: RARITY_TIERS[dropTier].color
                      });
                      S.dmgNumbers.push({
                        x: m.x,
                        y: m.y - 40,
                        text: '🗡️ ' + dropName + '!',
                        color: RARITY_TIERS[dropTier].color,
                        ts: Date.now()
                      });
                    }
                    setRpgState(_objectSpread({}, _R9));
                    try {
                      localStorage.setItem('bt_rpg', JSON.stringify(_R9));
                    } catch (e) {}
                  }
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: '☠️',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
                hit = true;
              }
            });
            if (hit) return false;
            /* Render arrow */
            var sx = ax2 - cx,
              sy = ay2 - cy;
            var fadeA = Math.min(1, a.life / 20);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(a.ang);
            ctx.globalAlpha = fadeA;

            /* Get element color for this projectile */
            var projElem = a.element || (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element1);
            var projColor = projElem && ELEMENTS[projElem] ? ELEMENTS[projElem].color : '#c8c8d0';
            var isStaffProj = (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.type) === 'staff' || a.isSpecial && ((_S$rpg15 = S.rpg) === null || _S$rpg15 === void 0 ? void 0 : _S$rpg15.activeSlot) === 'staff';
            if (a.isSpecial || a.ice) {
              /* Special/heavy projectile — large, glowing, element-colored */
              var _size = isStaffProj ? 1.5 : 1.0;
              ctx.shadowColor = projColor + 'cc';
              ctx.shadowBlur = 18 * _size;
              ctx.fillStyle = projColor + 'dd';
              ctx.fillRect(-16 * _size, -5 * _size, 32 * _size, 10 * _size);
              /* Arrowhead */
              ctx.fillStyle = projColor;
              ctx.beginPath();
              ctx.moveTo(16 * _size, 0);
              ctx.lineTo(10 * _size, -6 * _size);
              ctx.lineTo(10 * _size, 6 * _size);
              ctx.closePath();
              ctx.fill();
              /* Inner glow */
              ctx.shadowBlur = 10 * _size;
              ctx.fillStyle = projColor + '44';
              ctx.beginPath();
              ctx.arc(0, 0, 8 * _size, 0, Math.PI * 2);
              ctx.fill();
              /* Sparkle particles */
              for (var sp = 0; sp < 3; sp++) {
                var spx = -8 + Math.sin(Date.now() / 100 + sp * 2) * 10;
                var spy = Math.cos(Date.now() / 80 + sp * 3) * 4 * _size;
                ctx.fillStyle = projColor + '88';
                ctx.fillRect(spx - 1, spy - 1, 2, 2);
              }
              ctx.shadowBlur = 0;
            } else if (isStaffProj) {
              /* Staff auto-attack — larger, slower energy orb */
              ctx.shadowColor = projColor + 'aa';
              ctx.shadowBlur = 12;
              ctx.fillStyle = projColor + 'bb';
              ctx.beginPath();
              ctx.arc(0, 0, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = projColor + '44';
              ctx.beginPath();
              ctx.arc(0, 0, 11, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              /* Normal bow arrow — element-tinted */
              ctx.fillStyle = '#8B6914';
              ctx.fillRect(-8, -1.5, 16, 3);
              ctx.fillStyle = projColor;
              ctx.beginPath();
              ctx.moveTo(9, 0);
              ctx.lineTo(5, -3.5);
              ctx.lineTo(5, 3.5);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = projColor + '88';
              ctx.fillRect(-8, -2.5, 3, 1.5);
              ctx.fillRect(-8, 1, 3, 1.5);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return true;
          });
        }

        /* ═══ LOCK-ON INDICATOR ═══ */
        if (S.lockedTarget && S.lockedTarget.ref) {
          var _lt3 = S.lockedTarget.ref;
          var ltx = (_lt3.x || _lt3.renderX || 0) - cx;
          var lty = (_lt3.y || _lt3.renderY || 0) - cy;
          var lockT = Date.now() / 500;
          var lockR = 18 + Math.sin(lockT * 2) * 3;
          ctx.save();
          ctx.strokeStyle = 'rgba(255,60,60,0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -Date.now() / 50;
          ctx.beginPath();
          ctx.arc(ltx, lty, lockR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          /* Corner brackets */
          var bsz = 6;
          ctx.strokeStyle = 'rgba(255,60,60,0.9)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ltx - lockR, lty - lockR + bsz);
          ctx.lineTo(ltx - lockR, lty - lockR);
          ctx.lineTo(ltx - lockR + bsz, lty - lockR);
          ctx.moveTo(ltx + lockR - bsz, lty - lockR);
          ctx.lineTo(ltx + lockR, lty - lockR);
          ctx.lineTo(ltx + lockR, lty - lockR + bsz);
          ctx.moveTo(ltx + lockR, lty + lockR - bsz);
          ctx.lineTo(ltx + lockR, lty + lockR);
          ctx.lineTo(ltx + lockR - bsz, lty + lockR);
          ctx.moveTo(ltx - lockR + bsz, lty + lockR);
          ctx.lineTo(ltx - lockR, lty + lockR);
          ctx.lineTo(ltx - lockR, lty + lockR - bsz);
          ctx.stroke();
          /* Target name */
          var ltName = _lt3.name || _lt3.type || _lt3.emoji || '?';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,60,60,0.7)';
          ctx.fillText('🎯 ' + ltName, ltx, lty - lockR - 4);
          ctx.restore();
        }

        /* ═══ ZONE AMBIENT PARTICLES — §2 Immersion Through Accumulation ═══ */
        if (!S._ambientParticles) S._ambientParticles = [];
        /* zoneElem already defined above for tile rendering */
        /* Spawn new ambient particles — higher cap in elemental zones */
        var _apMax = zoneElem ? 50 : 30;
        var _apRate = zoneElem ? 0.25 : 0.15;
        if (S._ambientParticles.length < _apMax && Math.random() < _apRate) {
          var apx = cx + Math.random() * W;
          var apy = cy + Math.random() * H;
          var ap = {
            x: apx,
            y: apy,
            life: 1
          };
          var _r2 = Math.random();
          if (zoneElem === 'flame') {
            if (_r2 < 0.6) {
              /* Floating embers — rising orange sparks */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.5 - Math.random() * 0.8,
                color: '#ff6030',
                size: 1.5 + Math.random(),
                type: 'ember'
              });
            } else if (_r2 < 0.85) {
              /* Heat shimmer — wide faint distortion */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.1,
                vy: -0.15,
                color: 'rgba(255,160,60,0.15)',
                size: 4 + Math.random() * 4,
                type: 'shimmer'
              });
            } else {
              /* Ash flake — slow drifting gray */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.4,
                vy: 0.1 + Math.random() * 0.2,
                color: '#888',
                size: 1 + Math.random() * 0.5,
                type: 'ash'
              });
            }
          } else if (zoneElem === 'frost') {
            if (_r2 < 0.5) {
              /* Drifting snowflakes */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.5,
                vy: 0.2 + Math.random() * 0.3,
                color: '#cce8ff',
                size: 1 + Math.random() * 2,
                type: 'snow'
              });
            } else if (_r2 < 0.8) {
              /* Frost sparkle — brief twinkle */
              Object.assign(ap, {
                vx: 0,
                vy: 0,
                color: '#fff',
                size: 1 + Math.random(),
                life: 0.5,
                type: 'frostspark'
              });
            } else {
              /* Ice crystal — large slow-falling */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.2,
                vy: 0.1 + Math.random() * 0.15,
                color: '#a0d0f0',
                size: 2 + Math.random() * 2,
                type: 'icecrystal'
              });
            }
          } else if (zoneElem === 'venom') {
            if (_r2 < 0.5) {
              /* Floating spores — bobbing green dots */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.2,
                vy: -0.1 + Math.sin(now / 1000 + apx) * 0.2,
                color: '#4ade80',
                size: 1 + Math.random(),
                type: 'spore'
              });
            } else if (_r2 < 0.8) {
              /* Fog wisp — large faint green cloud */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.15,
                vy: -0.05,
                color: 'rgba(60,180,60,0.08)',
                size: 6 + Math.random() * 6,
                type: 'fogwisp'
              });
            } else {
              /* Toxic bubble — rising, popping */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.1,
                vy: -0.3 - Math.random() * 0.3,
                color: '#80ff80',
                size: 1.5 + Math.random(),
                life: 0.6,
                type: 'bubble'
              });
            }
          } else if (zoneElem === 'storm') {
            if (_r2 < 0.5) {
              /* Spark flashes — bright quick */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: '#a78bfa',
                size: 1 + Math.random() * 1.5,
                life: 0.3,
                type: 'spark'
              });
            } else if (_r2 < 0.8) {
              /* Rain streaks — fast falling lines */
              Object.assign(ap, {
                vx: 0.3,
                vy: 3 + Math.random() * 2,
                color: 'rgba(160,170,200,0.2)',
                size: 1,
                type: 'rain'
              });
            } else {
              /* Lightning flash — instant bright */
              Object.assign(ap, {
                vx: 0,
                vy: 0,
                color: '#d0c0ff',
                size: 3 + Math.random() * 3,
                life: 0.15,
                type: 'lightning'
              });
            }
          } else if (zoneElem === 'stone') {
            if (_r2 < 0.6) {
              /* Dust motes — slow settling */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.15,
                vy: 0.05 + Math.random() * 0.1,
                color: '#b8a080',
                size: 0.8 + Math.random() * 0.8,
                type: 'dust'
              });
            } else {
              /* Mineral glint — brief sparkle on ground */
              Object.assign(ap, {
                vx: 0,
                vy: 0,
                color: '#e0c880',
                size: 1 + Math.random(),
                life: 0.4,
                type: 'glint'
              });
            }
          } else if (zoneElem === 'wind') {
            if (_r2 < 0.4) {
              /* Leaves drifting — fast horizontal */
              Object.assign(ap, {
                vx: 0.5 + Math.random() * 0.8,
                vy: Math.sin(now / 800 + apx) * 0.3,
                color: '#7a9a4a',
                size: 2 + Math.random(),
                type: 'leaf'
              });
            } else if (_r2 < 0.7) {
              /* Wind streak — horizontal blur */
              Object.assign(ap, {
                vx: 2 + Math.random() * 2,
                vy: (Math.random() - 0.5) * 0.3,
                color: 'rgba(200,220,240,0.08)',
                size: 1,
                life: 0.4,
                type: 'windstreak'
              });
            } else {
              /* Feather — slow tumbling */
              Object.assign(ap, {
                vx: 0.3 + Math.random() * 0.5,
                vy: 0.1 + Math.random() * 0.2,
                color: '#e0e8f0',
                size: 1.5 + Math.random(),
                type: 'feather'
              });
            }
          } else if (zoneElem === 'water') {
            if (_r2 < 0.5) {
              /* Mist droplets — rising fog */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.2,
                vy: -0.2 - Math.random() * 0.2,
                color: '#80c0e0',
                size: 1 + Math.random(),
                type: 'mist'
              });
            } else if (_r2 < 0.8) {
              /* Water spray — brief upward burst */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.4 - Math.random() * 0.3,
                color: 'rgba(100,180,240,0.15)',
                size: 2 + Math.random() * 2,
                life: 0.5,
                type: 'spray'
              });
            } else {
              /* Bubble — slow rising */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.1,
                vy: -0.15 - Math.random() * 0.1,
                color: 'rgba(140,200,240,0.2)',
                size: 1.5 + Math.random(),
                type: 'wbubble'
              });
            }
          } else if (zoneElem === 'dark') {
            if (_r2 < 0.5) {
              /* Shadow wisps — sinuous dark tendrils */
              Object.assign(ap, {
                vx: Math.sin(now / 600 + apx) * 0.3,
                vy: -0.3,
                color: '#3a2a5a',
                size: 2 + Math.random() * 2,
                type: 'wisp'
              });
            } else if (_r2 < 0.8) {
              /* Void spark — purple flash */
              Object.assign(ap, {
                vx: 0,
                vy: 0,
                color: '#7a30b0',
                size: 2 + Math.random() * 2,
                life: 0.2,
                type: 'voidspark'
              });
            } else {
              /* Creeping shadow — ground-level dark blob */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.1,
                color: 'rgba(10,5,30,0.15)',
                size: 5 + Math.random() * 5,
                type: 'creep'
              });
            }
          } else if (zoneElem === 'light') {
            if (_r2 < 0.5) {
              /* Golden motes — rising warm sparks */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.3,
                color: '#fde68a',
                size: 1 + Math.random(),
                type: 'mote'
              });
            } else if (_r2 < 0.8) {
              /* Light beam dust — slow vertical rise */
              Object.assign(ap, {
                vx: (Math.random() - 0.5) * 0.05,
                vy: -0.1,
                color: 'rgba(255,240,180,0.12)',
                size: 2 + Math.random() * 3,
                type: 'beamdust'
              });
            } else {
              /* Prismatic sparkle — multicolor brief */
              var _pCols = ['#fde68a', '#fca5a5', '#93c5fd', '#86efac'];
              Object.assign(ap, {
                vx: 0,
                vy: 0,
                color: _pCols[Math.floor(Math.random() * 4)],
                size: 1.5 + Math.random(),
                life: 0.3,
                type: 'prismatic'
              });
            }
          } else {
            /* Town/meadow — occasional dandelion puff */
            if (Math.random() < 0.3) Object.assign(ap, {
              vx: 0.2 + Math.random() * 0.3,
              vy: -0.1 + Math.sin(now / 2000) * 0.1,
              color: '#fff',
              size: 1,
              type: 'seed'
            });else ap.life = 0; /* skip */
          }
          if (ap.life > 0) S._ambientParticles.push(ap);
        }
        /* Render + tick ambient particles */
        S._ambientParticles = S._ambientParticles.filter(function (ap) {
          if (isNaN(ap.x) || isNaN(ap.y)) return false;
          ap.x += ap.vx || 0;
          ap.y += ap.vy || 0;
          var decayRate = ap.type === 'spark' || ap.type === 'lightning' || ap.type === 'voidspark' || ap.type === 'prismatic' || ap.type === 'frostspark' ? 0.03 : 0.004;
          ap.life -= decayRate;
          if (ap.life <= 0) return false;
          var apsx = ap.x - cx,
            apsy = ap.y - cy;
          if (apsx < -20 || apsx > W + 20 || apsy < -20 || apsy > H + 20) return false;
          var fastTypes = new Set(['spark', 'lightning', 'voidspark', 'prismatic', 'frostspark', 'glint']);
          ctx.globalAlpha = ap.life * (fastTypes.has(ap.type) ? 0.8 : 0.5);
          ctx.fillStyle = ap.color;
          if (ap.type === 'leaf' || ap.type === 'feather') {
            ctx.save();
            ctx.translate(apsx, apsy);
            ctx.rotate(now / 500 + ap.x);
            ctx.fillRect(-ap.size / 2, -1, ap.size, 2);
            ctx.restore();
          } else if (ap.type === 'rain') {
            ctx.strokeStyle = ap.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(apsx, apsy);
            ctx.lineTo(apsx - 1, apsy - 6);
            ctx.stroke();
          } else if (ap.type === 'windstreak') {
            ctx.strokeStyle = ap.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(apsx, apsy);
            ctx.lineTo(apsx - 8, apsy);
            ctx.stroke();
          } else if (ap.type === 'icecrystal') {
            /* Small diamond shape */
            ctx.beginPath();
            ctx.moveTo(apsx, apsy - ap.size);
            ctx.lineTo(apsx + ap.size * 0.6, apsy);
            ctx.lineTo(apsx, apsy + ap.size);
            ctx.lineTo(apsx - ap.size * 0.6, apsy);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(apsx, apsy, ap.size * ap.life, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          return true;
        });

        /* ═══ RENDER & TICK GATHERING NODES — §18 Life Skills ═══ */
        if (S.gatherNodes) {
          S.gatherNodes.forEach(function (node) {
            var _RESOURCE_TIERS$Math$;
            /* Respawn check */
            if (!node.alive) {
              if (Date.now() > node.respawnAt) {
                node.alive = true;
                node.hp = node.maxHp;
              }
              return;
            }
            node._hitThisSwing = false; /* reset per frame */

            var nx = node.x - cx,
              ny = node.y - cy;
            if (nx < -30 || nx > W + 30 || ny < -30 || ny > H + 30) return;

            /* Tier determines visual scale — uses _tier data from progression tables */
            var tierLvl = node.gatherLvl || 1;
            var tier = Math.min(10, Math.max(1, Math.ceil(tierLvl / 10))); /* 1-10 visual scale */
            var tierScale = 0.7 + tier * 0.12;
            var tierColor = ((_RESOURCE_TIERS$Math$ = RESOURCE_TIERS[Math.min(20, node.resTier || 1)]) === null || _RESOURCE_TIERS$Math$ === void 0 ? void 0 : _RESOURCE_TIERS$Math$.color) || '#8890b8';
            var nodeTier = node._tier || {};

            /* Tier-colored base glow — bigger and brighter at higher tiers */
            var pulse = 0.3 + Math.sin(now / 600 + node.x) * 0.15;
            ctx.fillStyle = tierColor;
            ctx.globalAlpha = pulse * (0.15 + tier * 0.05);
            ctx.beginPath();
            ctx.arc(nx, ny, 10 + tier * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            /* Node body — distinct per type AND tier */
            var nt = node.nodeType || node.resourceType;
            if (nt === 'tree' || nt === 'wood') {
              /* ═══ TREES — size and color from WOODCUTTING_TIERS ═══ */
              var tw2 = nodeTier.trunkW || 3 + tier;
              var th2 = nodeTier.trunkH || 6 + tier * 2;
              var cr = nodeTier.canopyR || 5 + tier * 3;
              var cc = nodeTier.canopyColor || '#3a8a2a';
              var tc = nodeTier.trunkColor || '#4a3018';
              /* Trunk */
              ctx.fillStyle = tc;
              ctx.fillRect(nx - tw2 / 2, ny - th2 / 3, tw2, th2);
              /* Canopy — scales with tier data */
              ctx.fillStyle = cc;
              ctx.beginPath();
              ctx.arc(nx, ny - th2 / 3 - cr * 0.6, cr, 0, Math.PI * 2);
              ctx.fill();
              /* Highlight canopy */
              ctx.fillStyle = cc.replace(/\d+/g, function (m) {
                return Math.min(255, parseInt(m) + 30);
              });
              ctx.beginPath();
              ctx.arc(nx - cr * 0.2, ny - th2 / 3 - cr * 0.7, cr * 0.6, 0, Math.PI * 2);
              ctx.fill();
              /* High-tier trees get magical sparkles */
              if (tierLvl >= 31) {
                ctx.fillStyle = tierColor;
                ctx.globalAlpha = 0.3 + Math.sin(now / 300 + node.x) * 0.2;
                for (var sp = 0; sp < Math.min(5, Math.ceil(tier / 2)); sp++) {
                  var sa = now / 400 + sp * 2.1;
                  ctx.beginPath();
                  ctx.arc(nx + Math.cos(sa) * cr * 0.5, ny - th2 / 3 - cr * 0.5 + Math.sin(sa) * cr * 0.3, 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
                ctx.globalAlpha = 1;
              }
              /* Axe mark when damaged */
              if (node.hp < node.maxHp) {
                ctx.strokeStyle = '#8B6914';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(nx - tw2 / 2 - 1, ny - 2);
                ctx.lineTo(nx + tw2 / 2 + 1, ny + 2);
                ctx.stroke();
              }
            } else if (nt === 'fishSpot' || nt === 'fish') {
              /* ═══ FISH SPOTS — size and color from FISHING_TIERS ═══ */
              var poolR = nodeTier.size || 6 + tier * 2;
              var wCol = nodeTier.waterColor || 'rgba(52,152,219,.35)';
              /* Pool body */
              ctx.fillStyle = wCol;
              if (poolR <= 12) {
                ctx.beginPath();
                ctx.arc(nx, ny, poolR, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.ellipse(nx, ny, poolR * 1.2, poolR * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
              }
              /* Ripples — more at higher tiers */
              ctx.strokeStyle = wCol.replace(/[\d.]+\)$/, function (m) {
                return (parseFloat(m) * 0.6).toFixed(2) + ')';
              });
              ctx.lineWidth = tier >= 5 ? 1.5 : 1;
              var ripple = Math.sin(now / 400 + node.x) * (1 + tier * 0.3);
              ctx.beginPath();
              ctx.arc(nx, ny, poolR - 2 + ripple, 0, Math.PI * 2);
              ctx.stroke();
              if (tier >= 3) {
                ctx.beginPath();
                ctx.arc(nx, ny, poolR + 2 + ripple * 0.5, 0, Math.PI * 2);
                ctx.stroke();
              }
              /* Fish shadow — size scales with tier */
              var fishLen = 3 + tier * 1.2;
              ctx.fillStyle = "rgba(0,0,0,".concat(0.1 + tier * 0.02, ")");
              ctx.beginPath();
              ctx.ellipse(nx + Math.sin(now / 600 + node.y) * poolR * 0.4, ny + 1, fishLen, fishLen * 0.35, Math.sin(now / 800) * 0.3, 0, Math.PI * 2);
              ctx.fill();
              /* Second fish at tier 5+ */
              if (tier >= 5) {
                ctx.beginPath();
                ctx.ellipse(nx + Math.sin(now / 500 + node.y + 2) * poolR * 0.3, ny - 2, fishLen * 0.7, fishLen * 0.25, Math.sin(now / 700 + 1) * 0.4, 0, Math.PI * 2);
                ctx.fill();
              }
              /* Magical glow for high tiers */
              if (tier >= 7) {
                ctx.fillStyle = tierColor;
                ctx.globalAlpha = 0.12 + Math.sin(now / 250) * 0.06;
                ctx.beginPath();
                ctx.arc(nx, ny, poolR + 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
              }
              /* Shore stones at tier 3+ */
              if (tier >= 3) {
                ctx.fillStyle = 'rgba(120,110,90,.3)';
                var stoneCt = Math.min(6, 2 + Math.floor(tier / 2));
                for (var st = 0; st < stoneCt; st++) {
                  var _sa = st * Math.PI * 2 / stoneCt + 0.5;
                  ctx.beginPath();
                  ctx.arc(nx + Math.cos(_sa) * (poolR + 1), ny + Math.sin(_sa) * (poolR * 0.7 + 1), 1.5 + tier * 0.15, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              /* Lily pads at tier 3+ */
              if (tier >= 3 && tier <= 6) {
                ctx.fillStyle = 'rgba(40,120,40,.3)';
                ctx.beginPath();
                ctx.arc(nx + poolR * 0.3, ny - poolR * 0.2, 2 + tier * 0.3, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              /* ═══ ORE VEINS — size and color from MINING_TIERS ═══ */
              var rockSz = nodeTier.size || 8 + tier * 2;
              var rCol = nodeTier.rockColor || '#6a6a7a';
              var sCol = nodeTier.streakColor || '#9a9a9a';
              var rockScale = rockSz / 12;
              /* Base rock shape — gets more complex at higher tiers */
              ctx.fillStyle = rCol;
              if (tier <= 3) {
                /* Simple rock mound */
                ctx.beginPath();
                ctx.moveTo(nx - 6 * rockScale, ny + 5 * rockScale);
                ctx.lineTo(nx - 2 * rockScale, ny - 6 * rockScale);
                ctx.lineTo(nx + 3 * rockScale, ny - 5 * rockScale);
                ctx.lineTo(nx + 7 * rockScale, ny + 5 * rockScale);
                ctx.closePath();
                ctx.fill();
              } else if (tier <= 6) {
                /* Multi-rock outcrop */
                ctx.beginPath();
                ctx.moveTo(nx - 8 * rockScale, ny + 6 * rockScale);
                ctx.lineTo(nx - 5 * rockScale, ny - 8 * rockScale);
                ctx.lineTo(nx + 1 * rockScale, ny - 6 * rockScale);
                ctx.lineTo(nx + 5 * rockScale, ny - 9 * rockScale);
                ctx.lineTo(nx + 9 * rockScale, ny + 6 * rockScale);
                ctx.closePath();
                ctx.fill();
                /* Secondary rock */
                ctx.beginPath();
                ctx.moveTo(nx + 4 * rockScale, ny + 5 * rockScale);
                ctx.lineTo(nx + 7 * rockScale, ny - 3 * rockScale);
                ctx.lineTo(nx + 10 * rockScale, ny + 5 * rockScale);
                ctx.closePath();
                ctx.fill();
              } else {
                /* Massive crystal-studded boulder */
                ctx.beginPath();
                ctx.moveTo(nx - 10 * rockScale, ny + 7 * rockScale);
                ctx.lineTo(nx - 7 * rockScale, ny - 10 * rockScale);
                ctx.lineTo(nx, ny - 8 * rockScale);
                ctx.lineTo(nx + 6 * rockScale, ny - 11 * rockScale);
                ctx.lineTo(nx + 11 * rockScale, ny + 7 * rockScale);
                ctx.closePath();
                ctx.fill();
                /* Crystal protrusions */
                ctx.fillStyle = tierColor;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(nx - 3, ny + 2);
                ctx.lineTo(nx - 1, ny - 8);
                ctx.lineTo(nx + 1, ny + 2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(nx + 3, ny + 1);
                ctx.lineTo(nx + 5, ny - 6);
                ctx.lineTo(nx + 7, ny + 1);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
              }
              /* Ore streak in the tier's color */
              ctx.fillStyle = sCol;
              ctx.fillRect(nx - 2 * rockScale, ny - 3 * rockScale, 4 * rockScale, 2.5 * rockScale);
              /* Sparkle at higher tiers */
              if (tier >= 4 && Math.sin(now / 300 + node.x) > 0.5) {
                ctx.fillStyle = "rgba(255,255,255,".concat(0.2 + tier * 0.03, ")");
                ctx.beginPath();
                ctx.arc(nx + 1, ny - 3 * rockScale, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.fillRect(nx - 2 * rockScale, ny - 3 * rockScale, 4 * rockScale, 2 * rockScale);
              if (tier >= 3) {
                ctx.fillRect(nx + 2 * rockScale, ny - 1 * rockScale, 3 * rockScale, 2 * rockScale);
              }
              /* Sparkle — more frequent at higher tiers */
              if (tier >= 2 && Math.sin(now / (400 - tier * 50) + node.x) > 0.5) {
                ctx.fillStyle = 'rgba(255,255,255,.4)';
                ctx.beginPath();
                ctx.arc(nx + 1 * rockScale, ny - 2 * rockScale, 1 + tier * 0.3, 0, Math.PI * 2);
                ctx.fill();
              }
              if (tier >= 4 && Math.sin(now / 200 + node.x + 2) > 0.6) {
                ctx.fillStyle = tierColor + '88';
                ctx.beginPath();
                ctx.arc(nx - 2 * rockScale, ny - 4 * rockScale, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            /* Tier badge — small colored pip showing required level */
            ctx.fillStyle = tierColor;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(nx + 10 + tier * 2, ny - 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 5px "VT323",monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(node.gatherLvl, nx + 10 + tier * 2, ny - 6.5);
            ctx.globalAlpha = 1;

            /* Emoji label — scaled with tier */
            ctx.font = 8 + tier * 2 + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.emoji, nx, ny - (10 + tier * 3));

            /* HP bar if damaged — wider at higher tiers */
            if (node.hp < node.maxHp) {
              var hpPct = node.hp / node.maxHp;
              var barW = 14 + tier * 4;
              ctx.fillStyle = 'rgba(0,0,0,.5)';
              ctx.fillRect(nx - barW / 2, ny + 8 + tier * 2, barW, 3);
              ctx.fillStyle = tierColor;
              ctx.fillRect(nx - barW / 2, ny + 8 + tier * 2, barW * hpPct, 3);
            }

            /* Skill level requirement tooltip when nearby */
            var pDist = Math.sqrt(Math.pow(P.x - node.x, 2) + Math.pow(P.y - node.y, 2));
            if (pDist < 50) {
              var _S$rpg16;
              ctx.font = 'bold 7px "VT323", monospace';
              ctx.fillStyle = 'rgba(255,255,255,.7)';
              ctx.fillText(node.spotName || node.name, nx, ny + 18 + tier * 2);
              ctx.fillStyle = 'rgba(255,255,255,.5)';
              ctx.fillText(node.name + ' (Lv' + node.gatherLvl + ')', nx, ny + 26 + tier * 2);
              var skillLvl = ((_S$rpg16 = S.rpg) === null || _S$rpg16 === void 0 || (_S$rpg16 = _S$rpg16.lifeSkills) === null || _S$rpg16 === void 0 || (_S$rpg16 = _S$rpg16[node.skill]) === null || _S$rpg16 === void 0 ? void 0 : _S$rpg16.level) || 1;
              var skillLabel = (node.skill || 'mining').charAt(0).toUpperCase() + (node.skill || 'mining').slice(1);
              if (skillLvl < node.gatherLvl) {
                ctx.fillStyle = '#ff5e6c';
                ctx.fillText('Req: ' + skillLabel + ' Lv' + node.gatherLvl, nx, ny + 34 + tier * 2);
              } else {
                ctx.fillStyle = '#3dd497';
                var verb = node.skill === 'woodcutting' ? 'Chop' : node.skill === 'fishing' ? 'Fish' : 'Mine';
                ctx.fillText(verb + ' (' + skillLabel + ' Lv' + skillLvl + ')', nx, ny + 34 + tier * 2);
              }
            }
          });
        }

        /* ═══ RENDER MONSTERS — §4 Visual Identity: distinct at a glance ═══ */
        if (S.monsters) {
          S.monsters.forEach(function (m) {
            var _ZONES$S$currentZone9, _ZONES$S$currentZone0, _m$statuses2;
            if (!m.alive) return;
            var mx = (m.renderX !== undefined ? m.renderX : m.x) - cx,
              my = (m.renderY !== undefined ? m.renderY : m.y) - cy;
            if (mx < -40 || mx > W + 40 || my < -40 || my > H + 40) return;
            var arch = m.archetype || 'fodder';

            /* ═══ SPAWN POP-IN — scale up from 0 when first visible ═══ */
            if (!m._spawnTs) m._spawnTs = now;
            var spawnAge = (now - m._spawnTs) / 300;
            var spawnScale = 1;
            if (spawnAge < 1) {
              /* Elastic ease-out: overshoots slightly then settles */
              spawnScale = 1 - Math.pow(1 - spawnAge, 3) * (1 + 2.5 * (1 - spawnAge));
              spawnScale = Math.max(0, Math.min(1.15, spawnScale));
            }
            var bodySize = ({
              fodder: 8,
              brute: 15,
              swarm: 6,
              sentinel: 12,
              volatile: 9,
              stalker: 10,
              hexer: 10
            }[arch] || 10) * spawnScale;

            /* Ground shadow — oval, darker for bigger monsters */
            ctx.fillStyle = "rgba(0,0,0,".concat(bodySize > 10 ? 0.22 : 0.14, ")");
            ctx.beginPath();
            ctx.ellipse(mx + 2, my + bodySize + 3, bodySize * 0.9, bodySize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();

            /* Body base color — tinted by zone element for identity */
            var _zElem = (_ZONES$S$currentZone9 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone9 === void 0 ? void 0 : _ZONES$S$currentZone9.element;
            var _eCol = _zElem && ELEMENTS[_zElem] ? ELEMENTS[_zElem].color : null;
            var _mBaseColor = m.color;
            /* Blend monster color toward zone element (30% tint) */
            if (_eCol && _zElem) {
              var _hex = function _hex(h) {
                var r = parseInt(h.slice(1, 3), 16),
                  g = parseInt(h.slice(3, 5), 16),
                  b = parseInt(h.slice(5, 7), 16);
                return [r, g, b];
              };
              try {
                var _hex2 = _hex(_mBaseColor),
                  _hex3 = _slicedToArray(_hex2, 3),
                  mr = _hex3[0],
                  mg = _hex3[1],
                  mb = _hex3[2];
                var _hex4 = _hex(_eCol),
                  _hex5 = _slicedToArray(_hex4, 3),
                  er = _hex5[0],
                  eg = _hex5[1],
                  eb = _hex5[2];
                var mix = 0.3;
                var nr = Math.round(mr * (1 - mix) + er * mix),
                  ng = Math.round(mg * (1 - mix) + eg * mix),
                  nb = Math.round(mb * (1 - mix) + eb * mix);
                _mBaseColor = '#' + [nr, ng, nb].map(function (v) {
                  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
                }).join('');
              } catch (e) {}
            }
            var darkColor = _mBaseColor + 'cc';
            var lightColor = _mBaseColor;
            if (arch === 'brute') {
              /* Brute: massive rounded square with gradient shading */
              ctx.fillStyle = darkColor;
              ctx.beginPath();
              ctx.moveTo(mx - bodySize, my - bodySize * 0.8);
              ctx.quadraticCurveTo(mx, my - bodySize * 1.1, mx + bodySize, my - bodySize * 0.8);
              ctx.lineTo(mx + bodySize * 0.9, my + bodySize * 0.7);
              ctx.quadraticCurveTo(mx, my + bodySize * 0.9, mx - bodySize * 0.9, my + bodySize * 0.7);
              ctx.closePath();
              ctx.fill();
              /* Highlight — upper left */
              ctx.fillStyle = 'rgba(255,255,255,.15)';
              ctx.beginPath();
              ctx.arc(mx - bodySize * 0.3, my - bodySize * 0.4, bodySize * 0.5, 0, Math.PI * 2);
              ctx.fill();
              /* Dark underside */
              ctx.fillStyle = 'rgba(0,0,0,.15)';
              ctx.fillRect(mx - bodySize * 0.8, my + bodySize * 0.3, bodySize * 1.6, bodySize * 0.4);
            } else if (arch === 'swarm') {
              var flutter = Math.sin(now / 60 + m.spawnX) * 2;
              ctx.fillStyle = lightColor;
              ctx.beginPath();
              ctx.ellipse(mx, my + flutter, bodySize, bodySize * 0.7, 0, 0, Math.PI * 2);
              ctx.fill();
              /* Translucent wings */
              ctx.fillStyle = 'rgba(255,255,255,.15)';
              ctx.beginPath();
              ctx.ellipse(mx - bodySize, my - 3 + flutter, 5, 2.5, -0.3 + Math.sin(now / 40) * 0.3, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(mx + bodySize, my - 3 + flutter, 5, 2.5, 0.3 - Math.sin(now / 40) * 0.3, 0, Math.PI * 2);
              ctx.fill();
            } else if (arch === 'sentinel') {
              ctx.fillStyle = darkColor;
              ctx.beginPath();
              ctx.moveTo(mx, my - bodySize);
              ctx.lineTo(mx + bodySize, my - bodySize * 0.3);
              ctx.lineTo(mx + bodySize * 0.8, my + bodySize * 0.7);
              ctx.lineTo(mx, my + bodySize);
              ctx.lineTo(mx - bodySize * 0.8, my + bodySize * 0.7);
              ctx.lineTo(mx - bodySize, my - bodySize * 0.3);
              ctx.closePath();
              ctx.fill();
              /* Shield emboss — lighter top edge */
              ctx.strokeStyle = 'rgba(255,255,255,.2)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(mx - bodySize, my - bodySize * 0.3);
              ctx.lineTo(mx, my - bodySize);
              ctx.lineTo(mx + bodySize, my - bodySize * 0.3);
              ctx.stroke();
              /* Dark bottom */
              ctx.strokeStyle = 'rgba(0,0,0,.2)';
              ctx.beginPath();
              ctx.moveTo(mx - bodySize * 0.8, my + bodySize * 0.7);
              ctx.lineTo(mx, my + bodySize);
              ctx.lineTo(mx + bodySize * 0.8, my + bodySize * 0.7);
              ctx.stroke();
            } else if (arch === 'volatile') {
              /* Spiky star with pulsing danger glow */
              var vPulse = 1 + Math.sin(now / 150) * 0.2;
              /* Outer glow */
              ctx.fillStyle = m.color + '22';
              ctx.beginPath();
              ctx.arc(mx, my, bodySize * 1.5 * vPulse, 0, Math.PI * 2);
              ctx.fill();
              /* Spiky body */
              ctx.fillStyle = lightColor;
              ctx.beginPath();
              for (var sp = 0; sp < 8; sp++) {
                var spA = sp / 8 * Math.PI * 2 + now / 800;
                var spR = sp % 2 === 0 ? bodySize * 1.2 : bodySize * 0.5;
                var spx = mx + Math.cos(spA) * spR,
                  spy = my + Math.sin(spA) * spR;
                sp === 0 ? ctx.moveTo(spx, spy) : ctx.lineTo(spx, spy);
              }
              ctx.closePath();
              ctx.fill();
              /* Inner bright core */
              ctx.fillStyle = 'rgba(255,200,100,.4)';
              ctx.beginPath();
              ctx.arc(mx, my, bodySize * 0.4, 0, Math.PI * 2);
              ctx.fill();
            } else if (arch === 'stalker') {
              /* Diamond with gradient — sleek predator look */
              ctx.fillStyle = darkColor;
              ctx.beginPath();
              ctx.moveTo(mx, my - bodySize * 1.2);
              ctx.lineTo(mx + bodySize * 0.6, my);
              ctx.lineTo(mx, my + bodySize);
              ctx.lineTo(mx - bodySize * 0.6, my);
              ctx.closePath();
              ctx.fill();
              /* Eye slit */
              ctx.fillStyle = '#fff';
              ctx.fillRect(mx - bodySize * 0.3, my - 2, bodySize * 0.6, 2);
              ctx.fillStyle = '#ff0000';
              ctx.beginPath();
              ctx.arc(mx, my - 1, 1.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (arch === 'hexer') {
              ctx.fillStyle = darkColor;
              ctx.beginPath();
              ctx.arc(mx, my, bodySize, 0, Math.PI * 2);
              ctx.fill();
              /* Rune orbit */
              ctx.strokeStyle = m.color + '99';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(mx, my, bodySize + 5, now / 300, now / 300 + Math.PI * 1.5);
              ctx.stroke();
              /* Inner arcane glow */
              ctx.fillStyle = m.color + '33';
              ctx.beginPath();
              ctx.arc(mx, my, bodySize * 0.6, 0, Math.PI * 2);
              ctx.fill();
              /* Rune dots */
              for (var rd = 0; rd < 3; rd++) {
                var rda = now / 300 + rd * Math.PI * 2 / 3;
                ctx.fillStyle = m.color;
                ctx.beginPath();
                ctx.arc(mx + Math.cos(rda) * (bodySize + 5), my + Math.sin(rda) * (bodySize + 5), 2, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              /* Fodder: simple circle with highlight */
              ctx.fillStyle = darkColor;
              ctx.beginPath();
              ctx.arc(mx, my, bodySize, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.12)';
              ctx.beginPath();
              ctx.arc(mx - bodySize * 0.25, my - bodySize * 0.25, bodySize * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }

            /* Element indicator dot — small colored gem above body */
            if (m.element && ELEMENTS[m.element]) {
              var eCol = ELEMENTS[m.element].color;
              ctx.fillStyle = eCol;
              ctx.beginPath();
              ctx.arc(mx, my - bodySize - 4, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.3)';
              ctx.beginPath();
              ctx.arc(mx - 0.5, my - bodySize - 4.5, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }

            /* ═══ AGGRO ALERT — "!" pops above enemy when they notice player ═══ */
            if (m._aggroTs) {
              var aggroAge = (now - m._aggroTs) / 500;
              if (aggroAge < 1) {
                var alertY = my - bodySize - 18 - (aggroAge < 0.2 ? (0.2 - aggroAge) * 30 : 0);
                var alertAlpha = aggroAge < 0.8 ? 1 : (1 - aggroAge) / 0.2;
                var alertScale = aggroAge < 0.1 ? aggroAge / 0.1 * 1.3 : aggroAge < 0.2 ? 1.3 - (aggroAge - 0.1) / 0.1 * 0.3 : 1;
                ctx.globalAlpha = alertAlpha;
                ctx.font = "bold ".concat(Math.round(12 * alertScale), "px \"VT323\", monospace");
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ff5e6c';
                ctx.fillText('!', mx, alertY);
                ctx.globalAlpha = 1;
              } else {
                m._aggroTs = null; /* stop rendering after animation */
              }
            }

            /* ═══ STUCK ARROWS — arrows embedded in monster body ═══ */
            if (m._stuckArrows && m._stuckArrows.length > 0) {
              m._stuckArrows.forEach(function (sa) {
                var sax = mx + sa.ox,
                  say = my + sa.oy;
                ctx.save();
                ctx.translate(sax, say);
                ctx.rotate(sa.ang);
                if (sa.isStaff) {
                  /* Embedded magic shard */
                  ctx.fillStyle = sa.color + 'aa';
                  ctx.beginPath();
                  ctx.moveTo(4, 0);
                  ctx.lineTo(-2, -2);
                  ctx.lineTo(-2, 2);
                  ctx.closePath();
                  ctx.fill();
                  ctx.fillStyle = sa.color + '44';
                  ctx.beginPath();
                  ctx.arc(0, 0, 3, 0, Math.PI * 2);
                  ctx.fill();
                } else {
                  /* Arrow shaft sticking out */
                  ctx.fillStyle = '#8B6914';
                  ctx.fillRect(-6, -1, 10, 2);
                  /* Arrow fletching */
                  ctx.fillStyle = sa.color + 'cc';
                  ctx.fillRect(-6, -2, 3, 1);
                  ctx.fillRect(-6, 1, 3, 1);
                  /* Arrowhead (buried in body) */
                  ctx.fillStyle = sa.color;
                  ctx.beginPath();
                  ctx.moveTo(5, 0);
                  ctx.lineTo(3, -2);
                  ctx.lineTo(3, 2);
                  ctx.closePath();
                  ctx.fill();
                }
                ctx.restore();
              });
            }

            /* Emoji face — zone-themed, scaled to body size */
            var _zoneEmoji = (_ZONES$S$currentZone0 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone0 === void 0 ? void 0 : _ZONES$S$currentZone0.enemyEmoji;
            var _mEmoji = _zoneEmoji && _zoneEmoji[arch] ? _zoneEmoji[arch] : m.emoji;
            ctx.font = (bodySize > 12 ? 18 : bodySize > 8 ? 14 : 10) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(_mEmoji, mx, my + (bodySize > 12 ? 6 : bodySize > 8 ? 5 : 3));

            /* Stun indicator on monster */
            if (m._stunUntil && Date.now() < m._stunUntil) {
              var mStunLeft = ((m._stunUntil - Date.now()) / 1000).toFixed(1);
              ctx.font = '12px sans-serif';
              for (var ms = 0; ms < 3; ms++) {
                var msa = Date.now() / 150 + ms * Math.PI * 2 / 3;
                ctx.fillText('💫', mx + Math.cos(msa) * 14, my - bodySize - 8 + Math.sin(msa) * 3);
              }
              ctx.font = 'bold 8px sans-serif';
              ctx.fillStyle = '#f5c542';
              ctx.fillText('STUN ' + mStunLeft + 's', mx, my - bodySize - 18);
            }
            /* HP bar */
            /* §9 Status visual effects on monster body */
            if (m.statuses) {
              if (m.statuses.freeze) {
                ctx.fillStyle = 'rgba(41,128,185,.3)';
                ctx.beginPath();
                ctx.arc(mx, my, 16, 0, Math.PI * 2);
                ctx.fill();
                /* Ice crystals */
                ctx.fillStyle = 'rgba(200,230,255,.5)';
                for (var ic = 0; ic < 3; ic++) {
                  var ica = now / 200 + ic * 2.1;
                  ctx.fillRect(mx + Math.cos(ica) * 12 - 1, my + Math.sin(ica) * 12 - 1, 3, 3);
                }
              }
              if (m.statuses.burn) {
                ctx.fillStyle = 'rgba(192,57,43,.2)';
                ctx.beginPath();
                ctx.arc(mx, my, 14 + Math.sin(now / 100) * 2, 0, Math.PI * 2);
                ctx.fill();
                /* Flame flickers */
                for (var fl = 0; fl < 2; fl++) {
                  var fla = now / 120 + fl * 3.14;
                  ctx.fillStyle = "rgba(255,".concat(100 + Math.random() * 80, ",0,").concat(0.3 + Math.random() * 0.3, ")");
                  ctx.beginPath();
                  ctx.arc(mx + Math.cos(fla) * 10, my - 8 + Math.sin(fla) * 4, 2 + Math.random(), 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              if (m.statuses.root) {
                ctx.strokeStyle = 'rgba(39,174,96,.4)';
                ctx.lineWidth = 2;
                for (var rv = 0; rv < 3; rv++) {
                  var rva = rv * 2.1;
                  ctx.beginPath();
                  ctx.moveTo(mx + Math.cos(rva) * 6, my + 10);
                  ctx.lineTo(mx + Math.cos(rva) * 14, my + 14);
                  ctx.stroke();
                }
              }
              if (m.statuses.soak) {
                ctx.fillStyle = 'rgba(52,152,219,.15)';
                ctx.beginPath();
                ctx.arc(mx, my, 15, 0, Math.PI * 2);
                ctx.fill();
                /* Water drips */
                ctx.fillStyle = 'rgba(52,152,219,.4)';
                var dripY = now / 300 % 20;
                ctx.fillRect(mx - 1, my + 8 + dripY, 2, 3);
              }
              if (m.statuses.shock) {
                /* Crackling electricity */
                ctx.strokeStyle = "rgba(142,68,173,".concat(0.4 + Math.random() * 0.4, ")");
                ctx.lineWidth = 1;
                for (var _sp = 0; _sp < 2; _sp++) {
                  ctx.beginPath();
                  ctx.moveTo(mx + (Math.random() - 0.5) * 20, my + (Math.random() - 0.5) * 20);
                  ctx.lineTo(mx + (Math.random() - 0.5) * 20, my + (Math.random() - 0.5) * 20);
                  ctx.stroke();
                }
              }
              if (m.statuses.slow) {
                ctx.strokeStyle = 'rgba(127,140,141,.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(mx, my, 14, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }
              if (m.statuses.curse) {
                ctx.fillStyle = "rgba(44,62,80,".concat(0.2 + Math.sin(now / 400) * 0.1, ")");
                ctx.beginPath();
                ctx.arc(mx, my, 16, 0, Math.PI * 2);
                ctx.fill();
              }
              if (m.statuses.fracture) {
                /* Crack lines */
                ctx.strokeStyle = 'rgba(121,85,72,.5)';
                ctx.lineWidth = 1;
                var stacks = m.statuses.fracture.stacks || 1;
                for (var fc = 0; fc < stacks; fc++) {
                  var fca = fc * 1.26;
                  ctx.beginPath();
                  ctx.moveTo(mx, my);
                  ctx.lineTo(mx + Math.cos(fca) * 12, my + Math.sin(fca) * 12);
                  ctx.stroke();
                }
              }
              if (m.statuses.reveal) {
                ctx.strokeStyle = 'rgba(241,196,15,.4)';
                ctx.lineWidth = 1.5;
                var revPulse = Math.sin(now / 250) * 3;
                ctx.beginPath();
                ctx.arc(mx, my, 14 + revPulse, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
            /* Legacy frozen/slowed visuals — kept for backward compat */
            if (m._frozen && Date.now() < m._frozen && !((_m$statuses2 = m.statuses) !== null && _m$statuses2 !== void 0 && _m$statuses2.freeze)) {
              ctx.fillStyle = 'rgba(100,200,255,.25)';
              ctx.beginPath();
              ctx.arc(mx, my, 16, 0, Math.PI * 2);
              ctx.fill();
            } else if (m._slowed && Date.now() < m._slowed) {
              ctx.strokeStyle = 'rgba(100,200,255,.3)';
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.arc(mx, my, 14, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            /* §4 Monster HP bar + level badge — high contrast, immediately readable */
            var hpPct = Math.max(0, m.curHp / (m.maxHp || m.hp || 1));
            var barW = bodySize > 12 ? 30 : 24;
            var barY = my - bodySize - 8;
            /* Bar background with dark border */
            ctx.fillStyle = 'rgba(0,0,0,.7)';
            ctx.fillRect(mx - barW / 2 - 1, barY - 1, barW + 2, 6);
            /* Bar fill — color shifts with HP */
            ctx.fillStyle = hpPct > 0.5 ? '#3dd497' : hpPct > 0.25 ? '#f5c542' : '#ff5e6c';
            ctx.fillRect(mx - barW / 2, barY, barW * hpPct, 4);
            /* Highlight line on top for depth */
            ctx.fillStyle = 'rgba(255,255,255,.15)';
            ctx.fillRect(mx - barW / 2, barY, barW * hpPct, 1);
            /* Level badge — rounded pill left of bar */
            var lvText = (m._isBoss ? '👑' : '') + 'Lv' + (m.level || 1);
            ctx.font = 'bold 7px "VT323", monospace';
            var lvW = ctx.measureText(lvText).width;
            ctx.fillStyle = 'rgba(0,0,0,.6)';
            ctx.fillRect(mx - barW / 2 - lvW - 5, barY - 2, lvW + 4, 8);
            ctx.fillStyle = m._isBoss ? '#f5c542' : 'rgba(255,255,255,.7)';
            ctx.fillText(lvText, mx - barW / 2 - lvW - 3, barY + 4);

            /* §9 — Status effect icons above monster */
            if (m.statuses) {
              var statusList = Object.entries(m.statuses);
              if (statusList.length > 0) {
                var iconY = my - 28;
                var iconSpacing = 12;
                var startX = mx - (statusList.length - 1) * iconSpacing / 2;
                statusList.forEach(function (_ref21, si) {
                  var _ref22 = _slicedToArray(_ref21, 2),
                    sid = _ref22[0],
                    st = _ref22[1];
                  var elem = st.element;
                  if (!elem) return;
                  var edef = ELEMENTS[elem];
                  if (!edef) return;
                  var ix = startX + si * iconSpacing;
                  /* Icon background pulse */
                  var pulse = Math.sin(now / 300 + si) * 0.2 + 0.8;
                  ctx.globalAlpha = pulse;
                  /* Element colored dot */
                  ctx.fillStyle = edef.color;
                  ctx.beginPath();
                  ctx.arc(ix, iconY, 4, 0, Math.PI * 2);
                  ctx.fill();
                  /* Shape indicator */
                  ctx.fillStyle = '#fff';
                  ctx.font = '6px sans-serif';
                  ctx.fillText(sid.charAt(0).toUpperCase(), ix, iconY + 2);
                  /* Duration bar */
                  var durPct = st.remaining / (st.maxDur || 1);
                  ctx.fillStyle = edef.color;
                  ctx.globalAlpha = 0.6;
                  ctx.fillRect(ix - 4, iconY + 5, 8 * durPct, 1.5);
                  /* Stacks (for Fracture) */
                  if (st.stacks > 1) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 5px sans-serif';
                    ctx.fillText('×' + st.stacks, ix + 5, iconY);
                  }
                  ctx.globalAlpha = 1;
                });
              }
            }
          });
        }

        /* ═══ RENDER GROUND SPLATTER — persistent kill marks ═══ */
        if (S.groundSplatter) {
          var splatNow = Date.now();
          S.groundSplatter = S.groundSplatter.filter(function (sp) {
            return splatNow - sp.ts < 30000;
          }); /* fade after 30s */
          S.groundSplatter.forEach(function (sp) {
            var sx = sp.x - cx,
              sy = sp.y - cy;
            if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
            var age = (splatNow - sp.ts) / 1000;
            var fade = age > 25 ? 1 - (age - 25) / 5 : 1; /* fade out last 5 seconds */
            ctx.globalAlpha = 0.25 * fade;
            ctx.fillStyle = sp.color;
            /* Irregular splat shape — ellipse with random rotation */
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(sp.x * 0.1 + sp.y * 0.07); /* deterministic rotation from position */
            ctx.beginPath();
            ctx.ellipse(0, 0, sp.size, sp.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;
          });
        }

        /* ═══ RENDER MONSTER TELEGRAPHS — red warning zone before attack ═══ */
        if (S.monsters) {
          S.monsters.forEach(function (m) {
            if (!m.alive || !m._telegraphUntil) return;
            var remaining = m._telegraphUntil - Date.now();
            if (remaining <= 0) {
              m._telegraphUntil = null;
              return;
            }
            var mx = (m.renderX !== undefined ? m.renderX : m.x) - cx,
              my = (m.renderY !== undefined ? m.renderY : m.y) - cy;
            if (mx < -60 || mx > W + 60 || my < -60 || my > H + 60) return;
            var progress = 1 - remaining / 400; /* 0→1 as telegraph completes */
            var ang = m._telegraphAngle || 0;
            var range = m._telegraphRange || 30;
            /* Red cone/circle telegraph */
            ctx.save();
            ctx.translate(mx, my);
            /* Pulsing red circle at attack range */
            ctx.globalAlpha = 0.08 + progress * 0.12;
            ctx.fillStyle = '#ff3030';
            ctx.beginPath();
            ctx.arc(0, 0, range * progress, 0, Math.PI * 2);
            ctx.fill();
            /* Directional wedge showing attack direction */
            ctx.globalAlpha = 0.15 + progress * 0.2;
            ctx.fillStyle = '#ff2020';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, range * 0.8 * progress, ang - 0.5, ang + 0.5);
            ctx.closePath();
            ctx.fill();
            /* Warning "!" exclamation at progress > 0.5 */
            if (progress > 0.5) {
              ctx.globalAlpha = (progress - 0.5) * 2;
              ctx.fillStyle = '#ff3030';
              ctx.font = 'bold ' + (10 + progress * 6) + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('!', 0, -12 - progress * 4);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
          });
        }

        /* ═══ RENDER GROUND LOOT ═══ */
        if (S.groundLoot) {
          S.groundLoot.forEach(function (loot) {
            var lx = loot.x - cx,
              ly = loot.y - cy;
            if (lx < -30 || lx > W + 30 || ly < -30 || ly > H + 30) return;
            var age = (Date.now() - loot.ts) / 1000;
            var bob = Math.sin(age * 3) * 2;
            var fadeOut = age > 50 ? 1 - (age - 50) / 10 : 1;
            ctx.globalAlpha = fadeOut;

            /* §5.5 Death drops — scattered inventory with urgency timer */
            if (loot.isDeathDrop) {
              var _loot$deathItems;
              var timeLeft = loot.expiry ? (loot.expiry - Date.now()) / 1000 : 30;
              var urgency = Math.max(0, Math.min(1, 1 - timeLeft / 30));
              /* Pulsing red-orange aura — faster pulse as time runs out */
              var pulseRate = 2 + urgency * 6;
              var aura = 0.2 + Math.sin(age * pulseRate) * 0.15 + urgency * 0.2;
              ctx.fillStyle = "rgba(234,88,12,".concat(aura, ")");
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 18, 0, Math.PI * 2);
              ctx.fill();
              /* Ring */
              ctx.strokeStyle = urgency > 0.7 ? '#ff5e6c' : '#ea580c';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 15, 0, Math.PI * 2);
              ctx.stroke();
              /* Bag emoji */
              ctx.font = '18px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💀', lx, ly + 6 + bob);
              /* Timer text */
              ctx.font = 'bold 8px "VT323", monospace';
              ctx.fillStyle = urgency > 0.7 ? '#ff5e6c' : '#ea580c';
              ctx.fillText(Math.ceil(timeLeft) + 's', lx, ly + 22 + bob);
              /* Item count */
              var itemCount = ((_loot$deathItems = loot.deathItems) === null || _loot$deathItems === void 0 ? void 0 : _loot$deathItems.reduce(function (s, i) {
                return s + i.qty;
              }, 0)) || 0;
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 7px "VT323", monospace';
              ctx.fillText(itemCount + ' items', lx, ly - 12 + bob);
              ctx.globalAlpha = 1;
              /* Expire death drops */
              if (timeLeft <= 0) {
                loot._expired = true;
              }
              return;
            }

            /* §4.6 Weapon drops — distinct rendering */
            if (loot.isWeapon && loot.weapon) {
              var _WEAPON_TYPES$loot$we;
              var tc = loot.tierColor || '#8890b8';
              /* Glowing aura based on tier */
              var auraPulse = 0.3 + Math.sin(age * 4) * 0.15;
              ctx.fillStyle = tc;
              ctx.globalAlpha = auraPulse * fadeOut;
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 14, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = fadeOut;
              /* Tier-colored ring */
              ctx.strokeStyle = tc;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 12, 0, Math.PI * 2);
              ctx.stroke();
              /* Weapon emoji */
              ctx.font = '16px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(((_WEAPON_TYPES$loot$we = WEAPON_TYPES[loot.weapon.type]) === null || _WEAPON_TYPES$loot$we === void 0 ? void 0 : _WEAPON_TYPES$loot$we.emoji) || '⚔️', lx, ly + 5 + bob);
              /* Name label */
              ctx.font = 'bold 7px "VT323", monospace';
              ctx.fillStyle = tc;
              ctx.fillText(loot.weapon.name, lx, ly + 18 + bob);
              /* Element dots */
              if (loot.weapon.element1) {
                var _ELEMENTS$loot$weapon;
                ctx.fillStyle = ((_ELEMENTS$loot$weapon = ELEMENTS[loot.weapon.element1]) === null || _ELEMENTS$loot$weapon === void 0 ? void 0 : _ELEMENTS$loot$weapon.color) || '#fff';
                ctx.beginPath();
                ctx.arc(lx - 6, ly - 10 + bob, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              if (loot.weapon.element2) {
                var _ELEMENTS$loot$weapon2;
                ctx.fillStyle = ((_ELEMENTS$loot$weapon2 = ELEMENTS[loot.weapon.element2]) === null || _ELEMENTS$loot$weapon2 === void 0 ? void 0 : _ELEMENTS$loot$weapon2.color) || '#fff';
                ctx.beginPath();
                ctx.arc(lx + 6, ly - 10 + bob, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1;
              return;
            }

            /* Rare loot has special glow */
            if (loot.rare) {
              ctx.fillStyle = 'rgba(245,197,66,.25)';
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 16, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "rgba(245,197,66,".concat(0.4 + Math.sin(age * 4) * 0.3, ")");
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(lx, ly + bob, 14, 0, Math.PI * 2);
              ctx.stroke();
            }
            /* Gold coins base — glowing circle */
            ctx.fillStyle = 'rgba(245,197,66,.3)';
            ctx.beginPath();
            ctx.arc(lx, ly + bob, 10, 0, Math.PI * 2);
            ctx.fill();
            /* Coin stack */
            ctx.fillStyle = '#f5c542';
            ctx.beginPath();
            ctx.arc(lx - 3, ly + 2 + bob, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e8b830';
            ctx.beginPath();
            ctx.arc(lx + 2, ly + 3 + bob, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d4a020';
            ctx.beginPath();
            ctx.arc(lx, ly + 4 + bob, 3, 0, Math.PI * 2);
            ctx.fill();
            /* Coin text */
            ctx.font = 'bold 7px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f5c542';
            ctx.fillText(loot.coins + 'G', lx, ly + 14 + bob);

            /* Skull on top */
            ctx.font = '12px sans-serif';
            ctx.fillText(loot.skullEmoji, lx, ly - 6 + bob);

            /* XP sparkle */
            ctx.fillStyle = 'rgba(96,165,250,.4)';
            var sparkX = lx + Math.sin(age * 5) * 6;
            var sparkY = ly - 2 + Math.cos(age * 4) * 4 + bob;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          });
        }

        /* ═══ IMPACT RINGS — expanding flash at point of contact ═══ */
        if (S._impactRings) {
          S._impactRings = S._impactRings.filter(function (ring) {
            var rAge = (Date.now() - ring.ts) / ring.duration;
            if (rAge >= 1) return false;
            var rx = ring.x - cx,
              ry = ring.y - cy;
            var rr = ring.maxR * rAge;
            ctx.globalAlpha = (1 - rAge) * 0.6;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = (1 - rAge) * 3 + 0.5;
            ctx.beginPath();
            ctx.arc(rx, ry, rr, 0, Math.PI * 2);
            ctx.stroke();
            /* Inner bright fill at start */
            if (rAge < 0.3) {
              ctx.globalAlpha = (0.3 - rAge) * 0.4;
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(rx, ry, rr * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
            return true;
          });
        }

        /* ═══ HIT PARTICLES (blood/sparks) ═══ */
        if (S.hitParticles) {
          S.hitParticles = S.hitParticles.filter(function (p) {
            if (isNaN(p.x) || isNaN(p.y) || isNaN(p.vx) || isNaN(p.vy)) return false; /* kill NaN particles */
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; /* gravity */
            p.life -= 0.04;
            if (p.life <= 0) return false;
            var ppx = p.x - cx + shakeX,
              ppy = p.y - cy + shakeY;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(ppx, ppy, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return true;
          });
        }

        /* ═══ DEATH EXPLOSIONS — §Creative Vision §8: Whimsical, not devastating ═══ */
        if (S.deathExplosions) {
          S.deathExplosions = S.deathExplosions.filter(function (exp) {
            var _ELEMENTS$exp$killEle;
            var age = (Date.now() - exp.ts) / 1000;
            var maxAge = exp.isGrandSlam ? 2.5 : 1.5;
            if (age > maxAge) return false;
            var scale = exp.killScale || 1;
            /* Animate particles */
            exp.particles.forEach(function (p) {
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.10;
              p.vx *= 0.96;
              p.life -= exp.isGrandSlam ? 0.018 : 0.025;
              if (p.life <= 0) return;
              var epx = p.x - cx + shakeX,
                epy = p.y - cy + shakeY;
              ctx.globalAlpha = p.life;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(epx, epy, p.size * p.life, 0, Math.PI * 2);
              ctx.fill();
            });
            var ex = exp.x - cx + shakeX,
              ey = exp.y - cy + shakeY;

            /* Flash ring — element-colored, scaled for Grand Slam */
            var flashDur = exp.isGrandSlam ? 0.5 : 0.3;
            var flashElemColor = exp.killElement ? (_ELEMENTS$exp$killEle = ELEMENTS[exp.killElement]) === null || _ELEMENTS$exp$killEle === void 0 ? void 0 : _ELEMENTS$exp$killEle.color : null;
            if (age < flashDur) {
              var flashProg = age / flashDur;
              ctx.globalAlpha = 1 - flashProg;
              if (exp.killCollision === 'eclipse') {
                /* Eclipse: alternating dark/gold rings */
                ctx.fillStyle = "rgba(44,62,80,".concat(0.3 * (1 - flashProg), ")");
                ctx.beginPath();
                ctx.arc(ex, ey, flashProg * 90 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#F1C40F';
                ctx.lineWidth = Math.max(0.5, 5 - flashProg * 7);
                ctx.beginPath();
                ctx.arc(ex, ey, flashProg * 70 * scale, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = '#2C3E50';
                ctx.lineWidth = Math.max(0.5, 3 - flashProg * 5);
                ctx.beginPath();
                ctx.arc(ex, ey, flashProg * 50 * scale, 0, Math.PI * 2);
                ctx.stroke();
              } else if (exp.isGrandSlam) {
                ctx.fillStyle = "rgba(245,197,66,".concat(0.3 * (1 - flashProg), ")");
                ctx.beginPath();
                ctx.arc(ex, ey, flashProg * 80 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = flashElemColor || '#fbbf24';
                ctx.lineWidth = Math.max(0.5, 4 - flashProg * 6);
              } else if (flashElemColor) {
                /* Element-colored ring */
                ctx.fillStyle = flashElemColor + '30';
                ctx.beginPath();
                ctx.arc(ex, ey, flashProg * 50 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = flashElemColor;
                ctx.lineWidth = Math.max(0.5, 3 - flashProg * 6);
              } else {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = Math.max(0.5, 3 - flashProg * 8);
              }
              ctx.beginPath();
              ctx.arc(ex, ey, flashProg * 60 * scale, 0, Math.PI * 2);
              ctx.stroke();
            }

            /* §8 Kill-type specific death animations */
            if (!exp._deathAnimSpawned) {
              exp._deathAnimSpawned = true;
              var kt = exp.killType || 'melee';
              var bSize = exp.bodySize || 10;
              var bCol = exp.bodyColor || exp.emoji ? '#888' : '#888';
              var ka = exp.killAngle || 0;
              if (kt === 'melee') {
                /* ═══ SWORD KILL — CUT IN HALF — two halves fly apart ═══ */
                var perpA = ka + Math.PI / 2;
                exp._halves = [{
                  x: exp.x,
                  y: exp.y,
                  vx: Math.cos(perpA) * 3 + Math.cos(ka) * 2,
                  vy: Math.sin(perpA) * 3 - 2,
                  rot: 0,
                  rotSpd: 0.15,
                  color: bCol,
                  size: bSize,
                  side: 'top',
                  emoji: exp.emoji
                }, {
                  x: exp.x,
                  y: exp.y,
                  vx: Math.cos(perpA + Math.PI) * 3 + Math.cos(ka) * 2,
                  vy: Math.sin(perpA + Math.PI) * 3 - 1,
                  rot: 0,
                  rotSpd: -0.12,
                  color: bCol,
                  size: bSize,
                  side: 'bot',
                  emoji: exp.emoji
                }];
                /* Blood spray from cut line */
                for (var bs = 0; bs < 12; bs++) {
                  S.hitParticles.push({
                    x: exp.x,
                    y: exp.y,
                    vx: Math.cos(perpA + (Math.random() - 0.5) * 1) * (2 + Math.random() * 4) * (bs % 2 === 0 ? 1 : -1),
                    vy: -1 - Math.random() * 3,
                    life: 0.8,
                    color: '#cc2233',
                    size: 1.5 + Math.random() * 2
                  });
                }
              } else if (kt === 'magic') {
                var _ELEMENTS$ZONES$S$cur, _ZONES$S$currentZone1;
                /* ═══ MAGIC KILL — EXPLODE INTO PIECES — body chunks scatter radially ═══ */
                var chunkCount = bSize > 10 ? 8 : 5;
                exp._chunks = [];
                for (var ch = 0; ch < chunkCount; ch++) {
                  var chA = ch / chunkCount * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                  var chSpd = 3 + Math.random() * 5;
                  exp._chunks.push({
                    x: exp.x,
                    y: exp.y,
                    vx: Math.cos(chA) * chSpd,
                    vy: Math.sin(chA) * chSpd - 2,
                    rot: Math.random() * 6,
                    rotSpd: (Math.random() - 0.5) * 0.4,
                    size: bSize * (0.2 + Math.random() * 0.3),
                    color: bCol,
                    shape: Math.floor(Math.random() * 3),
                    /* 0=circle, 1=square, 2=triangle */
                    bounce: 0
                  });
                }
                /* Energy burst particles */
                var elemCol = ((_ELEMENTS$ZONES$S$cur = ELEMENTS[(_ZONES$S$currentZone1 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone1 === void 0 ? void 0 : _ZONES$S$currentZone1.element]) === null || _ELEMENTS$ZONES$S$cur === void 0 ? void 0 : _ELEMENTS$ZONES$S$cur.color) || '#a78bfa';
                for (var eb = 0; eb < 20; eb++) {
                  var ebA = Math.random() * Math.PI * 2;
                  S.hitParticles.push({
                    x: exp.x,
                    y: exp.y,
                    vx: Math.cos(ebA) * (3 + Math.random() * 5),
                    vy: Math.sin(ebA) * (3 + Math.random() * 5) - 1,
                    life: 0.6,
                    color: eb % 3 === 0 ? '#fff' : elemCol,
                    size: 1 + Math.random() * 2
                  });
                }
              } else {
                /* ═══ RANGED KILL — PINCUSHION COLLAPSE — body falls with arrows sticking out ═══ */
                exp._corpse = {
                  x: exp.x,
                  y: exp.y,
                  vx: Math.cos(ka) * 2,
                  vy: -2,
                  rot: 0,
                  rotSpd: Math.cos(ka) > 0 ? 0.08 : -0.08,
                  size: bSize,
                  color: bCol,
                  bounce: 0,
                  settled: false,
                  arrows: (exp.stuckArrows || []).concat([{
                    ang: ka,
                    ox: 0,
                    oy: 0,
                    color: '#8B6914'
                  }, {
                    ang: ka + (Math.random() - 0.5) * 0.5,
                    ox: (Math.random() - 0.5) * 4,
                    oy: (Math.random() - 0.5) * 4,
                    color: '#8B6914'
                  }])
                };
              }

              /* Generic limb emojis for all types */
              var limbEmojis = ['🦴', '💀', '👁️', '🦷', '🫀'];
              exp._limbs = limbEmojis.slice(0, exp.isGrandSlam ? 5 : 3).map(function (le, li) {
                return {
                  emoji: le,
                  x: exp.x,
                  y: exp.y,
                  vx: (Math.random() - 0.5) * 8 * scale,
                  vy: -3 - Math.random() * 5 * scale,
                  rot: Math.random() * 6 - 3,
                  rotSpd: (Math.random() - 0.5) * 0.3,
                  bounce: 0
                };
              });
            }

            /* ═══ ANIMATE MELEE HALVES — two pieces tumble apart ═══ */
            if (exp._halves) {
              exp._halves.forEach(function (half) {
                half.x += half.vx;
                half.y += half.vy;
                half.vy += 0.2;
                half.vx *= 0.97;
                half.rot += half.rotSpd;
                if (half.y > exp.y + 20 && half.vy > 0) {
                  half.vy *= -0.3;
                  half.vx *= 0.6;
                }
                var hx = half.x - cx + shakeX,
                  hy = half.y - cy + shakeY;
                var hAlpha = Math.max(0, 1 - age / (maxAge * 0.7));
                if (hAlpha <= 0) return;
                ctx.save();
                ctx.translate(hx, hy);
                ctx.rotate(half.rot);
                ctx.globalAlpha = hAlpha;
                /* Draw half body — clip to show only top or bottom */
                ctx.beginPath();
                if (half.side === 'top') ctx.rect(-half.size * 1.5, -half.size * 1.5, half.size * 3, half.size * 1.5);else ctx.rect(-half.size * 1.5, 0, half.size * 3, half.size * 1.5);
                ctx.clip();
                /* Body shape */
                ctx.fillStyle = half.color + 'cc';
                ctx.beginPath();
                ctx.arc(0, 0, half.size, 0, Math.PI * 2);
                ctx.fill();
                /* Emoji */
                ctx.font = (half.size > 10 ? 14 : 10) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(half.emoji, 0, half.size > 10 ? 5 : 3);
                /* Cut edge — bright line */
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-half.size * 1.2, half.side === 'top' ? half.size * 0.1 : -half.size * 0.1);
                ctx.lineTo(half.size * 1.2, half.side === 'top' ? half.size * 0.1 : -half.size * 0.1);
                ctx.stroke();
                ctx.restore();
              });
            }

            /* ═══ ANIMATE MAGIC CHUNKS — body pieces scatter and bounce ═══ */
            if (exp._chunks) {
              exp._chunks.forEach(function (ch) {
                ch.x += ch.vx;
                ch.y += ch.vy;
                ch.vy += 0.22;
                ch.vx *= 0.96;
                ch.rot += ch.rotSpd;
                if (ch.y > exp.y + 15 && ch.vy > 0) {
                  ch.vy *= -0.35;
                  ch.vx *= 0.6;
                  ch.bounce++;
                }
                if (ch.bounce > 3) return;
                var chx = ch.x - cx + shakeX,
                  chy = ch.y - cy + shakeY;
                var chAlpha = Math.max(0, 1 - age / (maxAge * 0.7));
                if (chAlpha <= 0) return;
                ctx.save();
                ctx.translate(chx, chy);
                ctx.rotate(ch.rot);
                ctx.globalAlpha = chAlpha;
                ctx.fillStyle = ch.color + 'cc';
                if (ch.shape === 0) {
                  ctx.beginPath();
                  ctx.arc(0, 0, ch.size, 0, Math.PI * 2);
                  ctx.fill();
                } else if (ch.shape === 1) {
                  ctx.fillRect(-ch.size, -ch.size, ch.size * 2, ch.size * 2);
                } else {
                  ctx.beginPath();
                  ctx.moveTo(0, -ch.size);
                  ctx.lineTo(ch.size, ch.size);
                  ctx.lineTo(-ch.size, ch.size);
                  ctx.closePath();
                  ctx.fill();
                }
                /* Glow outline */
                ctx.strokeStyle = ch.color;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
              });
            }

            /* ═══ ANIMATE RANGED CORPSE — body falls with arrows sticking out ═══ */
            if (exp._corpse) {
              var c2 = exp._corpse;
              if (!c2.settled) {
                c2.x += c2.vx;
                c2.y += c2.vy;
                c2.vy += 0.18;
                c2.vx *= 0.95;
                c2.rot += c2.rotSpd;
                if (c2.y > exp.y + 12 && c2.vy > 0) {
                  c2.vy *= -0.25;
                  c2.vx *= 0.4;
                  c2.bounce++;
                  if (c2.bounce >= 2) {
                    c2.settled = true;
                    c2.rotSpd = 0;
                  }
                }
              }
              var crx = c2.x - cx + shakeX,
                cry = c2.y - cy + shakeY;
              var crAlpha = Math.max(0, 1 - age / (maxAge * 0.8));
              if (crAlpha > 0) {
                ctx.save();
                ctx.translate(crx, cry);
                ctx.rotate(c2.rot);
                ctx.globalAlpha = crAlpha;
                /* Body */
                ctx.fillStyle = c2.color + 'cc';
                ctx.beginPath();
                ctx.arc(0, 0, c2.size, 0, Math.PI * 2);
                ctx.fill();
                /* Stuck arrows fanning out */
                c2.arrows.forEach(function (sa) {
                  ctx.save();
                  ctx.rotate(sa.ang - c2.rot);
                  ctx.translate(sa.ox || 0, sa.oy || 0);
                  ctx.fillStyle = '#8B6914';
                  ctx.fillRect(-8, -1, 14, 2);
                  ctx.fillStyle = sa.color || '#8B6914';
                  ctx.beginPath();
                  ctx.moveTo(7, 0);
                  ctx.lineTo(4, -2.5);
                  ctx.lineTo(4, 2.5);
                  ctx.closePath();
                  ctx.fill();
                  ctx.fillRect(-8, -2, 3, 1);
                  ctx.fillRect(-8, 1, 3, 1);
                  ctx.restore();
                });
                /* Emoji on body */
                ctx.font = (c2.size > 10 ? 14 : 10) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(exp.emoji, 0, c2.size > 10 ? 5 : 3);
                ctx.restore();
              }
            }

            /* Animate generic limbs — bones bounce and settle */
            if (exp._limbs) {
              exp._limbs.forEach(function (limb) {
                limb.x += limb.vx;
                limb.y += limb.vy;
                limb.vy += 0.25; /* gravity */
                limb.rot += limb.rotSpd;
                limb.vx *= 0.97;
                /* Ground bounce */
                if (limb.y > exp.y + 15 && limb.vy > 0) {
                  limb.vy *= -0.4;
                  limb.vx *= 0.7;
                  limb.bounce++;
                }
                if (limb.bounce < 3) {
                  var lx = limb.x - cx + shakeX;
                  var ly = limb.y - cy + shakeY;
                  ctx.save();
                  ctx.translate(lx, ly);
                  ctx.rotate(limb.rot);
                  ctx.globalAlpha = Math.max(0, 1 - age / (maxAge * 0.8));
                  ctx.font = "".concat(10 + 2 * scale, "px sans-serif");
                  ctx.textAlign = 'center';
                  ctx.fillText(limb.emoji, 0, 0);
                  ctx.restore();
                }
              });
            }

            /* Main emoji rises + fades */
            if (age < flashDur + 0.5) {
              ctx.globalAlpha = Math.max(0, 1 - (age - flashDur * 0.5));
              ctx.font = 14 + 6 * scale - age * 20 + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(exp.emoji, ex, ey - age * 50 * scale);
            }

            /* Grand Slam text — "GRAND SLAM!" rises dramatically */
            if (exp.isGrandSlam && age < 1.5) {
              ctx.globalAlpha = Math.max(0, 1 - age / 1.5);
              ctx.font = "bold ".concat(14 + 4 * scale, "px \"VT323\", monospace");
              ctx.fillStyle = '#fbbf24';
              ctx.textAlign = 'center';
              ctx.fillText('GRAND SLAM!', ex, ey - 40 - age * 30);
            }
            ctx.globalAlpha = 1;
            return true;
          });
        }

        /* ═══ RENDER DAMAGE NUMBERS — §2 Sensory Proportionality — JUICED ═══ */
        if (S.dmgNumbers) {
          S.dmgNumbers.forEach(function (d) {
            var age = (Date.now() - d.ts) / 1200;
            if (age >= 1) return;

            /* Initialize per-number velocity on first frame */
            if (d._vx === undefined) {
              d._vx = (Math.random() - 0.5) * 1.5;
              d._vy = -2 - Math.random() * 2;
              d._gravity = 0.06;
              d._bounce = 0;
              d._sx = d.x;
              d._sy = d.y; /* original spawn position */
            }

            /* Categorize for proportional rendering */
            var _dt = String(d.text || '');
            var isCollision = _dt.includes('💥');
            var isGrandSlam = _dt.includes('GRAND');
            var isKill = _dt.includes('☠️') || _dt.includes('KILL');
            var isXP = _dt.includes('XP');
            var isGold = _dt.includes('G') && _dt.includes('+');
            var isMana = _dt.includes('MP');
            var isHeal = _dt.includes('Used') || _dt.includes('Buff');
            var isCodex = _dt.includes('📖');
            var isStatus = _dt.includes('STUN') || _dt.includes('mana');
            var isShield = _dt.includes('🛡️');
            var isPlayerDmg = d.color === '#ff5e6c' && _dt.startsWith('-');
            var isCritNum = _dt.includes('💥') && !_dt.includes('GRAND') && !isCollision;
            var isNumericDmg = /^\d+$/.test(_dt.trim());

            /* Size scales with significance — 2× for mobile readability */
            var fontSize = 22;
            var useGravity = false;
            if (isCollision) fontSize = 30;
            if (isGrandSlam) fontSize = 40;
            if (isKill) fontSize = 32;
            if (isCritNum) fontSize = 28;
            if (isXP || isGold) {
              fontSize = 18;
              useGravity = true;
            }
            if (isMana) fontSize = 20;
            if (isCodex) fontSize = 22;
            if (isPlayerDmg) fontSize = 28;
            if (isShield) fontSize = 20;
            if (isNumericDmg) {
              fontSize = 20;
              useGravity = true;
            }

            /* Physics — apply velocity and gravity for scattered feel */
            if (useGravity) {
              d._vy += d._gravity;
              d.x += d._vx;
              d.y += d._vy;
            } else {
              /* Standard rise */
              d.y -= 0.4;
              d.x += d._vx * 0.3;
            }

            /* Entrance animation — big pop on spawn, settles to normal */
            var popScale = 1;
            if (age < 0.08) {
              popScale = 1 + (0.08 - age) * 15; /* instant big pop */
            } else if (age < 0.2) {
              /* Settle back with slight overshoot */
              var settleT = (age - 0.08) / 0.12;
              popScale = 1 + (1 - settleT) * 0.3 * Math.cos(settleT * Math.PI * 2);
            }
            /* Crits and kills get extra pop */
            if (isCritNum || isCollision || isGrandSlam || isKill) popScale *= 1.15;

            /* Shake on player damage */
            var shakeX = 0,
              shakeY = 0;
            if (isPlayerDmg && age < 0.15) {
              shakeX = (Math.random() - 0.5) * 4;
              shakeY = (Math.random() - 0.5) * 4;
            }
            var dnx = d.x - cx + shakeX,
              dny = d.y - cy + shakeY;
            /* Fade: quick fade-in, slow fade-out */
            var alpha = age < 0.05 ? age / 0.05 : Math.max(0, 1 - age * age);
            ctx.globalAlpha = alpha;
            var finalSize = Math.round(fontSize * popScale);
            ctx.font = "bold ".concat(finalSize, "px \"VT323\", monospace");
            ctx.textAlign = 'center';

            /* Glow trail for big hits */
            if (isCollision || isGrandSlam || isKill || isCritNum) {
              ctx.shadowColor = d.color;
              ctx.shadowBlur = isGrandSlam ? 14 : isKill ? 10 : 6;
            }

            /* Dark outline for readability */
            ctx.strokeStyle = 'rgba(0,0,0,.8)';
            ctx.lineWidth = finalSize > 14 ? 3 : 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(d.text, dnx, dny);

            /* Main text */
            ctx.fillStyle = d.color;
            ctx.fillText(d.text, dnx, dny);

            /* Second bright pass for crits/kills — layered glow */
            if (isCollision || isGrandSlam || isKill) {
              ctx.globalAlpha = alpha * 0.3;
              ctx.fillStyle = '#fff';
              ctx.fillText(d.text, dnx, dny - 1);
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          });
        }

        /* Draw local player — with walk bob */
        var isMoving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
        var bobY = isMoving ? Math.sin(now / 120) * 2 : 0;
        var bobScale = isMoving ? 1 + Math.sin(now / 120 + Math.PI / 2) * 0.03 : 1;
        var px = P.x - cx,
          py = P.y - cy + bobY;
        /* Footstep sound — throttled */
        if (isMoving) {
          if (!S._footstepTimer) S._footstepTimer = 0;
          S._footstepTimer++;
          if (S._footstepTimer % 12 === 0) BT_AUDIO.footstep();
          /* Track steps for stats */
          if (S.stats && S._footstepTimer % 6 === 0) S.stats.steps++;
        }
        /* Footstep dust puffs — zone-tinted */
        if (isMoving) {
          if (!S._dustPuffs) S._dustPuffs = [];
          if (Math.random() < 0.3) {
            var _ZONES$S$currentZone10;
            /* Zone-specific dust color */
            var _curZoneElem = ((_ZONES$S$currentZone10 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone10 === void 0 ? void 0 : _ZONES$S$currentZone10.element) || null;
            var _dustColors = {
              flame: 'rgba(200,100,40,ALPHA)',
              frost: 'rgba(200,220,240,ALPHA)',
              venom: 'rgba(80,160,60,ALPHA)',
              storm: 'rgba(140,120,180,ALPHA)',
              stone: 'rgba(120,110,90,ALPHA)',
              wind: 'rgba(180,200,220,ALPHA)',
              water: 'rgba(100,160,200,ALPHA)',
              dark: 'rgba(60,40,80,ALPHA)',
              light: 'rgba(220,200,120,ALPHA)'
            };
            var _dustC = _dustColors[_curZoneElem] || 'rgba(180,170,140,ALPHA)';
            S._dustPuffs.push({
              x: px + (Math.random() - 0.5) * 8,
              y: py + 14 + Math.random() * 4,
              vx: (Math.random() - 0.5) * 0.5 - dx * 0.3,
              vy: -Math.random() * 0.5 - 0.2,
              life: 1,
              decay: 0.03 + Math.random() * 0.02,
              colorBase: _dustC
            });
          }
        }
        if (S._dustPuffs) {
          S._dustPuffs = S._dustPuffs.filter(function (d) {
            if (isNaN(d.x) || isNaN(d.y)) return false;
            d.x += d.vx;
            d.y += d.vy;
            d.life -= d.decay;
            if (d.life <= 0) return false;
            ctx.fillStyle = (d.colorBase || 'rgba(180,170,140,ALPHA)').replace('ALPHA', (d.life * 0.4).toFixed(2));
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.life * 3, 0, Math.PI * 2);
            ctx.fill();
            return true;
          });
        }

        /* ═══ ENVIRONMENTAL INTERACTION PARTICLES — terrain-aware ═══ */
        if (isMoving && S.map) {
          var _S$map$_pty, _ZONES$S$currentZone11;
          /* Check tile under player */
          var _ptx = Math.floor(P.x / TILE),
            _pty = Math.floor(P.y / TILE);
          var tileUnder = (_S$map$_pty = S.map[_pty]) === null || _S$map$_pty === void 0 ? void 0 : _S$map$_pty[_ptx];
          var _envElem = ((_ZONES$S$currentZone11 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone11 === void 0 ? void 0 : _ZONES$S$currentZone11.element) || null;
          if (!S._envParticles) S._envParticles = [];
          /* Water tiles (1) — splash particles */
          if (tileUnder === 1 && Math.random() < 0.4) {
            var wCol = _envElem === 'flame' ? 'rgba(255,120,40,' : _envElem === 'frost' ? 'rgba(180,220,255,' : _envElem === 'venom' ? 'rgba(100,180,60,' : 'rgba(80,160,220,';
            S._envParticles.push({
              x: px + (Math.random() - 0.5) * 10,
              y: py + 10 + Math.random() * 4,
              vx: (Math.random() - 0.5) * 2,
              vy: -1.5 - Math.random() * 2,
              life: 0.6,
              color: wCol,
              type: 'splash',
              size: 2 + Math.random() * 2
            });
            /* Ripple ring */
            if (Math.random() < 0.15) {
              S._envParticles.push({
                x: px + (Math.random() - 0.5) * 6,
                y: py + 12,
                vx: 0,
                vy: 0,
                life: 0.5,
                color: wCol,
                type: 'ripple',
                size: 3
              });
            }
          }
          /* Sand tiles (3) — kicked sand */
          if (tileUnder === 3 && Math.random() < 0.2) {
            var sCol = _envElem === 'frost' ? 'rgba(200,210,230,' : 'rgba(200,180,120,';
            S._envParticles.push({
              x: px + (Math.random() - 0.5) * 8,
              y: py + 12,
              vx: (Math.random() - 0.5) * 1.5 - dx * 0.5,
              vy: -0.5 - Math.random(),
              life: 0.4,
              color: sCol,
              type: 'dust',
              size: 1.5 + Math.random()
            });
          }
          /* Near trees/fire — heat shimmer or leaf drift */
          if (_envElem === 'flame' && Math.random() < 0.08) {
            S._envParticles.push({
              x: px + (Math.random() - 0.5) * 30,
              y: py - 10 - Math.random() * 20,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -0.5 - Math.random() * 0.5,
              life: 0.8,
              color: 'rgba(255,140,40,',
              type: 'ember',
              size: 1 + Math.random()
            });
          }
          if (_envElem === 'frost' && Math.random() < 0.06) {
            S._envParticles.push({
              x: px + (Math.random() - 0.5) * 30,
              y: py - Math.random() * 30,
              vx: (Math.random() - 0.5) * 0.5,
              vy: 0.3 + Math.random() * 0.3,
              life: 1.0,
              color: 'rgba(200,220,255,',
              type: 'snow',
              size: 1 + Math.random() * 1.5
            });
          }
          if (_envElem === 'wind' && Math.random() < 0.07) {
            S._envParticles.push({
              x: px - 20 + Math.random() * 40,
              y: py - Math.random() * 20,
              vx: 1.5 + Math.random(),
              vy: (Math.random() - 0.5) * 0.5,
              life: 0.7,
              color: 'rgba(200,220,240,',
              type: 'wind',
              size: 1 + Math.random()
            });
          }
          if (_envElem === 'dark' && Math.random() < 0.05) {
            S._envParticles.push({
              x: px + (Math.random() - 0.5) * 24,
              y: py + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -0.3 - Math.random() * 0.3,
              life: 0.9,
              color: 'rgba(80,40,120,',
              type: 'shadow',
              size: 2 + Math.random() * 2
            });
          }
          /* Cap env particles */
          if (S._envParticles.length > 40) S._envParticles.splice(0, S._envParticles.length - 40);
        }
        /* Render env particles */
        if (S._envParticles) {
          S._envParticles = S._envParticles.filter(function (ep) {
            if (isNaN(ep.x) || isNaN(ep.y)) return false;
            ep.x += ep.vx;
            ep.y += ep.vy;
            ep.life -= ep.type === 'snow' || ep.type === 'shadow' ? 0.012 : 0.025;
            if (ep.life <= 0) return false;
            var alpha = ep.life * 0.5;
            if (ep.type === 'ripple') {
              /* Expanding ring */
              var rSize = ep.size + (1 - ep.life) * 8;
              ctx.strokeStyle = ep.color + alpha.toFixed(2) + ')';
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.arc(ep.x, ep.y, rSize, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.fillStyle = ep.color + alpha.toFixed(2) + ')';
              ctx.beginPath();
              ctx.arc(ep.x, ep.y, ep.size * ep.life, 0, Math.PI * 2);
              ctx.fill();
            }
            return true;
          });
        }

        /* ═══ DODGE ROLL AFTERIMAGE TRAIL ═══ */
        if (S._dodgeRoll) {
          if (!S._dodgeTrail) S._dodgeTrail = [];
          /* Store afterimage snapshots during dodge */
          S._dodgeTrail.push({
            x: P.x,
            y: P.y,
            ts: now,
            facing: S._facing || 'down',
            tColor: S.bodyTorso || '#2563eb',
            lColor: S.bodyLegs || '#1e3a5f'
          });
          if (S._dodgeTrail.length > 6) S._dodgeTrail.shift();
        }
        /* Render + decay afterimages */
        if (S._dodgeTrail && S._dodgeTrail.length > 0) {
          S._dodgeTrail = S._dodgeTrail.filter(function (ghost) {
            var gAge = (now - ghost.ts) / 300; /* fade over 300ms */
            if (gAge >= 1) return false;
            var gx = ghost.x - cx,
              gy = ghost.y - cy;
            var gAlpha = (1 - gAge) * 0.35;
            ctx.globalAlpha = gAlpha;
            /* Simple ghost silhouette — tinted blue-white */
            var gSize = _slim ? 8 : 16;
            var gH = _slim ? 14 : 28;
            /* Body */
            ctx.fillStyle = ghost.tColor;
            ctx.beginPath();
            ctx.ellipse(gx, gy + 4, gSize, gH, 0, 0, Math.PI * 2);
            ctx.fill();
            /* Head */
            ctx.fillStyle = '#f0c68a';
            ctx.beginPath();
            ctx.arc(gx, gy + (_slim ? -12 : -20), _slim ? 6 : 10, 0, Math.PI * 2);
            ctx.fill();
            /* Speed lines */
            if (S._dodgeRoll) {
              var trailAngle = S._dodgeRoll.angle + Math.PI;
              ctx.strokeStyle = "rgba(255,255,255,".concat(gAlpha * 0.8, ")");
              ctx.lineWidth = 1;
              for (var sl = 0; sl < 3; sl++) {
                var slOff = (sl - 1) * 6;
                var slx = gx + Math.cos(trailAngle + Math.PI / 2) * slOff;
                var sly = gy + Math.sin(trailAngle + Math.PI / 2) * slOff;
                ctx.beginPath();
                ctx.moveTo(slx, sly);
                ctx.lineTo(slx + Math.cos(trailAngle) * 12, sly + Math.sin(trailAngle) * 12);
                ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
            return true;
          });
        }

        /* Player shadow */
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.beginPath();
        ctx.ellipse(px, py + (_slim ? 24 : 42), _slim ? 10 : 18, _slim ? 4 : 6, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Facing direction — discrete (for rectangle body fallback + weapon) */
        var absDx = Math.abs(dx),
          absDy = Math.abs(dy);
        var wasUpDown = S._facing === 'up' || S._facing === 'down';
        var vertBias = wasUpDown ? 1.3 : 0.7;
        if (absDx > 0.03 || absDy > 0.03) {
          if (absDy > absDx * vertBias) S._facing = dy > 0 ? 'down' : 'up';else if (absDx > absDy * (wasUpDown ? 0.7 : 1.3)) S._facing = dx > 0 ? 'right' : 'left';
        }
        var dir = S._facing || 'down';
        var flipAvatar = dir === 'right';
        var isSide = dir === 'left' || dir === 'right';

        /* Continuous facing angle — smooth 360° rotation for NFT sprites
           Uses atan2 of movement delta, smoothly interpolated toward target.
           Convention: 0=right, π/2=down(toward camera), π/-π=left, -π/2=up(away) */
        if (absDx > 0.02 || absDy > 0.02) {
          S._targetFacingAngle = Math.atan2(dy, dx);
        }
        if (S._facingAngle === undefined) S._facingAngle = Math.PI / 2; /* default: facing camera */
        if (S._targetFacingAngle !== undefined) {
          /* Smooth angular interpolation (lerp on shortest arc) */
          var diff = S._targetFacingAngle - S._facingAngle;
          /* Normalize to [-π, π] */
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          var lerpSpeed = isMoving ? 0.18 : 0.08; /* faster when moving */
          S._facingAngle += diff * lerpSpeed;
          /* Keep in [-π, π] range */
          while (S._facingAngle > Math.PI) S._facingAngle -= Math.PI * 2;
          while (S._facingAngle < -Math.PI) S._facingAngle += Math.PI * 2;
        }

        /* Animation */
        var fp = now / 80;
        var swingAngle = isMoving ? Math.sin(fp) * 0.5 : 0;
        var animBob = isMoving ? Math.abs(Math.sin(fp)) * 2.5 : 0;
        var tColor = S.bodyTorso || '#2563eb';
        var lColor = S.bodyLegs || '#1e3a5f';

        /* Body size: slim=~36x22, armored=64x32 */
        var _slim = S.bodySize !== 'armored';
        var _sv0 = getStatVisuals(S.rpg);
        /* Stat-based body shape: berserker=bulkier, tank=wider, rogue=slimmer */
        var _bulkArm = _sv0.bulkArms || 0;
        var _bulkTorso = _sv0.widerTorso || 0;
        var _slimMod = _sv0.slimmer || 0;
        var tw = (_slim ? 16 : 22) + _bulkTorso - _slimMod,
          aw = (_slim ? 3 : 5) + _bulkArm,
          ah = (_slim ? 14 : 18) + _bulkArm * 0.5;
        var th = (_slim ? 16 : 20) + _bulkTorso * 0.5; /* torso height */
        var lw = (_slim ? 6 : 8) - _slimMod * 0.3,
          lh = _slim ? 10 : 14,
          lg = _slim ? 2 : 3;
        var sw2 = _slim ? 7 : 10,
          sh2 = _slim ? 4 : 5;
        var hR = (_slim ? 12 : 14) + _bulkTorso * 0.3;

        /* ═══ NFT CHECK — does this player have a processed avatar? ═══ */
        var _hasNftBody = false;
        if (S.myAvatar) {
          var _nftImg = loadAvatarImg(S.myAvatar);
          _hasNftBody = _nftImg instanceof HTMLCanvasElement ? _nftImg.width > 0 : _nftImg && _nftImg.complete && _nftImg.naturalWidth;
        }
        if (_hasNftBody) {
          /* ═══ NFT 360° BODY — continuous rotation rendering ═══ */
          var nftImg = loadAvatarImg(S.myAvatar);
          var nftDir = getNftDirectional(nftImg, S.myAvatar);
          var nftSz = nftDir.size;
          var fAngle = S._facingAngle !== undefined ? S._facingAngle : Math.PI / 2;

          /* Compute turn metrics for legs */
          var turnFromCam = fAngle - Math.PI / 2;
          var turnAbs = Math.abs((turnFromCam % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          var sideAmt = Math.sin(turnAbs); /* 0=front/back, 1=side */
          var mirrorLegs = Math.cos(fAngle) > 0; /* mirror when facing screen-right */

          /* Draw legs with 8-directional walk — leg spread varies with angle */
          ctx.save();
          ctx.translate(px, py + animBob);
          var nLegY = 8;
          /* Leg spread: wide when facing front/back, narrow when facing side */
          var legSpread = lg + (1 - sideAmt) * 2; /* extra spread at front/back */
          var legNarrow = sideAmt > 0.4; /* side-ish view: stack legs */

          if (mirrorLegs) {
            ctx.scale(-1, 1);
          }
          if (legNarrow) {
            /* Side-ish view: legs overlap like the old isSide code */
            ctx.save();
            ctx.translate(0, nLegY);
            ctx.rotate(swingAngle);
            ctx.fillStyle = lColor;
            ctx.fillRect(-lw / 2, 0, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-sw2 / 2, lh - 2, sw2, sh2);
            ctx.restore();
            /* Back leg slightly offset and darker */
            ctx.globalAlpha = 0.55;
            ctx.save();
            ctx.translate(0, nLegY);
            ctx.rotate(-swingAngle);
            ctx.fillStyle = lColor;
            ctx.fillRect(-lw / 2, 2, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-sw2 / 2, lh, sw2, sh2);
            ctx.restore();
            ctx.globalAlpha = 1;
          } else {
            /* Front/back-ish view: legs spread apart */
            var _nLs = isMoving ? Math.sin(fp) * 1.5 : 0;
            var _nRs = isMoving ? Math.sin(fp + Math.PI) * 1.5 : 0;
            var halfSpread = legSpread / 2;
            ctx.fillStyle = lColor;
            ctx.fillRect(-(halfSpread + lw), nLegY + _nLs, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-(halfSpread + lw) - 0.5, nLegY + lh - 2 + _nLs, sw2, sh2);
            ctx.fillStyle = lColor;
            ctx.fillRect(halfSpread, nLegY + _nRs, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(halfSpread - 0.5, nLegY + lh - 2 + _nRs, sw2, sh2);
          }
          ctx.restore();

          /* Draw 360° NFT (head + torso) */
          var nftY = py + animBob - nftSz / 2 - 4;
          drawNft360(ctx, nftDir, px, nftY, fAngle, nftSz);
        } else {
          /* ═══ ORIGINAL RECTANGLE BODY (no NFT) ═══ */
          ctx.save();
          ctx.translate(px, py + animBob);
          var armY = _slim ? 8 : 6; /* arm attach point */
          var legY = _slim ? 18 : 22; /* leg attach point */
          var eyeY = _slim ? -10 : -16; /* eye Y offset */
          var handSize = _slim ? 2.5 : 3.5;
          if (isSide) {
            if (dir === 'left') ctx.scale(-1, 1);
            /* Back arm+leg (darker) */
            ctx.globalAlpha = 0.55;
            ctx.save();
            ctx.translate(0, armY);
            ctx.rotate(-swingAngle);
            ctx.fillStyle = tColor;
            ctx.fillRect(-aw / 2, 0, aw, ah);
            ctx.fillStyle = '#f0c68a';
            ctx.fillRect(-1.5, ah - 2, handSize, 3);
            ctx.restore();
            ctx.save();
            ctx.translate(0, legY);
            ctx.rotate(swingAngle);
            ctx.fillStyle = lColor;
            ctx.fillRect(-lw / 2, 0, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-sw2 / 2, lh - 2, sw2, sh2);
            ctx.restore();
            ctx.globalAlpha = 1;
            /* Torso */
            ctx.fillStyle = tColor;
            ctx.fillRect(-tw / 2 + 1, 3, tw - 2, th);
            /* Front arm+leg */
            ctx.save();
            ctx.translate(0, armY);
            ctx.rotate(swingAngle);
            ctx.fillStyle = tColor;
            ctx.fillRect(-aw / 2, 0, aw, ah);
            ctx.fillStyle = '#f0c68a';
            ctx.fillRect(-1.5, ah - 2, handSize, 3);
            ctx.restore();
            ctx.save();
            ctx.translate(0, legY);
            ctx.rotate(-swingAngle);
            ctx.fillStyle = lColor;
            ctx.fillRect(-lw / 2, 0, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-sw2 / 2, lh - 2, sw2, sh2);
            ctx.restore();
          } else {
            var lSl = isMoving ? Math.sin(fp) * 1.5 : 0;
            var rSl = isMoving ? Math.sin(fp + Math.PI) * 1.5 : 0;
            /* Left arm */
            ctx.fillStyle = tColor;
            ctx.fillRect(-(tw / 2 + aw), armY + rSl, aw, ah);
            ctx.fillStyle = '#f0c68a';
            ctx.fillRect(-(tw / 2 + aw) + 0.5, armY + ah - 1 + rSl, 3, 3);
            /* Left leg */
            ctx.fillStyle = lColor;
            ctx.fillRect(-(lg / 2 + lw), legY + lSl, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-(lg / 2 + lw) - 0.5, legY + lh - 2 + lSl, sw2, sh2);
            /* Torso */
            ctx.fillStyle = tColor;
            ctx.fillRect(-tw / 2, 3, tw, th);
            /* Right leg */
            ctx.fillStyle = lColor;
            ctx.fillRect(lg / 2, legY + rSl, lw, lh);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(lg / 2 - 0.5, legY + lh - 2 + rSl, sw2, sh2);
            /* Right arm */
            ctx.fillStyle = tColor;
            ctx.fillRect(tw / 2, armY + lSl, aw, ah);
            ctx.fillStyle = '#f0c68a';
            ctx.fillRect(tw / 2 + 0.5, armY + ah - 1 + lSl, 3, 3);
            /* Eyes (front only) */
            if (dir === 'down') {
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(_slim ? -3 : -4, eyeY, _slim ? 2 : 3, 0, Math.PI * 2);
              ctx.arc(_slim ? 3 : 4, eyeY, _slim ? 2 : 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#1a1a2e';
              ctx.beginPath();
              ctx.arc(_slim ? -2.5 : -3.5, eyeY + 0.5, _slim ? 1.1 : 1.5, 0, Math.PI * 2);
              ctx.arc(_slim ? 3.5 : 4.5, eyeY + 0.5, _slim ? 1.1 : 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        } /* end else (original rectangle body) */

        /* §ANNIV — Cape rendering (behind player) */
        if (((_S$rpg17 = S.rpg) === null || _S$rpg17 === void 0 || (_S$rpg17 = _S$rpg17._anniversaryItems) === null || _S$rpg17 === void 0 ? void 0 : _S$rpg17.length) > 0) {
          var cape = S.rpg._anniversaryItems.find(function (a) {
            return a.type === 'cape';
          });
          if (cape) {
            var _cape$colors, _cape$colors2, _cape$colors3, _cape$colors4, _cape$colors5, _cape$colors6;
            ctx.save();
            ctx.translate(px, py + animBob);
            var capeW = _slim ? 18 : 24;
            var capeH = _slim ? 22 : 28;
            var capeY = _slim ? 4 : 2;
            /* Cape flows behind based on movement direction */
            var capeSwing = isMoving ? Math.sin(now / 150) * 3 : Math.sin(now / 600) * 1;
            var capeFlutter = isMoving ? Math.sin(now / 80) * 1.5 : 0;
            /* Cape gradient: primary → accent */
            var cGrd = ctx.createLinearGradient(0, capeY, 0, capeY + capeH);
            cGrd.addColorStop(0, ((_cape$colors = cape.colors) === null || _cape$colors === void 0 ? void 0 : _cape$colors.primary) || '#1a1a1a');
            cGrd.addColorStop(0.7, ((_cape$colors2 = cape.colors) === null || _cape$colors2 === void 0 ? void 0 : _cape$colors2.primary) || '#1a1a1a');
            cGrd.addColorStop(1, ((_cape$colors3 = cape.colors) === null || _cape$colors3 === void 0 ? void 0 : _cape$colors3.accent) || '#d4a030');
            ctx.fillStyle = cGrd;
            /* Cape shape — trapezoid flowing behind */
            ctx.beginPath();
            ctx.moveTo(-capeW / 2 + 2, capeY);
            ctx.lineTo(capeW / 2 - 2, capeY);
            ctx.lineTo(capeW / 2 + capeSwing + 1, capeY + capeH + capeFlutter);
            ctx.lineTo(-capeW / 2 + capeSwing - 1, capeY + capeH + capeFlutter);
            ctx.closePath();
            ctx.fill();
            /* Gold trim line at bottom */
            ctx.strokeStyle = ((_cape$colors4 = cape.colors) === null || _cape$colors4 === void 0 ? void 0 : _cape$colors4.trim) || '#f5c542';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-capeW / 2 + capeSwing - 1, capeY + capeH + capeFlutter);
            ctx.lineTo(capeW / 2 + capeSwing + 1, capeY + capeH + capeFlutter);
            ctx.stroke();
            /* Subtle glow */
            ctx.shadowColor = ((_cape$colors5 = cape.colors) === null || _cape$colors5 === void 0 ? void 0 : _cape$colors5.glow) || 'rgba(212,160,48,.3)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = ((_cape$colors6 = cape.colors) === null || _cape$colors6 === void 0 ? void 0 : _cape$colors6.accent) || '#d4a030';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-capeW / 2 + capeSwing, capeY + capeH * 0.6);
            ctx.lineTo(capeW / 2 + capeSwing, capeY + capeH * 0.6);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }

        /* §4 Visual Identity — Weapon visual on player */
        if (S.rpg) {
          var wpn = getActiveWeapon(S.rpg);
          var wpnDef = WEAPON_TYPES[wpn.type];
          var wpnAngle = S._aimAngle != null ? S._aimAngle : dir === 'right' ? 0 : dir === 'up' ? -Math.PI / 2 : dir === 'left' ? Math.PI : Math.PI / 2;
          var wpnLen = wpn.type === 'greatsword' ? _slim ? 20 : 28 : wpn.type === 'sword' ? _slim ? 14 : 20 : wpn.type === 'bow' ? _slim ? 12 : 16 : _slim ? 10 : 14;
          var wpnOff = _slim ? 8 : 12;
          var wpnX = px + Math.cos(wpnAngle) * wpnOff;
          var wpnY = py + animBob + Math.sin(wpnAngle) * wpnOff;
          ctx.save();
          ctx.translate(wpnX, wpnY);
          ctx.rotate(wpnAngle + Math.PI / 4);
          if (wpn.type === 'bow') {
            /* Bow — curved arc */
            ctx.strokeStyle = '#8B6914';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, wpnLen, -0.8, 0.8);
            ctx.stroke();
            /* String */
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(-0.8) * wpnLen, Math.sin(-0.8) * wpnLen);
            ctx.lineTo(Math.cos(0.8) * wpnLen, Math.sin(0.8) * wpnLen);
            ctx.stroke();
          } else if (wpn.type === 'staff') {
            /* Staff — thin pole with orb */
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(-1, -wpnLen, 2.5, wpnLen);
            ctx.fillStyle = wpn.element1 ? ELEMENTS[wpn.element1].color : '#a78bfa';
            ctx.beginPath();
            ctx.arc(0, -wpnLen, 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            /* Sword/Greatsword — blade */
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(-1.5, -wpnLen, 3, wpnLen);
            /* Guard */
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(-4, -2, 8, 3);
            /* Grip */
            ctx.fillStyle = '#4a2e0a';
            ctx.fillRect(-1.5, 0, 3, 5);
          }

          /* Element glow on weapon */
          if (wpn.element1) {
            var _ELEMENTS$wpn$element;
            var e1col = ((_ELEMENTS$wpn$element = ELEMENTS[wpn.element1]) === null || _ELEMENTS$wpn$element === void 0 ? void 0 : _ELEMENTS$wpn$element.color) || '#fff';
            ctx.shadowColor = e1col;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = e1col;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4 + Math.sin(now / 300) * 0.2;
            if (wpn.type === 'bow') {
              ctx.beginPath();
              ctx.arc(0, 0, wpnLen + 1, -0.8, 0.8);
              ctx.stroke();
            } else {
              ctx.strokeRect(-2, -wpnLen - 1, 4, wpnLen + 2);
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
          /* Volatile crackling boundary */
          if (wpn.isVolatile && wpn.element1 && wpn.element2) {
            var _ELEMENTS$wpn$element2;
            var e2col = ((_ELEMENTS$wpn$element2 = ELEMENTS[wpn.element2]) === null || _ELEMENTS$wpn$element2 === void 0 ? void 0 : _ELEMENTS$wpn$element2.color) || '#fff';
            ctx.strokeStyle = e2col;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.3 + Math.random() * 0.3;
            for (var vc = 0; vc < 3; vc++) {
              var vy = -wpnLen * Math.random();
              ctx.beginPath();
              ctx.moveTo(-2 + Math.random() * 4, vy);
              ctx.lineTo(-2 + Math.random() * 4, vy + 3 + Math.random() * 4);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          ctx.restore();
        }

        /* Head — skip if NFT body already drawn (it includes the head) */
        if (!_hasNftBody) {
          var _S$rpg18;
          var _headY = _slim ? -6 : -12;
          ctx.fillStyle = '#f0c68a';
          ctx.beginPath();
          ctx.arc(px, py + _headY + animBob, hR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3b2414';
          ctx.beginPath();
          ctx.arc(px, py + _headY - 2 + animBob, hR, Math.PI, Math.PI * 2);
          ctx.fill();

          /* §MASK — Draw active mask over head */
          var _activeMask = (_S$rpg18 = S.rpg) === null || _S$rpg18 === void 0 ? void 0 : _S$rpg18._activeMask;
          if (_activeMask) {
            var maskDef = MASKS.find(function (m) {
              return m.id === _activeMask;
            });
            if (maskDef) {
              if (_activeMask === 'crown') {
                /* Crown: draw normal head first, then crown on top */
                /* Avatar override */
                if (S.myAvatar) {
                  var img = loadAvatarImg(S.myAvatar);
                  var ready = img instanceof HTMLCanvasElement ? img.width > 0 : img.complete && img.naturalWidth;
                  if (ready) {
                    ctx.save();
                    if (flipAvatar) {
                      ctx.translate(px, 0);
                      ctx.scale(-1, 1);
                      ctx.translate(-px, 0);
                    }
                    ctx.beginPath();
                    ctx.arc(px, py + _headY + animBob, hR, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, px - hR, py + _headY - hR + animBob, hR * 2, hR * 2);
                    ctx.restore();
                  }
                }
                drawMask(ctx, _activeMask, px, py + _headY + animBob, hR, now);
              } else {
                /* Mask replaces head appearance */
                drawMask(ctx, _activeMask, px, py + _headY + animBob, hR, now);
              }
            }
          } else {
            /* No mask — normal avatar override */
            if (S.myAvatar) {
              var _img2 = loadAvatarImg(S.myAvatar);
              var _ready2 = _img2 instanceof HTMLCanvasElement ? _img2.width > 0 : _img2.complete && _img2.naturalWidth;
              if (_ready2) {
                ctx.save();
                if (flipAvatar) {
                  ctx.translate(px, 0);
                  ctx.scale(-1, 1);
                  ctx.translate(-px, 0);
                }
                ctx.beginPath();
                ctx.arc(px, py + _headY + animBob, hR, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(_img2, px - hR, py + _headY - hR + animBob, hR * 2, hR * 2);
                ctx.restore();
              }
            }
          }

          /* §STATVIS — Stat-based visual aura/glow around player */
          var _sv = getStatVisuals(S.rpg);
          if (_sv.intensity > 0) {
            ctx.save();
            ctx.globalAlpha = _sv.intensity * 0.25;
            /* Archetype glow ring */
            ctx.strokeStyle = _sv.accentColor;
            ctx.lineWidth = 1 + _sv.intensity;
            ctx.beginPath();
            ctx.arc(px, py + animBob, hR + 8 + Math.sin(now / 400) * 2, 0, Math.PI * 2);
            ctx.stroke();
            /* Mage: floating arcane particles */
            if (_sv.arcaneParticles > 0) {
              for (var _ap = 0; _ap < _sv.arcaneParticles; _ap++) {
                var apAngle = now / 1000 + _ap * (Math.PI * 2 / _sv.arcaneParticles);
                var apR = hR + 12 + Math.sin(now / 300 + _ap) * 3;
                var _apx = px + Math.cos(apAngle) * apR;
                var _apy = py + animBob + Math.sin(apAngle) * apR * 0.6;
                ctx.fillStyle = _sv.accentColor;
                ctx.globalAlpha = 0.4 + Math.sin(now / 200 + _ap) * 0.2;
                ctx.beginPath();
                ctx.arc(_apx, _apy, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            /* Healer: soft halo */
            if (_sv.healGlow > 0) {
              var hgrd = ctx.createRadialGradient(px, py + animBob, 0, px, py + animBob, hR + 15);
              hgrd.addColorStop(0, 'rgba(56,189,248,' + _sv.healGlow * 0.5 + ')');
              hgrd.addColorStop(1, 'transparent');
              ctx.fillStyle = hgrd;
              ctx.beginPath();
              ctx.arc(px, py + animBob, hR + 15, 0, Math.PI * 2);
              ctx.fill();
            }
            /* Leader: golden shimmer */
            if (_sv.crownGlow > 0) {
              ctx.fillStyle = 'rgba(245,197,66,' + _sv.crownGlow * 0.3 + ')';
              ctx.beginPath();
              ctx.arc(px, py + _headY + animBob - hR - 3, 3 + Math.sin(now / 300), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
          }
        } /* end !_hasNftBody head */
        /* Own name */
        var _nameY = _slim ? -28 : -36;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,.65)';
        var myNtw = ctx.measureText(S.myName).width;
        ctx.fillRect(px - myNtw / 2 - 4, py + _nameY, myNtw + 8, 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(S.myName, px, py + _nameY + 11);
        /* Own badges below name */
        if (S.badges && S.badges.length > 0) {
          ctx.font = '8px sans-serif';
          var badgeStr = S.badges.map(function (bid) {
            var a = BT_ACHIEVEMENTS.find(function (x) {
              return x.id === bid;
            });
            return a ? a.icon : '';
          }).join('');
          ctx.fillText(badgeStr, px, py + _nameY - 5);
        }

        /* ═══ SHIELD ARC HUD ═══ */
        if (S._shieldUp) {
          var shieldAng = S._shieldAngle !== undefined ? S._shieldAngle : S._aimAngle || function () {
            var fd = S._facing || 'down';
            return fd === 'right' ? 0 : fd === 'up' ? -Math.PI / 2 : fd === 'left' ? Math.PI : Math.PI / 2;
          }();
          ctx.save();
          ctx.strokeStyle = 'rgba(96,165,250,.5)';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.shadowColor = 'rgba(96,165,250,.4)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(px, py + (_slim ? 8 : 12), _slim ? 22 : 30, shieldAng - 0.8, shieldAng + 0.8);
          ctx.stroke();
          /* Inner glow */
          ctx.strokeStyle = 'rgba(150,200,255,.3)';
          ctx.lineWidth = 8;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(px, py + (_slim ? 8 : 12), _slim ? 20 : 28, shieldAng - 0.6, shieldAng + 0.6);
          ctx.stroke();
          ctx.restore();
        }

        /* ═══ BOW AIM LINE — LOS extends across screen ═══ */
        if ((((_S$rpg19 = S.rpg) === null || _S$rpg19 === void 0 ? void 0 : _S$rpg19.activeSlot) === 'ranged' || ((_S$rpg20 = S.rpg) === null || _S$rpg20 === void 0 ? void 0 : _S$rpg20.activeSlot) === 'staff') && S.autoAttack) {
          var aimA;
          if (S.lockedTarget && S.lockedTarget.ref) {
            var lt3 = S.lockedTarget.ref;
            aimA = Math.atan2((lt3.y || 0) - P.y, (lt3.x || 0) - P.x);
          } else if (S._aiming) {
            aimA = S._aimAngle || 0;
          } else {
            var fd3 = S._facing || 'down';
            aimA = fd3 === 'right' ? 0 : fd3 === 'up' ? -Math.PI / 2 : fd3 === 'left' ? Math.PI : Math.PI / 2;
          }
          var isAiming = S._aiming || S.lockedTarget && S.lockedTarget.ref;
          var losAlpha = isAiming ? 0.5 : 0.2;
          ctx.save();
          /* Long dashed LOS line */
          ctx.beginPath();
          ctx.moveTo(px, py + 14);
          ctx.lineTo(px + Math.cos(aimA) * W * 2, py + 10 + Math.sin(aimA) * W * 2);
          ctx.strokeStyle = 'rgba(255,255,255,' + losAlpha * 0.4 + ')';
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 12]);
          ctx.lineDashOffset = -(Date.now() / 15) % 24;
          ctx.stroke();
          ctx.setLineDash([]);
          /* Shorter solid aim arrow */
          var aimLen = isAiming ? 50 : 30;
          ctx.beginPath();
          ctx.moveTo(px, py + 14);
          ctx.lineTo(px + Math.cos(aimA) * aimLen, py + 14 + Math.sin(aimA) * aimLen);
          ctx.strokeStyle = 'rgba(255,255,255,' + losAlpha + ')';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
          /* Carat/chevron at aim tip */
          var cTip = aimLen + 8;
          var cX = px + Math.cos(aimA) * cTip,
            cY = py + 10 + Math.sin(aimA) * cTip;
          ctx.fillStyle = 'rgba(255,255,255,' + losAlpha + ')';
          ctx.beginPath();
          ctx.moveTo(cX + Math.cos(aimA) * 6, cY + Math.sin(aimA) * 6);
          ctx.lineTo(cX + Math.cos(aimA + 2.5) * 8, cY + Math.sin(aimA + 2.5) * 8);
          ctx.lineTo(cX + Math.cos(aimA - 2.5) * 8, cY + Math.sin(aimA - 2.5) * 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        /* ═══ SWORD — longsword held by character + swing ═══ */
        if (((_S$rpg21 = S.rpg) === null || _S$rpg21 === void 0 ? void 0 : _S$rpg21.activeSlot) === 'melee') {
          var baseA;
          if (S.lockedTarget && S.lockedTarget.ref) {
            var _lt4 = S.lockedTarget.ref;
            baseA = Math.atan2((_lt4.y || _lt4.renderY || P.y) - P.y, (_lt4.x || _lt4.renderX || P.x) - P.x);
          } else if (S._aiming && S._aimAngle != null) {
            baseA = S._aimAngle;
          } else {
            var _swDir = S._facing || 'down';
            baseA = _swDir === 'right' ? 0 : _swDir === 'up' ? -Math.PI / 2 : _swDir === 'left' ? Math.PI : Math.PI / 2;
          }
          var bladeLen = _slim ? 38 : 48;
          var hiltLen = _slim ? 8 : 10;
          var bpy = py + animBob + (_slim ? 12 : 16); /* torso level */

          if (S.isSwinging) {
            var swAge = (Date.now() - S.swingTimer) / 250;
            if (swAge < 1) {
              /* Swing: blade sweeps through the arc */
              var curA = baseA - SWING_ARC / 2 + swAge * SWING_ARC;
              var tipX = px + Math.cos(curA) * bladeLen;
              var tipY = bpy + Math.sin(curA) * bladeLen;
              var hiltX = px + Math.cos(curA) * hiltLen;
              var hiltY = bpy + Math.sin(curA) * hiltLen;
              var perpA = curA + Math.PI / 2;
              ctx.save();
              /* §Creative Vision Stage 2-3: Element glow on weapon swing */
              var swingElem = S._specialAttack ? activeWpn.element2 : activeWpn.element1;
              var hasElemGlow = !!swingElem;
              if (hasElemGlow) {
                var _ELEMENTS$swingElem, _ELEMENTS$activeWpn$e;
                var elemColor = ((_ELEMENTS$swingElem = ELEMENTS[swingElem]) === null || _ELEMENTS$swingElem === void 0 ? void 0 : _ELEMENTS$swingElem.color) || '#fff';
                var elem2Color = activeWpn.element2 ? (_ELEMENTS$activeWpn$e = ELEMENTS[activeWpn.element2]) === null || _ELEMENTS$activeWpn$e === void 0 ? void 0 : _ELEMENTS$activeWpn$e.color : null;
                /* Element aura around swing area */
                ctx.save();
                ctx.shadowColor = elemColor;
                ctx.shadowBlur = 16;
                ctx.fillStyle = elemColor.replace(')', ',.15)').replace('rgb', 'rgba');
                ctx.beginPath();
                ctx.arc(px, bpy, bladeLen * 1.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                /* Volatile crackle for fusion weapons */
                if (activeWpn.isVolatile && activeWpn.element1 && activeWpn.element2) {
                  var _ELEMENTS$activeWpn$e2, _ELEMENTS$activeWpn$e3;
                  var e1c = ((_ELEMENTS$activeWpn$e2 = ELEMENTS[activeWpn.element1]) === null || _ELEMENTS$activeWpn$e2 === void 0 ? void 0 : _ELEMENTS$activeWpn$e2.color) || '#fff';
                  var e2c = ((_ELEMENTS$activeWpn$e3 = ELEMENTS[activeWpn.element2]) === null || _ELEMENTS$activeWpn$e3 === void 0 ? void 0 : _ELEMENTS$activeWpn$e3.color) || '#fff';
                  for (var _vc2 = 0; _vc2 < 3; _vc2++) {
                    var vcA = (Date.now() / 150 + _vc2 * 2.1) % (Math.PI * 2);
                    var vcR = bladeLen * 0.7 + Math.sin(Date.now() / 80 + _vc2) * 8;
                    ctx.fillStyle = _vc2 % 2 === 0 ? e1c : e2c;
                    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
                    ctx.beginPath();
                    ctx.arc(px + Math.cos(vcA) * vcR, bpy + Math.sin(vcA) * vcR, 2 + Math.random(), 0, Math.PI * 2);
                    ctx.fill();
                  }
                  ctx.globalAlpha = 1;
                }
              } else if (S._specialAttack) {
                /* No element = raw power glow (golden) */
                ctx.fillStyle = 'rgba(245,197,66,0.15)';
                ctx.beginPath();
                ctx.arc(px, bpy, bladeLen * 1.3, 0, Math.PI * 2);
                ctx.fill();
              }
              /* Motion blur trail — wide element-colored slash arc */
              var trailA = curA - 0.5;
              ctx.globalAlpha = (1 - swAge) * 0.35;
              var trailColor = hasElemGlow ? ELEMENTS[swingElem].color : 'rgba(200,200,220,0.4)';
              ctx.fillStyle = trailColor;
              ctx.beginPath();
              ctx.moveTo(px, bpy);
              ctx.arc(px, bpy, bladeLen + 2, Math.min(trailA, curA), Math.max(trailA, curA));
              ctx.closePath();
              ctx.fill();
              /* Afterimage ghost blades — 4 fading copies behind the current blade */
              for (var gi = 1; gi <= 4; gi++) {
                var ghostAge = Math.max(0, swAge - gi * 0.06);
                if (ghostAge < 0) continue;
                var ghostA = baseA - SWING_ARC / 2 + ghostAge * SWING_ARC;
                var ghostTipX = px + Math.cos(ghostA) * bladeLen;
                var ghostTipY = bpy + Math.sin(ghostA) * bladeLen;
                var ghostHiltX = px + Math.cos(ghostA) * hiltLen;
                var ghostHiltY = bpy + Math.sin(ghostA) * hiltLen;
                ctx.globalAlpha = (1 - swAge) * (0.2 - gi * 0.04);
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = Math.max(1, 3 - gi * 0.5);
                ctx.beginPath();
                ctx.moveTo(ghostHiltX, ghostHiltY);
                ctx.lineTo(ghostTipX, ghostTipY);
                ctx.stroke();
              }
              /* Second thinner inner trail */
              ctx.globalAlpha = (1 - swAge) * 0.15;
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.moveTo(px, bpy);
              ctx.arc(px, bpy, bladeLen * 0.7, Math.min(trailA, curA), Math.max(trailA, curA));
              ctx.closePath();
              ctx.fill();
              /* Blade tip spark particles — spray off during swing */
              if (swAge < 0.6 && Math.random() < 0.5) {
                var sparkColor = hasElemGlow ? ELEMENTS[swingElem].color : '#ddd';
                S.hitParticles.push({
                  x: tipX + cx,
                  y: tipY + cy,
                  vx: Math.cos(curA + Math.PI / 2) * (1 + Math.random() * 2),
                  vy: Math.sin(curA + Math.PI / 2) * (1 + Math.random() * 2) - 0.5,
                  life: 0.4,
                  color: sparkColor,
                  size: 1 + Math.random()
                });
              }

              /* Blade — element-tinted steel */
              ctx.globalAlpha = 1;
              var bladeColor = hasElemGlow ? ELEMENTS[swingElem].color : '#c8c8d0';
              var bladeTint = hasElemGlow ? bladeColor : '#c8c8d0';
              ctx.fillStyle = bladeTint;
              if (hasElemGlow) {
                ctx.shadowColor = bladeColor;
                ctx.shadowBlur = 10;
              } else {
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 4;
              }
              ctx.beginPath();
              ctx.moveTo(hiltX + Math.cos(perpA) * 3, hiltY + Math.sin(perpA) * 3);
              ctx.lineTo(hiltX - Math.cos(perpA) * 3, hiltY - Math.sin(perpA) * 3);
              ctx.lineTo(tipX - Math.cos(perpA) * 1.2, tipY - Math.sin(perpA) * 1.2);
              ctx.lineTo(tipX + Math.cos(curA) * 3, tipY + Math.sin(curA) * 3); /* sharp tip */
              ctx.lineTo(tipX + Math.cos(perpA) * 1.2, tipY + Math.sin(perpA) * 1.2);
              ctx.closePath();
              ctx.fill();
              /* Blade edge highlight */
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              ctx.lineWidth = 1;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.moveTo(hiltX + Math.cos(perpA) * 2.5, hiltY + Math.sin(perpA) * 2.5);
              ctx.lineTo(tipX + Math.cos(curA) * 2, tipY + Math.sin(curA) * 2);
              ctx.stroke();
              /* Fuller (groove) */
              ctx.strokeStyle = 'rgba(0,0,0,0.15)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              var midBlade = 0.5;
              ctx.moveTo(hiltX + Math.cos(curA) * 5, hiltY + Math.sin(curA) * 5);
              ctx.lineTo(tipX - Math.cos(curA) * 8, tipY - Math.sin(curA) * 8);
              ctx.stroke();

              /* Crossguard */
              var cgX = hiltX,
                cgY = hiltY;
              ctx.strokeStyle = '#8B6914';
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(cgX + Math.cos(perpA) * 7, cgY + Math.sin(perpA) * 7);
              ctx.lineTo(cgX - Math.cos(perpA) * 7, cgY - Math.sin(perpA) * 7);
              ctx.stroke();
              /* Grip */
              ctx.strokeStyle = '#5a3a1e';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(px + Math.cos(curA) * 3, bpy + Math.sin(curA) * 3);
              ctx.lineTo(hiltX, hiltY);
              ctx.stroke();
              /* Pommel */
              ctx.fillStyle = '#8B6914';
              ctx.beginPath();
              ctx.arc(px + Math.cos(curA) * 3, bpy + Math.sin(curA) * 3, 2.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.restore();
            }
          } else {
            var _S$rpg22, _S$rpg23;
            /* Idle — sword resting at character's side */
            var restA = baseA + 0.5;
            /* Bow sprite when equipped */
            if (((_S$rpg22 = S.rpg) === null || _S$rpg22 === void 0 ? void 0 : _S$rpg22.activeSlot) === 'ranged' || ((_S$rpg23 = S.rpg) === null || _S$rpg23 === void 0 ? void 0 : _S$rpg23.activeSlot) === 'staff') {
              ctx.save();
              ctx.translate(px, bpy);
              ctx.rotate(baseA);
              ctx.strokeStyle = '#8B6914';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(10, 0, 12, -0.8, 0.8);
              ctx.stroke();
              /* Bowstring */
              ctx.strokeStyle = 'rgba(255,255,255,.3)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(10 + Math.cos(-0.8) * 12, Math.sin(-0.8) * 12);
              ctx.lineTo(10 + Math.cos(0.8) * 12, Math.sin(0.8) * 12);
              ctx.stroke();
              ctx.restore();
            } /* angled slightly from facing direction */
            var restLen = bladeLen * 0.7;
            var _tipX = px + Math.cos(restA) * restLen;
            var _tipY = bpy + Math.sin(restA) * restLen;
            var _hiltX = px + Math.cos(restA) * 6;
            var _hiltY = bpy + Math.sin(restA) * 6;
            var _perpA = restA + Math.PI / 2;
            ctx.save();
            ctx.globalAlpha = 0.7;
            /* Blade */
            ctx.fillStyle = '#b0b0b8';
            ctx.beginPath();
            ctx.moveTo(_hiltX + Math.cos(_perpA) * 2, _hiltY + Math.sin(_perpA) * 2);
            ctx.lineTo(_hiltX - Math.cos(_perpA) * 2, _hiltY - Math.sin(_perpA) * 2);
            ctx.lineTo(_tipX - Math.cos(_perpA) * 0.8, _tipY - Math.sin(_perpA) * 0.8);
            ctx.lineTo(_tipX + Math.cos(restA) * 2, _tipY + Math.sin(restA) * 2);
            ctx.lineTo(_tipX + Math.cos(_perpA) * 0.8, _tipY + Math.sin(_perpA) * 0.8);
            ctx.closePath();
            ctx.fill();
            /* Crossguard */
            ctx.strokeStyle = '#6a4a10';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(_hiltX + Math.cos(_perpA) * 5, _hiltY + Math.sin(_perpA) * 5);
            ctx.lineTo(_hiltX - Math.cos(_perpA) * 5, _hiltY - Math.sin(_perpA) * 5);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
          }
        }

        /* ═══ PET RENDER — follows player, bounces with personality ═══ */
        if (((_S$rpg24 = S.rpg) === null || _S$rpg24 === void 0 || (_S$rpg24 = _S$rpg24.lifeSkills) === null || _S$rpg24 === void 0 ? void 0 : _S$rpg24.activePet) !== null && S._petX) {
          var _S$rpg$lifeSkills$pet;
          var _pet = (_S$rpg$lifeSkills$pet = S.rpg.lifeSkills.pets) === null || _S$rpg$lifeSkills$pet === void 0 ? void 0 : _S$rpg$lifeSkills$pet[S.rpg.lifeSkills.activePet];
          if (_pet) {
            var petSx = S._petX - cx,
              petSy = S._petY - cy;
            var petBob = Math.sin(now / 250) * 3;
            /* Shadow */
            ctx.fillStyle = 'rgba(0,0,0,.12)';
            ctx.beginPath();
            ctx.ellipse(petSx, petSy + 10 + petBob, 6, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            /* Body — colored circle */
            ctx.fillStyle = _pet.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(petSx, petSy + petBob, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            /* Emoji */
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(_pet.emoji, petSx, petSy + 3 + petBob);
            /* Name tag */
            ctx.font = 'bold 6px "VT323", monospace';
            ctx.fillStyle = _pet.color;
            ctx.fillText(_pet.name, petSx, petSy - 8 + petBob);
            /* Loot collect radius indicator (subtle) */
            ctx.strokeStyle = 'rgba(245,197,66,.06)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(petSx, petSy + petBob, PET_LOOT_RADIUS / 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        /* ═══ PLAYER LEVEL BADGE — simplified, resources now on joystick rings ═══ */
        if (S.rpg) {
          var _R0 = S.rpg;
          var lvStr = 'Lv' + _R0.level;
          ctx.font = 'bold 8px "VT323", monospace';
          var lvTextW = ctx.measureText(lvStr).width;
          ctx.fillStyle = 'rgba(0,0,0,.6)';
          ctx.fillRect(px - lvTextW / 2 - 3, py + (_slim ? 25 : 34) + animBob, lvTextW + 6, 10);
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(lvStr, px, py + (_slim ? 33 : 42) + animBob);

          /* Invuln indicator — flickering ethereal shimmer */
          if (Date.now() < S.respawnTimer) {
            /* Rapid flicker */
            var invAge = (S.respawnTimer - Date.now()) / RESPAWN_INVULN;
            var flicker = Math.sin(Date.now() / 40) * 0.5 + 0.5;
            ctx.globalAlpha = 0.15 + flicker * 0.15;
            /* Pulsing shield bubble */
            var invPulse = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.strokeStyle = 'rgba(91,82,255,.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py + animBob, 22 * invPulse, 0, Math.PI * 2);
            ctx.stroke();
            /* Inner glow */
            ctx.fillStyle = 'rgba(91,82,255,.12)';
            ctx.beginPath();
            ctx.arc(px, py + animBob, 20 * invPulse, 0, Math.PI * 2);
            ctx.fill();
            /* Orbiting sparkles */
            for (var iv = 0; iv < 3; iv++) {
              var iva = Date.now() / 300 + iv * Math.PI * 2 / 3;
              ctx.fillStyle = "rgba(180,170,255,".concat(0.4 + flicker * 0.4, ")");
              ctx.beginPath();
              ctx.arc(px + Math.cos(iva) * 18, py + animBob + Math.sin(iva) * 18, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }
        /* Shield active — pulsing blue hexagonal barrier */
        if (Date.now() < S.shieldEnd) {
          var shAge = (S.shieldEnd - Date.now()) / 2000;
          var shPulse = Math.sin(Date.now() / 80) * 0.15 + 0.85;
          ctx.save();
          ctx.globalAlpha = shAge * shPulse * 0.6;
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
          /* Hexagon */
          ctx.beginPath();
          for (var h = 0; h < 6; h++) {
            var ha = h * Math.PI / 3 - Math.PI / 6 + Date.now() / 800;
            var hx = px + Math.cos(ha) * 22;
            var hy = py + animBob + Math.sin(ha) * 22;
            if (h === 0) ctx.moveTo(hx, hy);else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
          /* Inner glow fill */
          ctx.fillStyle = "rgba(96,165,250,".concat(shAge * 0.12, ")");
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        /* Stunned indicator — obvious with countdown */
        if (playerStunned) {
          var stunLeft = Math.max(0, ((S._playerStunUntil || 0) - Date.now()) / 1000);
          /* Dark overlay on character */
          ctx.fillStyle = 'rgba(0,0,0,.3)';
          ctx.beginPath();
          ctx.arc(px, py + animBob, 18, 0, Math.PI * 2);
          ctx.fill();
          /* Spinning stars — larger */
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          var stunSpin = Date.now() / 150;
          for (var s = 0; s < 4; s++) {
            var sa = stunSpin + s * Math.PI * 2 / 4;
            ctx.fillText('💫', px + Math.cos(sa) * 18, py - 22 + animBob + Math.sin(sa) * 5);
          }
          /* STUNNED text + countdown */
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#f5c542';
          ctx.fillText('STUNNED ' + stunLeft.toFixed(1) + 's', px, py - 36 + animBob);
        }
        /* ═══ DESKTOP AIM RETICLE — subtle crosshair at mouse world position ═══ */
        if (S._isDesktop && S._mouseWorldX != null && S._mouseWorldY != null) {
          var _mx4 = S._mouseWorldX - S.camera.x;
          var _my4 = S._mouseWorldY - S.camera.y;
          var aimDist = Math.sqrt(Math.pow(S._mouseWorldX - P.x, 2) + Math.pow(S._mouseWorldY - P.y, 2));
          /* Only show if mouse is far enough from player (>20px) */
          if (aimDist > 20) {
            ctx.save();
            var pulse = Math.sin(Date.now() / 300) * 0.15 + 0.85;
            var aimAlpha = S.autoAttack ? 0.7 : 0.35;
            ctx.globalAlpha = aimAlpha * pulse;
            ctx.strokeStyle = S.autoAttack ? '#ff6060' : '#aab0d0';
            ctx.lineWidth = 1.2;
            var rSize = S.autoAttack ? 8 : 6;
            /* Outer ring */
            ctx.beginPath();
            ctx.arc(_mx4, _my4, rSize, 0, Math.PI * 2);
            ctx.stroke();
            /* Cross lines */
            var gap = rSize + 2,
              ext = rSize + 5;
            ctx.beginPath();
            ctx.moveTo(_mx4 - ext, _my4);
            ctx.lineTo(_mx4 - gap, _my4);
            ctx.moveTo(_mx4 + gap, _my4);
            ctx.lineTo(_mx4 + ext, _my4);
            ctx.moveTo(_mx4, _my4 - ext);
            ctx.lineTo(_mx4, _my4 - gap);
            ctx.moveTo(_mx4, _my4 + gap);
            ctx.lineTo(_mx4, _my4 + ext);
            ctx.stroke();
            /* Center dot when attacking */
            if (S.autoAttack) {
              ctx.fillStyle = '#ff6060';
              ctx.beginPath();
              ctx.arc(_mx4, _my4, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
            /* Line from player to reticle (faint) */
            ctx.globalAlpha = S.autoAttack ? 0.12 : 0.06;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(_mx4, _my4);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }

        /* ── Chat bubbles above all players ── */
        var drawBubble = function drawBubble(bx, by, text, dashed) {
          ctx.font = '11px sans-serif';
          var maxW = 140;
          /* Word wrap */
          var words = text.split(' ');
          var lines = [];
          var line = '';
          words.forEach(function (w) {
            var test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxW && line) {
              lines.push(line);
              line = w;
            } else line = test;
          });
          if (line) lines.push(line);
          if (lines.length > 3) {
            lines.length = 3;
            lines[2] = lines[2].slice(0, -3) + '...';
          }
          var lineH = 14;
          var pad = 8;
          var bw = Math.min(maxW + pad * 2, Math.max.apply(Math, _toConsumableArray(lines.map(function (l) {
            return ctx.measureText(l).width;
          }))) + pad * 2);
          var bh = lines.length * lineH + pad * 2;
          var tipH = 6;
          var bubbleY = by - 36 - bh;

          /* Bubble background */
          ctx.fillStyle = dashed ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.92)';
          ctx.beginPath();
          var r = 8;
          var x1 = bx - bw / 2,
            y1 = bubbleY,
            x2 = bx + bw / 2,
            y2 = bubbleY + bh;
          ctx.moveTo(x1 + r, y1);
          ctx.lineTo(x2 - r, y1);
          ctx.arcTo(x2, y1, x2, y1 + r, r);
          ctx.lineTo(x2, y2 - r);
          ctx.arcTo(x2, y2, x2 - r, y2, r);
          /* Tip */
          ctx.lineTo(bx + 5, y2);
          ctx.lineTo(bx, y2 + tipH);
          ctx.lineTo(bx - 5, y2);
          ctx.lineTo(x1 + r, y2);
          ctx.arcTo(x1, y2, x1, y2 - r, r);
          ctx.lineTo(x1, y1 + r);
          ctx.arcTo(x1, y1, x1 + r, y1, r);
          ctx.fill();

          /* Dashed border for unsent typing preview */
          if (dashed) {
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = 'rgba(100,80,180,.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          /* Text */
          ctx.fillStyle = '#1a1428';
          ctx.textAlign = 'center';
          lines.forEach(function (ln, i) {
            ctx.fillText(ln, bx, bubbleY + pad + 11 + i * lineH);
          });
        };

        /* Draw bubbles (expire after 5s) */
        var bubbleNow = Date.now();
        /* Own bubble */
        var myBubble = S.chatBubbles[S.myId];
        if (myBubble && bubbleNow - myBubble.ts < 5000) {
          var _alpha = Math.min(1, (5000 - (bubbleNow - myBubble.ts)) / 500);
          ctx.globalAlpha = _alpha;
          drawBubble(px, py, myBubble.text);
          ctx.globalAlpha = 1;
        } else if (myBubble && bubbleNow - myBubble.ts >= 5000) {
          delete S.chatBubbles[S.myId];
        }
        /* Other players' bubbles */
        Object.entries(S.others).forEach(function (_ref23) {
          var _ref24 = _slicedToArray(_ref23, 2),
            pid = _ref24[0],
            o = _ref24[1];
          var bubble = S.chatBubbles[pid];
          if (bubble && bubbleNow - bubble.ts < 5000) {
            var osx = o.renderX - cx,
              osy = o.renderY - cy;
            var _alpha2 = Math.min(1, (5000 - (bubbleNow - bubble.ts)) / 500);
            ctx.globalAlpha = _alpha2;
            drawBubble(osx, osy, bubble.text);
            ctx.globalAlpha = 1;
          } else if (bubble && bubbleNow - bubble.ts >= 5000) {
            delete S.chatBubbles[pid];
          }
        });

        /* Draw NPCs */
        if (S.npcs) {
          S.npcs.forEach(function (npc) {
            if (!npc.alive) return;
            var nx = npc.renderX - cx,
              ny = npc.renderY - cy;
            if (nx < -50 || nx > W + 50 || ny < -50 || ny > H + 50) return;
            var nDir = npc._facing || 'down';
            var nSide = nDir === 'left' || nDir === 'right';
            var nMoving = Math.abs(npc.x - npc.targetX) > 4 || Math.abs(npc.y - npc.targetY) > 4;
            var nFp = now / 120;
            var nBob = nMoving ? Math.sin(now / 120) * 1.5 : 0;
            var nny = ny + nBob;

            /* Shadow */
            ctx.fillStyle = 'rgba(0,0,0,.15)';
            ctx.beginPath();
            ctx.ellipse(nx, nny + 22, 9, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            /* Body — simplified lego */
            var nTY = nny + 6;
            var nLS = nMoving ? Math.sin(nFp) * 3 : 0;
            var nRS = nMoving ? Math.sin(nFp + Math.PI) * 3 : 0;
            /* Legs */
            ctx.fillStyle = npc.bl;
            ctx.fillRect(nx - 5, nTY + 8 + nLS, 4, 7);
            ctx.fillRect(nx + 1, nTY + 8 + nRS, 4, 7);
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(nx - 6, nTY + 14 + nLS, 6, 2);
            ctx.fillRect(nx, nTY + 14 + nRS, 6, 2);
            /* Torso */
            ctx.fillStyle = npc.bt;
            ctx.fillRect(nx - 6, nTY, 12, 8);
            /* Arms */
            var nLAY = nTY + 1 + (nMoving ? Math.sin(nFp + Math.PI) * 2.5 : 0);
            var nRAY = nTY + 1 + (nMoving ? Math.sin(nFp) * 2.5 : 0);
            ctx.fillStyle = npc.bt;
            ctx.fillRect(nx - 9, nLAY, 3, 7);
            ctx.fillRect(nx + 6, nRAY, 3, 7);
            ctx.fillStyle = '#f0c68a';
            ctx.fillRect(nx - 8, nLAY + 6, 2, 2);
            ctx.fillRect(nx + 6, nRAY + 6, 2, 2);

            /* Head — colored circle with NPC badge (or skull for Ferryman) */
            if (npc.avatar === '💀') {
              /* Skull head for The Ferryman */
              ctx.font = '18px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💀', nx, nny + 1);
            } else {
              ctx.fillStyle = npc.color;
              ctx.beginPath();
              ctx.arc(nx, nny - 4, 11, 0, Math.PI * 2);
              ctx.fill();
            }
            /* NPC HP bar */
            var nHpPct = npc.hp / npc.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,.5)';
            ctx.fillRect(nx - 12, nny - 18, 24, 3);
            ctx.fillStyle = nHpPct > 0.5 ? '#3dd497' : nHpPct > 0.25 ? '#f5c542' : '#ff5e6c';
            ctx.fillRect(nx - 12, nny - 18, 24 * nHpPct, 3);
            /* NPC indicator — small star */
            ctx.fillStyle = '#f5c542';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('★', nx, nny - 14);

            /* §19.1 Quest marker above NPC — ❗ for available, ❓ for turn-in ready */
            if (npc._questMarker) {
              var qmPulse = Math.sin(now / 300) * 3;
              ctx.font = 'bold 16px sans-serif';
              ctx.fillStyle = npc._questMarker === '❗' ? '#f5c542' : '#3dd497';
              ctx.fillText(npc._questMarker, nx, nny - 32 + qmPulse);
            }

            /* Name */
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,.5)';
            var nnw = ctx.measureText(npc.name).width;
            ctx.fillRect(nx - nnw / 2 - 3, nny - 26, nnw + 6, 11);
            ctx.fillStyle = npc.color;
            ctx.fillText(npc.name, nx, nny - 17);

            /* Chat bubble */
            if (npc.chatBubble) {
              var _age = Date.now() - npc.chatBubble.ts;
              var _alpha3 = _age > 4000 ? 1 - (_age - 4000) / 1000 : 1;
              if (_alpha3 > 0) {
                ctx.globalAlpha = _alpha3;
                drawBubble(nx, nny, npc.chatBubble.text);
                ctx.globalAlpha = 1;
              }
            }
          });
        }

        /* Draw emotes above players */
        var emoteNow = Date.now();
        /* Own emote */
        if (S.emote && emoteNow - S.emote.ts < 3000) {
          var progress = (emoteNow - S.emote.ts) / 3000;
          var emoteY = py - 46 - progress * 15;
          var _alpha4 = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
          var scale = progress < 0.1 ? progress / 0.1 : 1;
          ctx.globalAlpha = _alpha4;
          ctx.font = "".concat(Math.round(24 * scale), "px sans-serif");
          ctx.textAlign = 'center';
          ctx.fillText(S.emote.emoji, px, emoteY);
          ctx.globalAlpha = 1;
        }
        /* Other players' emotes */
        Object.entries(S.others).forEach(function (_ref25) {
          var _ref26 = _slicedToArray(_ref25, 2),
            pid = _ref26[0],
            o = _ref26[1];
          if (o.emote && emoteNow - o.emote.ts < 3000) {
            var osx = o.renderX - cx,
              osy = o.renderY - cy;
            var _progress = (emoteNow - o.emote.ts) / 3000;
            var _emoteY = osy - 46 - _progress * 15;
            var _alpha5 = _progress > 0.7 ? 1 - (_progress - 0.7) / 0.3 : 1;
            var _scale = _progress < 0.1 ? _progress / 0.1 : 1;
            ctx.globalAlpha = _alpha5;
            ctx.font = "".concat(Math.round(24 * _scale), "px sans-serif");
            ctx.textAlign = 'center';
            ctx.fillText(o.emote.emoji, osx, _emoteY);
            ctx.globalAlpha = 1;
          }
        });

        /* Highlight nearby building with glowing border */
        if (S.nearBuilding !== null) {
          var _b = BUILDINGS[S.nearBuilding];
          var bsx = _b.bx * TILE - cx;
          var bsy = _b.by * TILE - cy;
          var bsw = _b.bw * TILE;
          var bsh = _b.bh * TILE;
          ctx.strokeStyle = "rgba(91,82,255,".concat(0.4 + 0.2 * Math.sin(now / 300), ")");
          ctx.lineWidth = 2;
          ctx.strokeRect(bsx - 1, bsy - 1, bsw + 2, bsh + 2);
          /* Building icon + name below */
          ctx.font = 'bold 10px "Space Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(91,82,255,.9)';
          ctx.fillText(_b.icon + ' ' + _b.label, bsx + bsw / 2, bsy + bsh + 14);
        }

        /* Day/night tint overlay */
        if (nightAlpha > 0) {
          ctx.fillStyle = isNight ? "rgba(10,10,40,".concat(nightAlpha, ")") : "rgba(40,20,10,".concat(nightAlpha, ")");
          ctx.fillRect(0, 0, W, H);
        }

        /* ═══ ZONE ATMOSPHERE OVERLAY — element tint + vignette + depth darkness ═══ */
        var _zAtmo = (_ZONES$S$currentZone12 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone12 === void 0 ? void 0 : _ZONES$S$currentZone12.atmosphere;
        if (_zAtmo) {
          /* Full-screen element color wash */
          if (_zAtmo.tint) {
            ctx.fillStyle = _zAtmo.tint;
            ctx.fillRect(0, 0, W, H);
          }
          /* Edge vignette — darker at edges for zone mood */
          if (_zAtmo.vignette) {
            var vgr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
            vgr.addColorStop(0, 'rgba(0,0,0,0)');
            vgr.addColorStop(1, _zAtmo.vignette);
            ctx.fillStyle = vgr;
            ctx.fillRect(0, 0, W, H);
          }
        }
        /* Depth darkness — deeper zones get progressively darker and more oppressive */
        var _depthName = S._currentDepth;
        if (_depthName && _depthName !== 'shallow' && S.currentZone !== 'town') {
          var depthDark = {
            mid: 0.04,
            deep: 0.10,
            abyss: 0.18,
            core: 0.28
          };
          var darkness = depthDark[_depthName] || 0;
          if (darkness > 0) {
            /* Dark overlay gets stronger at deeper depths */
            ctx.fillStyle = "rgba(0,0,0,".concat(darkness, ")");
            ctx.fillRect(0, 0, W, H);
            /* Tighter vignette at deeper depths */
            var vigStr = darkness * 1.5;
            var dvgr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.55);
            dvgr.addColorStop(0, 'rgba(0,0,0,0)');
            dvgr.addColorStop(1, "rgba(0,0,0,".concat(Math.min(0.4, vigStr), ")"));
            ctx.fillStyle = dvgr;
            ctx.fillRect(0, 0, W, H);
          }
          /* Abyss+ gets a subtle pulsing red tint */
          if (_depthName === 'abyss' || _depthName === 'core') {
            var abyssPulse = Math.sin(Date.now() / 2000) * 0.015 + 0.02;
            ctx.fillStyle = "rgba(180,20,20,".concat(abyssPulse, ")");
            ctx.fillRect(0, 0, W, H);
          }
        }

        /* ═══ ZONE-SPECIFIC RENDERING ═══ */

        /* ── DEEP HOLLOWS: Darkness overlay with torch circle ── */
        if (S.currentZone === 'hollows') {
          var torchR = S._torch ? TORCH_RADIUS_BASE : DARKNESS_RADIUS;
          var darkGrad = ctx.createRadialGradient(px, py, torchR * 0.4, px, py, torchR);
          darkGrad.addColorStop(0, 'rgba(0,0,0,0)');
          darkGrad.addColorStop(0.6, 'rgba(0,0,0,0.1)');
          darkGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
          ctx.fillStyle = darkGrad;
          ctx.fillRect(0, 0, W, H);
          /* Dark tint beyond the light radius — visible but dim, not black */
          ctx.fillStyle = 'rgba(15,10,25,0.25)';
          ctx.fillRect(0, 0, W, H);
          /* Torch flicker effect */
          if (S._torch) {
            var _flicker = Math.sin(now / 80) * 3 + Math.sin(now / 130) * 2;
            var glowR = torchR * 0.25 + _flicker;
            ctx.fillStyle = "rgba(255,160,40,0.04)";
            ctx.beginPath();
            ctx.arc(px, py, glowR, 0, Math.PI * 2);
            ctx.fill();
            /* Torch timer bar */
            var torchPct = Math.max(0, 1 - (Date.now() - S._torch.started) / TORCH_DURATION);
            ctx.fillStyle = 'rgba(0,0,0,.5)';
            ctx.fillRect(px - 20, py - 35, 40, 4);
            ctx.fillStyle = torchPct > 0.3 ? '#ea580c' : '#ff5e6c';
            ctx.fillRect(px - 20, py - 35, 40 * torchPct, 4);
          }
        }

        /* ── TIDAL CAVES: Tide water level overlay ── */
        if (S.currentZone === 'tidal' && S._tideLevel > 0.5) {
          var tideAlpha = (S._tideLevel - 0.5) * 0.15; /* max 0.075 at peak */
          ctx.fillStyle = "rgba(40,100,180,".concat(tideAlpha, ")");
          ctx.fillRect(0, 0, W, H);
          /* Swimming indicator */
          if (S._swimming) {
            ctx.fillStyle = 'rgba(40,100,180,0.08)';
            ctx.beginPath();
            ctx.arc(px, py, 25, 0, Math.PI * 2);
            ctx.fill();
            /* Wave ripples around player */
            var waveR = 15 + Math.sin(now / 200) * 3;
            ctx.strokeStyle = 'rgba(100,180,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py + 5, waveR, 0, Math.PI * 2);
            ctx.stroke();

            /* §DIVE — Air meter above player when underwater */
            if (S._diveAir !== undefined && S._diveAir < DIVE_MAX_AIR) {
              var airPct = S._diveAir / DIVE_MAX_AIR;
              var barW = 40,
                barH = 4;
              var barX = px - barW / 2,
                barY = py - 35;
              ctx.fillStyle = 'rgba(0,0,0,.5)';
              ctx.fillRect(barX, barY, barW, barH);
              ctx.fillStyle = airPct > 0.3 ? 'rgba(52,152,219,.8)' : airPct > 0.1 ? 'rgba(230,126,34,.8)' : 'rgba(231,76,60,.9)';
              ctx.fillRect(barX, barY, barW * airPct, barH);
              ctx.strokeStyle = 'rgba(255,255,255,.2)';
              ctx.strokeRect(barX, barY, barW, barH);
              /* Bubble particles when low air */
              if (airPct < 0.4) {
                for (var bi = 0; bi < 2; bi++) {
                  var bx2 = px + (Math.random() - 0.5) * 20;
                  var by2 = py - 10 - Math.random() * 15;
                  var _bsz = 1 + Math.random() * 2;
                  ctx.fillStyle = 'rgba(150,200,255,' + (0.2 + Math.random() * 0.3) + ')';
                  ctx.beginPath();
                  ctx.arc(bx2, by2, _bsz, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              /* 🫧 text */
              ctx.font = 'bold 7px "VT323", monospace';
              ctx.textAlign = 'center';
              ctx.fillStyle = airPct > 0.3 ? 'rgba(100,180,255,.6)' : 'rgba(255,100,100,.8)';
              ctx.fillText('🫧 ' + Math.ceil(S._diveAir) + '%', px, barY - 3);
            }

            /* Underwater tint overlay when diving */
            if (S._diveAir !== undefined && S._diveAir < DIVE_MAX_AIR * 0.8) {
              var underwaterAlpha = Math.max(0, 0.08 - S._diveAir / DIVE_MAX_AIR * 0.06);
              ctx.fillStyle = 'rgba(20,60,120,' + underwaterAlpha + ')';
              ctx.fillRect(0, 0, W, H);
            }
          }
        }

        /* ── FROZEN SHORE: Render snowballs in flight ── */
        if (S._snowballs) {
          S._snowballs.forEach(function (sb) {
            var sbx = sb.x - cx,
              sby = sb.y - cy;
            if (sbx < -20 || sbx > W + 20 || sby < -20 || sby > H + 20) return;
            /* Snowball — white circle with trail */
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sbx, sby, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(200,230,255,0.5)';
            ctx.beginPath();
            ctx.arc(sbx - sb.vx * 2, sby - sb.vy * 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(200,230,255,0.2)';
            ctx.beginPath();
            ctx.arc(sbx - sb.vx * 4, sby - sb.vy * 4, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        /* ── FROZEN SHORE: Render snowmen decoys ── */
        if (S._snowmen) {
          S._snowmen.forEach(function (sm) {
            var smx = sm.x - cx,
              smy = sm.y - cy;
            if (smx < -30 || smx > W + 30 || smy < -30 || smy > H + 30) return;
            var smAge = Date.now() - sm.ts;
            var smAlpha = smAge > SNOWMAN_DURATION - 3000 ? (SNOWMAN_DURATION - smAge) / 3000 : 1;
            ctx.globalAlpha = smAlpha;
            /* Body — three circles */
            ctx.fillStyle = '#e8e8f0';
            ctx.beginPath();
            ctx.arc(smx, smy + 8, 10, 0, Math.PI * 2);
            ctx.fill(); /* bottom */
            ctx.beginPath();
            ctx.arc(smx, smy - 2, 7, 0, Math.PI * 2);
            ctx.fill(); /* middle */
            ctx.beginPath();
            ctx.arc(smx, smy - 11, 5, 0, Math.PI * 2);
            ctx.fill(); /* head */
            /* Eyes */
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(smx - 2, smy - 12, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(smx + 2, smy - 12, 1, 0, Math.PI * 2);
            ctx.fill();
            /* Carrot nose */
            ctx.fillStyle = '#ea8020';
            ctx.beginPath();
            ctx.moveTo(smx, smy - 11);
            ctx.lineTo(smx + 6, smy - 10);
            ctx.lineTo(smx, smy - 9);
            ctx.fill();
            /* Arms — sticks */
            ctx.strokeStyle = '#5a3a1a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(smx - 7, smy - 2);
            ctx.lineTo(smx - 16, smy - 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(smx + 7, smy - 2);
            ctx.lineTo(smx + 16, smy - 8);
            ctx.stroke();
            /* HP bar */
            var smHpPct = sm.hp / 50;
            ctx.fillStyle = 'rgba(0,0,0,.4)';
            ctx.fillRect(smx - 10, smy - 20, 20, 3);
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(smx - 10, smy - 20, 20 * smHpPct, 3);
            /* "DECOY" label */
            ctx.font = 'bold 6px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,216,240,.6)';
            ctx.fillText('DECOY', smx, smy + 22);
            ctx.globalAlpha = 1;
          });
        }

        /* ── FROZEN SHORE: Sled trail effect ── */
        if (S._sled && S.currentZone === 'frost') {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🛷', px, py + 8);
        }

        /* ═══ DAMAGE FLASH — red screen pulse when hit ═══ */
        if (S.lastDamageTaken) {
          var dmgAge = (Date.now() - S.lastDamageTaken) / 400;
          if (dmgAge < 1) {
            var flashAlpha = (1 - dmgAge) * 0.18;
            var dmgVgr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.6);
            dmgVgr.addColorStop(0, "rgba(255,30,30,".concat(flashAlpha * 0.3, ")"));
            dmgVgr.addColorStop(1, "rgba(200,0,0,".concat(flashAlpha, ")"));
            ctx.fillStyle = dmgVgr;
            ctx.fillRect(0, 0, W, H);
          }
        }

        /* ═══ BLOCK FLASH — blue screen pulse on successful shield block ═══ */
        if (S._blockFlash) {
          var bfAge = (Date.now() - S._blockFlash) / 250;
          if (bfAge < 1) {
            ctx.fillStyle = "rgba(96,165,250,".concat((1 - bfAge) * 0.12, ")");
            ctx.fillRect(0, 0, W, H);
          } else {
            S._blockFlash = null;
          }
        }

        /* ═══ LOW HP WARNING — pulsing red vignette when below 25% ═══ */
        if (S.rpg && S.rpg.hp < S.rpg.maxHp * 0.25 && S.rpg.hp > 0) {
          var lowPulse = Math.sin(now / 300) * 0.5 + 0.5;
          var lowAlpha = 0.05 + lowPulse * 0.08;
          var lowVgr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.55);
          lowVgr.addColorStop(0, 'rgba(0,0,0,0)');
          lowVgr.addColorStop(1, "rgba(180,0,0,".concat(lowAlpha, ")"));
          ctx.fillStyle = lowVgr;
          ctx.fillRect(0, 0, W, H);
        }

        /* ═══ LEVEL UP FLASH — golden burst ═══ */
        if (S._levelUpFlash) {
          var luAge = (Date.now() - S._levelUpFlash) / 600;
          if (luAge < 1) {
            ctx.fillStyle = "rgba(245,197,66,".concat((1 - luAge) * 0.15, ")");
            ctx.fillRect(0, 0, W, H);
            /* Golden ring expanding from center */
            ctx.strokeStyle = "rgba(245,197,66,".concat((1 - luAge) * 0.4, ")");
            ctx.lineWidth = (1 - luAge) * 4 + 1;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, luAge * Math.max(W, H) * 0.4, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            S._levelUpFlash = null;
          }
        }

        /* ═══ KILL SLOWMO OVERLAY — cinematic tint during time dilation ═══ */
        if (S._killSlowmo) {
          var smAge = (Date.now() - S._killSlowmo) / (S._killSlowmoDuration || 200);
          if (smAge < 1) {
            /* Subtle dark overlay for drama */
            var smAlpha = smAge < 0.3 ? smAge / 0.3 * 0.08 : (1 - smAge) * 0.08;
            ctx.fillStyle = "rgba(0,0,20,".concat(smAlpha, ")");
            ctx.fillRect(0, 0, W, H);
            /* Radial focus toward kill point (screen center approx) */
            ctx.fillStyle = "rgba(245,197,66,".concat(smAlpha * 0.5, ")");
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, 30 + smAge * 50, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        /* ═══ ZONE TRANSITION WIPE — element-colored cinematic fade ═══ */
        if (S._zoneWipe) {
          var wipeAge = (Date.now() - S._zoneWipe) / 600;
          if (wipeAge < 1) {
            var _ELEMENTS$zWipe$eleme;
            var zWipe = ZONES[S.currentZone];
            var zElemColor = zWipe !== null && zWipe !== void 0 && zWipe.element ? ((_ELEMENTS$zWipe$eleme = ELEMENTS[zWipe.element]) === null || _ELEMENTS$zWipe$eleme === void 0 ? void 0 : _ELEMENTS$zWipe$eleme.color) || '#fff' : '#5b52ff';
            /* Fast fade in, slower fade out */
            var wipeAlpha = wipeAge < 0.25 ? wipeAge / 0.25 : 1 - (wipeAge - 0.25) / 0.75;
            /* Dark base */
            ctx.fillStyle = "rgba(0,0,0,".concat(Math.max(0, wipeAlpha) * 0.8, ")");
            ctx.fillRect(0, 0, W, H);
            /* Element color wash overlay */
            ctx.fillStyle = zElemColor;
            ctx.globalAlpha = Math.max(0, wipeAlpha) * 0.1;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            /* Horizontal wipe line — sweeps across screen */
            if (wipeAge < 0.5) {
              var lineY = H * (wipeAge / 0.5);
              ctx.fillStyle = zElemColor;
              ctx.globalAlpha = 0.3;
              ctx.fillRect(0, lineY - 2, W, 4);
              ctx.globalAlpha = 1;
            }
            /* Zone name flash at peak */
            if (wipeAge > 0.15 && wipeAge < 0.65) {
              var nameAlpha = wipeAge < 0.35 ? (wipeAge - 0.15) / 0.2 : (0.65 - wipeAge) / 0.3;
              ctx.globalAlpha = nameAlpha;
              /* Zone name — large, with glow */
              ctx.shadowColor = zElemColor;
              ctx.shadowBlur = 20;
              ctx.font = 'bold 28px "VT323", monospace';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#fff';
              ctx.fillText((zWipe === null || zWipe === void 0 ? void 0 : zWipe.name) || '', W / 2, H / 2 - 5);
              ctx.shadowBlur = 0;
              /* Element subtitle */
              ctx.font = '13px "VT323", monospace';
              ctx.fillStyle = zElemColor;
              var subText = zWipe !== null && zWipe !== void 0 && zWipe.element ? '— ' + zWipe.element.toUpperCase() + ' ZONE —' : '';
              ctx.fillText(subText, W / 2, H / 2 + 18);
              /* Level range — use depth-specific range if available */
              var _wipDepth = S._currentDepth;
              var _wipDc = _wipDepth ? DEPTH_CONFIG[_wipDepth] : null;
              var _wipLr = _wipDc === null || _wipDc === void 0 ? void 0 : _wipDc.lvlRange;
              if (_wipLr || zWipe !== null && zWipe !== void 0 && zWipe.level) {
                ctx.font = '10px "VT323", monospace';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                if (_wipDepth && _wipDepth !== 'shallow' && _wipLr) {
                  ctx.fillText(_wipDepth.toUpperCase() + ' · Lv ' + _wipLr[0] + ' - ' + _wipLr[1], W / 2, H / 2 + 32);
                } else if (zWipe !== null && zWipe !== void 0 && zWipe.level) {
                  ctx.fillText('Lv ' + zWipe.level[0] + ' - ' + zWipe.level[1], W / 2, H / 2 + 32);
                }
              }
              ctx.globalAlpha = 1;
            }
          } else {
            S._zoneWipe = null;
          }
        }

        /* ═══ DEATH FLASH — red-black slam on player death ═══ */
        if (S._deathFlash) {
          var dfAge = (Date.now() - S._deathFlash) / 800;
          if (dfAge < 1) {
            var dfAlpha = dfAge < 0.15 ? dfAge / 0.15 : Math.max(0, 1 - dfAge);
            ctx.fillStyle = dfAge < 0.15 ? "rgba(200,0,0,".concat(dfAlpha * 0.4, ")") : "rgba(10,0,0,".concat(dfAlpha * 0.5, ")");
            ctx.fillRect(0, 0, W, H);
            if (dfAge > 0.1 && dfAge < 0.5) {
              var skullAlpha = dfAge < 0.3 ? (dfAge - 0.1) / 0.2 : (0.5 - dfAge) / 0.2;
              ctx.globalAlpha = skullAlpha;
              ctx.font = '40px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💀', W / 2, H / 2 + 10);
              ctx.font = 'bold 16px "VT323", monospace';
              ctx.fillStyle = '#ff5e6c';
              ctx.fillText('YOU DIED', W / 2, H / 2 + 35);
              ctx.globalAlpha = 1;
            }
          } else {
            S._deathFlash = null;
          }
        }
        ctx.restore(); /* end screen shake */

        /* ═══ CLAN WAR HUD — scoreboard overlay when war is active ═══ */
        if (S._activeClanWar && S._activeClanWar.status === 'active') {
          var _war3 = S._activeClanWar;
          var timeLeft = Math.max(0, (_war3.endTime - Date.now()) / 1000);
          var mins = Math.floor(timeLeft / 60);
          var secs = Math.floor(timeLeft % 60);
          var inWarZone = S.currentZone === _war3.zone;
          ctx.save();

          /* Red vignette border when in the war zone */
          if (inWarZone) {
            var _pulse = Math.sin(Date.now() / 400) * 0.08 + 0.12;
            var grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
            grd.addColorStop(0, 'transparent');
            grd.addColorStop(1, 'rgba(200,30,30,' + _pulse + ')');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W, H);
            /* Corner war indicators */
            ctx.font = 'bold 8px "VT323", monospace';
            ctx.fillStyle = 'rgba(255,94,108,' + (0.3 + Math.sin(Date.now() / 500) * 0.15) + ')';
            ctx.textAlign = 'left';
            ctx.fillText('⚔️ WAR ZONE', 8, H - 8);
            ctx.textAlign = 'right';
            ctx.fillText('⚔️ WAR ZONE', W - 8, H - 8);
          }
          /* War banner at top center */
          var bw = 200,
            bh = 36;
          var _bx = W / 2 - bw / 2,
            _by = 4;
          ctx.fillStyle = 'rgba(0,0,0,.7)';
          ctx.beginPath();
          ctx.roundRect(_bx, _by, bw, bh, 6);
          ctx.fill();
          ctx.strokeStyle = inWarZone ? 'rgba(255,94,108,.5)' : 'rgba(255,255,255,.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          /* Challenger score */
          ctx.font = 'bold 14px "VT323", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = _war3.challenger.color || '#5b52ff';
          ctx.fillText('[' + _war3.challenger.tag + '] ' + _war3.challenger.score, _bx + bw * 0.25, _by + 22);
          /* VS */
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          ctx.fillText('VS', _bx + bw / 2, _by + 20);
          /* Defender score */
          ctx.font = 'bold 14px "VT323", monospace';
          ctx.fillStyle = _war3.defender.color || '#ff5e6c';
          ctx.fillText(_war3.defender.score + ' [' + _war3.defender.tag + ']', _bx + bw * 0.75, _by + 22);
          /* Timer */
          ctx.font = 'bold 8px "Space Mono", monospace';
          ctx.fillStyle = timeLeft < 60 ? '#ff5e6c' : 'rgba(255,255,255,.4)';
          ctx.fillText(mins + ':' + (secs < 10 ? '0' : '') + secs, _bx + bw / 2, _by + 32);
          /* Zone indicator */
          if (!inWarZone) {
            var _ZONES$_war3$zone;
            ctx.font = 'bold 7px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,.2)';
            ctx.fillText('Go to ' + (((_ZONES$_war3$zone = ZONES[_war3.zone]) === null || _ZONES$_war3$zone === void 0 ? void 0 : _ZONES$_war3$zone.name) || _war3.zone) + '!', _bx + bw / 2, _by + bh + 10);
          }
          ctx.restore();
        }

        /* Minimap removed — resources shown on joystick rings */
}
