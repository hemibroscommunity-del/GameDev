import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { combatLevelProgress, unspentPointsTotal } from './heroModel.js';
import { getActiveWeapon, calcDisplayDmgRange, calcDisplayDps } from '../../../data/gameSystems.js';
import { portraitStore } from './portraitStore.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1294 (ChatGPT round-4): the identity strip — one compact row
   that replaces the retired top-right world card.  Portrait (with the
   presence dot), name, level, a thin XP strip WITH exact progress, and
   gold aligned right.  Shared by Hero compact and Hero expanded so the
   "who am I" row is pixel-identical in both.
   Canonical name source: S.myName (the world card's source) — the old
   HeroExpanded read S.player.name and fell back to 'Bro' while the
   card said 'Anon'; one record now.

   v2.3.1311 (owner: "1097 / 500 XP is invalid while Lv 1"): the strip
   used to pair LIFETIME rpg.xp against the single-level xpRequired
   cost — two unrelated scales (level derives from skill points, not
   xp).  It now renders combatLevelProgress (heroModel): exact progress
   toward the next combat level from the same _buildProg machinery that
   actually grants levels; the numerator can never exceed the
   denominator.  Lifetime XP lives in Hero > Records.  Also this pass:
   40x40 portrait, wider name/level spacing, brighter XP text, coin +
   number as one unit (spec items). */
/* v2.3.1635 (owner: "option C" — a persistent sense of identity and
   progress): `band` opts INTO two extra chips for the persistent
   dashboard row.  A prop rather than a second component because the
   header rule above still holds — Hero compact and Hero expanded must
   stay pixel-identical, and they simply don't pass it, so their row is
   byte-for-byte what it was.
   The two chips are the ones that carry the feeling the owner asked
   for, and nothing else earned the width:
     - unspent build points: the only "you have progress waiting" signal
       on the band.  Hidden at zero, so it can only ever appear as good
       news and a fresh character sees a quiet row.
     - active weapon: the one piece of the retired LOADOUT column worth
       carrying full-time.
   Vitals are deliberately absent: HP/stamina/mana already live on the
   world HUD, which is where they matter during a fight.

   v2.3.1637 (owner: "put the dmg and DPS up on the character row above
   the dashboard columns"): DMG/DPS moves here off the EQUIPPED column,
   which frees that column's whole body for its six slots.  It takes the
   WEAPON CHIP's place rather than adding width: the chip named the
   weapon in text while the EQUIPPED column right below now shows that
   same weapon as art, and of the two the numbers are the thing you
   cannot get anywhere else at a glance.

   v2.3.1637 (owner: the rail "doesn't need its own button" for Hero):
   the PORTRAIT is the Hero button now.  It is the same v2.3.1294
   reasoning the ribbon's Hero icon used — nothing says "my character"
   better than the character — so the rail drops from seven buttons to
   six and each of the survivors gets more height.  Band mode only: in
   Hero's own sheet the portrait would open the screen you are on. */
export const IdentityStrip = ({ band = false }) => {
  const [, force] = useState(0);
  useEffect(() => portraitStore.subscribe(() => force(v => v + 1)), []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const level = R.level || 1;
  const lp = combatLevelProgress(R);
  /* v2.3.1311: CURRENT balance, not lifetime earned — the old fallback
     chain preferred _compStats.totalGoldEarned, which is the Records
     number ("Lifetime Gold"); showing it here is exactly the confusion
     the spec's naming rule exists to prevent. */
  const gold = R.coins || R.gold || 0;
  const portrait = portraitStore.get();
  /* v2.3.1635: band-only extras. */
  const unspent = band ? unspentPointsTotal(R) : 0;
  const wpn = band ? getActiveWeapon(R) : null;
  /* v2.3.1637: the numbers the EQUIPPED column used to carry. */
  const dmgRange = wpn ? calcDisplayDmgRange(R, wpn) : null;
  const dps = dmgRange ? Math.round(calcDisplayDps(R, wpn) * 10) / 10 : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '2px 0 4px',
      flex: '0 0 auto',
      fontFamily: 'Source Sans 3, sans-serif',
    }}>
      {/* Portrait + presence dot (connection status — lived on the old
          world card; the identity strip keeps it).
          v2.3.1637: in the band it is also the Hero button. */}
      <div
        role={band ? 'button' : undefined}
        aria-label={band ? 'Hero' : undefined}
        title={band ? 'Hero' : undefined}
        onPointerUp={band ? (e) => { e.stopPropagation(); dashboardPanelBus.open('hero'); } : undefined}
        style={{
          position: 'relative', width: 40, height: 40, flexShrink: 0,
          cursor: band ? 'pointer' : 'default', touchAction: band ? 'manipulation' : undefined,
        }}>
        <img
          src={portrait || (S && S.myAvatar) || '/icons/ui/profile.webp?v=2.3.128'}
          alt="Portrait"
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', imageRendering: 'pixelated',
            borderRadius: 8, userSelect: 'none', pointerEvents: 'none',
          }}
        />
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 7, height: 7, borderRadius: '50%',
          background: (S && S._realtimeStatus === 'connected') ? '#55B98A' : '#D95C54',
          border: '2px solid #202C32',
        }} />
      </div>
      {/* Name · Lv + XP strip with exact progress. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            minWidth: 0,
          }}>{(S && S.myName) || 'Anon'}</span>
          <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: COL.text2 }}>Lv {level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{
            flex: 1, height: 4, borderRadius: 2,
            background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}>
            <div style={{ width: `${Math.min(100, (lp.prog / lp.thresh) * 100)}%`, height: '100%', background: '#8AA9F9' }} />
          </div>
          <span style={{ flex: 'none', fontSize: 10, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
            {lp.prog} / {lp.thresh} XP
          </span>
        </div>
      </div>
      {/* v2.3.1635: unspent build points — the progress nag.  Brass on
          brass-fill is the band's one accent (Lantern Slate), and it is
          the only element here allowed to draw the eye.  Rendered only
          when there is something to spend. */}
      {band && unspent > 0 && (
        <span
          aria-label={unspent + ' unspent build points'}
          style={{
            flex: 'none', display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 999,
            background: COL.accentFill, border: '1px solid ' + COL.accent,
            color: COL.accent, fontSize: 11, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1.4,
          }}
        >+{unspent}</span>
      )}
      {/* v2.3.1637: DMG / DPS, in the weapon chip's slot.  Truncates
          rather than wraps — the row's height is load-bearing (it is a
          term of barHeight, and therefore of the canvas size), so
          nothing in it may grow to two lines. */}
      {band && dmgRange && (
        <span style={{
          flex: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 8px', borderRadius: 999,
          background: COL.slot, border: '1px solid ' + COL.tileBor,
          color: COL.muted, fontSize: 10, fontWeight: 700, lineHeight: 1.4,
          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          <span>DMG <b style={{ color: COL.text }}>{dmgRange.text}</b></span>
          <span>DPS <b style={{ color: COL.text }}>{dps}</b></span>
        </span>
      )}
      {/* Gold — coin icon + number as one compact unit, right-aligned. */}
      <span style={{
        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 3,
        color: COL.gold, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      }}>
        <img src="/icons/popups/gold.webp" alt=""
          style={{ width: 13, height: 13, imageRendering: 'pixelated', display: 'block' }} />
        <span className="bt-coin-glimmer">{Number(gold).toLocaleString()}</span>
      </span>
    </div>
  );
};
