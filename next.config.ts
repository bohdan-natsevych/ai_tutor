import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CURSOR: Mark native/binary packages as external to prevent bundler from transforming __dirname
  // ffmpeg-static uses __dirname to locate the binary, which breaks when bundled
  serverExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg', 'better-sqlite3'],
};

export default nextConfig;
