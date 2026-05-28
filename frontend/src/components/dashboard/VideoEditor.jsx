import React, { useState, useEffect, useRef } from 'react';
import ExportPanel from '../editor/ExportPanel.jsx';

function VideoEditor() {
  // Materials (all downloaded videos)
  const [materials, setMaterials] = useState([]);
  const [showMaterials, setShowMaterials] = useState(true);

  // Project tracks - multiple sources, multiple clips
  const [projectClips, setProjectClips] = useState([]); // [{id, taskId, title, start, end, speed, thumbnails}]
  const [activeClipIdx, setActiveClipIdx] = useState(-1);

  // Current preview
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDuration, setPreviewDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Editing state
  const [activeTab, setActiveTab] = useState('timeline');
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Clip addition mode
  const [addingFrom, setAddingFrom] = useState(null); // taskId being added from
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [addDuration, setAddDuration] = useState(0);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  // Fetch all downloaded videos
  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename &&
          (t.filename.endsWith('.mp4') || t.filename.endsWith('.mkv') || t.filename.endsWith('.webm') || t.filename.endsWith('.mov')));
        setMaterials(completed);
      });
  }, []);

  // Preview a clip or material
  const previewMaterial = (taskId) => {
    setPreviewUrl(`/api/editor/stream/${taskId}`);
    setAddingFrom(taskId);
    setClipStart(0);
    setClipEnd(0);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setPreviewDuration(dur);
      setAddDuration(dur);
      if (clipEnd === 0) setClipEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const seekTo = (time) => {
    if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  // Add clip from current material to project
  const addClipToProject = () => {
    if (!addingFrom) return;
    const material = materials.find(m => m.id === addingFrom);
    const newClip = {
      id: Date.now().toString(),
      taskId: addingFrom,
      title: material?.title || '未知',
      start: formatTime(clipStart),
      end: formatTime(clipEnd),
      speed: 1.0,
      duration: clipEnd - clipStart,
    };
    setProjectClips(prev => [...prev, newClip]);
  };

  // Remove clip from project
  const removeClip = (clipId) => setProjectClips(prev => prev.filter(c => c.id !== clipId));

  // Move clip in timeline
  const moveClip = (fromIdx, toIdx) => {
    setProjectClips(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  // Update clip property
  const updateClip = (clipId, field, value) => {
    setProjectClips(prev => prev.map(c => c.id === clipId ? { ...c, [field]: value } : c));
  };

  // Preview a specific project clip
  const previewClip = (clip, idx) => {
    setPreviewUrl(`/api/editor/stream/${clip.taskId}`);
    setActiveClipIdx(idx);
    // Seek to clip start after video loads
    setTimeout(() => {
      if (videoRef.current) {
        const startSec = timeToSec(clip.start);
        videoRef.current.currentTime = startSec;
      }
    }, 300);
  };

  // Text operations
  const addText = () => {
    setTexts(prev => [...prev, {
      id: Date.now().toString(),
      content: '输入文字',
      start: 0,
      duration: 3,
      position: 'bottom',
      size: 36,
    }]);
  };
  const removeText = (id) => setTexts(prev => prev.filter(t => t.id !== id));
  const updateText = (id, field, value) => setTexts(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));

  // Total project duration
  const totalDuration = projectClips.reduce((sum, c) => sum + (c.duration || 0), 0);

  return (
    <div className="flex gap-0 -mx-6 -mt-6 h-[calc(100vh-80px)]">
      {/* Left: Materials Library */}
      {showMaterials && (
        <div className="w-52 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
            <p className="text-xs text-white/50 font-medium">素材库</p>
            <button onClick={() => setShowMaterials(false)} className="text-white/20 hover:text-white/50 text-xs">×</button>
          </div>
          <div className="p-2 space-y-1">
            {materials.map(m => (
              <button key={m.id}
                onClick={() => previewMaterial(m.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  addingFrom === m.id
                    ? 'bg-cyan-500/[0.1] border-cyan-500/30'
                    : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]'
                }`}
              >
                <p className="text-white/60 truncate text-xs">{m.title || m.filename}</p>
                <p className="text-white/25 text-[10px] mt-0.5">{m.filesize ? `${(m.filesize / 1024 / 1024).toFixed(1)}MB` : ''}</p>
              </button>
            ))}
            {materials.length === 0 && (
              <p className="text-white/25 text-center py-8 text-xs">暂无素材</p>
            )}
          </div>
        </div>
      )}

      {/* Center: Main Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!showMaterials && (
          <button onClick={() => setShowMaterials(true)}
            className="absolute left-2 top-20 text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded bg-white/[0.05] z-10">
            素材库
          </button>
        )}

        {/* Top: Video Preview */}
        <div className="flex-shrink-0 bg-black/40 relative" style={{height: '45%'}}>
          {previewUrl ? (
            <video
              ref={videoRef}
              src={previewUrl}
              onLoadedMetadata={handleVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl mb-3">🎬</p>
                <p className="text-white/30 text-sm">从素材库选择视频开始剪辑</p>
              </div>
            </div>
          )}

          {/* Controls overlay */}
          {previewUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 flex items-center gap-3">
              <button onClick={togglePlay} className="text-white/80 hover:text-white text-sm">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span className="text-xs text-white/50 font-mono">{formatTime(currentTime)} / {formatTime(previewDuration)}</span>
              {/* Seek bar */}
              <input type="range" min="0" max={previewDuration || 1} step="0.1" value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer" />
              <select value={playbackRate} onChange={(e) => { setPlaybackRate(parseFloat(e.target.value)); if(videoRef.current) videoRef.current.playbackRate=parseFloat(e.target.value); }}
                className="bg-transparent text-xs text-white/50 border-none focus:outline-none">
                <option value="0.5">0.5x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option>
              </select>
            </div>
          )}
        </div>

        {/* Clip Range Selector (when adding from material) */}
        {addingFrom && previewDuration > 0 && (
          <div className="flex-shrink-0 px-4 py-3 bg-white/[0.02] border-y border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">截取范围:</span>
              <input type="range" min="0" max={previewDuration} step="0.1" value={clipStart}
                onChange={(e) => { setClipStart(parseFloat(e.target.value)); seekTo(parseFloat(e.target.value)); }}
                className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
              <span className="text-xs text-white/50 font-mono w-14">{formatTime(clipStart)}</span>
              <span className="text-white/20">→</span>
              <input type="range" min="0" max={previewDuration} step="0.1" value={clipEnd}
                onChange={(e) => setClipEnd(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
              <span className="text-xs text-white/50 font-mono w-14">{formatTime(clipEnd)}</span>
              <button onClick={addClipToProject}
                disabled={clipEnd <= clipStart}
                className="text-xs text-white font-medium bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 rounded-lg
                  hover:bg-cyan-500/30 transition-all disabled:opacity-30">
                添加到轨道
              </button>
            </div>
          </div>
        )}

        {/* Bottom: Timeline Track + Editing Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 border-b border-white/[0.06] flex-shrink-0">
            {[
              { id: 'timeline', label: '轨道' },
              { id: 'text', label: '文字' },
              { id: 'effects', label: '特效' },
              { id: 'export', label: '导出' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-[1px] transition-all ${
                  activeTab === tab.id ? 'text-white border-cyan-400/60' : 'text-white/40 border-transparent hover:text-white/60'
                }`}>
                {tab.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/20">总时长: {formatTime(totalDuration)}</span>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {projectClips.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/30 text-sm">轨道为空</p>
                    <p className="text-white/20 text-xs mt-1">从左侧素材库选择视频 → 设定截取范围 → 添加到轨道</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectClips.map((clip, idx) => (
                      <div key={clip.id} className="space-y-0">
                        <div
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                            activeClipIdx === idx ? 'bg-cyan-500/[0.08] border-cyan-500/30 rounded-b-none' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                          }`}
                          onClick={() => previewClip(clip, idx)}
                        >
                          {/* Reorder */}
                          <div className="flex flex-col gap-0.5 text-white/20">
                            <button onClick={(e) => { e.stopPropagation(); idx > 0 && moveClip(idx, idx-1); }} disabled={idx===0} className="hover:text-white/50 disabled:opacity-20 text-[10px]">▲</button>
                            <button onClick={(e) => { e.stopPropagation(); idx < projectClips.length-1 && moveClip(idx, idx+1); }} disabled={idx===projectClips.length-1} className="hover:text-white/50 disabled:opacity-20 text-[10px]">▼</button>
                          </div>

                          {/* Clip # */}
                          <span className="text-xs text-cyan-400/60 font-mono w-5">{idx+1}</span>

                          {/* Visual bar */}
                          <div className="flex-1 min-w-0">
                            <div className="h-8 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/[0.06] flex items-center px-2 gap-2">
                              <span className="text-[10px] text-white/50 truncate flex-1">{clip.title}</span>
                              <span className="text-[10px] text-white/30 font-mono shrink-0">{clip.start}→{clip.end}</span>
                            </div>
                          </div>

                          {/* Speed */}
                          <select value={clip.speed} onClick={(e)=>e.stopPropagation()} onChange={(e) => updateClip(clip.id, 'speed', parseFloat(e.target.value))}
                            className="bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-[10px] text-white/60 focus:outline-none w-14">
                            <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                            <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                          </select>

                          {/* Delete */}
                          <button onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                            className="text-white/20 hover:text-red-400 text-xs px-1.5 py-1 rounded hover:bg-red-500/10">×</button>
                        </div>

                        {/* Expanded edit panel when selected */}
                        {activeClipIdx === idx && (
                          <div className="px-4 py-3 bg-cyan-500/[0.04] border border-t-0 border-cyan-500/20 rounded-b-xl space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/40 w-12">起始</span>
                              <input type="text" value={clip.start}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateClip(clip.id, 'start', e.target.value)}
                                className="w-20 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-xs text-white/70 font-mono focus:outline-none focus:border-cyan-500/40" />
                              <span className="text-xs text-white/40 w-12">结束</span>
                              <input type="text" value={clip.end}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => { updateClip(clip.id, 'end', e.target.value); updateClip(clip.id, 'duration', timeToSec(e.target.value) - timeToSec(clip.start)); }}
                                className="w-20 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-xs text-white/70 font-mono focus:outline-none focus:border-cyan-500/40" />
                              <span className="text-xs text-white/25 ml-auto">时长: {formatTime(clip.duration || 0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); if(videoRef.current) updateClip(clip.id, 'start', formatTime(videoRef.current.currentTime)); }}
                                className="text-[10px] text-cyan-400/60 px-2 py-1 rounded border border-cyan-500/20 hover:bg-cyan-500/10">
                                设为当前时间(起始)
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if(videoRef.current) { updateClip(clip.id, 'end', formatTime(videoRef.current.currentTime)); updateClip(clip.id, 'duration', videoRef.current.currentTime - timeToSec(clip.start)); } }}
                                className="text-[10px] text-cyan-400/60 px-2 py-1 rounded border border-cyan-500/20 hover:bg-cyan-500/10">
                                设为当前时间(结束)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-3">
                <button onClick={addText}
                  className="text-xs text-cyan-400/70 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all">
                  + 添加文字
                </button>
                {texts.map(t => (
                  <div key={t.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={t.content} onChange={(e) => updateText(t.id, 'content', e.target.value)}
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white/70 focus:outline-none" />
                      <button onClick={() => removeText(t.id)} className="text-white/20 hover:text-red-400 text-xs px-2">×</button>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-white/30">出现</span>
                      <input type="number" value={t.start} onChange={(e) => updateText(t.id, 'start', parseInt(e.target.value)||0)}
                        className="w-12 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none" />
                      <span className="text-white/30">秒 时长</span>
                      <input type="number" value={t.duration} onChange={(e) => updateText(t.id, 'duration', parseInt(e.target.value)||1)}
                        className="w-12 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none" />
                      <span className="text-white/30">秒</span>
                      <select value={t.position} onChange={(e) => updateText(t.id, 'position', e.target.value)}
                        className="bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-white/70 focus:outline-none">
                        <option value="top">顶部</option><option value="center">居中</option><option value="bottom">底部</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="grid grid-cols-3 gap-2">
                {['无', '黑白', '复古', '提亮', '对比', '模糊'].map(fx => (
                  <button key={fx} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-xs text-white/60 transition-all">{fx}</button>
                ))}
              </div>
            )}

            {activeTab === 'export' && (
              projectClips.length > 0 ? (
                <MultiSourceExportPanel clips={projectClips} texts={texts} />
              ) : (
                <p className="text-sm text-white/30 text-center py-8">请先在轨道中添加片段</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Multi-source export panel - handles clips from different videos
function MultiSourceExportPanel({ clips, texts }) {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('original');
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setResult(null);
    setError('');

    // Build multi-source edit plan
    const editPlan = {
      multi_source: true,
      clips: clips.map(c => ({
        task_id: c.taskId,
        start: c.start,
        end: c.end,
        speed: c.speed || 1.0,
      })),
      output_format: format,
      resolution,
      quality,
      texts: texts.map(t => ({ content: t.content, start: t.start, duration: t.duration, position: t.position, size: t.size })),
    };

    try {
      const res = await fetch(`/api/editor/export-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlan),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.detail || '导出失败');
    } catch (e) { setError('网络错误'); }
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">格式</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="mp4">MP4</option><option value="webm">WebM</option><option value="mkv">MKV</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">分辨率</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="original">原始</option><option value="1080p">1080P</option><option value="720p">720P</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">质量</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="high">高质量</option><option value="medium">均衡</option><option value="low">小体积</option>
          </select>
        </div>
      </div>

      <button onClick={handleExport} disabled={exporting || clips.length === 0}
        className="w-full py-3 bg-white text-gray-900 font-medium rounded-xl hover:scale-[1.01] transition-all disabled:opacity-30">
        {exporting ? '导出中...' : `导出视频 (${clips.length} 段来自 ${new Set(clips.map(c=>c.taskId)).size} 个源)`}
      </button>

      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-300/80">✓ {result.message}</p>
            <p className="text-xs text-white/30 mt-1">{result.output_size ? `${(result.output_size/1024/1024).toFixed(1)} MB` : ''}</p>
          </div>
          {result.output_filename && (
            <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download
              className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-xl hover:scale-[1.02] transition-all">
              下载
            </a>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-300/80 bg-red-500/[0.06] border border-red-500/20 rounded-xl p-3">{error}</p>}
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function timeToSec(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return parseFloat(timeStr) || 0;
}

export default VideoEditor;
