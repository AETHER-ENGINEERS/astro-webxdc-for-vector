# astro WebXDC

A second client of [astro](https://github.com/sweetpotatopress/astro) for Vector. The terminal program is unchanged. This directory is the phone client: same Swiss Ephemeris calls, no network, no city database.

## Run

Open `index.html` from a local static server, or send `astro.xdc` into a Vector chat and open it there. `webxdc.js` is injected by the messenger and is not part of this tree.

The preview build of this workspace also serves the same files.

## Pack

From this directory:

```sh
rm -f astro.xdc
zip -X -r astro.xdc \
  index.html manifest.toml icon.png styles.css swe.js swe.wasm \
  src vendor ephe
```

Do not put `webxdc.js` in the zip. Deflate is the default. `ephe/sepl_18.se1` and `ephe/semo_18.se1` must be inside the archive. They are the 1800–2399 planet and Moon files from `../swisseph/ephe`.

## Engine

`swe.js` / `swe.wasm` are this repo’s `swisseph/*.c` (not `swetest.c` or `swevents.c`) compiled with Emscripten 3.1.64 and `-DNO_SWE_GLP`. That flag only drops `dladdr` in `swe_get_library_path`. The port never calls that function. Ephemeris bytes are written into the WASM filesystem at `/ephe` and `swe_set_ephe_path("/ephe")` is called before any position. If the return flags do not include `SEFLG_SWIEPH`, the chart is not drawn.

Timezone conversion uses Moment Timezone’s bundled IANA data, then the local-mean-time cutover table transcribed from `src/chronos.c`.

See `PORT.md` for each terminal key, and `FIXTURE.md` for the frozen chart.
