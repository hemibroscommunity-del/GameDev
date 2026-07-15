/* v2.3.1283: shared motion tokens for the bottom sheet.  The 220ms
   cubic-bezier is the established panel-motion token (BottomDashboard
   v2.3.1236+); prefersReducedMotion() is the first shared JS helper for
   the OS accessibility setting (the three existing CSS blocks keep
   their own @media guards). */

export const SHEET_TRANSITION = 'height 220ms cubic-bezier(.2,.8,.2,1)';

let _mq = null;
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (!_mq) _mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  return _mq.matches;
}

export function sheetTransition() {
  return prefersReducedMotion() ? 'none' : SHEET_TRANSITION;
}
