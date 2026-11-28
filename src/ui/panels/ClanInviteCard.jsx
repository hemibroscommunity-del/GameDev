import React from 'react';
import { createPortal } from 'react-dom';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { act } from '@/game/actions.js';   /* v2.3.5190: the page's requests leave through the action door (card K PR 7) */
import { SAY } from '@/data/say/clanInvite.js';   /* v2.3.6320: its words, in the one table (docs/specs/player-words.md, W0) */
import { say, sayPieces } from '@/game/say.js';
import { menus3Active } from '../menus3/menus3Wire.js';   /* v2.3.6871: the one Card (card MN step 3) */
import { Menus3Card } from '../menus3/Menus3Card.jsx';

/* ═══ v2.3.3066: A CLAN INVITE YOU CAN TAKE UP ═══
 *
 * A clan leader's invite (InspectPlayerPanel's "Invite to [TAG]") reached
 * the player it was for -- gameEvents parked it on S._pendingClanInvite and
 * said "clan invite! (open Clans)" -- and went no further: the only Accept
 * button was in ClanPanel, which nothing in play opened any more (MenuBar is
 * hidden; the wheel menu that called it was replaced).  And the worker keeps
 * an invite 120 s (server/src/clans.js CLANS.INVITE_TTL), too short to walk
 * to the Wheel's Guild Hall from a land.  So the invite raises this card
 * wherever you are, as a duel challenge does (DuelRequestPanel, whose look
 * it shares): Accept sends the same clan_join_accept the ClanPanel's button
 * does (the worker validates it), "Not now" lets it lapse.  BroTown shows it
 * while the invite is live and you are in no clan, and takes it down when
 * either stops being so.
 */
export function ClanInviteCard(props) {
  var stateRef = props.stateRef, invite = props.invite, onDone = props.onDone;
  var accept = function () {
    var S = stateRef.current;
    if (S.channel) act('clan_join_accept', { inviter: invite.inviter });   /* v2.3.5190: through the action door (actions.js) */
    S._pendingClanInvite = null;
    if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, say(SAY, 'clanInvite.joining', { tag: invite.clanTag }), '#59BF91');
    onDone();
  };
  var later = function () {
    var S = stateRef.current;
    S._pendingClanInvite = null;
    onDone();
  };
  /* v2.3.6871 (card MN step 3): under ?menus3 the invite is the owner's one Card, its answers
     today's accept and "Not now" above, unchanged */
  if (menus3Active()) {
    return <Menus3Card kind="clan.invite" args={{ fromName: invite.fromName, clanTag: invite.clanTag, clanName: invite.clanName }}
      mark={{ 'data-clan-invite': '' }} onAnswer={function (a) { if (a === 'yes') accept(); else later(); }} />;
  }
  /* the font shorthand FIRST: after fontSize/fontWeight it would reset them */
  var btn = { font: 'inherit', flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
  return createPortal(
    <div className="bt-inspect" data-clan-invite=""
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(4,9,12,0.52)' }}
      onClick={function () { /* inert, as the duel card's: a stray tap must not answer for you */ }}>
      <div className="bt-inspect-card" onClick={function (e) { e.stopPropagation(); }}
        style={{ width: 'min(340px, calc(100vw - 24px))', background: '#1E2E34', border: '1px solid rgba(229,237,233,0.20)', borderRadius: 14, boxShadow: '0 14px 30px rgba(4,7,9,.38)', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#F4F0E7', marginBottom: 4 }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false} style={{ width: 24, height: 24, objectFit: 'contain' }}
            onError={function (e) { e.currentTarget.replaceWith(document.createTextNode('🏰')); }} />
          <span>{say(SAY, 'clanInvite.title')}</span>
        </div>
        <div style={{ fontSize: 13, color: '#B6C1BE', marginBottom: 4 }}>
          {sayPieces(SAY, 'clanInvite.invites', {
            from: <b key="from" style={{ color: '#F4F0E7' }}>{invite.fromName}</b>,
            clan: <b key="clan" style={{ color: '#D8AA58' }}>[{invite.clanTag}] {invite.clanName}</b>,
          })}
        </div>
        <div style={{ fontSize: 11, color: '#8D9B98', marginBottom: 12 }}>
          {say(SAY, 'clanInvite.howLong')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" data-clan-invite-accept="" onClick={accept}
            style={Object.assign({}, btn, { background: 'linear-gradient(180deg,#E3BC6E,#C8963F)', color: '#172126', border: '1px solid #D8AA58' })}>{say(SAY, 'clanInvite.accept')}</button>
          <button type="button" data-clan-invite-later="" onClick={later}
            style={Object.assign({}, btn, { background: '#293B41', color: '#F4F0E7', border: '1px solid rgba(229,237,233,.20)' })}>{say(SAY, 'clanInvite.later')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
