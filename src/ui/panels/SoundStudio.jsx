import React, { useEffect, useMemo, useState } from 'react';
import { COL } from '../mobile/dash/common.js';
import { BT_AUDIO } from '@/data/index.js';
import { EVENT_SOUNDS } from '@/data/eventSounds.js';
import { MONSTER_NOISE_CLIPS } from '@/data/monsterNoiseClips.js';
import { FOOTSTEP_CLIPS } from '@/data/footstepClips.js';
import { cue } from '@/game/eventSounds.js';
import { heardSounds, clearHeard } from '@/game/soundStudio.js';
import {
  STUDIO_SECTIONS, CUE_PLACES, HIT_VOICE_PLACES, PROP_PLACES, PROP_KINDS, SHOT_PLACES,
  ELEM_PLACES, NOISE_PLACES, STEP_PLACES, OTHER_PLAYS, SAMPLE_SOURCES,
} from '@/data/soundStudio.js';

/* ═══ v2.3.3523: THE SOUND STUDIO ═══
 *
 * The owner: "I think sounds were wired in the wrong places.  The labels
 * should tell you where they go.  Might need to build a quick studio to show
 * which sounds belong where."
 *
 * Every sound the game makes, under the moment it plays at (data/
 * soundStudio.js, in plain words), each with ▶ -- played by the game's own
 * BT_AUDIO and cue player, so it is exactly what the game plays where you stand
 * (outside the Wheel, a sound made from the Wheel's footstep recordings plays
 * its stand-in there too) -- and the recordings it is made of.  Tap a
 * recording to see every place it is used: a recording in two places that
 * should not share it is the "wired in the wrong place" this is for.
 * "Heard just now" names the last sounds the game played (game/soundStudio.js),
 * so a wrong one can be named the moment it is heard.
 *
 * The ▶ buttons make no menu click (data-uisfx="off"): the click would land
 * on the sound you are listening to.
 *
 * Opened from the Test panel ("Sound studio") or ?sounds in the address;
 * loaded only then, and gone when closed.  No game state is read or written:
 * it only plays sounds. */

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const keysOf = (layers) => [...new Set((layers || []).filter((L) => Array.isArray(L) && L[0]).map((L) => L[0]))];

/* what one of BT_AUDIO's helpers plays, for its recording chips */
function fnSamples(how, A) {
  const a = how.args || [];
  switch (how.fn) {
    case 'swordSwing': return (A.SWING_ROTATION || []).slice();
    case 'specialSwipe': return ['special-swipe'];
    case 'magicHit': return ['magic-hit', 'magic-hit2'];
    case 'monsterHitHero': return a[0] ? ['armor-hit-1', 'armor-hit-2'] : ['monster-hit'];
    case 'playerDeath': return ['monster-hit', 'flip-lose', 'skeleton-death'];
    case 'sprintPush': return A.SPRINT_PUSH ? [A.SPRINT_PUSH[0]] : [];
    case 'swimStroke': return keysOf(A.SWIM_STROKES);
    case 'swimSplash': return ['swim-splash'];
    case 'monsterDeath': return [a[0] === 'snowman' ? 'snowman-death' : a[0] === 'skeleton' ? 'skeleton-death' : 'monster-death'];
    case 'propBreak': return keysOf(A.PROP_SOUNDS && A.PROP_SOUNDS[a[0]] && A.PROP_SOUNDS[a[0]].brk);
    case 'uiClickNow': return ['ui-click'];
    case 'uiEquip': return ['ui-equip'];
    case 'uiTick': return [a[0]];
    default: return [];
  }
}

/** Every row of the studio: {id, section, label, what, samples, play}.  The
 *  ids are game/soundStudio.js's tags, so a heard sound finds its row. */
