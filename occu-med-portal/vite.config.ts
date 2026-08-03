import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// pnpm runs this package's build script with the portal package as cwd.
// Using cwd avoids Vite's temporary bundled-config directory.
const projectRoot = process.cwd();

const assetCandidates = [
  path.resolve(projectRoot, "..", "attached_assets"),
  path.resolve(projectRoot, "..", "..", "attached_assets"),
];

const attachedAssetsPath =
  assetCandidates.find((candidate) => existsSync(candidate)) ??
  assetCandidates[0];

const adminLoginVideoDirectory = path.resolve(
  projectRoot,
  "public",
  "assets",
  "admin-login-video",
);

const generatedAdminVideoPath = path.resolve(
  projectRoot,
  "public",
  "assets",
  "admin-login-background.mp4",
);

const adminLoginVideoParts = ["part-00.b64", "part-01.b64", "part-02.b64"];

function isValidMp4(bytes: Buffer): boolean {
  if (bytes.length < 100_000) return false;
  return bytes.subarray(4, 12).toString("ascii").includes("ftyp");
}

function prepareAdminLoginVideo(): void {
  try {
    const encodedParts = adminLoginVideoParts.map((fileName) =>
      readFileSync(path.join(adminLoginVideoDirectory, fileName), "utf8").trim(),
    );

    if (encodedParts.some((part) => !part)) {
      throw new Error("one or more video fragments are empty");
    }

    // Support both ways the historical fragments may have been produced:
    // 1) chunks of one continuous Base64 string, or
    // 2) separately Base64-encoded binary chunks.
    const candidates = [
      Buffer.from(encodedParts.join(""), "base64"),
      Buffer.concat(encodedParts.map((part) => Buffer.from(part, "base64"))),
    ];

    const adminLoginVideoBytes = candidates.find(isValidMp4);

    if (!adminLoginVideoBytes) {
      throw new Error("the reconstructed bytes do not contain a valid MP4 header");
    }

    mkdirSync(path.dirname(generatedAdminVideoPath), { recursive: true });

    const existingAdminVideo = existsSync(generatedAdminVideoPath)
      ? readFileSync(generatedAdminVideoPath)
      : null;

    if (!existingAdminVideo || !existingAdminVideo.equals(adminLoginVideoBytes)) {
      writeFileSync(generatedAdminVideoPath, adminLoginVideoBytes);
    }
  } catch (error) {
    // The Admin background is decorative and must never take the entire portal
    // offline. Login.tsx already has a visible cosmic fallback when this asset
    // cannot be prepared.
    if (existsSync(generatedAdminVideoPath)) {
      try {
        const existingBytes = readFileSync(generatedAdminVideoPath);
        if (!isValidMp4(existingBytes)) unlinkSync(generatedAdminVideoPath);
      } catch {
        // Ignore cleanup failures and continue the application build.
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[admin-login-video] Skipping optional background video: ${message}`);
  }
}

prepareAdminLoginVideo();

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(projectRoot, ".."),
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
      "@": path.resolve(projectRoot, "src"),
      "@assets": attachedAssetsPath,
    },
    dedupe: ["react", "react-dom"],
  },
  root: projectRoot,
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
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
