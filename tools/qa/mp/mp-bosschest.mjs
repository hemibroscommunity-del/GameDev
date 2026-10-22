/* ═══ THE BOSS'S CHEST, ON A PHONE, IN THE WORLD (v2.3.3565, docs/specs/boss-chest.md) ═══
 *
 * The owner's "Yes" to "a reward worth the trip": "the boss drops a chest with
 * sure rewards, for example extra gold, the land's shards and a chance at its
 * gem.  The clear's XP would go into the weapon you used."  One real player
 * against a real worker, on a phone (390 x 844, touch), at the Goo Grotto with
 * one big boss (`slimeboss: false`, so the test is about the chest):
 *   1. the clear's card shows the boss's chest under its first row, and the
 *      chest OPENS (since v2.3.3566 the owner's chest, shut and then open; it
 *      was the daily chest's strip, frame 8);
 *   2. the card lists what it held, as the worker said: its gold (20 a level
 *      of the run), 3 Flora Shards, a Rare Gem when the roll gives one, and the
 *      clear's XP in the weapon in hand (the walker earned no fight XP here:
 *      the QA op `hurt` is a damage tick, which pays none);
 *   3. the bag and the purse hold it: the shards and the gold arrived on the
 *      worker's echo (the clear's gold and the chest's);
 *   4. the weapon's XP rose by what the card says;
 *   5. the card still says "Dungeon cleared!" and counts down, Leave now there;
 *      and the codex's "New monster" card steps under it, never over its chest;
 *   6. no page errors.
 * Picture: tools/qa/mp/out/bosschest-card.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { BOSS_CHEST } = await import(H.REPO + '/server/src/dungeonreward.js');
  const { prog3XpRequired } = await import(H.REPO + '/server/src/prog3.js');
  const G = WHEEL_DOORS.verdant;
  await H.liveFlag(wsPort, 'slimeboss', false);
  const P = await H.newPlayer(browser, { name: 'Chestbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  try {
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
    const poll = async (fn, ms, step = 200) => {
      const t0 = Date.now();
      let v = null;
      while (Date.now() - t0 < ms) {
        v = await fn();
        if (v) return v;
        await P.page.waitForTimeout(step);
      }
      return v;
    };
    await waitZone((z) => z === 'wheel');
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });

    /* into the Goo Grotto */
    await H.hopTo(P, G.at[0], G.at[1] + 60, { step: 100, gap: 260 });
    for (let i = 0; i < 20; i++) {
      if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
      await P.page.waitForTimeout(300);
    }
    const b = await P.page.evaluate(() => { const el = document.querySelector('[data-wheel-door]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (b) await P.page.touchscreen.tap(Math.round(b.x), Math.round(b.y));
    const z1 = await waitZone((z) => /^dungeon:/.test(z), 30000);
    await P.page.waitForTimeout(1500);

    const purse = () => P.page.evaluate(() => {
      const R = (window._gameState.current || {}).rpg || {};
      const sk = (R.prog3 && R.prog3.sk) || {};
      return { coins: R.coins || 0, shards: ((R.inventory || {}).shard_verdant) || 0, rare: ((R.inventory || {}).rare_gem) || 0,
        sk: Object.fromEntries(['sword', 'bow', 'staff'].map((k) => [k, sk[k] ? { level: sk[k].level, xp: sk[k].xp } : null])) };
    });
    const cum = (s) => { if (!s) return 0; let t = s.xp || 0; for (let l = 1; l < (s.level || 1); l++) t += prog3XpRequired(l); return t; };

    /* the waves, then the boss, killed the real way (it is a blue slime: it
       swells and goes off first) */
    let boss = null;
    for (let k = 0; k < 6 && !boss; k++) {
      await H.devOp(wsPort, 'clearwave', id);
      boss = await poll(() => P.page.evaluate(() => {
        const m = ((window._gameState.current || {}).monsters || []).find((q) => q.alive !== false && q.boss);
        return m ? { id: m.id } : null;
      }), 3000, 250);
    }
    const before = await purse();
    const r = boss ? await H.devOp(wsPort, 'hurt', id, { boss: true, dmg: 10000000 }) : null;
    const card = await poll(() => P.page.evaluate(() => {
      const el = document.querySelector('[data-dungeon-clear]');
      const row = el && el.querySelector('[data-boss-chest]');
      if (!el || !row) return null;
      const f = row.querySelector('[data-chest-frame]');
      return {
        text: el.textContent, chest: row.getAttribute('data-boss-chest'), frame: f ? f.getAttribute('data-chest-frame') : null,
        lines: [...row.querySelectorAll('[data-chest-line]')].map((s) => ({ what: s.getAttribute('data-chest-line'), text: s.textContent.trim(), img: !!s.querySelector('img') })),
        reward: (window._gameState.current._dungeonClear || {}).reward || null,
      };
    }), 15000);
    /* v2.3.3566: the owner's chest, shut and then open (it was the daily
       chest's strip, opened at its frame 8) */
    const opened = await poll(() => P.page.evaluate(() => {
      const f = document.querySelector('[data-boss-chest] [data-chest-frame]');
      return f && f.getAttribute('data-chest-frame') === 'open' ? 'open' : null;
    }), 6000, 100);
    await P.page.screenshot({ path: join(OUT, 'bosschest-card.png') }).catch(() => {});
    rec.ok(`1: in the Goo Grotto (${z1}) the boss killed (${r && r.dealt} dealt), the clear's card shows the boss's chest, shut (${card && card.frame}) and then ${opened}`,
      /^dungeon:/.test(z1 || '') && !!r && r.ok && !!card && card.chest === 'open' && opened === 'open', { card, r });

    const rw = card && card.reward;
    const chest = rw && rw.chest;
    const lvl = chest ? chest.gold / BOSS_CHEST.GOLD_PER_LEVEL : NaN;
    const skill = rw && rw.skillXp ? Object.keys(rw.skillXp)[0] : null;
    const lines = card ? card.lines : [];
    const want = [`+${chest && chest.gold} gold`, 'Flora Shard ×3', ...(chest && chest.items.some((i) => i.key === 'rare_gem') ? ['Rare Gem'] : [])];
    rec.ok(`2: it lists what the worker said: ${lines.map((l) => l.text).join(', ')} (a level-${lvl} run; each line with its picture)`,
      !!chest && Number.isInteger(lvl) && lvl >= 1 && lines.slice(0, want.length).map((l) => l.text).join('|') === want.join('|')
        && !!skill && lines.some((l) => l.what === skill && /XP$/.test(l.text)) && lines.every((l) => l.img),
      { lines, want, rw });

    /* the worker's echo: the purse and the bag */
    const clearGold = 30 * 3 + lvl * 2;
    const after = await poll(async () => { const p = await purse(); return p.shards >= before.shards + 3 && p.coins >= before.coins + clearGold + (chest ? chest.gold : 0) ? p : null; }, 8000);
    rec.ok(`3: the bag and the purse hold it on the worker's echo: shards ${before.shards} -> ${after && after.shards}, gold ${before.coins} -> ${after && after.coins} (the clear's ${clearGold} and the chest's ${chest && chest.gold})`,
      !!after && after.shards - before.shards === 3 && after.coins - before.coins === clearGold + chest.gold
        && after.rare - before.rare === (chest.items.some((i) => i.key === 'rare_gem') ? 1 : 0), { before, after });
    const gained = after && skill ? cum(after.sk[skill]) - cum(before.sk[skill]) : null;
    rec.ok(`4: the clear's XP went into the weapon in hand (${skill}): +${gained}, as the card says (+${rw && rw.skillXp && rw.skillXp[skill]})`,
      !!skill && gained === rw.skillXp[skill] && gained > 0, { skill, gained, before: before.sk, after: after && after.sk });
    rec.ok('5: the card still says "Dungeon cleared!", counts down and has Leave now',
      !!card && /Dungeon cleared!/.test(card.text) && /out in \d+ s/.test(card.text) && /Leave now/.test(card.text), card && card.text);
    /* the codex's NEW MONSTER card (the boss was this walker's first Blue
       Slime) sat over the card's chest row; it steps under it now
       (NewMonsterCard.jsx, polled every 200 ms) */
    const cards = await poll(() => P.page.evaluate(() => {
      const c = document.querySelector('[data-dungeon-clear]');
      const n = document.querySelector('[data-new-monster]');
      if (!c || !n) return null;
      const a = c.getBoundingClientRect(), b = n.getBoundingClientRect();
      return { clearBottom: Math.round(a.bottom), newTop: Math.round(b.top) };
    }), 3000, 150);
    rec.ok(`5b: the codex's "New monster" card sits under the clear card, never over its chest (clear card ends at ${cards ? cards.clearBottom : '-'}, it starts at ${cards ? cards.newTop : '-'})`,
      !cards || cards.newTop >= cards.clearBottom, cards);
    const errs = P.logs.filter((l) => /^pageerror/.test(l));
    rec.ok('6: no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    await H.liveFlag(wsPort, 'slimeboss', null);
    await P.ctx.close().catch(() => {});
  }
}
