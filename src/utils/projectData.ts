import type { CloProject, PatternPiece, SeamEdge, GraphicDecal, FabricMaterial } from '../types/cad';
import { GARMENT_TEMPLATES, FABRIC_PRESETS, GRAPHIC_PRESETS, STITCH_PRESETS } from './patternPresets';
import { arrangePatternPieces } from './patternGeometry';

export function createDefaultProject(templateId = 'uniqlo-u-boxy-tee', name?: string): CloProject {
  const tmpl = GARMENT_TEMPLATES.find((t) => t.id === templateId) || GARMENT_TEMPLATES[0];
  const data = tmpl.generator();
  const fabric = FABRIC_PRESETS.find((f) => f.id === tmpl.recommendedFabric) || FABRIC_PRESETS[0];
  const defaultCol = tmpl.recommendedColor || '#262626';

  return {
    schemaVersion: 1,
    id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name || `${tmpl.name} Studio`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    templateId: tmpl.id,
    pieces: arrangePatternPieces(data.pieces),
    seams: data.seams,
    currentMaterial: fabric,
    customColor: defaultCol,
    colorZones: {
      body: defaultCol,
      collar: defaultCol,
      sleeves: defaultCol,
      leftSleeve: defaultCol,
      rightSleeve: defaultCol,
      pocket: defaultCol,
      hem: defaultCol,
      cuffs: defaultCol,
      hood: defaultCol,
    },
    decals: [
      {
        id: 'decal-tokyo-default',
        type: 'preset',
        name: 'Tokyo Archive Box Stamp',
        content: 'tokyo-box-logo',
        position: { x: 0, y: -25 },
        scale: 1,
        rotation: 0,
        viewTarget: 'front',
        blendMode: 'normal',
        opacity: 0.95,
        width: 140,
        height: 42,
      },
    ],
    mockupScene: 'ghost',
    canvasViewMode: 'pieces',
    avatar: {
      gender: 'female',
      height: 175,
      chestCircumference: 92,
      waistCircumference: 68,
      hipsCircumference: 96,
      shoulderWidth: 40,
      showSkin: true,
    },
    avatar2D: {
      visible: false,
      view: 'front',
      opacity: 0.35,
      showGuides: true,
      position: { x: 300, y: 260 },
    },
    stitchSettings: {
      defaultType: 'single-needle',
      defaultColor: '#f8fafc',
      showStitches: true,
      seamAllowanceMm: 12,
    },
  };
}

export const MAX_BACKUP_BYTES = 24 * 1024 * 1024;
const colorKeys = ['body', 'collar', 'sleeves', 'leftSleeve', 'rightSleeve', 'pocket', 'hem', 'cuffs', 'hood'];

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function number(value: unknown, fallback: number, label: string, min = -100000, max = 100000): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} is outside the supported range.`);
  return value;
}

function text(value: unknown, fallback: string, label: string, max = 120): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) throw new Error(`${label} is missing or too long.`);
  return value.trim();
}

function color(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error('Colors must use a six-digit hex value.');
  return value;
}

function array(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must be a list with at most ${max} items.`);
  return value;
}

function uniqueIds(items: { id: string }[], label: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`${label} contain duplicate IDs.`);
}

function point(value: unknown, index: number) {
  const item = record(value, 'Pattern point');
  return { id: text(item.id, `point-${index}`, 'Point ID'), x: number(item.x, NaN, 'Point X', -3600, 3600),
    y: number(item.y, NaN, 'Point Y', -3600, 3600) };
}

