/* ═══ v2.3.6550: THE BUTTON UNDER THE THING, PLAYED ON A PHONE (card CT part 17; `?manual=5`) ═══
 *
 * The owner, 2026-11-24: "contextual buttons like mining fishing or
 * interacting with npc should appear below the item instead of having a dual
 * purpose attack button. Attack button always stays attack".  In the Wheel
 * (BroTown), 430 x 775 at 3x (and 775 x 430 sideways), real touches (CDP):
 *
 *   1. TALK: Mayor Bro reached with H.approachNpc (a tap on him still talks);
 *      his window closed, a TALK button stands under his feet (44 px or
 *      more, on the screen), nothing opens by itself, and a touch on it opens
 *      him again (its tap, `__btCtxTap.did === 'talk'`).  v2.3.6552 (card CT
 *      part 19, the owner: "Your talk button is intrusive use the left icon
 *      I attached here instead"): it is the owner's pill, the picture alone
 *      (decoded, 44 x 30 or so), NO word drawn, no brass plate, named "Talk",
 *      in a 44 px or wider touch box, `touch-action: manipulation`;
 *   2. A TREE, the axe in the bag: beside a pine in reach, Attack keeps its
 *      word and picture (ATTACK, the weapon's), a CHOP button stands under the
 *      tree; a press of Attack swings (a tap attack counted) and starts no
 *      chop; a touch on CHOP starts it, Attack still the weapon's; a press of
 *      Attack in the wind-up swings and leaves the chop running; at the
 *      window the same button wears CHOP as the beat, the gesture's anchor is
 *      the button, and a stroke on it finishes the chop;
 *   3. SIDEWAYS: the same tree's button shows, under it, inside the window,
 *      and its touch starts the chop;
 *   4. `&ctxbuttons=0`: no button; Attack is HARVEST's again (the skill's
 *      picture) and a press starts the chop;
 *   5. MODE 4 (`?manual=4`): unchanged -- no button, Attack the harvest's;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs contextbuttons
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 430, height: 775 };
const SIDEWAYS = { width: 775, height: 430 };

/* the button and Attack, as a player sees them */
const LOOK = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const b = document.querySelector('.bt-ctx-btn');
  const r = b ? b.getBoundingClientRect() : null;
  const rd = document.querySelector('.bt-rjoy-base');
  const lbl = document.querySelector('.bt-rjoy-label');
  return {
    show: b ? b.getAttribute('data-show') : null, kind: b ? b.getAttribute('data-kind') : null,
    word: b ? (b.querySelector('[data-ctx="word"]') || {}).textContent : null,
    /* v2.3.6552: what is drawn -- the pill (TALK's picture), the word's
       span showing or not, the brass plate (the chisel class), the name */
    pill: (() => { const im = b && b.querySelector('[data-ctx-icon="talk"]'); if (!im) return null; const q = im.getBoundingClientRect();
      return { shown: im.style.display === 'block', decoded: im.complete && im.naturalWidth === 132, w: q.width, h: q.height, inline: im.src.slice(0, 22) === 'data:image/png;base64,' }; })(),
    wordShown: b ? (b.querySelector('[data-ctx="word"]') || { style: {} }).style.display !== 'none' : null,
    chisel: b ? b.classList.contains('bt-chisel') : null, name: b ? b.getAttribute('aria-label') : null,
    touchAction: b ? getComputedStyle(b).touchAction : null,
    box: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null,
    vw: window.innerWidth, vh: window.innerHeight,
    probe: window.__btCtxButton || null, tap: window.__btCtxTap || null,
    ricon: rd ? rd.getAttribute('data-ricon') : null, label: lbl ? lbl.textContent : null,
    ex: S._extraction ? { skill: S._extraction.skill, status: S._extraction.status } : null,
    harvest: !!S._btnHarvest, taps: S._tapAttacks || 0,
  };
});

