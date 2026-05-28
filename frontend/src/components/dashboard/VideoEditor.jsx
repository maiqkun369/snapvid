import React, { useState, useEffect, useRef, useCallback } from 'react';

function VideoEditor() {
  const [materials, setMaterials] = useState([]);
  const [showMaterials, setShowMaterials] = useState(true);
  const [projectClips, setProjectClips] = useState([]);
  const [activeClipIdx, setActiveClipIdx] = useState(-1);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDuration, setPreviewDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [texts, setTexts] = useState([]);
  const [addingFrom, setAddingFrom] = useState(null);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  // Frame thumbnails for materials
  const [materialFrames, setMaterialFrames] = useState({}); // taskId -> [frameDataUrl]
  const [clipFrames, setClipFrames] = useState({}); // clipId -> [frameDataUrl]
  const [dragOverIdx, setDragOverIdx] = useState(-1);
  const [previewEffect, setPreviewEffect] = useState('none');

  const videoRef = useRef(null);
  const frameCanvasRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename &&
          /\.(mp4|mkv|webm|mov)$/i.test(t.filename));
        setMaterials(completed);
      });
  }, []);

  // Extract frames from video for thumbnail strip
  const extractFrames = useCallback(async (taskId, count = 6) => {
    if (materialFrames[taskId]) return;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = `/api/editor/stream/${taskId}`;
    video.muted = true;

    await new Promise((resolve) => { video.onloadedmetadata = resolve; video.load(); });
    const duration = video.duration;
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');
    const frames = [];

    for (let i = 0; i < count; i++) {
      const time = (duration / count) * i + 0.5;
      video.currentTime = time;
      await new Promise(r => { video.onseeked = r; });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.5));
    }

    setMaterialFrames(prev => ({ ...prev, [taskId]: frames }));
    video.remove();
  }, [materialFrames]);

  const previewMaterial = (taskId) => {
    setPreviewUrl(`/api/editor/stream/${taskId}`);
    setAddingFrom(taskId);
    setClipStart(0);
    setClipEnd(0);
    extractFrames(taskId);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setPreviewDuration(dur);
      if (clipEnd === 0) setClipEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const seekTo = (t) => { if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); } };
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

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
    // Copy frames for clip
    if (materialFrames[addingFrom]) {
      setClipFrames(prev => ({ ...prev, [newClip.id]: materialFrames[addingFrom] }));
    }
  };

  // Drag & Drop from materials
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIdx(idx);
  };

  const handleDrop = (e, insertIdx) => {
    e.preventDefault();
    setDragOverIdx(-1);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const material = materials.find(m => m.id === taskId);
    if (!material) return;
    // Add full video as clip
    const newClip = {
      id: Date.now().toString(),
      taskId: taskId,
      title: material.title || '未知',
      start: '00:00',
      end: formatTime(material.filesize ? 60 : 30), // default placeholder
      speed: 1.0,
      duration: 60,
    };
    setProjectClips(prev => {
      const next = [...prev];
      next.splice(insertIdx, 0, newClip);
      return next;
    });
    // Load frames
    previewMaterial(taskId);
  };

  const handleTrackDrop = (e) => {
    handleDrop(e, projectClips.length);
  };

  const removeClip = (id) => setProjectClips(prev => prev.filter(c => c.id !== id));
  const updateClip = (id, field, value) => setProjectClips(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  const moveClip = (from, to) => {
    setProjectClips(prev => { const n=[...prev]; const [i]=n.splice(from,1); n.splice(to,0,i); return n; });
  };

  const previewClip = (clip, idx) => {
    setPreviewUrl(`/api/editor/stream/${clip.taskId}`);
    setActiveClipIdx(idx);
    setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = timeToSec(clip.start); }, 300);
  };

  // Text
  const addText = () => setTexts(prev => [...prev, { id: Date.now().toString(), content: '文字', start: 0, duration: 3, position: 'bottom', size: 36 }]);
  const removeText = (id) => setTexts(prev => prev.filter(t => t.id !== id));
  const updateText = (id, f, v) => setTexts(prev => prev.map(t => t.id === id ? { ...t, [f]: v } : t));

  const totalDuration = projectClips.reduce((s, c) => s + (c.duration || 0), 0);

  // CSS filter for preview effect
  const effectFilter = {
    none: '', bw: 'grayscale(100%)', vintage: 'sepia(60%)',
    bright: 'brightness(1.2)', contrast: 'contrast(1.4)', blur: 'blur(2px)',
  }[previewEffect] || '';

  return (
    <div className="flex gap-0 -mx-6 -mt-6 h-[calc(100vh-80px)]">
      {/* Left: Materials with frame thumbnails + drag support */}
      {showMaterials && (
        <div className="w-56 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
            <p className="text-xs text-white/50 font-medium">素材库 · 拖拽到轨道</p>
            <button onClick={() => setShowMaterials(false)} className="text-white/20 hover:text-white/50 text-xs">×</button>
          </div>
          <div className="p-2 space-y-1.5">
            {materials.map(m => (
              <div key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(e, m.id)}
                onClick={() => previewMaterial(m.id)}
                className={`rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                  addingFrom === m.id ? 'bg-cyan-500/[0.1] border-cyan-500/30' : 'bg-white/[0.02] border-transparent hover:border-white/[0.08]'
                }`}
              >
                {/* Frame strip */}
                {materialFrames[m.id] ? (
                  <div className="flex rounded-t-lg overflow-hidden h-10">
                    {materialFrames[m.id].slice(0, 4).map((frame, i) => (
                      <img key={i} src={frame} alt="" className="flex-1 object-cover h-full" draggable={false} />
                    ))}
                  </div>
                ) : (
                  <div className="h-10 rounded-t-lg bg-white/[0.03] flex items-center justify-center">
                    <span className="text-[10px] text-white/20">点击加载帧</span>
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="text-white/60 truncate text-[11px]">{m.title || m.filename}</p>
                  <p className="text-white/25 text-[10px]">{m.filesize ? `${(m.filesize/1024/1024).toFixed(1)}MB` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!showMaterials && (
          <button onClick={() => setShowMaterials(true)} className="absolute left-2 top-20 text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded bg-white/[0.05] z-10">素材库</button>
        )}

        {/* Video Preview with effect filter */}
        <div className="flex-shrink-0 bg-black/50 relative" style={{height: '40%'}}>
          {previewUrl ? (
            <video ref={videoRef} src={previewUrl}
              onLoadedMetadata={handleVideoLoaded} onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain" style={{ filter: effectFilter }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/30 text-sm">从素材库拖拽或点击视频开始</p>
            </div>
          )}
          {previewUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 flex items-center gap-3">
              <button onClick={togglePlay} className="text-white/80 hover:text-white">{isPlaying ? '⏸' : '▶'}</button>
              <span className="text-[11px] text-white/50 font-mono">{formatTime(currentTime)}/{formatTime(previewDuration)}</span>
              <input type="range" min="0" max={previewDuration||1} step="0.1" value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer" />
              {/* Effect selector inline */}
              <select value={previewEffect} onChange={(e) => setPreviewEffect(e.target.value)}
                className="bg-transparent text-[10px] text-white/40 border-none focus:outline-none">
                <option value="none">无特效</option><option value="bw">黑白</option>
                <option value="vintage">复古</option><option value="bright">提亮</option>
                <option value="contrast">对比</option><option value="blur">模糊</option>
              </select>
            </div>
          )}
        </div>

        {/* Clip Range */}
        {addingFrom && previewDuration > 0 && (
          <div className="flex-shrink-0 px-4 py-2 bg-white/[0.02] border-y border-white/[0.06] flex items-center gap-2">
            <span className="text-xs text-white/40">入:</span>
            <input type="range" min="0" max={previewDuration} step="0.1" value={clipStart}
              onChange={(e) => { setClipStart(parseFloat(e.target.value)); seekTo(parseFloat(e.target.value)); }}
              className="flex-1 h-1 bg-cyan-500/20 rounded-full appearance-none cursor-pointer" />
            <span className="text-[11px] text-white/50 font-mono w-12">{formatTime(clipStart)}</span>
            <span className="text-white/20">→</span>
            <span className="text-[11px] text-white/50 font-mono w-12">{formatTime(clipEnd)}</span>
            <input type="range" min="0" max={previewDuration} step="0.1" value={clipEnd}
              onChange={(e) => setClipEnd(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-purple-500/20 rounded-full appearance-none cursor-pointer" />
            <span className="text-xs text-white/30">{formatTime(clipEnd-clipStart)}</span>
            <button onClick={addClipToProject} disabled={clipEnd<=clipStart}
              className="text-[11px] text-white bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1 rounded-lg hover:bg-cyan-500/40 disabled:opacity-30">
              + 轨道
            </button>
          </div>
        )}

        {/* Tabs + Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 border-b border-white/[0.06] flex-shrink-0">
            {[{id:'timeline',label:'轨道'},{id:'text',label:'文字'},{id:'effects',label:'特效'},{id:'export',label:'导出'}].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[1px] transition-all ${
                  activeTab === tab.id ? 'text-white border-cyan-400/60' : 'text-white/40 border-transparent'
                }`}>{tab.label}</button>
            ))}
            <span className="ml-auto text-[10px] text-white/20">{projectClips.length}段 · {formatTime(totalDuration)}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3"
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(projectClips.length); }}
            onDragLeave={() => setDragOverIdx(-1)}
            onDrop={handleTrackDrop}
          >
            {activeTab === 'timeline' && (
              <div className="space-y-1.5">
                {projectClips.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/[0.08] rounded-xl">
                    <p className="text-white/30 text-sm">拖拽素材到这里</p>
                    <p className="text-white/15 text-xs mt-1">或在素材库中选择 → 设定范围 → 添加到轨道</p>
                  </div>
                ) : (
                  projectClips.map((clip, idx) => (
                    <div key={clip.id}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                    >
                      {dragOverIdx === idx && <div className="h-1 bg-cyan-400/40 rounded-full mb-1" />}
                      <div className={`rounded-xl border transition-all ${
                        activeClipIdx === idx ? 'border-cyan-500/40 bg-cyan-500/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}>
                        {/* Clip header with frame strip */}
                        <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer" onClick={() => previewClip(clip, idx)}>
                          <span className="text-[10px] text-cyan-400/50 font-mono w-4">{idx+1}</span>
                          {/* Mini frame strip */}
                          <div className="flex h-7 rounded overflow-hidden flex-1 min-w-0">
                            {(clipFrames[clip.id] || materialFrames[clip.taskId] || []).slice(0,6).map((f,i) => (
                              <img key={i} src={f} alt="" className="h-full flex-1 object-cover" draggable={false} />
                            ))}
                            {!(clipFrames[clip.id] || materialFrames[clip.taskId]) && (
                              <div className="flex-1 bg-white/[0.04] flex items-center justify-center">
                                <span className="text-[9px] text-white/20">{clip.title}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-white/30 font-mono shrink-0">{clip.start}→{clip.end}</span>
                          <select value={clip.speed} onClick={e=>e.stopPropagation()} onChange={(e) => updateClip(clip.id,'speed',parseFloat(e.target.value))}
                            className="bg-transparent text-[10px] text-white/40 border-none focus:outline-none w-10">
                            <option value="0.5">½</option><option value="1">1x</option><option value="1.5">1.5</option><option value="2">2x</option>
                          </select>
                          <button onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                            className="text-white/15 hover:text-red-400 text-xs px-1">×</button>
                        </div>

                        {/* Expanded edit */}
                        {activeClipIdx === idx && (
                          <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-white/30">入</span>
                            <input type="text" value={clip.start} onClick={e=>e.stopPropagation()}
                              onChange={(e) => updateClip(clip.id,'start',e.target.value)}
                              className="w-14 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] text-white/70 font-mono focus:outline-none" />
                            <span className="text-[10px] text-white/30">出</span>
                            <input type="text" value={clip.end} onClick={e=>e.stopPropagation()}
                              onChange={(e) => { updateClip(clip.id,'end',e.target.value); updateClip(clip.id,'duration',timeToSec(e.target.value)-timeToSec(clip.start)); }}
                              className="w-14 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] text-white/70 font-mono focus:outline-none" />
                            <button onClick={(e) => { e.stopPropagation(); if(videoRef.current) updateClip(clip.id,'start',formatTime(videoRef.current.currentTime)); }}
                              className="text-[9px] text-cyan-400/60 px-1.5 py-0.5 rounded border border-cyan-500/20 hover:bg-cyan-500/10">标记入点</button>
                            <button onClick={(e) => { e.stopPropagation(); if(videoRef.current) { updateClip(clip.id,'end',formatTime(videoRef.current.currentTime)); updateClip(clip.id,'duration',videoRef.current.currentTime-timeToSec(clip.start)); } }}
                              className="text-[9px] text-cyan-400/60 px-1.5 py-0.5 rounded border border-cyan-500/20 hover:bg-cyan-500/10">标记出点</button>
                            <div className="flex gap-1 ml-auto">
                              <button onClick={(e) => { e.stopPropagation(); idx>0 && moveClip(idx,idx-1); }} className="text-white/20 hover:text-white/50 text-[10px] px-1">↑</button>
                              <button onClick={(e) => { e.stopPropagation(); idx<projectClips.length-1 && moveClip(idx,idx+1); }} className="text-white/20 hover:text-white/50 text-[10px] px-1">↓</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {dragOverIdx === projectClips.length && projectClips.length > 0 && (
                  <div className="h-1 bg-cyan-400/40 rounded-full" />
                )}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-2">
                <button onClick={addText} className="text-xs text-cyan-400/70 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10">+ 文字</button>
                {texts.map(t => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex gap-2">
                      <input type="text" value={t.content} onChange={(e) => updateText(t.id,'content',e.target.value)}
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-1 text-sm text-white/70 focus:outline-none" />
                      <button onClick={() => removeText(t.id)} className="text-white/20 hover:text-red-400 text-xs">×</button>
                    </div>
                    <div className="flex gap-2 text-[10px] items-center">
                      <span className="text-white/30">@</span>
                      <input type="number" value={t.start} onChange={(e) => updateText(t.id,'start',+e.target.value||0)} className="w-10 bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 focus:outline-none" />
                      <span className="text-white/30">s 持续</span>
                      <input type="number" value={t.duration} onChange={(e) => updateText(t.id,'duration',+e.target.value||1)} className="w-10 bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 focus:outline-none" />
                      <span className="text-white/30">s</span>
                      <select value={t.position} onChange={(e) => updateText(t.id,'position',e.target.value)} className="bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 text-white/70 focus:outline-none text-[10px]">
                        <option value="top">顶部</option><option value="center">居中</option><option value="bottom">底部</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="grid grid-cols-3 gap-2">
                {[['none','无'],['bw','黑白'],['vintage','复古'],['bright','提亮'],['contrast','对比'],['blur','模糊']].map(([id,label]) => (
                  <button key={id} onClick={() => setPreviewEffect(id)}
                    className={`p-3 rounded-lg border text-xs transition-all ${previewEffect===id ? 'bg-cyan-500/10 border-cyan-500/30 text-white' : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05]'}`}>
                    {label}
                  </button>
                ))}
                <p className="col-span-3 text-[10px] text-white/20 mt-2">选择特效实时预览 · 导出时通过FFmpeg滤镜应用</p>
              </div>
            )}

            {activeTab === 'export' && projectClips.length > 0 && <MultiExport clips={projectClips} texts={texts} />}
            {activeTab === 'export' && projectClips.length === 0 && <p className="text-sm text-white/30 text-center py-8">请先添加片段到轨道</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiExport({ clips, texts }) {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('original');
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/editor/export-multi', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          clips: clips.map(c => ({ task_id: c.taskId, start: c.start, end: c.end, speed: c.speed })),
          output_format: format, resolution, quality,
          texts: texts.map(t => ({ content: t.content, start: t.start, duration: t.duration, position: t.position, size: t.size })),
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data); else setError(data.detail || '导出失败');
    } catch (e) { setError('网络错误'); }
    setExporting(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <select value={format} onChange={e=>setFormat(e.target.value)} className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 focus:outline-none">
          <option value="mp4">MP4</option><option value="webm">WebM</option><option value="mkv">MKV</option>
        </select>
        <select value={resolution} onChange={e=>setResolution(e.target.value)} className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 focus:outline-none">
          <option value="original">原始</option><option value="1080p">1080P</option><option value="720p">720P</option>
        </select>
        <select value={quality} onChange={e=>setQuality(e.target.value)} className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 focus:outline-none">
          <option value="high">高质量</option><option value="medium">均衡</option><option value="low">小体积</option>
        </select>
      </div>
      <button onClick={handleExport} disabled={exporting}
        className="w-full py-2.5 bg-white text-gray-900 text-sm font-medium rounded-xl hover:scale-[1.01] transition-all disabled:opacity-30">
        {exporting ? '导出中...' : `导出 (${clips.length}段)`}
      </button>
      {result && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
          <p className="text-sm text-emerald-300/80">✓ {result.message}</p>
          {result.output_filename && <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-lg">下载</a>}
        </div>
      )}
      {error && <p className="text-xs text-red-300/80 bg-red-500/[0.06] border border-red-500/20 rounded-lg p-2">{error}</p>}
    </div>
  );
}

function formatTime(s) { if(!s||isNaN(s)) return '00:00'; const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; }
function timeToSec(t) { if(!t) return 0; const p=t.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:parseFloat(t)||0; }

export default VideoEditor;
