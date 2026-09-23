/* Props block attacks (v2.3.2652).
 *
 * Owner: "I would like it if these props could block my and enemy attacks."
 *
 * Two halves are pinned here, and the second is the one that matters:
 *
 *  1. THE GEOMETRY.  A slab test is easy to write and easy to get subtly
 *     wrong at the edges -- a segment that only touches a corner, one that
 *     runs exactly along an edge, one whose endpoint sits inside the box.
 *     Each of those is a real arrangement in play (props are axis-aligned and
 *     monsters walk through them, having no collision on the worker).
 *
 *  2. THE CHOKE POINT.  _monsterStrikePlayer is documented as the ONE place
 *     every monster->player hit funnels through, so the block is applied
 *     there rather than at the four call sites.  This suite asserts the
 *     damage is actually refused through that function, not merely that the
 *     geometry says "blocked" -- a test of the helper alone would pass just
 *     as happily with the call site missing, which is TRAPS §33 exactly.
 *
 * The client/server table mirror is NOT here: mirror-audit.test.mjs owns it,
 * and owns the cross-check that both sides resolve the same lines.
 */
import { GameRoom } from '../src/index.js';
import { attackBlocked, slideMove, ZONE_PROPS } from '../src/props.js';
/* v2.3.2699: the CLIENT's step test, imported the way mirror-audit imports the
   client's tables -- the worker has no moving projectiles, so this is the only
   place a player's arrow and a local slime orb meet a prop. */
import { sweepBlockPoint as cliSweep, attackBlockPoint as cliBlockPoint, zoneBlockers as cliBlockers, boxExitPoint as cliExit } from '../../src/data/worldProps.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* ── 1. geometry ──
   frost-rock-ridge: x 430, y 570, blockW 202, blockD 42
   -> box x 329..531, y 528..570.  Every probe below is quoted against it. */
const RIDGE = ZONE_PROPS.frost.find((p) => p.id === 'frost-rock-ridge');
check('fixture: the rock ridge is where this suite thinks it is',
  !!RIDGE && RIDGE.x === 430 && RIDGE.y === 570 && RIDGE.blockW === 202 && RIDGE.blockD === 42, RIDGE);

check('a line straight through the ridge is blocked',
  attackBlocked('frost', 430, 480, 430, 640) === true);
check('a line that stops short of it is not',
  attackBlocked('frost', 430, 480, 430, 520) === false);
check('a line that passes west of it is not',
  attackBlocked('frost', 300, 480, 300, 640) === false);
check('a line that passes east of it is not',
  attackBlocked('frost', 560, 480, 560, 640) === false);
/* A diagonal that enters the north-west corner and leaves through the south
   edge. BOTH endpoints are outside the box on purpose: (300,500) is west of
   x0=329, (400,600) is south of y1=570. Getting this wrong is easy -- the
   first cut of this probe ended at (360,560), which is INSIDE the ridge, so
   the inside-endpoint rule correctly declined to block and the test was
   asserting the wrong thing. */
check('a diagonal clipping the corner is blocked',
  attackBlocked('frost', 300, 500, 400, 600) === true);
/* ...and one that passes just outside the same corner is not. */
check('a diagonal that misses the corner is not blocked',
  attackBlocked('frost', 280, 440, 320, 480) === false);
/* An endpoint INSIDE never blocks -- monsters have no collision on the
   worker, so one standing in the ridge would otherwise be an invincible
   turret: unanswerable and still able to swing. */
check('a shooter standing inside the ridge is not blocked by it',
  attackBlocked('frost', 430, 550, 430, 700) === false);
check('a target standing inside the ridge is not blocked by it',
  attackBlocked('frost', 430, 700, 430, 550) === false);
/* Degenerate inputs must not throw or block. */
check('a zero-length line blocks nothing',
  attackBlocked('frost', 430, 480, 430, 480) === false);
check('a zone with no props blocks nothing',
  attackBlocked('meadow', 0, 0, 1000, 1000) === false);
check('an unknown zone blocks nothing',
  attackBlocked('__proto__', 0, 0, 1000, 1000) === false);
check('non-finite coordinates block nothing',
  attackBlocked('frost', NaN, 0, 1000, 1000) === false);

/* ── 2. the choke point ── */
const room = new GameRoom(mockState, mockEnv);
const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({
  type: 'join', id: 'p1', name: 'Player', protocolVersion: 2,
  data: { x: 430, y: 640, z: 'frost' },
}));
const ps = room.playerState.p1;
check('fixture: the player joined frost', !!ps && ps.z === 'frost', { z: ps && ps.z });

