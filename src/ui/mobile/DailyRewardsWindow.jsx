import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { COL } from './dash/common.js';
import { thumbFor } from './dash/InventoryPanel.jsx';
import { useModalGuard } from './modalGuardBus.js';
import { tapDismiss, TAP_DISMISS_STYLE } from '../tapDismiss.js';
import {
  dailyRewardsBus, questsLive, spinLive, askReroll, askClaim, askRewards,
  questLabel, questIcon, grantLabel, untilText, claimableTiers, nextTier, tierNeed, coinsShort,
} from '@/game/dailyRewards.js';

/* ═══ v2.3.3140: THE DAILY REWARDS WINDOW ═══
 *
 * Owner, 2026-10-06: "a small reward just for logging in, daily quests that
 * get people playing, and both feeding a longer progression track like a
 * battle pass" -- and, of the login chest: "I find the login page with the
 * chest intrusive."  So this window NEVER opens by itself.  It opens from the
 * Quests tab's card, and from the Gambling Den's spin ("Daily quests &
 * season"); a finished quest says so in a toast.
 *
 * TWO TABS:
 *   Today  -- the streak and its freezes, the free spin's state (it is taken
 *             at the Gambling Den, not here), the three daily quests with
 *             their counts and the one free reroll, and the all-three bonus.
 *   Season -- the stars, the next tier, and the 25 tiers: claim what is
 *             reached (one at a time, or all at once); what is never claimed
 *             is mailed when the season ends.
 *
 * Draws only what the worker last said (game/dailyRewards.js); every button
 * is an ask -- daily_reroll, season_claim -- and the answer redraws it.
 *
 * SMALL SCREENS: the InfoPopup recipe (v2.3.2616) -- the card is capped at
 * the screen and only its middle scrolls, so the header, the tabs and the
 * close are always on screen, upright or sideways.  Mounted in GameApp,
 * outside .brotown-wrap (TRAPS §20), at z 9250 (zLayers.js). */

const Z = 9250;
const SCRIM = 'rgba(8,16,20,.56)';

const useWin = () => useSyncExternalStore(dailyRewardsBus.subscribe, dailyRewardsBus.win, dailyRewardsBus.win);
const useState2 = () => useSyncExternalStore(dailyRewardsBus.subscribe, dailyRewardsBus.get, dailyRewardsBus.get);

const Star = ({ size }) => (
  <span aria-hidden="true" style={{ color: COL.gold, fontSize: size || 13, lineHeight: 1 }}>★</span>
);

/* A bonus spin, drawn as the Gambling Den's prize wheel in small (its slices'
   colours, DailySpin.jsx PRIZE_FILL in its ORDER). */
const SpinGlyph = ({ size }) => {
  const s = size || 20;
  return (
    <span aria-hidden="true" style={{
      display: 'inline-block', width: s, height: s, borderRadius: '50%', flex: 'none',
      background: 'conic-gradient(#34494F 0 45deg, #2B6A61 45deg 90deg, #27393F 90deg 135deg, #2F5A87 135deg 180deg, #34494F 180deg 225deg, #664A8E 225deg 270deg, #27393F 270deg 315deg, #D8AA58 315deg 360deg)',
      border: '1.5px solid rgba(229,237,233,.35)', boxSizing: 'border-box',
    }} />
  );
};

function grantIcon(g, size) {
  const s = size || 20;
  const img = (src) => <img src={src} alt="" draggable={false} style={{ width: s, height: s, objectFit: 'contain', flex: 'none' }} />;
  if (!g) return null;
  if (g.kind === 'coins') return img('/icons/ui/cur-gold.webp');
  if (g.kind === 'spin') return <SpinGlyph size={s} />;
  if (g.kind === 'freeze') return img('/icons/ui/elem-frost.webp');
  if (g.kind === 'item') { const u = thumbFor(g.key); return u ? img(u) : null; }
  return null;
}

/* The panel meter (Lantern Slate: a well track, a flat fill with the light
   on top, 180 ms). */
const Meter = ({ n, g, color, h }) => {
  const pct = g > 0 ? Math.max(0, Math.min(1, n / g)) : 0;
  return (
    <div style={{ height: h || 8, borderRadius: 999, background: COL.wellDeep, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)', overflow: 'hidden' }}>
      <div style={{
        width: (pct * 100) + '%', height: '100%', borderRadius: 999,
        backgroundColor: color || COL.xp,
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)',
        transition: 'width 180ms',
      }} />
    </div>
  );
};

