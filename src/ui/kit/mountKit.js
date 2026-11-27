/* v2.3.6680: `?uikit=1` mounts the kit's page (UiKitPage.jsx) in its own root,
   over the game, which goes on under it (card UI2).  Lazy: the kit, its style
   sheet reach only this page (v2.3.6785: its face is the game's own, no serif). */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { UiKitPage } from './UiKitPage.jsx';

export function mountUiKit() {
  const el = document.createElement('div');
  el.id = 'bt-uikit';
  document.body.appendChild(el);
  createRoot(el).render(React.createElement(UiKitPage));
}
