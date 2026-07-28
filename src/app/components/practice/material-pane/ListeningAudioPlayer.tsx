'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  FastForward,
  Gauge,
  LockSimple,
  Pause,
  Play,
  Rewind,
  Waveform,
} from '@phosphor-icons/react';
import {
  clampPlaybackTime,
  formatClock as formatAudioClock,
  resolveActiveCueIndex,
  type TranscriptCue,
} from '@/lib/practice-listening-cues';

const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75];

export function ListeningAudioPlayer({
  audioUrl,
  cues,
  transcriptParagraphs,
  fallbackDurationSeconds,
}: {
  audioUrl: string | null;
  cues: TranscriptCue[];
  transcriptParagraphs: number;
  fallbackDurationSeconds: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCueRef = useRef<HTMLButtonElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSeconds ?? 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [examOnce, setExamOnce] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const effectiveDuration = duration > 0 ? duration : fallbackDurationSeconds ?? 0;
  const activeIndex = resolveActiveCueIndex(cues, currentTime);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;
  const playbackLocked = examOnce && hasEnded;

  useEffect(() => {
    if (activeIndex >= 0 && activeCueRef.current) {
      activeCueRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || playbackLocked) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (examOnce && seconds < currentTime) return; // no rewinding under the play-once exam lock
    const next = clampPlaybackTime(seconds, effectiveDuration || audio.duration || 0);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const cyclePlaybackRate = () => {
    const index = PLAYBACK_RATES.indexOf(playbackRate);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const restart = () => {
    if (examOnce) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    setHasEnded(false);
    void audio.play();
  };

  if (!audioUrl) {
    return (
      <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        当前单元还没有 audio_url，接入后这里会出现可播放的 Listening section。
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const el = event.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
          el.playbackRate = playbackRate;
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
        }}
      />

      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700">
          <Waveform size={20} weight="regular" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Listening 音频</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-800/75">
                示例占位音轨（非真人朗读），用于演示播放器与同步字幕。字幕行会跟随进度高亮，可点击跳转。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExamOnce((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors active:scale-[0.98] ${
                examOnce
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-sky-200 bg-white text-sky-800 hover:border-sky-300'
              }`}
            >
              <LockSimple size={13} weight={examOnce ? 'fill' : 'regular'} />
              仅播一次
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={playbackLocked}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white transition-all hover:bg-sky-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-sky-200"
                aria-label={isPlaying ? '暂停音频' : '播放音频'}
              >
                {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
              </button>
              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration || 100}
                  step={0.1}
                  value={Math.min(currentTime, effectiveDuration || currentTime)}
                  disabled={examOnce}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-sky-600 disabled:cursor-not-allowed"
                  aria-label="播放进度"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tabular-nums text-sky-800/65">
                  <span>{formatAudioClock(currentTime)}</span>
                  <span>{effectiveDuration > 0 ? formatAudioClock(effectiveDuration) : '--:--'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PlayerChip icon={Rewind} label="-10s" onClick={() => seekTo(currentTime - 10)} disabled={examOnce} />
              <PlayerChip icon={FastForward} label="+10s" onClick={() => seekTo(currentTime + 10)} />
              <PlayerChip icon={Gauge} label={`${playbackRate}x`} onClick={cyclePlaybackRate} />
              <PlayerChip icon={ArrowCounterClockwise} label="重听" onClick={restart} disabled={examOnce} />
            </div>

            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sky-100">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {playbackLocked && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-sky-800">
              <LockSimple size={13} weight="fill" />
              「仅播一次」已锁定：模拟真实考试，音频只播放一遍，无法重听或拖动。
            </p>
          )}

          {cues.length > 0 && (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-sky-900">同步字幕 · {cues.length} 行</p>
                <button
                  type="button"
                  onClick={() => setShowTranscript((value) => !value)}
                  className="rounded-full border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:border-sky-300 active:scale-[0.98]"
                >
                  {showTranscript ? '隐藏' : '显示'}
                </button>
              </div>
              {showTranscript && (
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {cues.map((cue, index) => {
                    const active = index === activeIndex;
                    return (
                      <button
                        key={`${cue.start}-${index}`}
                        ref={active ? activeCueRef : undefined}
                        type="button"
                        onClick={() => seekTo(cue.start)}
                        disabled={examOnce}
                        className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs leading-relaxed transition-colors disabled:cursor-not-allowed ${
                          active
                            ? 'bg-sky-600 text-white'
                            : 'text-sky-900/80 hover:bg-sky-50'
                        }`}
                      >
                        <span className={`shrink-0 tabular-nums font-semibold ${active ? 'text-white/80' : 'text-sky-500'}`}>
                          {formatAudioClock(cue.start)}
                        </span>
                        <span>{cue.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-sky-800/60">
                下方完整 transcript（{transcriptParagraphs} 段）仍可 highlight / 加 note，用于听后复盘。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerChip({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: typeof Rewind;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:border-sky-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={13} weight="regular" />
      {label}
    </button>
  );
}
