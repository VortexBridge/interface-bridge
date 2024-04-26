import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import viteImagemin from 'vite-plugin-imagemin'

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
      viteImagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false,
        },
        optipng: {
          optimizationLevel: 7,
        },
        mozjpeg: {
          quality: 20,
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4,
        },
        svgo: {
          plugins: [
            {
              name: 'removeViewBox',
            },
            {
              name: 'removeEmptyAttrs',
              active: false,
            },
          ],
        },
      }),
    ],
  };
});