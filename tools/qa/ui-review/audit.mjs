/* ═══ v2.3.3407: WHAT CAN BE PRESSED ON THIS SCREEN, AND CAN IT BE ═══
 *
 * The owner: "Make sure all actions/buttons can be completed in landscape mode
 * and on the computer ... I'll also want screenshots labelled and bundled for
 * all UI elements in each view (portrait, landscape, desktop, etc) so I can
 * have chatGPT analyze them for improvements."
 *
 * Two functions the capture (capture.mjs) runs IN THE PAGE, so each is
 * self-contained -- no closure over this module, nothing imported:
 *
 *   auditControls(opts)  every control a player could press that is on the
 *                        screen right now -- a button, a tab, a link, a field,
 *                        anything the game marks as a tap target -- with its
 *                        name, its box, and what is wrong with it:
 *                          cut off    part of it past the screen's edge
 *                          covered    the middle of it answers as something
 *                                     else (another control or a card over it)
 *                          small      under 32 CSS px on a touch screen (44 is
 *                                     Apple's own guide, noted separately),
 *                                     measured by the box a press lands in --
 *                                     an invisible ring round it counts
 *                          clipped    its words run past its own edge
 *                          overlap    drawn over by a control that lets the
 *                                     press through (the bell over a window)
 *                        The question it answers is the same one QuestCoach's
 *                        `reachable` asks (TRAPS §41: a control that measures
 *                        but cannot be hit is the bug a screenshot hides).
 *   drawOverlay(list)    a numbered box round each one, green when it is fine,
 *                        amber when small or drawn over, red when cut off or
 *                        covered, so the
 *                        annotated picture and the legend in the bundle read
 *                        together.  clearOverlay() takes it away again.
 *
 * Only the DOM is audited: what the game draws on its canvas (the minimap, name
 * plates, the bars over heads) is in the clean picture, not in the legend.
 */

