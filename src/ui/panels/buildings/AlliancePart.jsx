import React from 'react';
import { allyBus, allyCapsOn, allyTagShown, waitWords } from '@/game/alliance.js';
import { draftGet, draftSet, draftDrop } from '@/game/allyDrafts.js';   /* v2.3.5524: what the leader typed outlives a rejoin */
import { SAY } from '@/data/say/alliancePart.js';   /* v2.3.6342: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';

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
  var a = props.ally, pid = props.pid;
  /* v2.3.5524: a rejoin makes this form again (the party is cleared at
     state_sync until re-sent): what was typed comes back (allyDrafts.js) */
  var [name, setNameRaw] = React.useState(function () { return draftGet('name', pid, a.name || ''); });
  var [tag, setTagRaw] = React.useState(function () { return draftGet('tag', pid, a.tag || ''); });
  var setName = function (v) { draftSet('name', pid, a.name || '', v); setNameRaw(v); };
  var setTag = function (v) { draftSet('tag', pid, a.tag || '', v); setTagRaw(v); };
  var wait = a.name && a.renameIn > 0 ? a.renameIn : 0;
  return (
    <div data-ally-nameform="" style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px', gap: 6 }}>
        <input data-ally-name="" aria-label={say(SAY, 'alliancePart.nameLabel')} placeholder={say(SAY, 'alliancePart.namePlaceholder')} maxLength={16} value={name}
          onChange={function (e) { setName(e.target.value); }} style={INPUT} />
        <input data-ally-tag="" aria-label={say(SAY, 'alliancePart.tagLabel')} placeholder={say(SAY, 'alliancePart.tagPlaceholder')} maxLength={4} value={tag}
          onChange={function (e) { setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} style={Object.assign({}, INPUT, { textTransform: 'uppercase' })} />
      </div>
      <button type="button" data-ally-save="" disabled={!!wait}
        onClick={function () { draftDrop('name', pid); draftDrop('tag', pid); allyBus.name(props.S, name, tag); }}
        style={Object.assign({}, BTN, wait ? { opacity: 0.5, cursor: 'default' } : null)}>
        {say(SAY, a.name ? 'alliancePart.rename' : 'alliancePart.nameIt')}
      </button>
      <div style={SMALL}>
        {wait ? say(SAY, 'alliancePart.renameWait', { wait: waitWords(wait) }) : say(SAY, 'alliancePart.nameRule')}
      </div>
    </div>
  );
}