const snowman = (room.monsters.frost || [])[0];
check('fixture: frost fields a monster', !!snowman, { count: (room.monsters.frost || []).length });

/* Zone-entry grace would swallow the damage regardless and hide a real
   failure, so clear it before measuring anything (TRAPS §33: a test that
   cannot fail asserts nothing). */
ps._graceUntil = 0;
ps.hp = ps.maxHp || 100;

function strikeFrom(x, y) {
  ps.hp = ps.maxHp || 100;
  const before = ps.hp;
  room._monsterStrikePlayer('frost', snowman, 'p1', x, y);
  return before - ps.hp;
}

/* SOUTH of the ridge, same side as the player at y 640: clear line. */
const clearHit = strikeFrom(430, 700);
check('a monster on the same side of the ridge still lands its hit', clearHit > 0, { clearHit });

/* NORTH of the ridge (y 480) against a player at y 640: the line crosses the
   box, so the hit is refused ENTIRELY -- not reduced, not blocked-for-partial. */
const throughRidge = strikeFrom(430, 480);
check('a monster attacking THROUGH the ridge lands nothing', throughRidge === 0, { throughRidge });

/* ...and the refusal is silent: no monster_attack on the wire, matching the
   dodge and the harvester shield. A "0" would be a number the client has to
   explain. */
/* v2.3.2657: read the EVENT BUFFER, not ws.sent.  This assertion used to
   filter ws.sent, which the tick never writes to -- the buffer is flushed on a
   later broadcast -- so it passed whether or not an event was pushed and could
   not fail.  Caught while proving the new ranged assertions non-vacuous: the
   same check further down stayed green with the ball landing for 14 damage. */
room.eventBuffer.length = 0;
strikeFrom(430, 480);
const noisy = room.eventBuffer.filter((e) => e && e.type === 'monster_attack');
check('...and emits no monster_attack event for the blocked swing',
  noisy.length === 0, { buffered: room.eventBuffer.map((e) => e && e.type).filter(Boolean) });

/* The player standing clear of any prop takes damage as before -- the guard
   must not have made every hit a miss. */
ps.x = 900; ps.y = 900;
const openGround = strikeFrom(900, 950);
check('on open ground nothing is blocked', openGround > 0, { openGround });

/* ── 3. monsters stop at props too (v2.3.2653) ──
   The ridge box is x 329..531, y 528..570; slideMove pads by the player's own
   collision half-width (10), so the effective wall is x 319..541, y 518..580. */
{
  const at = (x, y, nx, ny) => slideMove('frost', x, y, nx, ny);

  const straightIn = at(430, 500, 430, 522);
  check('a monster walking straight into the ridge is stopped',
    straightIn.x === 430 && straightIn.y === 500, straightIn);

  const clear = at(430, 480, 430, 490);
  check('...but an unobstructed step is taken in full',
    clear.x === 430 && clear.y === 490, clear);

  /* THE SLIDE is the whole reason this is not a flat refusal: a diagonal into
     the rock face must keep its legal component, or the monster sticks and
     vibrates against the wall for as long as you stand behind it. */
  const diag = at(430, 500, 445, 522);
  check('a diagonal into the face SLIDES along it rather than sticking',
    diag.x === 445 && diag.y === 500, diag);

  /* Past the west end of the ridge (x < 319) the same southward step is legal,
     which is what "walking around it" looks like. */
  const around = at(300, 500, 300, 522);
  check('...and the same step past the end of the ridge is free',
    around.x === 300 && around.y === 522, around);

  /* A monster spawned or leashed INSIDE a footprint must be able to leave;
     trapping it makes a monster you cannot fight. */
  const inside = at(430, 550, 430, 560);
  check('a monster already inside the ridge can still move',
    inside.x === 430 && inside.y === 560, inside);

  /* Zones with no props must not pay for a test they cannot fail. */
  const empty = slideMove('meadow', 0, 0, 10, 10);
  check('a zone with no props takes every move',
    empty.x === 10 && empty.y === 10, empty);
  const unknown = slideMove('__proto__', 0, 0, 10, 10);
  check('an unknown zone takes every move',
    unknown.x === 10 && unknown.y === 10, unknown);
}

