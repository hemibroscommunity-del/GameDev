/* ═══ v2.3.3993: THE TOWNSFOLK WALK AROUND AND WORK ═══
 * (src/game/townsfolkWalk.js, src/game/townsfolkDay.js, src/rendering/folkPose.js)
 *
 * The owner: "Make NPCs walk around and do stuff now since it doesn't make
 * much memory anymore."  Read in node with the real tables:
 *
 *   1. the loop: where he is is a pure function of the clock and his name
 *      (every phone the same), pausing at each stop, walking between at
 *      FOLK_WALK_PX_S, round and round;
 *   2. who: every townsperson of the Wheel's BroTown has a day; the quest
 *      givers are tethered (every stop within FOLK_TETHER_PX of his spot),
 *      the keepers and locals walk short loops by their own spots, and every
 *      job is one of the player's work poses the body's colour numbers have;
 *   3. a frame: a giver stops and faces you within FOLK_GIVER_NEAR; anyone
 *      near stops while a window of yours is up; at most FOLK_MAX_WALKERS walk
 *      near the screen; nothing walks into a footprint, the water or you; off
 *      (a computer's photographs, `?folkwalk=0`) the old code runs;
 *   4. the wiring, read from the source: the game loop's hook, the renderer's
 *      work poses (no bake: the palette's pose, the tee's colour without its
 *      print), the poses' sheets warmed behind the loading screen.
 * The loops' ground and footprints are walked by tools/world/test-world-core.mjs
 * on both Wheels.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

const W = await import('../../src/game/townsfolkWalk.js');
const D = await import('../../src/game/townsfolkDay.js');
const { QUEST_CHAINS } = await import('../../src/data/gameSystems.js');
const { WHEEL_TOWNSFOLK } = await import('../../src/data/wheelBuildingDoors.js');

/* ── 1. the loop ─────────────────────────────────────────────────────────── */
{
  const stops = [[0, 0, 1000], [80, 0, 500, 'mine']];
  const a = W.folkAt(stops, 0, 0), b = W.folkAt(stops, 0, 999);
  check('1a at the first stop for its pause, standing', a.dx === 0 && a.dy === 0 && !a.walking && b.dx === 0 && !b.walking, [a, b]);
  const mid = W.folkAt(stops, 0, 1500);
  check(`1b then walking to the next at ${W.FOLK_WALK_PX_S} px a second (half way after half the leg)`, mid.walking && Math.abs(mid.dx - 40) < 0.01 && mid.work === null, mid);
  const at2 = W.folkAt(stops, 0, 2100);
  check('1c and pausing there at its job', !at2.walking && at2.dx === 80 && at2.work === 'mine', at2);
  const period = 1000 + 1000 + 500 + 1000;
  const back = W.folkAt(stops, 0, 2500 + 500), round = W.folkAt(stops, 0, period + 1500);
  check('1d back to the first, round and round (the same a loop later)', back.walking && Math.abs(back.dx - 40) < 0.01 && round.walking && Math.abs(round.dx - mid.dx) < 0.01, [back, round]);
  const s1 = W.folkSeed('Sterling'), s2 = W.folkSeed('Sterling');
  check('1e his seed is his name\'s, the same on every phone, and two names differ', s1 === s2 && s1 !== W.folkSeed('Slim') && Number.isInteger(s1) && s1 >= 0);
  const st = W.FOLK_DAYS.Sterling.stops, t = 1730000000000;
  const p1 = W.folkAt(st, s1, t), p2 = W.folkAt(st, s1, t);
  check('1f where he is at a moment is a pure function of the clock and his seed', p1.dx === p2.dx && p1.dy === p2.dy && p1.walking === p2.walking);
  const none = W.folkAt(null, 0, t);
  check('1g no stops: his spot', none.dx === 0 && none.dy === 0 && !none.walking);
  check('1h the eight facings are the renderer\'s names (+y south)', W.folkFacing(1, 0) === 'east' && W.folkFacing(0, 1) === 'south' && W.folkFacing(-1, -1) === 'northwest' && W.folkFacing(0, -1) === 'north'
    && /const NPC_DIRS_8 = \['east', 'southeast', 'south', 'southwest',\s*'west', 'northwest', 'north', 'northeast'\];/.test(src('src/rendering/systems/entityRenderer.js')));
}

