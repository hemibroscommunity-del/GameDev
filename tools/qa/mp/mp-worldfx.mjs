/* TIME OF DAY, DUST, BLOOD AND THE CRUMBLING CORPSE (v2.3.2712)
 *
 * Owner: time-of-day effects and subtle atmosphere; soft dust footprints the
 * breeze blows away; blood thrown AWAY from the blow, sized by how much of
 * your max HP it took (tiny <=10%, moderate 11-32%, heavy >=33%); and a death
 * that crumbles your own look into a skeleton whose bones fall with physics.
 *
 * WHAT THIS FILE REFUSES TO LET PASS:
 *  1. Night is LIT, not dimmed: the light map is on and at least your own
 *     lantern is in it -- and by day nothing is drawn at all.
 *  2. Walking leaves prints, and they are GONE a couple of seconds later.
 *  3. Blood goes the way the blow pushes: attacker to the west, spray east.
 *     And the tier follows the owner's thresholds exactly.
 *  4. The corpse is the crumble, not the old strip: it photographed the body,
 *     the flakes leave, and the bones end up FALLEN (low) and SPREAD (a pile),
 *     not standing where the skeleton stood.
 *  4b. ...and then it EXPLODES (v2.3.2714, the owner's pick): the spare
 *     bones come too, the screen kicks, and the bones land strewn.
 *  5. No renderer throws, and the real-damage path still does nothing on a
 *     blocked hit (covered by the gameEvents guard; asserted here via tiers).
 */
import * as H from './harness.mjs';
import { lightingAt } from '../../../src/game/timeOfDay.js';   /* v2.3.2882: the day's lengths */