export function normalizePatternPiece(value: unknown, index = 0): PatternPiece {
  const item = record(value, 'Pattern piece');
  const points = array(item.points, 'Pattern points', 512).map(point);
  if (points.length < 3 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Each pattern needs at least three valid points.');
  uniqueIds(points, 'Pattern points');
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.001) throw new Error('Pattern edges must have a positive length.');
    area += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(area) < 0.01) throw new Error('The pattern outline has no usable area.');
  const position = item.position === undefined ? {} : record(item.position, 'Pattern position');
  const edgeCurvatures: NonNullable<PatternPiece['edgeCurvatures']> = {};
  if (item.edgeCurvatures) for (const [edge, value] of Object.entries(record(item.edgeCurvatures, 'Curves'))) {
    const index = Number(edge), curve = record(value, 'Edge curve');
    if (!Number.isInteger(index) || index < 0 || index >= points.length) throw new Error('A curve refers to a missing edge.');
    edgeCurvatures[index] = { cpx: number(curve.cpx, 0, 'Curve X', -3600, 3600), cpy: number(curve.cpy, 0, 'Curve Y', -3600, 3600) };
  }
  const placement = item.placement === undefined ? null : record(item.placement, '3D placement');
  const vector = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
    if (value === undefined) return fallback;
    const list = array(value, '3D coordinates', 3);
    if (list.length !== 3) throw new Error('3D coordinates need three values.');
    return list.map((n) => number(n, 0, '3D coordinate', -10, 10)) as [number, number, number];
  };
  const internalLines = item.internalLines === undefined ? undefined : array(item.internalLines, 'Internal lines', 64).map((value, i) => {
    const line = record(value, 'Internal line');
    const type = line.type as 'dart' | 'fold' | 'cut' | 'pocket';
    if (!['dart', 'fold', 'cut', 'pocket'].includes(type)) throw new Error('Unsupported internal line type.');
    const linePoints = array(line.points, 'Internal line points', 128).map(point);
    if (linePoints.length < 2) throw new Error('Internal lines need at least two points.');
    return { id: text(line.id, `line-${i}`, 'Internal line ID'), type, points: linePoints };
  });
  if (internalLines) uniqueIds(internalLines, 'Internal lines');
  let cutting: PatternPiece['cutting'];
  if (item.cutting !== undefined) {
    const details = record(item.cutting, 'Cutting details');
    const quantity = number(details.quantity, 1, 'Cut quantity', 1, 20);
    if (!Number.isInteger(quantity)) throw new Error('Cut quantity needs a whole number.');
    cutting = { quantity, onFold: details.onFold === true,
      grainlineAngle: number(details.grainlineAngle, 0, 'Grainline angle', -360, 360),
      seamAllowanceMm: number(details.seamAllowanceMm, 0, 'Panel allowance', 0, 100),
      notches: array(details.notches ?? [], 'Notches', 64).map((value) => {
        const notch = record(value, 'Notch');
        const edgeIndex = number(notch.edgeIndex, NaN, 'Notch edge', 0, points.length - 1);
        if (!Number.isInteger(edgeIndex) || (notch.count !== 1 && notch.count !== 2)) throw new Error('A notch needs an existing edge and one or two marks.');
        return { edgeIndex, param: number(notch.param, .5, 'Notch position', 0, 1), count: notch.count as 1 | 2 };
      }) };
  }
  const roles = ['front', 'back', 'leftSleeve', 'rightSleeve', 'hood', 'pocket', 'waistFront', 'waistBack', 'other'];
  if (item.role !== undefined && !roles.includes(item.role as string)) throw new Error('Unsupported panel placement role.');
  return { id: text(item.id, `piece-${index}`, 'Piece ID'), name: text(item.name, `Panel ${index + 1}`, 'Piece name'), points,
    position: { x: number(position.x, index * 150, 'Position X'), y: number(position.y, 100, 'Position Y') },
    rotation: number(item.rotation, 0, 'Pattern rotation'), color: color(item.color, '#94a3b8'),
    locked: item.locked === true, visible: item.visible !== false, edgeCurvatures, internalLines, cutting,
    ...(item.role === undefined ? {} : { role: item.role as PatternPiece['role'] }),
    placement: placement ? { origin3D: vector(placement.origin3D, [0, 1.1, 0.15]), rotation3D: vector(placement.rotation3D, [0, 0, 0]),
      ...(placement.anchorY === undefined ? {} : { anchorY: number(placement.anchorY, 0, 'Anchor height', 0, 3) }),
      ...(placement.surface === 'hood' ? { surface: 'hood' as const } : {}) } : { origin3D: [0, 1.1, 0.15], rotation3D: [0, 0, 0] },
    ...(item.graphics === undefined ? {} : { graphics: array(item.graphics, 'Pattern graphics', 32).map((value, i) => {
      const g = record(value, 'Pattern graphic');
      if (!['text', 'logo', 'shape'].includes(g.type as string)) throw new Error('Unsupported pattern graphic.');
      return { id: text(g.id, `graphic-${i}`, 'Graphic ID'), name: text(g.name, 'Graphic', 'Graphic name'), type: g.type as 'text' | 'logo' | 'shape',
        content: text(g.content, 'Graphic', 'Graphic content', 500), x: number(g.x, 0, 'Graphic X'), y: number(g.y, 0, 'Graphic Y'),
        scale: number(g.scale, 1, 'Graphic scale', 0.01, 20), rotation: number(g.rotation, 0, 'Graphic rotation'),
        color: color(g.color, '#ffffff'), fontSize: number(g.fontSize, 24, 'Font size', 6, 200), opacity: number(g.opacity, 1, 'Opacity', 0, 1) };
    }) }) };
}

