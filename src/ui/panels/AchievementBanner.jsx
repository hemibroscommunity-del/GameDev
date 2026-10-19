import React from 'react';
import { ACHV_TIERS, achvById, achvAp } from '@/data/achievements.js';
import { achvMoment, achvWorldShown, BANNER_MS } from '@/game/achievements.js';
import { codexAnnouncement } from '@/game/monsterCodex.js';
import { cue } from '@/game/eventSounds.js';
import { QUALITY_PRISM, qualityInk } from '@/ui/mobile/dash/common.js';

/* ═══ v2.3.3485: THE ACHIEVEMENT BANNER ═══
 * The owner's decision 4 ("Go recommended on everything", server
 * achievements.js): a rare, arena or super-rare achievement is a BANNER and a
 * SOUND; a common one a line in the chat (game/achievements.js).  "Gladiator ·
 * +500 AP", its picture, in its tier's colour (the armour's grade colours:
 * rare blue, the arena's orange, super-rare a rainbow ring), for BANNER_MS --
 * about three seconds -- then it goes.  It never stops a fight: no scrim,
 * pointer-events none, nothing to tap.
 *
 * WHEN: game/achievements.js queues each big one as a MOMENT and this shows
 * it only once the world is in view (a crown paid by the mail is granted
 * behind the loading screen), SETTLE_MS after it came (the kill that opens
 * the codex's ninth page sends its achievement just BEFORE the kill's credit
 * raises the NEW MONSTER card, which takes this same spot: so the banner
 * waits a beat, sees the card, and sits under it), and once its picture is
 * decoded (ICON_WAIT_MS at most), so it never draws half there.  The sound
 * is the arena champion's own fanfare, `champion` (data/eventSounds.js; a
 * recording already loaded) -- held a second apart there (CUE_GAP_MS), so the
 * arena's crown and its Gladiator banner, half a second apart, are one
 * fanfare and not two.
 *
 * WHERE: inside the game's column.  BroTown draws this OUTSIDE the world's
 * wrap, beside QuestCoach (the wrap is position:fixed and so its own stacking
 * context: inside it no z-index beats the dashboard band), and its layer is
 * `position: fixed; inset: 0` -- the window on a phone, and on a computer
 * #root's box, the column (#root has contain:paint there: src/ui/fixedBox.js).
 * game.css `.bt-achv-banner` centres the plate on the WORLD's width
 * (--world-x, --play-w: sideways the dashboard takes a side), under the
 * minimap upright and near the top sideways, where the NEW MONSTER card is.
 * Transform and opacity only, no filter or blur: it is drawn over the live
 * WebGL canvas (TRAPS §42). */
const POLL_MS = 150;
const SETTLE_MS = 400;
const ICON_WAIT_MS = 1500;
const SLATE = '#1E2E34';

/* each picture decoded once, before its first banner */
const _icons = new Map();
function iconReady(id, now) {
  const a = achvById(id);
  if (!a || !a.icon || typeof Image === 'undefined') return true;
  let e = _icons.get(a.icon);
  if (!e) {
    e = { state: 'loading', t0: now };
    _icons.set(a.icon, e);
    try {
      const img = new Image();
      img.src = a.icon;
      const done = (ok) => { e.state = ok ? 'ok' : 'bad'; };
      if (typeof img.decode === 'function') img.decode().then(() => done(true), () => done(false));
      else { img.onload = () => done(true); img.onerror = () => done(false); }
    } catch (_e) { e.state = 'bad'; }
  }
  return e.state !== 'loading' || now - e.t0 > ICON_WAIT_MS;
}

/* QA (mp-achievements): the banners shown, the last, and its sound */
function qa(id, low) {
  if (typeof window === 'undefined') return;
  const q = window.__btAchvBanner || (window.__btAchvBanner = { shown: 0, ids: [], last: null });
  q.shown++;
  q.ids.push(id);
  if (q.ids.length > 20) q.ids.shift();
  q.last = { id, at: Date.now(), low };
}

export function AchievementBanner({ stateRef }) {
  const [, setTick] = React.useState(0);
  const keyRef = React.useRef(null);
  React.useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      if (!S || !S._achv) return;
      const now = Date.now();
      const m = achvMoment(S, now, (aid, at) => now - at >= SETTLE_MS && achvWorldShown(S) && iconReady(aid, now));
      if (m && m.started && S._achv.showing) {
        /* a NEW MONSTER card up now: this one sits under it, for its whole
           stay (it never jumps while it is read) */
        S._achv.showing.low = !!codexAnnouncement(S, now);
        cue('champion');
        qa(m.id, S._achv.showing.low);
      }
      const k = m ? m.id + '@' + m.shownAt : null;
      if (k !== keyRef.current) { keyRef.current = k; setTick((x) => (x + 1) % 1000000); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stateRef]);

  const S = stateRef && stateRef.current;
  const sh = S && S._achv && S._achv.showing;
  const def = sh ? achvById(sh.id) : null;
  if (!sh || !def) return null;
  const tier = ACHV_TIERS[def.tier];
  const prism = tier.color === 'prismatic';
  const ink = prism ? qualityInk('godly') : { color: tier.color };
  const frame = prism
    ? { border: '1.5px solid transparent', background: 'linear-gradient(' + SLATE + ',' + SLATE + ') padding-box, ' + QUALITY_PRISM + ' border-box' }
    : { border: '1.5px solid ' + tier.color, background: SLATE };
  return (
    <div data-achv-banner-layer="" style={{ position: 'fixed', inset: 0, zIndex: 58, pointerEvents: 'none', overflow: 'hidden' }}>
      <div key={sh.shownAt} className={'bt-achv-banner' + (sh.low ? ' is-low' : '')}
        data-achv-banner={def.id} data-achv-tier={def.tier} role="status" aria-live="polite"
        style={{ ...frame, '--achv-ms': BANNER_MS + 'ms' }}>
        <div style={{ flex: '0 0 auto', width: 48, height: 48, borderRadius: 10, background: '#111E23',
          display: 'grid', placeItems: 'center', border: '1px solid rgba(234,198,117,.45)' }}>
          <img src={def.icon} alt="" draggable={false} width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', lineHeight: 1.3 }}>
            <span style={ink}>{tier.label} achievement</span>
          </div>
          <div data-achv-banner-words="" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>
            {def.name}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}> · </span>
            <span data-achv-banner-ap={achvAp(def.id)} style={{ ...ink, fontVariantNumeric: 'tabular-nums' }}>+{achvAp(def.id).toLocaleString('en-US')} AP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchievementBanner;
