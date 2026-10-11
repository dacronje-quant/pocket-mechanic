import { defineConfig } from 'vitest/config';

// Only this checkout's source tests belong to this run. Local asset staging
// and nested worktrees contain copies that can fail or inflate the results.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
