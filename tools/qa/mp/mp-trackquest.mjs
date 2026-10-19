/* ═══ TRACK A QUEST, AND THE GOLD STAR FOLLOWS IT (v2.3.3489) ═══
 *
 * The owner, playtesting: "I tapped track quest in quest menu but no golden
 * stars were in minimap (I had two active quests - one from beast master and
 * the other from mayor bro)."
 *
 * A real phone against a real worker, in the Wheel's BroTown, holding the
 * owner's kind of pair: Beastmaster Bro's "Box Traps" and Mayor Bro's "Into
 * the Wild" (Kill 5 monsters) -- taken out of order for the test (the
 * worker's test mode, /dev/testmode), as the owner's own were.  Neither
 * named a land or a resource, so before v2.3.3489 there was no star at all:
 *   1. nothing tracked: a star, and the gold road to it -- the first quest
 *      taken leads, Box Traps: the Woodworker's door;
 *   2. the quest log's "Track this quest" on Into the Wild (the real taps:
 *      Quests, its row, Track): the star moves to where the nearest land's
 *      monsters begin, the pinned quest card shows it, and the world map's
 *      road leads there too;
 *   3. tracking Box Traps: back to the Woodworker's door, the card says Box
 *      Traps;
 *   4. untracked: as in 1, the order they were taken;
 *   5. standing at the Woodworker's door: with Into the Wild tracked the star
 *      stays on the monsters; with Box Traps tracked the road ends -- no
 *      star, and not the other quest's either;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/trackquest-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Tracker', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const stopAlive = H.keepAlive(P);
  try {
    await body({ P, wsPort, rec, errors, OUT });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

const mini = (P) => P.page.evaluate(() => (window.__btMinimap ? JSON.parse(JSON.stringify(window.__btMinimap)) : null));
const tracked = (P) => P.page.evaluate(() => (window.__btTrackedQuest ? window.__btTrackedQuest.get() : 'no handle'));
const hudTitle = (P) => P.page.evaluate(() => { const el = document.querySelector('[data-quest-hud]'); return el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : null; });

/* the star as the minimap draws it, once it says `pred` (or the last read) */
async function starWhen(P, pred, ms = 8000) {
  let m = null;
  for (let t = 0; t < ms; t += 300) {
    m = await mini(P);
    if (m && pred(m.quest || null)) return m.quest || null;
    await P.page.waitForTimeout(300);
  }
  return (m && m.quest) || null;
}

/* the real taps: Quests, the quest's row, its Track button -- until it says `want` */
async function trackByTaps(P, qid, want) {
  await H.unfoldBand(P).catch(() => {});
  await H.openDest(P, 'Quests');
  const row = P.page.locator(`[data-quest-row="${qid}"]`).first();
  await row.waitFor({ state: 'visible', timeout: 8000 });
  await row.click();
  const btn = P.page.locator('[data-quest-track]').first();
  await btn.waitFor({ state: 'visible', timeout: 8000 });
  if ((await btn.getAttribute('data-quest-track')) !== want) await btn.click();
  await P.page.waitForFunction((w) => { const b = document.querySelector('[data-quest-track]'); return !!b && b.getAttribute('data-quest-track') === w; }, want, { timeout: 4000 }).catch(() => {});
  const state = await btn.getAttribute('data-quest-track').catch(() => null);
  const note = await P.page.evaluate(() => { const n = document.querySelector('[data-quest-track-note]'); return n ? n.textContent : null; });
  return { state, note };
}

