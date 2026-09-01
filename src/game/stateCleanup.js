/* ═══ STATE CLEANUP — per-frame flag/timer expiry ═══ */
/* v2.3.815: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 7; behavior-frozen). The last simulation
   block before the render dispatch: expires transient flags/timers
   (block/level-up/death flashes, zone wipe, combo grace + next-extended,
   monster telegraphs, chat bubbles, ground splatter, impact rings) and
   marks expired ground loot. `_now` is block-local. Captures: S (param)
   + the two combo constants imported below. S is stateRef.current. */
import { SWING_COOLDOWN } from '@/data/index.js';

export function updateStateCleanup(S) {
        /* ── State cleanup flags ── */
        var _now = Date.now();
        if (S._blockFlash && _now - S._blockFlash > 200) S._blockFlash = null;
        if (S._levelUpFlash && _now - S._levelUpFlash > 800) S._levelUpFlash = null;
        /* v2.3.1747: the combo grace/decay timers lived here; the chain is gone. */
        if (S._deathFlash && _now - S._deathFlash > 500) S._deathFlash = null;
        if (S._zoneWipe && _now - S._zoneWipe.ts > 800) S._zoneWipe = null;
        if (S.monsters) S.monsters.forEach(function(m) { if (m._telegraphUntil && _now > m._telegraphUntil) m._telegraphUntil = null; });
        Object.keys(S.chatBubbles || {}).forEach(function(pid) {
          if (_now - (S.chatBubbles[pid] || {}).ts > 5000) delete S.chatBubbles[pid];
        });
        /* v2.3.2200: 30s -> 8s.  Marks now also spawn on HIT (not just
           kill) and fade out over their last 2s in the renderer — the
           owner's "stays for about 5-10 seconds" spec.  Keep this TTL
           and the renderer's GROUND_DECAL_MS in lockstep. */
        if (S.groundSplatter) S.groundSplatter = S.groundSplatter.filter(function(sp) { return _now - sp.ts < 8000; });
        if (S._impactRings) S._impactRings = S._impactRings.filter(function(r) { return _now - r.ts < 400; });
        if (S.groundLoot) S.groundLoot.forEach(function(loot) { if (loot.expiry && _now > loot.expiry) loot._expired = true; });
}
