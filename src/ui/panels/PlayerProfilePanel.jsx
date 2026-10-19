import React from 'react';
import { PetPortrait } from '@/ui/petPortrait.jsx';   /* v2.3.3120 */
import { PET_RARITY, compactCount } from './playerProfile.js';
import { GHOST_SRC } from '../mobile/sheet/equipModel.js';

/* ═══ v2.3.2926: THE INSPECT CARD ═══
 *
 * Owner, after the placeholder that stood here: "This is the direction I'm
 * going.  ChatGPT summary and mockup attached.  I plan to add somewhere you
 * can view this screen for your character too."
 *
 * The mockup, top to bottom, and what each part reads (playerProfile.js has
 * the whole model and which parts are real):
 *   head      portrait (tap: back to the player card), name + verified Hemi
 *             Bro badge, an LV pill, the relationship (🙂 Friend -- a party
 *             mate's "In party" is the dock's first button instead),
 *             achievement points, quests completed, and a leaderboard button
 *   tags      the equipped title (gold) and the clan with its emblem --
 *             "No Clan" when there is none
 *   ─ ◆ ─
 *   combat    Melee · Bow · Magic, the three trained levels and nothing more
 *             ("not the full Points menu")
 *   equip     the six equipment slots as sprites, no words
 *   ─ ◆ ─
 *   showcase  lifetime kills and the rarest drop on the left, the Homestead
 *             (farm picture, pet, plots ready) on the right
 *   dock      Invite to Party · Trade · Duel -- "visually distinct: darker
 *             footer, stronger divider, brighter borders, bigger icons".
 *             Not on your own card: there is nobody to invite.
 * The direction's "Do not turn this into a giant character-stat screen" is
 * why there is no HP / mana / crit here, and "Do Not Add an Accordion Yet" is
 * why every section is always open.
 *
 * STRUCTURE: the card is a fixed frame (close button, corner brackets) around
 * ONE scrolling body, whose last child is the dock, stuck to the body's
 * bottom edge.  On a screen tall enough -- the owner's 390x844 portrait --
 * nothing scrolls.  On a shorter one the body scrolls UNDER the dock, so
 * Party / Trade / Duel are never below a fold.  (The brackets are drawn on
 * the frame, which does not scroll, so they stay in the corners.)
 *
 * It is purely presentational: every number comes from getProfile(), which
 * InspectPlayerPanel supplies, and every action is a callback it passes in --
 * the dock runs the SAME handlers as the card's tiles, so a Trade from here
 * and a Trade from the card cannot behave differently.  The one timer
 * re-reads the profile once a second, so a player's numbers fill in when
 * their 2s relay lands after the card opened. */

const BRO_BADGE = '/icons/ui/verified-bro-small.webp';
const COMBAT = [
  ['melee', 'Melee', '/icons/ui/hero/melee.webp?v=2.3.1311'],
  ['bow', 'Bow', '/icons/ui/hero/bow.webp?v=2.3.1311'],
  /* MAGIC, as the rest of the game names it (PROG3_SKILL_META, the
     leaderboard).  The owner's mockup said Staff; asked, the owner chose
     "You can do magic."  The key stays 'staff' -- prog3's own category id. */
  ['staff', 'Magic', '/icons/ui/hero/magic.webp?v=2.3.1311'],
];

/* An icon with a text fallback, like the card's socIcon: a SPAN replaces a
   failed image so the row keeps its shape. */
function Ic({ src, className, glyph }) {
  return (
    <img
      className={className}
      src={src}
      alt=""
      draggable={false}
      onError={(e) => {
        const s = document.createElement('span');
        s.className = (className || '') + ' bt-pcard-glyph';
        s.textContent = glyph || '';
        e.currentTarget.replaceWith(s);
      }}
    />
  );
}

/* the mockup's gold AP star */
function Star() {
  return (
    <svg className="bt-pin-star" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 .9l2.1 4.5 4.9.6-3.6 3.4.9 4.9L8 11.9l-4.3 2.4.9-4.9L1 6l4.9-.6z"
        fill="#F2C45A" stroke="#8A5A12" strokeWidth=".8" strokeLinejoin="round" />
    </svg>
  );
}

