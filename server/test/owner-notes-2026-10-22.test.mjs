/* THE OWNER'S NOTES OF 2026-10-22 -- v2.3.3577 (docs/specs/notes-2026-10-22.md).
 *
 * The page's own rules, run here in node (each module has no imports), and the
 * files that use them read for what they promise:
 *   1. the whirlwind's catch (src/game/whirlCatch.js): the monster's own
 *      picture drawn over it in one colour, its light and shade kept
 *      (src/rendering/fillBatch.js), at 0.9, flashing between the ring's
 *      amber and a light gold -- quicker as the strike comes -- only for a
 *      monster the catch names, only while the wind-up is on; drawn by
 *      entityRenderer over each body (the hit flash showing through) and set
 *      by effectsRenderer's catch;
 *   2. the cook's frames (src/game/gesturePose.js gestureLoopFrame): a flick
 *      of the thumb plays a third of the 24-frame loop, the flicks walking on
 *      through it, never all of it -- and the cook's stand-in reads it;
 *   3. a drawn player's flipped facings baked under the armour
 *      (entityRenderer _prewarmArts), in both prewarm passes;
 *   4. the Points window's count starts at 0 (InfoPopup), [+] adds every
 *      point, Spend refuses at 0;
 *   5. the Equipment tab's figure faces southeast, its crop centred on the
 *      mirrored figure -- since v2.3.3608 southwest again (the owner, 2026-10-26:
 *      "I also like the Southwest view of the character in the dashboard
 *      preview better"); the crop still follows a mirrored facing. */
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (rel) => readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

/* ── 1. the whirlwind's catch, in its amber ── */
const W = await import('../../src/game/whirlCatch.js');
const hex = (c) => c.toString(16).padStart(6, '0');
check('1: the flash runs from the ring\'s own amber to a light gold, both saturated amber',
  W.WHIRL_TINT === 0xff9a3c && W.whirlTintAt(0) === W.WHIRL_TINT && W.whirlTintAt(1) === W.WHIRL_TINT_HI
    && W.whirlTintAt(-1) === W.WHIRL_TINT && W.whirlTintAt(2) === W.WHIRL_TINT_HI
    && ((W.WHIRL_TINT_HI >> 16) & 255) === 255 && (W.WHIRL_TINT_HI & 255) < 128, { mid: hex(W.whirlTintAt(0.5)), hi: hex(W.WHIRL_TINT_HI) });
check(`1: it covers most of the monster (${W.WHIRL_GLOW_ALPHA}), its own colours a little`, W.WHIRL_GLOW_ALPHA >= 0.8 && W.WHIRL_GLOW_ALPHA < 1);
const t0 = 1000, until = 2000;
const ks = [];
for (let t = t0; t <= until; t += 5) ks.push(W.whirlFlash01(t, t0, until));
const kmin = Math.min(...ks), kmax = Math.max(...ks);
check(`1: the flash swells and fades over the whole range, bright as the wind-up starts (${kmin.toFixed(2)}..${kmax.toFixed(2)})`,
  kmin < 0.05 && kmax > 0.95 && W.whirlFlash01(t0, t0, until) > 0.99);
/* the peaks: quicker at the end than at the start */
const peaks = [];
for (let i = 1; i < ks.length - 1; i++) if (ks[i] >= ks[i - 1] && ks[i] > ks[i + 1] && ks[i] > 0.9) peaks.push(t0 + i * 5);
const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
check(`1: ...quicker as the strike comes, about three and a half flashes in the real one-second wind-up (${gaps.join(', ')} ms between flashes)`,
  gaps.length >= 2 && gaps[0] > gaps[gaps.length - 1] && gaps[0] <= W.WHIRL_FLASH_START_MS + 20 && gaps[gaps.length - 1] >= W.WHIRL_FLASH_END_MS - 20, gaps);
const m = { id: 'm1' }, other = { id: 'm2' };
const S = { _whirlWindup: { t0, until }, _whirlCatch: { ids: new Set(['m1']), t0, until, at: 1500 } };
check('1: only a monster the catch names wears it, and only while the wind-up is on -- however far apart the frames',
  W.whirlCatchFlash(S, m, 1500) >= 0 && W.whirlCatchFlash(S, other, 1500) === -1
    && W.whirlCatchFlash(S, m, 1900) >= 0   /* 400 ms after the catch was worked out: a slow phone's frame */
    && W.whirlCatchFlash(S, m, until + 51) === -1
    && W.whirlCatchFlash({ _whirlCatch: S._whirlCatch }, m, 1500) === -1   /* the ring gone */
    && W.whirlCatchFlash({}, m, 1500) === -1 && W.whirlCatchFlash(null, m, 1500) === -1);
const ent = read('src/rendering/systems/entityRenderer.js');
check('1: entityRenderer draws it over every monster body, after every branch has posed it, its own tint untouched',
  /_whirlGlow\(display, whirlCatchFlash\(S, m, now\)\);/.test(ent)
    && /import \{ whirlCatchFlash, whirlTintAt, WHIRL_GLOW_ALPHA \} from '\.\.\/\.\.\/game\/whirlCatch\.js'/.test(ent)
    && (ent.match(/const wantTint[VSN] = _hf[VSN] \? 0xff8080 : _baseTint[VSN]/g) || []).length === 3);
