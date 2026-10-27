import React from 'react';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { WHEEL_HALLS } from '@/data/wheelBuildingDoors.js';
import { mailList, mailAge } from '@/game/postOffice.js';
import { ITEM_NAMES } from '@/ui/mobile/dash/InventoryPanel.jsx';   /* v2.3.3481: the mail names items as the bag does */
import { AlliancePart } from './AlliancePart.jsx';   /* v2.3.3313: the alliance, at the top of the Saloon */
import { clanPartyOn } from '@/game/alliance.js';   /* v2.3.3321: clans are parties now */
import { wellRestedLeft, restLeftWords, REST_MS, REST_XP_PCT } from '@/game/rest.js';   /* v2.3.3539: the Hotel's rest, paid by the worker */

/* ═══ v2.3.3066: THE WHEEL'S HALLS — the Guild Hall, the Post Office, the Sheriff's Office ═══
 *
 * Three of the plan's "(new: ...)" buildings, opened onto systems the game
 * already has (data/wheelBuildingDoors.js WHEEL_HALL_DOORS says why each;
 * v2.3.3258 added a fourth, the Town Hall, and v2.3.3539 a fifth, the Hotel,
 * both below):
 *
 *   guildhall  your clan (ClanPanel: make one, run it, take up an invite)
 *              and the skill guilds (GuildPanel: ranks and their quests) --
 *              both whole and server-backed, and opened by nothing in play
 *              until now;
 *   post       your mail (game/postOffice.js: every delivery of this visit,
 *              what came while you were away included) and messages from
 *              friends (the Social panel);
 *   sheriff    a duel (the player list: pick someone, then Duel on their
 *              card) and the arena's sign-up (its own window since
 *              v2.3.3258, 'arena'; it was the Saloon's panel).
 *
 * A hall is a hallway: each row opens the panel that does the work, and
 * closes this one.  Lantern Slate, as every building panel
 * (docs/LANTERN-SLATE-SPEC.md; the tokens copied per panel, BankPanel's
 * note says why).
 */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', positive: '#55B98A'
};
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px', display: 'grid', gap: 10 };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '2px 0 -2px' };

function icon(src, emoji, size) {
  return (
    <img src={src} alt="" draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }} />
  );
}

function header(hall) {
  var h = WHEEL_HALLS[hall];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }}>
      {icon(h.icon, h.emoji, 26)}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 }}>{h.title}</div>
        <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>{h.sub}</div>
      </div>
    </div>
  );
}

/* one way through the hall: a big row that opens the panel doing the work */
function row(key, src, emoji, title, sub, onClick, badge) {
  return (
    <button key={key} type="button" data-hall-row={key} onClick={onClick}
      style={{ font: 'inherit', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 12px', textAlign: 'left',
        background: LS.raised, color: LS.txt1, border: '1px solid ' + LS.borderStrong, borderRadius: 10, cursor: 'pointer' }}>
      {icon(src, emoji, 30)}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: badge ? LS.positive : LS.txt2, marginTop: 2, lineHeight: 1.35 }}>{sub}</span>
      </span>
      <span aria-hidden="true" style={{ color: LS.brass, fontSize: 20, fontWeight: 700 }}>›</span>
    </button>
  );
}

function guildHall(props) {
  var S = props.stateRef.current || {};
  /* v2.3.3321: clans are parties now (server clanparty.js) -- the row says
     so and opens the clan window's pointer to the Saloon */
  if (clanPartyOn(S)) {
    return [
      row('clan', '/icons/ui/panel-clan.webp', '🏰', 'Clans are parties now', 'Make a party in the Saloon; at 20 active members it is an alliance', props.onClan, false),
      row('guild', '/icons/ui/panel-guild.webp', '🏛', 'Skill guilds', 'Your rank in each life skill’s guild, and its quests', props.onGuild),
    ];
  }
  var clan = S._clanData || null;
  var inv = S._pendingClanInvite;
  var invLive = !clan && inv && Date.now() - inv.ts < 120000;
  var clanSub = clan ? '[' + (clan.tag || '?') + '] ' + (clan.name || 'Your clan')
    : invLive ? 'Invite waiting: [' + inv.clanTag + '] ' + (inv.clanName || '') + ', from ' + inv.fromName
    : 'Make a clan, or join one when a clan leader invites you';
  return [
    row('clan', '/icons/ui/panel-clan.webp', '🏰', clan ? 'Your clan' : 'Clans', clanSub, props.onClan, invLive),
    row('guild', '/icons/ui/panel-guild.webp', '🏛', 'Skill guilds', 'Your rank in each life skill’s guild, and its quests', props.onGuild),
  ];
}

