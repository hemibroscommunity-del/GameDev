/* ═══ v2.3.3347: EVERY DRAW LIST REBUILT, ON PURPOSE ═══
 *
 * Since v2.3.3347 each world layer is a render group with a draw list of its
 * own, rebuilt only when something in it changes (pixiApp.js LAYER_GROUPS,
 * docs/specs/draw-lists.md).  A few live switches decide how a sprite is
 * drawn at the moment it is packed into its batch -- the form shade's
 * `window.__btShadeOff` and the sharp pixels' `window.__btSharpOff`, each for
 * an on/off picture of the same frame -- and Pixi cannot know when one is
 * flipped.  Before, the world's whole list was rebuilt every frame (by the
 * empty shapes and the depth sort, mp-phoneframe), so a flip showed on the
 * next frame; now a sprite standing still would keep its old look until its
 * layer next changed.
 *
 * So such a switch is a `liveSwitch`: the batcher reads a plain field (no
 * window lookup a quad), and flipping it marks every render group in the
 * scene for a rebuild, so the next frame is drawn with it, as before.
 */
let _root = null;

/** pixiApp.js, for each new stage (a rebuilt renderer's too). */
export function setDrawListRoot(stage) { _root = stage || null; }

/** Every render group under `root` (the stage by default) rebuilds its draw
 *  list on the next frame.  Returns how many were marked. */
export function rebuildDrawLists(root) {
  const top = root || _root;
  if (!top) return 0;
  let n = 0;
  const walk = (c) => {
    if (!c || c.destroyed) return;
    if (c.renderGroup) { c.renderGroup.structureDidChange = true; n++; }
    const k = c.children;
    if (k) for (let i = 0; i < k.length; i++) walk(k[i]);
  };
  walk(top);
  return n;
}

/** A switch on window (`window[name] = true`) that the batcher reads as
 *  `box.on`; a flip rebuilds every draw list.  A value set before this ran
 *  (an init script's) is kept. */
export function liveSwitch(name) {
  const box = { on: false };
  if (typeof window === 'undefined') return box;
  try { box.on = !!window[name]; } catch (e) { /* none set */ }
  try {
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      get() { return box.on; },
      set(v) {
        const on = !!v;
        if (on === box.on) return;
        box.on = on;
        rebuildDrawLists();
      },
    });
  } catch (e) { /* never on window */ }
  return box;
}

if (typeof window !== 'undefined') {
  /* QA: the same, by hand (a test that changes what a sprite is drawn with) */
  window.__btRebuildDrawLists = () => rebuildDrawLists();
}
