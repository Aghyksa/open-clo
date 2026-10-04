import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { convertCdrToSvg } from './server/cdrImport.mjs';

function chunk(tag, data) {
  const header = Buffer.alloc(8);
  header.write(tag, 0, 'ascii');
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, ...(data.length & 1 ? [Buffer.alloc(1)] : [])]);
}

function list(tag, children) {
  return chunk(tag === 'CDRN' ? 'RIFF' : 'LIST', Buffer.concat([Buffer.from(tag), ...children]));
}

function inline(data) {
  const result = Buffer.alloc(16);
  result.writeUInt32LE(0xffffffff, 0);
  result.writeUInt32LE(data.length, 4);
  data.copy(result, 8);
  return result;
}

function external(stream, length, offset) {
  const result = Buffer.alloc(16);
  result.writeUInt32LE(stream, 0);
  result.writeUInt32LE(length, 4);
  result.writeUInt32LE(offset, 8);
  return result;
}

function table(type, argument) {
  const header = Buffer.alloc(28);
  header.writeUInt32LE(28 + argument.length, 0);
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(20, 8);
  header.writeUInt32LE(24, 12);
  header.writeUInt32LE(type, 16);
  header.writeUInt32LE(28, 20);
  header.writeUInt32LE(30, 24);
  return Buffer.concat([header, argument]);
}

function curve(open = false) {
  const points = [[0, 0], [100000, -50000], [200000, -50000], [300000, 0], [300000, -500000], [0, -500000], [0, 0]];
  const data = Buffer.alloc(4 + points.length * 9);
  data.writeUInt16LE(points.length, 0);
  points.forEach(([x, y], i) => { data.writeInt32LE(x, 4 + i * 8); data.writeInt32LE(y, 8 + i * 8); });
  Buffer.from([12, 192, 192, 132, 68, 68, open ? 68 : 72]).copy(data, 4 + points.length * 8);
  return table(3, data);
}

function rectangle(rounded = false) {
  const data = Buffer.alloc(120);
  data.writeDoubleLE(400000, 0);
  data.writeDoubleLE(-100000, 8);
  data.writeDoubleLE(1, 16);
  data.writeDoubleLE(1, 24);
  if (rounded) data.writeDoubleLE(0.5, 40);
  return table(1, data);
}

function transform(nonfinite = false) {
  const data = Buffer.alloc(80);
  data.writeUInt32LE(80, 0);
  data.writeUInt32LE(1, 4);
  data.writeUInt32LE(12, 8);
  data.writeUInt32LE(16, 12);
  data.writeUInt16LE(8, 24);
  [0, -1, 400000, 1, 0, 300000].forEach((number, i) => data.writeDoubleLE(nonfinite && i === 0 ? Infinity : number, 32 + i * 8));
  return data;
}

