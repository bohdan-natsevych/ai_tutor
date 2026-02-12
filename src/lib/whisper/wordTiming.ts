// CURSOR: Whisper word timing utility
// Uses transformers.js to get precise word timestamps from audio

import { pipeline, env } from '@huggingface/transformers';

// CURSOR: Configure transformers.js for browser use
env.allowLocalModels = false;

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

// CURSOR: Singleton pipeline instance to avoid reloading model
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whisperPipeline: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// CURSOR: Initialize Whisper pipeline (lazy load)
async function getWhisperPipeline() {
  if (whisperPipeline) {
    return whisperPipeline;
  }

  if (isInitializing && initPromise) {
    await initPromise;
    return whisperPipeline;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // CURSOR: Use whisper-tiny.en_timestamped which supports word-level timestamps
      // English-only model, smaller (~75MB), exported with output_attentions=True
      whisperPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en_timestamped',
        {
          dtype: 'fp32', // Timestamped model works best with fp32
          device: 'webgpu', // Use WebGPU if available
        }
      );
    } catch (error) {
      console.error('[Whisper] Failed to initialize with WebGPU, falling back to WASM:', error);
      // CURSOR: Fallback to WASM if WebGPU not available
      whisperPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en_timestamped',
        {
          dtype: 'fp32',
          device: 'wasm',
        }
      );
    }
  })();

  await initPromise;
  isInitializing = false;
  return whisperPipeline;
}

// CURSOR: Extract word timestamps from audio
// Takes WAV audio ArrayBuffer and returns array of word timestamps
export async function getWordTimestamps(audioBuffer: ArrayBuffer): Promise<WordTimestamp[]> {
  try {
    const pipe = await getWhisperPipeline();
    if (!pipe) {
      console.error('[Whisper] Pipeline not available');
      return [];
    }

    // CURSOR: Convert ArrayBuffer to Float32Array for Whisper
    // Whisper expects mono 16kHz audio
    const audioData = await decodeAudioToFloat32(audioBuffer);

    // CURSOR: Run transcription with word-level timestamps
    const result = await pipe(audioData, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    // CURSOR: Extract word timestamps from result
    if (result && typeof result === 'object' && 'chunks' in result) {
      const chunks = (result as { chunks: Array<{ text: string; timestamp: [number, number] }> }).chunks;
      return chunks.map((chunk) => ({
        word: chunk.text.trim(),
        start: chunk.timestamp[0],
        end: chunk.timestamp[1],
      }));
    }

    return [];
  } catch (error) {
    console.error('[Whisper] Failed to get word timestamps:', error);
    return [];
  }
}

// CURSOR: Decode audio ArrayBuffer to Float32Array at 16kHz
// Whisper expects 16kHz mono audio
async function decodeAudioToFloat32(audioBuffer: ArrayBuffer): Promise<Float32Array> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  
  try {
    const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice(0));
    
    // Get mono channel (use first channel or mix down)
    const channelData = decodedAudio.getChannelData(0);
    
    // CURSOR: Resample to 16kHz if needed
    if (decodedAudio.sampleRate !== 16000) {
      const resampledLength = Math.round(channelData.length * 16000 / decodedAudio.sampleRate);
      const resampled = new Float32Array(resampledLength);
      
      for (let i = 0; i < resampledLength; i++) {
        const srcIndex = (i * decodedAudio.sampleRate) / 16000;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, channelData.length - 1);
        const t = srcIndex - srcIndexFloor;
        resampled[i] = channelData[srcIndexFloor] * (1 - t) + channelData[srcIndexCeil] * t;
      }
      
      return resampled;
    }
    
    return channelData;
  } finally {
    await audioContext.close();
  }
}

// CURSOR: Transcribe audio and return just the text (no timestamps)
// Uses the same local Whisper model already loaded for word timing
export async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  try {
    const timestamps = await getWordTimestamps(audioBuffer);
    if (timestamps.length === 0) return '';
    return timestamps.map(t => t.word).join(' ');
  } catch (error) {
    console.error('[Whisper] Failed to transcribe:', error);
    return '';
  }
}

// CURSOR: Pre-initialize Whisper in background
// Call this early to avoid delay when first needed
export function preloadWhisper(): void {
  getWhisperPipeline().catch(console.error);
}

// CURSOR: Check if Whisper is ready
export function isWhisperReady(): boolean {
  return whisperPipeline !== null;
}
