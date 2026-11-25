/* ═══ v2.3.6550: THE BUTTON UNDER THE THING (card CT part 17; src/game/contextButton.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-24: "contextual buttons
 * like mining fishing or interacting with npc should appear below the item
 * instead of having a dual purpose attack button. Attack button always stays
 * attack".  Played on the module itself, and the screens' calls read off the
 * syntax tree:
 *
 *   1. THE SWITCH: `?ctxbuttons=0` throws it; absent, `=1`, a longer name not;
 *   2. THE PICK (ctxPick): nothing unless live, shown, no panel, the bro up;
 *      a harvest under way is the beat under its node (each skill's word,
 *      WAIT in the wind-up), before anything else; a node exactly on today's
 *      condition (S._btnHarvest and S._nearNode) with its word, a kind
 *      Attack never worked offered nothing; a townsperson within 120 (not
 *      121), alive, in a talking zone and not in a fight; the nearer of the
 *      two wins, either way;
 *   3. THE PLACE (ctxScreen): under the thing's feet (a townsperson's 14
 *      world px lower), the canvas's place added, the world's scale, its
 *      drawn place first, on whole device pixels;
 *   4. THE TAP (ctxTap): a tree, a vein, a spot start their skill; a fire
 *      cooks; a townsperson talks; a beat or nothing does nothing;
 *   5. THE HARVEST'S NODE (ctxExtractionNode): its reference, its id, the fire;
 *   6. THE SCREENS, off the syntax tree: Attack's press gates BOTH harvest
 *      branches on `!_ctxPress` (`_ctxPress = ctxButtonsLive()`); its stamp
 *      reads `_ex = _ctxOn ? null : S._extraction` and `_harvestCtx =
 *      S._btnHarvest && !_ctxOn` (today's condition kept whole in
 *      S._btnHarvest); ONE frame call; the gesture's anchor prefers the
 *      button while it shows.
 *   7. THE LOOK (ctxLook, v2.3.6552, card CT part 19: the owner's "use the
 *      left icon I attached here instead"): TALK draws the owner's pill and
 *      NO word, no plate, named "Talk"; every harvest kind (CHOP, MINE, FISH,
 *      COOK, each beat) the brass plate, its word and its skill's picture,
 *      NEVER the pill; the pick's own word unchanged (TALK, for the probe);
 *   8. THE PILL (src/data/talkPill.js, a data address the cut tool writes):
 *      a palette PNG on 256 colours or fewer, under 4096 bytes (it rides in
 *      the script: nothing fetched), its shape the drawn one (CTX_TALK_W x CTX_TALK_H at 3 device
 *      pixels a point), the touch box 44 or more round it;
 *   9. THE PANEL AND THE PRELOAD, off the syntax tree: the frame draws the
 *      look's picture and word (never the pick's), dresses on a kind change,
 *      the picture-alone dress has no chisel class and a touch box past 44,
 *      the pill's <img> is TALK_PILL_URL, controlsPreload warms it.
 *
 * A guard under tools/guards (server/test/run.mjs runs it; nothing deploys).
 *
 * Mutants (v2.3.6550): 35 of the module's added lines, played by a script
 * (each line changed alone, the suite run): every one red -- among them the
 * reach's `<=` to `<` (2d), `dd < bestD` to `<=` (2g's tie), the `!o.busy`,
 * `S._uiBusy`, hp and `shown` gates dropped (2a, 2e), only 'ready' a beat
 * (2b), the foot's 14 to 0 (3b), the rounding dropped (3c), renderX ignored
 * (3d), a pixel ratio below 0 (3e), the cook and talk branches dropped (4b),
 * a vein-only `mining` widened (2a), the reach 121 (2d), the switch's name
 * (1).  By hand on the screens: `!_ctxPress` dropped from either press
 * branch (6a), `_ex = S._extraction` and `_harvestCtx = S._btnHarvest`
 * (6b), the anchor's order swapped (6d).  Survivors: none.
 * Mutants (v2.3.6552, parts 7-9; 19 played by a script): 12 of contextButton.js,
 * each changed alone (the sizes 44/30/48 to 40/31/40, the picture's name,
 * `if (!pick)` dropped, TALK's plate, word and label, a harvest kind's
 * plate, word and picture): every one red.  By hand in the panel: `ic =
 * use.skill || 'none'` (9a), `w.textContent = use.word` (9a), ctxDress not
 * called (9b), the chisel class on PIC_CLASS (9c), PIC_DRESS's 48 to 40
 * (9c), the pill's src (9d), the preload's push dropped (9e): every one red.
 * Survivors: none.
 * v2.3.6553 (card CT part 21; the owner: "Talk icon below npc"): 3b, 3f-3h
 * and 9f-9g hold a townsperson's pill below his name tag and quest line.
 * Mutants (23, by a script, each alone): the tag 20 to 24, the line 20 to 0,
 * the gap 6 to 0, the offer's marker, the drop's floor 14 to 0, its ratio,
 * round to floor, its NaN guard, the line's term and half the pill dropped
 * from ctxTalkBelow, a flat 14 drop, the drop on every kind, the line never
 * or on any marker, TALK at CTX_BELOW_CSS, every kind on TALK's rule, a beat
 * as a townsperson, the clamp dropped, held at vh or past vh; in the panel
 * figH not passed, no npc to npcFigureHeight, figH for every kind: every one
 * red.  9g is a mirror (the renderer's sizes, read): a change there re-measures.
 * Survivors: none.
 */
