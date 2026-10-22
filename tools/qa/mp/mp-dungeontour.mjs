/* ═══ THE FOUR DUNGEONS, ONE BY ONE, ON A PHONE (v2.3.3556, docs/specs/dungeons-today.md) ═══
 *
 * The owner, 2026-10-21: "I have no clue what the state of dungeons are right
 * now in the game.  I have never played dungeons yet.  This will probably need
 * work to get right."  One real player against a real worker, on a phone, IN
 * THE WORLD, walks into each of the four (the Goo Grotto, the Great Cave, the
 * Foundry Dome, the Buried City) at the level each is for, and photographs
 * and measures what a player meets: the mouth and its button, the arena and
 * its first wave, the boss beside an ordinary monster, the clear and what it
 * pays, and the way back out.  Every fact it measures is printed on one
 * `DUNGEON-TOUR` line a dungeon.  Then, in the Grotto:
 *   - going straight back in after leaving;
 *   - dying inside, with something in your bag.
 * The walker is a god for the walk and the waves (each ended by the QA dev op
 * `clearwave`: a real fight takes minutes on this box).
 * Pictures: tools/qa/mp/out/tour-<land>-{mouth,wave,boss,clear,back}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const TOUR = [
  { land: 'verdant', name: 'the Goo Grotto', level: 3 },
  { land: 'hollows', name: 'the Great Cave', level: 28 },
  { land: 'thunder', name: 'the Foundry Dome', level: 28 },
  { land: 'sky', name: 'the Buried City', level: 43 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `tour-${name}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
  const waitZone = async (pred, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const z = await zoneNow();
      if (z && pred(z)) return z;
      await P.page.waitForTimeout(400);
    }
    return await zoneNow();
  };
  const z0 = await waitZone((z) => z === 'wheel');
  rec.ok(`in the world (zone "${z0}")`, z0 === 'wheel', z0);
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => {});
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 60 });
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const words = [];
  const listen = async (ms) => {
    for (let t = 0; t < ms; t += 100) {
      const w = await P.page.evaluate(() => ((window._gameState.current || {}).dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean)).catch(() => []);
      for (const x of w) if (!words.includes(x)) words.push(x);
      await P.page.waitForTimeout(100);
    }
  };
  const monsters = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.monsters || []).filter((m) => m && m.alive !== false).map((m) => ({
      id: m.id, kind: m.archetype || m.type, name: m.name || null, level: m.level, hp: m.hp, maxHp: m.maxHp,
      boss: !!(m.isBoss || m.boss), scale: m.scale || m.sizeMult || 1,
    }));
  });
  const atDoor = async (W) => {
    await H.hopTo(P, W.at[0], W.at[1] + 60, { step: 100, gap: 260, tries: 320 });
    for (let i = 0; i < 25; i++) {
      const b = await P.page.evaluate(() => { const e = document.querySelector('[data-wheel-door]'); return e ? e.textContent : null; });
      if (b) return b;
      await P.page.waitForTimeout(300);
    }
    return null;
  };

  const facts = [];
  for (const d of TOUR) {
    const W = WHEEL_DOORS[d.land];
    if (!W) { rec.ok(`${d.name}: its mouth is baked (guard)`, false, Object.keys(WHEEL_DOORS)); continue; }
    const lv = await H.devOp(wsPort, 'combat', id, { skill: 'all', level: d.level, deal: true });
    const f = { land: d.land, name: d.name, yourLevel: lv && lv.charLevel };
    const tWalk = Date.now();
    const btn = await atDoor(W);
    f.walkS = Math.round((Date.now() - tWalk) / 1000);
    f.button = btn;
    await shot(d.land + '-mouth');
    const coins0 = await H.readState(P, (S) => (S.rpg && S.rpg.coins) || 0);
    const tIn = Date.now();
    await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
    const zIn = await waitZone((z) => /^dungeon:/.test(z), 40000);
    f.loadS = Math.round((Date.now() - tIn) / 1000);
    f.inside = /^dungeon:/.test(zIn || '');
    if (!f.inside) { rec.ok(`${d.name}: a tap on "${btn}" opens it`, false, { zIn, btn }); facts.push(f); continue; }
    await P.page.waitForTimeout(2500);
    const w1 = await monsters();
    f.wave1 = { n: w1.length, kinds: [...new Set(w1.map((m) => m.kind))], levels: [...new Set(w1.map((m) => m.level))].sort((a, b) => a - b), hp: w1.length ? w1[0].maxHp : null };
    await shot(d.land + '-wave');
    f.waves = [];
    for (let k = 0; k < 4; k++) {
      const boss = await H.readState(P, (S) => !!S._dungeonBossSpawned);
      if (boss) break;
      const r = await H.devOp(wsPort, 'clearwave', id).catch(() => null);
      f.waves.push(r && r.cleared);
      await listen(1800);
    }
    await P.page.waitForTimeout(1500);
    const bossList = await monsters();
    f.boss = bossList.length ? bossList.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a)) : null;
    f.bossCount = bossList.length;
    await shot(d.land + '-boss');
    await H.devOp(wsPort, 'clearwave', id).catch(() => null);
    await listen(1200);
    await shot(d.land + '-clear');
    const tOut = Date.now();
    const back = await waitZone((z) => z === 'wheel', 60000);
    f.backS = Math.round((Date.now() - tOut) / 1000);
    await P.page.waitForTimeout(1500);
    const where = await P.page.evaluate(() => { const S = window._gameState.current; return { x: Math.round(S.player.x), y: Math.round(S.player.y), coins: (S.rpg && S.rpg.coins) || 0 }; });
    f.back = back;
    f.paid = where.coins - coins0;
    f.fromMouth = Math.round(Math.hypot(where.x - W.back[0], where.y - W.back[1]));
    f.words = words.filter((w) => /WAVE|BOSS|CLEARED|^\+\d|Wave/i.test(w)).slice(-8);
    words.length = 0;
    await shot(d.land + '-back');
    console.log('DUNGEON-TOUR ' + JSON.stringify(f));
    facts.push(f);
    rec.ok(`${d.name}: walked to in ${f.walkS} s, "${btn}", in (${f.loadS} s), ${f.wave1.n} monsters Lv ${f.wave1.levels.join('/')}, boss ${f.boss && f.boss.kind} ${f.boss && f.boss.maxHp} HP (a wave monster ${f.wave1.hp}), cleared and paid ${f.paid} gold, back out ${f.fromMouth} px from the mouth`,
      f.inside && back === 'wheel' && f.paid > 0, f);
  }

  /* ── the Grotto: straight back in after leaving ── */
  const G = WHEEL_DOORS.verdant;
  if (G) {
    await H.devOp(wsPort, 'combat', id, { skill: 'all', level: 3, deal: true });
    await atDoor(G);
    await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
    const zA = await waitZone((z) => /^dungeon:/.test(z), 40000);
    await P.page.waitForTimeout(1500);
    /* out by its door */
    const door = await P.page.evaluate(() => {
      const S = window._gameState.current, T = 32;
      for (let y = 0; y < S.map.length; y++) for (let x = 0; x < S.map[y].length; x++) if (S.map[y][x] === 9) return { x: x * T + T / 2, y: y * T + T / 2 };
      return null;
    });
    for (let i = 0; door && i < 40; i++) {
      const done = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current;
        if (!/^dungeon:/.test(S.currentZone || '')) return true;
        const dx = x - S.player.x, dy = y - S.player.y, dd = Math.hypot(dx, dy);
        if (dd < 4) return false;
        const k = Math.min(40, dd);
        S.player.x += (dx / dd) * k; S.player.y += (dy / dd) * k;
        return false;
      }, door);
      if (done) break;
      await P.page.waitForTimeout(150);
    }
    const zOut = await waitZone((z) => z === 'wheel', 40000);
    await P.page.waitForTimeout(1000);
    words.length = 0;
    await atDoor(G);
    await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
    await listen(3000);
    const zB = await zoneNow();
    const again = { firstIn: zA, out: zOut, secondTry: zB, said: words.slice(-4) };
    console.log('DUNGEON-REENTRY ' + JSON.stringify(again));
    rec.ok(`the Grotto: in, out by its door, and straight back in -> ${/^dungeon:/.test(zB || '') ? 'let in' : 'refused: "' + (again.said.join(' / ') || '?') + '"'}`,
      /^dungeon:/.test(zA || '') && zOut === 'wheel', again);
    if (/^dungeon:/.test(zB || '')) {
      /* out again for the death test */
      for (let i = 0; i < 6; i++) { await H.devOp(wsPort, 'clearwave', id).catch(() => null); await listen(800); if (!/^dungeon:/.test(await zoneNow() || '')) break; }
      await waitZone((z) => z === 'wheel', 60000);
    } else {
      await P.page.waitForTimeout(62000);   /* the lock's minute */
    }

    /* ── the Grotto: dying inside, with something in the bag ── */
    await H.grant(wsPort, id, 'item', { invKey: 'ore_copper_ore', count: 7 });
    await P.page.waitForTimeout(1200);
    const bag0 = await H.readState(P, (S) => ((S.rpg && S.rpg.inventory) || {}).ore_copper_ore || 0);
    await atDoor(G);
    words.length = 0;
    await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
    const zD = await waitZone((z) => /^dungeon:/.test(z), 40000);
    await H.devOp(wsPort, 'vitals', id, { god: false, hp: 1 });
    let died = false;
    for (let i = 0; i < 120 && !died; i++) {
      died = await H.readState(P, (S) => !!(S._dying || S.dead || (S.rpg && S.rpg.hp <= 0) || !/^dungeon:/.test(S.currentZone || '')));
      if (!died) await P.page.waitForTimeout(500);
    }
    const zAfter = await waitZone((z) => z === 'wheel' || z === 'town', 90000);
    await P.page.waitForTimeout(3000);
    const bag1 = await H.readState(P, (S) => ((S.rpg && S.rpg.inventory) || {}).ore_copper_ore || 0);
    await shot('verdant-death');
    const death = { in: zD, died, after: zAfter, oreBefore: bag0, oreAfter: bag1 };
    console.log('DUNGEON-DEATH ' + JSON.stringify(death));
    rec.ok(`the Grotto: a death inside (${died ? 'died' : 'did not die in 60 s'}) -> back in ${zAfter}, copper ore ${bag0} -> ${bag1}`,
      /^dungeon:/.test(zD || '') && bag0 === 7, death);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 }).catch(() => {});
  }

  stopAlive = true;
  rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
