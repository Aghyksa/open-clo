import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Dispatch, PointerEvent, SetStateAction } from 'react';
import type { EdgeCurvature, PatternPiece, SeamEdge } from '../types/cad';
import { getSeamSegment, scaleGrainlineAngle } from './patternGeometry';

type Point = { x: number; y: number };
type View = { scale: number; offsetX: number; offsetY: number };
type DecalTransform = { position: Point; width: number; height: number; scale: number; rotation: number };

export function localPoint(point: Point, origin: Point, rotation: number): Point {
  const x = point.x - origin.x, y = point.y - origin.y;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  return { x: x * cos + y * sin, y: -x * sin + y * cos };
}

export function dragCurvature(initial: EdgeCurvature | null, delta: Point, rotation: number, weight: number): EdgeCurvature {
  const local = localPoint(delta, { x: 0, y: 0 }, rotation);
  return { cpx: (initial?.cpx ?? 0) + local.x / weight, cpy: (initial?.cpy ?? 0) + local.y / weight };
}

function edgePoint(a: Point, b: Point, curve: EdgeCurvature | undefined, t: number): Point {
  if (!curve) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const inverse = 1 - t, cx = (a.x + b.x) / 2 + curve.cpx, cy = (a.y + b.y) / 2 + curve.cpy;
  return { x: inverse * inverse * a.x + 2 * inverse * t * cx + t * t * b.x,
    y: inverse * inverse * a.y + 2 * inverse * t * cy + t * t * b.y };
}

function curveSteps(curve: EdgeCurvature | undefined): number {
  return curve ? Math.min(128, Math.max(8, Math.ceil(Math.sqrt(Math.hypot(curve.cpx, curve.cpy) * 2)))) : 1;
}

export function seamLocalPoints(piece: PatternPiece, edge: SeamEdge): Point[] {
  const segment = getSeamSegment(piece, edge);
  if (!segment) return [];
  const [a, b] = segment, curve = edge.internalLineId ? undefined : piece.edgeCurvatures?.[edge.edgeIndex];
  const steps = curveSteps(curve), start = edge.paramStart ?? 0, end = edge.paramEnd ?? 1;
  return Array.from({ length: steps + 1 }, (_, index) => edgePoint(a, b, curve, start + (end - start) * index / steps));
}

export function findPatternEdge(piece: PatternPiece, world: Point, threshold: number) {
  const point = localPoint(world, piece.position, piece.rotation);
  let closest: { edgeIndex: number; param: number; point: Point; distance: number } | null = null;
  for (let edgeIndex = 0; edgeIndex < piece.points.length; edgeIndex++) {
    const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % piece.points.length];
    const curve = piece.edgeCurvatures?.[edgeIndex], steps = curveSteps(curve);
    let previous: Point = a;
    for (let i = 1; i <= steps; i++) {
      const next = edgePoint(a, b, curve, i / steps), dx = next.x - previous.x, dy = next.y - previous.y;
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
        ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSquared));
      const param = (i - 1 + fraction) / steps, projected = edgePoint(a, b, curve, param);
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
      if (distance <= threshold && (!closest || distance < closest.distance)) closest = { edgeIndex, param, point: projected, distance };
      previous = next;
    }
  }
  return closest;
}

export function isPointInPattern(piece: PatternPiece, world: Point): boolean {
  const point = localPoint(world, piece.position, piece.rotation);
  let inside = false;
  for (let i = 0; i < piece.points.length; i++) {
    const a = piece.points[i], b = piece.points[(i + 1) % piece.points.length];
    const curve = piece.edgeCurvatures?.[i], steps = curveSteps(curve);
    let previous: Point = a;
    for (let j = 1; j <= steps; j++) {
      const next = edgePoint(a, b, curve, j / steps);
      if ((previous.y > point.y) !== (next.y > point.y)
        && point.x < (next.x - previous.x) * (point.y - previous.y) / (next.y - previous.y) + previous.x) inside = !inside;
      previous = next;
    }
  }
  return inside;
}

