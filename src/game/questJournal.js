/* ═══ v2.3.3944: THE QUEST JOURNAL, WHAT EACH PART SAYS ═══
 *
 * The owner, 2026-11-02: "Make the 'quest' button in the menu actually useful.
 * Right now it's just a confusing menu with barely any utility and it's not
 * very easy to read.  Make it a place that makes it clear which quest they are
 * on, what's required, where to go, who was talked to and what to do next,
 * etc. show rewards preview, what was handed during the quest too.  Also keep
 * track of achievement points gained from each quest."  And the first-session
 * problem behind it: "After finishing mayor bro quest that awards sword and
 * shield it wasn't apparent what to do next."
 *
 * So a quest's page is six plain parts, top to bottom (docs/specs/quest-journal.md):
 *   NOW     the objective, its count ("3/5 Slime Remains") and a bar;
 *   WHERE   the place in words ("Earth Forest, west of BroTown"), and whether
 *           the world map's gold road can show it;
 *   WHO     the giver, "Talked to Mayor Bro ✓" (from the quest being taken:
 *           nothing else records a conversation), and each step with ✓;
 *   GIVEN   what the giver handed over for saying yes -- always, not only
 *           while the quest is on offer (it used to vanish once taken);
 *   REWARD  the items, XP, gold and "+5 Achievement Points" (every hand-in
 *           pays them: server quests.js QUEST_AP_REWARD);
 *   NEXT    one line of what comes after (the chain, then the town's tour).
 * And the list: the achievement points quests have paid, then Active (the one
 * you track first), Available (who has one for you, and where), and Done.
 *
 * NO IMPORTS (but data/folkNames.js, itself import-free: v2.3.4021, a giver's
 * name reads his nickname): server/test/quest-journal.test.mjs runs it in node with the real
 * quest table.  The page (ui/mobile/sheet/questJournalModel.js) hands it the
 * live game: the quest table, the bag, the steps, the land names, where each
 * giver stands and what the tour suggests.  Every word a player reads is made
 * here, so the node suite reads the same words the phone draws; "tap" becomes
 * "click" on a computer where it is drawn (game/deskWords.js), and the world
 * is "BroTown", never the code's name for it.
 */

import { folkDisplayName } from '../data/folkNames.js';   /* v2.3.4021: every giver's name here is the one a player reads */

/* the four states a quest's page can be in (the worker's 'complete' and a
   quest whose objective is met both read 'ready') */
export const JOURNAL_STATUS = Object.freeze({
  active: 'active', ready: 'ready', available: 'available', done: 'done', locked: 'locked',
});

const STATUS_LABEL = Object.freeze({
  active: 'In progress', ready: 'Ready to hand in', available: 'Available', done: 'Done', locked: 'Not open yet',
});

/* v2.3.3944: the doors a quest's way names (questWays.js 'door:<plot>'), as a
   player says them.  A plot not here reads "a building" -- never its id. */
export const DOOR_WORDS = Object.freeze({
  blacksmith: 'the forge',
  woodworker: 'the Woodworker',
  feedseed: 'the Feed & Seed',
  cookhouse: 'the Cookhouse',
  store: 'the General Store',
  townhall: 'the Town Hall',
  landoffice: 'the Land Office',
  bank: 'the Bank',
  saloon: 'the Saloon',
  post: 'the Post Office',
  guildhall: 'the Guild Hall',
  hotel: 'the Hotel',
});

/* v2.3.3944: a resource a step is done at (questSteps' `node`) */
const NODE_WORDS = Object.freeze({
  oreVein: 'Ore rocks, just outside',
  tree: 'Trees, just outside',
  fishSpot: 'A fishing spot, just outside',
});

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const str = (s) => (typeof s === 'string' ? s : '');

/** The compass word for a direction on the map (game px: y grows DOWN), or ''
 *  for no direction.  Eight words, each a 45-degree slice. */
