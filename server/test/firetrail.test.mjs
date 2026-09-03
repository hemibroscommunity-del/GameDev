/* The fire goblin's fire trail (v2.3.2238; spec docs/specs/fire-trail.md).
 *
 * This is the game's FIRST persistent ground hazard, and that is what the
 * suite is shaped around.  Every other damage source here resolves at an
 * instant and can be pinned with one "did it hit" assertion.  A hazard that
 * outlives its owner, overlaps itself, and burns on a clock of its own has
 * four separate ways to be quietly wrong -- it can burn ground nobody lit,
 * double-dip where two patches overlap, keep burning after you have walked
 * out, or strand itself in a zone forever -- so each is pinned on its own
 * rather than through one end-to-end "standing in fire hurts".
 *
 * The fairness rails from server/src/firetrail.js are pinned as rails: if a
 * future tuning pass moves a number, these fail with the property named,
 * not with a magic constant.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { FIRE_TRAIL } from '../src/firetrail.js';

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

const room = new GameRoom(mockState, mockEnv);
const ws = fakeWs('p');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({
  type: 'join', id: 'p1', name: 'Player', protocolVersion: 2,
  data: { x: 500, y: 500, z: 'ember' },
}));
const ps = room.playerState.p1;

const ember = room._ensureZoneMonsters('ember') || [];
const gob = ember.find((m) => m.variant === 'fireGoblin');
check('fixture: ember fields a fireGoblin', !!gob, { zoneCount: ember.length });

const fireList = () => (room.fireTrails && room.fireTrails.ember) || [];
const fireEvents = () => room.eventBuffer.filter((e) => e.type === 'fire_trail');
const burnHits = () => room.eventBuffer.filter((e) => e.type === 'monster_attack'
  && e.payload.ability === 'firetrail' && e.payload.targetId === 'p1');

/* Park every OTHER ember monster far away and asleep, so nothing but the
   goblin under test can put a monster_attack on the wire. */
function quietZone() {
  for (const m of ember) {
    if (m === gob) continue;
    m.alive = false; m.respawnAt = Number.MAX_SAFE_INTEGER; m.targetId = null;
  }
}
function reset(now) {
  quietZone();
  room.fireTrails.ember = [];
  room._fireBurnAt = Object.create(null);
  gob.alive = true; gob.hp = gob.maxHp; gob.targetId = null;
  gob._ftX = null; gob._ftY = null;
  gob.x = 900; gob.y = 900;                 /* well clear of the player */
  ps.dead = false; ps.dying = false; ps.z = 'ember';
  ps.hp = ps.maxHp; ps.x = 500; ps.y = 500; ps.blocking = false;
  room.eventBuffer.length = 0;
  return now === undefined ? Date.now() : now;
}
/* Put a patch on the ground directly, at a known age.  Used wherever the
   thing under test is the BURN and not the drop -- driving 48px of goblin
   walk to reach every burn assertion would test the mover twice and the
   burn once. */
function lay(x, y, now, opts) {
  const o = opts || {};
  room._zoneFire('ember').push({
    mid: gob.id, x, y,
    armAt: now + (o.arm === undefined ? -1 : o.arm),
    dieAt: now + (o.life === undefined ? FIRE_TRAIL.LIFE_MS : o.life),
  });
}

// ── 1. RAIL 1: he only burns ground he chased you across ──
{
  const now = reset();
  gob.targetId = null;
  gob.x = 900; gob._ftX = 900; gob._ftY = 900;
  gob.x = 900 + FIRE_TRAIL.SPACING_PX * 3;          /* he moved a long way... */
  room._maybeDropFirePatch('ember', gob, now);
  check('rail 1: an untargeted goblin lays nothing however far he walks',
    fireList().length === 0, { patches: fireList().length });

  /* ...and re-acquiring does not retroactively light the ground he covered
     while idle: the first chasing tick anchors, it does not drop. */
  gob.targetId = 'p1';
  room._maybeDropFirePatch('ember', gob, now);
  check('rail 1: the first tick of a chase anchors rather than dropping',
    fireList().length === 0 && gob._ftX === gob.x, { patches: fireList().length, anchor: gob._ftX });
}

