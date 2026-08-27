/* ═══ v2.3.1675: "QUEST COMPLETE!" ═══
 *
 * Owner: "Make a 'Quest Complete!' message above the characters head when all
 * the required things have been gathered (similar to the level up text)."
 *
 * WHY A WATCHER RATHER THAN AN EVENT.  There is no moment on the wire to hang
 * this off.  A quest becomes completable when your BAG reaches a count — the
 * last remnant you pick up is an ordinary loot credit, identical to the fifty
 * before it, and the server does not know or care that it crossed a quest
 * threshold until you turn the quest in.  So the honest trigger is to watch
 * the same derived state the quest log already shows and fire on the edge.
 *
 * Deliberately cheap and deliberately edge-triggered:
 *   - polled at 2 Hz, not per frame.  deriveQuestLog runs each active quest's
 *     check() over the bag; at sixty times a second that is real work for a
 *     value that changes maybe twice an hour.
 *   - fires ONCE per quest per session.  The obvious bug here is a banner
 *     that re-fires every poll for as long as the quest stays ready — which
 *     is most of the time, since "ready" persists until you walk back to the
 *     giver.  The seen-set is what stops it.
 *   - memory-only (rule 11 shape): re-announcing after a reload is the right
 *     failure.  Persisting it would mean a player who reloads mid-arc never
 *     sees the message for a quest they completed while away.
 */
import { deriveQuestLog } from '@/ui/mobile/sheet/questModel.js';
import { pushDmgPopup } from './combatHelpers.js';
import { BT_AUDIO } from '@/data/index.js';

const POLL_MS = 500;

export function checkQuestComplete(S) {
  if (!S || !S.player || !S.rpg) return;
  const now = Date.now();
  if (S._qcNextPoll && now < S._qcNextPoll) return;
  S._qcNextPoll = now + POLL_MS;

  let ready;
  /* check() bodies read live S freely; a throw must never take down the
     frame loop this is called from (same defensive posture as the panels). */
  try { ready = deriveQuestLog(S).active.filter((a) => a.ready); }
  catch (e) { return; }
  if (!ready.length) return;

  if (!S._qcSeen) S._qcSeen = new Set();
  for (const { quest } of ready) {
    if (!quest || !quest.id) continue;
    if (S._qcSeen.has(quest.id)) continue;
    S._qcSeen.add(quest.id);

    /* ═══ v2.3.1985: IT HAS TO STILL BE THERE WHEN YOU LOOK UP ═══
       Owner: "Make the quest complete message (like actually right after
       getting the 4th snowman remains) stay longer on screen. It's there for
       half a second or less."

       It was, and for two compounding reasons, both of which came from these
       two floaters being pushed with no ttl at all:

       1. THE DEFAULT LIFE IS 1.5s, AND IT IS FADING FOR MOST OF IT.  The
          renderer fades a popup to nothing over ttl * 0.8, so the last of
          those 1.5 seconds is spent invisible and the readable window is
          nearer one second.  This message fires the instant the last item
          lands, which is mid-fight with your eyes on the monster — by the
          time you look up it has gone.

       2. A POPUP WITH NO TTL IS THE ONE THE BUFFER THROWS AWAY.  The live-
          popup budget is 24 (MAX_LIVE_POPUPS, combatHelpers), and when it is
          full the next push ages out the oldest popup that has no CUSTOM ttl
          — precisely to protect the long-lived ones.  These had none, so
          they were first in line, and killing the fourth snowman is exactly
          the moment the buffer is full of damage numbers, XP and gold.  That
          is the "half a second or less": not a fade, an eviction.

       Naming a ttl fixes both — it is the longer life AND the eviction
       exemption in one field.  4.5s matches the class of message this is
       (the screen-space QUEST COMPLETED! banner the owner has already had
       lengthened twice sits at 5.2s) without holding the world layer so long
       that it overlaps the next kill.

       `rise` is the other half and is why 4.5s is usable at all: at the
       default 40 px/s these would climb 180 px in that time and be somewhere
       over the trees.  12 px/s keeps them over the character who earned
       them, drifting just enough to read as a floater rather than a fixture. */
    var _qcTtl = 4.5;
    var _qcRise = 12;
    /* Same floater the level-up uses, at the same height above the head, so
       the two read as the same class of event (owner: "similar to the level
       up text").  Gold, because it is an invitation to go somewhere rather
       than a stat that changed. */
    pushDmgPopup(S, S.player.x, S.player.y - 70, 'Quest Complete!', '#f5c542',
      { ttl: _qcTtl, rise: _qcRise });
    /* The instruction underneath is the useful half: "complete" means
       "collected", not "finished" — you still have to walk back. */
    pushDmgPopup(S, S.player.x, S.player.y - 55,
      'Return to ' + (quest.npc || 'the quest giver'), '#ffe9bd',
      { ttl: _qcTtl, rise: _qcRise });
    try { if (BT_AUDIO && BT_AUDIO.beep) BT_AUDIO.beep(1180, 0.07, 0.10, 'sine'); } catch (e) { /* audio is never load-bearing */ }
  }
}

/* Turned in / abandoned quests drop out of `ready`, so a quest that somehow
   becomes ready again (an objective that can regress — a `collect` whose items
   were consumed and re-gathered) can announce once more.  Called from the
   turn-in path. */
export function clearQuestCompleteSeen(S, questId) {
  if (S && S._qcSeen && questId) S._qcSeen.delete(questId);
}
