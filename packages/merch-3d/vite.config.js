import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'Merch3D',
      fileName: 'merch-3d',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [
        '@react-three/drei',
        '@react-three/fiber',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'three',
        'three/addons/utils/BufferGeometryUtils.js',
      ],
      output: {
        globals: {
          '@react-three/drei': 'ReactThreeDrei',
          '@react-three/fiber': 'ReactThreeFiber',
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          three: 'THREE',
          'three/addons/utils/BufferGeometryUtils.js': 'THREE.BufferGeometryUtils',
        },
      },
    },
  },
});
