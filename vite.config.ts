import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  return {
    // AUTOMATIC PATH SWITCHER
    // If running 'npm run build' on desktop, it uses the GitHub subfolder path.
    // If running in development or AI Studio simulator, it safely defaults to '/'.
    base: (process.env.GITHUB_PAGES === 'true' || (command === 'build' && !process.env.DISABLE_HMR))
      ? '/beacon_safewalkhome/'
      : '/',

    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});