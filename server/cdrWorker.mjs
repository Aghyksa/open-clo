import { parentPort } from 'node:worker_threads';
import { convertCdrToSvg } from './cdrImport.mjs';

parentPort.once('message', (source) => {
  try { parentPort.postMessage({ result: convertCdrToSvg(Buffer.from(source)) }); }
  catch (error) { parentPort.postMessage({ error: error instanceof Error ? error.message : 'Unable to read this CorelDRAW file.' }); }
  parentPort.close();
});
