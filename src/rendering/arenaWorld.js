/* ═══ v2.3.3565: A DUNGEON'S ARENA, FURNISHED WITH THE OWNER'S PICTURES ═══
 *
 * The things that stand in a world dungeon's arena (src/data/dungeonArena.js,
 * the owner's ChatGPT sheet cut by tools/world/add-dungeon-art.mjs) and the
 * boss's chest, drawn while you are in it, the way your farm is drawn
 * (farmWorld.js):
 *
 *   THINGS  each a Sprite at its foot in `entities`, so the depth pass sorts
 *           it with you (depthSort.js) -- walk behind a pillar and it hides
 *           you; a puddle lies flat on `groundDetails`, under everyone.  The
 *           walls' and the things' footprints go to the walk test at your
 *           BOOTS (worldProps.setZoneBlockerHook), and an arrow fired into one
 *           sticks there, chipping what it is made of (propMaterial).
 *   CHEST   the clear's chest (server/src/dungeonreward.js, its card
 *           ui/mobile/DungeonClearHud.jsx) lands where the boss fell -- the
 *           last place a monster the worker calls the boss (`m.boss`) stood --
 *           shut, and opens as the card's chest does (the same moment, its
 *           lid's sounds the card's), coins glinting up out of it.  It stands
 *           until you leave; you walk past it, it stops nobody.
 *
 * Nothing here decides anything: the chest's contents are the worker's, and a
 * clear that paid none (an older worker, the Workshop) leaves none.  The
 * pictures are game/dungeonArt.js's, loaded behind the dungeon's loading
 * screen and let go after you leave; this drops every reference to them first
 * (the zone-asset rule: a display lets go, never only hides).
 */
import { Sprite, Container, Graphics } from 'pixi.js';
import { arenaThings, arenaBlockers, ARENA_W, ARENA_WALLS } from '../data/dungeonArena.js';
import { setZoneBlockerHook } from '../data/worldProps.js';
import { SHADE } from './formShade.js';

const ART = 0.5;   /* game px a picture px */
/* the card's own moment (DungeonClearHud.jsx CHEST_WAIT_MS + a frame): the
   lid lifts after the clear's fanfare */
export const CHEST_OPEN_MS = 975;
const DROP_MS = 380, DROP_PX = 46;
const GLINT_MS = 900, GLINTS = 10;
/* where a chest may land: inside the floor, clear of the walls */
const CHEST_PAD = 70;

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

let _live = null;

export class ArenaWorld {
  /** `zoneId` the arena's zone, `art` its pictures (game/dungeonArt.js). */
  constructor(layers, zoneId, art) {
    _live = this;
    this.layers = layers;
    this.zone = zoneId;
    this.art = art;
    this.things = [];
    this.chest = null;
    this._bossAt = null;
    this._blockers = arenaBlockers(art.home);
    this._offHook = setZoneBlockerHook((z) => (z === this.zone ? this._blockers : null));
    this._build();
  }

  _build() {
    for (const t of arenaThings(this.art.home)) {
      const tex = own(this.art.things, t.art) ? this.art.things[t.art] : null;
      if (!tex || tex.destroyed) continue;
      const sp = new Sprite(tex);
      const f = tex._dgFoot || [tex.frame.width / 2, tex.frame.height];
      sp.anchor.set(f[0] / tex.frame.width, f[1] / tex.frame.height);
      sp.scale.set(t.flip ? -ART : ART, ART);
      sp.x = t.x; sp.y = t.y;
      sp.label = 'arenaThing';
      sp._arenaThing = t;
      if (t.flat) this.layers.groundDetails.addChild(sp);
      else { sp._vShade = SHADE.prop; this.layers.entities.addChild(sp); }
      this.things.push(sp);
    }
  }

