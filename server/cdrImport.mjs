import { crc32, inflateRawSync } from 'node:zlib';

const MAX_INPUT = 32 * 1024 * 1024;
const MAX_ENTRY = 2 * 1024 * 1024;
const MAX_INFLATED = 16 * 1024 * 1024;
const MAX_OUTPUT = 12 * 1024 * 1024;
const MAX_SHAPES = 1000;
const MAX_POINTS = 80000;
const ALLOWED_DATA = /^(?:data\d+|page\d+|masterPage)\.dat$/;
const RESOURCE_GROUPS = new Set(['clpt', 'vect']);
const OBJECT_BOUNDARIES = new Set(['obj ', 'grp ', 'clpt', 'vect']);

function fail(message) {
  throw new Error(`CDR import: ${message}`);
}

function requireBytes(buffer, offset, length) {
  if (!Number.isSafeInteger(offset) || offset < 0 || length < 0 || offset + length > buffer.length) {
    fail('The document contains an invalid data offset.');
  }
}

function finite(value, limit = 1e9) {
  if (!Number.isFinite(value) || Math.abs(value) > limit) fail('The document contains invalid dimensions or transforms.');
  return value;
}

function checkExtra(buffer, start, end) {
  for (let cursor = start; cursor < end;) {
    requireBytes(buffer, cursor, 4);
    const tag = buffer.readUInt16LE(cursor);
    const length = buffer.readUInt16LE(cursor + 2);
    if (cursor + 4 + length > end) fail('The ZIP extra data is invalid.');
    if (tag === 1) fail('ZIP64 documents are not supported.');
    cursor += 4 + length;
  }
}

function readArchive(input) {
  if (!Buffer.isBuffer(input) || input.length > MAX_INPUT || input.length < 22) {
    fail('Choose a ZIP-based CorelDRAW 2020 document smaller than 32 MB.');
  }
  let end = -1;
  for (let i = input.length - 22; i >= Math.max(0, input.length - 65557); i -= 1) {
    if (input.readUInt32LE(i) === 0x06054b50 && i + 22 + input.readUInt16LE(i + 20) === input.length) {
      end = i;
      break;
    }
  }
  if (end < 0) fail('Only ZIP-based CorelDRAW 2020 documents are supported.');
  const count = input.readUInt16LE(end + 10);
  const centralSize = input.readUInt32LE(end + 12);
  const centralStart = input.readUInt32LE(end + 16);
  if (input.readUInt16LE(end + 4) || input.readUInt16LE(end + 6)
    || input.readUInt16LE(end + 8) !== count || count > 256
    || centralSize === 0xffffffff || centralStart === 0xffffffff
    || centralStart + centralSize !== end) fail('Multi-volume and ZIP64 documents are not supported.');
  requireBytes(input, centralStart, centralSize);
  const entries = new Map();
  let offset = centralStart;
  for (let i = 0; i < count; i += 1) {
    requireBytes(input, offset, 46);
    if (input.readUInt32LE(offset) !== 0x02014b50) fail('The ZIP directory is invalid.');
    const flags = input.readUInt16LE(offset + 8);
    const method = input.readUInt16LE(offset + 10);
    const compressed = input.readUInt32LE(offset + 20);
    const size = input.readUInt32LE(offset + 24);
    const nameLength = input.readUInt16LE(offset + 28);
    const extraLength = input.readUInt16LE(offset + 30);
    const commentLength = input.readUInt16LE(offset + 32);
    const local = input.readUInt32LE(offset + 42);
    if ((flags & ~(8 | 0x800)) || ![0, 8].includes(method)) fail('Encrypted and unsupported ZIP compression formats are not supported.');
    if (input.readUInt16LE(offset + 6) > 20) fail('ZIP64 and advanced ZIP formats are not supported.');
    if (input.readUInt16LE(offset + 34) || size === 0xffffffff || compressed === 0xffffffff || local === 0xffffffff) {
      fail('Multi-volume and ZIP64 documents are not supported.');
    }
    if (!nameLength || nameLength > 512 || extraLength > 4096 || commentLength > 4096) fail('The ZIP directory exceeds supported limits.');
    requireBytes(input, offset + 46, nameLength + extraLength + commentLength);
    const name = input.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name.includes('\0') || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || entries.has(name)) {
      fail('The ZIP contains invalid or duplicate entry names.');
    }
    const extraEnd = offset + 46 + nameLength + extraLength;
    checkExtra(input, offset + 46 + nameLength, extraEnd);
    entries.set(name, { flags, method, compressed, size, local, checksum: input.readUInt32LE(offset + 16) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== end) fail('The ZIP directory is invalid.');
  const cache = new Map();
  let inflated = 0;
  return (name) => {
    if (cache.has(name)) return cache.get(name);
    const entry = entries.get(name);
    if (!entry) fail(`Required vector data ${name} is missing.`);
    if (name !== 'content/root.dat' && name !== 'content/dataFileList.dat' && name !== 'META-INF/metadata.xml'
      && !/^content\/data\/(?:data\d+|page\d+|masterPage)\.dat$/.test(name)) fail('Bitmap and embedded object data cannot be imported as outlines.');
    if (entry.size > MAX_ENTRY || inflated + entry.size > MAX_INFLATED) fail('Vector data exceeds the supported size limit.');
    requireBytes(input, entry.local, 30);
    if (input.readUInt32LE(entry.local) !== 0x04034b50 || input.readUInt16LE(entry.local + 4) > 20
      || input.readUInt16LE(entry.local + 6) !== entry.flags || input.readUInt16LE(entry.local + 8) !== entry.method) {
      fail('The ZIP local header does not match its directory.');
    }
    const nameLength = input.readUInt16LE(entry.local + 26);
    const extraLength = input.readUInt16LE(entry.local + 28);
    requireBytes(input, entry.local + 30, nameLength + extraLength);
    if (input.toString('utf8', entry.local + 30, entry.local + 30 + nameLength) !== name) fail('The ZIP entry name does not match its directory.');
    checkExtra(input, entry.local + 30 + nameLength, entry.local + 30 + nameLength + extraLength);
    const start = entry.local + 30 + nameLength + extraLength;
    if (start + entry.compressed > centralStart) fail('The ZIP data overlaps its directory.');
    requireBytes(input, start, entry.compressed);
    let data;
    try {
      const compressed = input.subarray(start, start + entry.compressed);
      data = entry.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.size) });
    } catch {
      fail('The compressed vector data is invalid or exceeds its declared size.');
    }
    if (data.length !== entry.size || crc32(data) !== entry.checksum) fail('The vector data checksum is invalid.');
    inflated += data.length;
    cache.set(name, data);
    return data;
  };
}

