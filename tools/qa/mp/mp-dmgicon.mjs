/* THE DAMAGE NUMBER SAYS WHICH WEAPON DEALT IT (v2.3.2228).
 *
 * Owner: "Monsters are showing melee damage from bow and melee and magic
 * damage from magic."
 *
 * TWO defects, one report.  The popup carries a weapon mark beside the
 * number, and v2.3.2220 changed which popup the player ends up reading
 * without moving the mark with it:
 *
 *   1. In a server zone the number is painted from monster_hit, and that
 *      site passed 'sword' flat -- so bow and staff hits were marked melee.
 *   2. The ranged LOCAL prediction was never gated the way melee's was, so
 *      a bow or staff hit printed TWO numbers: the client's own untrusted
 *      roll and the server's real one.
 *
 * Measured, not read: this drives all three weapons at a monster in BOTH
 * authority modes and reports every popup that lands, because "what does
 * the player see" is a question about the whole field of popups and not
 * about one branch.  The probe that found it printed, for a server zone,
 * BOW -> [arrow 7] plus monster_hit -> [sword -11]: two numbers, and the
 * one that survives longest carries the wrong weapon.
 */
import * as H from './harness.mjs';

const popups = (P) => P.page.evaluate(() => (window._gameState.current.dmgNumbers || [])
  .filter((p) => p.ts !== 0)
  .map((p) => ({ text: p.text, icon: p.iconKey || null, crit: !!p.crit, color: p.color })));

const clear = (P) => P.page.evaluate(() => { window._gameState.current.dmgNumbers = []; });

async function setup(P, { serverMode }) {
  await P.page.evaluate((srv) => {
    const S = window._gameState.current;
    S._serverMonsters = !!srv;
    S._facing = 'right';
    S.arrows = [];
    S.dmgNumbers = [];
    S.monsters = [{
      id: 'qa-icon', x: S.player.x + 40, y: S.player.y, hp: 9000, maxHp: 9000,
      curHp: 9000, alive: true, arch: 'fodder', type: 'fodder', level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0, spawnX: S.player.x + 40, spawnY: S.player.y,
    }];
  }, serverMode);
  await P.page.waitForTimeout(300);
}

async function swing(P) {
  await clear(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    S.rpg.activeSlot = 'melee';
    const m = S.monsters.find((x) => x.id === 'qa-icon');
    if (m) { m._hitAnimStart = 0; m._hitAnimEnd = 0; m._hitThisSwing = false; }
    S.swingTimer = Date.now();
    S.isSwinging = true;
  });
  await P.page.waitForTimeout(700);
  return popups(P);
}

/* A SHOT IN FLIGHT, in the shape the auto-attack loop actually pushes
   (monsterCombat.js v2.3.937/1335) -- the tick flies it into the monster and
   runs the real hit path, which is where the icon is chosen. */
async function shoot(P, staff) {
  await clear(P);
  await P.page.evaluate((isStaff) => {
    const S = window._gameState.current;
    S.rpg.activeSlot = isStaff ? 'staff' : 'ranged';
    S.rpg[isStaff ? 'staffWeapon' : 'rangedWeapon'] = {
      type: isStaff ? 'staff' : 'bow', name: 'QA ' + (isStaff ? 'Staff' : 'Bow'),
      tier: 'common', tierMult: 1, gearBase: 'wood', quality: 'normal',
      element1: null, element2: null, hardness: 0, temper: 0,
    };
    S._facing = 'right';
    const m = S.monsters && S.monsters.find((x) => x.id === 'qa-icon');
    if (m) { m.x = S.player.x + 70; m.y = S.player.y; m.curHp = 9000; m.alive = true; }
    S.arrows = [{
      ang: 0,
      /* fromGrip:false for BOTH: the grip origin is stamped by the
         renderer each frame (S._bowGripX) and a headless fixture has no
         swing to stamp it, so an arrow asked to wait at the grip never
         leaves.  The hit path under test is the same either way. */
      dist: 14,
      fromGrip: false,
      dmg: 7,
      life: isStaff ? 68 : 90,
      maxLife: isStaff ? 68 : 90,
      hitIds: new Set(),
      isStaff: !!isStaff,
      element: null,
    }];
  }, staff);
  let diag = null;
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(80);
    diag = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x.id === 'qa-icon');
      /* PIN IT.  In a client-rolled zone the client runs monster AI, and
         this fixture is not a full monster -- left alone it walks itself to
         NaN within a frame or two and the arrow has nothing to collide
         with.  Server-settled zones do not run that AI, which is why the
         same fixture behaves there. */
      if (m) { m.x = S.player.x + 70; m.y = S.player.y; m.vx = 0; m.vy = 0; m.alive = true; m.curHp = 9000; }
      return {
        pops: (S.dmgNumbers || []).length, arrows: (S.arrows || []).length,
        mon: m ? { hp: m.curHp, x: Math.round(m.x - S.player.x) } : null,
        srv: !!S._serverMonsters,
      };
    });
    if (diag.pops > 0) break;
  }
  const out = await popups(P);
  if (!out.length) console.log('      (no popup) diag=' + JSON.stringify(diag));
  return out;
}

/* The server's own word on the hit, delivered down the client's RECEIVE
   path (__btDispatch, the same door the worker's events come in by).  Since
   v2.3.2220 this is what paints the number for EVERY own hit in a server
   zone -- the local prediction's popup is suppressed there. */
