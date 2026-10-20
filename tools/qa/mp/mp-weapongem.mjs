/* A GEM GOES INTO A WEAPON ON THE WORKER, AND THE HOLD RULE (v2.3.3513)
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good" --
 * its Phase 1.  The Enchanter's weapon slot was this browser's alone: the
 * worker's next player_state put the gem back on the count and the plain
 * weapon back in the hand, the Element Burst was refused ("needs an enchanted
 * weapon"), and the fight took each hit's element from the phone's word.
 *
 * A real client against a real worker, in the Wheel's BroTown, through the
 * Gem Works' real door (its Set gems tab), on a phone:
 *   1. caps.weapongem and caps.monsterhold; the dev kit's copper greatsword in
 *      hand and two polished gems of each element;
 *   2. the Set gems tab's flame button ASKS: the weapon takes the gem and the
 *      worker's name for it, the count drops to one -- on the screen AND in
 *      the worker's saved record -- and the window says what the gem does;
 *   3. a refusal (a second gem in a full weapon) changes nothing and says why
 *      under that weapon;
 *   4. a reload keeps both: the gem in the weapon, and the count at one;
 *   5. the Element Burst goes (the worker's copy has the gem now);
 *   6. at the Flame Fields' goblins, swings that CLAIM frost: the worker
 *      burns them (its own copy's flame), the phone hears its burn ticks;
 *   7. Take out on the Set gems tab gives it back (the weapon bare, two flame
 *      gems again), and setting it again pays no XP; no page errors.
 * Pictures: tools/qa/mp/out/weapongem-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* the worker's own words, heard on the socket: its burn ticks (`status:
   'burn'` on a monster_hit), the burst's nova, and a refused burst */
