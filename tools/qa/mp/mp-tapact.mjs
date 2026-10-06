/* ═══ THE RIGHT STICK SHOWS WHAT A TAP DOES, AND THE TAP DOES IT (v2.3.3105) ═══
 *
 * The owner: "I'd like the right joystick button to have an icon that
 * represents the action like this current jump, the sword for attack, etc. so
 * maybe chat bubble for speaking, door for entering door if that's a thing
 * etc", "Speaking to NPCs I mean".
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown:
 *   1. at the foot of the bank's steps the stick shows a DOOR, and a tap on
 *      the stick's zone opens the bank -- no jump;
 *   2. beside Ace it shows a speech BUBBLE, and a tap opens his coin flip --
 *      no jump;
 *   3. out on the commons with nothing about, it shows the JUMP arrow and a
 *      tap jumps;
 *   3b. holding the stick to attack the air, it wears the weapon (sword, then
 *      bow) -- never the jump -- and the jump comes back a beat after;
 *   4. while the tap would ATTACK, it wears the weapon in the active slot,
 *      its bag picture -- an iron greatsword, a copper sword, the bow, the
 *      staff, the plain sword picture for an empty melee slot -- and lit, in
 *      a real fight beside a monster (the owner:
 *      "when attacking it should show the weapon type depending on what
 *      weapon is used");
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/tapact-{door,talk,greatsword}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const icon = (P) => P.page.evaluate(() => { const d = document.querySelector('.bt-rjoy-base'); return d ? d.getAttribute('data-ricon') : null; });
const jumps = (P) => P.page.evaluate(() => (window.__btJumpBtn ? window.__btJumpBtn().count : 0));
/* a real finger's tap on the right stick's zone, where it lands */
/* the Mayor's quest offer pops up when you pass him (v2.3.1701) and its scrim
   takes every tap: shut whatever dialog is up, as a player would */