function graphic(value: unknown, index: number): GraphicDecal {
  const item = record(value, 'Artwork');
  if (!['preset', 'text', 'image'].includes(item.type as string)) throw new Error('Unsupported artwork type.');
  const content = text(item.content, '', 'Artwork content', item.type === 'image' ? 2 * 1024 * 1024 : 500);
  if (item.type === 'preset' && !GRAPHIC_PRESETS.some((preset) => preset.id === content)) throw new Error('Unknown artwork preset.');
  if (item.type === 'image' && !/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/i.test(content)) throw new Error('Artwork images must be included in the project file.');
  const position = item.position === undefined ? {} : record(item.position, 'Artwork position');
  const target = item.viewTarget ?? 'front';
  if (!['front', 'back', 'leftSleeve', 'rightSleeve'].includes(target as string)) throw new Error('Unsupported artwork target.');
  const blend = item.blendMode ?? 'normal';
  if (!['normal', 'multiply', 'screen', 'overlay'].includes(blend as string)) throw new Error('Unsupported artwork blend mode.');
  const font = item.fontProps === undefined ? null : record(item.fontProps, 'Typography');
  return { id: text(item.id, `artwork-${index}`, 'Artwork ID'), name: text(item.name, 'Artwork', 'Artwork name'),
    type: item.type as GraphicDecal['type'], content, position: { x: number(position.x, 0, 'Artwork X', -2000, 2000), y: number(position.y, 0, 'Artwork Y', -2000, 2000) },
    scale: number(item.scale, 1, 'Artwork scale', 0.01, 20), rotation: number(item.rotation, 0, 'Artwork rotation'),
    viewTarget: target as GraphicDecal['viewTarget'], blendMode: blend as GraphicDecal['blendMode'], opacity: number(item.opacity, 1, 'Artwork opacity', 0, 1),
    width: number(item.width, 140, 'Artwork width', 1, 2000), height: number(item.height, 42, 'Artwork height', 1, 2000),
    ...(font ? { fontProps: { fontFamily: text(font.fontFamily, 'sans-serif', 'Font family', 256), fontWeight: text(font.fontWeight, 'bold', 'Font weight', 30),
      fontSize: number(font.fontSize, 24, 'Font size', 6, 200), letterSpacing: number(font.letterSpacing, 0, 'Letter spacing', -5, 30),
      arcCurvature: Math.abs(number(font.arcCurvature, 0, 'Text curve', -50, 50)) > 1 ? Number(font.arcCurvature) / 50 : Number(font.arcCurvature || 0), color: color(font.color, '#ffffff') } } : {}) };
}