const Section = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '14px 0 6px' }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: COL.muted }}>{children}</div>
    {right ? <div style={{ fontSize: 11.5, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>{right}</div> : null}
  </div>
);

const smallBtn = (on) => ({
  flex: 'none', minWidth: 44, minHeight: 36, padding: '0 10px', borderRadius: 10,
  background: on ? COL.accent : COL.raised, color: on ? COL.onAccent : COL.text2,
  border: '1px solid ' + (on ? COL.accent : COL.borderStrong),
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
});

/* ── Today ── */

function QuestRow({ q, i, canReroll }) {
  const done = !!q.d;
  return (
    <div data-daily-quest={i} data-done={done ? '1' : '0'} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px',
      borderBottom: '1px solid ' + COL.divider, opacity: done ? 0.72 : 1,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: COL.well, border: '1px solid ' + (done ? COL.xp : COL.border),
      }}>
        <img src={questIcon(q)} alt="" draggable={false} style={{ width: 26, height: 26, objectFit: 'contain' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{questLabel(q)}</span>
          <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: done ? COL.xp : COL.text2, fontVariantNumeric: 'tabular-nums' }}>
            {done ? '✓ Done' : Math.min(q.n, q.g) + '/' + q.g}
          </span>
        </span>
        <span style={{ display: 'block', marginTop: 5 }}><Meter n={q.n} g={q.g} color={done ? COL.xp : COL.accent} /></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11.5, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
          <img src="/icons/ui/cur-gold.webp" alt="" draggable={false} style={{ width: 13, height: 13, objectFit: 'contain' }} />
          {q.c} coins · <Star size={12} /> 1
        </span>
      </span>
      {canReroll && !done && (
        <button type="button" data-reroll={i} aria-label={'Swap "' + questLabel(q) + '" for another quest'}
          onClick={() => askReroll(i)} style={smallBtn(false)}>↻</button>
      )}
    </div>
  );
}

function TodayTab({ st }) {
  const dq = st.dq || {};
  const list = Array.isArray(dq.list) ? dq.list : [];
  const doneN = list.filter((q) => q.d).length;
  const sp = st.spin || {};
  const sk = st.streak || {};
  /* the wheel's top prize as it pays today (the worker's `spin.prizes`) */
  const jackpot = Array.isArray(sp.prizes) && sp.prizes.length ? sp.prizes[sp.prizes.length - 1].c : 0;
  return (
    <div>
      {/* the streak */}
      <div data-daily-streak={sk.n || 1} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10,
        background: COL.well, border: '1px solid ' + COL.border,
      }}>
        <img src="/icons/ui/elem-flame.webp" alt="" draggable={false} style={{ width: 28, height: 28, objectFit: 'contain', flex: 'none' }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: COL.text }}>{(sk.n || 1) + '-day streak'}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: COL.text2, marginTop: 1, lineHeight: 1.35 }}>
            {sk.saved > 0 ? 'A freeze saved your streak! ' : ''}
            Play each day to keep it. It raises the free spin's prizes.
          </span>
        </span>
        <span data-daily-freezes={sk.fz || 0} title="Streak freezes" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
          <img src="/icons/ui/elem-frost.webp" alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain' }} />
          {(sk.fz || 0) + '/' + (sk.fzMax || 2)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: COL.muted, margin: '6px 2px 0', lineHeight: 1.4 }}>
        A freeze covers a missed day by itself. You earn one every {sk.every || 7} days of streak.
      </div>

      {/* the spin */}
      {spinLive() && sp.on && (
        <div data-daily-spinrow={sp.ready ? 'ready' : (sp.open ? 'open' : (sp.extra > 0 ? 'bonus' : 'done'))} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 10px', borderRadius: 10,
          background: sp.ready || sp.open || sp.extra > 0 ? COL.accentFill : COL.well,
          border: '1px solid ' + (sp.ready || sp.open || sp.extra > 0 ? COL.edgeWarm : COL.border),
        }}>
          <SpinGlyph size={30} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: COL.text }}>
              {sp.open ? 'Your pot of ' + coinsShort(sp.pot) + ' coins is waiting' : (sp.ready ? 'Your free spin is ready' : (sp.extra > 0 ? sp.extra + ' bonus spin' + (sp.extra === 1 ? '' : 's') + ' to use' : 'Today\'s spin is done'))}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: COL.text2, marginTop: 1, lineHeight: 1.35 }}>
              {sp.open
                ? 'At the Gambling Den in BroTown: take it, or double or nothing.'
                : (sp.ready || sp.extra > 0
                  ? 'At the Gambling Den in BroTown. Spin for a lump sum' + (jackpot ? ', up to the ' + coinsShort(jackpot) + ' jackpot.' : '.')
                  : 'Next free spin in ' + untilText(st.resetAt, st) + '.')}
            </span>
          </span>
        </div>
      )}

      {/* the quests */}
      {questsLive() && dq.on !== false && (
        <>
          <Section right={'resets in ' + untilText(st.resetAt, st)}>Daily quests</Section>
          {dq.locked ? (
            <div data-daily-locked="1" style={{ padding: '14px 10px', borderRadius: 10, background: COL.well, border: '1px solid ' + COL.border, fontSize: 13, color: COL.text2, lineHeight: 1.45 }}>
              Hand in Mayor Bro's first quest to open the daily quests.
            </div>
          ) : (
            <div data-daily-quests={list.length}>
              {list.map((q, i) => <QuestRow key={i + ':' + q.t + ':' + (q.p || '')} q={q} i={i} canReroll={(dq.rr || 0) > 0} />)}
              <div data-daily-all={dq.all ? '1' : '0'} style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 10px', borderRadius: 10,
                background: dq.all ? 'rgba(88,185,123,.12)' : COL.well, border: '1px solid ' + (dq.all ? COL.xp : COL.border),
              }}>
                <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}><Star size={18} /><SpinGlyph size={18} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: COL.text, lineHeight: 1.35 }}>
                  {dq.all
                    ? 'All three done! You got +' + ((dq.bonus && dq.bonus.stars) || 1) + ' ★ and a bonus spin.'
                    : 'Finish all three: +' + ((dq.bonus && dq.bonus.stars) || 1) + ' ★ and a bonus spin'}
                </span>
                <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: dq.all ? COL.xp : COL.text2, fontVariantNumeric: 'tabular-nums' }}>{doneN}/{list.length || 3}</span>
              </div>
              <div style={{ fontSize: 11.5, color: COL.muted, margin: '8px 2px 0', lineHeight: 1.4 }}>
                {(dq.rr || 0) > 0
                  ? 'Not your thing? Tap ↻ to swap one quest for another (once a day).'
                  : 'You\'ve used today\'s swap.'}
                {' '}Each quest also puts a ★ on the season.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Season ── */

