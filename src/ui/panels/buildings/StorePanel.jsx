import React, { useCallback, useEffect, useState } from 'react';
import { CATEGORIES } from '@/ui/mobile/dash/bagFilterBus.js';
import { thumbFor, iconFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { armorIconFor, gearIdIcon } from '@/rendering/gearVariants.js'; /* v2.3.2531: gear listing art */
import { storeBrowse, storeMine, storeBuy, storeBid, storeAccept, storeCancel, storeEnabled, storeMyId } from '@/ui/storeApi.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { PlayerIcon } from '@/ui/PlayerIcon.jsx';   /* v2.3.2620: the same icon the player list draws */
import { storeChatBus } from '@/ui/mobile/storeChatBus.js';   /* v2.3.2621 */
import { StoreChatPanel } from './StoreChatPanel.jsx';   /* v2.3.2621 */
import { storeChatEnabled, storeChatSend } from '@/ui/storeApi.js';   /* v2.3.2618: "List an Item" opens the bag, which is where selling starts */

/* === StorePanel — buildingPanel === 'store' ===================== v2.3.2476
 *
 * The general store: everything other players have put up for sale, at the
 * price they chose, with a Buy now and a Bid on each one.  The server half
 * is server/src/store.js (docs/specs/general-store.md).
 *
 * THE PANEL COMPUTES NOTHING IT COULD BE WRONG ABOUT.  Every price, name,
 * stat and category on screen is read out of the worker's answer -- the
 * same posture shopBus takes with Shopkeeper Bro's prices, and for the same
 * reason: the number you see is then necessarily the number you will be
 * charged.  Nothing here credits or debits anything locally either; the
 * gold and the goods arrive on the authoritative player_state echo.
 *
 * The category chips are the BAG's own roster (bagFilterBus.CATEGORIES,
 * imported rather than re-listed) in the bag's own order, and the `cat` on
 * each listing is derived by the server with a mirror of the bag's
 * classify().  So a thing filed under Crafting in your bag is under
 * Crafting here.
 *
 * Phase 1 sells stackables and stash weapons only.  Armour, shields, legs,
 * cosmetics and amulets are still kept on the player's own device, so the
 * worker cannot take one into escrow (handoff rule 16) -- the Armor chip is
 * kept because the bag has it and an item KEY can still read as armour, but
 * it will be thin until the gear stashes move server-side.
 *
 * Lantern Slate: the token block is duplicated per building panel by
 * convention (see BankPanel's note) so the decomposed files stay
 * dependency-free. */

const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)', divider: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  good: '#59BF91', bad: '#D95C54',
};
const WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
const BODY = { padding: '10px 12px 14px' };
const MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' };

const WEAPON_GLYPH = { bow: '\u{1F3F9}', staff: '\u{1FA84}', greatsword: '⚔', sword: '⚔' };

/* v2.3.2531: the fallback glyph per gear slot, for a piece whose painted
   icon the table does not know (a quest piece with no metal, say). */
const GEAR_GLYPH = { Chest: '\u{1F9BA}', Legs: '\u{1F456}', Shield: '\u{1F6E1}', Amulet: '\u{1F4FF}', Outfit: '\u{1F9BA}' };

function header(gold) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }}>
      <img src="/icons/ui/bldg-exchange.webp" alt="" draggable={false}
        style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 }}>General store</div>
        <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>What everyone is selling</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
        <img src="/icons/popups/gold.webp" alt="" draggable={false} style={{ width: 15, height: 15, objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        {gold}
      </span>
    </div>
  );
}

function chip(active, label, onTap, key) {
  return (
    <button key={key} type="button" onClick={onTap}
      style={{
        flex: '0 0 auto', minHeight: 32, padding: '0 10px', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.06em', borderRadius: 9, cursor: 'pointer',
        fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        border: '1px solid ' + (active ? LS.brass : LS.border),
        background: active ? LS.brassFill : LS.raised,
        color: active ? LS.brass : LS.txt2,
      }}>{label}</button>
  );
}

