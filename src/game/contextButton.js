/* ═══ v2.3.6550: THE BUTTON UNDER THE THING (card CT part 17: the two-button trial, mode 5) ═══
 *
 * The owner, 2026-11-24, whole: "I'm also thinking contextual buttons like
 * mining fishing or interacting with npc should appear below the item instead
 * of having a dual purpose attack button. Attack button always stays attack".
 *
 * In the two buttons (`?manual=5`, latch.js twoButtonsLive) and only there:
 *
 *   - Attack NEVER harvests and never changes its word or picture (BroTown's
 *     stamp and press ask ctxButtonsLive and leave the harvest branch);
 *   - ONE button stands under the ONE nearest thing there is to do:
 *       a node (a tree, an ore vein, a fishing spot, a campfire) exactly when
 *         Attack would have become the harvest button before (the caller's
 *         S._btnHarvest: a node in reach with its tool held, no lock held, no
 *         monster within the perimeter's 220) -- its word CHOP, MINE, FISH or
 *         COOK, and a tap starts the work (`_startExtraction`,
 *         `_startCookingAtCampfire`);
 *       a harvest under way: the SAME button under its node, wearing the
 *         beat's word (PUMP, CHOP, REEL, FLIP; WAIT in the wind-up); its tap
 *         does nothing of its own -- the gesture layer (ExtractionSwipeLayer)
 *         anchors on this button while it shows and takes the beat there;
 *       a townsperson within CTX_TALK_REACH (120 px) when nothing is in a
 *         fight (no lock, no monster in the perimeter): TALK, and a tap talks
 *         as a tap on him does (BroTown's tapNpcAtCss, his own door).  Nothing
 *         opens by itself: the button only offers (the standing rule: talking
 *         is a tap, never a walk-up opener).
 *     A node and a townsperson both near: the nearer one (one button at a time).
 *   - `?ctxbuttons=0`: no button, and in mode 5 Attack harvests as before.
 *
 * Doors and the notice board stay taps on the world (not here).
 *
 * Pure rules: no DOM, no game state of its own.  Four imports, the page's
 * switch reader (switches.js), mode 5's gate (latch.js twoButtonsLive), its
 * words (data/say/contextButton.js) and their reader (say.js), by relative
 * paths: tools/guards/context-button.test.mjs plays it bare.  The DOM button is
 * src/ui/panels/ContextButton.jsx (one reused element, moved by transform).
 */
import { readerFor, sw } from './switches.js';
import { twoButtonsLive } from './latch.js';
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/contextButton.js';   /* its words (docs/specs/player-words.md) */

/** How near a townsperson stands for his TALK button (world px, from the
 *  bro's feet to his).  v2.3.6550: between _nearNpc's 90 (the E key) and the
 *  tap's reach (NPC_TAP_REACH 300): "close", the brief's about 120. */
export const CTX_TALK_REACH = 120;

/** The node's word before the work starts (its skill's verb). */
export const CTX_NODE_WORDS = Object.freeze({ tree: say(SAY, 'contextButton.chop'), oreVein: say(SAY, 'contextButton.mine'), fishSpot: say(SAY, 'contextButton.fish'), campfire: say(SAY, 'contextButton.cook') });
/** The beat's word while the window is open: Attack's own words before
 *  v2.3.6550 (BroTown's stamp), moved here for mode 5. */
export const CTX_BEAT_WORDS = Object.freeze({ mining: say(SAY, 'contextButton.pump'), woodcutting: say(SAY, 'contextButton.chop'), fishing: say(SAY, 'contextButton.reel'), cooking: say(SAY, 'contextButton.flip') });
/** The kinds of button, and what a tap on each does (ctxTap). */
export const CTX_KINDS = Object.freeze(['node', 'beat', 'talk']);

/** The switch: on unless `?ctxbuttons=0`.  `search` reads that address
 *  instead of the page's (the suite's). */
export function ctxButtonsOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('ctxbuttons') : sw('ctxbuttons'));
}