import { readSystem } from './lib/filesOf.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { ctxButtonsOn, ctxPick, ctxScreen, ctxTap, ctxExtractionNode, ctxSkillOf, ctxLook, CTX_TALK_REACH, CTX_BELOW_CSS,
  ctxPlateTop, ctxTalkBelow, CTX_PLATE_CSS, CTX_QUEST_CSS, CTX_TALK_GAP, CTX_QUEST_OFFER,
  CTX_NODE_WORDS, CTX_BEAT_WORDS, CTX_TALK_W, CTX_TALK_H, CTX_TOUCH, CTX_TALK_PIC } from '../../src/game/contextButton.js';
import { TALK_PILL_DATA, TALK_PILL_W, TALK_PILL_H } from '../../src/data/talkPill.js';

let failures = 0, passes = 0;
const check = (name, ok, detail) => {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

/* 1. the switch */
check('1. ctxbuttons: on with no address, \'\', =1, a longer name', ctxButtonsOn('') === true && ctxButtonsOn('?ctxbuttons=1') === true && ctxButtonsOn('?xctxbuttons=0') === true && ctxButtonsOn('?manual=5') === true);
check('1. ctxbuttons: off with =0, alone and beside another', ctxButtonsOn('?ctxbuttons=0') === false && ctxButtonsOn('?manual=5&ctxbuttons=0') === false);

const O = { live: true, busy: false, npcsHere: true, shown: true };
const tree = { id: 't1', nodeType: 'tree', x: 140, y: 100, alive: true };
const vein = { id: 'v1', nodeType: 'oreVein', x: 100, y: 160, alive: true };
const spot = { id: 'f1', nodeType: 'fishSpot', x: 60, y: 100, alive: true };
const fire = { id: 'cf', x: 100, y: 40 };
const base = (over) => Object.assign({ player: { x: 100, y: 100 }, rpg: { hp: 50 }, npcs: [], gatherNodes: [tree, vein, spot] }, over || {});

/* 2. the pick */
{
  const S = base({ _btnHarvest: true, _nearNode: tree });
  const p = ctxPick(S, O);
  check('2a. a tree on today\'s condition: CHOP under it, woodcutting', !!p && p.kind === 'node' && p.thing === tree && p.word === 'CHOP' && p.skill === 'woodcutting', p && { k: p.kind, w: p.word });
  check('2a. nothing when not live, not shown, a panel up, the bro down, no player',
    ctxPick(S, Object.assign({}, O, { live: false })) === null && ctxPick(S, Object.assign({}, O, { shown: false })) === null
    && ctxPick(base({ _btnHarvest: true, _nearNode: tree, _uiBusy: true }), O) === null
    && ctxPick(base({ _btnHarvest: true, _nearNode: tree, rpg: { hp: 0 } }), O) === null
    && ctxPick(base({ _btnHarvest: true, _nearNode: tree, player: null }), O) === null && ctxPick(S, null) === null);
  check('2a. not today\'s condition (S._btnHarvest false, or no node): nothing', ctxPick(base({ _btnHarvest: false, _nearNode: tree }), O) === null && ctxPick(base({ _btnHarvest: true, _nearNode: null }), O) === null);
  const w = (n, f) => { const q = ctxPick(base({ _btnHarvest: true, _nearNode: n, _campfire: f }), O); return q && q.word + '/' + q.skill; };
  check('2a. the words: MINE/mining, FISH/fishing, COOK/cooking (the fire), and a kind Attack never worked: none',
    w(vein) === 'MINE/mining' && w(spot) === 'FISH/fishing' && w(fire, fire) === 'COOK/cooking' && w({ nodeType: 'campfire', x: 100, y: 100 }) === 'COOK/cooking' && w({ nodeType: 'herb', x: 100, y: 100 }) === null,
    [w(vein), w(spot), w(fire, fire), w({ nodeType: 'herb', x: 100, y: 100 })]);
  /* the beat */
  const ex = (skill, status, over) => base(Object.assign({ _extraction: Object.assign({ skill, status, nodeRef: tree }, over || {}), _btnHarvest: true, _nearNode: vein, npcs: [{ name: 'Mo', x: 101, y: 100 }] }, {}));
  const beats = ['mining', 'woodcutting', 'fishing', 'cooking'].map((k) => ctxPick(ex(k, 'ready'), O).word).join(',');
  check('2b. a harvest under way: the beat under ITS node, before a nearer node or townsperson: PUMP, CHOP, REEL, FLIP; WAIT in the wind-up',
    beats === 'PUMP,CHOP,REEL,FLIP' && ctxPick(ex('mining', 'waiting'), O).word === 'WAIT' && ctxPick(ex('mining', 'ready'), O).kind === 'beat' && ctxPick(ex('mining', 'ready'), O).thing === tree, beats);
  check('2b. only \'ready\' is the beat: any other status (none set, a strange one) WAITs', ctxPick(ex('mining', undefined), O).word === 'WAIT' && ctxPick(ex('mining', 'done'), O).word === 'WAIT');
  check('2b. a beat\'s node not found: nothing; an unknown skill ready: GO', ctxPick(ex('mining', 'ready', { nodeRef: null, nodeId: 'gone' }), O) === null && ctxPick(ex('x', 'ready'), O).word === 'GO');
  check('2b. a beat even with a monster near (busy): the work is under way', ctxPick(ex('mining', 'ready'), Object.assign({}, O, { busy: true })).kind === 'beat');
  /* talk */
  const at = (dx, over, o) => ctxPick(base(Object.assign({ npcs: [{ name: 'Mo', x: 100 + dx, y: 100 }] }, over || {})), o || O);
  check('2c. a townsperson at 120: TALK under him', !!at(CTX_TALK_REACH) && at(CTX_TALK_REACH).kind === 'talk' && at(CTX_TALK_REACH).word === 'TALK' && at(CTX_TALK_REACH).thing.name === 'Mo');
  check('2d. at 121: nothing (CTX_TALK_REACH is 120)', CTX_TALK_REACH === 120 && at(121) === null);
  check('2e. in a fight (a lock or a monster near), out of a talking zone, or him down: no TALK',
    at(50, null, Object.assign({}, O, { busy: true })) === null && at(50, null, Object.assign({}, O, { npcsHere: false })) === null
    && ctxPick(base({ npcs: [{ name: 'Mo', x: 150, y: 100, alive: false }] }), O) === null && ctxPick(base({ npcs: null }), O) === null);
  const two = ctxPick(base({ npcs: [{ name: 'Far', x: 200, y: 100 }, { name: 'Near', x: 160, y: 100 }, null] }), O);
  check('2f. two townsfolk: the nearer', !!two && two.thing.name === 'Near');
  const nodeNear = ctxPick(base({ _btnHarvest: true, _nearNode: tree, npcs: [{ name: 'Mo', x: 100, y: 190 }] }), O);
  const npcNear = ctxPick(base({ _btnHarvest: true, _nearNode: tree, npcs: [{ name: 'Mo', x: 100, y: 130 }] }), O);
  check('2g. a node at 40 and a townsperson at 90: the node; the townsperson at 30: him (ONE button, the nearer)', nodeNear && nodeNear.kind === 'node' && npcNear && npcNear.kind === 'talk', [nodeNear && nodeNear.kind, npcNear && npcNear.kind]);
  const tie = ctxPick(base({ _btnHarvest: true, _nearNode: tree, npcs: [{ name: 'Mo', x: 140, y: 100 }] }), O);
  check('2g. a tie: the node (the work you came for)', tie && tie.kind === 'node');
}

/* 3. the place */
{
  const box = { left: 10, top: 20 };
  const cam = { x: 50, y: 60 };
  const n = ctxScreen({ kind: 'node', thing: { x: 150, y: 160 } }, cam, 2, 2, box, 1);
  check('3a. a node: the canvas\'s corner + (x - camera) * scale, CTX_BELOW_CSS under its feet', !!n && n.x === 10 + 200 && n.y === 20 + 200 + CTX_BELOW_CSS, n);
  /* v2.3.6553 (card CT part 21; the owner: "Talk icon below npc"): a
     townsperson's pill stands below his name tag and his quest line */
  const FIG = 128.9;   /* Mayor Bro's figure (world px: 120/256 * 1.25 * 1.10 * 200) */
  const t = ctxScreen({ kind: 'talk', thing: { x: 150, y: 160 } }, cam, 2, 2, box, 1, FIG);
  const tagTop = 20 + (160 + ctxPlateTop(FIG) - 60) * 2;
  check('3b. a townsperson: his tag\'s top (ctxPlateTop world px under his feet), the tag, the gap, half the pill',
    !!t && t.y === tagTop + CTX_PLATE_CSS + CTX_TALK_GAP + CTX_TALK_H / 2 && t.x === n.x, { t, tagTop });
  const tq = ctxScreen({ kind: 'talk', thing: { x: 150, y: 160, _questMarker: CTX_QUEST_OFFER } }, cam, 2, 2, box, 1, FIG);
  check('3b. his offer\'s line shown: CTX_QUEST_CSS lower; a quest he holds (a pin over his head) draws no line',
    !!tq && tq.y === t.y + CTX_QUEST_CSS && tq.x === t.x
    && ctxScreen({ kind: 'talk', thing: { x: 150, y: 160, _questMarker: '\u2754' } }, cam, 2, 2, box, 1, FIG).y === t.y
    && ctxScreen({ kind: 'talk', thing: { x: 150, y: 160, _questMarker: '\u2753' } }, cam, 2, 2, box, 1, FIG).y === t.y, { tq, t });
  check('3b. the tag\'s drop is the renderer\'s: max(14, round(figH * 38 / 121.9)), 14 with none',
    ctxPlateTop(FIG) === 40 && ctxPlateTop(121.9) === 38 && ctxPlateTop(117.2) === 37 && ctxPlateTop(30) === 14 && ctxPlateTop(undefined) === 14 && ctxPlateTop(-5) === 14 && ctxPlateTop(NaN) === 14,
    [ctxPlateTop(FIG), ctxPlateTop(121.9), ctxPlateTop(30), ctxPlateTop(undefined)]);
  check('3b. the labels\' sizes: a 20 px tag, 20 more for the quest line, 6 px of air', CTX_PLATE_CSS === 20 && CTX_QUEST_CSS === 20 && CTX_TALK_GAP === 6 && CTX_QUEST_OFFER === '\u2757'
    && ctxTalkBelow(false) === 20 + 6 + CTX_TALK_H / 2 && ctxTalkBelow(true) === 40 + 6 + CTX_TALK_H / 2);
  /* talk stands lower than a harvest kind by the labels' height, at every
     view scale and figure: never over the tag or the line */
  let over = null;
  for (const sc of [0.5, 1, 1.5, 2, 3]) for (const fh of [60, 93.75, 117.2, FIG, 160]) for (const q of [false, true]) {
    const tt = ctxScreen({ kind: 'talk', thing: { x: 150, y: 160, _questMarker: q ? CTX_QUEST_OFFER : null } }, cam, sc, sc, box, 1, fh);
    const nn = ctxScreen({ kind: 'node', thing: { x: 150, y: 160 } }, cam, sc, sc, box, 1);
    const foot = 20 + (160 + ctxPlateTop(fh) - 60) * sc + CTX_PLATE_CSS + (q ? CTX_QUEST_CSS : 0);
    if (!(Math.abs(tt.y - CTX_TALK_H / 2 - (foot + CTX_TALK_GAP)) <= 0.5 && Math.abs(tt.y - nn.y - (ctxPlateTop(fh) * sc + ctxTalkBelow(q) - CTX_BELOW_CSS)) <= 1 && tt.y > nn.y && tt.x === nn.x))   /* within the whole-pixel rounding */ { over = { sc, fh, q, tt, nn, foot }; break; }
  }
  check('3f. TALK lower than CHOP by the labels: its top 6 px under the lowest line, centred, at every scale and figure', over === null, over);
  const low = ctxScreen({ kind: 'talk', thing: { x: 150, y: 400 } }, cam, 2, 2, { left: 10, top: 20, vh: 700 }, 1, FIG);
  const lowN = ctxScreen({ kind: 'node', thing: { x: 150, y: 400 } }, cam, 2, 2, { left: 10, top: 20, vh: 700 }, 1);
  const mid = ctxScreen({ kind: 'talk', thing: { x: 150, y: 160 } }, cam, 2, 2, { left: 10, top: 20, vh: 700 }, 1, FIG);
  check('3g. at the window\'s foot the pill is held on the screen (CTX_TOUCH / 2 inside), above it untouched',
    !!low && low.y === 700 - CTX_TOUCH / 2 && lowN.y === 700 - CTX_TOUCH / 2 && mid.y === t.y
    && ctxScreen({ kind: 'node', thing: { x: 150, y: 378 } }, cam, 2, 2, { left: 10, top: 20, vh: 700 }, 1).y === 700 - CTX_TOUCH / 2
    && ctxScreen({ kind: 'node', thing: { x: 150, y: 366 } }, cam, 2, 2, { left: 10, top: 20, vh: 700 }, 1).y === 666, { low, lowN, mid });
  const bt = ctxScreen({ kind: 'beat', thing: { x: 150, y: 160, _questMarker: CTX_QUEST_OFFER } }, cam, 2, 2, box, 1, FIG);
  check('3h. a beat stands where its node does (only a townsperson\'s pill moves)', !!bt && bt.y === n.y && bt.x === n.x, bt);
  const r = ctxScreen({ kind: 'node', thing: { x: 150.4, y: 160.2 } }, cam, 1.1, 1.1, { left: 0, top: 0 }, 3);
  check('3c. on whole device pixels (dpr 3: a third of a CSS px)', !!r && Math.abs(r.x * 3 - Math.round(r.x * 3)) < 1e-9 && Math.abs(r.y * 3 - Math.round(r.y * 3)) < 1e-9 && Math.abs(r.x - 110.44) < 0.34, r);
  const d = ctxScreen({ kind: 'talk', thing: { x: 0, y: 0, renderX: 150, renderY: 160 } }, cam, 2, 2, box, 1, FIG);
  check('3d. a townsperson\'s drawn place (renderX, renderY) first', !!d && d.x === t.x && d.y === t.y, d);
  check('3e. nothing with no pick, camera or box; a scale of 0 or none is 1',
    ctxScreen(null, cam, 1, 1, box, 1) === null && ctxScreen({ kind: 'node', thing: tree }, null, 1, 1, box, 1) === null && ctxScreen({ kind: 'node', thing: tree }, cam, 1, 1, null, 1) === null
    && ctxScreen({ kind: 'node', thing: { x: 150, y: 160 } }, cam, 0, undefined, box, 0).x === 110
    && ctxScreen({ kind: 'node' }, cam, 1, 1, box, 1) === null);
  const neg = ctxScreen({ kind: 'node', thing: { x: 150.4, y: 160.2 } }, cam, 1, 1, box, -2);
  check('3e. a pixel ratio below 0 is 1 (whole CSS px)', !!neg && neg.x === Math.round(10 + 100.4) && neg.y === Math.round(20 + 100.2 + CTX_BELOW_CSS), neg);
  check('3e. a place that is not a number: nothing', ctxScreen({ kind: 'node', thing: { x: NaN, y: 1 } }, cam, 1, 1, box, 1) === null && ctxScreen({ kind: 'node', thing: { x: 1, y: 1 } }, cam, 1, 1, { left: 0, top: Infinity }, 1) === null);
}

/* 4. the tap */
{
  const log = [];
  const acts = { extract: (n, s) => log.push('x:' + n.id + ':' + s), cook: (f) => log.push('c:' + f.id), talk: (p) => log.push('t:' + p.name) };
  const res = [
    ctxTap({ kind: 'node', thing: tree, skill: 'woodcutting' }, acts),
    ctxTap({ kind: 'node', thing: vein, skill: 'mining' }, acts),
    ctxTap({ kind: 'node', thing: spot, skill: 'fishing' }, acts),
  ];
  check('4a. a tree, a vein, a spot: their skill\'s harvest', res.join() === 'extract,extract,extract' && log.join() === 'x:t1:woodcutting,x:v1:mining,x:f1:fishing', log);
  log.length = 0;
  check('4b. a fire cooks; a townsperson talks', ctxTap({ kind: 'node', thing: fire, skill: 'cooking' }, acts) === 'cook' && ctxTap({ kind: 'talk', thing: { name: 'Mo' } }, acts) === 'talk' && log.join() === 'c:cf,t:Mo', log);
  log.length = 0;
  check('4c. a beat, nothing, no doors: nothing done', ctxTap({ kind: 'beat', thing: tree, skill: 'mining' }, acts) === null && ctxTap(null, acts) === null && ctxTap({ kind: 'node', thing: tree }, null) === null && ctxTap({ kind: 'node', thing: null, skill: 'mining' }, acts) === null && ctxTap({ kind: 'talk', thing: null }, acts) === null
    && ctxTap({ kind: 'node', thing: { nodeType: 'herb' }, skill: ctxSkillOf({ nodeType: 'herb' }) }, acts) === null && log.length === 0);
  check('4d. Attack\'s own press (modes 1-4): ctxSkillOf by nodeType alone, the four kinds it had inline',
    ['fishSpot', 'tree', 'oreVein', 'campfire', 'herb', undefined].map((t) => ctxSkillOf({ nodeType: t })).join() === 'fishing,woodcutting,mining,cooking,,');
}

/* 5. the harvest's node */
{
  const S = base({ _campfire: fire });
  check('5. its reference alive; dead: the node of its id; none: the fire for cooking; else none',
    ctxExtractionNode(S, { nodeRef: tree }) === tree && ctxExtractionNode(S, { nodeRef: { alive: false }, nodeId: 'v1' }) === vein
    && ctxExtractionNode(S, { skill: 'cooking' }) === fire && ctxExtractionNode(S, { skill: 'mining', nodeId: 'zz' }) === null && ctxExtractionNode(S, null) === null
    && ctxSkillOf(null) === null);
}

/* 6. the screens, off the syntax tree */
{
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
  }
  check('6. @babel/parser, traverse and generator load (npm install in the root or server/)', !!B);
  if (B) {
    const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
    /* the screens' file, found by system (filesOf.mjs): the one that calls ctxButtonFrame */
    let src = '';
    for (const [file, text] of readSystem('ui')) if (/\.jsx?$/.test(file) && text.includes('ctxButtonFrame(ctxBtnRef')) src = text;
    const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const decl = Object.create(null), ifs = [], frames = [], assigns = [];
    B.traverse(ast, {
      VariableDeclarator(p) { if (p.node.id.type === 'Identifier' && ['_ctxPress', '_ctxOn', '_ex', '_harvestCtx'].includes(p.node.id.name) && p.node.init) (decl[p.node.id.name] = decl[p.node.id.name] || []).push(gen(p.node.init)); },
      IfStatement(p) { const t = gen(p.node.test); if (/_extraction|_btnHarvest/.test(t) && /^Sb /.test(t)) ifs.push(t); },
      CallExpression(p) { if (p.node.callee.type === 'Identifier' && p.node.callee.name === 'ctxButtonFrame') frames.push(gen(p.node)); },
      AssignmentExpression(p) { if (gen(p.node.left) === 'S._btnHarvest') assigns.push(gen(p.node.right)); },
    });
    check('6a. Attack\'s press: `_ctxPress = ctxButtonsLive()`, and BOTH harvest branches gated on `!_ctxPress`',
      (decl._ctxPress || []).join() === 'ctxButtonsLive()' && ifs.includes('Sb && Sb._extraction && !_ctxPress') && ifs.includes('Sb && Sb._btnHarvest && Sb._nearNode && !_ctxPress')
      && !ifs.includes('Sb && Sb._extraction') && !ifs.includes('Sb && Sb._btnHarvest && Sb._nearNode'), { press: decl._ctxPress, ifs });
    check('6b. Attack\'s stamp: `_ex = _ctxOn ? null : S._extraction`, `_harvestCtx = S._btnHarvest && !_ctxOn`, today\'s condition whole in S._btnHarvest',
      (decl._ctxOn || []).join() === 'ctxButtonsLive()' && (decl._ex || []).includes('_ctxOn ? null : S._extraction')
      && (decl._harvestCtx || []).join() === 'S._btnHarvest && !_ctxOn' && assigns.join() === '!!(S._nearNode && !_lockHeld && !_monNear)', { decl, assigns });
    check('6c. ONE frame call, with the fight, the zone and the controls\' showing',
      frames.length === 1 && frames[0] === 'ctxButtonFrame(ctxBtnRef.current, S, { live: _ctxOn, busy: !!(_lockHeld || _monNear), npcsHere: _npcZone(S.currentZone), shown: S._rBtnShown !== false })', frames);
    let esl = '';
    for (const [file, text] of readSystem('ui')) if (text.includes('export function buttonCueScreenPos')) esl = text;
    check('6d. the beat\'s anchor: the button under the node while it shows, else the Attack disc',
      esl.includes("document.querySelector('.bt-ctx-btn[data-show=\"1\"]') || document.querySelector('.bt-rjoy-base')"));
  }
}

