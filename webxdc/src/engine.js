/* Copyright (C) 2026 yam lynn
 * Port of astro by sweetpotatopress.
 * https://github.com/sweetpotatopress/astro
 * https://sweetpotato.press
 * AGPL-3.0-or-later. See ../LICENSE and https://www.gnu.org/licenses/agpl-3.0.html
 * Swiss Ephemeris by Astrodienst. No warranty.
 * OMARG lineage metadata only. This header does not relicense the work
 * and does not revoke rights the AGPL grants.
 */
(function (root) {
  "use strict";

  var SE_SUN = 0, SE_MOON = 1, SE_MERCURY = 2, SE_VENUS = 3, SE_MARS = 4;
  var SE_JUPITER = 5, SE_SATURN = 6, SE_URANUS = 7, SE_NEPTUNE = 8, SE_PLUTO = 9;
  var SE_MEAN_NODE = 10, SE_TRUE_NODE = 11;
  var SEFLG_SWIEPH = 2, SEFLG_MOSEPH = 4, SEFLG_SPEED = 256, SE_GREG_CAL = 1;
  var JUL_SEC = 0.00001157407407;
  var EPHE_FILES = ["sepl_18.se1", "semo_18.se1"];
  var EPHE_MIN = 1800, EPHE_MAX = 2399;

  var FIRE = 2, EARTH = 3, AIR = 4, WATER = 5, EMPTY = 16;
  var ELEMENT = 0, RULER = 1, EXALT = 2, TRIPLD = 3, TRIPLN = 4, TRIPLC = 5;
  var BOUND0 = 6, DECAN0 = 11, DETRI = 14, FALL = 15;
  var LONG = 0, LAT = 1, DIST = 2, LONG_S = 3, LAT_S = 4, DIST_S = 5;
  var RETRO = 6, STATION = 7, DEGREE = 8, MIN = 9, DEGREE_S = 10, MIN_S = 11;
  var NEXT_S = 12, NEXT_Z = 13, NEXT_JUL = 14, PREV_S = 15, PREV_Z = 16, PREV_JUL = 17, RET_INIT = 18;
  var NIGHT = 0, DAY = 1, STATION_R = 1, STATION_D = 2;
  var E_INIT = 0, EN_JUL = 1, EN_FJUL = 2, EN_SIGN = 4, EP_JUL = 5, EP_FJUL = 6, EP_SIGN = 8;

  var SIGNS = ["", "Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
  var SIGN_GLYPH = ["", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  var MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var PHASES = ["new", "crescent", "quarter", "gibbous", "full", "2nd gibbous", "2nd quarter", "2nd crescent"];
  var SHORT = ["su", "mo", "me", "ve", "ma", "ju", "sa", "ur", "ne", "pl", "so", "no", "as", "mc", "ds", "ic", "  "];
  var POINT_SHORT = SHORT.slice(0, 16).concat(["fortune", "spirit"]);
  var BODY_META = [
    { key: "sun", name: "Sun", glyph: "☉" },
    { key: "moon", name: "Moon", glyph: "☽" },
    { key: "mercury", name: "Mercury", glyph: "☿" },
    { key: "venus", name: "Venus", glyph: "♀" },
    { key: "mars", name: "Mars", glyph: "♂" },
    { key: "jupiter", name: "Jupiter", glyph: "♃" },
    { key: "saturn", name: "Saturn", glyph: "♄" },
    { key: "uranus", name: "Uranus", glyph: "♅" },
    { key: "neptune", name: "Neptune", glyph: "♆" },
    { key: "pluto", name: "Pluto", glyph: "♇" },
    { key: "southNode", name: "South Node", glyph: "☋" },
    { key: "northNode", name: "North Node", glyph: "☊" },
    { key: "asc", name: "Ascendant", glyph: "As" },
    { key: "mc", name: "Midheaven", glyph: "Mc" },
    { key: "dsc", name: "Descendant", glyph: "Ds" },
    { key: "ic", name: "IC", glyph: "Ic" },
    { key: "fortune", name: "Fortune", glyph: "⊗" },
    { key: "spirit", name: "Spirit", glyph: "⊕" }
  ];

  /* zxx_init in src/init.c — element, ruler, exalt, triplicity d/n/c, bounds, decans, detriment, fall */
  var ZODIAC = [null,
    [FIRE, 4, 0, 0, 5, 6, 5, 3, 2, 4, 6, 4, 0, 3, 3, 6],
    [EARTH, 3, 1, 3, 1, 4, 3, 2, 5, 6, 4, 2, 1, 6, 4, 16],
    [AIR, 2, 16, 6, 2, 5, 2, 5, 3, 4, 6, 5, 4, 0, 5, 16],
    [WATER, 1, 5, 3, 4, 1, 4, 3, 2, 5, 6, 3, 2, 1, 6, 4],
    [FIRE, 0, 16, 0, 5, 6, 5, 3, 6, 2, 4, 6, 5, 4, 6, 16],
    [EARTH, 2, 2, 3, 1, 4, 2, 3, 5, 4, 6, 0, 3, 2, 5, 3],
    [AIR, 3, 6, 6, 2, 5, 6, 2, 5, 3, 4, 1, 6, 5, 4, 0],
    [WATER, 4, 16, 3, 4, 1, 4, 3, 2, 5, 6, 4, 0, 3, 3, 1],
    [FIRE, 5, 16, 0, 5, 6, 5, 3, 2, 6, 4, 2, 1, 6, 2, 16],
    [EARTH, 6, 4, 3, 1, 4, 2, 5, 3, 6, 4, 5, 4, 0, 1, 5],
    [AIR, 6, 16, 6, 2, 5, 2, 3, 5, 4, 6, 3, 2, 1, 0, 16],
    [WATER, 5, 3, 3, 4, 1, 3, 5, 2, 4, 6, 6, 5, 4, 2, 2]
  ];
  var BOUNDS = [null,
    [5, 11, 19, 24, 29], [7, 13, 21, 26, 29], [5, 11, 16, 24, 29], [6, 12, 18, 25, 29],
    [5, 10, 17, 23, 29], [6, 16, 20, 27, 29], [5, 10, 18, 25, 29], [6, 10, 18, 23, 29],
    [11, 16, 20, 25, 29], [6, 13, 21, 25, 29], [6, 12, 19, 24, 29], [11, 15, 18, 27, 29]
  ];
  var PL_PERIOD = [0, 15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12];
  var LAYER_INC = [360, 30, 2.5, 2.5 / 12];
  var LAYER_NAME = ["year", "month", "week", "day"];

  var FIXTURE = {
    name: "Fixture",
    city: "San Diego",
    state: "California",
    country: "US",
    timezone: "America/Los_Angeles",
    latitude: "32.7157",
    longitude: "-117.1611",
    year: 1990, mon: 6, mday: 15, hour: 18, min: 30, sec: 0, isdst: -1,
    expect: {
      utc: "1990-06-16 01:30:00",
      jd: 2448058.5625,
      sun: 84.66678549,
      moon: 352.93158303,
      asc: 246.65491459,
      mc: 168.47617577
    }
  };

  var swe = null;
  var ready = null;

  function norm360(x) {
    var n = x % 360;
    if (n < 0) n += 360;
    return n;
  }

  function signOf(lon) {
    var s = Math.floor(lon / 30) + 1;
    if (s < 1) s = 1;
    if (s > 12) s = 12;
    return s;
  }

  function daysInMonth(month, year) {
    var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
    return days[month - 1];
  }

  function lmtBefore(input) {
    var table = root.ASTRO_LMT || {};
    var rule = table[input.timezone];
    if (!rule) return false;
    var fields = [input.year, input.mon, input.mday, input.hour, input.min, input.sec];
    for (var i = 0; i < 6; i++) {
      if (fields[i] !== rule[i]) return fields[i] < rule[i];
    }
    return false;
  }

  function sampleOffsets(zone, year) {
    var z = root.moment.tz.zone(zone);
    var set = {};
    var list = [];
    for (var m = 0; m < 12; m++) {
      var off = z.utcOffset(Date.UTC(year, m, 15, 12, 0, 0));
      if (!set[off]) { set[off] = 1; list.push(off); }
    }
    return list;
  }

  function civilToUnix(input) {
    var zone = input.timezone;
    if (!root.moment || !root.moment.tz || !root.moment.tz.zone(zone)) {
      throw new Error("Unknown IANA timezone: " + zone);
    }
    var y = input.year, mo = input.mon, d = input.mday, h = input.hour, mi = input.min, s = input.sec;
    if (input.isdst == null || input.isdst < 0) {
      var m = root.moment.tz({ year: y, month: mo - 1, day: d, hour: h, minute: mi, second: s }, zone);
      if (!m.isValid()) throw new Error("That local time does not exist in " + zone);
      return { unix: m.unix(), gmtoff: m.utcOffset() * 60 };
    }
    var offs = sampleOffsets(zone, y);
    var want = input.isdst > 0 ? Math.max.apply(null, offs) : Math.min.apply(null, offs);
    var asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
    return { unix: Math.round((asUtc - want * 60 * 1000) / 1000), gmtoff: want * 60 };
  }

  function unixToUtcParts(unix) {
    var m = root.moment.unix(unix).utc();
    return {
      year: m.year(), mon: m.month() + 1, mday: m.date(),
      hour: m.hour(), min: m.minute(), sec: m.second(),
      frac: m.hour() + m.minute() / 60 + m.second() / 3600
    };
  }

  function unixToLocal(unix, zone) {
    var m = root.moment.unix(unix).tz(zone);
    return {
      year: m.year(), mon: m.month() + 1, mday: m.date(),
      hour: m.hour(), min: m.minute(), sec: m.second(),
      isdst: m.isDST() ? 1 : 0,
      wday: m.day()
    };
  }

  function resolveUtc(input) {
    var hit = civilToUnix(input);
    var unix = hit.unix;
    if (lmtBefore(input)) {
      var lonOff = Math.round(Number(input.dlon) * 240);
      unix = unix + hit.gmtoff - lonOff;
    }
    var utc = unixToUtcParts(unix);
    var localMoment = root.moment.tz({
      year: input.year, month: input.mon - 1, day: input.mday,
      hour: input.hour, minute: input.min, second: input.sec
    }, input.timezone);
    return {
      unix: unix,
      utc: utc,
      wday: localMoment.isValid() ? localMoment.day() : 0,
      gmtoff: hit.gmtoff,
      lmt: lmtBefore(input)
    };
  }

  function malloc(n) { return swe._malloc(n); }
  function free(p) { if (p) swe._free(p); }
  function f64(ptr, n) {
    var heap = swe.HEAPF64;
    var base = ptr >> 3;
    var out = new Array(n);
    for (var i = 0; i < n; i++) out[i] = heap[base + i];
    return out;
  }

  function julday(y, m, d, hour) {
    return swe.ccall("swe_julday", "number",
      ["number", "number", "number", "number", "number"],
      [y, m, d, hour, SE_GREG_CAL]);
  }

  function calcUt(jd, ipl, iflag) {
    var xx = malloc(8 * 6);
    var serr = malloc(256);
    try {
      var ret = swe.ccall("swe_calc_ut", "number",
        ["number", "number", "number", "number", "number"],
        [jd, ipl, iflag, xx, serr]);
      var err = swe.UTF8ToString(serr);
      if (ret < 0) throw new Error(err || "swe_calc_ut failed");
      if ((ret & SEFLG_MOSEPH) || !(ret & SEFLG_SWIEPH)) {
        throw new Error("Swiss Ephemeris file was not used (Moshier fallback refused). " + (err || ""));
      }
      return { ret: ret, xx: f64(xx, 6), serr: err };
    } finally {
      free(xx); free(serr);
    }
  }

  function housesEx(jd, lat, lon, hsys) {
    var cusps = malloc(8 * 13);
    var ascmc = malloc(8 * 10);
    try {
      var ret = swe.ccall("swe_houses_ex", "number",
        ["number", "number", "number", "number", "number", "number", "number"],
        [jd, 0, lat, lon, hsys, cusps, ascmc]);
      if (ret < 0) throw new Error("swe_houses_ex failed");
      return { ret: ret, cusps: f64(cusps, 13), ascmc: f64(ascmc, 10) };
    } finally {
      free(cusps); free(ascmc);
    }
  }

  function eclipseWhen(kind, jd, backward) {
    var tret = malloc(8 * 10);
    var serr = malloc(256);
    var fn = kind === "sol" ? "swe_sol_eclipse_when_glob" : "swe_lun_eclipse_when";
    try {
      var ret = swe.ccall(fn, "number",
        ["number", "number", "number", "number", "number", "number"],
        [jd, SEFLG_SWIEPH, 0, tret, backward, serr]);
      var err = swe.UTF8ToString(serr);
      if (ret < 0) throw new Error(err || fn + " failed");
      return f64(tret, 10)[0];
    } finally {
      free(tret); free(serr);
    }
  }

  function blankBody() {
    var a = [];
    for (var i = 0; i < 21; i++) a.push(0);
    return a;
  }

  function speedSign(speed) {
    if (speed > 0) return 1;
    if (speed < 0) return -1;
    return 0;
  }

  function findStation(jdStart, initialSpeed, direction, ipl) {
    var coarse = 2, fine = 0.1, jd = jdStart, speed = initialSpeed;
    var initial = speedSign(initialSpeed);
    if (initial === 0) return null;
    var guard = 0;
    var iflag = SEFLG_SWIEPH | SEFLG_SPEED;
    do {
      jd += direction * coarse;
      speed = calcUt(jd, ipl, iflag).xx[LONG_S];
      if (++guard > 8000) throw new Error("station search did not converge");
    } while (speedSign(speed) === initial);
    guard = 0;
    do {
      jd -= direction * fine;
      var xx = calcUt(jd, ipl, iflag).xx;
      speed = xx[LONG_S];
      if (++guard > 80) break;
    } while (speedSign(speed) !== initial);
    return { offset: jd - jdStart, jd: jd, longitude: xx[LONG] };
  }

  function retroStation(jd, bodies, prev) {
    for (var ipl = SE_MERCURY; ipl <= SE_PLUTO; ipl++) {
      var p = bodies[ipl];
      var old = prev && prev[ipl];
      if (old) {
        p[NEXT_JUL] = old[NEXT_JUL];
        p[PREV_JUL] = old[PREV_JUL];
        p[NEXT_S] = old[NEXT_S];
        p[PREV_S] = old[PREV_S];
        p[RET_INIT] = old[RET_INIT];
      }
      for (var i = 0; i < 32; i++) {
        var limit = 16 * i;
        if (p[NEXT_JUL] - jd > JUL_SEC || p[PREV_JUL] - jd < -JUL_SEC) {
          p[NEXT_S] = p[NEXT_JUL] - jd;
          p[PREV_S] = p[PREV_JUL] - jd;
        }
        if (Math.abs(p[NEXT_S] - limit) <= JUL_SEC || Math.abs(p[PREV_S] - limit) <= JUL_SEC ||
            p[NEXT_S] <= 0 || p[PREV_S] >= 0) {
          p[RET_INIT] = 0;
          break;
        }
      }
      if (p[RET_INIT] < 0.5) {
        var next = findStation(jd, p[LONG_S], 1, ipl);
        var previous = findStation(jd, p[LONG_S], -1, ipl);
        if (next) { p[NEXT_S] = next.offset; p[NEXT_JUL] = next.jd; p[NEXT_Z] = next.longitude; }
        if (previous) { p[PREV_S] = previous.offset; p[PREV_JUL] = previous.jd; p[PREV_Z] = previous.longitude; }
        p[RET_INIT] = 1;
      }
      var isRetro = p[LONG_S] <= 0;
      p[RETRO] = isRetro ? 1 : 0;
      p[STATION] = p[NEXT_S] <= 7 ? (isRetro ? STATION_D : STATION_R) : 0;
    }
  }

  function eclipses(jd, prev) {
    var sol = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var lun = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (prev && prev.sol) {
      sol = prev.sol.slice();
      lun = prev.lun.slice();
    }
    for (var i = 0; i < 32; i++) {
      var limit = 8 * i;
      if (sol[E_INIT] > 0) {
        sol[EN_JUL] = sol[EN_FJUL] - jd;
        sol[EP_JUL] = jd - sol[EP_FJUL];
        lun[EN_JUL] = lun[EN_FJUL] - jd;
        lun[EP_JUL] = jd - lun[EP_FJUL];
      }
      if (sol[EN_JUL] < JUL_SEC || lun[EN_JUL] < JUL_SEC || sol[EP_JUL] < JUL_SEC || lun[EP_JUL] < JUL_SEC) {
        sol[E_INIT] = 0;
      }
      if (Math.abs(limit - sol[EN_JUL]) <= JUL_SEC || Math.abs(limit - sol[EP_JUL]) <= JUL_SEC ||
          Math.abs(limit - lun[EN_JUL]) <= JUL_SEC || Math.abs(limit - lun[EP_JUL]) <= JUL_SEC ||
          (sol[E_INIT] | 0) === 0) {
        var iflag = SEFLG_SWIEPH;
        var t = eclipseWhen("sol", jd, 0);
        sol[EN_JUL] = t - jd; sol[EN_FJUL] = t; sol[EN_SIGN] = signOf(calcUt(t, SE_SUN, iflag).xx[LONG]);
        t = eclipseWhen("sol", jd, 1);
        sol[EP_JUL] = jd - t; sol[EP_FJUL] = t; sol[EP_SIGN] = signOf(calcUt(t, SE_SUN, iflag).xx[LONG]);
        t = eclipseWhen("lun", jd, 0);
        lun[EN_JUL] = t - jd; lun[EN_FJUL] = t; lun[EN_SIGN] = signOf(calcUt(t, SE_MOON, iflag).xx[LONG]);
        t = eclipseWhen("lun", jd, 1);
        lun[EP_JUL] = jd - t; lun[EP_FJUL] = t; lun[EP_SIGN] = signOf(calcUt(t, SE_MOON, iflag).xx[LONG]);
        sol[E_INIT] = 1;
        break;
      }
    }
    return { sol: sol, lun: lun };
  }

  function sectOf(sun, asc) {
    var dist = norm360(sun - asc);
    return dist > 180 ? DAY : NIGHT;
  }

  function lots(sun, moon, asc) {
    var chartSect = sectOf(sun, asc);
    var diff = norm360((360 - sun) + moon);
    var fortune, spirit;
    if (chartSect === DAY) {
      fortune = asc + diff;
      spirit = asc - diff;
    } else {
      fortune = asc - diff;
      spirit = asc + diff;
    }
    return { fortune: norm360(fortune), spirit: norm360(spirit), sect: chartSect };
  }

  function fillDegrees(bodies) {
    for (var i = 0; i < 18; i++) {
      var lon = bodies[i][LONG];
      bodies[i][DEGREE] = (lon | 0) % 30;
      bodies[i][MIN] = ((lon - (lon | 0)) * 60) | 0;
      bodies[i][DEGREE_S] = bodies[i][LONG_S];
      bodies[i][MIN_S] = Math.abs(bodies[i][LONG_S] - (bodies[i][LONG_S] | 0)) * 60;
      if (bodies[i][LONG_S] < 0) bodies[i][DEGREE_S] *= -1;
    }
  }

  function boundIndex(sign, degree) {
    var row = BOUNDS[sign];
    for (var i = 0; i < 5; i++) if (degree <= row[i]) return i;
    return -1;
  }

  function dignities(bodies, sect) {
    var rows = [];
    for (var ipl = 0; ipl < 16; ipl++) {
      var sign = signOf(bodies[ipl][LONG]);
      var degree = bodies[ipl][DEGREE] | 0;
      var z = ZODIAC[sign];
      var b = boundIndex(sign, degree);
      var dec = degree <= 9 ? z[DECAN0] : (degree <= 19 ? z[DECAN0 + 1] : z[DECAN0 + 2]);
      rows.push({
        sign: sign,
        element: z[ELEMENT],
        ruler: z[RULER],
        exalt: z[EXALT],
        triplicity: sect === DAY ? z[TRIPLD] : z[TRIPLN],
        bound: b < 0 ? EMPTY : z[BOUND0 + b],
        decan: dec,
        detriment: z[DETRI],
        fall: z[FALL]
      });
    }
    return rows;
  }

  function aspectsOf(bodies) {
    var kinds = [
      { name: "sextile", angle: 60, element: EARTH },
      { name: "square", angle: 90, element: FIRE },
      { name: "trine", angle: 120, element: WATER },
      { name: "opposition", angle: 180, element: FIRE }
    ];
    var list = [];
    for (var i = 0; i <= SE_PLUTO; i++) {
      for (var j = i + 1; j <= SE_PLUTO; j++) {
        var diff = Math.abs(bodies[i][LONG] - bodies[j][LONG]) % 360;
        if (diff > 180) diff = 360 - diff;
        var houseDiff = Math.abs(bodies[i][DEGREE] - bodies[j][DEGREE]);
        for (var c = 0; c < kinds.length; c++) {
          if (Math.abs(diff - kinds[c].angle) <= 7 && houseDiff <= 7) {
            list.push({ a: i, b: j, name: kinds[c].name, element: kinds[c].element, orb: diff - kinds[c].angle });
          }
        }
      }
    }
    return list;
  }

  function profection(bodies, birthYear, birthMon, now) {
    var sign = signOf(bodies[12][LONG]);
    var diff = now.year - birthYear;
    var yearSign = ((sign + diff - 1) % 12 + 12) % 12 + 1;
    var mdiff = now.mon - birthMon;
    var monSign = ((yearSign + mdiff - 1) % 12 + 12) % 12 + 1;
    return { year: yearSign, month: monSign };
  }

  function publicBody(raw, i) {
    var meta = BODY_META[i];
    var sign = signOf(raw[LONG]);
    return {
      index: i,
      key: meta.key,
      name: meta.name,
      glyph: meta.glyph,
      short: POINT_SHORT[i],
      longitude: raw[LONG],
      latitude: raw[LAT],
      distance: raw[DIST],
      longitudeSpeed: raw[LONG_S],
      latitudeSpeed: raw[LAT_S],
      distanceSpeed: raw[DIST_S],
      retrograde: raw[RETRO] > 0,
      station: raw[STATION],
      degree: raw[DEGREE],
      minute: raw[MIN],
      sign: sign,
      signName: SIGNS[sign],
      signGlyph: SIGN_GLYPH[sign],
      element: ZODIAC[sign][ELEMENT],
      nextStationDays: raw[NEXT_S],
      prevStationDays: raw[PREV_S],
      nextStationLon: raw[NEXT_Z],
      prevStationLon: raw[PREV_Z],
      nextStationJd: raw[NEXT_JUL],
      prevStationJd: raw[PREV_JUL],
      raw: raw
    };
  }

  function assertRange(year) {
    if (year < EPHE_MIN || year > EPHE_MAX) {
      throw new Error("Packed ephemeris covers " + EPHE_MIN + "–" + EPHE_MAX + " only. " + year + " is outside sepl_18.se1 / semo_18.se1.");
    }
  }

  function compute(input, prev) {
    if (!swe) throw new Error("Swiss Ephemeris is not loaded");
    var lat = Number(input.latitude);
    var lon = Number(input.longitude);
    if (!isFinite(lat) || !isFinite(lon)) throw new Error("Latitude and longitude are required numbers");
    if (Math.abs(lat) > 90) throw new Error("Latitude must be between -90 and 90");
    if (Math.abs(lon) > 180) throw new Error("Longitude must be between -180 and 180, east positive");
    var work = {
      timezone: (input.timezone || "").trim(),
      year: input.year | 0, mon: input.mon | 0, mday: input.mday | 0,
      hour: input.hour | 0, min: input.min | 0, sec: input.sec | 0,
      isdst: input.isdst == null ? -1 : input.isdst | 0,
      dlon: lon
    };
    if (!work.timezone) throw new Error("Timezone is required");
    assertRange(work.year);
    var when = resolveUtc(work);
    assertRange(when.utc.year);
    var jd = julday(when.utc.year, when.utc.mon, when.utc.mday, when.utc.frac);
    var iflag = SEFLG_SWIEPH | SEFLG_SPEED;
    var bodies = [];
    for (var i = 0; i < 18; i++) bodies.push(blankBody());
    var meanNodeRaw = null;
    for (var ipl = SE_SUN; ipl <= SE_TRUE_NODE; ipl++) {
      var xx = calcUt(jd, ipl, iflag).xx;
      if (ipl === SE_MEAN_NODE) meanNodeRaw = xx[LONG];
      bodies[ipl][LONG] = xx[LONG];
      bodies[ipl][LAT] = xx[LAT];
      bodies[ipl][DIST] = xx[DIST];
      bodies[ipl][LONG_S] = xx[LONG_S];
      bodies[ipl][LAT_S] = xx[LAT_S];
      bodies[ipl][DIST_S] = xx[DIST_S];
    }
    var prevRaw = prev && prev._rawBodies;
    var prevEcl = prev && prev._ecl;
    retroStation(jd, bodies, prevRaw);
    var ecl = eclipses(jd, prevEcl);
    /* upstream calls swe_houses_ex twice, both with hsys 'W' (whole sign). */
    var hw = housesEx(jd, lat, lon, 87);
    var asc = hw.ascmc[0];
    var mc = hw.ascmc[1];
    var dsc = norm360(asc + 180);
    var ic = norm360(mc + 180);
    bodies[12][LONG] = asc;
    bodies[13][LONG] = mc;
    bodies[14][LONG] = dsc;
    bodies[15][LONG] = ic;
    /* init.c replaces the mean-node longitude with the true node's south node. */
    bodies[SE_MEAN_NODE][LONG] = norm360(bodies[SE_TRUE_NODE][LONG] + 180);
    var lot = lots(bodies[SE_SUN][LONG], bodies[SE_MOON][LONG], asc);
    bodies[16][LONG] = lot.fortune;
    bodies[17][LONG] = lot.spirit;
    fillDegrees(bodies);
    var elong = norm360(bodies[SE_MOON][LONG] - bodies[SE_SUN][LONG]);
    var phase = (elong / 45) | 0;
    if (phase > 7) phase = 7;
    var dig = dignities(bodies, lot.sect);
    var now = unixToLocal(Math.floor(Date.now() / 1000), work.timezone);
    var prof = profection(bodies, work.year, work.mon, now);
    var pub = bodies.map(publicBody);
    pub[SE_MEAN_NODE].meanNodeLongitude = meanNodeRaw;
    return {
      input: {
        name: input.name || "",
        city: input.city || "",
        state: input.state || "",
        country: input.country || "",
        timezone: work.timezone,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        year: work.year, mon: work.mon, mday: work.mday,
        hour: work.hour, min: work.min, sec: work.sec,
        isdst: work.isdst
      },
      jd: jd,
      utc: when.utc,
      wday: when.wday,
      lmt: when.lmt,
      gmtoff: when.gmtoff,
      cusps: hw.cusps.slice(1),
      signCusps: hw.cusps.slice(1),
      ascmc: hw.ascmc,
      asc: asc,
      mc: mc,
      houseSystem: "W",
      bodies: pub,
      dignities: dig,
      aspects: aspectsOf(bodies),
      sect: lot.sect,
      phase: phase,
      phaseName: PHASES[phase],
      eclipses: {
        lunarNextDays: ecl.lun[EN_JUL],
        lunarPrevDays: ecl.lun[EP_JUL],
        lunarNextSign: ecl.lun[EN_SIGN],
        lunarPrevSign: ecl.lun[EP_SIGN],
        solarNextDays: ecl.sol[EN_JUL],
        solarPrevDays: ecl.sol[EP_JUL],
        solarNextSign: ecl.sol[EN_SIGN],
        solarPrevSign: ecl.sol[EP_SIGN]
      },
      profection: prof,
      _rawBodies: bodies,
      _ecl: ecl
    };
  }

  function step(input, unit, direction) {
    var next = Object.assign({}, input);
    if (unit === "month" || unit === "year") {
      if (unit === "month") {
        next.mon += direction;
        if (next.mon > 12) { next.mon = 1; next.year++; }
        if (next.mon < 1) { next.mon = 12; next.year--; }
      } else {
        next.year += direction;
      }
      var dim = daysInMonth(next.mon, next.year);
      if (next.mday > dim) next.mday = dim;
      next.isdst = -1;
      return next;
    }
    var delta = { second: 1, minute: 60, hour: 3600, day: 86400 }[unit];
    if (!delta) throw new Error("unknown step");
    var unix = civilToUnix(next).unix + delta * direction;
    var local = unixToLocal(unix, next.timezone);
    next.year = local.year; next.mon = local.mon; next.mday = local.mday;
    next.hour = local.hour; next.min = local.min; next.sec = local.sec;
    next.isdst = local.isdst;
    return next;
  }

  function wrapDiff(base, lon) {
    var diff = base - lon;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  function solarReturn(natal, year) {
    assertRange(year);
    var base = natal.bodies[SE_SUN].longitude;
    var work = Object.assign({}, natal.input, { year: year | 0, isdst: -1 });
    var unix = civilToUnix(work).unix;
    var guard = 0;
    while (guard++ < 20000) {
      var utc = unixToUtcParts(unix);
      assertRange(utc.year);
      var jd = julday(utc.year, utc.mon, utc.mday, utc.frac);
      var lon = calcUt(jd, SE_SUN, SEFLG_SWIEPH).xx[LONG];
      var diff = wrapDiff(base, lon);
      if (Math.abs(diff) < JUL_SEC) break;
      var stepSec = Math.abs(diff) > 2 ? 86400 : Math.abs(diff) > 0.1 ? 3600 : Math.abs(diff) > 0.002 ? 60 : 1;
      unix += diff > 0 ? stepSec : -stepSec;
    }
    if (guard >= 20000) throw new Error("solar return did not converge");
    var local = unixToLocal(unix, work.timezone);
    return Object.assign({}, work, local);
  }

  function advanceDays(date, days, zone) {
    var unix = civilToUnix({
      timezone: zone, year: date.year, mon: date.mon, mday: date.mday,
      hour: date.hour, min: date.min, sec: date.sec, isdst: date.isdst, dlon: 0
    }).unix;
    unix += Math.round(days * 86400);
    return unixToLocal(unix, zone);
  }

  function dateLabel(date, sign, bond) {
    var mark = bond ? "+" : " ";
    return SIGNS[sign].toLowerCase() + ":" + mark + date.year + "." + MONTHS[date.mon].toLowerCase() + "." + String(date.mday).padStart(2, "0");
  }

  function zrChildren(parent, childLevel, zone) {
    if (parent.children) return parent;
    var parentEnd = parent.level < 0
      ? parent.jd + 120 * LAYER_INC[0]
      : parent.jd + PL_PERIOD[parent.sign] * LAYER_INC[parent.level];
    var cursor = {
      year: parent.year, mon: parent.mon, mday: parent.mday,
      hour: parent.hour, min: parent.min, sec: parent.sec, isdst: parent.isdst
    };
    var bondSign = parent.sign;
    var childSign = parent.sign;
    var bondSwitch = false;
    var children = [];
    var guard = 0;
    while (guard++ < 400) {
      var childJd = julday(cursor.year, cursor.mon, cursor.mday, 0, SE_GREG_CAL);
      if (childJd >= parentEnd) break;
      var length = PL_PERIOD[childSign] * LAYER_INC[childLevel];
      if (length <= 0) break;
      var bondPrint = false;
      children.push({
        label: dateLabel(cursor, childSign, false),
        jd: childJd,
        sign: childSign,
        level: childLevel,
        year: cursor.year, mon: cursor.mon, mday: cursor.mday,
        hour: cursor.hour, min: cursor.min, sec: cursor.sec, isdst: cursor.isdst,
        bond: false,
        children: null
      });
      cursor = advanceDays(cursor, length, zone);
      childSign++;
      if (childSign > 12) childSign = 1;
      if (childSign === bondSign && !bondSwitch) {
        bondSwitch = true;
        bondPrint = true;
        childSign += 6;
        if (childSign > 12) childSign -= 12;
      }
      if (bondPrint && children.length) {
        children[children.length - 1].bondNext = true;
      }
    }
    if (children.length) {
      for (var i = 0; i < children.length; i++) {
        if (i > 0 && children[i - 1].bondNext) children[i].bond = true;
        children[i].label = dateLabel(children[i], children[i].sign, children[i].bond);
      }
    }
    parent.children = children;
    return parent;
  }

  function releasingRoot(chart, lot) {
    var fortSign = (chart.bodies[16].longitude / 30) | 0;
    var spirSign = (chart.bodies[17].longitude / 30) | 0;
    var sign = lot === "spirit" ? spirSign + 1 : fortSign + 1;
    if (lot === "spirit" && fortSign === spirSign) sign++;
    if (sign > 12) sign -= 12;
    if (sign < 1) sign += 12;
    var input = chart.input;
    return {
      label: dateLabel(input, sign, false),
      jd: chart.jd,
      sign: sign,
      level: -1,
      year: input.year, mon: input.mon, mday: input.mday,
      hour: input.hour, min: input.min, sec: input.sec, isdst: input.isdst,
      children: null
    };
  }

  function releasing(chart, lot, selected) {
    var rootNode = releasingRoot(chart, lot);
    var parents = [rootNode];
    var sel = selected ? selected.slice() : [0, 0, 0, 0];
    var zone = chart.input.timezone;
    for (var level = 0; level < 4; level++) {
      var parent = parents[level];
      zrChildren(parent, level, zone);
      if (!parent.children.length) break;
      if (sel[level] < 0) sel[level] = 0;
      if (sel[level] >= parent.children.length) sel[level] = parent.children.length - 1;
      if (level + 1 < 4) parents[level + 1] = parent.children[sel[level]];
    }
    return {
      lot: lot,
      rootSign: rootNode.sign,
      selected: sel,
      columns: [0, 1, 2, 3].map(function (level) {
        var parent = parents[level];
        if (!parent || !parent.children) return [];
        return parent.children.map(function (child, i) {
          return {
            label: child.label,
            sign: child.sign,
            signGlyph: SIGN_GLYPH[child.sign],
            element: ZODIAC[child.sign][ELEMENT],
            bond: child.bond,
            selected: i === sel[level],
            year: child.year, mon: child.mon, mday: child.mday
          };
        });
      })
    };
  }

  function elementName(el) {
    return { 2: "fire", 3: "earth", 4: "air", 5: "water" }[el] || "";
  }

  async function loadFile(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error("Missing ephemeris file " + url);
    return new Uint8Array(await res.arrayBuffer());
  }

  async function init(opts) {
    if (ready) return ready;
    ready = (async function () {
      opts = opts || {};
      var factory = opts.create || root.createSweModule;
      if (typeof factory !== "function") throw new Error("Swiss Ephemeris module did not load");
      swe = await factory(opts.module || {});
      try { swe.FS.mkdir("/ephe"); } catch (e) { /* exists */ }
      var files = opts.files || null;
      for (var i = 0; i < EPHE_FILES.length; i++) {
        var name = EPHE_FILES[i];
        var bytes = files ? files[name] : await loadFile("ephe/" + name);
        if (!bytes || !bytes.length) throw new Error("Ephemeris file " + name + " is empty");
        swe.FS.writeFile("/ephe/" + name, bytes);
      }
      swe.ccall("swe_set_ephe_path", null, ["string"], ["/ephe"]);
      return true;
    })();
    try {
      return await ready;
    } catch (err) {
      ready = null;
      swe = null;
      throw err;
    }
  }

  function fixtureDrift(chart) {
    var e = FIXTURE.expect;
    var utc = chart.utc;
    var utcText = utc.year + "-" + String(utc.mon).padStart(2, "0") + "-" + String(utc.mday).padStart(2, "0") +
      " " + String(utc.hour).padStart(2, "0") + ":" + String(utc.min).padStart(2, "0") + ":" + String(utc.sec).padStart(2, "0");
    return {
      utc: utcText,
      utcOk: utcText === e.utc,
      jd: chart.jd,
      jdOk: Math.abs(chart.jd - e.jd) < 1e-6,
      sun: chart.bodies[0].longitude,
      sunOk: Math.abs(chart.bodies[0].longitude - e.sun) < 1e-4,
      moon: chart.bodies[1].longitude,
      moonOk: Math.abs(chart.bodies[1].longitude - e.moon) < 1e-4,
      asc: chart.asc,
      ascOk: Math.abs(chart.asc - e.asc) < 1e-4,
      mc: chart.mc,
      mcOk: Math.abs(chart.mc - e.mc) < 1e-4
    };
  }

  root.AstroEngine = {
    init: init,
    compute: compute,
    step: step,
    solarReturn: solarReturn,
    releasing: releasing,
    fixture: FIXTURE,
    fixtureDrift: fixtureDrift,
    signs: SIGNS,
    signGlyph: SIGN_GLYPH,
    months: MONTHS,
    week: WEEK,
    shortName: SHORT,
    elementName: elementName,
    bodyMeta: BODY_META,
    layerName: LAYER_NAME,
    EMPTY: EMPTY,
    FIRE: FIRE, EARTH: EARTH, AIR: AIR, WATER: WATER,
    nowInZone: function (zone) {
      var m = root.moment.tz(zone);
      var h = m.hour();
      return {
        year: m.year(), mon: m.month() + 1, mday: m.date(),
        hour24: h, min: m.minute(), sec: m.second(),
        isdst: m.isDST() ? 1 : 0, wday: m.day()
      };
    },
    zones: function () { return root.moment.tz.names(); }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
