import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the build works under https://<owner>.github.io/<repo>/ without configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
});