function zip(entries, options = {}) {
  const files = [];
  const directories = [];
  let offset = 0;
  for (const [name, value, config = {}] of entries) {
    const method = config.method ?? 8;
    const compressed = config.compressed ?? (method === 8 ? deflateRawSync(value) : value);
    const nameData = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(config.flags ?? 0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(value), 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(config.size ?? value.length, 22);
    local.writeUInt16LE(nameData.length, 26);
    const file = Buffer.concat([local, nameData, compressed]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(config.flags ?? 0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(config.badCrc ? 0 : crc32(value), 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(config.size ?? value.length, 24);
    central.writeUInt16LE(nameData.length, 28);
    central.writeUInt32LE(offset, 42);
    files.push(file);
    directories.push(Buffer.concat([central, nameData]));
    offset += file.length;
  }
  const directory = Buffer.concat(directories);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(options.zip64 ? 0xffffffff : offset, 16);
  return Buffer.concat([...files, directory, end]);
}

export function createCdrFixture(options = {}) {
  const vector = [];
  const objects = [];
  let offset = 0;
  for (const [index, loda] of [curve(options.open), rectangle(options.rounded)].entries()) {
    const trafo = transform(options.nonfinite);
    const bbox = Buffer.alloc(16);
    (index === 0 ? [400000, 600000, 900000, 300000] : [400000, 700000, 500000, 300000])
      .forEach((value, axis) => bbox.writeInt32LE(value + (options.badBounds && axis === 0 ? 1000 : 0), axis * 4));
    objects.push(list('obj ', [chunk('loda', external(options.bitmapReference ? 0 : 1, loda.length, offset)),
      list('trfl', [chunk('trfd', external(1, trafo.length, offset + loda.length))]),
      chunk('bbox', external(1, bbox.length, offset + loda.length + trafo.length))]));
    vector.push(loda, trafo, bbox);
    offset += loda.length + trafo.length + bbox.length;
  }
  const flag = Buffer.alloc(4);
  const version = Buffer.alloc(2);
  version.writeUInt16LE(options.version ?? 2200);
  const masterFlag = Buffer.alloc(4);
  masterFlag.writeUInt32LE(0x10000);
  const page = list('page', [chunk('flgs', inline(flag)), list('layr', [...objects,
    ...(options.clipResources ? [list('clpt', objects), list('vect', objects)] : [])])]);
  const root = list('CDRN', [chunk('vrsn', inline(version)), list('page', [chunk('flgs', inline(masterFlag))]), page,
    ...(options.twoPages ? [page] : [])]);
  const metadata = Buffer.from(`<x:xmpmeta><cdr:CoreVersion>${options.version ?? 2200}</cdr:CoreVersion><cdrinfo:NumPages>${options.twoPages ? 2 : 1}</cdrinfo:NumPages><cdrinfo:PageWidth>1000000</cdrinfo:PageWidth><cdrinfo:PageHeight>2000000</cdrinfo:PageHeight></x:xmpmeta>`);
  return zip([
    ['content/root.dat', root, options.badCrc ? { badCrc: true } : {}],
    ['content/dataFileList.dat', Buffer.from('Bitmaps.dat\npage1.dat')],
    ['META-INF/metadata.xml', metadata, options.encrypted ? { flags: 1 } : {}],
    ['content/data/page1.dat', Buffer.concat(vector), options.oversize ? { size: 3 * 1024 * 1024 } : {}],
    ['content/data/Bitmaps.dat', Buffer.alloc(0), { size: 794595804, compressed: Buffer.from([255]) }],
  ], options);
}

const fixture = createCdrFixture;
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
const result = convertCdrToSvg(fixture());
assert.equal(result.outlines, 2);
assert.equal(result.pages, 1);
assert.equal(result.pointCount, 11);
assert.equal(result.pageWidthMm, 100);
assert.equal(result.pageHeightMm, 200);
assert.match(result.svg, /width="100mm" height="200mm"/);
assert.match(result.svg, /M90 70 C95 60 95 50 90 40 L140 40 L140 70 L90 70 Z/);
assert.match(result.svg, /M90 70 L100 70 L100 30 L90 30 Z/);
assert.ok(result.warnings.some((warning) => warning.includes('Bitmap')));
assert.equal(convertCdrToSvg(fixture({ clipResources: true })).outlines, 2, 'clipping and vector resources are excluded');

const pages = convertCdrToSvg(fixture({ twoPages: true }));
assert.equal(pages.outlines, 4);
assert.match(pages.svg, /height="410mm"/);
assert.match(pages.svg, /M90 280 C95 270/);

const open = convertCdrToSvg(fixture({ open: true }));
assert.equal(open.outlines, 1);
assert.ok(open.warnings.some((warning) => warning.includes('1 open curves')));
const rounded = convertCdrToSvg(fixture({ rounded: true }));
assert.equal(rounded.outlines, 1);
assert.ok(rounded.warnings.some((warning) => warning.includes('1 rounded')));

for (const [options, message] of [
  [{ version: 2100 }, /version 22/],
  [{ nonfinite: true }, /invalid dimensions/],
  [{ badCrc: true }, /checksum/],
  [{ encrypted: true }, /Encrypted/],
  [{ zip64: true }, /ZIP64/],
  [{ oversize: true }, /size limit/],
  [{ bitmapReference: true }, /bitmap or embedded/],
  [{ badBounds: true }, /native dimensions/],
]) assert.throws(() => convertCdrToSvg(fixture(options)), message);
assert.throws(() => convertCdrToSvg(Buffer.alloc(33 * 1024 * 1024)), /32 MB/);
assert.throws(() => convertCdrToSvg(fixture().subarray(0, 100)), /ZIP-based/);
assert.throws(() => convertCdrToSvg(zip([['../unsafe', Buffer.alloc(0)]])), /invalid or duplicate/);
console.log('CDR import checks passed: original units, Bézier curves, rotated rectangles, page grouping, skipped 794 MB bitmap, and malformed archive limits.');
}
