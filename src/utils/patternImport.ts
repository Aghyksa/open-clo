import type { EdgeCurvature, PatternPiece, Point2D } from '../types/cad';
import { arrangePatternPieces, PATTERN_UNITS_PER_CM } from './patternGeometry';

export interface PatternImportCandidate {
  id: string;
  name: string;
  points: Point2D[];
  edgeCurvatures?: Record<number, EdgeCurvature>;
  widthCm: number;
  heightCm: number;
}

export interface PatternImportResult {
  candidates: PatternImportCandidate[];
  warnings: string[];
  widthMm?: number;
  heightMm?: number;
  hasPhysicalScale: boolean;
}

export type SvgMatrix = readonly [number, number, number, number, number, number];
export interface SvgPoint { x: number; y: number }
export interface SvgPathOutline { points: SvgPoint[]; closed: boolean }

const IDENTITY: SvgMatrix = [1, 0, 0, 1, 0, 0];
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_ELEMENTS = 20000;
const MAX_PANELS = 128;
const MAX_POINTS = 512;
const CURVE_ERROR_MM = 0.35;
const MERGE_DISTANCE_MM = .002;
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

export function multiplySvgMatrices(a: SvgMatrix, b: SvgMatrix): SvgMatrix {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}

export function transformSvgPoint(point: SvgPoint, matrix: SvgMatrix): SvgPoint {
  const x = matrix[0] * point.x + matrix[2] * point.y + matrix[4];
  const y = matrix[1] * point.x + matrix[3] * point.y + matrix[5];
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e8 || Math.abs(y) > 1e8) {
    throw new Error('Pattern coordinates are outside the supported range.');
  }
  return { x, y };
}

export function parseSvgLength(value?: string): { mm: number; physical: boolean } | null {
  if (!value) return null;
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(mm|cm|in|pt|pc|px)?\s*$/i.exec(value);
  if (!match) return null;
  const number = Number(match[1]), unit = (match[2] || 'px').toLowerCase();
  if (!Number.isFinite(number) || number <= 0 || number > 1e8) return null;
  const factors: Record<string, number> = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96 };
  return { mm: number * factors[unit], physical: unit !== 'px' };
}

function numbers(value: string): number[] {
  const result: number[] = [];
  let offset = 0;
  while (offset < value.length) {
    if (/[\s,]/.test(value[offset])) { offset++; continue; }
    NUMBER.lastIndex = offset;
    const match = NUMBER.exec(value);
    if (!match || !Number.isFinite(Number(match[0]))) throw new Error('Invalid SVG number.');
    result.push(Number(match[0])); offset = NUMBER.lastIndex;
    if (result.length > 2048) throw new Error('SVG number list is too complex.');
  }
  return result;
}

export function parseSvgTransform(value?: string): SvgMatrix {
  if (!value?.trim()) return IDENTITY;
  const operation = /([a-zA-Z]+)\s*\(([^()]*)\)/g;
  let matrix = IDENTITY, offset = 0, count = 0;
  for (const match of value.matchAll(operation)) {
    if (!/^[\s,]*$/.test(value.slice(offset, match.index))) throw new Error('Invalid SVG transform.');
    const args = numbers(match[2]); let next: SvgMatrix;
    switch (match[1]) {
      case 'matrix':
        if (args.length !== 6) throw new Error('SVG matrix needs six values.');
        next = args as unknown as SvgMatrix; break;
      case 'translate':
        if (args.length < 1 || args.length > 2) throw new Error('Invalid SVG translation.');
        next = [1, 0, 0, 1, args[0], args[1] || 0]; break;
      case 'scale':
        if (args.length < 1 || args.length > 2) throw new Error('Invalid SVG scale.');
        next = [args[0], 0, 0, args[1] ?? args[0], 0, 0]; break;
      case 'rotate': {
        if (args.length !== 1 && args.length !== 3) throw new Error('Invalid SVG rotation.');
        const radians = args[0] * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
        next = [c, s, -s, c, 0, 0];
        if (args.length === 3) next = multiplySvgMatrices(multiplySvgMatrices([1, 0, 0, 1, args[1], args[2]], next), [1, 0, 0, 1, -args[1], -args[2]]);
        break;
      }
      case 'skewX': case 'skewY': {
        if (args.length !== 1) throw new Error('Invalid SVG skew.');
        const tangent = Math.tan(args[0] * Math.PI / 180);
        next = match[1] === 'skewX' ? [1, 0, tangent, 1, 0, 0] : [1, tangent, 0, 1, 0, 0]; break;
      }
      default: throw new Error('Unsupported SVG transform.');
    }
    matrix = multiplySvgMatrices(matrix, next); offset = match.index! + match[0].length;
    if (++count > 64 || matrix.some((value) => !Number.isFinite(value) || Math.abs(value) > 1e8)) throw new Error('SVG transform is too complex.');
  }
  if (count === 0 || !/^[\s,]*$/.test(value.slice(offset))) throw new Error('Invalid SVG transform.');
  return matrix;
}

