/* ═══ THE SHIELD GOES DOWN WHEN THE WORKER BREAKS IT (v2.3.6554, card CT part 20) ═══
 *
 * The owner, 2026-11-25, on an iPhone in the world: "shield isn't working
 * correctly during combat it stays like it's showing up even when the energy
 * has been exhausted and you take damage. Maybe just a sprite issue."
 *
 * The worker breaks the guard when your stamina reaches 0 with the shield up
 * (index.js _tickPlayerRegen, hits.js _hitStopped: moveclaims.js _guardTo
 * 'break', a 3 s latch); its only word to the phone is the stamina, 0.  The
 * phone's own drop at zero sat behind BroTown's BLOCK_COSTS_STAMINA, false on
 * purpose, so the body kept its shield, the button stayed lit, and the blows
 * landed in full (src/game/guardBreak.js).
 *
 * On a phone in the world, a Pine Shield on the arm, beside a real monster of
 * the Wheel, for the default controls and for the two buttons (`manual=5`):
 *   1. the Block button raises the shield, and the worker holds it up;
 *   2. stamina set to 3 (the admin road), the worker's held-shield drain
 *      breaks the guard: (a) the worker says blocking false, its stamina 0
 *      or refilling;
 *   3. (c) the phone follows: its shield down (S._shieldUp, the one field the
 *      body's drawing reads: entityRenderer's `isShielding`) and the button
 *      unlit (`data-shield="down"`), on its cooldown face, within the worker's
 *      3 s latch -- on main both stayed up (the owner's report);
 *   4. a tap in the latch raises nothing, on the phone or the worker;
 *   5. (b) a blow in those seconds: the damage the worker took is recorded
 *      (the monster swings when it will: a run with no blow says so; on the
 *      test box the wandering monster stayed 270+ px off and never swung, so
 *      the worker's side -- the latch refuses a raise, a blow reads only
 *      ps.blocking -- is held by the server's guard-door and shield-guard
 *      suites, not here);
 *   6. after the latch a tap raises it again, on the phone and the worker;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs shielddrop
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

const PHONE_SHIELD = () => {
  const S = window._gameState.current, b = document.querySelector('[data-shield]');
  return { up: !!S._shieldUp, btn: b ? b.getAttribute('data-shield') : null,
    cd: !!(S._shieldCdUntil && Date.now() < S._shieldCdUntil), why: S._shieldDroppedWhy || null,
    st: S.rpg ? S.rpg.stamina : null, hp: S.rpg ? S.rpg.hp : null };
};
const tapBlock = (P) => P.page.evaluate(() => { const b = document.querySelector('[data-shield]'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); return !!b; });
const srv = async (wsPort, id) => { const v = await H.serverPlayer(wsPort, id).catch(() => null); return v ? { blocking: !!v.blocking, st: v.stamina, hp: v.hp } : null; };
async function srvUntil(wsPort, id, pred, ms) {
  const t0 = Date.now(); let v = null;
  while (Date.now() - t0 < ms) { v = await srv(wsPort, id); if (v && pred(v)) return v; await new Promise((r) => setTimeout(r, 120)); }
  return null;
}

async function pass(browser, { wsPort, webPort, rec, label, query }) {
  const P = await H.newPlayer(browser, { name: label === 'default' ? 'Droppy' : 'Dropfive', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok(`${label}: in the world (guard)`, !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* a Pine Shield on the arm, as the bag's Equip wears it (mp-blockface) */
    await H.devOp(wsPort, 'kit', me, { what: 'shield' });
    const gid = await H.waitFor(P, (S) => { const p = ((S.rpg && S.rpg.shieldStash) || []).find((q) => q && q.gid && /Shield/.test(q.name)); return p ? p.gid : null; },
      (v) => !!v, { timeout: 10000, label: 'the shield in the bag' }).catch(() => null);
    rec.ok(`${label}: a shield in the bag (guard)`, !!gid, gid);
    if (!gid) return;
    await P.page.evaluate((g) => {
      const S = window._gameState.current, R = S.rpg;
      const i = R.shieldStash.findIndex((p) => p && p.gid === g);
      if (R.shield) R.shieldStash.push(R.shield);
      R.shield = R.shieldStash.splice(i, 1)[0];
      S.channel.send({ type: 'shield_wear', payload: { gid: g } });
    }, gid);
    /* beside the nearest live monster of the Wheel (the arrival's whole list: wheelwhole) */
    const mon = await H.waitFor(P, (S) => {
      const live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp > 0 || m.curHp == null) && typeof m.x === 'number');
      let best = null, bd = 1e9;
      for (const m of live) { const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
      return best ? { id: String(best.id), x: best.x, y: best.y, d: Math.round(bd) } : null;
    }, (v) => !!v, { timeout: 20000, label: 'a monster of the Wheel' }).catch(() => null);
    rec.ok(`${label}: a real monster of the Wheel (${mon && mon.id}, ${mon && mon.d} px) (guard)`, !!mon, mon);
    if (!mon) return;
    await P.page.evaluate((id) => { window.__qaMon = id; }, mon.id);
    /* the monster wanders: hop to where it is now, a few times, until beside it */
    let near = null;
    for (let k = 0; k < 4; k++) {
      near = await H.readState(P, (S) => { const m = (S.monsters || []).find((x) => x && String(x.id) === window.__qaMon); return m ? { x: m.x, y: m.y, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) } : null; }).catch(() => null);
      if (!near || near.d < 70) break;
      await H.hopTo(P, near.x - 34, near.y);
    }
    /* a note, not a guard: a Wheel monster wanders, and on this box the hops
       ended 270-364 px off it (the first runs); the steps below need only
       the Block button, which a monster in the perimeter draws */
    rec.ok(`${label}: near the monster (${near && near.d} px) (note)`, true, near);
    const btn = await H.waitFor(P, () => { const b = document.querySelector('[data-shield]'); return b ? b.getAttribute('data-shield') : null; },
      (v) => v === 'down', { timeout: 20000, label: 'the Block button beside the monster' }).catch(() => null);
    rec.ok(`${label}: beside the monster the Block button is drawn (guard)`, btn === 'down', btn);
    if (btn !== 'down') return;

    /* the monster at work first (a blow on the worker, up to 15 s), so one
       is likely in the latch; then the bar full again */
    const hpA = (await srv(wsPort, me) || {}).hp;
    const fight = await srvUntil(wsPort, me, (v) => typeof hpA === 'number' && v.hp < hpA, 15000);
    rec.ok(`${label}: the monster swings at you (${fight ? hpA + ' -> ' + fight.hp : 'no blow in 15 s'}) (note)`, true, fight);
    await H.devOp(wsPort, 'vitals', me, { heal: true });

    /* 1. raise */
    await tapBlock(P);
    const up = await H.waitFor(P, PHONE_SHIELD, (v) => v.up && v.btn === 'up', { timeout: 8000, label: 'the shield up' }).catch(() => null);
    const sUp = await srvUntil(wsPort, me, (v) => v.blocking, 10000);
    rec.ok(`${label} 1. the Block button raises the shield (phone ${up && up.btn}), the worker holds it up (${sUp && sUp.blocking})`, !!up && !!sUp, { up, sUp });
    if (!up || !sUp) return;

    /* 2. the stamina runs out on the worker */
    await H.devOp(wsPort, 'vitals', me, { heal: false, stamina: 3 });
    const hp0 = (await srv(wsPort, me) || {}).hp;
    const brk = await srvUntil(wsPort, me, (v) => !v.blocking, 10000);
    const tBreak = Date.now();
    rec.ok(`${label} 2a. the worker breaks the guard at 0 stamina (blocking ${brk && brk.blocking}, stamina ${brk && brk.st})`, !!brk && !brk.blocking, brk);
    if (!brk) return;

    /* 3. the phone follows, inside the worker's latch */
    const down = await H.waitFor(P, PHONE_SHIELD, (v) => !v.up && v.btn === 'down', { timeout: 2600, label: 'the phone\'s shield down' }).catch(() => null);
    const seen = await H.readState(P, PHONE_SHIELD);
    rec.ok(`${label} 3c. the phone's shield goes DOWN with the worker's: the body's (${seen.up ? 'up' : 'down'}) and the button (${seen.btn}), on its cooldown (${seen.cd}), why ${seen.why}`,
      !!down && !seen.up && seen.btn === 'down' && seen.cd && seen.why === 'stamina', { down, seen, msSinceBreak: Date.now() - tBreak });

    /* 4. a tap inside the latch raises nothing */
    if (Date.now() - tBreak < 2400) {
      await tapBlock(P);
      await P.page.waitForTimeout(300);
      const t = await H.readState(P, PHONE_SHIELD), s4 = await srv(wsPort, me);
      rec.ok(`${label} 4. a tap inside the 3 s latch raises nothing (phone ${t.up ? 'up' : 'down'}, worker ${s4 && s4.blocking})`, !t.up && t.btn === 'down' && !!s4 && !s4.blocking, { t, s4 });
    }

    /* 5. a blow in the latch: the damage the worker took */
    let hit = null;
    while (Date.now() - tBreak < 2900) {
      const v = await srv(wsPort, me);
      if (v && typeof hp0 === 'number' && v.hp < hp0) { hit = { hp0, hp: v.hp, dmg: hp0 - v.hp, blocking: v.blocking }; break; }
      await new Promise((r) => setTimeout(r, 120));
    }
    const ph5 = await H.readState(P, PHONE_SHIELD);
    rec.ok(`${label} 5b. ${hit ? `a blow in the latch took ${hit.dmg} hp (worker guard ${hit.blocking ? 'up' : 'down'}), the phone's shield ${ph5.up ? 'UP' : 'down'}` : 'no blow in the latch (the monster did not swing)'}`,
      !hit || (!hit.blocking && !ph5.up), { hit, ph5 });

    /* 6. after the latch a tap raises it again */
    await H.devOp(wsPort, 'vitals', me, { heal: true });
    await H.waitFor(P, PHONE_SHIELD, (v) => !v.cd && typeof v.st === 'number' && v.st > 50, { timeout: 15000, label: 'the latch over, the bar back' }).catch(() => null);
    await tapBlock(P);
    const up2 = await H.waitFor(P, PHONE_SHIELD, (v) => v.up && v.btn === 'up', { timeout: 8000, label: 'the shield up again' }).catch(() => null);
    const sUp2 = await srvUntil(wsPort, me, (v) => v.blocking, 10000);
    rec.ok(`${label} 6. after the latch a tap raises it again (phone ${up2 && up2.btn}, worker ${sUp2 && sUp2.blocking})`, !!up2 && !!sUp2, { up2, sUp2 });
    await tapBlock(P);
    rec.ok(`${label} 7. no page errors`, errs.length === 0, errs.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  await pass(browser, { wsPort, webPort, rec, label: 'default', query: 'wheelwhole' });
  await pass(browser, { wsPort, webPort, rec, label: 'two buttons', query: 'manual=5&wheelwhole' });
}
