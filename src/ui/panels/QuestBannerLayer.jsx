import React from 'react';
import { createPortal } from 'react-dom';
import { QuestBanner } from './questArt.jsx';

/* ═══ v2.3.3030: THE QUEST BANNER, IN THE OWNER'S GREEN BANNERS, OVER EVERYTHING ═══
 *
 * QUEST ACCEPTED! / QUEST COMPLETE! / QUEST REWARD -- BroTown's queue decides
 * WHICH banner and for how long (`questMsg`, QUEST_MSG_MS / _LONG_MS, the
 * `_setQuestMsg` bridge, all unchanged); this draws it with the owner's art
 * (questArt.jsx QuestBanner):
 *   completed  the big glowing banner with the crest's burst and sparkles,
 *              the reward on its last line; `compact` (the claim's
 *              confirmation window is up) smaller, at the top of the screen,
 *              clear of the window; `auto` (nothing to choose) the laurel
 *              check on its crest;
 *   accepted   the thin glowing banner;
 *   reward     the flat banner: the stashed piece's name and where it went.
 * (The first-join WELCOME plate keeps its own look and stays in BroTown: it is
 * the one banner with a control on it.)
 *
 * PORTALED TO THE BODY, and that is a fix, not a move.  `.brotown-wrap` is
 * position:fixed and so its own stacking context: inside it the banner's
 * z 71 could never beat the quest window's scrim (z 44, a body portal --
 * TRAPS §20), so the turn-in's QUEST COMPLETED! drew UNDER the dark scrim of
 * the very dialogue it was announcing.  mp-questbanner compared the two
 * z-index numbers (71 > 44) and passed; it now asks the page what is on top.
 *
 * The outer node and the keyed plate keep their old names and attributes
 * (`.bt-quest-banner[data-quest-banner]`, `.bt-quest-plate`, keyed by the
 * message's ts): the QA scenarios read and hide them by those, and the plate
 * keeps its CSS rise and fade (`--qm-out`).  pointer-events none: the very
 * next tap is usually a button underneath it. */
export function QuestBannerLayer(props) {
  var m = props.msg;
  if (!m || typeof document === 'undefined') return null;
  var compact = !!m.compact;
  var kind = m.kind === 'completed' || m.kind === 'reward' ? m.kind : 'accepted';
  var hasPay = !!(m.gold || m.xp);
  return createPortal(React.createElement('div', {
    className: 'bt-quest-banner',
    'data-quest-banner': m.kind,
    style: { position: 'fixed', inset: 0, zIndex: 71, pointerEvents: 'none' },
  }, React.createElement('div', {
    className: 'bt-quest-plate bt-qw-plate' + (compact ? ' bt-qw-plate--top' : ''),
    key: m.ts,
    style: {
      /* the plate is placed by its CENTRE (the rise keyframe translates it
         -50%,-50%), its height in game.css (.bt-qw-plate): the smaller one
         just under the top bar, the others a quarter of the way down, above
         a centred card's middle -- and both higher on a sideways phone */
      position: 'absolute', left: '50%',
      '--qm-out': (props.holdMs - 500) + 'ms',
    },
  }, React.createElement(QuestBanner, {
    kind: kind,
    compact: compact,
    auto: !!m.auto,
    title: m.title,
    gold: m.gold,
    xp: m.xp,
    /* the old one-line summary ("+25g · +30 XP") is drawn as the coin and
       XP figures when they are known; any other sub-line (the stashed
       armour's "In your bag -- equip it on your legs") as words */
    sub: hasPay ? null : m.sub,
  }))), document.body);
}
