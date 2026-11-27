/* ═══ v2.3.6695: FEATS, THE RULES (card UI2-feats, the build's step 6) ═══
 *
 * The owner, 2026-11-25: "Feats is the approved replacement for
 * Accomplishments."  The master specification 4.5: "AP (Achievement Points)
 * is the dominant headline of Feats, with a drill-down into its actual
 * sources"; "Do not assume all these categories award AP; use the actual
 * achievement model"; "Earned medals have their full appearance; unearned
 * medals are muted but inspectable. Use non-color state cues"; "Do not
 * silently alter achievement requirements or AP values"; "Standalone titles
 * appear as concise rows with their own requirements; never fabricate a
 * progression relation"; "Exact headline records and units depend on actual
 * tracked data. Do not invent retroactive tracking."  And 2026-11-26:
 * "Titles could live within Feats."
 *
 * Everything here READS the game's own counts and never counts again:
 * achvSummary (how many, their points, the rest), achvApTotal (the worker's
 * total), achvAp (a row's own points: the ten fish rows pay their OWN 5 and
 * 10, so a tier's points are never its value times its count), achvProgress
 * (the few hints the game has), achvDateWords.  The worker keeps ONE total
 * (`ps.achievementPoints`), paid by an achievement, a quest handed in (+5), a
 * guild rung and the arena's mailed prize: so the phone can split it in two
 * and no further, and when the parts do not add up (a row the owner's test
 * lever lit pays nothing) NO split is drawn.
 *
 * The pages (src/ui/mobile/sheet/FeatsPage.jsx and its three neighbours) draw
 * these; tools/guards/feats.test.mjs plants each dodge.  No imports but the
 * game's own tables and readers: node tests it. */
import { ACHIEVEMENTS, ACHV_TIERS, ACHV_MEDAL_SRC, achvAp, achvById } from '../data/achievements.js';
import { achvApTotal, achvSummary, achvProgress, achvDateWords } from './achievements.js';
import { broPassport, PASSPORT_DOORS } from './broHub.js';
import { treeLeaf, treeBranch } from './metricTree.js';
import { SAY } from '../data/say/feats.js';
import { say } from '../game/say.js';   /* the words' one reader (tools/guards/say.test reads the import's path) */

const has = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/* the game's four tiers, EACH ITS OWN (the arena is not filed under Rare here: the old page's
   filter chips did, src/game/achievements.js ACHV_FILTERS), in the table's order */
export const FEATS_TIERS = Object.freeze(Object.keys(ACHV_TIERS));
/* a tier's gallery page (BottomDashboard PANELS rows) */
export const FEATS_TIER_PAGES = Object.freeze({ common: 'featsCommon', rare: 'featsRare', arena: 'featsArena', superrare: 'featsSuperrare' });
/* the AP tree's layers, one a depth (root, from achievements, a tier) */
export const FEATS_AP_PAGES = Object.freeze(['featsAp0', 'featsAp1', 'featsAp2']);
/* every page of Feats past its landing (the landing is `achievements`, dashDests.js FRAME_PAGES),
   and what each draws */
export const FEATS_PAGES = Object.freeze({
  featsMedals: 'medals',
  featsCommon: 'tier', featsRare: 'tier', featsArena: 'tier', featsSuperrare: 'tier',
  featsMedal: 'medal',
  featsAp0: 'ap', featsAp1: 'ap', featsAp2: 'ap',
  featsQuests: 'quests',
});
export function isFeatsPage(id) { return has(FEATS_PAGES, String(id)); }
export function tierOfPage(id) {
  for (const t of FEATS_TIERS) if (FEATS_TIER_PAGES[t] === String(id)) return t;
  return null;
}

/* the doors under the AP: four, equal (the card's reading 2); no Discoveries door (the worker keeps
   none: the PR says so).  `opens` a frame or PANELS page. */
