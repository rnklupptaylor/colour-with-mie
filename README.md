# Colour with Mie

An interactive teaching app on light scattering by small particles and the colours it produces, from Rayleigh and Mie theory to real nanoparticles, paints and glasses. It runs in any modern browser as one self-contained page and works offline once loaded.

Author and scientific direction: Prof. Robin N. Klupp Taylor, FAU Erlangen-Nürnberg. Developed with AI assistance (credited in the app).

| | Address |
|---|---|
| Live version (branch `main`) | https://colour-with-mie.ipt-apps.workers.dev |
| Version in development (branch `dev`) | https://dev-colour-with-mie.ipt-apps.workers.dev |

Released versions are tagged (`v29.4`, …) and listed under Releases.

## What is in the app

Ten lessons: 00 Harmonics, 01 Plane wave, 02 Rayleigh limit, 03 Mie scattering, 04 Large spheres, 05 Real particles, 06 Colour design, 07 T-matrix, 08 Sphere chains, plus Museum, Lightbox and Theory.

- **Physics and Engineering** are two explanation levels of the same calculations.
- **Forward calculations** for homogeneous and core–shell spheres, chains, size distributions and wavelength-dependent materials (metals, alloys, oxides, water, glasses).
- **Colour design** searches particle settings for a target colour.
- **Museum** pairs historical literature figures with live calculations, documented assumptions and fits.
- **Lightbox** renders up to ten samples as vials, cuvettes, paint films on test cards or a particle-filled glass mug, under several lights, with spectra, colour coordinates, CSV/PNG/JSON export and a colour palette.

## Build and check

Requires Node.js 20 or newer. The build uses only Node's standard library.

```text
npm run build     # writes deploy/index.html (the published page) and a standalone colour-with-mie-v<version>.html
npm test          # numerical, integrity and reproducibility checks
```

Browser checks (`npm run test:browser` and the other `test:*-browser` scripts) need `npm ci` and a local Chrome. Scientific preparation and refit scripts in `tools/` that end in `.py` need Python with `pip install -r requirements.txt`.

The version number lives in `package.json`; the build derives the file name, the in-app version and the credit line from it.

## Folder layout

| Path | Contents |
|---|---|
| `app-shell.html` | App markup with include slots, filled in by the build |
| `build.cjs`, `project-paths.cjs` | Build script and paths |
| `src/` | Scientific and interface modules, teaching text, generated exhibit modules and their `*.template.js` sources |
| `src/kernel/` | Mie, internal-field, T-matrix, colour-observer and illuminant kernels |
| `src/entry/`, `src/workers/` | Script entry points (including embedded three.js) and worker sources |
| `styles/` | Stylesheets, including embedded fonts |
| `data/` | Optical constants, colorimetric tables, digitised literature data and fit results used to prepare exhibits |
| `assets/` | Source figures and meshes used to prepare exhibits (the app embeds its own copies) |
| `tools/` | Preparation, fitting and diagnostic scripts |
| `tests/` | Checks run by `npm test` and the browser tests |
| `*.lightbox.json` | Curated Lightbox collections that can be loaded in the app |
| `wrangler.jsonc` | Cloudflare Workers hosting configuration |

Generated exhibit modules (for example `src/paper-museum.js`) are built from their `*.template.js`, data in `data/` and the matching `tools/prepare-*` script. Edit the template or data, then regenerate.

## Hosting

Every push to `main` is built by Cloudflare (`npm run build`) and published from `deploy/`. Every push to `dev` or any other branch gets its own preview address.

## Licence

The author's code is released under the [MIT Licence](LICENSE). Embedded third-party code, fonts and data keep their own licences, as listed in `LICENSE`.
