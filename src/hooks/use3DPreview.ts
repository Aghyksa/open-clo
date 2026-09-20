import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { useCloStore } from '../store/useCloStore';
import type { FabricMaterial } from '../types/cad';

export type Display3DMode = 'garment-only' | 'porcelain-avatar' | 'ghost-mannequin';

export interface Use3DPreviewReturn {
  // Mode & Display
  displayMode: Display3DMode;
  setDisplayMode: (mode: Display3DMode) => void;
  // Turntable Auto-Rotation
  turntableActive: boolean;
  toggleTurntable: () => void;
  turntableSpeed: number;
  setTurntableSpeed: (speed: number) => void;
  // Camera Presets
  cameraPreset: 'front' | 'back' | 'side' | 'perspective';
  setCameraPreset: (preset: 'front' | 'back' | 'side' | 'perspective') => void;
  // Studio Lighting
  lightingPreset: 'studio' | 'softbox' | 'dramatic' | 'clean';
  setLightingPreset: (preset: 'studio' | 'softbox' | 'dramatic' | 'clean') => void;
  // Render Snapshot Hook
  captureMockupSnapshot: (renderer: THREE.WebGLRenderer | null) => string | null;
  // Garment Metadata
  activeFabric: FabricMaterial;
  piecesCount: number;
  seamsCount: number;
}

/**
 * Hook to drive the 3D Fashion Mockup & Product Presentation Studio.
 * Bridges 2D CAD design data into high-quality static 3D garment visualization.
 */
export function use3DPreview(): Use3DPreviewReturn {
  const {
    pieces,
    seams,
    currentMaterial,
    cameraPreset,
    setCameraPreset,
  } = useCloStore();

  const [displayMode, setDisplayMode] = useState<Display3DMode>('porcelain-avatar');
  const [turntableActive, setTurntableActive] = useState<boolean>(false);
  const [turntableSpeed, setTurntableSpeed] = useState<number>(0.8);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'softbox' | 'dramatic' | 'clean'>('studio');

  const toggleTurntable = useCallback(() => {
    setTurntableActive((prev) => !prev);
  }, []);

  const captureMockupSnapshot = useCallback((renderer: THREE.WebGLRenderer | null): string | null => {
    if (!renderer) return null;
    try {
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `openclo-3d-mockup-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      return dataUrl;
    } catch (err) {
      console.error('Failed to capture 3D mockup snapshot:', err);
      return null;
    }
  }, []);

  return {
    displayMode,
    setDisplayMode,
    turntableActive,
    toggleTurntable,
    turntableSpeed,
    setTurntableSpeed,
    cameraPreset,
    setCameraPreset,
    lightingPreset,
    setLightingPreset,
    captureMockupSnapshot,
    activeFabric: currentMaterial,
    piecesCount: pieces.length,
    seamsCount: seams.length,
  };
}
