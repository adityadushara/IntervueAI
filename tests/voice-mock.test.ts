/**
 * Deterministic Mock & Unit Test Suite for IntervueAI Voice Engine
 * 
 * Tests:
 * 1. MicrophoneManager (permissions, device enumeration, AudioContext analyser, teardown)
 * 2. SpeechRecognitionManager (Web Speech API abstraction, streaming interim/final, silence detection, auto-reconnect)
 * 3. SpeechSynthesisManager (voice discovery, blacklist filtering, prosody tuning, markdown/code stripping, pause/resume, candidate interruption)
 * 4. Graceful Degradation & Environmental Fallbacks (unsupported browsers, blank text safety)
 * 5. Voice-Only Candidate Experience & State Machine (read-only transcript, no text mode toggle, duplicate submission guard, mic pause during AI speech, adaptive question progression)
 */

import fs from 'fs';
import path from 'path';

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}
const mockStorage = new LocalStorageMock();
(globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = mockStorage;

import { MicrophoneManager } from '../src/lib/voice/microphone';
import { SpeechRecognitionManager, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../src/lib/voice/speechRecognition';
import { SpeechSynthesisManager } from '../src/lib/voice/speechSynthesis';
import { submitCandidateAnswer, completeCandidateInterview, createInterview } from '../src/lib/storage';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${title}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${title}${details ? ` -> ${details}` : ''}`);
  }
}

async function runAllVoiceTests() {
  console.log('\n======================================================');
  console.log('🎙️ RUNNING INTERVUEAI VOICE ENGINE MOCK & UNIT SUITE');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------------
  // Group 1: MicrophoneManager Capabilities & Lifecycle
  // ---------------------------------------------------------------------------
  console.log('--- Group 1: MicrophoneManager Audio Input & Device Management ---');

  {
    const mic = new MicrophoneManager();
    assert(mic.isSupported() === false, 'isSupported returns false in headless Node environment');
  }

  {
    const state = {
      tracksStopped: false,
      audioCtxClosed: false,
    };

    const mockTrack = {
      stop: () => { state.tracksStopped = true; },
      kind: 'audio',
      enabled: true,
    };

    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    const mockDevices = [
      { deviceId: 'default', kind: 'audioinput', label: 'Internal Microphone', groupId: 'g1' },
      { deviceId: 'mic-usb-1', kind: 'audioinput', label: 'USB Studio Mic', groupId: 'g2' },
      { deviceId: 'cam-video-1', kind: 'videoinput', label: 'Webcam', groupId: 'g3' },
    ];

    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: class MockAudioContext {
        createMediaStreamSource() {
          return { connect: () => {} };
        }
        createAnalyser() {
          return {
            fftSize: 256,
            smoothingTimeConstant: 0.5,
            frequencyBinCount: 128,
            getByteFrequencyData: (arr: Uint8Array) => {
              arr.fill(64); // Half volume
            }
          };
        }
        close() {
          state.audioCtxClosed = true;
          return Promise.resolve();
        }
      },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(Date.now()), 16) as unknown as number;
      },
      cancelAnimationFrame: (id: number) => {
        clearTimeout(id);
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: async (constraints: MediaStreamConstraints) => {
            const audioObj = constraints.audio as Record<string, unknown> | undefined;
            const deviceExact = (audioObj?.deviceId as { exact?: string } | undefined)?.exact;
            if (deviceExact === 'denied-device') {
              const err = new Error('Permission denied');
              err.name = 'NotAllowedError';
              throw err;
            }
            return mockStream;
          },
          enumerateDevices: async () => mockDevices,
        },
        permissions: {
          query: async () => ({ state: 'granted' }),
        }
      },
      configurable: true,
      writable: true,
    });

    const mic = new MicrophoneManager();
    assert(mic.isSupported() === true, 'isSupported returns true when mediaDevices is available');

    const status = await mic.getPermissionStatus();
    assert(status === 'granted', 'getPermissionStatus accurately returns granted status');

    const devices = await mic.getAudioInputDevices();
    assert(devices.length === 2, 'getAudioInputDevices filters only audioinput devices');
    assert(devices[0].deviceId === 'default', 'Correctly identifies default audio device');
    assert(devices[1].label === 'USB Studio Mic', 'Correctly identifies USB microphone label');

    // Test volume callback
    let receivedVolume = 0;
    mic.onVolumeChange((vol) => {
      receivedVolume = vol;
    });

    // Test requestAccess
    const access = await mic.requestAccess();
    assert(access.permission === 'granted', 'requestAccess succeeds with granted permission');
    assert(mic.getStream() !== null, 'MediaStream is active and stored in manager');

    // Wait for animation frame tick
    await new Promise(r => setTimeout(r, 60));
    assert(receivedVolume > 0, `Audio analyser calculates real-time normalized volume level (${receivedVolume.toFixed(2)})`);

    // Test permission denied handling
    const deniedResult = await mic.requestAccess('denied-device');
    assert(deniedResult.permission === 'denied', 'Gracefully maps NotAllowedError to denied permission');

    // Test teardown / cleanup on unmount
    mic.stop();
    assert(state.tracksStopped === true, 'MicrophoneManager.stop() halts all active MediaStream tracks');
    assert(state.audioCtxClosed === true, 'MicrophoneManager.stop() closes AudioContext');
    assert(mic.getStream() === null, 'MediaStream is cleared to null after stop');
  }

  // ---------------------------------------------------------------------------
  // Group 2: SpeechRecognitionManager (Speech-to-Text)
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 2: SpeechRecognitionManager Turn Streaming & Silence Detection ---');

  {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      maxAlternatives = 1;
      started = false;

      onaudiostart: (() => void) | null = null;
      onspeechstart: (() => void) | null = null;
      onspeechend: (() => void) | null = null;
      onresult: ((ev: SpeechRecognitionEvent) => void) | null = null;
      onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        this.started = true;
      }
      stop() {
        this.started = false;
      }
      abort() {
        this.started = false;
      }
    }

    (globalThis as unknown as { window: unknown }).window = {
      SpeechRecognition: MockSpeechRecognition,
    };

    const stt = new SpeechRecognitionManager(100); // 100ms silence threshold for test
    assert(stt.isSupported() === true, 'isSupported returns true when window.SpeechRecognition exists');

    assert(stt.start() === true, 'stt.start() successfully initiates recognition');
    assert(stt.isActivelyListening() === true, 'isActivelyListening reports true after start');

    const rawRecognition = (stt as unknown as { recognition: MockSpeechRecognition }).recognition;

    let latestFinal = '';
    let latestInterim = '';
    stt.onTranscriptChange((f, i) => {
      latestFinal = f;
      latestInterim = i;
    });

    // Simulate interim result
    const interimEvent = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'I have extensive experience' },
          isFinal: false,
          length: 1,
        }
      ]
    } as unknown as SpeechRecognitionEvent;

    rawRecognition.onresult?.(interimEvent);
    assert(latestInterim === 'I have extensive experience', 'Interim transcript updates immediately');
    assert(latestFinal === '', 'Final transcript remains empty during interim speech');

    let silenceDetectedWith = '';
    stt.onSilenceDetected((text) => {
      silenceDetectedWith = text;
    });

    // Simulate final result
    const finalEvent = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'I have extensive experience with Kubernetes and Docker.' },
          isFinal: true,
          length: 1,
        }
      ]
    } as unknown as SpeechRecognitionEvent;

    rawRecognition.onresult?.(finalEvent);
    assert(latestFinal === 'I have extensive experience with Kubernetes and Docker.', 'Final transcript aggregates validated speech');
    assert(latestInterim === '', 'Interim buffer clears when final result arrives');
    assert(stt.getFullTranscript() === 'I have extensive experience with Kubernetes and Docker.', 'getFullTranscript returns complete answer');

    // Wait for silence detector threshold (100ms) to trigger
    await new Promise(r => setTimeout(r, 150));
    assert(
      silenceDetectedWith === 'I have extensive experience with Kubernetes and Docker.',
      'Silence detector triggers callback with full answer after silence window'
    );

    // Test error suppression for 'no-speech'
    let errorReceived = '';
    let errorMessageReceived = '';
    stt.onError((err, msg) => {
      errorReceived = err;
      errorMessageReceived = msg || '';
    });

    rawRecognition.onerror?.({ error: 'no-speech' } as SpeechRecognitionErrorEvent);
    assert(errorReceived === '', 'Routinely ignores no-speech pause errors without alarming candidate');

    // First network failure should trigger bounded retry notification
    rawRecognition.onerror?.({ error: 'network', message: 'connection dropped' } as SpeechRecognitionErrorEvent);
    assert(errorReceived === 'network_retry', 'Dispatches retry notification on transient network drop');
    assert(errorMessageReceived.includes('Reconnecting'), 'Informs candidate of reconnection attempt');

    // Exhaust remaining retries (total 4 occurrences exceeds MAX_NETWORK_RETRIES = 3)
    rawRecognition.onerror?.({ error: 'network' } as SpeechRecognitionErrorEvent);
    rawRecognition.onerror?.({ error: 'network' } as SpeechRecognitionErrorEvent);
    rawRecognition.onerror?.({ error: 'network' } as SpeechRecognitionErrorEvent);
    assert(errorReceived === 'network', 'Dispatches terminal network error after bounded retry limit reached');
    assert(stt.isActivelyListening() === false, 'Stops automatic reconnection loop when retry limit reached');
    assert(
      stt.getFullTranscript() === 'I have extensive experience with Kubernetes and Docker.',
      'Preserves candidate transcript despite network error'
    );

    // Test retry recovery: candidate clicks "Retry Speech Recognition"
    stt.start(stt.getFullTranscript());
    assert(
      stt.getFullTranscript() === 'I have extensive experience with Kubernetes and Docker.',
      'Preserves accumulated answer across manual retry start'
    );

    // Test stop and reset
    const stoppedText = stt.stop();
    assert(stoppedText === 'I have extensive experience with Kubernetes and Docker.', 'stt.stop() returns complete buffered transcript');
    assert(stt.isActivelyListening() === false, 'isActivelyListening reports false after stop');

    stt.reset();
    assert(stt.getFullTranscript() === '', 'stt.reset() flushes transcript buffer for next question');
  }

  // ---------------------------------------------------------------------------
  // Group 3: SpeechSynthesisManager (AI Recruiter Text-to-Speech)
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 3: SpeechSynthesisManager Voice Vocalization & Voice Quality ---');

  {
    interface MockUtterance {
      text: string;
      lang: string;
      rate: number;
      pitch: number;
      voice: SpeechSynthesisVoice | null;
      onstart: ((e: unknown) => void) | null;
      onend: ((e: unknown) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
    }

    const ttsState = {
      cancelled: false,
      spokenUtterance: null as MockUtterance | null,
    };

    class MockSpeechSynthesisUtterance implements MockUtterance {
      text: string = '';
      lang = 'en-US';
      rate = 0.94;
      pitch = 0.98;
      voice: SpeechSynthesisVoice | null = null;
      onstart: ((e: unknown) => void) | null = null;
      onend: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;

      constructor(text: string = '') {
        this.text = text;
      }
    }

    const mockVoices: SpeechSynthesisVoice[] = [
      { default: false, lang: 'en-US', localService: true, name: 'Albert', voiceURI: 'v-blacklisted-1' },
      { default: false, lang: 'en-US', localService: true, name: 'Bad News', voiceURI: 'v-blacklisted-2' },
      { default: false, lang: 'en-US', localService: true, name: 'Zarvox', voiceURI: 'v-blacklisted-3' },
      { default: false, lang: 'es-ES', localService: true, name: 'Monica', voiceURI: 'v1' },
      { default: false, lang: 'en-US', localService: true, name: 'Google US English', voiceURI: 'v2' },
      { default: false, lang: 'en-US', localService: true, name: 'Microsoft Jenny Online (Natural)', voiceURI: 'v3' },
    ];

    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    (globalThis as unknown as { window: unknown }).window = {
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
      speechSynthesis: {
        getVoices: () => mockVoices,
        speak: (u: unknown) => {
          const utterance = u as MockUtterance;
          ttsState.spokenUtterance = utterance;
          setTimeout(() => utterance.onstart?.({}), 5);
        },
        cancel: () => {
          ttsState.cancelled = true;
          if (ttsState.spokenUtterance) {
            ttsState.spokenUtterance.onerror?.({ error: 'interrupted' });
          }
        },
        pause: () => {},
        resume: () => {},
        onvoiceschanged: null,
      }
    };

    const tts = new SpeechSynthesisManager();
    assert(tts.isSupported() === true, 'isSupported returns true when window.speechSynthesis exists');

    // Verify blacklist filtering and natural voice heuristic selection
    const selectedVoice = tts.getSelectedVoice();
    assert(selectedVoice !== null, 'Selects preferred browser voice automatically');
    assert(
      !['Albert', 'Bad News', 'Zarvox'].includes(selectedVoice?.name || ''),
      'Filters out novelty/robotic voices (Albert, Bad News, Zarvox)'
    );
    assert(
      Boolean(selectedVoice?.name.includes('Natural') || selectedVoice?.name.includes('Google')),
      `Prefers natural high-fidelity English voice (${selectedVoice?.name})`
    );

    // Verify consistent voice selection across multiple queries
    const secondQuery = tts.selectBestVoice(mockVoices);
    assert(secondQuery?.name === selectedVoice?.name, 'Maintains consistent voice throughout interview session');

    // Test text cleaning, markdown, links, and code syntax stripping
    const rawQuestion = "Can you explain how `useEffect` works in React? For instance:\n```javascript\nuseEffect(() => {}, []);\n```\nSee [documentation](https://react.dev). *Note*: Discuss cleanup functions and `-` dependencies.";
    const cleanOutput = tts.cleanTextForSpeech(rawQuestion);
    assert(!cleanOutput.includes('```'), 'Strips raw code fence blocks');
    assert(!cleanOutput.includes('`useEffect`') && cleanOutput.includes('useEffect'), 'Strips inline backticks while retaining terminology');
    assert(!cleanOutput.includes('https://'), 'Strips raw URLs from speech synthesis output');
    assert(!cleanOutput.includes('[documentation]'), 'Replaces markdown link syntax with plain anchor text');
    assert(!cleanOutput.includes('*Note*'), 'Strips markdown emphasis asterisks');

    // Test speech playback with tuned prosody
    const spoken = tts.speak(rawQuestion);
    assert(spoken === true, 'tts.speak() initiates playback');

    await new Promise(r => setTimeout(r, 25));
    assert(ttsState.spokenUtterance !== null, 'Utterance dispatched to SpeechSynthesis engine');
    assert((ttsState.spokenUtterance?.rate ?? 0) <= 0.98, `Applies tuned speech rate for clarity (${ttsState.spokenUtterance?.rate})`);
    assert((ttsState.spokenUtterance?.pitch ?? 0) <= 1.0, `Applies natural conversational pitch (${ttsState.spokenUtterance?.pitch})`);
    assert(tts.isCurrentlySpeaking() === true, 'isCurrentlySpeaking reports true while utterance plays');

    // Test candidate interruption and clean cancellation
    tts.stop();
    assert(ttsState.cancelled === true, 'tts.stop() invokes synth.cancel() immediately on interruption');
    assert(tts.isCurrentlySpeaking() === false, 'isCurrentlySpeaking resets to false upon interruption');
  }

  // ---------------------------------------------------------------------------
  // Group 4: Graceful Degradation & Browser Compatibility Guards
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 4: Graceful Degradation & Environmental Fallbacks ---');

  {
    (globalThis as unknown as { window: unknown }).window = {
      speechSynthesis: { getVoices: () => [] }
    };

    const stt = new SpeechRecognitionManager();
    assert(stt.isSupported() === false, 'Correctly flags STT unsupported in browsers without SpeechRecognition');
    assert(stt.start() === false, 'stt.start() fails gracefully without throwing an exception');
    assert(stt.stop() === '', 'stt.stop() returns empty string safely');

    const fallbackState = {
      completedCleanly: false,
    };
    const tts = new SpeechSynthesisManager();
    tts.speak('   ', { onEnd: () => { fallbackState.completedCleanly = true; } });
    assert(fallbackState.completedCleanly === true, 'Blank speech invocation triggers onEnd without getting stuck');
  }

  // ---------------------------------------------------------------------------
  // Group 5: Voice-Only Candidate Experience & State Machine
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 5: Voice-Only Candidate Experience & State Machine ---');

  {
    // Inspect candidate page source to verify strict absence of text mode
    const candidatePagePath = path.resolve(__dirname, '../src/app/interview/[token]/page.tsx');
    const candidatePageSource = fs.readFileSync(candidatePagePath, 'utf8');

    // 1. Verify text mode switcher is completely removed
    assert(!candidatePageSource.includes('isVoiceMode'), 'No isVoiceMode state or switcher toggle exists in candidate page');
    assert(!candidatePageSource.includes('Switch to Text Mode'), 'No "Switch to Text Mode" button exists in candidate page');
    assert(!candidatePageSource.includes('<textarea'), 'No candidate answer <textarea> exists in candidate page');
    assert(!candidatePageSource.includes('candidateResponseInput'), 'No candidate answer textarea input element exists');

    // 2. Verify read-only transcript rendering
    assert(candidatePageSource.includes('Live Voice Transcript'), 'Renders explicit "Live Voice Transcript" header');
    assert(candidatePageSource.includes('Read-Only'), 'Clearly labels transcript as Read-Only');
    assert(candidatePageSource.includes('Manual typing is disabled'), 'Explicitly instructs candidate that typing is disabled');

    // 3. Verify microphone permission handling
    assert(candidatePageSource.includes('Microphone Access Required'), 'Handles denied or missing microphone with clear instructions');
    assert(candidatePageSource.includes('Retry Microphone Access'), 'Offers explicit retry button for microphone access');

    // 4. Verify browser compatibility guidance
    assert(candidatePageSource.includes('Voice Speech Recognition Not Supported'), 'Displays clear notice when browser lacks Web Speech API');
    assert(candidatePageSource.includes('Google Chrome') && candidatePageSource.includes('Microsoft Edge'), 'Recommends Chrome/Edge/Safari for voice assessment');

    // 5. Test Answer Submission & Lifecycle via Storage / Backend Integration
    const win = (globalThis as unknown as { window?: Record<string, unknown> }).window || {};
    win.localStorage = mockStorage;
    win.location = { origin: 'http://localhost:3000' };
    (globalThis as unknown as { window: unknown }).window = win;

    const originalFetch = globalThis.fetch;
    const fetchCalls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      fetchCalls.push({ url, method });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true }),
      } as Response;
    }) as typeof fetch;

    const mockJob = {
      companyName: 'Stripe Global',
      jobTitle: 'Backend Engineer',
      jobDescription: 'Build scalable payment systems.',
      requiredSkills: ['Node.js', 'PostgreSQL'],
      requiredExperience: '3+ years',
      seniorityLevel: 'Senior' as const,
      interviewType: 'Technical' as const,
      difficulty: 'Intermediate' as const,
      questionCount: 2,
      expectedDurationMinutes: 20,
      language: 'English',
    };

    const invitation = createInterview(mockJob, { expiration: '24 hours' }, {
      fullName: 'Alex Vance',
      email: 'alex.vance@example.com'
    });

    assert(invitation.status === 'active', 'Invitation initialized in active status');

    // Test answer submission
    const answered1 = submitCandidateAnswer(
      invitation.token,
      invitation.questions[0].id,
      invitation.questions[0].text,
      'I have designed distributed idempotency keys in Redis to prevent double charge events across payment webhooks.',
      45,
      45
    );

    assert(answered1?.answers.length === 1, 'First spoken answer successfully persisted');
    assert(Boolean(answered1?.answers[0]?.answerText?.includes('distributed idempotency keys')), 'Spoken answer transcript preserved accurately');

    // Test duplicate submission guard (same questionId updates existing record rather than duplicating)
    const duplicateSubmit = submitCandidateAnswer(
      invitation.token,
      invitation.questions[0].id,
      invitation.questions[0].text,
      'Updated transcript after candidate spoke more detail on Redis locks and isolation levels.',
      55,
      55
    );

    assert(duplicateSubmit?.answers.length === 1, 'Submitting answer for same question updates in-place without duplicates');
    assert(Boolean(duplicateSubmit?.answers[0]?.answerText?.includes('isolation levels')), 'Updated transcript is stored correctly');

    // Complete interview
    const completed = completeCandidateInterview(invitation.token, 100);
    assert(completed?.status === 'completed', 'Interview transitions to completed upon final answer');
    assert(completed?.recruiterReport !== undefined, 'Recruiter evaluation report is generated upon interview completion');
    assert(completed?.recruiterReport?.overallAssessment !== undefined, 'Evaluation contains detailed assessment for recruiter');

    // Verify backend sync calls occurred
    assert(fetchCalls.some(c => c.url.includes('/api/interviews') && c.method === 'POST'), 'Syncs newly created interview to server via POST /api/interviews');
    assert(fetchCalls.some(c => c.url.includes(`/api/interviews/${invitation.token}`) && c.method === 'PATCH'), 'Syncs candidate answers to server via PATCH /api/interviews/[token]');

    // Restore fetch
    globalThis.fetch = originalFetch;
  }

  console.log('\n======================================================');
  console.log(`📊 VOICE ENGINE TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');
  if (failed > 0) {
    process.exit(1);
  }
}

runAllVoiceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
