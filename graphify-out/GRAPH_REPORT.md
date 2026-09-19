# Graph Report - open-clo  (2026-09-20)

## Corpus Check
- Corpus is ~45,882 words - fits in a single context window. You may not need a graph.

## Summary
- 295 nodes · 443 edges · 20 communities (18 shown, 2 thin omitted)
- Extraction: 87% EXTRACTED · 12% INFERRED · 1% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.87)
- Token cost: 242,462 input · 0 output

## Community Hubs (Navigation)
- Product Spec & Roadmap
- Core Data Types & Pattern Presets
- React UI Components
- App TypeScript Config
- Runtime Dependencies
- Build Toolchain Dependencies
- Architecture Guidance Concepts
- Node TypeScript Config
- ClothSimulator Physics API
- Icon & Logo Assets
- CI/CD & Docker Deployment
- Oxlint Configuration
- Hero Brand Illustration
- Mannequin Analysis v3 Script
- Mannequin Analysis Final Script
- Root TypeScript Project Refs

## God Nodes (most connected - your core abstractions)
1. `useCloStore` - 19 edges
2. `compilerOptions` - 18 edges
3. `CloState` - 15 edges
4. `compilerOptions` - 15 edges
5. `ClothSimulator` - 14 edges
6. `Cloth Particle Network (XPBD / Verlet discretized mesh grid)` - 11 edges
7. `react` - 9 edges
8. `PatternPiece` - 9 edges
9. `useCloStore single Zustand store (no slices, no middleware)` - 9 edges
10. `SeamConnection` - 8 edges

## Surprising Connections (you probably didn't know these)
- `simulationIteration counter as cloth-reset signal` --semantically_similar_to--> `/healthz nginx healthcheck`  [AMBIGUOUS] [semantically similar]
  CLAUDE.md → docker-compose.yml
- `open-clo compose service (open-clo-studio container)` --semantically_similar_to--> `docker-build job (Build & Publish Ultra-Light Docker Image)`  [INFERRED] [semantically similar]
  docker-compose.yml → .github/workflows/ci-cd.yml
- `OpenCLO Favicon (Vite lightning-bolt glyph, purple gradient)` --semantically_similar_to--> `Vite Wordmark Logo (bolt in parentheses, dark-mode aware)`  [INFERRED] [semantically similar]
  public/favicon.svg → src/assets/vite.svg
- `Dual-Viewport Studio Layout (2D pattern left, 3D draping right)` --implements--> `Dual-Viewport Architecture`  [INFERRED]
  README.md → PRD.md
- `Real-Time Textile Physics Engine (Verlet / XPBD)` --implements--> `Cloth Particle Network (XPBD / Verlet discretized mesh grid)`  [INFERRED]
  README.md → PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Constraint family solved each Verlet/XPBD step** — prd_structural_distance_springs, prd_shear_springs, prd_bending_constraints, prd_virtual_sewing_constraints, prd_avatar_capsule_collisions, prd_verlet_integration [EXTRACTED 1.00]
- **Pattern-to-drape flow: draw 2D, sew edges, simulate on avatar, read strain** — prd_2d_pattern_window, prd_interactive_sewing_tool, prd_3d_studio_drape_viewport, prd_parametric_mannequin_avatar, prd_fit_tension_strain_heatmap [INFERRED 0.85]
- **Production export surface (current and roadmap formats)** — prd_svg_vector_export, prd_cad_json_export, prd_dxf_aama_astm_export, prd_gltf_usdz_webar_export, readme_production_ready_export [INFERRED 0.85]
- **Build gate to self-hosted container delivery chain** — _github_workflows_ci_cd_quality_check, _github_workflows_ci_cd_docker_build, _github_workflows_ci_cd_ghcr_registry, docker_compose_open_clo, claude_deployment [INFERRED 0.85]
- **Single-store hub-and-spoke state architecture (no prop drilling)** — claude_useclostore, claude_patterncanvas, claude_studioviewport, claude_ui_shell, claude_cad_types [EXTRACTED 1.00]
- **Pattern-to-drape simulation pipeline** — claude_patternpresets, claude_patterncanvas, claude_simulationiteration, claude_studioviewport, claude_clothsimulator [INFERRED 0.85]
- **Layered Depth Composition: Outline Slab Above, Solid Accented Slab Below, Linked By Dashed Guides** — src_assets_hero_wireframe_layer, src_assets_hero_solid_layer, src_assets_hero_projection_guides, src_assets_hero_isometric_stack [EXTRACTED 1.00]
- **Brand Visual Language: White Minimal Line Art With Single Violet Gradient Accent For Hero Marketing** — src_assets_hero_image, src_assets_hero_minimal_white_style, src_assets_hero_purple_accent, src_assets_hero_marketing_asset [INFERRED 0.85]
- **Community / external link icon set (social nav row)** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_github_icon, public_icons_x_icon, public_icons_social_icon [INFERRED 0.85]
- **Purple #aa3bff 1.35px stroke UI glyph style vs solid #08060d brand marks** — public_icons_documentation_icon, public_icons_social_icon, public_icons_github_icon, public_favicon_logo [INFERRED 0.75]
- **Unreferenced Vite+React scaffold graphics (no import in app code)** — src_assets_react_logo, src_assets_vite_logo, public_icons_sprite [INFERRED 0.75]

## Communities (20 total, 2 thin omitted)

