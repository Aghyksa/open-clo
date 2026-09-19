# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenCLO — self-hosted, open-source 3D fashion design / garment CAD / cloth simulation web app (CLO3D / Marvelous Designer alternative). 100% client-side compute, no GPU server. See `PRD.md` for the full spec, physics math, and roadmap.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b (typecheck) && vite build — this is the CI quality gate
npm run lint     # oxlint
npm run preview  # preview production build
```

No test suite exists (no test script, no test files). CI (`.github/workflows/ci-cd.yml`) only runs `npm run build` on push/PR to `main`, then builds and pushes the Docker image to GHCR on push. Treat `npm run build` as the thing that must pass before considering work done.

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

**3D studio: `src/components/Studio3D/StudioViewport.tsx`** — plain Three.js (`WebGLRenderer`, not React Three Fiber, not WebGPU yet — PRD Phase 3 targets WebGPU/TSL as future work), manual `requestAnimationFrame` loop, `OrbitControls`. Loads the mannequin from `public/models/*.glb` via `GLTFLoader`. Owns a `ClothSimulator` instance per mount.

**Physics: `src/utils/clothSimulation.ts` — `ClothSimulator` class.** Verlet/XPBD-style particle solver: structural distance constraints, shear/bending constraints, seam constraints (pulls sewn edges together), and analytical capsule collision against the avatar body (`setupAvatarColliders`, `resolveCollisionsWithMesh`). Drive it via `step(dt)` / `stepPhysics(dt)`; `initDropAnimation()` / `restoreFromPhysics()` handle the garment drop-onto-avatar animation. Keep heavy per-frame math here, not in React render functions (PRD §6).

**Pattern data & presets: `src/utils/patternPresets.ts`** — garment templates (`GARMENT_TEMPLATES`: t-shirt, dress, hoodie, bomber jacket, tank top, crop top, oversized tee, skirt, polo), each a `createXPreset()` function returning `{ pieces, seams }`; `FABRIC_PRESETS` (Cotton Jersey, Silk Satin, Denim, Merino Wool, Leather) with physical params (`stretchStiffness`, `bendingStiffness`, `density`, `friction`); `STITCH_PRESETS`; and `exportPatternsToSvg()` for the 1:1 SVG export.

**Types: `src/types/cad.ts`** — single source of truth for `PatternPiece`, `SeamConnection`, `FabricMaterial`, `AvatarConfig`, `CadTool`, `CloProject`, etc. Read this first when touching data shapes.

**UI shell** (`src/components/UI/`): `TopNav` (layout switcher, preset loader, export), `ToolSidebar` (tool palette, mirrors `CadTool` union), `PropertyInspector` (fabric/avatar/seam property editing), `ControlPanelModal`. Global keyboard shortcuts (tool hotkeys, undo/redo) are wired in `App.tsx`, not per-component.

## Deployment

Multi-stage `Dockerfile` (Node 20 builder → `nginx:alpine-slim`, ~22MB image). `docker compose up -d` for local/self-hosted run. CI builds and pushes to `ghcr.io/<repo>` on every push to `main` (not on PRs).