/* a thing's feet on the page (CSS px) */
const FEET = (P, kind, id) => P.page.evaluate(([k, nid]) => {
  const S = window._gameState.current;
  const t = k === 'npc' ? (S.npcs || []).find((n) => n && n.name === nid) : (S.gatherNodes || []).find((n) => n && n.id === nid);
  const cv = document.querySelector('canvas.brotown-canvas');
  if (!t || !cv) return null;
  const rc = cv.getBoundingClientRect();
  const x = typeof t.renderX === 'number' ? t.renderX : t.x, y = typeof t.renderY === 'number' ? t.renderY : t.y;
  return { x: rc.left + (x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (y - S.camera.y) * (S._worldScaleY || 1) };
}, [kind, id]);

/* mp-tiertrees' stroke: side to side, 16 ms apart, in one run on the page */
const swipeChop = (P, cue) => P.page.evaluate(([cx, cy]) => {
  const S = window._gameState.current;
  const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
  ev('pointerdown', cx, cy);
  const t0 = performance.now();
  let step = 0, lastProg = 0, next = t0;
  while (performance.now() - t0 < 12000) {
    while (performance.now() < next) { /* 16 ms */ }
    next += 16;
    const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
    ev('pointermove', cx + v, cy + Math.sin(step) * 3);
    step++;
    const ex = S._extraction;
    if (ex) lastProg = ex.progress || 0;
    if (!ex || ex.status !== 'ready' || lastProg >= 1) break;
  }
  ev('pointerup', cx, cy);
  return { lastProg: +lastProg.toFixed(2), moves: step };
}, [cue.x, cue.y]);

/* a player in the world, the axe in the bag, Woodcutting 99, god */
async function player(browser, wsPort, webPort, name, viewport, query, errs) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query });
  P.page.on('pageerror', (e) => errs.push(name + ': ' + String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }), (v) => v.zone === 'wheel' && !v.loading && v.n > 0,
    { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
  if (!inW) return { P, ok: false };
  const myId = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, myId, 'item', { invKey: 'woodcutting_axe', count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 40 }).catch(() => {});
  await H.devOp(wsPort, 'lifeskill', myId, { skill: 'woodcutting', level: 99 }).catch(() => {});
  await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).woodcutting_axe > 0, (v) => v, { timeout: 20000, label: 'the axe' }).catch(() => null);
  const cdp = await P.ctx.newCDPSession(P.page);
  const touch = async (at, id = 4) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id }] });
    await P.page.waitForTimeout(90);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await P.page.waitForTimeout(350);
  };
  return { P, ok: true, myId, touch };
}

/* beside the nearest pine, in reach: spots the game's own reach test offers
   (BroTown nodeReachDist on the _gameFns bridge, asked with the player put
   there and put back in one evaluate: mp-tiertrees' reachMap), dry at the
   boots, nearest first; then the game's own word (S._btnHarvest) */
const SPOTS = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current, F = window._gameFns;
  const n = (S.gatherNodes || []).find((g) => g && g.id === nid);
  if (!n || !F || !F.nodeReachDist) return [];
  const T = window.__btWorldTrial, g0 = window.__btPlayerGround ? window.__btPlayerGround() : null;
  const P0 = { x: S.player.x, y: S.player.y }, fdy = g0 ? g0.y - P0.y : 52;
  const dry = (x, y) => !(T && T.ground) || [[0, 0], [-9, 0], [9, 0], [0, -6], [0, 6]].every(([ox, oy]) => { const c = T.ground(x + ox, y + fdy + oy); return !!c && !c.water; });
  const out = [];
  try {
    for (let dy = -80; dy <= 80; dy += 8) for (let dx = -80; dx <= 80; dx += 8) {
      S.player.x = n.x + dx; S.player.y = n.y + dy;
      if (F.nodeReachDist(n) != null && dry(n.x + dx, n.y + dy)) out.push({ x: n.x + dx, y: n.y + dy, d: Math.hypot(dx, dy) });
    }
  } finally { S.player.x = P0.x; S.player.y = P0.y; }
  out.sort((a, b) => Math.abs(a.d - 40) - Math.abs(b.d - 40));
  return out.slice(0, 6);
}, id);
const WHY = (P) => H.readState(P, (S) => {
  const p = S.player;
  return { at: [Math.round(p.x), Math.round(p.y)], btn: !!S._btnHarvest, near: S._nearNode ? S._nearNode.id : null, prox: S._proxNode ? S._proxNode.id : null,
    axe: ((S.rpg || {}).inventory || {}).woodcutting_axe || 0, lock: !!S.lockedTarget, swim: !!(S._wheelSwim && S._wheelSwim.on),
    mons: (S.monsters || []).filter((m) => m && m.alive && Math.hypot(m.x - p.x, m.y - p.y) < 260).length };
});
/* v2.3.6550 (the orchestrator, from mp-twobuttons' sitting): one room, so each
   pass takes a pine no earlier pass used -- a felled or still-worked one
   cascades red */