export function studioRows(A) {
  const rows = [];
  for (const name of Object.keys(EVENT_SOUNDS)) {
    const p = has(CUE_PLACES, name) ? CUE_PLACES[name] : ['you', name];
    rows.push({ id: 'cue:' + name, section: p[0], label: p[1], what: 'cue ' + name, samples: keysOf(EVENT_SOUNDS[name]), play: () => cue(name) });
  }
  for (const mat of Object.keys(A.HIT_VOICES || {})) {
    const V = A.HIT_VOICES[mat];
    rows.push({ id: 'hit:' + mat, section: 'hits', label: HIT_VOICE_PLACES[mat] || 'Your hit on ' + mat,
      what: 'hit voice ' + mat, samples: keysOf([...(V.hit || []), ...(V.layer || []), V.fb]),
      play: () => A.materialHit(mat, { vol: 0.55 }) });
  }
  for (const mat of Object.keys(A.PROP_SOUNDS || {})) {
    const P = A.PROP_SOUNDS[mat];
    const words = PROP_PLACES[mat] || mat;
    for (const [kind, fmt] of PROP_KINDS) {
      if (!P[kind]) continue;
      const layers = kind === 'hit' ? [...P.hit, P.layer, P.fb] : kind === 'big' ? [...P.big, P.bigLayer, P.layer] : P[kind];
      const play = kind === 'hit' ? () => A.propHit(mat, {}) : kind === 'big' ? () => A.propHit(mat, { big: true })
        : () => A.propBreak(mat, kind === 'brk' ? 'small' : kind);
      rows.push({ id: 'prop:' + mat + ':' + kind, section: 'world', label: fmt.replace('%s', words),
        what: 'object ' + mat + (kind === 'hit' ? '' : ' (' + kind + ')'), samples: keysOf(layers), play });
    }
  }
  for (const st of Object.keys(A.SHOT_SOUNDS || {})) {
    const B = A.SHOT_SOUNDS[st];
    rows.push({ id: 'shot:' + st, section: 'monsters', label: SHOT_PLACES[st] || 'A ball breaking: ' + st,
      what: 'ball ' + st, samples: keysOf([...(B.layers || []), B.fb]), play: () => A.shotHit(st, 'player') });
  }
  for (const st of Object.keys(A.ELEM_SOUNDS || {})) {
    rows.push({ id: 'elem:' + st, section: 'hurt', label: ELEM_PLACES[st] || 'A status on you: ' + st,
      what: 'status ' + st, samples: keysOf([A.ELEM_SOUNDS[st]]), play: () => A.elemHit(st) });
  }
  for (const clip of Object.keys(MONSTER_NOISE_CLIPS)) {
    rows.push({ id: 'noise:' + clip, section: 'monsters', label: NOISE_PLACES[clip] || 'A monster noise: ' + clip,
      what: 'monster noise ' + clip, samples: ['noise-' + clip], play: () => A.monsterNoise(clip, 1) });
  }
  for (const surf of ['dirt', ...Object.keys(FOOTSTEP_CLIPS).filter((k) => FOOTSTEP_CLIPS[k] !== FOOTSTEP_CLIPS.grass || k === 'grass')]) {
    rows.push({ id: 'step:' + surf, section: 'move', label: STEP_PLACES[surf] || 'A step on ' + surf,
      what: 'footstep ' + surf, samples: [surf === 'dirt' ? 'footstep-v3' : FOOTSTEP_CLIPS[surf].key],
      play: () => A.footstep(false, surf) });
  }
  for (const [id, section, label, how] of OTHER_PLAYS) {
    rows.push({ id: 'other:' + id, section, label,
      what: how.fn ? 'BT_AUDIO.' + how.fn : 'the recording on its own',
      samples: how.sample ? [how.sample] : fnSamples(how, A),
      play: () => (how.fn ? A[how.fn](...(how.args || [])) : A.play(how.sample, Object.assign({}, how.opts))) });
  }
  return rows;
}

/* A heard sound's row: its tag's, another player's version of one, or (a
   recording played straight) the first row that plays that recording. */
const PEER_ROWS = { peerSprint: 'other:sprint', peerSwimIn: 'other:swimIn', peerSwimOut: 'other:swimOut', peerStroke: 'other:swimStroke' };
function heardRow(m, byId, rows) {
  if (m.tag && has(byId, m.tag)) return { row: byId[m.tag], peer: false };
  if (m.tag && m.tag.indexOf('peer:') === 0) {
    const id = PEER_ROWS[m.tag.slice(5)];
    if (id && has(byId, id)) return { row: byId[id], peer: true };
  }
  const own = rows.find((r) => r.id.indexOf('other:') === 0 && r.samples.length === 1 && r.samples[0] === m.keys[0]);
  if (own) return { row: own, peer: false };
  return { row: null, peer: false };
}

/* the last sounds started, as moments: the samples of one cue or helper
   started together are one */
