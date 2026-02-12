// CURSOR: Audio format conversion utilities for OpenAI compatibility
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

// CURSOR: Set ffmpeg path from ffmpeg-static
// Note: ffmpeg-static must be in serverExternalPackages in next.config.ts
// to prevent bundler from transforming __dirname
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Convert audio buffer from one format to WAV
 * OpenAI audio models only accept wav format for input_audio
 */
export async function convertToWav(
  inputBuffer: Buffer,
  inputFormat: string
): Promise<Buffer> {
  // CURSOR: If already wav, return as-is
  if (inputFormat === 'wav') {
    return inputBuffer;
  }

  // CURSOR: Use temp files for conversion (more reliable on Windows)
  const tempId = randomUUID();
  const tempDir = tmpdir();
  const inputPath = join(tempDir, `input-${tempId}.${inputFormat}`);
  const outputPath = join(tempDir, `output-${tempId}.wav`);

  try {
    // Write input buffer to temp file
    writeFileSync(inputPath, inputBuffer);

    // Convert using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le') // 16-bit PCM for compatibility
        .audioFrequency(16000) // 16kHz sample rate (good for speech)
        .audioChannels(1) // Mono
        .on('error', (err) => {
          console.error('[Audio Convert] FFmpeg error:', err.message);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .save(outputPath);
    });

    // Read output file
    const outputBuffer = readFileSync(outputPath);
    return outputBuffer;
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(inputPath)) unlinkSync(inputPath);
      if (existsSync(outputPath)) unlinkSync(outputPath);
    } catch (cleanupErr) {
      console.warn('[Audio Convert] Cleanup error:', cleanupErr);
    }
  }
}