check('1: ...as a sprite of the body\'s own frame, drawn by the one-colour batcher, a hit flash showing through',
  /function _whirlGlow\(display, f\) \{[\s\S]{0,900}g\._btFill = true;[\s\S]{0,1600}if \(g\.texture !== sb\.texture\) g\.texture = sb\.texture;[\s\S]{0,1200}WHIRL_GLOW_ALPHA \* sb\.alpha \* \(sb\.tint === _HIT_FLASH \? 0\.35 : 1\)/.test(ent));
const fb = read('src/rendering/fillBatch.js');
check('1: the one-colour batcher keeps each pixel\'s light (its luma, lifted) and none of its colour, and is pinned per sprite, never inherited by a pooled one',
  /float btL = clamp\(0\.5 \+ 0\.8 \* dot\(btC, vec3\(0\.299, 0\.587, 0\.114\)\), 0\.0, 1\.0\);/.test(fb)
    && /outColor = vec4\(vec3\(btL \* btA\), btA\);/.test(fb)
    && /get\(\) \{ return \(this\.renderable && this\.renderable\._btFill\) \? FILL_BATCHER : this\._btBatcher; \}/.test(fb));
check('1: installed after the sharp batcher, and its program built behind the loading screen',
  /installSharpPixels\(app, SHADE\.figure\)[\s\S]{0,400}installFillBatch\(app\)/.test(read('src/rendering/pixiApp.js'))
    && /warmFillBatch\(_appRef && _appRef\.renderer\)/.test(read('src/rendering/pixiRenderer.js')));
const eff = read('src/rendering/systems/effectsRenderer.js');
check('1: effectsRenderer leaves the catch on the state for it, and clears it when the ring is gone',
  /S\._whirlCatch = \{ ids: caught, t0: w\.t0, until: w\.until, at: now \}/.test(eff) && /if \(!w \|\| now >= w\.until \+ 50\) S\._whirlCatch = null;/.test(eff));

/* ── 2. the cook's frames ── */
const G = await import('../../src/game/gesturePose.js');
const ex = {};
const seen = [];
/* the phase as gesturePose01 hands it over: forward, wrapping each cycle */
for (let cyc = 0; cyc < 6; cyc++) for (let k = 0; k < 1; k += 0.05) seen.push(G.gestureLoopFrame(ex, k, 24, G.COOK_FLICKS_PER_LOOP));
const perCycle = [];
for (let c = 0; c < 6; c++) { const s = seen.slice(c * 20, c * 20 + 20); perCycle.push([Math.min(...s), Math.max(...s)]); }
check(`2: a flick plays a third of the cook's 24 frames, the flicks walking on through the loop (${perCycle.map((p) => p.join('-')).join(', ')})`,
  G.COOK_FLICKS_PER_LOOP === 3 && perCycle[0][0] === 0 && perCycle[0][1] === 7 && perCycle[1][0] === 8 && perCycle[1][1] === 15
    && perCycle[2][0] === 16 && perCycle[2][1] === 23 && perCycle[3][0] === 0 && perCycle.every(([a, b]) => b - a === 7), perCycle);
check('2: a still thumb holds its frame, and a new attempt starts at the ready pose',
  G.gestureLoopFrame(ex, 0.5, 24, 3) === G.gestureLoopFrame(ex, 0.5, 24, 3) && G.gestureLoopFrame({}, 0, 24, 3) === 0);
check('2: the cook\'s stand-in reads it (not the whole loop a flick)',
  /gestureLoopFrame\(ex, _gpK, this\._cookFrames\.length, COOK_FLICKS_PER_LOOP\)/.test(eff)
    && !/Math\.floor\(_gpK \* this\._cookFrames\.length\)/.test(eff));

/* ── 3. a drawn player's flipped facings, baked under the armour ── */
const arts = ent.match(/for \(const art of _prewarmArts\(pose, dir\)\)/g) || [];
check(`3: both prewarm passes bake the flipped body of a drawn player's west, northwest and southeast too (${arts.length} of 2)`,
  arts.length === 2 && /function _prewarmArts\(pose, dir\) \{[\s\S]{0,400}MIRRORED_SOURCE_DIRS\.indexOf\(dir\)[\s\S]{0,200}localBodyArt\(true\)/.test(ent)
    && /per \+= \(playerFrameCount\(pose, dir\) \|\| 1\) \* _prewarmArts\(pose, dir\)\.length/.test(ent));
check('3: and the bodies they bake are the ones the player is drawn from (localBodyArt(mirror))',
  /const _bodyArt = localBodyArt\(mirror\);/.test(ent) && /export const MIRRORED_SOURCE_DIRS = \['east', 'northeast', 'southwest'\]/.test(read('src/rendering/playerSkins.js')));

/* ── 4. the Points window's count ── */
const pop = read('src/ui/mobile/InfoPopup.jsx');
check('4: the count starts at 0 and [+] can reach every point; [-] stops at 0',
  /useState\(\{ of: null, n: 0 \}\)/.test(pop) && /Math\.max\(0, stepState\.of === cur \? stepState\.n : 0\)/.test(pop)
    && /Math\.min\(stepMax, Math\.max\(0, base \+ d\)\)/.test(pop) && /disabled=\{stepN <= 0 \|\| spending\}/.test(pop) && /disabled=\{stepN >= stepMax \|\| spending\}/.test(pop));
check('4: Spend sends nothing at 0, and says how to add one',
  /if \(stepMax && stepN < 1\) return;/.test(pop) && /'Add points with \+'/.test(pop));

/* ── 5. the Equipment tab's facing (v2.3.3608: southwest again), its crop
   still following a mirrored facing ── */
const hero = read('src/ui/mobile/sheet/HeroExpanded.jsx');
const cv = read('src/ui/mobile/sheet/CharacterView.jsx');
check('5: the Equipment tab\'s figure faces southwest (v2.3.3608), the crop still centring a mirrored figure',
  /dir="southwest"\s*\n\s*crop/.test(hero) && /cropShift\(size, dir\)/.test(cv) && /southeast: 1, west: 1, northwest: 1/.test(cv));

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall owner-notes-2026-10-22 checks passed');
