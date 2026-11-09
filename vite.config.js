import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@react-three/rapier') || id.includes('@dimforge/rapier')) return 'physics';
          if (id.includes('@react-three/drei') || id.includes('@react-three/fiber')) return 'r3f';
          if (id.includes('/three/')) return 'three';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react';
          return undefined;
        },
      },
    },
  },
});