/* The magnifier on the portrait: the cue that the picture is a door.  The
   player card draws it too, on the button that opens this card. */
export function Lens() {
  return (
    <span className="bt-pin-lens" aria-hidden="true">
      <img src="/icons/ui/panel-self.webp" alt="" draggable={false} />
    </span>
  );
}

const dash = (v) => (v == null ? '–' : v);

/**
 * getProfile  () => profile (playerProfile.js profileFromPeer / profileFromSelf)
 * face        the portrait element (the card's generated pixel portrait)
 * onPortrait  back to the player card; omitted on your own card
 * onClose     close everything
 * onOpen      (panelId) open a dashboard destination -- 'leaderboard', 'encyclopedia'
 * dock        { party: {state:'invite'|'member', onClick} | null, trade, duel } | null
 */
export function PlayerProfilePanel({ getProfile, face, onPortrait, onClose, onOpen, dock }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((n) => (n + 1) % 1e6), 1000);
    return () => clearInterval(id);
  }, []);

  const p = getProfile();
  const self = p.isSelf;
  const rel = p.relationship || {};
  const pet = p.pet;
  const rar = (pet && PET_RARITY[pet.rarity]) || PET_RARITY.normal;
  const title = p.equippedTitle;
  /* v2.3.3485: the rarest ACHIEVEMENT (was a placeholder "rarest drop"):
     undefined until another player's blob lands, null for none */
  const rarest = p.showcase.rarest;
  const plots = p.homestead.plotsReady;
  const open = (id) => () => { if (onOpen) onOpen(id); };

  return (
    <div
      className={'bt-inspect-card bt-pcard bt-pin' + (self ? ' is-self' : '')}
      data-profile={self ? 'self' : 'player'}
      data-loaded={p.loaded ? '1' : '0'}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="bt-inspect-close" aria-label="Close" onClick={onClose}>
        <img src="/icons/ui/soc-close.webp" alt="" draggable={false} />
      </button>

      <div className="bt-pin-body ls-scrollbody">
        {/* ═══ HEAD ═══ */}
        <div className="bt-pin-head">
          {onPortrait ? (
            <button className="bt-pcard-face bt-pin-face" data-act="profile-back"
              aria-label="Back to the player card" title="Back" onClick={onPortrait}>
              {face}<Lens />
            </button>
          ) : (
            <div className="bt-pcard-face bt-pin-face">{face}</div>
          )}
          <div className="bt-pin-id">
            <div className="bt-pin-name">
              <span className="bt-pin-nm">{p.name}</span>
              {p.isHemiBroVerified && (
                <img className="bt-pin-bro" src={BRO_BADGE} draggable={false}
                  alt="Verified Hemi Bro"
                  title={'Verified Hemi Bro' + (p.broTokenId != null ? ' #' + p.broTokenId : '')
                    + (p.hemiBroCount > 0 ? ' \u00b7 ' + p.hemiBroCount + ' held' : '')} />
              )}
            </div>
            <div className="bt-pin-meta">
              {p.characterLevel != null && <span className="bt-pcard-lv">LV {p.characterLevel}</span>}
              {/* Friend only: a party mate's "In party" is the dock's first
                  button, and both badges plus the points wrapped this row */}
              {rel.friend && (
                <span className="bt-pcard-rel" data-rel="friend">
                  <Ic className="bt-pcard-ic" src="/icons/ui/soc-friend.webp" glyph="🙂" />Friend
                </span>
              )}
              <span className="bt-pin-ap" title="Achievement points" data-stat="ap">
                <Star />{p.achievementPoints == null ? '–' : compactCount(p.achievementPoints)} AP
              </span>
              {/* v2.3.3255: how many Hemi Bros their verified wallet holds -- the
                  owner: "It would be cool to list the number of hemi bros owned
                  somewhere on their profile".  The worker's count only
                  (broverify.js balanceOf); nothing with none. */}
              {p.hemiBroCount > 0 && (
                <span className="bt-pin-bros" data-stat="hemibros"
                  title="Hemi Bros held by their verified wallet">
                  <img src={BRO_BADGE} alt="" draggable={false} />
                  {compactCount(p.hemiBroCount)} Hemi Bro{p.hemiBroCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="bt-pin-row">
              <span className="bt-pin-quests" data-stat="quests">
                <Ic className="bt-pin-qi" src="/icons/ui/panel-quests.webp" glyph="📜" />
                <b>{p.questsCompleted == null ? '–' : compactCount(p.questsCompleted)}</b> Quests
              </span>
              <button className="bt-pin-iconbtn" data-act="leaderboard" aria-label="Leaderboard"
                title="Leaderboard" onClick={open('leaderboard')}>
                <Ic src="/icons/ui/panel-leaderboard.webp" glyph="🏆" />
              </button>
            </div>
          </div>
        </div>

        <div className="bt-pin-tags">
          {/* v2.3.3485: an achievement they chose (achievements.js
              _achvTitle), or none -- was the placeholder "Fishing Master";
              a tap opens the Achievements page */}
          {title && (
            <button type="button" className="bt-pin-title" data-achv={title.id} data-tier={title.tier}
              title="Title: an achievement" onClick={open('achievements')}>
              <Ic src={title.iconSrc} glyph={title.glyph || '🎖️'} />
              <span>{title.text}</span>
            </button>
          )}
          <span className={'bt-pin-clan' + (p.clan ? '' : ' is-none')} data-stat="clan">
            <Ic className="bt-pin-clanic" src="/icons/ui/clan.webp" glyph="👥" />
            <span className="bt-pin-clannm">
              {p.clan ? (p.clan.name || '[' + p.clan.tag + ']') : 'No Clan'}
            </span>
            {/* the clan's own emblem is a system for later; until then the
                emblem is the clan's real tag on its real colour */}
            {p.clan && (
              <span className="bt-pin-emblem" data-preview="1" title={'[' + p.clan.tag + ']'}
                style={{ '--clan': p.clan.color || '#9A76D3' }}>
                <span>{p.clan.tag}</span>
              </span>
            )}
          </span>
        </div>

        <div className="bt-pcard-rule" aria-hidden="true" />

        {/* ═══ COMBAT + EQUIPMENT ═══ */}
        <div className="bt-pin-combat">
          {COMBAT.map(([k, label, src]) => (
            <div className="bt-pin-cb" key={k} data-skill={k}>
              <Ic src={src} glyph="⚔" />
              <span className="bt-pin-cbl">{label}</span>
              <b>{dash(p.combat && p.combat[k])}</b>
            </div>
          ))}
        </div>
        <div className="bt-pin-equip" role="list" aria-label="Equipment">
          {p.equipment.map((s) => (
            <div key={s.slot} role="listitem" data-slot={s.slot}
              className={'bt-pin-slot' + (s.ghost ? ' is-empty' : '')}
              title={s.ghost ? 'No ' + s.label.toLowerCase() : (s.name || s.label)}
              aria-label={s.ghost ? 'No ' + s.label.toLowerCase() : (s.name || s.label)}>
              <img src={s.ghost ? GHOST_SRC[s.slot] : s.iconSrc} alt="" draggable={false} />
            </div>
          ))}
        </div>

        <div className="bt-pcard-rule" aria-hidden="true" />

        {/* ═══ SHOWCASE ═══ */}
        <div className="bt-pin-show">
          <div className="bt-pin-col">
            <div className="bt-pin-kills" data-stat="kills">
              <Ic src="/icons/ui/hero/rec-kills.webp" glyph="💀" />
              <div>
                <b>{compactCount(p.showcase.lifetimeKills)}</b>
                <span>Lifetime Kills</span>
              </div>
            </div>
            {/* v2.3.3485: the rarest achievement, the worker's pick
                (achievements.js ACHV.RARITY), in its tier's colour; a tap
                opens the Achievements page */}
            {rarest !== undefined && (
              <button type="button" className="bt-pin-drop" data-stat="rarest"
                data-rarest={rarest ? rarest.id : 'none'} data-tier={rarest ? rarest.tier : 'none'}
                aria-label={rarest ? 'Rarest achievement: ' + rarest.name : 'No achievements yet'}
                onClick={open('achievements')}>
                {rarest ? (
                  <>
                    <div className="bt-pin-drop-art"><Ic src={rarest.iconSrc} glyph={rarest.glyph} /></div>
                    <span className="bt-pin-drop-r">{rarest.tierLabel} achievement</span>
                    <b className="bt-pin-drop-n">{rarest.name}</b>
                  </>
                ) : (
                  <>
                    <span className="bt-pin-drop-r">Rarest achievement</span>
                    <b className="bt-pin-drop-n is-none">None yet</b>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="bt-pin-home" data-stat="homestead">
            <div className="bt-pin-scene" data-preview="1">
              <img src={p.homestead.previewSrc} alt="" draggable={false} />
              <span className="bt-pin-home-t">Homestead</span>
              {pet && <span className="bt-pin-petsprite" aria-hidden="true">{pet.kind
                ? <PetPortrait pet={{ kind: pet.kind, stage: pet.stage, gold: pet.gold }} size={30} />   /* v2.3.3120: drawn, from the pet sheet */
                : pet.emoji}</span>}
            </div>
            {pet && (
              <div className="bt-pin-pet" data-preview={pet.preview ? '1' : undefined}>
                <div className={'bt-pin-petname' + (pet.rarity === 'godly' ? ' is-godly' : '')}
                  style={rar.color ? { color: rar.color } : undefined} title={rar.label}>
                  {pet.customName}
                </div>
                <div className="bt-pin-species">
                  <span>{pet.speciesName || 'Pet'}</span>
                  <button className="bt-pin-iconbtn is-small" data-act="codex"
                    aria-label="Open the Codex" title="Codex" onClick={open('encyclopedia')}>
                    <Ic src="/icons/ui/nav-codex.webp" glyph="📖" />
                  </button>
                </div>
              </div>
            )}
            <div className="bt-pin-plots" data-stat="plots">
              <Ic src="/icons/ui/skill-farming.webp" glyph="🌱" />
              <span><b>{dash(plots)}</b> {plots === 1 ? 'plot' : 'plots'} ready</span>
            </div>
          </div>
        </div>

        {/* ═══ THE COMMAND DOCK ═══
            Inside the scrolling body, stuck to its bottom edge (game.css
            position:sticky), so on a short screen the content scrolls UNDER
            it and the three actions never leave the screen. */}
        {!self && dock && (
          <div className="bt-pin-dock">
            {dock.party && (dock.party.state === 'member' ? (
              <div className="bt-pin-cmd is-party is-static" data-act="party" data-state="member" aria-disabled="true">
                <Ic className="bt-pcard-ic" src="/icons/ui/soc-party.webp" glyph="🎟️" /><span>In party</span>
              </div>
            ) : (
              <button className="bt-pin-cmd is-party" data-act="party" data-state="invite"
                aria-label="Invite to Party" onClick={dock.party.onClick}>
                <Ic className="bt-pcard-ic" src="/icons/ui/soc-party.webp" glyph="🎟️" />
                <span><span className="is-long">Invite to Party</span><span className="is-short">Invite</span></span>
              </button>
            ))}
            <button className="bt-pin-cmd is-trade" data-act="trade" onClick={dock.trade}>
              <Ic className="bt-pcard-ic" src="/icons/ui/soc-trade.webp" glyph="🤝" /><span>Trade</span>
            </button>
            <button className="bt-pin-cmd is-duel" data-act="duel" onClick={dock.duel}>
              <Ic className="bt-pcard-ic" src="/icons/ui/soc-duel.webp" glyph="⚔️" /><span>Duel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
