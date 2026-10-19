import React, { useEffect, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COL, panelStyle, getState } from './common.js';
import { bestGuildRank } from './GuildPanel.jsx';   /* v2.3.3066: the guild line from the real ranks */
import { panelVw } from '../playViewport.js'; /* v2.3.2173: the sheet's width, not the shell's */
/* v2.3.1641: live status lines for the three destinations re-homed here. */
import { readyQuestCount } from '../sheet/questModel.js';
import { getFriendRows } from '../sheet/friendsModel.js';
import { friendsSrv } from '../sheet/friendsSync.js';
import { hasUnseenLevelUps } from '../sheet/skillsModel.js';
/* v2.3.2038: the Login Key tile's status line reads the real credential. */
import { getBtPassphrase } from '@/networking/index.js';
import { CODEX_KINDS, CODEX_TIERS } from '@/data/monsterCodex.js';   /* v2.3.3209 */
import { codexCounts, codexFreshCount } from '@/game/monsterCodex.js';   /* v2.3.3209 */
import { clanPartyOn } from '@/game/alliance.js';   /* v2.3.3481: the Clan tile's tooltip, once clans are parties */

// v2.3.1224: swapped to the UI Bible icon set (docs/UI-BIBLE.md Part 4,
// sliced by tools/process_icon_sheets.py); every tile has a real icon.
// Falls back to glyph if the image fails.
/* v2.3.1291 (ChatGPT round-3 §1): More owns genuinely SECONDARY
   systems only — six tiles.  MoreCompact renders this same list 3x2 —
   one roster, no drift.
   v2.3.1299 (round-6): per-tile iconScale (the journey asset carries
   more padding and rendered visibly smaller) and iconFilter (the
   settings gear needed a touch more contrast on the dark tile). */
/* v2.3.1641 (owner: "add skills, quests, and friends to more panel"):
   QUESTS, FRIENDS and LIFE SKILLS join.  They are not secondary systems —
   they are here because the nav rail shrank to Dashboard / Bag / More
   across v2.3.1638-1639 and these three lost their only entry point.
   Quests and Friends in particular were unreachable, not merely demoted.

   'Life Skills', not 'Skills'.  That collision is exactly why COMBAT
   could not be called Skills back at v2.3.1636: one word pointed at two
   different panels.  With the combat parents on the dashboard and the
   cooking/fishing/mining tree in here, spelling it out costs one word and
   removes the ambiguity for good. */
