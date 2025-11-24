import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Göreceli yollar kullanarak önizleme hatalarını azaltır
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});