/** The whole gate: mode 5 on a touch screen, and the switch on. */
export function ctxButtonsLive() {
  return twoButtonsLive() && ctxButtonsOn();
}

/** The skill a node is worked with (a campfire cooks): the four kinds
 *  Attack's press started before v2.3.6550, and null for any other. */
export function ctxSkillOf(node, campfire) {
  if (!node) return null;
  if (node === campfire || node.nodeType === 'campfire') return 'cooking';
  if (node.nodeType === 'tree') return 'woodcutting';
  if (node.nodeType === 'fishSpot') return 'fishing';
  if (node.nodeType === 'oreVein') return 'mining';
  return null;   /* not a kind Attack's press worked before (its four) */
}

function d2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** The node a harvest under way works: its own reference while alive, else
 *  the node of its id, else the fire it cooks at; null when none is found. */
export function ctxExtractionNode(S, ex) {
  if (!ex) return null;
  if (ex.nodeRef && ex.nodeRef.alive !== false) return ex.nodeRef;
  if (ex.nodeId != null && Array.isArray(S.gatherNodes)) {
    for (let i = 0; i < S.gatherNodes.length; i++) {
      const n = S.gatherNodes[i];
      if (n && n.id === ex.nodeId) return n;
    }
  }
  if (ex.skill === 'cooking' && S._campfire) return S._campfire;
  return null;
}

/**
 * The one button this frame, or null.
 *   S     the state: S.player, S.rpg.hp, S._uiBusy, S._extraction,
 *         S._btnHarvest, S._nearNode, S._campfire, S.gatherNodes, S.npcs
 *   o     { live: the switch and mode 5 (ctxButtonsLive), busy: a lock held or
 *         a monster in the perimeter, npcsHere: townsfolk talk in this zone,
 *         shown: the controls are on screen }
 * Returns { kind, thing, word, skill }: kind 'beat' (a harvest under way),
 * 'node' (today's harvest condition) or 'talk'.
 */
export function ctxPick(S, o) {
  if (!S || !o || !o.live || !o.shown || !S.player) return null;
  /* a panel over the world (the window door's `panel`: S._uiBusy), or the
     bro down: nothing to offer */
  if (S._uiBusy) return null;
  if (S.rpg && typeof S.rpg.hp === 'number' && S.rpg.hp <= 0) return null;
  const P = S.player;
  const ex = S._extraction;
  if (ex) {
    const n = ctxExtractionNode(S, ex);
    if (!n) return null;
    const word = ex.status === 'ready' ? (CTX_BEAT_WORDS[ex.skill] || say(SAY, 'contextButton.go')) : say(SAY, 'contextButton.wait');
    return { kind: 'beat', thing: n, word: word, skill: ex.skill || ctxSkillOf(n, S._campfire) };
  }
  let best = null, bestD = Infinity;
  const sk = (S._btnHarvest && S._nearNode) ? ctxSkillOf(S._nearNode, S._campfire) : null;
  if (sk) {
    const n = S._nearNode;
    best = { kind: 'node', thing: n, word: sk === 'cooking' ? CTX_NODE_WORDS.campfire : CTX_NODE_WORDS[n.nodeType], skill: sk };
    bestD = d2(n, P);
  }
  if (!o.busy && o.npcsHere && Array.isArray(S.npcs)) {
    const r2 = CTX_TALK_REACH * CTX_TALK_REACH;
    for (let i = 0; i < S.npcs.length; i++) {
      const npc = S.npcs[i];
      if (!npc || npc.alive === false) continue;
      const dd = d2(npc, P);
      if (dd <= r2 && dd < bestD) { bestD = dd; best = { kind: 'talk', thing: npc, word: say(SAY, 'contextButton.talk'), skill: null }; }
    }
  }
  return best;
}

