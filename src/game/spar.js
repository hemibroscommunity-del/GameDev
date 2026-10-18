/* ═══ v2.3.3265: SPARRING CLONES -- THE PAGE'S HALF ═══
 *
 * Owner, 2026-10-15: "I wish I could test PvP somehow. Can you make a special
 * environment where I can go to attack clones of myself using different
 * weapons and you just have them attack me using AI? Purely for testing
 * purposes. Maybe this is better to add to the admin window".
 *
 * The clones are the WORKER's (server/src/spar.js): players to the room, with
 * your look and their own weapon, run by an AI there, every blow through the
 * room's own PvP code.  The test panel brings them and clears them
 * (ui/panels/DevPanel.jsx, `/dev/spar`).  This file is what the page needs to
 * fight them:
 *   - which players ARE your clones, from the worker's own `spar_state`
 *     (wsClient.js's direct switch, the farm_state way: a relayed copy never
 *     reaches here), and the score;
 *   - a tap on one AIMS at it, as at a duel's opponent (BroTown's tap,
 *     `sparAim`): your swings and shots become player_attack, which the worker
 *     judges -- every other player you tap is as before;
 *   - what just happened, said over you: a knockout either way.
 * Nothing here decides a hit: the worker refuses a blow at anyone who is not
 * your own clone (spar.js _sparPair). */
import { pushDmgPopup, heroPopupY } from '@/game/combatHelpers.js';
import { chatLogBus } from '@/ui/mobile/chatLogBus.js';
import { isLiveClone } from '@/game/sparTargets.js'; /* v2.3.3267: one test of "a live clone of yours", for every weapon */
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: a knockout heard either way */

const SPAR_GOLD = '#f5c542';
const SPAR_RED = '#ff7a7a';

function _line(S, text, color) {
  if (!S || !text) return;
  try {
    S.chatLog = [...(S.chatLog || []).slice(-50), { id: 'spar-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: '', text, color: color || SPAR_GOLD, ts: Date.now(), system: true }];
    chatLogBus.bump();
  } catch (e) { /* a line is never worth a frame */ }
}

function _score(p) {
  const r = p && p.rounds;
  return r ? 'you ' + (r.you | 0) + ' : clones ' + (r.clones | 0) : '';
}

/** The worker's word on your clones (server spar.js _sparTell). */
export function applySparState(S, p) {
  if (!S || !p || typeof p !== 'object') return;
  const clones = Array.isArray(p.clones) ? p.clones.filter((c) => c && typeof c.id === 'string') : [];
  const ids = new Set(clones.map((c) => c.id));
  S._spar = {
    clones, ids,
    skill: typeof p.skill === 'string' ? p.skill : null,
    rounds: p.rounds && typeof p.rounds === 'object' ? { you: p.rounds.you | 0, clones: p.rounds.clones | 0 } : { you: 0, clones: 0 },
    at: Date.now(),
  };
  /* a lock on a clone that is gone goes with it */
  const lt = S.lockedTarget;
  if (lt && lt.spar && !ids.has(String(lt.id))) S.lockedTarget = null;
  const who = typeof p.who === 'string' ? p.who.slice(0, 40) : 'a clone';
  const P = S.player;
  if (p.note === 'ko') {
    if (P) pushDmgPopup(S, P.x, heroPopupY(S) - 30, 'Knocked out! Healed', SPAR_RED);
    cue('sparDown');   /* v2.3.3343: no death is sent for a knockout, so playerDeath never sounded -- a thud and the loss sting */
    _line(S, 'Sparring: ' + who + ' knocked you out -- you are healed, no loss (' + _score(p) + ').', SPAR_RED);
  } else if (p.note === 'down') {
    _line(S, 'Sparring: you knocked out the ' + who + ' (' + _score(p) + '). It is back in 3 s.');
    cue('sparWin');   /* v2.3.3343 */
  } else if (p.note === 'left') {
    _line(S, 'Sparring: your clones went home (you left the world).');
  } else if (p.note === 'off') {
    _line(S, 'Sparring is switched off on the server.');
  } else if (p.note === 'spawned' && clones.length) {
    /* v2.3.3267: your weapons find them now, locked or not (sparTargets.js) */
    _line(S, 'Sparring: ' + clones.length + (clones.length === 1 ? ' clone is' : ' clones are') + ' here. Attack away -- a tap picks one to aim at.');
  }
  if (typeof window !== 'undefined') {
    /* QA probe (mp-spar): the last state and every note, in order */
    const q = window.__btSpar || (window.__btSpar = { notes: [], state: null });
    q.state = { clones: clones.map((c) => ({ ...c })), skill: S._spar.skill, rounds: { ...S._spar.rounds } };
    if (p.note) { q.notes.push(p.note); if (q.notes.length > 40) q.notes.shift(); }
  }
}

/** Is this player one of your sparring clones, up? (v2.3.3267: sparTargets.js's
 *  test, which every weapon now asks too) */
export function sparCanAttack(S, id) {
  return isLiveClone(S, id);
}

/** Aim at a clone, as at a duel's opponent: your swings and shots at it are
 *  player_attack (monsterCombat.js, projectiles.js), its bar shows as it is
 *  hit.  `spar` so applySparState lets it go when the clone does. */
export function sparAim(S, id) {
  const o = S && S.others ? S.others[id] : null;
  if (!o) return false;
  S.lockedTarget = { type: 'player', id, ref: o, spar: true };
  return true;
}
