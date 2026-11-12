"use client";

import React, { useRef, useImperativeHandle, forwardRef } from "react";

export interface KeyMomentItem {
  time_s: number;
  label: string;
  description?: string;
  fish_id?: number;
}

export interface VideoPlayerHandle {
  seekTo: (timeSec: number) => void;
  play: () => void;
  pause: () => void;
  currentTime: () => number;
}

interface VideoPlayerProps {
  mp4Url: string;
  webmUrl?: string;
  posterUrl?: string;
  keyMoments?: KeyMomentItem[];
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ mp4Url, webmUrl, posterUrl, keyMoments = [], onTimeUpdate, className = "" }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (timeSec: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = timeSec;
          videoRef.current.play().catch(() => {});
        }
      },
      play: () => {
        videoRef.current?.play().catch(() => {});
      },
      pause: () => {
        videoRef.current?.pause();
      },
      currentTime: () => videoRef.current?.currentTime || 0,
    }));

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        if (onTimeUpdate) {
          onTimeUpdate(t);
        }
      }
    };

    const handleSeek = (timeSec: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timeSec;
      }
    };

    return (
      <div className={`hairline-panel overflow-hidden flex flex-col bg-abyss ${className}`}>
        {/* Video Canvas */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            data-testid="result-video"
            poster={posterUrl}
            playsInline
            controls
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain"
          >
            {webmUrl && <source src={webmUrl} type="video/webm" />}
            <source src={mp4Url} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>

        {/* Chapters / Key Moments */}
        {keyMoments && keyMoments.length > 0 && (
          <div className="p-3 border-t border-hair bg-trench/50">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3 mb-2">
              Key Moments
            </div>
            <div className="flex flex-wrap gap-2">
              {keyMoments.map((km, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-testid={`key-moment-${idx}`}
                  onClick={() => handleSeek(km.time_s)}
                  className="px-2 py-1 rounded bg-abyss border border-hair hover:border-aqua text-xs font-mono text-ink flex items-center gap-1.5 transition-colors"
                >
                  <span className="text-aqua font-semibold">{km.time_s.toFixed(1)}s:</span>
                  <span>{km.label}</span>
                  {km.fish_id !== undefined && (
                    <span className="text-ink-3 text-[10px]">(Fish #{km.fish_id})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