const SHOTS = process.env.WORLDFX_SHOTS || 'tools/qa/mp/out';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Worldfx', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  /* the harness plays every scenario at a calm noon; this one is ABOUT the
     weather, so it turns the air back on */
  await P.page.evaluate(() => { window.__btAmbienceOff = false; });
  await P.page.waitForTimeout(2500);
  const fx = () => P.page.evaluate(() => (window.__btWorldFx ? window.__btWorldFx() : null));
  const setTod = (v) => P.page.evaluate((x) => { window.__btTod = x; }, v);
  const shot = (name) => P.page.screenshot({ path: `${SHOTS}/worldfx-${name}.png` }).catch(() => {});
  /* a close-up centred on the player, wherever the camera has put them */
  const closeUp = async (name) => {
    const b = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const k = S._worldScaleX || 1;
      const cv = document.querySelector('canvas').getBoundingClientRect();
      return { x: cv.left + (S.player.x - S.camera.x) * k, y: cv.top + (S.player.y - S.camera.y) * k };
    });
    const clip = { x: Math.max(0, b.x - 110), y: Math.max(0, b.y - 110), width: 220, height: 200 };
    await P.page.screenshot({ path: `${SHOTS}/worldfx-${name}.png`, clip }).catch(() => {});
  };

  /* ── 1. the hours ── */
  await setTod('day'); await P.page.waitForTimeout(600);
  const day = await fx();
  rec.ok('the world effects are running (guard)', !!day, day);
  await shot('day');
  rec.ok('by day in town nothing darkens the world -- no light map, no lanterns',
    !!day && day.tod && day.tod.sky === true && day.lights === 0, day && { tod: day.tod, lights: day.lights });
  await setTod('night'); await P.page.waitForTimeout(700);
  const night = await fx();
  await shot('night');
  rec.ok('at night the light map is on, and your own lantern is one of its lights',
    !!night && night.tod && night.tod.name === 'night' && night.lights >= 1, night && { tod: night.tod, lights: night.lights });
  /* v2.3.2715: owner -- "I still need the name plates to be legible".  Your
     own plate and the town NPCs' each get a softbox of light at night. */
  rec.ok('...and every name plate on screen gets its own light, so it reads as it does by day',
    !!night && night.night && night.night.plates >= 2, night && night.night);
  /* v2.3.2717: owner -- "light up the props that are in town and in zone
     areas" and "add little code drawn fireflies in the center of the balls
     of light". */
  rec.ok('...every prop in view is lit (a moonlit wash, and its own lamps and flames)',
    !!night && night.night && night.night.props >= 1, night && night.night);
  const flies = await P.page.evaluate(() => (window.__btWorldFxFlies ? window.__btWorldFxFlies().length : 0));
  rec.ok('...and every firefly carries its little drawn bug', flies > 0 && !!night && night.bugs === flies, { fireflies: flies, bugs: night && night.bugs });
  rec.ok('...and the green zones trade their pollen for fireflies',
    !!night && night.moteKind === 'fireflies' && night.motes > 0, night && { kind: night.moteKind, motes: night.motes });
  for (const h of ['dawn', 'golden', 'dusk']) { await setTod(h); await P.page.waitForTimeout(600); await shot(h); }
  const dusk = await fx();
  rec.ok('dusk is its own hour, between the two', !!dusk && dusk.tod && dusk.tod.name === 'dusk', dusk && dusk.tod);

  /* v2.3.2882: owner -- "Make night last only 25% of the current time" and
     "Add a time of day icon next to current map name". */
  /* timeOfDay.js imports nothing, so the keys are read here in node */
  const lens = {};
  for (let i = 0; i < 4000; i++) { const n = lightingAt(i / 4000).name; lens[n] = (lens[n] || 0) + 40 / 4000; }
  for (const k in lens) lens[k] = +lens[k].toFixed(2);
  rec.ok(`night is a quarter of what it was: ~2.9 of the 40 minutes, was ~11.6 (${JSON.stringify(lens)})`,
    !!lens && lens.night >= 2.7 && lens.night <= 3.1 && lens.day >= 28, lens);
  const icons = {};
  for (const h of ['night', 'dawn', 'day']) {
    await setTod(h); await P.page.waitForTimeout(700);
    icons[h] = await P.page.evaluate(() => {
      const i = document.querySelector('.bt-zone-header__tod');
      const t = document.querySelector('[data-zone-title]');
      if (!i || !t) return null;
      const a = i.getBoundingClientRect(), b = t.getBoundingClientRect();
      return { tod: i.getAttribute('data-tod'), sky: i.getAttribute('data-sky'), w: Math.round(a.width),
        leftOfTitle: a.right <= b.left + 1, sameRow: Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 6,
        inTitle: t.contains(i), titleText: t.textContent };
    });
  }
  rec.ok(`the top bar shows the hour beside the zone name (${Object.keys(icons).map((h) => h + '=' + (icons[h] && icons[h].tod)).join(', ')})`,
    Object.keys(icons).every((h) => icons[h] && icons[h].tod === h && icons[h].w >= 12 && icons[h].leftOfTitle && icons[h].sameRow && !icons[h].inTitle),
    icons);
  await P.page.screenshot({ path: `${SHOTS}/worldfx-topbar.png`, clip: { x: 0, y: 0, width: 390, height: 60 } }).catch(() => {});
  await setTod('day'); await P.page.waitForTimeout(400);

  /* ── 2. dust ── */
  const pos0 = await P.page.evaluate(() => { const p = window._gameState.current.player; return { x: p.x, y: p.y }; });
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(1300);
  const walking = await fx();
  const pos1 = await P.page.evaluate(() => { const p = window._gameState.current.player; return { x: p.x, y: p.y }; });
  await closeUp('dust');
  await P.page.keyboard.up('d');
  /* Prints are laid by DISTANCE (one per 17px), so the count is judged
     against how far the walk actually went -- a walk that a prop or the
     plaza edge cut short is a shorter trail, not a missing one. */
  const walked = Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y);
  rec.ok('the walk actually moved the bro (guard)', walked > 30, { walked: +walked.toFixed(1), pos0, pos1 });
  rec.ok('walking leaves dust prints (one per stride) and kicks up puffs',
    !!walking && walking.prints >= Math.min(3, Math.floor(walked / 17) - 1) && walking.puffs >= 1,
    walking && { prints: walking.prints, puffs: walking.puffs, walked: +walked.toFixed(1) });
  /* v2.3.2825 (owner: "It would need to match the color of the terrain"):
     the step's dust is taken from the ground grid under it, not the zone's
     one flat colour, and the puffs are now clearly there. */
  rec.ok('...coloured by the ground under the foot (a baked ground colour, not the zone\'s flat tan)',
    !!walking && !!walking.lastDust && typeof walking.lastDust.ground === 'number' && walking.lastDust.ground > 0
      && walking.lastDust.puff !== 0xd8c7a0, walking && walking.lastDust);
  rec.ok('...and a step throws two puffs now, so they are seen (>= 4 up while walking)',
    !!walking && walking.puffs >= 4, walking && { puffs: walking.puffs });
  await P.page.waitForTimeout(2200);
  const after = await fx();
  rec.ok('...which the breeze has taken two seconds later', !!after && after.prints === 0, after && { prints: after.prints });

  /* ── 3. blood ── */
  const bleed = (frac, fromDx, fromDy) => P.page.evaluate(([f, dx, dy]) => {
    const S = window._gameState.current;
    S._bloodBursts = S._bloodBursts || [];
    /* the same shape the hit handler queues (worldFx.queueBlood): ground
       line at the feet, 42px under the body's middle */
    S._bloodBursts.push({ x: S.player.x, y: S.player.y + 42, fromX: S.player.x + dx, fromY: S.player.y + 42 + dy, frac: f, h: 44 });
  }, [frac, fromDx, fromDy]);
  const tiers = [];
  for (const [f, want] of [[0.05, 'tiny'], [0.10, 'tiny'], [0.11, 'moderate'], [0.32, 'moderate'], [0.33, 'heavy'], [0.6, 'heavy']]) {
    await bleed(f, -60, 0);
    await P.page.waitForTimeout(90);
    const b = (await fx()).lastBlood;
    tiers.push({ f, want, got: b && b.tier });
  }
  rec.ok('the tier follows the owner\'s thresholds: <=10% tiny, 11-32% moderate, >=33% heavy',
    tiers.every((t) => t.got === t.want), tiers);
  await P.page.waitForTimeout(1500);
  await bleed(0.45, -60, 0);
  await P.page.waitForTimeout(140);
  const east = await fx();
  await closeUp('blood-heavy');
  rec.ok('a blow from the WEST throws the blood EAST', !!east && east.lastBlood && Math.abs(east.lastBlood.dir) < 0.3,
    east && east.lastBlood);
  rec.ok('...and a heavy hit throws a lot of it', !!east && east.drops >= 15, east && { drops: east.drops });
  await bleed(0.2, 0, 60);
  await P.page.waitForTimeout(90);
  const north = (await fx()).lastBlood;
  rec.ok('a blow from the SOUTH throws it NORTH', !!north && Math.abs(north.dir + Math.PI / 2) < 0.3, north);
  await P.page.waitForTimeout(900);
  const marks = await fx();
  rec.ok('...and the drops that land leave marks on the ground', !!marks && marks.splats >= 3, marks && { splats: marks.splats });
  await closeUp('blood-marks');

  /* ── 4. death ── */
  /* Dead the way the worker keeps you dead: hp held at 0 and _dying set (a
     real death's handler sets it), so the client's own offline-death path
     does not respawn us in town mid-animation. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const t = Date.now();
    S._dying = true; S.rpg.hp = 0; S._deathStart = t; S.screenShake = 0;
    window.__wfxShake = 0;
    window.__wfxHold = setInterval(() => {
      S.rpg.hp = 0; S._deathStart = t;
      window.__wfxShake = Math.max(window.__wfxShake, S.screenShake || 0);
    }, 16);
  });
  const crumble = async () => (await P.page.evaluate(() => (window.__btDeathCrumble ? window.__btDeathCrumble() : [])))
    .find((c) => c.key === 'self') || null;
  await P.page.waitForTimeout(300);
  const c1 = await crumble();
  await closeUp('death-1-crumbling');
  rec.ok('death draws the crumble, photographed from YOUR body', !!c1 && c1.shot && c1.flakes > 20 && c1.bones >= 13, c1);
  await P.page.waitForTimeout(500);
  const c2 = await crumble();
  await closeUp('death-2-skeleton');
  rec.ok('...the flakes leave as the skeleton comes up under them', !!c2 && c2.flakesLeft < c1.flakes && c2.skeletonAlpha > 0.6, c2);
  /* v2.3.2714: then it SHIVERS and EXPLODES (the owner's pick of the two
     deaths).  Waited for by the bones landing, not a fixed time: a slow
     software-GL frame rate stretches the physics clock (dt is capped per
     frame), and a fixed wait measured bones still in the air. */
  await closeUp('death-3-boom');
  let c3 = null;
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(300);
    c3 = await crumble();
    if (c3 && c3.boomed && c3.resting >= c3.bones - 2) break;
  }
  const kick = await P.page.evaluate(() => window.__wfxShake);
  await closeUp('death-4-strewn');
  rec.ok('...then the skeleton EXPLODES: every bone flies, plus the spares',
    !!c3 && c3.boomed && c3.bones > 13 && c3.free === c3.bones, c3);
  /* The corpse says what it asked for; the sampled S.screenShake proves it
     reached the camera (it decays per frame, and the bang lands during a
     ~2s screenshot, so the sampler catches the tail, not the peak). */
  rec.ok('...the screen kicks with it', !!c3 && c3.kick >= 20 && kick >= 5, { asked: c3 && c3.kick, sampledPeak: kick });
  rec.ok('...and the bones come down (low, not standing) strewn wide',
    !!c3 && c3.maxZ < c3.standingZ * 0.35 && c3.spread > 150, c3 && { maxZ: c3.maxZ, standingZ: c3.standingZ, spread: c3.spread });
  rec.ok('...and most of them have come to rest', !!c3 && c3.resting >= c3.bones - 3, c3);
  /* respawn: the corpse must go the moment you are alive */
  await P.page.evaluate(() => {
    clearInterval(window.__wfxHold);
    const S = window._gameState.current;
    S.rpg.hp = S.rpg.maxHp || 100; S._deathStart = 0; S._dying = false;
  });
  await P.page.waitForTimeout(700);
  const gone = await crumble();
  rec.ok('...and it is gone the moment you are alive again', !gone, gone);

  const throws = H.takeRenderThrows();
  rec.ok('no renderer threw', throws.length === 0, throws.slice(0, 3));
  await P.ctx.close();
}
