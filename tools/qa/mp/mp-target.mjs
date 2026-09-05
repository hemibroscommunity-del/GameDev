/* THE TARGETING PERIMETER (v2.3.2243).
 *
 * Owner: "Monsters will have a circular perimeter around them for targeting
 * zone. It'll be same for all weapon types. If multiple monsters in same
 * perimeter there will be arrows above the dashboard on that right side
 * beneath the right button that allows you to switch targets. Otherwise the
 * target stays locked on the same monster."
 *
 * Read off the game state and the DOM: which monsters count as candidates,
 * which one Attack locks, whether the lock survives a target drifting to the
 * edge of the circle (and dies past it), and whether the arrows exist only
 * when there is something to switch between and step in screen-x order.
 *
 * v2.3.2246 adds the other side of that rule: the range test owns only the
 * locks the PERIMETER made.  A lock the canvas tap wrote keeps its old
 * lifetime at any distance -- see the block after the hysteresis assertions.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const PERIM = 220;   /* mirrors TARGET_PERIMETER_PX */

const seed = (P, list) => P.page.evaluate((list) => {
  const S = window._gameState.current;
  S._serverMonsters = false;
  S.monsters = list.map((e) => ({
    id: e.id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + e.dx, y: S.player.y + (e.dy || 0), renderX: S.player.x + e.dx, renderY: S.player.y + (e.dy || 0),
    spawnX: S.player.x + e.dx, spawnY: S.player.y + (e.dy || 0), targetX: S.player.x + e.dx, targetY: S.player.y + (e.dy || 0),
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }));
  S.lockedTarget = null;
}, list);

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  window.__tapSel = (sel, id) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    window.__touch(el, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, id);
    window.__touch(el, 'touchend', r.x + r.width / 2, r.y + r.height / 2, id);
    return true;
  };
});

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return {
    lock: S.lockedTarget ? S.lockedTarget.id : null,
    cands: (S._targetCands || []).map((c) => c.m.id),
    arrows: document.querySelectorAll('[data-target="prev"],[data-target="next"]').length,
    count: (document.querySelector('[data-target="count"]') || {}).textContent || null,
    droppedWhy: S._lockDroppedWhy || null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Picker', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await installTouch(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    /* A shield too: the geometry check below places the arrows relative
       to the SHIELD button, which only renders with a shield equipped. */
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
  });

  /* ── one in range, one out ── */
  await seed(P, [{ id: 'near', dx: 80 }, { id: 'far', dx: PERIM + 120 }]);
  await P.page.waitForTimeout(400);
  let s = await st(P);
  rec.ok('a monster inside the perimeter is a candidate; one outside is not',
    s.cands.length === 1 && s.cands[0] === 'near', s);
  /* v2.3.2251: the switch arrows are deleted along with target cycling -- the
     target is always the nearest and a tap is the only way to override it, so
     there is nothing to step through.  What the arrows' absence proves now is
     simply that nothing draws them. */
  rec.ok('no switch arrows exist any more', s.arrows === 0, s);
  rec.ok('the candidate is targeted automatically, with no press', s.lock === 'near', s);

  /* ── the lock HOLDS at the edge (hysteresis), and drops past it ── */
  await P.page.evaluate((PERIM) => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'near');
    m.x = S.player.x + PERIM + 30; m.renderX = m.x;   /* just outside the circle, inside the 1.25x ring */
  }, PERIM);
  await P.page.waitForTimeout(250);
  s = await st(P);
  rec.ok('a locked monster drifting just past the circle STAYS locked (hysteresis)',
    s.lock === 'near' && s.cands.length === 0, s);
  await P.page.evaluate((PERIM) => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'near');
    m.x = S.player.x + PERIM * 1.25 + 40; m.renderX = m.x;
  }, PERIM);
  await P.page.waitForTimeout(250);
  s = await st(P);
  rec.ok('...and past the hysteresis ring the lock drops', s.lock === null && s.droppedWhy === 'range', s);

  /* ── v2.3.2246: the range rule owns only the locks IT made ──
     §5.1 of the spec always said a TAPPED lock outside the perimeter is left
     alone by the persistence rule.  The code did not do that: updateTargeting
     cleared any monster lock outside the ring, however it was made, so
     tap-to-lock silently stopped working past 275px.  A bow plants at 675px
     (1350 with Longshot), so locking a distant monster and sniping it -- which
     worked before v2.3.2243 -- dropped the lock on the very next frame.  It
     went unnoticed while the button swung at air regardless; with the button
     hidden unless it can do something (v2.3.2246), a tapped lock is the ONLY
     way to engage anything past the perimeter, so it has to stick. */
  await seed(P, [{ id: 'far', dx: 620 }]);
  await P.page.waitForTimeout(350);
  s = await st(P);
  rec.ok('guard: a monster 620px away is not a candidate (way outside the 220px perimeter)',
    s.cands.length === 0 && s.lock === null, s);
  /* Lock it the way a player does: tap it on the canvas.  Driven through the
     state the tap writes, because a synthetic canvas click at 620px would
     land off screen on a 390px phone. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'far');
    /* v2.3.2251: `src: 'tap'` is the marker now (it replaced viaPerimeter, with
       the polarity flipped: the AUTO locks are the marked ones by default and
       the tap is the exception the range rule must not touch). */
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(700);
  s = await st(P);
  rec.ok('a TAPPED lock survives being far outside the perimeter (bow range)',
    s.lock === 'far', s);
  rec.ok('...and the right button is on screen for it, because a lock is held',
    (await P.page.evaluate(() => window.__btDiscVis().R.shown)) === true);
  /* ...and an Attack press with a far tapped lock ATTACKS.  v2.3.2251: this
     used to be "press two", the second half of the engage/attack pair; with
     one press it is simply what the button does, and the point that survives
     is that the press does not steal the lock back to something nearer. */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__sw0 = S.swingTimer || 0; });
  await P.page.evaluate(() => window.__tapSel('.bt-rjoy-base', 71));
  await P.page.waitForTimeout(250);
  const swung = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { moved: (S.swingTimer || 0) !== S.__sw0, lock: S.lockedTarget ? S.lockedTarget.id : null };
  });
  rec.ok('...and a press ATTACKS without stealing the lock back to something nearer',
    swung.moved === true && swung.lock === 'far', swung);
  /* The other half of the same rule: a press that finds nothing to engage
     must not throw the tapped lock away. */
  rec.ok('...and the lock is still there after the press', (await st(P)).lock === 'far');
  /* But a PERIMETER lock (made by the press) still drops at range — that rule
     is unchanged, and the assertion above it in this file proves it. */

  /* ── ═══ v2.3.2251: THREE IN RANGE, AND THE NEAREST WINS ═══ ──
     This section used to prove the switch arrows: three candidates, arrows on
     screen, a count pill, and ◀ ▶ walking the lock in screen-x order with a
     wrap.  All of it is deleted with the arrows (owner: "always be nearest
     enemy.  Only way to pick target and lock it on is to tap on the monster"),
     so what is asserted instead is the rule that replaced them -- and the two
     halves that are easy to get wrong: the nearest is picked with no input at
     all, and a TAP overrides it and then holds against the nearest rule. ── */
  /* ═══ v2.3.2273: LAND THE DASH BEFORE MEASURING FROM WHERE HE STANDS ═══
     This section failed for a reason that had nothing to do with the rule it
     tests, and the failure looked exactly like a broken rule: candidates came
     back ["right","mid"] -- not nearest-first, and missing "left" entirely.
     The cause is the press above.  An Attack press on a tapped lock 620px away
     is a SWORD DASH, and it was still in flight when `seed` ran, so the three
     monsters were placed relative to a player who then slid ~130px east out
     from under them.  Recomputed from that: mid 60 -> 70px, right 150 -> 20px,
     left -120 -> 250px and outside the 220px perimeter.  Which is the observed
     list, in the observed order.  The rule was right the whole time.
     TRAPS §44, in its usual costume: a value asked about a past event while it
     is still moving.  So: cancel the dash, let the frame settle, THEN seed. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._bashDash = null;
    S._abilitySwingUntil = 0;
    S.autoAttack = false;
    S.lockedTarget = null;
    S.monsters = [];
  });
  await P.page.waitForTimeout(300);
  await seed(P, [{ id: 'mid', dx: 60 }, { id: 'left', dx: -120, dy: 10 }, { id: 'right', dx: 150, dy: -10 }]);
  /* And prove the premise rather than assuming it: if the player is still
     drifting, every assertion below is measuring the wrong distances and
     should say so in those words instead of blaming the nearest rule. */
  const _p0 = await P.page.evaluate(() => {
    const S = window._gameState.current; return { x: S.player.x, y: S.player.y };
  });
  await P.page.waitForTimeout(400);
  const _p1 = await P.page.evaluate(() => {
    const S = window._gameState.current; return { x: S.player.x, y: S.player.y };
  });
  rec.ok('the player is standing still, so the seeded distances are real (guard)',
    Math.abs(_p1.x - _p0.x) < 4 && Math.abs(_p1.y - _p0.y) < 4, { _p0, _p1 });
  s = await st(P);
  rec.ok('three candidates in the perimeter', s.cands.length === 3, s);
  rec.ok('the NEAREST of the three is targeted automatically (mid, 60px)', s.lock === 'mid', s);
  rec.ok('...with no arrows and no pill to do it', s.arrows === 0 && s.count === null, s);
  /* Tap the FAR one: the deliberate pick has to beat the nearest rule, and
     keep beating it while a nearer monster is still standing there. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'right');
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(500);
  s = await st(P);
  rec.ok('tapping a further monster overrides the nearest rule', s.lock === 'right', s);
  rec.ok('...and it KEEPS overriding it while a nearer one is in range',
    s.lock === 'right' && s.cands.length === 3, s);
  /* Releasing a tap returns you to the automatic rule rather than to nothing:
     tapping the same monster again clears it, and the next frame re-acquires. */
  await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('releasing the tapped lock hands the target back to the nearest rule', s.lock === 'mid', s);
  /* Re-tap 'right' so the sections below, which were written against a lock
     on 'right', keep their premise. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'right');
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(300);

  /* ── "otherwise the target stays locked": one leaves, the lock is untouched ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'left');
    m.x = S.player.x - 900; m.renderX = m.x;
  });
  await P.page.waitForTimeout(250);
  s = await st(P);
  rec.ok('a different candidate leaving the circle does not move the tapped lock', s.lock === 'right' && s.cands.length === 2, s);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'mid');
    m.x = S.player.x - 900; m.renderX = m.x;
  });
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('down to one candidate the tapped lock still stands', s.arrows === 0 && s.lock === 'right', s);

  /* ── the locked one dies: lock drops ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'right');
    /* respawnAt is not optional on a client-driven (town) fixture: the local
       loop respawns a dead monster whose respawnAt has passed, and 0 has
       passed -- the first cut of this saw it back alive within the frame. */
    m.alive = false; m.curHp = 0; m.respawnAt = Date.now() + 60000;
  });
  await P.page.waitForTimeout(250);
  s = await st(P);
  rec.ok('the locked monster dying drops the lock', s.lock === null, s);

  /* ── the pile cannot be PICKED UP, but it can be KEPT ──
     v2.3.2252, owner: "make the character keep his targeting on the snowman
     even during burrow because you're still in active combat with him you just
     can't damage him.  Makes it hard to use shield against him when auto
     targeting of the monster drops."
     Both halves matter and they pull opposite ways, so both are asserted: a
     mound must never STEAL the target off a live monster (it cannot be hit),
     and it must never LOSE the target it already had (the shield is pointed at
     it, and he is about to surface underneath you). ── */
  await seed(P, [{ id: 'pile', dx: 70 }]);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters[0]._burPhase = 'pile'; });
  await P.page.waitForTimeout(300);
  s = await st(P);
  rec.ok('an intangible snow pile is not a candidate', s.cands.length === 0, s);
  /* Clear the lock first: `seed` puts him down LIVE, so the automatic rule
     acquires him a frame before he burrows -- and keeping that is the other
     half of this change.  What must not happen is a fresh acquisition once he
     is already a mound. */
  await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('...and once released, a mound is never picked up as a NEW target',
    s.lock === null, s);
  /* Now the case the owner hit: he was ALREADY your target when he burrowed. */
  await seed(P, [{ id: 'snowman', dx: 70 }]);
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('guard: the snowman is targeted before he burrows', s.lock === 'snowman', s);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters[0]._burPhase = 'pile'; });
  await P.page.waitForTimeout(500);
  s = await st(P);
  rec.ok('the target STAYS on him while he is burrowed, so the shield keeps facing him',
    s.lock === 'snowman', s);
  rec.ok('...even though he has left the candidate list (he cannot be hit)',
    s.cands.length === 0, s);
  /* And he is released normally when he actually dies mid-pile. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    m.alive = false; m.curHp = 0; m.respawnAt = Date.now() + 60000;
  });
  await P.page.waitForTimeout(300);
  s = await st(P);
  rec.ok('...but dying still drops it, burrowed or not', s.lock === null, s);

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-target.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