function postOffice(props) {
  var S = props.stateRef.current || {};
  var mail = mailList(S).slice(0, 12);
  var now = Date.now();
  return [
    <div key="mod" style={LS_MOD}>Your mail</div>,
    <div key="mail" data-hall-mail={mail.length}
      style={{ background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: mail.length ? '4px 0' : '12px', maxHeight: 220, overflowY: 'auto' }}>
      {mail.length ? mail.map(function (m, i) {
        /* v2.3.3481: the 2026-10-19 UI review -- "2× Meal garden stew" ->
           "2× Garden Stew": an item the bag has a name for is named so
           (postOffice.js keeps its key and count); the rest, and a line kept
           before this version, read the line's own words. */
        var what = m.key && ITEM_NAMES[m.key] ? m.n + '× ' + ITEM_NAMES[m.key] : m.what;
        return (
          <div key={i} data-mail-line="" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderTop: i ? '1px solid ' + LS.border : 'none' }}>
            {m.kind === 'gold' ? icon('/icons/popups/gold.webp', '🪙', 18) : icon('/icons/ui/evt-mail.webp', '📫', 18)}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: m.kind === 'gold' ? LS.brass : LS.txt1, fontVariantNumeric: 'tabular-nums' }}>{what}</span>
              {m.note ? <span style={{ display: 'block', fontSize: 11.5, color: LS.txt2, overflowWrap: 'anywhere' }}>{m.note}</span> : null}
            </span>
            <span style={{ fontSize: 11, color: LS.txt3, whiteSpace: 'nowrap' }}>{mailAge(m.ts, now)}</span>
          </div>
        );
      }) : (
        <div style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.45 }}>
          Nothing yet this visit. Sales, refunds, trade payouts and rewards come here, and so does anything that arrived while you were away.
        </div>
      )}
    </div>,
    row('messages', '/icons/ui/soc-friend.webp', '💬', 'Messages from friends', 'Write to a friend. They read it when they next come in.', props.onMessages),
  ];
}

/* v2.3.3258: the Town Hall -- asked what it should do, the owner chose a window
   with the two things its picture shows: the trophy case is the leaderboard (a
   ranking for every combat and life skill, the dashboard's Ranks page) and the
   painted map on the wall is the Wheel's world map. */
function townHall(props) {
  return [
    row('leaderboard', '/icons/ui/panel-leaderboard.webp', '🏆', 'Leaderboard', 'A ranking for every combat and life skill, and where you stand', props.onLeaderboard),
    /* v2.3.3552: "world", never "Wheel" -- a player never hears the map's shape named */
    row('map', '/icons/ui/nav-map.webp', '🗺', 'World map', 'The whole world: its lands and levels, camps, passes and gates, and where you are', props.onMap),
  ];
}

/* ═══ v2.3.3539: THE HOTEL -- A BED FOR THE NIGHT ═══
   The worker pays the rest (server/src/rest.js): full health, stamina and
   mana, and Well Rested, +10% of the XP a fight pays for half an hour.  One
   row, as every hall's: Rest closes the window and the answer is said over
   your bro (game/rest.js).  Above it, how long Well Rested has left, so a
   player can see a second rest only starts the half hour again. */
function hotel(props) {
  var S = props.stateRef.current || {};
  var left = wellRestedLeft(S);
  var mins = Math.round(REST_MS / 60000);
  return [
    <div key="now" data-hotel-rested={left > 0 ? 1 : 0}
      style={{ background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.45, color: left > 0 ? LS.positive : LS.txt2 }}>
      {left > 0
        ? 'You are Well Rested: +' + REST_XP_PCT + '% combat XP for ' + restLeftWords(left) + ' more.'
        : 'A night here fills your health, stamina and mana, and makes you Well Rested: +' + REST_XP_PCT + '% combat XP for ' + mins + ' minutes. Free.'}
    </div>,
    row('rest', '/ui/controls/sleep.webp?v=2.3.3526', '🛏', 'Rest',
      left > 0 ? 'Rest again to start the ' + mins + ' minutes over' : 'Full health, stamina and mana, then Well Rested', props.onRest),
  ];
}

function sheriff(props) {
  return [
    row('duel', '/icons/ui/soc-duel.webp', '⚔️', 'Duel a player', deskWords('Pick a player, then tap Duel on their card'), props.onPlayers),
    row('arena', '/icons/ui/evt-duel.webp', '🏟', 'The arena', 'Sign up for the gladiator arena', props.onArena),
  ];
}

