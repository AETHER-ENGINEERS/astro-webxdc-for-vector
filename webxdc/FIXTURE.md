# Fixture

Frozen so later edits can see drift. The native column is `libswe` from this repository, ephemeris `swisseph/ephe/sepl_18.se1` and `semo_18.se1`, glibc `America/Los_Angeles`. The WASM column is the same library compiled with Emscripten (`-DNO_SWE_GLP` only disables `dladdr`, which this port does not call) and the same two files mounted at `/ephe`.

| Field | Value |
|---|---|
| Name | Fixture |
| City | San Diego |
| State | California |
| Country | US |
| Zone | America/Los_Angeles |
| Latitude | 32.7157 |
| Longitude | -117.1611 (east positive) |
| Local | 1990-06-15 18:30:00 |
| DST | auto (`tm_isdst = -1`) |

| Quantity | Native | WASM |
|---|---|---|
| UTC | 1990-06-16 01:30:00 | 1990-06-16 01:30:00 |
| Julian day UT | 2448058.5625000000 | 2448058.5625 |
| Sun longitude | 84.66678549 | 84.66678549 |
| Moon longitude | 352.93158303 | 352.93158303 |
| Ascendant (`ascmc[0]`) | 246.65491459 | 246.65491459 |
| MC (`ascmc[1]`) | 168.47617577 | 168.47617577 |

`swe_calc_ut` returned `258` (`SEFLG_SWIEPH | SEFLG_SPEED`). A Moshier result is treated as failure.

House call, matching `src/init.c`: `swe_houses_ex` twice with `hsys = 'W'` (whole sign). Cusp 1 is 240°. The true ascendant and MC come from `ascmc`, not from the cusp array. Upstream 0.76.4 does not call Placidus (`'P'`).

The Run fixture control loads this chart and compares these six numbers. Drift larger than 0.0001° on a body, or 1e-6 on the Julian day, is reported on the chart screen.
