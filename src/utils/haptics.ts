export type FlutterHapticMethod =
  | 'HapticFeedback.lightImpact()'
  | 'HapticFeedback.mediumImpact()'
  | 'HapticFeedback.heavyImpact()'
  | 'HapticFeedback.selectionClick()';

export interface HapticEventLog {
  id: string;
  timestamp: string;
  method: FlutterHapticMethod;
  reasonRu: string;
}

let audioCtx: AudioContext | null = null;

function playTactileClick(freqHz: number, durationMs: number, gainLevel: number) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqHz, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freqHz * 0.45),
      audioCtx.currentTime + durationMs / 1000
    );

    gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + durationMs / 1000
    );

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio context restrictions during automated runs
  }
}

export function triggerFlutterHaptic(
  method: FlutterHapticMethod,
  reasonRu: string,
  onLog?: (entry: HapticEventLog) => void
): HapticEventLog {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      switch (method) {
        case 'HapticFeedback.selectionClick()':
          navigator.vibrate(8);
          break;
        case 'HapticFeedback.lightImpact()':
          navigator.vibrate(16);
          break;
        case 'HapticFeedback.mediumImpact()':
          navigator.vibrate(28);
          break;
        case 'HapticFeedback.heavyImpact()':
          navigator.vibrate([35, 25, 45]);
          break;
      }
    } catch {
      // Ignore vibration errors
    }
  }

  switch (method) {
    case 'HapticFeedback.selectionClick()':
      playTactileClick(240, 22, 0.05);
      break;
    case 'HapticFeedback.lightImpact()':
      playTactileClick(180, 35, 0.09);
      break;
    case 'HapticFeedback.mediumImpact()':
      playTactileClick(145, 48, 0.12);
      break;
    case 'HapticFeedback.heavyImpact()':
      playTactileClick(110, 65, 0.16);
      break;
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const entry: HapticEventLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: timeStr,
    method,
    reasonRu,
  };

  onLog?.(entry);
  return entry;
}