/* 7. the look (v2.3.6552) */
{
  const S = base({ npcs: [{ name: 'Mo', x: 100, y: 150, alive: true }] });
  const talk = ctxPick(S, O);
  const tl = ctxLook(talk);
  check('7a. TALK: the owner\'s pill, no word, no plate, named "Talk"',
    !!talk && talk.kind === 'talk' && !!tl && tl.pic === 'talk' && CTX_TALK_PIC === 'talk' && tl.word === '' && tl.plate === false && tl.label === 'Talk', tl);
  check('7a. the pick\'s own word stays TALK (the probe\'s)', !!talk && talk.word === 'TALK', talk);
  const kinds = [
    ...Object.keys(CTX_NODE_WORDS).map((t) => ({ kind: 'node', word: CTX_NODE_WORDS[t], skill: t === 'campfire' ? 'cooking' : ctxSkillOf({ nodeType: t }) })),
    ...Object.keys(CTX_BEAT_WORDS).map((sk) => ({ kind: 'beat', word: CTX_BEAT_WORDS[sk], skill: sk })),
    { kind: 'beat', word: 'WAIT', skill: 'mining' }, { kind: 'beat', word: 'GO', skill: null },
  ];
  const bad = kinds.filter((p) => { const l = ctxLook(Object.assign({ thing: tree }, p)); return !l || l.plate !== true || l.word !== p.word || !l.word || l.pic === CTX_TALK_PIC || l.pic !== (p.skill || 'none') || l.label !== 'Do this here'; });
  check('7b. every harvest kind (' + kinds.length + '): the brass plate, its word, its skill\'s picture, never the pill', kinds.length === 10 && bad.length === 0, bad);
  check('7c. no pick: no look', ctxLook(null) === null);
}