const midpoint = (a: SvgPoint, b: SvgPoint): SvgPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: SvgPoint, b: SvgPoint) => Math.hypot(a.x - b.x, a.y - b.y);
function chordDistance(point: SvgPoint, a: SvgPoint, b: SvgPoint) {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

export function flattenSvgCubic(a: SvgPoint, b: SvgPoint, c: SvgPoint, d: SvgPoint, tolerance = CURVE_ERROR_MM): SvgPoint[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error('Invalid curve tolerance.');
  const output: SvgPoint[] = [];
  const visit = (p0: SvgPoint, p1: SvgPoint, p2: SvgPoint, p3: SvgPoint, depth: number) => {
    if (Math.max(chordDistance(p1, p0, p3), chordDistance(p2, p0, p3)) <= tolerance) {
      output.push(p3);
      if (output.length > MAX_POINTS) throw new Error('A curved panel exceeds 512 points.');
      return;
    }
    if (depth >= 20) throw new Error('A curve cannot be flattened within the accuracy limit.');
    const p01 = midpoint(p0, p1), p12 = midpoint(p1, p2), p23 = midpoint(p2, p3);
    const p012 = midpoint(p01, p12), p123 = midpoint(p12, p23), middle = midpoint(p012, p123);
    visit(p0, p01, p012, middle, depth + 1); visit(middle, p123, p23, p3, depth + 1);
  };
  visit(a, b, c, d, 0); return output;
}

export function flattenSvgArc(start: SvgPoint, end: SvgPoint, rx: number, ry: number, rotation: number,
  largeArc: boolean, sweep: boolean, matrix: SvgMatrix = IDENTITY, tolerance = CURVE_ERROR_MM): SvgPoint[] {
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error('Invalid arc tolerance.');
  if (!rx || !ry || distance(start, end) < 1e-10) return [transformSvgPoint(end, matrix)];
  const angle = rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = (start.x - end.x) / 2, dy = (start.y - end.y) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const radii = (xp / rx) ** 2 + (yp / ry) ** 2;
  if (radii > 1) { const correction = Math.sqrt(radii); rx *= correction; ry *= correction; }
  const denominator = rx * rx * yp * yp + ry * ry * xp * xp;
  const factor = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0,
    (rx * rx * ry * ry - denominator) / denominator));
  const cxp = factor * rx * yp / ry, cyp = -factor * ry * xp / rx;
  const cx = cos * cxp - sin * cyp + (start.x + end.x) / 2;
  const cy = sin * cxp + cos * cyp + (start.y + end.y) / 2;
  const first = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx);
  const last = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx);
  let delta = last - first;
  if (sweep && delta < 0) delta += Math.PI * 2;
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  const matrixNorm = Math.hypot(matrix[0], matrix[1], matrix[2], matrix[3]);
  const radius = Math.max(rx, ry) * matrixNorm;
  const step = radius <= tolerance ? Math.PI / 2 : Math.min(Math.PI / 2, 2 * Math.acos(Math.max(-1, 1 - tolerance / radius)));
  const count = Math.max(1, Math.ceil(Math.abs(delta) / step));
  if (!Number.isFinite(count) || count > MAX_POINTS) throw new Error('An arc exceeds 512 points.');
  const output: SvgPoint[] = [];
  for (let i = 1; i <= count; i++) {
    const t = first + delta * i / count;
    output.push(transformSvgPoint({ x: cx + cos * rx * Math.cos(t) - sin * ry * Math.sin(t),
      y: cy + sin * rx * Math.cos(t) + cos * ry * Math.sin(t) }, matrix));
  }
  output[output.length - 1] = transformSvgPoint(end, matrix); return output;
}

