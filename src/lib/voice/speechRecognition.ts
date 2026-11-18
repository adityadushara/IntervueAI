/**
 * Speech Recognition Wrapper for IntervueAI Voice Engine
 * Uses Web Speech API (SpeechRecognition / webkitSpeechRecognition) with:
 * - Real-time interim & final transcript streaming
 * - Natural pause handling with configurable silence detection
 * - Controlled reconnection lifecycle with bounded exponential backoff
 * - Protection against infinite retry loops on network errors
 * - Automatic recovery via fresh recognition instance instantiation
 * - Transcript preservation across reconnects and errors
 */

// Define SpeechRecognition interface types for environments without @types/dom-speech-recognition
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onaudiostart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
}

export type SpeechRecognitionConstructor = new () => IWindowSpeechRecognition;

const MAX_NETWORK_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 800;

export class SpeechRecognitionManager {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening = false;
  private isStarting = false;
  private shouldKeepListening = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private silenceThresholdMs = 2000;
  private lang = 'en-US';

  // Network error bounding
  private networkRetryCount = 0;
  private lastErrorWasNetwork = false;
  
  private accumulatedFinalTranscript = '';
  private currentInterimTranscript = '';

  private onTranscriptChangeCb: ((finalText: string, interimText: string) => void) | null = null;
  private onSilenceDetectedCb: ((completeText: string) => void) | null = null;
  private onErrorCb: ((error: string, friendlyMessage?: string) => void) | null = null;
  private onSpeechStartedCb: (() => void) | null = null;

  constructor(silenceThresholdMs = 2000, lang = 'en-US') {
    this.silenceThresholdMs = silenceThresholdMs;
    this.lang = lang;
    this.initRecognition();
  }

  /**
   * Checks if Web Speech Recognition is supported in the current browser.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  /**
   * Constructs and wires up event listeners for a SpeechRecognition instance.
   */
  private initRecognition() {
    if (!this.isSupported()) return;

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!RecognitionClass) return;

    // Clean up any existing instance to ensure fresh IPC channel
    this.cleanupRecognitionInstance();

    try {
      this.recognition = new RecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;
      this.recognition.maxAlternatives = 1;

      this.recognition.onaudiostart = () => {
        this.isStarting = false;
        this.isListening = true;
      };

      this.recognition.onspeechstart = () => {
        this.clearSilenceTimer();
        // Reset network retry count when candidate successfully speaks
        this.networkRetryCount = 0;
        this.lastErrorWasNetwork = false;
        if (this.onSpeechStartedCb) {
          this.onSpeechStartedCb();
        }
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let newFinals = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            newFinals += (newFinals ? ' ' : '') + transcript.trim();
          } else {
            interim += (interim ? ' ' : '') + transcript.trim();
          }
        }

        if (newFinals) {
          const cleanFinal = newFinals.trim();
          if (cleanFinal) {
            this.accumulatedFinalTranscript = this.accumulatedFinalTranscript
              ? `${this.accumulatedFinalTranscript} ${cleanFinal}`
              : cleanFinal;
          }
        }

        this.currentInterimTranscript = interim;

        if (this.onTranscriptChangeCb) {
          this.onTranscriptChangeCb(this.accumulatedFinalTranscript, this.currentInterimTranscript);
        }

        // Trigger or reset silence timer if we have spoken content
        const combined = (this.accumulatedFinalTranscript + ' ' + this.currentInterimTranscript).trim();
        const wordCount = combined.split(/\s+/).filter(Boolean).length;

