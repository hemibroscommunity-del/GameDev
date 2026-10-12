/* ═══ v2.3.3189: A PAGE THAT READS TALL — sheetTallBus ═══
 *
 * Owner, 2026-10-12, with a mockup of the monster codex's page filling the
 * screen under the dashboard's own top row: "I also want to change the
 * structure of each monster entry to look like this."
 *
 * The sheet keeps ONE height for every destination (sheetGeometry.js
 * expandedSheetHeight, v2.3.1638: nothing moves when a panel opens, and the
 * world behind it never shrinks) -- ~177px of panel on a 390x844 phone, in
 * which a monster's page showed its header and none of its drop table.  So a
 * page may ask for the TALL sheet while it is open, and lets go when it
 * closes.  Only the codex's monster page asks (dash/MonsterCodex.jsx), and
 * only upright: sideways the band never grows (v2.3.2157), the destination
 * sits beside the world.
 *
 * Module scope, like dashMinBus: the band's own height (BottomDashboard) and
 * --sheet-h (sheetStamp.js) both read it, so the two cannot disagree.  The
 * world canvas is never resized for an expanded sheet (it is drawn over), so
 * nothing else needs telling. */
const listeners = new Set();

export const sheetTallBus = {
  tall: false,
  set(v) {
    const next = !!v;
    if (next === sheetTallBus.tall) return;
    sheetTallBus.tall = next;
    for (const fn of listeners) { try { fn(next); } catch (e) { /* a listener's own trouble */ } }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
