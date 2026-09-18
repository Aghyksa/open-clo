import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCloStore } from '../../store/useCloStore';
import { ClothSimulator } from '../../utils/clothSimulation';
import {
  RotateCcw,
  Play,
  Pause,
  Eye,
  Camera,
  Layers,
  Thermometer,
  Sparkles,
} from 'lucide-react';

export const StudioViewport: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const {
    pieces,
    seams,
    currentMaterial,
    customColor,
    isSimulating,
    simulationIteration,
    showWireframe,
    showHeatmap,
    showAvatar,
    cameraPreset,
    setIsSimulating,
    resetSimulation,
    toggleWireframe,
    toggleHeatmap,
    toggleAvatar,
    setCameraPreset,
  } = useCloStore();

  const simulatorRef = useRef<ClothSimulator>(new ClothSimulator());
  const clothMeshRef = useRef<THREE.Mesh | null>(null);
  const clothGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Dragging cloth in 3D
  const selectedParticleIdxRef = useRef<number | null>(null);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0f13');

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't clip through floor
    controls.minDistance = 0.8;
    controls.maxDistance = 8.0;
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.4);
    keyLight.position.set(2.5, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#93c5fd', 0.5);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#fbcfe8', 0.4);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // 6. Ground Studio Floor & Grid
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0a0c10',
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(6, 30, '#2d3340', '#181b22');
    grid.position.y = 0.005;
    scene.add(grid);

    // 7. Parametric Mannequin Avatar
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);
    buildMannequinAvatar(avatarGroup);

    // 8. Cloth Mesh Container
    const clothGeom = new THREE.BufferGeometry();
    clothGeomRef.current = clothGeom;

    const clothMat = new THREE.MeshStandardMaterial({
      color: customColor,
      roughness: currentMaterial.roughness,
      metalness: currentMaterial.metalness,
      side: THREE.DoubleSide,
      vertexColors: false,
    });

    const clothMesh = new THREE.Mesh(clothGeom, clothMat);
    clothMesh.castShadow = true;
    clothMesh.receiveShadow = true;
    clothMeshRef.current = clothMesh;
    scene.add(clothMesh);

    // Initialize Simulator particles
    simulatorRef.current.buildFromPieces(pieces, seams, currentMaterial);

    // Render / Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update Controls
      controls.update();

      // Step physics if simulating
      const sim = simulatorRef.current;
      if (useCloStore.getState().isSimulating) {
        sim.step(dt);
      }

      // Update Cloth Mesh Buffers
      if (clothGeomRef.current && sim.particles.length > 0) {
        const particleCount = sim.particles.length;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const isHeatmap = useCloStore.getState().showHeatmap;

        for (let i = 0; i < particleCount; i++) {
          const p = sim.particles[i];
          positions[i * 3] = p.pos.x;
          positions[i * 3 + 1] = p.pos.y;
          positions[i * 3 + 2] = p.pos.z;

          if (isHeatmap) {
            // Strain color mapping: 0% = Cyan/Blue, 5% = Green, 15%+ = Red
            const strain = sim.stressMap[i] || 0;
            const hue = Math.max(0, (1.0 - Math.min(strain * 6.0, 1.0)) * 0.4);
            const color = new THREE.Color().setHSL(hue, 0.9, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
          }
        }

        clothGeomRef.current.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        );

        if (isHeatmap) {
          clothGeomRef.current.setAttribute(
            'color',
            new THREE.BufferAttribute(colors, 3)
          );
        }

        if (clothGeomRef.current.index === null && sim.indices.length > 0) {
          clothGeomRef.current.setIndex(sim.indices);
        }

        clothGeomRef.current.computeVertexNormals();
        clothGeomRef.current.attributes.position.needsUpdate = true;
        if (isHeatmap && clothGeomRef.current.attributes.color) {
          clothGeomRef.current.attributes.color.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild simulation when pieces/seams or materials change
  useEffect(() => {
    simulatorRef.current.buildFromPieces(pieces, seams, currentMaterial);
    if (clothGeomRef.current) {
      clothGeomRef.current.setIndex(simulatorRef.current.indices);
    }
  }, [pieces, seams, currentMaterial, simulationIteration]);

  // Update Cloth Material / Visual settings
  useEffect(() => {
    if (!clothMeshRef.current) return;
    const mat = clothMeshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.set(customColor);
    mat.wireframe = showWireframe;
    mat.roughness = currentMaterial.roughness;
    mat.metalness = currentMaterial.metalness;
    mat.vertexColors = showHeatmap;
    mat.needsUpdate = true;
  }, [customColor, showWireframe, showHeatmap, currentMaterial]);

  // Update Avatar Visibility
  useEffect(() => {
    if (avatarGroupRef.current) {
      avatarGroupRef.current.visible = showAvatar;
    }
  }, [showAvatar]);

  // Handle Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (cameraPreset === 'front') {
      camera.position.set(0, 1.1, 2.8);
      controls.target.set(0, 1.0, 0);
    } else if (cameraPreset === 'back') {
      camera.position.set(0, 1.1, -2.8);
      controls.target.set(0, 1.0, 0);
    } else if (cameraPreset === 'side') {
      camera.position.set(2.8, 1.1, 0);
      controls.target.set(0, 1.0, 0);
    } else if (cameraPreset === 'perspective') {
      camera.position.set(1.8, 1.4, 2.4);
      controls.target.set(0, 1.0, 0);
    }
    controls.update();
  }, [cameraPreset]);

  // Helper: Build Mannequin Model
  const buildMannequinAvatar = (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.65,
      metalness: 0.1,
    });

    // Torso / Chest
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.5, 24), mat);
    torso.position.set(0, 1.2, 0);
    torso.castShadow = true;
    group.add(torso);

    // Pelvis / Hips
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.3, 24), mat);
    pelvis.position.set(0, 0.8, 0);
    pelvis.castShadow = true;
    group.add(pelvis);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 16), mat);
    neck.position.set(0, 1.52, 0);
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), mat);
    head.position.set(0, 1.66, 0);
    head.scale.set(0.9, 1.15, 1.0);
    head.castShadow = true;
    group.add(head);

    // Shoulders
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), mat);
    shoulderL.position.set(-0.24, 1.38, 0);
    group.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), mat);
    shoulderR.position.set(0.24, 1.38, 0);
    group.add(shoulderR);

    // Upper Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 16), mat);
    armL.position.set(-0.32, 1.15, 0);
    armL.rotation.z = 0.25;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 16), mat);
    armR.position.set(0.32, 1.15, 0);
    armR.rotation.z = -0.25;
    group.add(armR);

    // Legs
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.05, 0.65, 16), mat);
    legL.position.set(-0.11, 0.35, 0);
    legL.castShadow = true;
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.05, 0.65, 16), mat);
    legR.position.set(0.11, 0.35, 0);
    legR.castShadow = true;
    group.add(legR);

    // Mannequin Stand Pole & Base
    const standMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.8,
      roughness: 0.2,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 16), standMat);
    pole.position.set(0, 0.4, 0);
    group.add(pole);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 32), standMat);
    base.position.set(0, 0.02, 0);
    group.add(base);
  };

  // 3D Cloth Tug / Mouse Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !clothMeshRef.current || !cameraRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(clothMeshRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.point) {
        // Find closest particle
        const sim = simulatorRef.current;
        let closestIdx = -1;
        let minDist = Infinity;
        for (let i = 0; i < sim.particles.length; i++) {
          const d = sim.particles[i].pos.distanceTo(hit.point);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }

        if (closestIdx !== -1 && minDist < 0.15) {
          selectedParticleIdxRef.current = closestIdx;
          sim.particles[closestIdx].pinned = true;

          // Align drag plane with camera view
          const camDir = new THREE.Vector3();
          cameraRef.current.getWorldDirection(camDir);
          dragPlaneRef.current.setFromNormalAndCoplanarPoint(
            camDir.negate(),
            hit.point
          );

          if (controlsRef.current) controlsRef.current.enabled = false;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      selectedParticleIdxRef.current === null ||
      !cameraRef.current
    )
      return;

    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const targetPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, targetPoint);

    if (targetPoint) {
      const p = simulatorRef.current.particles[selectedParticleIdxRef.current];
      p.pos.copy(targetPoint);
      p.prevPos.copy(targetPoint);
    }
  };

  const handlePointerUp = () => {
    if (selectedParticleIdxRef.current !== null) {
      simulatorRef.current.particles[selectedParticleIdxRef.current].pinned = false;
      selectedParticleIdxRef.current = null;
    }
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  return (
    <div
      className="relative w-full h-full bg-[#0d0f13] overflow-hidden flex flex-col select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 3D Viewport Header Overlay */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-[#1b1e26]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-slate-100">3D Studio & Simulation</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">{currentMaterial.name}</span>
      </div>

      {/* Top Right Studio Controls */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2 bg-[#1b1e26]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-xl">
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            isSimulating
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
          }`}
          title="Toggle Simulation"
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Simulating
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Start Drape
            </>
          )}
        </button>

        <button
          onClick={resetSimulation}
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
          title="Reset Drape & Position"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700" />

        <button
          onClick={toggleHeatmap}
          className={`p-1.5 rounded transition-colors ${
            showHeatmap
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'hover:bg-slate-700/60 text-slate-300'
          }`}
          title="Toggle Fit Tension Heatmap"
        >
          <Thermometer className="w-4 h-4" />
        </button>

        <button
          onClick={toggleWireframe}
          className={`p-1.5 rounded transition-colors ${
            showWireframe
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'hover:bg-slate-700/60 text-slate-300'
          }`}
          title="Toggle Wireframe"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={toggleAvatar}
          className={`p-1.5 rounded transition-colors ${
            showAvatar ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Avatar Visibility"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Camera Angle Selector */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-[#1b1e26]/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-xl text-xs">
        <span className="text-slate-400 px-2 flex items-center gap-1 text-[11px]">
          <Camera className="w-3 h-3" /> Camera:
        </span>
        {(['front', 'back', 'side', 'perspective'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setCameraPreset(mode)}
            className={`px-2 py-1 rounded capitalize transition-colors ${
              cameraPreset === mode
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Tension Heatmap Legend */}
      {showHeatmap && (
        <div className="absolute bottom-4 left-4 z-10 bg-[#1b1e26]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 shadow-xl text-[11px] text-slate-300 flex flex-col gap-1.5">
          <span className="font-semibold text-slate-200">Fit Tension Map</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 rounded bg-gradient-to-r from-blue-500 via-green-400 to-red-500" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Relaxed (0%)</span>
            <span>Snug (8%)</span>
            <span>Tight (15%+)</span>
          </div>
        </div>
      )}

      {/* Three.js Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
