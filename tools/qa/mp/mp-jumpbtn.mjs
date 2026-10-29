/* ═══ THE JUMP BUTTON, BACK FOR EVERYONE (v2.3.3681) ═══
 *
 * The owner, 2026-10-27: "Also while I'm thinking of it: I want a dedicated
 * button for jumping".  v2.3.3017's button (JumpButton.jsx), centred under the
 * attack disc, is drawn with no address switch now (`?jumpbtn=0` puts it
 * away); a tap on the stick still jumps beside it.
 * v2.3.3712: no longer -- this button (and X) is the only jump; a tap on the
 * stick attacks once (mp-tapattack), so step 4 below adds that a tap on the
 * stick, beside the button, does not jump.
 *
 * In the world's BroTown, against a real worker, on an upright phone (390 x
 * 844), a small one (360 x 640) and a sideways one (844 x 390), with a sword
 * in hand, a Pine Shield worn and a fight on (so Block, Special and, with the
 * guard up, Shield Bash are all drawn):
 *   1. the button is drawn, with nothing in the address;
 *   2. it sits under the attack disc, centred on it (v2.3.3740: upright, LEFT
 *      of it, its foot level with the disc's; v2.3.3799: on the disc's ring,
 *      south-west of it, both ways up), clear of the dashboard and on
 *      the screen;
 *   3. it covers no other control (every button drawn, both discs), with the
 *      guard down and up;
 *   4. a real tap on it jumps -- in the air, one jump more -- and swings
 *      nothing (no swing, no aim);
 * and on the upright phone with `?jumpbtn=0`:
 *   5. no button, and the probe says so;
 *   6. no page errors anywhere.
 * Pictures: tools/qa/mp/out/jumpbtn-<w>x<h>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONES = [
  { width: 390, height: 844, tag: 'upright 390' },
  { width: 360, height: 640, tag: 'small 360' },
  { width: 844, height: 390, tag: 'sideways 844' },
];
const AIR_MS = 1400;   /* ?jumpms= -- a page drawing a few frames a second sees it */

/* every control's box, and what lies over the jump button */
const layout = (P) => P.page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  const jump = document.querySelector('[data-jump]');
  const disc = document.querySelector('.bt-rjoy-base');
  let dash = null;
  for (const s of ['.bt-dashboard', '.bt-bottom-dashboard', '.bt-navrail', '.bt-land-sheet']) {
    const el = document.querySelector(s);
    if (!shown(el)) continue;
    const b = box(el);
    dash = dash ? { l: Math.min(dash.l, b.l), r: Math.max(dash.r, b.r), t: Math.min(dash.t, b.t), b: Math.max(dash.b, b.b) } : b;
  }
  const jb = jump && shown(jump) ? box(jump) : null;
  const over = [];
  if (jb) {
    const all = document.querySelectorAll('button, [role="button"], .bt-rjoy-base, .bt-joystick-base, [data-shield], [data-special], [data-sprint], [data-quickeat], [data-trap-button]');
    for (const q of all) {
      if (q === jump || jump.contains(q) || q.contains(jump) || !shown(q)) continue;
      const c = box(q);
      /* v2.3.3799: a round control is touched by its circle (Jump and the
         disc both are, and Jump stands on the disc's ring now): two round
         ones overlap when their circles do */
      const round = (el, k) => Math.abs((k.r - k.l) - (k.b - k.t)) <= 2 && (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) >= (k.r - k.l) / 2 - 1;
      if (round(jump, jb) && round(q, c)) {
        if (Math.hypot((jb.l + jb.r - c.l - c.r) / 2, (jb.t + jb.b - c.t - c.b) / 2) >= (jb.r - jb.l + c.r - c.l) / 2 - 1) continue;
      }
      if (Math.min(jb.r, c.r) - Math.max(jb.l, c.l) > 1 && Math.min(jb.b, c.b) - Math.max(jb.t, c.t) > 1) {
        over.push((q.getAttribute('data-ability') && 'ability:' + q.getAttribute('data-ability')) || (q.hasAttribute('data-shield') && 'shield') || (q.hasAttribute('data-special') && 'special')
          || (typeof q.className === 'string' && q.className.slice(0, 40)) || q.tagName);
      }
    }
  }
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    jump: jb, disc: disc && shown(disc) ? box(disc) : null, dash, over,
    block: (() => { const q = document.querySelector('[data-shield]'); return shown(q) ? box(q) : null; })(),   /* v2.3.3721 */
    shield: shown(document.querySelector('[data-shield]')), bash: shown(document.querySelector('[data-ability="bash"]')),
    special: shown(document.querySelector('[data-special]')), sprint: shown(document.querySelector('[data-sprint]')),
    probe: window.__btJumpBtn ? window.__btJumpBtn() : null,
  };
});

