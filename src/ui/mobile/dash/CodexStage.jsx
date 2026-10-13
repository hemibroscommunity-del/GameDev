import React from 'react';
import { CharacterView, cropWidth } from '../sheet/CharacterView.jsx';
import { CODEX_LOOKS, CODEX_STAGE, CODEX_SPECIAL_LABEL, CODEX_WINDUP_MS, codexStageUrls } from '@/data/codexStage.js';
import { CODEX_ELEMENTS, CODEX_ENTRIES } from '@/data/monsterCodex.js';
import { landLook } from '@/data/wheelLands.js';
import { retintToCanvas } from '@/rendering/monsterRecolor.js';
import { getActiveWeapon } from '@/data/gameSystems.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';

/* ═══ v2.3.3196: A CODEX PAGE'S STAGE -- THE MONSTER, DOING WHAT IT DOES ═══
 *
 * Owner, 2026-10-12: "Maybe an animation similar to how the skills preview
 * window currently works."  The same make as the Points window's preview
 * (sheet/StatDemo.jsx): YOUR character on the left (CharacterView, the
 * Equipment screen's figure), the monster on the right in its own strips
 * (data/codexStage.js), on one ground line, and every motion CSS -- each beat
 * is one setState, a strip steps through its cells (game.css bt-sd-strip), a
 * walk is a transition, and nothing repaints a frame at a time (v2.3.1815:
 * the per-frame canvas repaint over the WebGL world was the slowdown).
 *
 * What it plays grows with the page:
 *   page     its ordinary attack, over and over: a snowball, a fireball or a
 *            glob crossing the gap, or a walk up to you and a swing;
 *   element  ...and the hit says what its element does (the icon and the
 *            status over your head; a gust shoves you);
 *   special  ...and every other time its special attack, with the world's
 *            own word for it (SLAM!, LUNGE!) and its real wind-up;
 *   elder    a toggle puts it in its second stage's colour.
 * Under prefers-reduced-motion nothing runs: the monster stands still.
 *
 * ITS PICTURES LOAD WHEN THE INFO TAB OPENS, and go when it closes -- the
 * owner's call against the preloading law's loading screen, asked about
 * holding all nine for the session (~20 MB): "I think loading only when you
 * open the info tab".  One monster's strips at a time (at most ~8 MB decoded,
 * the mummy's and its skeleton's).  Until they are in, the monster stands as
 * its portrait (the pet sheet, which the loading screen already fetched) --
 * never a blank, and never a hitch in play: this is a menu.  A recoloured
 * monster (the wisp, the lurker, the blue slime, every elder form) is baked
 * onto this stage's own copies of its strips, revoked when it closes. */

const STAGE_H = 150;
/* the top of the stage's ground strip, px from its bottom, where every foot
   stands (game.css --cx-ground draws the strip this tall) -- was a line 9 px
   up, the feet a tint the colour of the dashboard behind them */
const GROUND = 16;
const HERO_SIZE = 120;
/* far enough in that a gust's shove (game.css bt-cx-shove, 18 px) keeps your
   figure inside the frame -- at 10 it put three of its px past the left edge */
const HERO_LEFT = 18;
/* your figure's boots, px above its canvas's bottom, until the figure says
   where it drew them (`onDrawn`, __btFigure): the old -4 put them on the
   stage's edge */
const HERO_FEET = 4;
const HERO_X = HERO_LEFT + Math.round(cropWidth(HERO_SIZE) / 2);   /* the hero's middle */
const MON_X = 236;                /* where the monster's feet stand, px from the left */
const IDLE_MS = 1500;
const CHEST = 52;                 /* a hit lands this far up the hero */

const reduced = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
};
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);

/* one strip, loaded and decoded -- or null */
function loadImg(url) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(null); return; }
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      const done = () => resolve(im);
      if (typeof im.decode === 'function') im.decode().then(done, done); else done();
    };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}
/* a strip in another colour: the blue slime's retint and/or a multiply tint,
   as a sprite tint (petPortrait.jsx's own steps), on a canvas let go of the
   moment it is an image */