/* ── 4. THE THROWN BALL (v2.3.2657) ──
   Owner: "snowmen are still throwing snowballs through the props."  They were.

   Section 2 above drives _monsterStrikePlayer DIRECTLY, passing an attacker
   position -- which faithfully reproduces the two MELEE call sites and passed
   happily while the ranged one was broken, because the ranged caller passes the
   PLAYER's position as atkX/atkY (it must: the event's attacker point has to be
   the impact point to clear the client's 160px guard).  The block there was
   therefore measuring a zero-length line from the player to themselves.

   So this section drives the REAL resolution through _tickMonsters instead of
   calling anything by hand.  That is the whole lesson of the bug: the geometry
   helper was right, the choke point was right for the callers it was written
   against, and the one call site nobody exercised was the one that was wrong.
   TRAPS §33 again, one level up -- a test that reproduces a call site by
   re-typing its arguments is testing your belief about that call site. */
{
  /* Park every frost monster far away so no melee swing can pollute the HP
     measurement; the ball under test carries its own release point and does
     not need the thrower to be anywhere near. */
  for (const mm of (room.monsters.frost || [])) { mm.x = 5000; mm.y = 5000; mm._projImpactAt = 0; }
  const ball = (room.monsters.frost || [])[0];

  /* Throw one, by hand-setting exactly what telegraph.js freezes at release. */
  function throwBall(fromX, fromY, aimX, aimY, opts) {
    ps.x = (opts && opts.px !== undefined) ? opts.px : 430;
    ps.y = (opts && opts.py !== undefined) ? opts.py : 640;
    ps.z = 'frost'; ps.dying = false; ps._graceUntil = 0;
    ps.hp = ps.maxHp || 100;
    ps.blocking = false; ps.shieldEnd = 0;
    const before = ps.hp;
    ball.x = (opts && opts.mx !== undefined) ? opts.mx : 5000;
    ball.y = (opts && opts.my !== undefined) ? opts.my : 5000;
    ball._projImpactAt = Date.now() - 1;      /* already landed */
    ball._projTargetId = 'p1';
    ball._projTx = aimX; ball._projTy = aimY;
    if (fromX === null) { delete ball._projFromX; delete ball._projFromY; }
    else { ball._projFromX = fromX; ball._projFromY = fromY; }
    room._tickMonsters();
    return before - ps.hp;
  }

  /* THE BUG, pinned.  Released north of the ridge, aimed at a player standing
     south of it: the flight line crosses the box. */
  const throughRidge = throwBall(430, 480, 430, 640);
  check('a snowball thrown THROUGH the ridge lands nothing',
    throughRidge === 0, { throughRidge });

  /* ...and the control, or the check above passes for any reason at all. */
  const openGround = throwBall(900, 820, 900, 900, { px: 900, py: 900 });
  check('...while one thrown across open ground still hurts',
    openGround > 0, { openGround });

  /* THE DISCRIMINATING PAIR.  These two are what separate the fix from the bug
     it replaced -- both would pass if the test measured from the thrower's
     CURRENT position, and both fail if it measures from the player's.
     Here the thrower stands in the clear and the ball was released behind the
     ridge: the ball is stopped, because the ball is what has to get through. */
  const releasedBehind = throwBall(430, 480, 430, 640, { mx: 900, my: 900 });
  check('a ball RELEASED behind the ridge is stopped even though the thrower has walked clear',
    releasedBehind === 0, { releasedBehind });

  /* ...and the mirror: released on a clear line, the thrower then wandering
     behind the rock does not retroactively stop a ball already in the air. */
  const wanderedBehind = throwBall(900, 820, 900, 900, { px: 900, py: 900, mx: 430, my: 480 });
  check('...and a ball already in flight is NOT stopped by the thrower wandering behind one',
    wanderedBehind > 0, { wanderedBehind });

  /* The refusal is silent, like the swing's: no monster_attack on the wire. */
  room.eventBuffer.length = 0;
  throwBall(430, 480, 430, 640);
  const noisyBall = room.eventBuffer.filter((e) => e && e.type === 'monster_attack');
  check('...and a ball stopped by a prop emits no monster_attack',
    noisyBall.length === 0, { buffered: room.eventBuffer.map((e) => e && e.type).filter(Boolean) });
  /* ...and the counterpart that makes the line above mean something: an
     UNBLOCKED ball does put one on the buffer, so "no event" is a real
     observation rather than a sink nothing ever reaches. */
  room.eventBuffer.length = 0;
  throwBall(900, 820, 900, 900, { px: 900, py: 900 });
  check('...while a ball that lands DOES emit one (so the check above can fail)',
    room.eventBuffer.some((e) => e && e.type === 'monster_attack'),
    { buffered: room.eventBuffer.map((e) => e && e.type).filter(Boolean) });

  /* A ball in the air across a deploy carries no _projFrom*; it must fall back
     to the thrower rather than throwing on a missing field. */
  const legacyClear = throwBall(null, null, 900, 900, { px: 900, py: 900, mx: 900, my: 820 });
  check('a pre-2657 ball with no release point falls back to the thrower (clear)',
    legacyClear > 0, { legacyClear });
  const legacyBlocked = throwBall(null, null, 430, 640, { mx: 430, my: 480 });
  check('...and is blocked when THAT line crosses the ridge',
    legacyBlocked === 0, { legacyBlocked });
}

