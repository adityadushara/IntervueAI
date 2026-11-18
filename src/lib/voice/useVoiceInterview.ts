/**
 * Custom React Hook for Voice Interview Orchestration
 * Seamlessly manages Microphone, Speech-to-Text, and Text-to-Speech
 * with state transitions, interruptions, and automatic turn progression.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MicrophoneManager } from './microphone';
import { SpeechRecognitionManager } from './speechRecognition';
import { SpeechSynthesisManager } from './speechSynthesis';
import { 
  MicPermissionState, 
  VoiceInterviewerState, 
  AudioInputDevice,
  VoiceEngineConfig 
} from './types';

interface UseVoiceInterviewProps {
  config?: VoiceEngineConfig;
  onAnswerReady?: (answerText: string) => void;
  onTranscriptChange?: (fullText: string) => void;
  enabled?: boolean;
}

export function useVoiceInterview({
  config = {},
  onAnswerReady,
  onTranscriptChange,
  enabled = true,
}: UseVoiceInterviewProps) {
  // Core Voice State
  const [voiceState, setVoiceState] = useState<VoiceInterviewerState>('idle');
  const [permissionState, setPermissionState] = useState<MicPermissionState>('idle');
  const [availableDevices, setAvailableDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(config.selectedDeviceId || '');
  
  // Real-time Audio Levels & Transcript
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Playback & Listening State
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState<boolean>(true);

  // Manager Instances
  const micManagerRef = useRef<MicrophoneManager | null>(null);
  const recognitionRef = useRef<SpeechRecognitionManager | null>(null);
  const synthRef = useRef<SpeechSynthesisManager | null>(null);

  // Up-to-date refs for closures in event callbacks
  const onAnswerReadyRef = useRef(onAnswerReady);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const enabledRef = useRef(enabled);
  const permissionStateRef = useRef(permissionState);
  const autoSubmitOnSilenceRef = useRef(config.autoSubmitOnSilence);
  const finalTranscriptRef = useRef(finalTranscript);
  const startListeningRef = useRef<(existingText?: string) => void>(() => {});
  const handleTurnCompleteRef = useRef<(overrideText?: string) => void>(() => {});

  useEffect(() => {
    finalTranscriptRef.current = finalTranscript;
  }, [finalTranscript]);

  useEffect(() => {
    onAnswerReadyRef.current = onAnswerReady;
  }, [onAnswerReady]);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    permissionStateRef.current = permissionState;
  }, [permissionState]);

  useEffect(() => {
    autoSubmitOnSilenceRef.current = config.autoSubmitOnSilence;
  }, [config.autoSubmitOnSilence]);

  /**
   * Begin listening for candidate's spoken response
   */
  const startListening = useCallback((existingText?: string) => {
    if (!enabledRef.current || !recognitionRef.current) return;

    setErrorMessage(null);

    // Halt any AI speech
    if (synthRef.current?.isCurrentlySpeaking()) {
      synthRef.current.stop();
      setIsAiSpeaking(false);
    }

    const startingText = existingText !== undefined ? existingText : finalTranscriptRef.current;

    setVoiceState('listening');
    setIsListening(true);
    setIsPaused(false);
    setFinalTranscript(startingText);
    setInterimTranscript('');
    recognitionRef.current.start(startingText);
  }, []);

  /**
   * Stop listening and finalize transcript
   */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return '';
    const fullText = recognitionRef.current.stop();
    setIsListening(false);
    setIsPaused(false);
    setAudioLevel(0);
    setVoiceState('idle');
    return fullText;
  }, []);

  /**
   * Explicitly retry recognition after a network disconnect or error
   */
  const retryRecognition = useCallback(() => {
    setErrorMessage(null);
    startListening(finalTranscriptRef.current);
  }, [startListening]);

  /**
   * Temporarily pause listening without clearing buffered transcript
   */
  const pauseListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    setIsPaused(true);
    setAudioLevel(0);
    setVoiceState('paused');
  }, []);

  /**
   * Resume listening after manual pause
   */
  const resumeListening = useCallback(() => {
    startListening(finalTranscriptRef.current);
  }, [startListening]);

  /**
   * Toggle between active listening and paused state
   */
  const togglePause = useCallback(() => {
    if (isListening) {
      pauseListening();
    } else {
      resumeListening();
    }
  }, [isListening, pauseListening, resumeListening]);

  /**
   * Handle candidate turn completion (manual submit or silence)
   */
  const handleTurnComplete = useCallback((overrideText?: string) => {
    if (!recognitionRef.current) return;
    const finalSpoken = (overrideText || recognitionRef.current.getFullTranscript()).trim();
    
    recognitionRef.current.stop();
    setIsListening(false);
    setIsPaused(false);
    setAudioLevel(0);
    setVoiceState('processing');

    if (finalSpoken && onAnswerReadyRef.current) {
      onAnswerReadyRef.current(finalSpoken);
    }
  }, []);

  /**
   * Interrupt AI speech immediately and start capturing candidate's voice
   */
  const interruptAi = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.stop();
      setIsAiSpeaking(false);
      startListening();
    }
  }, [startListening]);

  /**
   * Reset transcript buffer for next question
   */
  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    recognitionRef.current?.reset();
  }, []);

  // Sync function refs so event listeners always execute latest implementations
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    handleTurnCompleteRef.current = handleTurnComplete;
  }, [handleTurnComplete]);

  // Initialize managers once on client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    micManagerRef.current = new MicrophoneManager();
    recognitionRef.current = new SpeechRecognitionManager(config.silenceThresholdMs || 1800);
    synthRef.current = new SpeechSynthesisManager();

    const sttSupported = recognitionRef.current.isSupported();
    const ttsSupported = synthRef.current.isSupported();
    setIsVoiceSupported(sttSupported && ttsSupported);

    // Initial permission probe
    micManagerRef.current.getPermissionStatus().then(status => {
      setPermissionState(status);
      if (status === 'granted') {
        micManagerRef.current?.getAudioInputDevices().then(setAvailableDevices);
      }
    });

    // Setup volume meter
    micManagerRef.current.onVolumeChange((vol) => {
      setAudioLevel(vol);
    });

    // Setup Speech Recognition callbacks
    recognitionRef.current.onTranscriptChange((finalText, interimText) => {
      setFinalTranscript(finalText);
      setInterimTranscript(interimText);
      const combined = (finalText + (interimText ? ' ' + interimText : '')).trim();
      if (onTranscriptChangeRef.current) {
        onTranscriptChangeRef.current(combined);
      }
    });

    // Candidate voice activity detected while AI is speaking -> Instant Interruption
    recognitionRef.current.onSpeechStarted(() => {
      if (synthRef.current?.isCurrentlySpeaking()) {
        synthRef.current.stop();
        setIsAiSpeaking(false);
        setVoiceState('listening');
      }
    });

    // Setup silence detection
    recognitionRef.current.onSilenceDetected((completeText) => {
      if (autoSubmitOnSilenceRef.current !== false && completeText.trim().length > 10) {
        handleTurnCompleteRef.current(completeText);
      }
    });

    recognitionRef.current.onError((err, friendlyMessage) => {
      if (err === 'no-speech') {
        return;
      }
      if (err === 'network_retry') {
        setErrorMessage(friendlyMessage || 'Reconnecting speech recognition...');
        return;
      }
      if (err === 'network') {
        setErrorMessage(friendlyMessage || 'Speech recognition disconnected. Please click "Retry Speech Recognition".');
        setVoiceState('error');
        setIsListening(false);
        return;
      }
      setErrorMessage(friendlyMessage || `Speech recognition error: ${err}`);
      setVoiceState('error');
      setIsListening(false);
    });

    // Setup Speech Synthesis callbacks
    synthRef.current.onStart(() => {
      setIsAiSpeaking(true);
      setVoiceState('ai_speaking');
    });

    synthRef.current.onEnd(() => {
      setIsAiSpeaking(false);
      // Clean state transition when AI speech finishes.
      // Note: Turn transition to listening is managed by speakText callback.
    });

    return () => {
      micManagerRef.current?.stop();
      recognitionRef.current?.stop();
      synthRef.current?.stop();
    };
  }, [config.silenceThresholdMs]);

  /**
   * Request microphone permission explicitly
   */
  const requestMicrophone = useCallback(async () => {
    if (!micManagerRef.current) return false;
    setPermissionState('requesting');
    setErrorMessage(null);

    try {
      const { permission } = await micManagerRef.current.requestAccess(selectedDeviceId);
      setPermissionState(permission);

      if (permission === 'granted') {
        const devices = await micManagerRef.current.getAudioInputDevices();
        setAvailableDevices(devices);
        return true;
      } else if (permission === 'denied') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser bar.');
        return false;
      } else {
        setErrorMessage('No microphone device found on your system.');
        return false;
      }
    } catch (err: unknown) {
      setPermissionState('unavailable');
      setErrorMessage(`Failed to access microphone: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }, [selectedDeviceId]);

  /**
   * Speak a question or AI feedback
   */
  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (!synthRef.current || !enabledRef.current) {
      if (onDone) onDone();
      return;
    }

    // Stop listening while AI speaks to prevent audio loop feedback
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setVoiceState('ai_speaking');
    synthRef.current.speak(text, {
      rate: config.voiceRate || 0.94,
      pitch: config.voicePitch || 0.98,
      voiceName: config.voiceName,
      onEnd: () => {
        setIsAiSpeaking(false);
        if (onDone) {
          onDone();
        } else if (enabledRef.current && permissionStateRef.current === 'granted') {
          startListeningRef.current();
        } else {
          setVoiceState('idle');
        }
      }
    });
  }, [config.voiceRate, config.voicePitch, config.voiceName]);

  return {
    voiceState,
    permissionState,
    isVoiceSupported,
    isAiSpeaking,
    isListening,
    isPaused,
    audioLevel,
    finalTranscript,
    interimTranscript,
    fullTranscript: (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim(),
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    errorMessage,
    requestMicrophone,
    speakText,
    startListening,
    stopListening,
    retryRecognition,
    pauseListening,
    resumeListening,
    togglePause,
    handleTurnComplete,
    interruptAi,
    resetTranscript,
  };
}
