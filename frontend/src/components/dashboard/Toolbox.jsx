import React, { useState, useEffect, useRef } from 'react';

function Toolbox() {
  const [activeView, setActiveView] = useState('media'); // 'media' or 'ai'
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Video preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);

  // Tool options
  const [convertFormat, setConvertFormat] = useState('mp4');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('192');
  const [thumbTime, setThumbTime] = useState('00:00:01');
  const [compressQuality, setCompressQuality] = useState('medium');
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [wmText, setWmText] = useState('');
  const [wmPosition, setWmPosition] = useState('bottomright');
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  // New tool options
  const [subtitleLang, setSubtitleLang] = useState('auto');
  const [subtitleFormat, setSubtitleFormat] = useState('srt');
  const [separateMode, setSeparateMode] = useState('vocals');
  const [m3u8Url, setM3u8Url] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=50`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
        if (completed.length > 0 && !selectedTask) setSelectedTask(completed[0].id);
      });
  }, []);

  // When task changes, reset preview
  useEffect(() => {
    setShowPreview(false);
    setClipStart(0);
    setClipEnd(0);
  }, [selectedTask]);

  const tools = [
    { id: 'clip', name: '片段截取', desc: '精确截取视频片段', icon: '✂️', pro: false, needsPreview: true },
    { id: 'convert', name: '格式转换', desc: '无损转换格式', icon: '🔄', pro: false },
    { id: 'audio_extract', name: '音频提取', desc: '提取纯音频', icon: '🎵', pro: false },
    { id: 'thumbnail', name: '封面截图', desc: '截取任意帧', icon: '🖼️', pro: false, needsPreview: true },
    { id: 'gif', name: '视频转GIF', desc: '截取片段做动图', icon: '🎞️', pro: false, needsPreview: true },
    { id: 'summary', name: '视频信息', desc: '查看媒体详情', icon: '📋', pro: false },
    { id: 'compress', name: '视频压缩', desc: '减小体积', icon: '📦', pro: true },
    { id: 'watermark_add', name: '添加水印', desc: '自定义文字', icon: '💧', pro: true },
    { id: 'denoise', name: '音频降噪', desc: '去除噪音', icon: '🔇', pro: true },
    { id: 'subtitle', name: 'AI 字幕', desc: '语音识别生成字幕', icon: '📝', pro: true },
    { id: 'audio_separate', name: '人声分离', desc: '分离人声/BGM', icon: '🎤', pro: true },
    { id: 'remove_bg', name: 'AI 去背景', desc: '移除视频背景', icon: '🪄', pro: true },
    { id: 'm3u8', name: 'm3u8下载', desc: 'HLS加密流下载', icon: '📡', pro: true },
    { id: 'super_res', name: 'AI 超分', desc: '画质提升', icon: '✨', pro: true },
    { id: 'watermark', name: 'AI 去水印', desc: '移除水印', icon: '🎨', pro: true },
  ];

  const selectTool = (tool) => {
    setActiveTool(tool.id);
    setResult(null);
    setError('');
    if (tool.needsPreview) setShowPreview(true);
    else setShowPreview(false);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setPreviewDuration(videoRef.current.duration);
      setClipEnd(videoRef.current.duration);
    }
  };

  const seekTo = (t) => { if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); } };

  const handleExecute = async () => {
    if (!selectedTask || !activeTool) return;
    setProcessing(true); setResult(null); setError('');
    const token = localStorage.getItem('snapvid_token') || '';
    let url = '';
    const params = `task_id=${selectedTask}`;

    switch (activeTool) {
      case 'clip':
        url = `/api/tools/convert?${params}&target_format=mp4`;
        // Use editor export for precise clip
        try {
          const res = await fetch(`/api/editor/export?${params}&edit_plan=${encodeURIComponent(JSON.stringify({
            clips: [{ start: formatTime(clipStart), end: formatTime(clipEnd), speed: 1.0 }],
            output_format: 'mp4', resolution: 'original', quality: 'high', texts: []
          }))}`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) setResult(data); else setError(data.detail || '截取失败');
        } catch (e) { setError('网络错误'); }
        setProcessing(false);
        return;
      case 'convert': url = `/api/tools/convert?${params}&target_format=${convertFormat}`; break;
      case 'audio_extract': url = `/api/tools/audio-extract?${params}&audio_format=${audioFormat}&quality=${audioQuality}`; break;
      case 'thumbnail': url = `/api/tools/thumbnail?${params}&time_pos=${thumbTime}`; break;
      case 'gif': url = `/api/tools/gif?${params}&start=${gifStart}&duration=${gifDuration}&fps=15&width=480`; break;
      case 'compress': url = `/api/tools/compress?${params}&quality=${compressQuality}`; break;
      case 'watermark_add': url = `/api/tools/watermark?${params}&text=${encodeURIComponent(wmText||'SnapVid')}&position=${wmPosition}`; break;
      case 'denoise': url = `/api/tools/denoise?${params}`; break;
      case 'summary': url = `/api/tools/summary?${params}`; break;
      case 'subtitle': url = `/api/tools/subtitle?${params}&language=${subtitleLang}&format=${subtitleFormat}`; break;
      case 'audio_separate': url = `/api/tools/audio-separate?${params}&mode=${separateMode}`; break;
      case 'remove_bg': url = `/api/tools/remove-bg?${params}&mode=video`; break;
      case 'm3u8':
        if (!m3u8Url) { setError('请输入 m3u8 链接'); setProcessing(false); return; }
        url = `/api/tools/m3u8?url=${encodeURIComponent(m3u8Url)}`;
        break;
      case 'super_res': url = `/api/ai/super-resolution?${params}&scale=2x`; break;
      case 'watermark': url = `/api/ai/watermark-removal?${params}`; break;
      default: setError('功能开发中'); setProcessing(false); return;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        // Refresh file list if output was registered
        if (data.registered_task_id) {
          const token = localStorage.getItem('snapvid_token') || '';
          fetch(`/api/downloads?token=${token}&limit=50`).then(r => r.json()).then(setTasks).catch(() => {});
        }
      } else {
        setError(data.detail || '处理失败');
      }
    } catch (e) { setError('网络错误'); }
    setProcessing(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white/80 mb-1">工具箱</h2>
          <p className="text-sm text-white/30">{activeView === 'ai' ? 'AI 智能工具' : '媒体处理工作台'}</p>
        </div>
        {/* Tab switcher */}
        <div className="flex bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => setActiveView('media')}
            className={`px-3 py-1.5 rounded-md text-xs transition-all ${activeView === 'media' ? 'bg-white text-gray-900 font-medium' : 'text-white/50 hover:text-white/70'}`}
          >
            媒体处理
          </button>
          <button
            onClick={() => setActiveView('ai')}
            className={`px-3 py-1.5 rounded-md text-xs transition-all ${activeView === 'ai' ? 'bg-white text-gray-900 font-medium' : 'text-white/50 hover:text-white/70'}`}
          >
            AI 工具
          </button>
        </div>
      </div>

      {/* Media Processing View - embedded ffmpeg-web */}
      {activeView === 'media' && (
        <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/20" style={{ height: 'calc(100vh - 180px)' }}>
          <iframe
            src="/tools/"
            className="w-full h-full border-0"
            title="媒体处理工作台"
            allow="cross-origin-isolated"
          />
        </div>
      )}

      {/* AI Tools View - our backend tools */}
      {activeView === 'ai' && (
        <>

      {/* Step 1: File Selection */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <label className="block text-xs text-white/40 mb-1.5">① 选择源文件</label>
        {tasks.length === 0 ? (
          <p className="text-sm text-white/30">暂无已完成的下载</p>
        ) : (
          <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-cyan-500/30">
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title || t.filename} ({t.filesize ? `${(t.filesize/1024/1024).toFixed(1)}MB` : ''})</option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2: Tool Selection */}
      <div>
        <label className="block text-xs text-white/40 mb-2">② 选择工具</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {tools.map(tool => (
            <button key={tool.id} onClick={() => selectTool(tool)} disabled={tasks.length === 0}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                activeTool === tool.id ? 'bg-cyan-500/[0.1] border-cyan-500/30 scale-[1.02]' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
              } disabled:opacity-30`}>
              <span className="text-lg">{tool.icon}</span>
              <span className="text-[10px] text-white/60">{tool.name}</span>
              {tool.pro && <span className="text-[8px] px-1 py-0 bg-purple-500/20 text-purple-300 rounded">PRO</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Video Preview (for clip/gif/thumbnail tools) */}
      {showPreview && selectedTask && (
        <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/40">
          <video ref={videoRef} src={`/api/editor/stream/${selectedTask}`}
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            controls className="w-full max-h-[250px] object-contain" />

          {/* Clip range sliders */}
          {(activeTool === 'clip' || activeTool === 'gif') && previewDuration > 0 && (
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/40 w-6">入</span>
                <input type="range" min="0" max={previewDuration} step="0.1" value={clipStart}
                  onChange={(e) => { setClipStart(parseFloat(e.target.value)); seekTo(parseFloat(e.target.value)); }}
                  className="flex-1 h-1.5 bg-cyan-500/20 rounded-full appearance-none cursor-pointer" />
                <span className="text-white/50 font-mono w-12 text-right">{formatTime(clipStart)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/40 w-6">出</span>
                <input type="range" min="0" max={previewDuration} step="0.1" value={clipEnd}
                  onChange={(e) => { setClipEnd(parseFloat(e.target.value)); }}
                  className="flex-1 h-1.5 bg-purple-500/20 rounded-full appearance-none cursor-pointer" />
                <span className="text-white/50 font-mono w-12 text-right">{formatTime(clipEnd)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/25">截取时长: {formatTime(Math.max(0, clipEnd - clipStart))}</span>
                <button onClick={() => { if(videoRef.current) { setClipStart(videoRef.current.currentTime); } }}
                  className="text-[10px] text-cyan-400/60 px-2 py-0.5 rounded border border-cyan-500/20 hover:bg-cyan-500/10">
                  当前为入点
                </button>
              </div>
            </div>
          )}

          {/* Thumbnail time picker */}
          {activeTool === 'thumbnail' && previewDuration > 0 && (
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/40">截图时间点</span>
                <input type="range" min="0" max={previewDuration} step="0.1" value={currentTime}
                  onChange={(e) => { seekTo(parseFloat(e.target.value)); setThumbTime(formatTime(parseFloat(e.target.value))); }}
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" />
                <span className="text-white/50 font-mono">{formatTime(currentTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Tool Options (non-preview tools) */}
      {activeTool && !showPreview && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
          <p className="text-xs text-white/40">③ 配置参数</p>

          {activeTool === 'convert' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">目标格式</span>
              <select value={convertFormat} onChange={(e) => setConvertFormat(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                <option value="mp4">MP4</option><option value="mkv">MKV</option><option value="webm">WebM</option><option value="mov">MOV</option>
              </select>
            </div>
          )}

          {activeTool === 'audio_extract' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-12">格式</span>
                <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="mp3">MP3</option><option value="m4a">M4A</option><option value="flac">FLAC</option><option value="wav">WAV</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-12">码率</span>
                <select value={audioQuality} onChange={(e) => setAudioQuality(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="128">128k</option><option value="192">192k</option><option value="256">256k</option><option value="320">320k</option>
                </select>
              </div>
            </div>
          )}

          {activeTool === 'compress' && (
            <select value={compressQuality} onChange={(e) => setCompressQuality(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
              <option value="high">轻度 (画质优先)</option><option value="medium">中度 (均衡)</option><option value="low">重度 (体积优先)</option>
            </select>
          )}

          {activeTool === 'watermark_add' && (
            <div className="space-y-2">
              <input type="text" value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="水印文字"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none" />
              <select value={wmPosition} onChange={(e) => setWmPosition(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
                <option value="bottomright">右下</option><option value="bottomleft">左下</option><option value="topright">右上</option><option value="center">居中</option>
              </select>
            </div>
          )}

          {(activeTool === 'denoise') && (
            <p className="text-xs text-white/30">自动分析并去除背景噪音，保留人声</p>
          )}
          {activeTool === 'summary' && (
            <p className="text-xs text-white/30">自动提取视频编码/分辨率/帧率/码率等信息</p>
          )}

          {/* AI Subtitle options */}
          {activeTool === 'subtitle' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16">语言</span>
                <select value={subtitleLang} onChange={(e) => setSubtitleLang(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="auto">自动识别</option>
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="ja">日文</option>
                  <option value="ko">韩文</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16">格式</span>
                <select value={subtitleFormat} onChange={(e) => setSubtitleFormat(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="srt">SRT (通用)</option>
                  <option value="vtt">WebVTT (网页)</option>
                  <option value="json">JSON (开发)</option>
                </select>
              </div>
              <p className="text-[10px] text-purple-300/50">由 AI 语音识别引擎驱动，首次使用需等待模型加载</p>
            </div>
          )}

          {/* Audio Separation options */}
          {activeTool === 'audio_separate' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-16">分离</span>
              <select value={separateMode} onChange={(e) => setSeparateMode(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                <option value="vocals">提取人声 (去BGM)</option>
                <option value="music">提取BGM (去人声)</option>
              </select>
            </div>
          )}

          {/* Remove BG info */}
          {activeTool === 'remove_bg' && (
            <p className="text-xs text-white/30">AI 自动移除视频背景 (仅支持 ≤30秒 短片段)</p>
          )}

          {/* m3u8 URL input */}
          {activeTool === 'm3u8' && (
            <div className="space-y-2">
              <input type="text" value={m3u8Url} onChange={(e) => setM3u8Url(e.target.value)}
                placeholder="粘贴 .m3u8 链接"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none" />
              <p className="text-[10px] text-white/20">支持加密 HLS 流，下载后自动合并为 MP4</p>
            </div>
          )}
        </div>
      )}

      {/* Execute Button */}
      {activeTool && (
        <button onClick={handleExecute} disabled={processing || !selectedTask}
          className="w-full py-3 bg-white text-gray-900 font-medium rounded-xl hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-30">
          {processing ? '处理中...' : '开始处理'}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-3">
          <p className="text-sm text-emerald-300/80">✓ {result.message}</p>
          {result.registered_task_id && (
            <p className="text-xs text-cyan-400/60">已自动加入文件列表，可在其他工具中继续使用</p>
          )}
          {result.output_filename && result.output_filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) && (
            <img src={`/api/tools/preview/${encodeURIComponent(result.output_filename)}`} alt="" className="rounded-lg max-h-[200px] object-contain" />
          )}
          {result.summary && (
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(result.summary).map(([k,v]) => (
                <div key={k} className="flex justify-between px-2 py-1.5 bg-white/[0.03] rounded text-xs">
                  <span className="text-white/40">{k}</span><span className="text-white/70">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            {result.output_size > 0 && <span className="text-xs text-white/30">{(result.output_size/1024/1024).toFixed(1)} MB</span>}
            {result.compression_ratio && <span className="text-xs text-white/30">压缩 {result.compression_ratio}</span>}
            {result.output_filename && (
              <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download
                className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-xl hover:scale-[1.02] transition-all">
                下载文件
              </a>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20">
          <p className="text-sm text-red-300/80">{error}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function formatTime(s) { if(!s||isNaN(s)) return '00:00'; const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; }

export default Toolbox;
