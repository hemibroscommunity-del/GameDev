/* ═══ v2.3.6696: PETS' PAGES: WHAT OPENS THEM, WHAT THEY READ, AND WHAT IS OUT (card UI2-pets) ═══
 *
 * The landing is BottomDashboard's PANELS `pets` (so every opener works
 * unchanged: Bro's Pets door, Beastmaster Bro's tap, the farm's Pet House and
 * its key, More's tile under `?ui2=0`).  Its three pages are pages of the
 * dashboard's frame, hung as the Codex's are (a PANELS row each, a title
 * getter here, dash/PetsPage.jsx drawing them):
 *   petsOwned  a card a pet, and the Pet House's More room;
 *   petsOne    one pet (its id the entry's `sel`: dashNav keeps it per visit);
 *   petsAll    the journal (its stage the entry's `sel`), the pets' own
 *              collection: the Codex's Pets door opens it (codexView.js).
 *
 * The game's state comes FROM THE OPENER (the panel's getter, as the Codex's
 * pages take theirs: open-hand.test closes window._gameState to new readers),
 * kept here for the pages and the titles.  And the ONE pending state of Pets'
 * presses (src/game/pending.js through petPages.js petsPress), kept here so a
 * press made on a pet's page still holds its control on the landing. */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { isPetsPage, petsPress, petsSettle } from '@/game/petPages.js';
import { pendingInit, pendingMark } from '@/game/pending.js';
import { petList } from '@/game/petBook.js';
import { petDisplayName, worldSafeText } from '@/data/trapping.js';
import { SAY } from '@/data/say/pets.js';
import { say } from '@/game/say.js';

let _getS = () => null;
/** The game's state, by the getter the opener handed over. */
export function petsS() { try { return _getS() || null; } catch (e) { return null; } }
/** The opener's getter (the landing hands it over as it draws). */
export function petsKeepGetter(getS) { if (typeof getS === 'function') _getS = getS; }

/** Open one of Pets' pages (`sel`: a pet's id, or the journal's stage). */
export function openPetsPage(page, getS, sel) {
  if (!isPetsPage(page)) return;
  petsKeepGetter(getS);
  try { dashboardPanelBus.push(page, sel == null ? undefined : { sel: String(sel) }); } catch (e) { /* no frame: nothing to draw it in */ }
}

/** The page on top: { id, key, sel }, or null when the top is not one of Pets' pages. */
export function petsTop() {
  let t = null;
  try { t = dashNavView(dashboardPanelBus.nav()).top; } catch (e) { t = null; }
  if (!t || !isPetsPage(t.id)) return null;
  return { id: t.id, key: t.key, sel: typeof t.sel === 'string' ? t.sel : null };
}

/** A page keeps what it shows (the journal's stage): Back to it finds it there. */
export function keepPetsSel(top, sel) {
  if (!top || top.key == null) return;
  try { dashboardPanelBus.go({ type: 'keep', key: top.key, sel: String(sel) }); } catch (e) { /* the frame went */ }
}

/* the newest visit of page `id` on the workspace up (the header names the
   page under the top in its Back, so the title is asked of pages below too) */
function selOfVisit(id) {
  let n = null;
  try { n = dashboardPanelBus.nav(); } catch (e) { n = null; }
  const stack = n && n[n.ws];
  if (!Array.isArray(stack)) return null;
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].id === id) return typeof stack[i].sel === 'string' ? stack[i].sel : null;
  return null;
}

/** The header's title for Pets' page `id`: Owned, the pet's own name, All. */
export function petsPageTitle(id) {
  if (id === 'petsOwned') return say(SAY, 'pets.doorOwned');
  if (id === 'petsAll') return say(SAY, 'pets.doorAll');
  const pid = selOfVisit('petsOne');
  const p = pid ? petList(petsS()).find((q) => q && String(q.id) === pid) : null;
  return p ? worldSafeText(petDisplayName(p)) : say(SAY, 'pets.doorOwned');
}

/* ── the one pending state ── */
let _pend = pendingInit();
/** Press `control` (petPages.js PET_HOLDS) with the record at `rev`: `send` goes out only when the
    control is free, and holds it until the record moves.  True when it went. */
export function petsPressNow(control, rev, send) {
  const r = petsPress(_pend, control, rev, Date.now(), send);
  _pend = r.pend;
  return r.go;
}
/** Each control's mark ('free', 'out', 'unknown'), after the record's rev has settled what it answered. */
export function petsMarks(rev, controls, now) {
  _pend = petsSettle(_pend, rev);
  const t = now == null ? Date.now() : now;
  const out = Object.create(null);
  for (const c of controls || []) out[c] = pendingMark(_pend, c, t);
  return out;
}
/** How many presses are out (the page's QA probe, window.__btPets). */
export function petsPendCount() { return Object.keys(_pend).length; }
