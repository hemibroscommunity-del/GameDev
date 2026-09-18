import React, { useEffect, useRef, useState } from 'react';
import { storeChatBus } from '@/ui/mobile/storeChatBus.js';
import { PlayerIcon } from '@/ui/PlayerIcon.jsx';
import { thumbFor, iconFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { storeOfferEnabled } from '@/ui/storeApi.js';   /* v2.3.2623 */

/* === StoreChatPanel — "CHAT WITH MARVIN" ========================= v2.3.2621
 *
 * The owner's second mockup, drawn as it is drawn: the item as a header with
 * its price and the listing's own expiry, the bubbles, three canned replies,
 * and a composer that counts to 200.
 *
 * IT COMPUTES NOTHING IT COULD BE WRONG ABOUT, the same posture StorePanel
 * takes: the item, the price, the expiry, every name and every line of text
 * come out of the worker's `store_dm_thread`. The panel does not keep its own
 * copy of the listing and cannot disagree with the shelf about what is being
 * haggled over.
 *
 * THE MOCKUP SHOWS ONE THREAD; A SELLER HAS N. One listing can be asked about
 * by several buyers, so when the reader IS the seller this grows a row of
 * name chips and shows one conversation at a time. A buyer never sees that
 * row -- they have exactly one conversation and it is theirs.
 *
 * The 200 is enforced on the SERVER (storechat.js `_scText`); `maxLength`
 * here is a courtesy so the counter and the button agree with what will
 * actually be accepted.
 */

const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  mine: '#2B4C7E', bad: '#D95C54',
};
const WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };

export const TEXT_MAX = 200;
/* The three the mockup draws. Mirrored from STORE_CHAT_QUICK
   (server/src/storechat.js) — they travel as ordinary text through the same
   clamp and the same moderation as anything typed. */
export const QUICK = ['Still available?', 'Would you take less?', 'I have a question'];

/* ═══ v2.3.2623: THE SELLER'S ANSWERS ═══
 * Owner: "the seller can have a few different replies. Like yes, I'll think
 * about it, no, what's your offer?"
 *
 * Four, in the order a seller actually uses them. They are ENUMERATED, never
 * free text: 'yes', 'think' and 'no' are settlement instructions the server
 * validates against `OFFER_REPLIES`, and the words below are only how this
 * screen renders those three ids. "What's your offer?" is the odd one out --
 * it moves no money, so it is an ordinary chat line, which is why it is not
 * in the server's reply list.
 *
 * 'yes' SELLS THE ITEM, so it says so on the button rather than just "Yes".
 * A one-tap control that completes a sale must not read like small talk. */
export const SELLER_REPLIES = [
  { id: 'yes', label: (g) => 'Accept ' + g + 'g', tone: 'primary' },
  { id: 'think', label: () => "I'll think about it", tone: 'quiet' },
  { id: 'no', label: () => 'No', tone: 'quiet' },
];

function timeLeft(expiresAt) {
  const ms = (Number(expiresAt) || 0) - Date.now();
  if (!(ms > 0)) return 'expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return 'in ' + mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return 'in ' + hrs + 'h';
  return 'in ' + Math.floor(hrs / 24) + 'd';
}