export function compassWord(dx, dy) {
  if (typeof dx !== 'number' || typeof dy !== 'number' || !isFinite(dx) || !isFinite(dy)) return '';
  if (Math.hypot(dx, dy) < 1) return '';
  const WORDS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  const a = Math.atan2(dy, dx);                 /* 0 = east, +pi/2 = south (y down) */
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return WORDS[i];
}

/** What a quest counts, as numbers: { have, n } or null.  From its `need`
 *  (gameSystems.js QUEST_CHAINS): `key` the bag's count of that item,
 *  `progress` what the worker counted for this quest (rpg._questKills, echoed
 *  in player_state).  Never more than the number asked, never below 0 -- the
 *  same rule as questCountText's " (2/4)". */
export function journalCount(quest, rpg) {
  const nd = quest && quest.need;
  if (!nd || !(nd.n > 0)) return null;
  let have;
  if (nd.progress) {
    const k = rpg && rpg._questKills;
    have = (k && own(k, quest.id) && Number(k[quest.id])) || 0;
  } else if (typeof nd.key === 'string' && nd.key) {
    const inv = (rpg && rpg.inventory) || null;
    have = (inv && own(inv, nd.key) && Number(inv[nd.key])) || 0;
  } else return null;
  return { have: Math.max(0, Math.min(have, nd.n)), n: nd.n };
}

/** The thing a quest counts, read off its own objective: the words after the
 *  number it asks for, up to "from / to / at / on / in" or a stop
 *  ("Bring 4 Slime Remains from the Earth Forest." -> "Slime Remains").  A
 *  `need.label` wins; '' when the objective does not say. */
export function countNoun(quest) {
  const nd = quest && quest.need;
  if (!nd) return '';
  if (typeof nd.label === 'string' && nd.label) return nd.label;
  const desc = str(quest.desc);
  const n = nd.n;
  if (!desc || !(n > 0)) return '';
  const m = desc.match(new RegExp('(?:^|\\s)' + String(n) + '\\s+([^.,:;!?()]+)'));
  if (!m) return '';
  return m[1].split(/\s+(?:from|to|at|on|in|for|with|and)\s+/)[0].trim();
}

/** "3/5 Slime Remains" (or "3/5"), or '' for a quest that counts nothing. */
export function countText(quest, count) {
  if (!count) return '';
  const noun = countNoun(quest);
  return count.have + '/' + count.n + (noun ? ' ' + noun : '');
}

/** The quest the journal opens on: the tracked one while it is in hand, else
 *  the newest one in hand (the last taken: `order` is the worker's, which is
 *  the order they were taken), else null. */
export function focusQuestId(order, tracked) {
  const list = Array.isArray(order) ? order.filter((x) => typeof x === 'string' && x) : [];
  if (typeof tracked === 'string' && tracked && list.indexOf(tracked) >= 0) return tracked;
  return list.length ? list[list.length - 1] : null;
}

/** The journal's status for a quest: the worker's word for it, the objective
 *  met (`ready`), and whether someone offers it now (`offered`). */
export function journalStatus(stored, ready, offered) {
  if (stored === 'turnedIn') return JOURNAL_STATUS.done;
  if (stored === 'complete') return JOURNAL_STATUS.ready;
  if (stored === 'active') return ready ? JOURNAL_STATUS.ready : JOURNAL_STATUS.active;
  return offered ? JOURNAL_STATUS.available : JOURNAL_STATUS.locked;
}

/* where a giver stands, as words: "at the Town Hall" (tour.js TOUR_MEET), or
   "in BroTown" for one it does not list */
function meetOf(npc, ctx) {
  const m = ctx && ctx.meet;
  return (m && own(m, npc) && str(m[npc])) || ('in ' + homeOf(ctx));
}
function homeOf(ctx) { return (ctx && str(ctx.home)) || 'BroTown'; }

