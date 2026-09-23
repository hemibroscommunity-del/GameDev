/* The monsters' thrown goo and fire (v2.3.2705).
 *
 * Owner: "take another look at the procedurally drawn projectiles from slimes
 * and fire goblins ... Just make sure it's colored correctly (green slimes are
 * recolored to blue during game but I might add green ones later)."
 *
 * Client-only -- the worker settles a thrown ball at its aim point and never
 * draws one -- so this suite imports the client's modules the way props.test
 * imports worldProps: data/monsterShots.js (who threw it, what it looks like,
 * what colour) and rendering/monsterShotArt.js (the pixels, which are plain
 * RGBA and deterministic).
 *
 *  1. THE COLOUR IS THE THROWER'S.  A blue slime's goo is the blue the slime is
 *     recoloured to; a plain slime's is the sheet's green; a tinted one's is
 *     the green under the same tint -- and a green slime standing in a zone
 *     whose default is blue still throws GREEN, which is the case the owner
 *     named and the one the old per-zone picture got wrong.
 *  2. THE STYLE AND SIZE come from the variant table (fire for the goblin,
 *     goo for every slime, the sizes the owner tuned).
 *  3. THE ART is what the renderer assumes: the goo only uses its grey ramp
 *     (so a tint colours it exactly), the fire only the goblin's five flame
 *     colours, both are the same on every run, and every heading's tail
 *     trails BEHIND the way it flies.
 */
