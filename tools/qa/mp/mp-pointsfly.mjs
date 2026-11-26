/* ═══ A WEAPON LEVEL-UP SENDS BUBBLES TO YOUR POINTS (v2.3.4055) ═══
 *
 * The owner, 2026-11-02: "When a level up on one of the 3 primary combat all
 * weapons happens do a 'jump to bag' effect that just shows bubbles in
 * representing xp or something jump to the character button or the character
 * button's points section if that menu already open."
 *
 * In the world:
 *   1. a phone (upright): a REAL level-up (the dev kit's levels, through the
 *      worker's own XP path, prog3_level): as its LEVEL UP medallion goes,
 *      5-7 glowing bubbles (CSS circles, no picture) fly to the Character
 *      button ([data-nav="hero"]) and land on it, which pops;
 *   2. the Character page open: a level-up (prog3_level through wsClient's
 *      own handler) sends them to its Points tab ([data-section="Build"]);
 *   3. a life skill's level-up sends none;
 *   4. with ?pointsfly=0 a weapon level-up sends none;
 *   5. a computer playing wide: they land on its Character button, inside
 *      the game's column;
 *   6. no page errors.
 *   7. (v2.3.6686, card UI2-bro tests part) the NEW frame, the default: the same phone level-up sends its bubbles to
 *      the Bro button (the hook `[data-nav="hero"]`, worn by the Menu button under the frame), and with Combat's hub
 *      open (no Points tab there) a weapon's level-up lands on it too.  Parts 1-6 stay under ?ui2=0 (the old row of
 *      buttons and the old card's Points tab, which have no twin in the new pages).
 */
import * as H from './harness.mjs';
export const lane = 'full';

const fly = (P) => P.page.evaluate(() => {
  const q = window.__btQuestFly || { flown: 0, landed: 0, last: [] };
  return { flown: q.flown, landed: q.landed, last: q.last.slice(), pf: window.__btPointsFly || null,
    bubbles: document.querySelectorAll('.bt-qw-bubble').length, burst: document.querySelectorAll('[data-levelup-kind]').length,
    dlg: !!document.querySelector('[data-npc-dialogue], .bt-npc-dialogue'), rm: matchMedia('(prefers-reduced-motion: reduce)').matches };
});