        if (wordCount >= 3) {
          this.resetSilenceTimer(combined);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'no-speech' is routine in Web Speech API when candidate contemplates or pauses
        if (event.error === 'no-speech') {
          return;
        }

        if (event.error === 'network') {
          this.lastErrorWasNetwork = true;
          this.networkRetryCount++;

          if (this.networkRetryCount > MAX_NETWORK_RETRIES) {
            // Persistent network failure - halt loop and alert candidate
            this.shouldKeepListening = false;
            this.isListening = false;
            this.isStarting = false;
            this.clearReconnectTimer();

            const friendlyMsg = 'Speech recognition service disconnected. Please check your internet connection or browser settings, then click "Retry Speech Recognition".';
            console.warn(`SpeechRecognition network error limit reached (${MAX_NETWORK_RETRIES}). Ceasing automatic retries.`);
            if (this.onErrorCb) {
              this.onErrorCb('network', friendlyMsg);
            }
            return;
          }

          // Non-fatal network transient: back off and retry bounded
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(1.5, this.networkRetryCount - 1);
          console.warn(`SpeechRecognition network transient (attempt ${this.networkRetryCount}/${MAX_NETWORK_RETRIES}). Backing off for ${Math.round(delay)}ms...`);
          
          if (this.onErrorCb) {
            this.onErrorCb('network_retry', `Reconnecting to speech recognition service (${this.networkRetryCount}/${MAX_NETWORK_RETRIES})...`);
          }
          return;
        }

        // Other non-network errors (e.g. not-allowed, service-not-allowed)
        console.warn('SpeechRecognition error:', event.error, event.message);
        if (this.onErrorCb) {
          this.onErrorCb(event.error, event.message);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.isStarting = false;

        // If turn was manually ended or retries were exhausted, do not restart
        if (!this.shouldKeepListening) {
          return;
        }

        if (this.lastErrorWasNetwork) {
          if (this.networkRetryCount <= MAX_NETWORK_RETRIES) {
            // Bounded retry with exponential backoff delay to allow socket cleanup
            const delay = INITIAL_RETRY_DELAY_MS * Math.pow(1.5, this.networkRetryCount - 1);
            this.scheduleReconnect(delay);
          }
          return;
        }

        // Routine turn end (browser 60s continuous silence timeout) - small deferral for buffer flush
        this.scheduleReconnect(60);
      };
    } catch (e) {
      console.warn('Failed to construct SpeechRecognition:', e);
    }
  }

  private scheduleReconnect(delayMs: number) {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.shouldKeepListening) return;
      // Destroy old instance and create fresh one to clear broken IPC sockets
      this.initRecognition();
      this.startInternal();
    }, delayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanupRecognitionInstance() {
    if (this.recognition) {
      try {
        this.recognition.onaudiostart = null;
        this.recognition.onspeechstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // Ignore errors during abort
      }
      this.recognition = null;
    }
  }

  private resetSilenceTimer(currentText: string) {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.onSilenceDetectedCb && this.isListening) {
        this.onSilenceDetectedCb(currentText);
      }
    }, this.silenceThresholdMs);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private startInternal(): boolean {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) return false;
    }

    if (this.isListening || this.isStarting) {
      return true;
    }

    try {
      this.isStarting = true;
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err) {
      this.isStarting = false;
      // Handle "recognition has already started" safely
      console.warn('SpeechRecognition.start notice:', err);
      return false;
    }
  }

  /**
   * Starts speech transcription for the current question turn.
   * Preserves any existing transcript buffer passed in.
   */
  public start(existingTranscript = ''): boolean {
    this.clearReconnectTimer();
    this.clearSilenceTimer();

    // Reset network error tracking when candidate/user explicitly initiates listening
    this.networkRetryCount = 0;
    this.lastErrorWasNetwork = false;

    if (existingTranscript) {
      this.accumulatedFinalTranscript = existingTranscript.trim();
    }
    this.currentInterimTranscript = '';
    this.shouldKeepListening = true;

    return this.startInternal();
  }

  /**
   * Temporarily pauses or stops listening.
   * Returns complete accumulated transcript up to this point.
   */
  public stop(): string {
    this.shouldKeepListening = false;
    this.clearReconnectTimer();
    this.clearSilenceTimer();
    this.networkRetryCount = 0;
    this.lastErrorWasNetwork = false;

    if (this.recognition && (this.isListening || this.isStarting)) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.isListening = false;
      this.isStarting = false;
    }

    return this.getFullTranscript();
  }

  /**
   * Completely resets transcript buffer for a new question turn.
   */
  public reset() {
    this.accumulatedFinalTranscript = '';
    this.currentInterimTranscript = '';
    this.networkRetryCount = 0;
    this.lastErrorWasNetwork = false;
    this.clearSilenceTimer();
    this.clearReconnectTimer();
  }

  public onTranscriptChange(cb: (finalText: string, interimText: string) => void) {
    this.onTranscriptChangeCb = cb;
  }

  public onSilenceDetected(cb: (completeText: string) => void) {
    this.onSilenceDetectedCb = cb;
  }

  public onError(cb: (error: string, friendlyMessage?: string) => void) {
    this.onErrorCb = cb;
  }

  public onSpeechStarted(cb: () => void) {
    this.onSpeechStartedCb = cb;
  }

  public getFullTranscript(): string {
    return (this.accumulatedFinalTranscript + (this.currentInterimTranscript ? ' ' + this.currentInterimTranscript : '')).trim();
  }

  public isActivelyListening(): boolean {
    return this.isListening;
  }

  public getNetworkRetryCount(): number {
    return this.networkRetryCount;
  }
}