import {
  SLIME_BODY_GREEN, GOO_DEFAULT_PX, FIRE_DEFAULT_PX,
  shotStyleOf, gooColorOf, shotPxOf, shotSizesInUse, shotThrowerArch,
} from '../../src/data/monsterShots.js';
import {
  ART_PX, DIRS, GOO_PHASES, FIRE_PHASES, GOO_GREYS, FIRE_RAMP,
  gooFrame, gooShine, fireFrame, fireBurstFrame, gooPuddle, gooSplashFrame, scorchMark, smallPieces,
} from '../../src/rendering/monsterShotArt.js';
import { MONSTER_VARIANTS } from '../../src/data/monsterVariants.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}
const hex = (c) => '0x' + (c >>> 0).toString(16).padStart(6, '0');
const mul = (a, b) => {
  const ch = (s) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/* ── 1. the colour is the thrower's ── */
{
  check('a plain slime throws the slime sheet\'s own green', gooColorOf('fodder') === SLIME_BODY_GREEN, hex(gooColorOf('fodder')));
  const blue = MONSTER_VARIANTS.blueSlime.recolor;
  const blueHex = (blue[0] << 16) | (blue[1] << 8) | blue[2];
  check('a blue slime throws the blue it is recoloured to', gooColorOf('blueSlime', true) === blueHex, { got: hex(gooColorOf('blueSlime', true)), want: hex(blueHex) });
  check('...and while its recolour is still building, the colour its body shows then (green under its fallback tint)',
    gooColorOf('blueSlime', false) === mul(SLIME_BODY_GREEN, MONSTER_VARIANTS.blueSlime.tint), hex(gooColorOf('blueSlime', false)));
  check('a tinted slime (the mire wisp) throws the green under the same tint -- what it looks like, not a plain green',
    gooColorOf('mireWisp') === mul(SLIME_BODY_GREEN, MONSTER_VARIANTS.mireWisp.tint) && gooColorOf('mireWisp') !== SLIME_BODY_GREEN, hex(gooColorOf('mireWisp')));
  check('the moss slime likewise', gooColorOf('mossSlime') === mul(SLIME_BODY_GREEN, MONSTER_VARIANTS.mossSlime.tint), hex(gooColorOf('mossSlime')));
  check('an unknown thrower, or a hostile key, is the plain green and does not throw',
    gooColorOf('nope') === SLIME_BODY_GREEN && gooColorOf('__proto__') === SLIME_BODY_GREEN && gooColorOf(null) === SLIME_BODY_GREEN);

  /* THE OWNER'S CASE: a green slime in the blue slimes' zone. */
  const S = { currentZone: 'verdant', monsters: [
    { id: 'm-blue', archetype: 'blueSlime' },
    { id: 'm-green', archetype: 'fodder' },
  ] };
  const blueArch = shotThrowerArch(S, { ownerId: 'm-blue' });
  const greenArch = shotThrowerArch(S, { ownerId: 'm-green' });
  check('in the Verdant Wilds a blue slime\'s ball is blue...', blueArch === 'blueSlime' && gooColorOf(blueArch, true) === blueHex, { blueArch });
  check('...and a GREEN slime beside it throws GREEN, not the zone\'s blue', greenArch === 'fodder' && gooColorOf(greenArch, true) === SLIME_BODY_GREEN, { greenArch });
  check('the thrower stamped on the ball wins, even once the slime is gone', shotThrowerArch({ currentZone: 'verdant', monsters: [] }, { shooterArch: 'fodder', ownerId: 'gone' }) === 'fodder');
  check('a ball whose thrower is unknown falls back to the zone\'s slime (verdant: blue)', shotThrowerArch({ currentZone: 'verdant', monsters: [] }, { ownerId: 'gone' }) === 'blueSlime');
  check('...ember\'s is the goblin, town\'s the plain slime, a hostile zone key the plain slime',
    shotThrowerArch({ currentZone: 'ember' }, {}) === 'fireGoblin' && shotThrowerArch({ currentZone: 'town' }, {}) === 'fodder' && shotThrowerArch({ currentZone: '__proto__' }, {}) === 'fodder');
}

/* ── 2. style and size ── */
{
  check('the fire goblin throws fire', shotStyleOf('fireGoblin') === 'fire');
  check('every slime throws goo', ['fodder', 'blueSlime', 'mossSlime', 'mireWisp'].every((a) => shotStyleOf(a) === 'goo'));
  check('a snowball is a snowball whoever the wire says threw it', shotStyleOf('fireGoblin', 'snowball') === 'snowball' && shotStyleOf('fodder', 'snowball') === 'snowball');
  check('the sizes are the ones the owner tuned: blue slime 32, goblin 40, a plain slime 25.6',
    shotPxOf('blueSlime', 'goo') === 32 && shotPxOf('fireGoblin', 'fire') === 40 && shotPxOf('fodder', 'goo') === GOO_DEFAULT_PX && GOO_DEFAULT_PX === 25.6 && FIRE_DEFAULT_PX === 40,
    { blue: shotPxOf('blueSlime', 'goo'), gob: shotPxOf('fireGoblin', 'fire'), plain: shotPxOf('fodder', 'goo') });
  const sz = shotSizesInUse();
  check('the atlas is minted for every size the table can ask for (so none is minted on first sight)',
    sz.goo.includes(25.6) && sz.goo.includes(32) && sz.fire.includes(40), sz);
}

/* ── 3. the art ── */
{
  const R = 10.5;
  const a = gooFrame(R, 3, 2), b = gooFrame(R, 3, 2);
  check('a goo frame is the same pixels every time it is minted', a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]));
  const greys = new Set(GOO_GREYS);
  let onlyGrey = true, opaque = 0;
  for (let d = 0; d < DIRS; d++) {
    for (let p = 0; p < GOO_PHASES; p++) {
      const f = gooFrame(R, d, p);
      for (let i = 0; i < f.data.length; i += 4) {
        if (!f.data[i + 3]) continue;
        opaque++;
        if (f.data[i + 3] !== 255 || f.data[i] !== f.data[i + 1] || f.data[i] !== f.data[i + 2] || !greys.has(f.data[i])) onlyGrey = false;
      }
    }
  }
  check('every goo frame is drawn ONLY in the grey ramp, fully opaque -- so a tint colours it exactly', onlyGrey && opaque > 0, { opaque });
  check('the ramp\'s top step is white, so the lit side IS the thrower\'s colour under the tint', GOO_GREYS[GOO_GREYS.length - 1] === 255);
  let tailsBehind = true; const bad = [];
  for (let d = 0; d < DIRS; d++) {
    for (const kind of ['goo', 'fire']) {
      const f = kind === 'goo' ? gooFrame(R, d, 0) : fireFrame(7, 20, d, 0);
      let sx = 0, sy = 0, n = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        if (f.data[(y * f.w + x) * 4 + 3]) { sx += x + 0.5 - f.ax; sy += y + 0.5 - f.ay; n++; }
      }
      const th = (d / DIRS) * Math.PI * 2;
      const along = (sx / n) * Math.cos(th) + (sy / n) * Math.sin(th);
      if (!(along < -0.5)) { tailsBehind = false; bad.push({ kind, d, along: +along.toFixed(2) }); }
    }
  }
  check('in all sixteen headings the tail trails BEHIND the way the ball flies (goo and fire)', tailsBehind, bad);
  const ramp = new Set(FIRE_RAMP);
  let onlyFire = true, hotHead = true;
  for (let d = 0; d < DIRS; d++) for (let p = 0; p < FIRE_PHASES; p++) {
    const f = fireFrame(7, 20, d, p);
    for (let i = 0; i < f.data.length; i += 4) {
      if (!f.data[i + 3]) continue;
      const c = (f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2];
      if (!ramp.has(c)) onlyFire = false;
    }
    const k = (Math.floor(f.ay) * f.w + Math.floor(f.ax)) * 4;
    const hc = (f.data[k] << 16) | (f.data[k + 1] << 8) | f.data[k + 2];
    if (hc !== FIRE_RAMP[0] && hc !== FIRE_RAMP[1]) hotHead = false;
  }
  check('the fireball uses only the goblin\'s five flame colours', onlyFire);
  check('...and burns hottest at its head, in every heading and frame', hotHead);
  check('the landing art mints (burst, splash, splat, scorch, pieces) and is not empty',
    [fireBurstFrame(12, 0), fireBurstFrame(12, 5), gooSplashFrame(R, 0), gooPuddle(R, 1), scorchMark(13, 2), gooShine(R)]
      .every((f) => f.w > 2 && f.h > 1 && f.data.some((v, i) => i % 4 === 3 && v > 0))
    && Object.values(smallPieces()).every((f) => f.w > 0));
  /* the drawn size: the head is as wide as the old orb drew */
  const head = (px) => Math.round(((px * 0.92) / 2 / ART_PX) * 2) / 2 * 2 * ART_PX;
  check('a blue slime\'s glob head is drawn ~29px across and a plain one\'s ~24, as the old orbs were',
    Math.abs(head(32) - 29.4) < 1.2 && Math.abs(head(25.6) - 23.6) < 1.2, { blue: head(32), plain: head(25.6) });
}

if (failures) { console.log('\n' + failures + ' FAILED'); process.exit(1); }
console.log('\nmonstershots: all green');