/* ── 2. who ──────────────────────────────────────────────────────────────── */
{
  const names = ['Mayor Bro', ...WHEEL_TOWNSFOLK.map((f) => f.name)];
  const missing = names.filter((n) => !Object.prototype.hasOwnProperty.call(W.FOLK_DAYS, n));
  const extra = Object.keys(W.FOLK_DAYS).filter((n) => !names.includes(n));
  check(`2a every townsperson of the Wheel's BroTown (${names.length}) has a day, and no day is nobody's`, missing.length === 0 && extra.length === 0, { missing, extra });
  const givers = new Set(Object.values(QUEST_CHAINS).map((q) => q && q.npc).filter(Boolean));
  const giverNames = names.filter((n) => givers.has(n));
  const wrongTether = names.filter((n) => !!W.FOLK_DAYS[n].tether !== givers.has(n));
  check(`2b the quest givers (${giverNames.join(', ')}) are tethered, and only they`, wrongTether.length === 0 && giverNames.length >= 5, wrongTether);
  const far = giverNames.filter((n) => W.FOLK_DAYS[n].stops.some((s) => Math.hypot(s[0], s[1]) > W.FOLK_TETHER_PX));
  check(`2c a giver keeps his spot: every stop within ${W.FOLK_TETHER_PX} px of it (a step or two)`, far.length === 0, far);
  const walkers = names.filter((n) => !givers.has(n));
  const shortLoop = walkers.filter((n) => { const s = W.FOLK_DAYS[n].stops; return !(s.length >= 3 && s.some((p) => Math.hypot(p[0], p[1]) > 80) && s.every((p) => Math.hypot(p[0], p[1]) <= 260)); });
  check(`2d the keepers and locals (${walkers.length}) walk a loop of three or more stops by their own spots (out past 80 px, never past 260)`, shortLoop.length === 0 && walkers.length >= 13, shortLoop);
  const fromSpot = names.filter((n) => { const s = W.FOLK_DAYS[n].stops; return s[0][0] !== 0 || s[0][1] !== 0; });
  check('2e every loop starts at his own spot', fromSpot.length === 0, fromSpot);
  const badStop = names.flatMap((n) => W.FOLK_DAYS[n].stops.filter((s) => !(Array.isArray(s) && Number.isFinite(s[0]) && Number.isFinite(s[1]) && s[2] >= 2000 && s[2] <= 12000
    && (s[3] === undefined || W.FOLK_WORK_POSES.includes(s[3])))).map((s) => [n, s]));
  check('2f every stop an offset, a pause of 2-12 s, and any job one of the work poses (mine, fish, pickup)', badStop.length === 0, badStop);
  const jobs = Object.fromEntries(names.map((n) => [n, [...new Set(W.FOLK_DAYS[n].stops.map((s) => s[3]).filter(Boolean))].join()]));
  check('2g the owner\'s jobs: the blacksmith hammering, the cook at his cookhouse, chopping, fishing by the river, hoeing',
    jobs['Blacksmith Bro'] === 'mine' && jobs['Chef Blaze'] === 'mine' && jobs['Woodworker Bro'] === 'mine' && jobs['Old Man Reel'] === 'fish' && jobs['Farmer Bro'] === 'mine', jobs);
  check('2h a giver whose row walks (a quest given later) is held to the givers\' tether', W.folkStops('Sterling', true).every((s) => Math.hypot(s[0], s[1]) <= W.FOLK_TETHER_PX)
    && W.folkStops('Sterling', false) === W.FOLK_DAYS.Sterling.stops && W.folkStops('Nobody', false) === null && W.folkStops('__proto__', false) === null);
  const body = src('src/rendering/lookSets/body.js');
  const pd = /const POSE_DIRS = \{([^}]*)\}/.exec(body);
  check('2i every work pose is a body sheet in colour numbers, facing south (lookSets/body.js POSE_DIRS)', !!pd && W.FOLK_WORK_POSES.every((p) => new RegExp(p + ": \\['south'\\]").test(pd[1])), pd && pd[1]);
  const gs = src('src/rendering/gearSheets.js');
  check('...and its tee\'s sheet is warmed behind the loading screen (gearSheets preloadGear SETS)', W.FOLK_WORK_POSES.every((p) => new RegExp("\\['" + p + "', \\['south'\\]\\]").test(gs)));
}