function bake(im, recolor, tint) {
  return new Promise((resolve) => {
    try {
      let cv = recolor ? retintToCanvas(im, recolor) : null;
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        cv.getContext('2d').drawImage(im, 0, 0);
      }
      if (tint != null && tint !== 0xffffff) {
        const src = document.createElement('canvas');
        src.width = cv.width; src.height = cv.height;
        src.getContext('2d').drawImage(cv, 0, 0);
        const g = cv.getContext('2d');
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = hex(tint);
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'source-over';
        src.width = 0; src.height = 0;
      }
      if (!cv.toBlob) { cv.width = 0; cv.height = 0; resolve(null); return; }
      cv.toBlob((blob) => {
        cv.width = 0; cv.height = 0;
        resolve(blob ? URL.createObjectURL(blob) : null);
      }, 'image/png');
    } catch (e) { resolve(null); }
  });
}

/* Every strip the stage may draw, in the colour it is drawn in, once all are
   in: `{ key: url }`, or null while loading.  Its baked copies are revoked
   when the page closes or the colour changes. */
function useStageStrips(kind, elder) {
  const [urls, setUrls] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    const st = CODEX_STAGE[kind];
    const made = [];
    let held = [];
    setUrls(null);
    if (!st) return undefined;
    /* the elder form wears its second stage's colour IN PLACE of its own
       (wheelStageLooks.js); the blue slime keeps its retint under it */
    const tint = elder ? st.elderTint : (st.tint != null ? st.tint : null);
    Promise.all(codexStageUrls(kind).map(async (s) => {
      const im = await loadImg(s.url);
      if (!im) return [s.key, null];
      held.push(im);   /* decoded, and kept while the page is open */
      if (s.raw) return [s.key, s.url];   /* what it throws, as it is */
      const own = s.look === st.look;
      const recolor = own ? st.recolor : null;
      /* a mummy's bones wear the elder gold too, never the wisp's violet */
      const t = own ? tint : (elder ? st.elderTint : null);
      if (!recolor && (t == null || t === 0xffffff)) return [s.key, s.url];
      const u = await bake(im, recolor, t);
      if (u) made.push(u);
      return [s.key, u || s.url];
    })).then((pairs) => {
      if (!live) { for (const u of made) { try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } } return; }
      const out = Object.create(null);
      for (const [k, u] of pairs) if (u) out[k] = u;
      setUrls(out);
    });
    return () => {
      live = false;
      for (const u of made) { try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } }
      held = [];
    };
  }, [kind, !!elder]);
  return urls;
}

/* ═══ THE LOOP ═══
   Each beat says everything about itself: `p` its name (the probe's), `ms`
   how long, `at` where the monster stands ('home'; 'reach', its front a step
   from yours; 'near', as far back again as a swell grows it, so a swelling
   slime's front stays where it was), `move` how long it takes to get there,
   `body` the strip
   it wears (and `once` to play it once and hold), `cls` its motion, `label`
   the special's word over it, `zone` the world's own warning circle under
   you, `shake` the world's kick as it lands, `shot` a ball crossing the gap,
   `hit` the blow landing on you, `swing` YOUR swing.

   The warning circle is the world's (effectsRenderer's _telegraphZones): a
   slam or a lunge marks the ground where YOU stand in its colour, filling as
   it winds up, solid as it lands -- so the page teaches the tell the fight
   will show.  No ring is drawn as anything lands: the slime's burst never
   had one (v2.3.2226, the owner: "remove code drawn impact areas for slime
   death"), and the world says a hit with a camera kick. */
