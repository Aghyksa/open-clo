import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const close = (value, expected, tolerance = 1e-7) => assert.ok(Math.abs(value - expected) <= tolerance, `${value} should equal ${expected}`);
try {
  const importer = await server.ssrLoadModule('/src/utils/patternImport.ts');
  const geometry = await server.ssrLoadModule('/src/utils/patternGeometry.ts');
  const { normalizeProject, createDefaultProject } = await server.ssrLoadModule('/src/utils/projectData.ts');
  const { exportPatternsToSvg } = await server.ssrLoadModule('/src/utils/patternPresets.ts');
  const { parsePatternSvg, candidatesToPatternPieces, parseSvgPath, parseSvgLength,
    parseSvgTransform, transformSvgPoint, flattenSvgCubic, flattenSvgArc } = importer;

  close(parseSvgLength('1in').mm, 25.4);
  close(parseSvgLength('72 pt').mm, 25.4);
  close(parseSvgLength('2.54cm').mm, 25.4);
  assert.equal(parseSvgLength('100%'), null);
  assert.equal(parseSvgLength('100px').physical, false);
  assert.equal(parseSvgLength('1e999mm'), null);
  const transform = parseSvgTransform('translate(100, 30) rotate(90) scale(2,-1)');
  const moved = transformSvgPoint({ x: 10, y: 20 }, transform);
  close(moved.x, 120); close(moved.y, 50);
  const pivot = transformSvgPoint({ x: 20, y: 10 }, parseSvgTransform('rotate(90 10 10)'));
  close(pivot.x, 10); close(pivot.y, 20);
  assert.throws(() => parseSvgTransform('translate(2) garbage'), /transform/);
  assert.throws(() => parseSvgTransform('matrix(1 0 0 1 2)'), /six/);

  const metric = parsePatternSvg('<svg width="100cm" height="150cm" viewBox="0 0 1000 1500"><g inkscape:label="Front bodice" transform="translate(20 30)"><rect width="500" height="1200"/></g></svg>');
  assert.equal(metric.hasPhysicalScale, true); close(metric.widthMm, 1000); close(metric.heightMm, 1500);
  assert.equal(metric.candidates.length, 1); assert.equal(metric.candidates[0].name, 'Front bodice');
  close(metric.candidates[0].widthCm, 50); close(metric.candidates[0].heightCm, 120);
  close(metric.candidates[0].points[0].x, -150); close(metric.candidates[0].points[0].y, -360);
  const coordinateUnits = parsePatternSvg('<svg width="200mm" height="300mm"><rect width="100mm" height="200mm" rx="2mm"/></svg>');
  close(coordinateUnits.candidates[0].widthCm, 10); close(coordinateUnits.candidates[0].heightCm, 20);
  const invalidRadius = parsePatternSvg('<svg><rect width="100" height="200" rx="nope"/></svg>');
  assert.equal(invalidRadius.candidates.length, 0, 'invalid rounded rectangles are not fabricated as sharp rectangles');

  const corel = `<?xml version="1.0"?>
  <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40cm" height="60cm" viewBox="0 0 4000 6000">
    <defs><path id="panel" d="M0 0h1000v2000h-1000z"/></defs>
    <g transform="matrix(2 0 0 2 100 200)"><use xlink:href="#panel" x="50" y="75"/></g>
    <use href="https://example.test/external.svg#panel"/>
    <text>FRONT</text><image href="https://example.test/image.png"/>
  </svg>`;
  const used = parsePatternSvg(corel);
  assert.equal(used.candidates.length, 1); close(used.candidates[0].widthCm, 20); close(used.candidates[0].heightCm, 40);
  assert.ok(used.warnings.some((warning) => warning.includes('External')));
  assert.ok(used.warnings.some((warning) => warning.includes('Text')));
  const unknown = parsePatternSvg('<svg width="1000" height="1500" viewBox="0 0 1000 1500"><polygon points="0,0 500,0 500,1200 0,1200"/></svg>');
  assert.equal(unknown.hasPhysicalScale, false); assert.equal(unknown.widthMm, undefined);
  const calibrated = parsePatternSvg('<svg width="1000" height="1500" viewBox="0 0 1000 1500"><polygon points="0,0 500,0 500,1200 0,1200"/></svg>', 1000);
  assert.equal(calibrated.hasPhysicalScale, true); close(calibrated.candidates[0].widthCm, 50); close(calibrated.candidates[0].heightCm, 120);
  assert.throws(() => parsePatternSvg('<svg><rect width="10" height="20"/></svg>', 200), /viewBox/);

  const nonuniform = parsePatternSvg('<svg width="200mm" height="300mm" viewBox="10 20 100 100" preserveAspectRatio="none"><path d="M10 20H110V120H10Z"/></svg>');
  close(nonuniform.candidates[0].widthCm, 20); close(nonuniform.candidates[0].heightCm, 30);
  const meet = parsePatternSvg('<svg width="200mm" height="300mm" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>');
  close(meet.candidates[0].widthCm, 20); close(meet.candidates[0].heightCm, 20);
  assert.throws(() => parsePatternSvg('<svg width="20mm" height="30mm" viewBox="0 0 10 10" preserveAspectRatio="xMidYMid slice"/>'), /cropping/);

  const relative = parseSvgPath('m10,20 100,0 v200 h-100z');
  assert.deepEqual(relative[0], { points: [{ x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 220 }, { x: 10, y: 220 }], closed: true });
  assert.deepEqual(parseSvgPath('M1e1 2e1 L110 20 110 220 10 220 Z'), relative);
  const smoothCubic = parseSvgPath('M0 0 C0 100 100 100 100 0 S200 -100 200 0 L200 200H0Z');
  const explicitCubic = parseSvgPath('M0 0 C0 100 100 100 100 0 C100 -100 200 -100 200 0 L200 200H0Z');
  assert.deepEqual(smoothCubic, explicitCubic, 'smooth cubic reflects the previous control point');
  const smoothQuadratic = parseSvgPath('M0 0 Q50 100 100 0 T200 0 L200 200H0Z');
  const explicitQuadratic = parseSvgPath('M0 0 Q50 100 100 0 Q150 -100 200 0 L200 200H0Z');
  assert.deepEqual(smoothQuadratic, explicitQuadratic, 'smooth quadratic reflects the previous control point');
  assert.deepEqual(parseSvgPath('M0 0Q50 100 100 0L150 0T200 0V200H0Z'),
    parseSvgPath('M0 0Q50 100 100 0L150 0Q150 0 200 0V200H0Z'), 'a line resets smooth curve reflection');
  assert.throws(() => parseSvgPath('M0 0 L1 NaN Z'), /invalid/);
  assert.throws(() => parseSvgPath('M0 0 A10 10 0 2 1 20 0Z'), /flags/);
  assert.deepEqual(parseSvgPath('M0 0 A10 10 0 0110 10L0 10Z'), parseSvgPath('M0 0 A10 10 0 0 1 10 10L0 10Z'), 'adjacent arc flags are legal');

  const distanceToSegments = (point, points) => {
    let nearest = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
      nearest = Math.min(nearest, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
    }
    return nearest;
  };
  const control = [{ x: 0, y: 0 }, { x: 250, y: -500 }, { x: 750, y: 600 }, { x: 1000, y: 0 }];
  const flattened = [control[0], ...flattenSvgCubic(...control, .35)];
  let cubicError = 0;
  for (let i = 0; i <= 2000; i++) {
    const t = i / 2000, u = 1 - t;
    const point = { x: u ** 3 * control[0].x + 3 * u * u * t * control[1].x + 3 * u * t * t * control[2].x + t ** 3 * control[3].x,
      y: u ** 3 * control[0].y + 3 * u * u * t * control[1].y + 3 * u * t * t * control[2].y + t ** 3 * control[3].y };
    cubicError = Math.max(cubicError, distanceToSegments(point, flattened));
  }
  assert.ok(cubicError <= .5, `cubic flattening error is ${cubicError} mm`);
  const arc = [{ x: 100, y: 0 }, ...flattenSvgArc({ x: 100, y: 0 }, { x: -100, y: 0 }, 100, 100, 0, false, true)];
  let arcError = 0;
  for (let i = 0; i <= 1000; i++) {
    const angle = Math.PI * i / 1000;
    arcError = Math.max(arcError, distanceToSegments({ x: 100 * Math.cos(angle), y: 100 * Math.sin(angle) }, arc));
  }
  assert.ok(arcError <= .5, `arc flattening error is ${arcError} mm`);
  const reversedArc = flattenSvgArc({ x: 100, y: 0 }, { x: -100, y: 0 }, 100, 100, 0, false, false);
  assert.ok(reversedArc.some((point) => point.y < -99), 'arc sweep preserves direction');
  const correctedArc = flattenSvgArc({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 10, 0, false, true);
  assert.ok(correctedArc.some((point) => point.y < -49), 'insufficient radii expand to reach both endpoints');
  const looping = flattenSvgCubic({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -100, y: 0 }, { x: 1, y: 0 });
  assert.ok(looping.some((point) => point.x > 20) && looping.some((point) => point.x < -20), 'collinear backtracking curves are preserved');
  const backward = flattenSvgCubic({ x: 0, y: 0 }, { x: -100, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 0 });
  assert.ok(backward.some((point) => point.x < -20), 'a control point behind the segment cannot be collapsed onto its chord');

  const ignored = parsePatternSvg('<svg width="100mm" height="100mm" viewBox="0 0 100 100"><path d="M0 0L10 0L10 10"/><path fill-rule="evenodd" d="M0 0H90V90H0Z M10 10H80V80H10Z"/><g clip-path="url(#clip)"><rect width="50" height="50"/></g><script>alert(1)</script><foreignObject><rect width="10" height="10"/></foreignObject></svg>');
  assert.equal(ignored.candidates.length, 0); assert.ok(ignored.warnings.some((warning) => warning.includes('Open paths')));
  assert.ok(ignored.warnings.some((warning) => warning.includes('holes'))); assert.ok(ignored.warnings.some((warning) => warning.includes('Clipped')));
  const circular = parsePatternSvg('<svg><defs><g id="loop"><use href="#loop"/></g></defs><use href="#loop"/></svg>');
  assert.equal(circular.candidates.length, 0); assert.ok(circular.warnings.some((warning) => warning.includes('Circular')));
  assert.throws(() => parsePatternSvg('<!DOCTYPE svg [<!ENTITY file SYSTEM "file:///etc/passwd">]><svg/>'), /entity/i);
  assert.throws(() => parsePatternSvg('<svg><g></svg>'), /closed/);
  assert.throws(() => parsePatternSvg('<svg></svg><svg/>'), /one root/);
  assert.throws(() => parsePatternSvg('<svg/>garbage'), /valid SVG/);
  assert.throws(() => parsePatternSvg(`<svg ${'invalid'.repeat(100000)}/>`), /attribute/);
  assert.throws(() => parsePatternSvg('<svg><style><![CDATA[.panel { transform: scale(2); }]]></style><rect class="panel" width="100" height="100"/></svg>'), /stylesheets/);
  assert.throws(() => parsePatternSvg('<svg><defs><style>.panel { clip-path: url(#clip); }</style></defs><rect class="panel" width="100" height="100"/></svg>'), /stylesheets/);
  assert.throws(() => parsePatternSvg(' '.repeat(12 * 1024 * 1024 + 1)), /12 MB/);
  const excessive = parsePatternSvg(`<svg width="1000mm" height="1000mm" viewBox="0 0 1000 1000"><polygon points="${Array.from({ length: 600 }, (_, i) => `${500 + 300 * Math.cos(i / 600 * Math.PI * 2)},${500 + 300 * Math.sin(i / 600 * Math.PI * 2)}`).join(' ')}"/></svg>`);
  assert.equal(excessive.candidates.length, 0); assert.ok(excessive.warnings.some((warning) => warning.includes('512')));

  const pieces = candidatesToPatternPieces(metric.candidates);
  assert.equal(pieces.length, 1); close(geometry.getPatternBounds(pieces[0]).width / geometry.PATTERN_UNITS_PER_CM, 50);
  const restored = normalizeProject({ ...createDefaultProject('tshirt', 'Imported garment'), pieces, seams: [] });
  assert.equal(restored.seams.length, 0, 'import does not invent sewing connections');
  close(geometry.getPatternBounds(restored.pieces[0]).height / geometry.PATTERN_UNITS_PER_CM, 120);
  const roundTrip = parsePatternSvg(exportPatternsToSvg(restored.pieces));
  const importedPanel = roundTrip.candidates.find((candidate) => candidate.name === restored.pieces[0].id);
  assert.ok(importedPanel, 'the exported panel remains a selectable outline');
  close(importedPanel.widthCm, 50, .0001); close(importedPanel.heightCm, 120, .0001);
  assert.notEqual(candidatesToPatternPieces(metric.candidates)[0].id, pieces[0].id, 'repeated imports receive distinct panel IDs');
  const marked = parsePatternSvg('<svg><rect data-export-background="true" width="100" height="100"/><g data-calibration="true"><rect width="10" height="10"/></g><path id="actual-panel" d="M0 0H10V20H0Z"/></svg>');
  assert.equal(marked.candidates.length, 1); assert.equal(marked.candidates[0].name, 'actual-panel');
  const uniquelyNamed = parsePatternSvg('<svg><g id="page-1"><path id="page-1-outline-1" d="M0 0H10V20H0Z"/><path id="page-1-outline-2" d="M20 0H30V20H20Z"/></g></svg>');
  assert.deepEqual(uniquelyNamed.candidates.map((candidate) => candidate.name), ['page-1-outline-1', 'page-1-outline-2']);
  console.log(`Pattern import checks passed; measured cubic/arc error ${cubicError.toFixed(3)}/${arcError.toFixed(3)} mm`);
  for (const path of process.argv.slice(2)) {
    const result = parsePatternSvg(await readFile(path, 'utf8'));
    assert.equal(result.hasPhysicalScale, true, 'real-case vectors preserve physical document scale');
    assert.ok(result.candidates.length > 0, 'real-case file yields selectable closed panels');
    const project = normalizeProject({ ...createDefaultProject('tshirt', 'Real-case import'), pieces: candidatesToPatternPieces(result.candidates), seams: [] });
    for (let i = 0; i < project.pieces.length; i++) {
      const bounds = geometry.getPatternBounds(project.pieces[i]);
      close(bounds.width / geometry.PATTERN_UNITS_PER_CM, result.candidates[i].widthCm);
      close(bounds.height / geometry.PATTERN_UNITS_PER_CM, result.candidates[i].heightCm);
    }
    console.log(JSON.stringify({ path, panels: project.pieces.length, documentMm: [result.widthMm, result.heightMm],
      maximumPanelPoints: Math.max(...project.pieces.map((piece) => piece.points.length)), warnings: result.warnings }));
  }
} finally {
  await server.close();
}
