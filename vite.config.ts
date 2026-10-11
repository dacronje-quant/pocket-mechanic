import { defineConfig } from 'vite';

// base './' makes every asset path relative, so the same build works at
// https://<user>.github.io/<any-repo-name>/ without editing this file.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB
    rollupOptions: {
      output: {
        // Phaser in its own file: it never changes between releases, so browsers keep it cached
        // and an update only downloads the game code.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: true },
});
