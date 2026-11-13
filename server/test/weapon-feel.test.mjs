/* The weapon feel kit and the sword's feel -- v2.3.4800 (src/game/weaponFeel.js,
 * src/game/swordFeel.js, src/rendering/systems/weaponFeelFx.js,
 * src/data/weaponFeelSound.js; docs/specs/sword-feel.md).  The owner,
 * 2026-11-11: "Instead of just copying what other games do I want to think
 * about the 'feel' of the combat" -- and "Yes remove the timing bar.  It needs
 * to be something else entirely, and yes but build all of them".
 *
 *   1. READINESS AND THE GLINT: the weapon refills over its cycle; the glint
 *      is exactly the worker's perfect window (mirrored); the streak runs.
 *   2. STRENGTH: a light cut, a full one, a perfect one -- the contact's size.
 *   3. THE CUT'S ARC: forehand / backhand follow the thumb's turn about the
 *      bro; a flick narrow and quick, a sweep wide; a click from its side.
 *   4. STAGES, the build tone's rate, a build's share.
 *   5. THE BOUNDED CLAIM (for the bow and staff): never more than the
 *      worker's time since the last attack plus the allowance.
 *   6. THE SWITCH: `?swordfeel=0` off, remembered; `?swordfeel=1` back.
 *   7. THE SOUNDS: every node let go when it ends (the v2.3.2126 lesson);
 *      every kind labelled in the Sound Studio.
 *   8. THE WIRING: three calls into the game, the renderer's own layer, the
 *      blade's tint, the backhand's frames, nothing changes damage. */
import fs from 'node:fs';
import { FEEL, feelReadiness, feelPhase, feelGlintT, feelPerfect, feelShare, feelStage, feelStageCrossed, feelStrength, feelBuildRate,
  feelClaimMs, feelArc, feelArcGrow, feelDim, feelTint, pushFeelFx, feelSwitch, swordFeelWanted, SWORD_FEEL_KEY } from '../../src/game/weaponFeel.js';
import { MANUAL } from '../../src/game/manualCombat.js';
import { feelSynth } from '../../src/data/weaponFeelSound.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); } else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const near = (a, b) => Math.abs(a - b) < 1e-9;
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

// ── 1. readiness and the glint ──
{
  check('1a readiness: 0 at the attack, half at half a cycle, 1 full and after; 1 when never attacked',
    feelReadiness(1000, 600, 1000) === 0 && near(feelReadiness(1000, 600, 1300), 0.5) && feelReadiness(1000, 600, 1600) === 1 && feelReadiness(1000, 600, 9000) === 1 && feelReadiness(0, 600, 5) === 1);
  check('1b MIRROR: the glint is the perfect strike\'s window (60 before full, 300 after), the worker\'s numbers',
    FEEL.PERFECT_EARLY_MS === 60 && FEEL.PERFECT_LATE_MS === 300 && FEEL.PERFECT_EARLY_MS === MANUAL.PERFECT_EARLY_MS
    && /PERFECT_EARLY_MS: 60,/.test(read('../src/freeswing.js')) && /PERFECT_LATE_MS: 300,/.test(read('../src/freeswing.js')));
  const ph = [539, 540, 600, 900, 901].map((t) => feelPhase(10000, 600, 10000 + t));
  check('1c its edges are the worker\'s: 539 ms filling, 540 / 600 / 900 glinting, 901 at rest; never attacked: at rest',
    JSON.stringify(ph) === JSON.stringify(['fill', 'glint', 'glint', 'glint', 'rest']) && feelPhase(0, 600, 1) === 'rest', ph);
  check('1d the phone\'s guess of a perfect strike is the glint', feelPerfect(10000, 600, 10600) && !feelPerfect(10000, 600, 10300) && !feelPerfect(10000, 600, 11000));
  check('1e the glint\'s streak runs from the grip (0) to the point (1) over GLINT_RUN_MS, then holds; -1 outside the window',
    feelGlintT(10000, 600, 10540) === 0 && near(feelGlintT(10000, 600, 10540 + FEEL.GLINT_RUN_MS / 2), 0.5) && feelGlintT(10000, 600, 10890) === 1
    && feelGlintT(10000, 600, 10300) === -1 && feelGlintT(10000, 600, 11000) === -1);
  check('1f the blade\'s brightness: DIM right after an attack, 1 full; a tint scaled channel by channel',
    feelDim(0) === FEEL.DIM && feelDim(1) === 1 && near(feelDim(0.5), FEEL.DIM + (1 - FEEL.DIM) / 2)
    && feelTint(0xffffff, 0.5) === 0x808080 && feelTint(0xc87533, 1) === 0xc87533 && feelTint(0xc87533, 0) === 0 && feelTint(undefined, 1) === 0xffffff);
}