export const TILES = [
  { id: 'quests',      src: '/icons/ui/panel-quests.webp?v=2.3.1224',      label: 'Quests',   glyph: '📜', group: 'Progress',  iconScale: 1 },
  { id: 'skills',      src: '/icons/ui/nav-lifeskills.webp?v=2.3.1331',    label: 'Life Skills', glyph: '⛏', group: 'Progress', iconScale: 1 },
  { id: 'journey',     src: '/icons/ui/journey.webp?v=2.3.1224',           label: 'Journey',  glyph: '🛤', group: 'Progress',  iconScale: 1.18 },
  { id: 'encyclopedia', src: '/icons/ui/panel-encyclopedia.webp?v=2.3.1224', label: 'Codex',  glyph: '📚', group: 'Progress',  iconScale: 1 },
  { id: 'leaderboard', src: '/icons/ui/panel-leaderboard.webp?v=2.3.1224', label: 'Ranks',    glyph: '🏆', group: 'Progress',  iconScale: 1 },
  { id: 'social',      src: '/icons/ui/nav-friends.webp?v=2.3.1224',      label: 'Friends',  glyph: '👥', group: 'Community', iconScale: 1 },
  { id: 'clan',        src: '/icons/ui/panel-clan.webp?v=2.3.1224',        label: 'Clan',     glyph: '🛡', group: 'Community', iconScale: 1 },
  { id: 'guild',       src: '/icons/ui/panel-guild.webp?v=2.3.1224',       label: 'Guild',    glyph: '⚒', group: 'Community', iconScale: 1 },
  { id: 'settings',    src: '/icons/ui/panel-settings.webp?v=2.3.1224',    label: 'Settings', glyph: '⚙', group: 'System',    iconScale: 1, iconFilter: 'brightness(1.18) contrast(1.05)' },
  /* v2.3.2038 (owner: "is the character key retrievable once inside the
     game?").  It WAS -- More -> Settings -> Account has been wired through
     the panel registry since v2.3.1291 and a headless walk reaches it -- but
     three taps deep, behind a gear, under a row whose first word is
     "Account".  For the one string that is the ONLY way back to a character
     (no email recovery) that is too far to find while you still have the
     phone that holds it.  Promoted to a top-level tile.

     'Login Key', not 'Account'.  Nobody who is about to wipe a browser goes
     looking for an account page; they go looking for the key, which is also
     what the card, the login door and the owner all call it.  The panel
     header was renamed to match (BottomDashboard PANELS) so what you tapped
     and what opens carry the same name.

     It costs no row: the grid is 5 across and the roster was nine, so this
     lands in the empty tenth cell and nothing above it moves. */
  { id: 'account',     src: '/icons/ui/panel-account.webp?v=2.3.2038',     label: 'Login Key', glyph: '🔑', group: 'System',    iconScale: 1 },
  /* v2.3.3120: the Pets page (docs/PET-TRAPPING-PLAN.md: "More -> Pets, with
     the paw-print icon"), beside Life Skills, whose Trapping it belongs to */
  { id: 'pets',        src: '/icons/ui/evt-pets.webp?v=2.3.1232',            label: 'Pets',     glyph: '🐾', group: 'Progress',  iconScale: 1 },
];

/* v2.3.1299 (round-6): one short LIVE status line per destination —
   expanded More is an informative hub now, not the same six icons with
   more whitespace.  Every line reads real state; nothing invented
   (Journey is the travel LOG — neither achievements nor story, which
   also answers round-6's naming question; the Clan/Guild lines carry
   the player-clans vs profession-guilds distinction). */
