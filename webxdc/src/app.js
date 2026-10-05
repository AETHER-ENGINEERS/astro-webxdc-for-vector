/* Copyright (C) 2026 yam lynn
 * Port of astro by sweetpotatopress.
 * https://github.com/sweetpotatopress/astro
 * AGPL-3.0-or-later. See ../LICENSE.
 * The app computes positions. It does not give advice.
 * OMARG lineage metadata only. This header does not relicense the work.
 */
(function () {
  "use strict";
  var E = function () { return globalThis.AstroEngine; };
  var Store = function () { return globalThis.AstroStore; };

  var state = {
    screen: "form",
    input: emptyInput(),
    chart: null,
    overlay: null,
    overlayKind: "",
    slots: [null, null, null, null, null, null, null, null, null, null],
    step: "hour",
    playing: false,
    live: false,
    left: true,
    right: true,
    aspects: true,
    error: "",
    note: "",
    frameStatus: "",
    reduceMotion: false,
    zrLot: "fortune",
    zrLayer: 0,
    zrSel: [0, 0, 0, 0],
    returnYear: new Date().getFullYear(),
    collection: "charts",
    library: [],
    ready: false,
    more: false
  };
  var playTimer = 0;
  var liveTimer = 0;
  var frameLock = false;

  function emptyInput() {
    return {
      name: "", city: "", state: "", country: "",
      timezone: guessZone(), latitude: "", longitude: "",
      year: 1990, mon: 6, mday: 15, hour: 18, min: 30, sec: 0, isdst: -1
    };
  }

  function guessZone() {
    try {
      var z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (z && globalThis.moment && globalThis.moment.tz.zone(z)) return z;
    } catch (e) { /* fall through */ }
    return "Etc/UTC";
  }

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      if (c === '"') return "&" + "quot;";
      return "&" + "#39;";
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function elClass(element) {
    return { 2: "fire", 3: "earth", 4: "air", 5: "water" }[element] || "ink";
  }

  function cloneInput(input) {
    if (input == null) return input;
    if (typeof structuredClone === "function") return structuredClone(input);
    return JSON.parse(JSON.stringify(input));
  }

  function hour12(h) {
    var ap = h >= 12 ? "PM" : "AM";
    var hr = h % 12;
    if (hr === 0) hr = 12;
    return { h: hr, ap: ap };
  }

  function to24(h12, ap) {
    var h = Number(h12);
    if (ap === "AM") return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  }

  function readForm() {
    var h = to24(el("f-hour").value, el("f-ap").value);
    return {
      name: el("f-name").value.trim(),
      city: el("f-city").value.trim(),
      state: el("f-state").value.trim(),
      country: el("f-country").value.trim(),
      timezone: el("f-zone").value.trim(),
      latitude: el("f-lat").value.trim(),
      longitude: el("f-lon").value.trim(),
      year: Number(el("f-year").value),
      mon: Number(el("f-mon").value),
      mday: Number(el("f-day").value),
      hour: h,
      min: Number(el("f-min").value),
      sec: Number(el("f-sec").value),
      isdst: Number(el("f-dst").value)
    };
  }

  function writeForm(input) {
    var ap = hour12(input.hour | 0);
    el("f-name").value = input.name || "";
    el("f-city").value = input.city || "";
    el("f-state").value = input.state || "";
    el("f-country").value = input.country || "";
    el("f-zone").value = input.timezone || "";
    el("f-lat").value = input.latitude || "";
    el("f-lon").value = input.longitude || "";
    el("f-year").value = input.year || "";
    el("f-mon").value = input.mon || "";
    el("f-day").value = input.mday || "";
    el("f-hour").value = ap.h;
    el("f-min").value = input.min || 0;
    el("f-sec").value = input.sec || 0;
    el("f-ap").value = ap.ap;
    el("f-dst").value = String(input.isdst == null ? -1 : input.isdst);
  }

  function fmtLon(lon) {
    var n = Number(lon);
    if (!isFinite(n)) n = 0;
    n = n % 360;
    if (n < 0) n += 360;
    var sign = (n / 30) | 0;
    if (sign > 11) sign = 11;
    var name = E().signs[sign + 1] || "";
    var deg = n % 30;
    var d = deg | 0;
    var m = ((deg - d) * 60) | 0;
    return d + "°" + pad(m) + "′ " + name;
  }

  function fmtDeg(lon) {
    var d = lon | 0;
    var m = ((lon - d) * 60) | 0;
    return d + "°" + pad(m) + "′";
  }

  function clockText(input) {
    var ap = hour12(input.hour);
    return E().months[input.mon] + " " + pad(input.mday) + " " + input.year + "  " +
      ap.h + ":" + pad(input.min) + ":" + pad(input.sec) + " " + ap.ap;
  }

  function setError(msg) {
    state.error = msg || "";
    paintChrome();
  }

  function pt(lon, r, asc) {
    var theta = (lon - asc) * Math.PI / 180;
    return [320 - r * Math.cos(theta), 320 + r * Math.sin(theta)];
  }

  function spread(lons) {
    var pos = lons.slice();
    for (var iter = 0; iter < 64; iter++) {
      var next = pos.slice();
      var maxChange = 0;
      for (var i = 0; i < pos.length; i++) {
        var offset = 0;
        for (var j = 0; j < pos.length; j++) {
          if (i === j) continue;
          var signed = pos[j] - pos[i];
          while (signed > 180) signed -= 360;
          while (signed < -180) signed += 360;
          var ad = Math.abs(signed);
          if (ad < 11) {
            var strength = (11 - ad) / 11;
            offset += 4 * strength * (signed > 0 ? -1 : 1);
          }
        }
        var nl = pos[i] + offset;
        while (nl < 0) nl += 360;
        while (nl >= 360) nl -= 360;
        var change = Math.abs(nl - pos[i]);
        if (change > 180) change = 360 - change;
        if (change > maxChange) maxChange = change;
        next[i] = nl;
      }
      pos = next;
      if (maxChange < 0.1) break;
    }
    return pos;
  }

  function stackRadii(adjusted, base) {
    var radii = adjusted.map(function () { return base; });
    var order = adjusted.map(function (lon, i) { return i; }).sort(function (a, b) {
      return adjusted[a] - adjusted[b];
    });
    for (var n = 1; n < order.length; n++) {
      var prev = adjusted[order[n - 1]];
      var cur = adjusted[order[n]];
      if (Math.abs(cur - prev) < 8) radii[order[n]] = radii[order[n - 1]] - 16;
    }
    return radii;
  }

  function wheelSvg(chart, overlay) {
    if (!chart) return "";
    var asc = chart.asc;
    var parts = [];
    parts.push('<svg class="wheel" viewBox="0 0 640 640" role="img" aria-label="Chart wheel">');
    parts.push('<circle cx="320" cy="320" r="292" class="ring"/>');
    parts.push('<circle cx="320" cy="320" r="248" class="ring"/>');
    parts.push('<circle cx="320" cy="320" r="168" class="ring"/>');
    var cusp0 = chart.cusps[0];
    for (var s = 0; s < 12; s++) {
      var start = cusp0 + s * 30;
      var mid = start + 15;
      var a0 = pt(start, 292, asc);
      var a1 = pt(start, 248, asc);
      parts.push('<line x1="' + a0[0].toFixed(1) + '" y1="' + a0[1].toFixed(1) + '" x2="' + a1[0].toFixed(1) + '" y2="' + a1[1].toFixed(1) + '" class="tick"/>');
      var g = pt(mid, 270, asc);
      var absSign = ((norm(start) / 30) | 0) + 1;
      if (absSign < 1) absSign = 1;
      if (absSign > 12) absSign = 12;
      var element = [0, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5][absSign];
      parts.push('<text x="' + g[0].toFixed(1) + '" y="' + g[1].toFixed(1) + '" class="glyph ' + elClass(element) + '" text-anchor="middle" dominant-baseline="middle">' + E().signGlyph[absSign] + '</text>');
    }
    for (var h = 0; h < 12; h++) {
      var c0 = pt(chart.cusps[h], 248, asc);
      var c1 = pt(chart.cusps[h], 40, asc);
      parts.push('<line x1="' + c0[0].toFixed(1) + '" y1="' + c0[1].toFixed(1) + '" x2="' + c1[0].toFixed(1) + '" y2="' + c1[1].toFixed(1) + '" class="cusp"/>');
      var lab = pt(chart.cusps[h] + 4, 232, asc);
      parts.push('<text x="' + lab[0].toFixed(1) + '" y="' + lab[1].toFixed(1) + '" class="house-no" text-anchor="middle">' + (h + 1) + '</text>');
    }
    if (state.aspects && chart.aspects) {
      chart.aspects.forEach(function (asp) {
        var p1 = pt(chart.bodies[asp.a].longitude, 150, asc);
        var p2 = pt(chart.bodies[asp.b].longitude, 150, asc);
        parts.push('<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" class="aspect ' + elClass(asp.element) + '"/>');
      });
    }
    ["asc", "mc", "dsc", "ic"].forEach(function (key, idx) {
      var body = chart.bodies[12 + idx];
      var p = pt(body.longitude, 248, asc);
      var q = pt(body.longitude, 300, asc);
      parts.push('<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" class="angle"/>');
    });
    drawBodies(parts, chart, 196, false);
    if (overlay) drawBodies(parts, overlay, 128, true);
    parts.push("</svg>");
    return parts.join("");
  }

  function norm(x) {
    var n = x % 360;
    if (n < 0) n += 360;
    return n;
  }

  function drawBodies(parts, chart, radius, ghost) {
    var use = chart.bodies.slice(0, 12);
    var adj = spread(use.map(function (b) { return b.longitude; }));
    var radii = stackRadii(adj, radius);
    use.forEach(function (b, i) {
      var ascFor = (chart === state.overlay && state.chart) ? state.chart.asc : chart.asc;
      var p = pt(adj[i], radii[i], ascFor);
      var cls = "body " + elClass(b.element) + (ghost ? " ghost" : "");
      var mark = b.station === 1 ? " SR" : b.station === 2 ? " SD" : (b.retrograde && i !== 11 ? " R" : "");
      parts.push('<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" class="' + cls + '" text-anchor="middle" dominant-baseline="middle">' + b.glyph + mark + '</text>');
    });
  }

  function leftPanel(chart) {
    if (!chart) return "";
    var rows = chart.bodies.map(function (b, i) {
      var retro = b.station === 1 ? " SR" : b.station === 2 ? " SD" : (b.retrograde && i < 12 && i !== 11 ? " R" : "");
      var rule = i === 12 || i === 16 ? '<div class="rule"></div>' : "";
      return rule + '<div class="pos"><span>' + esc(b.short) + '</span><b>' + fmtDeg(b.longitude) + '</b><em class="' + elClass(b.element) + '">' + b.signGlyph + " " + b.degree + "°" + pad(b.minute) + "′" + retro + "</em></div>";
    }).join("");
    var dig = chart.dignities.map(function (d, i) {
      var cells = [d.ruler, d.exalt, d.triplicity, d.bound, d.decan, d.detriment, d.fall].map(function (id, k) {
        var name = E().shortName[id] || " ";
        var hot = id === i;
        var cls = hot ? (k >= 5 ? "bad" : "good") : "";
        return '<i class="' + cls + '">' + esc(name.trim() || "·") + "</i>";
      }).join("");
      return "<div class='dig'><b>" + esc(chart.bodies[i].short) + "</b>" + cells + "</div>";
    }).join("");
    return '<section class="panel"><header>Positions</header>' + rows +
      '<header>Dignities</header><div class="dig head"><b></b><i>rul</i><i>exa</i><i>tri</i><i>bou</i><i>dec</i><i>det</i><i>fal</i></div>' + dig +
      '<p class="phase">Moon ' + esc(chart.phaseName) + '</p>' +
      '<p class="phase">Profection <span class="' + elClass(elementOfSign(chart.profection.year)) + '">' + E().signGlyph[chart.profection.year] + '</span>' +
      ' <span class="muted">month</span> <span class="' + elClass(elementOfSign(chart.profection.month)) + '">' + E().signGlyph[chart.profection.month] + '</span></p></section>';
  }

  function elementOfSign(sign) {
    return [0, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5][sign] || 2;
  }

  function rightPanel(chart) {
    if (!chart) return "";
    var e = chart.eclipses;
    var stations = "";
    for (var i = 2; i <= 9; i++) {
      var b = chart.bodies[i];
      var dsign = b.longitudeSpeed < 0 ? "−" : "";
      stations += '<div class="stat"><span>' + esc(b.short) + " " + dsign + Math.abs(b.longitudeSpeed).toFixed(2) + "°/d</span>" +
        '<em>next ' + Math.round(b.nextStationDays) + 'd</em><em>prev ' + Math.round(b.prevStationDays) + 'd</em></div>';
    }
    var off = chart.gmtoff / 60;
    var sign = off < 0 ? "−" : "+";
    var abs = Math.abs(off);
    var oh = (abs / 60) | 0;
    var om = abs % 60;
    return '<section class="panel"><header>Chart</header>' +
      '<p class="meta-name">' + esc(chart.input.name || "untitled") + '</p>' +
      '<p>' + esc([chart.input.city, chart.input.state, chart.input.country].filter(Boolean).join(", ")) + '</p>' +
      '<p>' + esc(clockText(chart.input)) + ' · ' + E().week[chart.wday] + '</p>' +
      '<p>UTC ' + chart.utc.year + '-' + pad(chart.utc.mon) + '-' + pad(chart.utc.mday) + ' ' + pad(chart.utc.hour) + ':' + pad(chart.utc.min) + ':' + pad(chart.utc.sec) +
      ' · ' + sign + pad(oh) + ':' + pad(om) + (chart.input.isdst === 1 ? " DST" : "") + (chart.lmt ? " LMT" : "") + '</p>' +
      '<p class="mono">' + esc(chart.input.timezone) + '</p>' +
      '<p class="mono">' + Number(chart.input.latitude).toFixed(4) + '  ' + Number(chart.input.longitude).toFixed(4) + '</p>' +
      '<p class="mono">JD ' + chart.jd.toFixed(5) + ' · houses W</p>' +
      '<header>Eclipses</header>' +
      '<p>Moon next ' + E().signGlyph[e.lunarNextSign] + ' ' + Math.round(e.lunarNextDays) + 'd · prev ' + E().signGlyph[e.lunarPrevSign] + ' ' + Math.round(e.lunarPrevDays) + 'd</p>' +
      '<p>Sun next ' + E().signGlyph[e.solarNextSign] + ' ' + Math.round(e.solarNextDays) + 'd · prev ' + E().signGlyph[e.solarPrevSign] + ' ' + Math.round(e.solarPrevDays) + 'd</p>' +
      '<header>Stations</header>' + stations +
      '</section>';
  }

  function paintChrome() {
    document.querySelectorAll("[data-screen]").forEach(function (node) {
      node.hidden = node.getAttribute("data-screen") !== state.screen;
    });
    document.querySelectorAll("[data-go]").forEach(function (node) {
      node.classList.toggle("on", node.getAttribute("data-go") === state.screen);
    });
    el("more-sheet").hidden = !state.more;
    el("err").textContent = state.error;
    el("err").hidden = !state.error;
    el("note").textContent = state.note;
    el("note").hidden = !state.note;
    el("frame-status").textContent = state.frameStatus || "";
    el("frame-status").hidden = !state.frameStatus;
    el("ready-flag").textContent = state.ready ? "" : "Loading Swiss Ephemeris…";
    el("draw").disabled = !state.ready;
    el("fixture").disabled = !state.ready;
  }

  function paintChart() {
    var host = el("wheel-host");
    var wheel = state.chart ? wheelSvg(state.chart, state.overlay) : '<p class="empty">No chart yet. Draw one, or run the fixture.</p>';
    var left = state.left && state.chart ? leftPanel(state.chart) : "";
    var right = state.right && state.chart ? rightPanel(state.chart) : "";
    host.innerHTML = wheel;
    el("left-panel").innerHTML = left;
    el("right-panel").innerHTML = right;
    el("left-panel").hidden = !state.left;
    el("right-panel").hidden = !state.right;
    el("overlay-note").textContent = state.overlay
      ? (state.overlayKind === "synastry" ? "Synastry — inner glyphs are the other chart" : "Transits — inner glyphs")
      : "";
    var drift = "";
    if (state.chart && state.chart.input.name === "Fixture") {
      var d = E().fixtureDrift(state.chart);
      var ok = d.utcOk && d.jdOk && d.sunOk && d.moonOk && d.ascOk && d.mcOk;
      drift = ok ? "Fixture matches the frozen Swiss Ephemeris numbers." : "Fixture drift — see the comparison line.";
      if (!ok) {
        drift += " JD " + d.jd.toFixed(6) + " Sun " + d.sun.toFixed(5) + " Moon " + d.moon.toFixed(5);
      }
    }
    el("fixture-note").textContent = drift;
  }

  function paintSlots() {
    var html = "";
    for (var i = 0; i < 10; i++) {
      var slot = state.slots[i];
      html += '<article class="slot"><header>Slot ' + i + '</header><p>' +
        (slot ? esc(slot.name || "untitled") + "<br><span class='muted'>" + esc(clockText(slot)) + "</span>" : "<span class='muted'>empty</span>") +
        '</p><div class="row">' +
        '<button type="button" data-slot-load="' + i + '"' + (slot ? "" : " disabled") + '>Open</button>' +
        '<button type="button" data-slot-copy="' + i + '">Copy</button>' +
        '<button type="button" data-slot-syn="' + i + '"' + (slot ? "" : " disabled") + '>Synastry</button>' +
        '<button type="button" data-slot-clear="' + i + '"' + (slot ? "" : " disabled") + '>Clear</button>' +
        '</div></article>';
    }
    el("slots").innerHTML = html;
  }

  function paintLibrary() {
    var groups = {};
    state.library.forEach(function (c) {
      var key = c.collection || "charts";
      (groups[key] = groups[key] || []).push(c);
    });
    var names = Object.keys(groups).sort();
    if (!names.length) {
      el("library").innerHTML = '<p class="empty">No saved charts. Save the open chart into a collection.</p>';
      return;
    }
    el("library").innerHTML = names.map(function (name) {
      var cards = groups[name].map(function (c) {
        return '<article class="slot"><header>' + esc(c.name || "untitled") + '</header><p class="muted">' +
          esc(c.city || "") + " · " + esc(clockText(c)) + '</p><div class="row">' +
          '<button type="button" data-lib-load="' + esc(c.id) + '">Open</button>' +
          '<button type="button" data-lib-share="' + esc(c.id) + '">Share</button>' +
          '<button type="button" data-lib-del="' + esc(c.id) + '">Delete</button></div></article>';
      }).join("");
      return '<section><h2>' + esc(name) + '</h2>' + cards + '</section>';
    }).join("");
  }

  function paintReleasing() {
    if (!state.chart) {
      el("zr").innerHTML = '<p class="empty">Draw a chart first.</p>';
      return;
    }
    var tree;
    try {
      tree = E().releasing(state.chart, state.zrLot, state.zrSel);
    } catch (err) {
      el("zr").innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
      return;
    }
    var cols = tree.columns.map(function (col, level) {
      var items = col.map(function (row, i) {
        return '<button type="button" class="zr-row' + (row.selected ? " on" : "") + '" data-zr="' + level + ":" + i + '">' +
          '<span class="' + elClass(row.element) + '">' + row.signGlyph + '</span> ' + esc(row.label) + '</button>';
      }).join("");
      return '<div class="zr-col' + (level === state.zrLayer ? " current" : "") + '"><header>' + E().layerName[level] + '</header>' + items + '</div>';
    }).join("");
    el("zr-lot").textContent = state.zrLot === "spirit" ? "Lot of Spirit" : "Lot of Fortune";
    el("zr-layer").textContent = E().layerName[state.zrLayer];
    el("zr").innerHTML = cols;
  }

  function paint() {
    paintChrome();
    paintChart();
    paintSlots();
    paintLibrary();
    if (state.screen === "releasing") paintReleasing();
    el("step-label").textContent = state.step;
    el("play").textContent = state.playing ? "Stop" : "Animate";
    el("play").disabled = !!state.reduceMotion;
    el("live").textContent = state.live ? "Live on" : "Live clock";
    el("live").disabled = !!state.reduceMotion;
    el("toggle-left").textContent = state.left ? "Hide positions" : "Show positions";
    el("toggle-right").textContent = state.right ? "Hide sky" : "Show sky";
    el("toggle-asp").textContent = state.aspects ? "Hide aspects" : "Show aspects";
  }

  function go(screen) {
    state.screen = screen;
    state.more = false;
    if (screen === "releasing") paintReleasing();
    paint();
  }

  async function draw(input, opts) {
    opts = opts || {};
    var frame = !!opts.frame && !!state.chart;
    if (!frame) {
      state.error = "";
      if (!state.chart) {
        state.frameStatus = "Working";
        paintChrome();
        await yieldNow();
      }
    }
    try {
      var prev = opts.keepCache ? state.chart : null;
      var chart = E().compute(input, prev);
      state.input = cloneInput(chart.input);
      state.chart = chart;
      if (!opts.keepOverlay) {
        state.overlay = null;
        state.overlayKind = "";
      }
      writeForm(state.input);
      state.frameStatus = "";
      state.error = "";
      state.note = "";
      cacheTz(state.input, chart);
      if (!opts.stay) go("chart");
      else paint();
    } catch (err) {
      if (frame) { stopPlay(); stopLive(); }
      state.frameStatus = "";
      state.note = "";
      setError(err.message || String(err));
      paint();
    }
  }

  function yieldNow() {
    return new Promise(function (r) { setTimeout(r, 20); });
  }

  function cacheTz(input, chart) {
    var key = [input.timezone, input.year, input.mon, input.mday, input.hour, input.min, input.sec, input.isdst, input.longitude].join("|");
    Store().tzPut(key, { jd: chart.jd, utc: chart.utc }).catch(function () {});
  }

  async function runFixture() {
    var fx = E().fixture;
    state.input = cloneInput(fx);
    delete state.input.expect;
    writeForm(state.input);
    await draw(state.input);
  }

  function fillNow() {
    var zone = el("f-zone").value.trim() || guessZone();
    if (!globalThis.moment.tz.zone(zone)) {
      setError("Unknown IANA timezone: " + zone);
      return;
    }
    var now = E().nowInZone(zone);
    var input = readForm();
    input.timezone = zone;
    input.year = now.year;
    input.mon = now.mon;
    input.mday = now.mday;
    input.hour = now.hour24;
    input.min = now.min;
    input.sec = now.sec;
    input.isdst = -1;
    writeForm(input);
    setError("");
  }

  function clearForm() {
    var zone = el("f-zone").value.trim() || guessZone();
    writeForm(Object.assign(emptyInput(), { timezone: zone }));
  }

  async function stepBy(dir) {
    if (!state.chart || frameLock) return;
    frameLock = true;
    try {
      var next = E().step(state.input, state.step, dir);
      await draw(next, {
        stay: true,
        frame: true,
        keepCache: state.step !== "month" && state.step !== "year",
        keepOverlay: false
      });
    } finally {
      frameLock = false;
    }
  }

  function stopPlay() {
    state.playing = false;
    if (playTimer) clearTimeout(playTimer);
    playTimer = 0;
  }

  function motionReduced() {
    return !!state.reduceMotion;
  }

  function schedulePlay() {
    if (!state.playing || motionReduced()) return;
    playTimer = setTimeout(function () {
      playTimer = 0;
      if (!state.playing) return;
      stepBy(1).then(schedulePlay);
    }, 700);
  }

  function togglePlay() {
    if (state.playing) { stopPlay(); paint(); return; }
    if (!state.chart || motionReduced()) return;
    stopLive();
    state.playing = true;
    paint();
    schedulePlay();
  }

  function stopLive() {
    state.live = false;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = 0;
  }

  function liveTick() {
    if (!state.live || frameLock) return Promise.resolve();
    var input = cloneInput(state.input);
    var zone = input.timezone || guessZone();
    var now = E().nowInZone(zone);
    input.year = now.year; input.mon = now.mon; input.mday = now.mday;
    input.hour = now.hour24; input.min = now.min; input.sec = now.sec; input.isdst = -1;
    frameLock = true;
    return draw(input, { stay: true, frame: true, keepCache: true }).then(function () {
      frameLock = false;
    }, function (err) {
      frameLock = false;
      throw err;
    });
  }

  function scheduleLive() {
    if (!state.live || motionReduced()) return;
    liveTimer = setTimeout(function () {
      liveTimer = 0;
      if (!state.live) return;
      liveTick().then(scheduleLive);
    }, 1000);
  }

  function toggleLive() {
    if (state.live) { stopLive(); paint(); return; }
    if (motionReduced()) return;
    stopPlay();
    state.live = true;
    paint();
    liveTick().then(scheduleLive);
  }

  function bindMotion() {
    state.reduceMotion = false;
    if (!globalThis.matchMedia) return;
    var mq = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    var apply = function () {
      state.reduceMotion = !!mq.matches;
      if (state.reduceMotion) {
        stopPlay();
        stopLive();
      }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  async function copySlot(i) {
    if (!state.chart) { setError("Draw a chart before copying it into a slot."); return; }
    state.slots[i] = cloneInput(state.input);
    await Store().saveSlot(i, state.slots[i]);
    state.note = "Copied into slot " + i + ".";
    paint();
  }

  async function synastry(i) {
    var slot = state.slots[i];
    if (!slot || !state.chart) return;
    setError("");
    state.note = "Synastry…";
    paintChrome();
    try {
      var other = E().compute(slot);
      state.overlay = other;
      state.overlayKind = "synastry";
      state.note = "";
      go("chart");
    } catch (err) {
      state.note = "";
      setError(err.message || String(err));
    }
  }

  async function transits(mode) {
    if (!state.chart) { setError("Draw a chart first."); return; }
    var input = cloneInput(state.input);
    if (mode === "now") {
      var now = E().nowInZone(input.timezone);
      input.year = now.year; input.mon = now.mon; input.mday = now.mday;
      input.hour = now.hour24; input.min = now.min; input.sec = now.sec; input.isdst = -1;
      input.name = (state.input.name || "chart") + " transits";
    } else {
      input.year = Number(el("tr-year").value);
      input.mon = Number(el("tr-mon").value);
      input.mday = Number(el("tr-day").value);
      input.hour = to24(el("tr-hour").value, el("tr-ap").value);
      input.min = Number(el("tr-min").value);
      input.sec = 0;
      input.isdst = -1;
      input.name = "Chosen transit";
    }
    setError("");
    try {
      state.overlay = E().compute(input);
      state.overlayKind = "transit";
      state.note = "";
      go("chart");
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function doReturn() {
    if (!state.chart) { setError("Draw a natal chart first."); return; }
    var year = Number(el("sr-year").value);
    setError("");
    state.note = "Solar return…";
    paintChrome();
    await yieldNow();
    try {
      var when = E().solarReturn(state.chart, year);
      when.name = (state.chart.input.name || "chart") + " SR " + year;
      state.note = "";
      await draw(when);
    } catch (err) {
      state.note = "";
      setError(err.message || String(err));
    }
  }

  function uid() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function saveLibrary() {
    if (!state.chart) { setError("Draw a chart before saving."); return; }
    var collection = (el("lib-folder").value || "charts").trim() || "charts";
    var rec = cloneInput(state.input);
    rec.id = uid();
    rec.collection = collection;
    rec.savedAt = Date.now();
    if (state.chart.profectionAsOf) rec.profectionAsOf = cloneInput(state.chart.profectionAsOf);
    await Store().saveChart(rec);
    state.library.push(rec);
    state.note = "Saved into " + collection + ".";
    paint();
  }

  function summaryText(chart) {
    var lines = [];
    lines.push(chart.input.name || "untitled");
    lines.push(clockText(chart.input) + " " + chart.input.timezone);
    lines.push(chart.input.latitude + ", " + chart.input.longitude);
    lines.push("JD " + chart.jd.toFixed(5));
    chart.bodies.forEach(function (b) {
      lines.push(b.name + " " + fmtLon(b.longitude) + (b.retrograde ? " R" : ""));
    });
    lines.push("Moon " + chart.phaseName);
    lines.push("Positions only. No interpretation. AGPL-3.0. sweetpotatopress.");
    return lines.join("\n");
  }

  function svgBlob() {
    var svg = el("wheel-host").querySelector("svg");
    if (!svg) return null;
    var text = '<?xml version="1.0" encoding="UTF-8"?>' + svg.outerHTML;
    return new Blob([text], { type: "image/svg+xml" });
  }

  function shareFileName(name) {
    var base = String(name == null ? "" : name).replace(/\0/g, "");
    base = base.split(/[^A-Za-z0-9]+/).filter(Boolean).join("-");
    if (!base) base = "chart";
    return base.slice(0, 80) + ".svg";
  }

  async function shareChart(chart) {
    var text = summaryText(chart);
    var blob = svgBlob();
    var payload = { text: text };
    if (blob) payload.file = { name: shareFileName(chart.input.name), data: blob };
    try {
      if (globalThis.webxdc && typeof webxdc.sendToChat === "function") {
        await webxdc.sendToChat(payload);
        state.note = "Sent to the chat.";
      } else {
        throw new Error("no webxdc");
      }
    } catch (err) {
      if (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = payload.file ? payload.file.name : "chart.svg";
        a.click();
      }
      state.note = "Sharing is outside Vector. The SVG downloaded instead.";
    }
    paint();
  }

  async function saveDefault() {
    var input = readForm();
    var cfg = {
      input: input,
      dst: Number(el("f-dst").value),
      left: state.left,
      right: state.right,
      aspects: state.aspects
    };
    await Store().saveConfig(cfg);
    state.note = "Current form is the default.";
    paint();
  }

  function cycleDst() {
    var cur = Number(el("f-dst").value);
    var next = cur < 0 ? 1 : cur > 0 ? 0 : -1;
    el("f-dst").value = String(next);
    if (state.chart) {
      var input = readForm();
      draw(input, { stay: true });
    }
  }

  function onClick(ev) {
    var t = ev.target.closest("button");
    if (!t) return;
    var goTo = t.getAttribute("data-go");
    if (goTo) { go(goTo); return; }
    var id = t.id;
    if (id === "more-open") { state.more = !state.more; paint(); return; }
    if (id === "draw") { draw(readForm()); return; }
    if (id === "fixture") { runFixture(); return; }
    if (id === "clear") { clearForm(); return; }
    if (id === "now") { fillNow(); return; }
    if (id === "cancel") { writeForm(state.input); go(state.chart ? "chart" : "form"); return; }
    if (id === "redraw") { if (state.chart) draw(state.input, { stay: true }); return; }
    if (id === "play") { togglePlay(); return; }
    if (id === "live") { toggleLive(); return; }
    if (id === "step-back") { stopPlay(); stepBy(-1); return; }
    if (id === "step-fwd") { stopPlay(); stepBy(1); return; }
    if (id === "dst") { cycleDst(); return; }
    if (id === "toggle-left") { state.left = !state.left; paint(); return; }
    if (id === "toggle-right") { state.right = !state.right; paint(); return; }
    if (id === "toggle-asp") { state.aspects = !state.aspects; paint(); return; }
    if (id === "share") { if (state.chart) shareChart(state.chart); return; }
    if (id === "tr-now") { transits("now"); return; }
    if (id === "tr-chosen") { transits("chosen"); return; }
    if (id === "sr-go") { doReturn(); return; }
    if (id === "lib-save") { saveLibrary(); return; }
    if (id === "cfg-save") { saveDefault(); return; }
    if (id === "cfg-cancel") { go("chart"); return; }
    if (id === "zr-switch") {
      state.zrLot = state.zrLot === "fortune" ? "spirit" : "fortune";
      state.zrSel = [0, 0, 0, 0];
      state.zrLayer = 0;
      paintReleasing();
      return;
    }
    if (id === "zr-prev") { moveZr(-1); return; }
    if (id === "zr-next") { moveZr(1); return; }
    if (id === "zr-out") { if (state.zrLayer > 0) state.zrLayer--; paintReleasing(); return; }
    if (id === "zr-in") { if (state.zrLayer < 2) state.zrLayer++; paintReleasing(); return; }
    var load = t.getAttribute("data-slot-load");
    if (load != null) { draw(state.slots[Number(load)]); return; }
    var copy = t.getAttribute("data-slot-copy");
    if (copy != null) { copySlot(Number(copy)); return; }
    var syn = t.getAttribute("data-slot-syn");
    if (syn != null) { synastry(Number(syn)); return; }
    var clear = t.getAttribute("data-slot-clear");
    if (clear != null) {
      state.slots[Number(clear)] = null;
      Store().clearSlot(Number(clear));
      paint();
      return;
    }
    var lib = t.getAttribute("data-lib-load");
    if (lib) {
      var found = state.library.filter(function (c) { return c.id === lib; })[0];
      if (found) draw(found);
      return;
    }
    var share = t.getAttribute("data-lib-share");
    if (share) {
      var item = state.library.filter(function (c) { return c.id === share; })[0];
      if (!item) return;
      draw(item).then(function () { if (state.chart) shareChart(state.chart); });
      return;
    }
    var del = t.getAttribute("data-lib-del");
    if (del) {
      Store().deleteChart(del).then(function () {
        state.library = state.library.filter(function (c) { return c.id !== del; });
        paint();
      });
      return;
    }
    var zr = t.getAttribute("data-zr");
    if (zr) {
      var bits = zr.split(":");
      var level = Number(bits[0]);
      state.zrLayer = level;
      state.zrSel[level] = Number(bits[1]);
      for (var k = level + 1; k < 4; k++) state.zrSel[k] = 0;
      paintReleasing();
    }
  }

  function moveZr(dir) {
    if (!state.chart) return;
    var tree = E().releasing(state.chart, state.zrLot, state.zrSel);
    var count = tree.columns[state.zrLayer].length;
    if (!count) return;
    state.zrSel[state.zrLayer] = (state.zrSel[state.zrLayer] + dir + count) % count;
    for (var k = state.zrLayer + 1; k < 4; k++) state.zrSel[k] = 0;
    paintReleasing();
  }

  function onKey(ev) {
    var tag = (ev.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    var key = ev.key;
    if (key === "i") go("form");
    else if (key === "r") { if (state.chart) draw(state.input, { stay: true }); }
    else if (key === "d") cycleDst();
    else if (key === "o") { state.right = !state.right; paint(); }
    else if (key === "p") { state.left = !state.left; paint(); }
    else if (key === "t") go("time");
    else if (key === "s") go("return");
    else if (key === "z") go("releasing");
    else if (key === "w") go("library");
    else if (key === "e") go("library");
    else if (key === "c") go("config");
    else if (key === "ArrowLeft" || key === "h") { ev.preventDefault(); stepBy(-1); }
    else if (key === "ArrowRight" || key === "l") { ev.preventDefault(); stepBy(1); }
    else if (key === "Tab" && state.screen === "releasing") { ev.preventDefault(); el("zr-switch").click(); }
    else if (key >= "0" && key <= "9" && state.slots[Number(key)]) draw(state.slots[Number(key)]);
  }

  function changeStep(ev) {
    if (ev.target.id === "step-size") state.step = ev.target.value;
  }

  async function boot() {
    writeForm(state.input);
    el("sr-year").value = state.returnYear;
    var now = new Date();
    el("tr-year").value = now.getFullYear();
    el("tr-mon").value = now.getMonth() + 1;
    el("tr-day").value = now.getDate();
    el("tr-hour").value = hour12(now.getHours()).h;
    el("tr-ap").value = hour12(now.getHours()).ap;
    el("tr-min").value = now.getMinutes();
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("keydown", onKey);
    document.body.addEventListener("change", changeStep);
    bindMotion();
    paint();
    try {
      var cfg = await Store().config();
      if (cfg && cfg.input) {
        state.input = Object.assign(emptyInput(), cfg.input);
        state.left = cfg.left !== false;
        state.right = cfg.right !== false;
        state.aspects = cfg.aspects !== false;
        writeForm(state.input);
      }
      var slots = await Store().slots();
      slots.forEach(function (row) { if (row && row.slot >= 0 && row.slot < 10) state.slots[row.slot] = row.input; });
      state.library = await Store().charts();
    } catch (err) {
      state.note = "Storage is unavailable in this view. Charts stay until you leave.";
    }
    try {
      await E().init();
      state.ready = true;
      state.note = state.note || "";
    } catch (err) {
      setError(err.message || String(err));
    }
    var list = el("zones");
    if (state.ready) {
      var names = E().zones();
      list.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("");
    }
    paint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
