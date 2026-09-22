/* Props block attacks (v2.3.2650).
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
ws.sent.length = 0;
strikeFrom(430, 480);
const noisy = ws.sent.filter((m) => m && m.event === 'monster_attack');
check('...and emits no monster_attack event for the blocked swing',
  noisy.length === 0, { sent: ws.sent.map((m) => m && m.event).filter(Boolean) });

/* The player standing clear of any prop takes damage as before -- the guard
   must not have made every hit a miss. */
ps.x = 900; ps.y = 900;
const openGround = strikeFrom(900, 950);
check('on open ground nothing is blocked', openGround > 0, { openGround });

/* ── 3. monsters stop at props too (v2.3.2651) ──
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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
