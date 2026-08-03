import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const assetCandidates = [
  path.resolve(import.meta.dirname, "..", "attached_assets"),
  path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
];

const attachedAssetsPath =
  assetCandidates.find((candidate) => existsSync(candidate)) ??
  assetCandidates[0];

const adminLoginVideoDirectory = path.resolve(
  import.meta.dirname,
  "public",
  "assets",
  "admin-login-video",
);

const adminLoginVideoBase64 = ["part-00.b64", "part-01.b64", "part-02.b64"]
  .map((fileName) =>
    readFileSync(path.join(adminLoginVideoDirectory, fileName), "utf8").trim(),
  )
  .join("");

if (!adminLoginVideoBase64.startsWith("AAAAIGZ0eXB")) {
  throw new Error("The embedded Admin login video is missing or invalid.");
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  define: {
    __ADMIN_LOGIN_VIDEO_BASE64__: JSON.stringify(adminLoginVideoBase64),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": attachedAssetsPath,
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