function pill(label, tone, onTap, disabled) {
  const brass = tone === 'primary';
  return (
    <button type="button" onClick={onTap} disabled={disabled}
      style={{
        minHeight: 34, padding: '0 10px', fontSize: 11, fontWeight: 700, borderRadius: 9,
        fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        opacity: disabled ? 0.45 : 1,
        border: brass ? 'none' : '1px solid ' + LS.borderStrong,
        background: brass ? LS.brass : 'transparent',
        color: brass ? LS.onBrass : LS.txt2,
      }}>{label}</button>
  );
}

/* The picture for a listing, from the server's derived fields only. */
function listingArt(l) {
  if (l.kind === 'weapon') {
    const g = WEAPON_GLYPH[(l.disp && l.disp.type) || ''] || '⚔';
    return <span style={{ fontSize: 22, lineHeight: '38px' }}>{g}</span>;
  }
  /* v2.3.2531: a gear listing draws the same painted icon the bag draws
     for that piece -- the item card reads its metal off the piece
     (armorIconFor(slot, mat), v2.3.1758) and so does this, off the
     server-derived `disp`.  A shape the icon table does not know falls
     through to the slot glyph rather than to a broken image. */
  if (l.kind === 'gear') {
    const d = l.disp || {};
    const src = d.gearId ? gearIdIcon(d.gearId)
      : d.slot === 'Chest' ? armorIconFor('chest', d.mat)
      : d.slot === 'Legs' ? armorIconFor('legs', d.mat)
      : null;
    if (src) return <img src={src} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain' }} />;
    return <span style={{ fontSize: 20, lineHeight: '38px' }}>{GEAR_GLYPH[d.slot] || '\u{1F9BA}'}</span>;
  }
  const key = (l.disp && l.disp.invKey) || '';
  const src = thumbFor(key);
  if (src) return <img src={src} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain' }} />;
  return <span style={{ fontSize: 20, lineHeight: '38px' }}>{iconFor(key)}</span>;
}

/* ═══ v2.3.2618: HOW LONG THIS ONE HAS LEFT ═══
 * The mockup puts "17h left" on every row, and the worker has always sent
 * `expiresAt` (_stPublic, server/src/store.js) -- nothing new on the wire.
 * Rendered from the server's timestamp rather than from a duration the
 * client works out for itself, so a listing made before a server restart
 * still reads correctly.
 * Red under an hour, which is the mockup's own treatment of "2h left". */
function timeLeft(expiresAt) {
  const ms = (Number(expiresAt) || 0) - Date.now();
  if (!(ms > 0)) return { text: 'expiring', urgent: true };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { text: mins + 'm left', urgent: true };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { text: hrs + 'h left', urgent: hrs < 2 };
  return { text: Math.floor(hrs / 24) + 'd ' + (hrs % 24) + 'h left', urgent: false };
}

