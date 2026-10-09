import { defineConfig } from 'vite';

// base './' makes every asset path relative, so the same build works at
// https://<user>.github.io/<any-repo-name>/ without editing this file.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB
  },
  server: { host: true },
});
