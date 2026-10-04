# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenCLO — self-hosted, open-source 3D fashion design / garment CAD / cloth simulation web app (CLO3D / Marvelous Designer alternative). 100% client-side compute, no GPU server. See `PRD.md` for the full spec, physics math, and roadmap.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b (typecheck) && vite build — this is the CI quality gate
npm run check    # node check-drape.mjs — drapes every template and asserts the result
npm run lint     # oxlint
npm run preview  # preview production build
```

There is no unit test framework. `npm run check` (`check-drape.mjs` at repo root) is the one automated check: it loads the real modules through Vite's SSR loader, drapes every entry in `GARMENT_TEMPLATES`, and asserts mesh size, seam closure, that the garment stays on the body, that nothing penetrates the avatar, and that editing a pattern piece changes the 3D result. Run it after touching `patternMesh.ts`, `clothSimulation.ts`, `avatarBody.ts`, or preset seam data.

CI (`.github/workflows/ci-cd.yml`) only runs `npm run build` on push/PR to `main`, then builds and pushes the Docker image to GHCR on push. Treat `npm run build` as the thing that must pass before considering work done.

`tsconfig.app.json` has `noUnusedLocals` / `noUnusedParameters` on — unused vars/params fail the build, not just lint.

Two standalone Node scripts at repo root (`analyze-mannequin-final.mjs`, `analyze-mannequin-v3.mjs`) polyfill browser globals to load the mannequin GLB models outside a browser and dump bounding-box/bone data to `mannequin-analysis.json`. Run with `node analyze-mannequin-final.mjs` when debugging avatar geometry/placement — not part of the app or build.

## Architecture

Single-page React 19 + TypeScript app, no router, no backend. Dual-viewport layout (`src/App.tsx`) splits the screen into a 2D pattern CAD canvas and a 3D draping studio, resizable via a drag splitter, toggleable via `layout: 'dual' | 'pattern-only' | '3d-only'`.

**State: `src/store/useCloStore.ts` (Zustand, single store, no slices/middleware).** Everything — pattern pieces, seams, fabric, avatar config, tool state, undo/redo, multi-project management — lives here. Both viewports and all UI panels read/write this store directly; there is no prop drilling. When adding a CAD tool or simulation parameter, it goes in this store, per `PRD.md` §6.

- Projects persist to `localStorage` (`openclo_projects_v1` / `openclo_active_project_id`), debounced 400ms via `debouncedSaveProjects`. `syncToActiveProject` is the helper every mutator calls to write pieces/seams/material/avatar back into the active project and trigger the debounced save.
- Undo/redo is manual: `pushHistory()` deep-clones `{pieces, seams}` onto `undoStack` before a mutating action; most tool actions call it first.
- `simulationIteration` is bumped on structural edits (vertex/seam/material/avatar changes) — the 3D viewport watches this to know when to reset/re-drop the cloth.
- The store is exposed on `window.__CLO_STORE` for debugging/QA.

**2D CAD: `src/components/PatternViewport/PatternCanvas.tsx`** — imperative HTML5 Canvas (not SVG/DOM), high-DPI-aware, handles pan/zoom, vertex editing, edge curvature (Bezier), cut tool, virtual sewing tool (click edge A → edge B), and measurement overlays. Large single-file component; tool behavior branches on `activeTool` from the store.

**3D studio: `src/components/Studio3D/StudioViewport.tsx`** — plain Three.js (`WebGLRenderer`, not React Three Fiber, not WebGPU yet — PRD Phase 3 targets WebGPU/TSL as future work), manual `requestAnimationFrame` loop, `OrbitControls`. Two paths: `mockupScene` of `ghost` or `floating-360` builds a `ClothSimulator` from the store's pieces/seams and steps it in the rAF loop until it settles; `hanger` / `flat-lay` / `folded` still use the procedural props in `studio3DGarmentBuilder.ts`. The drape rebuild is debounced 220 ms off `simulationIteration`, since a vertex drag bumps it on every move. Physics runs in avatar-space metres and the display group is shifted so the existing camera presets keep framing the garment.

**Pattern to cloth: `src/utils/patternMesh.ts` — `buildGarmentMesh()`.** The only place 2D pattern data becomes 3D cloth. Samples each piece's outline (honouring per-edge Bezier curvature), fills the interior with a hex grid, Delaunay-triangulates via `delaunator` and clips back to the polygon, then wraps the panels around the body — torso pieces on a cylinder at the azimuth implied by `placement.origin3D`, pieces with `|origin3D.x| >= 0.25` around the arm axis instead. Seam connections become vertex pairs, with the pairing direction chosen by whichever is shorter in 3D. `PATTERN_UNITS_PER_METER = 600`: pattern coordinates are real human units.

**Avatar body: `src/utils/avatarBody.ts`.** Shared body model — the mannequin torso profile measured from the GLB (mirrored so +Z is the front), scaled by the avatar's chest and height, plus arm and neck capsules. Used both to place panels and to collide against them.

**Physics: `src/utils/clothSimulation.ts` — `ClothSimulator` class.** Position-based solver over the mesh above: `ClothSimulator.create(pieces, seams, material, avatar)`, then `assemble()` (stitches the panels with gravity off) and `step(dt)` per frame until `isSettled()`. 8 substeps x 2 iterations — small substeps, not many iterations, or the neckline stretches over the shoulders and the garment falls off. Collision pushes along the true body surface normal including the profile's vertical slope; a radial-only push gives the shoulders nothing to hold a garment with. No cloth-vs-cloth collision. Keep heavy per-frame math here, not in React render functions (PRD §6).

**Pattern data & presets: `src/utils/patternPresets.ts`** — garment templates (`GARMENT_TEMPLATES`: t-shirt, dress, hoodie, bomber jacket, tank top, crop top, oversized tee, skirt, polo), each a `createXPreset()` function returning `{ pieces, seams }`. Seams are authored with `sewChain(id, chainA, chainB)`, which matches two edge chains by arc length and splits them into sub-seams — that is how a sleeve cap spanning three edges attaches to a two-edge armhole, or a rib band to a whole neckline. Local `+x` on a piece is the wearer's left; a rear-facing panel wraps mirrored, so front and back panels pair same-signed edges. Pieces that hang from the waist rather than the neck set `placement.anchorY` (their top edge is then pinned); `FABRIC_PRESETS` (Cotton Jersey, Silk Satin, Denim, Merino Wool, Leather) with physical params (`stretchStiffness`, `bendingStiffness`, `density`, `friction`); `STITCH_PRESETS`; and `exportPatternsToSvg()` for the 1:1 SVG export.

**Types: `src/types/cad.ts`** — single source of truth for `PatternPiece`, `SeamConnection`, `FabricMaterial`, `AvatarConfig`, `CadTool`, `CloProject`, etc. Read this first when touching data shapes.

**UI shell** (`src/components/UI/`): `TopNav` (layout switcher, preset loader, export), `ToolSidebar` (tool palette, mirrors `CadTool` union), `PropertyInspector` (fabric/avatar/seam property editing), `ControlPanelModal`. Global keyboard shortcuts (tool hotkeys, undo/redo) are wired in `App.tsx`, not per-component.

## Deployment

Multi-stage `Dockerfile` (Node 20 builder → `nginx:alpine-slim`, ~22MB image). `docker compose up -d` for local/self-hosted run. CI builds and pushes to `ghcr.io/<repo>` on every push to `main` (not on PRs).
