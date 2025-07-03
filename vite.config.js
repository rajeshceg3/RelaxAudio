import { defineConfig } from 'vite';

export default defineConfig({
  // No specific config needed for this simple project yet.
  // Vite will automatically use index.html as the entry point.
  // We could add base: './' if issues with asset paths arise during build for specific hosting.
  build: {
    // Could add options like outDir, assetsDir if needed.
  },
  server: {
    // Could add port, open options.
  }
});
