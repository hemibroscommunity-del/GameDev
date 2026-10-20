/* ═══ v2.3.3527: ACHIEVEMENTS -- POINTS FOR COMPLETING THE GAME ═══
 *
 * The owner, 2026-10-19: "Achievement points are something I'd like in the
 * game. You get it by completing the game. Some of them are through super
 * rare achievements. Although not as rare, an arena winner should be included
 * in that."  Then, to the plan's six questions, "Go recommended on
 * everything" (docs/specs/achievements.md "Decided"):
 *   1. a tier's points: common 10, rare 100, the arena's 500 between, and
 *      super-rare 1,000;
 *   2. the arena pays its 500 ONCE a character: a later crown pays its gold
 *      and counts on the row (a second account in a two-player bracket used
 *      to make 500 every few minutes, v2.3.3481);
 *   3. the super-rares are shown before they are earned;
 *   4. a banner and a sound for rare and super-rare, a line in the chat for
 *      common (the phone's: src/game/achievements.js);
 *   5. a duel won and a No man's land kill, once each, common;
 *   6. the More page's always-empty Journey tile becomes Achievements.
 *
 * `achievementPoints` was already on the rpg blob, the AP the quests (+5 a
 * story quest) and the guild ladder pay; achievements add to it.  AP is a
 * score: nothing spends it, nothing takes it back.
 *
 * THE WORKER DECIDES EVERY ONE, at a place the game already settles a fact
 * -- a kill (combat.js), a level (prog3.js), a clear (dungeon.js), a catch
 * (trapping.js), a delivery (farmorders.js), a duel (duel.js), a No man's
 * land kill (nomansland.js), a hand-in (quests.js), a piece of gear
 * (index.js's pickup, gear.js and armorforge.js's forges, dailychest.js), a
 * harden (hardening.js), the free spin (dailyrewards.js) and the arena's
 * crown (gladiator.js, by the mail: an `achv` credit, so a champion who left
 * is paid at the next join).  The phone is told; it never asks.
 *
 * THE RECORD `achv:<pid>` (handoff rule 1: never a new field on the rpg
 * blob) is `{ v, got: {<id>: at}, n: {<id>: times}, dg: {<land>: 1} }` --
 * which you have and when, how many times for the rows that count, and the
 * Wheel's dungeons you have cleared (Delver needs all three).  Ids come only
 * from LIST below and are APPEND-ONLY, never reused: the record names them.
 *   - one GET at join, BEFORE the mail drains (join.js), so a champion's
 *     achievement waiting in the mail finds its record;
 *   - every change is written at once, in the same synchronous run as the
 *     rpg save that carries its points (rules 5 and 7: `got` IS the stamp --
 *     present, it never pays again -- so it goes out with the payment);
 *     nothing is held in memory unwritten, so a deploy loses nothing;
 *   - a record a NEWER worker wrote (`v` above V), or one whose read failed,
 *     is LOCKED: never paid into or written over -- a failed read must never
 *     become a fresh record over the real one (codex.js, the same rule);
 *   - deleted with the character (persistence.js _resetCharacterData).
 * An ordinary kill writes nothing new: only a first, a count or a crossing
 * writes (cost-guard.test).
 *
 * WHAT YOU HAD BEFORE COUNTS: at the join, `_achvSweep` grants what the
 * worker can already see you have done -- a kill, a combat level, the story's
 * last quests, the codex's nine kinds, a pet, a golden one, an arena crown
 * v2.3.3488 paid (its mark, AP_ONCE_OF below) -- quietly (one chat line on
 * the phone, no banners), so nobody who finished the story before this
 * existed waits for a quest that will never come.  A row that counts is
 * granted there only the first time.  What leaves no trace (a dungeon, an
 * order, a duel, a roll) waits for the next one.
 *
 * WHAT OTHER PLAYERS SEE: the AP on a player's card, in the lists and on
 * the leaderboard came from the phone's own `track.rpgData.ap`, which a
 * modified page could set to anything.  `_achvStamp` writes the worker's own
 * total over it at the join and on every track (index.js, beside the clan
 * tag's and the cape's stamps): always, the kill switch or not.
 *
 * THE WIRE:
 *   achv_state {v, got, n, dg, t?, rarest?, ap, new?: [id], retro?: [id]}   at the join
 *       (after the mail) and on every change: `new` the one just earned (the
 *       banner), `retro` the sweep's (a quiet line).  {unavailable} when the
 *       record is locked.  PRIVILEGED (index.js).
 *   achv_title {id | null}   phone -> worker: the title (_achvTitle).
 *   caps.achievements    advertised; `achievements: false` in the live flags
 *       is the kill switch: no grants, no counting, no sweep (what was earned
 *       stays, the AP too), the cap off at the next join.
 *   /dev/achv {id | all | clear}  the owner's lever (devtools.js): a grant
 *       there pays NO points.
 * THE CARD (the plan's Phase 3): a player's card had a placeholder title and
 * "rarest drop" (src/ui/panels/playerProfile.js PROFILE_PREVIEW: "Fishing
 * Master", "Ancient Ember Crown"), the same on everyone's.  Now:
 *   - a TITLE is an achievement you have, chosen on the Achievements page
 *     (`achv_title {id}`, null to take it off), kept on the record as `t`;
 *     one row a change, PACED (flood.js PACE.ACHVT, handoff rule 27);
 *   - the RAREST is worked out, never chosen: the earned one first in
 *     ACHV.RARITY;
 *   - both go on the card's blob as ids (`rpgData.title`, `rpgData.rarest`,
 *     the page has the words and pictures), stamped by _achvStamp with the
 *     AP: a page's own claim is never relayed.
 *
 * Spec: docs/specs/achievements.md.  Suite: server/test/achievements.test.mjs. */