const closeDialogs = async (P) => {
  for (let i = 0; i < 4; i++) {
    const up = await P.page.evaluate(() => { const s = document.querySelector('.bt-npcdlg-scrim'); if (s) s.click(); return !!s; });
    if (!up) return;
    await P.page.waitForTimeout(300);
  }
};
const tapStick = (P, id) => P.page.evaluate((id) => {
  const z = document.querySelector('[data-joyzone="R"]');
  const b = z.getBoundingClientRect();
  const x = b.left + b.width * 0.7, y = b.top + b.height * 0.3;
  const el = document.elementFromPoint(x, y) || z;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
  const S = window._gameState.current; S.autoAttack = false; S._aiming = false;
  return el.tagName + '.' + String(el.className || '').slice(0, 30);
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `tapact-${name}.png`), clip: { x: 150, y: 520, width: 240, height: 260 } }).catch(() => {});
  const P = await H.newPlayer(browser, { name: 'Actbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* a phone, not a keyboard (mp-wheeldoors' habit) */
    await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(900);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
      }
      return false;
    };

    /* ── 1. a door ── */
    let doors = [];
    for (let i = 0; i < 40 && !doors.length; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (!doors.length) await P.page.waitForTimeout(500);
    }
    const bank = doors.find((d) => d.id === 'bank');
    rec.ok('the bank\'s door is known (guard)', !!bank, doors.map((d) => d.id));
    if (bank) {
      await standAt(bank.x, bank.y + 30);
      const at = await H.waitFor(P, (S) => ({ nb: S.nearBuilding, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
        (v) => v.nb != null && v.ic === 'door', { timeout: 8000, label: 'the door picture' }).catch(() => null);
      await shot('door');
      rec.ok(`at the bank's steps the right stick shows a DOOR (${at ? at.ic : await icon(P)})`, !!at, at);
      await closeDialogs(P);
      const j0 = await jumps(P);
      const where = await tapStick(P, 81);
      let panel = null;
      for (let i = 0; i < 12 && !panel; i++) {
        await P.page.waitForTimeout(250);
        panel = await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
      }
      const j1 = await jumps(P);
      rec.ok(`...and a tap on the stick goes in: the bank opens (${panel}), no jump`, !!panel && j1 === j0, { panel, j0, j1, where });
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
      await P.page.waitForTimeout(500);
    }

    /* ── 2. a character: Ace (his coin flip opens only when you speak to him) ── */
    const ace = await P.page.evaluate(() => { const S = window._gameState.current; const n = (S.npcs || []).find((q) => q.name === 'Ace'); return n ? { x: n.x, y: n.y } : null; });
    rec.ok('Ace stands in the Wheel\'s Brotown (guard)', !!ace, ace);
    if (ace) {
      await H.hopTo(P, ace.x + 40, ace.y + 30, { step: 100, gap: 260, tries: 90 });
      const near = await H.waitFor(P, (S) => ({ n: S._nearNpc ? S._nearNpc.name : null, nb: S.nearBuilding, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
        (v) => v.n === 'Ace' && v.ic === 'talk', { timeout: 8000, label: 'the bubble' }).catch(() => null);
      await shot('talk');
      rec.ok(`beside Ace the right stick shows a speech BUBBLE (${near ? near.ic : await icon(P)})`, !!near, near || await H.readState(P, (S) => ({ n: S._nearNpc && S._nearNpc.name, nb: S.nearBuilding })));
      await closeDialogs(P);
      const j0 = await jumps(P);
      await tapStick(P, 82);
      const flip = await H.waitFor(P, () => !!(window.__btAceFlipBus && window.__btAceFlipBus.open), (v) => v, { timeout: 4000, label: 'the flip' }).catch(() => false);
      const j1 = await jumps(P);
      rec.ok(`...and a tap on the stick speaks to him: his coin flip opens, no jump`, !!flip && j1 === j0, { flip, j0, j1 });
      await P.page.evaluate(() => { try { window.__btAceFlipBus && window.__btAceFlipBus.setOpen && window.__btAceFlipBus.setOpen(false); } catch (e) { /* closed anyway */ } });
      await P.page.waitForTimeout(400);
    }

    /* ── 3. nothing about: the jump ── */
    const open = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y + 420 }; });
    await H.hopTo(P, open.x, open.y, { step: 100, gap: 260, tries: 90 });
    const free = await H.waitFor(P, (S) => ({ nb: S.nearBuilding, n: S._nearNpc ? S._nearNpc.name : null, ic: document.querySelector('.bt-rjoy-base').getAttribute('data-ricon') }),
      (v) => v.ic === 'jump', { timeout: 8000, label: 'the jump arrow' }).catch(() => null);
    rec.ok(`with no door and nobody beside you it shows the JUMP arrow (${free ? free.ic : await icon(P)})`, !!free, free);
    await closeDialogs(P);
    const j0 = await jumps(P);
    await tapStick(P, 83);
    const j1 = await jumps(P);
    rec.ok(`...and a tap jumps (${j0} -> ${j1})`, j1 === j0 + 1, { j0, j1 });

    /* ── 3b. the owner, on the preview: "it just showed the new jump ... even
       when attacking".  Hold the stick at nothing, as a swing at the air is:
       the weapon while you attack, the jump again a beat after ── */
    const holdStick = (id, ms) => P.page.evaluate(async ({ id, ms }) => {
      const z = document.querySelector('[data-joyzone="R"]');
      const b = z.getBoundingClientRect();
      const x = b.left + b.width * 0.7, y = b.top + b.height * 0.3;
      const el = document.elementFromPoint(x, y) || z;
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
      const disc = document.querySelector('.bt-rjoy-base');
      el.dispatchEvent(mk('touchstart'));
      const seen = [];
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { await new Promise((r) => setTimeout(r, 100)); seen.push(disc.getAttribute('data-ricon')); }
      el.dispatchEvent(mk('touchend'));
      return { seen, end: disc.getAttribute('data-ricon'), swung: !!window._gameState.current.swingTimer };
    }, { id, ms });
    for (const [slot, w, want] of [
      ['melee', { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 }, 'w-sword-copper'],
      ['ranged', { type: 'bow', name: 'Pine Bow', gearBase: 'pine', dmg: 3 }, 'w-bow'],
    ]) {
      await P.page.evaluate(({ slot, w }) => { const S = window._gameState.current; if (slot === 'melee') S.rpg.weapon = w; else S.rpg.rangedWeapon = w; S.rpg.activeSlot = slot; S.lockedTarget = null; }, { slot, w });
      const ready = await H.waitFor(P, () => document.querySelector('.bt-rjoy-base').getAttribute('data-ricon'), (v) => v === 'jump', { timeout: 6000, label: 'the arrow first' }).catch(() => null);
      const h = await holdStick(84, 1400);
      rec.ok(`holding the stick to attack with the ${w.type}, it wears ${want}, not the jump (${h.end})`, ready === 'jump' && h.end === want, { ready, ...h });
      const back = await H.waitFor(P, () => document.querySelector('.bt-rjoy-base').getAttribute('data-ricon'), (v) => v === 'jump', { timeout: 6000, label: 'the arrow back' }).catch(() => null);
      rec.ok('...and a beat after you stop, the JUMP arrow is back', back === 'jump', back);
      await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
    }

    /* ── 4. an attack wears the weapon ── */
    await P.page.waitForTimeout(800);
    const wear = async (slot, w) => {
      await P.page.evaluate(({ slot, w }) => {
        const S = window._gameState.current;
        if (slot === 'melee') S.rpg.weapon = w; else if (slot === 'ranged') S.rpg.rangedWeapon = w; else S.rpg.staffWeapon = w;
        S.rpg.activeSlot = slot;
        S._rBtnPressUntil = Date.now() + 3000;   /* the disc has a job: the tap attacks */
      }, { slot, w });
      return H.waitFor(P, () => document.querySelector('.bt-rjoy-base').getAttribute('data-ricon'), (v) => v && v !== 'jump', { timeout: 3000, label: 'the attack face' })
        .then(async (ic) => ({ ic, shown: await P.page.evaluate((ic) => { const im = document.querySelector(`.bt-rjoy-icon[data-ricon-img="${ic}"]`); return !!im && getComputedStyle(im).display !== 'none' && im.complete && im.naturalWidth > 0; }, ic) }))
        .catch(() => ({ ic: null, shown: false }));
    };
    const cases = [
      ['melee', { type: 'greatsword', name: 'Iron Greatsword', gearBase: 'iron', dmg: 6 }, 'w-great-sword-iron', 'an iron greatsword'],
      ['melee', { type: 'sword', name: 'Black Steel Sword', gearBase: 'steel', dmg: 8 }, 'w-sword-blacksteel', 'a black steel sword (its tier key is steel)'],
      ['melee', { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 }, 'w-sword-copper', 'a copper sword'],
      ['ranged', { type: 'bow', name: 'Pine Bow', gearBase: 'pine', dmg: 3 }, 'w-bow', 'the bow'],
      ['staff', { type: 'staff', name: 'Oak Staff', gearBase: 'oak', dmg: 3 }, 'w-staff', 'the staff'],
      ['melee', null, 'melee', 'nothing in the melee slot (the plain sword picture)'],
    ];
    for (const [slot, w, want, words] of cases) {
      const got = await wear(slot, w);
      rec.ok(`attacking with ${words}, the stick wears ${want} (${got.ic})`, got.ic === want && got.shown, got);
    }
    await P.page.evaluate(() => { window._gameState.current._rBtnPressUntil = 0; });

    /* ── 4b. and in a real fight: walk up to the nearest monster with the iron
       greatsword in hand -- the disc lights, wearing it ── */
    /* past the Mayor's gate, so the lands are open (wheelCommonsGate) */
    await H.devOp(wsPort, 'quests', myId);
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.weapon = { type: 'greatsword', name: 'Iron Greatsword', gearBase: 'iron', dmg: 6 }; S.rpg.activeSlot = 'melee'; });
    const mon = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null;
      for (const m of (S.monsters || [])) { if (!m || m.alive === false) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (!best || d < best.d) best = { x: m.x, y: m.y, d }; }
      return best;
    });
    rec.ok('a monster to walk up to (guard)', !!mon, mon);
    if (mon) {
      const nearest = () => P.page.evaluate(() => {
        const S = window._gameState.current, p = S.player;
        let best = null;
        for (const m of (S.monsters || [])) { if (!m || m.alive === false) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (!best || d < best.d) best = { x: m.x, y: m.y, d }; }
        return best;
      });
      let fight = null;
      await H.hopTo(P, mon.x + 70, mon.y + 10, { step: 100, gap: 260, tries: 160 });
      for (let k = 0; k < 6 && !fight; k++) {
        const m = await nearest();   /* they wander: keep up */
        if (m && m.d > 90) await H.hopTo(P, m.x + 50, m.y + 10, { step: 100, gap: 260, tries: 20 });
        fight = await H.waitFor(P, () => { const d = document.querySelector('.bt-rjoy-base'); return { ic: d.getAttribute('data-ricon'), st: d.getAttribute('data-rstate') }; },
          (v) => v.ic === 'w-great-sword-iron' && (v.st === 'hot' || v.st === 'lit'), { timeout: 5000, label: 'the lit disc' }).catch(() => null);
      }
      await P.page.screenshot({ path: join(OUT, 'tapact-greatsword.png') }).catch(() => {});
      rec.ok(`beside a monster the lit disc wears the iron greatsword (${fight ? fight.ic + ' / ' + fight.st : 'no'})`, !!fight, fight || { near: await nearest(),
        disc: await P.page.evaluate(() => { const d = document.querySelector('.bt-rjoy-base'), S = window._gameState.current; return { ic: d.getAttribute('data-ricon'), st: d.getAttribute('data-rstate'), live: (S._rBtnLiveUntil || 0) - Date.now(), lock: !!S.lockedTarget, zone: S.currentZone }; }) });
      /* the owner: "when I'm in combat the icon doesn't move to the edge of the
         disc like it does when I'm not in combat" -- a press on the lit disc
         dragged right slides its picture toward the rim, and the release puts
         it back */
      const slide = await P.page.evaluate(async () => {
        const disc = document.querySelector('.bt-rjoy-base'), knob = document.querySelector('.bt-rjoy-knob');
        const b = disc.getBoundingClientRect();
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        const el = document.elementFromPoint(x, y);
        const onDisc = !!el && disc.contains(el);
        const mk = (t, cx) => new TouchEvent(t, { bubbles: true, cancelable: true,
          touches: t === 'touchend' ? [] : [new Touch({ identifier: 91, target: el, clientX: cx, clientY: y })],
          changedTouches: [new Touch({ identifier: 91, target: el, clientX: cx, clientY: y })] });
        const off = () => { const k = knob.getBoundingClientRect(); return Math.round((k.left + k.width / 2) - x); };
        const c0 = off();
        el.dispatchEvent(mk('touchstart', x));
        for (let k = 1; k <= 4; k++) { await new Promise((r) => setTimeout(r, 120)); el.dispatchEvent(mk('touchmove', x + k * 12)); }
        await new Promise((r) => requestAnimationFrame(() => r()));
        const held = off();
        el.dispatchEvent(mk('touchend', x + 48));
        await new Promise((r) => setTimeout(r, 50));
        const after = off();
        const S = window._gameState.current; S.autoAttack = false; S._aiming = false;
        return { onDisc, c0, held, after, max: Math.round(b.width / 2) };
      });
      rec.ok(`...and a press on it dragged right slides the weapon picture toward the rim (${slide.c0} -> ${slide.held} px of ${slide.max}), back to the middle on release (${slide.after})`,
        slide.onDisc && Math.abs(slide.c0) <= 2 && slide.held >= 12 && Math.abs(slide.after) <= 2, slide);
    }

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
