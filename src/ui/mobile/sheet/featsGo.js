/* v2.3.6695 (card UI2-feats): how Feats' pages open the next one, and read their own frame entry.
   Its own file so the pages (FeatsPage.jsx, MedalTiers.jsx, MedalPage.jsx, StatTree.jsx's ApTree)
   import it without importing each other. */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { broHubOpen } from '@/game/broHub.js';

/** Open a page (an `opens` word, 'page:<id>') over this one; `sel` and `who` ride on its entry. */
export function featsGo(opens, who, sel) {
  const o = broHubOpen(opens);
  if (!o || o.kind !== 'page') return;
  dashboardPanelBus.go({ type: 'push', id: o.page, sel: sel == null ? undefined : sel, who: who == null ? undefined : who });
}

/** The frame's top entry ({ id, sel, who }), or null. */
export function featsTop() {
  try { return dashNavView(dashboardPanelBus.nav()).top || null; } catch (e) { return null; }
}
