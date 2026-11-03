import React from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { portraitStore, PORTRAIT_FALLBACK_SRC } from './portraitStore.js';
import { deriveHeroStats, weaponSkillProgress } from './heroModel.js';
import { heroStatPills } from './heroStatPills.js';
import { prog3Live, prog3CharLevel, PROG3_SKILL_META } from '../../../data/prog3.js';
import { achvLive, achvApTotal } from '@/game/achievements.js';
import { achvById, ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { deskWords } from '@/game/deskWords.js';
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';

/* ═══ v2.3.3941: BRO -> ME, THE PLAYER CARD ═══
 * The owner's table for the Bro button: "PFP, playercard (titles, etc),
 * combat stats and combat skills, point allocation, quests completed,
 * achievements, achievement points", and from the review he adopted:
 * "Achievement points: ... an explicit 'Achievement Points: 40' ... in player
 * profiles".  Me is Bro's first tab and the page it opens on: who you are at
 * a glance -- your portrait (the same picture as the Bro button, portraitStore),
 * your name, the title you wear (an achievement, chosen on the Achievements
 * tab), your level (your best weapon's: the one level, v2.3.3538),
 * "Achievement Points: N" (a tap opens the Achievements tab), your three
 * combat skills with their levels and bars, and the core stats as the
 * Equipment tab's own pills read them (heroStatPills: one reader, so the two
 * tabs never disagree).  Point allocation is the Points tab, life skills the
 * Skills tab, achievements theirs.
 *
 * Read only: nothing here spends or sends.  Its parent (HeroExpanded) re-reads
 * every 400 ms, so this has no clock of its own.  Lantern Slate: a 15/800 name,
 * 11/700 captions, the brass accent for the title and the AP, no new art (the
 * pictures are the dashboard's own, already shown elsewhere). */
const levelOf = (R) => {
  try { if (prog3Live(R)) return prog3CharLevel(R); } catch (e) { /* the old blob */ }
  return Math.max(1, Number(R && R.level) || 1);
};

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

export const BroMe = ({ onAchievements }) => {
  const S = getState();
  const R = (S && S.rpg) || {};
  const portrait = portraitStore.get();
  const name = (S && S.myName) || R.name || 'You';
  const lvl = levelOf(R);
  const apOn = achvLive(S);
  const ap = apOn ? achvApTotal(S) : 0;
  const a = S && S._achv;
  const titleDef = a && a.t ? achvById(a.t) : null;
  let d = {};
  try { d = deriveHeroStats(R) || {}; } catch (e) { d = {}; }
  let pills = null;
  try { pills = heroStatPills(R, d); } catch (e) { pills = null; }
  const pick = (list, key) => (list || []).find((p) => p.key === key);
  const core = pills ? [
    pills.dps,
    pick(pills.offense, 'damage'),
    pick(pills.offense, 'crit'),
    pick(pills.player, 'def'),
    pick(pills.player, 'dodge'),
    pick(pills.player, 'move'),
  ].filter(Boolean) : [];
  const caption = { fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.muted, margin: '8px 2px 4px' };
  return (
    <div data-bro-me="" style={{ ...panelStyle, overflowY: 'auto', padding: '4px 8px 12px' }}>
      {/* the card: portrait, name, title, level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
        <img src={portrait || PORTRAIT_FALLBACK_SRC} alt="" draggable={false}
          style={{ width: 52, height: 52, flex: 'none', objectFit: 'cover', imageRendering: 'pixelated',
            borderRadius: 10, background: COL.slot, border: `1px solid ${COL.border}`, pointerEvents: 'none' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div data-bro-name="" style={{ fontSize: 15, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div data-bro-title={titleDef ? titleDef.id : 'none'} style={{ fontSize: 12, fontWeight: 700, color: titleDef ? COL.accent : COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {titleDef ? titleDef.name : (apOn ? 'No title yet' : '')}
          </div>
          <div data-bro-level={lvl} style={{ fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>Level {lvl}</div>
        </div>
      </div>
      {/* the owner's line, word for word: "Achievement Points: 40" -- a tap
          opens the Achievements tab beside this one */}
      {apOn ? (
        <button type="button" data-bro-ap={ap}
          aria-label={`Achievement Points: ${fmt(ap)}. Open Achievements`}
          onClick={(e) => { e.stopPropagation(); if (onAchievements) onAchievements(); }}
          style={{
            width: '100%', minHeight: 44, marginTop: 6, padding: '0 10px', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', gap: 8,
            background: COL.wellSoft, border: `1px solid ${COL.tileBor}`, borderRadius: 10,
            color: COL.text, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation', textAlign: 'left',
          }}>
          <img src={ACHV_MEDAL_SRC} alt="" draggable={false} style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
            Achievement Points: <b style={{ color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>{fmt(ap)}</b>
          </span>
          <span aria-hidden="true" style={{ flex: 'none', fontSize: 11, fontWeight: 700, color: COL.muted }}>{deskWords('Tap to see')}</span>
        </button>
      ) : null}
      {/* the three combat skills: picture, level, the bar to the next */}
      <div style={caption}>Combat skills</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
        {PROG3_SKILL_META.map((m) => {
          const p = weaponSkillProgress(R, m.key);
          const level = p ? p.level : levelOf(R);
          const pct = p && p.thresh ? Math.max(0, Math.min(100, (p.prog / p.thresh) * 100)) : 100;
          return (
            <div key={m.key} data-bro-skill={m.key} data-level={level}
              title={`${m.label} — Lv ${level}`}
              style={{ background: COL.well, border: `1px solid ${COL.border}`, borderRadius: 8, padding: '5px 6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <img src={m.iconSrc} alt="" draggable={false} style={{ width: 22, height: 22, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                <span style={{ minWidth: 0, fontSize: 12, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COL.text2, margin: '2px 0 3px', fontVariantNumeric: 'tabular-nums' }}>Lv {level}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(229,237,233,.10)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: COL.accent }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* the core stats, the Equipment tab's pills' own numbers; a tap says
          what one does (the same explainer the pills open) */}
      {core.length ? (
        <>
          <div style={caption}>Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
            {core.map((p) => (
              <button key={p.key} type="button" data-bro-stat={p.key}
                onClick={(e) => {
                  e.stopPropagation();
                  /* as the Equipment tab's pills open theirs (HeroExpanded) */
                  try { const info = statInfo(p.info); if (info) infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(p.value) }); } catch (_e) { /* no explainer: nothing opens */ }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 8px', boxSizing: 'border-box',
                  background: COL.wellSoft, border: `1px solid ${COL.tileBor}`, borderRadius: 999,
                  color: COL.text, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation', minWidth: 0,
                }}>
                {p.icon ? <img src={p.icon} alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} /> : null}
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: COL.text2, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default BroMe;
