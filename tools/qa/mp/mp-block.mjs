/* The shield is DIRECTIONAL, and the cone is the hitbox (v2.3.1705).
 *
 * Owner, asked directly: "yes blocking should be directional."
 *
 * v2.3.1110 unified client and server on an OMNI block and commented out every
 * arc test in the game rather than deleting them — `isAttackInShieldArc` has
 * sat unused in combatHelpers.js ever since.  v2.3.1705 puts the arc back on
 * every block path, at the SAME half-angle the shield cone is drawn at, so
 * what the player sees is what they block.
 *
 * The arc rule itself is pinned server-side by combat-lifecycle.test.mjs (six
 * assertions, including the deploy-order fail-open).  What a unit test CANNOT
 * see is the join between the two halves: whether a real browser actually puts
 * the shield's facing on the wire, and whether the worker stores it.  That is
 * the whole of this scenario, and it is the piece that would silently rot —
 * the worker fails OPEN on a missing facing, so a client that stopped sending
 * it would keep blocking perfectly and simply lose the direction, with nothing
 * anywhere going red.
 *
 * Read from the WORKER (H.adminPlayer .live), never from the client: the
 * client obviously knows which way its own shield points, so asking it would
 * prove nothing at all.
 */
import * as H from './harness.mjs';

const BLOCK_ARC_HALF = Math.PI / 3;   /* mirrors src/data/gameSystems.js */

const live = (wsPort, id) => H.adminPlayer(wsPort, id).then((a) => (a && a.live) || null).catch(() => null);

/* Hold the shield at `ang`, pinned every frame: the game loop drops _shieldUp
   on a number of conditions and the point here is the steady state, not the
   gesture (the gesture is TouchControls' business). */
const holdShield = (P, ang) => P.page.evaluate((a) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.rpg) return false;
  if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
  clearInterval(window.__blockPin);
  window.__blockPin = setInterval(() => {
    S._shieldUp = true;
    S.shieldEnd = Date.now() + 500;
    S._shieldAngle = a;
  }, 16);
  return true;
}, ang);

const dropShield = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  clearInterval(window.__blockPin);
  if (S) { S._shieldUp = false; S.shieldEnd = 0; }
});

/* A move message is what carries the facing, and the client only emits one on
   real input — so walk, don't teleport. */
async function walkABit(P) {
  await P.page.keyboard.down('w');
  await P.page.waitForTimeout(500);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(1200);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bulwark', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);

  /* The mayor's first quest is what hands out the shield (v2.3.1676). */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.shieldStash || []).length, (n) => n > 0,
    { timeout: 20000, label: 'the quest shield arrives' }).catch(() => {});

  const baseline = await live(wsPort, myId);
  rec.ok('the operator view can see this player', !!baseline, baseline);
  rec.ok('a player who is not blocking reports no facing',
    !!baseline && baseline.blocking === false, baseline);

  /* ── the facing reaches the worker ── */
  const EAST = 0;
  rec.ok('the shield could be raised', await holdShield(P, EAST));
  await walkABit(P);
  const east = await live(wsPort, myId);
  rec.ok('the worker sees the shield up', !!east && east.blocking === true, east);
  /* THE JOINT.  A missing facing fails OPEN to the old omni block, so this
     assertion is the only thing standing between "directional" and "quietly
     omnidirectional again". */
  rec.ok('...and knows which way it is pointing',
    !!east && typeof east.ba === 'number' && Math.abs(east.ba - EAST) < 0.2,
    east);

  /* ── turning the shield turns the worker's copy ── */
  const SOUTH = Math.PI / 2;
  await holdShield(P, SOUTH);
  await walkABit(P);
  const south = await live(wsPort, myId);
  rec.ok('turning the shield moves the facing the worker holds',
    !!south && typeof south.ba === 'number' && Math.abs(south.ba - SOUTH) < 0.2,
    south);

  /* ── and the arc the worker will apply to it is the one on screen ── */
  const drawn = await P.page.evaluate(() => (window._gameFns && window._gameFns.BLOCK_ARC_HALF) ?? null);
  rec.ok('the cone is drawn at the same half-angle the block is tested at',
    typeof drawn === 'number' && Math.abs(drawn - Math.PI / 3) < 1e-9,
    { drawn, expected: BLOCK_ARC_HALF });

  /* ── dropping it clears the facing, so a lowered shield can never be read
        as "pointing east and still blocking" ── */
  await dropShield(P);
  await walkABit(P);
  const down = await live(wsPort, myId);
  rec.ok('lowering the shield clears blocking on the worker',
    !!down && down.blocking === false, down);
  rec.ok('...and clears the facing with it', !!down && down.ba === null, down);

  /* ═══ v2.3.1726: A HIT ACTUALLY RESOLVES THROUGH THE ARC ═══
     Everything above proves the facing travels; nothing above ever took a
     hit.  The worker's melee branch is pinned by unit tests now
     (combat-lifecycle drives _tickMonsters directly — that is where the
     v2.3.1705 slim-projection hole lived), so what QA adds is the CLIENT
     half: the local AI's block resolution (monsterCombat.js, via
     isAttackInShieldArc) in a real game loop.  If this drifts from the
     server rule the player sees "Blocked!" while the worker applies damage,
     which is worse than either bug alone.  A monster is INJECTED, not
     travelled to — mp-authority's precedent: a spoke zone makes the sample
     window depend on worker hits, exactly the noise this must be free of. */
  const arcHit = await P.page.evaluate(async () => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg || !S.player) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
    if (!S.rpg.shield) return { __noShield: true };
    const sample = async (ba) => {
      S._serverMonsters = false;
      S.rpg.hp = S.rpg.maxHp || 100;
      S._dodgeRoll = null; S.respawnTimer = 0;
      /* east of the player, inside melee reach — same fixture as mp-authority */
      S.monsters = [{
        id: 'qa_arc_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
        x: S.player.x + 30, y: S.player.y, renderX: S.player.x + 30, renderY: S.player.y,
        spawnX: S.player.x + 30, spawnY: S.player.y, targetX: S.player.x + 30, targetY: S.player.y,
        hp: 500, curHp: 500, maxHp: 500, dmg: 12, level: 1, gold: 0,
        alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
        respawnAt: 0, moveTimer: 0, _stuckArrows: [],
      }];
      clearInterval(window.__blockPin);
      window.__blockPin = setInterval(() => {
        S._shieldUp = true; S.shieldEnd = Date.now() + 500; S._shieldAngle = ba;
      }, 16);
      const before = S.rpg.hp;
      await sleep(4000);           /* clears the 400ms telegraph + several swings */
      const after = S.rpg.hp;
      clearInterval(window.__blockPin);
      S._shieldUp = false; S.shieldEnd = 0; S.monsters = [];
      return { before, after, dropped: before - after };
    };
    const facing = await sample(0);          /* shield east — at the monster */
    const turned = await sample(Math.PI);    /* shield west — monster behind it */
    S.rpg.hp = S.rpg.maxHp || 100;
    return { facing, turned };
  });
  if (arcHit.__no || arcHit.__noShield) {
    rec.skip('client arc resolution', arcHit.__noShield ? 'no shield arrived' : 'no player state');
  } else {
    rec.ok('a swing the shield FACES deals no local damage', arcHit.facing.dropped === 0, arcHit.facing);
    rec.ok('the same swing from BEHIND the shield lands locally', arcHit.turned.dropped > 0, arcHit.turned);
  }

  await P.ctx.close().catch(() => {});
}