function heardMoments(menuToo) {
  const out = [];
  for (const e of heardSounds()) {
    const last = out[out.length - 1];
    const same = last && e.at - last.at < 80 && (e.tag ? last.tag === e.tag : (!last.tag && last.keys[0] === e.key));
    if (same) { if (last.keys.indexOf(e.key) < 0) last.keys.push(e.key); continue; }
    out.push({ at: e.at, tag: e.tag, keys: [e.key], seq: e.seq });
  }
  const quiet = /^other:ui(Click|Close)$/;
  return out.filter((m) => menuToo || !quiet.test(m.tag || '')).reverse();
}

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? s + ' s ago' : Math.round(s / 60) + ' min ago';
}

const wrap = {
  position: 'fixed', inset: 0, zIndex: 9810, background: COL.bg, color: COL.text,
  display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
  paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
};
const chipBtn = (on) => ({
  flex: '0 0 auto', minHeight: 36, padding: '0 12px', borderRadius: 18, cursor: 'pointer',
  border: '1px solid ' + (on ? COL.accent : COL.border), background: on ? COL.accentFill : COL.raised,
  color: on ? COL.accent : COL.text2, fontSize: 13, whiteSpace: 'nowrap',
});
const recChip = {
  display: 'inline-block', margin: '4px 6px 0 0', padding: '3px 8px', borderRadius: 10, cursor: 'pointer',
  background: COL.well, border: '1px solid ' + COL.border, color: COL.text2, fontSize: 11.5, lineHeight: 1.3,
};

