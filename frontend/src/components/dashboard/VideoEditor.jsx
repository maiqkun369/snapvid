import React, { useState, useEffect, useRef, useCallback } from 'react';
import Timeline from '../editor/Timeline.jsx';
import ClipList from '../editor/ClipList.jsx';
import ExportPanel from '../editor/ExportPanel.jsx';

function VideoEditor() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clips, setClips] = useState([]);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('clips'); // clips | text | effects | export
  const [texts, setTexts] = useState([]);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  // Materials library
  const [materials, setMaterials] = useState([]);
  const [showMaterials, setShowMaterials] = useState(true);
  const videoRef = useRef(null);

  // Fetch completed downloads
  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=50`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
        setMaterials(completed); // Materials = all completed downloads
      });
  }, []);

  // Load video when task selected
  useEffect(() => {
    if (!selectedTask) return;
    setVideoUrl(`/api/editor/stream/${selectedTask}`);
    setClips([]);
    setThumbnails([]);
    setTexts([]);
    setLoading(true);
    fetch(`/api/editor/thumbnails?task_id=${selectedTask}&count=20`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setThumbnails(data.thumbnails || []);
          setDuration(data.duration || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedTask]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (v) => {
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
  };

  const handleRateChange = (r) => {
    setPlaybackRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  };

  const addClip = (start, end) => {
    setClips(prev => [...prev, {
      id: Date.now().toString(),
      start: formatTime(start),
      end: formatTime(end),
      speed: 1.0,
    }]);
  };

  const addText = () => {
    setTexts(prev => [...prev, {
      id: Date.now().toString(),
      content: '输入文字',
      start: Math.floor(currentTime),
      duration: 3,
      position: 'center',
      size: 36,
      color: '#ffffff',
    }]);
  };

  const removeClip = (clipId) => setClips(prev => prev.filter(c => c.id !== clipId));
  const updateClip = (clipId, field, value) => setClips(prev => prev.map(c => c.id === clipId ? { ...c, [field]: value } : c));
  const moveClip = (fromIdx, toIdx) => {
    setClips(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const removeText = (id) => setTexts(prev => prev.filter(t => t.id !== id));
  const updateText = (id, field, value) => setTexts(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));

  // Use material as source
  const selectMaterial = (taskId) => {
    setSelectedTask(taskId);
  };

  return (
    <div className="flex gap-4 -mx-6 -mt-6 h-[calc(100vh-80px)]">
      {/* Left: Materials Library */}
      {showMaterials && (
        <div className="w-56 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/50 font-medium">素材库</p>
            <button onClick={() => setShowMaterials(false)} className="text-white/20 hover:text-white/50 text-xs">×</button>
          </div>
          <div className="space-y-2">
            {materials.map(m => (
              <button key={m.id}
                onClick={() => selectMaterial(m.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                  selectedTask === m.id
                    ? 'bg-cyan-500/[0.08] border-cyan-500/30'
                    : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-white/60 truncate">{m.title || m.filename}</p>
                <p className="text-white/25 mt-0.5">{m.filesize ? `${(m.filesize / 1024 / 1024).toFixed(1)}MB` : ''}</p>
              </button>
            ))}
            {materials.length === 0 && (
              <p className="text-white/25 text-center py-6 text-xs">暂无素材<br/>下载视频后自动加入</p>
            )}
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {!showMaterials && (
          <button onClick={() => setShowMaterials(true)}
            className="absolute left-2 top-20 text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded bg-white/[0.05] z-10">
            素材库
          </button>
        )}

        {!selectedTask ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-4">🎬</p>
              <p className="text-white/40 text-sm">从左侧素材库选择视频开始剪辑</p>
              <p className="text-white/20 text-xs mt-2">或先下载一个视频</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top: Video Preview */}
            <div className="flex-shrink-0 mb-4">
              <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/[0.06]" style={{maxHeight:'320px'}}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full max-h-[320px] object-contain"
                />
              </div>

              {/* Custom Controls */}
              <div className="flex items-center gap-3 mt-2 px-1">
                <button onClick={togglePlay} className="text-white/70 hover:text-white transition-colors">
                  {isPlaying ? '⏸' : '▶️'}
                </button>
                <span className="text-xs text-white/40 font-mono w-24">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-white/30">🔊</span>
                  <input type="range" min="0" max="1" step="0.1" value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-white/[0.1] rounded-full appearance-none cursor-pointer" />
                  <select value={playbackRate} onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="bg-transparent text-xs text-white/40 border-none focus:outline-none cursor-pointer">
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-shrink-0 mb-4">
              <Timeline
                duration={duration}
                currentTime={currentTime}
                thumbnails={thumbnails}
                clips={clips}
                onSeek={seekTo}
                onAddClip={addClip}
                loading={loading}
              />
            </div>

            {/* Bottom: Editing Tabs */}
            <div className="flex-1 overflow-y-auto">
              {/* Tab bar */}
              <div className="flex items-center gap-1 border-b border-white/[0.06] mb-4">
                {[
                  { id: 'clips', label: '片段' },
                  { id: 'text', label: '文字' },
                  { id: 'effects', label: '特效' },
                  { id: 'export', label: '导出' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[1px] transition-all ${
                      activeTab === tab.id
                        ? 'text-white border-white/60'
                        : 'text-white/40 border-transparent hover:text-white/60'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'clips' && (
                <div className="space-y-3">
                  <p className="text-xs text-white/30">在时间线上拖拽选择片段，或手动添加：</p>
                  <button onClick={() => addClip(currentTime, Math.min(currentTime + 10, duration))}
                    className="text-xs text-cyan-400/70 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all">
                    + 从当前位置添加 10s 片段
                  </button>
                  {clips.length > 0 && (
                    <ClipList clips={clips} onRemove={removeClip} onUpdate={updateClip} onMove={moveClip} />
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-3">
                  <button onClick={addText}
                    className="text-xs text-cyan-400/70 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all">
                    + 添加文字
                  </button>
                  {texts.map((t, i) => (
                    <div key={t.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={t.content} onChange={(e) => updateText(t.id, 'content', e.target.value)}
                          className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white/70 focus:outline-none" />
                        <button onClick={() => removeText(t.id)} className="text-white/20 hover:text-red-400 text-xs px-2">×</button>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-white/30">出现:</span>
                          <input type="number" value={t.start} onChange={(e) => updateText(t.id, 'start', parseInt(e.target.value) || 0)}
                            className="w-12 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none" />
                          <span className="text-white/20">秒</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-white/30">时长:</span>
                          <input type="number" value={t.duration} onChange={(e) => updateText(t.id, 'duration', parseInt(e.target.value) || 1)}
                            className="w-12 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none" />
                          <span className="text-white/20">秒</span>
                        </div>
                        <select value={t.position} onChange={(e) => updateText(t.id, 'position', e.target.value)}
                          className="bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-white/70 focus:outline-none">
                          <option value="top">顶部</option>
                          <option value="center">居中</option>
                          <option value="bottom">底部</option>
                        </select>
                        <input type="number" value={t.size} onChange={(e) => updateText(t.id, 'size', parseInt(e.target.value) || 36)}
                          className="w-12 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-1 text-white/70 focus:outline-none"
                          title="字号" />
                      </div>
                    </div>
                  ))}
                  {texts.length === 0 && <p className="text-xs text-white/25 py-4">添加文字叠加到视频上</p>}
                </div>
              )}

              {activeTab === 'effects' && (
                <div className="space-y-3">
                  <p className="text-xs text-white/30 mb-3">视频特效（应用于导出）</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: '无', desc: '原始画面' },
                      { id: 'bw', label: '黑白', desc: 'hue=s=0' },
                      { id: 'vintage', label: '复古', desc: 'colorbalance' },
                      { id: 'bright', label: '提亮', desc: 'eq=brightness=0.1' },
                      { id: 'contrast', label: '对比', desc: 'eq=contrast=1.3' },
                      { id: 'blur', label: '模糊', desc: 'boxblur=5' },
                    ].map(fx => (
                      <button key={fx.id}
                        className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-center">
                        <p className="text-xs text-white/60">{fx.label}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{fx.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/20 mt-2">* 特效将在导出时通过 FFmpeg 滤镜应用</p>
                </div>
              )}

              {activeTab === 'export' && clips.length > 0 && (
                <ExportPanel taskId={selectedTask} clips={clips} texts={texts} />
              )}
              {activeTab === 'export' && clips.length === 0 && (
                <p className="text-sm text-white/30 text-center py-8">请先在时间线上选择至少一个片段</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

export default VideoEditor;
