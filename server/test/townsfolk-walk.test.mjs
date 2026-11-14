/* ═══ v2.3.4058: THE TOWNSFOLK WALK AROUND AND WORK ═══
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
 *   2j. v2.3.5460, each works with his own tool (the owner, 2026-11-14: "make
 *      sure all NPCs do things that match their characters. Like chef blaze
 *      should cook, not hammer like an anvil"): a work pose that holds a tool
 *      (the mining swing's pickaxe, the cast's rod) is worn only by those who
 *      may hold it (TOOL_OF, MAY_HOLD below); every work pose names its tool,
 *      so a new pose (card TF PR 2's pan, axe, hoe) says whose it is; 2k, and
 *      no job makes a new bake of a look the colour numbers refuse.
 *      docs/specs/townsfolk-work.md is every townsperson's day.
 *      THE BREAK PROOF (the grand plan's rule 8): put Chef Blaze's 'mine' back
 *      in FOLK_DAYS and 2g and 2j go red (2j names him with the pickaxe);
 *      give Farmer Bro the pickup and 2g and 2k go red (2k names him: his
 *      'wtf' eyes are blanked on the pickup's sheet, a bake of his look).
 *   6. v2.3.5462, at their own trades (card TF PR 2): Chef Blaze cooks, Woodworker
 *      Bro chops, Farmer Bro hoes, waters and kneels, in the player's skill
 *      figures from the `skills` look set's colour numbers (rendering/folkSkill.js,
 *      entityRenderer _drawFolkSkill): its copies of effectsRenderer's numbers,
 *      the set on disk, the switch, the wiring (no bake), behind the loading
 *      screen.  2j names a tool for each (the pan, the axe, the hoe, the can).
 *   5. v2.3.4098, townsfolk never block you (the owner, 2026-11-03: "I walked
 *      into Npc who walked into me and I got stuck"): the player's walk test
 *      (BroTown isSolid) reads no townsperson, and a walker whose step would
 *      take him into you waits (folkStepBumps: along the step, never held
 *      inside you), then walks on once you have moved on.  The phone half is
 *      tools/qa/mp/mp-folkpass.mjs.
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
const { readSystem } = await import('../../tools/guards/lib/filesOf.mjs');   /* v2.3.5462: code by system (§6) */
const D = await import('../../src/game/townsfolkDay.js');
const { QUEST_CHAINS } = await import('../../src/data/gameSystems.js');
const { WHEEL_TOWNSFOLK } = await import('../../src/data/wheelBuildingDoors.js');