export const FEATS_DOORS = Object.freeze([
  Object.freeze({ id: 'achievements', opens: 'page:featsMedals', art: ACHV_MEDAL_SRC }),
  Object.freeze({ id: 'titles', opens: PASSPORT_DOORS.titles, art: null }),   /* Character's ONE TitlesPage (broTitles) */
  Object.freeze({ id: 'quests', opens: 'page:featsQuests', art: '/icons/ui/panel-quests.webp' }),
  Object.freeze({ id: 'records', opens: PASSPORT_DOORS.journey, art: '/icons/ui/journey.webp' }),   /* the ONE Journey page */
]);

/* the words of a page's header and a tier's name (literal keys: tools/guards/say.test reads every call) */
export function featsWord(id) {
  switch (String(id)) {
    case 'achievements': return say(SAY, 'feats.achievements');
    case 'titles': return say(SAY, 'feats.titles');
    case 'quests': case 'featsQuests': return say(SAY, 'feats.quests');
    case 'records': return say(SAY, 'feats.records');
    case 'featsMedals': return say(SAY, 'feats.medals');
    case 'common': case 'featsCommon': return say(SAY, 'feats.tierCommon');
    case 'rare': case 'featsRare': return say(SAY, 'feats.tierRare');
    case 'arena': case 'featsArena': return say(SAY, 'feats.tierArena');
    case 'superrare': case 'featsSuperrare': return say(SAY, 'feats.tierSuperrare');
    case 'featsMedal': return say(SAY, 'feats.medal');
    case 'featsAp0': case 'featsAp1': case 'featsAp2': return say(SAY, 'feats.ap');
    default: return say(SAY, 'feats.medal');
  }
}

/**
 * AP and its split, as far as the game knows:
 *   { loading, total, achv, rest, known, earned, of }
 * `loading` until the worker's achv_state has come (S._achv.known): the kit's placeholder, NEVER 0.
 * `total` the worker's (achvApTotal); `achv` the earned rows' own points (achvSummary.achvPts);
 * `rest` quests, guild rungs and the arena TOGETHER (the worker keeps one total), only when
 * `known`: the parts add up (achv <= total).  A row lit by the test lever pays nothing, so
 * achv > total: then `known` is false and there is no split, never one that is false.
 */
export function featsAp(S) {
  const a = S && S._achv;
  if (!a || !a.known) return Object.freeze({ loading: true, total: null, achv: null, rest: null, known: false, earned: null, of: ACHIEVEMENTS.length });
  if (a.unavailable) return Object.freeze({ loading: false, total: achvApTotal(S), achv: null, rest: null, known: false, earned: null, of: ACHIEVEMENTS.length });
  const sum = achvSummary(S);
  const known = sum.achvPts <= sum.apTotal;
  return Object.freeze({
    loading: false, total: sum.apTotal, achv: sum.achvPts, rest: known ? sum.otherPts : null, known,
    earned: sum.earned, of: sum.total,
  });
}

/* the earned rows of a tier, in the table's order */
function earnedOf(S, tier) {
  const a = S && S._achv;
  return ACHIEVEMENTS.filter((d) => d.tier === tier && !!(a && a.known && has(a.got, d.id)));
}

/**
 * AP as a tree (src/game/metricTree.js's nodes, joined by `sum`): the worker's total = "From
 * achievements" (by tier, then each earned medal, a leaf that is a door to its medal) + "From
 * quests, guild rungs and the arena" (ONE leaf).  Null while loading or when the split is not
 * known: the page draws no tree then.
 */
export function apTree(S) {
  const ap = featsAp(S);
  if (ap.loading || !ap.known) return null;
  const tiers = [];
  for (const t of FEATS_TIERS) {
    const got = earnedOf(S, t);
    if (!got.length) continue;
    const pts = got.reduce((n, d) => n + achvAp(d.id), 0);
    tiers.push(treeBranch(t, pts, 'int', 'sum', got.map((d) => treeLeaf(d.id, achvAp(d.id), 'int', { kind: 'medal', id: d.id }))));
  }
  const fromAchv = tiers.length
    ? treeBranch('fromAchv', ap.achv, 'int', 'sum', tiers)
    : treeLeaf('fromAchv', ap.achv, 'int', { kind: 'medal', id: null });
  return treeBranch('ap', ap.total, 'int', 'sum', [fromAchv, treeLeaf('rest', ap.rest, 'int', { kind: 'rest' })]);
}