async function serverHit(P, slot, opts) {
  await clear(P);
  await P.page.evaluate(({ sl, peer }) => {
    const S = window._gameState.current;
    /* Re-injected every time: in a server zone the worker's snapshot
       replaces S.monsters wholesale, so a monster planted once does not
       survive to the next assertion. */
    if (!(S.monsters || []).some((m) => m.id === 'qa-icon')) {
      S.monsters = (S.monsters || []).concat([{
        id: 'qa-icon', x: S.player.x + 40, y: S.player.y, hp: 9000, maxHp: 9000,
        curHp: 9000, alive: true, arch: 'fodder', type: 'fodder', level: 3,
        statuses: {}, vx: 0, vy: 0, atkCd: 0, spawnX: S.player.x + 40, spawnY: S.player.y,
      }]);
    }
    const payload = {
      monsterId: 'qa-icon', attackerId: peer ? 'qa-someone-else' : S.myId,
      dmg: 11, hpPct: 0.9, isCrit: false,
    };
    if (sl) payload.slot = sl;
    window.__btDispatch({ type: 'monster_hit', payload });
  }, { sl: slot, peer: !!(opts && opts.peer) });
  /* A peer's number rides the smoothing queue (enqueuePeerDamage), which
     drips it out over a few frames -- so this polls rather than reading
     once: the release window and the popup's own TTL do not overlap for
     long, and a single read at a fixed delay can fall on either side. */
  let out = [];
  for (let i = 0; i < 24; i++) {
    await P.page.waitForTimeout(50);
    out = await popups(P);
    if (out.length) break;
  }
  if (!out.length) {
    const d = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return {
        q: JSON.stringify(S._peerDmgQueue || {}), zone: S._peerDmgZone, cur: S.currentZone,
        mons: (S.monsters || []).map((m) => m.id).slice(0, 5),
      };
    });
    console.log('      (no popup) serverHit diag=' + JSON.stringify(d));
  }
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Iconer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  for (const serverMode of [false, true]) {
    const tag = serverMode ? 'server-settled' : 'client-rolled';
    await setup(P, { serverMode });

    const sw = await swing(P);
    console.log(`    [${tag}] MELEE  -> ` + JSON.stringify(sw));
    const bow = await shoot(P, false);
    console.log(`    [${tag}] BOW    -> ` + JSON.stringify(bow));
    const staff = await shoot(P, true);
    console.log(`    [${tag}] STAFF  -> ` + JSON.stringify(staff));


    const icons = (list) => list.map((p) => p.icon).filter(Boolean);
    if (!serverMode) {
      /* Client-rolled zones keep the local prediction: it IS the truth
         there, so the number still comes from the swing and still carries
         its mark.  This is the control for the gate added in v2.3.2228 --
         if it were gated too broadly, this would go silent. */
      rec.ok(`[${tag}] a melee hit is marked with the sword`,
        icons(sw).includes('sword'), sw);
      /* The ranged half of that control is NOT asserted, and the reason is
         the fixture rather than the code: an injected arrow does not
         survive a frame in a client-rolled town (`arrows: 0` on the first
         poll, no collision), while the same object flies and connects in a
         server-settled one.  Driving it for real needs the auto-attack
         loop, which needs a live monster this harness cannot spawn into
         town.  Left as a marker rather than a passing assertion that does
         not assert anything -- and the mode itself is a legacy remnant
         (CLAUDE.md rule zero: there is no single-player mode). */
      rec.skip(`[${tag}] a bow/staff hit keeps its own mark`,
        'an injected arrow does not survive a frame in a client-rolled town');
    } else {
      /* ── DEFECT 2: ONE NUMBER PER HIT ──
         The worker rolls its own variance and crit and ignores ours, so a
         local prediction here is a second, independent roll.  Melee has
         been silent since v2.3.2220; ranged had not caught up. */
      rec.ok(`[${tag}] a melee hit prints no local number (the server's is the truth)`,
        sw.length === 0, sw);
      rec.ok(`[${tag}] a bow hit prints no local number either`,
        bow.length === 0, bow);
      rec.ok(`[${tag}] ...nor does a staff hit`,
        staff.length === 0, staff);
    }
  }

  /* ── DEFECT 1: THE SERVER'S NUMBER NAMES THE WEAPON ──
     monster_hit is what paints every own hit in a server zone, and it is
     driven straight down the client's receive door so the assertion is
     about the popup and not about how the hit was produced. */
  await P.page.evaluate(() => { window._gameState.current._serverMonsters = true; });
  for (const [slot, want] of [['melee', 'sword'], ['ranged', 'arrow'], ['staff', 'spell']]) {
    const got = await serverHit(P, slot);
    console.log(`    monster_hit slot=${slot} -> ` + JSON.stringify(got));
    rec.ok(`the server's number for a ${slot} hit is marked '${want}'`,
      got.length === 1 && got[0].icon === want, got);
  }

  /* ...and a PEER's hit gets the same treatment, which the client could
     never do on its own: another player's weapon is not knowable locally,
     which is why peer numbers carried no mark at all before v2.3.2228. */
  const peer = await serverHit(P, 'ranged', { peer: true });
  console.log('    monster_hit (peer, ranged) -> ' + JSON.stringify(peer));
  rec.ok("a PEER's bow hit is marked with the arrow too",
    peer.length === 1 && peer[0].icon === 'arrow', peer);

  /* DEPLOY ORDER (rule 19): an older worker names no slot.  Our own hit
     falls back to what WE are holding; a peer's declines to guess rather
     than stamping our weapon on their hit. */
  await P.page.evaluate(() => { window._gameState.current.rpg.activeSlot = 'staff'; });
  const oldOwn = await serverHit(P, null);
  rec.ok('against a worker that names no slot, our own hit falls back to what we hold',
    oldOwn.length === 1 && oldOwn[0].icon === 'spell', oldOwn);
  const oldPeer = await serverHit(P, null, { peer: true });
  rec.ok("...and a peer's is left unmarked rather than marked with OUR weapon",
    oldPeer.length === 1 && !oldPeer[0].icon, oldPeer);

  await P.ctx.close().catch(() => {});
}
