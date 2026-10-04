import type { AvatarConfig, PanelRole, PatternPiece } from '../types/cad';
import { getBodyScale, getNeckY } from './avatarBody';

export function getPanelPlacement(piece: PatternPiece, role: PanelRole | undefined, avatar: AvatarConfig): PatternPiece['placement'] {
  if (!role || role === 'other') return piece.placement;
  const scale = getBodyScale(avatar), referenceNeck = getNeckY(scale) / scale.y;
  const y = referenceNeck - 1.03;
  if (role === 'leftSleeve' || role === 'rightSleeve') {
    const side = role === 'leftSleeve' ? 1 : -1;
    return { origin3D: [side * Math.max(.3, .42 * scale.shoulder), y - .1, 0],
      rotation3D: [0, 0, -side * Math.PI / 4] };
  }
  if (role === 'hood') return { origin3D: [(Math.sign(piece.placement.origin3D[0]) || 1) * .11, y + .2, 0],
    rotation3D: [0, 0, 0], surface: 'hood' };
  const back = role === 'back' || role === 'waistBack';
  const waist = role === 'waistFront' || role === 'waistBack';
  return { origin3D: [0, waist ? 0 : role === 'pocket' ? y - .2 : y, back ? -.2 : .2],
    rotation3D: [0, back ? Math.PI : 0, 0],
    ...(waist ? { anchorY: referenceNeck - .37 } : {}) };
}
