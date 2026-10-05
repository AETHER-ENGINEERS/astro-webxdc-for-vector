/* Copyright (C) 2026 yam lynn
 * Port of astro by sweetpotatopress. AGPL-3.0-or-later.
 * IndexedDB stand-in for the terminal chart directories. No network.
 * OMARG lineage metadata only. This header does not relicense the work.
 */
(function (root) {
  "use strict";
  var dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!root.indexedDB) {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      var req = indexedDB.open("astro-webxdc", 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("charts")) db.createObjectStore("charts", { keyPath: "id" });
        if (!db.objectStoreNames.contains("collections")) db.createObjectStore("collections", { keyPath: "id" });
        if (!db.objectStoreNames.contains("config")) db.createObjectStore("config", { keyPath: "id" });
        if (!db.objectStoreNames.contains("slots")) db.createObjectStore("slots", { keyPath: "slot" });
        if (!db.objectStoreNames.contains("tzcache")) db.createObjectStore("tzcache", { keyPath: "key" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function reqToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function getAll(store) {
    return tx(store, "readonly").then(function (os) { return reqToPromise(os.getAll()); });
  }

  function put(store, value) {
    return tx(store, "readwrite").then(function (os) { return reqToPromise(os.put(value)); });
  }

  function del(store, key) {
    return tx(store, "readwrite").then(function (os) { return reqToPromise(os.delete(key)); });
  }

  function get(store, key) {
    return tx(store, "readonly").then(function (os) { return reqToPromise(os.get(key)); });
  }

  function pruneTz(max) {
    var cutoff = Date.now() - 30 * 86400000;
    return getAll("tzcache").then(function (rows) {
      rows = rows || [];
      var drop = [];
      var keep = [];
      for (var i = 0; i < rows.length; i++) {
        if (!rows[i].at || rows[i].at < cutoff) drop.push(rows[i]);
        else keep.push(rows[i]);
      }
      keep.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      if (keep.length > max) drop = drop.concat(keep.slice(max));
      return Promise.all(drop.map(function (row) { return del("tzcache", row.key); }));
    });
  }

  var tzPruneQueued = false;

  root.AstroStore = {
    open: open,
    charts: function () { return getAll("charts"); },
    saveChart: function (chart) { return put("charts", chart); },
    deleteChart: function (id) { return del("charts", id); },
    config: function () { return get("config", "default"); },
    saveConfig: function (cfg) { cfg.id = "default"; return put("config", cfg); },
    slots: function () { return getAll("slots"); },
    saveSlot: function (slot, input) { return put("slots", { slot: slot, input: input }); },
    clearSlot: function (slot) { return del("slots", slot); },
    tzGet: function (key) { return get("tzcache", key); },
    tzPut: function (key, value) {
      return put("tzcache", { key: key, value: value, at: Date.now() }).then(function () {
        if (tzPruneQueued) return;
        tzPruneQueued = true;
        return pruneTz(500).then(function () { tzPruneQueued = false; }, function () { tzPruneQueued = false; });
      });
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
