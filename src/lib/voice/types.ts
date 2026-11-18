/**
 * Type definitions for IntervueAI Voice Interview Engine
 */

export type MicPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export type VoiceInterviewerState = 
  | 'idle'             // Ready, waiting for action
  | 'ai_speaking'      // AI is vocalizing the question / feedback
  | 'listening'        // Mic active, listening for candidate speech
  | 'paused'           // Mic manually paused by candidate
  | 'processing'       // Candidate submitted, evaluating response
  | 'interrupted'      // Candidate interrupted AI speech
  | 'error';           // Audio/mic error encountered

export interface VoiceEngineConfig {
  silenceThresholdMs?: number; // Silence duration before considering turn complete (default: 1800ms)
  autoSubmitOnSilence?: boolean; // Whether to automatically submit after silence
  voiceRate?: number; // Speech synthesis rate (default: 1.0)
  voicePitch?: number; // Speech synthesis pitch (default: 1.0)
  voiceName?: string; // Preferred browser voice name
  selectedDeviceId?: string; // Preferred audio input deviceId
}

export interface VoiceTurnTranscript {
  finalText: string;
  interimText: string;
  isRecognizing: boolean;
  volumeLevel: number; // 0.0 to 1.0 for audio wave visualization
}

export interface VoicePlaybackStatus {
  isPlaying: boolean;
  isPaused: boolean;
  currentUtteranceText: string | null;
  supported: boolean;
}
