import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { petDisplayName, petKindName, petEffectiveLevel, cleanPetName, PET_NAME, PET_BIG_AT, PET_KINDS, worldSafeText, petKindOfOld } from '@/data/trapping.js';
import { petbookOn, petList, activePet, sendPetActive, sendPetName, sendPetRelease } from '@/game/petBook.js';
import { trapLevel } from '@/game/trapping.js';

/* ═══ v2.3.3111: THE PETS PAGE ═══
 * Plan: docs/PET-TRAPPING-PLAN.md -- "Name, set active and release from a
 * Pets page (More -> Pets, with the paw-print icon).  All of it is done by the
 * server and kept."  The farm's Pet House opens it too.
 *
 * What it shows is the worker's record (pets_state -> S._petBook): every pet,
 * the one out with you, each one's level -- the level it WORKS at, which is
 * never above your Trapping level ("a traded pet above your Trapping level
 * works at your Trapping level until you catch up") -- and the Big and Golden
 * badges.  Every button asks the worker (game/petBook.js); nothing changes
 * here until its answer does.  Release asks twice: it is for good.
 *
 * Against an old worker (no caps.petbook) it lists the old pets, read-only.
 * Its own clock: it re-reads the record a few times a second. */
const POLL_MS = 400;

function Badge({ children, color, bg }) {
  return <span style={{ padding: '1px 7px', borderRadius: 999, background: bg || COL.well, fontSize: 11, fontWeight: 800, color: color || COL.text2 }}>{children}</span>;
}
function Btn({ on, onClick, children, primary, danger, ...rest }) {
  return (
    <button disabled={!on} onClick={(e) => { e.stopPropagation(); if (on) onClick(); }} {...rest}
      style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
        cursor: on ? 'pointer' : 'default', flex: '1 1 0',
        border: on ? (primary ? '1px solid #EAC675' : danger ? '1px solid rgba(216,99,93,.55)' : '1px solid ' + COL.borderStrong) : '1px solid ' + COL.border,
        background: on ? (primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : danger ? 'rgba(216,99,93,.14)' : COL.raised) : '#1A292F',
        color: on ? (primary ? COL.onAccent : danger ? '#F0A8A3' : COL.text) : COL.muted }}>
      {children}
    </button>
  );
}

