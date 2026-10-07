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
import { GlintSystem, sheenOn } from './glint.js';
import { collectCasters, SELF_STAND_IN_FIELDS, SELF_STAND_IN_SETS } from './casters.js';
import { Sprite } from 'pixi.js';
import { zoneLight, sunLeft, WHEEL_SUN, wheelLandLight } from './zoneLight.js';
import { dayPhase, lightingAt, zoneHasSky } from '@/game/timeOfDay.js';   /* v2.3.2717: the sun sets */
import { isWheelTrialZone } from '@/game/worldTrial.js';   /* v2.3.3000: the Wheel's one sun */
import { wheelHere } from '@/game/wheelTrial.js';

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
    this.sheenSun = null;   /* v2.3.2864: QA override of the sheen's sun direction */
    /* v2.3.3000: the Wheel's light as it eases from land to land, and the
       light used last frame (the probe's) */
    this._wl = null;
    this._wlT = 0;
    this.light = null;
  }

  /* ═══ v2.3.3000: THE WHEEL'S LIGHT ═══
     The Wheel's one sun (zoneLight.js WHEEL_SUN) in the shade of the land you
     stand in, eased over about a second as you cross into another -- the
     shadow layer has one filter and so one colour a frame, and a border
     crossed in a step would flick every shadow on screen at once.  `region`
     is the worker's answer for the cell under you (wheelHere), null for a
     moment on the way in: the commons' shade until then. */
  _wheelLight(S, now) {
    const P = S && S.player;
    const here = P ? wheelHere(P.x, P.y) : null;
    const want = wheelLandLight(here && here.region);
    const tr = (want.color >> 16) & 255, tg = (want.color >> 8) & 255, tb = want.color & 255;
    let w = this._wl;
    if (!w) {
      w = this._wl = { lx: WHEEL_SUN.lx, ly: WHEEL_SUN.ly, alpha: want.alpha, color: want.color, r: tr, g: tg, b: tb, region: here ? here.region : null };
      this._wlT = now;
      return w;
    }
    const dt = Math.max(0, Math.min(250, now - this._wlT));
    this._wlT = now;
    const k = 1 - Math.exp(-dt / 350);
    w.alpha += (want.alpha - w.alpha) * k;
    w.r += (tr - w.r) * k; w.g += (tg - w.g) * k; w.b += (tb - w.b) * k;
    w.color = (Math.round(w.r) << 16) | (Math.round(w.g) << 8) | Math.round(w.b);
    w.region = here ? here.region : w.region;
    return w;
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
      /* v2.3.3142: a graded piece still wears its grade with the light
         effects off (glint.js GRADE_LOOK) -- only those pieces are filtered */
      if (S) { try { this.glint.update(S, now, er, fx, S.currentZone || 'town', null, true); } catch (e) { /* a look never stops a frame */ } }
      return;
    }
    this._wasOn = true;
    const t0 = performance.now();
    const zone = S.currentZone || 'town';
    this.zone = zone;
    if (this.shadows) {
      /* v2.3.3000: the Wheel (and the trial's 'worldview' when it is the
         Wheel) has its one sun; the old World View's vista stays unlit, as
         it always was */
      let light = isWheelTrialZone(zone) ? this._wheelLight(S, now) : zoneLight(zone);
      /* v2.3.2717: the sun these shadows are cast by sets with the time of
         day (game/timeOfDay.js).  Under an open sky the shadow fades out
         through dusk and back in at dawn -- a sun shadow at midnight, under a
         lantern, is a shadow of something that is not there. */
      if (light && zoneHasSky(zone, S)) {
        const sun = 1 - lightingAt(dayPhase(now)).lamp;
        light = sun < 0.02 ? null : Object.assign({}, light, { alpha: light.alpha * sun });
      }
      this.light = light;
      this.shadows.update(light ? collectCasters(S, er, fx, zone) : null, light, sunLeft(S), now);
    }
    this.glint.update(S, now, er, fx, zone, sheenOn() ? this._sheenLight(S, zone, now) : null);
    this.lastMs = performance.now() - t0;
  }

  /* v2.3.2864: the light the permanent sheen is lit by -- from the side the
     zone's sun is on (the opposite of where its shadows fall), dimmer at
     night and in a zone's deep gloom but never gone: metal still catches the
     moon.  A zone with no sun gets a sheen with no direction. */
  _sheenLight(S, zone, now) {
    const o = this._sheenOut || (this._sheenOut = { k: 0, sx: 0, sy: 0 });   /* one object, every frame */
    /* v2.3.3000: the Wheel's metal shines from its one sun's side */
    const L = isWheelTrialZone(zone) ? WHEEL_SUN : zoneLight(zone);
    let k = 0.6 + 0.4 * sunLeft(S);
    if (L && zoneHasSky(zone, S)) k *= 0.5 + 0.5 * (1 - lightingAt(dayPhase(now)).lamp);
    o.k = k;
    if (this.sheenSun) {                /* QA: a sun from a fixed side, to prove the shine follows it */
      o.sx = this.sheenSun[0]; o.sy = this.sheenSun[1];
    } else {
      const n = L ? Math.hypot(L.lx, L.ly) : 0;
      o.sx = n ? -L.lx / n : 0; o.sy = n ? -L.ly / n : 0;
    }
    return o;
  }

  /* QA probe, house style (__btLayerOrder, __btCharRecord). */
  probe() {
    const sh = this.shadows;
    const layer = sh && sh.layer;
    return {
      on: lightFxOn(),
      zone: this.zone,
      /* v2.3.3000: the light used last frame -- the Wheel's eased one there */
      light: this.light ? { lx: this.light.lx, ly: this.light.ly, alpha: +(+this.light.alpha).toFixed(3), color: this.light.color, region: this.light.region || null } : zoneLight(this.zone),
      shadows: sh ? { ...sh.stats, keys: sh.stats.keys.slice(), filtered: !!(layer && layer.filters && layer.filters.length), pool: sh.pool.length } : null,
      glint: { ...this.glint.probeStats(), force: this.glint.force, sheenOn: sheenOn() },
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
