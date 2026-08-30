// Generates a lightweight placeholder audio track for the Listening Session
// preview. This is NOT real speech — it is a gentle segmented tone whose note
// changes align with the transcript cue boundaries, so the synced-transcript UX
// (active line highlight + click-to-seek) can be demonstrated end-to-end before
// real narration audio is authored.
//
// Run: node scripts/generate-sample-audio.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 16000;
const DURATION_SECONDS = 96;
const AMPLITUDE = 0.16;

// Cue boundaries (seconds) — must match transcriptCues start times in the sample.
const CUE_STARTS = [0, 3, 10, 18, 25, 32, 38, 42, 49, 56, 60, 68, 75, 81];
// A soft pentatonic cycle so each transcript line sounds distinct.
const SCALE = [220, 247, 262, 294, 330, 392, 440];

function noteForTime(t) {
  let index = 0;
  for (let i = 0; i < CUE_STARTS.length; i += 1) {
    if (t >= CUE_STARTS[i]) index = i;
  }
  return SCALE[index % SCALE.length];
}

function segmentBounds(t) {
  let start = 0;
  let end = DURATION_SECONDS;
  for (let i = 0; i < CUE_STARTS.length; i += 1) {
    if (t >= CUE_STARTS[i]) {
      start = CUE_STARTS[i];
      end = i + 1 < CUE_STARTS.length ? CUE_STARTS[i + 1] : DURATION_SECONDS;
    }
  }
  return { start, end };
}

const totalSamples = SAMPLE_RATE * DURATION_SECONDS;
const dataSize = totalSamples * 2; // 16-bit mono
const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write('RIFF', 0, 'ascii');
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8, 'ascii');
buffer.write('fmt ', 12, 'ascii');
buffer.writeUInt32LE(16, 16); // PCM chunk size
buffer.writeUInt16LE(1, 20); // audio format = PCM
buffer.writeUInt16LE(1, 22); // channels = mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
buffer.writeUInt16LE(2, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample
buffer.write('data', 36, 'ascii');
buffer.writeUInt32LE(dataSize, 40);

const FADE = 0.03; // 30ms fade in/out per segment to avoid clicks

for (let i = 0; i < totalSamples; i += 1) {
  const t = i / SAMPLE_RATE;
  const freq = noteForTime(t);
  const { start, end } = segmentBounds(t);
  const intoSeg = t - start;
  const segLen = end - start;

  // per-segment envelope
  let env = 1;
  if (intoSeg < FADE) env = intoSeg / FADE;
  else if (segLen - intoSeg < FADE) env = Math.max(0, (segLen - intoSeg) / FADE);

  // gentle vibrato + soft second harmonic for a warmer tone
  const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t);
  const fundamental = Math.sin(2 * Math.PI * freq * vibrato * t);
  const harmonic = 0.25 * Math.sin(2 * Math.PI * freq * 2 * t);
  const sample = AMPLITUDE * env * (fundamental + harmonic);

  const clamped = Math.max(-1, Math.min(1, sample));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

const outPath = resolve(process.cwd(), 'public/audio/sample-listening-orientation.wav');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buffer);
console.log(`wrote ${outPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, ${DURATION_SECONDS}s)`);