function TierRow({ st, t, grants, claimed }) {
  const need = tierNeed(st, t);
  const reached = st.season.st >= need;
  const milestone = t % 5 === 0;
  return (
    <div data-season-tier={t} data-claimed={claimed ? '1' : '0'} data-reached={reached ? '1' : '0'} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid ' + COL.divider,
      opacity: claimed ? 0.6 : 1,
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        background: reached ? (milestone ? COL.accent : COL.accentFill) : COL.well,
        color: reached ? (milestone ? COL.onAccent : COL.accent) : COL.muted,
        border: '1px solid ' + (reached || milestone ? COL.accent : COL.border),
      }}>{t}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {grants.map((g, k) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: milestone ? 700 : 600, color: COL.text, lineHeight: 1.5 }}>
            {grantIcon(g, 18)}
            <span style={{ minWidth: 0 }}>{grantLabel(g)}</span>
          </span>
        ))}
      </span>
      {claimed ? (
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: COL.xp }}>✓</span>
      ) : reached ? (
        <button type="button" data-claim={t} className="button-primary" onClick={() => askClaim(t)}
          style={{ flex: 'none', minWidth: 64, minHeight: 36, padding: '0 10px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Claim</button>
      ) : (
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>{need} <Star size={12} /></span>
      )}
    </div>
  );
}

