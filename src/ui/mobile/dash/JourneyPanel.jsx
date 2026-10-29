import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { playIsLandscape } from '../playViewport.js';   /* v2.3.2171: the sideways pane stacks */
import { deskWords } from '@/game/deskWords.js';        /* v2.3.3773: "Tap" reads "Click" on a computer */

/* ═══ v2.3.3773: JOURNEY IS ITS OWN PAGE, UNDER MORE ═══
   The owner: "I also think I want 'journey' to be put as its own icon in the
   more/other apps menus. That way the two main ones, equipment and points,
   stand out further as just two tabs."

   This is the Character page's old third tab (HeroExpanded's 'Records'
   section), MOVED, not rewritten: the six record cards and the Hemi receipt,
   their numbers, icons and both layouts exactly as that tab drew them, with
   the comments that explain each size.  The one change is the receipt's
   second line, which a computer now reads as "Click" through deskWords (the
   desktop law).

   It replaces the always-empty travel log this file held since v2.3.1232
   (nothing in the game or the server ever wrote `rpg.journey`, the
   2026-10-19 UI review), which More showed only against a worker without
   caps.achievements.  The panel id stays 'journey' (BottomDashboard PANELS,
   the UI review's `more-journey`, wheelBus's 'journey'), so every way in
   still lands here.

   Refreshed once a second as the old page was: a kill or a duel changes a
   card while the page is open. */