function parseRecords(buffer) {
  let records = 0;
  function parse(start, end, depth) {
    if (depth > 64) fail('The document has too many nested groups.');
    const nodes = [];
    let offset = start;
    while (offset < end) {
      requireBytes(buffer, offset, 8);
      const tag = buffer.toString('ascii', offset, offset + 4);
      const length = buffer.readUInt32LE(offset + 4);
      const next = offset + 8 + length;
      if (next > end || ++records > 30000) fail('The document structure exceeds supported limits.');
      if (tag === 'LIST' || tag === 'RIFF') {
        if (length < 4) fail('The document contains an invalid group.');
        const kind = buffer.toString('ascii', offset + 8, offset + 12);
        if (kind === 'cmpr') fail('Compressed legacy RIFF groups are not supported.');
        nodes.push({ tag: kind, children: parse(offset + 12, next, depth + 1) });
      } else {
        nodes.push({ tag, data: buffer.subarray(offset + 8, next) });
      }
      offset = next + (length & 1);
      if (offset > end) fail('The document contains an invalid chunk alignment.');
    }
    return nodes;
  }
  const nodes = parse(0, buffer.length, 0);
  if (nodes.length !== 1 || nodes[0].tag !== 'CDRN') fail('Only ZIP-based CorelDRAW 2020 CDRN documents are supported.');
  return nodes[0];
}

function* descendants(node, excluded = RESOURCE_GROUPS) {
  for (const child of node.children ?? []) {
    if (excluded.has(child.tag)) continue;
    yield child;
    yield* descendants(child, excluded);
  }
}

