/* ═══ v2.3.6872: THE ONE QUANTITY PICKER (card MN step 13; the card's Decided 6) ═══
 *
 * Minus, the number, plus, Max -- every button 44 x 44 or more (the
 * wireframe's stepper, `.footer .stepper`, in the game's kit: the u2 raised
 * control), the icons drawn.  What it draws is the rule's
 * (src/game/menus3Qty.js qtyView): the number held to 1..the cap, minus at 1
 * and plus at the cap greyed, Max to the cap.  A shared piece: the Counter's
 * Make uses it today, Trade and Keep when their steps mount. */
import { qtyView, qtyPress } from '@/game/menus3Qty.js';
import { SAY } from '@/data/say/menus3Counter.js';
import { say } from '@/game/say.js';
import { frameTap } from '@/ui/mobile/dash/DashHeader.jsx';

function Sign({ plus }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d={plus ? 'M3 8 H13 M8 3 V13' : 'M3 8 H13'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** `n` the number, `max` the cap, `onChange(n)`; `off` greys it all (a queue running). */
export function Menus3Qty({ n, max, onChange, off }) {
  const v = qtyView(n, max);
  const press = (p) => { if (!off) onChange(qtyPress(v.n, v.cap, p)); };
  const btn = (lit, p, label, child, extra) => (
    <button type="button" className={'u2-raised u2-ctl m3-qty-btn' + (extra || '')} disabled={off || !lit} aria-label={label}
      data-menus3-qty={p} {...frameTap(() => { if (lit) press(p); })}>{child}</button>
  );
  return (
    <div className="m3-qty" role="group" aria-label={say(SAY, 'menus3Counter.qtyAria')} data-menus3-qty-n={v.n} data-menus3-qty-cap={v.cap}>
      {btn(v.minus, 'minus', say(SAY, 'menus3Counter.minus'), <Sign />)}
      <b className="m3-qty-n" aria-live="polite">{v.n}</b>
      {btn(v.plus, 'plus', say(SAY, 'menus3Counter.plus'), <Sign plus />)}
      {btn(v.max, 'max', say(SAY, 'menus3Counter.maxAria', { n: v.cap }), say(SAY, 'menus3Counter.max'), ' is-word')}
    </div>
  );
}
