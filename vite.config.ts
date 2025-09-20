import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// We no longer inject API keys via define; use Vite's `VITE_` prefixed variables directly: import.meta.env.VITE_API_KEY
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
