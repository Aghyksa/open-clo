import { resolve } from 'node:path';
import { createApplication } from './app.mjs';
import { normalizeProject } from '../dist-server/projectData.mjs';

const production = process.env.NODE_ENV === 'production';
const publicOrigin = process.env.PUBLIC_ORIGIN;
if (production && (!publicOrigin || !publicOrigin.startsWith('https://'))) {
  throw new Error('Set PUBLIC_ORIGIN to the public HTTPS address before starting production.');
}
const port = Number(process.env.PORT || 3001);
const app = createApplication({ databasePath: resolve(process.env.DATABASE_PATH || 'data/openclo.sqlite'),
  normalizeProject, secureCookies: production, publicOrigin, staticDirectory: resolve('dist') });
app.server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`OpenCLO listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  app.server.close(() => { app.close(); process.exit(0); });
});
