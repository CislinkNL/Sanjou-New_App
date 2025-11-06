/* batch-orders-patch.js — CONSERVATIVE VERSION
 * Only batches ROOT-LEVEL ref().update({ ...absolute paths... }) writes.
 * It DOES NOT intercept ref(path).set() nor ref(path).update().
 *
 * Drop this after firebase.initializeApp(...). Your business code stays the same.
 */

(function () {
  if (!window.firebase || !firebase.database) {
    console.warn("[BatchOrders] Firebase not found. Patch skipped.");
    return;
  }

  // Match .../tafel/{xxx}/orders/orderlist(/...)
  function isOrdersListPath(p) {
    if (!p) return false;
    const s = String(p).replace(/\/+/, "/").toLowerCase();
    return /\/tafel\/[^/]+\/orders\/orderlist(\/|$)/.test(s);
  }

  const Writer = {
    wait: 200,
    maxWait: 1000,
    pending: {},
    timer: null,
    maxTimer: null,
    flushing: false,
    pendingPromise: null,
    resolvePending: null,
    rejectPending: null,
    _schedule() {
      if (!this.timer) this.timer = setTimeout(() => this._flushAsync(), this.wait);
      if (!this.maxTimer) this.maxTimer = setTimeout(() => this._flushAsync(), this.maxWait);
    },
    _drain() { const out = this.pending; this.pending = {}; return out; },
    _enqueue(path, value) { this.pending[path] = value; this._schedule(); },
    requestFlush() {
      this._schedule();
      if (!this.pendingPromise) {
        this.pendingPromise = new Promise((resolve, reject) => {
          this.resolvePending = resolve; this.rejectPending = reject;
        });
      }
      return this.pendingPromise;
    },
    async _flushAsync() {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (this.maxTimer) { clearTimeout(this.maxTimer); this.maxTimer = null; }
      if (this.flushing) return;
      const batch = this._drain();
      if (!Object.keys(batch).length) return;
      this.flushing = true;
      try {
        await firebase.database().ref().update(batch);
        this.flushing = false;
        if (this.resolvePending) this.resolvePending();
        this.pendingPromise = this.resolvePending = this.rejectPending = null;
      } catch (err) {
        this.flushing = false;
        Object.assign(this.pending, batch);
        if (this.rejectPending) this.rejectPending(err);
        this.pendingPromise = this.resolvePending = this.rejectPending = null;
        this._schedule();
        console.error("[BatchOrders] flush failed, will retry", err);
      }
    },
    _flushSyncBestEffort() { const b = this._drain(); if (!Object.keys(b).length) return; try { firebase.database().ref().update(b); } catch (e) {} }
  };

  window.addEventListener("beforeunload", () => Writer._flushSyncBestEffort());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") Writer._flushSyncBestEffort(); });

  window.BatchOrdersPatch = { flush: () => Writer._flushAsync(), disable: () => (window.BatchOrdersPatch._disabled = true), enable: () => (window.BatchOrdersPatch._disabled = false), _disabled: false };

  function refToPath(ref) {
    try {
      const url = ref && ref.toString ? ref.toString() : "";
      if (!url) return "";
      const m = url.match(/https?:\/\/[^/]+\/(.*)$/i);
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }

  const RefProto = firebase.database.Reference && firebase.database.Reference.prototype;
  if (!RefProto) { console.warn("[BatchOrders] Reference prototype not found. Patch skipped."); return; }

  const _origUpdate = RefProto.update;

  // Conservative patch: ONLY intercept ROOT ref().update({...}) with absolute paths.
  RefProto.update = function (values, onComplete) {
    const base = refToPath(this); // "" when called on ref()

    // Only patch when called on ROOT (no base path) and keys look like absolute paths
    const isRoot = !base;
    if (window.BatchOrdersPatch._disabled || !isRoot || !values || typeof values !== 'object') {
      return _origUpdate.apply(this, arguments);
    }

    const entries = Object.entries(values);
    let diverted = false;
    const passthrough = {};

    for (const [k, v] of entries) {
      // For root updates, keys are expected to be absolute paths
      const fullPath = String(k);
      if (isOrdersListPath(fullPath)) { diverted = true; Writer._enqueue(fullPath, v); }
      else { passthrough[k] = v; }
    }

    if (diverted) {
      // Non-orders keys go through original update on root
      let origPromise;
      try {
        const hasPass = Object.keys(passthrough).length > 0;
        origPromise = hasPass ? _origUpdate.call(this, passthrough) : Promise.resolve();
      } catch (_) { origPromise = Promise.resolve(); }

      const batchedPromise = Writer.requestFlush();
      const combined = Promise.all([origPromise, batchedPromise]).then(() => undefined);
      if (typeof onComplete === "function") { combined.then(() => onComplete(null)).catch(onComplete); }
      return combined;
    }

    return _origUpdate.apply(this, arguments);
  };

  console.log("[BatchOrders] conservative patch installed: batching ROOT ref().update for .../orders/orderlist");
})();