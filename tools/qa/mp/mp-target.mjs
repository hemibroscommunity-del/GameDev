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
  rec.ok('with ONE candidate there are no switch arrows', s.arrows === 0, s);
  await P.page.evaluate(() => window.__tapSel('.bt-rjoy-base', 51));
  await P.page.waitForTimeout(150);
  s = await st(P);
  rec.ok('Attack locks the candidate', s.lock === 'near', s);

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
    S.lockedTarget = { type: 'monster', id: m.id, ref: m };   /* no viaPerimeter — a tap */
  });
  await P.page.waitForTimeout(700);
  s = await st(P);
  rec.ok('a TAPPED lock survives being far outside the perimeter (bow range)',
    s.lock === 'far', s);
  rec.ok('...and the right button is on screen for it, because a lock is held',
    (await P.page.evaluate(() => window.__btDiscVis().R.shown)) === true);
  /* ...and an Attack press with a far tapped lock ATTACKS rather than
     re-engaging: heldMonster() counts a tapped lock at any distance. */
  await P.page.evaluate(() => { const S = window._gameState.current; S.__sw0 = S.swingTimer || 0; });
  await P.page.evaluate(() => window.__tapSel('.bt-rjoy-base', 71));
  await P.page.waitForTimeout(250);
  const swung = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { moved: (S.swingTimer || 0) !== S.__sw0, lock: S.lockedTarget ? S.lockedTarget.id : null };
  });
  rec.ok('...and a press with that lock held ATTACKS (press two), it does not re-engage',
    swung.moved === true && swung.lock === 'far', swung);
  /* The other half of the same rule: a press that finds nothing to engage
     must not throw the tapped lock away. */
  rec.ok('...and the lock is still there after the press', (await st(P)).lock === 'far');
  /* But a PERIMETER lock (made by the press) still drops at range — that rule
     is unchanged, and the assertion above it in this file proves it. */

  /* ── three in range: arrows appear and walk left -> right ── */
  await seed(P, [{ id: 'mid', dx: 60 }, { id: 'left', dx: -120, dy: 10 }, { id: 'right', dx: 150, dy: -10 }]);
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('three candidates in the perimeter', s.cands.length === 3, s);
  rec.ok('with TWO OR MORE candidates the switch arrows are on screen', s.arrows === 2, s);
  await P.page.evaluate(() => window.__tapSel('.bt-rjoy-base', 52));
  await P.page.waitForTimeout(150);
  s = await st(P);
  rec.ok('Attack locks the NEAREST of them (mid, 60px)', s.lock === 'mid', s);
  rec.ok('...and the count pill says which of the three', s.count === '2/3', s);
  /* Geometry: arrows flank the shield button in the band under the disc. */
  const geo = await P.page.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    return { prev: r('[data-target="prev"]'), next: r('[data-target="next"]'), shield: r('[data-shield]'), disc: r('.bt-rjoy-base') };
  });
  rec.ok('the arrows sit beneath the right button, flanking the shield button (◀ shield ▶)',
    !!(geo.prev && geo.next && geo.shield && geo.disc
       && geo.prev.x < geo.shield.x && geo.shield.x < geo.next.x
       && Math.abs(geo.prev.y - geo.shield.y) < 8 && geo.shield.y > geo.disc.y), geo);
  await P.page.evaluate(() => window.__tapSel('[data-target="next"]', 53));
  await P.page.waitForTimeout(150);
  s = await st(P);
  rec.ok('▶ moves the lock to the monster to the RIGHT on screen', s.lock === 'right', s);
  await P.page.evaluate(() => window.__tapSel('[data-target="next"]', 54));
  await P.page.waitForTimeout(150);
  s = await st(P);
  rec.ok('...and wraps round to the leftmost', s.lock === 'left', s);
  await P.page.evaluate(() => window.__tapSel('[data-target="prev"]', 55));
  await P.page.waitForTimeout(150);
  s = await st(P);
  rec.ok('◀ wraps back the other way', s.lock === 'right', s);
  rec.ok('the arrows did not start an auto-attack under them',
    (await P.page.evaluate(() => !!window._gameState.current.autoAttack)) === false);

  /* ── "otherwise the target stays locked": one leaves, the lock is untouched ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'left');
    m.x = S.player.x - 900; m.renderX = m.x;
  });
  await P.page.waitForTimeout(250);
  s = await st(P);
  rec.ok('a different candidate leaving the circle does not move the lock', s.lock === 'right' && s.cands.length === 2, s);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters.find((x) => x.id === 'mid');
    m.x = S.player.x - 900; m.renderX = m.x;
  });
  await P.page.waitForTimeout(400);
  s = await st(P);
  rec.ok('down to one candidate the arrows go away, the lock stays', s.arrows === 0 && s.lock === 'right', s);

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

  /* ── the pile is not a target ── */
  await seed(P, [{ id: 'pile', dx: 70 }]);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters[0]._burPhase = 'pile'; });
  await P.page.waitForTimeout(300);
  s = await st(P);
  rec.ok('an intangible snow pile is not a candidate', s.cands.length === 0, s);

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-target.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
