'use client';

import React from 'react';
import { Mic, MicOff, Volume2, Pause, Play, Loader2, RotateCcw, AlertCircle } from 'lucide-react';

export type VoiceVisualizerStatus = 
  | 'preparing'
  | 'listening'
  | 'processing'
  | 'ai_speaking'
  | 'paused'
  | 'unavailable'
  | 'error'
  | 'idle';

interface VoiceVisualizerProps {
  status?: VoiceVisualizerStatus;
  isAiSpeaking: boolean;
  isListening: boolean;
  isPaused?: boolean;
  audioLevel: number; // 0.0 to 1.0
  onInterrupt?: () => void;
  onReplay?: () => void;
  onTogglePause?: () => void;
  onRetry?: () => void;
  disabled?: boolean;
}

export function VoiceVisualizer({
  status,
  isAiSpeaking,
  isListening,
  isPaused = false,
  audioLevel,
  onInterrupt,
  onReplay,
  onTogglePause,
  onRetry,
  disabled = false,
}: VoiceVisualizerProps) {
  // Determine canonical active status if not explicitly passed
  const activeStatus: VoiceVisualizerStatus = status || (
    isAiSpeaking 
      ? 'ai_speaking' 
      : isPaused 
      ? 'paused' 
      : isListening 
      ? 'listening' 
      : 'idle'
  );

  // Generate 16 refined waveform bars responsive to real-time audio input
  const barHeights = React.useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      if (activeStatus === 'ai_speaking') {
        const phase = i * 0.45;
        return 12 + Math.sin(phase) * 10;
      }
      if (activeStatus === 'listening') {
        const factor = Math.sin((i / 15) * Math.PI);
        const minHeight = 5;
        const dynamicBoost = Math.max(0, audioLevel) * 36 * factor;
        return Math.min(38, Math.max(minHeight, minHeight + dynamicBoost));
      }
      return 5; // Default baseline resting height
    });
  }, [activeStatus, audioLevel]);

  // Clean, professional status configuration
  const config = {
    listening: {
      title: 'Listening to your response...',
      subtitle: 'Speak clearly into your microphone. Your answer is transcribed below.',
      icon: Mic,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      iconContainer: 'bg-zinc-950 text-white',
      indicatorDot: 'bg-emerald-500 ring-2 ring-emerald-500/20',
      waveformColor: 'bg-emerald-600',
    },
    ai_speaking: {
      title: 'Interviewer is speaking...',
      subtitle: 'Listening to question audio. You can interrupt or begin speaking anytime.',
      icon: Volume2,
      badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      iconContainer: 'bg-zinc-900 text-white',
      indicatorDot: 'bg-zinc-900 animate-pulse',
      waveformColor: 'bg-zinc-700',
    },
    paused: {
      title: 'Microphone paused',
      subtitle: 'Speech capture is suspended. Click "Resume" to continue speaking.',
      icon: Pause,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
      iconContainer: 'bg-amber-600 text-white',
      indicatorDot: 'bg-amber-500',
      waveformColor: 'bg-amber-400',
    },
    processing: {
      title: 'Evaluating answer...',
      subtitle: 'Analyzing your technical explanation and preparing the next question.',
      icon: Loader2,
      badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      iconContainer: 'bg-zinc-900 text-white',
      indicatorDot: 'bg-zinc-600 animate-spin',
      waveformColor: 'bg-zinc-400',
    },
    preparing: {
      title: 'Connecting audio engine...',
      subtitle: 'Checking browser audio permissions and establishing audio context.',
      icon: Loader2,
      badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      iconContainer: 'bg-zinc-800 text-white',
      indicatorDot: 'bg-zinc-400',
      waveformColor: 'bg-zinc-300',
    },
    unavailable: {
      title: 'Microphone permission required',
      subtitle: 'No audio detected. Please grant microphone access in your browser settings.',
      icon: MicOff,
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      iconContainer: 'bg-rose-600 text-white',
      indicatorDot: 'bg-rose-500',
      waveformColor: 'bg-rose-300',
    },
    error: {
      title: 'Speech connection interrupted',
      subtitle: 'Connection dropped. Any previously captured text has been preserved.',
      icon: AlertCircle,
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      iconContainer: 'bg-rose-600 text-white',
      indicatorDot: 'bg-rose-500',
      waveformColor: 'bg-rose-300',
    },
    idle: {
      title: 'Microphone standby',
      subtitle: 'Audio stream connected and awaiting your input.',
      icon: Mic,
      badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      iconContainer: 'bg-zinc-700 text-white',
      indicatorDot: 'bg-zinc-400',
      waveformColor: 'bg-zinc-300',
    },
  }[activeStatus];

  const IconComponent = config.icon;

  return (
    <div 
      className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs transition-all duration-200"
      role="region"
      aria-label="Voice Interview Status and Controls"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Status badge & icon */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div 
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${config.iconContainer}`}
            aria-hidden="true"
          >
            <IconComponent className={`w-5 h-5 ${activeStatus === 'processing' || activeStatus === 'preparing' ? 'animate-spin' : ''}`} />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span 
                className={`inline-block w-2 h-2 rounded-full ${config.indicatorDot}`} 
                aria-hidden="true" 
              />
              <p className="text-sm font-semibold text-zinc-950 tracking-tight">
                {config.title}
              </p>
              <span 
                className={`hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeColor}`}
              >
                Voice Stream
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-normal truncate sm:whitespace-normal">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Live soundwave frequency bars */}
        <div 
          className="flex items-center justify-center gap-1 h-10 px-4 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200/80 w-full md:w-auto min-w-[170px]"
          aria-hidden="true"
        >
          {barHeights.map((height, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-75 ${config.waveformColor}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        {/* Right: Primary Voice Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Explicit Retry Action for Disconnects */}
          {(activeStatus === 'error' || activeStatus === 'unavailable') && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
              className="ui-btn-secondary h-8 px-3 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Reconnect and resume speech recognition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Retry Speech Engine</span>
            </button>
          )}

          {/* AI Interrupt action */}
          {activeStatus === 'ai_speaking' && onInterrupt && (
            <button
              type="button"
              onClick={onInterrupt}
              className="ui-btn-secondary h-8 px-3 text-xs font-medium text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100 transition-colors shadow-2xs"
            >
              <span>Interrupt & Speak</span>
            </button>
          )}

          {/* Replay question action */}
          {activeStatus !== 'ai_speaking' && activeStatus !== 'processing' && onReplay && (
            <button
              type="button"
              onClick={onReplay}
              disabled={disabled}
              className="ui-btn-secondary h-8 px-3 text-xs font-medium text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Listen to the question again"
            >
              <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Replay Question</span>
            </button>
          )}

          {/* Microphone Pause / Resume action */}
          {onTogglePause && (activeStatus === 'listening' || activeStatus === 'paused') && (
            <button
              type="button"
              onClick={onTogglePause}
              disabled={disabled}
              className={`ui-btn-secondary h-8 px-3 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs ${
                activeStatus === 'paused'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              {activeStatus === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
                  <span>Resume Mic</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Pause Mic</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
