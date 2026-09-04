/* THE MAGIC SPECIAL IS ONE LINE OF THREE, AND RANGED STARTS AT 80% OF MELEE
 * (v2.3.2259)
 *
 * Two owner requests in one PR, and they share a scenario because they share
 * a weapon:
 *
 *   "Instead of the current behavior I want the 3 orbs to follow the same
 *    linear path in quick succession.  So that way a monster can get hit 3
 *    times in a row with the orbs instead of it going 3 different
 *    directions."
 *   "Bump up the default weapon DPS of magic and bow.  They should both
 *    start roughly 20% lower than the default melee weapon DPS."
 *
 * ═══ WHY THE DPS HALF IS ASKED, NOT COMPUTED ═══
 * "20% lower than the default melee weapon" is a ratio between three
 * specific items, and four separate things decide it:
 *   the base (WEAPON_TYPES), the tier multiplier (the melee starter is
 *   COPPER at 1.12, both ranged starters are PINE at 1.00), the per-type
 *   variance band (melee and staff both mean 1.00 but the bow's 0.6-0.8
 *   means 0.70 -- a 30% haircut that is invisible in the table), and the
 *   cadence (600ms for everything, +300 for the staff alone; WEAPON_TYPES
 *   `speed` is NOT cadence and nothing in combat reads it).
 * A scenario that multiplied those four numbers itself would pass against a
 * build where any one of them had moved, because it would be checking its
 * own arithmetic (TRAPS #35).  So it asks calcDisplayDmgRange /
 * calcDisplayDps -- the SAME functions the item card and the Equipped pane
 * read -- and asserts the ratio between their answers.  What is pinned is
 * therefore the promise the player is shown.
 *
 * Where this started, for the record: bow 8.51 DPS and staff 9.49 against
 * the Copper Great Sword's 18.67, i.e. 46% and 51%.  The owner's "magic and
 * bow feel weak" was measurable, and the fix is a real bump, not a rounding.
 *
 * ═══ WHY THE ORB HALF IS FIRED, NOT INSPECTED ═══
 * The cone was made of TWO things and removing either alone changes
 * nothing a player would notice: the +-0.25 rad fan on the angle, and
 * `volleyHitIds` (v2.3.1435), a hit set SHARED by the three orbs so a
 * monster could eat at most one.  Reading S.arrows proves the first;
 * only a monster standing on the line proves the second.  So the volley is
 * fired at a real monster through the game's own specialAttack() and the
 * monster's own hp is watched.
 */
import * as H from './harness.mjs';

/* The starting kit, named the way the quest table names it.  Tier keys, not
   multipliers -- the numbers come from the game's own tier tables below. */