function planFor(kind, facts) {
  const st = CODEX_STAGE[kind];
  const L = CODEX_LOOKS[st.look];
  const has = (k) => !!L.strips[k];
  const walk = has('walk') ? 'walk' : 'idle';
  const idle = { p: 'idle', ms: IDLE_MS, at: 'home', body: 'idle', cls: 'breathe' };
  const walkIn = { p: 'walkin', ms: 700, at: 'reach', move: 700, body: walk };
  const walkBack = { p: 'walkback', ms: 700, at: 'home', move: 650, body: walk };
  let plain;
  if (st.hit === 'throw') {
    const key = has('throw') ? 'throw' : has('attack') ? 'attack' : has('shoot') ? 'shoot' : 'idle';
    const fly = st.look === 'snowman' ? 900 : 650;
    plain = [idle,
      { p: 'throw', ms: L.strips[key].ms || 420, at: 'home', body: key, once: true },
      { p: 'fly', ms: fly, at: 'home', body: 'idle', shot: true },
      { p: 'impact', ms: 800, at: 'home', body: 'idle', hit: true, burst: st.look === 'snowman' }];
  } else {
    plain = [idle, walkIn,
      { p: 'swing', ms: 260, at: 'reach', body: has('attack') ? 'attack' : 'idle', once: true, cls: 'swing' },
      { p: 'impact', ms: 700, at: 'reach', body: 'idle', hit: true },
      walkBack];
  }
  if (!facts.includes('special')) return plain;
  const lab = true;
  let special;
  switch (st.special) {
    case 'lunge':
      special = [idle,
        { p: 'windup', ms: CODEX_WINDUP_MS.lunge, at: 'home', body: 'idle', cls: 'throb', label: lab, zone: CODEX_SPECIAL_LABEL.lunge.color },
        { p: 'dash', ms: 220, at: 'reach', move: 200, ease: 'ease-in', body: has('attack') ? 'attack' : 'idle', once: true },
        { p: 'impact', ms: 700, at: 'reach', body: 'idle', hit: true },
        walkBack];
      break;
    case 'slam':
      special = [idle, walkIn,
        { p: 'windup', ms: CODEX_WINDUP_MS.slam, at: 'reach', body: 'idle', cls: 'rise', label: lab, zone: CODEX_SPECIAL_LABEL.slam.color },
        { p: 'slam', ms: 260, at: 'reach', body: 'idle', cls: 'slam', shake: true },
        { p: 'impact', ms: 700, at: 'reach', body: 'idle', hit: true },
        walkBack];
      break;
    case 'burrow':
      special = [idle,
        { p: 'burrow', ms: 600, at: 'home', body: 'burrow', once: true, label: lab },
        { p: 'pile', ms: 1500, at: 'reach', move: 1500, ease: 'linear', body: 'pile' },
        { p: 'touch', ms: 600, at: 'reach', body: 'pile', hit: true },
        { p: 'emerge', ms: 600, at: 'reach', body: 'emerge', once: true },
        { p: 'home', ms: 500, at: 'home', body: 'idle', cls: 'fadein' }];
      break;
    case 'unwrap':
      special = [idle, walkIn,
        { p: 'struck', ms: 340, at: 'reach', body: 'idle', cls: 'struck', swing: true },
        { p: 'unwrap', ms: 480, at: 'reach', body: 'transform', once: true, label: lab },
        /* the bones are drawn bigger, so their reach is their own (geom):
           they stand at once with their front where the mummy's was, filling
           out behind it -- slid there, they stood over you for a moment */
        { p: 'bones', ms: 300, at: 'reach', body: 'skel:run', cls: 'swing' },
        { p: 'impact', ms: 700, at: 'reach', body: 'skel:run', hit: true },
        { p: 'home', ms: 600, at: 'home', body: 'idle', cls: 'fadein' }];
      break;
    case 'burst':
      special = [idle, walkIn,
        { p: 'struck', ms: 340, at: 'reach', body: 'idle', cls: 'struck', swing: true },
        /* it backs off as it swells (the same ease), so it grows AWAY from you
           and never over you */
        { p: 'swell', ms: CODEX_WINDUP_MS.burst, at: 'near', move: CODEX_WINDUP_MS.burst, ease: 'ease-in', body: 'idle', cls: 'swell', label: lab },
        /* and bursts AT that size, as the world plays it (gameEvents.js
           v2.3.2227: "the thing that blew up was not the thing that had just
           filled the screen") */
        { p: 'burst', ms: 420, at: 'near', body: 'death', once: true, cls: 'burst', shake: true },
        { p: 'impact', ms: 800, at: 'near', body: null, hit: true },
        { p: 'home', ms: 600, at: 'home', body: 'idle', cls: 'fadein' }];
      break;
    default:
      special = [];
  }
  return [...plain, ...special];
}

const SWELL = 2.4;                /* game.css bt-cx-swell's last scale */

/* where the monster stands and how big, for look `L` */
function geom(L) {
  const k = L.artH / L.artRows;
  const cx = (L.x0 + L.x1) / 2;
  const half = ((L.x1 - L.x0) * k) / 2;
  const reachX = HERO_X + 26 + half;
  const reach = Math.round(reachX - MON_X);
  return { k, cx, half, reach, near: reach + Math.round(half * (SWELL - 1)) + 4 };
}

/* one strip, standing on the ground line with its art's middle on the spot
   (the body it is in stands on the strip's edge: game.css bt-cx-body) --
   its box CUT at the art's lowest row (`ground`), so it ends on the ground
   strip's edge instead of hanging its empty rows below the stage: nothing
   below that row is drawn (the row was measured as the art's lowest), and a
   box that never leaves the stage cannot be drawn outside it.  data-cx-x0/x1/
   top say where the art is in the box, for the phone test. */