// ── 2. Spacing: a patch every SPACING_PX of travel, not before ──
{
  const now = reset();
  gob.targetId = 'p1';
  gob.x = 900; gob.y = 900;
  room._maybeDropFirePatch('ember', gob, now);            /* anchor */
  gob.x = 900 + FIRE_TRAIL.SPACING_PX - 2;                /* just short */
  room._maybeDropFirePatch('ember', gob, now);
  check('spacing: a step shorter than SPACING_PX lays nothing',
    fireList().length === 0, { patches: fireList().length });

  gob.x = 900 + FIRE_TRAIL.SPACING_PX + 2;                /* just over */
  room._maybeDropFirePatch('ember', gob, now);
  check('spacing: crossing SPACING_PX lays one patch',
    fireList().length === 1, { patches: fireList().length });
  check('spacing: ...at the goblin\'s own feet',
    fireList()[0].x === gob.x && fireList()[0].y === gob.y, fireList()[0]);
  check('spacing: ...and announces it on the wire',
    fireEvents().length === 1 && fireEvents()[0].payload.zone === 'ember',
    fireEvents().map((e) => e.payload));
  /* Rule zero: the display event must carry no damage of its own. */
  const p0 = fireEvents()[0].payload;
  check('wire: fire_trail carries no damage field',
    p0.dmg === undefined && p0.dmgTaken === undefined && p0.damage === undefined, p0);
  check('wire: fire_trail states the radius the server will test',
    p0.r === FIRE_TRAIL.RADIUS, p0);

  /* And the next one costs another full SPACING_PX, measured from the new
     anchor -- not from where the chase started. */
  gob.x = 900 + FIRE_TRAIL.SPACING_PX + 2 + (FIRE_TRAIL.SPACING_PX - 4);
  room._maybeDropFirePatch('ember', gob, now);
  check('spacing: the anchor moves with each drop',
    fireList().length === 1, { patches: fireList().length });
}

// ── 3. RAIL 2: a patch is inert while it arms ──
{
  const now = reset();
  lay(ps.x, ps.y, now, { arm: 200 });      /* dropped ON the player, 200ms to arm */
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now + 100);
  check('rail 2: standing on an unarmed patch takes no damage',
    burnHits().length === 0 && ps.hp === ps.maxHp, { hits: burnHits().length, hp: ps.hp });

  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now + 250);
  check('rail 2: ...and it burns the moment it arms',
    burnHits().length === 1, { hits: burnHits().length });
  check('burn: it actually costs health',
    ps.hp < ps.maxHp, { hp: ps.hp, maxHp: ps.maxHp });
}

// ── 4. RAIL 3: the radius on the wire is the radius that burns ──
{
  const now = reset();
  lay(ps.x, ps.y, now);
  /* One pixel outside the ring the client was told about. */
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x + FIRE_TRAIL.RADIUS + 1, y: ps.y }], now);
  check('rail 3: a step outside the drawn radius is safe',
    burnHits().length === 0, { hits: burnHits().length });
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x + FIRE_TRAIL.RADIUS - 1, y: ps.y }], now + 1);
  check('rail 3: ...and one pixel inside it burns',
    burnHits().length === 1, { hits: burnHits().length });
}

// ── 5. RAIL 4: one tick per player per TICK_MS, however many patches ──
{
  const now = reset();
  /* Two patches SPACING_PX apart genuinely overlap (2 x RADIUS > SPACING),
     which is the case per-patch charging would double-dip on.  Assert the
     geometry itself so this test cannot quietly stop covering the overlap
     if the numbers move. */
  check('rail 4 premise: consecutive patches really do overlap',
    2 * FIRE_TRAIL.RADIUS > FIRE_TRAIL.SPACING_PX,
    { radius: FIRE_TRAIL.RADIUS, spacing: FIRE_TRAIL.SPACING_PX });
  lay(ps.x - FIRE_TRAIL.SPACING_PX / 2, ps.y, now);
  lay(ps.x + FIRE_TRAIL.SPACING_PX / 2, ps.y, now);
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now);
  check('rail 4: standing in two overlapping patches charges ONE tick',
    burnHits().length === 1, { hits: burnHits().length });

  const hpAfterFirst = ps.hp;
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now + FIRE_TRAIL.TICK_MS - 50);
  check('rail 4: ...and nothing again before TICK_MS is up',
    ps.hp === hpAfterFirst, { hp: ps.hp, was: hpAfterFirst });
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now + FIRE_TRAIL.TICK_MS + 1);
  check('rail 4: ...then it ticks again',
    ps.hp < hpAfterFirst, { hp: ps.hp, was: hpAfterFirst });
}

// ── 6. Walking out ends it ──
{
  const now = reset();
  lay(ps.x, ps.y, now);
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now);
  const hp1 = ps.hp;
  check('exit: it burned while we stood in it', hp1 < ps.maxHp, { hp: hp1 });
  /* Well clear, well past the cooldown -- so a miss here is the geometry
     and not the rate limit. */
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x + 400, y: ps.y }], now + FIRE_TRAIL.TICK_MS + 1);
  check('exit: walking out stops it', ps.hp === hp1, { hp: ps.hp, was: hp1 });
}