const INIT = `(() => {
  const Orig = window.WebSocket;
  if (!Orig || window.__wgWs) return;
  window.__wgWs = { burn: 0, nova: 0, noElement: 0 };
  function W(url, protocols) {
    const ws = protocols === undefined ? new Orig(url) : new Orig(url, protocols);
    ws.addEventListener('message', (e) => {
      try {
        const d = typeof e.data === 'string' ? e.data : '';
        if (!d) return;
        if (d.indexOf('"status":"burn"') >= 0) window.__wgWs.burn++;
        if (d.indexOf('element_nova') >= 0) window.__wgWs.nova++;
        if (d.indexOf('"reason":"no_element"') >= 0) window.__wgWs.noElement++;
      } catch (err) { /* a probe never breaks the game */ }
    });
    return ws;
  }
  W.prototype = Orig.prototype;
  W.CONNECTING = Orig.CONNECTING; W.OPEN = Orig.OPEN; W.CLOSING = Orig.CLOSING; W.CLOSED = Orig.CLOSED;
  window.WebSocket = W;
  window.__btProbe = true;
})();`;
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/weapongem-${name}.png` }).catch(() => {});
const state = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  const g = (R.lifeSkills && R.lifeSkills.gems) || {};
  const w = R.weapon ? { type: R.weapon.type, name: R.weapon.name, e1: R.weapon.element1 || null, e2: R.weapon.element2 || null, tier: R.weapon.tier, tm: R.weapon.tierMult } : null;
  const en = (R.lifeSkills && R.lifeSkills.enchanting) || {};
  return { weapon: w, flame: g.polished_flame || 0, frost: g.polished_frost || 0, ench: (en.xp || 0) + 1e6 * ((en.level || 1) - 1) };
});
const lastLog = (P) => P.page.evaluate(() => { const l = window.__btWeaponGemLog || []; return l.length ? l[l.length - 1] : null; });
const server = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id);
  const rpg = (a && a.rpg) || {};
  const g = (rpg.lifeSkills && rpg.lifeSkills.gems) || {};
  return { weapon: rpg.weapon ? { name: rpg.weapon.name, e1: rpg.weapon.element1 || null, tm: rpg.weapon.tierMult } : null, flame: g.polished_flame || 0 };
};
const until = async (P, pred, tries = 24, ms = 250) => {
  let s = null;
  for (let i = 0; i < tries; i++) { s = await state(P); if (pred(s)) return s; await P.page.waitForTimeout(ms); }
  return s;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gemblade', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: INIT });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let stopAlive = false;
  const keepAlive = () => {
    stopAlive = false;
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  };
  try {
    await H.enterWorld(P);
    const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    const waitWheel = async (ms = 60000) => {
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { if ((await zoneNow()) === 'wheel') return true; await P.page.waitForTimeout(400); }
      return false;
    };
    const inWheel = await waitWheel();
    const caps = await H.readState(P, (S) => ({ wg: !!(S._serverCaps && S._serverCaps.weapongem), hold: !!(S._serverCaps && S._serverCaps.monsterhold) }));
    rec.ok('the worker advertises caps.weapongem and caps.monsterhold (in the Wheel\'s BroTown)', caps.wg && caps.hold && inWheel, { caps, inWheel });
    if (!caps.wg || !inWheel) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me);
    keepAlive();

    /* the doors, from the worker's answer (mp-wheeldoors, mp-shieldgem) */
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 16; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 16) await P.page.waitForTimeout(500);
    }
    const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(800);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const panelKey = () => P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
    const closePanel = async () => {
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
      await P.page.waitForTimeout(350);
    };
    const enter = async (id, want) => {
      const d = byId[id];
      if (!d) return null;
      await standAt(d.x, d.y + 30);
      let btn = false;
      for (let i = 0; i < 16 && !btn; i++) {
        btn = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')));
        if (!btn) await P.page.waitForTimeout(250);
      }
      if (!btn) return null;
      await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      let opened = null;
      for (let i = 0; i < 16 && opened !== want; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
      return opened;
    };
    const enterSetGems = async () => {
      const cut = await enter('gemcutter', 'gemcut');
      if (cut !== 'gemcut') return cut;
      await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="enchant"]'); if (b) b.click(); });
      let opened = null;
      for (let i = 0; i < 16 && opened !== 'enchant'; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
      return opened;
    };

    /* ── 1. a copper greatsword in hand, two gems of each element ── */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
    for (let i = 0; i < 40; i++) {
      const has = await H.readState(P, (S) => !!((S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword') || ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword')));
      if (has) break;
      await P.page.waitForTimeout(250);
    }
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await H.devOp(wsPort, 'kit', me, { what: 'gems', count: 2 });
    const s1 = await until(P, (s) => s.flame === 2 && s.frost === 2 && !!s.weapon && s.weapon.type === 'greatsword' && !s.weapon.e1, 40);
    rec.ok('a plain greatsword in hand, with two polished gems of each element (the worker\'s count, on the screen)',
      !!s1.weapon && s1.weapon.type === 'greatsword' && !s1.weapon.e1 && s1.flame === 2, s1);
    if (!s1.weapon) return;

    /* ── 2. the Set gems tab's flame button ── */
    const ench = await enterSetGems();
    const pill = ench === 'enchant' && await P.page.waitForSelector('[data-weapon-gem="weapon:flame"]', { timeout: 6000 }).then(() => true).catch(() => false);
    const noDark = await P.page.$('[data-weapon-gem="weapon:dark"]');
    await P.page.evaluate(() => { const e = document.querySelector('[data-weapon-gem]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await shot(P, 'set-gems');
    rec.ok('the Gem Works\' Set gems tab offers the greatsword a flame gem, and no Dark one (a weapon takes the eight lands\' gems)', !!pill && !noDark, { ench, dark: !!noDark });
    if (!pill) return;
    const x0 = (await state(P)).ench;
    await P.page.click('[data-weapon-gem="weapon:flame"]', { force: true });
    const s2 = await until(P, (s) => s.weapon && s.weapon.e1 === 'flame' && s.flame === 1);
    const log2 = await lastLog(P);
    await P.page.waitForTimeout(500);
    const fx = await P.page.$eval('[data-weapon-gem-effect="flame"]', (e) => e.textContent).catch(() => null);
    await shot(P, 'set');
    rec.ok(`the worker put it in: "${s2.weapon && s2.weapon.name}" with the flame gem, one flame gem left, its metal's damage the same (${s2.weapon && s2.weapon.tm})`,
      !!s2.weapon && s2.weapon.e1 === 'flame' && s2.weapon.name === 'Copper Flame Great Sword' && s2.flame === 1 && s2.weapon.tm === s1.weapon.tm
        && !!log2 && log2.ok === true && log2.xp === 400 && s2.ench - x0 === 400, { s2, log2, xp: s2.ench - x0 });
    rec.ok(`...and the window says what it does ("${fx}")`, !!fx && /Burns what it hits/.test(fx), fx);
    let sv = null;
    for (let i = 0; i < 20; i++) { sv = await server(wsPort, me); if (sv.weapon && sv.weapon.e1 === 'flame') break; await P.page.waitForTimeout(250); }
    rec.ok('...and so says the worker\'s saved record (the weapon\'s gem, the count of one)', !!sv.weapon && sv.weapon.e1 === 'flame' && sv.flame === 1, sv);

    /* ── 3. a refusal says why, and changes nothing ── */
    const before = await state(P);
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'weapon_gem', payload: { slot: 'weapon', gem: 'frost' } }); });
    let refused = null;
    for (let i = 0; i < 20; i++) { refused = await lastLog(P); if (refused && refused.ok === false) break; await P.page.waitForTimeout(250); }
    await P.page.waitForTimeout(400);
    const line = await P.page.$eval('[data-weapon-gem-refused]', (e) => ({ reason: e.getAttribute('data-weapon-gem-refused'), text: e.textContent })).catch(() => null);
    const after = await state(P);
    await shot(P, 'refused');
    rec.ok(`a second gem in a full weapon is refused ("${line && line.text}"), the reason under it, nothing changed`,
      !!refused && refused.ok === false && refused.reason === 'full' && !!line && line.reason === 'full' && JSON.stringify(before) === JSON.stringify(after), { refused, line, before, after });
    await closePanel();

    /* ── 4. a reload keeps both ── */
    stopAlive = true;
    await P.page.reload();
    await H.enterWorld(P);
    await waitWheel();
    await P.page.waitForTimeout(2000);
    keepAlive();
    const s3 = await until(P, (s) => !!s.weapon && s.flame >= 1, 30);
    rec.ok('after a reload the weapon still has its gem, and the count stays at one (the phone-only gem came back plain)',
      !!s3.weapon && s3.weapon.e1 === 'flame' && s3.flame === 1, s3);

    /* ── 5. the Element Burst goes ── */
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 10 });
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'melee'; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); });
    await P.page.waitForTimeout(400);
    const w0 = await P.page.evaluate(() => Object.assign({}, window.__wgWs));
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'element_burst', payload: {} }); });
    let w1 = w0;
    for (let i = 0; i < 20; i++) { w1 = await P.page.evaluate(() => Object.assign({}, window.__wgWs)); if (w1.nova > w0.nova || w1.noElement > w0.noElement) break; await P.page.waitForTimeout(250); }
    rec.ok('the Element Burst goes: the worker\'s copy has the gem (it answered "needs an enchanted weapon")', w1.nova > w0.nova && w1.noElement === w0.noElement, { before: w0, after: w1 });

    /* ── 6. the worker burns the goblins, whatever the swing claims ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const LONG = (await H.wheelGeom()).long;
    const inner = WHEEL_SPAWNS.ember.points.slice(0, 6 * LONG).reduce((a, p) => (!a || p[2] < a[2] ? p : a), null);
    if (inner) await H.hopTo(P, inner[0], inner[1] + 20, { tries: 200 });
    const b0 = await P.page.evaluate(() => window.__wgWs.burn);
    let swung = 0;
    for (let round = 0; round < 8; round++) {
      const target = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0)
          .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
        return m ? { id: m.id, zone: S.currentZone, x: m.x, y: m.y } : null;
      });
      if (!target) { await P.page.waitForTimeout(500); continue; }
      await H.hopTo(P, target.x, target.y + 10, { step: 60, tries: 20 });
      for (let k = 0; k < 4; k++) {
        /* a swing that CLAIMS frost: the worker reads its own copy (flame) */
        await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee', element: 'frost' });
        swung++;
        await P.page.waitForTimeout(500);
      }
      const b = await P.page.evaluate(() => window.__wgWs.burn);
      if (b > b0) break;
    }
    await P.page.waitForTimeout(1500);
    const b1 = await P.page.evaluate(() => window.__wgWs.burn);
    await shot(P, 'burning');
    rec.ok(`at the Flame Fields the worker BURNS what the greatsword hits, though every swing claimed frost (${b1 - b0} burn tick(s) heard, ${swung} swings)`, b1 > b0, { b0, b1, swung });
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: false });

    /* ── 7. Take out at the Set gems tab, and set again ── */
    await H.grant(wsPort, me, 'gold', { amount: 5000 });
    /* home to BroTown's square, then to the Gem Works */
    const homeAt = byId.gemcutter;
    if (homeAt) await H.hopTo(P, homeAt.x, homeAt.y + 200, { tries: 300 });
    const ench2 = await enterSetGems();
    const outBtn = ench2 === 'enchant' && await P.page.waitForSelector('[data-weapon-gem-out="weapon"]', { timeout: 6000 }).then(() => true).catch(() => false);
    await P.page.evaluate(() => { const e = document.querySelector('[data-weapon-gem-out]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await shot(P, 'take-out');
    rec.ok('the Set gems tab offers to take the gem out, with its price', !!outBtn, { ench2 });
    if (outBtn) {
      await P.page.click('[data-weapon-gem-out="weapon"]', { force: true });
      const s4 = await until(P, (s) => s.weapon && !s.weapon.e1 && s.flame === 2, 30);
      await P.page.waitForTimeout(800);
      const left = await P.page.$('[data-weapon-gem-out="weapon"]');
      await shot(P, 'taken-out');
      rec.ok(`Take out gives it back: "${s4.weapon && s4.weapon.name}" is bare, two flame gems, and no Take out button left`,
        !!s4.weapon && !s4.weapon.e1 && s4.weapon.name === 'Copper Great Sword' && s4.flame === 2 && !left, { s4, left: !!left });
      const x1 = (await state(P)).ench;
      await P.page.waitForSelector('[data-weapon-gem="weapon:flame"]', { timeout: 6000 }).catch(() => {});
      await P.page.click('[data-weapon-gem="weapon:flame"]', { force: true }).catch(() => {});
      const s5 = await until(P, (s) => s.weapon && s.weapon.e1 === 'flame' && s.flame === 1);
      const log5 = await lastLog(P);
      rec.ok('setting that gem again works, and pays no XP (it paid when it first went in)', !!s5.weapon && s5.weapon.e1 === 'flame' && !!log5 && log5.ok && log5.xp === 0 && s5.ench === x1, { s5, log5, xp: s5.ench - x1 });
    }
    await closePanel();
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
