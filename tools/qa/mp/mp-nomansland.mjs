/* ═══ NO MAN'S LAND, ON TWO SCREENS (v2.3.3058) ═══
 *
 * Owner, 2026-10-05: "Add a new 'No man's land' notification when you cross
 * into zones with lvl 6+ monsters.  It'll start at 1.  This means any other
 * player 1 level above or below you can attack you.  If you die by another
 * player you lose all the things in your inventory except what you have
 * actively equipped.  The player who attacks you gets a red skull above their
 * head for 20 minutes ... Players who get attacked have a white skull above
 * their head. ..."
 *
 * Two real players against a real worker, out on a land's No man's land 1
 * ring (v2.3.3690: the Lv 1-5 ring just outside the safe ground -- the
 * owner: "No man's land should begin just outside of town where you can
 * fight the lvl 1 monsters"; it was the Lv 6-10 ring):
 *   1. each is told: the banner ("No man's land 1"), a line in the chat, and
 *      (v2.3.3107) the skull badge centred just above the dashboard, and
 *      (v2.3.3108) the minimap's name plate showing the level band, the badge
 *      carrying No man's land;
 *   2. the raider taps the wanderer: the tap AIMS (S.lockedTarget, `nml`) and
 *      opens no card -- since v2.3.3253 through the small window the tap
 *      raises ("Attack Wanderer?", game/nmlAsk.js), whose Attack aims;
 *   3. a swing lands (the worker's HP for the wanderer drops): the raider wears
 *      a RED skull, the wanderer a WHITE one, each sees the other's (the tick's
 *      `sk`), and the raider is told what the red skull means;
 *   4. the killing blow: the wanderer's game is told what went and says so;
 *      the spare greatsword leaves the wanderer's bag and arrives in the
 *      raider's -- and (v2.3.3091) so does the spare shield: the wanderer's
 *      game told the worker its arm is bare (shield_wear), so the quest's
 *      Pine Shield in its bag is a spare; the bag's minnows lie in a pile
 *      that is the raider's;
 *   3b. (v2.3.3107) the raider's badge wears their red skull, and a tap on it
 *      opens what No man's land means, with the skull's minutes left;
 *   4b. (v2.3.3316) the owner: "Opponents do not drop all of their items
 *      except what they have equipped" -- the wanderer also carries ores,
 *      cooked fish, all three gathering tools and gold, which a death used to
 *      keep: after the kill their bag is EMPTY and their purse too, the
 *      greatsword in their hand still theirs; the ore, the fish and the tools
 *      lie in the raider's pile, the gold is the raider's, and the raider is
 *      told what they took;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/nomansland-*.png.
 *
 * Both are untouchable on the walk out (the fight is the test, not the road),
 * and the spot is chosen far from every baked monster place and checked dry
 * and clear once the ground near it is in.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 1000, height: 780 };

/* where on the raider's page the wanderer stands (the tap handler's own
   arithmetic, BroTown.jsx onClick: (world - camera) * the world scale, from
   the canvas's corner) */
const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1),
    th: Math.atan2(oy - S.player.y, ox - S.player.x) };
}, id);

/* one swing at the wanderer: on a computer the attack is a click, and the
   one you fight is where you click -- ON them, which keeps the lock (a click
   on empty ground lets it go, BroTown.jsx onClick) */
async function swingAt(A, id) {
  const pt = await peerOnScreen(A, id);
  if (!pt) return false;
  await A.page.mouse.move(pt.x, pt.y - 4);
  await A.page.waitForTimeout(60);
  await A.page.mouse.down();
  await A.page.waitForTimeout(220);
  await A.page.mouse.up();
  await A.page.waitForTimeout(450);
  return true;
}