// ── 7. The damage's wire contract with the client's own filters ──
{
  const now = reset();
  const fx = ps.x + 10, fy = ps.y + 6;
  lay(fx, fy, now);
  /* The goblin himself is 400px away and about to be irrelevant. */
  gob.x = ps.x + 400; gob.y = ps.y + 400;
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now);
  const hit = burnHits()[0];
  check('wire: the burn arrives as an authoritative monster_attack', !!hit, {});
  /* v2.3.2235's bypass.  Without it the client drops the number outright:
     the patch is in no monster snapshot under any id the client knows. */
  check('wire: it is stamped ability:firetrail so the client keeps the number',
    hit && hit.payload.ability === 'firetrail', hit && hit.payload);
  check('wire: it carries the authoritative dmgTaken',
    hit && typeof hit.payload.dmgTaken === 'number', hit && hit.payload);
  /* The attacker is the PATCH, not the goblin: the client drops any
     monster_attack whose attacker is more than 160px from where the player
     is now, and the goblin has run off. */
  check('wire: the attacker point is the patch, not the goblin',
    hit && hit.payload.attackerX === fx && hit.payload.attackerY === fy,
    hit && { got: [hit.payload.attackerX, hit.payload.attackerY], patch: [fx, fy], gob: [gob.x, gob.y] });
  check('wire: ...which keeps it inside the client\'s 160px attacker gate',
    hit && Math.hypot(hit.payload.attackerX - ps.x, hit.payload.attackerY - ps.y) <= 160,
    hit && hit.payload);
}

// ── 8. Not blockable, on purpose ──
{
  const now = reset();
  ps.blocking = true;
  ps.ba = 0;                                  /* facing whatever you like */
  lay(ps.x, ps.y, now);
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y, blocking: true }], now);
  const hit = burnHits()[0];
  check('design: a raised shield does not stop the floor',
    !!hit && hit.payload.blocked !== true && ps.hp < ps.maxHp,
    { hit: hit && hit.payload, hp: ps.hp });
  ps.blocking = false;
}

// ── 9. It outlives its owner, and it cleans itself up ──
{
  const now = reset();
  lay(ps.x, ps.y, now, { life: 1000 });
  gob.alive = false;                          /* the goblin is dead */
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now);
  check('lifetime: fire left by a dead goblin still burns',
    burnHits().length === 1, { hits: burnHits().length });
  check('lifetime: ...and is still on the ground before LIFE_MS',
    fireList().length === 1, { patches: fireList().length });
  room._tickFireTrail('ember', [{ id: 'p1', x: ps.x, y: ps.y }], now + 1001);
  check('lifetime: it expires on its own clock',
    fireList().length === 0, { patches: fireList().length });
}

// ── 10. The per-monster cap keeps the trail following him ──
{
  const now = reset();
  gob.targetId = 'p1';
  gob.x = 100; gob.y = 900;
  room._maybeDropFirePatch('ember', gob, now);   /* anchor */
  for (let i = 1; i <= FIRE_TRAIL.MAX_PER_MONSTER + 3; i++) {
    gob.x = 100 + i * (FIRE_TRAIL.SPACING_PX + 1);
    room._maybeDropFirePatch('ember', gob, now);
  }
  check('cap: his trail stops at MAX_PER_MONSTER',
    fireList().length === FIRE_TRAIL.MAX_PER_MONSTER, { patches: fireList().length });
  /* Retiring the OLDEST is the load-bearing half: capping by refusing to
     drop would freeze the trail behind him and leave him running through
     clean ground for the rest of the chase. */
  const newest = fireList().reduce((a, b) => (b.x > a.x ? b : a));
  check('cap: ...by retiring the oldest, so the newest fire is under HIM',
    newest.x === gob.x, { newest: newest.x, gob: gob.x });
}

// ── 11. CLAUDE.md rule 4: the burn clock is keyed by a client-supplied id ──
{
  const now = reset();
  lay(500, 500, now);
  room._fireBurnAt = undefined;                 /* force the lazy init path */
  room._tickFireTrail('ember', [{ id: '__proto__', x: 500, y: 500 }], now);
  check('rule 4: a player id of __proto__ gets a real cooldown entry',
    Object.prototype.hasOwnProperty.call(room._fireBurnAt, '__proto__'),
    { keys: Object.keys(room._fireBurnAt) });
  check('rule 4: ...and does not poison Object.prototype',
    ({}).armAt === undefined && Object.getPrototypeOf(room._fireBurnAt) === null, {});
}

