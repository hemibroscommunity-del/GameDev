/* ═══ v2.3.3199: A WEBSOCKET THAT DOES NOT ASK FOR COMPRESSION ═══
 *
 * (moved out of bots.mjs in v2.3.3203 so cdpprof.mjs can use it too: Node's
 * own WebSocket would not open the local runtime's debugger socket)
 */
import { connect as netConnect } from 'node:net';
import { randomBytes } from 'node:crypto';

/* ═══ v2.3.3199: A WEBSOCKET THAT DOES NOT ASK FOR COMPRESSION (--no-deflate) ═══
   Node's WebSocket, like every phone's browser, offers permessage-deflate,
   and the room (compatibility_date 2024-12-01: web_socket_compression on)
   accepts, so every message it sends is compressed for that one socket.  To
   measure what that costs the room, this one does not offer it: the room
   then sends plain text.  Just what the bots use of the WebSocket API --
   readyState, onopen/onmessage/onclose/onerror, send(string), close(code) --
   over a raw socket (RFC 6455: masked frames out, unmasked in, ping
   answered, fragments joined). */
export class PlainWS {
  constructor(url) {
    const u = new URL(url);
    this.readyState = 0;
    this.onopen = this.onmessage = this.onclose = this.onerror = null;
    const sock = netConnect({ host: u.hostname, port: +u.port || 80 });
    this._sock = sock;
    let buf = Buffer.alloc(0), open = false, closed = false, frags = [], fragOp = 0;
    const end = (code) => {
      if (closed) return;
      closed = true; this.readyState = 3;
      try { sock.destroy(); } catch { /* gone */ }
      if (this.onclose) this.onclose({ code: code || 1006 });
    };
    sock.setNoDelay(true);
    sock.on('connect', () => {
      sock.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n`
        + `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    sock.on('data', (d) => {
      buf = buf.length ? Buffer.concat([buf, d]) : d;
      if (!open) {
        const i = buf.indexOf('\r\n\r\n');
        if (i < 0) return;
        const head = buf.subarray(0, i).toString();
        buf = buf.subarray(i + 4);
        if (!/^HTTP\/1\.1 101/.test(head)) { if (this.onerror) this.onerror(new Error('no upgrade')); end(1006); return; }
        open = true; this.readyState = 1;
        if (this.onopen) this.onopen();
      }
      for (;;) {
        if (buf.length < 2) return;
        const b0 = buf[0];
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.subarray(off, off + len);
        buf = buf.subarray(off + len);
        const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f;
        if (op === 0x8) { const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005; try { this._frame(0x8, payload.subarray(0, 2)); } catch { /* gone */ } end(code); return; }
        if (op === 0x9) { try { this._frame(0xa, payload); } catch { /* gone */ } continue; }
        if (op === 0xa) continue;
        if (op === 0x1 || op === 0x2) {
          if (fin) this._deliver(op, payload); else { fragOp = op; frags = [Buffer.from(payload)]; }
          continue;
        }
        if (op === 0x0) { frags.push(Buffer.from(payload)); if (fin) { this._deliver(fragOp, Buffer.concat(frags)); frags = []; } }
      }
    });
    sock.on('error', (e) => { if (this.onerror) this.onerror(e); });
    sock.on('close', () => end(1006));
  }
  _deliver(op, payload) { if (this.onmessage) this.onmessage({ data: op === 0x1 ? payload.toString('utf8') : payload }); }
  _frame(op, data) {
    const len = data.length;
    const head = Buffer.alloc(len < 126 ? 2 : len < 65536 ? 4 : 10);
    head[0] = 0x80 | op;
    if (len < 126) head[1] = 0x80 | len;
    else if (len < 65536) { head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
    else { head[1] = 0x80 | 127; head.writeBigUInt64BE(BigInt(len), 2); }
    const mask = randomBytes(4);
    const out = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) out[i] = data[i] ^ mask[i & 3];
    this._sock.write(Buffer.concat([head, mask, out]));
  }
  send(str) { if (this.readyState !== 1) throw new Error('not open'); this._frame(0x1, Buffer.from(str, 'utf8')); }
  close(code = 1000) {
    if (this.readyState !== 1) return;
    this.readyState = 2;
    const b = Buffer.alloc(2); b.writeUInt16BE(code, 0);
    try { this._frame(0x8, b); } catch { /* gone */ }
    setTimeout(() => { try { this._sock.end(); } catch { /* gone */ } }, 200);
  }
}

