/* EVERY GEM PULLS ITS WEIGHT (v2.3.3518)
 *
 * The owner's decisions 13 and 14 (docs/GEM-PLAN.md Phase 4, "All of that
 * sounds good"): a gem that beats the monster's element hits 25% harder, and
 * "DN" goes; a soaked monster hits 20% softer; a hit on a shocked monster
 * sparks to the nearest other monster within 150 px for a quarter of the hit.
 *
 * A real client against a real worker, on a phone, in the Wheel:
 *   1. caps.elemup, caps.soakhit and caps.shockspark;
 *   2. a water gem in the greatsword: the Gem Works' Set gems tab says what it
 *      does on its own now ("its blows land 20% softer") and what it beats
 *      ("25% harder on Flame monsters"); a storm gem's card in the bag says it
 *      sparks and beats Stone;
 *   3. at the Flame Fields' goblins, the water gem's hits land UP: the
 *      worker's monster_hit says `up`, the phone prints "UP" from it, and
 *      never "DN";
 *   4. a storm gem (no matchup with flame): no "UP", no "DN", and once a goblin
 *      is shocked, a hit on it SPARKS to a goblin beside it -- the worker's
 *      event names the one it leapt from and the phone draws the line;
 *   5. no page errors.
 * Soak's softer blows are the worker's alone (hits.js), measured by
 * server/test/gem-weight.test.mjs. Pictures: tools/qa/mp/out/gemweight-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const INIT = `(() => { window.__btProbe = true; })();`;
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/gemweight-${name}.png` }).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sparkbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: INIT });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    let inWheel = false;
    for (let t0 = Date.now(); Date.now() - t0 < 60000 && !inWheel;) {
      inWheel = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
      if (!inWheel) await P.page.waitForTimeout(400);
    }
    const caps = await H.readState(P, (S) => {
      const c = S._serverCaps || {};
      return { up: !!c.elemup, soak: !!c.soakhit, spark: !!c.shockspark, wg: !!c.weapongem };
    });
    rec.ok('the worker advertises caps.elemup, caps.soakhit and caps.shockspark (in the Wheel)', inWheel && caps.up && caps.soak && caps.spark && caps.wg, { caps, inWheel });
    if (!inWheel || !caps.up) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true });

    /* ── 2. a water gem in the greatsword, and what the Gem Works says ── */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
    for (let i = 0; i < 40; i++) {
      const has = await H.readState(P, (S) => !!((S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword') || ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword')));
      if (has) break;
      await P.page.waitForTimeout(250);
    }
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    /* the sword in hand on the worker's word before a gem goes in (the gem
       helper reads the hand, and once read it before the echo) */
    for (let i = 0; i < 40; i++) {
      if (await H.readState(P, (S) => !!(S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword'))) break;
      await P.page.waitForTimeout(250);
    }
    const gem = async (g) => (await H.weaponGem(P, wsPort, me, 'weapon', g))
      || (await P.page.waitForTimeout(1000), await H.weaponGem(P, wsPort, me, 'weapon', g));
    const water = await gem('water');
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 16; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 16) await P.page.waitForTimeout(500);
    }
    const gw = doors.find((d) => d.id === 'gemcutter');
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
    let words = null;
    if (gw) {
      await standAt(gw.x, gw.y + 30);
      let btn = false;
      for (let i = 0; i < 16 && !btn; i++) {
        btn = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')));
        if (!btn) await P.page.waitForTimeout(250);
      }
      await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      for (let i = 0; i < 16 && (await panelKey()) !== 'gemcut'; i++) await P.page.waitForTimeout(250);
      await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="enchant"]'); if (b) b.click(); });
      await P.page.waitForSelector('[data-weapon-gem-effect="water"]', { timeout: 6000 }).catch(() => {});
      words = await P.page.$eval('[data-weapon-gem-effect="water"]', (e) => e.textContent).catch(() => null);
      await P.page.evaluate(() => { const e = document.querySelector('[data-weapon-gem-effect]'); if (e) e.scrollIntoView({ block: 'center' }); });
      await shot(P, 'set-gems');
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
      await P.page.waitForTimeout(400);
    }
    rec.ok(`a water gem in the greatsword, and the Set gems tab says what it does on its own and what it beats ("${words}")`,
      water && !!words && /its blows land 20% softer/.test(words) && /25% harder on Flame monsters/.test(words), { water, words });
    /* a storm gem's card, from the bag (the kit's gems: one of each) */
    await P.page.evaluate(() => window._itemDetailBus && window._itemDetailBus.open({ kind: 'inventory', key: 'gem_storm', count: 1 }));
    await P.page.waitForSelector('[data-item-card]', { timeout: 5000 }).catch(() => {});
    const card = await P.page.evaluate(() => { const c = document.querySelector('[data-item-card]'); return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; });
    await shot(P, 'storm-card');
    rec.ok(`a storm gem's card says it sparks and what it beats ("${card && card.slice(0, 160)}")`,
      !!card && /sparks to a monster beside it/.test(card) && /25% harder on Stone monsters/.test(card), card);
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.evaluate(() => { const b = document.querySelector('[data-item-card] .bt-inspect-close, [data-item-card] [data-esc]'); if (b) b.click(); });
    await P.page.waitForTimeout(300);

    /* ── 3. UP at the Flame Fields' goblins ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const LONG = (await H.wheelGeom()).long;
    const inner = WHEEL_SPAWNS.ember.points.slice(0, 6 * LONG).reduce((a, p) => (!a || p[2] < a[2] ? p : a), null);
    if (inner) await H.hopTo(P, inner[0], inner[1] + 20, { tries: 200 });
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'melee'; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); });
    const seen = { up: 0, dn: 0 };
    const watchPopups = async (ms) => {
      for (let t0 = Date.now(); Date.now() - t0 < ms;) {
        const t = await P.page.evaluate(() => (window._gameState.current.dmgNumbers || []).map((d) => [d.text, d.ts + ':' + Math.round(d.x || 0)]));
        for (const [text, k] of t) {
          const key = text + '|' + k;
          if (watchPopups.keys.has(key)) continue;
          watchPopups.keys.add(key);
          if (text === 'UP') seen.up++;
          if (text === 'DN') seen.dn++;
        }
        await P.page.waitForTimeout(120);
      }
    };
    watchPopups.keys = new Set();
    const nearestGoblin = () => P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      return m ? { id: m.id, zone: S.currentZone, x: m.x, y: m.y } : null;
    });
    const upLog = () => P.page.evaluate(() => (window.__btUpLog || []).length);
    const up0 = await upLog();
    for (let round = 0; round < 8 && (await upLog()) === up0; round++) {
      const target = await nearestGoblin();
      if (!target) { await P.page.waitForTimeout(500); continue; }
      await H.hopTo(P, target.x, target.y + 10, { step: 60, tries: 20 });
      for (let k = 0; k < 3; k++) {
        await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee' });
        await watchPopups(500);
      }
    }
    await watchPopups(800);
    const ups = (await upLog()) - up0;
    await shot(P, 'up');
    rec.ok(`at the Flame Fields the water gem lands UP: the worker says so (${ups} hit(s) with \`up\`) and the phone prints "UP" (${seen.up} seen), never "DN"`,
      ups > 0 && seen.up > 0 && seen.dn === 0, { ups, seen });

    /* ── 4. a storm gem: no matchup, and the spark ── */
    const storm = await gem('storm');
    seen.up = 0; seen.dn = 0;
    const up1 = await upLog();
    const sparkLog = () => P.page.evaluate(() => (window.__btSparkLog || []).filter((s) => s.mine));
    const hitsOn = (id) => P.page.evaluate((mid) => (window.__btHitLog || []).filter((h) => h.id === mid && !h.spark).length, id);
    /* two goblins standing close together (the phone's own positions), the
       nearest pair near you: hit one, and the other is in the spark's reach */
    const pairNear = () => P.page.evaluate(() => {
      const S = window._gameState.current;
      const gs = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0);
      let best = null;
      for (const a of gs) {
        if (Math.hypot(a.x - S.player.x, a.y - S.player.y) > 2400) continue;
        for (const b of gs) {
          if (a === b) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (!best || d < best.d) best = { a: { id: a.id, x: a.x, y: a.y }, b: b.id, d: Math.round(d), zone: S.currentZone };
        }
      }
      return best;
    });
    let sparks = [];
    let swings = 0;
    let sparkShot = false;
    const rounds = [];
    for (let round = 0; round < 10 && !sparks.some((s) => s.drawn > 0); round++) {
      const pair = await pairNear();
      if (!pair) { await P.page.waitForTimeout(500); continue; }
      await H.hopTo(P, pair.a.x, pair.a.y + 10, { step: 60, tries: 20 });
      const h0 = await hitsOn(pair.a.id);
      /* four swings at a player's pace, ~0.35 s apart: a shock lasts 4 s, and
         on this box every read of the page takes long enough that reading it
         between swings spread them past it (the worker saw the second swing
         4.3 s after the first, the shock just gone) */
      for (let k = 0; k < 4; k++) {
        await H.sendEvent(P, 'monster_damage', { monsterId: pair.a.id, zone: pair.zone, slot: 'melee' });
        swings++;
        await P.page.waitForTimeout(350);
        /* the picture just after the second swing, the first that can spark */
        if (k === 1 && !sparkShot) { sparkShot = true; await shot(P, 'spark-moment'); }
      }
      await watchPopups(600);
      sparks = await sparkLog();
      rounds.push({ a: pair.a.id, b: pair.b, apart: pair.d, landed: (await hitsOn(pair.a.id)) - h0, sparks: sparks.length });
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true });
    }
    await watchPopups(600);
    sparks = await sparkLog();
    const drawn = sparks.find((s) => s.drawn > 0);
    await shot(P, 'spark');
    rec.ok(`a storm gem has no matchup with flame: no "UP" from the worker or on the screen, and no "DN" (${(await upLog()) - up1} up, ${seen.up} UP, ${seen.dn} DN in ${swings} swings)`,
      storm && (await upLog()) === up1 && seen.up === 0 && seen.dn === 0, { storm, seen, swings });
    rec.ok(`a hit on a shocked goblin SPARKS to the goblin beside it: the worker names the one it leapt from and the phone draws the line (${sparks.length} spark(s); ${drawn ? drawn.from + ' -> ' + drawn.to + ', ' + drawn.dmg + ' damage, ' + drawn.drawn + ' sparks drawn' : 'none drawn'})`,
      !!drawn && drawn.from !== drawn.to && drawn.dmg > 0, { sparks: sparks.slice(0, 4), swings, rounds });
    /* a picture of the bolt for the record (no check): one held 4 s between
       the two goblins nearest you, as the effects renderer draws a spark's */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      const gs = (S.monsters || []).filter((m) => m && m.home === 'ember' && m.alive !== false && m.hp > 0)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y)).slice(0, 8);
      /* a pair a spark could join that is not one goblin on top of another */
      let pair = null;
      for (const a of gs) for (const b of gs) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (a !== b && !pair && d >= 60 && d <= 300) pair = [a, b];
      }
      if (pair) (S._sparkArcs || (S._sparkArcs = [])).push({ x0: pair[0].x, y0: pair[0].y - 26, x1: pair[1].x, y1: pair[1].y - 26, ts: Date.now(), dur: 4000 });
    });
    await P.page.waitForTimeout(500);
    await shot(P, 'bolt');
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: false });
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