function argumentTable(buffer, withType = true) {
  requireBytes(buffer, 0, withType ? 20 : 12);
  const length = buffer.readUInt32LE(0);
  const count = buffer.readUInt32LE(4);
  const start = buffer.readUInt32LE(8);
  if (length > buffer.length || count > 128) fail('The object argument table is invalid.');
  requireBytes(buffer, start, count * 4);
  let types = [];
  if (withType) {
    const typeStart = buffer.readUInt32LE(12);
    requireBytes(buffer, typeStart, count * 4);
    types = Array.from({ length: count }, (_, i) => buffer.readUInt32LE(typeStart + (count - 1 - i) * 4));
  }
  const offsets = Array.from({ length: count }, (_, i) => buffer.readUInt32LE(start + i * 4));
  for (const offset of offsets) if (offset >= length) fail('The object argument offset is invalid.');
  return { type: withType ? buffer.readUInt32LE(16) : null, types, offsets };
}

function objectTransforms(buffer) {
  if (!buffer) fail('An outline is missing its object transform.');
  const { offsets } = argumentTable(buffer, false);
  const transforms = [];
  for (const offset of offsets) {
    requireBytes(buffer, offset + 8, 2);
    if (buffer.readUInt16LE(offset + 8) !== 8) fail('An outline uses an unsupported object transform.');
    requireBytes(buffer, offset + 16, 48);
    const matrix = Array.from({ length: 6 }, (_, i) => finite(buffer.readDoubleLE(offset + 16 + i * 8)));
    if (Math.abs(matrix[0] * matrix[4] - matrix[1] * matrix[3]) < 1e-12) fail('An outline has a collapsed object transform.');
    transforms.push(matrix);
  }
  if (!transforms.length) fail('An outline is missing its object transform.');
  return transforms;
}

function curveCommands(buffer, offset) {
  requireBytes(buffer, offset, 4);
  const count = buffer.readUInt16LE(offset);
  if (count < 2 || count > 512) fail('An outline has an unsupported number of points.');
  requireBytes(buffer, offset + 4, count * 9);
  const flags = buffer.subarray(offset + 4 + count * 8, offset + 4 + count * 9);
  const commands = [];
  const controls = [];
  let started = false;
  let closed = false;
  let segments = 0;
  for (let i = 0; i < count; i += 1) {
    const point = [buffer.readInt32LE(offset + 4 + i * 8), buffer.readInt32LE(offset + 8 + i * 8)];
    const kind = flags[i] & 192;
    if (kind === 0) {
      if (started) fail('Compound curve outlines are not supported. Export them as separate SVG paths.');
      commands.push(['M', point]);
      started = true;
    } else if (kind === 192) {
      if (!started || closed || controls.length >= 2) fail('An outline contains invalid Bézier controls.');
      controls.push(point);
    } else {
      if (!started || closed) fail('An outline contains an invalid segment.');
      if (kind === 128) {
        if (controls.length !== 2) fail('An outline contains incomplete Bézier controls.');
        commands.push(['C', ...controls, point]);
      } else {
        if (controls.length) fail('An outline contains unused Bézier controls.');
        commands.push(['L', point]);
      }
      controls.length = 0;
      segments += 1;
      if (flags[i] & 8) {
        commands.push(['Z']);
        closed = true;
      }
    }
  }
  if (controls.length) fail('An outline contains incomplete Bézier controls.');
  return { commands, count, closed: closed && segments >= 2 };
}

function rectangleCommands(buffer, offset) {
  requireBytes(buffer, offset, 120);
  const x = finite(buffer.readDoubleLE(offset));
  const y = finite(buffer.readDoubleLE(offset + 8));
  const radii = [40, 64, 88, 112].map((relative) => finite(buffer.readDoubleLE(offset + relative)));
  if (radii.some((radius) => radius !== 0)) return null;
  if (!x || !y) return null;
  return { commands: [['M', [0, 0]], ['L', [0, y]], ['L', [x, y]], ['L', [x, 0]], ['Z']], count: 4, closed: true };
}

function metadataNumber(xml, name, limit) {
  const match = xml.match(new RegExp(`<[^<>:]+:${name}>([0-9]+)<\\/[^<>:]+:${name}>`));
  const value = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(value) || value <= 0 || value > limit) fail(`The document has invalid ${name} metadata.`);
  return value;
}

