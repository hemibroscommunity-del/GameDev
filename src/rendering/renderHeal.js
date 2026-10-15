/* ═══ v2.3.3152: A FRAME THAT THROWS DOES NOT LEAVE THE SCREEN BLACK ═══
 *
 * Owner, 2026-10-11: "I also encountered an issue where the screen went
 * black..."  The leak hunt made one, on main, and read the game's crash log:
 *
 *   03:01:14  pixi-render-err   Cannot read properties of null (reading '0')
 *   03:01:19  watchdog-dark     screen 0% lit, strike 1
 *   03:01:36  watchdog-dark     screen 0% lit, strike 2
 *   03:01:36  gl-rebuild        watchdog: screen dark 10s
 *   03:01:43  post-rebuild      100% lit
 *
 * One frame threw (Pixi's pooled mask filter, bindGroupFix.js) and the screen
 * stayed BLACK for 22 s, until the watchdog rebuilt the renderer.  Pixi keeps
 * some of its drawing state from one frame to the next, and a throw between a
 * push and its pop leaves it open:
 *   - the stencil masks' depth, per render target (StencilMaskPipe
 *     _maskStackHash), and the stencil mode each target puts back when it is
 *     drawn to again (GlStencilSystem _renderTargetStencilState) -- the
 *     screen's left at "mask active, reference 1", so every later frame drew
 *     with a stencil test nothing passes: nothing drawn, every frame;
 *   - the colour mask (off while a stencil mask's shape is drawn);
 *   - the filter stack's depth (FilterSystem _filterStackIndex), so every
 *     later filter is placed against a stale one;
 *   - the sprite masks in flight (AlphaMaskPipe _activeMaskStage).
 * (The render-target stack and the global uniforms start afresh each frame.)
 * The cut-death that threw nests a sprite mask inside a polygon one, so it
 * left the first of these open.
 *
 * So whenever app.render throws, pixiRenderer calls this: every one of those
 * is put back to "nothing open", and the next frame draws as if the bad one
 * had never been.  It changes nothing on a frame that did not throw.
 * `?noheal` in the address leaves the state as the throw left it, to compare
 * (mp-renderheal). */
import { STENCIL_MODES } from 'pixi.js';

let _heals = 0;

function urlOff() {
  try { return /[?&]noheal(=|&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

export function healAfterRenderThrow(renderer) {
  if (!renderer || urlOff()) return false;
  const pipes = renderer.renderPipes || {};
  try {
    const sm = pipes.stencilMask;
    if (sm && sm._maskStackHash) for (const k in sm._maskStackHash) sm._maskStackHash[k] = 0;
  } catch (e) { /* a pixi without the field */ }
  try {
    const st = renderer.stencil;
    const states = st && st._renderTargetStencilState;
    if (states) {
      for (const k in states) {
        const s = states[k];
        if (s) { s.stencilMode = STENCIL_MODES.DISABLED; s.stencilReference = 0; }
      }
    }
    if (st && st._activeRenderTarget && typeof st.setStencilMode === 'function') st.setStencilMode(STENCIL_MODES.DISABLED, 0);
  } catch (e) { /* a pixi without the field */ }
  try { if (renderer.colorMask && typeof renderer.colorMask.setMask === 'function') renderer.colorMask.setMask(15); } catch (e) { /* none */ }
  try { const f = renderer.filter; if (f && typeof f._filterStackIndex === 'number') f._filterStackIndex = 0; } catch (e) { /* none */ }
  try { const am = pipes.alphaMask; if (am && am._activeMaskStage) am._activeMaskStage.length = 0; } catch (e) { /* none */ }
  _heals++;
  return true;
}

if (typeof window !== 'undefined') {
  window.__btRenderHeal = () => ({ heals: _heals, off: urlOff() });   /* QA (mp-renderheal) */
}