function WarPart(props) {
  var a = props.ally, S = props.S, pid = props.pid;
  var [foe, setFoeRaw] = React.useState(function () { return draftGet('foe', pid, ''); });   /* v2.3.5524: kept across a rejoin (allyDrafts.js) */
  var setFoe = function (v) { draftSet('foe', pid, '', v); setFoeRaw(v); };
  var w = a.war;
  if (w && w.them) {
    var left = Math.max(0, Math.ceil((w.endsIn || 0) / 60000));
    return (
      <div data-ally-war-on="" style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: LS.danger }}>{say(SAY, 'alliancePart.warWith', { tag: tagLabel(w.them.tag), name: w.them.name || '' })}</span>
          <span data-ally-score="" style={{ fontSize: 16, fontWeight: 800, color: LS.txt1, fontVariantNumeric: 'tabular-nums' }}>{w.us | 0}–{w.them.score | 0}</span>
        </div>
        <div style={SMALL}>{say(SAY, 'alliancePart.warLeft', { left: left })}</div>
        {Array.isArray(w.kills) && w.kills.length ? (
          <div style={{ display: 'grid', gap: 2 }}>
            {w.kills.slice().reverse().map(function (k, i) {
              return (
                <div key={i} data-ally-kill="" style={{ fontSize: 12, color: k.mine ? LS.positive : LS.danger, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {say(SAY, 'alliancePart.kill', { sign: k.mine ? '+1' : '−1', killer: k.k, victim: k.v })}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }
  if (!props.leader) {
    return <div style={SMALL}>{say(SAY, 'alliancePart.noWar')}</div>;
  }
  if (!a.tag) {
    return <div style={SMALL}>{say(SAY, 'alliancePart.nameFirst')}</div>;
  }
  var rest = a.warIn > 0 ? a.warIn : 0;
  return (
    <div data-ally-warform="" style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6 }}>
        <input data-ally-foe="" aria-label={say(SAY, 'alliancePart.theirTag')} placeholder={say(SAY, 'alliancePart.theirTag')} maxLength={4} value={foe}
          onChange={function (e) { setFoe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} style={Object.assign({}, INPUT, { textTransform: 'uppercase' })} />
        <button type="button" data-ally-war="" disabled={!!rest || !foe}
          onClick={function () { draftDrop('foe', pid); allyBus.war(S, foe); }}
          style={Object.assign({}, BTN, { color: LS.danger }, (rest || !foe) ? { opacity: 0.5, cursor: 'default' } : null)}>
          {say(SAY, 'alliancePart.declare')}
        </button>
      </div>
      <div style={SMALL}>
        {rest ? say(SAY, 'alliancePart.resting', { wait: waitWords(rest) })
          : say(SAY, 'alliancePart.warRule')}
      </div>
    </div>
  );
}

function Board(props) {
  var b = allyBus.board;
  if (!b) return <div style={SMALL}>{say(SAY, 'alliancePart.asking')}</div>;
  /* v2.3.3481: the review -- says who counts, as the Saloon's line does */
  if (!b.rows.length) return <div data-ally-board-rows="0" style={SMALL}>{say(SAY, 'alliancePart.noAlliances')}</div>;
  return (
    <div data-ally-board-rows={b.rows.length} style={{ display: 'grid', gap: 0 }}>
      {b.rows.map(function (r, i) {
        var mine = b.mine && b.mine.rank === i + 1;
        return (
          <div key={i} data-ally-board-row="" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i ? '1px solid ' + LS.border : 'none' }}>
            <span style={{ width: 22, fontSize: 12, color: LS.txt3, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: mine ? LS.brass : LS.txt1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tagLabel(r.tag)} {r.name || say(SAY, 'alliancePart.unnamed')}
            </span>
            <span style={{ fontSize: 12, color: LS.txt2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{say(SAY, 'alliancePart.boardStats', { active: r.active | 0, total: r.total | 0 })}</span>
          </div>
        );
      })}
      {b.mine && b.mine.rank > b.rows.length ? (
        <div style={Object.assign({}, SMALL, { paddingTop: 6, color: LS.brass })}>{say(SAY, 'alliancePart.yours', { rank: b.mine.rank, active: b.mine.active | 0 })}</div>
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
      <div style={LS_MOD}>{say(SAY, 'alliancePart.title')}</div>
      {a ? (
        <div data-ally-on={a.on ? '1' : '0'} style={WELL}>
          {a.on ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span data-ally-title="" style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: LS.brass, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.tag ? tagLabel(a.tag) + ' ' + (a.name || '') : say(SAY, 'alliancePart.unnamed')}
                </span>
                <span style={{ fontSize: 12, color: LS.txt2, whiteSpace: 'nowrap' }}>{say(SAY, 'alliancePart.active', { active: a.active | 0 })}</span>
              </div>
              <div style={SMALL}>{say(SAY, 'alliancePart.stays', { drop: drop })}</div>
              {leader ? <NameForm key={(a.name || '') + '|' + (a.tag || '')} ally={a} S={S} pid={party.id} /> : null}
              <div style={{ height: 1, background: LS.border }} />
              <WarPart ally={a} S={S} leader={leader} pid={party.id} />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span data-ally-clan={a.clan ? '1' : '0'} style={{ flex: 1, fontSize: 14, fontWeight: 700, color: a.clan ? LS.brass : LS.txt1 }}>
                  {a.tag ? tagLabel(a.tag) + ' ' + (a.name || '') + (a.clan ? '' : say(SAY, 'alliancePart.isResting')) : say(SAY, 'alliancePart.notYet')}
                </span>
                <span data-ally-progress="" style={{ fontSize: 13, fontWeight: 700, color: LS.brass, fontVariantNumeric: 'tabular-nums' }}>{a.active | 0}/{at}</span>
              </div>
              {bar(a.active | 0, at)}
              {/* v2.3.3321: a clan that became this party (server clanparty.js) */}
              {a.clan ? <div style={SMALL}>{say(SAY, 'alliancePart.clanNow')}</div> : null}
              <div style={SMALL}>
                {say(SAY, 'alliancePart.becomes', { at: at })}
              </div>
            </>
          )}
          {err ? <div data-ally-error="" style={{ fontSize: 12.5, color: LS.danger }}>{err.text}</div> : null}
        </div>
      ) : (
        /* v2.3.3481: the 2026-10-19 UI review -- "active" was never said:
           a member counts when level 5 or more and played in the last 7
           days (server alliance.js ACTIVE_LEVEL, ACTIVE_MS), as the line a
           party member sees above already says. */
        <div style={Object.assign({}, WELL, SMALL)}>{say(SAY, 'alliancePart.howTo', { at: at })}</div>
      )}
      <button type="button" data-ally-board=""
        onClick={function () { var open = !boardOpen; setBoardOpen(open); if (open) allyBus.askBoard(S); }}
        style={Object.assign({}, BTN, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <span>{say(SAY, 'alliancePart.board')}</span>
        <span aria-hidden="true" style={{ color: LS.brass }}>{boardOpen ? '▾' : '›'}</span>
      </button>
      {boardOpen ? <div style={WELL}><Board /></div> : null}
    </>
  );
}
