import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is the URL prefix the app is served under (e.g. /forbiddenfruit/ behind a reverse proxy). Default: the root.
const base = `/${(process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

export default defineConfig({
  base,
  root: 'client',
  envDir: '..', // read .env from the project root
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  build: { outDir: 'dist' },
});