export function WheelHallPanel(props) {
  var hall = props.hall;
  if (!WHEEL_HALLS[hall]) return null;
  var body = hall === 'guildhall' ? guildHall(props) : hall === 'post' ? postOffice(props) : hall === 'townhall' ? townHall(props)
    : hall === 'hotel' ? hotel(props) : sheriff(props);   /* v2.3.3539: + the Hotel */
  return (
    <div style={LS_WRAP} data-wheel-hall={hall}>
      {header(hall)}
      <div style={LS_BODY}>{body}</div>
    </div>
  );
}

/* ═══ v2.3.3258: THE SALOON IS WHERE A PARTY IS FORMED ═══
   The owner, on the Saloon's door: "I think the arena window is popping up in
   the wrong place ... the gladiator arena is showing 'saloon' behind it".  The
   Saloon's door ('party': today's town's TAVERN, "Form parties") had opened
   the Gladiator Arena since v2.3.881, when the arena lived in the panel named
   for parties (PartyPanel).  With the Saloon's picture behind every window
   that was plain to see.  The arena is its own window now ('arena', from the
   Sheriff's Office: duels and the arena), and the Saloon is what its name
   always said -- where you team up:
     - your party as the worker last said it (S._party, party.js _partyWire:
       you first, each member's level), or how a party works;
     - Invite a player (v2.3.3481; "Find a party" until then): the player
       list, where a player's card has Invite to Party (InspectPlayerPanel)
       -- the same list as the Sheriff's duel row.
   Nothing new on the wire: invites, the roster, party chat and the HUD are
   v2.3.1185's (docs/specs/party.md). */
export function SaloonPanel(props) {
  var S = props.stateRef.current || {};
  var party = S._party && S._party.state === 'open' && Array.isArray(S._party.members) && S._party.members.length ? S._party : null;
  var members = party ? party.members.slice().sort(function (a, b) { return (b.id === S.myId) - (a.id === S.myId); }) : [];
  /* v2.3.3284: a party lasts and holds 50 against a worker that says so
     (party.js PARTY.KEEP_MAX); the strip shows six, this list everyone */
  var keeps = !!(S._serverCaps && S._serverCaps.partykeep);
  /* v2.3.3481: the 2026-10-19 UI review -- the row was "Find a party", but it
     opens the player list, where you INVITE someone: the worker refuses an
     invite to anyone already in a party (party.js 'target-busy'), so this row
     can never find you one -- joining a party takes one of its members
     inviting you.  It says what it does now.  And with no party it comes
     FIRST, above the words on how a party works: held sideways it started
     below the screen's edge under them. */
  var inviteRow = row('party', '/icons/ui/soc-party.webp', '🍺', 'Invite a player', deskWords('Pick a player, then tap Invite to Party on their card'), props.onPlayers);
  return (
    <div style={LS_WRAP} data-saloon="">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }}>
        {icon('/icons/ui/bldg-tavern.webp', '🍺', 26)}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 }}>Saloon</div>
          <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>Team up with other bros</div>
        </div>
      </div>
      <div style={LS_BODY}>
        {/* v2.3.3313: the alliance a party of 20 active members becomes, its
            war, and the board (AlliancePart.jsx; caps.alliance only) -- FIRST,
            as an alliance's list of members runs to 50 rows */}
        <AlliancePart stateRef={props.stateRef} party={party} />
        <div style={LS_MOD}>Your party</div>
        {!members.length ? inviteRow : null}
        <div data-saloon-party={members.length}
          style={{ background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: members.length ? '4px 0' : '12px' }}>
          {members.length ? members.map(function (m, i) {
            return (
              <div key={m.id || i} data-party-member="" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderTop: i ? '1px solid ' + LS.border : 'none' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: LS.txt1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.id === S.myId ? 'You' : (m.name || 'Bro')}{party.leader === m.id ? ' · leader' : ''}
                </span>
                {(m.off || m.away) ? <span data-party-offline="" style={{ fontSize: 11.5, color: LS.txt3 }}>offline</span> : null}
                <span style={{ fontSize: 12, color: LS.txt2, fontVariantNumeric: 'tabular-nums' }}>Lv {m.level || 1}</span>
              </div>
            );
          }) : (
            <div style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.45 }}>
              {keeps
                ? "You're not in a party. Up to 50 bros can team up and stay together until they leave: you see each other's health, talk on the party chat, and go into dungeons four at a time."
                : "You're not in a party. Up to four bros can team up: you see each other's health, talk on the party chat, and go into dungeons together."}
            </div>
          )}
        </div>
        {members.length ? inviteRow : null}
      </div>
    </div>
  );
}
