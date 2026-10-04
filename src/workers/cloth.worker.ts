import { ClothSimulator } from '../utils/clothSimulation';
import type { ClothWorkerRequest, ClothWorkerResponse } from './clothProtocol';

interface WorkerPort {
  onmessage: ((event: MessageEvent<ClothWorkerRequest>) => void) | null;
  postMessage: (message: ClothWorkerResponse, transfer?: ArrayBuffer[]) => void;
}

interface Job {
  id: number;
  paused: boolean;
  resume?: () => void;
  buffers: Float32Array<ArrayBuffer>[];
  length: number;
}

const port = globalThis as unknown as WorkerPort;
const MAX_STEPS = 480;
const UPDATE_INTERVAL = 50;
let active: Job | null = null;

async function yieldToMessages(job: Job) {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (active === job && job.paused) await new Promise<void>((resolve) => { job.resume = resolve; });
  return active === job;
}

function assertFinite(positions: Float32Array) {
  if (positions.some((value) => !Number.isFinite(value))) throw new Error('The pattern produced an invalid drape. Check its dimensions.');
}

async function build(request: Extract<ClothWorkerRequest, { type: 'build' }>, job: Job) {
  const numericSettings = [request.avatar.height, request.avatar.chestCircumference, request.avatar.waistCircumference,
    request.avatar.hipsCircumference, request.material.stretchStiffness, request.material.bendingStiffness,
    request.material.friction, request.material.density];
  if (numericSettings.some((value) => !Number.isFinite(value)) || request.pieces.some((piece) =>
    piece.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) {
    throw new Error('The pattern contains invalid dimensions. Check its points and fabric settings.');
  }
  if (!await yieldToMessages(job)) return;
  const sim = ClothSimulator.create(request.pieces, request.seams, request.material, request.avatar);
  if (!sim) { port.postMessage({ type: 'empty', id: job.id }); return; }
  for (const _batch of sim.assembleBatches()) {
    if (!await yieldToMessages(job)) return;
  }
  assertFinite(sim.positions);
  const positions = new Float32Array(sim.positions);
  const uvs = new Float32Array(sim.mesh.uvs);
  const indices = new Uint32Array(sim.mesh.indices);
  job.length = positions.length;
  job.buffers = [new Float32Array(job.length), new Float32Array(job.length)];
  port.postMessage({ type: 'mesh', id: job.id, positions, uvs, indices, groups: sim.mesh.groups },
    [positions.buffer, uvs.buffer, indices.buffer]);
  let steps = 0;
  let lastUpdate = performance.now();
  while (active === job && steps < MAX_STEPS && !sim.isSettled()) {
    if (!await yieldToMessages(job)) return;
    for (let batch = 0; batch < 4 && steps < MAX_STEPS && !sim.isSettled(); batch++, steps++) sim.step(1 / 60);
    const finished = steps >= MAX_STEPS || sim.isSettled();
    const now = performance.now();
    if (!finished && now - lastUpdate < UPDATE_INTERVAL) continue;
    const frame = job.buffers.pop() || (finished ? new Float32Array(job.length) : null);
    if (!frame) continue;
    assertFinite(sim.positions);
    frame.set(sim.positions);
    port.postMessage({ type: 'frame', id: job.id, positions: frame, finished, settled: sim.isSettled() }, [frame.buffer]);
    lastUpdate = now;
  }
}

port.onmessage = ({ data }) => {
  if (data.type === 'build') {
    active?.resume?.();
    const job: Job = { id: data.id, paused: data.paused, buffers: [], length: 0 };
    active = job;
    void build(data, job).catch((error: unknown) => {
      if (active !== job) return;
      active = null;
      port.postMessage({ type: 'error', id: job.id, message: error instanceof Error ? error.message : 'The preview could not be draped.' });
    });
  } else if (active?.id === data.id) {
    if (data.type === 'pause') {
      active.paused = data.paused;
      if (!data.paused) { active.resume?.(); active.resume = undefined; }
    } else if (data.type === 'cancel') {
      active.resume?.();
      active = null;
    } else if (data.type === 'recycle' && data.positions.length === active.length && active.buffers.length < 2) {
      active.buffers.push(data.positions);
    }
  }
};