export function SoundStudio({ onClose, tab: tab0 }) {
  const A = BT_AUDIO;
  const rows = useMemo(() => studioRows(A), [A]);
  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  const [tab, setTab] = useState(tab0 === 'heard' ? 'heard' : 'all');
  const [q, setQ] = useState('');
  const [section, setSection] = useState('');
  const [sample, setSample] = useState(null);
  const [menuToo, setMenuToo] = useState(false);
  const [, setTick] = useState(0);
  const [lastPlayed, setLastPlayed] = useState(null);

  /* the heard list moves while it is shown */
  useEffect(() => {
    if (tab !== 'heard') return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [tab]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose && onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const play = (row) => {
    try { if (!A.ctx && A.unlock) A.unlock(); } catch (e) { /* */ }
    try { row.play(); } catch (e) { /* sound only */ }
    setLastPlayed(row.id);
  };
  const pickSample = (k) => { setSample(k); setTab('all'); setSection(''); setQ(''); };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!section || r.section === section)
    && (!sample || r.samples.indexOf(sample) >= 0)
    && (!needle || (r.label + ' ' + r.what + ' ' + r.samples.join(' ')).toLowerCase().indexOf(needle) >= 0));
  const secTitle = Object.fromEntries(STUDIO_SECTIONS.map((s) => [s[0], s[1]]));

  const recordingChips = (r) => r.samples.map((k) => (
    <span key={k} role="button" tabIndex={0} style={recChip} data-studio-sample={k}
      title={SAMPLE_SOURCES[k] || A.SFX_MANIFEST && A.SFX_MANIFEST[k] || k}
      onClick={() => pickSample(k)}>{k}</span>
  ));
  const rowView = (r, extra) => (
    <div key={(extra && extra.key) || r.id} data-studio-row={r.id}
      style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: '1px solid ' + COL.divider, alignItems: 'flex-start' }}>
      <button type="button" aria-label={'Play: ' + r.label} data-studio-play={r.id} data-uisfx="off" onClick={() => play(r)}
        style={{ flex: '0 0 44px', width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 17,
          border: '1px solid ' + (lastPlayed === r.id ? COL.accent : COL.border),
          background: lastPlayed === r.id ? COL.accentFill : COL.raised, color: COL.accent }}>▶</button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, lineHeight: 1.35 }}>{r.label}{extra && extra.peer ? ' (another player)' : ''}</div>
        <div style={{ fontSize: 11.5, color: COL.muted, marginTop: 2 }}>
          {extra && extra.when ? extra.when + ' · ' : ''}{secTitle[r.section] || r.section} · {r.what}
        </div>
        <div>{recordingChips(r)}</div>
      </div>
    </div>
  );

  let body;
  if (tab === 'heard') {
    const moments = heardMoments(menuToo);
    const now = Date.now();
    body = (
      <div>
        <div style={{ padding: '10px 12px', color: COL.text2, fontSize: 12.5, lineHeight: 1.45 }}>
          The last sounds the game played, newest first. Heard something wrong? Close this, do the thing
          again, open it here: it is at the top, with where it belongs.
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button type="button" style={chipBtn(menuToo)} onClick={() => setMenuToo(!menuToo)}>Menu clicks too</button>
            <button type="button" style={chipBtn(false)} onClick={() => { clearHeard(); setTick((n) => n + 1); }}>Clear</button>
          </div>
        </div>
        {moments.length === 0 && <div style={{ padding: '18px 12px', color: COL.muted, fontSize: 13 }}>Nothing yet.</div>}
        {moments.slice(0, 30).map((m) => {
          const { row, peer } = heardRow(m, byId, rows);
          if (row) return rowView(row, { key: 'h' + m.seq, peer, when: ago(now - m.at) });
          return (
            <div key={'h' + m.seq} data-studio-row="" style={{ padding: '8px 12px', borderBottom: '1px solid ' + COL.divider }}>
              <div style={{ fontSize: 14 }}>The recording {m.keys.join(', ')}, played on its own</div>
              <div style={{ fontSize: 11.5, color: COL.muted }}>{ago(now - m.at)}</div>
              <div>{m.keys.map((k) => <span key={k} role="button" tabIndex={0} style={recChip} onClick={() => pickSample(k)}>{k}</span>)}</div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const groups = STUDIO_SECTIONS.map((s) => [s, shown.filter((r) => r.section === s[0])]).filter(([, l]) => l.length);
    body = (
      <div>
        {sample && (
          <div data-studio-filter={sample} style={{ margin: '10px 12px 4px', padding: '9px 11px', borderRadius: 10,
            background: COL.accentFill, border: '1px solid ' + COL.edgeWarm, fontSize: 12.5, lineHeight: 1.45 }}>
            <b>Recording {sample}</b>{SAMPLE_SOURCES[sample] ? ' -- ' + SAMPLE_SOURCES[sample] : ''}
            <div style={{ color: COL.text2 }}>{(A.SFX_MANIFEST && A.SFX_MANIFEST[sample]) || ''} · used in {shown.length} place{shown.length === 1 ? '' : 's'}</div>
            <button type="button" style={{ ...chipBtn(false), marginTop: 6 }} onClick={() => setSample(null)}>Show every sound</button>
          </div>
        )}
        {groups.map(([s, list]) => (
          <div key={s[0]} data-studio-section={s[0]}>
            <div style={{ padding: '12px 12px 4px', color: COL.accent, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {s[1]} <span style={{ color: COL.muted, textTransform: 'none', letterSpacing: 0 }}>· {s[2]}</span>
            </div>
            {list.map((r) => rowView(r))}
          </div>
        ))}
        {groups.length === 0 && <div style={{ padding: '18px 12px', color: COL.muted, fontSize: 13 }}>No sound matches.</div>}
      </div>
    );
  }

  return (
    <div style={wrap} data-sound-studio="" role="dialog" aria-label="Sound studio">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 6px 14px', borderBottom: '1px solid ' + COL.divider, background: COL.bgStrong }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Sound studio</div>
          <div style={{ fontSize: 11.5, color: COL.muted }}>Every sound in the game, and where it plays. ▶ plays it as the game does here.</div>
        </div>
        <button type="button" aria-label="Close" data-esc="" data-studio-close="" onClick={() => onClose && onClose()}
          style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid ' + COL.borderStrong, background: COL.well, color: COL.text, fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px 0' }}>
        <button type="button" style={chipBtn(tab === 'all')} data-studio-tab="all" onClick={() => setTab('all')}>All sounds · {rows.length}</button>
        <button type="button" style={chipBtn(tab === 'heard')} data-studio-tab="heard" onClick={() => setTab('heard')}>Heard just now</button>
      </div>
      {tab === 'all' && (
        <>
          <div style={{ padding: '8px 12px 0' }}>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: bow, snowman, grunt..."
              data-studio-search="" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, borderRadius: 10, padding: '0 12px', fontSize: 15,
                background: COL.well, color: COL.text, border: '1px solid ' + COL.border }} />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px', touchAction: 'pan-x' }}>
            <button type="button" style={chipBtn(!section)} onClick={() => setSection('')}>All</button>
            {STUDIO_SECTIONS.map((s) => (
              <button key={s[0]} type="button" style={chipBtn(section === s[0])} data-studio-chip={s[0]}
                onClick={() => setSection(section === s[0] ? '' : s[0])}>{s[1]}</button>
            ))}
          </div>
        </>
      )}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }} data-studio-list="">
        {body}
      </div>
    </div>
  );
}