export function scalePatternShape(piece: Pick<PatternPiece, 'points' | 'edgeCurvatures' | 'internalLines' | 'cutting'>,
  scaleX: number, scaleY: number, anchor: Point) {
  const transform = <T extends Point>(point: T): T => ({ ...point,
    x: anchor.x + (point.x - anchor.x) * scaleX, y: anchor.y + (point.y - anchor.y) * scaleY });
  return {
    points: piece.points.map(transform),
    ...(piece.cutting ? { cutting: { ...piece.cutting, grainlineAngle: scaleGrainlineAngle(piece.cutting.grainlineAngle, scaleX, scaleY) } } : {}),
    edgeCurvatures: piece.edgeCurvatures && Object.fromEntries(Object.entries(piece.edgeCurvatures)
      .map(([edge, curve]) => [edge, { cpx: curve.cpx * scaleX, cpy: curve.cpy * scaleY }])),
    internalLines: piece.internalLines?.map((line) => ({ ...line, points: line.points.map(transform) })),
  };
}

export function isPointInDecal(decal: DecalTransform, center: Point, world: Point): boolean {
  const point = localPoint(world, { x: center.x + decal.position.x, y: center.y + decal.position.y }, decal.rotation * Math.PI / 180);
  return Math.abs(point.x) <= decal.width * decal.scale / 2 && Math.abs(point.y) <= decal.height * decal.scale / 2;
}

export function findDecalHandle(decal: DecalTransform, center: Point, world: Point, viewScale: number): string | null {
  const point = localPoint(world, { x: center.x + decal.position.x, y: center.y + decal.position.y }, decal.rotation * Math.PI / 180);
  const width = decal.width * decal.scale / 2, height = decal.height * decal.scale / 2;
  const handles = [{ id: 'rot', x: 0, y: -height - 20 / viewScale },
    { id: 'nw', x: -width, y: -height }, { id: 'ne', x: width, y: -height },
    { id: 'se', x: width, y: height }, { id: 'sw', x: -width, y: height }];
  return handles.find((handle) => Math.hypot(point.x - handle.x, point.y - handle.y) <= 11 / viewScale)?.id || null;
}

export function rotationDelta(angle: number, initialAngle: number): number {
  return Math.atan2(Math.sin(angle - initialAngle), Math.cos(angle - initialAngle));
}

export function getPinchView(view: View, initial: [Point, Point], current: [Point, Point], min: number, max: number): View {
  const distance = (points: [Point, Point]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const scale = Math.max(min, Math.min(max, view.scale * distance(current) / Math.max(1, distance(initial))));
  const ratio = scale / view.scale;
  return { scale, offsetX: (current[0].x + current[1].x) / 2 - ((initial[0].x + initial[1].x) / 2 - view.offsetX) * ratio,
    offsetY: (current[0].y + current[1].y) / 2 - ((initial[0].y + initial[1].y) / 2 - view.offsetY) * ratio };
}

type PointerOptions = {
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  minScale: number;
  maxScale: number;
  onDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onUp: () => void;
  onCancel: () => void;
};

export function useCanvasPointers(options: PointerOptions) {
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ view: View; points: [Point, Point] } | null>(null);
  const pinched = useRef(false);
  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const onPointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, canvasPoint(event));
    if (pointers.current.size >= 2) {
      latest.current.onCancel();
      pinched.current = true;
      pinch.current = { view: latest.current.view, points: [...pointers.current.values()].slice(0, 2) as [Point, Point] };
    } else if (!pinched.current) latest.current.onDown(event);
  }, []);
  const onPointerMove = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, canvasPoint(event));
    if (pinched.current) {
      if (pinch.current && pointers.current.size >= 2) {
        const { setView, minScale, maxScale } = latest.current;
        setView(getPinchView(pinch.current.view, pinch.current.points,
          [...pointers.current.values()].slice(0, 2) as [Point, Point], minScale, maxScale));
      }
      return;
    }
    latest.current.onMove(event);
  }, []);
  const onPointerUp = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (!pinched.current) latest.current.onUp();
    if (!pointers.current.size) { pinch.current = null; pinched.current = false; }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);
  const onPointerCancel = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    latest.current.onCancel();
    pinch.current = null;
    pinched.current = pointers.current.size > 0;
  }, []);
  useEffect(() => {
    const cancel = () => {
      if (pointers.current.size) latest.current.onCancel();
      pointers.current.clear(); pinch.current = null; pinched.current = false;
    };
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('blur', cancel); cancel(); };
  }, []);
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel };
}