export function auditControls(opts) {
  const o = opts || {};
  const touch = !!o.touch;
  const OVERLAY = 'bt-ui-review-overlay';
  const view = o.clip || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  /* On a computer the game plays in a column (#root, contain:paint) that clips
     what is inside it; a window portalled to the page body -- the NPC
     dialogue, the quest offer, the world map -- is not inside it and is not
     clipped by it, so it is judged against the picture's own box (`o.inner`
     names the column). */
  const innerEl = o.inner ? document.querySelector(o.inner) : null;
  const innerR = innerEl ? innerEl.getBoundingClientRect() : null;
  const clipOf = (el) => (innerR && innerEl.contains(el))
    ? { left: Math.max(view.left, innerR.left), top: Math.max(view.top, innerR.top),
      right: Math.min(view.right, innerR.right), bottom: Math.min(view.bottom, innerR.bottom) }
    : view;
  const SEL = [
    'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
    '[role="button"]', '[role="tab"]', '[role="menuitem"]', '[role="checkbox"]', '[role="switch"]',
    '[role="slider"]', '[role="option"]', '[role="link"]',
    '[tabindex]:not([tabindex="-1"])', '[data-tut]', '[data-dash-fold]', '[data-gear]', '[data-bag-key]',
    '[data-rbutton]', '[data-world-map-open]', '[data-world-map-north]',
  ].join(',');
  const shown = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if (parseFloat(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  const nameOf = (el) => {
    const a = el.getAttribute('aria-label') || el.getAttribute('title');
    if (a && a.trim()) return a.trim().slice(0, 60);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const p = el.getAttribute('placeholder');
      if (p) return ('field: ' + p).slice(0, 60);
      return 'field' + (el.value ? ': ' + String(el.value).slice(0, 30) : '');
    }
    const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 60);
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.getAttribute('alt')) return img.getAttribute('alt').slice(0, 60);
    for (const k of ['data-tut', 'data-gear', 'data-bag-key', 'data-dash-fold', 'data-ricon', 'data-act']) {
      const v = el.getAttribute(k);
      if (v) return (k.replace('data-', '') + ': ' + v).slice(0, 60);
    }
    const c = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean)[0];
    return '(' + el.tagName.toLowerCase() + (c ? '.' + c : '') + ', no label)';
  };
  const describe1 = (n) => {
    const c = (typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    const lbl = n.getAttribute && (n.getAttribute('aria-label') || n.getAttribute('title'));
    const t = (n.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    const da = n.attributes ? Array.from(n.attributes).find((a) => a.name.startsWith('data-')) : null;
    return n.tagName.toLowerCase() + (c ? '.' + c : '') + (da ? `[${da.name}${da.value ? '=' + da.value.slice(0, 16) : ''}]` : '')
      + (lbl ? ' "' + lbl.slice(0, 30) + '"' : t ? ' "' + t + '"' : '');
  };
  /* a bare <div> says nothing to a reader: name the nearest thing round it
     that has a name (a class, a data- attribute, a label) */
  const describe = (n) => {
    if (!n) return 'nothing';
    const d = describe1(n);
    if (d !== n.tagName.toLowerCase()) return d;
    for (let p = n.parentElement, k = 0; p && p !== document.body && k < 6; p = p.parentElement, k++) {
      const pd = describe1(p);
      if (pd !== p.tagName.toLowerCase()) return d + ' in ' + pd;
    }
    return d;
  };
  const topAt = (x, y) => {
    let stack = [];
    try { stack = document.elementsFromPoint(x, y) || []; } catch (e) { stack = []; }
    for (const n of stack) {
      if (n.closest && n.closest('#' + OVERLAY)) continue;
      return n;
    }
    return null;
  };
  const all = Array.from(document.querySelectorAll(SEL));
  const out = [];
  const kept = [];
  for (const el of all) {
    if (el.closest('#' + OVERLAY)) continue;
    if (el.disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) continue;
    /* on the screen (the clip) at all */
    const clip = clipOf(el);
    if (r.right <= clip.left || r.left >= clip.right || r.bottom <= clip.top || r.top >= clip.bottom) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents === 'none') continue;
    if (!shown(el)) continue;
    /* the same box as a control already kept, inside it: one control, not two */
    if (kept.some((k) => k.el.contains(el) && Math.abs(k.r.left - r.left) < 3 && Math.abs(k.r.top - r.top) < 3
      && Math.abs(k.r.width - r.width) < 3 && Math.abs(k.r.height - r.height) < 3)) continue;
    kept.push({ el, r });
  }
  /* the controls that stand aside (pointer-events none) but are drawn -- each
     a candidate for lying over one that takes the press (below) */
  /* ...and only one that DRAWS something: a see-through hit area (the
     minimap's own "open the map" button over the map the canvas draws) hides
     nothing */
  const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  const paints = (n) => {
    const cs = getComputedStyle(n);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (!clear(cs.backgroundColor)) return true;
    if (parseFloat(cs.borderTopWidth) > 0 && !clear(cs.borderTopColor)) return true;
    if ((n.innerText || '').trim()) return true;
    return !!n.querySelector('img, svg, canvas, video');
  };
  const passive = all.filter((p) => {
    if (p.closest('#' + OVERLAY)) return false;
    if (getComputedStyle(p).pointerEvents !== 'none') return false;
    const pr = p.getBoundingClientRect();
    if (pr.width < 6 || pr.height < 6) return false;
    const clip = clipOf(p);
    if (pr.right <= clip.left || pr.left >= clip.right || pr.bottom <= clip.top || pr.top >= clip.bottom) return false;
    return shown(p) && paints(p);
  });
  /* the part of a control its scrolling (or clipping) ancestors let show: a
     control scrolled half out of its list shows only that half, and only that
     half takes a press -- so that half is what is tested for being covered.
     Null when none of it shows: scrolled out of view is not on the screen,
     whatever its box says. */
  const visibleOf = (el, r) => {
    let v = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowY + ' ' + cs.overflowX)) {
        const pr = n.getBoundingClientRect();
        v = { left: Math.max(v.left, pr.left), top: Math.max(v.top, pr.top), right: Math.min(v.right, pr.right), bottom: Math.min(v.bottom, pr.bottom) };
        if (v.right - v.left < 2 || v.bottom - v.top < 2) return null;
      }
    }
    return v;
  };
  /* v2.3.3456: the box a press lands in, when it is bigger than what is
     drawn.  A control's own ::before or ::after, placed round it, takes its
     presses as the control: every window's ✕ is drawn 28 px inside an
     invisible ring that makes it 44 (game.css .bt-inspect-close::after,
     v2.3.1235), the pinned quest card's small buttons likewise -- measuring
     only the drawing, the check called all seventeen building windows' ✕
     small for a finger.  Counted only as the browser would hit it: a
     pseudo-element with content, absolutely placed on a control that is
     itself placed (so the control is what it is placed in), taking presses,
     and only as far as the control's scrolling or clipping ancestors let it
     show.  Null when nothing grows the box. */
  const touchBox = (el, r) => {
    const ecs = getComputedStyle(el);
    if (ecs.position === 'static') return null;
    const px = (s) => (/^-?[\d.]+px$/.test(s) ? parseFloat(s) : null);
    let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    for (const which of ['::before', '::after']) {
      const p = getComputedStyle(el, which);
      if (!p || p.content === 'none' || p.content === 'normal' || p.display === 'none') continue;
      if (p.position !== 'absolute' || p.pointerEvents === 'none' || p.visibility === 'hidden') continue;
      const L = px(p.left), T = px(p.top), R = px(p.right), Bm = px(p.bottom);
      if (L === null || T === null || R === null || Bm === null) continue;
      const bl = parseFloat(ecs.borderLeftWidth) || 0, bt = parseFloat(ecs.borderTopWidth) || 0;
      const br = parseFloat(ecs.borderRightWidth) || 0, bb = parseFloat(ecs.borderBottomWidth) || 0;
      x0 = Math.min(x0, r.left + bl + L); y0 = Math.min(y0, r.top + bt + T);
      x1 = Math.max(x1, r.right - br - R); y1 = Math.max(y1, r.bottom - bb - Bm);
    }
    if (x1 - x0 <= r.width + 1 && y1 - y0 <= r.height + 1) return null;
    const v = visibleOf(el, { left: x0, top: y0, right: x1, bottom: y1 });
    const w = Math.max(r.width, v ? v.right - v.left : 0), h = Math.max(r.height, v ? v.bottom - v.top : 0);
    return (w <= r.width + 1 && h <= r.height + 1) ? null : { w, h };
  };
  let num = 0;
  for (const { el, r } of kept) {
    const shownR = visibleOf(el, r);
    if (!shownR) continue;
    const clip = clipOf(el);
    const issues = [];
    /* cut off by the screen's edge (the frame on a computer).  Inside a list
       that scrolls, a control half out of view is only scrolled part-way --
       the player scrolls to it -- unless the LIST itself runs past the screen,
       whose end can then never be scrolled into view. */
    const edges = [];
    if (r.left < clip.left - 1) edges.push('left');
    if (r.right > clip.right + 1) edges.push('right');
    if (r.top < clip.top - 1) edges.push('top');
    if (r.bottom > clip.bottom + 1) edges.push('bottom');
    if (edges.length) {
      let sr = null;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const ns = getComputedStyle(n);
        const scrolls = (/(auto|scroll)/.test(ns.overflowY) && n.scrollHeight > n.clientHeight + 1)
          || (/(auto|scroll)/.test(ns.overflowX) && n.scrollWidth > n.clientWidth + 1);
        if (scrolls) { sr = n.getBoundingClientRect(); break; }
      }
      if (!sr) issues.push({ kind: 'cut-off', text: 'cut off at the ' + edges.join(' and ') + ' edge of the screen' });
      else if (sr.left < clip.left - 1 || sr.right > clip.right + 1 || sr.top < clip.top - 1 || sr.bottom > clip.bottom + 1) {
        issues.push({ kind: 'cut-off', text: 'its scrolling list runs past the ' + edges.join(' and ') + ' edge of the screen, so the end of the list cannot be scrolled into view' });
      }
    }
    /* covered: the middle of its visible part answers as something else */
    const vx0 = Math.max(shownR.left, clip.left), vx1 = Math.min(shownR.right, clip.right);
    const vy0 = Math.max(shownR.top, clip.top), vy1 = Math.min(shownR.bottom, clip.bottom);
    if (vx1 - vx0 < 2 || vy1 - vy0 < 2) continue;   /* what shows of it lies off the picture */
    const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2;
    const top = topAt(cx, cy);
    if (top && top !== el && !el.contains(top)) {
      /* a label or picture laid over a control that the control still gets
         (pointer-events none on the cover) cannot answer here, so `top` is a
         real taker of the press.
         ...unless it is a whole SCREEN in front -- a modal, a window, the
         login door over the world: the controls behind it are not on this
         screen at all, so they are left out of its list rather than called
         covered.  The screen is the biggest box between `top` and the
         control's common ancestor; half the view or more is a screen. */
      let big = 0;
      for (let n = top; n && n !== document.body && !n.contains(el); n = n.parentElement) {
        const nr = n.getBoundingClientRect();
        big = Math.max(big, Math.max(0, Math.min(nr.right, clip.right) - Math.max(nr.left, clip.left))
          * Math.max(0, Math.min(nr.bottom, clip.bottom) - Math.max(nr.top, clip.top)));
      }
      const area = Math.max(1, (clip.right - clip.left) * (clip.bottom - clip.top));
      if (big >= 0.45 * area) continue;
      issues.push({ kind: 'covered', text: 'covered by ' + describe(top) });
    } else {
      /* ...and PART of it: four points a quarter in from its corners.  A
         control whose middle answers but whose corner lies under another
         (the bell over a window's tab) takes a press there as the other's. */
      const pts = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
      for (const [fx, fy] of pts) {
        const px = vx0 + (vx1 - vx0) * fx, py = vy0 + (vy1 - vy0) * fy;
        const t2 = topAt(px, py);
        if (!t2 || t2 === el || el.contains(t2) || t2.contains(el)) continue;
        /* a sibling control laid INTO this one on purpose (a badge, a count)
           inside the same pressable parent is the control's own */
        const pressable = (n) => n && n.closest && n.closest('button, [role="button"], [role="tab"], a[href], [data-bag-key], [data-gear]');
        if (pressable(t2) === el) continue;
        issues.push({ kind: 'covered', text: 'partly covered by ' + describe(t2) });
        break;
      }
    }
    /* ...and DRAWN OVER by a control that stands aside -- pointer-events none,
       so the press goes through to this one, but its picture lies on top: the
       notification bell over a window's bottom row while a panel is open
       (WorldChatFeed declines the tap then, and stays drawn).  The hit test
       above cannot see such a thing, so each one that crosses this control is
       made pressable for an instant and asked whether it is on top there. */
    if (!issues.some((i) => i.kind === 'covered')) {
      for (const p of passive) {
        if (p === el || p.contains(el) || el.contains(p)) continue;
        const pr = p.getBoundingClientRect();
        const ix0 = Math.max(vx0, pr.left), ix1 = Math.min(vx1, pr.right);
        const iy0 = Math.max(vy0, pr.top), iy1 = Math.min(vy1, pr.bottom);
        if (ix1 - ix0 < 4 || iy1 - iy0 < 4) continue;
        const share = ((ix1 - ix0) * (iy1 - iy0)) / Math.max(1, Math.min((vx1 - vx0) * (vy1 - vy0), pr.width * pr.height));
        if (share < 0.12) continue;
        const was = p.style.pointerEvents;
        p.style.pointerEvents = 'auto';
        const t3 = topAt((ix0 + ix1) / 2, (iy0 + iy1) / 2);
        p.style.pointerEvents = was;
        if (t3 && (t3 === p || p.contains(t3))) {
          issues.push({ kind: 'overlap', text: 'drawn over by ' + describe(p) + ' (which lets the press through)' });
          break;
        }
      }
    }
    /* size against a finger (a computer's mouse is finer), by the box the
       press lands in (touchBox) */
    const hit = touchBox(el, r);
    const drawnWH = Math.round(r.width) + 'x' + Math.round(r.height);
    const sizeWords = hit ? 'drawn ' + drawnWH + ', touch area ' + Math.round(hit.w) + 'x' + Math.round(hit.h) + ' px' : drawnWH + ' px';
    const m = hit ? Math.min(hit.w, hit.h) : Math.min(r.width, r.height);
    if (touch && m < 32) issues.push({ kind: 'small', text: 'small for a finger: ' + sizeWords + ' (aim for 44)' });
    else if (touch && m < 44) issues.push({ kind: 'tight', text: sizeWords + ', under the 44 px touch guide' });
    else if (!touch && m < 16) issues.push({ kind: 'small', text: 'small for a mouse: ' + sizeWords });
    /* its own words run past its edge */
    if ((cs => cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis')(getComputedStyle(el))
      && (el.scrollWidth > el.clientWidth + 2) && (el.innerText || '').trim()) {
      issues.push({ kind: 'clipped', text: 'its words are cut off' });
    }
    num += 1;
    el.setAttribute('data-ui-review-n', String(num));
    out.push({
      n: num, name: nameOf(el), tag: el.tagName.toLowerCase(),
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      /* the touch area, when it is bigger than the drawing (touchBox) */
      ...(hit ? { tw: Math.round(hit.w), th: Math.round(hit.h) } : {}),
      /* the part that shows, when its list has scrolled some of it away: the
         box is drawn there, not over whatever lies past the list's edge */
      vis: (shownR.left > r.left + 1 || shownR.top > r.top + 1 || shownR.right < r.right - 1 || shownR.bottom < r.bottom - 1)
        ? { x: Math.round(shownR.left), y: Math.round(shownR.top), w: Math.round(shownR.right - shownR.left), h: Math.round(shownR.bottom - shownR.top) }
        : null,
      issues,
    });
  }
  return { controls: out, viewport: { w: window.innerWidth, h: window.innerHeight }, clip: view };
}