export function parseSvgPath(source: string, matrix: SvgMatrix = IDENTITY, tolerance = CURVE_ERROR_MM): SvgPathOutline[] {
  let offset = 0, command = '', previous = '', current: SvgPoint = { x: 0, y: 0 };
  let start = current, cubicControl: SvgPoint | null = null, quadraticControl: SvgPoint | null = null;
  let outline: SvgPathOutline | null = null, operations = 0;
  const outlines: SvgPathOutline[] = [];
  const skip = () => { while (offset < source.length && /[\s,]/.test(source[offset])) offset++; };
  const read = (flag = false): number => {
    skip();
    if (flag) {
      const value = source[offset++];
      if (value !== '0' && value !== '1') throw new Error('Arc flags must be 0 or 1.');
      return Number(value);
    }
    NUMBER.lastIndex = offset; const match = NUMBER.exec(source);
    if (!match || !Number.isFinite(Number(match[0]))) throw new Error('Incomplete or invalid SVG path.');
    offset = NUMBER.lastIndex; return Number(match[0]);
  };
  const append = (point: SvgPoint) => {
    if (!outline) throw new Error('SVG paths must begin with a move.');
    if (!outline.points.length || distance(outline.points[outline.points.length - 1], point) > MERGE_DISTANCE_MM) outline.points.push(point);
    if (outline.points.length > MAX_POINTS + 1) throw new Error('A panel exceeds 512 points.');
  };
  while (true) {
    skip(); if (offset >= source.length) break;
    if (/[a-zA-Z]/.test(source[offset])) command = source[offset++];
    else if (!command || command.toUpperCase() === 'Z') throw new Error('Invalid SVG path command.');
    if (++operations > 20000) throw new Error('SVG path is too complex.');
    const upper = command.toUpperCase(), relative = command !== upper;
    if (outline?.closed && upper !== 'M') throw new Error('Separate path continuations after a close into their own panel outline.');
    const point = (): SvgPoint => { const x = read(), y = read(); return { x: x + (relative ? current.x : 0), y: y + (relative ? current.y : 0) }; };
    let endpoint: SvgPoint;
    switch (upper) {
      case 'M':
        current = point(); start = current; outline = { points: [transformSvgPoint(current, matrix)], closed: false };
        outlines.push(outline); command = relative ? 'l' : 'L'; break;
      case 'L': endpoint = point(); append(transformSvgPoint(endpoint, matrix)); current = endpoint; break;
      case 'H': endpoint = { x: read() + (relative ? current.x : 0), y: current.y }; append(transformSvgPoint(endpoint, matrix)); current = endpoint; break;
      case 'V': endpoint = { x: current.x, y: read() + (relative ? current.y : 0) }; append(transformSvgPoint(endpoint, matrix)); current = endpoint; break;
      case 'C': case 'S': {
        const first: SvgPoint = upper === 'C' ? point() : previous === 'C' || previous === 'S'
          ? { x: 2 * current.x - cubicControl!.x, y: 2 * current.y - cubicControl!.y } : current;
        const second = point(); endpoint = point();
        flattenSvgCubic(transformSvgPoint(current, matrix), transformSvgPoint(first, matrix),
          transformSvgPoint(second, matrix), transformSvgPoint(endpoint, matrix), tolerance).forEach(append);
        cubicControl = second; current = endpoint; break;
      }
      case 'Q': case 'T': {
        const control: SvgPoint = upper === 'Q' ? point() : previous === 'Q' || previous === 'T'
          ? { x: 2 * current.x - quadraticControl!.x, y: 2 * current.y - quadraticControl!.y } : current;
        endpoint = point();
        const first = { x: current.x + (control.x - current.x) * 2 / 3, y: current.y + (control.y - current.y) * 2 / 3 };
        const second = { x: endpoint.x + (control.x - endpoint.x) * 2 / 3, y: endpoint.y + (control.y - endpoint.y) * 2 / 3 };
        flattenSvgCubic(transformSvgPoint(current, matrix), transformSvgPoint(first, matrix),
          transformSvgPoint(second, matrix), transformSvgPoint(endpoint, matrix), tolerance).forEach(append);
        quadraticControl = control; current = endpoint; break;
      }
      case 'A': {
        const rx = read(), ry = read(), rotation = read(), large = read(true), sweep = read(true); endpoint = point();
        flattenSvgArc(current, endpoint, rx, ry, rotation, !!large, !!sweep, matrix, tolerance).forEach(append);
        current = endpoint; break;
      }
      case 'Z':
        if (!outline) throw new Error('SVG paths must begin with a move.');
        outline.closed = true; current = start;
        if (outline.points.length > 1 && distance(outline.points[0], outline.points[outline.points.length - 1]) <= MERGE_DISTANCE_MM) outline.points.pop();
        break;
      default: throw new Error(`Unsupported SVG path command ${command}.`);
    }
    if (upper !== 'C' && upper !== 'S') cubicControl = null;
    if (upper !== 'Q' && upper !== 'T') quadraticControl = null;
    previous = upper;
    if (outlines.length > 32) throw new Error('A path contains too many compound outlines.');
  }
  return outlines;
}

