/* ═══ v2.3.3111: PET TRAPPING ON THE PHONE ═══
 * Plan: docs/PET-TRAPPING-PLAN.md.  Spec: docs/specs/trapping.md.
 *
 * The worker decides everything (server/src/trapping.js, petbook.js): every
 * arm, every roll, every catch and every name.  This file keeps what the
 * phone SHOWS and SENDS, and nothing it shows is invented:
 *
 *   trapButtonView(S)   the TRAP pop-up for the monster you have targeted --
 *                       your true odds and your traps, or grey with what
 *                       stops it ("Requires Trapping 18") -- from the same
 *                       table the worker rolls (src/data/trapping.js, held
 *                       to the worker's by mirror-audit).  A grey button
 *                       sends nothing, as a resource above your level does
 *                       (v2.3.3059).
 *   armTrap(S)          asks (trap_arm).  Marks nothing itself: the mark is
 *                       drawn only once the worker says it set one.
 *   onTrapArmed / onTrapResult / onPetsState / onMakeTrapsResult
 *                       the worker's four answers (wsClient.js).
 *
 * STATE ON S
 *   S._trap     { mark: {monsterId, until, chance, x, y} | null,
 *                 pending: {monsterId, at} | null,
 *                 springs: [{x, y, shakes, caught, t0, pet}] (trapFx.js
 *                 draws them), card: the new pet, shown once its trap has
 *                 snapped shut (TrapCatchCard.jsx), rev }
 *   S._petBook  the worker's pets record from pets_state, or null before
 *               the first (src/game/petBook.js reads it)
 *
 * Every capability read is straight off S._serverCaps (the caps audit sees
 * each gate): `trapping` for the button and the shakes, `trapcraft` for the
 * Traps tab, `petbook` for the Pets page.
 */
import {
  TRAPPING, trapChance, trapStretch, fmtTrapChance, TRAP_WORDS, petDisplayName, petKindName,
} from '@/data/trapping.js';
import { ZONES } from '@/data/zones.js';
import { NML_CENTRE } from '@/data/noMansLandRings.js';
import { BT_AUDIO } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';

/* ── the shakes, drawn by trapFx.js and timed here (the popups, the sounds
   and the card wait for the animation they belong to) ── */
export const SHAKE_MS = 430;     /* one shake: tip, tip back */
export const SHAKE_GAP = 170;    /* the pause between shakes */
export const DROP_MS = 260;      /* the trap dropping onto the spot */
export const END_MS = 520;       /* the snap or the break */
/** How long a sprung trap's animation runs, start to the end of its snap. */
export function springMs(shakes) {
  const n = Math.max(0, Math.min(3, Math.floor(Number(shakes) || 0)));
  return DROP_MS + n * (SHAKE_MS + SHAKE_GAP) + END_MS;
}
/* An arm the worker never answered (an old worker, a lost frame) stops
   saying "Setting..." after this. */
const PENDING_MS = 2500;

export function trappingOn(S) { return !!(S && S._serverCaps && S._serverCaps.trapping); }
export function trapcraftOn(S) { return !!(S && S._serverCaps && S._serverCaps.trapcraft); }

export function trapState(S) {
  if (!S._trap) S._trap = { mark: null, pending: null, springs: [], card: null, rev: 0 };
  return S._trap;
}
function bump(S) { const t = trapState(S); t.rev = (t.rev + 1) % 1e9; }

/** Your Trapping level as the worker reads it (`level || 1`). */
export function trapLevel(S) {
  const ls = S && S.rpg && S.rpg.lifeSkills;
  const s = ls && Object.prototype.hasOwnProperty.call(ls, 'trapping') ? ls.trapping : null;
  return Math.max(1, Math.floor((s && typeof s === 'object' && Number(s.level)) || 1));
}
/** Box traps in your bag. */
export function trapsHeld(S) {
  const inv = S && S.rpg && S.rpg.inventory;
  return Math.max(0, Math.floor((inv && Number(inv[TRAPPING.TRAP])) || 0));
}

function onSafeGround(x, y) {
  const z = ZONES && ZONES.wheel;
  if (!z || !z.safeR || typeof x !== 'number' || typeof y !== 'number') return false;
  const dx = x - NML_CENTRE[0], dy = y - NML_CENTRE[1];
  return dx * dx + dy * dy < z.safeR * z.safeR;
}