export function normalizeProject(value: unknown): CloProject {
  const item = record(value, 'Project');
  if (item.schemaVersion !== undefined && item.schemaVersion !== 1) throw new Error('This project uses an unsupported file version.');
  const templateId = typeof item.activeTemplateId === 'string' ? item.activeTemplateId : item.templateId;
  const template = GARMENT_TEMPLATES.find((template) => template.id === templateId);
  const defaults = createDefaultProject(template?.id || 'tshirt', 'Imported design');
  const pieces = array(item.pieces, 'Pattern pieces', 128).map(normalizePatternPiece);
  if (pieces.length === 0) throw new Error('A project needs at least one pattern piece.');
  uniqueIds(pieces, 'Pattern pieces');
  const piecesById = new Map(pieces.map((piece) => [piece.id, piece]));
  const seamEdge = (value: unknown): SeamEdge => {
    const edge = record(value, 'Seam edge'), pieceId = text(edge.pieceId, '', 'Seam piece ID');
    const piece = piecesById.get(pieceId);
    if (!piece) throw new Error('A seam refers to a missing pattern piece.');
    const internalLineId = edge.internalLineId === undefined ? undefined : text(edge.internalLineId, '', 'Internal line ID');
    const line = internalLineId ? piece.internalLines?.find((line) => line.id === internalLineId) : null;
    if (internalLineId && !line) throw new Error('A seam refers to a missing internal line.');
    const edgeIndex = number(edge.edgeIndex, NaN, 'Seam edge index', 0, (line ? line.points.length - 1 : piece.points.length) - 1);
    if (!Number.isInteger(edgeIndex)) throw new Error('A seam refers to a missing edge.');
    return { pieceId, edgeIndex, internalLineId,
      ...(edge.paramStart === undefined ? {} : { paramStart: number(edge.paramStart, 0, 'Seam start', 0, 1) }),
      ...(edge.paramEnd === undefined ? {} : { paramEnd: number(edge.paramEnd, 1, 'Seam end', 0, 1) }) };
  };
  const seams = array(item.seams ?? [], 'Seams', 2048).map((value, i) => {
    const seam = record(value, 'Seam');
    const stitchType = seam.stitchType ?? defaults.stitchSettings.defaultType;
    if (!STITCH_PRESETS.some((stitch) => stitch.id === stitchType)) throw new Error('Unsupported stitch type.');
    return { id: text(seam.id, `seam-${i}`, 'Seam ID'), edgeA: seamEdge(seam.edgeA), edgeB: seamEdge(seam.edgeB),
      strength: number(seam.strength, 1, 'Seam strength', 0, 2), reversed: seam.reversed === true,
      stitchType: stitchType as CloProject['stitchSettings']['defaultType'], threadColor: color(seam.threadColor, '#f8fafc'),
      seamAllowanceMm: number(seam.seamAllowanceMm, 12, 'Seam allowance', 0, 100) };
  });
  uniqueIds(seams, 'Seams');
  const material = record(item.currentMaterial ?? item.material ?? defaults.currentMaterial, 'Fabric');
  const currentMaterial: FabricMaterial = { ...defaults.currentMaterial, id: text(material.id, 'custom', 'Fabric ID'), name: text(material.name, 'Custom fabric', 'Fabric name'),
    color: color(material.color, '#262626'), category: ['Knit', 'Woven', 'Denim', 'Luxury', 'Technical', 'Leather'].includes(material.category as string) ? material.category as FabricMaterial['category'] : undefined,
    patternType: ['solid', 'grid', 'stripes', 'denim', 'fleece', 'rib'].includes(material.patternType as string) ? material.patternType as FabricMaterial['patternType'] : 'solid',
    description: typeof material.description === 'string' ? material.description.slice(0,500) : undefined,
    density: number(material.density, 180, 'Fabric weight', 20, 1500), stretchStiffness: number(material.stretchStiffness, 0.85, 'Fabric stretch', 0, 1),
    bendingStiffness: number(material.bendingStiffness, 0.15, 'Fabric bending', 0, 1), friction: number(material.friction, 0.4, 'Fabric friction', 0, 1),
    roughness: number(material.roughness, 0.8, 'Fabric roughness', 0, 1), metalness: number(material.metalness, 0, 'Fabric metalness', 0, 1) };
  const avatar = record(item.avatar ?? defaults.avatar, 'Body measurements');
  const guide = record(item.avatar2D ?? defaults.avatar2D, 'Body guide'), guidePosition = record(guide.position ?? defaults.avatar2D.position, 'Guide position');
  const stitches = record(item.stitchSettings ?? defaults.stitchSettings, 'Stitch settings');
  const customColor = color(item.customColor, currentMaterial.color);
  const zones = item.colorZones === undefined ? {} : record(item.colorZones, 'Color zones');
  const decals = array(item.decals ?? [], 'Artwork layers', 64).map(graphic);
  uniqueIds(decals, 'Artwork layers');
  return { schemaVersion: 1, id: text(item.id, defaults.id, 'Project ID'), name: text(item.name, defaults.name, 'Project name'),
    createdAt: number(item.createdAt, defaults.createdAt, 'Creation date', 0, Number.MAX_SAFE_INTEGER),
    updatedAt: number(item.updatedAt, defaults.updatedAt, 'Update date', 0, Number.MAX_SAFE_INTEGER), templateId: templateId === 'custom-pattern' ? templateId : template?.id || 'tshirt', pieces, seams, currentMaterial, customColor,
    ...(item.patternSource === undefined ? {} : (() => {
      const source = record(item.patternSource, 'Pattern source');
      if (source.format !== 'svg' && source.format !== 'cdr') throw new Error('Unsupported pattern source.');
      return { patternSource: { format: source.format as 'svg' | 'cdr', name: text(source.name, 'Imported pattern', 'Source file name', 200) } };
    })()),
    colorZones: Object.fromEntries(colorKeys.map((key) => [key, color(zones[key], customColor)])), decals,
    avatar: { gender: avatar.gender === 'male' ? 'male' : 'female', showSkin: avatar.showSkin !== false,
      height: number(avatar.height, 175, 'Body height', 80, 230), chestCircumference: number(avatar.chestCircumference, 92, 'Chest', 30, 220),
      waistCircumference: number(avatar.waistCircumference, 68, 'Waist', 25, 220), hipsCircumference: number(avatar.hipsCircumference, 96, 'Hips', 35, 240),
      shoulderWidth: number(avatar.shoulderWidth, 40, 'Shoulder width', 15, 75) },
    avatar2D: { visible: guide.visible === true, view: guide.view === 'back' || guide.view === 'both' ? guide.view : 'front',
      opacity: number(guide.opacity, 0.35, 'Guide opacity', 0, 1), showGuides: guide.showGuides !== false,
      position: { x: number(guidePosition.x, 300, 'Guide X'), y: number(guidePosition.y, 260, 'Guide Y') } },
    stitchSettings: { defaultType: STITCH_PRESETS.some((stitch) => stitch.id === stitches.defaultType) ? stitches.defaultType as CloProject['stitchSettings']['defaultType'] : 'single-needle',
      defaultColor: color(stitches.defaultColor, '#f8fafc'), showStitches: stitches.showStitches !== false, seamAllowanceMm: number(stitches.seamAllowanceMm, 12, 'Seam allowance', 0, 100) },
    canvasViewMode: item.canvasViewMode === 'assembled' ? 'assembled' : 'pieces', mockupScene: item.mockupScene === 'floating-360' ? 'floating-360' : 'ghost' };
}

export function parseProjectBackup(content: string): CloProject[] {
  if (content.length > MAX_BACKUP_BYTES) throw new Error('This backup is too large. Import a file smaller than 24 MB.');
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error('This file is not valid project JSON.'); }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0 || list.length > 100) throw new Error('A backup must contain between 1 and 100 projects.');
  const projects = list.map(normalizeProject);
  uniqueIds(projects, 'Projects');
  return projects;
}
