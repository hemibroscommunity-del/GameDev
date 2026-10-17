import React from 'react';
import { allyBus, allyCapsOn, allyTagShown, waitWords } from '@/game/alliance.js';

/* ═══ v2.3.3313: THE SALOON'S ALLIANCE PART (server alliance.js) ═══
 *
 * docs/specs/alliance.md.  At the top of the Saloon (WheelHallPanel.jsx
 * SaloonPanel), against a worker with caps.alliance:
 *   - not an alliance yet: how many members count (active: played in the
 *     last 7 days and level 5 or more) against the 20 it takes, and what an
 *     alliance gets;
 *   - an alliance: its tag and name, how many count against the 15 it stays
 *     at; the leader's name-and-tag form (once a day); its war -- the score,
 *     the time left, the last kills -- or the leader's Declare war;
 *   - the board, for anyone: every alliance by active members, then levels.
 * Everything drawn is the worker's last word (party_state's `ally`,
 * alliance_rows); the buttons send a request and the answer redraws it.
 * Lantern Slate tokens, copied per panel (BankPanel's note says why). */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', positive: '#55B98A', danger: '#E26D6D'
};
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '2px 0 -2px' };
var WELL = { background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 8 };
/* 16 px: iPhone Safari zooms the page into any smaller input it focuses */
var INPUT = { font: 'inherit', fontSize: 16, minWidth: 0, padding: '7px 9px', borderRadius: 8, border: '1px solid ' + LS.borderStrong, background: LS.panel, color: LS.txt1 };
var BTN = { font: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '8px 12px', minHeight: 40, borderRadius: 9, border: '1px solid ' + LS.borderStrong, background: LS.raised, color: LS.txt1, cursor: 'pointer' };
var SMALL = { fontSize: 12, color: LS.txt2, lineHeight: 1.45 };

function bar(n, of, color) {
  var k = of > 0 ? Math.max(0, Math.min(1, n / of)) : 0;
  return (
    <div style={{ height: 8, borderRadius: 4, background: LS.panel, overflow: 'hidden', border: '1px solid ' + LS.border }}>
      <div style={{ width: Math.round(k * 100) + '%', height: '100%', background: color || LS.brass }} />
    </div>
  );
}

function tagLabel(tag) {
  var t = allyTagShown(tag);
  return t ? '[' + t + ']' : '';
}

