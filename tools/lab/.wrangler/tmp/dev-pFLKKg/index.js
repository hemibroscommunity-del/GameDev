var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
import { DurableObject } from "cloudflare:workers";
var ISOLATE = null;
var isolateId = /* @__PURE__ */ __name(() => ISOLATE || (ISOLATE = Math.random().toString(36).slice(2, 10)), "isolateId");
var clamp = /* @__PURE__ */ __name((v, lo, hi, d) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d, "clamp");
function burn(iters) {
  let x = 2654435769 | 0;
  for (let i = 0; i < iters; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
  }
  return x;
}
__name(burn, "burn");
async function coloOf(self) {
  if (self._colo !== void 0) return self._colo;
  self._colo = null;
  try {
    const t = await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text();
    const m = t.match(/^colo=(\w+)$/m);
    self._colo = m ? m[1] : null;
  } catch {
  }
  return self._colo;
}
__name(coloOf, "coloOf");
function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))];
}
__name(pct, "pct");
var summary = /* @__PURE__ */ __name((arr) => ({ n: arr.length, p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99), max: arr.length ? Math.max(...arr) : null, mean: arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null }), "summary");
var Burner = class extends DurableObject {
  static {
    __name(this, "Burner");
  }
  async fetch(req) {
    const url = new URL(req.url);
    const iters = clamp(+url.searchParams.get("iters"), 0, 3e9, 0);
    const colo = await coloOf(this);
    const x = burn(iters);
    return Response.json({ isolate: isolateId(), id: this.ctx.id.toString().slice(0, 12), colo, iters, x });
  }
};
var World = class extends DurableObject {
  static {
    __name(this, "World");
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.n = 0;
    this.bytes = 0;
    this.echo = false;
  }
  reset(echo) {
    this.n = 0;
    this.bytes = 0;
    this.echo = !!echo;
    return true;
  }
  stats() {
    return { n: this.n, bytes: this.bytes };
  }
  /* RPC: one call, one answer */
  ping(i) {
    return i;
  }
  /* RPC: one call carrying one message */
  batch(payload) {
    this.n++;
    this.bytes += payload && payload.s ? payload.s.length : 0;
    return this.n;
  }
  _msg(ws, msg) {
    this.n++;
    this.bytes += typeof msg === "string" ? msg.length : msg.byteLength;
    if (this.echo) ws.send(msg);
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      if (url.searchParams.get("hib") === "1") {
        this.ctx.acceptWebSocket(pair[1]);
      } else {
        const s = pair[1];
        s.accept();
        s.addEventListener("message", (ev) => this._msg(s, ev.data));
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return Response.json({ isolate: isolateId(), colo: await coloOf(this) });
  }
  webSocketMessage(ws, msg) {
    this._msg(ws, msg);
  }
  webSocketClose(ws) {
    try {
      ws.close();
    } catch {
    }
  }
};
var Door = class extends DurableObject {
  static {
    __name(this, "Door");
  }
  async _open(world, hib) {
    const resp = await world.fetch("http://w/ws?hib=" + (hib ? 1 : 0), { headers: { Upgrade: "websocket" } });
    const ws = resp.webSocket;
    if (!ws) throw new Error("no socket: " + resp.status);
    ws.accept();
    return ws;
  }
  async fetch(req) {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "rtt-rpc";
    const n = clamp(+url.searchParams.get("n"), 1, 2e5, 100);
    const size = clamp(+url.searchParams.get("size"), 2, 65536, 100);
    const hib = url.searchParams.get("hib") === "1";
    const world = this.env.WORLD.get(this.env.WORLD.idFromName(url.searchParams.get("world") || "w"));
    const where = { door: await coloOf(this), world: (await (await world.fetch("http://w/where")).json()).colo };
    const out = { mode, n, hib, where, isolate: isolateId() };
    if (mode === "rtt-rpc") {
      await world.reset(false);
      const rtt = [];
      for (let i = 0; i < n; i++) {
        const t = Date.now();
        await world.ping(i);
        rtt.push(Date.now() - t);
      }
      out.rttMs = summary(rtt);
    } else if (mode === "rtt-ws") {
      await world.reset(true);
      const ws = await this._open(world, hib);
      let wake = null;
      ws.addEventListener("message", () => {
        if (wake) {
          const w = wake;
          wake = null;
          w();
        }
      });
      const rtt = [];
      for (let i = 0; i < n; i++) {
        const t = Date.now();
        const got = new Promise((res) => {
          wake = res;
        });
        ws.send(String(i));
        await got;
        rtt.push(Date.now() - t);
      }
      try {
        ws.close();
      } catch {
      }
      out.rttMs = summary(rtt);
    } else if (mode === "flood-ws" || mode === "flood-rpc") {
      const s = JSON.stringify({ t: "b", d: "x".repeat(Math.max(0, size - 18)) });
      await world.reset(false);
      const t0 = Date.now();
      if (mode === "flood-ws") {
        const ws = await this._open(world, hib);
        for (let i = 0; i < n; i++) ws.send(s);
        let st = { n: 0 };
        for (let k = 0; k < 6e3 && st.n < n; k++) {
          st = await world.stats();
          if (st.n < n) await new Promise((r) => setTimeout(r, 5));
        }
        try {
          ws.close();
        } catch {
        }
        out.worldGot = st.n;
      } else {
        let inflight = [];
        for (let i = 0; i < n; i++) {
          inflight.push(world.batch({ s }));
          if (inflight.length >= 64) {
            await Promise.all(inflight);
            inflight = [];
          }
        }
        await Promise.all(inflight);
        out.worldGot = (await world.stats()).n;
      }
      out.size = s.length;
      out.wallMs = Date.now() - t0;
      out.usPerMsg = +(1e3 * out.wallMs / n).toFixed(2);
    } else {
      return new Response("unknown mode", { status: 400 });
    }
    return Response.json(out);
  }
};
var src_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("brotown-lab");
    if (!env.LAB_KEY || req.headers.get("x-lab-key") !== env.LAB_KEY) return new Response("forbidden", { status: 403 });
    const colo = req.cf && req.cf.colo || null;
    if (url.pathname === "/whoami") return Response.json({ isolate: isolateId(), colo });
    if (url.pathname === "/burn") {
      const name = (url.searchParams.get("name") || "b0").slice(0, 64);
      const stub = env.BURNER.get(env.BURNER.idFromName(name));
      const j = await (await stub.fetch("http://b/burn" + url.search)).json();
      return Response.json(Object.assign(j, { entry: colo, workerIsolate: isolateId() }));
    }
    if (url.pathname === "/door") {
      const name = (url.searchParams.get("door") || "d0").slice(0, 64);
      const stub = env.DOOR.get(env.DOOR.idFromName(name));
      return stub.fetch("http://d/door" + url.search);
    }
    return new Response("not found", { status: 404 });
  }
};

// ../../../../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-DxK4bb/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-DxK4bb/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Burner,
  Door,
  World,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
