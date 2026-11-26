import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main.ts'),
      },
      rollupOptions: {
        external: [
          'electron',
          'node-hid',
          '@nut-tree-fork/nut-js',
          'ws',
          '@paymoapp/active-window',
        ],
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload.ts'),
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
  },
}); 