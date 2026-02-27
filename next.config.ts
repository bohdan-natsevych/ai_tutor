import type { NextConfig } from "next";
import { readFileSync } from "fs";

// CURSOR: Read installed onnxruntime-web version at build time.
// piper-tts-web hardcodes a broken CDN URL for WASM files (cdnjs 1.18.0 lacks .mjs loaders).
// We resolve the actual installed version and expose it so the Piper provider can construct
// a matching jsdelivr CDN URL at runtime.
let ortVersion = '1.24.2';
try {
  const ortPkg = JSON.parse(readFileSync('node_modules/onnxruntime-web/package.json', 'utf8'));
  ortVersion = ortPkg.version;
} catch {
  // Fallback if package.json can't be read
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ORT_WASM_VERSION: ortVersion,
  },
  // CURSOR: Mark native/binary packages as external to prevent bundler from transforming __dirname
  // ffmpeg-static uses __dirname to locate the binary, which breaks when bundled
  serverExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg', 'better-sqlite3'],
  // CURSOR: Piper TTS WASM bundle contains require('fs') / require('path') behind Node.js
  // environment guards. Turbopack can't resolve these for client builds, so we stub them.
  turbopack: {
    resolveAlias: {
      fs: { browser: './noop.js' },
      path: { browser: './noop.js' },
    },
  },
};

export default nextConfig;