import { CODEX } from './codex.js';
import { PETBOOK } from './petbook.js';
import { PROG3 } from './prog3.js';
import { HARDEN } from './hardening.js';
import { WHEEL_DUNGEON } from './wheeldungeon.js';
import { QUEST_REWARDS, QUEST_DORMANT } from './data.js';
import { PACE } from './flood.js';

export const ACHV_KEY = (playerId) => 'achv:' + playerId;

/* The tiers' points, and every achievement: id, tier, and whether its row
   counts repeats.  Held to src/data/achievements.js (the page's words) by
   mirror-audit.  APPEND-ONLY. */
const TIER_AP = Object.freeze({ common: 10, rare: 100, arena: 500, superrare: 1000 });
const LIST = Object.freeze([
  { id: 'first_blood', tier: 'common' },
  { id: 'combat_10', tier: 'common' },
  { id: 'first_dungeon', tier: 'common', count: true },
  { id: 'first_pet', tier: 'common' },
  { id: 'first_order', tier: 'common', count: true },
  { id: 'first_duel', tier: 'common', count: true },
  { id: 'nml_kill', tier: 'common', count: true },
  { id: 'story_done', tier: 'rare' },
  { id: 'codex_all', tier: 'rare' },
  { id: 'elder_all', tier: 'rare' },
  { id: 'dungeons_all', tier: 'rare' },
  { id: 'combat_50', tier: 'rare' },
  { id: 'natural_one', tier: 'rare', count: true },
  { id: 'iron_blade', tier: 'rare', count: true },
  { id: 'golden_pet', tier: 'rare', count: true },
  { id: 'elite_piece', tier: 'rare', count: true },
  { id: 'gladiator', tier: 'arena', count: true },
  { id: 'tempered', tier: 'superrare', count: true },
  { id: 'golden_giant', tier: 'superrare', count: true },
  { id: 'elite_iron', tier: 'superrare', count: true },
  { id: 'house_limit', tier: 'superrare', count: true },
  { id: 'combat_100', tier: 'superrare' },
  { id: 'godly', tier: 'superrare', count: true },
].map((a) => Object.freeze({ count: false, ...a })));

/* The story is done when the LAST quest of every live chain is handed in:
   each live quest whose `next` is nothing or a dormant quest.  Today
   tut_4, life_2, beast_4 and mayor_3 -- the ends, not all thirteen, because
   a chain's middle can be skipped (mayor_1 hid itself while the Wheel's
   buildings had no doors, v2.3.3029) and a skipped quest must never make the
   achievement impossible.  Worked out from the table, so a new chain is in. */
