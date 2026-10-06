/* ═══ v2.3.3120: YOUR PETS, AS THE WORKER KEEPS THEM ═══
 * The pets record is the worker's (server/src/petbook.js, `pets:<pid>`); the
 * phone holds the last copy it was sent (pets_state -> S._petBook,
 * src/game/trapping.js onPetsState) and asks for every change.
 *
 * Against an OLD worker (no caps.petbook) there is no record: the pet out with
 * you is the old one, lifeSkills.pets[activePet], as before -- deploy-order
 * safety, rule 19. */
import { cleanPetName } from '@/data/trapping.js';

export function petbookOn(S) { return !!(S && S._serverCaps && S._serverCaps.petbook); }

/** Every pet you own, newest last: the record's (or the old list). */
export function petList(S) {
  if (petbookOn(S)) {
    const b = S._petBook;
    return b && Array.isArray(b.list) ? b.list : [];
  }
  const ls = S && S.rpg && S.rpg.lifeSkills;
  return ls && Array.isArray(ls.pets) ? ls.pets : [];
}

/** The pet out with you, or null. */
export function activePet(S) {
  if (petbookOn(S)) {
    const b = S._petBook;
    if (!b || !b.active || !Array.isArray(b.list)) return null;
    /* v2.3.3120: a pet still in the trap that caught it is not out yet
       (game/trapping.js onTrapResult) */
    const h = S._trap && S._trap.hidePet;
    if (h && h.id === b.active && Date.now() < h.until) return null;
    return b.list.find((p) => p && p.id === b.active) || null;
  }
  const ls = S && S.rpg && S.rpg.lifeSkills;
  const idx = ls ? ls.activePet : null;
  return (idx != null && ls && Array.isArray(ls.pets)) ? (ls.pets[idx] || null) : null;
}

function ask(S, type, payload) {
  if (!S || !S.channel || !petbookOn(S)) return false;
  try { S.channel.send({ type, payload }); return true; } catch (e) { return false; }
}
/** This pet follows you (null: put yours away). */
export function sendPetActive(S, id) { return ask(S, 'pet_active', { id: id || null }); }
/** Name a pet -- refused here, unsent, when the worker would refuse it. */
export function sendPetName(S, id, name) {
  const clean = cleanPetName(name);
  if (!clean) return false;
  return ask(S, 'pet_name', { id, name: clean });
}
/** Release a pet for good (the page asks first; the worker wants `confirm`). */
export function sendPetRelease(S, id) { return ask(S, 'pet_release', { id, confirm: true }); }