function prettyName(l) {
  const n = (l.disp && l.disp.name) || 'Item';
  if (l.kind === 'weapon' || l.kind === 'gear') return n;
  return n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function subtitle(l) {
  if (l.kind === 'weapon') {
    const d = l.disp || {};
    const bits = [];
    if (d.quality) bits.push(String(d.quality));
    if (d.tier) bits.push(String(d.tier));
    if (d.element1) bits.push(String(d.element1));
    if (d.element2) bits.push(String(d.element2));
    if (d.hardness) bits.push('H' + d.hardness);
    return bits.join(' · ') || 'Weapon';
  }
  /* v2.3.2531: the same subtitle shape as a weapon -- the facts the
     server derived off its own escrowed copy, in the order the item card
     reads them, and nothing this panel worked out for itself. */
  if (l.kind === 'gear') {
    const d = l.disp || {};
    const bits = [];
    if (d.quality) bits.push(String(d.quality));
    if (d.tier) bits.push(String(d.tier));
    if (d.gem) bits.push(String(d.gem));
    if (d.slot) bits.push(String(d.slot));
    return bits.join(' · ') || 'Gear';
  }
  return (l.qty > 1 ? l.qty + ' of them' : 'One') + ' · ' + (l.cat || 'item');
}

/* ═══ v2.3.2618: THE PER-PLAYER CEILING, SHOWN ═══
 * STORE.MAX_PER_PLAYER (server/src/store.js) has been 10 since the store
 * shipped -- the owner's "max listings at one time per player 10 to start
 * with" was ALREADY the value, so nothing changed for it. What was missing
 * is that a player had no way to know the ceiling existed until the worker
 * refused their eleventh listing. Mirrored here for display ONLY: the server
 * enforces it, this just says what it is, and a drift shows up as a wrong
 * caption rather than as a wrong refusal. */
const MAX_PER_PLAYER = 10;

/* The mockup's empty state: a sentence, a hint, and the way out of it.
 * "List an Item" cannot list anything by itself -- selling starts from the
 * bag's item card (ItemDetailPopup -> Sell), which is the only place that
 * knows WHICH thing you mean -- so the button takes you there rather than
 * opening a second sell flow that would have to be kept in step with it. */
function emptyState(line, hint, onList) {
  return (
    <div style={{ padding: '18px 8px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: LS.txt2, marginBottom: 4 }}>{line}</div>
      <div style={{ fontSize: 11, color: LS.txt3, marginBottom: 14, lineHeight: 1.45 }}>{hint}</div>
      {onList ? (
        <button type="button" onClick={onList}
          style={{
            minHeight: 44, padding: '0 20px', fontSize: 13, fontWeight: 700, borderRadius: 10,
            border: 'none', background: LS.brass, color: LS.onBrass, fontFamily: 'inherit',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>+ List an Item</button>
      ) : null}
    </div>
  );
}

export function StorePanel(props) {
  const rpgState = props.rpgState || {};
  const [tab, setTab] = useState('shelf');
  /* v2.3.2618: the mockup's YOUR LISTINGS screen is two tabs, not two
     stacked sections -- on a 360 phone the "Your bids" heading sat below
     the fold whenever you had more than two things up for sale. */
  const [mineTab, setMineTab] = useState('listings');
  const [cat, setCat] = useState('all');
  const [rows, setRows] = useState([]);
  const [mine, setMine] = useState([]);
  const [bidding, setBidding] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteOk, setNoteOk] = useState(true);
  const [bidFor, setBidFor] = useState(null);     /* listing id being bid on */
  const [bidText, setBidText] = useState('');
  const myId = storeMyId();
  const enabled = storeEnabled();
  const chatOn = storeChatEnabled();
  /* Asking the worker for the thread is what OPENS it -- the bus only holds
     what the worker sends back (storechat.js `_handleStoreDmOpen`). */
  const onChatOpen = useCallback((listingId) => {
    storeChatSend('store_dm_open', { listingId });
  }, []);
  const [chatSeq, setChatSeq] = useState(0);
  useEffect(() => storeChatBus.subscribe(() => setChatSeq((n) => n + 1)), []);

  /* v2.3.2618: leave the store and land on the bag, open. Selling starts
     from an item card, so this is a way THERE, not a second sell flow. */
  const goList = useCallback(() => {
    if (props.setBuildingPanel) props.setBuildingPanel(null);
    try { dashboardPanelBus.open('bag'); } catch (e) { /* bus absent in a bare render */ }
  }, [props]);

  const refresh = useCallback(async (which) => {
    if (!enabled) return;
    if (which !== 'mine') {
      const r = await storeBrowse(cat, null, 30);
      if (r && r.ok) setRows(r.listings || []);
      else setRows([]);
    }
    if (which !== 'shelf') {
      const m = await storeMine();
      if (m && m.ok) { setMine(m.listings || []); setBidding(m.bidding || []); }
    }
  }, [cat, enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  const say = (text, ok) => { setNote(text || ''); setNoteOk(ok !== false); };

  /* One shape for every action: ask, show the worker's own sentence back,
     then re-read both shelves.  Never a local credit -- the echo carries
     the gold and the goods. */
  const act = async (fn, okText) => {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r && r.ok) { say(okText, true); setBidFor(null); setBidText(''); }
    else say((r && r.error) || 'The store said no', false);
    refresh();
  };

  if (!enabled) {
    return (
      <div style={WRAP}>
        {header(Math.floor(rpgState.coins || 0))}
        <div style={{ ...BODY, fontSize: 12, color: LS.txt2, lineHeight: 1.5 }}>
          The store is not open on this world yet. It arrives with the next
          server update — everything else in town keeps working.
        </div>
      </div>
    );
  }

  const row = (l, mineView) => {
    const isMine = l.sellerId === myId;
    const top = l.topBid;
    const minBid = (top ? top.amount + 1 : 1);
    const left = timeLeft(l.expiresAt);
    return (
      <div key={l.id} style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px',
        background: LS.raised, border: '1px solid ' + LS.border, borderRadius: 10, marginBottom: 6,
      }}>
        <div style={{
          width: 38, height: 38, flex: '0 0 auto', borderRadius: 8, background: LS.well,
          border: '1px solid ' + LS.divider, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{listingArt(l)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prettyName(l)}{l.kind !== 'weapon' && l.kind !== 'gear' && l.qty > 1 ? ' ×' + l.qty : ''}
          </div>
          <div style={{ fontSize: 11, color: LS.txt3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle(l)}</div>
          {/* v2.3.2618: the mockup's two lower lines -- who is selling it,
              then the clock and the top bid together. Split because the
              seller line is about to carry their icon (and a chat button)
              and the clock is not part of that. */}
          {/* v2.3.2620: the seller's tiny icon, from the SAME component the
              player list draws (PlayerIcon) rather than a second renderer.
              18px: the row already carries four lines and a price column, and
              this line has to stay one line at 360. */}
          <div style={{ fontSize: 11, color: LS.txt3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {mineView ? null : (
              <PlayerIcon name={l.sellerName} color={l.sellerColor} avatar={l.sellerAvatar} size={18} />
            )}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mineView ? 'Yours' : 'Seller: ' + (l.sellerName || 'someone')}
            </span>
            {/* v2.3.2621: the mockup's little chat icon, on the seller's own
                line. Gated on caps.storeChat -- against an older worker the
                two message types would fall through to the default branch and
                be rebroadcast to the whole room, so the icon must not exist
                to be tapped (storeApi.storeChatEnabled). Shown on your own
                listings too: that is where a seller reads what buyers asked. */}
            {chatOn && (
              <button type="button" aria-label={mineView ? 'Messages about your listing' : 'Message the seller'}
                onClick={() => { storeChatBus.openFor(l.id); onChatOpen(l.id); }}
                data-store-chat-icon
                style={{
                  flex: '0 0 auto', width: 26, height: 26, minHeight: 26, padding: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  border: '1px solid ' + LS.borderStrong, background: LS.raised, color: LS.txt2,
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                }}>
                {'\u{1F4AC}'}
                {storeChatBus.unreadFor(l.id) > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3, minWidth: 8, height: 8,
                    borderRadius: 4, background: LS.brass,
                  }} />
                )}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, marginTop: 1, display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ color: left.urgent ? LS.bad : LS.txt3 }}>{'\u{1F551} ' + left.text}</span>
            <span style={{ color: LS.txt3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {top ? 'Top bid: ' + top.amount + 'g' : 'No bids'}
            </span>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: LS.brass, fontVariantNumeric: 'tabular-nums' }}>{l.askPrice}g</span>
          {mineView
            ? (
              <div style={{ display: 'flex', gap: 5 }}>
                {top ? pill('Take ' + top.amount + 'g', 'primary', () => act(() => storeAccept(l.id), 'Sold for ' + top.amount + ' gold'), busy) : null}
                {pill('Take down', 'quiet', () => act(() => storeCancel(l.id), 'Back in your bag'), busy)}
              </div>
            )
            : isMine
              ? <span style={{ fontSize: 11, color: LS.txt3 }}>Yours</span>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'stretch' }}>
                  {/* v2.3.2618: "Buy 500g", not "Buy" -- the mockup puts the
                      price ON the button, and a Buy whose cost you have to
                      read off another line is how you tap one by accident. */}
                  {pill('Buy ' + l.askPrice + 'g', 'primary', () => act(() => storeBuy(l.id), 'Bought for ' + l.askPrice + ' gold'), busy)}
                  {pill('Bid', 'quiet', () => { setBidFor(bidFor === l.id ? null : l.id); setBidText(String(minBid)); }, busy)}
                </div>
              )}
          {bidFor === l.id && !mineView && !isMine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <input type="number" inputMode="numeric" value={bidText}
                onChange={(e) => setBidText(e.target.value)}
                style={{
                  width: 72, minHeight: 34, textAlign: 'right', padding: '0 6px', fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', color: LS.txt1, background: LS.well,
                  border: '1px solid ' + LS.borderStrong, borderRadius: 8,
                }} />
              {pill('Place', 'primary', () => act(() => storeBid(l.id, Math.floor(Number(bidText) || 0)), 'Bid placed'), busy)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const shelf = rows.filter((l) => cat === 'all' || l.cat === cat);

  /* v2.3.2621: the thread takes over the card while it is open -- the mockup
     draws it as its own screen, and .bt-inspect-card is the one surface the
     building panel owns. Back returns to the shelf underneath, which is still
     mounted and still holding its tab and filter. */
  if (chatOn && storeChatBus.open) {
    return (
      <div>
        <StoreChatPanel send={storeChatSend} myId={myId} />
        <div style={{ margin: '-6px 0 0', padding: '0 14px 14px', background: LS.panel, borderRadius: '0 0 14px 14px' }}>
          <button type="button" onClick={() => { storeChatBus.close(); refresh(); }}
            style={{
              width: '100%', minHeight: 40, fontSize: 12, fontWeight: 700, borderRadius: 9,
              border: '1px solid ' + LS.borderStrong, background: 'transparent', color: LS.txt2,
              fontFamily: 'inherit', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}>Back to the shelf</button>
        </div>
      </div>
    );
  }

  return (
    <div style={WRAP}>
      {header(Math.floor(rpgState.coins || 0))}
      <div style={BODY}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {chip(tab === 'shelf', 'Shelf', () => { setTab('shelf'); refresh('shelf'); }, 't-shelf')}
          {chip(tab === 'mine', 'Yours', () => { setTab('mine'); refresh('mine'); }, 't-mine')}
        </div>

        {tab === 'shelf' && (
          <>
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
              {CATEGORIES.map((c) => chip(cat === c.id, c.label, () => setCat(c.id), c.id))}
            </div>
            {shelf.length === 0
              ? emptyState(
                  cat === 'all' ? 'Nothing is for sale right now.' : 'Nothing in this category right now.',
                  cat === 'all' ? 'Be the first — open your bag, tap something and choose Sell.'
                                : 'Try another category, or put one up yourself.',
                  goList)
              : shelf.map((l) => row(l, false))}
          </>
        )}

        {tab === 'mine' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {chip(mineTab === 'listings', 'My Listings', () => setMineTab('listings'), 'm-list')}
              {chip(mineTab === 'bids', 'My Bids', () => setMineTab('bids'), 'm-bids')}
            </div>
            {mineTab === 'listings' && (
              mine.length === 0
                ? emptyState(
                    "You're not selling anything yet.",
                    'Open your bag, tap something and choose Sell.',
                    goList)
                : <>
                    <div style={MOD}>{mine.length + ' of ' + MAX_PER_PLAYER + ' slots used'}</div>
                    {mine.map((l) => row(l, true))}
                  </>
            )}
            {mineTab === 'bids' && (
              bidding.length === 0
                ? emptyState(
                    'You have no bids standing.',
                    'Your gold is only held while your bid is the top one.')
                : bidding.map((l) => row(l, false))
            )}
          </>
        )}

        {note && (
          <div style={{
            marginTop: 8, fontSize: 12, fontWeight: 600, textAlign: 'center',
            color: noteOk ? LS.good : LS.bad,
          }}>{note}</div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: LS.txt3, lineHeight: 1.45 }}>
          {/* v2.3.2619: a store that expires in a week while the copy promises
              24 hours is worse than the original -- every string that named
              the old lifetime moved with the constant. */}
          Listings last one week. If nobody buys, it comes back to you — and any
          bid goes back to whoever made it. Armour and amulets can&apos;t be listed yet.
        </div>
      </div>
    </div>
  );
}