/* "Earth Forest, west of BroTown" -- a land's name and which way it lies */
function landWords(land, ctx) {
  const names = ctx && ctx.landNames;
  const name = (names && own(names, land) && str(names[land])) || 'the lands';
  const dirs = ctx && ctx.landDirs;
  const dir = (dirs && own(dirs, land) && str(dirs[land])) || '';
  return dir ? name + ', ' + dir + ' of ' + homeOf(ctx) : name + ', outside ' + homeOf(ctx);
}

/* a way written as data (questWays.js parseWay's words), in words */
function wayWords(w, quest, ctx) {
  if (typeof w !== 'string' || !w) return null;
  const home = homeOf(ctx);
  if (w === 'monsters') return 'Out in the lands, past ' + home + "'s safe ground";
  if (w === 'visit') return 'Any building in ' + home;
  if (w === 'giver') return quest && quest.npc ? folkDisplayName(quest.npc) + ', ' + meetOf(quest.npc, ctx) : null;
  if (w.indexOf('door:') === 0 && w.length > 5) {
    const plot = w.slice(5);
    const at = own(DOOR_WORDS, plot) ? DOOR_WORDS[plot] : 'a building';
    return 'At ' + at + ', in ' + home;
  }
  if (w.indexOf('dungeon:') === 0 && w.length > 8) {
    const land = w.slice(8);
    return 'A dungeon in the ' + landWords(land, ctx).replace(/^the /, '');
  }
  return null;
}

/** WHERE, in words, for a quest at `status` with its live `steps` (or null):
 *  { text, map } -- `map` true when the world map's gold road can show it
 *  (the quest is in hand, or it is the offer the road leads to: `ctx.roadTo`).
 *  null when there is nowhere to say (a quest handed in). */
export function whereLine(quest, status, steps, ctx) {
  if (!quest || status === JOURNAL_STATUS.done) return null;
  const canMap = !!(ctx && ctx.canMap);
  const inHand = status === JOURNAL_STATUS.active || status === JOURNAL_STATUS.ready;
  const map = canMap && (inHand || (status === JOURNAL_STATUS.available && !!ctx.roadTo && ctx.roadTo === quest.id));
  /* a hand-in or an offer: the giver */
  if (status !== JOURNAL_STATUS.active) {
    if (!quest.npc) return null;
    return { text: folkDisplayName(quest.npc) + ', ' + meetOf(quest.npc, ctx), map };
  }
  if (quest.zone) return { text: landWords(quest.zone, ctx), map };
  const cur = Array.isArray(steps) ? steps.find((s) => s && s.current) : null;
  const node = (cur && cur.node) || (!steps && quest.node) || null;
  if (node && own(NODE_WORDS, node)) return { text: NODE_WORDS[node] + ' ' + homeOf(ctx), map };
  const way = (cur && cur.way) || quest.way || null;
  const w = wayWords(way, quest, ctx);
  if (w) return { text: w, map };
  /* a step done anywhere (light a fire, cook): no road either */
  if (cur) return { text: 'Wherever you are', map: false };
  return null;
}

/** NOW: { text, goal, count: { have, n, text } | null, frac } -- the one thing
 *  to do, the objective under it when the thing is a step, the count and the
 *  bar (0..1, or null for a quest that counts nothing). */
export function nowLine(quest, status, steps, count) {
  if (!quest) return null;
  const desc = str(quest.desc);
  const c = count ? { have: count.have, n: count.n, text: countText(quest, count) } : null;
  if (status === JOURNAL_STATUS.done) {
    return { text: 'Done: handed in to ' + (folkDisplayName(quest.npc) || 'its giver') + ' ✓', goal: desc, count: null, frac: 1 };
  }
  if (status === JOURNAL_STATUS.ready) {
    /* how a hand-in is done (v2.3.3583: a townsperson talks on a tap only) */
    return { text: 'You have it all: hand it in to ' + (folkDisplayName(quest.npc) || 'its giver') + '.', goal: 'Tap ' + (folkDisplayName(quest.npc) || 'the giver') + ' to talk. The reward is paid there.',
      count: c ? { have: c.n, n: c.n, text: countText(quest, { have: c.n, n: c.n }) } : null, frac: 1 };
  }
  if (status === JOURNAL_STATUS.available) {
    return { text: 'Talk to ' + (folkDisplayName(quest.npc) || 'its giver') + ' to take this quest.', goal: desc, count: null, frac: null };
  }
  if (status === JOURNAL_STATUS.locked) {
    return { text: 'Not open yet: finish the quests before it first.', goal: desc, count: null, frac: null };
  }
  const cur = Array.isArray(steps) ? steps.find((s) => s && s.current) : null;
  const text = cur && str(cur.label) ? cur.label : desc;
  return { text, goal: text === desc ? '' : desc, count: c, frac: c ? c.have / c.n : null };
}

