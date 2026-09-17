import React from 'react';

/* ═══ v2.3.2620: THE PLAYER ICON, IN ONE PLACE ═══
 *
 * Owner, of the marketplace: "Add the players tiny icon (similar to how the
 * player icons are displayed elsewhere in the game) next to their listing."
 *
 * "Similar to how they are displayed elsewhere" is the requirement, so this
 * is an EXTRACTION, not a new renderer. The rule it encodes was already
 * written twice, inline, in PlayerListPanel and InspectPlayerPanel:
 *
 *     the player's `avatar` when they have one,
 *     a disc in their colour bearing the first letter of their name when
 *     they do not.
 *
 * `avatar` is a Hemi Bro NFT image URL and only VERIFIED HOLDERS have one,
 * so the disc is the ordinary case and not a rare fallback — which is why it
 * has to look deliberate rather than like a missing image.
 *
 * PlayerListPanel now calls this instead of keeping its own copy, so there is
 * exactly one answer to "what does a player look like in a list" and the
 * marketplace cannot drift away from the player list.
 *
 * SIZED, not fixed: the list draws it at 28 and the marketplace at 18 (a
 * listing row is already carrying four lines of text and a price). The
 * proportions inside — the ring, the letter — scale with it, because a 1.5px
 * ring on an 18px disc reads as a smudge.
 *
 * The letter is derived, never sent: a name the server already gave us is
 * the only input, so there is nothing here a player has not already
 * published to everyone in the room.
 */
export function PlayerIcon({ name, color, avatar, size = 24, title }) {
  const px = Math.max(12, Math.round(Number(size) || 24));
  const letter = (typeof name === 'string' && name.trim())
    ? name.trim().charAt(0).toUpperCase()
    : '?';
  const common = {
    width: px, height: px, borderRadius: '50%', flexShrink: 0,
  };
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        title={title || name || undefined}
        draggable={false}
        style={{
          ...common,
          objectFit: 'cover',
          border: Math.max(1, Math.round(px / 19)) + 'px solid rgba(255,255,255,.2)',
        }}
        /* A broken or slow NFT proxy must not leave a torn image icon in a
           listing row; drop to nothing and let the row read as text. */
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      title={title || name || undefined}
      aria-hidden="true"
      style={{
        ...common,
        background: color || '#8D9B98',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(8, Math.round(px * 0.46)),
        fontWeight: 800,
        color: '#12181B',
        lineHeight: 1,
      }}
    >{letter}</div>
  );
}