/* wait for a flight of bubbles started after `t0` to land */
async function landed(P, t0, ms = 20000, skill = null) {
  const end = Date.now() + ms;
  let f = null, seenBubble = 0, bubbleLook = null, seenBurst = 0;
  while (Date.now() < end) {
    f = await fly(P);
    seenBurst = Math.max(seenBurst, f.burst);
    if (f.bubbles > 0) {
      seenBubble = Math.max(seenBubble, f.bubbles);
      if (!bubbleLook) bubbleLook = await P.page.evaluate(() => {
        const b = document.querySelector('.bt-qw-bubble'); if (!b) return null;
        const cs = getComputedStyle(b); return { tag: b.tagName, radius: cs.borderRadius, img: cs.backgroundImage.slice(0, 15), shadow: cs.boxShadow !== 'none' };
      });
    }
    if (f.pf && f.pf.at >= t0 && (!skill || f.pf.skill === skill) && f.landed >= f.flown && f.bubbles === 0) break;
    await P.page.waitForTimeout(150);
  }
  if (process.env.PF_DEBUG) console.log('PFDBG', JSON.stringify({ ...f, seenBurst }));
  return { ...f, seenBubble, bubbleLook, seenBurst };

  /* ── 7. the new frame (v2.3.6686) ── */
  const N = await H.newPlayer(browser, { name: 'Pointframe', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  const nerr = [];
  N.page.on('pageerror', (e) => nerr.push(String((e && e.message) || e).slice(0, 200)));
  const stopN = H.keepAlive(N, 15000);
  try {
    await H.enterWorld(N);
    await H.waitFor(N, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 150000, label: 'the world' });
    const frame = await N.page.evaluate(() => !!document.querySelector('[data-dash-frame]'));
    rec.ok('7. the page plays the new frame (guard)', frame);
    const nid = await H.readState(N, (S) => S.myId);
    const tn = await N.page.evaluate(() => Date.now());
    const nb = await fly(N);
    await H.devOp(wsPort, 'kit', nid, { what: 'levels' });
    const na = await landed(N, tn);
    const np = na.last.filter((x) => x.kind === 'points');
    const nn = na.pf ? na.pf.sent : 0;
    rec.ok(`7a. under the frame a level-up sends its bubbles (${nn}) and every one lands on the Bro button (${np.slice(-nn).map((x) => x.to).join(', ')})`,
      nn >= 5 && nn <= 7 && na.landed - nb.landed >= nn && np.length >= nn && np.slice(-nn).every((x) => x.to === 'hero'), { np, nb, na });
    for (let i = 0; i < 80; i++) {
      const busy = await N.page.evaluate(() => document.querySelectorAll('[data-levelup-kind]').length + document.querySelectorAll('.bt-qw-bubble').length);
      if (!busy) break;
      await N.page.waitForTimeout(250);
    }
    await H.dashOpen(N, 'broCombat');
    await N.page.waitForTimeout(1200);
    const hub = await N.page.evaluate(() => !!document.querySelector('[data-combat-hub]'));
    const nsk = await H.readState(N, (S) => ((S.rpg.prog3 || {}).sk || {}).bow || { level: 1 });
    const t2 = await levelFrame(N, 'bow', (nsk.level || 1) + 1);
    const nc = await landed(N, t2, 20000, 'bow');
    const np2 = nc.last.filter((x) => x.kind === 'points').slice(-(nc.pf ? nc.pf.sent : 0));
    rec.ok(`7b. Combat's hub open: a bow level-up still flies and lands (${np2.map((x) => x.to).join(', ')})`,
      hub && !!nc.pf && nc.pf.at >= t2 && np2.length >= 5, { hub, pf: nc.pf, np2 });
    rec.ok('7c. no page errors under the frame', nerr.length === 0, nerr.slice(0, 4));
  } finally {
    stopN();
    await N.ctx.close().catch(() => {});
  }
}
const levelFrame = (P, skill, level) => P.page.evaluate(([s, l]) => {
  window.__btWsEvent({ type: 'prog3_level', payload: { skill: s, level: l, charLevel: l, shared: 0 } });
  return Date.now();
}, [skill, level]);

async function touch(P, sel) {
  const r = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  if (r) await P.page.touchscreen.tap(r.x, r.y);
  return !!r;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Pointbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel', query: 'ui2=0' }); /* v2.3.6681: this check is about the old row of buttons, which ships under ?ui2=0 until the build's step 10 (card UI2-frame) */
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 150000, label: 'the world' });
    const myId = await H.readState(P, (S) => S.myId);

    /* ── 1. a real level-up ── */
    const t0 = await P.page.evaluate(() => Date.now());
    const before = await fly(P);
    const kit = await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
    rec.ok('the worker levelled the bro up through its own XP path (guard)', !!(kit && kit.ok !== false), kit);
    const a = await landed(P, t0);
    const pts = a.last.filter((x) => x.kind === 'points');
    const n = a.pf ? a.pf.sent : 0;
    rec.ok(`1. as the medallion goes, ${n} bubbles take off for the ${a.pf && a.pf.skill} level-up (5-7)`, n >= 5 && n <= 7, a.pf);
    rec.ok(`1. ...glowing circles, no picture (${JSON.stringify(a.bubbleLook)})`, !!a.bubbleLook && a.bubbleLook.tag === 'SPAN' && a.bubbleLook.radius === '50%'
      && /gradient/.test(a.bubbleLook.img) && a.bubbleLook.shadow, a.bubbleLook);
    rec.ok(`1. ...and every one lands on the Character button (${pts.slice(-n).map((x) => x.to).join(', ')})`,
      a.landed - before.landed >= n && pts.length >= n && pts.slice(-n).every((x) => x.to === 'hero'), { pts, before, a });

    /* ── 2. the Character page open ── */
    /* (the kit gave several levels: every medallion of theirs done first) */
    for (let i = 0; i < 80; i++) {
      const busy = await P.page.evaluate(() => document.querySelectorAll('[data-levelup-kind]').length + document.querySelectorAll('.bt-qw-bubble').length);
      if (!busy) break;
      await P.page.waitForTimeout(250);
    }
    await H.dashOpen(P, 'hero');
    await P.page.waitForTimeout(1500);
    const tab = await P.page.evaluate(() => { const e = document.querySelector('[data-section="Build"]'); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { w: r.width, top: r.top, bottom: r.bottom, vh: innerHeight, op: cs.opacity, vis: cs.visibility, top_el: (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || {}).className }; });
    rec.ok('2. the Character page is open, its Points tab on screen (guard)', !!tab && tab.w > 2 && tab.top >= 0 && tab.bottom <= tab.vh, tab);
    const sk = await H.readState(P, (S) => ((S.rpg.prog3 || {}).sk || {}).bow || { level: 1 });
    const t1 = await levelFrame(P, 'bow', (sk.level || 1) + 1);
    const b = await landed(P, t1, 20000, 'bow');
    const pts2 = b.last.filter((x) => x.kind === 'points').slice(-(b.pf ? b.pf.sent : 0));
    rec.ok(`2. a level-up sends them to the Points tab (${pts2.map((x) => x.to).join(', ')})`,
      !!b.pf && b.pf.at >= t1 && b.pf.skill === 'bow' && pts2.length >= 5 && pts2.every((x) => x.to === 'section-Build'), { pf: b.pf, pts2 });

    /* ── 3. a life skill: none ── */
    const c0 = await fly(P);
    await P.page.evaluate(() => window._setLevelUpMsg({ kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 1, ts: Date.now() }));
    await P.page.waitForTimeout(6000);
    const c1 = await fly(P);
    rec.ok('3. a life skill\'s level-up sends none', c1.flown === c0.flown && (c1.pf && c1.pf.at) === (c0.pf && c0.pf.at), { c0, c1 });

    /* ── 4. the off-ramp ── */
    await P.page.evaluate(() => { history.replaceState(null, '', location.pathname + (location.search ? location.search + '&' : '?') + 'pointsfly=0' + location.hash); });
    const d0 = await fly(P);
    await levelFrame(P, 'staff', 3);
    await P.page.waitForTimeout(6000);
    const d1 = await fly(P);
    rec.ok('4. with ?pointsfly=0 a weapon level-up sends none', d1.flown === d0.flown, { d0, d1 });
    rec.ok('the phone: no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ── 5. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Pointdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel', wide: true, query: 'ui2=0' }); /* v2.3.6681: this check is about the old row of buttons, which ships under ?ui2=0 until the build's step 10 (card UI2-frame) */
  const derr = [];
  D.page.on('pageerror', (e) => derr.push(String((e && e.message) || e).slice(0, 200)));
  const stopD = H.keepAlive(D, 15000);
  try {
    await H.enterWorld(D);
    await H.waitFor(D, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 150000, label: 'the world' });
    const t = await levelFrame(D, 'sword', 2);
    const e = await landed(D, t);
    const pts = e.last.filter((x) => x.kind === 'points').slice(-(e.pf ? e.pf.sent : 0));
    const col = await D.page.evaluate(() => { const r = document.getElementById('root').getBoundingClientRect(); const h = document.querySelector('[data-nav="hero"]'); const b = h && h.getBoundingClientRect();
      return { l: r.left, r: r.right, hero: b ? { x: b.left + b.width / 2 } : null }; });
    rec.ok(`5. a computer: they land on its Character button (${pts.map((x) => x.to).join(', ')}), inside the game's column`,
      pts.length >= 5 && pts.every((x) => x.to === 'hero') && !!col.hero && col.hero.x > col.l && col.hero.x < col.r, { pf: e.pf, pts, col });
    rec.ok('the computer: no page errors', derr.length === 0, derr.slice(0, 4));
  } finally {
    stopD();
    await D.ctx.close().catch(() => {});
  }
}