async function body({ P, wsPort, rec, errors, OUT }) {
  const shot = (name, clip) => P.page.screenshot({ path: join(OUT, `trackquest-${name}.png`), clip }).catch(() => {});
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel\'s BroTown (guard)', !!inWheel, inWheel);
  if (!inWheel) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const me = await H.readState(P, (S) => S.myId);

  /* setup: the owner's pair, taken as a player takes them (quest_accept) --
     out of the givers' order, which the worker's test mode allows */
  const tm = await H.devOp(wsPort, 'testmode', me, { on: true }).catch((e) => ({ ok: false, error: String(e) }));
  for (const qid of ['beast_1', 'mayor_2']) {
    await P.page.evaluate((q) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: q } }); }, qid);
    await P.page.waitForTimeout(700);
  }
  const both = await H.waitFor(P, (S) => { const q = (S.rpg && S.rpg._quests) || {}; return { beast_1: q.beast_1 || null, mayor_2: q.mayor_2 || null, order: Object.keys(q).filter((k) => q[k] === 'active') }; },
    (v) => v.beast_1 === 'active' && v.mayor_2 === 'active', { timeout: 15000, label: 'both quests active' }).catch(() => null);
  rec.ok(`setup: Beastmaster Bro's "Box Traps" and Mayor Bro's "Into the Wild" both active, in that order (${both ? both.order.join(', ') : '-'}) (guard)`,
    !!tm && tm.ok !== false && !!both, { tm, both });
  if (!both) return;
  const doors = await H.waitFor(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []), (d) => d.length >= 16,
    { timeout: 20000, label: 'the town\'s doors' }).catch(() => []);
  const ww = doors.find((d) => d.id === 'woodworker');
  rec.ok('the Woodworker\'s door is known (guard)', !!ww, { n: doors.length });
  if (!ww) return;

  /* where the nearest land's monsters begin, worked out here from the very
     tables the game reads (src/game/questWays.js, src/data/zones.js) */
  const G = await H.wheelGeom();
  const zones = await import(H.REPO + '/src/data/zones.js');
  const ways = await import(H.REPO + '/src/game/questWays.js');
  zones.setWheelGeom(G.long);
  const z = zones.ZONES.wheel;
  const geom = { c: (z.w * 32) / 2, lands: z.lands, firstR: z.firstR || null, homes: z.homes, safeR: z.safeR, landAt: (x, y) => zones.wheelLandAt('wheel', x, y) };
  const landFor = async () => { const p = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y })); return ways.nearestLandStart(geom, p); };

  /* ── 1. nothing tracked ── */
  await P.page.evaluate(() => window.__btTrackedQuest && window.__btTrackedQuest.set(null));
  const s1 = await starWhen(P, (q) => !!q && q.qid === 'beast_1');
  rec.ok(`1. two quests, one from each giver, nothing tracked: a gold star (before v2.3.3489, none) -- the first taken, Box Traps, at the Woodworker's door (${s1 && s1.x},${s1 && s1.y}), its road drawn`,
    !!s1 && s1.qid === 'beast_1' && s1.way === 'door' && s1.door === 'woodworker' && s1.x === Math.round(ww.x) && s1.y === Math.round(ww.y) && (!!s1.road || s1.edge === true), s1);
  const box = await P.page.evaluate(() => window.__btWheelMini || null);
  const miniClip = box ? { x: box.left - 6, y: box.top - 4, width: box.w + 10, height: box.h + 8 } : undefined;
  await shot('01-untracked-minimap', miniClip);

  /* ── 2. Track "Into the Wild", by the quest log's own button ── */
  const t2 = await trackByTaps(P, 'mayor_2', 'on');
  rec.ok(`2. the quest log's "Track this quest" on Into the Wild tracks it (${t2.state}), and says what that does ("${t2.note}")`,
    t2.state === 'on' && (await tracked(P)) === 'mayor_2' && /gold star/.test(t2.note || ''), t2);
  await shot('02-detail-tracked');
  await H.closeDest(P);
  await P.page.waitForTimeout(500);
  const land2 = await landFor();
  const s2 = await starWhen(P, (q) => !!q && q.qid === 'mayor_2');
  rec.ok(`...the star moves to where the nearest land's monsters begin (${s2 && s2.zoneId}, ${s2 && s2.x},${s2 && s2.y}): the Mayor's five kills`,
    !!s2 && !!land2 && s2.qid === 'mayor_2' && s2.way === 'monsters' && s2.zoneId === land2.land && Math.abs(s2.x - land2.x) <= 1 && Math.abs(s2.y - land2.y) <= 1, { s2, land2 });
  const h2 = await hudTitle(P);
  rec.ok(`...the pinned quest card shows the tracked quest ("${(h2 || '').slice(0, 40)}")`, /Into the Wild/.test(h2 || '') && !/Box Traps/.test(h2 || ''), h2);
  await shot('02b-tracked-minimap', miniClip);
  /* the world map's road goes the same way */
  const open = await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-open]'); if (!b) return false; b.click(); return true; });
  let wm = null;
  for (let i = 0; open && i < 20; i++) {
    wm = await P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
    if (wm && wm.open && wm.more && wm.more.quest) break;
    await P.page.waitForTimeout(300);
  }
  rec.ok(`...and the world map's gold road leads there too (${wm && wm.more && wm.more.quest ? `${wm.more.quest.qid} -> ${wm.more.quest.x},${wm.more.quest.y}` : '-'})`,
    !!wm && wm.open && !!wm.more.quest && wm.more.quest.qid === 'mayor_2' && !!s2 && wm.more.quest.x === s2.x && wm.more.quest.y === s2.y, wm && wm.more && wm.more.quest);
  await shot('02c-worldmap');
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
  await P.page.waitForTimeout(600);

  /* ── 3. Track "Box Traps" ── */
  const t3 = await trackByTaps(P, 'beast_1', 'on');
  await H.closeDest(P);
  await P.page.waitForTimeout(500);
  const s3 = await starWhen(P, (q) => !!q && q.qid === 'beast_1');
  const h3 = await hudTitle(P);
  rec.ok(`3. tracking Box Traps instead: the star goes back to the Woodworker's door, the card says Box Traps ("${(h3 || '').slice(0, 30)}")`,
    t3.state === 'on' && (await tracked(P)) === 'beast_1' && !!s3 && s3.door === 'woodworker' && /Box Traps/.test(h3 || ''), { t3, s3, h3 });

  /* ── 4. untracked ── */
  const t4 = await trackByTaps(P, 'beast_1', 'off');
  await H.closeDest(P);
  await P.page.waitForTimeout(500);
  const s4 = await starWhen(P, (q) => !!q && q.qid === 'beast_1');
  rec.ok('4. untracked: the order they were taken again -- Box Traps\' door', t4.state === 'off' && (await tracked(P)) === null && !!s4 && s4.door === 'woodworker', { t4, s4 });

  /* ── 5. at the Woodworker's door ── */
  await P.page.evaluate(() => window.__btTrackedQuest.set('mayor_2'));
  await H.hopTo(P, ww.x, ww.y - 50, { step: 100, gap: 260 });
  await P.page.waitForTimeout(800);
  const pos = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  const s5 = await starWhen(P, (q) => !!q && q.qid === 'mayor_2');
  rec.ok(`5. standing at the Woodworker's door (${Math.round(Math.hypot(pos.x - ww.x, pos.y - ww.y))} px off) with Into the Wild tracked, the star stays on the monsters`,
    Math.hypot(pos.x - ww.x, pos.y - ww.y) < 120 && !!s5 && s5.qid === 'mayor_2' && s5.way === 'monsters', { pos, s5 });
  await P.page.evaluate(() => window.__btTrackedQuest.set('beast_1'));
  const s6 = await starWhen(P, (q) => !q, 4000);
  rec.ok('...and with Box Traps tracked the road ends there: no star -- and not the other quest\'s either', s6 === null, s6);
  await shot('05-at-the-door', miniClip);
  await P.page.evaluate(() => window.__btTrackedQuest.set(null));
  rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 5));
}