interface SvgElement { tag: string; attrs: Record<string, string>; children: SvgElement[]; text?: string }
function decodeXml(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_match, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (entity[0] !== '#') return named[entity.toLowerCase()];
    const code = parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
  });
}

// Read only element names and quoted attributes; SVG content is never rendered or evaluated.
function parseSvgElements(source: string): { root: SvgElement; definitions: Map<string, SvgElement>; styles: SvgElement[] } {
  const stack: SvgElement[] = [], definitions = new Map<string, SvgElement>(), styles: SvgElement[] = [];
  let root: SvgElement | null = null, offset = 0, count = 0;
  if (/<!ENTITY\b/i.test(source)) throw new Error('SVG entity declarations are not supported.');
  while (offset < source.length) {
    const opening = source.indexOf('<', offset);
    const content = source.slice(offset, opening < 0 ? source.length : opening);
    if (!stack.length && content.trim()) throw new Error('Choose a valid SVG document.');
    if (stack[stack.length - 1]?.tag === 'style') stack[stack.length - 1].text = (stack[stack.length - 1].text || '') + content;
    if (opening < 0) break;
    if (source.startsWith('<!--', opening) || source.startsWith('<![CDATA[', opening) || source.startsWith('<?', opening)) {
      const ending = source.startsWith('<!--', opening) ? '-->' : source.startsWith('<![CDATA[', opening) ? ']]>' : '?>';
      const end = source.indexOf(ending, opening + 2); if (end < 0) throw new Error('Incomplete SVG markup.');
      if (ending === ']]>' && stack[stack.length - 1]?.tag === 'style') stack[stack.length - 1].text = (stack[stack.length - 1].text || '') + source.slice(opening + 9, end);
      offset = end + ending.length; continue;
    }
    let end = opening + 1, quote = '', bracket = 0;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '[') bracket++;
      else if (char === ']') bracket--;
      else if (char === '>' && bracket === 0) break;
    }
    if (end === source.length) throw new Error('Incomplete SVG markup.');
    const token = source.slice(opening + 1, end).trim(); offset = end + 1;
    if (/^!DOCTYPE\b/i.test(token)) continue;
    if (token.startsWith('!')) throw new Error('Unsupported SVG declaration.');
    if (token.startsWith('/')) {
      const tag = token.slice(1).trim().split(':').pop()!;
      if (!stack.length || stack.pop()!.tag !== tag) throw new Error('SVG elements are not correctly closed.');
      continue;
    }
    const match = /^([\w:.-]+)([\s\S]*?)(\/)?$/.exec(token);
    if (!match) throw new Error('Invalid SVG element.');
    const element: SvgElement = { tag: match[1].split(':').pop()!, attrs: Object.create(null), children: [] };
    const attrPattern = /([\w:.-]+)\s*=\s*("[^"]*"|'[^']*')/y;
    let attrOffset = 0;
    while (attrOffset < match[2].length) {
      while (attrOffset < match[2].length && /\s/.test(match[2][attrOffset])) attrOffset++;
      if (attrOffset === match[2].length) break;
      attrPattern.lastIndex = attrOffset;
      const attr = attrPattern.exec(match[2]);
      if (!attr) throw new Error('Invalid SVG attribute.');
      if (Object.hasOwn(element.attrs, attr[1])) throw new Error('Duplicate SVG attribute.');
      element.attrs[attr[1]] = decodeXml(attr[2].slice(1, -1)); attrOffset = attrPattern.lastIndex;
    }
    if (++count > MAX_ELEMENTS || stack.length > 64) throw new Error('SVG document is too complex.');
    if (stack.length) stack[stack.length - 1].children.push(element);
    else if (root) throw new Error('SVG document must contain one root.');
    else root = element;
    if (element.attrs.id && !definitions.has(element.attrs.id)) definitions.set(element.attrs.id, element);
    if (element.tag === 'style') styles.push(element);
    if (!match[3]) stack.push(element);
  }
  if (!root || root.tag !== 'svg' || stack.length) throw new Error('Choose a valid SVG document.');
  return { root, definitions, styles };
}