/* ── 3. a frame ──────────────────────────────────────────────────────────── */
{
  const npc = (id, name, x, y) => ({ id, name, x, y, spawnX: x, spawnY: y, alive: true });
  const mk = () => ({ npcs: [npc('mayor_bro', 'Mayor Bro', 1000, 1000), npc('banker', 'Sterling', 3000, 1000)], camera: { x: 0, y: 0 }, _viewW: 4000, _viewH: 2000 });
  const ctx = (o) => Object.assign({ on: true, chains: QUEST_CHAINS, feetX: -9999, feetY: -9999, talking: false, grid: null, worldW: 0, worldH: 0, boxes: [] }, o || {});
  let S = mk();
  D.townsfolkFrame(S, 0, ctx({ on: false }));
  check('3a off (a computer\'s photographs, `?folkwalk=0`, not the Wheel): his day does nothing and the old code runs', D.townsfolkStep(S, S.npcs[0], 16) === false && S.npcs[0].x === 1000);
  /* find a moment Sterling is walking */
  const st = W.FOLK_DAYS.Sterling.stops, seed = W.folkSeed('Sterling');
  let tw = 0;
  while (!W.folkAt(st, seed, tw).walking) tw += 100;
  S = mk();
  const sx = S.npcs[1];
  sx.x = 3000 + W.folkAt(st, seed, tw).dx; sx.y = 1000 + W.folkAt(st, seed, tw).dy;
  D.townsfolkFrame(S, tw + 400, ctx());
  const ox = sx.x, oy = sx.y;
  check('3b on: his day moves him (the old wander must not)', D.townsfolkStep(S, sx, 100) === true && (sx.x !== ox || sx.y !== oy));
  const moved = Math.hypot(sx.x - ox, sx.y - oy);
  check(`3c ...no faster than a walk (a little quicker while behind): ${moved.toFixed(1)} px in 100 ms`, moved <= W.FOLK_WALK_PX_S * W.FOLK_CATCH_UP * 0.1 + 1e-6, moved);
  const far = npc('x', 'Slim', 0, 0);
  W.folkStep(far, 5000, 0, 16);
  check(`3d further behind than ${W.FOLK_SNAP_PX} px (a first sight): placed`, far.x === 5000);
  S = mk();
  const my = S.npcs[0];
  my.x = 1010; my.y = 1004;
  D.townsfolkFrame(S, 0, ctx({ feetX: 1100, feetY: 1000 }));
  check(`3e a quest giver stops and faces you within ${W.FOLK_GIVER_NEAR} px`, D.townsfolkStep(S, my, 16) === true && my.x === 1010 && my._folkFace === 'east' && my._folkWork === null, my);
  S = mk();
  S.npcs[1].x = sx.x; S.npcs[1].y = sx.y;
  D.townsfolkFrame(S, tw + 400, ctx({ feetX: S.npcs[1].x - 250, feetY: S.npcs[1].y, talking: true }));
  const bx = S.npcs[1].x;
  check(`3f with a window of yours up, anyone within ${W.FOLK_TALK_NEAR} px stops and faces you`, D.townsfolkStep(S, S.npcs[1], 16) === true && S.npcs[1].x === bx && S.npcs[1]._folkFace === 'west');
  /* the cap: ten walkers near the screen, six walk */
  S = { npcs: [], camera: { x: 0, y: 0 }, _viewW: 4000, _viewH: 2000 };
  const ten = ['Ace', 'Sterling', 'Slim', 'Chef Blaze', 'Glint', 'Postmaster Pete', 'Deed Dave', 'Benny', 'Guildmaster Gary', 'Sheriff Buck'];
  ten.forEach((n, i) => { const q = npc('n' + i, n, 200 + i * 300, 1000); q.x += 100; S.npcs.push(q); });   /* each 100 px off his loop: catching up */
  D.townsfolkFrame(S, 0, ctx());
  let went = 0;
  for (const q of S.npcs) { const x0 = q.x, y0 = q.y; D.townsfolkStep(S, q, 16); if (q.x !== x0 || q.y !== y0) went++; }
  check(`3g at most ${W.FOLK_MAX_WALKERS} walk near the screen at once (${went} of ${ten.length})`, went === W.FOLK_MAX_WALKERS, went);
  check('...the nearest to the view\'s middle, a tie by id', [...W.folkWalkersAllowed([{ id: 'b', d: 5 }, { id: 'a', d: 5 }, { id: 'c', d: 1 }], 2)].join() === 'c,a');
  /* never into a footprint, the water or you */
  S = mk();
  const sb = S.npcs[1];
  sb.x = 3000 + W.folkAt(st, seed, tw).dx; sb.y = 1000 + W.folkAt(st, seed, tw).dy;
  const ghost = { x: sb.x, y: sb.y };
  W.folkStep(ghost, 3000 + W.folkAt(st, seed, tw + 400).dx, 1000 + W.folkAt(st, seed, tw + 400).dy, 100);   /* where his step would land */
  D.townsfolkFrame(S, tw + 400, ctx({ boxes: [{ x0: ghost.x - 3, y0: ghost.y - 3, x1: ghost.x + 3, y1: ghost.y + 3 }] }));
  const b0 = [sb.x, sb.y];
  D.townsfolkStep(S, sb, 100);
  check('3h near the screen, he does not step into a footprint (he waits)', sb.x === b0[0] && sb.y === b0[1] && Math.hypot(ghost.x - b0[0], ghost.y - b0[1]) > 4);
  D.townsfolkFrame(S, tw + 400, ctx({ boxes: [{ x0: sb.x - 50, y0: sb.y - 50, x1: sb.x + 50, y1: sb.y + 50 }] }));
  D.townsfolkStep(S, sb, 100);
  check('...but one put inside one walks out (never trapped)', sb.x !== b0[0] || sb.y !== b0[1]);
  check('...nor onto a wall or the water of the walk grid (0 or false), nor off it',
    W.folkGroundBlocked([[1, 0], [1, false]], 200, 200, null, 150, 50) && W.folkGroundBlocked([[1, 0], [1, false]], 200, 200, null, 150, 150)
      && !W.folkGroundBlocked([[1, 0], [1, 1]], 200, 200, null, 50, 150) && W.folkGroundBlocked([[1]], 100, 100, null, -1, 5)
      && !W.folkGroundBlocked(null, 0, 0, [], 10, 10));
  S = mk();
  const sc = S.npcs[1];
  sc.x = 3000 + W.folkAt(st, seed, tw).dx; sc.y = 1000 + W.folkAt(st, seed, tw).dy;
  D.townsfolkFrame(S, tw + 400, ctx({ feetX: sc.x, feetY: sc.y + 5 }));
  const c0 = [sc.x, sc.y];
  D.townsfolkStep(S, sc, 100);
  check(`...nor into you (within ${W.FOLK_BUMP_PX} px of your feet he waits)`, sc.x === c0[0] && sc.y === c0[1]);
  /* at a stop: working, facing the street */
  S = mk();
  const bs = npc('blacksmith_bro', 'Blacksmith Bro', 500, 500);
  S.npcs.push(bs);
  const bst = W.FOLK_DAYS['Blacksmith Bro'].stops, bseed = W.folkSeed('Blacksmith Bro');
  let tm = 0;
  while (W.folkAt(bst, bseed, tm).work !== 'mine') tm += 100;
  D.townsfolkFrame(S, tm, ctx());
  D.townsfolkStep(S, bs, 16);
  check('3i at a stop with a job he works it (the blacksmith\'s hammer), facing the street', bs._folkWork === 'mine' && bs._folkFace === 'south', bs);
  const probe = src('src/game/townsfolkDay.js');
  check('3j the probe (window.__btFolkWalk) reads the game\'s own state', /window\.__btFolkWalk = /.test(probe) && /window\._gameState && window\._gameState\.current/.test(probe));
}

