# Product Requirements Document (PRD) — OpenCLO

**Project Name:** OpenCLO (Open-Source 3D Fashion Design & Garment CAD Studio)  
**Version:** 1.0.0-MVP  
**Status:** Active Development  
**Repository:** `https://github.com/Aghyksa/open-clo`  
**Deployment Target:** Self-hosted Docker (Alpine Nginx, ~22MB)  

---

## 1. Executive Summary & Vision

Commercial fashion CAD software such as **CLO3D**, **Marvelous Designer**, and **Browzwear V-Stitcher** are expensive enterprise tools costing upwards of $50–$200/month per seat, locked inside proprietary desktop silos.

**OpenCLO** is a self-hosted, web-native, open-source alternative designed for independent fashion designers, garment makers, researchers, and apparel brands. It implements the iconic **Dual-Viewport Architecture**:
- **Left Viewport (2D):** A vector CAD cutting table for drawing and drafting flat sewing pattern pieces (front bodice, back bodice, sleeves, collars) with dimension markers, grainlines, and seam allowances.
- **Right Viewport (3D):** A real-time 3D simulation studio featuring a parametric mannequin avatar, virtual stitching physics, textile drape simulation, and fit tension heatmaps.

---

## 2. Core Architecture & Tech Stack

```
+-------------------------------------------------------------------------+
|                              OpenCLO Web UI                             |
|  (React 19 + TypeScript + Vite + Tailwind CSS + Zustand State Store)    |
+------------------------------------+------------------------------------+
|         2D Pattern CAD             |        3D Studio & Simulation       |
|  - HTML5 High-DPI 2D Canvas        |  - Three.js WebGL / WebGPU         |
|  - Pan & Zoom Matrix               |  - Parametric Mannequin Avatar     |
|  - Polygon Vertex Manipulation     |  - XPBD / Verlet Cloth Solver      |
|  - Virtual Sewing Linker (Edges)   |  - Studio PBR Lighting & Shadows   |
|  - 1:1 Scale SVG Vector Exporter   |  - Fit Tension Strain Heatmap      |
+------------------------------------+------------------------------------+
|                  Deployment & Containerization                          |
|  - Multi-stage Dockerfile (Node 20 Alpine builder -> Nginx:alpine-slim) |
|  - Total Image Footprint: ~22 MB | Zero GPU server requirement          |
|  - Automated CI/CD via GitHub Actions (GHCR package release)            |
+-------------------------------------------------------------------------+
```

### Why This Stack?
1. **Client-Side Heavy, Server-Light:** All 3D rendering and physics computations happen on the client's GPU via WebGL/WebGPU. The server only serves static files, keeping VPS hosting costs essentially free.
2. **Decoupled 60 FPS State via Zustand:** High-frequency render loops bypass standard React re-render cycles, ensuring fluid 60 FPS viewport manipulation.
3. **Multi-Stage Ultra-Light Docker (~22MB):** Uses `nginx:alpine-slim` with Gzip compression and 1-year immutable caching for production assets.

---

## 3. Mathematical & Physics Simulation Model

### 3.1 Cloth Particle Network (Extended Position-Based Dynamics / Verlet)
Each pattern piece is discretized into a 2D mesh grid:
- **Vertices (Particles):** Position vector $\mathbf{x}_i$, previous position $\mathbf{x}_i^*$, mass $m_i$, normal $\mathbf{n}_i$.
- **Verlet Integration:**
  $$\mathbf{x}_i(t + \Delta t) = \mathbf{x}_i(t) + \alpha (\mathbf{x}_i(t) - \mathbf{x}_i(t - \Delta t)) + \mathbf{g} \Delta t^2$$
  where $\alpha$ is damping factor ($0.985$) and $\mathbf{g}$ is gravity ($-9.8\text{ m/s}^2$).

### 3.2 Constraints
1. **Structural Distance Springs:** Preserves weave distance between adjacent vertices according to fabric `stretchStiffness`.
2. **Shear Springs:** Diagonal cross-springs preventing fabric shearing.
3. **Bending Constraints:** 2-hop flex springs controlling fabric drape softness (silk vs leather).
4. **Virtual Sewing Constraints:** Pulls paired edge vertices together in 3D space with seam force until edges join cleanly around the avatar.
5. **Avatar Capsule Collisions:** Mannequin limbs and torso are modeled as analytical capsules. Particles penetrating $r_{\text{capsule}} + \delta_{\text{skin}}$ are projected to the surface normal with friction damping.

