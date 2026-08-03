import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const adminLoginVideoParts = ["part-00.b64", "part-01.b64", "part-02.b64"];

// Each fragment was Base64-encoded separately. Decode each one first, then
// concatenate the binary bytes. Joining padded Base64 strings before decoding
// causes Node to stop at the first fragment's padding and produces a partial MP4.
const adminLoginVideoBytes = Buffer.concat(
  adminLoginVideoParts.map((fileName) => {
    const encodedPart = readFileSync(
      path.join(adminLoginVideoDirectory, fileName),
      "utf8",
    ).trim();

    if (!encodedPart) {
      throw new Error(`Admin login video fragment is empty: ${fileName}`);
    }

    return Buffer.from(encodedPart, "base64");
  }),
);

const adminVideoHeader = adminLoginVideoBytes.subarray(4, 12).toString("ascii");

if (adminLoginVideoBytes.length < 100_000 || !adminVideoHeader.includes("ftyp")) {
  throw new Error("The embedded Admin login video is missing or invalid.");
}

const generatedAdminVideoPath = path.resolve(
  projectRoot,
  "public",
  "assets",
  "admin-login-background.mp4",
);

mkdirSync(path.dirname(generatedAdminVideoPath), { recursive: true });

const existingAdminVideo = existsSync(generatedAdminVideoPath)
  ? readFileSync(generatedAdminVideoPath)
  : null;

if (!existingAdminVideo || !existingAdminVideo.equals(adminLoginVideoBytes)) {
  writeFileSync(generatedAdminVideoPath, adminLoginVideoBytes);
}

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