### Community 0 - "Product Spec & Roadmap"
Cohesion: 0.06
Nodes (46): 2D Pattern Window (infinite grid, vertex editing, measurement overlays), 3D Studio & Drape Viewport, Avatar Capsule Collisions (analytical capsules + skin offset, friction damping), Bending Constraints (2-hop flex springs, drape softness), Browzwear V-Stitcher, npm run build quality gate (tsc -b && vite build before commit), CAD JSON Export (serialized project schema), Client-Side Heavy, Server-Light compute model (+38 more)

### Community 1 - "Core Data Types & Pattern Presets"
Cohesion: 0.10
Nodes (29): CloState, createDefaultProject(), HistoryStep, initial, loadProjectsFromStorage(), Avatar2DConfig, AvatarConfig, CadTool (+21 more)

### Community 2 - "React UI Components"
Cohesion: 0.16
Nodes (19): react, App(), PatternCanvas(), AVATAR_COLOR_PRESETS, StudioViewport(), ControlPanelModal(), ControlPanelModalProps, FASHION_PALETTE (+11 more)

### Community 3 - "App TypeScript Config"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (22): lucide-react, dependencies, lucide-react, react, react-dom, three, @types/three, zustand (+14 more)

### Community 5 - "Build Toolchain Dependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/node (+13 more)

### Community 6 - "Architecture Guidance Concepts"
Cohesion: 0.17
Nodes (20): src/types/cad.ts as single source of truth for data shapes, 100% client-side compute, no GPU server, ClothSimulator Verlet/XPBD particle solver, Dual-viewport layout (2D pattern CAD + 3D draping studio), Global keyboard shortcuts wired in App.tsx, not per-component, localStorage project persistence with 400ms debounced save, Standalone mannequin GLB analysis scripts (browser-global polyfill), OpenCLO (self-hosted 3D fashion design / garment CAD app) (+12 more)

### Community 7 - "Node TypeScript Config"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 9 - "Icon & Logo Assets"
Cohesion: 0.31
Nodes (10): OpenCLO Favicon (Vite lightning-bolt glyph, purple gradient), bluesky-icon (Bluesky butterfly social glyph), discord-icon (Discord community glyph), documentation-icon (docs / code-brackets stroke glyph, #aa3bff), github-icon (GitHub Octocat mark), social-icon (person + star stroke glyph, #aa3bff), icons.svg SVG Symbol Sprite Sheet, x-icon (X / Twitter mark) (+2 more)

### Community 10 - "CI/CD & Docker Deployment"
Cohesion: 0.25
Nodes (9): docker-build job (Build & Publish Ultra-Light Docker Image), GHCR image publishing target (ghcr.io/${github.repository}), PR builds but never pushes images, quality-check job (Lint, Typecheck & Build), Multi-stage Dockerfile to nginx:alpine-slim (~22MB image), noUnusedLocals / noUnusedParameters fail the build, npm run build as the single CI quality gate, Loopback-only port binding 127.0.0.1:8480:80 (+1 more)

### Community 11 - "Oxlint Configuration"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 12 - "Hero Brand Illustration"
Cohesion: 0.36
Nodes (9): OpenCLO Hero Brand Illustration, Isometric Two-Layer Stack Composition, Landing Page Hero Marketing Asset, Minimal White Line-Art Visual Style, Flat Pattern To 3D Garment Metaphor, Dashed Vertical Projection Guides, Violet Gradient Accent Color, Lower Solid Slab With Iridescent Edge (+1 more)

### Community 13 - "Mannequin Analysis v3 Script"
Cohesion: 0.32
Nodes (7): arrayBuffer, buffer, getExtentsAtY(), glbPath, loader, measure(), measureTorso()

### Community 14 - "Mannequin Analysis Final Script"
Cohesion: 0.33
Nodes (6): arrayBuffer, buffer, getExtentsAtY(), glbPath, loader, measure()

## Ambiguous Edges - Review These
- `/healthz nginx healthcheck` → `simulationIteration counter as cloth-reset signal`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to
- `/healthz nginx healthcheck` → `#root SPA mount point`  [AMBIGUOUS]
  docker-compose.yml · relation: conceptually_related_to
- `Upper Wireframe Outline Slab` → `Flat Pattern To 3D Garment Metaphor`  [AMBIGUOUS]
  src/assets/hero.png · relation: conceptually_related_to
- `OpenCLO Favicon (Vite lightning-bolt glyph, purple gradient)` → `icons.svg SVG Symbol Sprite Sheet`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to
- `icons.svg SVG Symbol Sprite Sheet` → `Vite Wordmark Logo (bolt in parentheses, dark-mode aware)`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **98 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `/healthz nginx healthcheck` and `simulationIteration counter as cloth-reset signal`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `/healthz nginx healthcheck` and `#root SPA mount point`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Upper Wireframe Outline Slab` and `Flat Pattern To 3D Garment Metaphor`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `OpenCLO Favicon (Vite lightning-bolt glyph, purple gradient)` and `icons.svg SVG Symbol Sprite Sheet`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `icons.svg SVG Symbol Sprite Sheet` and `Vite Wordmark Logo (bolt in parentheses, dark-mode aware)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `ClothSimulator` connect `ClothSimulator Physics API` to `Core Data Types & Pattern Presets`, `React UI Components`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `react` connect `React UI Components` to `Core Data Types & Pattern Presets`, `Oxlint Configuration`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._