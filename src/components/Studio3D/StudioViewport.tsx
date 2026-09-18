import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
  UserCheck,
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

  const [avatarMode, setAvatarMode] = useState<'mannequin' | 'realistic'>('mannequin');
  const [modelLoaded, setModelLoaded] = useState(false);

  const simulatorRef = useRef<ClothSimulator>(new ClothSimulator());
  const clothMeshRef = useRef<THREE.Mesh | null>(null);
  const clothGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const gltfModelRef = useRef<THREE.Group | null>(null);
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

    // 1. Scene with subtle studio vignette background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0e12');

    // 2. Camera with fashion studio framing
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 2.7);
    cameraRef.current = camera;

    // 3. Renderer with ACES Tone Mapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.15, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Prevent camera dipping below floor
    controls.minDistance = 0.7;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // 5. Fashion Studio 3-Point Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);

    // Key Light (warm soft highlight)
    const keyLight = new THREE.DirectionalLight('#fffaf0', 1.6);
    keyLight.position.set(2.0, 3.8, 2.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 8;
    keyLight.shadow.camera.left = -1.2;
    keyLight.shadow.camera.right = 1.2;
    keyLight.shadow.camera.top = 2.2;
    keyLight.shadow.camera.bottom = -0.2;
    scene.add(keyLight);

    // Fill Light (cool soft fill)
    const fillLight = new THREE.DirectionalLight('#93c5fd', 0.7);
    fillLight.position.set(-2.5, 2.2, 1.8);
    scene.add(fillLight);

    // Rim Light (back contour highlight on mannequin & drape silhouette)
    const rimLight = new THREE.DirectionalLight('#fbcfe8', 0.85);
    rimLight.position.set(0, 3.0, -2.8);
    scene.add(rimLight);

    // 6. Studio Floor & Contact Shadow
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#080a0d',
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle studio circle platform
    const platformGeo = new THREE.CylinderGeometry(0.75, 0.78, 0.015, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: '#13161c',
      roughness: 0.6,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.0075;
    platform.receiveShadow = true;
    scene.add(platform);

    const grid = new THREE.GridHelper(5, 20, '#222733', '#141720');
    grid.position.y = 0.016;
    scene.add(grid);

    // 7. Avatar Group
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Stand base & pole
    const standGroup = new THREE.Group();
    const standMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.2,
    });
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.02, 32), standMat);
    standBase.position.y = 0.01;
    standBase.receiveShadow = true;
    standGroup.add(standBase);
    avatarGroup.add(standGroup);

    // Load High-Quality GLTF Female Mannequin
    const loader = new GLTFLoader();
    loader.load(
      '/models/femaleMannequin.glb',
      (gltf) => {
        const model = gltf.scene;
        gltfModelRef.current = model;

        // Position model on floor
        model.position.set(0, 0, 0);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Apply sleek CLO3D matte porcelain finish by default
            const porcelainMat = new THREE.MeshStandardMaterial({
              color: '#b8c2cc',
              roughness: 0.42,
              metalness: 0.03,
            });
            // Store original material on userData for toggling
            mesh.userData.origMaterial = mesh.material;
            mesh.userData.porcelainMaterial = porcelainMat;
            mesh.material = porcelainMat;
          }
        });

        avatarGroup.add(model);
        setModelLoaded(true);
      },
      undefined,
      (error) => {
        console.warn('GLTF avatar fallback active:', error);
        // Build anatomical fallback
        buildSculptedMannequin(avatarGroup);
        setModelLoaded(true);
      }
    );

    // 8. Cloth Mesh Container
    const clothGeom = new THREE.BufferGeometry();
    clothGeomRef.current = clothGeom;

    const clothMat = new THREE.MeshStandardMaterial({
      color: customColor,
      roughness: currentMaterial.roughness,
      metalness: currentMaterial.metalness,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      flatShading: false,
    });

    const clothMesh = new THREE.Mesh(clothGeom, clothMat);
    clothMesh.castShadow = true;
    clothMesh.receiveShadow = true;
    clothMeshRef.current = clothMesh;
    scene.add(clothMesh);

    // Initialize Simulator particles
    simulatorRef.current.buildFromPieces(pieces, seams, currentMaterial);

    // Animation Render Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      controls.update();

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
            // Strain heatmap: 0% = SkyBlue, 5% = Green, 15%+ = Red
            const strain = sim.stressMap[i] || 0;
            const hue = Math.max(0, (1.0 - Math.min(strain * 7.0, 1.0)) * 0.4);
            const color = new THREE.Color().setHSL(hue, 0.95, 0.5);
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

  // Toggle Avatar Material Style (CLO3D Porcelain vs Realistic Skin)
  const toggleAvatarStyle = () => {
    const nextMode = avatarMode === 'mannequin' ? 'realistic' : 'mannequin';
    setAvatarMode(nextMode);

    if (gltfModelRef.current) {
      gltfModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (nextMode === 'mannequin' && mesh.userData.porcelainMaterial) {
            mesh.material = mesh.userData.porcelainMaterial;
          } else if (nextMode === 'realistic' && mesh.userData.origMaterial) {
            mesh.material = mesh.userData.origMaterial;
          }
        }
      });
    }
  };

  // Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (cameraPreset === 'front') {
      camera.position.set(0, 1.2, 2.5);
      controls.target.set(0, 1.15, 0);
    } else if (cameraPreset === 'back') {
      camera.position.set(0, 1.2, -2.5);
      controls.target.set(0, 1.15, 0);
    } else if (cameraPreset === 'side') {
      camera.position.set(2.5, 1.2, 0);
      controls.target.set(0, 1.15, 0);
    } else if (cameraPreset === 'perspective') {
      camera.position.set(1.4, 1.45, 2.1);
      controls.target.set(0, 1.15, 0);
    }
    controls.update();
  }, [cameraPreset]);

  // Sculpted Mannequin Fallback
  const buildSculptedMannequin = (group: THREE.Group) => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.38,
      metalness: 0.05,
    });

    // Torso with natural female waist & bust curvature
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.45, 32), mat);
    torso.position.set(0, 1.22, 0);
    torso.castShadow = true;
    group.add(torso);

    const bustL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 24), mat);
    bustL.position.set(-0.065, 1.25, 0.08);
    bustL.scale.set(1.0, 1.1, 0.9);
    group.add(bustL);

    const bustR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 24), mat);
    bustR.position.set(0.065, 1.25, 0.08);
    bustR.scale.set(1.0, 1.1, 0.9);
    group.add(bustR);

    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.175, 0.35, 32), mat);
    pelvis.position.set(0, 0.88, 0);
    pelvis.castShadow = true;
    group.add(pelvis);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.15, 24), mat);
    neck.position.set(0, 1.48, 0);
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 32, 32), mat);
    head.position.set(0, 1.63, 0.01);
    head.scale.set(0.9, 1.18, 1.0);
    head.castShadow = true;
    group.add(head);

    // Sculpted Shoulders & Arms
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), mat);
    shoulderL.position.set(-0.20, 1.36, 0);
    group.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), mat);
    shoulderR.position.set(0.20, 1.36, 0);
    group.add(shoulderR);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 20), mat);
    armL.position.set(-0.28, 1.16, 0);
    armL.rotation.z = 0.28;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 20), mat);
    armR.position.set(0.28, 1.16, 0);
    armR.rotation.z = -0.28;
    group.add(armR);

    // Sculpted Legs
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.045, 0.72, 24), mat);
    legL.position.set(-0.095, 0.38, 0);
    legL.castShadow = true;
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.045, 0.72, 24), mat);
    legR.position.set(0.095, 0.38, 0);
    legR.castShadow = true;
    group.add(legR);
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

        if (closestIdx !== -1 && minDist < 0.18) {
          selectedParticleIdxRef.current = closestIdx;
          sim.particles[closestIdx].pinned = true;

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
      className="relative w-full h-full bg-[#0c0e12] overflow-hidden flex flex-col select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 3D Viewport Header Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#1b1e26]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-semibold text-slate-100">3D Studio</span>
        {modelLoaded && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Mannequin Active" />
        )}
        <span className="text-slate-500 hidden xl:inline">|</span>
        <span className="text-slate-400 hidden xl:inline">{currentMaterial.name}</span>
      </div>

      {/* Top Right Studio Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#1b1e26]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-xl">
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            isSimulating
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200'
          }`}
          title="Toggle Simulation (Space)"
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Draping</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Drape</span>
            </>
          )}
        </button>

        <button
          onClick={resetSimulation}
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
          title="Reset Drape & Position"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700" />

        {/* Toggle Avatar Style (Porcelain vs Realistic) */}
        <button
          onClick={toggleAvatarStyle}
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
          title="Switch between Porcelain Mannequin and Realistic Skin"
        >
          <UserCheck className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] capitalize hidden sm:inline">{avatarMode}</span>
        </button>

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