const STORY_ENDS = (() => {
  const dormant = new Set(QUEST_DORMANT);
  const live = Object.keys(QUEST_REWARDS).filter((q) => !dormant.has(q));
  return Object.freeze(live.filter((q) => {
    const nx = QUEST_REWARDS[q] && QUEST_REWARDS[q].next;
    return !nx || dormant.has(nx) || !Object.prototype.hasOwnProperty.call(QUEST_REWARDS, nx);
  }));
})();

export const ACHV = Object.freeze({
  V: 1,
  TIER_AP,
  LIST,
  /* combat skill level -> achievement, the highest of Melee, Bow, Magic */
  COMBAT: Object.freeze([[10, 'combat_10'], [50, 'combat_50'], [100, 'combat_100']]),
  STORY_ENDS,
  /* the Wheel's dungeons Delver needs (wheeldungeon.js LANDS: their lands) */
  DUNGEONS: Object.freeze(Object.keys(WHEEL_DUNGEON.LANDS)),
  /* a count stops here: never reached, never unbounded in storage */
  N_MAX: 9999999,
  /* v2.3.3527: the card's "rarest", rarest first: by tier (super-rare, the
     arena, rare, common), and in a tier by the worker's own odds -- H5 is
     five successes in a row, ~1 in 2.5 million runs (HARDEN.ODDS 80/20/5/
     1/0.5%: a failure with under 20 temper resets to H0, and a success
     clears the temper, so the pity band almost never builds); Godly 1 in
     2,000,000 a quality roll (hardening.js Q_GODLY); an Elite Iron Great
     Sword 1 in ~55,000 kills (1 in 500 x 0.9%); the house limit ~1 in 600
     spins doubling every time, one spin a day; a golden giant ~1 in 700
     catches (1 in 50 x 7%); level 100 a grind that comes.  Then a kill roll of 1
     (1 in 10,000 killing blows), the Buried City's 41-45, every land's
     second stage, Elite (0.9% a roll), the Iron Great Sword (1 in 500), a
     golden pet (1 in 50 catches), level 50, the codex, the story; the
     commons by how few go looking.  Every id once (achievements.test). */
  RARITY: Object.freeze([
    'tempered', 'godly', 'elite_iron', 'house_limit', 'golden_giant', 'combat_100',
    'gladiator',
    'natural_one', 'dungeons_all', 'elder_all', 'elite_piece', 'iron_blade', 'golden_pet',
    'combat_50', 'codex_all', 'story_done',
    'nml_kill', 'first_duel', 'first_dungeon', 'first_order', 'first_pet', 'combat_10', 'first_blood',
  ]),
});

/* ═══ THE ARENA'S POINTS, ONCE BY EITHER ROAD ═══
   Before achievements, v2.3.3488 (#1026) paid the arena champion's 500 AP on
   a character's FIRST win only, under a mark of its own: `aponce:<pid>`
   {arena: 1} (inbox.js AP_ONCE, read at the join before the mail and saved
   with the points by _saveRpg).  The Gladiator achievement pays those same
   points now, so the mark stays the ONE word on whether a character was paid
   them: the achievement pays only while it is unset, and sets it when it
   pays.  A champion the old road paid gets the achievement with no second
   500 (at the join's sweep, or at their next crown), and the old road, which
   an arena credit still carrying points takes only with achievements off,
   never pays a champion the achievement paid.  A character whose marks could
   not be read is granted nothing it might owe twice: the achievement waits
   (the mail keeps it queued) until a join reads them. */
export const AP_ONCE_OF = Object.freeze({ gladiator: 'arena' });

const BY_ID = Object.create(null);
for (const a of LIST) BY_ID[a.id] = a;
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** An achievement's points (0 for an id this worker does not know). */
export function achvAp(id) {
  return has(BY_ID, id) ? TIER_AP[BY_ID[id].tier] : 0;
}

