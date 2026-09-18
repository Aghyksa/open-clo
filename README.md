# OpenCLO 👗✂️

> **Open-Source 3D Fashion Design, Garment CAD & Cloth Simulation Web Application.**  
> Self-hosted alternative to CLO3D and Marvelous Designer.

[![CI/CD Pipeline](https://github.com/Aghyksa/open-clo/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Aghyksa/open-clo/actions/workflows/ci-cd.yml)
[![Docker Image Size](https://img.shields.io/badge/docker%20image-~22MB-blue?logo=docker)](https://github.com/Aghyksa/open-clo/pkgs/container/open-clo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Three.js%20%7C%20Vite%20%7C%20Tailwind-61dafb)](https://react.dev)

---

## ✨ Features

- **Dual-Viewport Studio Layout:**
  - **2D Pattern Window (Left):** High-DPI canvas CAD cutting table with infinite grid, zoom/pan, piece positioning, polygon vertex manipulation, and edge dimension readings in cm.
  - **3D Draping Studio (Right):** Three.js PBR studio lighting, parametric mannequin avatar, real-time cloth physics simulation, and interactive 3D cloth tugging/draping.
- **Virtual Sewing & Seam Linker:**
  - Click any edge on Piece A and pair it with an edge on Piece B using the **Virtual Sewing Tool (S)** to create dynamic sewing springs that pull and sew panels together in 3D.
- **Real-Time Textile Physics Engine (Verlet / XPBD):**
  - Structural distance constraints (stretch resistance).
  - Shear and bending constraints (flowing silk vs rigid denim drape).
  - Continuous capsule collision detection against avatar body and studio floor.
- **Fit Tension Heatmap Mode:**
  - Real-time color-coded strain analysis: **Blue** (loose fit), **Green** (optimal fit), **Red** (tight pressure points).
- **Physical Fabric Presets:**
  - *Cotton Jersey*, *Silk Satin*, *Heavy Denim 14oz*, *Merino Wool*, and *Structured Leather*.
  - Custom color picker & physical slider adjustments (stiffness, density, friction).
- **Avatar Sizing:**
  - Parametric adjustments for chest, waist, hips circumference, and height.
- **Production-Ready Export:**
  - **1:1 Scale SVG Vector:** Instant export for laser cutting, plotting, or paper pattern printing.
  - **CAD JSON Project:** Complete export of vertices, seams, and fabric specs.
- **Ultra-Lightweight Self-Hosting (~22 MB):**
  - Multi-stage Docker build served via hardened `nginx:alpine-slim` with Gzip compression and asset caching.
  - 100% client-side compute — **Zero GPU server required!**

---

## 🚀 Quick Start with Docker (Recommended)

Run the studio locally or on your server in one command:

```bash
docker compose up -d
```

Open your browser at: **`http://localhost:8080`**

To stop:
```bash
docker compose down
```

---

## 💻 Local Development Setup

Prerequisites: Node.js 20+ and npm.

```bash
# 1. Clone the repository
git clone https://github.com/Aghyksa/open-clo.git
cd open-clo

# 2. Install dependencies
npm install

# 3. Start local Vite development server
npm run dev
```

---

## ⌨️ Keyboard Shortcuts

| Key | Tool / Action | Description |
|:---:|:---|:---|
| **V** | Select & Transform | Select and move pattern pieces on the 2D canvas |
| **A** | Vertex Tool | Directly edit polygon vertices and neckline curves |
| **S** | Virtual Sewing | Click edge A then edge B to sew pieces together |
| **H** | Hand / Pan | Pan around the 2D workspace |
| **M** | Measure | Inspect edge lengths and dimensions |
| **Space** | Play / Pause | Toggle 3D cloth draping simulation |

---

## 📂 Project Structure

```
open-clo/
├── .github/workflows/
│   └── ci-cd.yml             # Automated GitHub Actions CI/CD & GHCR publisher
├── src/
│   ├── components/
│   │   ├── PatternViewport/
│   │   │   └── PatternCanvas.tsx  # 2D CAD cutting table & sewing line renderer
│   │   ├── Studio3D/
│   │   │   └── StudioViewport.tsx # Three.js 3D studio, mannequin, & cloth mesh
│   │   └── UI/
│   │       ├── TopNav.tsx         # Layout switcher, preset loader, export modal
│   │       ├── ToolSidebar.tsx    # CAD tool palette
│   │       └── PropertyInspector.tsx # Fabric materials, avatar sliders, seams
│   ├── store/
│   │   └── useCloStore.ts    # Zustand 60 FPS state store
│   ├── types/
│   │   └── cad.ts            # TypeScript interfaces for pieces, seams, fabrics
│   ├── utils/
│   │   ├── clothSimulation.ts # Verlet / XPBD physics solver & capsule collisions
│   │   └── patternPresets.ts  # T-Shirt pattern geometry & SVG vector exporter
│   ├── App.tsx               # Main application layout
│   └── main.tsx              # Entry point
├── Dockerfile                # Multi-stage ultra-light container (~22MB)
├── docker-compose.yml        # 1-command deployment configuration
├── nginx.conf                # Gzip-compressed, security-hardened web server
├── PRD.md                    # Comprehensive Product Requirements Document
└── README.md
```

---

## 📖 Product Requirements & AI Instructions

For architectural details, mathematical formulations, and instructions on how to continue development with other LLMs or AI agents, refer to **[`PRD.md`](PRD.md)**.

---

## 📄 License

Released under the [MIT License](LICENSE).
