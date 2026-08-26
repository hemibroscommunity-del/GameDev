/* LOCK-ON ACTION BUTTONS (v2.3.1952).
 *
 * Owner: "Tap to lock on monster now gives you shield block, dodge, and special
 * attack as buttons that appear around the right joystick ... Dodge would just
 * move in whatever direction your character is moving.  If no movement dodge
 * button grays out."
 *
 * Driven against a real worker because every one of these three writes combat
 * state that the server sees: blocking goes on the wire as mitigation, dodge
 * spends stamina the worker validates, and special is an attack.  A mocked
 * check would prove the buttons render and nothing about whether they DO
 * anything.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Locker', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  const count = () => P.page.evaluate(() => document.querySelectorAll('[data-lockon]').length);
  const ids = () => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-lockon]'))
    .map((e) => e.getAttribute('data-lockon')));
  const dim = (id) => P.page.evaluate((id) => {
    const e = document.querySelector('[data-lockon="' + id + '"]');
    return e ? +getComputedStyle(e).opacity : null; }, id);

  rec.ok('no lock-on buttons before locking on', (await count()) === 0, await count());


  /* Lock on to something.
     A REAL monster, not a synthetic ref: the first attempt at this scenario
     handed lockedTarget an object that was not in S.monsters, and the game
     dropped the lock within a frame — correctly, since a lock on something
     that does not exist is a lock on nothing.  The buttons then never appeared
     and it read as a broken feature rather than a broken fixture.  Same
     fodder fixture mp-block and mp-authority use, placed due east so the
     shield angle is a known 0. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._serverMonsters = false;
    S.monsters = [{
      id: 'qa_lock_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 40, y: S.player.y, renderX: S.player.x + 40, renderY: S.player.y,
      spawnX: S.player.x + 40, spawnY: S.player.y, targetX: S.player.x + 40, targetY: S.player.y,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: 1, gold: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    S.lockedTarget = { type: 'monster', id: 'qa_lock_1', ref: S.monsters[0] };
  });
  await P.page.waitForTimeout(700);
  rec.ok('the lock is still held (a dropped lock would fail everything below)',
    (await P.page.evaluate(() => !!window._gameState.current.lockedTarget)) === true);
  const got = await ids();
  rec.ok('locking on raises exactly three buttons', got.length === 3, got);
  rec.ok('...block, dodge and special',
    ['block', 'dodge', 'special'].every((k) => got.includes(k)), got);

  /* ── DODGE DIMS WHEN STANDING STILL ── */
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.vx = 0; S.player.vy = 0; });
  await P.page.waitForTimeout(500);
  const still = await dim('dodge');
  rec.ok('dodge is dimmed while standing still', still !== null && still < 0.6, still);
  rec.ok('...while block stays at full strength', (await dim('block')) === 1, await dim('block'));

  /* ── ACTUALLY MOVE, rather than assigning a velocity ──
     The first version of this set S.player.vx directly and the dodge button
     stayed dim.  That was the fixture being wrong, not the button: movement is
     recomputed from the stick every frame, so an assigned velocity is gone
     before the next poll.  The only honest way to be moving is to hold the
     left joystick, which is also the only way a player can. */
  await P.page.evaluate(() => {
    window.__touch = (el, type, x, y, id) => {
      const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
      const end = type === 'touchend' || type === 'touchcancel';
      el.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true,
        touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
      }));
    };
  });
  const holdStick = () => P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="L"]');
    const r = z.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height * 0.7;
    window.__touch(z, 'touchstart', x, y, 11);
    window.__touch(z, 'touchmove', x + 55, y, 11);
  });
  const dropStick = () => P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="L"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchend', r.x + r.width / 2 + 55, r.y + r.height * 0.7, 11);
  });
  await holdStick();
  await P.page.waitForTimeout(700);
  const vel = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { vx: +(S.player.vx || 0).toFixed(3), vy: +(S.player.vy || 0).toFixed(3) };
  });
  rec.ok('holding the left stick actually moves the character',
    Math.abs(vel.vx) > 0.01 || Math.abs(vel.vy) > 0.01, vel);
  const movingOpacity = await dim('dodge');
  rec.ok('dodge lights up once you are moving', movingOpacity === 1, { movingOpacity, vel });

  /* ── DODGE ACTUALLY DODGES, AND IN THE DIRECTION OF TRAVEL ── */
  const before = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { roll: !!S._dodgeRoll, stam: (S.rpg && S.rpg.stamina) || 0 };
  });
  await P.page.evaluate(() => {
    const e = document.querySelector('[data-lockon="dodge"]');
    const r = e.getBoundingClientRect();
    window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 22);
  });
  /* Read it FAST.  A roll is a short window and the first version of this
     looked 300ms later, by which time it had finished and cleared — the
     stamina had already gone, so the dodge plainly happened and the assertion
     was simply watching the wrong instant.  (The field is `angle`, not `ang`.) */
  await P.page.waitForTimeout(90);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { roll: !!S._dodgeRoll, stam: (S.rpg && S.rpg.stamina) || 0,
      angle: S._dodgeRoll ? S._dodgeRoll.angle : null };
  });
  await P.page.waitForTimeout(260);
  const settled = await P.page.evaluate(() => ({ stam: (window._gameState.current.rpg || {}).stamina || 0 }));
  await dropStick();
  rec.ok('the dodge button starts a dodge', after.roll === true, { before, after });
  rec.ok('...in the direction the character was travelling',
    after.angle !== null && Math.abs(after.angle) < 0.6, after.angle);
  rec.ok('...and it spends stamina', settled.stam < before.stam, { before: before.stam, after: settled.stam });

  /* ── STANDING STILL, THE BUTTON DOES NOTHING ── */
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.player.vx = 0; S.player.vy = 0; S._dodgeRoll = null;
  });
  await P.page.waitForTimeout(400);
  const stamBefore = await P.page.evaluate(() => (window._gameState.current.rpg || {}).stamina || 0);
  await P.page.evaluate(() => {
    const e = document.querySelector('[data-lockon="dodge"]');
    const r = e.getBoundingClientRect();
    window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 23);
  });
  await P.page.waitForTimeout(400);
  const stillRolled = await P.page.evaluate(() => !!window._gameState.current._dodgeRoll);
  rec.ok('dimmed dodge is genuinely inert, not just faint', stillRolled === false);
  rec.ok('...and spends nothing',
    (await P.page.evaluate(() => (window._gameState.current.rpg || {}).stamina || 0)) >= stamBefore - 0.001);

  /* ── BLOCK IS A HOLD ── */
  /* Re-seat the fixture first.  The dodge above genuinely moves the character,
     and by the end of it he has travelled far enough that the game drops the
     lock — correctly.  Each behaviour gets a clean board rather than
     inheriting the previous one's wreckage. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = [{
      id: 'qa_lock_b', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 40, y: S.player.y, renderX: S.player.x + 40, renderY: S.player.y,
      spawnX: S.player.x + 40, spawnY: S.player.y, targetX: S.player.x + 40, targetY: S.player.y,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: 1, gold: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    S.lockedTarget = { type: 'monster', id: 'qa_lock_b', ref: S.monsters[0] };
  });
  await P.page.waitForTimeout(500);
  rec.ok('the lock is re-seated for the block test',
    (await P.page.evaluate(() => !!window._gameState.current.lockedTarget)) === true);
  rec.ok('not blocking to begin with',
    (await P.page.evaluate(() => !!window._gameState.current._shieldUp)) === false);
  await P.page.evaluate(() => {
    const e = document.querySelector('[data-lockon="block"]');
    const r = e.getBoundingClientRect();
    window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 33);
  });
  await P.page.waitForTimeout(350);
  const held = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const t = S.lockedTarget && S.lockedTarget.ref;
    /* Compute the expected angle NOW rather than assuming the fixture's
       original placement: the character has moved since, so "due east" stopped
       being true the moment the dodge test drove him across the map. */
    const want = t ? Math.atan2(t.y - S.player.y, t.x - S.player.x) : null;
    return { up: !!S._shieldUp, ang: S._shieldAngle, want: want };
  });
  rec.ok('holding block raises the shield', held.up === true, held);
  /* Compare as ANGLES, wrapping, and with a few degrees of slack: the game
     normalises _shieldAngle into [0,2pi) so a shield facing -0.1 reads back as
     6.18, and the character keeps drifting between the press that computed the
     angle and this read.  The claim being tested is "it points at the target",
     not "it agrees to four decimal places with a moving object". */
  const angGap = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  rec.ok('...pointing at the thing you locked on to',
    held.ang !== null && held.want !== null && angGap(held.ang, held.want) < 0.25,
    Object.assign({ gap: held.ang === null ? null : +angGap(held.ang, held.want).toFixed(3) }, held));
  await P.page.evaluate(() => {
    const e = document.querySelector('[data-lockon="block"]');
    const r = e.getBoundingClientRect();
    window.__touch(e, 'touchend', r.x + r.width / 2, r.y + r.height / 2, 33);
  });
  await P.page.waitForTimeout(350);
  rec.ok('releasing lowers it',
    (await P.page.evaluate(() => !!window._gameState.current._shieldUp)) === false);

  /* ── LOSING THE LOCK TAKES THE BUTTONS AWAY ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.lockedTarget = null; S.monsters = [];
  });
  await P.page.waitForTimeout(500);
  rec.ok('dropping the lock removes the buttons', (await count()) === 0, await count());

  /* ── AND THEY DO NOT STEAL THE JOYSTICK'S TOUCHES ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = [{
      id: 'qa_lock_2', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 40, y: S.player.y, renderX: S.player.x + 40, renderY: S.player.y,
      spawnX: S.player.x + 40, spawnY: S.player.y, targetX: S.player.x + 40, targetY: S.player.y,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: 1, gold: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    S.lockedTarget = { type: 'monster', id: 'qa_lock_2', ref: S.monsters[0] };
    S.autoAttack = false;
  });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => {
    const e = document.querySelector('[data-lockon="special"]');
    const r = e.getBoundingClientRect();
    window.__touch(e, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 44);
  });
  await P.page.waitForTimeout(400);
  rec.ok('a tap on a lock-on button does not also start an auto-attack under it',
    (await P.page.evaluate(() => !!window._gameState.current.autoAttack)) === false);

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-lockon.png' }).catch(() => {});
  const errs = (P.logs || []).filter((l) => /error|uncaught/i.test(l));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
}
