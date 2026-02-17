import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CURSOR: Mark native/binary packages as external to prevent bundler from transforming __dirname
  // ffmpeg-static uses __dirname to locate the binary, which breaks when bundled
  serverExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg', 'better-sqlite3'],

  // CURSOR: Exclude node-only packages from browser bundle so onnxruntime-web (WASM) loads correctly
  // Required by @huggingface/transformers for client-side inference (Kokoro TTS, Whisper)
  // See: https://huggingface.co/docs/transformers.js/en/tutorials/next
  turbopack: {
    resolveAlias: {
      'onnxruntime-node': { browser: './src/lib/stubs/empty.js' },
      sharp: { browser: './src/lib/stubs/empty.js' },
    },
  },
};

export default nextConfig;
