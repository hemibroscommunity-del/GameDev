/* ═══ THE LABEL OVER EACH RESOURCE, AND ITS LEVEL (v2.3.3038, v2.3.3040) ═══
 *
 * Owner, 2026-10-05: "Add hatchet icon above trees you can chop.  Add pickaxe
 * icon above ore you can mine with its name and level.  Same with fish and
 * tree resources to harvest.  Add cracking sound when the ore splits when
 * user completes the gesture."  And: "black steel now requires a mining level
 * of at least 5 ... Fishing clownfish required fishing level 5."
 *
 * On a phone (390 x 844, 3x) in the Wheel, against a real worker:
 *   1. with the tools in the bag, every resource drawn near you carries its
 *      tool's picture (nodeLabels.js), and ONE -- the nearest, v2.3.3059's
 *      "I just don't want the screen to be too busy with text" -- says what
 *      it gives (its name, as the bag names it) and "Lv 1" beside it -- the
 *      commons' copper, pine and minnows ask nothing -- in gold; the rest the
 *      picture alone; none of the old tier dot / emoji / tips;
 *   2. it is over the art (above the crown, the rock, the school), screen-
 *      sized: about 20 CSS px tall at this zoom;
 *   3. a clownfish spot says "Lv 5", in RED for a Fishing 1 player, its rod
 *      GREY; and a tap on it TRIES (v2.3.3059, the owner: "show zeroes popping
 *      as they try to harvest the resource with the message that it requires
 *      whatever level"): three blows, a 0 on each, "Requires Fishing Lv 5"
 *      over it, nothing sent to the worker, and the try ends by itself (the
 *      worker's caps.gatherreq advertised);
 *   4. a copper vein mined to the end hides its label while its bar is up,
 *      CRACKS on the split frame (window.__btOreCracks: yours, full voice),
 *      and the worker pays the ore;
 *   5. (v2.3.3145, the owner: "Remove the fishing icon above fish but leave
 *      the proximity based nameplate in place") sampled all through the run:
 *      no fishing spot ever shows the rod's disc alone -- a spot drawn on
 *      screen has nothing over it until it is the one near you, and then its
 *      name plate;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/nodelabels-{commons,clownfish,try}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

/* every drawn resource's label, as the page holds it */
const labels = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ws = S._worldScaleX || 1;
  return (S.gatherNodes || []).filter((n) => n._pixiLabel && !n._pixiLabel.destroyed).map((n) => {
    const L = n._pixiLabel, p = L._nl;
    const b = L.getLocalBounds();
    return {
      id: n.id, type: n.nodeType, tier: n.gatherLvl, req: n.reqLvl, name: n.name,
      visible: !!L.visible, text: p.name.text, lv: p.lv.text, lvFill: String(p.lv.style.fill),
      icon: !!(p.icon && p.icon.texture && !p.icon.texture.destroyed),
      /* v2.3.3059: 'full' (the name and the level) or 'icon' (the tool alone),
         and greyed for a level you do not have */
      mode: p.mode, gray: !!p.gray, words: !!(p.name.visible && p.lv.visible),
      d: S.player ? Math.round(Math.hypot(n.x - S.player.x, n.y - S.player.y)) : null,
      x: +L.x.toFixed(1), w: +(b.width * L.scale.x).toFixed(1),
      cssH: +(b.height * L.scale.y * ws).toFixed(1),
      footY: +L.y.toFixed(1), nodeY: n.y,
      legacy: !!(n._pixiTier || n._pixiEmoji || n._pixiTip1),
    };
  });
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Labelbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    await P.page.evaluate(() => { window.__btProbe = true; });
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.gatherreq === true));
    rec.ok('the worker advertises caps.gatherreq (guard)', caps === true, { caps });
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    /* past the Mayor's gate (wheelCommonsGate): a new character is held inside
       the safe commons until tut_1, and the clownfish are out past it -- the
       walk there stood at the commons' rim for 300 legs (mp-wheelseats) */
    await H.devOp(wsPort, 'quests', myId);
    await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    await closeTalk(P);
    /* v2.3.3145: every drawn fishing spot's label, five times a second from
       here to the copper vein -- a spot's label is up only as its name plate
       ('full'), never the rod's disc alone ('icon') */
    await P.page.evaluate(() => {
      const seen = window.__qaFishLabels = { looks: 0, bare: 0, plate: 0, disc: 0, discAt: [] };
      window.__qaFishTimer = setInterval(() => {
        const S = window._gameState && window._gameState.current;
        if (!S || !S.player) return;
        for (const n of S.gatherNodes || []) {
          if (n.nodeType !== 'fishSpot' || !n.alive || n._wheelNear !== true) continue;
          seen.looks++;
          const L = n._pixiLabel;
          if (!L || L.destroyed || !L.visible) seen.bare++;
          else if (L._nl && L._nl.mode === 'full') seen.plate++;
          else {
            seen.disc++;
            if (seen.discAt.length < 5) seen.discAt.push({ id: n.id, d: Math.round(Math.hypot(n.x - S.player.x, n.y - S.player.y)) });
          }
        }
      }, 200);
    });

    /* ── 1-2. the commons' labels ── */
    const near = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (!n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, type: n.nodeType }; }
      }
      return best;
    });
    if (near) await travel(P, wsPort, myId, near.x + 40, near.y + 140);
    await P.page.waitForTimeout(1200);
    const L1 = await labels(P);
    const shown = L1.filter((l) => l.visible);
    rec.ok(`every resource drawn near you carries its tool's picture (${shown.length} shown)`, shown.length >= 1 && shown.every((l) => l.icon), L1.slice(0, 6));
    /* v2.3.3059: words for ONE -- the nearest within 260 px -- the rest the
       picture alone */
    const full = shown.filter((l) => l.mode === 'full');
    const nearest = shown.filter((l) => l.d != null).sort((a, b) => a.d - b.d)[0] || null;
    rec.ok(`...and only the nearest says its name and level (${full.length} with words, ${shown.length - full.length} the picture alone)`,
      full.length === 1 && !!nearest && full[0].id === nearest.id && nearest.d < 260
        && shown.filter((l) => l.mode !== 'full').every((l) => l.mode === 'icon' && !l.words),
      { full: full.map((l) => ({ id: l.id, d: l.d })), nearest: nearest && { id: nearest.id, d: nearest.d } });
    const commons = full.filter((l) => l.tier === 1);
    rec.ok('...it says what it gives (its bag name) and "Lv 1" on the commons, in gold, beside its tool\'s picture, in colour',
      commons.length === 1 && commons.every((l) => l.words && l.text === l.name && l.lv === 'Lv 1' && /d8aa58/i.test(l.lvFill) && l.icon && !l.gray),
      commons.slice(0, 6));
    rec.ok('...and none of the old tier dot, emoji or 7 px tips is made any more', L1.every((l) => !l.legacy), L1.filter((l) => l.legacy).slice(0, 3));
    rec.ok('...screen-sized: about 20 CSS px tall at this zoom', shown.every((l) => l.cssH > 16 && l.cssH < 26), shown.map((l) => l.cssH));
    rec.ok('...over its art: the label\'s foot is above the node\'s ground point', shown.every((l) => l.footY < l.nodeY - 20), shown.map((l) => ({ id: l.id, footY: l.footY, nodeY: l.nodeY })));
    if (near) {
      const scr = await P.page.evaluate((n) => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas').getBoundingClientRect();
        return { x: cv.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      }, near);
      const W = 300, Hh = 300;
      await P.page.screenshot({ path: join(OUT, 'nodelabels-commons.png'),
        clip: { x: Math.max(0, Math.min(PHONE.width - W, Math.round(scr.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(scr.y - 220))), width: W, height: Hh } }).catch(() => {});
    }

    /* ── 3. a clownfish spot: "Lv 5", red, and refused ── */
    const clown = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'fishSpot' || !n.alive || (n.gatherLvl || 1) !== 6) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
      }
      return best;
    });
    rec.ok('a clownfish spot in a land\'s levels 1-10 (guard)', !!clown, clown);
    if (clown) {
      /* Walk to its seat and hold there while the camera comes round: the
         label is drawn for what is near the VIEW, and the tap must land on the
         spot, not off the screen's edge (the first cut tapped before the
         camera had caught up -- off-screen, "Too far away!"). */
      const seat = { x: clown.x + STAND.fishSpot[0], y: clown.y + STAND.fishSpot[1] };
      /* walked, the worker agreeing every hop: a jump across the map is put
         back by its anti-teleport check, and the camera chases the bounce */
      await travel(P, wsPort, myId, seat.x, seat.y);
      let onScreen = null;
      for (let i = 0; i < 40 && !onScreen; i++) {
        onScreen = await P.page.evaluate(({ seat: st, node }) => {
          const S = window._gameState.current;
          S.player.x = st.x; S.player.y = st.y; S.player.vx = 0; S.player.vy = 0;
          const sx = (node.x - S.camera.x) * (S._worldScaleX || 1), sy = (node.y - S.camera.y) * (S._worldScaleY || 1);
          return sx > 60 && sx < 330 && sy > 160 && sy < 560 ? { sx: Math.round(sx), sy: Math.round(sy) } : null;
        }, { seat, node: clown });
        if (!onScreen) await P.page.waitForTimeout(500);
      }
      rec.ok('...stood on its seat, the spot on screen (guard)', !!onScreen, { onScreen });
      await P.page.waitForTimeout(800);
      const lab = (await labels(P)).find((l) => l.id === clown.id);
      const fishLv = await H.readState(P, (S) => (((S.rpg || {}).lifeSkills || {}).fishing || {}).level || 1);
      rec.ok(`its label says "Clownfish" and "Lv 5", in red for a Fishing ${fishLv} player`,
        !!lab && lab.visible && lab.mode === 'full' && lab.text === 'Clownfish' && lab.lv === 'Lv 5' && /ff7a6e/i.test(lab.lvFill) && fishLv < 5, { lab, fishLv });
      rec.ok('...and its rod is GREY: there to be fished, not yet by you', !!lab && lab.icon && lab.gray === true, lab);
      await P.page.screenshot({ path: join(OUT, 'nodelabels-clownfish.png') }).catch(() => {});
      /* ── v2.3.3059: the tap TRIES ── */
      await H.instrumentWire(P);
      const w0 = (await H.wireCounts(P)).extraction_start || 0;
      await P.page.evaluate((st) => { const S = window._gameState.current; S.player.x = st.x; S.player.y = st.y; S.player.vx = 0; S.player.vy = 0; }, seat);
      const started = await tapNode(P, clown.id, (S) => !!(S._extraction && S._extraction.locked), 2);
      /* what pops, sampled through the try (a popup lives about a second);
         the spot's own label while it runs; a picture on the first 0 */
      const seen = new Set();
      const labDuring = [];
      let tr = null;
      for (let i = 0; i < 40; i++) {
        const st = await P.page.evaluate((id) => {
          const S = window._gameState.current;
          const n = (S.gatherNodes || []).find((g) => g.id === id);
          return {
            pops: (S.dmgNumbers || []).map((q) => String(q.text)),
            active: !!(S._extraction && S._extraction.locked),
            labVis: n && n._pixiLabel ? !!n._pixiLabel.visible : null,
            tr: (window.__btLockedTries || []).slice(-1)[0] || null,
          };
        }, clown.id);
        for (const t of st.pops) seen.add(t);
        if (st.active) labDuring.push(st.labVis);
        tr = st.tr;
        if (tr && tr.endedAt > 0) break;
        await P.page.waitForTimeout(120);
      }
      const w1 = (await H.wireCounts(P)).extraction_start || 0;
      const after = await H.readState(P, (S) => ({ ex: !!S._extraction }));
      rec.ok(`a tap on it TRIES: three blows, a 0 off the spot on each (${tr && tr.zeros}), and "${tr && tr.said}" over it`,
        started && !!tr && tr.zeros === 3 && tr.said === 'Requires Fishing Lv 5' && seen.has('0') && seen.has('Requires Fishing Lv 5'),
        { started, tr, seen: [...seen].slice(0, 12) });
      rec.ok(`...its label steps aside while it tries (${labDuring.length} looks, none shown)`,
        labDuring.length > 0 && labDuring.every((v) => v === false), labDuring);
      rec.ok(`...nothing is sent to the worker for it (extraction_start ${w0} -> ${w1}), and it ends by itself a beat after the last 0`,
        w1 === w0 && !!tr && tr.endedAt > 0 && !after.ex, { w0, w1, tr, after });
      /* back, the pill with the words slides clear of you (it is drawn under
         your bro, and at the seat you stand in it) */
      let lab2 = null, me = null, clear = false;
      for (let i = 0; i < 20 && !clear; i++) {
        await P.page.waitForTimeout(300);
        lab2 = (await labels(P)).find((l) => l.id === clown.id);
        me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
        clear = !!lab2 && lab2.visible && (lab2.x + lab2.w / 2 <= me.x - 19 || lab2.x - lab2.w / 2 >= me.x + 19);
      }
      rec.ok('...and back after it, the spot\'s name pill stands clear of you, slid aside rather than under your bro',
        !!lab2 && lab2.mode === 'full' && clear, { lab2, me });
      /* a picture of a try: a screenshot here takes longer than a try's two
         seconds, so this one is held to twelve blows (QA's
         window.__btLockedTryN) and caught in the middle */
      await P.page.evaluate(() => { window.__btLockedTryN = 12; });
      const t2 = await tapNode(P, clown.id, (S) => !!(S._extraction && S._extraction.locked), 2);
      if (t2 && onScreen) {
        await P.page.waitForTimeout(1400);
        const W = 340, Hh = 360;
        await P.page.screenshot({ path: join(OUT, 'nodelabels-try.png'),
          clip: { x: Math.max(0, Math.min(PHONE.width - W, onScreen.sx - W / 2)), y: Math.max(0, Math.min(PHONE.height - Hh, onScreen.sy - 240)), width: W, height: Hh } }).catch(() => {});
      }
      await H.waitFor(P, () => (window.__btLockedTries || []).slice(-1)[0] || null, (t) => !!t && t.endedAt > 0, { timeout: 15000, label: 'the long try' }).catch(() => null);
      await P.page.evaluate(() => { window.__btLockedTryN = 0; });
      /* back to the commons for the copper vein, as the worker knows we are */
      const home = await H.adminPlayer(wsPort, myId).catch(() => null);
      if (home && home.live && typeof home.live.x === 'number') {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: home.live.x, y: home.live.y });
        await P.page.waitForTimeout(1500);
      }
    }

    /* ── 5. (v2.3.3145) no rod over the fish: what the sampler saw on the way
       to the clownfish, at its seat and back ── */
    const fishSeen = await P.page.evaluate(() => {
      clearInterval(window.__qaFishTimer);
      return window.__qaFishLabels || null;
    });
    rec.ok(`no fishing spot ever showed the rod's disc alone (${fishSeen && fishSeen.disc} of ${fishSeen && fishSeen.looks} looks at a drawn spot)`,
      !!fishSeen && fishSeen.looks > 0 && fishSeen.disc === 0, fishSeen);
    rec.ok(`...a spot drawn on screen had nothing over it until it was the one near you (${fishSeen && fishSeen.bare} looks bare), then its name plate (${fishSeen && fishSeen.plate})`,
      !!fishSeen && fishSeen.bare > 0 && fishSeen.plate > 0, fishSeen);

    /* ── 4. a copper vein, mined to the end: its label steps aside, it cracks ── */
    const vein = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'oreVein' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
      }
      return best;
    });
    rec.ok('a copper vein on the commons (guard)', !!vein, vein);
    if (vein) {
      await travel(P, wsPort, myId, vein.x + STAND.oreVein[0], vein.y + STAND.oreVein[1]);
      await closeTalk(P);
      const invBefore = await srvInv(wsPort, myId);
      await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; window.__btOreCracks = []; });
      await tapNode(P, vein.id, (S) => !!S._extraction);
      const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
      rec.ok('mining: tapping it starts the harvest (guard)', started === 'mining', { started });
      if (started === 'mining') {
        await H.waitFor(P, (S) => (S._extraction && S._extraction.hits ? S._extraction.hits.shown : 0), (v) => v >= 1, { timeout: 20000, label: 'a hit' }).catch(() => 0);
        const during = (await labels(P)).find((l) => l.id === vein.id);
        rec.ok('...while its bar is up, the vein\'s label steps aside', !during || during.visible === false, during);
        const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
          { timeout: 70000, label: 'the window opens' }).catch(() => null);
        const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
        await P.page.evaluate(([cx, cy]) => {
          const S = window._gameState.current;
          const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
            pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
          ev('pointerdown', cx, cy);
          const t0 = performance.now();
          let step = 0, next = t0;
          while (performance.now() - t0 < 12000) {
            while (performance.now() < next) { /* the phone's 16 ms */ }
            next += 16;
            const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
            ev('pointermove', cx + Math.sin(step) * 3, cy + v);
            step++;
            const ex = S._extraction;
            if (!ex || ex.status !== 'ready' || (ex.progress || 0) >= 1) break;
          }
          ev('pointerup', cx, cy);
        }, [cue ? cue.x : 200, cue ? cue.y : 700]);
        const cracks = await H.waitFor(P, () => window.__btOreCracks || [], (a) => a.length > 0, { timeout: 8000, label: 'the crack' }).catch(() => []);
        let got = 0;
        for (let i = 0; i < 20 && got <= 0; i++) {
          const inv = await srvInv(wsPort, myId);
          got = (inv.ore_copper_ore || 0) - (invBefore.ore_copper_ore || 0);
          if (got <= 0) await P.page.waitForTimeout(400);
        }
        rec.ok('...the gesture finishes it: the worker pays the copper, and the rock CRACKS as it splits (yours, full voice)',
          opened === 'ready' && got > 0 && cracks.length >= 1 && cracks[0].self === true && cracks[0].vol > 0.6, { opened, got, cracks });
      }
      await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
