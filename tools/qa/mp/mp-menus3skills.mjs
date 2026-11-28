/* ═══ v2.3.6865: BRO · SKILLS IN THE NEW PANEL, PLAYED (card MN step 6) ═══
 *
 * The owner's Skills (docs/design/menus3/; the card's step "Bro · Skills"):
 * Bro's Skills tab opens the new panel on the ten life skills; a guild with
 * its reward waiting is a row over them with its Claim; a skill's page
 * (Back) with its level and XP, its unlocks (All unlocks a page with Back),
 * its guild inline and How it works; the claim is today's request.
 *
 *   1. UPRIGHT (390 x 844, touch): Skills opened once (the level-ups seen),
 *      then the worker's own lever sets Fishing 12, Mining 5, Cooking 30,
 *      Trapping 3 (three guild quests done: a reward waiting): the Skills
 *      tab's dot; ten tiles three across, their levels the worker's, the dot
 *      on the four raised; a ready row for each guild whose quest is done;
 *      every tappable thing 44+; Fishing's page (its level, its guild at
 *      Apprentice, Back and its name in the header); All unlocks and Back;
 *      the Claim -> the worker's answer moves Fishing's guild step; Back to
 *      the ten; a tap on the world closes it;
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right, three across,
 *      every tappable thing 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): L opens Skills, L again closes;
 *      P opens Power, I the Bag; Esc closes.
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3skills-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const boxes = (P, sel) => P.page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0), sel);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, page: t ? t.page : null, arg: t ? t.arg : null }; });
const probe = (P) => P.page.evaluate(() => window.__btMenus3Skills || null);
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));
const title = (P) => P.page.evaluate(() => (document.querySelector('[data-menus3-title]') || {}).textContent || '');

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3skills-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(2000);
  return true;
}
const SEED = { fishing: 12, mining: 5, cooking: 30, trapping: 3 };
const levels = (P) => H.readState(P, (S) => { const ls = (S.rpg && S.rpg.lifeSkills) || {}; const o = {}; for (const k of Object.keys(ls)) o[k] = ls[k] && ls[k].level; return o; });
/* the worker's own lever (the admin key's /dev/lifeskill): each skill at its level, XP 0 */
async function seed(P, wsPort, rec, who) {
  const id = await H.readState(P, (S) => S.myId);
  for (const k of Object.keys(SEED)) await H.devOp(wsPort, 'lifeskill', id, { skill: k, level: SEED[k] }).catch(() => null);
  let L = null;
  for (let i = 0; i < 20; i++) { L = await levels(P); if (Object.keys(SEED).every((k) => L[k] === SEED[k])) break; await P.page.waitForTimeout(300); }
  rec.ok(`${who}: the worker set Fishing 12, Mining 5, Cooking 30, Trapping 3`, Object.keys(SEED).every((k) => L && L[k] === SEED[k]), L);
}
const until = (P, fn, ok, ms, label) => H.waitFor(P, fn, ok, { timeout: ms, label }).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Skillphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      /* Skills once: every level seen (today's rule), so the seeded ones are the new ones */
      await P.page.evaluate(() => window.__btMenus3.panel('bro', 'skills'));
      await P.page.waitForTimeout(800);
      await P.page.evaluate(() => { try { document.querySelector('[data-menus3-x]').click(); } catch (e) { /* shut */ } });
      await P.page.waitForTimeout(400);
      await seed(P, wsPort, rec, 'upright');
      await P.page.evaluate(() => window.__btMenus3.go('dock.bro'));
      await P.page.waitForTimeout(700);
      rec.ok('upright: the Skills tab wears the dot of a level-up not yet looked at', !!(await box(P, '[data-menus3-dot="skills"]')), null);
      const tabbed = await tap(P, '[data-menus3-tab="skills"]', true);
      let st = await pstate(P);
      let s = await probe(P);
      rec.ok('upright: the Skills tab opens the new panel on Skills', tabbed && st.open && st.section === 'skills' && st.page === 'root' && !!s && s.page === 'root', { st, tabbed });
      const tiles = await boxes(P, '[data-m3-skill]');
      const cols = new Set(tiles.map((b) => b.x)).size;
      rec.ok('upright: all TEN life skills, three across, each 44+', tiles.length === 10 && cols === 3 && tiles.every((b) => b.w >= 44 && b.h >= 44), { n: tiles.length, cols, t0: tiles[0] });
      const lv = await P.page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('[data-m3-skill]')).map((e) => [e.getAttribute('data-m3-skill'), +e.getAttribute('data-m3-skill-lv')])));
      rec.ok('upright: each tile the worker\'s level', Object.keys(SEED).every((k) => lv[k] === SEED[k]) && lv.farming === 1, lv);
      const dots = s ? s.tiles.filter((t) => t.dot).map((t) => t.key).sort().join() : '';
      rec.ok('upright: the dot on the four raised, and only them', dots === 'cooking,fishing,mining,trapping', dots);
      const ready = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-ready]')).map((e) => e.getAttribute('data-m3-ready')).sort().join());
      rec.ok('upright: a ready row (and its Claim) for each guild whose quest is done', ready === 'cooking,fishing,mining' && !!(await box(P, '[data-m3-ready="fishing"] [data-m3-claim]')), ready);
      const sm = await small(P);
      rec.ok('upright: every tappable thing in the panel 44+', sm.length === 0, sm);
      await shot(P, 'upright-ten');
      /* a skill's page */
      await tap(P, '[data-m3-skill="fishing"]', true);
      st = await pstate(P);
      s = await probe(P);
      const tt = await title(P);
      rec.ok('upright: Fishing opens its page: Back, its name, its level and XP', st.page === 'skill' && st.arg === 'fishing' && !!(await box(P, '[data-menus3-back]')) && /Fishing/.test(tt) && s && s.level === 12 && s.xpNeed > 0, { st, tt, lvl: s && s.level });
      rec.ok('upright: its guild inline: Apprentice, the next rank, the quest done, the Claim', s && s.guild && s.guild.rank === 'Apprentice' && s.guild.next && s.guild.next.title === 'Journeyman' && s.guild.quest && s.guild.quest.complete && !!(await box(P, '[data-m3-guild] [data-m3-claim]')), s && s.guild);
      rec.ok('upright: the seven ranks, How it works', (await boxes(P, '[data-m3-rank]')).length >= 7 && !!(await box(P, '[data-m3-skill-how]')), null);
      const sm2 = await small(P);
      rec.ok('upright: every tappable thing on the page 44+', sm2.length === 0, sm2);
      await shot(P, 'upright-skill');
      await tap(P, '[data-m3-skill-all]', true);
      st = await pstate(P);
      const rungs = (await boxes(P, '[data-m3-rung]')).length;
      rec.ok('upright: All unlocks: the whole ladder, a page with Back', st.page === 'unlocks' && rungs > 3, { st, rungs });
      await tap(P, '[data-menus3-back]', true);
      st = await pstate(P);
      rec.ok('upright: Back to Fishing', st.page === 'skill' && st.arg === 'fishing', st);
      /* the claim: today's request; the worker's answer moves the guild's step */
      const before = await H.readState(P, (S) => ({ step: ((S.rpg && S.rpg._guildProgress) || {}).fishing || 0, coins: S.rpg && S.rpg.coins }));
      await tap(P, '[data-m3-guild] [data-m3-claim]', true);
      s = await probe(P);
      if (s && s.claim === 'closed') {
        rec.ok('LISTED upright: this worker pays no guild quest (caps.guilds off): "Not open yet"', !!(await box(P, '[data-m3-claim-note="closed"]')), s);
      } else {
        const after = await until(P, (S) => ({ step: ((S.rpg && S.rpg._guildProgress) || {}).fishing || 0, coins: S.rpg && S.rpg.coins }), (v) => v.step > 0, 12000, 'guild step');
        rec.ok('upright: Claim sends today\'s request; the worker moves the guild\'s step and pays', !!after && after.step === before.step + 1 && after.coins > before.coins, { before, after });
      }
      await shot(P, 'upright-claimed');
      await tap(P, '[data-menus3-back]', true);
      st = await pstate(P);
      rec.ok('upright: Back to the ten', st.page === 'root' && st.section === 'skills', st);
      /* a tap on the world closes it */
      await P.page.touchscreen.tap(195, 150);
      await P.page.waitForTimeout(600);
      st = await pstate(P);
      rec.ok('upright: a tap on the world closes it', !st.open, st);
    }
  } finally { await P.page.context().close().catch(() => {}); }
  /* ── 2. sideways ── */
  const Q = await H.newPlayer(browser, { name: 'Skillside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(Q, rec, 'sideways')) {
      await Q.page.evaluate(() => window.__btMenus3.go('dock.bro'));
      await Q.page.waitForTimeout(600);
      await tap(Q, '[data-menus3-tab="skills"]', true);
      const pb = await box(Q, '[data-menus3-panel]');
      rec.ok('sideways: Skills in the drawer, 40% wide on the right', !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, pb);
      const tiles = await boxes(Q, '[data-m3-skill]');
      rec.ok('sideways: ten, three across, inside the drawer', tiles.length === 10 && new Set(tiles.map((b) => b.x)).size === 3 && tiles.every((b) => b.x >= pb.x), { n: tiles.length });
      const sm = await small(Q);
      rec.ok('sideways: every tappable thing 44+', sm.length === 0, sm);
      await shot(Q, 'sideways');
      await tap(Q, '[data-m3-skill="mining"]', true);
      const st = await pstate(Q);
      rec.ok('sideways: a skill\'s page in the drawer', st.page === 'skill' && st.arg === 'mining', st);
      await shot(Q, 'sideways-skill');
    }
  } finally { await Q.page.context().close().catch(() => {}); }
  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Skilldesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await D.page.mouse.click(640, 300);
      await D.page.waitForTimeout(300);
      await D.page.keyboard.press('KeyL');
      await D.page.waitForTimeout(700);
      let st = await pstate(D);
      const pb = await box(D, '[data-menus3-panel]');
      rec.ok('computer: L opens the new panel on Skills, in the drawer', st.open && st.section === 'skills' && !!pb && pb.x > 600, { st, pb });
      await shot(D, 'computer');
      await D.page.keyboard.press('KeyL');
      await D.page.waitForTimeout(500);
      st = await pstate(D);
      rec.ok('computer: L again closes it', !st.open, st);
      await D.page.keyboard.press('KeyP');
      await D.page.waitForTimeout(600);
      st = await pstate(D);
      rec.ok('computer: P opens the new Power', st.open && st.section === 'power', st);
      await D.page.keyboard.press('KeyI');
      await D.page.waitForTimeout(600);
      st = await pstate(D);
      rec.ok('computer: I opens the new Bag', st.open && st.section === 'bag', st);
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(600);
      st = await pstate(D);
      rec.ok('computer: Esc closes it', !st.open, st);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
