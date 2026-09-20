import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCloStore } from '../../store/useCloStore';
import { getAssembledSpec } from '../../utils/patternPresets';
import {
  generateGarmentTextureCanvas,
  createGarment3DModel,
} from '../../utils/studio3DGarmentBuilder';
import type { MockupSceneMode, StudioLightingPreset } from '../../types/cad';
import { Download } from 'lucide-react';

export const StudioViewport: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const {
    activeTemplateId,
    colorZones,
    decals,
    customColor,
    mockupScene,
    setMockupScene,
    lightingPreset,
    setLightingPreset,
    decalTextureRevision,
  } = useCloStore();

  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // References for Three.js instance
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const garmentGroupRef = useRef<THREE.Group | null>(null);
  const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
  } | null>(null);

  const spec = getAssembledSpec(activeTemplateId);

  // 1. Initialize Three.js Scene, Camera, Renderer, Lighting & Floor
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === 'ecommerce-white' ? '#f8fafc' : '#0c0e12');
    sceneRef.current = scene;

    // Camera (40° fashion portrait lens)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 2.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // Needed for 4K snapshots
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.45, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 0.6;
    controls.maxDistance = 5.0;
    controlsRef.current = controls;

    // Studio 3-Point Lighting
    const ambient = new THREE.AmbientLight('#ffffff', 1.0);
    scene.add(ambient);

    const key = new THREE.DirectionalLight('#ffffff', 1.5);
    key.position.set(2.0, 3.8, 2.8);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.bias = -0.0001;
    scene.add(key);

    const fill = new THREE.DirectionalLight('#93c5fd', 0.7);
    fill.position.set(-2.5, 2.2, 1.8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#fbcfe8', 0.85);
    rim.position.set(0, 3.0, -2.8);
    scene.add(rim);

    lightsRef.current = { ambient, key, fill, rim };

    // Studio Floor & Contact Shadow
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Initial Offscreen Canvas & CanvasTexture
    const offscreen = generateGarmentTextureCanvas({
      colorZones,
      decals,
      activeTemplateId,
      customColor,
    });
    offscreenCanvasRef.current = offscreen;

    const texture = new THREE.CanvasTexture(offscreen);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    canvasTextureRef.current = texture;

    // Build 3D Model
    const garment = createGarment3DModel(spec, mockupScene, texture);
    scene.add(garment);
    garmentGroupRef.current = garment;

    // Track interaction for gentle 360 rotation
    let isInteracting = false;
    controls.addEventListener('start', () => {
      isInteracting = true;
    });
    controls.addEventListener('end', () => {
      isInteracting = false;
    });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Gentle rotation if in floating 360 mode and user isn't actively dragging
      if (mockupScene === 'floating-360' && garmentGroupRef.current && !isInteracting) {
        garmentGroupRef.current.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // 2. Re-bake Texture whenever 2D colors or decals change
  useEffect(() => {
    if (!canvasTextureRef.current) return;

    generateGarmentTextureCanvas(
      { colorZones, decals, activeTemplateId, customColor },
      offscreenCanvasRef.current || undefined
    );
    canvasTextureRef.current.needsUpdate = true;
  }, [colorZones, decals, activeTemplateId, customColor, decalTextureRevision]);

  // 3. Rebuild 3D Model whenever mockupScene or template changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !canvasTextureRef.current) return;

    if (garmentGroupRef.current) {
      scene.remove(garmentGroupRef.current);
    }

    const newGarment = createGarment3DModel(spec, mockupScene, canvasTextureRef.current);
    scene.add(newGarment);
    garmentGroupRef.current = newGarment;

    // Reset rotation if not floating-360
    if (mockupScene !== 'floating-360') {
      newGarment.rotation.y = 0;
    }
  }, [mockupScene, activeTemplateId, spec]);

  // 4. Update Studio Lighting Preset
  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!scene || !lights) return;

    if (lightingPreset === 'ecommerce-white') {
      scene.background = new THREE.Color('#f8fafc');
      lights.ambient.color.set('#ffffff');
      lights.ambient.intensity = 1.1;
      lights.key.color.set('#ffffff');
      lights.key.intensity = 1.5;
      lights.fill.color.set('#e2e8f0');
      lights.fill.intensity = 0.8;
      lights.rim.color.set('#ffffff');
      lights.rim.intensity = 0.5;
    } else if (lightingPreset === 'moody-dark') {
      scene.background = new THREE.Color('#0c0e12');
      lights.ambient.color.set('#1e293b');
      lights.ambient.intensity = 0.4;
      lights.key.color.set('#ffffff');
      lights.key.intensity = 2.2;
      lights.fill.color.set('#3b82f6');
      lights.fill.intensity = 0.5;
      lights.rim.color.set('#ec4899');
      lights.rim.intensity = 1.4;
    } else if (lightingPreset === 'warm-editorial') {
      scene.background = new THREE.Color('#181412');
      lights.ambient.color.set('#451a03');
      lights.ambient.intensity = 0.5;
      lights.key.color.set('#fef08a');
      lights.key.intensity = 2.0;
      lights.fill.color.set('#fdba74');
      lights.fill.intensity = 0.7;
      lights.rim.color.set('#fed7aa');
      lights.rim.intensity = 1.0;
    }
  }, [lightingPreset]);

  // Camera Quick Preset Angles
  const setCameraAngle = (angle: 'front' | 'back' | 'angle' | 'closeup') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (angle === 'front') {
      camera.position.set(0, 0.45, 2.2);
      controls.target.set(0, 0.45, 0);
    } else if (angle === 'back') {
      camera.position.set(0, 0.45, -2.2);
      controls.target.set(0, 0.45, 0);
    } else if (angle === 'angle') {
      camera.position.set(1.6, 0.6, 1.6);
      controls.target.set(0, 0.45, 0);
    } else if (angle === 'closeup') {
      camera.position.set(0, 0.55, 1.0);
      controls.target.set(0, 0.55, 0);
    }
    controls.update();
  };

  // Download High-Res 4K Snapshot
  const handleDownloadSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `openclo-${activeTemplateId}-${mockupScene}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="relative w-full h-full bg-[#0c0e12] overflow-hidden select-none">
      {/* Top Studio Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Mockup Scene Mode Selector */}
        <div className="flex items-center gap-1 bg-[#14171f]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-xl pointer-events-auto">
          {[
            { id: 'ghost', label: 'Ghost Mannequin' },
            { id: 'hanger', label: 'Boutique Hanger' },
            { id: 'flat-lay', label: 'Studio Flat Lay' },
            { id: 'folded', label: 'Folded Drop' },
            { id: 'floating-360', label: 'Floating 360°' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setMockupScene(mode.id as MockupSceneMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mockupScene === mode.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Lighting Preset Selector */}
        <div className="flex items-center gap-1 bg-[#14171f]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-xl pointer-events-auto">
          {[
            { id: 'ecommerce-white', label: 'Clean White' },
            { id: 'moody-dark', label: 'Moody Dark' },
            { id: 'warm-editorial', label: 'Warm Editorial' },
          ].map((light) => (
            <button
              key={light.id}
              onClick={() => setLightingPreset(light.id as StudioLightingPreset)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                lightingPreset === light.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {light.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Angles & Snapshot Controls Bottom-Right */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[#14171f]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-xl">
          <button
            onClick={() => setCameraAngle('front')}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
            title="Front View"
          >
            Front
          </button>
          <button
            onClick={() => setCameraAngle('back')}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
            title="Back View"
          >
            Back
          </button>
          <button
            onClick={() => setCameraAngle('angle')}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
            title="3/4 Perspective Angle"
          >
            3/4 Angle
          </button>
          <button
            onClick={() => setCameraAngle('closeup')}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
            title="Close-Up Chest Detail"
          >
            Detail
          </button>
        </div>

        {/* Snapshot Button */}
        <button
          onClick={handleDownloadSnapshot}
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs shadow-xl shadow-blue-600/30 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>{downloadSuccess ? 'Saved!' : '4K Snapshot'}</span>
        </button>
      </div>

      {/* Bottom Info Pill */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#14171f]/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-200">{spec.name}</span> · Orbit: Left Drag · Zoom: Scroll
      </div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