// ── 2. strength ──
{
  const light = feelStrength(0.3, false), full = feelStrength(1, false), perf = feelStrength(1, true), edge = feelStrength(0.8, false);
  check('2a a quick cut is light (a small spark, no debris, barely moved, no push, a tick); the share line is the worker\'s 0.8',
    light.tier === 'light' && !light.debris && light.knock < 0.5 && light.push === 0 && light.spark < 0.7 && edge.tier === 'full' && feelStrength(0.79, false).tier === 'light');
  check('2b a full cut: debris, today\'s knock-back, a small push; a perfect one heavier still, its k the worker\'s 1.12',
    full.tier === 'full' && full.debris && full.knock === 1 && full.push > 0 && perf.tier === 'perfect' && perf.knock > full.knock && perf.push > full.push
    && perf.spark > full.spark && near(perf.k, 1.12) && perf.shake > full.shake && full.shake > light.shake);
  check('2c the sound\'s level grows with the share (0.35 to 1)', near(feelStrength(0, false).vol, 0.35) && near(full.vol, 1) && light.vol < full.vol);
}

// ── 3. the cut's arc ──
{
  /* aim east (0): a stroke DOWN turns clockwise on screen (+1), UP the other way */
  const down = feelArc({ dx: 0, dy: 24, ms: 40 }, 0), up = feelArc({ dx: 0, dy: -30, ms: 40 }, 0);
  check('3a the arc turns the way the thumb went round the bro: aiming east, a stroke down is clockwise (+1), up the other way (-1)', down.dir === 1 && up.dir === -1, { down, up });
  /* aim north (-PI/2): left-to-right is clockwise, a forehand; right-to-left a backhand */
  const fore = feelArc({ dx: 30, dy: 0, ms: 40 }, -Math.PI / 2), back = feelArc({ dx: -30, dy: 0, ms: 40 }, -Math.PI / 2);
  check('3b aiming north, left-to-right is a forehand (clockwise), right-to-left a backhand (the owner\'s words)',
    fore.dir === 1 && fore.hand === 'fore' && back.dir === -1 && back.hand === 'back');
  const straight = feelArc({ dx: 30, dy: 0, ms: 40 }, 0), straightBack = feelArc({ dx: -30, dy: 1, ms: 40 }, 0);
  check('3c a stroke straight at (or away from) the aim turns by its left-right', straight.dir === 1 && straightBack.dir === -1);
  check('3d a short stroke (the first 24 px) is a flick: the narrowest arc, the quick trail', down.kind === 'flick' && near(down.width, FEEL.ARC_MIN) && down.ms === FEEL.FLICK_MS);
  const a = feelArc({ dx: 30, dy: 0, ms: 40 }, -Math.PI / 2);
  feelArcGrow(a, 80); const w80 = a.width, k80 = a.kind;
  feelArcGrow(a, 50);
  feelArcGrow(a, 400);
  check('3e the thumb keeps going: past FLICK_PX a sweep, the arc widening to ARC_MAX at SWEEP_PX; it never narrows',
    k80 === 'sweep' && w80 > FEEL.ARC_MIN && w80 < FEEL.ARC_MAX && near(a.width, FEEL.ARC_MAX) && a.ms === FEEL.SWEEP_MS && a.travel === 400);
  const cr = feelArc(null, 0.2), cl = feelArc(null, Math.PI - 0.2);
  check('3f a computer\'s click (no stroke): a cut toward the cursor, the arc from its side (right a forehand, left a backhand)',
    cr.click && cr.dir === 1 && cr.hand === 'fore' && cl.dir === -1 && cl.hand === 'back');
}

// ── 4. stages, the build tone, a build's share ──
{
  const st = [0, 0.2, 0.34, 0.5, 0.67, 0.99, 1].map((r) => feelStage(r, 3));
  check('4a three stages (spark, orb, sphere): 0 until a third, then 1, 2, and 3 only when full', JSON.stringify(st) === JSON.stringify([0, 0, 1, 1, 2, 2, 3]), st);
  check('4b a stage crossed is said once (a pulse, a deeper note)', feelStageCrossed(0.3, 0.35, 3) === 1 && feelStageCrossed(0.35, 0.4, 3) === -1 && feelStageCrossed(0.9, 1, 3) === 3);
  check('4c the build tone rises an octave, empty to full', feelBuildRate(0) === 1 && feelBuildRate(1) === 2 && near(feelBuildRate(0.5), 1.5) && feelBuildRate(5) === 2);
  check('4d a build\'s share of a full one (the free swing\'s rule: damage a second never moves)', feelShare(300, 600) === 0.5 && feelShare(900, 600) === 1 && feelShare(-5, 600) === 0);
}