function statusFor(id, S) {
  const R = S?.rpg || {};
  switch (id) {
    case 'journey': {
      const j = R.journey || S?.journey || {};
      const n = (j.entries || j.recent || []).length;
      /* v2.3.3481: the 2026-10-19 UI review -- "logged live" claimed more
         than the page does: nothing in the game or the server writes this
         log yet (docs/UI-DESIGN-NOTES.md, More's Still open) */
      return n > 0 ? `Travel log · ${n} entr${n === 1 ? 'y' : 'ies'}` : 'Your travels';
    }
    case 'encyclopedia': {
      /* v2.3.3209: the monster codex -- the monsters met and the pages with
         something new on them (game/monsterCodex.js; the old count read a
         list nothing wrote) */
      const met = CODEX_KINDS.filter((k) => codexCounts(S, k)[0] >= CODEX_TIERS.page).length;
      const fresh = codexFreshCount(S);
      if (fresh > 0) return `${fresh} new in the codex`;
      return met > 0 ? `${met} of ${CODEX_KINDS.length} monsters met` : 'Learn about the monsters you defeat';
    }
    case 'leaderboard': return 'View the leaderboards';
    /* v2.3.1641: same rule as every line above — real state only. */
    case 'quests': {
      const ready = readyQuestCount(S);
      return ready > 0 ? `${ready} ready to turn in` : 'Track your quests';
    }
    case 'skills':
      return hasUnseenLevelUps(R) ? 'New level-ups to view' : 'Cooking · Fishing · Mining';
    case 'social': {
      try {
        const actionable = friendsSrv.requestsIn().length + friendsSrv.unreadTotal();
        if (actionable > 0) return `${actionable} waiting`;
        const rows = getFriendRows(S);
        const online = rows.filter(r => r.online).length;
        if (online > 0) return `${online} online`;
        return rows.length > 0 ? `${rows.length} friend${rows.length === 1 ? '' : 's'}` : 'Add friends · direct messages';
      } catch (_e) { return 'Add friends · direct messages'; }
    }
    case 'clan': {
      /* v2.3.3481: the 2026-10-19 UI review -- once clans are parties
         (caps.clanparty, v2.3.3321) S._clanData is empty for everyone, so
         this said "Not joined · player clans" even to a player in a party.
         The page it opens shows the party (ClanPanel's PartyNowPage), so the
         tooltip reads the same thing: the party the worker last sent. */
      if (clanPartyOn(S)) {
        const p = S && S._party && S._party.state === 'open' ? S._party : null;
        const n = p && Array.isArray(p.members) ? p.members.length : 0;
        return p ? `Your party · ${n} member${n === 1 ? '' : 's'}` : 'Clans are parties now';
      }
      const c = S?._clanData;
      return c && (c.name || c.tag) ? (c.name || c.tag) : 'Not joined · player clans';
    }
    case 'guild': {
      /* v2.3.3066: every player is in every skill guild, ranked by the skill's
         level; `R.guild` / `S._guild`, read here before, is set by nothing, so
         this said "Not joined" to everyone (dash/GuildPanel.jsx) */
      const best = bestGuildRank(R);
      return best ? `${best.rank.title} · ${best.guild.name}` : 'Novice in every skill guild';
    }
    /* v2.3.3120: real state, like every line above */
    case 'pets': {
      const n = S && S._petBook && Array.isArray(S._petBook.list) ? S._petBook.list.length : 0;
      return n > 0 ? `${n} pet${n === 1 ? '' : 's'}` : 'Trap a monster to tame it';
    }
    case 'settings': return 'Sound · Controls · Login Key · Feedback · Privacy';   /* v2.3.2820: + volume sliders and the About page */
    /* v2.3.2038: real state, like every line above -- a guest tab genuinely
       has no key, and saying "save it somewhere safe" there would be a lie. */
    case 'account': {
      try { return getBtPassphrase() ? 'Save it — it is your only way back' : 'Guest tab — no key'; }
      catch (_e) { return 'Save it — it is your only way back'; }
    }
    default: return '';
  }
}

const secHdr = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.10em',
  textTransform: 'uppercase',
  color: COL.muted,
  /* round-6 spacing: heading -> cards ~8px */
  padding: '0 4px 8px',
};

const cardBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: COL.wellSoft,
  border: `1px solid ${COL.tileBor}`,
  borderRadius: 10,
  color: COL.text,
  fontFamily: 'Source Sans 3, sans-serif',
  cursor: 'pointer',
  touchAction: 'manipulation',
  minWidth: 0,
  textAlign: 'left',
  padding: '10px 10px',
};

const Icon = ({ t, px }) => t.src ? (
  <img src={t.src} alt="" draggable={false}
    style={{
      width: Math.round(px * (t.iconScale || 1)),
      height: Math.round(px * (t.iconScale || 1)),
      objectFit: 'contain', flex: 'none',
      filter: t.iconFilter || 'none',
    }} />
) : <span style={{ fontSize: px - 6, flex: 'none' }}>{t.glyph}</span>;

/* v2.3.3215: the Codex has its own button on the dashboard's row now, and its
   tile here opens that same screen, lighting that button -- not a drill under
   More.  Its page is laid out for a destination's own height (all nine cards
   at once, the tabs pinned over a stage that fits under them), and a drill's
   "◂ CODEX" header would take 32 px of it. */
const OWN_BUTTON = new Set(['encyclopedia']);
const open = (id) => (OWN_BUTTON.has(id) ? dashboardPanelBus.open(id) : dashboardPanelBus.push(id));
const tile = (id) => TILES.find(t => t.id === id);

/* v2.3.1299 (ChatGPT round-6, owner-approved): expanded More = a
   STATUS HUB.  Progress: three status cards; Community: two wider
   cards that explain membership; Settings: ONE full-width horizontal
   card (its lonely three-column "System" row was the dead space that
   pushed the gear under the fold).  Tight vertical rhythm (8px heading
   gap, 16px between groups) + real bottom padding so the last card
   scrolls fully above the fade. */
