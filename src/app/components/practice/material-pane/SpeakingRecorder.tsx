'use client';

import { useEffect, useRef, useState } from 'react';
import { Microphone, MicrophoneSlash, Record, Stop, Trash, WarningCircle } from '@phosphor-icons/react';
import { formatTimer } from './format';

const SPEAKING_SELF_CRITERIA = [
  { id: 'fluency', label: 'Fluency' },
  { id: 'lexical', label: 'Lexical' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'pronunciation', label: 'Pronunciation' },
];

function pickAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export function SpeakingRecorder() {
  const [supported] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined',
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status !== 'recording') return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setRecordedSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        setStatus('recorded');
        stopStream();
      };

      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setSelfRating({});
      setStatus('recording');
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : '';
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '麦克风权限被拒绝。请在浏览器地址栏允许麦克风后重试。'
          : name === 'NotFoundError'
            ? '没有检测到可用的麦克风设备。'
            : '无法开始录音，请检查浏览器麦克风设置。',
      );
      stopStream();
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const clearRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setRecordedSeconds(0);
    setSelfRating({});
    setStatus('idle');
  };

  const ratedValues = Object.values(selfRating);
  const averageBand =
    ratedValues.length > 0 ? Math.round((ratedValues.reduce((sum, value) => sum + value, 0) / ratedValues.length) * 10) / 10 : null;

  return (
    <div className="mb-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700">
          <Microphone size={20} weight="regular" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Speaking 录音自评</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-800/75">
                录下你的 Part 2 回答，回放并对照 band 描述符自评。录音只留在本机内存，不会上传或写数据库。
              </p>
            </div>
            {status === 'recording' && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                REC {formatTimer(recordingSeconds)}
              </span>
            )}
          </div>

          {!supported ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-3 text-xs text-rose-800">
              <MicrophoneSlash size={16} weight="regular" className="mt-0.5 shrink-0" />
              <span>当前浏览器不支持 MediaRecorder 录音。可改用系统录音工具，仍能在下方做 band 自评。</span>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {status !== 'recording' ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-2xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-800 active:scale-[0.98]"
                  >
                    <Record size={17} weight="fill" />
                    {status === 'recorded' ? '重新录音' : '开始录音'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-2xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black active:scale-[0.98]"
                  >
                    <Stop size={17} weight="fill" />
                    停止录音
                  </button>
                )}
                {status === 'recorded' && audioUrl && (
                  <button
                    type="button"
                    onClick={clearRecording}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 transition-all hover:bg-rose-100 active:scale-[0.98]"
                  >
                    <Trash size={16} weight="regular" />
                    清除
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
                  <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}

              {status === 'recorded' && audioUrl && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-rose-900">
                    回放 · 时长约 {formatTimer(recordedSeconds)}
                  </p>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
            </>
          )}

          <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-rose-900">结合录音自评（本地）</p>
              <span className="text-xs font-semibold tabular-nums text-rose-700">
                {averageBand !== null ? `均分 ${averageBand}` : '未评'}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {SPEAKING_SELF_CRITERIA.map((criterion) => (
                <div key={criterion.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-900/80">{criterion.label}</span>
                  <div className="flex gap-1.5">
                    {[5, 6, 7, 8].map((band) => (
                      <button
                        key={band}
                        type="button"
                        onClick={() => setSelfRating((current) => ({ ...current, [criterion.id]: band }))}
                        className={`h-7 w-7 rounded-full border text-[11px] font-semibold transition-all active:scale-[0.98] ${
                          selfRating[criterion.id] === band
                            ? 'border-rose-700 bg-rose-700 text-white'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300'
                        }`}
                      >
                        {band}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-rose-800/60">
              这是练习时的即时自检；提交 session 后，答题卡里还有可保存的 4 项 band 自评会写入复盘轨迹。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