function Strip({ L, s, url, loop, k, cx }) {
  if (!s || !url) return null;
  const px = Math.round(L.cell * k);
  const h = Math.round((s.ground + 1) * k);
  const steps = s.n >= 2 && !s.still;
  const top = Math.max(0, s.ground + 1 - L.artRows) / (s.ground + 1);
  return (
    <span className="bt-cx-strip" data-cx-x0={(L.x0 / L.cell).toFixed(3)} data-cx-x1={(L.x1 / L.cell).toFixed(3)} data-cx-top={top.toFixed(3)}
      style={{
        width: px, height: h, left: -Math.round(cx * k),
        bottom: 0,
        backgroundImage: `url(${url})`, backgroundSize: `${s.n * px}px ${px}px`,
        '--sd-strip': -((s.n - 1) * px) + 'px',
        animation: steps ? `bt-sd-strip ${Math.max(60, s.ms)}ms steps(${s.n}, jump-none) ${loop ? 'infinite' : '1 forwards'}` : 'none',
      }} />
  );
}

function shotOf(st, L, G, urls) {
  const s = L.shot || {};
  const from = { x: MON_X - G.half * 0.5, y: STAGE_H - (GROUND + L.artH * 0.6) };
  const to = { x: HERO_X + 6, y: STAGE_H - (GROUND + CHEST) };
  const lob = st.look === 'snowman' ? 46 : 22;
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lob };
  const px = s.px || 15;
  const style = {
    width: px, height: px,
    '--cx-sx': Math.round(from.x - px / 2) + 'px', '--cx-sy': Math.round(from.y - px / 2) + 'px',
    '--cx-mx': Math.round(mid.x - px / 2) + 'px', '--cx-my': Math.round(mid.y - px / 2) + 'px',
    '--cx-ex': Math.round(to.x - px / 2) + 'px', '--cx-ey': Math.round(to.y - px / 2) + 'px',
    animationDuration: (st.look === 'snowman' ? 900 : 650) + 'ms',
  };
  if (s.url) return { url: (urls && urls['shot:ball']) || s.url, style };
  style.background = st.shotColor || s.color || '#5ca84c';
  return { url: null, style };
}