export const JourneyPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const cs = R._compStats || {};
  const landPane = playIsLandscape();

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }} data-journey-page="">
        {/* v2.3.1311c: 3x2 (was 2x3) — two card rows fit the real device
            budget without scrolling; three didn't. */}
        {/* v2.3.2176 (owner, of the landscape Journey tab: "labels that are
            still cut off and need to have a different layout to display
            correctly"): three cards across a ~204px column left ~63px each,
            so every label ellipsised to a single letter -- "K...", "D...",
            "L...".  Sideways this becomes ONE column of wide rows, which is
            the only arrangement in which "Lifetime Gold" and "Deepest Zone"
            fit whole.  Portrait keeps the 3x2 grid v2.3.1311c measured
            against its own no-scroll budget. */}
        <div style={{ display: 'grid', gridTemplateColumns: landPane ? '1fr' : 'repeat(3, 1fr)', gap: 5 }}>
          {[
            /* v2.3.1323 (owner icon sheet): each record card gets its
               icon — same magenta-key pipeline as the stat sheet.
               v2.3.1341 (owner art drop): rec-kills replaced with the
               new sword-and-skull art (green-screen sheet, chroma
               knocked out); shared ?v bumped to bust the old cache. */
            /* v2.3.1664: prefer the SERVER-verified kill count when the
               worker sends it (svKills, counted in _resolveMonsterKill).
               The client's own _compStats tally stays the fallback for old
               workers.  This is the number the on-chain attestation
               carries, so the two must not disagree on screen. */
            ['Kills', R.svKills ?? cs.monstersKilled ?? cs.kills ?? 0, 'rec-kills'],
            ['Deaths', cs.deaths ?? 0, 'rec-deaths'],
            /* Renamed from "Gold Earned" so it can't be confused with
               the current balance in the identity strip (round-4). */
            ['Lifetime Gold', Number(cs.totalGoldEarned ?? cs.goldEarnedTotal ?? 0).toLocaleString(), 'rec-gold'],
            /* v2.3.1311: lifetime cumulative XP lives HERE now — the
               identity strip shows normalized next-level progress. */
            ['Lifetime XP', Number(R.xp || 0).toLocaleString(), 'rec-xp'],
            ['Duels Won', cs.duelsWon ?? 0, 'rec-duels'],
            ['Deepest Zone', cs.deepestZone ?? '—', 'rec-zone'],
          ].map(([label, value, icon]) => {
            /* v2.3.2176b: ONE rule for how big a record's value is printed,
               shared by both layouts.  Five of the six are short numbers,
               but Deepest Zone is a zone NAME and lifetime gold reaches
               seven figures -- and at a fixed 14px those two overflowed in
               both orientations (portrait ellipsised "Frost Holl…";
               sideways the nowrap row simply pushed past the panel's right
               edge, which the landdash overflow sweep caught).  The point
               size steps down with the string rather than the reader losing
               the end of it. */
            const valueFs = String(value).length <= 6 ? 14 : String(value).length <= 9 ? 12 : 10;
            return (
            <div key={label} data-journey-card={icon} style={{
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 7,
              padding: '5px 7px 6px',
              minWidth: 0,
              /* v2.3.2176b: 5px of gap and a 22px icon in the PORTRAIT
                 grid.  Measured: a 117px card less 14 of padding, a 26px
                 icon and 6 of gap left 71px for a label that needs 73, so
                 "LIFETIME GOLD" and "DEEPEST ZONE" ellipsised to
                 "LIFETIME GO…" / "DEEPEST ZO…" -- the owner's complaint,
                 in the orientation the landscape fix did not touch.  Four
                 pixels off an icon buys the whole word; the icon is
                 decoration and the word is the data. */
              display: 'flex', alignItems: 'center', gap: landPane ? 6 : 5,
            }}>
              <img src={`/icons/ui/hero/${icon}.webp?v=2.3.1341`} alt="" draggable={false}
                style={{ width: landPane ? 26 : 22, height: landPane ? 26 : 22, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              {/* v2.3.2176: stacked (value over label) in the portrait grid,
                  where the cell is short and wide-ish; a single ROW sideways
                  -- label left, value right -- which is the house list
                  pattern and gives the label the whole width it needs. */}
              {landPane ? (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  {/* v2.3.2176b: 10px, not 11.  "LIFETIME GOLD" whole plus a
                      seven-figure number is more than this row has at 11 --
                      and neither half may be clipped, so the type gives. */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, whiteSpace: 'nowrap' }}>{label}</div>
                  <div style={{ fontSize: valueFs, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' }}>{value}</div>
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* v2.3.2176b: the VALUE line sizes itself.  Five of the
                      six records are short numbers, but Deepest Zone is a
                      zone NAME -- "Frost Hollow" wanted 99px in an 80px
                      cell and ellipsised to "Frost Holl…", which is the
                      same clipping the labels above were just fixed for,
                      one line down.  Seven-figure gold hits it too.  So the
                      point size steps down with the string's length rather
                      than the reader losing the end of it. */}
                  <div style={{ fontSize: valueFs, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                  {/* v2.3.2176b: .02em, not .04 -- thirteen characters of
                      tracking is another 2px this cell does not have. */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', color: COL.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                </div>
              )}
            </div>
          );})}
        </div>
        {/* v2.3.1664: the on-chain receipt.  Appears only once a milestone
            has actually been written to Hemi, so it is never a promise the
            game hasn't kept — and it is a real link, because a claim of
            "verified on-chain" that you cannot go and check is just a
            badge.  The popup at the moment of writing fades; this stays. */}
        {R._chainScore && R._chainScore.explorer && (
          <a
            href={R._chainScore.explorer}
            target="_blank"
            rel="noopener noreferrer"
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 6, padding: '7px 9px',
              background: COL.accentFill,
              border: `1px solid ${COL.accent}`,
              borderRadius: 7,
              textDecoration: 'none',
              touchAction: 'manipulation',
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: COL.accent,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Level {R._chainScore.level} recorded on Hemi
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
                textTransform: 'uppercase', color: COL.muted, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {deskWords('Tap to view the transaction')}
              </div>
            </div>
            <span aria-hidden="true" style={{
              flex: 'none', fontSize: 13, fontWeight: 800, color: COL.accent, lineHeight: 1,
            }}>↗</span>
          </a>
        )}
    </div>
  );
};
