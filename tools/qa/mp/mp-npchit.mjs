/* v2.3.3534: A TOWNSPERSON IS NEVER KILLED -- on a phone in the Wheel's
 * BroTown.
 *
 * The review's check, a week before reviewers play: a few sword swings
 * "killed" Mayor Bro, Diego or anyone else in town.  A skull and a boom, ten
 * seconds gone (no quest, no shop, nobody to talk to: the talk scan skips the
 * dead), a 5-gold pile and "+5 XP" that the worker never paid -- nothing about
 * a townsperson goes on the wire, so the next player_state took them back.
 * Now a townsperson (every one is `noHp`) loses nothing: the swing still
 * lands, its sound, the red bits and the shove, which he walks back from.
 *
 *   1. in the Wheel's BroTown with the dev kit's great sword in hand, the
 *      worker's (guard: a bare fist does no damage, so it never "killed"
 *      anyone even before);
 *   2. for Mayor Bro, Lil Bro and Blacksmith Bro, 24 of the game's own tapped
 *      swings (window._gameFns.swingAttack) from beside him:
 *      at least 12 land (each swing's own hit flag, counted) and shove him
 *      (guard: the swings are real); through all of them he never dies, his
 *      health never drops, you can always talk to him (the game's talk target
 *      is him), no pile with a townsperson's skull lies on the ground, no
 *      "+5 XP" goes up, and your gold and XP stay where they were;
 *   3. he walks back to his own spot after the shoves;
 *   4. no page errors.
 * On the game before this (QA_DIST=<a build of main>) step 2 fails for each:
 * he dies within the swings, drops the pile and pays the XP.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const WHO = [['mayor_bro', 'Mayor Bro'], ['lil_bro', 'Lil Bro'], ['blacksmith_bro', 'Blacksmith Bro']];
const SWINGS = 24;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Swingbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
    if (!inWheel) return;
    const id = await H.readState(P, (S) => S.myId);
    /* every quest done: nobody's window opens as you stand beside him */
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });

    /* ── 1. a real sword, the worker's: the kit, then the game's own equip ── */
    await H.devOp(wsPort, 'kit', id, { what: 'weapons' });
    let inBag = false;
    for (let i = 0; i < 60 && !inBag; i++) {
      inBag = await H.readState(P, (S) => !!((S.rpg && S.rpg.weaponStash) || []).find((w) => w && w.type === 'greatsword'));
      if (!inBag) await P.page.waitForTimeout(250);
    }
    if (inBag) await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    const held = await H.waitFor(P, (S) => ({ w: S.rpg && S.rpg.weapon && S.rpg.weapon.type, slot: S.rpg && S.rpg.activeSlot }),
      (v) => v.w === 'greatsword' && v.slot === 'melee', { timeout: 20000, label: 'a great sword in hand' }).catch(() => null);
    rec.ok('the dev kit\'s great sword in hand, put there by the worker (guard)', !!held, { inBag, held });
    const cast = await H.waitFor(P, (S) => (S.npcs || []).map((n) => ({ id: n.id, noHp: !!n.noHp })),
      (v) => Array.isArray(v) && v.length >= 6, { timeout: 20000, label: 'the townsfolk' }).catch(() => null);
    rec.ok(`the townsfolk stand in BroTown, every one of them noHp (${(cast || []).length}) (guard)`,
      !!cast && cast.every((n) => n.noHp) && WHO.every(([nid]) => cast.some((n) => n.id === nid)), cast);
    if (!held || !cast) return;

    /* the watch: every townsperson's death and landed hit counted as it
       happens (setters on his own record), and every 50 ms his health, the
       talk target, the ground's piles and the HUD's XP lines */
    await P.page.evaluate(() => {
      const W = window.__npcHit = { died: {}, hits: {}, hpLow: {}, lostTalk: 0, piles: 0, xpPops: 0, who: null };
      const watch = (n) => {
        if (!n || n.__npcWatched) return;
        n.__npcWatched = true;
        let alive = n.alive, hit = n._hitThisSwing;
        Object.defineProperty(n, 'alive', { configurable: true, enumerable: true, get() { return alive; },
          set(v) { if (alive && !v) W.died[n.id] = (W.died[n.id] || 0) + 1; alive = v; } });
        Object.defineProperty(n, '_hitThisSwing', { configurable: true, enumerable: true, get() { return hit; },
          set(v) { if (v && !hit) W.hits[n.id] = (W.hits[n.id] || 0) + 1; hit = v; } });
      };
      setInterval(() => {
        const S = window._gameState && window._gameState.current;
        if (!S) return;
        for (const n of S.npcs || []) {
          watch(n);
          if (n && typeof n.hp === 'number' && n.hp < (n.maxHp || 100)) W.hpLow[n.id] = Math.min(W.hpLow[n.id] ?? Infinity, n.hp);
        }
        if (W.who && !(S._nearNpc && S._nearNpc.id === W.who)) W.lostTalk++;
        for (const l of S.groundLoot || []) if (l && l.skull === 'npc' && !l.__seen) { l.__seen = true; W.piles++; }
        for (const p of S._hudPopups || []) if (p && /\+5 XP/.test(p.text || '') && !p.__seen) { p.__seen = true; W.xpPops++; }
      }, 50);
    });

    for (const [nid, name] of WHO) {
      const before = await P.page.evaluate((who) => {
        const S = window._gameState.current, n = (S.npcs || []).find((o) => o && o.id === who);
        const inv = (S.rpg && S.rpg.inventory) || {};
        return n ? { x: n.x, y: n.y, sx: n.spawnX, sy: n.spawnY, coins: S.rpg.coins, xp: S.rpg.xp, npcItems: inv.npc || 0 } : null;
      }, nid);
      if (!before) { rec.ok(`${name} is in BroTown (guard)`, false); continue; }
      /* ── 2. 24 swings from beside him, south of him (the street side: a
         townsperson stands at a building's steps facing the street), stood
         there again before each one as his shove carries him off ── */
      let shoved = 0;
      for (let i = 0; i < SWINGS; i++) {
        const at = await P.page.evaluate((who) => {
          const S = window._gameState.current, me = S.player;
          const n = (S.npcs || []).find((o) => o && o.id === who);
          if (!n || !me) return null;
          me.x = n.x; me.y = n.y + 30;
          S.lockedTarget = null;
          S._facing = 'up';
          S._aiming = true; S._aimAngle = Math.atan2(n.y - me.y, n.x - me.x);
          /* the game's own tapped swing (playerActions.swingAttack): its
             checks, its hit flags cleared, the sweep on the next frames */
          window._gameFns.swingAttack();
          return { x: n.x, y: n.y };
        }, nid);
        await P.page.waitForTimeout(700);
        /* the talk target is watched from the first swing on, once a frame has
           seen you beside him (it is chosen once a frame) */
        if (i === 0) await P.page.evaluate((who) => { window.__npcHit.who = who; }, nid);
        const after = await P.page.evaluate((who) => {
          const n = (window._gameState.current.npcs || []).find((o) => o && o.id === who);
          return n ? { x: n.x, y: n.y } : null;
        }, nid);
        if (at && after && Math.hypot(after.x - at.x, after.y - at.y) > 0.5) shoved++;
      }
      await P.page.evaluate(() => { window.__npcHit.who = null; });
      await P.page.waitForTimeout(800);   /* a pile, if one fell, under your boots and picked up */
      const W = await P.page.evaluate((who) => {
        const S = window._gameState.current, W = window.__npcHit;
        const inv = (S.rpg && S.rpg.inventory) || {};
        return { died: W.died[who] || 0, hits: W.hits[who] || 0, hpLow: W.hpLow[who] ?? null, lostTalk: W.lostTalk,
          piles: W.piles, xpPops: W.xpPops, coins: S.rpg.coins, xp: S.rpg.xp, npcItems: inv.npc || 0 };
      }, nid);
      rec.ok(`${name}: the swings land on him (${W.hits} of ${SWINGS}) and shove him (${shoved}) (guard)`, W.hits >= 12 && shoved >= 6, W);
      rec.ok(`${name}: never killed (${W.died} deaths), never hurt (lowest HP ${W.hpLow ?? 'full'})`, W.died === 0 && W.hpLow === null, W);
      rec.ok(`${name}: always there to talk to while you swing (the talk target was someone else ${W.lostTalk} times)`, W.lostTalk === 0, W);
      rec.ok(`${name}: no pile with a townsperson's skull (${W.piles}), no "+5 XP" (${W.xpPops}), your gold ${before.coins} -> ${W.coins} and XP ${before.xp} -> ${W.xp} untouched`,
        W.piles === 0 && W.xpPops === 0 && W.coins === before.coins && W.xp === before.xp && W.npcItems === before.npcItems, { before, W });
      await P.page.evaluate(() => { const W = window.__npcHit; W.lostTalk = 0; W.piles = 0; W.xpPops = 0; });

      /* ── 3. he walks back to his own spot (pathRadius 0 in the Wheel) ── */
      await P.page.evaluate((who) => {
        window.__npcHomeWho = who;
        const S = window._gameState.current, n = (S.npcs || []).find((o) => o && o.id === who);
        if (n && S.player) { S.player.x = n.spawnX + 200; S.player.y = n.spawnY + 120; }
      }, nid);
      /* readState sends the function as text: the id comes from the page */
      const home = await H.waitFor(P, (S) => {
        const n = (S.npcs || []).find((o) => o && o.id === window.__npcHomeWho);
        return n ? { off: Math.hypot(n.x - n.spawnX, n.y - n.spawnY), alive: n.alive } : null;
      }, (v) => !!v && v.off < 3, { timeout: 15000, label: name + ' home' }).catch((e) => ({ err: String(e).slice(0, 200) }));
      rec.ok(`${name}: walks back to his own spot after the shoves`, !!home && home.off < 3 && home.alive === true, home);
    }

    /* ── 4. no page errors ── */
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