/**
 * The four tiers as the medals: [{ id, n, of, pts, max, art, muted, ring, opens }] in FEATS_TIERS'
 * order.  `pts` of `max` by each row's own points (achvAp).  `n` null while loading.  No tier
 * picture exists: a tier wears its latest earned badge, or, with none, its first badge muted;
 * `ring` its ACHV_TIERS colour ('prismatic' for Super-rare).
 */
export function featsTiers(S) {
  const a = S && S._achv;
  const ready = !!(a && a.known);
  return Object.freeze(FEATS_TIERS.map((t) => {
    const defs = ACHIEVEMENTS.filter((d) => d.tier === t);
    const got = ready ? defs.filter((d) => has(a.got, d.id)) : [];
    let latest = null;
    for (const d of got) if (!latest || Number(a.got[d.id]) > Number(a.got[latest.id])) latest = d;
    return Object.freeze({
      id: t,
      n: ready ? got.length : null,
      of: defs.length,
      pts: got.reduce((n, d) => n + achvAp(d.id), 0),
      max: defs.reduce((n, d) => n + achvAp(d.id), 0),
      art: (latest || defs[0]).icon,
      muted: !latest,
      ring: ACHV_TIERS[t].color,
      opens: 'page:' + FEATS_TIER_PAGES[t],
    });
  }));
}

/** A tier's gallery: its badges in the table's order, [{ id, name, art, got }]; `got` only what
    the worker sent (S._achv.got). */
export function featsGallery(S, tier) {
  const a = S && S._achv;
  return Object.freeze(ACHIEVEMENTS.filter((d) => d.tier === tier).map((d) => Object.freeze({
    id: d.id, name: d.name, art: d.icon, glyph: d.glyph, got: !!(a && a.known && has(a.got, d.id)),
  })));
}

/**
 * A medal's facts, for `who` (null: yours), or null for an id this phone's table does not know:
 *   { id, name, art, tier, ap, shared, got, on, how, progress, title }
 * `on` the day it was earned (achvDateWords); `progress` achvProgress's words where it has some
 * and null where it has none (never "0 of 1"), only while not earned; `title` { name, worn } when
 * earned and yours (a title IS an earned achievement's name).  Another player's medals are their
 * phone's: `shared` false, nothing earned shown.
 */
export function featsMedal(S, id, who, now) {
  const def = achvById(id);
  if (!def) return null;
  const self = who == null;
  const a = S && S._achv;
  const got = self && !!(a && a.known && has(a.got, def.id));
  const prog = self && !got ? achvProgress(S, def.id) : '';
  return Object.freeze({
    id: def.id, name: def.name, art: def.icon, glyph: def.glyph, tier: def.tier, ap: achvAp(def.id),
    shared: self, got,
    on: got ? achvDateWords(a.got[def.id], now) : '',
    how: def.how,
    progress: prog ? prog : null,
    title: got ? Object.freeze({ name: def.name, worn: a.t === def.id }) : null,
  });
}

/* ═══ TITLES ═══
   A title IS an earned achievement's name (server achievements.js _achvTitle): no list of titles
   apart from them, and Feats draws none of its own (its Titles door opens Character's ONE
   TitlesPage, broTitles).  ONE real family: Blooded, Veteran, Centurion are the same climb, a
   weapon to level 10, 50 and 100 (src/data/achievements.js combat_10 / combat_50 / combat_100,
   each "Raise Melee, Bow or Magic to level N"), so the Titles page draws them as one connected row;
   every other title is a row of its own ("never fabricate a progression relation"). */
export const TITLE_FAMILIES = Object.freeze([
  Object.freeze({ id: 'combatLevel', ids: Object.freeze(['combat_10', 'combat_50', 'combat_100']),
    why: 'the same climb: a weapon to level 10, 50 and 100 (one requirement, three levels)' }),
]);

/** A family's row of three: [{ id, name, art, state }], `state` 'got' | 'next' | 'locked' (the
    first not earned is next).  Only what the worker sent. */