export const MorePanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  /* v2.3.3481: the 2026-10-19 UI review -- sideways the grid is two across in
     rows of their own height (v2.3.2173), and six rows of 54 px tiles needed
     ~350 px of the ~313-322 the side column has: the sixth row's label (Login
     Key) sat in the scroller's clip and fade, against "every choice on one
     screen".  There each tile's picture is 24 px and its padding 2 px (~44 px
     a tile, ~290 px for all six rows); the same eleven tiles, order and
     words, and upright is untouched (six across, rows that fill the band). */
  const narrow = panelVw() < 260;

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* v2.3.1645 (owner: "for the More shrink down the icons so I can
          see all the choices in a smaller format for the space"): ONE
          compact grid of every destination, five across, instead of the
          v2.3.1299 status-hub layout.

          What that layout spent its height on: three section headings, a
          two-line live status line under every tile, and three different
          card shapes (3-up, 2-up, one full-width).  It was designed for a
          sheet about five times taller than the 93px an expanded panel
          gets since v2.3.1638, and at this size it was a scroll with two
          or three choices visible at a time — which is the opposite of
          what a "More" menu is for.

          The status lines are what actually goes: statusFor() is kept and
          still exported through the tooltip, so nothing that computed
          live state was thrown away, but a two-line caption per tile
          cannot coexist with seeing all nine at once.  Grouping goes too
          — headings cost a row each and the icons carry the distinction
          well enough at this count. */}
      {/* v2.3.1648 (owner: "the slots and info displayed currently don't meet
          a minimum size where users who can't see at smaller sizes struggle
          with it"): the band grew a third row at v2.3.1647 and this grid
          kept its v2.3.1645 sizes, so it drew two rows of 20px icons and
          left ~50px of the panel blank underneath.  The rows now STRETCH to
          fill the panel (gridAutoRows 1fr) and the icon goes 20 -> 30 with
          an 11px label — using the height the band already paid for rather
          than staying compact inside it. */}
      <div style={{
        display: 'grid',
        /* v2.3.2173 (owner: "the labels are getting cut off"): five
           columns in the skinny landscape column left ~38px per cell and
           the labels died ("Qu…", "Se…", "Lo…").  Two columns there —
           every word renders whole in a ~96px cell, ten items make five
           rows in the height the sideways pane has anyway.  Portrait
           keeps its five-across one-screen grid (v2.3.1648). */
        /* v2.3.3120: six across -- Pets made eleven, and a third row of one
           would have shrunk every tile to fit it (the rows stretch, 1fr) */
        gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        gridAutoRows: narrow ? undefined : '1fr',
        gap: 4,
        height: narrow ? undefined : '100%', boxSizing: 'border-box',
      }}>
        {['quests', 'skills', 'pets', 'social', 'clan', 'guild',
          'journey', 'encyclopedia', 'leaderboard', 'settings', 'account'].map(id => {
          const t = tile(id);
          if (!t) return null;
          return (
            <button key={id} className="bt-more-card"
              /* v2.3.2038: a hook that is the destination ID, not the label.
                 TRAPS §29 -- labels are owner-facing copy and get rewritten
                 (this very change renames one), and a selector keyed to a
                 renamed label does not fail loudly, it quietly finds nothing
                 and asserts nothing. */
              data-more-tile={id}
              onPointerUp={(e) => { e.stopPropagation(); open(id); }}
              title={`${t.label} — ${statusFor(id, S)}`}
              style={{
                ...cardBase,
                flexDirection: 'column', gap: 2, padding: narrow ? '2px 2px' : '4px 2px',
                justifyContent: 'center',
                minWidth: 0,
              }}>
              <Icon t={t} px={narrow ? 24 : 30} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: COL.text,
                lineHeight: 1.1, textAlign: 'center',
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
