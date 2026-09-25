import React from 'react';

/* ═══ v2.3.2926: THE STATS & EQUIPMENT MENU — A PLACEHOLDER ═══
 *
 * Owner, on the player-card mockup: "Tapping the character profile picture
 * will bring up a new menu that shows stats and equipment.  Don't build it
 * out completely but leave a placeholder."
 *
 * So this is the door and the room's outline, nothing more: InspectPlayerPanel
 * swaps it in for the card when the portrait is tapped (same scrim, same card
 * chrome), Back swaps the card back, ✕ or a tap outside closes both.
 *
 * ── FOR WHOEVER BUILDS IT OUT ──
 * Everything it needs already reaches the client; nothing here needs a server
 * change.  `inspectPlayer.rpgData` is the peer's 2s `track` relay (BroTown.jsx
 * "Extended RPG data for inspect card", passed through server/src/index.js
 * TRACK_COSMETIC_KEYS as a bounded display blob -- client-reported, so it is a
 * picture of the player, never a fact to settle anything on):
 *     weapon, armor, shield, amulet            item names (shield/amulet null when empty)
 *     power, vitality, endurance, agility, mind  the five stats
 *     kills, pvpKills, pvpDeaths, deaths, quests, ap, dungeons, goldEarned,
 *     playtime (minutes), lifeTotal (sum of life-skill levels)
 *     clanTag, clanName, clanColor1
 * It is ABSENT for the first ~2s after a peer joins and for a peer whose tab
 * is backgrounded (no relay) -- the reason the owner's screenshots showed a
 * card with no stats -- so the built version needs an empty state too.
 * Until v2.3.2926 the card itself drew Equipment / Tier 1 Stats / Record from
 * it; that code is in git history (InspectPlayerPanel.jsx, v2.3.1232-1235).
 * `inspectPlayer.bro` is a peer's verified Hemi Bro TOKEN ID (a bare value,
 * server/src/broverify.js `ps.bro = tokenId`).  The old card read .ID /
 * .diScore / .rank off it and so drew three empty pills for every verified
 * owner; if it comes back here, read it as the id it is. */
export function PlayerProfilePanel({ inspectPlayer, face, onBack, onClose }) {
  return (
    <div
      className="bt-inspect-card bt-pcard bt-pcard--profile ls-scrollbody"
      data-profile="placeholder"
      onClick={(e) => e.stopPropagation()}
    >
      <button className="bt-inspect-close" aria-label="Close" onClick={onClose}>
        <img src="/icons/ui/soc-close.webp" alt="" draggable={false} />
      </button>
      <button className="bt-pprof-back" data-act="profile-back" onClick={onBack}>
        <span aria-hidden="true">‹</span> Back
      </button>
      <div className="bt-pcard-head">
        <div className="bt-pcard-face">{face}</div>
        <div className="bt-pcard-who">
          <div className="bt-pcard-name">{inspectPlayer.name}</div>
          {inspectPlayer.rpgLv ? (
            <div className="bt-pcard-meta"><span className="bt-pcard-lv">LV {inspectPlayer.rpgLv}</span></div>
          ) : null}
        </div>
      </div>
      <div className="bt-pcard-rule" aria-hidden="true" />
      <div className="bt-pprof-empty">
        <div className="bt-pprof-title">Stats &amp; Equipment</div>
        <p>Coming soon: {inspectPlayer.name}&rsquo;s gear, stats and record.</p>
      </div>
    </div>
  );
}