/** A stored record, made safe to grant into: `{rec, locked}`.  Locked when a
 *  newer worker wrote it (left exactly as it is).  Only ids in LIST and the
 *  Wheel's dungeon lands are kept: everything else is dropped, so a record
 *  stays a few hundred bytes and no client-chosen key ever reaches a map. */
export function normalizeAchv(raw) {
  if (raw && typeof raw === 'object' && Number(raw.v) > ACHV.V) return { rec: null, locked: true };
  const got = Object.create(null), n = Object.create(null), dg = Object.create(null);
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const a of LIST) {
    const at = src.got && typeof src.got === 'object' && has(src.got, a.id) ? Math.floor(Number(src.got[a.id])) : NaN;
    if (Number.isFinite(at) && at > 0) got[a.id] = at;
    const c = src.n && typeof src.n === 'object' && has(src.n, a.id) ? Math.floor(Number(src.n[a.id])) : 0;
    if (a.count && Number.isFinite(c) && c > 0) n[a.id] = Math.min(ACHV.N_MAX, c);
  }
  for (const land of ACHV.DUNGEONS) {
    if (src.dg && typeof src.dg === 'object' && has(src.dg, land) && src.dg[land]) dg[land] = 1;
  }
  const rec = { v: ACHV.V, got, n, dg };
  /* v2.3.3527: the chosen title, kept only while it is one you have */
  if (typeof src.t === 'string' && has(got, src.t)) rec.t = src.t;
  return { rec, locked: false };
}

/** The card's "rarest": the earned achievement first in ACHV.RARITY, or
 *  null with none. */
export function rarestOf(rec) {
  if (!rec || !rec.got) return null;
  for (const id of ACHV.RARITY) if (has(rec.got, id)) return id;
  return null;
}

/* a plain copy for storage and the wire: storage clones on put anyway, and
   the suites' storage does not -- an aliased object would let a test pass
   on a write that never happened (codex.js's note) */
function plain(rec) {
  const o = { v: rec.v, got: { ...rec.got }, n: { ...rec.n }, dg: { ...rec.dg } };
  if (rec.t) o.t = rec.t;
  return o;
}

