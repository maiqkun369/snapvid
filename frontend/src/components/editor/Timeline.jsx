import React, { useState, useRef } from 'react';

function Timeline({ duration, currentTime, thumbnails, clips, onSeek, onAddClip, loading }) {
  const [selecting, setSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState(null);
  const [selectEnd, setSelectEnd] = useState(null);
  const timelineRef = useRef(null);

  const getTimeFromPosition = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleMouseDown = (e) => {
    const time = getTimeFromPosition(e);
    setSelecting(true);
    setSelectStart(time);
    setSelectEnd(time);
  };

  const handleMouseMove = (e) => {
    if (selecting) {
      setSelectEnd(getTimeFromPosition(e));
    }
  };

  const handleMouseUp = () => {
    if (selecting && selectStart !== null && selectEnd !== null) {
      const start = Math.min(selectStart, selectEnd);
      const end = Math.max(selectStart, selectEnd);
      if (end - start > 0.5) {
        onAddClip(start, end);
      }
    }
    setSelecting(false);
    setSelectStart(null);
    setSelectEnd(null);
  };

  const handleClick = (e) => {
    if (!selecting) {
      onSeek(getTimeFromPosition(e));
    }
  };

  const playheadPos = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">时间线 · 拖拽选择片段</p>
        <p className="text-xs text-white/30">{formatSec(currentTime)} / {formatSec(duration)}</p>
      </div>

      {/* Timeline bar */}
      <div
        ref={timelineRef}
        className="relative h-16 bg-white/[0.03] rounded-xl border border-white/[0.08] overflow-hidden cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div className="absolute inset-0 flex">
            {thumbnails.map((thumb, i) => (
              <img
                key={i}
                src={`/api/tools/preview/${encodeURIComponent(thumb)}`}
                alt=""
                className="h-full object-cover flex-1 opacity-60"
                draggable={false}
              />
            ))}
          </div>
        )}

        {/* Loading placeholder */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-white/30 animate-pulse">加载时间线...</p>
          </div>
        )}

        {/* Existing clips highlighted */}
        {clips.map((clip, i) => {
          const startPct = (timeToSec(clip.start) / duration) * 100;
          const endPct = (timeToSec(clip.end) / duration) * 100;
          return (
            <div key={clip.id}
              className="absolute top-0 bottom-0 bg-cyan-500/30 border-l-2 border-r-2 border-cyan-400/60"
              style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
            >
              <span className="absolute top-1 left-1 text-[9px] text-cyan-200/70">{i + 1}</span>
            </div>
          );
        })}

        {/* Selection in progress */}
        {selecting && selectStart !== null && selectEnd !== null && (
          <div className="absolute top-0 bottom-0 bg-purple-500/30 border-l-2 border-r-2 border-purple-400/70"
            style={{
              left: `${(Math.min(selectStart, selectEnd) / duration) * 100}%`,
              width: `${(Math.abs(selectEnd - selectStart) / duration) * 100}%`,
            }}
          />
        )}

        {/* Playhead */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 pointer-events-none"
          style={{ left: `${playheadPos}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full -translate-x-1 -translate-y-0.5" />
        </div>
      </div>

      {/* Time markers */}
      <div className="flex justify-between text-[10px] text-white/20 px-1">
        <span>0:00</span>
        <span>{formatSec(duration / 4)}</span>
        <span>{formatSec(duration / 2)}</span>
        <span>{formatSec(duration * 3 / 4)}</span>
        <span>{formatSec(duration)}</span>
      </div>
    </div>
  );
}

function formatSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeToSec(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(timeStr) || 0;
}

export default Timeline;