const SPENT = new Set();
async function byTree(P) {
  const all = await H.readState(P, (S) => (S.gatherNodes || []).filter((n) => n && n.nodeType === 'tree' && n.alive !== false)
    .map((n) => ({ id: n.id, x: n.x, y: n.y, d: Math.hypot(n.x - S.player.x, n.y - S.player.y) })).sort((a, b) => a.d - b.d));
  const trees = (all || []).filter((t) => !SPENT.has(t.id)).slice(0, 5);
  const tried = [];
  for (const t of trees || []) {
    await H.hopTo(P, Math.round(t.x), Math.round(t.y + 120), { tries: 60 });
    await P.page.waitForTimeout(600);
    for (const sp of (await SPOTS(P, t.id)).slice(0, 3)) {
      await H.hopTo(P, Math.round(sp.x), Math.round(sp.y), { tries: 6 });
      const v = await H.waitFor(P, (S) => (S._btnHarvest && S._nearNode ? S._nearNode.id : null), (x) => x === t.id, { timeout: 3000, label: 'in reach' }).catch(() => false);   /* the id compared here: `t` is not in the page */
      if (v) { SPENT.add(t.id); return { t, tried }; }
      tried.push({ tree: t.id, sp: [Math.round(sp.x), Math.round(sp.y)], why: await WHY(P) });
    }
    if (tried.length >= 6) break;
  }
  return { t: null, tried: tried.slice(0, 4), trees: trees.length };
}