const MELEE = { type: 'greatsword', tierKey: 'copper', table: 'BLACKSMITH_TIERS', name: 'Copper Great Sword' };
const BOW   = { type: 'bow',        tierKey: 'pine',   table: 'WOODWORKING_TIERS', name: 'Pine Bow' };
const STAFF = { type: 'staff',      tierKey: 'pine',   table: 'WOODWORKING_TIERS', name: 'Pine Staff' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Orbs', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* ════════════════ 1. THE DPS RATIO ════════════════
     The melee starter is taken from the quest that actually pays it, so the
     reference weapon is the real record with its real tierMult.  The two
     PINE weapons are minted here because tut_1 pays them on TURN-IN and the
     turn-in wants four snowmen in another zone -- but their tier comes out
     of the game's WOODWORKING_TIERS, never a literal, which is the part
     that would otherwise rot. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);

  const kit = await P.page.evaluate(({ MELEE, BOW, STAFF }) => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    const i = (R.weaponStash || []).findIndex((w) => w && /Sword/i.test(w.name || ''));
    const sword = i >= 0 ? R.weaponStash.splice(i, 1)[0] : null;
    if (sword) R.weapon = sword;
    const mint = (spec) => {
      const t = (F[spec.table] || {})[spec.tierKey];
      if (!t) return null;
      return { type: spec.type, tierMult: t.tierMult, gearBase: spec.tierKey, name: spec.name, tier: 'common' };
    };
    R.rangedWeapon = mint(BOW);
    R.staffWeapon = mint(STAFF);
    return {
      melee: R.weapon ? { type: R.weapon.type, tierMult: R.weapon.tierMult, name: R.weapon.name } : null,
      bow: R.rangedWeapon, staff: R.staffWeapon,
    };
  }, { MELEE, BOW, STAFF });
  console.log('    kit: ' + JSON.stringify(kit));
  rec.ok('the quest paid a real melee starter and both pine weapons were minted (guard)',
    !!kit.melee && kit.melee.type === MELEE.type && !!kit.bow && !!kit.staff
      && kit.bow.tierMult > 0 && kit.staff.tierMult > 0, kit);
  /* The reference weapon must be the COPPER one.  If the quest ever hands a
     different tier, every ratio below is measured against a different
     yardstick and the numbers would drift silently. */
  rec.ok('...and the melee reference really is the copper tier the quest pays',
    !!kit.melee && Math.abs(kit.melee.tierMult - 1.12) < 0.001, kit.melee);

  const dps = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    if (!F.calcDisplayDps || !F.calcDisplayDmgRange) return { __noBridge: true };
    const read = (w) => {
      if (!w) return null;
      const r = F.calcDisplayDmgRange(R, w);
      if (!r) return null;
      /* THE DPS UNDER TEST IS THE ROLLED ONE, not the printed one.  The card
         ROUNDS its min and max to whole numbers, and on a starting weapon
         whose whole range is three points wide that rounding moves the mean
         by several percent -- enough to make an on-target tune read as off
         and vice versa.  So the mean comes from the game's OWN roll,
         calcWeaponDmg, sampled enough times for the noise to fall below the
         thing being measured; the card's range and DPS ride along as the
         player-facing report. */
      let sum = 0;
      const N = 20000;
      for (let i = 0; i < N; i++) sum += F.calcWeaponDmg(w.type, R, w.tierMult || 1, w);
      return { min: r.min, max: r.max, cdMs: r.cdMs,
        rolled: sum / N, dps: (sum / N) / (r.cdMs / 1000),
        cardDps: F.calcDisplayDps(R, w) };
    };
    return { melee: read(R.weapon), bow: read(R.rangedWeapon), staff: read(R.staffWeapon) };
  });
  console.log('    dps: ' + JSON.stringify(dps));
  rec.ok('the game can price all three starting weapons (guard)',
    !!dps.melee && !!dps.bow && !!dps.staff && dps.melee.dps > 0, dps);

  /* The staff is the one that pays a cadence penalty, and it is the reason
     the two ranged bases are different numbers for the same DPS.  Pinned so
     a change to _staffCdExtra cannot quietly retune magic. */
  rec.ok('the staff still casts slower than everything else swings',
    dps.staff.cdMs === dps.melee.cdMs + 300 && dps.bow.cdMs === dps.melee.cdMs,
    { melee: dps.melee.cdMs, bow: dps.bow.cdMs, staff: dps.staff.cdMs });

  /* ROUGHLY 20% LOWER.  The tolerance is +-6 points of the ratio, which is
     wider than the rounding in the card's integer min/max (about 1 point at
     these sizes) and far tighter than the 46%/51% this replaced -- so it can
     tell "retuned" from "not retuned" without being brittle about a digit. */
  for (const [label, r] of [['bow', dps.bow], ['staff', dps.staff]]) {
    const ratio = r.dps / dps.melee.dps;
    rec.ok(`the ${label} starts at roughly 80% of the default melee weapon's DPS (${(ratio * 100).toFixed(1)}%)`,
      ratio >= 0.74 && ratio <= 0.86,
      { ratio: +ratio.toFixed(3), [label]: r, melee: dps.melee });
  }

  /* ════════════════ 2. ONE RAY, THREE ORBS ════════════════ */
  const fired = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    R.activeSlot = 'staff';
    R.mana = R.maxMana = 500;
    S._lastSwipe = 0;
    S.arrows = [];
    S._aimAngle = 0;                       /* straight right, so the ray is knowable */
    if (!F.specialAttack) return { __noBridge: true };
    F.specialAttack();
    return (S.arrows || []).map((a) => ({
      ang: a.ang, dist: a.dist, isStaff: !!a.isStaff, isSpecial: !!a.isSpecial,
      launchDelayMs: a.launchDelayMs || 0, hasVolleySet: !!a.volleyHitIds,
      life: a.life,
    }));
  });
  console.log('    orbs: ' + JSON.stringify(fired));
  rec.ok('the magic special still fires exactly three orbs',
    Array.isArray(fired) && fired.length === 3 && fired.every((o) => o.isStaff && o.isSpecial), fired);
  if (Array.isArray(fired) && fired.length === 3) {
    /* THE LINE.  Every orb on the same angle -- this is the half of the
       change a player sees immediately. */
    rec.ok('...all three on ONE angle, not a cone',
      fired.every((o) => Math.abs(o.ang - fired[0].ang) < 1e-9), fired.map((o) => o.ang));
    /* THE SUCCESSION.  Three distinct launch delays, so they arrive one at a
       time rather than as a wall.  Asserted as "distinct and increasing"
       rather than as the literal gap: the gap is a feel number the owner may
       retune, three-at-once is the bug. */
    const delays = fired.map((o) => o.launchDelayMs).sort((a, b) => a - b);
    rec.ok('...launched in succession, not all on one frame',
      delays[0] === 0 && delays[1] > delays[0] && delays[2] > delays[1] && delays[2] <= 1000, delays);
    /* THE SHARED HIT SET IS GONE.  Without this the three orbs above would
       still be one hit on one monster, and the scenario would be green on a
       change that did nothing. */
    rec.ok('...and no orb carries the shared volley hit set any more',
      fired.every((o) => o.hasVolleySet === false), fired.map((o) => o.hasVolleySet));
    /* Held orbs must not age while they wait, or orb 3 falls short of the
       line orb 1 flew. */
    rec.ok('...every orb starts with the same flight budget',
      fired.every((o) => Math.abs(o.life - fired[0].life) < 1e-9), fired.map((o) => o.life));
  }

  /* ════════════════ 3. A MONSTER ON THE LINE TAKES THREE HITS ════════════════
     Town is a client-local zone (`_serverMonsters` false), so the monster's
     own hp is what moves and this reads the real hit path rather than a
     count of messages.  The monster is minted through the game's own
     createMonster and then given a deep hp pool: what is being counted is
     HITS, and a fodder slime would die to the second orb and make the third
     unobservable. */
  const spawned = await P.page.evaluate(() => {
    const S = window._gameState.current, F = window._gameFns || {};
    if (!F.createMonster || !S.player) return null;
    const arch = Object.keys(F.ARCHETYPES || {}).find((k) => k === 'fodder');
    if (!arch) return null;
    S.arrows = [];
    const m = F.createMonster('orbline-1', arch, 2, S.player.x + 190, S.player.y, null);
    if (!m) return null;
    m.alive = true;
    m.curHp = m.maxHp = 100000;      /* count hits, not damage */
    m._frozenUntil = 0;
    S.monsters = (S.monsters || []).concat([m]);
    /* Lock it the way a magic player must under the new rules -- by TAPPING.
       src:'tap' is what survives the melee-only auto-target gate (v2.3.2258),
       and the lock is what the orbs aim at. */
    S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
    S._lastSwipe = 0;
    S.rpg.mana = S.rpg.maxMana = 500;
    return { id: m.id, hp: m.curHp, x: m.x, y: m.y };
  });
  rec.ok('a deep-pool monster is standing on the line (guard)', !!spawned, spawned);

  if (spawned) {
    const shot = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m0 = (S.monsters || []).find((x) => x && x.id === 'orbline-1');
      const hpBefore = m0 ? m0.curHp : null;
      /* Sample the monster's own hp across the volley and stamp every DROP.
         The timestamps are what the SPACING claim is made from; the COUNT is
         taken from the hp arithmetic below instead, because a poll can merge
         two hits that land inside one of its windows and would then report a
         working game as broken (it did, once, in five runs). */
      S.__orbProbe = { last: hpBefore, drops: [] };
      S.__orbTimer = setInterval(() => {
        const m = (S.monsters || []).find((x) => x && x.id === 'orbline-1');
        if (!m) return;
        if (S.__orbProbe.last != null && m.curHp < S.__orbProbe.last) {
          S.__orbProbe.drops.push({ t: Date.now(), amount: S.__orbProbe.last - m.curHp });
        }
        S.__orbProbe.last = m.curHp;
      }, 20);
      window._gameFns.specialAttack();
      /* Every orb of one volley carries the SAME damage (playerActions rolls
         it once, outside the loop), so total hp lost / that number is an
         exact hit count -- no sampling in it at all. */
      const orbs = (S.arrows || []).filter((a) => a.isSpecial && a.isStaff);
      return { hpBefore, orbDmg: orbs.length ? orbs[0].dmg : null, orbs: orbs.length };
    });
    await P.page.waitForTimeout(3000);
    const probe = await P.page.evaluate(() => {
      const S = window._gameState.current;
      clearInterval(S.__orbTimer);
      const p = S.__orbProbe || { drops: [] };
      const m = (S.monsters || []).find((x) => x && x.id === 'orbline-1');
      const t0 = p.drops.length ? p.drops[0].t : 0;
      return {
        hpAfter: m ? m.curHp : null,
        drops: p.drops.length,
        gapsMs: p.drops.map((d) => d.t - t0),
        amounts: p.drops.map((d) => d.amount),
      };
    });
    const hits = (shot.orbDmg > 0 && probe.hpAfter != null)
      ? (shot.hpBefore - probe.hpAfter) / shot.orbDmg : -1;
    console.log('    hits: ' + JSON.stringify({ hits, ...shot, ...probe }));
    rec.ok('the volley left the caster as three orbs (guard)', shot.orbs === 3 && shot.orbDmg > 0, shot);
    rec.ok('the monster on the line is hit three times by the one volley',
      hits === 3, { hits, ...shot, ...probe });
    /* ...IN SUCCESSION.  Three hits inside one frame would satisfy the count
       above and be exactly the wall the owner asked to replace, so the
       spacing is asserted too: the landings are spread over at least 100ms
       and are done inside the special's own 1500ms cooldown. */
    if (hits === 3 && probe.drops >= 2) {
      const span = probe.gapsMs[probe.gapsMs.length - 1];
      rec.ok(`...one after another rather than in one burst (${span}ms apart end to end)`,
        span >= 100 && span <= 1500, probe.gapsMs);
    } else if (hits === 3) {
      rec.ok('...one after another rather than in one burst',
        false, { note: 'all three landed inside one 20ms sample', ...probe });
    }
  }

  await P.ctx.close().catch(() => {});
}