function SeasonTab({ st }) {
  const se = st.season || {};
  const tiers = Array.isArray(se.tiers) ? se.tiers : [];
  const claimable = claimableTiers(st);
  const nt = nextTier(st);
  const prevNeed = nt ? tierNeed(st, nt - 1) : 0;
  const ntNeed = nt ? tierNeed(st, nt) : 0;
  return (
    <div>
      <div style={{ padding: '10px 10px', borderRadius: 10, background: COL.well, border: '1px solid ' + COL.border }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COL.text }}>Season {se.s}</span>
          <span style={{ fontSize: 11.5, color: COL.text2 }}>ends in {untilText(se.endsAt, st)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span data-season-stars={se.st} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 18, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
            <Star size={18} />{se.st}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <Meter n={nt ? se.st - prevNeed : 1} g={nt ? ntNeed - prevNeed : 1} color={COL.accent} h={10} />
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: COL.text2, marginTop: 6 }}>
          {nt ? 'Tier ' + nt + ' at ' + ntNeed + ' ★' : 'Every tier reached! A bonus spin every ' + (se.ovEvery || 5) + ' ★ more.'}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: COL.muted, margin: '6px 2px 0', lineHeight: 1.4 }}>
        Earn ★ from each daily quest, from finishing all three, and from your free spin. Missed days never cost ★, and
        anything you reach but don't claim is sent to you when the season ends.
      </div>
      {claimable.length > 1 && (
        <button type="button" data-claim-all={claimable.length} className="button-primary" onClick={() => askClaim('all')}
          style={{ width: '100%', minHeight: 44, marginTop: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Claim all ({claimable.length})
        </button>
      )}
      <Section right={(se.cl || []).length + '/' + tiers.length + ' claimed'}>Rewards</Section>
      <div data-season-tiers={tiers.length}>
        {tiers.map((g, i) => <TierRow key={i} st={st} t={i + 1} grants={g} claimed={(se.cl || []).includes(i + 1)} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COL.text2, margin: '10px 2px 0' }}>
        <SpinGlyph size={18} /> Past tier {tiers.length}: a bonus spin every {se.ovEvery || 5} ★.
      </div>
    </div>
  );
}

/* ── the window ── */

export const DailyRewardsWindow = () => {
  const win = useWin();
  const st = useState2();
  const [, tick] = useState(0);
  useModalGuard(React, !!win.open);

  /* fresh from the worker each time it opens; countdowns once a second */
  useEffect(() => {
    if (!win.open) return undefined;
    askRewards();
    const id = setInterval(() => tick((n) => n + 1), 1000);
    const onKey = (e) => { if (e.key === 'Escape') dailyRewardsBus.closeWindow(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
  }, [win.open, win.seq]);

  if (!win.open) return null;
  const close = () => dailyRewardsBus.closeWindow();
  const live = questsLive() || spinLive();
  const tab = win.tab === 'season' ? 'season' : 'today';
  const claimN = st ? claimableTiers(st).length : 0;

  const tabBtn = (id, label, badge) => (
    <button type="button" data-daily-tab={id} aria-pressed={tab === id} onClick={() => dailyRewardsBus.setTab(id)}
      style={{
        flex: 1, minWidth: 0, minHeight: 36, position: 'relative',
        background: tab === id ? COL.raised : 'transparent', color: tab === id ? COL.text : COL.text2,
        border: 'none', borderBottom: '2px solid ' + (tab === id ? COL.accent : 'transparent'), borderRadius: 8,
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
      }}>
      {label}
      {badge ? (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 3, right: 6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
          background: COL.accent, color: COL.onAccent, fontSize: 11, fontWeight: 900, lineHeight: '16px', textAlign: 'center',
        }}>{badge > 9 ? '9+' : badge}</span>
      ) : null}
    </button>
  );

  return (
    <div data-daily-rewards={tab} {...tapDismiss(close)}
      style={{
        ...TAP_DISMISS_STYLE,
        position: 'fixed', inset: 0, zIndex: Z, background: SCRIM,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 12px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        boxSizing: 'border-box',
      }}>
      <div data-daily-card="1"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, maxHeight: '100%', minHeight: 0,
          display: 'flex', flexDirection: 'column',
          background: COL.bg, border: '1px solid ' + COL.border, borderRadius: 14,
          boxShadow: '0 18px 40px rgba(4,9,12,.55)', overflow: 'hidden', cursor: 'default',
          fontFamily: 'Source Sans 3, sans-serif', color: COL.text,
        }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px 8px 14px', background: COL.bgStrong, borderBottom: '1px solid ' + COL.border }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: COL.text }}>Daily rewards</span>
          <button type="button" aria-label="Close" data-daily-close="1" onClick={close}
            style={{ flex: 'none', width: 44, height: 36, background: 'transparent', border: 0, color: COL.muted, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ flex: 'none', display: 'flex', gap: 2, margin: '8px 10px 0', padding: 2, borderRadius: 10, background: COL.well, border: '1px solid ' + COL.border }}>
          {tabBtn('today', 'Today')}
          {tabBtn('season', 'Season', claimN)}
        </div>
        <div className="ls-scrollbody" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain', padding: '4px 12px 16px' }}>
          {!live || !st ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', fontSize: 13, color: COL.muted }}>
              {live ? 'Loading…' : 'Daily rewards are not open right now.'}
            </div>
          ) : tab === 'season' ? <SeasonTab st={st} /> : <TodayTab st={st} />}
        </div>
      </div>
    </div>
  );
};