/** WHO: the giver and what you have done with him, and the steps. */
export function whoLines(quest, status, steps) {
  if (!quest) return null;
  const npc = folkDisplayName(quest.npc) || '';
  let talked = null, todo = null;
  if (status === JOURNAL_STATUS.available) todo = 'Talk to ' + npc + ' to start it';
  else if (status === JOURNAL_STATUS.locked) todo = npc + ' gives this one later';
  else talked = 'Talked to ' + npc + ' ✓';
  let handIn = null;
  if (status === JOURNAL_STATUS.done) handIn = 'Handed in to ' + npc + ' ✓';
  else if (status === JOURNAL_STATUS.ready) handIn = 'Hand it in to ' + npc;
  const list = (status === JOURNAL_STATUS.active || status === JOURNAL_STATUS.ready) && Array.isArray(steps)
    ? steps.map((s) => ({ label: str(s && s.label), done: !!(s && s.done), current: !!(s && s.current) }))
    : [];
  return { npc, talked, todo, handIn, steps: list };
}

/** GIVEN TO YOU: what the giver hands over for saying yes (`gives` 'accept'),
 *  with its caption -- shown in every state, not only while it is on offer. */
export function givenPart(quest, status) {
  const items = ((quest && quest.gives) || []).filter((g) => g && g.when === 'accept' && (g.icon || g.label))
    .map((g) => ({ icon: g.icon || null, label: str(g.label) }));
  if (!items.length) return null;
  const npc = folkDisplayName(quest && quest.npc) || 'The giver';
  const note = (status === JOURNAL_STATUS.available || status === JOURNAL_STATUS.locked)
    ? npc + ' hands you these when you say yes.'
    : npc + ' gave you these when you said yes.';
  return { items, note };
}

/** REWARD: { gold, xp, items: [{ icon, label }], itemText, ap, apText, note }.
 *  `itemText` is the reward's name when no picture of it exists (life_1's
 *  pickaxe); `ap` the points every hand-in pays. */
export function rewardPart(quest, status, ap) {
  if (!quest) return null;
  const r = quest.reward || {};
  const items = (quest.gives || []).filter((g) => g && g.when === 'complete' && (g.icon || g.label))
    .map((g) => ({ icon: g.icon || null, label: str(g.label) }));
  const itemText = r.item && !items.length ? String(r.item) : '';
  const pts = Number(ap) > 0 ? Number(ap) : 0;
  const npc = folkDisplayName(quest.npc) || 'its giver';
  return {
    gold: Number(r.gold) > 0 ? Number(r.gold) : 0,
    xp: Number(r.xp) > 0 ? Number(r.xp) : 0,
    items, itemText, ap: pts,
    apText: pts ? '+' + pts + ' Achievement Points' : '',
    note: status === JOURNAL_STATUS.done ? 'You got these from ' + npc + '.' : 'Paid by ' + npc + ' when you hand this quest in.',
  };
}

/** NEXT: one line, from `after` -- what follows this quest once it is handed
 *  in (the adapter works it out: the giver's next quest in the chain, else the
 *  town tour's next step, else a quest still in hand):
 *    { npc, title, meet?, more? }  someone to talk to for a quest;
 *    { carryOn: title }            a quest already in hand;
 *    null                          nothing left.
 *  For a quest handed in the line is "Next:", for one still ahead "Then:". */