/* walk the raider until the WORKER has the two within melee reach (mp-duel's
   closeIn: the client's copy of a peer can be tens of px stale) */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 16; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `nomansland-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: VIEW });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.nomansland));
  rec.ok('setup: both in the Wheel, and the worker advertises caps.nomansland', okA && okB && caps, { okA, okB, caps });
  if (!(okA && okB && caps)) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* real input on a loop on both: a page logs itself out after two minutes
     without any (Control does nothing in the game) */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }

  /* armed the game's way (mp-duel): the first quest pays a greatsword and a
     shield into the bag; the raider straps the sword on, the wanderer keeps
     theirs in the bag -- a SPARE weapon, which is what a death here takes */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1800);
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R || !S.channel) return;
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (i < 0) return;
    R.weapon = R.weaponStash[i]; R.weaponStash.splice(i, 1); R.activeSlot = 'melee';
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
  });
  await A.page.waitForTimeout(1500);
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);
  await H.grant(wsPort, idB, 'item', { invKey: 'fish_minnow', count: 3 }).catch(() => {});
  /* v2.3.3316: what a death used to keep -- every ore and cooked fish (the
     first quests' objectives) and the gathering tools -- and gold */
  for (const [invKey, count] of [['ore_iron', 4], ['cooked_fish_minnow', 2], ['woodcutting_axe', 1], ['fishing_pole', 1], ['mining_pickaxe', 1]]) {
    await H.grant(wsPort, idB, 'item', { invKey, count }).catch(() => {});
  }
  await H.grant(wsPort, idB, 'gold', { amount: 120 }).catch(() => {});
  /* ...and something WORN, which a death here never takes: the dev kit's
     greatsword, bow and staff, a greatsword strapped on (one stays a spare,
     with the kit's bow and staff) */
  await H.devOp(wsPort, 'kit', idB, { what: 'weapons' });
  for (let i = 0; i < 20; i++) {
    await B.page.waitForTimeout(500);
    const held = await B.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return R.weapon ? R.weapon.type : null; });
    if (held === 'greatsword') break;
    await H.equipWeapon(B, 'greatsword', 'weapon', 'melee');
  }
  await A.page.waitForTimeout(1200);
  /* the bags as the worker last sent them (player_state's echo: weapons are
     the worker's; the admin view's `rpg` is the SAVED copy, which lags) */
  const bag = (P) => P.page.evaluate(() => {
    const R = (window._gameState.current.rpg) || {};
    return { weapon: R.weapon ? R.weapon.type : null, swords: (R.weaponStash || []).filter((w) => w && w.type === 'greatsword').length,
      minnows: (R.inventory || {}).fish_minnow || 0, shields: (R.shieldStash || []).length,
      /* v2.3.3316: the whole bag and the purse */
      inv: Object.fromEntries(Object.entries(R.inventory || {}).filter(([, n]) => n > 0)), coins: R.coins || 0 };
  });
  const bagA0 = await bag(A), bagB0 = await bag(B);
  const aSwords0 = bagA0.swords, aShields0 = bagA0.shields;
  /* v2.3.3091: the wanderer's game said what is on its arm -- nothing: the
     quest's shield went into its bag -- and the worker holds it as a spare */
  let armB = null;
  for (let i = 0; i < 12; i++) {
    const said = await B.page.evaluate(() => window.__btShieldWear || null);
    const saved = (await H.adminPlayer(wsPort, idB).catch(() => ({}))).rpg || {};
    armB = { said: said && said.payload, worn: saved.shield || null, spares: (saved.shieldStash || []).map((p) => p && p.name) };
    if (armB.said && armB.said.none && !armB.worn && armB.spares.length >= 1) break;
    await B.page.waitForTimeout(500);
  }
  rec.ok(`setup: the wanderer's game told the worker its arm is bare (shield_wear), and the worker holds its ${armB && armB.spares[0]} as a spare`,
    !!armB && !!armB.said && armB.said.none === true && !armB.worn && armB.spares.length >= 1 && bagB0.shields >= 1, { armB, bagB0 });
  rec.ok(`setup: the raider holds a greatsword, the wanderer a SPARE one in the bag (${bagB0.swords}) and ${bagB0.minnows} minnows`,
    bagA0.weapon === 'greatsword' && bagB0.swords >= 1 && bagB0.minnows >= 3, { bagA0, bagB0 });
  rec.ok(`setup (v2.3.3316): the wanderer also carries iron ore, cooked fish, the axe, the rod and the pickaxe, and ${bagB0.coins} gold -- and holds a ${bagB0.weapon} in hand`,
    bagB0.inv.ore_iron === 4 && bagB0.inv.cooked_fish_minnow === 2 && bagB0.inv.woodcutting_axe === 1 && bagB0.inv.fishing_pole === 1
      && bagB0.inv.mining_pickaxe === 1 && bagB0.coins >= 120 && bagB0.weapon === 'greatsword', bagB0);

  /* ── the walk out, untouchable ── */
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 6 });
  /* v2.3.3315: the Wheel the worker plays -- its own spawn table, and No man's
     land's rings as wide as its stretches (TRAPS §196) */
  const LONG = (await H.wheelGeom()).long;
  const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + (LONG === 1 ? '/server/src/wheelspawns1.js' : '/server/src/wheelspawns.js'));
  const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
  const T = NML.TIER * LONG;
  const monsterPts = [];
  for (const k of Object.keys(WHEEL_SPAWNS)) {
    for (const p of WHEEL_SPAWNS[k].points) monsterPts.push(p);
    for (const d of Object.values(WHEEL_SPAWNS[k].deeper || {})) for (const p of d.points) monsterPts.push(p);
  }
  /* places on No man's land 1's ring (v2.3.3690: the Lv 1-5 tier, from the
     safe ground's edge at 2,937 px out to 3,789 on the short Wheel and 7,885
     on the long one; it was the Lv 6-10 tier), inside a spoke, furthest from
     any monster's place first */
  const R0 = Math.max(NML.SAFE_R || 0, NML.HUB + (NML.FIRST_TIER - 1) * T) + 160, R1 = NML.HUB + NML.FIRST_TIER * T - 160;
  const BAND = `Lv ${5 * NML.FIRST_TIER - 4}–${5 * NML.FIRST_TIER}`;
  const cands = [];
  for (const land of Object.keys(WHEEL_SPAWNS)) {
    const a = WHEEL_SPAWNS[land].anchor;
    const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
    const ux = (a[0] - WHEEL_CENTRE[0]) / L, uy = (a[1] - WHEEL_CENTRE[1]) / L;
    for (let r = R0; r <= R1; r += 50 * LONG) {
      for (let lat = -600; lat <= 600; lat += 50) {
        const x = WHEEL_CENTRE[0] + ux * r - uy * lat, y = WHEEL_CENTRE[1] + uy * r + ux * lat;
        let md = Infinity;
        for (const p of monsterPts) md = Math.min(md, Math.hypot(p[0] - x, p[1] - y));
        cands.push({ land, x: Math.round(x), y: Math.round(y), md: Math.round(md) });
      }
    }
  }
  cands.sort((p, q) => q.md - p.md);
  /* the best few of each land, best first: one land's ring may be water at
     its quietest place, or have a monster wandering there just now */
  const perLand = Object.create(null), tryList = [];
  for (const c of cands) {
    perLand[c.land] = (perLand[c.land] || 0) + 1;
    if (perLand[c.land] <= 2) tryList.push(c);
  }
  let spot = null;
  for (const c of tryList.slice(0, 12)) {
    await H.hopTo(A, c.x, c.y, { tries: 90 });
    await A.page.waitForTimeout(1500);
    /* dry, clear, and no monster near, for the raider AND the wanderer 50 px east */
    const ok = await A.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
      const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 300).length;
      return { dry: dry(x, y) && dry(x + 50, y) && dry(x + 25, y), near };
    }, c);
    if (ok.dry && ok.near === 0) { spot = c; break; }
    console.log('    spot refused: ' + JSON.stringify({ c, ok }));
  }
  rec.ok(`setup: a dry, quiet spot on No man's land 1's ring, ${BAND} (${spot ? `${spot.land} ${spot.x},${spot.y}, ${spot.md} px from any monster's place` : 'none'})`, !!spot, spot);
  if (!spot) { stopAlive = true; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.hopTo(B, spot.x + 50, spot.y, { tries: 90 });
  await B.page.waitForTimeout(2500);

  /* ── 1. told, both of them ── */
  const told = async (P) => {
    let t = null;
    for (let i = 0; i < 16; i++) {
      t = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const zb = window.__btZoneBanner;
        /* v2.3.3108: the minimap's name plate (wheelMinimap.js _plate) */
        const pl = window.__btMinimap && window.__btMinimap.plate;
        const sub = pl ? { textContent: pl.sub, red: !!pl.red } : null;
        const b = document.querySelector('[data-nml-badge]');
        const r = b && b.getBoundingClientRect();
        const band = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-h')) || 0;
        return {
          lvl: S._nmlLevel || 0,
          /* v2.3.3767: the number is the step (Lv 1-5 on the first ring), not 1 */
          banner: zb && zb.shownAt && S._nmlLevel ? zb.shownAt('nml-' + S._nmlLevel) : 0,
          chat: (S.chatLog || []).filter((l) => /No man's land \d/.test(l.text || '')).map((l) => l.text),
          bar: sub ? sub.textContent : null,
          /* v2.3.3765: the top bar's title, right of which the badge stands */
          title: (() => { const q = document.querySelector('[data-zone-title]'); const x = q && q.getBoundingClientRect(); return x ? { l: Math.round(x.left), r: Math.round(x.right) } : null; })(),
          header: (() => { const q = document.querySelector('.bt-zone-header'); const x = q && q.getBoundingClientRect(); return x ? { t: Math.round(x.top), b: Math.round(x.bottom) } : null; })(),
          /* v2.3.3629: the minimap's box and its name plate, beside which the badge stood */
          mini: window.__btWheelMini ? { l: window.__btWheelMini.left, t: window.__btWheelMini.top } : null,
          plateBox: window.__btWheelPlate ? { t: window.__btWheelPlate.top, b: window.__btWheelPlate.top + window.__btWheelPlate.height } : null,
          badge: b ? { n: b.getAttribute('data-nml-badge'), text: b.textContent, mid: Math.round(r.left + r.width / 2 - innerWidth / 2),
            /* v2.3.3268: how far its right edge stops short of the middle (2 px:
               it sat on the shield button, whose left edge is the middle) */
            short: Math.round(innerWidth / 2 - r.right),
            shield: (() => { const sh = document.querySelector('[data-shield]'); const q = sh && sh.getBoundingClientRect();
              return q && q.width > 0 ? { l: Math.round(q.left), t: Math.round(q.top), b: Math.round(q.bottom) } : null; })(),
            l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), bt: Math.round(r.bottom),
            gap: Math.round((innerHeight - band) - r.bottom), h: Math.round(r.height), w: Math.round(r.width) } : null,
        };
      });
      if (t.lvl >= 1 && t.lvl <= 5 && t.banner > 0 && t.chat.length && t.badge) break;
      await P.page.waitForTimeout(400);
    }
    return t;
  };
  const tA = await told(A), tB = await told(B);
  for (const [who, t] of [['the raider', tA], ['the wanderer', tB]]) {
    rec.ok(`1. ${who} is told: the banner, the chat ("${t && t.chat[0]}") and the badge (skull ${t && t.badge && t.badge.text}, ${t && t.badge && t.badge.w} px wide)`,
      !!t && t.lvl >= 1 && t.lvl <= 5 && t.banner > 0 && t.chat.some((c) => /can attack you here/.test(c)) && !!t.badge && t.badge.n === String(t.lvl) && t.badge.text.trim() === String(t.lvl) && t.badge.w <= 90, t);
    /* v2.3.3268: just LEFT of the middle -- centred, it sat on the shield
       button (the shield's left edge is the middle, ShieldButton.jsx
       ctlColumn) and a tap on the shield's middle opened the badge; it stops
       2 px short of the middle, or of the shield where a narrow phone puts the
       shield over the middle (mp-nmlfoe measures every width) */
    /* v2.3.3608: CENTRED (the owner: "center the red skull on the UI so it's
       not awkwardly aligned to the left"), and just left of the shield button
       only while the shield is drawn under the middle (NmlBadge.jsx
       nmlBadgePlace; mp-nmlfoe measures every width) */
    /* v2.3.3629: BESIDE THE MINIMAP'S NAME PLATE (the owner: "just beside the
       minimap where it lists the zone and level range"): its right edge just
       left of the minimap's box, its middle level with the plate, a 44 px
       target, on the screen */
    /* v2.3.3765: IN THE TOP BAR, just right of the title (the owner: "just
       to the right of the Brotown name at the top"), a target the bar's height
       (34 px, as the AP's; mp-nmltopbar measures every width) */
    const tb = t && t.badge;
    rec.ok(`1. ...the badge in the top bar just right of the title (${t && t.title && tb ? tb.l - t.title.r : '?'} px from it), a ${tb && tb.h} px target`,
      !!tb && !!t.title && !!t.header && tb.l >= t.title.r && tb.l - t.title.r <= 14 && tb.t >= t.header.t && tb.bt <= t.header.b
        && tb.h >= 34 && tb.l >= 0, { tb, title: t && t.title, header: t && t.header });
    rec.ok(`1. ...and the minimap's name plate shows the level band, the badge saying No man's land ("${t && t.bar}")`, !!t && t.bar === BAND, t && t.bar);
  }
  await shot(A, '1-told');

  /* ── 2. the tap asks, and Attack aims ── */
  await closeIn(A, wsPort, idA, idB, 60);
  await A.page.waitForTimeout(600);
  /* v2.3.3253: the tap raises "Attack Wanderer?" (game/nmlAsk.js); its window
     waits 30 s here, as the walk to it can be slow on this box */
  await A.page.evaluate(() => { if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
  let asked = null;
  for (let i = 0; i < 4 && !asked; i++) {
    const at = await peerOnScreen(A, idB);
    if (at) await A.page.mouse.click(at.x, at.y - 4);
    await A.page.waitForTimeout(500);
    asked = await A.page.evaluate(() => {
      const c = window.__btNmlAsk && window.__btNmlAsk.current(), el = document.querySelector('[data-nml-ask-attack]');
      if (!c || !el) return null;
      const q = el.getBoundingClientRect();
      return { why: c.why, id: c.id, x: q.left + q.width / 2, y: q.top + q.height / 2 };
    });
  }
  /* its Attack, a real click at the button's middle */
  if (asked) await A.page.mouse.click(asked.x, asked.y);
  await A.page.waitForTimeout(500);
  const lock = await A.page.evaluate(() => {
    const S = window._gameState.current, lt = S.lockedTarget;
    return lt ? { type: lt.type, id: lt.id, nml: !!lt.nml, card: !!document.querySelector('.bt-inspect-card'), ask: !!document.querySelector('[data-nml-ask]') } : null;
  });
  rec.ok('2. the raider taps the wanderer: the small window asks, and its Attack AIMS at them (No man\'s land\'s lock), no player card',
    !!asked && asked.why === 'tap' && asked.id === idB && !!lock && lock.type === 'player' && lock.id === idB && lock.nml && !lock.card && !lock.ask, { asked, lock });

  await H.instrumentWire(A);
  /* ── 3. a hit, and the skulls ── */
  const reach = await closeIn(A, wsPort, idA, idB, 34);
  await H.devOp(wsPort, 'vitals', idB, { heal: true, god: false });
  const hp0 = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  let hp1 = hp0;
  for (let i = 0; i < 8 && !(hp1 < hp0); i++) {
    await swingAt(A, idB);
    hp1 = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  }
  rec.ok(`3. the raider's swing lands: the wanderer's HP ${hp0} -> ${hp1} (the worker's)`, typeof hp0 === 'number' && hp1 < hp0, { reach, hp0, hp1 });
  await A.page.waitForTimeout(1500);
  const skA = await A.page.evaluate((pid) => {
    const S = window._gameState.current, m = S._threatMarks && S._threatMarks[pid];
    return { mine: S._pvpSkullType, red: S._nmlSelf && S._nmlSelf.red, theirs: m ? m.type : null,
      chat: (S.chatLog || []).some((l) => /a red skull for 20 minutes/.test(l.text || '')) };
  }, idB);
  const skB = await B.page.evaluate((pid) => {
    const S = window._gameState.current, m = S._threatMarks && S._threatMarks[pid];
    return { mine: S._pvpSkullType, white: S._nmlSelf && S._nmlSelf.white, theirs: m ? m.type : null };
  }, idA);
  rec.ok(`3. the raider wears a RED skull (${skA.mine}, ${Math.round((skA.red || 0) / 60000)} min) and is told what it means`, skA.mine === 'red' && skA.red > 19 * 60000 && skA.chat, skA);
  rec.ok(`3. the wanderer wears a WHITE skull (${skB.mine})`, skB.mine === 'white' && skB.white > 19 * 60000, skB);
  rec.ok(`3. each sees the other's: the wanderer sees the raider's red (${skB.theirs}), the raider the wanderer's white (${skA.theirs})`, skB.theirs === 'red' && skA.theirs === 'white', { skA, skB });
  /* apart for the pictures: standing in each other, one's plate covers the
     other's skull */
  const sbPos = await H.serverPlayer(wsPort, idB);
  if (sbPos) await H.hopTo(B, sbPos.x + 110, sbPos.y, { tries: 10 });
  await A.page.waitForTimeout(1500);
  await shot(A, '3-skulls-raider');
  await shot(B, '3-skulls-wanderer');

  /* ── 3b. the badge: the raider's skull on it, and a tap says what it means ── */
  await shot(A, '3b-badge');
  const own = await A.page.evaluate(() => {
    const b = document.querySelector('[data-nml-badge]');
    if (!b) return undefined;
    const o = b.querySelector('[data-nml-own-skull]');
    b.click();
    return o ? o.getAttribute('data-nml-own-skull') : null;
  });
  await A.page.waitForTimeout(500);
  await shot(A, '3b-info');
  const info = own === undefined ? null : await A.page.evaluate((own) => {
    const cur = window.__btInfoPopup && window.__btInfoPopup.current();
    const body = document.querySelector('[data-nml-info]');
    const note = document.querySelector('[data-infopopup-note]');
    const out = { own, title: cur && cur.title, body: body ? body.textContent : null, note: note ? note.textContent : null };
    if (window.__btInfoPopup) window.__btInfoPopup.close();
    return out;
  }, own);
  rec.ok(`3b. the raider's badge wears their red skull (${info && info.own})`, !!info && info.own === 'red', info);
  rec.ok(`3b. a tap on it says what No man's land means ("${info && info.title}"), with the skull's minutes ("${info && info.note}")`,
    !!info && /No man's land [1-5] · Lv [1-5] monsters/.test(info.title || '') && /attack/.test(info.body || '') && /red skull/.test(info.body || '') && /red skull: \d+ min/.test(info.note || ''), info);

  /* ── 4. the killing blow ── */
  const vit = await H.devOp(wsPort, 'vitals', idB, { heal: true, hp: 1 });
  await closeIn(A, wsPort, idA, idB, 34);
  let dead = false;
  const trail = [];
  for (let i = 0; i < 8 && !dead; i++) {
    const before = await A.page.evaluate((pid) => {
      const S = window._gameState.current, lt = S.lockedTarget;
      return { lock: lt ? lt.type + ':' + (lt.id === pid) + (lt.nml ? ':nml' : '') : null };
    }, idB);
    const sent0 = (await H.wireCounts(A)).player_attack || 0;
    await swingAt(A, idB);
    const [sa, sb] = await Promise.all([H.serverPlayer(wsPort, idA), H.serverPlayer(wsPort, idB)]);
    const sent1 = (await H.wireCounts(A)).player_attack || 0;
    trail.push({ i, lock: before.lock, sent: sent1 - sent0, d: sa && sb ? Math.round(Math.hypot(sb.x - sa.x, sb.y - sa.y)) : null, hp: sb && sb.hp, dead: sb && sb.dead });
    dead = !!(sb && (sb.dead || sb.hp <= 0));
    if (!dead) { await H.devOp(wsPort, 'vitals', idB, { heal: true, hp: 1 }); await closeIn(A, wsPort, idA, idB, 34); }
  }
  console.log('    kill trail: ' + JSON.stringify({ vit, trail }));
  rec.ok('4. the killing blow lands (the worker has the wanderer dead)', dead, { vit, trail });
  let lossB = null;
  for (let i = 0; i < 20; i++) {
    lossB = await B.page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg || {};
      return {
        /* v2.3.3316: "took everything you carried" (it was "took your bag") */
        told: (S.chatLog || []).filter((l) => /took everything you carried in No man's land/.test(l.text || '')).map((l) => l.text),
        swords: (R.weaponStash || []).filter((w) => w && w.type === 'greatsword').length,
        shields: (R.shield ? 1 : 0) + (R.shieldStash || []).length,
      };
    });
    if (lossB.told.length) break;
    await B.page.waitForTimeout(500);
  }
  rec.ok(`4. the wanderer's game says what went ("${lossB && lossB.told[0]}"), the spare greatsword and the spare shield gone from their bag`,
    !!lossB && lossB.told.length > 0 && lossB.swords === 0 && lossB.shields === 0, lossB);
  let bagA1 = null;
  for (let i = 0; i < 16; i++) {
    bagA1 = await bag(A);
    if (bagA1.swords > aSwords0 && bagA1.shields > aShields0) break;
    await A.page.waitForTimeout(500);
  }
  rec.ok(`4. ...and arrives in the raider's bag: ${aSwords0} -> ${bagA1 && bagA1.swords} spare greatswords, ${aShields0} -> ${bagA1 && bagA1.shields} shields`,
    !!bagA1 && bagA1.swords === aSwords0 + 1 && bagA1.shields === aShields0 + 1, { before: { swords: aSwords0, shields: aShields0 }, after: bagA1 });
  const pile = await A.page.evaluate((bid) => {
    const S = window._gameState.current;
    const p = (S.groundLoot || []).find((l) => l && String(l.lootId || '').startsWith('dd-' + bid));
    /* v2.3.3316: what is in it, read now -- the raider stands on it and picks it up */
    return p ? { recipients: p.recipients, killerName: p.killerName, zone: p.zone,
      items: Object.fromEntries((p.deathItems || []).map((it) => [it.key, it.qty])) } : null;
  }, idB);
  rec.ok(`4. the wanderer's minnows lie in a pile that is the raider's (${pile && pile.killerName}'s loot)`,
    !!pile && Array.isArray(pile.recipients) && pile.recipients.length === 1 && pile.recipients[0] === idA && pile.killerName === 'Raider', pile);
  await shot(A, '4-after');

  /* ── 4b. v2.3.3316: everything carried, nothing worn ── */
  let bagB1 = null;
  for (let i = 0; i < 16; i++) {
    bagB1 = await bag(B);
    if (!Object.keys(bagB1.inv).length && !bagB1.coins) break;
    await B.page.waitForTimeout(500);
  }
  rec.ok(`4b. the wanderer's bag is EMPTY -- the ore, the cooked fish and the three tools gone with the minnows (${JSON.stringify(bagB1 && bagB1.inv)}) -- and their purse (${bagB1 && bagB1.coins} gold)`,
    !!bagB1 && Object.keys(bagB1.inv).length === 0 && bagB1.coins === 0, { before: bagB0, after: bagB1 });
  rec.ok(`4b. ...and what they WEAR is still theirs: the ${bagB1 && bagB1.weapon} in their hands`,
    !!bagB1 && bagB1.weapon === 'greatsword', { before: bagB0.weapon, after: bagB1 && bagB1.weapon });
  const pileItems = pile && pile.items;
  rec.ok(`4b. the raider's pile holds it all: ${JSON.stringify(pileItems)}`,
    !!pileItems && pileItems.ore_iron === 4 && pileItems.cooked_fish_minnow === 2 && pileItems.woodcutting_axe === 1
      && pileItems.fishing_pole === 1 && pileItems.mining_pickaxe === 1 && pileItems.fish_minnow >= 3, pileItems);
  let bagA2 = null, taken = null;
  for (let i = 0; i < 16; i++) {
    bagA2 = await bag(A);
    taken = await A.page.evaluate(() => (window._gameState.current.chatLog || []).filter((l) => /You took Wanderer's things/.test(l.text || '')).map((l) => l.text));
    if (bagA2.coins >= bagA0.coins + bagB0.coins && taken.length) break;
    await A.page.waitForTimeout(500);
  }
  rec.ok(`4b. the wanderer's gold is the raider's (${bagA0.coins} -> ${bagA2 && bagA2.coins}, +${bagB0.coins})`,
    !!bagA2 && bagA2.coins === bagA0.coins + bagB0.coins, { a0: bagA0.coins, b0: bagB0.coins, a2: bagA2 && bagA2.coins });
  rec.ok(`4b. ...and the raider is told what they took: "${taken && taken[0]}"`,
    !!taken && taken.length >= 1 && /lie where they fell/.test(taken[0]) && /gold/.test(taken[0]), taken);

  stopAlive = true;
  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`5. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