/* ── 1. the loop ─────────────────────────────────────────────────────────── */
{
  const stops = [[0, 0, 1000], [80, 0, 500, 'mine']];
  /* v2.3.5017: the leg's time from the pace (it was 80 px a second, so 1000 ms) */
  const leg = 80 / W.FOLK_WALK_PX_S * 1000;
  const a = W.folkAt(stops, 0, 0), b = W.folkAt(stops, 0, 999);
  check('1a at the first stop for its pause, standing', a.dx === 0 && a.dy === 0 && !a.walking && b.dx === 0 && !b.walking, [a, b]);
  const mid = W.folkAt(stops, 0, 1000 + leg / 2);
  check(`1b then walking to the next at ${W.FOLK_WALK_PX_S} px a second (half way after half the leg)`, mid.walking && Math.abs(mid.dx - 40) < 0.01 && mid.work === null, mid);
  const at2 = W.folkAt(stops, 0, 1000 + leg + 100);
  check('1c and pausing there at its job', !at2.walking && at2.dx === 80 && at2.work === 'mine', at2);
  const period = 1000 + leg + 500 + leg;
  const back = W.folkAt(stops, 0, 1000 + leg + 500 + leg / 2), round = W.folkAt(stops, 0, period + 1000 + leg / 2);
  check('1d back to the first, round and round (the same a loop later)', back.walking && Math.abs(back.dx - 40) < 0.01 && round.walking && Math.abs(round.dx - mid.dx) < 0.01, [back, round]);
  /* v2.3.5017: "the townspeople run in slow motion": the pace is a player's, SPEED world px a 60 Hz frame */
  const { SPEED } = await import('../../src/data/gameSystems.js');
  check(`1d2 the pace is a player's: ${W.FOLK_WALK_PX_S} px a second (SPEED ${SPEED} x 60), and catching up only a little quicker (x${W.FOLK_CATCH_UP})`,
    Math.abs(W.FOLK_WALK_PX_S - SPEED * 60) < 0.01 && W.FOLK_CATCH_UP > 1 && W.FOLK_CATCH_UP <= 1.3);
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
  check(`2f every stop an offset, a pause of 2-12 s, and any job one of the work poses (${W.FOLK_WORK_POSES.join(', ')})`, badStop.length === 0, badStop);
  const jobs = Object.fromEntries(names.map((n) => [n, [...new Set(W.FOLK_DAYS[n].stops.map((s) => s[3]).filter(Boolean))].join()]));
  /* v2.3.5460: the cook, the woodworker, the farmer and Gavel Greg swung the
     blacksmith's pickaxe ("chef blaze should cook, not hammer like an anvil");
     v2.3.5462: each at his own trade now, in the player's skill figures, and
     Gavel Greg holds up a lot (a gavel's bang is new art: the owner's list) */
  check('2g the owner\'s jobs: the blacksmith hammering, fishing by the river, the cook with his pan, the woodworker chopping, the farmer kneeling, hoeing and watering, Gavel Greg\'s lot (the pickup); never the pickaxe but the smith',
    jobs['Blacksmith Bro'] === 'mine' && jobs['Old Man Reel'] === 'fish'
      && jobs['Chef Blaze'] === 'cook' && jobs['Woodworker Bro'] === 'chop' && jobs['Farmer Bro'] === 'farmkneel,farmhoe,farmwater' && jobs['Gavel Greg'] === 'pickup', jobs);
  check('2h a giver whose row walks (a quest given later) is held to the givers\' tether', W.folkStops('Sterling', true).every((s) => Math.hypot(s[0], s[1]) <= W.FOLK_TETHER_PX)
    && W.folkStops('Sterling', false) === W.FOLK_DAYS.Sterling.stops && W.folkStops('Nobody', false) === null && W.folkStops('__proto__', false) === null);
  const body = src('src/rendering/lookSets/body.js');
  const pd = /const POSE_DIRS = \{([^}]*)\}/.exec(body);
  /* v2.3.5462: the trades' figures are not body sheets: the `skills` set's (6) */
  const TRADES = { cook: ['cook-south', null, 'cook', 'south'], chop: ['chop-west', null, 'chop', 'west'], farmhoe: ['farmhoe-south', 'farmhoe-prop-south', 'farmhoe', 'south'],
    farmwater: ['farmwater-south', 'farmwater-prop-south', 'farmwater', 'south'], farmkneel: ['farmkneel-south', null, 'farmkneel', 'south'] };
  const bodyPoses = W.FOLK_WORK_POSES.filter((p) => !TRADES[p]);
  check('2i every work pose but a trade\'s is a body sheet in colour numbers, facing south (lookSets/body.js POSE_DIRS)', !!pd && bodyPoses.length === 3 && bodyPoses.every((p) => new RegExp(p + ": \\['south'\\]").test(pd[1])), pd && pd[1]);
  const gs = src('src/rendering/gearSheets.js');
  check('...and its tee\'s sheet is warmed behind the loading screen (gearSheets preloadGear SETS)', bodyPoses.every((p) => new RegExp("\\['" + p + "', \\['south'\\]\\]").test(gs)));
  const skillRoles = JSON.parse(src('public/sprites/look/skills/roles.json'));
  const gearSet = src('src/rendering/lookSets/gear.js');
  const tradeOut = W.FOLK_WORK_POSES.filter((p) => TRADES[p] && !(skillRoles.sheets[TRADES[p][0]] && (!TRADES[p][1] || skillRoles.sheets[TRADES[p][1]])
    && new RegExp(TRADES[p][2] + ": \\{ " + TRADES[p][3] + ": \\[").test(gearSet)));
  check('...and every trade\'s figure (and the farmer\'s tools) is a sheet of the `skills` set, its tee a strip of the `gear` set (lookSets/gear.js POSES): in colour numbers, behind the loading screen',
    tradeOut.length === 0 && Object.keys(TRADES).every((p) => W.FOLK_WORK_POSES.includes(p)), tradeOut);
  /* ═══ v2.3.5460: EACH WORKS WITH HIS OWN TOOL ═══
     The owner, 2026-11-14: "make sure all NPCs do things that match their
     characters. Like chef blaze should cook, not hammer like an anvil".  A
     work pose's tool is drawn into its sheet: the mining swing holds a
     pickaxe over a rock, the cast a rod; the pickup's hands are empty.  The
     table is the test's own, not the code's, so a day cannot hand itself a
     tool: a new work pose adds its row here (its tool, and who may hold it),
     or this check names it.  docs/specs/townsfolk-work.md. */
  const TOOL_OF = { mine: 'the pickaxe', fish: 'the rod', pickup: null /* empty hands: anyone */,
    /* v2.3.5462: the trades' figures (card TF PR 2) */
    cook: 'the pan', chop: 'the axe', farmhoe: 'the hoe', farmwater: 'the watering can', farmkneel: null /* his hands in the soil */ };
  const MAY_HOLD = {
    /* the blacksmith at his forge: the player's own smithing is this very
       swing (effectsRenderer _updateSmithing); nobody else in the town mines */
    'the pickaxe': ['Blacksmith Bro'],
    'the rod': ['Old Man Reel'],   /* by the river */
    'the pan': ['Chef Blaze'],     /* the Cookhouse */
    'the axe': ['Woodworker Bro'], /* the Woodworker's bench */
    'the hoe': ['Farmer Bro'],     /* the Feed & Seed */
    'the watering can': ['Farmer Bro'],
  };
  /* v2.3.5462: a trade's figure not drawn (`?folkskills=0`, a part not in):
     card TF PR 1's pose (folkSkill.js FOLK_SKILL_FALLBACK) -- held as every job is */
  const fbSrc = /const FOLK_SKILL_FALLBACK = Object\.freeze\((\{[^}]*\})\);/.exec(src('src/rendering/folkSkill.js'));
  const FALLBACK = fbSrc ? Function('return ' + fbSrc[1])() : null;
  const jobsOf = (s) => [s[3], ...(s[3] && FALLBACK && Object.prototype.hasOwnProperty.call(FALLBACK, s[3]) && FALLBACK[s[3]] ? [FALLBACK[s[3]]] : [])];
  const untold = W.FOLK_WORK_POSES.filter((p) => !Object.prototype.hasOwnProperty.call(TOOL_OF, p) || (TOOL_OF[p] !== null && !MAY_HOLD[TOOL_OF[p]]));
  check('2j every work pose names its tool, and every tool who may hold it (a new pose adds its row)', untold.length === 0, untold);
  const wrongHands = [];
  for (const n of Object.keys(W.FOLK_DAYS)) {
    for (const giver of [false, true]) {
      for (const s of (W.folkStops(n, giver) || [])) {
        for (const job of jobsOf(s)) {
          const tool = job ? TOOL_OF[job] : null;
          if (tool && !(MAY_HOLD[tool] || []).includes(n)) wrongHands.push([n, job, tool]);
        }
      }
    }
  }
  check('...and a townsperson works only with a tool that is his: nobody but the blacksmith swings the pickaxe, nobody but Old Man Reel casts the rod, the pan the cook\'s, the axe the woodworker\'s, the hoe and the can the farmer\'s (a trade\'s fallback held too)',
    wrongHands.length === 0 && !!FALLBACK && W.FOLK_WORK_POSES.filter((p) => TRADES[p]).every((p) => Object.prototype.hasOwnProperty.call(FALLBACK, p)), { wrongHands, FALLBACK });
  /* v2.3.5460: ...and no job bakes a look the colour numbers refuse (the
     memory law).  A look is refused in a pose when his eye style has a blank
     on that pose's sheet, or his trousers or shoes wear a pattern
     (playerSkins.js lookBodyRefused; the cast is never refused): then the
     loading screen bakes a copy of the sheet for him (entityRenderer
     prewarmFolkBodies), new memory.  The blacksmith's striped trousers in
     the swing are the one such job (v2.3.4400); the pickup's sheet blanks an
     eye style and the swing's does not, which is why Farmer Bro (his wide
     'wtf' eyes) stands rather than take the pickup. */
  const { npcLookByName } = await import('../../src/data/npcLooks.js');
  const EYE_BLANK = JSON.parse(src('src/rendering/eyeBlankMask.json'));
  const BAKED_BEFORE = new Set(['Blacksmith Bro|mine']);
  const newBakes = [];
  for (const n of Object.keys(W.FOLK_DAYS)) {
    const L = npcLookByName(n);
    for (const giver of [false, true]) {
      for (const s of (W.folkStops(n, giver) || [])) {
        for (const job of jobsOf(s)) {
          if (!job || job === 'fish' || !L) continue;
          const pat = L.patterns || {};
          /* v2.3.5462: a trade's figure takes his eye style as a piece of his
             head (placeSkillTraitsFor), so only a pattern refuses its numbers */
          const refused = TRADES[job] ? (pat.pants || pat.shoes) : ((L.eyes && L.eyes !== 'none' && EYE_BLANK[job + '-south']) || pat.pants || pat.shoes);
          if (refused && !BAKED_BEFORE.has(n + '|' + job)) newBakes.push([n, job, L.eyes, pat.pants || pat.shoes || null]);
        }
      }
    }
  }
  check('2k no job makes a new bake of a look the colour numbers refuse (only the blacksmith\'s striped trousers in the swing, as before)',
    newBakes.length === 0 && Object.keys(W.FOLK_DAYS).every((n) => !!npcLookByName(n)), newBakes);
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
  /* v2.3.4098: your feet 5 px ahead of him on his way (he would step deeper
     into you); one behind him he walks out of you (§5e) */
  const cg = { x: sc.x, y: sc.y };
  W.folkStep(cg, 3000 + W.folkAt(st, seed, tw + 400).dx, 1000 + W.folkAt(st, seed, tw + 400).dy, 100);
  const cl = Math.hypot(cg.x - sc.x, cg.y - sc.y) || 1;
  D.townsfolkFrame(S, tw + 400, ctx({ feetX: sc.x + (cg.x - sc.x) / cl * 5, feetY: sc.y + (cg.y - sc.y) / cl * 5 }));
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
    /let work = \(jogging \|\| folkFaceOverride\(\)\) \? null : folkWorkPose\(npc\);/.test(er) && /const pose = work \|\| \(jogging \? 'jog' : 'stand'\);/.test(er)
      && /folkWorkFrame\(work, now \+ display\._folkBeat\)/.test(er) && /folk\._shirtLook = work \? null : _shirtLook\(/.test(er));
  const fp = src('src/rendering/folkPose.js');
  check('4d ...only a pose the look palette has in numbers (else he stands: no bake of his look); a trade\'s figure asked of folkSkill.js',
    /return \(w && !_workOff && WORK\.has\(w\) && lookPose\(w\)\) \? w : null;/.test(fp) && /if \(w && !_workOff && isFolkSkill\(w\)\) return w;/.test(fp));
  check('4e the far-off rule stands: a townsperson past the view has no figure (v2.3.3809)', /display\._folk\.destroy\(\{ children: true \}\);/.test(er));
}

