/* ═══ v2.3.3410: THE EMOTES AND MOVES, HEARD ═══
 *
 * The owner, 2026-10-18, on the missing sounds: "Good look for more".  The
 * emotes you can see (v2.3.3391) and your bro's moves (v2.3.3392: wave,
 * laugh, flex, shrug, facepalm, cheer, sit, sleep, flop and the dances) were
 * silent: each called BT_AUDIO.emote(), two beep()s that have played nothing
 * since v2.3.1103.  Their plan asked for "reused sounds" (docs/FUN-SOCIAL-
 * PLAN.md, the emote table); these are them, from recordings already in the
 * game (data/eventSounds.js emotePop, slap, sitDown, flop, flexShine,
 * cheerPop; which move makes which is MOVE_SOUNDS there).
 *
 *   yours            as you make it (interactions.js sendEmote / sendMove);
 *   another player's a moment (a wave) when its relay comes in (chat.js
 *                    handleEmote), a held pose (sit, a dance) when its tick
 *                    says it began (tickMoveSounds), at the peer share by
 *                    distance (eventSounds.cuePeer: about half your own);
 *   a townsperson's  copy -- Lil Bro copying you, Blacksmith Bro flexing back,
 *                    Mayor Bro cheering a party (game/townsfolkReact.js) --
 *                    when it starts, by distance (tickMoveSounds).
 * A player who comes into reach already sitting or dancing is not heard
 * sitting down: only a pose that begins once they have been near for
 * PEER_KNOWN_MS.  Sound only: nothing here may throw into its caller. */
import { BT_AUDIO } from '@/data/index.js';
import { cue, cueAt, cuePeer } from '@/game/eventSounds.js';
import { MOVE_SOUNDS } from '@/data/eventSounds.js';
import { EMOTE_MOVES } from '@/game/emoteMoves.js';

/* a pose another player was already in when this phone first saw them is
   not heard beginning */
export const PEER_KNOWN_MS = 1000;
/* a townsperson's move, beside you, at this much of your own */
export const NPC_K = 0.6;
/* a move that began longer ago than this is not heard (a late frame) */
const FRESH_MS = 1500;

const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** The cues a move makes (MOVE_SOUNDS), or the emoji's pop for one the table
 *  has not heard of yet, or none. */
export function moveCues(id) {
  if (has(MOVE_SOUNDS, id)) return MOVE_SOUNDS[id];
  return has(EMOTE_MOVES, id) && EMOTE_MOVES[id].pop ? ['emotePop'] : [];
}

/* The picker's tiles are <button>s, so the tap that makes a move also offers
   the menu click (ui/uiSfxDelegate.js); the move's own sound is the tap's
   sound, and stamping it makes the click stand down (BT_AUDIO.uiClick), as a
   door's knock does (enterBuilding). */
function ownTap() { try { BT_AUDIO._uiSpecificAt = BT_AUDIO._now(); } catch (e) { /* sound only */ } }

/** Your emoji emote or quick-chat line: its pop. */
export function ownEmoteSound() {
  try { cue('emotePop'); ownTap(); } catch (e) { /* sound only */ }
}

/** Your move, as you make it. */
export function ownMoveSound(id) {
  try { for (const n of moveCues(id)) cue(n); ownTap(); } catch (e) { /* sound only */ }
}

/** Another player's emote (`move` absent) or move at (x, y). */
export function peerMoveSound(S, x, y, move) {
  try {
    const list = move ? moveCues(move) : ['emotePop'];
    for (const n of list) cuePeer(S, n, x, y);
  } catch (e) { /* sound only */ }
}

/** Once a frame (BroTown's loop, beside updatePeerEmotes): other players'
 *  held poses as they begin, and the townsfolk's moves as they start -- the
 *  two that no message of their own announces. */
export function tickMoveSounds(S, now) {
  try {
    const others = S && S.others;
    if (others) {
      for (const id in others) {
        const o = others[id];
        if (!o) continue;
        /* only someone in your zone, drawn where they are (chat.js's rule for
           a moment; a far player's copy is parked, presence v2) */
        if ((o.zone || o.z || 'town') !== S.currentZone || o._away) continue;
        if (!o._mvKnownAt) o._mvKnownAt = now;
        if (!o._po || o._poSoundAt >= (o._poAt || 0)) continue;
        o._poSoundAt = now;
        if ((o._poAt || 0) - o._mvKnownAt >= PEER_KNOWN_MS && now - (o._poAt || 0) < FRESH_MS) {
          peerMoveSound(S, o.renderX != null ? o.renderX : o.x, o.renderY != null ? o.renderY : o.y, o._po);
        }
      }
    }
    const npcs = S && S.npcs;
    if (Array.isArray(npcs)) {
      for (const npc of npcs) {
        if (!npc || !Number.isFinite(npc.x) || !Number.isFinite(npc.y)) continue;
        const em = npc._emoteMove;
        if (em && now >= em.at && npc._mvSoundAt !== em.at) {
          npc._mvSoundAt = em.at;
          if (now - em.at < FRESH_MS) for (const n of moveCues(em.id)) cueAt(S, n, npc.x, npc.y, NPC_K);
        }
        if (npc._po && now >= (npc._poAt || 0) && npc._poSoundAt !== npc._poAt) {
          npc._poSoundAt = npc._poAt;
          if (now - (npc._poAt || 0) < FRESH_MS) for (const n of moveCues(npc._po)) cueAt(S, n, npc.x, npc.y, NPC_K);
        }
      }
    }
  } catch (e) { /* sound only */ }
}