### 3.3 Fit Tension Strain Heatmap
Strain $\epsilon$ across edges is calculated per frame:
$$\epsilon = \frac{|d - d_{\text{rest}}|}{d_{\text{rest}}}$$
- $\epsilon < 0.03$: **Blue** (Relaxed / Loose Fit)
- $0.03 \le \epsilon \le 0.08$: **Green** (Optimal Snug Fit)
- $\epsilon > 0.15$: **Red** (High Strain / Tight Pressure Point)

---

## 4. Functional Specifications

### 4.1 2D Pattern Window
- **Infinite Grid:** Millimeter/centimeter grid lines with pan and smooth zoom.
- **Piece Transformation:** Drag, rotate, and scale individual pattern pieces.
- **Vertex Editing:** Select and adjust polygon vertex points directly on canvas.
- **Interactive Sewing Tool (S):**
  - Click edge on Piece A (highlighted yellow).
  - Click edge on Piece B (highlighted cyan).
  - System registers a bidirectional seam with visual dashed thread lines.
- **Measurement Overlays:** Dynamic edge length readings in cm.

### 4.2 3D Studio & Drape Viewport
- **3D Mannequin Avatar:** Anatomical procedural avatar with customizable chest, waist, hips, and height measurements.
- **Interactive Draping:** Start/pause real-time physics draping.
- **Cloth Tug & Drag:** Click and drag cloth surface in 3D to adjust styling.
- **Material Presets:**
  - *Cotton Jersey:* Medium weight, low bend resistance.
  - *Silk Satin:* Ultra-lightweight, flowing drape, low friction.
  - *Heavy Denim 14oz:* High mass, stiff bending, textured.
  - *Merino Wool:* Stretchy knit, warm drape.
  - *Structured Leather:* Heavyweight, rigid form retention.
- **Camera Angles:** Instant switching between Front, Back, Side, and Perspective angles.

### 4.3 Production Export
- **2D SVG Vector:** 1:1 scale paths ready for laser cutting, plotting, or paper pattern printing.
- **CAD JSON:** Serialized project schema preserving all vertex geometries, seam connections, and textile properties.

---

## 5. Development Roadmap for Future AI Agents / Contributors

### Phase 1: MVP Core (Completed ✓)
- [x] Dual-viewport layout with responsive toggle (Dual, Pattern Only, Studio Only).
- [x] HTML5 2D Canvas CAD engine with pan, zoom, piece moving, vertex editing, and seam linking.
- [x] Three.js 3D Studio with procedural mannequin, orbit controls, and lighting.
- [x] Real-time Verlet cloth solver with structural, shear, bending, and sewing constraints.
- [x] Capsule collision detection against avatar body.
- [x] Fit tension strain heatmap mode.
- [x] Fabric presets (Cotton, Silk, Denim, Wool, Leather) + custom color picker.
- [x] 1:1 SVG pattern export & JSON project export.
- [x] Ultra-light multi-stage Dockerfile (~22MB) + Docker Compose.
- [x] GitHub Actions CI/CD workflow with GHCR publishing.

### Phase 2: Parametric Curves & Sewing Refinements
- [ ] Implement cubic Bezier curve editing for armholes and necklines.
- [ ] Add Seam Allowance (SA) offset generator (e.g. 1cm or 1.5cm border).
- [ ] Implement Dart insertion tool (contouring fabric for bust/waist).
- [ ] Import patterns from FreeSewing.org JSON format.

### Phase 3: WebGPU Compute Shaders (TSL)
- [ ] Port physics solver from CPU JS loop to WebGPU Compute Shaders using Three.js TSL (`three/tsl`).
- [ ] Support 50,000+ particle meshes with cloth self-collision (BVH / spatial hashing).
- [ ] PBR normal maps for realistic fabric micro-weave textures (denim twill, ribbed knit, silk weave).

### Phase 4: Production Standards & Factory Integrations
- [ ] Export to standard apparel CAD format: **DXF-AAMA / ASTM**.
- [ ] Multi-size grading rules (XS, S, M, L, XL, XXL) based on parametric measurement tables.
- [ ] GLTF / USDZ export for WebAR virtual try-on on mobile devices.

---

## 6. How to Continue Development (For Other LLMs / Developers)

1. **State Store:** All state lives in `src/store/useCloStore.ts`. When adding a new CAD tool or simulation parameter, add it to `useCloStore`.
2. **Physics Calculations:** The particle solver is in `src/utils/clothSimulation.ts`. Avoid putting heavy calculation inside React component render functions.
3. **2D Canvas Rendering:** Handled inside `src/components/PatternViewport/PatternCanvas.tsx`. High-DPI retina scaling is automatically applied.
4. **3D Viewport:** Handled inside `src/components/Studio3D/StudioViewport.tsx`.
5. **Testing Builds:** Always verify with `npm run build` (`tsc -b && vite build`) before committing changes.
