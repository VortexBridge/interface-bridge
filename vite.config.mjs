import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig(() => {

  return {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
      extensions: [
        ".js",
        ".jsx",
        ".json",
        ".scss",
      ],
    },
    build: {
      target: "ES2022",
      outDir: 'build',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'), // Replace with your entry file path
        output: {
          manualChunks: {
            lodash: ['lodash'],
            koilib: ['koilib'],
            notistack: ['notistack'],
            uuid: ['uuid'],
            ethers: ['ethers'],
            buffer: ['buffer'],
          }
        }
      },

    },
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin'],
        },
      }),
      svgr({ svgrOptions: { icon: true } }),
    ],
  };
});