// ── 5. the bounded claim ──
{
  check('5a an honest claim stands (under the worker\'s time since the last attack and the allowance)', feelClaimMs(500, 800) === 500 && feelClaimMs(900, 800) === 900);
  check('5b a claim past the worker\'s clock is cut to it plus the allowance (a forged draw gains nothing)', feelClaimMs(5000, 800) === 800 + FEEL.CLAIM_ALLOW_MS && feelClaimMs(5000, 800, 0) === 800);
  check('5c nonsense is nothing; no attack before: the claim (the full build caps it)', feelClaimMs(-1, 800) === 0 && feelClaimMs('x', 800) === 0 && feelClaimMs(NaN, 1) === 0 && feelClaimMs(700, undefined) === 700);
}

// ── 6. the switch, and the queue ──
{
  const ls = store();
  check('6a the sword\'s feel is on by default; `?swordfeel=0` turns it off and is remembered; `?swordfeel=1` back',
    swordFeelWanted('', store()) === true && swordFeelWanted('?swordfeel=0', ls) === false && ls.getItem(SWORD_FEEL_KEY) === '0'
    && swordFeelWanted('', ls) === false && swordFeelWanted('?swordfeel=1', ls) === true && swordFeelWanted('', ls) === true && SWORD_FEEL_KEY === 'bt_swordfeel');
  check('6b the same off-ramp for any weapon (the bow\'s, the staff\'s)', feelSwitch('bowfeel', 'bt_bowfeel', '?a=1&bowfeel=0', store()) === false && feelSwitch('stafffeel', 'k', '', store()) === true);
  const S = {};
  for (let i = 0; i < FEEL.FX_CAP + 5; i++) pushFeelFx(S, { kind: 'burst', i });
  check('6c the effects queue is capped (FX_CAP), the oldest let go', S._feelFx.length === FEEL.FX_CAP && S._feelFx[0].i === 5);
}

