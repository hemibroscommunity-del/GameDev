/* ═══ THE BOW'S AIM ARROW (v2.3.2307) ═══
 *
 * Owner: "For bow, during the attack phase show a pointer in the form of an
 * arrow on the right joystick (spanning the whole length of it) that points in
 * the direction you will be firing at."
 *
 * THE ONE ASSERTION THAT MATTERS is the last clause: the arrow must point
 * where the shot GOES. An arrow with its own copy of the aim rules would be
 * right the day it shipped and wrong the next time one rule changed -- which
 * is not hypothetical. v2.3.2254-2262 is exactly that failure: four separate
 * mechanisms fed one 4-way fallback and arrows flew due EAST while every piece
 * looked correct on its own. So this file does not check "an arrow is
 * rotated"; it fires a real shot and compares the arrow's heading against the
 * heading the arrow actually flew on.
 *
 * The SOURCE is checked too, not just the angle: "the lock" and "the last
 * drag" can agree by accident, and a test that cannot tell them apart would
 * pass on a build that had stopped following the lock entirely.
 */
import * as H from './harness.mjs';

/* The touch controls only exist on a phone layout -- on a desktop viewport the
   whole feature is display:none and every assertion here would be vacuous. */
const PHONE = { width: 390, height: 844 };

const arrow = (P) => P.page.evaluate(() => (window.__btAimArrow ? window.__btAimArrow() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  /* ── Melee first: the arrow is a BOW affordance and must not appear ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) {
      S.rpg.activeSlot = 'melee';
      if (!S.rpg.weapon) S.rpg.weapon = { name: 'QA Sword', type: 'sword', gearBase: 'ws_iron', quality: 'normal', tierMult: 1 };
    }
  });
  await P.page.waitForTimeout(500);
  const asMelee = await arrow(P);
  rec.ok('with a sword out, no aim arrow', !!asMelee && !asMelee.shown, asMelee);

  /* ── Switch to the bow ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) {
      S.rpg.activeSlot = 'ranged';
      if (!S.rpg.rangedWeapon) {
        S.rpg.rangedWeapon = { name: 'QA Bow', type: 'bow', gearBase: 'wb_pine', quality: 'normal', tierMult: 1 };
      }
      S._lastAimAngle = 0;
    }
  });
  await P.page.waitForTimeout(600);
  const asBow = await arrow(P);
  rec.ok('with a bow out, the arrow appears', !!asBow && asBow.shown, asBow);
  /* "Spanning the whole length of it" -- its own box, matching the control.
     Measured, not assumed: the disc is border-box with a 2px border, so a
     child of it would be 92 inside a 96 and could never span the control. */
  const discW = await P.page.evaluate(() => {
    const d = document.querySelector('.bt-rjoy-base');
    return d ? Math.round(d.getBoundingClientRect().width) : null;
  });
  rec.ok('...and it spans the whole control, not the inside of its border',
    !!asBow && !!asBow.rect && !!discW && asBow.rect.w >= discW,
    { arrow: asBow && asBow.rect, disc: discW });
  /* TRAPS #42: a CSS filter over the WebGL canvas produces the documented iOS
     "static". The dark edge under the fill is what makes it legible instead. */
  rec.ok('...with no CSS filter on it (iOS static over the canvas)',
    !!asBow && asBow.filter === 'none', asBow && asBow.filter);
  rec.ok('...and it cannot swallow a press', !!asBow && asBow.pe === 'none', asBow && asBow.pe);

  /* ── THE HEADLINE: does it point where the shot goes? ──
     Drive several headings through the same field the aim ladder reads, fire
     for real, and compare the arrow's heading to the ARROW'S OWN flight
     angle. */
  const headings = [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.2];
  const rows = [];
  for (const want of headings) {
    const row = await P.page.evaluate((w) => new Promise((res) => {
      const S = window._gameState && window._gameState.current;
      if (!S) { res(null); return; }
      S.lockedTarget = null;
      S._aiming = false;
      S._aimAngle = null;
      S._lastAimAngle = w;
      S.arrows = [];
      S.autoAttack = true;
      S.swingTimer = 0;
      setTimeout(() => {
        const a = window.__btAimArrow ? window.__btAimArrow() : null;
        const shot = (S.arrows && S.arrows.length) ? S.arrows[S.arrows.length - 1] : null;
        S.autoAttack = false;
        res({ want: +(w * 180 / Math.PI).toFixed(1), arrow: a, shotDeg: shot ? +(shot.ang * 180 / Math.PI).toFixed(1) : null });
      }, 700);
    }), want);
    rows.push(row);
  }
  console.log('    headings: ' + JSON.stringify(rows.map((r) => r && ({ want: r.want, arrow: r.arrow && r.arrow.deg, shot: r.shotDeg, src: r.arrow && r.arrow.src }))));

  const norm = (d) => { let x = ((d + 180) % 360 + 360) % 360 - 180; return x; };
  const fired = rows.filter((r) => r && r.shotDeg !== null);
  rec.ok('the bow actually fired on each heading (guard)', fired.length === headings.length,
    { fired: fired.length, of: headings.length });
  rec.ok('the arrow points where the shot GOES, on every heading',
    fired.length > 0 && fired.every((r) => r.arrow && r.arrow.deg !== null
      && Math.abs(norm(r.arrow.deg - r.shotDeg)) < 2),
    fired.map((r) => ({ arrow: r.arrow && r.arrow.deg, shot: r.shotDeg })));
  /* The rendered rotation must match the published angle -- otherwise the
     number is right and the picture is not. */
  rec.ok('...and the drawn rotation matches the published angle',
    fired.every((r) => r.arrow && r.arrow.transform
      && Math.abs(norm(parseFloat(r.arrow.transform.replace('rotate(', '')) - r.arrow.deg)) < 0.2),
    fired.map((r) => r.arrow && r.arrow.transform));

  /* ── A LOCK MUST WIN, and be seen to ── */
  const locked = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState && window._gameState.current;
    /* Town has no monsters, so lock onto a synthetic one. The ladder only
       reads x/y off the ref (via lockAimPoint), so this exercises the real
       branch rather than a stub of it.
       Due NORTH on purpose: if the lock heading coincided with the stale
       easterly drag below, "it followed the lock" and "it kept the last drag"
       would be the same number and the assertion would prove nothing. */
    const m = { id: 'qa_lock_target', alive: true, x: S.player.x, y: S.player.y - 220, hp: 50, maxHp: 50 };
    if (!Array.isArray(S.monsters)) S.monsters = [];
    S.monsters.push(m);
    S._lastAimAngle = 0;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    setTimeout(() => {
      /* Expected from the arrow's OWN origin -- the bow GRIP, which is offset
         from the player's centre. Asserting against a naive "due north" would
         be off by ~8 degrees and would be measuring the wrong thing: the
         question is whether the arrow points at the lock, not whether the lock
         happens to sit on a cardinal from the player's feet. */
      const ox = S.player.x + (S._bowGripDX || 0);
      const oy = S.player.y + (S._bowGripDY || 0);
      const want = Math.atan2(m.y - oy, m.x - ox) * 180 / Math.PI;
      res({ a: window.__btAimArrow ? window.__btAimArrow() : null, want: +want.toFixed(1) });
    }, 700);
  }));
  rec.ok('a tapped lock takes the arrow over a stale drag, and points AT it',
    !!locked && !!locked.a && locked.a.src === 'lock'
      && Math.abs(norm(locked.a.deg - locked.want)) < 1.5, locked);

  /* ── A raised shield means nothing can fire, so the arrow must not claim
        otherwise ── */
  const shielded = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState && window._gameState.current;
    S._shieldUp = true;
    setTimeout(() => { const a = window.__btAimArrow ? window.__btAimArrow() : null; S._shieldUp = false; res(a); }, 500);
  }));
  rec.ok('a raised shield hides the arrow (nothing can fire)',
    !!shielded && !shielded.shown, shielded);

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/aimarrow.png` }).catch(() => {});
  await P.ctx.close();
}