/** The monster you have targeted, if it is one a trap could be set on: one of
 *  the Wheel's own (`home`), alive. */
export function trapTarget(S) {
  if (!S || S.currentZone !== 'wheel') return null;
  const lt = S.lockedTarget;
  if (!lt || lt.type !== 'monster' || !lt.ref) return null;
  const m = lt.ref;
  if (!m || !m.alive || typeof m.home !== 'string') return null;
  if (typeof m.curHp === 'number' && m.curHp <= 0) return null;
  return m;
}

/** What the TRAP pop-up draws, or null when it is not drawn.
 *  kind: 'ready' (tap to arm), 'armed' (the mark is on it: its seconds left),
 *  'pending' (asked), or 'grey' (why not, in `text`/`sub`). */
export function trapButtonView(S, now) {
  if (!trappingOn(S) || !S.player || !S.rpg) return null;
  if (typeof S.rpg.hp === 'number' && S.rpg.hp <= 0) return null;
  const m = trapTarget(S);
  if (!m) return null;
  const t = now || Date.now();
  const st = trapState(S);
  const M = Math.max(1, Math.floor(Number(m.level) || 1));
  const T = trapLevel(S);
  const traps = trapsHeld(S);
  const chance = trapChance(T, M);
  const base = { monsterId: m.id, chance, traps, level: M, have: T };
  if (st.mark && st.mark.monsterId === m.id && st.mark.until > t) {
    const left = Math.ceil((st.mark.until - t) / 1000);
    return { ...base, kind: 'armed', text: 'ARMED', sub: left + 's', key: 'armed:' + m.id + ':' + left };
  }
  if (st.pending && st.pending.monsterId === m.id && t - st.pending.at < PENDING_MS) {
    return { ...base, kind: 'pending', text: 'TRAP', sub: 'Setting…', key: 'pending:' + m.id };
  }
  if (M > T) return { ...base, kind: 'grey', why: 'level', text: 'TRAP', sub: 'Requires Trapping ' + M, key: 'lvl:' + m.id + ':' + M + ':' + T };
  if (onSafeGround(S.player.x, S.player.y) || onSafeGround(m.x, m.y)) return { ...base, kind: 'grey', why: 'safe-ground', text: 'TRAP', sub: 'Not on safe ground', key: 'safe:' + m.id };
  if (traps < 1) return { ...base, kind: 'grey', why: 'no-trap', text: 'TRAP', sub: 'No box traps', key: 'none:' + m.id };
  const book = S._petBook;
  if (book && Array.isArray(book.list) && book.list.length >= (book.cap || 30)) {
    return { ...base, kind: 'grey', why: 'pets-full', text: 'TRAP', sub: 'Collection full', key: 'full:' + m.id };
  }
  const dx = m.x - S.player.x, dy = m.y - S.player.y;
  if (dx * dx + dy * dy > TRAPPING.ARM_RANGE * TRAPPING.ARM_RANGE) {
    return { ...base, kind: 'grey', why: 'too-far', text: 'TRAP', sub: 'Get closer', key: 'far:' + m.id };
  }
  return { ...base, kind: 'ready', text: 'TRAP', sub: fmtTrapChance(chance), key: 'ready:' + m.id + ':' + chance + ':' + traps };
}

function say(S, text, color, dy) {
  try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - (dy || 34), text, color || '#D8AA58'); } catch (e) { /* popup only */ }
}

/** A tap on TRAP: ask the worker to set one.  A grey button says why and
 *  sends nothing. */
export function armTrap(S) {
  const v = trapButtonView(S);
  if (!v) return false;
  if (v.kind === 'grey') {
    say(S, v.why === 'level' ? 'Requires Trapping ' + v.level : (TRAP_WORDS[v.why] || v.sub), '#E59A94');
    try { BT_AUDIO.uiClick && BT_AUDIO.uiClick(); } catch (e) { /* sound only */ }
    return false;
  }
  if (v.kind !== 'ready' || !S.channel) return false;
  try { S.channel.send({ type: 'trap_arm', payload: { monsterId: v.monsterId } }); } catch (e) { return false; }
  trapState(S).pending = { monsterId: v.monsterId, at: Date.now() };
  S._trapArms = (S._trapArms || 0) + 1;
  bump(S);
  return true;
}

