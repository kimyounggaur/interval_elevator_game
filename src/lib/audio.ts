import { midiOf, type Note } from '@/engine/engine';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
type AudioNavigator = Navigator & { audioSession?: { type: string } };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let generation = 0;
const activeVoices = new Set<() => void>();

/** Call from a tap or key action. Audio is optional: failure never blocks play. */
export async function unlockAudio(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null;
  // Some browsers expose audioSession but reject an assignment. Keep audio usable.
  try {
    const session = (navigator as AudioNavigator).audioSession;
    if (session) session.type = 'playback';
  } catch { /* The playback hint is optional. */ }
  try {
    if (!context || context.state === 'closed') {
      const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!Constructor) return null;
      context = new Constructor();
      master = context.createGain();
      master.gain.value = 0.55;
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      compressor.connect(context.destination);
    }
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running' ? context : null;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, midi: number, when: number, duration: number): void {
  if (!master) return;
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.45, when + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, when);
  filter.frequency.exponentialRampToValueAtTime(900, when + duration);
  const fundamental = ctx.createOscillator();
  fundamental.type = 'triangle';
  fundamental.frequency.value = frequency;
  const overtone = ctx.createOscillator();
  overtone.type = 'sine';
  overtone.frequency.value = frequency * 2;
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;
  fundamental.connect(filter);
  overtone.connect(overtoneGain);
  overtoneGain.connect(filter);
  filter.connect(envelope);
  envelope.connect(master);

  let cleaned = false;
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    for (const oscillator of [fundamental, overtone]) {
      try { oscillator.stop(); } catch { /* Already ended. */ }
      oscillator.disconnect();
    }
    overtoneGain.disconnect();
    filter.disconnect();
    envelope.disconnect();
    activeVoices.delete(clean);
  };
  activeVoices.add(clean);
  overtone.onended = clean;
  fundamental.start(when);
  overtone.start(when);
  fundamental.stop(when + duration + 0.05);
  overtone.stop(when + duration + 0.05);
}

export async function playSequence(base: Note, upper: Note): Promise<void> {
  const request = generation;
  const ctx = await unlockAudio();
  if (!ctx || request !== generation) return;
  try {
    const start = ctx.currentTime + 0.03;
    tone(ctx, midiOf(base), start, 0.95);
    tone(ctx, midiOf(upper), start + 0.62, 1.1);
  } catch { /* Unsupported audio environments remain fully playable. */ }
}

export async function playTogether(base: Note, upper: Note, length = 1.7): Promise<void> {
  const request = generation;
  const ctx = await unlockAudio();
  if (!ctx || request !== generation) return;
  try {
    const start = ctx.currentTime + 0.03;
    const duration = Number.isFinite(length) ? Math.max(0.02, length) : 1.7;
    tone(ctx, midiOf(base), start, duration);
    tone(ctx, midiOf(upper), start, duration);
  } catch { /* Unsupported audio environments remain fully playable. */ }
}

/** Also cancels any notes waiting for a suspended AudioContext to resume. */
export function stopAudio(): void {
  generation += 1;
  for (const clean of Array.from(activeVoices)) clean();
}
