import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { target: 'es2020' },
  define: { __GIT_HASH__: JSON.stringify(gitHash) }
});