/* ═══ THE WORKER'S ANSWERS ═══ */

/** trap_armed: the mark is set (or why not). */
export function onTrapArmed(S, p) {
  if (!S || !p) return;
  const st = trapState(S);
  st.pending = null;
  if (p.error) {
    const words = p.error === 'level' && p.need ? 'Requires Trapping ' + p.need : (TRAP_WORDS[p.error] || 'No trap set');
    say(S, words, '#E59A94');
    bump(S);
    return;
  }
  const m = (S.monsters || []).find((x) => x && x.id === p.monsterId);
  const ms = Math.max(0, Number(p.ms) || TRAPPING.MARK_MS);
  st.mark = {
    monsterId: p.monsterId,
    until: Date.now() + ms,
    ms,
    top: m && m._popupTopOff != null ? m._popupTopOff : -120,
    chance: Number(p.chance) || 0,
    x: m ? m.x : (S.player ? S.player.x : 0),
    y: m ? m.y : (S.player ? S.player.y : 0),
  };
  try { BT_AUDIO.propHit('wood', { vol: 0.24 }); } catch (e) { /* sound only */ }
  bump(S);
}

/** trap_result: the trap sprang (or the kill came without your share).  The
 *  shakes are drawn where the monster fell (trapFx.js); the words, the XP,
 *  the sounds and the card wait for the animation. */
export function onTrapResult(S, p) {
  if (!S || !p) return;
  const st = trapState(S);
  const mark = st.mark && st.mark.monsterId === p.monsterId ? st.mark : null;
  if (mark) st.mark = null;
  if (S._petBook && p.tries && p.pet == null) {
    /* a miss is counted only in the worker's memory: mirror its count */
    S._trapTries = S._trapTries || Object.create(null);
    S._trapTries[p.monsterId] = p.tries;
  }
  if (!p.sprung) {
    say(S, p.why === 'share' ? 'Trap kept: you had to help kill it' : (TRAP_WORDS[p.why] || 'Trap kept'), '#B6C1BE');
    bump(S);
    return;
  }
  const m = (S.monsters || []).find((x) => x && x.id === p.monsterId);
  const x = mark ? mark.x : (m ? m.x : S.player.x);
  const y = mark ? mark.y : (m ? m.y : S.player.y);
  const t0 = Date.now();
  const shakes = Math.max(0, Math.min(3, Math.floor(Number(p.shakes) || 0)));
  const spring = { x, y, shakes, caught: !!p.caught, t0, pet: p.pet || null, monsterId: p.monsterId };
  /* A new pet is the worker's from this moment (pets_state follows at once,
     and your first comes straight out with you) -- but it stays in the trap
     until the trap has snapped shut on screen: hidden till then (petBook.js
     activePet), then it walks out of the trap to you. */
  if (p.caught && p.pet && p.pet.id) st.hidePet = { id: p.pet.id, until: t0 + springMs(shakes) };
  st.springs.push(spring);
  if (st.springs.length > 6) st.springs.splice(0, st.springs.length - 6);
  S._trapRolls = (S._trapRolls || 0) + 1;
  if (p.caught) S._trapCatches = (S._trapCatches || 0) + 1;
  S._trapLast = { ...p, at: t0 };
  bump(S);

  /* the sounds, on the animation's own beats */
  const at = (ms, fn) => { try { setTimeout(fn, ms); } catch (e) { /* timers only */ } };
  at(DROP_MS * 0.6, () => { try { BT_AUDIO.propHit('wood', { vol: 0.3 }); } catch (e) {} });
  for (let i = 0; i < shakes; i++) {
    at(DROP_MS + i * (SHAKE_MS + SHAKE_GAP) + SHAKE_MS * 0.3, () => { try { BT_AUDIO.propHit('wood', { vol: 0.2 }); } catch (e) {} });
  }
  const end = DROP_MS + shakes * (SHAKE_MS + SHAKE_GAP);
  at(end, () => {
    try {
      if (p.caught) { BT_AUDIO.propHit('wood', { vol: 0.5, big: true }); setTimeout(() => { try { BT_AUDIO.play('quest-complete', { vol: 0.7 }); } catch (e) {} }, 180); }
      else BT_AUDIO.propBreak('wood', 'small', { vol: 0.42 });
    } catch (e) { /* sound only */ }
  });
  at(springMs(shakes), () => {
    try {
      if (p.caught && p.pet) {
        pushDmgPopup(S, x, y - 46, 'Caught!', '#7EE0A8');
        st.card = { pet: p.pet, at: Date.now() };
        /* out of the trap: it starts where the trap is and follows you */
        if (st.hidePet && st.hidePet.id === p.pet.id) { st.hidePet = null; S._petX = x; S._petY = y; }
        bump(S);
      } else {
        pushDmgPopup(S, x, y - 46, shakes >= 3 ? 'So close!' : 'It broke free', '#E59A94');
      }
      if (p.xp > 0) pushDmgPopup(S, x, y - 30, '+' + p.xp + ' Trapping XP', '#D8A94D');
      if (p.leveled && p.newLevel) celebrateLifeSkillLevel(S, 'trapping', p.newLevel, p.newLevel - 1);
    } catch (e) { /* popups only */ }
  });
}