function number(value) {
  return String(Math.round(finite(value, 1000000) * 1e6) / 1e6);
}

function pathBounds(commands) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const include = ([x, y]) => {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
  };
  let previous;
  for (const [command, ...points] of commands) {
    if (command === 'Z') continue;
    const endpoint = points.at(-1);
    include(endpoint);
    if (command === 'C') {
      const curve = [previous, ...points];
      const roots = new Set();
      for (const axis of [0, 1]) {
        const [v0, v1, v2, v3] = curve.map((point) => point[axis]);
        const a = -v0 + 3 * v1 - 3 * v2 + v3;
        const b = 2 * (v0 - 2 * v1 + v2);
        const c = v1 - v0;
        if (Math.abs(a) < 1e-10) {
          if (Math.abs(b) > 1e-10) roots.add(-c / b);
        } else {
          const discriminant = b * b - 4 * a * c;
          if (discriminant >= 0) {
            roots.add((-b + Math.sqrt(discriminant)) / (2 * a));
            roots.add((-b - Math.sqrt(discriminant)) / (2 * a));
          }
        }
      }
      for (const t of roots) {
        if (t <= 0 || t >= 1) continue;
        const u = 1 - t;
        include([0, 1].map((axis) => u ** 3 * curve[0][axis] + 3 * u ** 2 * t * curve[1][axis]
          + 3 * u * t ** 2 * curve[2][axis] + t ** 3 * curve[3][axis]));
      }
    }
    previous = endpoint;
  }
  return bounds;
}