async function onePhone({ browser, wsPort, webPort, rec, errors, OUT }, ph) {
  const tag = ph.tag;
  const P = await H.newPlayer(browser, { name: 'Hop' + ph.width, wsPort, webPort, viewport: { width: ph.width, height: ph.height }, touch: true, dpr: 2, world: 'wheel', query: 'jumpms=' + AIR_MS });
  P.page.on('pageerror', (e) => errors.push(tag + ': ' + String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok(`${tag}: in the world (guard)`, !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* a sword in hand (Special is drawn only with a weapon) and a Pine Shield
       on the arm (mp-blockface's way) */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => null);
    await H.waitFor(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'sword'), (v) => v, { timeout: 10000, label: 'a sword in the bag' }).catch(() => null);
    await H.equipWeapon(P, 'sword', 'weapon', 'melee');
    await H.devOp(wsPort, 'kit', me, { what: 'shield' });
    const gid = await H.waitFor(P, (S) => { const p = ((S.rpg && S.rpg.shieldStash) || []).find((q) => q && q.gid && /Shield/.test(q.name)); return p ? p.gid : null; },
      (v) => !!v, { timeout: 10000, label: 'the shield in the bag' }).catch(() => null);
    if (gid) {
      await P.page.evaluate((g) => {
        const S = window._gameState.current, R = S.rpg;
        const i = R.shieldStash.findIndex((p) => p && p.gid === g);
        if (R.shield) R.shieldStash.push(R.shield);
        R.shield = R.shieldStash.splice(i, 1)[0];
        S.channel.send({ type: 'shield_wear', payload: { gid: g } });
      }, gid);
    }
    /* a fight on: a blow taken through the game's own handler keeps Block up */
    const blow = () => P.page.evaluate(() => {
      const S = window._gameState.current;
      window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-hop', targetId: S.myId, dmg: 1, dmgTaken: 1, zone: S.currentZone,
        attackerX: S.player.x + 40, attackerY: S.player.y, ability: 'qa' } });
    });
    await blow();
    await H.waitFor(P, () => !!document.querySelector('[data-shield]'), (v) => v, { timeout: 8000, label: 'Block' }).catch(() => null);
    await P.page.waitForTimeout(500);

    /* 1-3, the guard down */
    await blow();
    const a = await layout(P);
    rec.ok(`${tag}: 1. the jump button is drawn with nothing in the address (probe: button ${a.probe && a.probe.button}, shown ${a.probe && a.probe.shown})`,
      !!a.jump && !!a.probe && a.probe.button === true && a.probe.shown === true, a);
    if (!a.jump || !a.disc) return;
    const jcx = (a.jump.l + a.jump.r) / 2, dcx = (a.disc.l + a.disc.r) / 2;
    const clearOfDash = !a.dash || a.jump.b <= a.dash.t || a.jump.r <= a.dash.l || a.jump.l >= a.dash.r;
    const dw = a.disc.r - a.disc.l;
    /* v2.3.3799: on the disc's ring, SOUTH-WEST of it, upright and sideways
       (the owner: "It should be positioned orbiting southwest of the large
       contextual button"; ShieldButton jumpAnchor) */
    const jcy = (a.jump.t + a.jump.b) / 2, dcy = (a.disc.t + a.disc.b) / 2;
    const ang = Math.round(Math.atan2(jcy - dcy, dcx - jcx) * 180 / Math.PI);
    const ring = Math.round(Math.hypot(jcx - dcx, jcy - dcy) - (a.jump.r - a.jump.l) / 2 - dw / 2);
    const sw = a.vw > a.vh ? ang > 0 && ang < 90 : ang >= 25 && ang <= 65;
    rec.ok(`${tag}: 2. on the attack disc's ring, south-west (${ang} deg below west, ${ring} px off the disc's circle), clear of the dashboard (${JSON.stringify(a.dash)}) and on the screen (${JSON.stringify(a.jump)} in ${a.vw} x ${a.vh})`,
      sw && ring >= 8 && ring <= 14 && clearOfDash && a.jump.l >= 0 && a.jump.r <= a.vw && a.jump.t >= 0 && a.jump.b <= a.vh, a);
    /* v2.3.3721: the owner, "the contextual button should shrink in size a bit
       and the jump button made larger": the disc 84 (94 sideways), was 96
       (108); the button 60 (64), was 48 (54); and half a button of air
       between it and Block beside it */
    const jw = a.jump.r - a.jump.l, land = a.vw > a.vh;
    const blk = a.block;
    /* v2.3.3740: upright Block is diagonal BELOW Jump, so the air is up and down.
       v2.3.3799: side by side now, Block left of Jump both ways up */
    const air = blk ? a.jump.l - blk.r : null;
    console.log(`    ${tag}: disc ${dw} px, jump ${jw} px, jump <-> Block ${air} px of air, jump ${a.dash ? a.dash.t - a.jump.b : '?'} px over the dashboard`);
    rec.ok(`${tag}: 2b. the disc is smaller (${dw} px) and the button larger (${jw} px), 8 px or more of air from Block (${air} px)`,
      dw === (land ? 94 : 84) && jw === (land ? 64 : 60) && air != null && air >= 8, { dw, jw, air, block: blk });
    rec.ok(`${tag}: 3. it covers no other control, the guard down (Block ${a.shield}, Special ${a.special}, Sprint ${a.sprint}): ${a.over.length ? a.over.join(', ') : 'none'}`,
      a.over.length === 0 && a.shield, a);

    /* ...and with the guard up (Shield Bash drawn) */
    await blow();
    await P.page.evaluate(() => {
      const b = document.querySelector('[data-shield]');
      if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const up = await H.waitFor(P, () => (document.querySelector('[data-shield]') || {}).getAttribute ? document.querySelector('[data-shield]').getAttribute('data-shield') : null,
      (v) => v === 'up', { timeout: 5000, label: 'the guard up' }).catch(() => null);
    await P.page.waitForTimeout(300);
    const b = await layout(P);
    await P.page.screenshot({ path: join(OUT, `jumpbtn-${ph.width}x${ph.height}.png`) }).catch(() => {});
    rec.ok(`${tag}: 3. ...and the guard up (${up}, Bash ${b.bash}): ${b.over.length ? b.over.join(', ') : 'none'}`, up === 'up' && b.bash && b.over.length === 0, b);

    /* 4. a real tap jumps (the guard goes down with it, as for a roll) */
    const before = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return { count: window.__btJumpBtn().count, swing: S.swingTimer || 0, lock: !!S.lockedTarget };
    });
    const jr = await P.page.evaluate(() => { const r = document.querySelector('[data-jump]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await P.page.touchscreen.tap(jr.x, jr.y);
    const after = await H.waitFor(P, () => {
      const S = window._gameState.current, j = window.__btJumpBtn();
      return { count: j.count, air: j.air, why: j.why, swinging: !!S.isSwinging, swing: S.swingTimer || 0, aiming: !!S._aiming, auto: !!S.autoAttack };
    }, (v) => v.count > before.count, { timeout: 3000, label: 'the jump' }).catch(() => null);
    rec.ok(`${tag}: 4. a real tap on it jumps (${after && after.count - before.count} jump, in the air ${after && after.air}) and swings nothing`,
      !!after && after.count === before.count + 1 && after.air === true && !after.swinging && after.swing === before.swing && !after.aiming && !after.auto, { before, after });
    await H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 4000, label: 'down again' }).catch(() => null);

    /* 4b. v2.3.3712: ...and a real tap on the right stick does not jump: the
       jump is this button's alone now (a tap on the stick attacks once) */
    const sb = await P.page.evaluate(() => window.__btJumpBtn().count);
    const zr = await P.page.evaluate(() => { const r = document.querySelector('[data-joyzone="R"]').getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height * 0.3 }; });
    await P.page.touchscreen.tap(zr.x, zr.y);
    await P.page.waitForTimeout(1200);
    const sa = await P.page.evaluate(() => ({ count: window.__btJumpBtn().count, air: window.__btJumpBtn().air }));
    rec.ok(`${tag}: 4b. a real tap on the right stick does not jump (${sa.count - sb} jumps): the button is the jump`, sa.count === sb && !sa.air, { sb, sa });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  for (const ph of PHONES) await onePhone({ browser, wsPort, webPort, rec, errors, OUT }, ph);

  /* 5. ?jumpbtn=0 puts it away */
  const P = await H.newPlayer(browser, { name: 'NoHop', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel', query: 'jumpbtn=0' });
  P.page.on('pageerror', (e) => errors.push('jumpbtn=0: ' + String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    await P.page.waitForTimeout(800);
    const off = await P.page.evaluate(() => ({ el: !!document.querySelector('[data-jump]'), probe: window.__btJumpBtn ? window.__btJumpBtn() : null }));
    rec.ok(`5. with ?jumpbtn=0 there is no button (${off.el}), and the probe says so (button ${off.probe && off.probe.button})`,
      !!inW && !off.el && !!off.probe && off.probe.button === false && off.probe.shown === false, off);
  } finally {
    await P.ctx.close().catch(() => {});
  }
  rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
}