  update(S, now) {
    if (!S || S.currentZone !== this.zone) return;
    /* where the boss stands, while it does */
    const ms = S.monsters;
    if (ms && ms.length) {
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        if (m && m.boss && m.alive !== false && Number.isFinite(m.x) && Number.isFinite(m.y)) { this._bossAt = { x: m.x, y: m.y }; break; }
      }
    }
    const c = S._dungeonClear;
    const reward = c && c.zone === this.zone && !c.gone ? c.reward : null;
    if (reward && reward.chest && !this.chest) this._dropChest(S, reward, now);
    if (this.chest) this._chestFrame(Date.now());
  }

  _dropChest(S, reward, now) {
    const set = this.art.chest;
    const shut = set && set['shut-1'], open = set && set['open-1'];
    if (!shut || shut.destroyed || !open || open.destroyed) return;
    const P = S.player || { x: ARENA_W / 2, y: 900 };
    const at = this._bossAt || { x: P.x, y: P.y - 120 };
    const { SIDE, FACE_FOOT, BOTTOM } = ARENA_WALLS;
    const x = Math.max(SIDE + CHEST_PAD, Math.min(ARENA_W - SIDE - CHEST_PAD, at.x));
    const y = Math.max(FACE_FOOT + CHEST_PAD + 40, Math.min(BOTTOM - CHEST_PAD, at.y));
    const box = new Container();
    box.label = 'arenaChest';
    box.x = x; box.y = y;
    const sp = new Sprite(shut);
    const f = shut._dgFoot || [shut.frame.width / 2, shut.frame.height];
    sp.anchor.set(f[0] / shut.frame.width, f[1] / shut.frame.height);
    sp.scale.set(ART);
    /* centred on the spot: the foot is the box's front corner */
    const dx = (f[0] - shut.frame.width / 2) * ART;
    sp.x = dx;
    sp._vShade = SHADE.prop;
    box.addChild(sp);
    this.layers.entities.addChild(box);
    /* its glints on `particles`, over it: a shape redrawn every frame in the
       depth-sorted layer would rebuild that layer's draw list every frame
       (TRAPS §218) */
    const glints = new Graphics();
    glints.label = 'arenaChestGlints';
    glints.x = x; glints.y = y;
    (this.layers.particles || this.layers.entities).addChild(glints);
    this.chest = { box, sp, glints, shut, open, dx, at: reward.at || Date.now(), opened: false };
  }

  _chestFrame(t) {
    const C = this.chest;
    if (!C || C.box.destroyed) return;
    const since = t - C.at;
    /* it lands: dropped from a little above, with one small bounce */
    if (since < DROP_MS) {
      const k = Math.max(0, since / DROP_MS);
      const fall = k < 0.7 ? 1 - (k / 0.7) * (k / 0.7) : 0.12 * Math.sin(((k - 0.7) / 0.3) * Math.PI);
      C.sp.y = -DROP_PX * fall;
      C.sp.alpha = Math.min(1, 0.3 + k * 2);
    } else { C.sp.y = 0; C.sp.alpha = 1; }
    /* it opens: the open picture, standing on the same corner */
    if (!C.opened && since >= CHEST_OPEN_MS) {
      const f = C.open._dgFoot || [C.open.frame.width / 2, C.open.frame.height];
      C.sp.texture = C.open;
      C.sp.anchor.set(f[0] / C.open.frame.width, f[1] / C.open.frame.height);
      C.opened = true;
    }
    /* a pop as the lid goes, then gold glinting up out of it */
    const o = since - CHEST_OPEN_MS;
    if (C.opened) {
      const pop = o < 180 ? 1 + 0.08 * Math.sin((o / 180) * Math.PI) : 1;
      C.sp.scale.set(ART * pop);
    }
    if (C.opened && (o < GLINT_MS || !C.glintsDone)) C.glints.clear();
    if (C.opened && o >= GLINT_MS) C.glintsDone = true;
    if (C.opened && o < GLINT_MS) {
      const k = o / GLINT_MS;
      for (let i = 0; i < GLINTS; i++) {
        const a = -Math.PI / 2 + (i / (GLINTS - 1) - 0.5) * 1.4;
        const r = 18 + 46 * k * (0.7 + 0.3 * ((i * 37) % 10) / 10);
        const s = 3.2 * (1 - k) + 1;
        C.glints.rect(C.dx + Math.cos(a) * r * 0.8 - s / 2, -46 + Math.sin(a) * r - s / 2, s, s)
          .fill({ color: i % 3 === 0 ? 0xfff3b0 : 0xf5c542, alpha: 1 - k });
      }
    }
  }

  /** QA (mp-grottoart): what the arena draws, read-only. */
  probe() {
    return {
      zone: this.zone,
      home: this.art && this.art.home,
      things: this.things.map((s) => ({ art: s._arenaThing.art, x: s.x, y: s.y, flat: !!s._arenaThing.flat, w: Math.round(Math.abs(s.width)), h: Math.round(s.height), layer: s.parent && s.parent.label })),
      blockers: this._blockers.length,
      chest: this.chest ? { x: this.chest.box.x, y: this.chest.box.y, opened: this.chest.opened, frame: this.chest.opened ? 'open-1' : 'shut-1' } : null,
      bossAt: this._bossAt,
    };
  }

  destroy() {
    if (this._offHook) { this._offHook(); this._offHook = null; }
    for (const s of this.things) { try { s.destroy({ texture: false, textureSource: false }); } catch (e) { /* gone */ } }
    this.things = [];
    if (this.chest) {
      try { this.chest.box.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
      try { this.chest.glints.destroy(); } catch (e) { /* gone */ }
      this.chest = null;
    }
    this._blockers = [];
    if (_live === this) _live = null;
  }
}