export function CodexStage({ kind, facts, elder, S }) {
  const st = CODEX_STAGE[kind];
  const urls = useStageStrips(kind, elder);
  const [beat, setBeat] = React.useState({ b: null, n: 0 });
  /* your figure's box stands with its boots on the ground strip's edge: where
     the portrait drew them (as StatDemo plants its fighter) */
  const [heroFeet, setHeroFeet] = React.useState(HERO_FEET);
  const onHeroDrawn = React.useCallback((cv) => {
    const f = cv && cv.__btFigure;
    if (!f || !(f.px > 0) || !f.feet) return;
    const up = Math.round(HERO_SIZE - f.feet[1] * (HERO_SIZE / f.px));
    if (up >= 0 && up < HERO_SIZE / 2) setHeroFeet(up);
  }, []);
  const factsKey = facts.join(',');
  const ready = !!urls;
  React.useEffect(() => {
    if (!ready || reduced()) { setBeat({ b: null, n: 0 }); return undefined; }
    const plan = planFor(kind, facts);
    let i = 0, n = 0, timer = null, live = true;
    const step = () => {
      if (!live) return;
      const b = plan[i];
      setBeat({ b, n: ++n });
      timer = setTimeout(() => { i = (i + 1) % plan.length; step(); }, b.ms);
    };
    step();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [ready, kind, factsKey, !!elder]);

  if (!st) return null;
  const entry = CODEX_ENTRIES[kind];
  const L = CODEX_LOOKS[st.look];
  const G = geom(L);
  const LS = CODEX_LOOKS.skeleton, GS = geom(LS);
  const b = beat.b || { p: 'idle', at: 'home', body: 'idle' };
  const R = S && S.rpg;
  const el = facts.includes('element') && entry ? CODEX_ELEMENTS[entry.element] || null : null;
  const label = CODEX_SPECIAL_LABEL[st.special];
  const bones = b.body === 'skel:run';
  const x = b.at === 'reach' ? (bones ? GS.reach : G.reach) : b.at === 'near' ? G.near : 0;
  /* the special's word sits over the monster -- over its swelled size while
     it swells, held inside the stage */
  const labelUp = Math.min(GROUND + Math.round(L.artH * (b.cls === 'swell' ? SWELL : 1)) + 8, STAGE_H - 22);
  const land = (entry && landLook(entry.home)) || null;

  let body = null;
  if (urls && b.body) {
    if (b.body === 'skel:run') body = <Strip key={'skel' + beat.n} L={LS} s={LS.strips.run} url={urls['skel:run']} loop k={GS.k} cx={GS.cx} />;
    else body = <Strip key={b.body + beat.n} L={L} s={L.strips[b.body]} url={urls[b.body]} loop={!b.once} k={G.k} cx={G.cx} />;
  }
  const shove = el && entry.element === 'wind';

  return (
    <div className="bt-cx-stage" data-cx-stage={kind} data-cx-phase={b.p} data-cx-ready={urls ? 1 : 0}
      style={{ '--cx-land': (land && land.color) || '#3a4a50', '--cx-ground': GROUND + 'px' }}>
      {/* everything that moves, in one layer the world's kick shakes (never
          two shakes in a row, so the class coming back restarts it -- a key
          would remount your character) */}
      <div className={'bt-cx-world' + (b.shake ? ' bt-cx-world--shake' : '')}>
      {b.zone && (
        <i key={'z' + beat.n} className="bt-cx-zone" data-cx-zone={st.special}
          style={{ left: HERO_X, bottom: GROUND - 10, '--cx-zone': b.zone, '--cx-zone-ms': b.ms + 'ms' }} />
      )}
      <div key={'h' + ((b.hit || b.swing) ? beat.n : 0)} data-cx-hero-feet={heroFeet}
        className={'bt-cx-hero' + (b.hit ? (shove ? ' bt-cx-hero--shove' : ' bt-cx-hero--hit') : '') + (b.swing ? ' bt-cx-hero--swing' : '')}
        style={{ left: HERO_LEFT, bottom: GROUND - heroFeet }}>
        <CharacterView size={HERO_SIZE} weapon={R ? getActiveWeapon(R) : null} shield={!!(R && R.shield)} crop dir="east" onDrawn={onHeroDrawn} />
      </div>
      {/* two layers: the outer one walks (an inline transform and its
          transition), the inner one moves on the spot (a wind-up, a slam, a
          swell) -- one transform each, so a wind-up at its reach never snaps
          it home */}
      <div className="bt-cx-mon"
        style={{ left: MON_X, transform: `translateX(${x}px)`, transition: b.move ? `transform ${b.move}ms ${b.ease || 'ease-in-out'}` : 'none' }}>
        <div key={'m' + (b.cls && b.cls !== 'breathe' ? beat.n : 0)} className={'bt-cx-body' + (b.cls ? ' bt-cx-body--' + b.cls : '')}>
          {body}
          {!urls && (
            <span className="bt-cx-portrait" style={{ left: -Math.round(L.artH * 0.55), bottom: -2 }}>
              <PetPortrait pet={{ kind, stage: elder ? 2 : 1 }} size={Math.round(L.artH * 1.1)} />
            </span>
          )}
        </div>
      </div>
      {label && b.label && (
        <span key={'l' + beat.n} className="bt-cx-label" data-cx-label={st.special}
          style={{ left: MON_X + x - 44, bottom: labelUp, color: label.color }}>{label.text}</span>
      )}
      {b.shot && (() => {
        const s = shotOf(st, L, G, urls);
        return s.url
          ? <img key={'s' + beat.n} className="bt-cx-shot" src={s.url} alt="" draggable={false} style={s.style} />
          : <i key={'s' + beat.n} className="bt-cx-shot bt-cx-shot--ball" style={s.style} />;
      })()}
      {b.burst && L.shot && L.shot.burst && (
        <i key={'b' + beat.n} className="bt-cx-burst"
          style={{ left: HERO_X + 6 - 22, top: STAGE_H - (GROUND + CHEST) - 22, backgroundImage: `url(${(urls && urls['shot:burst']) || L.shot.burst.url})`,
            backgroundSize: `${L.shot.burst.n * 44}px 44px`, '--sd-strip': -((L.shot.burst.n - 1) * 44) + 'px' }} />
      )}
      {b.hit && el && (
        <span key={'p' + beat.n} className="bt-cx-pop" data-cx-pop={entry.element} style={{ left: HERO_X - 30, bottom: GROUND + 100 }}>
          <img src={el.icon} alt="" draggable={false} />{el.status}
        </span>
      )}
      </div>
    </div>
  );
}

export default CodexStage;