/* ── 4. the wiring ───────────────────────────────────────────────────────── */
{
  const bt = src('src/ui/BroTown.jsx');
  check('4a the game loop works out the day once a frame, only in the Wheel, drawn live, wanted',
    /townsfolkFrame\(S, Date\.now\(\), \{ on: isWheelTrialZone\(S\.currentZone\) && folkWalkWanted\(\) && lookFolkOn\(\), chains: QUEST_CHAINS,/.test(bt)
      && /talking: !!S\._uiBusy/.test(bt) && /boxes: zoneBlockers\(S\.currentZone\)/.test(bt)
      && bt.indexOf('townsfolkFrame(S, Date.now()') > bt.indexOf('raceTick(S, Date.now());'));
  check('4b ...and each townsperson\'s step stands in for the old wander, after the race has had Lil Bro',
    /var _folkWalked = townsfolkStep\(S, npc, 16\.7 \* _npcDt\);/.test(bt) && /if \(!_folkWalked && \(distToTarget < 4 \|\| npc\.moveTimer <= 0\)\) \{/.test(bt)
      && /if \(!_folkWalked && nDist > 2\) \{/.test(bt) && bt.indexOf('townsfolkStep(S, npc') > bt.indexOf('if (raceDriveNpc(S, npc, Date.now()))'));
  const er = src('src/rendering/systems/entityRenderer.js');
  check('4c the renderer draws a job in the work pose (south), standing his day\'s facing, the tee plain at work',
    /const work = \(jogging \|\| folkFaceOverride\(\)\) \? null : folkWorkPose\(npc\);/.test(er) && /const pose = work \|\| \(jogging \? 'jog' : 'stand'\);/.test(er)
      && /folkWorkFrame\(work, now \+ display\._folkBeat\)/.test(er) && /folk\._shirtLook = work \? null : _shirtLook\(/.test(er));
  const fp = src('src/rendering/folkPose.js');
  check('4d ...only a pose the look palette has in numbers (else he stands: no bake of his look)', /return \(w && !_workOff && WORK\.has\(w\) && lookPose\(w\)\) \? w : null;/.test(fp));
  check('4e the far-off rule stands: a townsperson past the view has no figure (v2.3.3809)', /display\._folk\.destroy\(\{ children: true \}\);/.test(er));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
