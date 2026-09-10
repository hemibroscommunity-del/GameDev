/* THE WHOOSH LEADS THE BLADE AND THE HIT LANDS ON IT (v2.3.2450).
 *
 * Owner: "I don't really like one of the two sword sounds and the timing is
 * off.  It plays the sound after the hit so it's delayed ... Need just a
 * whoosh and a hit sound synced upon contact", and then: "add an alternating
 * slight pitch variation."
 *
 * Every claim here is about WHEN a sound starts and WHICH sample it is, so
 * BT_AUDIO.play is wrapped and each call recorded with the time since
 * S.swingTimer.  Wrapping rather than listening to the audio graph is the
 * point: an assertion on a decoded waveform would pass on a sound that plays
 * at the wrong moment, and the wrong moment is the whole report.
 *
 * v2.3.2202 had deferred the whoosh to the contact frame (MELEE_CONTACT_MS =
 * 120ms) so it stacked with the hit.  That is what this file pins against
 * coming back: a whoosh is the blade travelling, so starting it at contact
 * puts its body after the impact.
 */
import * as H from './harness.mjs';

const MELEE_CONTACT_MS = 120;

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__centre = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
});

const spy = (P) => P.page.evaluate(() => {
  const A = window.BT_AUDIO;
  if (!A || A.__spied) return false;
  A.__spied = true;
  window.__sfx = [];
  const orig = A.play.bind(A);
  A.play = function (key, opts) {
    const S = window._gameState && window._gameState.current;
    window.__sfx.push({
      key,
      sinceSwing: (S && S.swingTimer) ? Date.now() - S.swingTimer : null,
      rate: opts && opts.rate != null ? opts.rate : null,
      vol: opts && opts.vol != null ? opts.vol : null,
    });
    return orig(key, opts);
  };
  return true;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const tag = 'swingsfx';
  const P = await H.newPlayer(browser, { name: 'Swinger', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await installTouch(P);
  rec.ok(`${tag}: the audio bus is wrappable (guard)`, await spy(P));

  /* the bank itself -- one whoosh, one hit */
  const bank = await P.page.evaluate(() => ({
    rotation: window.BT_AUDIO.SWING_ROTATION.slice(),
    swingDetune: window.BT_AUDIO.SWING_DETUNE.slice(),
    hitDetune: window.BT_AUDIO.SWORD_HIT_DETUNE.slice(),
  }));
  rec.ok(`${tag}: the swing rotation is ONE sample -- the metallic one is out `
    + `(${bank.rotation.join(', ')})`, bank.rotation.length === 1, bank);
  rec.ok(`${tag}: and it is the whoosh, not the clang`, bank.rotation[0] === 'sword-swing-2', bank);
  rec.ok(`${tag}: the pitch step is a two-entry alternation, not a random wander`,
    bank.swingDetune.length === 2 && bank.hitDetune.length === 2, bank);
  rec.ok(`${tag}: ...and it is SLIGHT -- every step inside 3%`,
    bank.swingDetune.concat(bank.hitDetune).every((r) => Math.abs(r - 1) <= 0.03), bank);

  /* A monster the CLIENT owns and can actually hit.  Same fixture shape as
     mp-rbutton's seedFodder: _serverMonsters false (or the client defers to
     the worker and never swings locally) and every field the sweep reads --
     a stub with four properties produced no swings at all. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    S._serverMonsters = false;
    S.monsters = [{
      id: 'qa-1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 26, y: S.player.y, renderX: S.player.x + 26, renderY: S.player.y,
      spawnX: S.player.x + 26, spawnY: S.player.y, targetX: S.player.x + 26, targetY: S.player.y,
      hp: 500000, curHp: 500000, maxHp: 500000, dmg: 0, level: 1, gold: 0,
      spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    S.lockedTarget = null;
    window.__sfx.length = 0;
  });

  /* HELD, through the real control -- "right button will be held down to auto
     attack".  Poking S.autoAttack directly does not swing: the sweep gates on
     more than that flag, and a first cut of this file that set it produced
     ZERO swings while every `every()` below passed on the empty list.  That
     vacuum is why the guard assertion above counts them. */
  await P.page.evaluate(() => {
    const c = window.__centre('.bt-rjoy-base') || window.__centre('[data-joyzone="R"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 90);
    window.__btHold = c;
  });
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(300);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = S.monsters && S.monsters[0];
      if (m) { m.curHp = 9999; m.hp = 9999; m.alive = true; }   /* it must survive the whole run */
    });
  }
  await P.page.evaluate(() => {
    const c = window.__btHold;
    window.__touch(c.el, 'touchend', c.x, c.y, 90);
  });
  await P.page.waitForTimeout(400);

  const sfx = await P.page.evaluate(() => window.__sfx.slice());
  const swings = sfx.filter((e) => /^sword-swing/.test(e.key));
  const hits = sfx.filter((e) => /^sword-hit/.test(e.key));

  rec.ok(`${tag}: swings actually played (${swings.length})`, swings.length >= 2, swings.slice(0, 4));
  rec.ok(`${tag}: every swing is the whoosh -- the harsh sample never plays`,
    swings.length > 0 && swings.every((e) => e.key === 'sword-swing-2'),
    swings.map((e) => e.key));
  rec.ok(`${tag}: hits landed, and every one is the softer sample`,
    hits.length > 0 && hits.every((e) => e.key === 'sword-hit3'),
    hits.map((e) => e.key));

  /* THE TIMING, which is the report.  A whoosh starting at contact is the bug;
     it has to be underway well before the blade lands. */
  const late = swings.filter((e) => e.sinceSwing != null && e.sinceSwing >= MELEE_CONTACT_MS);
  rec.ok(`${tag}: no whoosh starts at or after the contact frame (${MELEE_CONTACT_MS}ms) -- `
    + `v2.3.2202 started them all exactly there, which is the reported delay`,
    swings.length > 0 && late.length === 0, swings.map((e) => e.sinceSwing));

  {
    const early = hits.filter((e) => e.sinceSwing != null && e.sinceSwing < MELEE_CONTACT_MS - 20);
    rec.ok(`${tag}: the hit lands ON contact, not before it`,
      hits.length > 0 && early.length === 0, hits.map((e) => e.sinceSwing));
  }

  /* the alternation, read off the calls rather than off the table */
  const rates = swings.map((e) => e.rate).filter((r) => r != null);
  rec.ok(`${tag}: each swing carries an explicit rate, so play()'s random pitch is not in charge`,
    swings.length > 0 && rates.length === swings.length, rates);
  if (rates.length >= 2) {
    const distinct = new Set(rates.map((r) => r.toFixed(4)));
    rec.ok(`${tag}: consecutive swings alternate pitch rather than repeating one `
      + `(${[...distinct].join(' / ')})`, distinct.size === 2, rates);
    let alternates = true;
    for (let i = 1; i < rates.length; i++) if (rates[i] === rates[i - 1]) alternates = false;
    rec.ok(`${tag}: ...and it really alternates -- no two in a row are the same`, alternates, rates);
  }

  await P.ctx.close();
}