function svgCoordinate(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(mm|cm|in|pt|pc|px)?\s*$/i.exec(value);
  if (!match || !Number.isFinite(Number(match[1]))) throw new Error('Unsupported SVG coordinate units.');
  const factors: Record<string, number> = { mm: 96 / 25.4, cm: 960 / 25.4, in: 96, pt: 96 / 72, pc: 16, px: 1 };
  return Number(match[1]) * factors[(match[2] || 'px').toLowerCase()];
}

function svgGeometry(element: SvgElement, matrix: SvgMatrix): SvgPathOutline[] {
  if (element.tag === 'path') return parseSvgPath(element.attrs.d || '', matrix);
  if (element.tag === 'polygon' || element.tag === 'polyline') {
    const values = numbers(element.attrs.points || '');
    if (values.length % 2) throw new Error('A polygon has incomplete coordinates.');
    const points = [];
    for (let i = 0; i < values.length; i += 2) {
      const point = transformSvgPoint({ x: values[i], y: values[i + 1] }, matrix);
      if (!points.length || distance(points[points.length - 1], point) > MERGE_DISTANCE_MM) points.push(point);
    }
    if (points.length > 1 && distance(points[0], points[points.length - 1]) <= MERGE_DISTANCE_MM) points.pop();
    return [{ points, closed: element.tag === 'polygon' }];
  }
  if (element.tag === 'rect') {
    const x = svgCoordinate(element.attrs.x), y = svgCoordinate(element.attrs.y);
    const width = svgCoordinate(element.attrs.width, NaN), height = svgCoordinate(element.attrs.height, NaN);
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('Invalid SVG rectangle.');
    const rx = Math.min(width / 2, Math.max(0, svgCoordinate(element.attrs.rx ?? element.attrs.ry)));
    const ry = Math.min(height / 2, Math.max(0, svgCoordinate(element.attrs.ry ?? element.attrs.rx)));
    if (rx && ry) return parseSvgPath(`M${x + rx} ${y} H${x + width - rx} A${rx} ${ry} 0 0 1 ${x + width} ${y + ry} V${y + height - ry} A${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height} H${x + rx} A${rx} ${ry} 0 0 1 ${x} ${y + height - ry} V${y + ry} A${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`, matrix);
    return [{ points: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }].map((point) => transformSvgPoint(point, matrix)), closed: true }];
  }
  return [];
}

