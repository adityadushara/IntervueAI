/**
 * Microphone & Audio Input Management for IntervueAI Voice Engine
 * Handles explicit candidate permissions, audio device enumeration,
 * and live audio level analysis for speaking visualizers.
 */

import { AudioInputDevice, MicPermissionState } from './types';

export class MicrophoneManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private volumeCallback: ((volume: number) => void) | null = null;
  private animFrameId: number | null = null;

  /**
   * Checks if mediaDevices and getUserMedia are supported in the current environment.
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia)
    );
  }

  /**
   * Queries existing microphone permission status without triggering a prompt.
   */
  public async getPermissionStatus(): Promise<MicPermissionState> {
    if (!this.isSupported()) return 'unavailable';

    try {
      if (navigator.permissions && navigator.permissions.query) {
        // Some browsers may reject 'microphone' as PermissionName, catch gracefully
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'denied';
        return 'idle';
      }
    } catch {
      // Permissions API query not supported for microphone in this browser
    }

    return 'idle';
  }

  /**
   * Enumerate available audio input devices.
   */
  public async getAudioInputDevices(): Promise<AudioInputDevice[]> {
    if (!this.isSupported() || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          groupId: d.groupId,
        }));
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
      return [];
    }
  }

  /**
   * Explicitly requests microphone access with audio processing constraints.
   */
  public async requestAccess(deviceId?: string): Promise<{
    stream: MediaStream;
    permission: MicPermissionState;
  }> {
    if (!this.isSupported()) {
      throw new Error('Microphone access is not supported by your browser.');
    }

    this.stop(); // Stop any existing stream

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      this.initAudioAnalyser(stream);
      return { stream, permission: 'granted' };
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return { stream: null as unknown as MediaStream, permission: 'denied' };
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return { stream: null as unknown as MediaStream, permission: 'unavailable' };
      }
      throw error;
    }
  }

  /**
   * Attaches AudioContext AnalyserNode to calculate real-time volume (0.0 to 1.0).
   */
  private initAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        if (!this.analyser || !this.volumeCallback) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(1.0, Math.max(0.0, average / 128));

        this.volumeCallback(normalized);
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          this.animFrameId = window.requestAnimationFrame(tick);
        } else if (typeof requestAnimationFrame === 'function') {
          this.animFrameId = requestAnimationFrame(tick);
        }
      };

      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        this.animFrameId = window.requestAnimationFrame(tick);
      } else if (typeof requestAnimationFrame === 'function') {
        this.animFrameId = requestAnimationFrame(tick);
      }
    } catch (e) {
      console.warn('AudioContext visualization setup failed:', e);
    }
  }

  /**
   * Registers a callback invoked with current normalized volume level (0.0 to 1.0).
   */
  public onVolumeChange(cb: (volume: number) => void) {
    this.volumeCallback = cb;
  }

  /**
   * Releases microphone tracks and audio context.
   */
  public stop() {
    if (this.animFrameId !== null) {
      if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(this.animFrameId);
      } else if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animFrameId);
      }
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
    if (this.volumeCallback) {
      this.volumeCallback(0);
    }
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }
}