/* the leader's name-and-tag form */
function NameForm(props) {
  var a = props.ally;
  var [name, setName] = React.useState(a.name || '');
  var [tag, setTag] = React.useState(a.tag || '');
  var wait = a.name && a.renameIn > 0 ? a.renameIn : 0;
  return (
    <div data-ally-nameform="" style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px', gap: 6 }}>
        <input data-ally-name="" aria-label="Alliance name" placeholder="Name (3-16)" maxLength={16} value={name}
          onChange={function (e) { setName(e.target.value); }} style={INPUT} />
        <input data-ally-tag="" aria-label="Alliance tag" placeholder="TAG" maxLength={4} value={tag}
          onChange={function (e) { setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} style={Object.assign({}, INPUT, { textTransform: 'uppercase' })} />
      </div>
      <button type="button" data-ally-save="" disabled={!!wait}
        onClick={function () { allyBus.name(props.S, name, tag); }}
        style={Object.assign({}, BTN, wait ? { opacity: 0.5, cursor: 'default' } : null)}>
        {a.name ? 'Rename' : 'Name your alliance'}
      </button>
      <div style={SMALL}>
        {wait ? 'You can rename it again in ' + waitWords(wait) + '.' : 'The name and tag are yours alone, and every member wears the tag. You can change them once a day.'}
      </div>
    </div>
  );
}

function WarPart(props) {
  var a = props.ally, S = props.S;
  var [foe, setFoe] = React.useState('');
  var w = a.war;
  if (w && w.them) {
    var left = Math.max(0, Math.ceil((w.endsIn || 0) / 60000));
    return (
      <div data-ally-war-on="" style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: LS.danger }}>War with {tagLabel(w.them.tag)} {w.them.name || ''}</span>
          <span data-ally-score="" style={{ fontSize: 16, fontWeight: 800, color: LS.txt1, fontVariantNumeric: 'tabular-nums' }}>{w.us | 0}–{w.them.score | 0}</span>
        </div>
        <div style={SMALL}>{left} min left. Kills count in No man's land, under its usual rules. Everyone who fights is paid at the end: 500 gold if you win, 50 if not.</div>
        {Array.isArray(w.kills) && w.kills.length ? (
          <div style={{ display: 'grid', gap: 2 }}>
            {w.kills.slice().reverse().map(function (k, i) {
              return (
                <div key={i} data-ally-kill="" style={{ fontSize: 12, color: k.mine ? LS.positive : LS.danger, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {k.mine ? '+1' : '−1'} · {k.k} beat {k.v}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }
  if (!props.leader) {
    return <div style={SMALL}>No war right now. Your leader can declare one on another alliance.</div>;
  }
  if (!a.tag) {
    return <div style={SMALL}>Name your alliance to fight wars.</div>;
  }
  var rest = a.warIn > 0 ? a.warIn : 0;
  return (
    <div data-ally-warform="" style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6 }}>
        <input data-ally-foe="" aria-label="Their tag" placeholder="Their tag" maxLength={4} value={foe}
          onChange={function (e) { setFoe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} style={Object.assign({}, INPUT, { textTransform: 'uppercase' })} />
        <button type="button" data-ally-war="" disabled={!!rest || !foe}
          onClick={function () { allyBus.war(S, foe); }}
          style={Object.assign({}, BTN, { color: LS.danger }, (rest || !foe) ? { opacity: 0.5, cursor: 'default' } : null)}>
          Declare war
        </button>
      </div>
      <div style={SMALL}>
        {rest ? 'Your alliance rests ' + waitWords(rest) + ' before its next war.'
          : 'A war lasts 30 minutes. Kills count in No man\'s land under its usual rules. Everyone who fights is paid: 500 gold if you win, 50 if not.'}
      </div>
    </div>
  );
}

function Board(props) {
  var b = allyBus.board;
  if (!b) return <div style={SMALL}>Asking…</div>;
  if (!b.rows.length) return <div data-ally-board-rows="0" style={SMALL}>No alliances yet. A party of 20 active members becomes one.</div>;
  return (
    <div data-ally-board-rows={b.rows.length} style={{ display: 'grid', gap: 0 }}>
      {b.rows.map(function (r, i) {
        var mine = b.mine && b.mine.rank === i + 1;
        return (
          <div key={i} data-ally-board-row="" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i ? '1px solid ' + LS.border : 'none' }}>
            <span style={{ width: 22, fontSize: 12, color: LS.txt3, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: mine ? LS.brass : LS.txt1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tagLabel(r.tag)} {r.name || 'Unnamed alliance'}
            </span>
            <span style={{ fontSize: 12, color: LS.txt2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.active | 0} active · Lv {r.total | 0}</span>
          </div>
        );
      })}
      {b.mine && b.mine.rank > b.rows.length ? (
        <div style={Object.assign({}, SMALL, { paddingTop: 6, color: LS.brass })}>Yours: #{b.mine.rank}, {b.mine.active | 0} active</div>
      ) : null}
    </div>
  );
}

export function AlliancePart(props) {
  React.useSyncExternalStore(allyBus.subscribe, allyBus.getSnapshot);
  var S = props.stateRef.current || {};
  var [boardOpen, setBoardOpen] = React.useState(false);
  if (!allyCapsOn(S)) return null;
  var party = props.party;
  var a = party && party.ally && typeof party.ally === 'object' ? party.ally : null;
  var leader = !!(party && party.leader === S.myId);
  var err = allyBus.error && Date.now() - allyBus.error.at < 12000 ? allyBus.error : null;
  var at = (a && a.at) || 20, drop = (a && a.drop) || 15;
  return (
    <>
      <div style={LS_MOD}>Alliance</div>
      {a ? (
        <div data-ally-on={a.on ? '1' : '0'} style={WELL}>
          {a.on ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span data-ally-title="" style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: LS.brass, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.tag ? tagLabel(a.tag) + ' ' + (a.name || '') : 'Unnamed alliance'}
                </span>
                <span style={{ fontSize: 12, color: LS.txt2, whiteSpace: 'nowrap' }}>{a.active | 0} active</span>
              </div>
              <div style={SMALL}>Members who played in the last 7 days and are level 5 or more count. It stays an alliance while {drop} of them do.</div>
              {leader ? <NameForm key={(a.name || '') + '|' + (a.tag || '')} ally={a} S={S} /> : null}
              <div style={{ height: 1, background: LS.border }} />
              <WarPart ally={a} S={S} leader={leader} />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span data-ally-clan={a.clan ? '1' : '0'} style={{ flex: 1, fontSize: 14, fontWeight: 700, color: a.clan ? LS.brass : LS.txt1 }}>
                  {a.tag ? tagLabel(a.tag) + ' ' + (a.name || '') + (a.clan ? '' : ' is resting') : 'Not an alliance yet'}
                </span>
                <span data-ally-progress="" style={{ fontSize: 13, fontWeight: 700, color: LS.brass, fontVariantNumeric: 'tabular-nums' }}>{a.active | 0}/{at}</span>
              </div>
              {bar(a.active | 0, at)}
              {/* v2.3.3320: a clan that became this party (server clanparty.js) */}
              {a.clan ? <div style={SMALL}>Your clan is this party now, and its members keep the tag.</div> : null}
              <div style={SMALL}>
                When {at} members have played in the last 7 days and are level 5 or more, your party becomes an alliance: a name and a tag on every member, wars with other alliances, and a place on the alliance board.
              </div>
            </>
          )}
          {err ? <div data-ally-error="" style={{ fontSize: 12.5, color: LS.danger }}>{err.text}</div> : null}
        </div>
      ) : (
        <div style={Object.assign({}, WELL, SMALL)}>A party of {at} active members becomes an alliance, with a name, a tag, wars and a place on the board.</div>
      )}
      <button type="button" data-ally-board=""
        onClick={function () { var open = !boardOpen; setBoardOpen(open); if (open) allyBus.askBoard(S); }}
        style={Object.assign({}, BTN, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <span>Alliance board</span>
        <span aria-hidden="true" style={{ color: LS.brass }}>{boardOpen ? '▾' : '›'}</span>
      </button>
      {boardOpen ? <div style={WELL}><Board /></div> : null}
    </>
  );
}