/* 8. the pill's file */
{
  const uri = TALK_PILL_DATA, head = 'data:image/png;base64,';
  const b = typeof uri === 'string' && uri.startsWith(head) ? Buffer.from(uri.slice(head.length), 'base64') : Buffer.alloc(0);
  const png = b.length > 33 && b.toString('latin1', 1, 4) === 'PNG' && b.toString('latin1', 12, 16) === 'IHDR';
  const w = png ? b.readUInt32BE(16) : 0, h = png ? b.readUInt32BE(20) : 0, type = png ? b[25] : -1;
  let plte = -1;
  for (let at = 8; png && at + 8 <= b.length;) { const n = b.readUInt32BE(at), t = b.toString('latin1', at + 4, at + 8); if (t === 'PLTE') { plte = n / 3; break; } at += 12 + n; }
  check('8a. a palette PNG on 256 colours or fewer (' + plte + ')', png && type === 3 && plte > 0 && plte <= 256, { type, plte });
  check('8b. a data address of a PNG under 4096 bytes, small in the script (' + b.length + ')', b.length > 0 && b.length < 4096, b.length);
  check('8c. its shape the drawn one at 3 device pixels a point (' + w + 'x' + h + ' for ' + CTX_TALK_W + 'x' + CTX_TALK_H + ')',
    w === CTX_TALK_W * 3 && Math.round(h / 3) === CTX_TALK_H && w === TALK_PILL_W && h === TALK_PILL_H, { w, h });
  check('8d. the touch box round it past 44, the picture inside it', CTX_TOUCH >= 44 && CTX_TALK_W <= CTX_TOUCH && CTX_TALK_H <= CTX_TOUCH, { CTX_TOUCH });
}

