/* ═══ v2.3.3030: A QUEST'S REWARDS FLY HOME ═══
 *
 * Owner's mockup of the new quest windows: "Rewards fly to their
 * destinations" -- the coins into the gold counter, the items into the bag
 * (the XP already flies to its skill's card: XpFlyOverlay, v2.3.1874).
 *
 * One picture per flight, a fixed <img> above every layer (z 1200: the scrim
 * is 44, the XP overlay 90), moved by the Web Animations API on transform and
 * opacity only -- the compositor runs it at the display's rate and nothing
 * here lays out or paints the page (no filter: TRAPS §42).  An arc rather
 * than a straight line, so a coin reads as tossed.  It lands on the target's
 * centre and the target gives the small bump `.bt-qw-landed`.
 *
 * Feedback only: every path is wrapped, and a missing target falls back to
 * the corner it lives in (the purse top right, the dashboard bottom left), so
 * nothing about the reward itself depends on a picture arriving.  Reduced
 * motion skips the flights entirely. */

var FLY_Z = 1200;

function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
}

/* a rect only when the element is really on screen */
function shownRect(el) {
  if (!el || !el.getBoundingClientRect) return null;
  var r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) return null;
  try {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return null;
  } catch (e) { return null; }
  return r;
}

/** Where a kind of reward lands: 'gold' the purse in the top bar, 'item' the
    gear stash's tile when the dashboard is open, else its fold chip, else its
    dashboard button.  The element, or null. */
export function questFlyTarget(kind) {
  if (typeof document === 'undefined') return null;
  var sels = kind === 'gold'
    ? ['[data-purse="1"]']
    : ['[data-tut="coach-gear"]', '[data-dash-fold]', '[data-nav="dashboard"]'];
  for (var i = 0; i < sels.length; i++) {
    var els = document.querySelectorAll(sels[i]);
    for (var j = 0; j < els.length; j++) if (shownRect(els[j])) return els[j];
  }
  return null;
}

function fallbackRect(kind) {
  var w = window.innerWidth, hh = window.innerHeight;
  return kind === 'gold'
    ? { left: w - 44, top: 10, width: 30, height: 26 }
    : { left: 14, top: hh - 50, width: 40, height: 36 };
}

function pulse(el) {
  if (!el || !el.classList) return;
  el.classList.remove('bt-qw-landed');
  /* re-start the keyframe if it is still running from the previous coin */
  void el.offsetWidth;
  el.classList.add('bt-qw-landed');
  setTimeout(function () { try { el.classList.remove('bt-qw-landed'); } catch (e) { /* gone */ } }, 560);
}

/* QA (mp-questwin): how many pictures took off and landed, and where */
function qa() {
  if (!window.__btQuestFly) window.__btQuestFly = { flown: 0, landed: 0, last: [] };
  return window.__btQuestFly;
}

/** Fly one picture from an element (or rect) to the target of `kind`. */
export function flyPicture(src, from, kind, opts) {
  try {
    if (typeof document === 'undefined' || !src || reducedMotion()) return false;
    var o = opts || {};
    var a = from && from.getBoundingClientRect ? from.getBoundingClientRect() : from;
    if (!a) return false;
    var toEl = questFlyTarget(kind);
    var b = shownRect(toEl) || fallbackRect(kind);
    var size = o.size || 34;
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'bt-qw-fly';
    img.setAttribute('data-qw-fly', kind);
    img.setAttribute('aria-hidden', 'true');
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.zIndex = String(FLY_Z);
    document.body.appendChild(img);
    var x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
    var x1 = b.left + b.width / 2 - size / 2, y1 = b.top + b.height / 2 - size / 2;
    var mx = (x0 + x1) / 2 + (o.drift || 0), my = Math.min(y0, y1) - (o.lift == null ? 70 : o.lift);
    var dur = o.dur || 760, delay = o.delay || 0;
    var q = qa();
    q.flown++;
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      try { img.remove(); } catch (e) { /* gone */ }
      q.landed++;
      var where = 'corner';
      if (toEl) {
        where = toEl.getAttribute('data-purse') ? 'purse'
          : toEl.getAttribute('data-tut') ? toEl.getAttribute('data-tut')
            : toEl.hasAttribute('data-dash-fold') ? 'fold'
              : (toEl.getAttribute('data-nav') || 'el');
      }
      q.last.push({ kind: kind, to: where });
      if (q.last.length > 12) q.last.shift();
      if (toEl && kind !== 'gold') pulse(toEl);
      if (o.onLand) { try { o.onLand(); } catch (e) { /* feedback only */ } }
    };
    if (img.animate) {
      var anim = img.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.6)', opacity: 0 },
        { transform: 'translate(' + x0 + 'px,' + (y0 - 12) + 'px) scale(1.12)', opacity: 1, offset: 0.14 },
        { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.5)', opacity: 0.9 },
      ], { duration: dur, delay: delay, easing: 'cubic-bezier(.42,.02,.58,1)', fill: 'both' });
      anim.onfinish = finish;
      anim.oncancel = finish;
    } else {
      img.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px)';
    }
    /* never leave a picture stranded: a tab hidden mid-flight pauses the
       animation, and its onfinish then never comes */
    setTimeout(finish, delay + dur + 600);
    return true;
  } catch (e) {
    return false;
  }
}

/** The claim's flights: a few coins from `goldFrom` to the purse, each item's
    picture from its slot to the bag.  `items` is [{ el, src }]. */
export function flyQuestRewards(spec) {
  var s = spec || {};
  var n = 0;
  if (s.gold > 0 && s.goldFrom) {
    var coins = s.gold >= 100 ? 5 : s.gold >= 40 ? 4 : 3;
    for (var i = 0; i < coins; i++) {
      if (flyPicture(s.goldSrc || '/icons/ui/cur-gold.webp', s.goldFrom, 'gold',
        { delay: (s.delay || 0) + i * 85, size: 26, drift: (i - (coins - 1) / 2) * 14, lift: 60 + i * 6 })) n++;
    }
  }
  (s.items || []).forEach(function (it, k) {
    if (it && it.el && it.src && flyPicture(it.src, it.el, 'item',
      { delay: (s.delay || 0) + 260 + k * 140, size: 46, lift: 90 })) n++;
  });
  return n;
}