// ── 12. A player arriving mid-chase is shown the ground already alight ──
{
  const now = reset();
  lay(600, 600, now, { life: 2500 });
  lay(660, 600, now, { life: 900 });
  const arriving = fakeWs('late');
  const sent = room._sendFireTrailSnapshot('ember', arriving);
  check('snapshot: an arriving socket is told about both live patches',
    sent === 2 && arriving.sent.length === 2, { sent, got: arriving.sent.length });
  check('snapshot: every replayed patch is a fire_trail event',
    arriving.sent.every((m) => m.type === 'fire_trail'), arriving.sent.map((m) => m.type));
  /* REMAINING life, not full life: a replay that restarted each clock would
     leave the newcomer's fire burning on screen after everyone else's went
     out, and they would route around ground that is already safe. */
  check('snapshot: it replays the REMAINING life, not a fresh one',
    arriving.sent.every((m) => m.payload.ms > 0 && m.payload.ms <= FIRE_TRAIL.LIFE_MS)
    && arriving.sent.some((m) => m.payload.ms < 1000),
    arriving.sent.map((m) => m.payload.ms));
  check('snapshot: replayed patches are already armed',
    arriving.sent.every((m) => m.payload.arm === 0), arriving.sent.map((m) => m.payload.arm));
}

// ── 13. End to end: the hooks are actually wired into the real tick ──
{
  reset();
  /* THE FIXTURE'S ONE HONEST COMPROMISE, stated rather than hidden.  A
     tight loop of _tickMonsters() advances the world 400 steps inside a
     couple of milliseconds of Date.now(), so every WALL-CLOCK freeze the
     AI stamps -- the wind-up (_bwUntil), the post-swing plant
     (_attackingUntil), a telegraphed lunge -- never expires and the goblin
     stands still forever.  That is an artifact of driving 400 ticks with a
     clock that is not moving, not behaviour, and sleeping ~2s of real time
     to dodge it would buy a slower test that flakes under load (this
     session has already been bitten by exactly that).

     So the freezes are released each step.  What that leaves under test is
     precisely what this section is for and what no other section can
     cover: that _tickMonsters CALLS the drop hook against a real chasing
     monster, and that the zone tick CALLS the burn.  The rules those two
     obey are pinned above, deterministically, against the functions
     themselves. */
  gob.x = ps.x + 60; gob.y = ps.y;
  gob.spawnX = gob.x; gob.spawnY = gob.y;
  gob._ftX = null;
  let sawPatch = false;
  for (let i = 0; i < 400 && !sawPatch; i++) {
    /* Retreat, so he has ground to cover: a goblin already in your face
       never moves however long you tick him. */
    ps.x += 3;
    gob._attackingUntil = 0; gob._bwUntil = 0; gob._bwTarget = null;
    gob._tgPhase = null; gob._tgNextAt = Number.MAX_SAFE_INTEGER;
    gob.atkCd = Number.MAX_SAFE_INTEGER;
    room._tickMonsters();
    if (fireList().length > 0) sawPatch = true;
  }
  check('wired: a real _tickMonsters chase lays fire', sawPatch,
    { patches: fireList().length, gobTarget: gob.targetId, gobX: Math.round(gob.x) });
  check('wired: ...and every patch was announced on the wire',
    fireEvents().length >= fireList().length,
    { events: fireEvents().length, patches: fireList().length });

  /* And the zone tick burns through the real entry point too. */
  const f = fireList()[0];
  if (f) {
    f.armAt = 0;
    f.dieAt = Date.now() + 60000;
    room._fireBurnAt = Object.create(null);
    ps.x = f.x; ps.y = f.y; ps.hp = ps.maxHp;
    room.eventBuffer.length = 0;
    room._tickMonsters();
    check('wired: _tickMonsters burns a player standing in a patch',
      burnHits().length >= 1, { hits: burnHits().length });
  } else {
    check('wired: _tickMonsters burns a player standing in a patch', false, 'no patch to stand in');
  }
}

// ── 14. Rule 13: the event is deny-listed ──
{
  check('rule 13: fire_trail is in PRIVILEGED_EVENTS',
    PRIVILEGED_EVENTS.has('fire_trail'), {});
}

// ── 15. Scope: the fire is not friendly fire ──
{
  const now = reset();
  const bystander = ember.find((m) => m !== gob);
  if (bystander) {
    bystander.alive = true; bystander.hp = bystander.maxHp;
    bystander.x = 500; bystander.y = 500;
    lay(500, 500, now);
    room._tickFireTrail('ember', [{ id: 'p1', x: 4000, y: 4000 }], now);
    check('scope: fire does not hurt monsters standing in it',
      bystander.hp === bystander.maxHp, { hp: bystander.hp, maxHp: bystander.maxHp });
    bystander.alive = false;
  } else {
    check('scope: fire does not hurt monsters standing in it', false, 'no bystander in ember');
  }
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