function clock(ts) {
  try {
    const d = new Date(Number(ts) || 0);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch (e) { return ''; }
}

function itemArt(item) {
  const key = (item && item.invKey) || '';
  const src = thumbFor(key);
  if (src) return <img src={src} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain' }} />;
  return <span style={{ fontSize: 20 }}>{iconFor(key)}</span>;
}

export function StoreChatPanel({ send, myId }) {
  const [, bump] = useState(0);
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const endRef = useRef(null);
  useEffect(() => storeChatBus.subscribe(() => bump((n) => n + 1)), []);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: 'end' }); });

  const b = storeChatBus;
  if (!b.open) return null;
  const head = b.head || {};
  const item = head.item || {};
  const amSeller = !!head.amSeller;
  const thread = b.threads.find((t) => t.buyerId === b.activeBuyer) || b.threads[0] || null;
  const msgs = (thread && thread.msgs) || [];
  const offerOn = storeOfferEnabled();
  const myOffer = b.offers.find((o) => o.buyerId === myId) || null;

  const post = (t) => {
    const clean = String(t || '').slice(0, TEXT_MAX).trim();
    if (!clean) return;
    send('store_dm', amSeller
      ? { listingId: b.listingId, to: b.activeBuyer, text: clean }
      : { listingId: b.listingId, text: clean });
    setText('');
  };

  return (
    <div style={WRAP} data-store-chat>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">{'\u{1F4AC}'}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {amSeller ? 'Your listing' : 'Chat with ' + (head.sellerName || 'the seller')}
          </div>
          <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>Discuss this item directly</div>
        </div>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        {/* the item, with its price and its own clock — the mockup's card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', background: LS.raised, border: '1px solid ' + LS.border, borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 8, background: LS.well, border: '1px solid ' + LS.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {itemArt(item)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {/* v2.3.2621: the same prettifying StorePanel's row does, so the
                  header and the shelf call the item by one name. */}
              {(item.name || 'Item').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>
              {'\u{1F551} Listing expires ' + timeLeft(head.expiresAt)}
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: LS.brass, fontVariantNumeric: 'tabular-nums' }}>{head.askPrice}g</span>
        </div>

        {/* a seller with several interested buyers picks one */}
        {amSeller && b.threads.length > 1 && (
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
            {b.threads.map((t) => (
              <button key={t.buyerId} type="button" onClick={() => storeChatBus.setActive(t.buyerId)}
                style={{
                  flex: '0 0 auto', minHeight: 32, padding: '0 10px', fontSize: 11, fontWeight: 700,
                  borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  border: '1px solid ' + (b.activeBuyer === t.buyerId ? LS.brass : LS.border),
                  background: b.activeBuyer === t.buyerId ? LS.brassFill : LS.raised,
                  color: b.activeBuyer === t.buyerId ? LS.brass : LS.txt2,
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                }}>{t.buyerName}</button>
            ))}
          </div>
        )}

        {/* bubbles */}
        <div data-chat-log style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {b.loading && <div style={{ fontSize: 12, color: LS.txt3 }}>Opening…</div>}
          {!b.loading && msgs.length === 0 && (
            <div style={{ fontSize: 12, color: LS.txt3, lineHeight: 1.45, padding: '6px 2px' }}>
              {amSeller
                ? 'Nobody has asked about this listing yet.'
                : 'Say hello — the seller sees this next time they are online.'}
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.from === myId;
            return (
              <div key={m.ts + ':' + i} style={{ display: 'flex', gap: 7, flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                {/* v2.3.2622: the other side's real bro on their bubbles.
                    `head.sellerLook` is the only look this panel is given, so
                    it is used for the seller's lines and the disc stands in
                    for the buyer's -- a buyer's look is not on this wire and
                    inventing a second lookup for it would be a bigger change
                    than the mockup asks for. */}
                <PlayerIcon
                  name={m.fromName}
                  color={mine ? LS.brass : '#8D9B98'}
                  look={(!mine && m.from === head.sellerId) ? head.sellerLook : null}
                  size={26} />
                <div style={{ minWidth: 0, maxWidth: '76%' }}>
                  <div style={{ fontSize: 10, color: LS.txt3, marginBottom: 2, textAlign: mine ? 'right' : 'left' }}>
                    {mine ? 'You' : m.fromName}
                  </div>
                  <div style={{
                    padding: '7px 10px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.35,
                    color: LS.txt1, background: mine ? LS.mine : LS.raised,
                    border: '1px solid ' + (mine ? 'transparent' : LS.border),
                    wordBreak: 'break-word',
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: LS.txt3, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{clock(m.ts)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {b.err && <div style={{ fontSize: 11, fontWeight: 600, color: LS.bad, marginBottom: 6 }}>{b.err}</div>}

        {/* ═══ v2.3.2623: THE OFFER ═══
            A buyer names a number and their gold is taken there and then; the
            seller answers each offer on its own row. Gated on caps.storeOffer
            so the box cannot exist against a worker that would silently drop
            it (storeApi.storeOfferEnabled). */}
        {offerOn && !amSeller && (
          <div style={{ marginBottom: 8, padding: 8, borderRadius: 9, background: LS.raised, border: '1px solid ' + LS.border }}>
            {myOffer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: LS.txt2 }}>
                  Your offer of <strong style={{ color: LS.brass }}>{myOffer.gold}g</strong> is being held
                  {myOffer.reply === 'think' ? ' — the seller is thinking about it' : ''}
                </span>
                <button type="button" onClick={() => send('store_offer_cancel', { listingId: b.listingId })}
                  style={{
                    minHeight: 34, padding: '0 10px', fontSize: 11, fontWeight: 700, borderRadius: 8,
                    border: '1px solid ' + LS.borderStrong, background: 'transparent', color: LS.txt2,
                    fontFamily: 'inherit', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}>Take it back</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1, fontSize: 12, color: LS.txt2 }}>Offer gold</span>
                <input type="number" inputMode="numeric" value={offer} placeholder={String(head.askPrice || '')}
                  onChange={(e) => setOffer(e.target.value)}
                  style={{
                    width: 86, minHeight: 36, textAlign: 'right', padding: '0 7px', fontSize: 13,
                    fontWeight: 700, fontFamily: 'inherit', color: LS.txt1, background: LS.well,
                    border: '1px solid ' + LS.borderStrong, borderRadius: 8,
                  }} />
                <button type="button" disabled={!(Math.floor(Number(offer)) > 0)}
                  onClick={() => {
                    const g = Math.floor(Number(offer)) || 0;
                    if (g > 0) { send('store_offer', { listingId: b.listingId, gold: g }); setOffer(''); }
                  }}
                  style={{
                    minHeight: 36, padding: '0 12px', fontSize: 12, fontWeight: 700, borderRadius: 8,
                    border: 'none', background: LS.brass, color: LS.onBrass, fontFamily: 'inherit',
                    opacity: Math.floor(Number(offer)) > 0 ? 1 : 0.45,
                    cursor: Math.floor(Number(offer)) > 0 ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}>Offer</button>
              </div>
            )}
            <div style={{ fontSize: 10, color: LS.txt3, marginTop: 4, lineHeight: 1.4 }}>
              Your gold is held while the seller decides, and comes straight back if they say no,
              if you take it back, or if nobody answers in two days.
            </div>
          </div>
        )}

        {/* The seller's side: one row per offer, with the three answers. */}
        {offerOn && amSeller && b.offers.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: LS.txt3, marginBottom: 6 }}>
              Offers on this listing
            </div>
            {b.offers.map((o) => (
              <div key={o.buyerId} style={{
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                padding: '7px 8px', marginBottom: 5, borderRadius: 9,
                background: LS.raised, border: '1px solid ' + LS.border,
              }}>
                <span style={{ flex: 1, minWidth: 90, fontSize: 12, color: LS.txt1 }}>
                  {o.buyerName} offers <strong style={{ color: LS.brass }}>{o.gold}g</strong>
                </span>
                {SELLER_REPLIES.map((r) => (
                  <button key={r.id} type="button"
                    onClick={() => send('store_offer_reply', { listingId: b.listingId, buyerId: o.buyerId, reply: r.id })}
                    style={{
                      minHeight: 32, padding: '0 9px', fontSize: 11, fontWeight: 700, borderRadius: 8,
                      fontFamily: 'inherit', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      border: r.tone === 'primary' ? 'none' : '1px solid ' + LS.borderStrong,
                      background: r.tone === 'primary' ? LS.brass : 'transparent',
                      color: r.tone === 'primary' ? LS.onBrass : LS.txt2,
                    }}>{r.label(o.gold)}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* the three canned replies */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
          {(amSeller ? ["What's your offer?"] : QUICK).map((q) => (
            <button key={q} type="button" onClick={() => post(q)}
              style={{
                flex: '0 0 auto', minHeight: 34, padding: '0 10px', fontSize: 11, fontWeight: 600,
                borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid ' + LS.borderStrong, background: LS.raised, color: LS.txt2,
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>{q}</button>
          ))}
        </div>

        {/* composer */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text" value={text} maxLength={TEXT_MAX} placeholder="Type a message..."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); post(text); } }}
            style={{
              flex: 1, minWidth: 0, minHeight: 40, padding: '0 10px', fontSize: 13,
              fontFamily: 'inherit', color: LS.txt1, background: LS.well,
              border: '1px solid ' + LS.borderStrong, borderRadius: 9,
            }} />
          <button type="button" onClick={() => post(text)} disabled={!text.trim()}
            style={{
              minHeight: 40, padding: '0 14px', fontSize: 12, fontWeight: 700, borderRadius: 9,
              border: 'none', background: LS.brass, color: LS.onBrass, fontFamily: 'inherit',
              opacity: text.trim() ? 1 : 0.45, cursor: text.trim() ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}>Send</button>
        </div>
        <div data-chat-count style={{ fontSize: 10, color: LS.txt3, textAlign: 'right', marginTop: 3 }}>
          {text.length}/{TEXT_MAX}
        </div>
      </div>
    </div>
  );
}