export function nextLine(quest, status, after, ctx) {
  if (!quest) return null;
  const lead = status === JOURNAL_STATUS.done ? 'Next: ' : 'Then: ';
  if (after && after.carryOn) return { text: lead + 'carry on with “' + after.carryOn + '”.', more: 0 };
  if (after && after.npc) {
    const meet = str(after.meet) || meetOf(after.npc, ctx);
    const title = str(after.title);
    return {
      text: lead + 'talk to ' + folkDisplayName(after.npc) + ' ' + meet + (title ? ' for “' + title + '”' : '') + '.',
      more: Number(after.more) > 0 ? Number(after.more) : 0,
    };
  }
  return { text: status === JOURNAL_STATUS.done ? 'Next: no new quests right now. Check back after an update.' : 'Then: that is the last quest for now.', more: 0 };
}

/** The extra line under NEXT when other townsfolk have work too. */
export function moreLine(more) {
  const n = Number(more) || 0;
  if (n <= 0) return '';
  return n === 1 ? '1 more person has a quest: look for a gold ! on your map.'
    : n + ' more people have quests: look for a gold ! on your map.';
}

/** The whole page for one quest.  `input`:
 *    quest, status (journalStatus), rpg, steps (questSteps, or null), ap,
 *    after (see nextLine), ctx { home, landNames, landDirs, meet, canMap, roadTo }. */
export function journalPage(input) {
  const q = input && input.quest;
  if (!q) return null;
  const status = input.status || JOURNAL_STATUS.locked;
  const steps = (status === JOURNAL_STATUS.active || status === JOURNAL_STATUS.ready) ? (input.steps || null) : null;
  const count = (status === JOURNAL_STATUS.active || status === JOURNAL_STATUS.ready) ? journalCount(q, input.rpg) : null;
  const ctx = input.ctx || {};
  return {
    id: q.id,
    title: str(q.title),
    status,
    statusLabel: STATUS_LABEL[status] || '',
    npc: q.npc || '',
    now: nowLine(q, status, steps, count),
    where: whereLine(q, status, steps, ctx),
    who: whoLines(q, status, steps),
    given: givenPart(q, status),
    reward: rewardPart(q, status, input.ap),
    next: nextLine(q, status, input.after || null, ctx),
  };
}

/** Achievement points the quests have paid: every hand-in pays `ap` (the
 *  worker's QUEST_AP_REWARD).  `quests` is rpg._quests; `known` (optional)
 *  the ids that are quests at all (QUEST_CHAINS), so a stray key counts
 *  nothing. */
export function questApTotal(quests, ap, known) {
  const per = Number(ap) > 0 ? Number(ap) : 0;
  if (!quests || typeof quests !== 'object' || !per) return 0;
  let n = 0;
  for (const k of Object.keys(quests)) {
    if (quests[k] !== 'turnedIn') continue;
    if (known && !own(known, k)) continue;
    n++;
  }
  return n * per;
}

/** "Achievement Points from quests: 40" */
export function apTotalText(total) {
  return 'Achievement Points from quests: ' + (Number(total) > 0 ? Number(total) : 0);
}

/** The Active list's order: the tracked quest first, then the ones ready to
 *  hand in, then the rest -- each group in the order given.  `rows`:
 *  [{ id, ready }]. */
export function activeOrder(rows, tracked) {
  if (!Array.isArray(rows)) return [];
  const t = typeof tracked === 'string' && tracked ? tracked : null;
  const rank = (r) => (t && r.id === t) ? 0 : r.ready ? 1 : 2;
  return rows.map((r, i) => ({ r, i, k: rank(r) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.r);
}

/** An Available row's second line: who has it and where ("Mayor Bro, at the
 *  Town Hall"). */
export function offerWhere(quest, ctx) {
  if (!quest || !quest.npc) return '';
  return folkDisplayName(quest.npc) + ', ' + meetOf(quest.npc, ctx);
}
