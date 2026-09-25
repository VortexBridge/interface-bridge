import { execFileSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import viteImagemin from "vite-plugin-imagemin";

const directory = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.VORTEX_APP_TARGET || "public";

if (!new Set(["public", "operator"]).has(target)) {
  throw new Error("VORTEX_APP_TARGET must be exactly public or operator");
}

function revision() {
  if (process.env.VORTEX_BUILD_REVISION) return process.env.VORTEX_BUILD_REVISION;
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function applicationBoundary() {
  return {
    name: "vortex-application-boundary",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (target === "public" && pathname === "/operator.html") {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
        if (target === "operator" && pathname === "/index.html") {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
        const operatorNavigation = pathname === "/" || (
          !path.extname(pathname) &&
          !pathname.startsWith("/@") &&
          !pathname.startsWith("/src/") &&
          !pathname.startsWith("/node_modules/")
        );
        if (target === "operator" && operatorNavigation) {
          request.url = "/operator.html";
        }
        next();
      });
    },
    generateBundle(_options, bundle) {
      if (target !== "operator") return;
      this.emitFile({
        type: "asset",
        fileName: "operator-artifact.json",
        source: `${JSON.stringify({
          schemaVersion: 1,
          application: "vortex-operator-ui",
          version: "0.2.0",
          revision: revision(),
          operatorApi: { minimum: "v1", maximum: "v1" },
          originModel: "dedicated-loopback",
        }, null, 2)}\n`,
      });
    },
    closeBundle() {
      if (target !== "operator") return;
      const source = path.resolve(directory, "build/operator/operator.html");
      const destination = path.resolve(directory, "build/operator/index.html");
      if (!existsSync(source)) throw new Error("operator build did not produce its private document");
      renameSync(source, destination);
    },
  };
}

export default defineConfig({
  resolve: {
    alias: { "~": path.resolve(directory, "./src") },
    extensions: [".js", ".jsx", ".json", ".scss"],
  },
  publicDir: target === "public" ? "public" : false,
  server: {
    host: "127.0.0.1",
    port: target === "public" ? 5173 : 5174,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: target === "public" ? 4173 : 4174,
    strictPort: true,
  },
  build: {
    target: "ES2022",
    outDir: target === "public" ? "build/public" : "build/operator",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(directory, target === "public" ? "index.html" : "operator.html"),
      output: target === "public" ? {
        manualChunks: {
          lodash: ["lodash"],
          koilib: ["koilib"],
          notistack: ["notistack"],
          uuid: ["uuid"],
          ethers: ["ethers"],
          buffer: ["buffer"],
        },
      } : undefined,
    },
  },
  plugins: [
    applicationBoundary(),
    react({
      jsxImportSource: "@emotion/react",
      babel: { plugins: ["@emotion/babel-plugin"] },
    }),
    svgr({ svgrOptions: { icon: true } }),
    ...(target === "public" ? [viteImagemin({
      gifsicle: { optimizationLevel: 7, interlaced: false },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 20 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      svgo: { plugins: [{ name: "removeViewBox" }, { name: "removeEmptyAttrs", active: false }] },
    })] : []),
  ],
});
