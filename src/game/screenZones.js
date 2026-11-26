/* ═══ v2.3.6683: A SCREEN'S ZONES AND ITS ROW OF ACTIONS (card UI2-bro, the build's step 3, PR 1) ═══
 *
 * The pieces of a SCREEN that every later page of the new dashboard uses,
 * made here ONCE (finish.md part 5, rule 5) and drawn by the kit
 * (src/ui/kit/Zones.jsx, ActionRow.jsx, Confirm.jsx).  The owner's master
 * specification, 2026-11-25:
 *   1.2.1 "Use predictable screen zones: contextual header; identity/context;
 *         primary summary; secondary information and deeper destinations;
 *         contextual actions at bottom ... Empty/unneeded zones collapse and
 *         useful content reclaims the space."
 *   1.2.3 "Put relevant actions in a separate bottom zone; reclaim the zone if
 *         no actions apply. Preserve predictable positions for common
 *         actions."  "Confirm consequential, costly or irreversible actions;
 *         routine reversible operations can execute immediately with
 *         feedback."
 *   14 Q83 "retain the relevant action in its predictable location in a
 *         visibly disabled state, with a short adjacent explanation."
 *
 * An action is { id, slot, cost, check }: `slot` its fixed place in the row
 * (0 the first); `cost` 'routine' | 'costly' | 'irreversible'; `check()` THE
 * SAME RULE that would refuse it, giving back null (it may go) or the reason
 * (a word to show).  So the "why" beside a disabled action is never a second
 * text kept apart from the rule: it is the rule's own answer.
 *
 * NO IMPORTS: node tests it (tools/guards/screen-zones.test.mjs). */

/* the zones, top to bottom (the header is the frame's: DashHeader) */
export const SCREEN_ZONES = Object.freeze(['identity', 'summary', 'doors', 'actions']);

export const ACTION_COSTS = Object.freeze(['routine', 'costly', 'irreversible']);

/* the reason an action with no rule (or a rule that throws) is off: the kit's word's key (ui2Kit.js) */
export const WHY_NO_RULE = 'ui2Kit.noRule';

const filled = (v) => {
  if (v == null || v === false) return false;
  if (Array.isArray(v)) return v.some(filled);
  return true;
};

/**
 * The zones a screen draws, in order, from what it has: { identity, summary,
 * doors, actions } (anything; an empty list, null or false is empty).  An
 * empty zone is LEFT OUT, so the zones that are drawn share its room; the
 * last drawn zone before the actions takes what is left (`grow`).
 */
export function screenZones(has) {
  const h = has || {};
  const out = SCREEN_ZONES.filter((z) => filled(h[z]));
  const body = out.filter((z) => z !== 'actions');
  return out.map((z) => Object.freeze({ id: z, grow: z === body[body.length - 1] }));
}

/**
 * The row of actions, each in its place.  Gives back one cell a slot, from 0
 * to the highest slot named: an action's slot holds it whether its neighbours
 * are there or not (a slot nobody fills is an empty cell, so nothing moves
 * over).  A cell: { id, slot, on, why, confirm } or null.  `on` is true only
 * when its check says nothing; `why` is the check's own reason; `confirm` only
 * for a costly or irreversible action.  No action: [] (the zone gives its room
 * back).  An action with no check, or a check that throws, is OFF with the
 * reason 'unknown' (never quietly on).
 */
export function screenActions(actions) {
  const list = (actions || []).filter((a) => a && a.id != null);
  if (!list.length) return [];
  let top = 0;
  for (const a of list) top = Math.max(top, Math.max(0, Math.floor(Number(a.slot) || 0)));
  const cells = new Array(top + 1).fill(null);
  for (const a of list) {
    const slot = Math.max(0, Math.floor(Number(a.slot) || 0));
    let why = null;
    if (typeof a.check !== 'function') why = WHY_NO_RULE;
    else {
      try { why = a.check(); } catch (e) { why = WHY_NO_RULE; }
    }
    const on = why == null || why === false || why === '';
    cells[slot] = Object.freeze({ id: String(a.id), slot, on, why: on ? null : String(why), confirm: needsConfirm(a) });
  }
  return cells;
}

/** Does this action ask first: only what costs or cannot be undone. */
export function needsConfirm(a) {
  const c = a && a.cost;
  return c === 'costly' || c === 'irreversible';
}
