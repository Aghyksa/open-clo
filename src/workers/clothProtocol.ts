import type { AvatarConfig, FabricMaterial, PatternPiece, SeamConnection } from '../types/cad';
import type { MeshGroup } from '../utils/patternMesh';

export type ClothWorkerRequest =
  | { type: 'build'; id: number; pieces: PatternPiece[]; seams: SeamConnection[];
      material: FabricMaterial; avatar: AvatarConfig; paused: boolean }
  | { type: 'pause'; id: number; paused: boolean }
  | { type: 'cancel'; id: number }
  | { type: 'recycle'; id: number; positions: Float32Array<ArrayBuffer> };

export type ClothWorkerResponse =
  | { type: 'mesh'; id: number; positions: Float32Array<ArrayBuffer>;
      uvs: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer>; groups: MeshGroup[] }
  | { type: 'frame'; id: number; positions: Float32Array<ArrayBuffer>; finished: boolean; settled: boolean }
  | { type: 'empty'; id: number }
  | { type: 'error'; id: number; message: string };
