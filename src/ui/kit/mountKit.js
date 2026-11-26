/* v2.3.6680: `?uikit=1` mounts the kit's page (UiKitPage.jsx) in its own root,
   over the game, which goes on under it (card UI2).  Lazy: the kit, its style
   sheet and its serif reach only this page. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { UiKitPage } from './UiKitPage.jsx';

export function mountUiKit() {
  const el = document.createElement('div');
  el.id = 'bt-uikit';
  document.body.appendChild(el);
  createRoot(el).render(React.createElement(UiKitPage));
}