export function drawOverlay(list) {
  const OVERLAY = 'bt-ui-review-overlay';
  const old = document.getElementById(OVERLAY);
  if (old) old.remove();
  const root = document.createElement('div');
  root.id = OVERLAY;
  root.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
  for (const c of list || []) {
    const bad = c.issues.some((i) => i.kind === 'cut-off' || i.kind === 'covered');
    const warn = !bad && c.issues.some((i) => i.kind === 'small' || i.kind === 'clipped' || i.kind === 'overlap');
    const col = bad ? '#ff3b30' : warn ? '#ffb020' : '#34c759';
    const b = document.createElement('div');
    const v = c.vis || c;
    b.style.cssText = 'position:absolute;box-sizing:border-box;border:2px solid ' + col + ';border-radius:4px;'
      + (c.vis ? 'border-style:dashed;' : '')
      + 'left:' + v.x + 'px;top:' + v.y + 'px;width:' + v.w + 'px;height:' + v.h + 'px;';
    const t = document.createElement('div');
    t.textContent = String(c.n);
    t.style.cssText = 'position:absolute;left:-2px;top:-2px;transform:translate(-30%,-55%);min-width:16px;height:16px;'
      + 'padding:0 3px;box-sizing:border-box;border-radius:8px;background:' + col + ';color:#000;'
      + 'font:700 11px/16px Arial,sans-serif;text-align:center;box-shadow:0 0 0 1px rgba(0,0,0,.6);';
    b.appendChild(t);
    root.appendChild(b);
  }
  document.body.appendChild(root);
  return (list || []).length;
}

export function clearOverlay() {
  const old = document.getElementById('bt-ui-review-overlay');
  if (old) old.remove();
  for (const el of document.querySelectorAll('[data-ui-review-n]')) el.removeAttribute('data-ui-review-n');
  return true;
}