/* ── 5. A MOVING PROJECTILE MEETS A PROP (v2.3.2699) ──
   Owner: "The client side isn't showing snowballs bursting upon hitting props
   but is successfully mitigating damage server side."

   Sections 1-4 ask about a WHOLE line, the worker's question, and they were
   right all along -- which is why the damage was stopped.  The client asked a
   different one: each frame's STEP of a projectile in flight, and it asked it
   with the whole-line function, whose endpoint rule skips a box whenever an end
   is inside it.  One frame's step always has an end inside the rock it is
   crossing, so nothing was ever caught.  This section flies a projectile the
   way the simulator does -- in steps, at real speeds -- through every frost
   blocker, which is the shape of use the old tests never exercised. */
{
  const boxes = cliBlockers('frost');
  check('fixture: frost has blockers to fly through', boxes.length >= 5, { n: boxes.length });

  /* Step from well outside a box, through its centre, to well past it. */
  function fly(fn, box, ang, step) {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const L = 300;
    let x = cx - Math.cos(ang) * L, y = cy - Math.sin(ang) * L;
    for (let i = 0; i < (2 * L) / step + 2; i++) {
      const nx = x + Math.cos(ang) * step, ny = y + Math.sin(ang) * step;
      const hit = fn('frost', x, y, nx, ny);
      if (hit) return hit;
      x = nx; y = ny;
    }
    return null;
  }
  /* ON A FACE OF WHICHEVER PROP IT HIT, and strictly inside none.  Not "on the
     box it was aimed at": a flight aimed at a box behind the ridge meets the
     ridge first and must stop THERE -- the nearest blocker wins, the same rule
     the whole-line test has.  The first cut of this check compared against the
     aimed box only and failed three flights that were stopping correctly. */
  const onEdge = (h, b) => (Math.abs(h.x - b.x0) < 0.01 || Math.abs(h.x - b.x1) < 0.01
    || Math.abs(h.y - b.y0) < 0.01 || Math.abs(h.y - b.y1) < 0.01)
    && h.x >= b.x0 - 0.01 && h.x <= b.x1 + 0.01 && h.y >= b.y0 - 0.01 && h.y <= b.y1 + 0.01;
  const strictlyIn = (h, b) => h.x > b.x0 + 0.01 && h.x < b.x1 - 0.01 && h.y > b.y0 + 0.01 && h.y < b.y1 - 0.01;
  const onFace = (h) => h && boxes.some((b) => onEdge(h, b)) && !boxes.some((b) => strictlyIn(h, b));

  /* Speeds from a lobbed snowball (~6px/frame) to the bow's fastest step (48),
     angles on and off the axes -- the probe that found the bug used 4..60. */
  const speeds = [4, 6, 8, 11, 20, 33, 48];
  const angles = [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 4, 2.2, -0.7];
  let sweepMiss = [], oldCaught = 0, total = 0, offFace = [];
  for (const b of boxes) for (const sp of speeds) for (const a of angles) {
    total++;
    const h = cliSweep ? fly(cliSweep, b, a, sp) : null;
    if (!h) sweepMiss.push({ box: [b.x0, b.y0, b.x1, b.y1], sp, a: +a.toFixed(2) });
    else if (!onFace(h)) offFace.push({ h, box: [b.x0, b.y0, b.x1, b.y1] });
    if (fly(cliBlockPoint, b, a, sp)) oldCaught++;
  }
  check(`a projectile flown in steps through every frost prop is caught (${total} flights)`,
    sweepMiss.length === 0, sweepMiss.slice(0, 5));
  check('...and it stops ON the face of the prop it hit, never inside one',
    offFace.length === 0, offFace.slice(0, 3));
  /* THE BUG, pinned so the reason for a second function cannot be lost: the
     whole-line test used per step lets almost every flight through.  If a later
     cleanup "simplifies" the two into one, this is what it has to answer to. */
  check('the WHOLE-LINE test asked per step lets them through -- the v2.3.2652 bug',
    oldCaught < total * 0.2, { oldCaught, total });

  /* A projectile LAUNCHED inside a box (a monster spawned in one) flies out of
     it -- the shooter-inside rule, which is still right for the launch point. */
  const R = boxes.find((b) => b.x0 < 430 && b.x1 > 430 && b.y0 > 500 && b.y1 < 600);
  check('fixture: the rock ridge is among them', !!R, {});
  let esc = null, x = 430, y = (R.y0 + R.y1) / 2;
  for (let i = 0; i < 40 && !esc; i++) { esc = cliSweep('frost', x, y, x, y + 8); y += 8; }
  check('a projectile launched from INSIDE a prop flies out of it', esc === null, { esc });

  /* A clear line is never caught, at any step. */
  let falsePos = null;
  for (const sp of speeds) {
    let cx = 300, cy = 470;
    for (let i = 0; i < 60 && !falsePos; i++) { falsePos = cliSweep('frost', cx, cy, cx, cy + sp); cy += sp; }
  }
  check('a projectile on a clear line is never stopped', falsePos === null, { falsePos });
}

