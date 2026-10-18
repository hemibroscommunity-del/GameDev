/* DO MONSTERS COME BACK? (probe, v2.3.2126)
 *
 * mp-fightsoak cannot find anything to hit: the zone's opening pack dies in
 * the first thirty seconds and `S.monsters` sits at ZERO -- the whole array
 * empty, not merely no live entries -- for the rest of a ten-minute run.
 * Server-side the respawn is plainly there (index.js _tickMonsters flips
 * alive back once respawnAt passes), so either the client drops them or the
 * soak's own interference does.
 *
 * This is the clean measurement: no auto-attack, no HP pinning, no teleporting
 * around the map.  Walk in, stand still, and watch the mirror.  Whatever this
 * shows is about the GAME, because the scenario is doing nothing to it.
 */
import * as H from './harness.mjs';
const TILE = 32;
const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py; return true;
}, { px: x, py: y }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort });
  await H.enterWorld(P);
  /* v2.3.3326: a real key every 20 s (H.keepAlive: Control, which does
     nothing in the game).  This stands still for 90 s and fights for 150,
     and the page logs itself out after two minutes with no real input
     (v2.3.3034's idle logout), the worker then holding no player. */
  const stopAlive = H.keepAlive(P);
  await P.page.waitForTimeout(2000);
  /* v2.3.3326: the lands opened by the harness (H.openLands), as
     mp-fightsoak's since v2.3.3321: since v2.3.3179 the worker refuses
     tut_2..tut_4 taken at once, so only Frost Ridge opened, the spoke's
     marker took nobody to the Verdant Wilds, and this watched the World
     View, which has no monsters (the sweep of 2026-10-17). */
  await H.openLands(P, wsPort);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return { townOut: (f.TOWN_EXITS||[]).find(e=>e.zoneId==='worldview')||null,
             spoke: (f.WORLDVIEW_EXITS||[]).find(e=>e.zoneId==='verdant')||null };
  });
  if (!marks.townOut || !marks.spoke) { rec.skip('monsters can be watched','no exit tables'); stopAlive(); await P.ctx.close().catch(()=>{}); return; }
  await stand(P, marks.townOut.tx*TILE+16, marks.townOut.ty*TILE+16);
  await H.waitFor(P,(S)=>S.currentZone,(z)=>z==='worldview',{timeout:30000,label:'hub'}).catch(()=>{});
  await P.page.waitForTimeout(700);
  await stand(P, marks.spoke.tx*TILE+16, marks.spoke.ty*TILE+16);
  await H.waitFor(P,(S)=>S.currentZone,(z)=>z==='verdant',{timeout:30000,label:'verdant'}).catch(()=>{});
  /* v2.3.3326: the worker's god mode (the Test panel's, /dev/vitals: no
     damage taken, in memory, it expires), as mp-beastmaster's.  Standing
     still among the Verdant Wilds' monsters, a fresh character was killed
     between 30 and 45 s and woke in town, its list empty for the respawn,
     not for anything the client dropped (the run of 2026-10-18).  The
     client-side HP pin below is the page's copy and never kept anyone
     alive: the worker decides a death. */
  await H.devOp(wsPort, 'vitals', await H.readState(P, (S) => S.myId), { heal: true, god: true, godMinutes: 10 });
  await P.page.waitForTimeout(2500);

  const snap = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = S.monsters || [];
    return { zone: S.currentZone, srv: !!S._serverMonsters, n: ms.length,
      live: ms.filter(m=>m && m.alive!==false && (m.curHp==null||m.curHp>0)).length,
      dead: ms.filter(m=>m && (m.alive===false || m.curHp<=0)).length,
      px: Math.round(S.player.x), py: Math.round(S.player.y) };
  });
  const first = await snap();
  console.log('    on arrival: ' + JSON.stringify(first));
  rec.ok('the worker is driving monsters here (guard)', first.srv, first);
  rec.ok('...and some are present on arrival', first.n > 0, first);

  /* Stand still for 90s. Nothing is attacking them, so nothing should die --
     if the mirror empties anyway, the client is dropping them. */
  for (let i = 1; i <= 6; i++) {
    await P.page.waitForTimeout(15000);
    const s = await snap();
    console.log(`    t=${i*15}s ` + JSON.stringify(s));
  }
  const last = await snap();
  rec.ok('standing still for 90s does not empty the monster list',
    last.n > 0, last);

  /* ═══ NOW KILL THEM, AND ONLY THAT ═══
     Auto-attack on and HP pinned so the fight cannot end by dying.  NO
     position writes at all -- the point is to isolate what emptied
     mp-fightsoak's mirror, and its two suspects are killing and moving.
     If the array empties here and does not refill, then after you clear a
     zone the client shows an empty zone until you leave and come back, which
     is a gameplay bug and not merely a harness one. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.autoAttack = true;
    window.__hits = 0;
    if (S.dmgNumbers && !S.dmgNumbers.__hooked) {
      const _p = S.dmgNumbers.push.bind(S.dmgNumbers);
      S.dmgNumbers.push = function (...a) { window.__hits += a.length; return _p(...a); };
      S.dmgNumbers.__hooked = true;
    }
    clearInterval(window.__pin);
    window.__pin = setInterval(() => {
      const St = window._gameState && window._gameState.current;
      if (!St || !St.rpg) return;
      St.rpg.hp = St.rpg.maxHp; St.rpg.stamina = St.rpg.maxStamina; St.rpg.mana = St.rpg.maxMana;
      St.autoAttack = true;
    }, 300);
  });
  for (let i = 1; i <= 10; i++) {
    await P.page.waitForTimeout(15000);
    const s = await snap();
    const h = await P.page.evaluate(() => window.__hits || 0);
    console.log(`    fighting t=${i*15}s hits=${h} ` + JSON.stringify(s));
  }
  const hits = await P.page.evaluate(() => window.__hits || 0);
  const end = await snap();
  rec.ok('auto-attack alone actually lands hits (guard)', hits > 0, hits);
  /* THE CLAIM: a zone you have fought in still has monsters in it. */
  rec.ok('the monster list does not empty out and stay empty after fighting',
    end.n > 0, { end, hits });
  stopAlive();
  await P.ctx.close().catch(()=>{});
}
