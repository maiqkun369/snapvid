import React from 'react';

function ClipList({ clips, onRemove, onUpdate, onMove }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40">片段列表 ({clips.length} 段)</p>

      <div className="space-y-2">
        {clips.map((clip, index) => (
          <div key={clip.id} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => index > 0 && onMove(index, index - 1)}
                disabled={index === 0}
                className="text-white/20 hover:text-white/50 disabled:opacity-20 text-xs">▲</button>
              <button onClick={() => index < clips.length - 1 && onMove(index, index + 1)}
                disabled={index === clips.length - 1}
                className="text-white/20 hover:text-white/50 disabled:opacity-20 text-xs">▼</button>
            </div>

            {/* Clip number */}
            <span className="text-xs text-cyan-400/70 font-mono w-6">{index + 1}</span>

            {/* Start time */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input type="text" value={clip.start} onChange={(e) => onUpdate(clip.id, 'start', e.target.value)}
                  className="w-20 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-xs text-white/70 font-mono focus:outline-none" />
                <span className="text-white/20">→</span>
                <input type="text" value={clip.end} onChange={(e) => onUpdate(clip.id, 'end', e.target.value)}
                  className="w-20 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-xs text-white/70 font-mono focus:outline-none" />
              </div>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">速度</span>
              <select value={clip.speed} onChange={(e) => onUpdate(clip.id, 'speed', parseFloat(e.target.value))}
                className="bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-xs text-white/70 focus:outline-none">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            {/* Delete */}
            <button onClick={() => onRemove(clip.id)}
              className="text-white/20 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors text-xs">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClipList;