/* ── 6. THE ARROW'S OTHER TWO QUESTIONS (v2.3.2701) ──
   v2.3.2699's arrow stop built the turret the worker's own rule exists to
   prevent: a monster standing inside a footprint could not be shot, and could
   still throw (mp-lockaim caught it).  projectiles.js now lets an arrow INTO a
   box that holds what it is flying at and ends the flight at the box's FAR
   face, and refuses any hit with a rock between the arrow and the monster's
   feet.  The simulator is browser code (mp-propshots flies it); what it leans
   on here is two pieces of geometry, and they are pinned in the same shape as
   section 5 -- every frost prop, several headings. */
{
  const boxes = cliBlockers('frost');
  const onEdge = (h, b) => (Math.abs(h.x - b.x0) < 0.01 || Math.abs(h.x - b.x1) < 0.01
    || Math.abs(h.y - b.y0) < 0.01 || Math.abs(h.y - b.y1) < 0.01)
    && h.x >= b.x0 - 0.01 && h.x <= b.x1 + 0.01 && h.y >= b.y0 - 0.01 && h.y <= b.y1 + 0.01;
  const angles = [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 4, 2.2, -0.7];
  let noBox = [], exitBad = [], n = 0;
  for (const b of boxes) for (const a of angles) {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, L = 300;
    const x0 = cx - Math.cos(a) * L, y0 = cy - Math.sin(a) * L;
    const x1 = cx + Math.cos(a) * L, y1 = cy + Math.sin(a) * L;
    const h = cliSweep('frost', x0, y0, x1, y1);
    if (!h) continue;
    n++;
    /* The box it names is a real blocker, and the hit is on its edge. */
    if (!h.box || boxes.indexOf(h.box) < 0 || !onEdge(h, h.box)) { noBox.push({ h: [h.x, h.y], box: !!h.box }); continue; }
    /* Out the far side: on that box's edge, further along than the way in,
       and no further than the box is across. */
    const e = cliExit(h.box, h.x, h.y, x1, y1);
    const diag = Math.hypot(h.box.x1 - h.box.x0, h.box.y1 - h.box.y0);
    const ok = e && onEdge(e, h.box) && Math.hypot(e.x - h.x, e.y - h.y) <= diag + 0.01
      && ((e.x - h.x) * Math.cos(a) + (e.y - h.y) * Math.sin(a)) > 0;
    if (!ok) exitBad.push({ box: [h.box.x0, h.box.y0, h.box.x1, h.box.y1], a: +a.toFixed(2), e });
  }
  check(`the sweep names the prop it met (${n} flights)`, n > 20 && noBox.length === 0, noBox.slice(0, 3));
  check('...and the way OUT of that prop is on its far side, one box-width on at most',
    exitBad.length === 0, exitBad.slice(0, 3));
  const R = boxes.find((b) => b.x0 < 430 && b.x1 > 430 && b.y0 > 500 && b.y1 < 600);
  check('a step that ends inside the prop has no way out yet',
    cliExit(R, 430, R.y1 + 30, 430, (R.y0 + R.y1) / 2) === null, {});
  /* The guard's own question, on the ridge: from one side of it to feet on the
     other is blocked on BOTH sides -- worker and client -- and to feet INSIDE
     it is not, which is the turret rule. */
  const mid = (R.y0 + R.y1) / 2;
  check('ridge: arrow north of it, feet south of it -- a rock between (worker and client agree)',
    attackBlocked('frost', 430, R.y0 - 40, 430, R.y1 + 10) === true && !!cliBlockPoint('frost', 430, R.y0 - 40, 430, R.y1 + 10), {});
  check('ridge: ...and feet standing IN it are not behind it, on either side',
    attackBlocked('frost', 430, R.y0 - 40, 430, mid) === false && cliBlockPoint('frost', 430, R.y1 + 40, 430, mid) === null, {});
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
