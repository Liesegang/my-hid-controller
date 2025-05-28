import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: [
          'node-hid',
          '@nut-tree-fork/nut-js',
          '@nut-tree-fork/libnut',
          '@nut-tree-fork/libnut-darwin',
          '@nut-tree-fork/libnut-win32',
          '@nut-tree-fork/libnut-linux',
          '@paymoapp/active-window',
          'bufferutil',
          'utf-8-validate'
        ]
      },
      commonjsOptions: {
        ignoreDynamicRequires: true
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
