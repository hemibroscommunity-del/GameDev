/* v2.3.3633: a destroyed Text lets go of its style (src/rendering/textRelease.js).
 *
 * Owner, 2026-10-27: "simulate about 5 players ... to check for memory leaks
 * in long form play sessions".  mp-heapdiff found destroyed Pixi Texts still
 * in the heap trip after trip: Pixi 8.17's destroy never takes a Text's
 * listener off its style, and the game's `{ ...BASE_STYLE, fontSize: 9 }`
 * copies BASE_STYLE's event registry, so a whole family of Texts (every
 * monster's name, the loot labels) listened on one registry that lives as
 * long as the page.
 *
 * Two phones, the fixed one and `?textkeep` (Pixi as it ships):
 *  1. a family built the game's way (the spread) and a family on one shared
 *     style, then destroyed: on the fixed phone the spread no longer shares
 *     the base's registry, the look is the same (the base's size, as
 *     always), and nothing is left listening once they are destroyed; the
 *     other phone shows the leak this fixes;
 *  2. the game's own Texts on a real trip (mp-membudget's, twice: BroTown,
 *     a Flame Fields fight, home): a GC, then every Text in the heap counted
 *     (DevTools' queryObjects) -- on the fixed phone a handful of destroyed
 *     Texts are held and no more (5, the same after five trips), on the
 *     other they pile up (42 -> 154 over two trips). */
import * as H from './harness.mjs';

/* every AbstractText (Text, BitmapText, HTMLText) in the heap after a GC,
   and how many of them are already destroyed */
async function heapTexts(P) {
  const cdp = await P.ctx.newCDPSession(P.page);
  try {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const proto = await cdp.send('Runtime.evaluate', {
      expression: 'Object.getPrototypeOf(window.__btTextRelease.Text.prototype)',
    });
    const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const r = await cdp.send('Runtime.callFunctionOn', {
      objectId: q.objects.objectId,
      functionDeclaration: 'function () { return { all: this.length, destroyed: this.filter((t) => t && t.destroyed).length }; }',
      returnByValue: true,
    });
    return r.result.value;
  } finally {
    await cdp.detach().catch(() => {});
  }
}

const FAMILY = () => {
  const R = window.__btTextRelease;
  if (!R || !R.Text) return null;
  const { Text, TextStyle } = R;
  const heard = (st) => {
    const e = st && st._events && st._events.update;
    return !e ? 0 : (e.fn ? 1 : e.length);
  };
  const base = new TextStyle({ fontSize: 11, fill: '#ffffff', fontWeight: '700' });
  /* the game's way: a style spread from a shared one, with its own size */
  const spread = [];
  for (let i = 0; i < 100; i++) spread.push(new Text({ text: 'Lv ' + i, style: { ...base, fontSize: 9 } }));
  const sizes = [...new Set(spread.map((t) => t.style.fontSize))];
  const shared = spread.filter((t) => t.style._events === base._events).length;
  const spreadHeard = heard(base);
  const ownHeard = spread.reduce((n, t) => n + heard(t.style), 0);
  spread.forEach((t) => t.destroy());
  const spreadLeft = heard(base);
  /* one style handed to every Text, as Pixi means */
  const direct = [];
  for (let i = 0; i < 100; i++) direct.push(new Text({ text: 'x' + i, style: base }));
  const directHeard = heard(base);
  direct.forEach((t) => t.destroy());
  const directLeft = heard(base);
  return { probe: R(), sizes, shared, spreadHeard, ownHeard, spreadLeft, directHeard, directLeft };
};

/* a real trip, mp-membudget's: BroTown to the Flame Fields' inner end, a
   fight, home -- monsters' name plates, level badges and stun timers, drop
   lines and loot labels made and destroyed by the game's own code */
const PHONE = { width: 390, height: 844 };
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}
async function fight(P, ms) {
  const t0 = Date.now();
  let swings = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(400); continue; }
    if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  return swings;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const fixed = await H.newPlayer(browser, { name: 'Kept', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  const keep = await H.newPlayer(browser, { name: 'Leaky', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query: 'textkeep' });
  for (const P of [fixed, keep]) await H.enterWorld(P);
  await fixed.page.waitForTimeout(2500);

  /* 1. a family by hand */
  const a = await fixed.page.evaluate(FAMILY);
  const b = await keep.page.evaluate(FAMILY);
  rec.ok('1. the fix is on (and off with ?textkeep)', !!(a && a.probe.on && b && !b.probe.on), { fixed: a && a.probe, keep: b && b.probe });
  rec.ok('1. the spread draws exactly as before: the base\'s size (11), on both phones',
    !!(a && b && a.sizes.length === 1 && a.sizes[0] === 11 && b.sizes.length === 1 && b.sizes[0] === 11), { fixed: a && a.sizes, keep: b && b.sizes });
  rec.ok('1. the spread no longer shares the base\'s registry (0 of 100; 100 of 100 with ?textkeep)',
    !!(a && b && a.shared === 0 && b.shared === 100), { fixed: a && a.shared, keep: b && b.shared });
  rec.ok('1. each spread Text listens on its own style while it lives (100), none on the base\'s',
    !!(a && a.ownHeard === 100 && a.spreadHeard === 0), a);
  rec.ok('1. destroyed, nothing is left listening: the spread family 0 (100 with ?textkeep), the shared style 0 of 100 (100 left)',
    !!(a && b && a.spreadLeft === 0 && a.directHeard === 100 && a.directLeft === 0 && b.spreadLeft === 100 && b.directLeft === 200),
    { fixed: a, keep: b });

  /* 2. the game's own Texts, on a real trip */
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const at = WHEEL_SPAWNS.ember.points[0];
  let stop = false;
  const alive = (P) => (async () => {
    while (!stop) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const res = {};
  for (const [w, P] of [['fixed', fixed], ['keep', keep]]) {
    const id = await H.readState(P, (S) => S.myId);
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
    await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
    alive(P);
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const before = await heapTexts(P);
    let swings = 0;
    for (let trip = 0; trip < 2; trip++) {
      await H.hopTo(P, at[0], at[1] + 40, { tries: 220, step: 140, gap: 200 });
      swings += await fight(P, 12000);
      await H.hopTo(P, home.x, home.y, { tries: 220, step: 140, gap: 200 });
      await P.page.waitForTimeout(8000);
    }
    const after = await heapTexts(P);
    res[w] = { before, after, swings, grew: after.destroyed - before.destroyed };
    console.log(`    ${w}: ${swings} swings, destroyed Texts still held ${before.destroyed} -> ${after.destroyed} (of ${after.all})`);
  }
  stop = true;
  /* measured (2026-10-27): ?textkeep 42 -> 154 over two trips, ~56 more a
     trip for as long as you play; fixed 0 -> 5 and still 5 after five trips
     (the last few the game itself keeps a hand on), ~125 let go a trip */
  rec.ok(`2. two trips to a Flame Fields fight and home: the fixed phone holds ${res.fixed.after.destroyed} destroyed Texts (a handful, not growing), ?textkeep ${res.keep.after.destroyed} (${res.keep.grew} more)`,
    res.fixed.after.destroyed <= 8 && res.keep.grew >= 40 && res.fixed.swings > 0 && res.keep.swings > 0, res);

  const errs = [...fixed.logs, ...keep.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`3. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 3));
  for (const P of [fixed, keep]) await P.ctx.close().catch(() => {});
}