/* ── 5. v2.3.4098: townsfolk never block you ──────────────────────────────── */
{
  const bt = src('src/ui/BroTown.jsx');
  const a = bt.indexOf('var isSolid = function isSolid(px, py) {');
  const b = a < 0 ? -1 : bt.indexOf('window.__btIsSolid', a);
  const body = a >= 0 && b > a ? bt.slice(a, b) : '';
  check('5a your walk test (BroTown isSolid) reads no townsperson: none is solid to you, walking or standing',
    body.length > 500 && !/S\.npcs|_npcs/.test(body) && !/NPC_BLOCK/.test(bt), { found: a, len: body.length });
  const r = W.FOLK_BUMP_PX;
  check(`5b a step that ends within ${r} px of your feet: he waits`, W.folkStepBumps(0, 0, 2, 0, 2 + r - 1, 0) === true);
  check('5c a step that stays clear: he walks', W.folkStepBumps(0, 0, 2, 0, 2 + r + 5, 0) === false && W.folkStepBumps(0, 0, 2, 0, 0, r + 1) === false);
  check('5d read along the step: a long frame cannot hop him through you', W.folkStepBumps(0, 0, 100, 0, 50, 3) === true);
  check('5e already inside you (you walked into him): a step away is let be, a step deeper is held',
    W.folkStepBumps(0, 0, 2, 0, -5, 0) === false && W.folkStepBumps(0, 0, 2, 0, 5, 0) === true && W.folkStepBumps(5, 0, 5, 0, 5, 0) === true
    && W.folkStepBumps(0, 0, 10, 0, 4, 0) === true /* a step across your feet is deeper, not away */);
  check('5f no feet (NaN): nothing to bump', W.folkStepBumps(0, 0, 2, 0, NaN, NaN) === false && W.folkStepBumps(0, 0, 2, 0, null, 0) === false);
  /* a frame: he walks his leg toward you; you stand in his way, then move on */
  const st = W.FOLK_DAYS.Sterling.stops, seed = W.folkSeed('Sterling');
  let tw = 0;
  while (!W.folkAt(st, seed, tw).walking) tw += 100;
  const S = { npcs: [{ id: 'banker', name: 'Sterling', x: 0, y: 0, spawnX: 3000, spawnY: 1000, alive: true }], camera: { x: 0, y: 0 }, _viewW: 4000, _viewH: 2000 };
  const n = S.npcs[0];
  const at = W.folkAt(st, seed, tw), at2 = W.folkAt(st, seed, tw + 400);
  n.x = 3000 + at.dx; n.y = 1000 + at.dy;
  const ux = (at2.dx - at.dx), uy = (at2.dy - at.dy), ul = Math.hypot(ux, uy) || 1;
  const inWay = { feetX: n.x + ux / ul * (r + 4), feetY: n.y + uy / ul * (r + 4) };   /* just ahead of him on his way */
  const ctx = (o) => Object.assign({ on: true, chains: QUEST_CHAINS, feetX: -9999, feetY: -9999, talking: false, grid: null, worldW: 0, worldH: 0, boxes: [] }, o);
  D.townsfolkFrame(S, tw + 400, ctx(inWay));
  const p0 = [n.x, n.y];
  D.townsfolkStep(S, n, 100);
  check('5g you in his way: he pauses rather than walk into you', n.x === p0[0] && n.y === p0[1], { p0, n: [n.x, n.y], inWay });
  D.townsfolkFrame(S, tw + 500, ctx({ feetX: inWay.feetX - uy / ul * 200, feetY: inWay.feetY + ux / ul * 200 }));   /* you stepped aside */
  D.townsfolkStep(S, n, 100);
  check('5h you moved on: he walks on', n.x !== p0[0] || n.y !== p0[1], { p0, n: [n.x, n.y] });
  const day = src('src/game/townsfolkDay.js');
  check('5i the frame\'s step asks folkStepBumps, and the probe counts the pauses (bumpsTotal, mp-folkpass)',
    /const bump = folkStepBumps\(ox, oy, npc\.x, npc\.y,/.test(day) && /bumpsTotal: _bumpsTotal/.test(day));
}

/* ── 6. v2.3.5462: at their own trades (card TF PR 2) ─────────────────────── */
{
  /* effectsRenderer's lines, found in the render system's files, never by the
     big file's path (tools/guards/tests-by-system.test.mjs: it will be split) */
  const er = [...readSystem('render').values()].join('\n');
  const fs6 = src('src/rendering/folkSkill.js');
  const set = src('src/rendering/lookSets/skills.js');
  /* 6a: effectsRenderer's numbers, copied (folkSkill.js cannot import it: it is
     imported by entityRenderer, which effectsRenderer imports), held here */
  const theirs = [/export const COOK_STANDIN_H = 73\.9;/, /export const CHOP_STANDIN_H = 136\.8;/, /const COOK_FW = 213, COOK_FH = 220;/,
    /const FARM_MIN_BLOB = 12;/, /const FW = 240, FH = 220, FROM = 12, COUNT = 12;/, /this\._skillTraitMul = \{ chop: 0\.91, cook: 1\.65,/,
    /_skillTraitMul\[FARM_ANIMS\[a\]\.pose\] = FARM_ANIM_HEAD \/ 51;/, /chop: \{ h: CHOP_STANDIN_H, fh: 220, ms: 45, traitDir: 'east', from: 12, count: 12,/,
    /cook: \{ h: COOK_STANDIN_H, fh: 220, ms: 60, traitDir: 'south',/, /const _shirtIx = \(code === 'cook'\) \? 22 : _gi;/];
  const ours = [/export const FOLK_COOK_H = 73\.9;/, /export const FOLK_CHOP_H = 136\.8;/, /const TRAIT_MUL = \{ cook: 1\.65, chop: 0\.91, farm: FARM_ANIM_HEAD \/ 51 \};/,
    /cook: Object\.freeze\(\{ sheet: 'cook-south', prop: null, fw: 213, fh: 220, n: 24, ms: 60,/,
    /chop: Object\.freeze\(\{ sheet: 'chop-west', prop: null, fw: 240, fh: 220, n: 12, ms: 45,/,
    /traitDir: 'east', traitMul: TRAIT_MUL\.chop,\s*crownKey: 'chop',/, /shirtAt: \(\) => 22/];
  const setOurs = [/SKILL_COOK = Object\.freeze\(\{ fw: 213, fh: 220,/, /SKILL_CHOP = Object\.freeze\(\{ fw: 240, fh: 220, from: 12, count: 12,/, /SKILL_FARM_MIN_BLOB = 12;/];
  const off6a = [...theirs.filter((r) => !r.test(er)).map(String), ...ours.filter((r) => !r.test(fs6)).map(String), ...setOurs.filter((r) => !r.test(set)).map(String)];
  /* ...and the cook's and the lumberjack's crowns, copied (no load in play), held to crowns.json */
  const crowns = JSON.parse(src('public/sprites/skills/crowns.json'));
  const cookC = /cook: Array\(24\)\.fill\(\[(\d+), (\d+)\]\)/.exec(fs6), chopC = /chop: (\[\[[\d, \[\]]+\]\]),/.exec(fs6);
  if (!(cookC && crowns.cook.n === 24 && crowns.cook.crowns.every((c) => c[0] === +cookC[1] && c[1] === +cookC[2]))) off6a.push('the cook\'s crowns');
  if (!(chopC && JSON.stringify(JSON.parse(chopC[1])) === JSON.stringify(crowns.chop.crowns.slice(12, 24)))) off6a.push('the lumberjack\'s crowns (12-23)');
  check('6a the trades\' figures at the player\'s own numbers: effectsRenderer\'s heights, frames, head sizes, tee frame and the bake\'s crop and floor, copied in folkSkill.js and lookSets/skills.js and held to it',
    off6a.length === 0, off6a);
  /* 6b: the set on disk, baked from these strips by the game's own recolour */
  const roles = JSON.parse(src('public/sprites/look/skills/roles.json'));
  const want = ['cook-south', 'chop-west', 'farmhoe-south', 'farmwater-south', 'farmkneel-south', 'farmhoe-prop-south', 'farmwater-prop-south'];
  const missing6 = want.filter((n) => !roles.sheets[n]);
  check('6b the `skills` set holds the five figures and the farmer\'s two tools as colour numbers (tools/art/role-bake.mjs --set skills; precheck look-roles keeps them fresh), the lumberjack his twelve played frames',
    roles.set === 'skills' && roles.bits === 8 && missing6.length === 0 && roles.sheets['chop-west'].frames === 12 && roles.sheets['cook-south'].frames === 24
      && roles.roles.join() === 'keep,skin,pants,boots', { missing6, set: roles.set, bits: roles.bits });
  check('...its recolour the game\'s own for another player in his colours (STANDIN_INK\'s cook and farm rows, _bakeChopStrip): no drawings, no patterns, the axe kept as painted',
    /recolorStandInSkin\(src\.img, T\[1\] \|\| null, s\.fh, \{ keepX: COOK_KEEP_X, art: null, regions: COOK_INK_REGIONS, frameW: s\.fw, patK: STANDIN_GARB_K\.cook, \.\.\.clothes \}\)/.test(set)
      && /recolorToolKeyCanvas\(cv, TOOL_SPECS\.axe, 1, src\.keyMask\)/.test(set) && /keepFromDefault: true/.test(set) && /garb: null/.test(set));
  /* 6e (the planning session, 2026-11-14: "a sheet that needs another one
     gets it written down, never silently"): every look set's sheet baked at a
     bar of its own (its manifest's `bar`, tools/art/role-bake.mjs) has that
     bar and its written reason in its set module (`bars`).  BREAK PROOF:
     empty the cook's `why` in lookSets/skills.js -> 6e red; bake a sheet with
     ROLE_BAKE_BAR=23 and no `bars` entry -> 6e red (its manifest's bar has
     no reason). */
  {
    const { readdirSync, existsSync } = await import('node:fs');
    const lookDir = new URL('public/sprites/look/', root);
    const sets = readdirSync(lookDir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(new URL(e.name + '/roles.json', lookDir))).map((e) => e.name);
    const unexplained = [];
    let raised = 0;
    for (const set of sets) {
      const m = JSON.parse(src(`public/sprites/look/${set}/roles.json`));
      const mod = existsSync(new URL(`src/rendering/lookSets/${set}.js`, root)) ? src(`src/rendering/lookSets/${set}.js`) : '';
      for (const [sheet, e] of Object.entries(m.sheets || {})) {
        if (e.bar == null) continue;
        raised++;
        const row = new RegExp("'" + sheet.replace(/-/g, '\\-') + "': \\{ bar: (\\d+), why: \"((?:[^\"\\\\]|\\\\.)*)\"").exec(mod);
        const why = row ? row[2] : '';
        if (!row || +row[1] !== e.bar || why.length < 80) unexplained.push(`${set}/${sheet} (bar ${e.bar})`);
      }
    }
    check(`6e a look sheet baked at a bar of its own has it written, with its reason, in its set module (${raised} such: the cook's 23)`, unexplained.length === 0 && raised >= 1, unexplained);
  }
  /* 6c: the switch, and the memory: no `?folkwork` work poses, none of the set loaded */
  check('6c `?folkwork=0` stands them for the trades too; `?folkskills=0` (its row in the switch table) puts them back in PR 1\'s poses; either loads none of the set',
    /const _workOff = \(\(\) => \{ try \{ return \/\(\^\|\[\?&\]\)folkwork=0\(&\|\$\)\/\.test/.test(fs6) && /const _skillsOff = \(\(\) => \{ try \{ return \/\(\^\|\[\?&\]\)folkskills=0\(&\|\$\)\/\.test/.test(fs6)
      && /const _off = _workOff \|\| _skillsOff;/.test(fs6) && /const _reg = \(!_off && lookPaletteWanted\(\)\) \? registerLookSheets\('skills'/.test(fs6)
      && /if \(_off\) return false;/.test(fs6) && /folkwork=0/.test(src('src/rendering/folkPose.js'))
      && /name: '\?folkskills', side: 'page', system: 'render', kind: 'switch', born: 5462, thrown: '=0', risk: 'memory'/.test(src('tools/guards/lib/switches.mjs'))
      && /if \(isFolkSkill\(work\)\) work = folkSkillFallback\(work\);/.test(src('src/rendering/systems/entityRenderer.js')));
  /* 6d: the renderer -- the figure from the numbers, no bake; behind the loading screen; gone when he is */
  const er6 = src('src/rendering/systems/entityRenderer.js');
  const a6 = fs6.indexOf('export function drawFolkSkill(display, npc, look, pose, now, size, placeTraits) {');
  const b6 = a6 < 0 ? -1 : fs6.indexOf('\nexport function hideFolkSkill(', a6);
  const fn6 = a6 >= 0 && b6 > a6 ? fs6.slice(a6, b6) : '';
  check('6d the renderer draws a trade from folkSkill.js alone (its numbers, the gear set\'s tee, his head at its crown by entityRenderer\'s placeSkillTraitsFor, handed in): no body bake, no canvas, no load',
    fn6.length > 500 && /if \(!folkSkillReady\(pose, look\)\) return miss\(display, 'ready'\);/.test(fn6) && /folkSkillTextures\(pose, look, fi\)/.test(fn6)
      && /placeTraits\(F\._traits, \{/.test(fn6) && /\}, cwx, cwy, spec\.traitDir, false, k \* spec\.traitMul\);/.test(fn6)
      && !/getBodyFrame|getLookBodyFrame|document\.createElement|getContext|fetch\(|new Image/.test(fs6)
      && /if \(work && isFolkSkill\(work\) && drawFolkSkill\(display, npc, look, work, now, size, placeSkillTraitsFor\)\) return true;/.test(er6)
      && /if \(isFolkSkill\(work\)\) work = folkSkillFallback\(work\);/.test(er6), { len: fn6.length });
  check('...behind the world\'s loading screen (prewarmFolkBodies awaits folkSkillPrepare: the set in, the crowns read), never baked as a body (a trade skipped there)',
    /if \(isFolkSkill\(j\.pose\)\) continue;/.test(er6) && /\.then\(\(n\) => folkSkillPrepare\(\)\.then\(\(\) => n, \(\) => n\)\);/.test(er6)
      && /er\.prewarmFolkBodies\(tw\.folkBakeJobs\(\)\)/.test(src('src/game/worldTrial.js')));
  check('...and destroyed with his figure past the view (v2.3.3809\'s rule), hidden when his figure is (a computer\'s photographs)',
    /display\._folkSkill\.destroy\(\{ children: true \}\);/.test(fs6) && /dropFolkSkill\(display\);/.test(er6) && /if \(!_folkLive\) hideFolkSkill\(display\);/.test(er6));
  check('...his walking figure shown only once he is not at his trade (no visible flipped each frame: TRAPS §218)',
    (er6.match(/if \(!folk\.visible\) folk\.visible = true;/g) || []).length === 1
      && er6.indexOf('if (!folk.visible) folk.visible = true;') > er6.indexOf('if (this._drawFolkSkill(npc, display, look, work, now)) return true;'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
