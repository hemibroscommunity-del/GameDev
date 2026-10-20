/* SHARDS CRACKED FOR RAW GEMS, THREE COMBINED INTO A GEM (v2.3.3516)
 *
 * The owner, 2026-10-19: "a fun method would be for the shards to have a
 * certain percent chance of containing that elements raw gem ... Then after
 * collecting a certain number of raw gems they can be combined into an
 * elemental gem."  And on docs/GEM-PLAN.md, 2026-10-20: "All of that sounds
 * good" -- its Phase 2.
 *
 * A real client against a real worker, in the Wheel's BroTown, through the
 * Gem Works' real door, on a phone:
 *   1. caps.shardcrack; the dev kit's shards of every land in the bag, each
 *      named and drawn as the bag draws a shard;
 *   2. the Gem Works' first tab is the crack (its tab line "Shards to gems"):
 *      a row for the Frost Shards with their count and the chance;
 *   3. All cracks them in ONE ask: the reveal plays the worker's own rolls a
 *      tile a shard, the gems it found are in the bag (on the screen AND in the
 *      worker's record), the shards gone -- cracked again until three raw
 *      gems are held;
 *   4. Combine makes three raw gems one Frost Gem, in the bag, named and
 *      drawn ("Frost Gem", the element's picture), and its card says where it
 *      goes;
 *   5. the Set gems tab sets it into the sword in hand, and pays its 400
 *      Enchanting XP -- a gem this player made;
 *   6. a Rare Gem cuts into the gem picked (Flora);
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/shardcrack-*.png.
 *
 *   node tools/qa/mp/run.mjs shardcrack
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/shardcrack-${name}.png` }).catch(() => {});
const INIT = `window.__btProbe = true;`;
const bag = (P) => H.readState(P, (S) => {
  const inv = (S.rpg && S.rpg.inventory) || {};
  const en = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.enchanting) || {};
  const gc = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.gemCutting) || {};
  return { shard: inv.shard_frost || 0, raw: inv.gem_raw_frost || 0, gem: inv.gem_frost || 0, flora: inv.gem_flora || 0, rare: inv.rare_gem || 0,
    ench: (en.xp || 0) + 1e6 * ((en.level || 1) - 1), gc: (gc.xp || 0) + 1e6 * ((gc.level || 1) - 1),
    weapon: S.rpg && S.rpg.weapon ? { type: S.rpg.weapon.type, e1: S.rpg.weapon.element1 || null } : null };
});
const until = async (P, pred, tries = 30, ms = 250) => {
  let s = null;
  for (let i = 0; i < tries; i++) { s = await bag(P); if (pred(s)) return s; await P.page.waitForTimeout(ms); }
  return s;
};
const lastCrack = (P) => P.page.evaluate(() => { const l = window.__btShardCrackLog || []; return l.length ? l[l.length - 1] : null; });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gemcrack', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: INIT });
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
    let inWheel = false;
    for (let t0 = Date.now(); Date.now() - t0 < 60000 && !inWheel;) { inWheel = (await zoneNow()) === 'wheel'; if (!inWheel) await P.page.waitForTimeout(400); }
    const cap = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.shardcrack));
    rec.ok('the worker advertises caps.shardcrack (in the Wheel\'s BroTown)', cap && inWheel, { cap, inWheel });
    if (!cap || !inWheel) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me);
    keepAlive();

    /* ── 1. shards of every land, in the bag ── */
    await H.devOp(wsPort, 'kit', me, { what: 'shards', count: 50 });
    const s1 = await until(P, (s) => s.shard >= 50, 40);
    await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
    await P.page.waitForTimeout(1200);
    const tile = await P.page.evaluate(async () => {
      const el = document.querySelector('[data-inv-key="shard_frost"]');
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const img = el.querySelector('img');
      if (img && !(img.complete && img.naturalWidth > 0)) { try { await img.decode(); } catch (e) { /* counted below */ } }
      return { src: img ? img.getAttribute('src') : null, ok: !!(img && img.complete && img.naturalWidth > 0) };
    });
    await shot(P, '1-bag');
    rec.ok(`fifty Frost Shards in the bag from the dev kit, drawn as a shard (${tile && tile.src})`, s1.shard >= 50 && !!tile && tile.ok && /shard_frost/.test(tile.src || ''), { s1, tile });

    /* the Gem Works' door (mp-weapongem's walk) */
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 16; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 16) await P.page.waitForTimeout(500);
    }
    const door = doors.find((d) => d.id === 'gemcutter');
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
    const enterGemWorks = async () => {
      if (!door) return null;
      await closePanel();
      await standAt(door.x, door.y + 30);
      let btn = false;
      for (let i = 0; i < 16 && !btn; i++) {
        btn = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')));
        if (!btn) await P.page.waitForTimeout(250);
      }
      if (!btn) return null;
      await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      let opened = null;
      for (let i = 0; i < 16 && opened !== 'gemcut'; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
      return opened;
    };

    /* ── 2. the first tab is the crack ── */
    const opened = await enterGemWorks();
    const panel = opened === 'gemcut' && await P.page.waitForSelector('[data-shard-crack] [data-crack-row="frost"]', { timeout: 6000 }).then(() => true).catch(() => false);
    const look = await P.page.evaluate(() => {
      const tab = document.querySelector('[data-gem-works] button[data-gem-tab="gemcut"]');
      const row = document.querySelector('[data-crack-row="frost"]');
      const have = row && row.querySelector('[data-crack-have]');
      return { tab: tab ? tab.innerText.replace(/\s+/g, ' ').trim() : null, row: row ? row.innerText.replace(/\s+/g, ' ').trim() : null, have: have ? +have.getAttribute('data-crack-have') : null,
        all: !!document.querySelector('[data-crack-all="frost"]') };
    });
    await shot(P, '2-crack-tab');
    rec.ok(`the Gem Works' first tab is the crack ("${look.tab}"): a Frost Shard row, its count and the chance ("${look.row}")`,
      !!panel && /Shards to gems/.test(look.tab || '') && look.have >= 50 && /10% a Raw Frost Gem/.test(look.row || '') && look.all, { opened, look });
    if (!panel) return;

    /* ── 3. All: one ask, the worker's rolls played, the gems in the bag ── */
    const gc0 = (await bag(P)).gc;
    const sentBefore = await P.page.evaluate(() => (window.__btShardCrackLog || []).length);
    await P.page.click('[data-crack-all="frost"]', { force: true });
    let res = null;
    for (let i = 0; i < 30 && !res; i++) { await P.page.waitForTimeout(200); const n = await P.page.evaluate(() => (window.__btShardCrackLog || []).length); if (n > sentBefore) res = await lastCrack(P); }
    await P.page.waitForTimeout(4200);   /* the reveal: 50 tiles x 70 ms, then the gem's pop */
    const shown = await P.page.evaluate(() => {
      const box = document.querySelector('[data-crack-tiles]');
      const tiles = box ? Array.from(box.querySelectorAll('[data-crack-tile]')) : [];
      return { seq: box ? +box.getAttribute('data-crack-tiles') : null, n: tiles.length, hits: tiles.filter((t) => t.getAttribute('data-crack-tile') === 'hit').length,
        head: box ? box.firstChild.innerText : null, gemShown: tiles.filter((t) => t.querySelector('.bt-crack-gem')).every((t) => +getComputedStyle(t.querySelector('.bt-crack-gem')).opacity > 0.9) };
    });
    const s3 = await until(P, (s) => !!res && s.raw >= res.found && s.shard === 0, 30);
    const srv3 = await H.adminPlayer(wsPort, me);
    const sInv = (srv3 && srv3.rpg && srv3.rpg.inventory) || {};
    await shot(P, '3-cracked');
    rec.ok(`All cracked fifty in ONE ask: the worker's ${res && res.rolls && res.rolls.length} rolls played a tile each (${shown.n} tiles, ${shown.hits} holding a gem, "${shown.head}")`,
      !!res && res.ok && res.rolls.length === 50 && shown.n === 50 && shown.hits === res.found && shown.seq === res.seq && shown.gemShown, { res, shown });
    /* the XP from the receipt (the worker's own count: 50 x 40), and the skill
       moved on the screen (2,000 XP takes Gem Cutting 1 to 2) */
    rec.ok(`...the ${res && res.found} raw gems found are in the bag, on the screen and in the worker's record, the shards gone, 40 Gem Cutting XP each (${res && res.xp})`,
      !!res && s3.raw === res.found && (sInv.gem_raw_frost || 0) === res.found && s3.shard === 0 && !sInv.shard_frost && res.xp === 2000 && s3.gc > gc0, { s3, gc0, xp: res && res.xp, server: { raw: sInv.gem_raw_frost, shard: sInv.shard_frost } });
    /* more, until three raw gems (at 10% a shard, fifty hold five) */
    for (let round = 0; round < 8 && (await bag(P)).raw < 3; round++) {
      await H.devOp(wsPort, 'kit', me, { what: 'shards', count: 50 });
      await until(P, (s) => s.shard >= 50, 30);
      await P.page.waitForSelector('[data-crack-all="frost"]', { timeout: 6000 }).catch(() => {});
      await P.page.click('[data-crack-all="frost"]', { force: true }).catch(() => {});
      await until(P, (s) => s.shard === 0, 30);
    }

    /* ── 4. Combine: three raw gems, one Frost Gem ── */
    const s4a = await bag(P);
    await P.page.waitForSelector('[data-combine="frost"]:not([disabled])', { timeout: 6000 }).catch(() => {});
    await P.page.click('[data-combine="frost"]', { force: true }).catch(() => {});
    const s4 = await until(P, (s) => s.gem === s4a.gem + 1, 30);
    const chip = await P.page.evaluate(() => { const c = document.querySelector('[data-gem-have="frost"]'); return c ? c.innerText.trim() : null; });
    await shot(P, '4-combined');
    rec.ok(`Combine made three raw gems one Frost Gem (${s4a.raw} -> ${s4.raw} raw, ${s4a.gem} -> ${s4.gem} gems), shown under "Your gems" ("${chip}")`,
      s4a.raw >= 3 && s4.raw === s4a.raw - 3 && s4.gem === s4a.gem + 1 && /Frost Gem ×1/.test(chip || ''), { s4a, s4, chip });
    await closePanel();
    await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
    await P.page.waitForTimeout(1000);
    const gtile = await P.page.evaluate(async () => {
      const el = document.querySelector('[data-inv-key="gem_frost"]');
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const img = el.querySelector('img');
      if (img && !(img.complete && img.naturalWidth > 0)) { try { await img.decode(); } catch (e) { /* counted below */ } }
      return { src: img ? img.getAttribute('src') : null, ok: !!(img && img.complete && img.naturalWidth > 0) };
    });
    /* its card, as a tap on the tile opens it (mp-authority's handle) */
    await P.page.evaluate(() => window._itemDetailBus && window._itemDetailBus.open({ kind: 'inventory', key: 'gem_frost', count: 1 }));
    await P.page.waitForSelector('[data-item-card]', { timeout: 5000 }).catch(() => {});
    const card = await P.page.evaluate(() => { const c = document.querySelector('[data-item-card]'); return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; });
    await shot(P, '4-bag-gem');
    rec.ok(`...the Frost Gem is in the bag, drawn as its element (${gtile && gtile.src}), and its card says where it goes ("${(card || '').slice(0, 120)}")`,
      !!gtile && gtile.ok && /elem-frost/.test(gtile.src || '') && /Frost Gem/.test(card || '') && /Gem Works/.test(card || ''), { gtile, card });
    await P.page.evaluate(() => { const b = document.querySelector('[data-esc], .bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(300);

    /* ── 5. set it: the gem made pays its 400 ── */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
    for (let i = 0; i < 40; i++) {
      const has = await H.readState(P, (S) => !!((S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword') || ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword')));
      if (has) break;
      await P.page.waitForTimeout(250);
    }
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    const e0 = (await bag(P)).ench;
    const owed = await H.readState(P, (S) => ((S.rpg.lifeSkills && S.rpg.lifeSkills.gemsUnpaid) || {}).frost || 0);
    const op5 = await enterGemWorks();
    if (op5 === 'gemcut') await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="enchant"]'); if (b) b.click(); });
    await P.page.waitForSelector('[data-weapon-gem="weapon:frost"]', { timeout: 6000 }).catch(() => {});
    const owedLine = await P.page.evaluate(() => { const l = document.querySelector('[data-gem-xp-owed]'); return l ? l.innerText.trim() : null; });
    await P.page.click('[data-weapon-gem="weapon:frost"]', { force: true }).catch(() => {});
    const s5 = await until(P, (s) => !!s.weapon && s.weapon.e1 === 'frost', 30);
    await shot(P, '5-set');
    rec.ok(`the Set gems tab sets the made gem into the sword and pays its 400 Enchanting XP (+${s5.ench - e0}; owed ${owed} before: "${owedLine}")`,
      !!s5.weapon && s5.weapon.e1 === 'frost' && s5.ench - e0 === 400 && owed >= 1 && /400 Enchanting XP/.test(owedLine || ''), { s5, owed, owedLine });

    /* ── 6. a Rare Gem cut into the gem picked ── */
    await H.grant(wsPort, me, 'item', { invKey: 'rare_gem', count: 1 });
    await until(P, (s) => s.rare >= 1, 30);
    await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="gemcut"]'); if (b) b.click(); });
    await P.page.waitForSelector('[data-rare-pick="flora"]', { timeout: 6000 }).catch(() => {});
    await P.page.click('[data-rare-pick="flora"]', { force: true }).catch(() => {});
    await P.page.waitForTimeout(200);
    const cutLabel = await P.page.evaluate(() => { const b = document.querySelector('[data-rare-cut]'); return b ? b.innerText.trim() : null; });
    await P.page.click('[data-rare-cut="flora"]', { force: true }).catch(() => {});
    const s6 = await until(P, (s) => s.flora >= 1, 30);
    await shot(P, '6-rare');
    rec.ok(`a Rare Gem cuts into the gem picked ("${cutLabel}"): a Flora Gem, the Rare Gem gone`, s6.flora === 1 && s6.rare === 0 && /Flora Gem/.test(cutLabel || ''), { s6, cutLabel });
    await closePanel();

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