export function titleFamily(S, fam) {
  const a = S && S._achv;
  let next = false;
  return Object.freeze((fam && fam.ids ? fam.ids : []).map((id) => {
    const d = achvById(id);
    const got = !!(a && a.known && has(a.got, id));
    let state = 'locked';
    if (got) state = 'got';
    else if (!next) { state = 'next'; next = true; }
    return Object.freeze({ id, name: d ? d.name : id, art: d ? d.icon : null, state });
  }));
}
/** Is this id one of a family's (drawn in the family's row, not as a row of its own)? */
export function inTitleFamily(id) {
  return TITLE_FAMILIES.some((f) => f.ids.indexOf(id) >= 0);
}
/** The worn title's requirement, under it on the Titles page ('' with none worn or unknown). */
export function wornHow(S) {
  const a = S && S._achv;
  const id = a && typeof a.t === 'string' && has(a.got, a.t) ? a.t : null;
  const d = id ? achvById(id) : null;
  return d ? d.how : '';
}

/* ═══ LIFETIME RECORDS ═══
   The counters the game truly keeps, as today's Journey page reads them (dash/JourneyPanel.jsx):
   kills (the worker's when it sends them, R.svKills, else the phone's tally), deaths, lifetime gold,
   lifetime XP.  Duels Won and Deepest Zone are drawn on today's page and NEVER counted (no writer
   anywhere in src/ or server/src/: always 0 and "shallow"): not drawn here until the owner says. */
export const CAREER_UNCOUNTED = Object.freeze(['duelsWon', 'deepestZone']);
export function careerRows(R) {
  const r = R || {};
  const cs = r._compStats || {};
  return Object.freeze([
    Object.freeze({ id: 'kills', k: 'journey.kills', v: r.svKills ?? cs.monstersKilled ?? cs.kills ?? 0, icon: 'rec-kills' }),
    Object.freeze({ id: 'deaths', k: 'journey.deaths', v: cs.deaths ?? 0, icon: 'rec-deaths' }),
    Object.freeze({ id: 'gold', k: 'journey.lifetimeGold', v: Number(cs.totalGoldEarned ?? cs.goldEarnedTotal ?? 0).toLocaleString(), icon: 'rec-gold' }),
    Object.freeze({ id: 'xp', k: 'journey.lifetimeXp', v: Number(r.xp || 0).toLocaleString(), icon: 'rec-xp' }),
  ]);
}

/**
 * Feats' landing for `who` (null: yours):
 *   { self, ap, title, doors: [{ id, opens, art, sub, shared }] }
 * Yours: the AP (featsAp), each door open.  Another player's: the AP and title the worker stamps
 * on their entry (broPassport, the same reader as their Character), and "Not shared" on every door
 * (medals, quests and records are their phone's), none opening (no Equip; step 9 opens it).
 * `r` the passport's readings (CharacterPage.jsx readPassport for yours, the entry's for theirs).
 */
export function featsLanding(S, who, r) {
  const self = who == null;
  const P = broPassport(r || {}, who);
  const ap = self ? featsAp(S) : (() => {
    const s = P.summary.find((x) => x.id === 'ap');
    const v = s && s.v != null ? s.v : null;
    return Object.freeze({ loading: false, total: v, achv: null, rest: null, known: false, earned: null, of: ACHIEVEMENTS.length, notShared: v == null });
  })();
  const doors = FEATS_DOORS.map((d) => {
    if (!self) return Object.freeze({ id: d.id, opens: null, art: d.art, sub: null, shared: false });
    let sub = null;
    if (d.id === 'achievements' && ap.earned != null) sub = Object.freeze({ n: ap.earned, total: ap.of });
    let art = d.art;
    if (d.id === 'titles') art = P.title ? (achvById(P.title.id) || {}).icon || ACHV_MEDAL_SRC : ACHV_MEDAL_SRC;
    return Object.freeze({ id: d.id, opens: d.opens, art, sub, shared: true, worn: d.id === 'titles' && P.title ? P.title.text : null });
  });
  return Object.freeze({ self, ap, title: P.title, doors: Object.freeze(doors) });
}
