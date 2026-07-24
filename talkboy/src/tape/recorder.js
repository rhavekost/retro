/**
 * The microphone. Captures with MediaRecorder, then decodes the result into an
 * AudioBuffer so the transport can lay it onto the tape at the head position.
 *
 * The live level meter comes off an AnalyserNode on the same stream rather than
 * out of the recorder, so the needle moves while you are still talking.
 */
import { getAudio } from '../../../shared/audio/context.js';

export const isMicSupported = () =>
  Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder === 'function';

export const createRecorder = () => {
  let stream = null;
  let analyser = null;
  let samples = null;
  let recorder = null;
  let chunks = [];

  /**
   * Asks for the microphone once and keeps the stream open, so pressing RECORD
   * a second time does not re-prompt or clip the first half-second.
   */
  const arm = async () => {
    if (stream) return true;
    if (!isMicSupported()) return false;

    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    const ctx = getAudio();
    if (ctx) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      // Deliberately not connected to the destination: monitoring the mic
      // through the speakers is a feedback loop waiting to happen.
      ctx.createMediaStreamSource(stream).connect(analyser);
      samples = new Float32Array(analyser.fftSize);
    }
    return true;
  };

  const start = () => {
    if (!stream) return false;
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.start();
    return true;
  };

  /** Resolves with the decoded AudioBuffer, or null if nothing usable landed. */
  const stop = () =>
    new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.addEventListener(
        'stop',
        async () => {
          const ctx = getAudio();
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          recorder = null;
          if (!ctx || blob.size === 0) {
            resolve(null);
            return;
          }
          try {
            resolve(await ctx.decodeAudioData(await blob.arrayBuffer()));
          } catch {
            // A codec the context cannot decode is a dead tape, not a crash.
            resolve(null);
          }
        },
        { once: true },
      );

      recorder.stop();
    });

  /** Current input level, 0–1, for the VU meter. */
  const level = () => {
    if (!analyser || !samples) return 0;
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    // A little headroom and a curve, so normal speech fills most of the meter.
    return Math.min(1, rms * 4.5);
  };

  const dispose = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    analyser = null;
  };

  return { arm, start, stop, level, dispose, get isArmed() { return Boolean(stream); } };
};
