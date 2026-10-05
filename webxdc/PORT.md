# Port map

Upstream is astro 0.76.4 (`160849748aa0e54adf864e239f3381a9f945263b`). The C sources under `/src` are not modified. Every `swe_` call they make is issued from `src/engine.js` through the WASM exports.

| Terminal | WebXDC |
|---|---|
| `i` input screen | Input. Fields: name, city, state, country, latitude, longitude, IANA zone, year, month, day, hour, minute, second, AM/PM, DST. |
| `\` draw | Draw. |
| F1 clear fields | Clear. |
| Tab on the input screen (fill local time) | Local time. |
| Esc on the input screen | Cancel. Restores the last drawn chart’s fields and leaves the form. |
| Main wheel | Chart. SVG, element colors, whole-sign cusp ring, planet ring. Glyphs use the same angular separation pass as `planet_pos`, then stack inward if two are still within 8°. |
| Ascendant on the wheel | True ascendant is the left horizon. Zodiac longitude increases clockwise, as in `draw.c`. The terminal ellipse is a character grid; this wheel is round. |
| `o` right table | Show/hide sky. Chart meta (also drawn by `cc_data` on the terminal), moon-phase lives on the left with the terminal, eclipses and station days match `right_table`. |
| `p` left table | Show/hide positions. Longitudes, dignities, moon phase, profection. |
| `r` redraw | Redraw. |
| `R` redraw from config | Opening the app fills the form from the saved default. Config → Save as default writes it. |
| Enter, animation mode | Time → Animate. |
| `k` / `j` or arrows, step time | Step back / Step forward. |
| `h` / `l`, change the time increment | Step size menu (second, minute, hour, day, month, year). |
| Tab, live clock | Live clock. |
| `d` DST | DST. Cycles auto → on → off. The terminal only flips 0 and 1, and a press does nothing while `isdst` is still −1. The cycle keeps the auto state reachable. |
| `0`–`9` select chart | Slots → Open. Slot 0 is a real slot. Upstream stores key `0` at chart index 10 because `ui->cc <= 0` is rewritten; the ten buttons are the keybind’s slots. |
| Alt+`0`–`9` synastry | Slots → Synastry. Inner glyphs are the other chart, rotated to the open chart’s ascendant. |
| `t` transits | Time → Transits now, or Transits at this moment. Place and zone stay with the open chart. Inner glyphs are the transit. |
| `s` solar return | Solar return. Asks for a year, then walks the Sun back to the natal longitude the way `calc_return` does, with the longitude difference wrapped into ±180° so a far start still converges. |
| `z` zodiacal releasing | Releasing. |
| `k` / `j` period | Previous period / Next period. |
| `h` / `l` layer | Outer layer / Inner layer. |
| Tab, switch lot | Switch lot. Fortune, or Spirit. If both lots are in one sign, Spirit starts in the next sign, matching `create_root`. |
| `w` save, `m` make dir | Library. Collection name is the directory. Save open chart. |
| `e` load | Library → Open. |
| Share | Share, or Library → Share. `sendToChat` with a text summary and an SVG. Nothing is sent until that button. `sendUpdate` is never called. |
| `c` config, Tab copy current, Enter save, Space toggles, Esc cancel | Config. Save as default stores the form, the DST choice, and which panels and aspects start open. Cancel leaves without writing. |
| `q` exit | Dropped. A WebXDC has no process to exit. |
| City search / Geonames | Dropped. `city-db` stays in the terminal app and is not packed. City, state, and country are labels. Latitude and longitude are typed. |
| House-system picker | Not added. Upstream’s TODO is still open. |
| Secondary progressions, planet day/hour, primary directions, tutorial, code-documentation pass | Not implemented. They are open TODOs in the upstream README. |

## Calculations kept

- `swe_set_ephe_path` on the packed `sepl_18.se1` and `semo_18.se1`.
- `swe_julday` of the UTC civil time, Gregorian.
- `swe_calc_ut` for Sun through true node, flags `SEFLG_SWIEPH | SEFLG_SPEED`.
- Stations for Mercury through Pluto via the same coarse 2-day / fine 0.1-day search. A step cap stops a runaway if a file is missing; the terminal would loop.
- `swe_sol_eclipse_when_glob` and `swe_lun_eclipse_when`, `ifltype` 0, backward 0 and 1, then `swe_calc_ut` for the sign. Same as `eclipse()`.
- `swe_houses_ex` twice with `'W'`. Both the handoff text and a Placidus reading of `cusp[13]` disagree with v0.76.4, which sets `ihsy = 'W'` and passes `'W'` for `sign_cusp` as well. The port follows the calls. Angles are `ascmc[0]` and `ascmc[1]`; descendant and IC are those plus 180°.
- Mean-node longitude is computed, kept on the body as `meanNodeLongitude`, then replaced in the displayed longitude by true-node + 180°. That is the `so` row in `left_table`.
- Lots use `lots()` / `sect()`: day chart Fortune = Asc + (Moon − Sun) mod 360, Spirit the other way; night chart swaps them.
- Essential dignities, bounds, decans, and the 7° aspect test (longitude and degree-within-sign) follow `init.c`, `ui.c`, and `draw.c`. Conjunction is not in the terminal’s aspect list, so it is not drawn.
- Local mean time before the cutover in `chronos.c` uses `round(longitude * 240)` seconds, east positive.
- Dates outside 1800–2399 stop with an error. The other century files are not packed.

## Dropped on purpose

- Moshier. `SEFLG_MOSEPH` is never requested. A return value that lacks `SEFLG_SWIEPH` or carries `SEFLG_MOSEPH` is an error and no wheel is drawn.
- Network, CDN, Geonames, and any fetch of `.se1` files at runtime.
- `seasnam.txt`, asteroid catalogs, `list.zip`, `astlistn.md`.
- ncurses, filesystem chart directories, `/usr/share/zoneinfo`. Moment Timezone’s data file is the bundled zone dataset. Resolved offsets are also cached in IndexedDB.
- The `weekday_check` quirk that asks `mktime` for `hour - 1` is not copied. The weekday is the civil weekday in the zone.

## Build flag

`-DNO_SWE_GLP` compiles out `swe_get_library_path`’s `dladdr` call so the library links without `libdl`. No ephemeris path or position call changes.
