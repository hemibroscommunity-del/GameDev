import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState, openGameWindow } from './common.js';
import { clanPartyOn, allyTagShown } from '@/game/alliance.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state, identity strip with the clan icon, module header +
   44px member rows with right-aligned tabular levels.  Data reads,
   the members slice(0, 10) cap, and the 800ms refresh interval are
   unchanged. */
const secHdr = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.12em', color: COL.muted, margin: '12px 8px 4px',
};
/* v2.3.3066: the way into the clan window (src/ui/panels/ClanPanel.jsx),
   where a clan is made, run and joined -- this page only reads.  The
   no-clan state told players to call `window.__broLegacyUI?.clan?.()`. */
const btn = {
  font: 'inherit',   /* first: after fontSize/fontWeight the shorthand would reset them */
  display: 'block', width: 'calc(100% - 16px)', margin: '10px 8px 2px', minHeight: 44, borderRadius: 10,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const btnBrass = { ...btn, background: COL.accent, color: COL.onAccent, border: `1px solid ${COL.accent}` };
const btnRaised = { ...btn, background: COL.raised, color: COL.text, border: `1px solid ${COL.borderStrong}` };

/* ═══ v2.3.3321: CLANS ARE PARTIES NOW (server clanparty.js) ═══
   Against a worker with caps.clanparty this page shows the party you are in
   -- its tag, if it was your clan or is an alliance -- or how a party becomes
   an alliance, and its button opens the player list, where a party starts
   (a player's card, Invite to Party), as the Saloon's "Invite a player"
   ("Find a party" until v2.3.3481) does. */
function PartyNowPage({ S }) {
  const p = S && S._party && S._party.state === 'open' ? S._party : null;
  const a = p && p.ally && typeof p.ally === 'object' ? p.ally : null;
  const tag = a && (a.on || a.clan) ? allyTagShown(a.tag) : null;
  const n = p && Array.isArray(p.members) ? p.members.length : 0;
  return (
    <div style={panelStyle} data-dash-clan="party" data-dash-clanparty={tag || (p ? 'party' : 'none')}>
      {tag ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px' }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
            style={{ width: 28, height: 28, objectFit: 'contain', flex: '0 0 auto' }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              [{tag}] {a.name || ''}
            </div>
            <div style={{ fontSize: 12, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
              {a.on ? 'Alliance' : 'Your clan, now a party'} · {n} member{n === 1 ? '' : 's'} · {a.active | 0} active
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4, margin: '0 auto' }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
          <div style={{ fontSize: 13, color: COL.text, marginTop: 6, fontWeight: 700 }}>Clans are parties now</div>
        </div>
      )}
      <div style={{ fontSize: 12, color: COL.muted, lineHeight: 1.45, padding: '6px 12px 0' }}>
        {p ? 'Your party stays together when you log out. ' : deskWords('Make a party: pick a player and tap Invite to Party on their card. ')}
        A party of {(a && a.at) || 20} members who played in the last 7 days and are level 5 or more becomes an alliance, with a name and a tag on every member. Your alliance and the alliance board are in the Saloon in BroTown.
      </div>
      {/* v2.3.3481: the 2026-10-19 UI review -- "Find a party" -> "Invite a
          player": it opens the player list, where you invite someone; the
          worker refuses an invite to anyone already in a party, so it can
          never find you one (the Saloon's row says the same, WheelHallPanel.jsx) */}
      <button type="button" data-dash-find-party="" style={btnBrass} onClick={() => openGameWindow('playersOpen')}>
        Invite a player
      </button>
    </div>
  );
}

export const ClanPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  if (clanPartyOn(S)) return <PartyNowPage S={S} />;   /* v2.3.3321 */
  const clan = S?._clanData || null;

  if (!clan) {
    return (
      <div style={panelStyle} data-dash-clan="none">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
            style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
          <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>
            You aren't in a clan.
          </div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 4, lineHeight: 1.4, padding: '0 12px' }}>
            Make one, or join one when a clan leader invites you. Clans meet at
            the Guild Hall in BroTown.
          </div>
        </div>
        <button type="button" data-dash-open-clan="" style={btnBrass} onClick={() => openGameWindow('clanOpen')}>
          Make a clan
        </button>
      </div>
    );
  }

  const members = clan.members || [];
  return (
    <div style={panelStyle} data-dash-clan={clan.tag || 'clan'}>
      {/* Identity strip — icon + [TAG] name over the member count. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px' }}>
        <img src="/icons/ui/panel-clan.webp" alt="" draggable={false}
          style={{ width: 28, height: 28, objectFit: 'contain', flex: '0 0 auto' }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🛡')); }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>[{clan.tag}] {clan.name}</div>
          <div style={{ fontSize: 12, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <div style={secHdr}>Members</div>
      {members.slice(0, 10).map((m, i) => (
        <div key={m.id || i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
        }}>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13.5, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{m.name || m.id}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
            Lv {m.level ?? '–'}
          </span>
        </div>
      ))}
      <button type="button" data-dash-open-clan="" style={btnRaised} onClick={() => openGameWindow('clanOpen')}>
        Open the clan window
      </button>
    </div>
  );
};