export function parsePatternSvg(source: string, overrideWidthMm?: number): PatternImportResult {
  if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) throw new Error('Choose an SVG smaller than 12 MB.');
  if (overrideWidthMm !== undefined && (!Number.isFinite(overrideWidthMm) || overrideWidthMm <= 0 || overrideWidthMm > 100000)) throw new Error('Enter a valid document width in millimeters.');
  const { root, definitions, styles } = parseSvgElements(source), counts = new Map<string, number>();
  if (styles.some((element) => /(?:^|[;{])\s*(?:transform|clip-path|mask|width|height|d)\s*:/i.test(element.text || ''))) {
    throw new Error('SVG stylesheets change geometry or scale. Expand styles into plain vector outlines before importing.');
  }
  const warn = (message: string) => counts.set(message, (counts.get(message) || 0) + 1);
  const width = parseSvgLength(root.attrs.width), height = parseSvgLength(root.attrs.height);
  const viewBox = root.attrs.viewBox ? numbers(root.attrs.viewBox) : null;
  if (viewBox && (viewBox.length !== 4 || viewBox[2] <= 0 || viewBox[3] <= 0)) throw new Error('Invalid SVG viewBox.');
  let widthMm = width?.mm, heightMm = height?.mm;
  let physical = !!width?.physical || !!height?.physical;
  const pixelMm = 25.4 / 96;
  let matrix: SvgMatrix = IDENTITY;
  if (viewBox) {
    if (width?.physical && !height) heightMm = width.mm * viewBox[3] / viewBox[2];
    if (height?.physical && !width) widthMm = height.mm * viewBox[2] / viewBox[3];
    widthMm ??= viewBox[2] * pixelMm; heightMm ??= viewBox[3] * pixelMm;
    if (overrideWidthMm !== undefined) { heightMm *= overrideWidthMm / widthMm; widthMm = overrideWidthMm; physical = true; }
    const sx = widthMm / viewBox[2], sy = heightMm / viewBox[3];
    const aspect = (root.attrs.preserveAspectRatio || 'xMidYMid meet').trim();
    if (aspect === 'none') matrix = [sx, 0, 0, sy, -viewBox[0] * sx, -viewBox[1] * sy];
    else {
      const match = /^(?:defer\s+)?(xMin|xMid|xMax)(YMin|YMid|YMax)(?:\s+(meet|slice))?$/.exec(aspect);
      if (!match || match[3] === 'slice') throw new Error('SVG viewport cropping is unsupported. Export with preserveAspectRatio="none" or "meet".');
      const scale = Math.min(sx, sy), alignX = match[1] === 'xMin' ? 0 : match[1] === 'xMid' ? .5 : 1;
      const alignY = match[2] === 'YMin' ? 0 : match[2] === 'YMid' ? .5 : 1;
      matrix = [scale, 0, 0, scale, (widthMm - viewBox[2] * scale) * alignX - viewBox[0] * scale,
        (heightMm - viewBox[3] * scale) * alignY - viewBox[1] * scale];
    }
  } else {
    if (overrideWidthMm !== undefined && !width) throw new Error('This SVG needs a viewBox or document width to calibrate its scale.');
    const scale = overrideWidthMm !== undefined ? pixelMm * overrideWidthMm / width!.mm : pixelMm;
    if (overrideWidthMm !== undefined) { heightMm = heightMm === undefined ? undefined : heightMm * overrideWidthMm / width!.mm; widthMm = overrideWidthMm; physical = true; }
    matrix = [scale, 0, 0, scale, 0, 0];
  }
  if (!physical) warn('This SVG uses pixels or unspecified units. Confirm the document width before using it as a full-size pattern.');
  const candidates: PatternImportCandidate[] = [];
  let visited = 0;
  const skipTags = new Set(['defs', 'clipPath', 'mask', 'pattern', 'marker', 'linearGradient', 'radialGradient', 'metadata', 'title', 'desc']);
  const visit = (element: SvgElement, parent: SvgMatrix, label: string, references: Set<SvgElement>, depth: number) => {
    if (++visited > MAX_ELEMENTS || depth > 64) throw new Error('Expanded SVG document is too complex.');
    const attrs = element.attrs, style = attrs.style || '';
    if (skipTags.has(element.tag)) return;
    if (attrs['data-export-background'] || attrs['data-calibration']) return;
    if (element.tag === 'script' || element.tag === 'foreignObject' || element.tag === 'image' || element.tag === 'text' || element.tag === 'style') {
      warn('Text, images, stylesheets, and active SVG content are skipped; only panel outlines are imported.'); return;
    }
    if (attrs.display === 'none' || attrs.visibility === 'hidden' || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)) return;
    if (attrs['clip-path'] || attrs.mask || /(?:^|;)\s*(?:clip-path|mask|transform)\s*:/i.test(style)) {
      warn('Clipped, masked, or CSS-transformed geometry is skipped. Expand it into plain vector outlines first.'); return;
    }
    if (element.tag === 'svg' && element !== root || element.tag === 'symbol') {
      warn('Nested viewports and symbols are skipped. Expand them into plain vector outlines first.'); return;
    }
    const name = attrs['inkscape:label'] || attrs['data-name'] || (element.tag === 'g' ? attrs.id : '') || label;
    let transformed: SvgMatrix;
    try { transformed = multiplySvgMatrices(parent, parseSvgTransform(attrs.transform)); }
    catch (error) { warn((error as Error).message); return; }
    if (element.tag === 'use') {
      const href = attrs.href || attrs['xlink:href'];
      if (!href?.startsWith('#') || !definitions.has(href.slice(1))) { warn('External or missing SVG references are skipped.'); return; }
      const referenced = definitions.get(href.slice(1))!;
      if (references.has(referenced)) { warn('Circular SVG references are skipped.'); return; }
      let x: number, y: number;
      try { x = svgCoordinate(attrs.x); y = svgCoordinate(attrs.y); }
      catch { warn('Invalid SVG use position is skipped.'); return; }
      visit(referenced, multiplySvgMatrices(transformed, [1, 0, 0, 1, x, y]), name || attrs.id || label, new Set([...references, referenced]), depth + 1); return;
    }
    if (['path', 'polygon', 'polyline', 'rect'].includes(element.tag)) {
      if (candidates.length >= MAX_PANELS) { warn('Only the first 128 panel outlines are available; split larger files before importing.'); return; }
      try {
        const outlines = svgGeometry(element, transformed), closed = outlines.filter((outline) => outline.closed);
        if (outlines.some((outline) => !outline.closed)) warn('Open paths are skipped. Close the panel outline in your vector editor first.');
        if (closed.length > 1) { warn('Compound paths with multiple outlines or holes are skipped. Separate each panel into one closed outline first.'); return; }
        const points = closed[0]?.points; if (!points) return;
        if (points.length < 3 || points.length > MAX_POINTS) throw new Error('A panel needs 3 to 512 points.');
        const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2, unitsPerMm = PATTERN_UNITS_PER_CM / 10;
        let area = 0;
        for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; area += a.x * b.y - b.x * a.y; }
        if (Math.abs(area) < .1 || maxX - minX < .1 || maxY - minY < .1) throw new Error('Outlines without usable panel area are skipped.');
        const centered = points.map((point, index) => ({ id: `point-${index}`, x: (point.x - centerX) * unitsPerMm, y: (point.y - centerY) * unitsPerMm }));
        if (centered.some((point) => Math.abs(point.x) > 3600 || Math.abs(point.y) > 3600)) throw new Error('A panel exceeds the supported 12-meter size.');
        candidates.push({ id: `svg-panel-${candidates.length + 1}`, name: (attrs['inkscape:label'] || attrs['data-name'] || attrs.id || name || `Panel ${candidates.length + 1}`).slice(0, 120),
          points: centered, widthCm: (maxX - minX) / 10, heightCm: (maxY - minY) / 10 });
      } catch (error) { warn((error as Error).message); }
      return;
    }
    if (element.tag === 'circle' || element.tag === 'ellipse' || element.tag === 'line') { warn('Circles, ellipses, and lines are skipped. Convert panel shapes to closed paths first.'); return; }
    if (element.tag !== 'svg' && element.tag !== 'g' && element.tag !== 'a') {
      warn('Unsupported SVG elements are skipped. Expand panel shapes into plain vector outlines first.'); return;
    }
    for (const child of element.children) visit(child, transformed, name, references, depth + 1);
  };
  visit(root, matrix, '', new Set(), 0);
  const warnings = [...counts].map(([message, count]) => count > 1 ? `${message} (${count} items)` : message);
  warnings.push('SVG imports contain unsewn panel outlines. Assign panel roles and connect sewing edges before checking a garment in 3D.');
  return { candidates, warnings, widthMm: physical ? widthMm : undefined, heightMm: physical ? heightMm : undefined, hasPhysicalScale: physical };
}

export function candidatesToPatternPieces(candidates: PatternImportCandidate[]): PatternPiece[] {
  if (candidates.length < 1 || candidates.length > MAX_PANELS) throw new Error('Select between 1 and 128 panels.');
  const pieces = candidates.map((candidate, index): PatternPiece => {
    if (candidate.points.length < 3 || candidate.points.length > MAX_POINTS
      || candidate.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 3600 || Math.abs(point.y) > 3600)) {
      throw new Error('Selected panel geometry is invalid.');
    }
    return { id: `piece-import-${crypto.randomUUID()}`, name: candidate.name.trim().slice(0, 120) || `Panel ${index + 1}`,
      points: candidate.points.map((point, pointIndex) => ({ ...point, id: `point-${pointIndex}` })),
      edgeCurvatures: candidate.edgeCurvatures, position: { x: 0, y: 0 }, rotation: 0,
      placement: { origin3D: [0, 1.1, .15], rotation3D: [0, 0, 0] } };
  });
  const arranged = arrangePatternPieces(pieces);
  if (arranged.some((piece) => Math.abs(piece.position.x) > 100000 || Math.abs(piece.position.y) > 100000)) {
    throw new Error('The selected panel layout is too large. Split it into smaller designs.');
  }
  return arranged;
}