export const PetsPanel = () => {
  const [, force] = useState(0);
  const [open, setOpen] = useState(null);       /* the pet whose actions show */
  const [renaming, setRenaming] = useState('');
  const [naming, setNaming] = useState(false);
  const [releaseAsk, setReleaseAsk] = useState(null);
  useEffect(() => {
    let lastRev = -1;
    const id = setInterval(() => {
      const S = getState();
      const rev = S ? (S._petBookRev || 0) * 7 + ((S._trap && S._trap.rev) || 0) : 0;
      if (rev !== lastRev) { lastRev = rev; force((v) => (v + 1) % 1e9); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const live = petbookOn(S);
  const book = S && S._petBook;
  const list = petList(S);
  const out = activePet(S);
  const T = trapLevel(S);
  const cap = (book && book.cap) || 30;
  const unavailable = !!(book && book.unavailable);

  return (
    <div data-pets-panel="1" style={{ ...panelStyle, padding: '8px 10px 12px', color: COL.text, fontFamily: "'Source Sans 3',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <img src="/icons/ui/evt-pets.webp?v=2.3.1232" alt="" draggable={false} style={{ width: 26, height: 26, objectFit: 'contain' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            <span data-pets-count={list.length}>{list.length}{live ? '/' + cap : ''}</span>
            <span style={{ color: COL.muted, fontWeight: 700, marginLeft: 5 }}>in your collection</span></div>
          <div style={{ fontSize: 12, color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {out ? 'With you: ' + worldSafeText(petDisplayName(out.kind ? out : { ...out, kind: petKindOfOld(out) })) : 'No pet out with you'} · Trapping {T}
          </div>
        </div>
      </div>
      {unavailable ? (
        <div style={{ fontSize: 13, color: COL.text2, padding: 12, background: COL.well, borderRadius: 10 }}>Your pets are not ready yet. Try again after you rejoin.</div>
      ) : list.length === 0 ? (
        <div data-pets-empty="1" style={{ fontSize: 13, color: COL.text2, padding: 12, background: COL.well, borderRadius: 10, lineHeight: 1.45 }}>
          No pets yet. Make box traps at the Woodworker, target a monster out in the lands, tap <b style={{ color: COL.accent }}>TRAP</b>, then kill it.
          About one try in a hundred at best, and every try pays Trapping XP.
        </div>
      ) : list.map((p) => {
        const isOut = out && out.id === p.id;
        const kind = p.kind || petKindOfOld(p);
        const pp = p.kind ? p : { ...p, kind, lv: p.level };
        const lvShown = petEffectiveLevel(pp, T);
        const held = (pp.lv || 1) > lvShown;
        const big = Number(p.size) >= PET_BIG_AT;
        const isOpen = open === p.id;
        const clean = cleanPetName(renaming);
        return (
          <div key={p.id} data-pet-row={p.id} onClick={() => { setOpen(isOpen ? null : p.id); setNaming(false); setReleaseAsk(null); setRenaming(''); }}
            style={{ background: isOut ? COL.accentFill : COL.slot, border: '1px solid ' + (isOut ? COL.edgeWarm : COL.border), borderRadius: 12,
              padding: '8px 10px', marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: COL.well, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <PetPortrait pet={pp} size={44} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worldSafeText(petDisplayName(pp))}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                  <Badge color={COL.accent}>Lv {lvShown}{held ? ' (' + pp.lv + ')' : ''}</Badge>
                  {p.name ? <Badge>{petKindName(kind, p.stage)}</Badge> : null}
                  {isOut ? <Badge color="#7EE0A8">With you</Badge> : null}
                  {p.gold ? <Badge color="#EAC675" bg="rgba(234,198,117,.15)">Golden</Badge> : null}
                  {big ? <Badge color="#7EE0A8" bg="rgba(126,224,168,.12)">Big</Badge> : null}
                </div>
              </div>
            </div>
            {isOpen && live && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
                {held && <div style={{ fontSize: 11, color: COL.muted, marginBottom: 6 }}>Works at Lv {lvShown} until your Trapping reaches {pp.lv}.</div>}
                {naming ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input data-pet-name-input={p.id} autoFocus value={renaming} maxLength={PET_NAME.MAX + 4}
                      placeholder={petKindName(kind, p.stage)} onChange={(e) => setRenaming(e.target.value)}
                      style={{ flex: 1, minWidth: 0, minHeight: 40, padding: '0 10px', borderRadius: 10, fontSize: 15, fontFamily: 'inherit',
                        background: COL.well, color: COL.text, border: '1px solid ' + (renaming && !clean ? COL.danger : COL.borderStrong) }} />
                    <Btn on={!!clean} primary data-pet-name-save={p.id} onClick={() => { if (sendPetName(S, p.id, clean)) { setNaming(false); setRenaming(''); } }}>Save</Btn>
                  </div>
                ) : releaseAsk === p.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#F0A8A3', flex: '2 1 0' }}>Release {worldSafeText(petDisplayName(pp))} for good?</span>
                    <Btn on danger data-pet-release-yes={p.id} onClick={() => { sendPetRelease(S, p.id); setReleaseAsk(null); setOpen(null); }}>Release</Btn>
                    <Btn on onClick={() => setReleaseAsk(null)}>Keep</Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn on primary={!isOut} data-pet-active={p.id} onClick={() => sendPetActive(S, isOut ? null : p.id)}>{isOut ? 'Put away' : 'Take out'}</Btn>
                    <Btn on data-pet-rename={p.id} onClick={() => { setNaming(true); setRenaming(p.name || ''); }}>Rename</Btn>
                    <Btn on danger data-pet-release={p.id} onClick={() => setReleaseAsk(p.id)}>Release</Btn>
                  </div>
                )}
                {naming && renaming && !clean ? <div style={{ fontSize: 11, color: '#E59A94', marginTop: 4 }}>2-16 letters, numbers, spaces, - or '</div> : null}
              </div>
            )}
          </div>
        );
      })}
      {live && list.length > 0 && (
        <div style={{ fontSize: 11, color: COL.muted, marginTop: 6, lineHeight: 1.4 }}>
          The pet with you picks up loot from further away. Pets are never lost, not even in No man's land.
        </div>
      )}
      {/* the journal's tries, a line per kind tried (Phase 2 grows it) */}
      {live && book && book.journal && Object.keys(book.journal).length > 0 && (
        <div data-pets-journal="1" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.muted, marginBottom: 4 }}>Your tries</div>
          {Object.keys(book.journal).sort().map((k) => {
            const j = book.journal[k];
            const [kd, st] = k.split('.');
            if (!Object.prototype.hasOwnProperty.call(PET_KINDS, kd)) return null;
            return (
              <div key={k} data-pets-journal-row={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COL.text2, padding: '3px 2px', borderTop: '1px solid ' + COL.divider }}>
                <span>{petKindName(kd, Number(st))}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{j.n || 0} caught · {j.tries || 0} tries</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PetsPanel;