export const achievementMethods = {
  /* `achievements: false` in the live flags (what was earned stays) */
  _achvOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'achievements') && !f.achievements);
  },

  /* playerId -> { rec, locked }.  The cache lives as long as the session;
     storage is the truth (rule 11), and nothing here is ever unwritten. */
  _achvMap() {
    if (!this._achvCache) this._achvCache = new Map();
    return this._achvCache;
  },
  _achvOf(pid) {
    return (pid && this._achvMap().get(pid)) || null;
  },
  _achvForget(pid) {
    if (pid) this._achvMap().delete(pid);
  },

  /* ═══ AT JOIN ═══ one storage GET, BEFORE the mail drains (join.js).  A
     record already in memory for this player (a session the same id just
     superseded) is the newest truth and is kept rather than re-read. */
  async _achvLoadOnJoin(pid) {
    if (!pid) return null;
    const map = this._achvMap();
    let book = map.get(pid);
    if (book && !book.locked) return book;
    let raw, failed = false;
    try { raw = await this.state.storage.get(ACHV_KEY(pid)); } catch (e) { failed = true; }
    if (failed) book = { rec: null, locked: true };
    else book = normalizeAchv(raw);
    map.set(pid, book);
    return book;
  },

  /* Written at once, fire-and-forget (the _saveRpg posture): called in the
     same synchronous run as the rpg save that carries the points. */
  _achvPut(pid, book) {
    if (!book || book.locked || !book.rec) return;
    try { this.state.storage.put(ACHV_KEY(pid), plain(book.rec)); } catch (e) { /* fire-and-forget */ }
  },

  /* What the phone is told. */
  _achvSend(pid, extra) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws) return;
    const book = this._achvOf(pid);
    const ps = this.playerState && this.playerState[pid];
    const payload = (!book || book.locked || !book.rec)
      ? { unavailable: true }
      : { ...plain(book.rec), ap: Math.max(0, Math.floor(Number(ps && ps.achievementPoints) || 0)),
          /* v2.3.3527: the card's rarest, worked out here so the page never
             keeps its own copy of the order */
          ...(rarestOf(book.rec) ? { rarest: rarestOf(book.rec) } : {}), ...(extra || {}) };
    try { ws.send(JSON.stringify({ type: 'achv_state', payload })); } catch (e) {}
  },

  /* Would the worker pay `id`'s points to this player now?  The points, 0
     (they have it, or achievements are off), or null (it cannot tell yet:
     offline, or the record is not readable).  The arena's champion box. */
  _achvWouldPay(pid, id) {
    if (this._achvOff() || !has(BY_ID, id)) return 0;
    const book = this._achvOf(pid);
    if (!book || book.locked || !book.rec) return null;
    if (has(book.rec.got, id)) return 0;
    /* the arena's mark (AP_ONCE_OF above): paid by v2.3.3488's road, or not
       readable this session */
    if (has(AP_ONCE_OF, id)) {
      const ps = this.playerState && this.playerState[pid];
      if (!ps || ps._apOnceFailed) return null;
      if (ps.apOnce && ps.apOnce[AP_ONCE_OF[id]]) return 0;
    }
    return achvAp(id);
  },

  /* ═══ THE ONE GRANT ═══
     `id` for player `pid` (live state `ps`): the first time, it is marked
     got and its points added to `ps.achievementPoints`; a row that counts
     counts again.  Returns 'new', 'again', or null (nothing changed: off,
     unknown, locked, or had it already on a row that does not count).
     The record is written here; the rpg blob that carries the points is
     the CALLER's save, in the same synchronous run -- or this one's with
     `opts.save` (a place that does not save `ps` itself).  `opts.quiet`
     tells the phone nothing yet (the sweep sends one message at the end);
     `opts.dev` pays no points (the owner's lever). */
  _achvGrant(pid, ps, id, opts) {
    const o = opts || {};
    if (!pid || !ps || this._achvOff() || !has(BY_ID, id)) return null;
    const book = this._achvOf(pid);
    if (!book || book.locked || !book.rec) return null;
    const def = BY_ID[id], rec = book.rec;
    const isNew = !has(rec.got, id);
    if (!isNew && !def.count) return null;
    /* the arena's points (AP_ONCE_OF): never granted while the mark that
       says whether they were paid cannot be read */
    const once = has(AP_ONCE_OF, id) ? AP_ONCE_OF[id] : null;
    if (isNew && once && ps._apOnceFailed) return null;
    if (isNew) {
      rec.got[id] = typeof o.now === 'number' ? o.now : Date.now();
      const paidBefore = !!(once && ps.apOnce && ps.apOnce[once]);
      if (!o.dev && !paidBefore) {
        ps.achievementPoints = Math.max(0, Math.floor(Number(ps.achievementPoints) || 0)) + achvAp(id);
        if (once) {
          if (!ps.apOnce || typeof ps.apOnce !== 'object') ps.apOnce = Object.create(null);
          ps.apOnce[once] = 1;
          ps._apOnceDirty = true;   /* _saveRpg writes aponce:<pid> with the points */
        }
      }
    }
    if (def.count) rec.n[id] = Math.min(ACHV.N_MAX, (rec.n[id] || 0) + 1);
    this._achvPut(pid, book);
    if (isNew && !o.dev && o.save) this._saveRpg(pid, ps);
    if (isNew && !o.dev && this._queuePlayerStateFlush) this._queuePlayerStateFlush(pid);
    if (!o.quiet) this._achvSend(pid, isNew ? { new: [id] } : null);
    return isNew ? 'new' : 'again';
  },

  /* ═══ THE PLACES ═══ each called where the game settles its fact, before
     that place's own save of `ps` (no await between), inside a try there: an
     achievement must never break the thing it is about. */

  /* A kill (combat.js _resolveMonsterKill, every XP recipient; `kr` the
     kill's one roll, killroll.js).  The killing blow's player only for First
     Blood and Natural One; the codex's nine kinds for everyone it counts. */
  _achvOnKill(pid, ps, m, kr, isKiller) {
    if (this._achvOff()) return;
    if (isKiller) {
      this._achvGrant(pid, ps, 'first_blood');
      if (kr && kr.roll === 1) this._achvGrant(pid, ps, 'natural_one');
    }
    this._achvCodexCheck(pid, ps);
  },
  /* Know Thy Enemy and Elder Hunter, from the codex's own counts. */
  _achvCodexCheck(pid, ps, opts) {
    const book = this._achvOf(pid);
    if (!book || !book.rec || (has(book.rec.got, 'codex_all') && has(book.rec.got, 'elder_all'))) return;
    const cx = this._codexOf ? this._codexOf(pid) : null;
    if (!cx || cx.locked || !cx.rec || !cx.rec.k) return;
    const pairs = CODEX.KINDS.map((k) => (has(cx.rec.k, k) ? cx.rec.k[k] : [0, 0]));
    if (pairs.every((p) => p[0] >= 1)) this._achvGrant(pid, ps, 'codex_all', opts);
    if (pairs.every((p) => p[1] >= 1)) this._achvGrant(pid, ps, 'elder_all', opts);
  },

  /* A combat skill's level-up (prog3.js _prog3AwardXp): the highest of
     Melee, Bow and Magic against 10, 50 and 100. */
  _achvOnSkill(pid, ps, opts) {
    if (this._achvOff()) return;
    const sk = ps && ps.prog3 && ps.prog3.sk;
    if (!sk) return;
    let top = 0;
    for (const c of PROG3.SKILLS) top = Math.max(top, Math.floor(Number(sk[c] && sk[c].level) || 0));
    for (const [lv, id] of ACHV.COMBAT) if (top >= lv) this._achvGrant(pid, ps, id, opts);
  },

  /* A dungeon cleared (dungeon.js _dungeonComplete): a Wheel dungeon only
     (`cfg.home`, the land) -- never the Workshop, a pen its player fills. */
  _achvOnDungeon(pid, ps, cfg) {
    if (this._achvOff() || !cfg || typeof cfg.home !== 'string') return;
    const book = this._achvOf(pid);
    if (!book || book.locked || !book.rec) return;
    if (ACHV.DUNGEONS.indexOf(cfg.home) >= 0) book.rec.dg[cfg.home] = 1;
    this._achvGrant(pid, ps, 'first_dungeon');   /* writes the record, `dg` with it */
    if (ACHV.DUNGEONS.every((d) => has(book.rec.dg, d))) this._achvGrant(pid, ps, 'dungeons_all');
  },

  /* A pet caught (trapping.js, `pet` petbook.js _petbookAddCatch's copy). */
  _achvOnCatch(pid, ps, pet, opts) {
    if (this._achvOff() || !pet) return;
    this._achvGrant(pid, ps, 'first_pet', opts);
    if (pet.gold) {
      this._achvGrant(pid, ps, 'golden_pet', opts);
      if (Number(pet.size) >= PETBOOK.BIG_AT) this._achvGrant(pid, ps, 'golden_giant', opts);
    }
  },

  /* An order delivered at the Feed & Seed (farmorders.js). */
  _achvOnOrder(pid, ps) {
    if (!this._achvOff()) this._achvGrant(pid, ps, 'first_order');
  },

  /* A duel won by the kill (duel.js _resolveDuel; never an arena match, nor
     a forfeit or a clock's: "win a duel" is beating someone).  The duel does
     not save the winner, so this saves. */
  _achvOnDuelWin(pid, how) {
    if (this._achvOff() || how !== 'kill') return;
    const ps = this.playerState && this.playerState[pid];
    if (ps) this._achvGrant(pid, ps, 'first_duel', { save: true });
  },

  /* A player killed under No man's land's rule (nomansland.js _nmlOnDeath:
     the victim's last blow the killer's).  Saves, as the duel. */
  _achvOnNmlKill(killerId) {
    if (this._achvOff() || !killerId) return;
    const ps = this.playerState && this.playerState[killerId];
    if (ps) this._achvGrant(killerId, ps, 'nml_kill', { save: true });
  },

  /* A story quest handed in (quests.js _handleQuestTurnIn, after its
     'turnedIn'): every chain's last quest. */
  _achvOnQuest(pid, ps, opts) {
    if (this._achvOff() || !ps || !ps._quests) return;
    if (ACHV.STORY_ENDS.length && ACHV.STORY_ENDS.every((q) => ps._quests[q] === 'turnedIn')) {
      this._achvGrant(pid, ps, 'story_done', opts);
    }
  },

  /* A piece of gear made yours: picked up off a kill (`from` 'kill': the
     Iron Great Sword is a kill's only weapon), forged, or out of a chest.
     Elite is elite or better; Godly is godly. */
  _achvOnPiece(pid, ps, piece, from) {
    if (this._achvOff() || !piece || typeof piece !== 'object') return;
    const q = piece.quality;
    const eliteUp = q === 'elite' || q === 'godly';
    if (from === 'kill' && piece.type && typeof piece.gearBase === 'string') {
      this._achvGrant(pid, ps, 'iron_blade');
      if (eliteUp) this._achvGrant(pid, ps, 'elite_iron');
    }
    if (eliteUp) this._achvGrant(pid, ps, 'elite_piece');
    if (q === 'godly') this._achvGrant(pid, ps, 'godly');
  },

  /* A weapon hardened to the top (hardening.js, a success at HARDEN.MAX). */
  _achvOnHarden(pid, ps, hardness) {
    if (!this._achvOff() && Number(hardness) >= HARDEN.MAX) this._achvGrant(pid, ps, 'tempered');
  },

  /* The free spin's pot doubled to the house limit (dailyrewards.js, `top`). */
  _achvOnSpinTop(pid, ps) {
    if (!this._achvOff()) this._achvGrant(pid, ps, 'house_limit', { save: true });
  },

  /* ═══ THE ARENA'S CROWN, BY THE MAIL ═══ an `achv` credit (inbox.js
     _applyCreditToPs, gladiator.js _arenaCrown).  FALSE -- the entry STAYS
     QUEUED -- while this player's record is not loaded or is locked (a pet's
     rule): the gold went in its own credit, and the points wait for a
     record that can say whether they are owed.  True once granted or
     counted, and for an id this worker does not know (never wedge the box).
     Off: consumed, nothing paid (the switch never queues mail forever). */
  _achvFromMail(pid, ps, id) {
    if (!has(BY_ID, id)) return true;
    if (this._achvOff()) return true;
    const book = this._achvOf(pid);
    if (!ps || !book || book.locked || !book.rec) return false;
    if (has(AP_ONCE_OF, id) && ps._apOnceFailed && !has(book.rec.got, id)) return false;   /* the arena's mark unread: wait */
    this._achvGrant(pid, ps, id);
    return true;
  },

  /* ═══ WHAT YOU HAD BEFORE (join.js, after the codex, pets and mail) ═══
     Quietly grants what this player's own records already show, then tells
     the phone once, the earned ones as `retro`.  The caller's join save is
     not awaited after, so this saves when it paid. */
  _achvSweep(pid, ps) {
    if (this._achvOff() || !ps) return [];
    const book = this._achvOf(pid);
    if (!book || book.locked || !book.rec) return [];
    const before = new Set(Object.keys(book.rec.got));
    const q = { quiet: true };
    if (Math.floor(Number(ps.svKills) || 0) > 0) this._achvGrant(pid, ps, 'first_blood', q);
    this._achvOnSkill(pid, ps, q);
    this._achvOnQuest(pid, ps, q);
    this._achvCodexCheck(pid, ps, q);
    /* a row that counts is granted here only the FIRST time: the sweep runs
       at every join, and a second grant would count it again (a golden pet
       counted at every login, and its record rewritten) */
    const firstOnly = (id) => { if (!has(book.rec.got, id)) this._achvGrant(pid, ps, id, q); };
    const pets = this._petbookOf ? this._petbookOf(pid) : null;
    const list = pets && !pets.locked && pets.rec && Array.isArray(pets.rec.list) ? pets.rec.list : [];
    if (list.length) this._achvGrant(pid, ps, 'first_pet', q);
    if (list.some((p) => p && p.gold)) firstOnly('golden_pet');
    if (list.some((p) => p && p.gold && Number(p.size) >= PETBOOK.BIG_AT)) firstOnly('golden_giant');
    /* a champion v2.3.3488 paid (its arena mark, AP_ONCE_OF): the Gladiator
       achievement, its points already in their total */
    if (ps.apOnce && ps.apOnce.arena) firstOnly('gladiator');
    const retro = Object.keys(book.rec.got).filter((id) => !before.has(id));
    if (retro.length) this._saveRpg(pid, ps);
    return retro;
  },

  /* ═══ THE STAMP (join.js, index.js's track) ═══ the AP on the inspect
     card's blob is the worker's, whatever the phone said -- the card, the
     lists (nearjoin.js LIST_RPG_KEYS) and the leaderboard read it there. */
  _achvStamp(pid, data) {
    if (!data || typeof data !== 'object' || !data.rpgData || typeof data.rpgData !== 'object') return;
    const ps = this.playerState && this.playerState[pid];
    if (!ps) return;
    const rd = { ...data.rpgData, ap: Math.max(0, Math.floor(Number(ps.achievementPoints) || 0)) };
    /* v2.3.3527: the title and the rarest are the record's, never the
       page's: a claim is taken off, and an unreadable record shows neither */
    delete rd.title;
    delete rd.rarest;
    const book = this._achvOf(pid);
    const rec = book && !book.locked && book.rec ? book.rec : null;
    if (rec && rec.t && has(rec.got, rec.t)) rd.title = rec.t;
    const rarest = rarestOf(rec);
    if (rarest) rd.rarest = rarest;
    data.rpgData = rd;
  },

  /* ═══ THE TITLE (v2.3.3527: `achv_title {id}`, index.js's router) ═══ an
     achievement you have, or null (or '') to take it off.  The same title
     again writes nothing; a change is one row, PACED -- past PACE.ACHVT's
     burst it is refused, never held (a tap must not queue a write behind
     it).  Off or locked, nothing changes.  The phone is always told what
     stands, so a refused tap puts its page right. */
  _achvTitle(session, payload) {
    const pid = session && session.id;
    const ps = pid && this.playerState && this.playerState[pid];
    if (!ps) return;
    const book = this._achvOf(pid);
    const raw = payload && typeof payload === 'object' ? payload.id : undefined;
    const want = raw === null || raw === undefined || raw === '' ? null : raw;
    const ok = !this._achvOff() && book && !book.locked && book.rec
      && (want === null || (typeof want === 'string' && has(BY_ID, want) && has(book.rec.got, want)));
    if (ok && (book.rec.t || null) !== want && this._paceTake('achvt', pid, PACE.ACHVT)) {
      if (want) book.rec.t = want;
      else delete book.rec.t;
      this._achvPut(pid, book);
    }
    this._achvSend(pid);
  },

  /* ═══ THE OWNER'S LEVER (devtools /dev/achv) ═══ `id` (or `all`) marked
     earned WITHOUT points, or `clear` -- everything forgotten, the points
     kept (AP is never taken back).  Tells the phone. */
  _achvDev(pid, body) {
    const ps = this.playerState && this.playerState[pid];
    const book = this._achvOf(pid);
    if (!ps || !book) return { ok: false, error: 'not online' };
    if (book.locked || !book.rec) return { ok: false, error: 'achievements record locked' };
    const b = body && typeof body === 'object' ? body : Object.create(null);
    if (b.clear) {
      book.rec = { v: ACHV.V, got: Object.create(null), n: Object.create(null), dg: Object.create(null) };
      this._achvPut(pid, book);
      this._achvSend(pid);
      return { ok: true, cleared: true };
    }
    const ids = b.all ? LIST.map((a) => a.id) : (typeof b.id === 'string' && has(BY_ID, b.id) ? [b.id] : []);
    if (!ids.length) return { ok: false, error: 'id (one of ' + LIST.map((a) => a.id).join(', ') + ') or all or clear' };
    const now = Date.now();
    for (const id of ids) {
      if (!has(book.rec.got, id)) book.rec.got[id] = now;
    }
    this._achvPut(pid, book);
    this._achvSend(pid, { new: ids.length === 1 ? ids : [] });
    return { ok: true, ids };
  },
};