// Only selected vector streams are inflated; bitmap and embedded data are never read.
export function convertCdrToSvg(input) {
  const read = readArchive(input);
  const metadata = read('META-INF/metadata.xml').toString('utf8');
  if (metadataNumber(metadata, 'CoreVersion', 10000) !== 2200) fail('Only CorelDRAW 2020 version 22 documents are supported. Export other versions as SVG.');
  const pages = metadataNumber(metadata, 'NumPages', 20);
  const widthMm = metadataNumber(metadata, 'PageWidth', 450000000) / 10000;
  const heightMm = metadataNumber(metadata, 'PageHeight', 450000000) / 10000;
  const fileList = read('content/dataFileList.dat');
  if (fileList.length > 4096) fail('The vector stream list exceeds supported limits.');
  const streams = fileList.toString('utf8').trim().split(/\r?\n/);
  if (streams.length > 40 || new Set(streams).size !== streams.length
    || streams.some((name) => name !== 'Bitmaps.dat' && !ALLOWED_DATA.test(name))) fail('The document contains unsupported vector streams.');
  const root = parseRecords(read('content/root.dat'));
  const resolve = (buffer) => {
    if (!buffer) fail('A required vector record is missing.');
    if (buffer.length !== 16) return buffer;
    const stream = buffer.readUInt32LE(0);
    const length = buffer.readUInt32LE(4);
    if (stream === 0xffffffff) {
      requireBytes(buffer, 8, length);
      return buffer.subarray(8, 8 + length);
    }
    if (stream >= streams.length || !ALLOWED_DATA.test(streams[stream])) fail('An outline references unsupported bitmap or embedded data.');
    const external = read(`content/data/${streams[stream]}`);
    const offset = buffer.readUInt32LE(8);
    requireBytes(external, offset, length);
    return external.subarray(offset, offset + length);
  };
  const version = resolve(root.children.find((node) => node.tag === 'vrsn')?.data);
  requireBytes(version, 0, 2);
  if (version.readUInt16LE(0) !== 2200) fail('The document version does not match CorelDRAW 2020 version 22.');
  const pageNodes = root.children.filter((node) => node.tag === 'page').filter((node) => {
    const flags = resolve(node.children.find((child) => child.tag === 'flgs')?.data);
    requireBytes(flags, 0, 4);
    return !(flags.readUInt32LE(0) & 0xff0000);
  });
  if (pageNodes.length !== pages) fail('The document page count does not match its metadata.');
  const warnings = ['Imports closed vector outlines in their original millimeter scale. Review the selected pieces before saving.',
    'Bitmap prints, embedded images, text and layer names are not imported. PowerClip rendering is unsupported; clipping resources are excluded. Export clipped designs as expanded SVG outlines.',
    'Cut lines, seam lines, graded sizes, grain direction and sewing connections need to be identified manually.'];
  let outlines = 0;
  let pointCount = 0;
  let openCurves = 0;
  let unsupported = 0;
  let unsupportedShapes = 0;
  const pageGroups = [];
  for (const [pageIndex, page] of pageNodes.entries()) {
    const paths = [];
    for (const object of descendants(page)) {
      if (object.tag !== 'obj ') continue;
      const records = new Map([...descendants(object, OBJECT_BOUNDARIES)].filter((node) => node.data).map((node) => [node.tag, node.data]));
      if (!records.has('loda')) continue;
      const loda = resolve(records.get('loda'));
      const table = argumentTable(loda);
      if (![1, 3].includes(table.type)) {
        if (![4, 5].includes(table.type)) unsupportedShapes += 1;
        continue;
      }
      const index = table.types.indexOf(30);
      if (index < 0) fail('An outline is missing its coordinate data.');
      const shape = table.type === 3 ? curveCommands(loda, table.offsets[index]) : rectangleCommands(loda, table.offsets[index]);
      if (!shape) { unsupported += 1; continue; }
      if (!shape.closed) { openCurves += 1; continue; }
      const transforms = objectTransforms(resolve(records.get('trfd')));
      pointCount += shape.count;
      if (++outlines > MAX_SHAPES || pointCount > MAX_POINTS) fail('The outline count exceeds supported limits.');
      const transformPoint = ([initialX, initialY]) => {
        let x = initialX;
        let y = initialY;
        for (const [a, c, e, b, d, f] of transforms) {
          [x, y] = [finite(a * x + c * y + e), finite(b * x + d * y + f)];
        }
        return [x / 10000 + widthMm / 2, heightMm / 2 - y / 10000 + pageIndex * (heightMm + 10)];
      };
      const transformed = shape.commands.map(([command, ...points]) => [command, ...points.map(transformPoint)]);
      const box = resolve(records.get('bbox'));
      requireBytes(box, 0, 16);
      const expected = [box.readInt32LE(0) / 10000 + widthMm / 2,
        heightMm / 2 - box.readInt32LE(4) / 10000 + pageIndex * (heightMm + 10),
        box.readInt32LE(8) / 10000 + widthMm / 2,
        heightMm / 2 - box.readInt32LE(12) / 10000 + pageIndex * (heightMm + 10)];
      if (pathBounds(transformed).some((value, axis) => Math.abs(value - expected[axis]) > 0.05)) {
        fail('An outline transform does not match its native dimensions. Export this document as SVG.');
      }
      const path = transformed.map(([command, ...points]) => `${command}${points.map((point) => point.map(number).join(' ')).join(' ')}`).join(' ');
      paths.push(`<path id="page-${pageIndex + 1}-outline-${paths.length + 1}" d="${path}"/>`);
    }
    pageGroups.push(`<g id="page-${pageIndex + 1}">${paths.join('')}</g>`);
  }
  if (!outlines) fail('No supported closed vector outlines were found. Export the pattern pieces as SVG.');
  if (openCurves) warnings.push(`${openCurves} open curves were excluded. Keep grainlines and construction guides separately.`);
  if (unsupported) warnings.push(`${unsupported} rounded or empty rectangle outlines were excluded. Export these shapes as curves or SVG.`);
  if (unsupportedShapes) warnings.push(`${unsupportedShapes} objects with unsupported vector geometry were excluded. Export these shapes as curves or SVG.`);
  if (pages > 1) warnings.push(`${pages} pages are retained as separate groups. Select the page and garment size you need.`);
  const height = heightMm * pages + 10 * (pages - 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${number(widthMm)}mm" height="${number(height)}mm" viewBox="0 0 ${number(widthMm)} ${number(height)}"><g fill="none" stroke="#111827" stroke-width="0.5">${pageGroups.join('')}</g></svg>`;
  if (Buffer.byteLength(svg) > MAX_OUTPUT) fail('The converted outlines exceed the supported output limit.');
  return { svg, warnings, pages, outlines, pointCount, pageWidthMm: widthMm, pageHeightMm: heightMm };
}
