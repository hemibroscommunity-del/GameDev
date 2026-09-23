/* ═══ v2.3.2710: LIGHT AND SHINE, BEHIND A SWITCH ═══
 *
 * Owner: "subtle shadowing to make things pop, adding material-specific
 * textures or shine" -- then "go ahead, build 1 and 2": shadows cast by each
 * map's own sun (shadows.js) and metal that catches the light (glint.js).
 *
 * ON FOR EVERYONE (v2.3.2711).  It shipped behind a switch that was off,
 * because the last shadow this game had was removed as "worse than nothing"
 * and the owner wanted to see it first; they did, and said "Push it to main
 * with the switch on".  The switch stays, per device, for anyone who wants it
 * off (and for a phone that turns out not to cope):
 *
 *     ?lightfx=0   turn it off on this device (remembered)
 *     ?lightfx=1   turn it back on
 *
 * When it is off, update() is one boolean read per frame.  Turning it on at
 * runtime (window.__btLightFx.set(true)) takes effect on the next frame, which
 * is how the QA pictures take a before and an after of the same moment.
 */
import { ShadowSystem } from './shadows.js';
import { GlintSystem } from './glint.js';
import { collectCasters, SELF_STAND_IN_FIELDS, SELF_STAND_IN_SETS } from './casters.js';
import { Sprite } from 'pixi.js';
import { zoneLight, sunLeft } from './zoneLight.js';

const KEY = 'bt-lightfx';
let _on = null;

/** Is the light-and-shine switch on?  Read once, then cached.  ON unless
 *  this device has turned it off (v2.3.2711) -- so a storage that cannot be
 *  read (private mode) gets the game as it ships, not the old flat look. */
export function lightFxOn() {
  if (_on !== null) return _on;
  let v = null;
  try {
    const m = /[?&]lightfx=(1|0|on|off)\b/.exec(window.location.search);
    if (m) {
      v = (m[1] === '1' || m[1] === 'on') ? '1' : '0';
      localStorage.setItem(KEY, v);
    } else {
      v = localStorage.getItem(KEY);
    }
  } catch (e) { v = null; }
  _on = v !== '0';
  return _on;
}

export function setLightFx(on) {
  _on = !!on;
  try { localStorage.setItem(KEY, _on ? '1' : '0'); } catch (e) { /* the switch still flips for this page */ }
}

export class LightFx {
  constructor(layers, worldContainer) {
    this.shadows = layers && layers.shadows ? new ShadowSystem(layers.shadows, worldContainer) : null;
    this.glint = new GlintSystem();
    this._wasOn = false;
    this.lastMs = 0;
    this.zone = null;
  }

  clear() {
    if (this.shadows) this.shadows.clear();
    this.glint.clear();
  }

  update(S, now, er, fx) {
    this._fx = fx || null;
    if (!lightFxOn() || !S) {
      if (this._wasOn) { this.clear(); this._wasOn = false; }
      this.lastMs = 0;
      return;
    }
    this._wasOn = true;
    const t0 = performance.now();
    const zone = S.currentZone || 'town';
    this.zone = zone;
    if (this.shadows) {
      const light = zoneLight(zone);
      this.shadows.update(light ? collectCasters(S, er, fx, zone) : null, light, sunLeft(S), now);
    }
    this.glint.update(S, now, er, fx, zone);
    this.lastMs = performance.now() - t0;
  }

  /* QA probe, house style (__btLayerOrder, __btCharRecord). */
  probe() {
    const sh = this.shadows;
    const layer = sh && sh.layer;
    return {
      on: lightFxOn(),
      zone: this.zone,
      light: zoneLight(this.zone),
      shadows: sh ? { ...sh.stats, filtered: !!(layer && layer.filters && layer.filters.length), pool: sh.pool.length } : null,
      glint: { ...this.glint.stats, force: this.glint.force },
      ms: +this.lastMs.toFixed(3),
      /* the stand-in names casters.js reads off the effects renderer that are
         no longer there -- a rename over there would otherwise turn a swing's
         shadow into the frozen HOLD without anything failing */
      missingStandIns: this._fx
        ? SELF_STAND_IN_FIELDS.filter((k) => !(this._fx[k] instanceof Sprite))
          .concat(SELF_STAND_IN_SETS.filter((k) => !this._fx[k] || typeof this._fx[k] !== 'object'))
        : null,
    };
  }
}
