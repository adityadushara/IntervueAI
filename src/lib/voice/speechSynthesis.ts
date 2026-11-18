/**
 * Speech Synthesis Wrapper for IntervueAI Voice Engine
 * Handles natural AI recruiter speech vocalization, voice selection,
 * playback state, text cleanup, natural phrasing, and instant interruption support.
 */

// Voices known to sound robotic, novelty, or inappropriate for a professional interview
const BLACKLISTED_VOICE_PATTERNS = [
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
  'deranged', 'good news', 'hysterical', 'pipe organ', 'trinoids',
  'whisper', 'zarvox', 'fred', 'ralph', 'junior', 'kathy', 'victoria',
  'espeak'
];

export class SpeechSynthesisManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private isPaused = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private voiceChangedHandler: (() => void) | null = null;

  // Conservative default voice tuning for natural conversational pacing
  private defaultRate = 0.94;
  private defaultPitch = 0.98;

  private onStartCb: (() => void) | null = null;
  private onEndCb: (() => void) | null = null;
  private onErrorCb: ((err: string) => void) | null = null;
  private onVoicesLoadedCb: ((voices: SpeechSynthesisVoice[]) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
    }
  }

  /**
   * Checks if Web Speech Synthesis is supported in this browser.
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
  }

  private isAcceptableVoice(voice: SpeechSynthesisVoice): boolean {
    const nameLower = voice.name.toLowerCase();
    return !BLACKLISTED_VOICE_PATTERNS.some(pattern => nameLower.includes(pattern));
  }

  private initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth?.getVoices() || [];
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.selectBestVoice(voices);
        if (this.onVoicesLoadedCb) {
          this.onVoicesLoadedCb(voices);
        }
      }
    };

    // Load initial synchronous voices if already cached
    loadVoices();

    // Listen for async voiceschanged event
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.voiceChangedHandler = loadVoices;
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Selects the highest quality natural English voice available in the client.
   * Maintains consistency once a voice has been selected for an interview session.
   */
  public selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // If a valid acceptable voice was already selected, maintain consistency across the interview
    if (this.selectedVoice && voices.some(v => v.name === this.selectedVoice?.name)) {
      return this.selectedVoice;
    }

    const acceptableVoices = voices.filter(v => this.isAcceptableVoice(v));
    const pool = acceptableVoices.length > 0 ? acceptableVoices : voices;

    // Prioritized selection heuristics:
    // 1. Natural / Neural / Online English voices (Edge / Chrome / Windows / macOS)
    // 2. High-profile OS voices (Google US/UK, Microsoft Jenny/Guy/Aria, Apple Samantha/Daniel/Serena/Karen/Oliver)
    // 3. Any standard English (en-US, en-GB, en-AU, en-CA, en-*)
    // 4. Fallback to first non-blacklisted voice or first voice in pool
    const priorities: ((v: SpeechSynthesisVoice) => boolean)[] = [
      (v) => v.lang.startsWith('en') && (
        v.name.includes('Natural') || 
        v.name.includes('Neural') || 
        v.name.includes('Online')
      ),
      (v) => (
        v.name.includes('Google US English') ||
        v.name.includes('Google UK English') ||
        v.name.includes('Jenny') ||
        v.name.includes('Guy') ||
        v.name.includes('Aria') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel') ||
        v.name.includes('Serena') ||
        v.name.includes('Karen') ||
        v.name.includes('Oliver')
      ),
      (v) => v.lang === 'en-US',
      (v) => v.lang === 'en-GB',
      (v) => v.lang.startsWith('en'),
    ];

    for (const test of priorities) {
      const match = pool.find(test);
      if (match) {
        this.selectedVoice = match;
        return match;
      }
    }

    this.selectedVoice = pool[0] || null;
    return this.selectedVoice;
  }

  /**
   * Cleans text to prepare for natural speech synthesis:
   * - Strips markdown code blocks and inline code
   * - Strips URLs, markdown headers, and formatting markers
   * - Adds punctuation pauses for pleasant cadence
   */
  public cleanTextForSpeech(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, ' ') // Strip code blocks
      .replace(/`([^`]+)`/g, '$1')     // Strip backticks, keep term
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links, retain anchor text (must precede URL strip)
      .replace(/https?:\/\/\S+/g, ' ')  // Strip raw URLs
      .replace(/[*_#~>]/g, ' ')        // Strip markdown emphasis & headers
      .replace(/^[\s*•\-–—]\s+/gm, ' ') // Strip bullet symbols
      .replace(/\s+/g, ' ')            // Normalize repeated whitespace
      .replace(/\s*([.,?!;:])\s*/g, '$1 ') // Ensure natural pause spacing around punctuation
      .trim();
  }

  /**
   * Vocalizes text through the AI interviewer persona.
   * Cancels any pending speech cleanly to prevent overlapping audio.
   */
  public speak(
    text: string, 
    options?: { 
      rate?: number; 
      pitch?: number; 
      voiceName?: string;
      onEnd?: () => void;
    }
  ): boolean {
    if (!this.synth || !this.isSupported()) {
      if (options?.onEnd) options.onEnd();
      return false;
    }

    // Cancel existing audio cleanly to prevent overlapping speech
    this.stop();

    const cleanText = this.cleanTextForSpeech(text);

    if (!cleanText) {
      if (options?.onEnd) options.onEnd();
      return false;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      // Select voice: custom specified, or memoized best voice, or discover now
      if (options?.voiceName) {
        const custom = this.synth.getVoices().find(v => v.name === options.voiceName);
        if (custom) utterance.voice = custom;
      } else if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else {
        const best = this.selectBestVoice(this.synth.getVoices());
        if (best) utterance.voice = best;
      }

      // Conservative tuning: slightly measured rate and natural pitch for clear comprehension
      utterance.rate = options?.rate ?? this.defaultRate;
      utterance.pitch = options?.pitch ?? this.defaultPitch;
      utterance.volume = 1.0;
      utterance.lang = utterance.voice?.lang || 'en-US';

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        if (this.onStartCb) this.onStartCb();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
        if (this.onEndCb) this.onEndCb();
      };

      utterance.onerror = (e) => {
        // 'interrupted' or 'canceled' are standard when candidate interrupts or speech resets
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis error:', e.error);
          if (this.onErrorCb) this.onErrorCb(e.error);
        }
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
      };

      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Failed to speak with SpeechSynthesis:', err);
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      if (options?.onEnd) options.onEnd();
      return false;
    }
  }

  /**
   * Pauses active speech playback.
   */
  public pause() {
    if (this.synth && this.isSpeaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resumes paused speech playback.
   */
  public resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * Instantly stops audio playback (used for candidate interruption or replaying).
   */
  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore errors during cancel
      }
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || [];
  }

  public setVoice(voiceName: string) {
    const match = this.synth?.getVoices().find(v => v.name === voiceName);
    if (match) this.selectedVoice = match;
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  public onStart(cb: () => void) {
    this.onStartCb = cb;
  }

  public onEnd(cb: () => void) {
    this.onEndCb = cb;
  }

  public onError(cb: (err: string) => void) {
    this.onErrorCb = cb;
  }

  public onVoicesLoaded(cb: (voices: SpeechSynthesisVoice[]) => void) {
    this.onVoicesLoadedCb = cb;
  }
}

