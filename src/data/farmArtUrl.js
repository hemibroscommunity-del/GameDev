/* v2.3.3124: the address of one of the owner's farm pictures
   (public/world/farm/<name>.png), asked for at ?v=FARM_ART_V so a new cut is
   a new address (public/_headers keeps /world/farm/* for good).

   Its own small module, data only, and not rendering/farmWorld.js where it was
   first: the network's farm feedback (game/farmFeedback.js, which wsClient
   imports) needs only this address, for the crop that flies to the bag, and
   the window and the step button only this too.  Importing the farm's
   renderer for one string tied the network's code to PixiJS's.  The network
   imports no renderer. */
import { FARM_ART_V } from './farmArt.js';

export function farmArtUrl(name) {
  return '/world/farm/' + name + '.png?v=' + encodeURIComponent(FARM_ART_V);
}