/** make_traps_result: the Woodworker made them (or why not). */
export function onMakeTrapsResult(S, p) {
  if (!S || !p) return;
  if (p.error) { say(S, TRAP_WORDS[p.error] || 'No traps made', '#E59A94'); bump(S); return; }
  if (p.made > 0) {
    say(S, '+' + p.made + ' Box Trap' + (p.made > 1 ? 's' : ''), '#E0B46A', 34);
    if (p.xp > 0) say(S, '+' + p.xp + ' Woodworking XP', '#D8A94D', 48);
    try { BT_AUDIO.collect(); } catch (e) { /* sound only */ }
    if (p.leveled && p.newLevel) { try { celebrateLifeSkillLevel(S, 'woodworking', p.newLevel, p.newLevel - 1); } catch (e) { /* visual */ } }
  }
  S._trapsMade = (S._trapsMade || 0) + (p.made || 0);
  bump(S);
}

/** pets_state: the worker's whole pets record, at join and after a change. */
export function onPetsState(S, p) {
  if (!S || !p) return;
  if (p.unavailable) {
    S._petBook = { unavailable: true, list: [], cap: 0, active: null, journal: {}, at: Date.now() };
  } else {
    S._petBook = {
      v: p.v, cap: p.cap, active: p.active || null,
      list: Array.isArray(p.list) ? p.list : [],
      journal: (p.journal && typeof p.journal === 'object') ? p.journal : {},
      at: Date.now(),
    };
  }
  S._petBookRev = ((S._petBookRev || 0) + 1) % 1e9;
  if (p.error) {
    say(S, TRAP_WORDS[p.error] || 'Not done', '#E59A94');
  } else if (p.op === 'release') {
    say(S, 'Released back to the wild', '#B6C1BE');
  } else if (p.op === 'name') {
    const pet = S._petBook.list.find((q) => q.id === p.id);
    if (pet) say(S, 'Named ' + petDisplayName(pet), '#7EE0A8');
  } else if (p.op === 'active') {
    const pet = S._petBook.active ? S._petBook.list.find((q) => q.id === S._petBook.active) : null;
    say(S, pet ? petDisplayName(pet) + ' is with you' : 'Pet put away', '#7EE0A8');
  }
  bump(S);
}

/** The stretch and kind words a card or row uses ("Gobling · Lv 4"). */
export function petLine(pet) {
  if (!pet) return '';
  return petKindName(pet.kind, pet.stage) + ' · Lv ' + (pet.lv || 1);
}

/** For the QA scenario: what the trap state is, as plain data. */
export function trapProbe(S) {
  const st = S && S._trap;
  return {
    on: trappingOn(S), craft: trapcraftOn(S), level: trapLevel(S), traps: trapsHeld(S),
    view: trapButtonView(S),
    mark: st && st.mark ? { ...st.mark, leftMs: st.mark.until - Date.now() } : null,
    springs: st ? st.springs.length : 0,
    card: st && st.card ? st.card.pet : null,
    arms: (S && S._trapArms) || 0, rolls: (S && S._trapRolls) || 0, catches: (S && S._trapCatches) || 0,
    last: (S && S._trapLast) || null,
    stretch: (() => { const m = trapTarget(S); return m ? trapStretch(m.level) : null; })(),
  };
}
