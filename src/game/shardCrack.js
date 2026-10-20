/* ═══ v2.3.3516: SHARDS CRACKED, RAW GEMS COMBINED -- BY THE WORKER ═══
 *
 * The owner, 2026-10-19: "a fun method would be for the shards to have a
 * certain percent chance of containing that elements raw gem.  Like maybe a
 * 10% chance.  Then after collecting a certain number of raw gems they can be
 * combined into an elemental gem."  And on docs/GEM-PLAN.md, 2026-10-20: "All
 * of that sounds good" -- its Phase 2.
 *
 * Against a worker that advertises caps.shardcrack (server/src/shardcrack.js)
 * the Gem Works' first tab ASKS:
 *
 *   shard_crack { land, count }            count 1-50 (Crack all is one ask)
 *   gem_combine { element }                three raw gems -> one gem
 *   gem_combine { element, rare: true }    one Rare Gem -> one gem
 *
 * and nothing changes here until the worker answers.  The answer
 * (`shard_crack_result` / `gem_combine_result`) says what it rolled and made;
 * the bag, the Gem Cutting XP and the level ride the player_state that
 * follows.  The tab plays the crack from the worker's own `rolls`
 * (ShardCrackPanel.jsx): a roll at or under `chance` held a gem.
 *
 * Against an older worker, or with the kill switch on, the tab is the old
 * one-raw-gem cut (GemcutPanel.jsx). */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';
import { gemColor, gemElementName } from '@/data/gems.js';
import { RAW_PER_GEM } from '@/data/shards.js';

/* how long an unanswered ask holds the buttons */
export const SHARD_CRACK_WAIT_MS = 4000;

let _last = null;
let _pending = null;
let _seq = 0;
const _listeners = new Set();
const emit = () => { for (const fn of _listeners) { try { fn(); } catch (e) { /* one dead listener must not starve the rest */ } } };

/** The last answer ({kind: 'crack'|'combine', ok, ..., seq, at}) and the ask in
 *  flight ({kind, land|element, at}). */
export const shardCrackBus = {
  get() { return _last; },
  pending() { return _pending && Date.now() - _pending.at < SHARD_CRACK_WAIT_MS ? _pending : null; },
  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

/** Does the worker crack shards and combine raw gems?  (else the old cut) */
export function shardCrackOnServer(S) {
  return !!(S && S._serverCaps && S._serverCaps.shardcrack && S.channel);
}

const REASON = Object.freeze({
  off: 'The Gem Works is closed for now',
  down: 'Not while you are down',
  bad_land: 'That shard holds no gem',
  short: 'Not enough to do that',
  bad_gem: 'That is not a gem',
  no_rare: 'No Rare Gem left',
  bad: 'Could not do that',
});
export function shardCrackReasonText(reason, extra) {
  if (reason === 'short' && extra && typeof extra.need === 'number') {
    return 'You need ' + extra.need + ' raw gems' + (typeof extra.have === 'number' ? ' (you have ' + extra.have + ')' : '');
  }
  if (reason === 'short') return 'No shards of that land left';
  return Object.prototype.hasOwnProperty.call(REASON, reason) ? REASON[reason] : REASON.bad;
}

function send(S, type, payload, pend) {
  if (!shardCrackOnServer(S) || shardCrackBus.pending()) return null;
  try { S.channel.send({ type, payload }); } catch (e) { return null; }
  _pending = { ...pend, at: Date.now() };
  emit();
  return payload;
}

/** Crack up to `count` of a land's shards.  The payload sent, or null. */
export function askShardCrack(S, land, count) {
  const n = Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
  return send(S, 'shard_crack', { land, count: n }, { kind: 'crack', land, count: n });
}

/** Combine three raw gems of `element` into one -- or, `rare`, one Rare Gem. */
export function askGemCombine(S, element, rare) {
  const payload = rare ? { element, rare: true } : { element };
  return send(S, 'gem_combine', payload, { kind: 'combine', element, rare: !!rare });
}

function say(S, text, color, dy) {
  try { const P = S && S.player; if (P) pushDmgPopup(S, P.x, P.y - (dy || 30), text, color || '#D8AA58'); } catch (e) { /* popup only */ }
}

function levelUp(S, payload) {
  if (payload.leveled && typeof payload.newLevel === 'number') {
    try { celebrateLifeSkillLevel(S, 'gemCutting', payload.newLevel, typeof payload.fromLevel === 'number' ? payload.fromLevel : payload.newLevel - 1); } catch (e) { /* the bar still shows it */ }
  }
}

function record(entry) {
  _last = { ...entry, seq: ++_seq, at: Date.now() };
  try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btShardCrackLog || (window.__btShardCrackLog = [])).push(_last); } catch (e) { /* probe only */ }
  emit();
}

/** shard_crack_result.  The tab plays the reveal and its sounds; this is the
 *  world's echo over your head, and the level. */
export function applyShardCrackResult(S, payload) {
  if (!payload || typeof payload !== 'object') return;
  _pending = null;
  const rolls = Array.isArray(payload.rolls) ? payload.rolls.filter((r) => Number.isFinite(r)).slice(0, 50) : [];
  if (payload.ok) {
    const found = Math.max(0, Math.floor(Number(payload.found) || 0));
    const name = 'Raw ' + gemElementName(payload.element) + ' Gem';
    if (found > 0) say(S, (found > 1 ? found + ' ' + name + 's' : name) + '!', gemColor(payload.element));
    else say(S, rolls.length > 1 ? 'No gem in ' + rolls.length + ' shards' : 'No gem this time', '#B6C1BE');
    levelUp(S, payload);
  } else {
    say(S, shardCrackReasonText(payload.reason), '#E58C7A');
  }
  record({ kind: 'crack', ok: !!payload.ok, reason: payload.reason || null, land: payload.land || null, element: payload.element || null,
    chance: Number(payload.chance) || 0, rolls, found: Math.floor(Number(payload.found) || 0), left: Math.floor(Number(payload.left) || 0), xp: Number(payload.xp) || 0 });
}

/** gem_combine_result */
export function applyGemCombineResult(S, payload) {
  if (!payload || typeof payload !== 'object') return;
  _pending = null;
  if (payload.ok) {
    say(S, gemElementName(payload.element) + ' Gem made!', gemColor(payload.element));
    try { cue('gemCut'); } catch (e) { /* sound only */ }
    levelUp(S, payload);
  } else {
    say(S, shardCrackReasonText(payload.reason, payload), '#E58C7A');
  }
  record({ kind: 'combine', ok: !!payload.ok, reason: payload.reason || null, element: payload.element || null, rare: !!payload.rare,
    need: typeof payload.need === 'number' ? payload.need : RAW_PER_GEM, have: typeof payload.have === 'number' ? payload.have : null, xp: Number(payload.xp) || 0 });
}