/* ═══ v2.3.6552: WHAT THE BUTTON WEARS (card CT part 19) ═══
 * The owner, 2026-11-25, with a picture: "Your talk button is intrusive use
 * the left icon I attached here instead (ignore the right one)."  TALK is the
 * owner's pill (a dark slate pill, a gold rim, a cream speech bubble with
 * three dots; tools/ui/cut-talk-pill.mjs, src/data/talkPill.js): the
 * picture IS the button, no brass plate behind it, no word drawn (its name,
 * "Talk", for a screen reader only).  CHOP, MINE, FISH, COOK and the beats
 * keep the brass word button with the skill's picture, as part 17 made them.
 * The pick (ctxPick) is unchanged: its word stays TALK for the probe; only
 * what is DRAWN changes, here, and the panel (ContextButton.jsx) writes it. */
/** TALK's picture as drawn (CSS px: the file's 132 x 91 at 3 device pixels a
 *  point), and the touch box round it (invisible: past 44 points). */
export const CTX_TALK_W = 44;
export const CTX_TALK_H = 30;
export const CTX_TOUCH = 48;
/** The picture a TALK button wears (the panel's data-ctx-icon). */
export const CTX_TALK_PIC = 'talk';

/**
 * What a pick is drawn as: { plate: the brass word button (true) or the
 * picture alone (false), word: the word drawn ('' for none), pic: the
 * picture shown ('talk', a skill, or 'none'), label: the element's
 * accessible name }.  Null for no pick.
 */
export function ctxLook(pick) {
  if (!pick) return null;
  if (pick.kind === 'talk') return { plate: false, word: '', pic: CTX_TALK_PIC, label: say(SAY, 'contextButton.talkLabel') };
  return { plate: true, word: pick.word, pic: pick.skill || 'none', label: say(SAY, 'contextButton.label') };
}

/** Below a thing's feet, how far the button's centre sits (CSS px). */
export const CTX_BELOW_CSS = 34;
/** A townsperson's feet stand this far under his place (world px; the same
 *  14 mayorScreen.js mayorScreenRect draws his body to). */
export const CTX_NPC_FOOT = 14;

/**
 * Where the button's centre goes on the page (CSS px), on whole device
 * pixels so it does not shimmer as the camera (itself on whole device
 * pixels) moves.  `box` is the canvas's place on the page (mayorScreen.js
 * canvasPlace: kept, never measured here), `dpr` the device's pixel ratio.
 * Null when anything is missing.
 */
export function ctxScreen(pick, cam, sx, sy, box, dpr) {
  if (!pick || !pick.thing || !cam || !box) return null;
  const t = pick.thing;
  const x = typeof t.renderX === 'number' ? t.renderX : t.x;
  const y = typeof t.renderY === 'number' ? t.renderY : t.y;
  const foot = pick.kind === 'talk' ? CTX_NPC_FOOT : 0;
  const cx = box.left + (x - cam.x) * (sx || 1);
  const cy = box.top + (y + foot - cam.y) * (sy || 1) + CTX_BELOW_CSS;
  if (!isFinite(cx) || !isFinite(cy)) return null;
  const k = dpr > 0 ? dpr : 1;
  return { x: Math.round(cx * k) / k, y: Math.round(cy * k) / k };
}

/**
 * A tap on the button.  `acts` = { extract(node, skill), cook(fire),
 * talk(npc) }, the screens' own doors.  Returns what it did: 'extract',
 * 'cook', 'talk', or null (a beat: the gesture layer's; nothing picked; a
 * node of no skill).  v2.3.6550: also Attack's own harvest press in modes 1
 * to 4 and with `?ctxbuttons=0` ({kind 'node', skill ctxSkillOf(node)}: its
 * four kinds by nodeType, the mapping it had inline).
 */
export function ctxTap(pick, acts) {
  if (!pick || !pick.thing || !acts) return null;
  if (pick.kind === 'talk') { acts.talk(pick.thing); return 'talk'; }
  if (pick.kind !== 'node' || !pick.skill) return null;
  if (pick.skill === 'cooking') { acts.cook(pick.thing); return 'cook'; }
  acts.extract(pick.thing, pick.skill);
  return 'extract';
}
