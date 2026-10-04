import { build } from 'vite';
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'src/utils/projectData.ts', outDir: 'dist-server',
  rollupOptions: { output: { entryFileNames: 'projectData.mjs' } } } });
