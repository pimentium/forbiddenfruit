import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// BASE_PATH is the URL prefix the app is served under (e.g. /forbiddenfruit/ behind a reverse proxy). Default: the root.
const base = `/${(process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

// Version shown in the footer: the commit built. APP_COMMIT_SHA / APP_COMMIT_DATE (ISO 8601) can be set by the build
// (the deploy workflow does); otherwise the local git checkout is asked; otherwise the footer says "dev".
function git(args: string): string {
  try { return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}
const commit = process.env.APP_COMMIT_SHA || git('rev-parse HEAD');
const commitDate = process.env.APP_COMMIT_DATE || git('log -1 --format=%cI');

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify({ commit, date: commitDate }) },
  base,
  root: 'client',
  envDir: '..', // read .env from the project root
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  build: { outDir: 'dist' },
});
