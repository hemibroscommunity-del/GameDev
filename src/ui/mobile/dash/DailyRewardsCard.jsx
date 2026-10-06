import React, { useSyncExternalStore } from 'react';
import { COL } from './common.js';
import { dailyRewardsBus, questsLive, spinLive, claimableTiers } from '@/game/dailyRewards.js';
import { useScrollTap } from '../sheet/scrollTap.js'; /* the card sits in the Quests scroller */

/* ═══ v2.3.3125: THE DAILY REWARDS CARD, AT THE TOP OF QUESTS ═══
 * The way into the Daily Rewards window (DailyRewardsWindow.jsx): where a
 * player's head already is when they think "what should I do now".  Not a
 * HUD button (the owner has asked more than once to keep the HUD clear) and
 * not an eleventh More tile (the grid is full).  One line says the day at a
 * glance -- quests done, the stars, the free spin -- and it wears the brass
 * edge only while something is waiting: a season tier to claim, or the
 * day's free spin.  Renders nothing against a worker without the caps. */
export const DailyRewardsCard = () => {
  const st = useSyncExternalStore(dailyRewardsBus.subscribe, dailyRewardsBus.get, dailyRewardsBus.get);
  const scrollTap = useScrollTap();
  const qLive = questsLive();
  const sLive = spinLive();
  if (!st || (!qLive && !sLive)) return null;
  const dq = st.dq || {};
  const list = Array.isArray(dq.list) ? dq.list : [];
  const done = list.filter((q) => q.d).length;
  const claim = qLive ? claimableTiers(st).length : 0;
  const spinReady = sLive && st.spin && st.spin.on && (st.spin.ready || st.spin.open || st.spin.extra > 0);
  const warm = claim > 0 || spinReady;
  const bits = [];
  if (qLive && dq.on !== false) bits.push(dq.locked ? 'Daily quests: soon' : done + '/' + (list.length || 3) + ' daily quests');
  if (qLive && st.season) bits.push('★ ' + st.season.st);
  if (claim > 0) bits.push(claim + ' to claim');
  else if (spinReady) {
    const sp = st.spin;
    bits.push(sp.ready ? 'free spin ready' : (sp.open ? 'spin going' : sp.extra + ' bonus spin' + (sp.extra === 1 ? '' : 's')));
  }
  return (
    <button type="button" data-daily-card-open="1" data-warm={warm ? '1' : '0'}
      {...scrollTap(() => dailyRewardsBus.openWindow(claim > 0 ? 'season' : 'today'))}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48,
        margin: '0 0 6px', padding: '6px 10px', boxSizing: 'border-box',
        background: warm ? COL.accentFill : COL.well,
        border: '1px solid ' + (warm ? COL.edgeWarm : COL.border), borderRadius: 10,
        color: COL.text, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
      }}>
      <span aria-hidden="true" style={{ flex: 'none', fontSize: 20, lineHeight: 1, color: COL.gold }}>★</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>Daily rewards</span>
        <span style={{ display: 'block', fontSize: 11.5, color: COL.text2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bits.join(' · ')}
        </span>
      </span>
      {claim > 0 && (
        <span aria-hidden="true" style={{
          flex: 'none', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
          background: COL.accent, color: COL.onAccent, fontSize: 11, fontWeight: 900, lineHeight: '18px', textAlign: 'center',
        }}>{claim > 9 ? '9+' : claim}</span>
      )}
      <span aria-hidden="true" style={{ flex: 'none', fontSize: 16, color: warm ? COL.accent : COL.muted }}>›</span>
    </button>
  );
};
