import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCloStore } from '../../store/useCloStore';
import { GARMENT_TEMPLATES } from '../../utils/patternPresets';
import { generateGarmentTextureCanvas } from '../../utils/studio3DGarmentBuilder';
import type { MeshGroup } from '../../utils/patternMesh';
import type { ClothWorkerRequest, ClothWorkerResponse } from '../../workers/clothProtocol';
import type { StudioLightingPreset } from '../../types/cad';
import { Download, RotateCcw, Maximize2 } from 'lucide-react';
import { getPatternColorZone } from '../../utils/patternGeometry';

function disposeGarment(scene: THREE.Scene, group: THREE.Group | null) {
  if (!group) return;
  scene.remove(group);
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

export const StudioViewport: React.FC = () => {
<<<<<<< Updated upstream
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
    sublimationPrint,
    decalTextureRevision,
  } = useCloStore();

  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // References for Three.js instance
=======
  const { activeTemplateId, colorZones, decals, customColor, mockupScene, setMockupScene,
    lightingPreset, setLightingPreset, decalTextureRevision, currentMaterial, avatar,
    simulationIteration, selectedPieceId, pieces } = useCloStore();
  const mountRef = useRef<HTMLDivElement>(null);
>>>>>>> Stashed changes
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const garmentRef = useRef<THREE.Group | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const sleeveTextures = useRef(new Map<string, THREE.CanvasTexture>());
  const sleeveCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const groupsRef = useRef<MeshGroup[]>([]);
  const requestRenderRef = useRef<() => void>(() => {});
  const rotatingRef = useRef(mockupScene === 'floating-360');
  const dirtyRef = useRef(true);
  const lightsRef = useRef<THREE.DirectionalLight[]>([]);
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const [status, setStatus] = useState<'updating' | 'ready' | 'empty' | 'unavailable' | 'error'>('updating');
  const [errorMessage, setErrorMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const template = GARMENT_TEMPLATES.find((item) => item.id === activeTemplateId);

  const invalidate = useCallback(() => {
    dirtyRef.current = true;
    requestRenderRef.current();
  }, []);
  const sendWorker = useCallback((message: ClothWorkerRequest, transfer: ArrayBuffer[] = []) => {
    workerRef.current?.postMessage(message, transfer);
  }, []);

  const bakeTexture = useCallback(function bake() {
    const state = useCloStore.getState();
    canvasRef.current = generateGarmentTextureCanvas({ colorZones: state.colorZones, decals: state.decals,
      activeTemplateId: state.activeTemplateId, customColor: state.customColor, patternBased: true, pieces: state.pieces,
      imageCache: imagesRef.current, onImageLoad: bake }, canvasRef.current || undefined);
    if (textureRef.current) textureRef.current.needsUpdate = true;
    for (const zone of ['leftSleeve', 'rightSleeve'] as const) {
      const present = state.pieces.some((p) => getPatternColorZone(p) === zone);
      if (!present) { sleeveTextures.current.get(zone)?.dispose(); sleeveTextures.current.delete(zone); sleeveCanvases.current.delete(zone); continue; }
      const canvas = generateGarmentTextureCanvas({ zone, colorZones: state.colorZones, decals: state.decals, activeTemplateId: state.activeTemplateId,
        customColor: state.customColor, patternBased: true, pieces: state.pieces, imageCache: imagesRef.current, onImageLoad: bake }, sleeveCanvases.current.get(zone));
      sleeveCanvases.current.set(zone, canvas);
      if (!sleeveTextures.current.has(zone)) { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; sleeveTextures.current.set(zone, texture); }
      sleeveTextures.current.get(zone)!.needsUpdate = true;
    }
    invalidate();
  }, [invalidate]);

  const fitCamera = useCallback(() => {
    const camera = cameraRef.current, controls = controlsRef.current, group = garmentRef.current;
    if (!camera || !controls || !group) return;
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const height = Math.max(1, mountRef.current?.clientHeight || 1);
    const usableHeight = Math.max(height * 0.3, height - 172);
    const distance = Math.max(size.y * height / (2 * tangent * usableHeight), size.x / (2 * tangent * camera.aspect), size.z) * 1.15;
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    center.y += 20 * distance * tangent / height;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.update();
    invalidate();
  }, [invalidate]);

  const receiveWorkerMessage = useCallback((message: ClothWorkerResponse) => {
    if (message.id !== requestIdRef.current) return;
    const scene = sceneRef.current;
    if (!scene || !rendererRef.current || !textureRef.current) return;
    if (message.type === 'error') {
      setErrorMessage(message.message);
      setStatus('error');
      return;
    }
    if (message.type === 'empty') {
      disposeGarment(scene, garmentRef.current);
      garmentRef.current = null;
      geometryRef.current = null;
      materialsRef.current = [];
      groupsRef.current = [];
      setStatus('empty');
      invalidate();
      return;
    }
    if (message.type === 'mesh') {
      const state = useCloStore.getState();
      disposeGarment(scene, garmentRef.current);
      bakeTexture();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(message.positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('uv', new THREE.BufferAttribute(message.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(message.indices, 1));
      message.groups.forEach((group) => geometry.addGroup(group.start, group.count, group.materialIndex));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const materials = message.groups.map((group) => {
        const sleeve = group.zone === 'leftSleeve' || group.zone === 'rightSleeve';
        return new THREE.MeshStandardMaterial({ map: group.zone === 'body' ? textureRef.current : sleeve ? sleeveTextures.current.get(group.zone) : null,
          color: group.zone === 'body' || sleeve ? '#ffffff' : state.colorZones[group.zone]
            || (sleeve ? state.colorZones.sleeves : null) || state.colorZones.body || state.customColor,
          roughness: state.currentMaterial.roughness, metalness: state.currentMaterial.metalness,
          emissive: group.pieceId === state.selectedPieceId ? '#7c4b13' : '#000000', emissiveIntensity: 0.16,
          side: THREE.DoubleSide });
      });
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const group = new THREE.Group();
      group.position.y = 0.12 - (geometry.boundingBox?.min.y || 0);
      group.add(mesh);
      scene.add(group);
      garmentRef.current = group;
      geometryRef.current = geometry;
      materialsRef.current = materials;
      groupsRef.current = message.groups;
      fitCamera();
    } else {
      const geometry = geometryRef.current;
      const position = geometry?.getAttribute('position');
      if (!geometry || !position || position.array.length !== message.positions.length) return;
      position.array.set(message.positions);
      position.needsUpdate = true;
      sendWorker({ type: 'recycle', id: message.id, positions: message.positions }, [message.positions.buffer]);
      geometry.computeVertexNormals();
      if (message.finished) {
        geometry.computeBoundingBox();
        if (garmentRef.current && geometry.boundingBox) garmentRef.current.position.y = 0.12 - geometry.boundingBox.min.y;
        fitCamera();
        setStatus('ready');
      }
    }
    invalidate();
  }, [bakeTexture, fitCamera, invalidate, sendWorker]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const imageCache = imagesRef.current;
    const garmentSlot = garmentRef;
    const workerSlot = workerRef;
    const requestSlot = requestIdRef;
    const sleeveTextureSlot = sleeveTextures;
    const sleeveCanvasSlot = sleeveCanvases;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f4f2ed');
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
    camera.position.set(0, 0.5, 2.4);
    cameraRef.current = camera;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch {
      const frame = requestAnimationFrame(() => {
        setErrorMessage('3D preview needs WebGL. Enable hardware acceleration in your browser to continue.');
        setStatus('unavailable');
      });
      return () => cancelAnimationFrame(frame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 0.25;
    controls.maxDistance = 8;
    controlsRef.current = controls;
    const ambient = new THREE.AmbientLight('#ffffff', 1.1);
    scene.add(ambient);
    ambientRef.current = ambient;
    const lights = [new THREE.DirectionalLight('#ffffff', 2), new THREE.DirectionalLight('#e2e8f0', 0.8), new THREE.DirectionalLight('#ffffff', 1)];
    lights[0].position.set(2, 4, 3);
    lights[1].position.set(-3, 2, 2);
    lights[2].position.set(0, 3, -3);
    lights[0].castShadow = true;
    lights[0].shadow.mapSize.set(1024, 1024);
    lights[0].shadow.bias = -0.0001;
    scene.add(...lights);
    lightsRef.current = lights;
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
<<<<<<< Updated upstream

    // Initial Offscreen Canvas & CanvasTexture
    const offscreen = generateGarmentTextureCanvas({
      colorZones,
      decals,
      activeTemplateId,
      customColor,
      sublimationPrint,
    });
    offscreenCanvasRef.current = offscreen;

    const texture = new THREE.CanvasTexture(offscreen);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
=======
    bakeTexture();
    const texture = new THREE.CanvasTexture(canvasRef.current!);
>>>>>>> Stashed changes
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textureRef.current = texture;
    let frameId = 0, interacting = false, contextLost = false;
    const visible = () => !document.hidden && container.clientWidth > 0 && container.clientHeight > 0 && !contextLost;
    const requestRender = () => {
      if (!frameId && visible()) frameId = requestAnimationFrame(animate);
    };
    const animate = () => {
      frameId = 0;
      if (!visible()) return;
      try {
        const changed = controls.update();
        if (rotatingRef.current && garmentRef.current && !interacting) {
          garmentRef.current.rotation.y += 0.003;
          dirtyRef.current = true;
        }
        if (changed || dirtyRef.current) {
          renderer.render(scene, camera);
          dirtyRef.current = false;
        }
        if (changed || interacting || rotatingRef.current) requestRender();
      } catch {
        contextLost = true;
        sendWorker({ type: 'pause', id: requestIdRef.current, paused: true });
        setErrorMessage('The 3D preview could not be rendered. Reload the page to restore it.');
        setStatus('unavailable');
      }
    };
    requestRenderRef.current = requestRender;
    const updateVisibility = () => {
      sendWorker({ type: 'pause', id: requestIdRef.current, paused: !visible() });
      if (visible()) invalidate();
      else { cancelAnimationFrame(frameId); frameId = 0; }
    };
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      updateVisibility();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      fitCamera();
      invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const start = () => { interacting = true; invalidate(); };
    const end = () => { interacting = false; invalidate(); };
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    controls.addEventListener('change', invalidate);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      updateVisibility();
      setErrorMessage('The browser paused the 3D preview. It will resume when the graphics context returns.');
      setStatus('unavailable');
    };
    const onContextRestored = () => {
      contextLost = false;
      useCloStore.getState().resetSimulation();
      updateVisibility();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', updateVisibility);
    invalidate();
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
      controls.removeEventListener('change', invalidate);
      controls.dispose();
      disposeGarment(scene, garmentSlot.current);
      floorGeometry.dispose();
      floorMaterial.dispose();
      texture.dispose();
      sleeveTextureSlot.current.forEach((item) => item.dispose()); sleeveTextureSlot.current.clear(); sleeveCanvasSlot.current.clear();
      lights.forEach((light) => light.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      requestSlot.current++;
      const worker = workerSlot.current;
      worker?.terminate();
      workerSlot.current = null;
      requestRenderRef.current = () => {};
      groupsRef.current = [];
      geometryRef.current = null;
      garmentRef.current = null;
      materialsRef.current = [];
      textureRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      imageCache.forEach((image) => { image.onload = null; });
      imageCache.clear();
    };
  }, [bakeTexture, fitCamera, invalidate, sendWorker]);

  useEffect(() => {
    bakeTexture();
    const groups = groupsRef.current;
    groups.forEach((group) => {
      const material = materialsRef.current[group.materialIndex];
      if (!material) return;
      const sleeve = group.zone === 'leftSleeve' || group.zone === 'rightSleeve';
      material.map = group.zone === 'body' ? textureRef.current : sleeve ? sleeveTextures.current.get(group.zone) || null : null;
      material.needsUpdate = true;
      material.color.set(group.zone === 'body' || sleeve ? '#ffffff'
        : colorZones[group.zone] || (sleeve ? colorZones.sleeves : null) || colorZones.body || customColor);
      material.roughness = currentMaterial.roughness;
      material.metalness = currentMaterial.metalness;
    });
  }, [colorZones, customColor, decals, decalTextureRevision, activeTemplateId, bakeTexture, currentMaterial.roughness, currentMaterial.metalness]);

<<<<<<< Updated upstream
    generateGarmentTextureCanvas(
      { colorZones, decals, activeTemplateId, customColor, sublimationPrint },
      offscreenCanvasRef.current || undefined
    );
    canvasTextureRef.current.needsUpdate = true;
  }, [colorZones, decals, activeTemplateId, customColor, decalTextureRevision, sublimationPrint]);
=======
  useEffect(() => {
    rotatingRef.current = mockupScene === 'floating-360';
    if (garmentRef.current) garmentRef.current.rotation.y = 0;
    invalidate();
  }, [mockupScene, invalidate]);
>>>>>>> Stashed changes

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !textureRef.current || !rendererRef.current) return;
    const id = ++requestIdRef.current;
    setStatus('updating');
    setErrorMessage('');
    const timer = window.setTimeout(() => {
      const state = useCloStore.getState();
      if (typeof Worker === 'undefined') {
        setErrorMessage('3D preview needs Web Workers. Use an up-to-date browser to continue.');
        setStatus('unavailable');
        return;
      }
      try {
        if (!workerRef.current) {
          const worker = new Worker(new URL('../../workers/cloth.worker.ts', import.meta.url), { type: 'module' });
          workerRef.current = worker;
          worker.onmessage = (event: MessageEvent<ClothWorkerResponse>) => {
            if (workerRef.current === worker) receiveWorkerMessage(event.data);
          };
          worker.onerror = (event) => {
            event.preventDefault();
            if (workerRef.current !== worker) return;
            worker.terminate();
            workerRef.current = null;
            setErrorMessage('The 3D preview could not start. Try rebuilding it.');
            setStatus('error');
          };
        }
        sendWorker({ type: 'build', id,
          pieces: state.pieces.map((piece) => ({ ...piece, graphics: undefined })),
          seams: state.seams, material: state.currentMaterial, avatar: state.avatar,
          paused: document.hidden || !mountRef.current?.clientWidth || !mountRef.current?.clientHeight });
      } catch {
        workerRef.current?.terminate();
        workerRef.current = null;
        setErrorMessage('The 3D preview could not start. Try rebuilding it.');
        setStatus('error');
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      sendWorker({ type: 'cancel', id });
    };
  }, [activeTemplateId, avatar, simulationIteration, currentMaterial.stretchStiffness, currentMaterial.bendingStiffness,
    currentMaterial.friction, currentMaterial.density, receiveWorkerMessage, sendWorker]);

  useEffect(() => {
    groupsRef.current.forEach((group) => {
      const material = materialsRef.current[group.materialIndex];
      if (material) { material.emissive.set(group.pieceId === selectedPieceId ? '#7c4b13' : '#000000'); material.emissiveIntensity = 0.16; }
    });
    invalidate();
  }, [selectedPieceId, status, invalidate]);

  useEffect(() => {
    const scene = sceneRef.current, ambient = ambientRef.current, lights = lightsRef.current;
    if (!scene || !ambient || lights.length !== 3) return;
    const dark = lightingPreset === 'moody-dark', warm = lightingPreset === 'warm-editorial';
    scene.background = new THREE.Color(dark ? '#17191e' : warm ? '#e7ded0' : '#f4f2ed');
    ambient.intensity = dark ? 0.65 : 1.1;
    lights[0].color.set(warm ? '#ffe4c2' : '#ffffff');
    lights[0].intensity = dark ? 3 : 2;
    lights[1].color.set(dark ? '#93b8ec' : '#e2e8f0');
    lights[2].intensity = dark ? 1.8 : 1;
    invalidate();
  }, [lightingPreset, invalidate]);

  const cameraAngle = (angle: 'front' | 'back' | 'angle') => {
    const camera = cameraRef.current, controls = controlsRef.current;
    if (!camera || !controls) return;
    const distance = camera.position.distanceTo(controls.target);
    const direction = angle === 'front' ? new THREE.Vector3(0, 0, 1)
      : angle === 'back' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(1, 0.2, 1).normalize();
    if (garmentRef.current) garmentRef.current.rotation.y = 0;
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    controls.update();
    invalidate();
  };
  const snapshot = () => {
    if (!rendererRef.current || !garmentRef.current) return;
    const link = document.createElement('a');
    try {
      link.href = rendererRef.current.domElement.toDataURL('image/png');
    } catch {
      setErrorMessage('The image could not be saved. Try rebuilding the preview.');
      setStatus('error');
      return;
    }
    link.download = `openclo-${activeTemplateId}-${Date.now()}.png`;
    link.click();
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
  };

  return <div className="relative w-full h-full overflow-hidden bg-[#f4f2ed] select-none">
    <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-[#f4f2ed]/95 border-b border-stone-200 flex items-center justify-between gap-2 text-stone-800">
      <h2 className="font-semibold text-sm">3D preview</h2>
      <span role="status" className="text-[10px] text-stone-500">{status === 'updating' ? 'Draping your pattern…' : status === 'ready' ? 'Pattern preview ready' : ''}</span>
    </div>
    <div className="absolute top-14 left-3 right-3 z-20 flex items-center justify-between gap-2 text-[11px]">
      <button onClick={() => setMockupScene(mockupScene === 'floating-360' ? 'ghost' : 'floating-360')} aria-pressed={mockupScene === 'floating-360'}
        className="flex items-center gap-1 bg-[#151820]/90 text-slate-200 px-2 py-1.5 rounded-md"><RotateCcw className="w-3 h-3" />{mockupScene === 'floating-360' ? 'Stop rotation' : 'Rotate'}</button>
      <select aria-label="Preview lighting" value={lightingPreset} onChange={(e) => setLightingPreset(e.target.value as StudioLightingPreset)}
        className="bg-[#151820]/90 text-slate-200 rounded-md px-2 py-1.5">
        <option value="ecommerce-white">Soft studio</option><option value="moody-dark">Dark studio</option><option value="warm-editorial">Warm studio</option>
      </select>
    </div>
    {(status === 'empty' || status === 'unavailable' || status === 'error') && <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center px-8 text-center text-sm text-stone-500">
      {status === 'empty' ? 'Choose a garment or draw a pattern piece to see its 3D preview.' : errorMessage}
      {status === 'error' && <button onClick={() => useCloStore.getState().resetSimulation()} className="px-3 py-2 rounded-md bg-stone-200 text-stone-800">Rebuild preview</button>}
    </div>}
    <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-[#f4f2ed]/95 border-t border-stone-200 text-stone-600">
      <div className="flex items-center justify-between gap-2 text-[11px] mb-2">
        <span className="truncate">{pieces.find((piece) => piece.id === selectedPieceId)?.name || template?.name || 'Imported panels'} · drag to orbit</span>
        <button onClick={snapshot} disabled={status !== 'ready'} className="flex items-center gap-1 shrink-0 hover:text-stone-950 disabled:opacity-40"><Download className="w-3 h-3" />{saved ? 'Saved' : 'Save image'}</button>
      </div>
      {activeTemplateId === 'custom-pattern' && <p className="text-[10px] mb-2">Panel arrangement preview. Check roles and sewing connections; this does not verify garment fit.</p>}
      <div className="flex gap-1 text-[11px]">
        {(['front', 'back', 'angle'] as const).map((angle) => <button key={angle} onClick={() => cameraAngle(angle)} className="px-3 py-1.5 rounded-md hover:bg-stone-200 capitalize">{angle === 'angle' ? '3/4 view' : angle}</button>)}
        <button onClick={fitCamera} className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-stone-200"><Maximize2 className="w-3 h-3" />Fit</button>
      </div>
    </div>
    <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
  </div>;
};