// ── 7. the sounds ──
{
  /* a stand-in WebAudio: every node counted; a source's end fires onended */
  let made = 0, cut = 0;
  const node = (extra) => Object.assign({ connect() {}, disconnect() { cut++; } }, extra);
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const sources = [];
  const ctx = {
    currentTime: 0, sampleRate: 8000,
    createOscillator() { made++; const o = node({ type: '', frequency: param(), start() {}, stop() {} }); sources.push(o); return o; },
    createGain() { made++; return node({ gain: param() }); },
    createBiquadFilter() { made++; return node({ type: '', frequency: param(), Q: { value: 0 } }); },
    createBufferSource() { made++; const s = node({ buffer: null, start() {}, stop() {} }); sources.push(s); return s; },
    createBuffer(ch, n) { return { copyToChannel() {}, length: n }; },
  };
  const out = node({});
  const ok = ['ready', 'contact', 'release', 'stage'].map((k) => feelSynth(ctx, out, k, k === 'contact' ? 1.12 : 1, { stage: 2 }));
  const h = feelSynth(ctx, out, 'build', 1);
  h.set(0.5); h.stop();
  for (const s of sources) if (s.onended) s.onended();
  check('7a every kind plays (ready, contact, release, stage) and the build tone gives a handle', ok.every((x) => x === true) && h && typeof h.set === 'function');
  check('7b EVERY NODE IS LET GO when its sound ends (the v2.3.2126 lesson: nodes never disconnected grew the graph 20,000 an hour)', made > 0 && cut === made, { made, cut });
  const W = read('../../src/data/weaponFeelSound.js');
  check('7c made, not recorded: no file fetched or decoded, the noise written with copyToChannel (never getChannelData), no imports',
    !/fetch\(|decodeAudioData|getChannelData\(/.test(W) && /copyToChannel/.test(W) && !/^import /m.test(W));
  const ST = read('../../src/data/soundStudio.js'), GD = read('../../src/data/gameDisplay.js');
  check('7d every kind is labelled in the Sound Studio, played through BT_AUDIO.feelSound, behind the mute and the loading screen\'s gate',
    ['feelReady', 'feelCut', 'feelCleave', 'feelPerfect', 'feelBuild', 'feelStage'].every((id) => new RegExp("\\['" + id + "', 'fight', ").test(ST))
    && /BT_AUDIO\.feelSound = function \(kind, k, opts\) \{\s*\n\s*if \(this\.muted \|\| !this\.ctx \|\| !this\._ctxLive\(\)\) return null;\s*\n\s*if \(this\.soundGateClosed\(\)\) return null;/.test(GD));
}

// ── 8. the wiring ──
{
  const SF = read('../../src/game/swordFeel.js'), PA = read('../../src/game/playerActions.js'), MC = read('../../src/game/monsterCombat.js');
  const BRO = read('../../src/ui/BroTown.jsx'), FX = read('../../src/rendering/systems/weaponFeelFx.js'), APP = read('../../src/rendering/pixiApp.js');
  const PR = read('../../src/rendering/pixiRenderer.js'), ER = read('../../src/rendering/systems/entityRenderer.js'), EF = read('../../src/rendering/systems/effectsRenderer.js');
  const K = read('../../src/game/weaponFeel.js');
  check('8a the kit\'s rules import only the manual-combat rules (node runs them)', (K.match(/^import /gm) || []).length === 1 && /^import \{ MANUAL \} from '\.\/manualCombat\.js';/m.test(K));
  check('8b three calls into the game: the swing begins (swingAttack, with the stamp before it), the loop\'s frame, the contact',
    /var _sfPrev = S\.swingTimer;[^\n]*\n\s*S\.swingTimer = Date\.now\(\);[\s\S]{0,300}swordFeelSwing\(S, _sfPrev, S\.swingTimer\);/.test(PA)
    && /updateMonsterCombat\(S, [^\n]*\n[\s\S]{0,400}swordFeelFrame\(S, Date\.now\(\)\);/.test(BRO)
    && /var _sfk = swordFeelContact\(S, m, baseAngle\);/.test(MC));
  check('8c ON ONLY in the game\'s own combat (the free swing) with a sword, unless `?swordfeel=0`; the glint only against caps.perfectStrike',
    /return !!\(_wanted && S && S\.rpg && S\.rpg\.weapon && mcFreeSwing\(S\)\);/.test(SF) && /const glints = !!mcPerfectOn\(S\);/.test(SF));
  check('8d the contact scales the look only: knock-back, shake, debris -- each the look before it when the feel is off (null)',
    /var kbForce = \(S\._specialAttack \? 10 : isCrit \? 7 : 6\) \* \(_sfk \? _sfk\.knock : 1\);/.test(MC)
    && /S\.screenShake = _sfk \? Math\.max\(isCrit \? 6 : 0, _sfk\.shake\) : \(isCrit \? 6 : 3\);/.test(MC)
    && /crit: !!isCrit \|\| !!\(_sfk && _sfk\.tier === 'perfect'\)/.test(MC));
  check('8e NOTHING CHANGES DAMAGE: the feel never writes a hit\'s damage, the claim, or the worker\'s message',
    !/monster_damage|channel\.send|\.dmg\s*=|curHp\s*=/.test(SF) && !/monster_damage|channel\.send/.test(K));
  check('8f the pictures have a world layer of their own, after the light and under the damage numbers (TRAPS §218)',
    /'glows',[\s\S]{0,700}'weaponFeel',\s*\n\s*'damageNumbers', 'overlayWorld',/.test(APP)
    && /new WeaponFeelFx\(layers\.weaponFeel, app\.renderer\)/.test(PR) && /weaponFeelFx\.frame\(S, entityRenderer, now\);/.test(PR)
    && /weaponFeelFx\.destroy\(\);/.test(PR) && /weaponFeelFx\.clear\(\);/.test(PR));
  check('8g its placeholders are minted once and kept on the graphics chip only (the memory law), never live Graphics',
    /keepOnGpuOnly\(this\.renderer, this\.tex\[k\]\.source\)/.test(FX) && !/new Graphics\(/.test(FX) && /s\.blendMode = 'add';/.test(FX));
  check('8h the blade is dull right after a swing: your sword\'s tint times the readiness, where its tint is set',
    /weaponSprite\.tint = \(_feelV && _feelV\.dim < 1 && [^\n]*\) \? feelTint\(_wTint, _feelV\.dim\) : _wTint;/.test(ER));
  check('8i a backhand sweeps back: the front and back views take their mirrored twin, the side view runs its frames last to first; your swing only',
    /const _cutDir = swordCutDir\(S\);/.test(EF) && /if \(fmap\[0\] === 'east'\) _cutBack = true;/.test(EF) && /const fi = _cutBack \? n - 1 - _fi0 : _fi0;/.test(EF)
    && /export const SWORD_FEEL_AUTHORED_DIR = -1;/.test(EF) && /S\._specialAttack \|\| !swordFeelOn\(S\)\) return 0;/.test(SF));
  check('8j QA probes: window.__btWeaponFeel (the feel) and __btWeaponFeelFx (the layer)', /window\.__btWeaponFeel = function/.test(SF) && /window\.__btWeaponFeelFx = \(\) =>/.test(FX));
  check('8k the scenario plays the DEFAULT combat in the Wheel (registered in run.mjs)',
    /swordfeel: \(\) => import\('\.\/mp-swordfeel\.mjs'\)/.test(read('../../tools/qa/mp/run.mjs')) && /world: 'wheel'/.test(read('../../tools/qa/mp/mp-swordfeel.mjs'))
    && /query: 'manual=3/.test(read('../../tools/qa/mp/mp-swordfeel.mjs')));
}

console.log(failures === 0 ? `\nweapon-feel: ${passes} passed, 0 failed` : `\nweapon-feel: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