/* 9. the panel and the preload, off the syntax tree */
{
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
  }
  if (B) {
    const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
    const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
    const ast = B.parse(read('src/ui/panels/ContextButton.jsx'), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const decl = Object.create(null), calls = [], assigns = [], objs = [];
    B.traverse(ast, {
      VariableDeclarator(p) { if (p.node.id.type === 'Identifier' && p.node.init) (decl[p.node.id.name] = decl[p.node.id.name] || []).push(gen(p.node.init)); },
      CallExpression(p) {
        if (p.node.callee.type !== 'Identifier' || p.node.callee.name !== 'ctxDress') return;
        const st = p.findParent((q) => q.isIfStatement());
        calls.push(st ? gen(st.node.test) + ' => ' + gen(p.node) : gen(p.node));
      },
      AssignmentExpression(p) { if (gen(p.node.left) === 'w.textContent') assigns.push(gen(p.node.right)); },
      ObjectExpression(p) { const k = p.node.properties.find((q) => q.key && (q.key.value === 'data-ctx-icon' || q.key.name === 'data-ctx-icon')); if (k) objs.push(gen(p.node)); },
    });
    check('9a. the frame draws the look\'s picture and word: `look = ctxLook(use)`, `ic = look.pic`, `w.textContent = look.word`',
      (decl.look || []).join() === 'ctxLook(use)' && (decl.ic || []).join() === 'look.pic' && assigns.join() === 'look.word', { look: decl.look, ic: decl.ic, assigns });
    check('9b. it dresses on a kind change: ctxDress(el, look) under `el._btKind !== use.kind`, once',
      calls.length === 1 && calls[0] === 'el._btKind !== use.kind => ctxDress(el, look)', calls);
    const pic = (decl.PIC_CLASS || []).join(), dress = (decl.PIC_DRESS || []).join();
    check('9c. the picture alone: no chisel class, no ground, no border, a touch box of CTX_TOUCH',
      pic.includes('bt-ctx-btn') && !pic.includes('chisel') && /minWidth: CTX_TOUCH \+ 'px'/.test(dress) && /background: 'none'/.test(dress) && /border: '0'/.test(dress), { pic, dress });
    check('9d. the pill\'s <img>: TALK_PILL_URL, CTX_TALK_W x CTX_TALK_H, under the name CTX_TALK_PIC',
      objs.some((o) => o.includes("'data-ctx-icon': CTX_TALK_PIC") && o.includes('src: TALK_PILL_URL') && o.includes('width: CTX_TALK_W') && o.includes('height: CTX_TALK_H')), objs);
    /* v2.3.6553: the frame hands ctxScreen the townsperson's figure height
       (the one fact his tag's place needs), only for a townsperson */
    const sc = []; B.traverse(ast, { CallExpression(p) { if (p.node.callee.type === 'Identifier' && p.node.callee.name === 'ctxScreen') sc.push(gen(p.node)); } });
    check('9f. the frame passes figH = npcFigureHeight(pick.thing.sprite, pick.thing) for a townsperson, as ctxScreen\'s seventh',
      (decl.figH || []).join() === "pick && pick.kind === 'talk' ? npcFigureHeight(pick.thing.sprite, pick.thing) : 0" && sc.length === 1 && sc[0].endsWith(', figH)'), { figH: decl.figH, sc });
    /* the renderer's numbers the rule is cut from (read, never changed here):
       a townsperson's tag 13 px on one line, the offer's line 13 under it in
       13 px words, the drop off his figure */
    let er = '';   /* found by system (tests-by-system): the render file that draws the offer's line */
    for (const [, text] of readSystem('render', { only: /\.js$/ })) if (text.includes("text: '1 quest available'")) er = text;
    check('9g. the renderer still draws what ctxTalkBelow counts (a red here: re-measure the three sizes)',
      /_attachNamePill\(display, 13, 1\);/.test(er) && /const oneLine = level === '';/.test(er) && /\(display\._pillBoxH \|\| display\._pillH \|\| 24\) \+ 13;/.test(er)
      && /text: '1 quest available', style: \{\s*fontFamily: 'Source Sans 3, sans-serif', fontSize: 13,/.test(er) && /const offerOn = qmStr === '\u2757' && !!display\._namePill;/.test(er)
      && /display\._namePill\.y = Math\.max\(14, Math\.round\(_figH \* NPC_PLATE_DROP_FRAC\)\);/.test(er));
    const cs = read('src/ui/panels/controlSkin.jsx'), cp = read('src/rendering/controlsPreload.js');
    check('9e. its address the generated data address (controlSkin TALK_PILL_URL from data/talkPill.js), warmed on the loading screen (controlsPreload)',
      /import \{ TALK_PILL_DATA \} from '\.\.\/\.\.\/data\/talkPill\.js'/.test(cs) && /export const TALK_PILL_URL = TALK_PILL_DATA;/.test(cs) && /urls\.push\(TALK_PILL_URL\);/.test(cp));
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