const rdCentre = (P) => P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
const weaponIcon = (ic) => !!ic && ['mining', 'woodcutting', 'fishing', 'cooking', 'none'].indexOf(ic) < 0;

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    /* ── 1-2: upright, mode 5 ── */
    const A = await player(browser, wsPort, webPort, 'Ctxbro', UPRIGHT, 'manual=5', errs);
    players.push(A.P);
    rec.ok('upright: in the Wheel, mode 5 (guard)', A.ok && (await A.P.page.evaluate(() => window.__btManual && window.__btManual.mode())) === 5);
    if (A.ok) {
      const P = A.P;
      /* 1. TALK */
      const opened = await H.approachNpc(P);
      rec.ok('1a. a tap on Mayor Bro still talks (H.approachNpc)', opened === true);
      await H.closeNpcDialogue(P);
      await P.page.waitForTimeout(1500);
      const mayor = await H.readState(P, (S) => { const m = (S.npcs || []).find((n) => n && n.name === 'Mayor Bro'); return m ? { id: m.name, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) } : null; });
      const t1 = await H.waitFor(P, () => { const p = window.__btCtxButton; return p && p.kind; }, (k) => k === 'talk', { timeout: 6000, label: 'TALK' }).catch(() => null);
      const L1 = await LOOK(P);
      const f1 = mayor ? await FEET(P, 'npc', mayor.id) : null;
      rec.ok(`1b. beside him (${mayor && mayor.d} px), his window closed: a TALK button under his feet, ${L1.box && Math.round(L1.box.w)} x ${L1.box && Math.round(L1.box.h)} px to touch, on the screen`,
        t1 === 'talk' && L1.show === '1' && L1.probe.word === 'TALK' && L1.probe.name === 'Mayor Bro' && !!L1.box && L1.box.h >= 44 && L1.box.w >= 44 && !!f1 && L1.box.top > f1.y && Math.abs(L1.box.x - f1.x) < 2
        && L1.box.left >= 0 && L1.box.right <= L1.vw && L1.box.bottom <= L1.vh, { L1, f1, mayor });
      /* v2.3.6552: the owner's pill, no word, no plate */
      rec.ok(`1b. it is the owner's pill (${L1.pill && Math.round(L1.pill.w)} x ${L1.pill && Math.round(L1.pill.h)}, inline, decoded), no word drawn, no brass plate, named "${L1.name}", touch-action ${L1.touchAction}`,
        !!L1.pill && L1.pill.shown && L1.pill.decoded && L1.pill.inline && Math.abs(L1.pill.w - 44) <= 1 && Math.abs(L1.pill.h - 30) <= 1
        && L1.word === '' && L1.wordShown === false && L1.chisel === false && L1.name === 'Talk' && L1.touchAction === 'manipulation'
        && L1.probe.pic === 'talk' && L1.probe.drawn === '' && L1.probe.plate === false, L1);
      rec.ok('1c. nothing opens by itself standing there', !(await H.npcDialogueOpen(P)));
      rec.ok('1c. Attack keeps the weapon beside him', weaponIcon(L1.ricon) && L1.label === 'ATTACK', { ricon: L1.ricon, label: L1.label });
      if (L1.box) await A.touch(L1.box);
      await P.page.waitForTimeout(800);
      const L1t = await LOOK(P);
      rec.ok('1d. a touch on TALK talks (his window opens; the button\'s tap)', (await H.npcDialogueOpen(P)) && !!L1t.tap && L1t.tap.did === 'talk', L1t.tap);
      await H.closeNpcDialogue(P);
      await H.leaveNpc(P);

      /* 2. A TREE */
      const bt = await byTree(P), t = bt.t;
      rec.ok('2. beside a pine, in its reach, the axe held (guard)', !!t, bt);
      if (t) {
        await P.page.waitForTimeout(600);
        const L2 = await LOOK(P);
        const f2 = await FEET(P, 'node', t.id);
        rec.ok(`2a. Attack keeps its word and picture (${L2.label}, ${L2.ricon})`, L2.label === 'ATTACK' && weaponIcon(L2.ricon), L2);
        rec.ok('2b. a CHOP button under the tree (44 px or more; the brass word button, never the pill)', L2.show === '1' && L2.kind === 'node' && L2.word === 'CHOP' && L2.wordShown === true && L2.chisel === true && !!L2.pill && !L2.pill.shown && L2.name === 'Do this here' && L2.probe.id === t.id && !!L2.box && L2.box.h >= 44 && !!f2 && L2.box.top > f2.y && Math.abs(L2.box.x - f2.x) < 2, { L2, f2 });
        const rd = await rdCentre(P);
        if (rd) await A.touch(rd, 2);
        await P.page.waitForTimeout(700);
        const L2a = await LOOK(P);
        rec.ok(`2c. a press of Attack swings (${L2.taps} -> ${L2a.taps} tap attacks) and starts no chop`, L2a.taps > L2.taps && !L2a.ex, { before: L2.taps, after: L2a.taps, ex: L2a.ex });
        const L2b0 = await LOOK(P);
        if (L2b0.box) await A.touch(L2b0.box);
        const st = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'woodcutting', { timeout: 5000, label: 'the chop' }).catch(() => null);
        const L2b = await LOOK(P);
        rec.ok('2d. a touch on CHOP starts the chop; Attack still the weapon\'s', st === 'woodcutting' && L2b.tap && L2b.tap.did === 'extract' && L2b.label === 'ATTACK' && weaponIcon(L2b.ricon), L2b);
        if (st) {
          const wait0 = await LOOK(P);
          if (wait0.ex && wait0.ex.status === 'waiting' && rd) {
            await A.touch(rd, 2);
            const w1 = await LOOK(P);
            rec.ok('2e. a press of Attack in the wind-up swings and the chop goes on', w1.taps > wait0.taps && !!w1.ex && w1.ex.skill === 'woodcutting', { before: wait0, after: w1 });
          }
          const ready = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready', { timeout: 60000, label: 'the window' }).catch(() => null);
          const L2r = await LOOK(P);
          const hv = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest() : null));
          rec.ok('2f. at the window: the same button wears CHOP as the beat, Attack still ATTACK', ready === 'ready' && L2r.kind === 'beat' && L2r.word === 'CHOP' && L2r.probe.id === t.id && L2r.label === 'ATTACK' && weaponIcon(L2r.ricon), L2r);
          rec.ok('2g. the gesture\'s anchor is the button under the tree', !!hv && !!hv.cue && !!L2r.box && Math.abs(hv.cue.x - L2r.box.x) < 2 && Math.abs(hv.cue.y - L2r.box.y) < 2, { cue: hv && hv.cue, box: L2r.box });
          if (hv && hv.cue) {
            const sw = await swipeChop(P, hv.cue);
            const ended = await H.waitFor(P, (S) => !S._extraction, (v) => v === true, { timeout: 8000, label: 'the chop ends' }).catch(() => false);
            rec.ok(`2h. strokes on the button land the beats (${sw.lastProg} of the meter) and finish the chop`, ended === true && sw.lastProg >= 0.85, sw);
          }
        }
      }
    }

    /* ── 3: sideways, mode 5 ── */
    const B = await player(browser, wsPort, webPort, 'Sidectx', SIDEWAYS, 'manual=5', errs);
    players.push(B.P);
    if (B.ok) {
      const bt = await byTree(B.P), t = bt.t;
      rec.ok('3. sideways: beside a pine (guard)', !!t, bt);
      if (t) {
        await B.P.page.waitForTimeout(2000);   /* the camera settled after the hop (this box draws a few frames a second) */
        const L = await LOOK(B.P);
        const f = await FEET(B.P, 'node', t.id);
        rec.ok('3a. sideways: CHOP under the tree, inside the window, Attack the weapon\'s', L.show === '1' && L.word === 'CHOP' && !!L.box && !!f && L.box.y >= f.y + 20 && Math.abs(L.box.x - f.x) < 8 && L.box.left >= 0 && L.box.right <= L.vw && L.box.bottom <= L.vh && L.box.h >= 44 && weaponIcon(L.ricon), { L, f });
        if (L.box) await B.touch(L.box);
        const st = await H.waitFor(B.P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'woodcutting', { timeout: 5000, label: 'the chop' }).catch(() => null);
        rec.ok('3b. sideways: its touch starts the chop', st === 'woodcutting');
      }
    } else rec.ok('3. sideways: in the Wheel (guard)', false);

    /* ── 4-5: the switch off, and mode 4 ── */
    for (const [label, q, mode] of [['4. `&ctxbuttons=0`', 'manual=5&ctxbuttons=0', 5], ['5. mode 4', 'manual=4', 4]]) {
      const C = await player(browser, wsPort, webPort, mode === 4 ? 'Fourctx' : 'Offctx', UPRIGHT, q, errs);
      players.push(C.P);
      if (!C.ok) { rec.ok(`${label}: in the Wheel (guard)`, false); continue; }
      const m = await C.P.page.evaluate(() => window.__btManual && window.__btManual.mode());
      const bt = await byTree(C.P), t = bt.t;
      rec.ok(`${label}: mode ${m}, beside a pine (guard)`, m === mode && !!t, { m, bt });
      if (!t) continue;
      await C.P.page.waitForTimeout(600);
      const L = await LOOK(C.P);
      rec.ok(`${label}: no button; Attack is the harvest's (${L.label}, ${L.ricon})`, L.show !== '1' && L.ricon === 'woodcutting' && L.label === 'HARVEST', L);
      const rd = await rdCentre(C.P);
      const under = rd ? await C.P.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const b = e && e.closest ? e.closest('.bt-rjoy-base') : null; return { el: e ? (e.className && e.className.baseVal != null ? e.className.baseVal : e.className) || e.tagName : null, onDisc: !!b }; }, [rd.x, rd.y]) : null;
      if (rd) await C.touch(rd, 2);
      const st = await H.waitFor(C.P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'woodcutting', { timeout: 5000, label: 'the chop' }).catch(() => null);
      rec.ok(`${label}: a press of Attack starts the chop, as before`, st === 'woodcutting', { rd, under, after: await LOOK(C.P) });
    }

    rec.ok('6. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
