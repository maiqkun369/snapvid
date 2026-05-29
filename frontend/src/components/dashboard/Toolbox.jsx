import React, { useState, useEffect, useRef } from 'react';

function Toolbox() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  // Tool configs
  const [convertFormat, setConvertFormat] = useState('mp4');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('192');
  const [compressQuality, setCompressQuality] = useState('medium');
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [wmText, setWmText] = useState('');
  const [wmPosition, setWmPosition] = useState('bottomright');
  const [subtitleLang, setSubtitleLang] = useState('auto');
  const [subtitleFormat, setSubtitleFormat] = useState('srt');
  const [separateMode, setSeparateMode] = useState('vocals');

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=50`)
      .then(r => r.json()).then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
      }).catch(() => {});
  }, []);

  const selectFile = (task) => {
    setSelectedTask(task.id);
    setSelectedTaskInfo(task);
    setResult(null);
    setError('');
  };

  const execute = async (toolId, params = '') => {
    if (!selectedTask) { setError('请先选择文件'); return; }
    setProcessing(true);
    setResult(null);
    setError('');

    const baseParams = `task_id=${selectedTask}`;
    let url = '';

    switch (toolId) {
      case 'convert': url = `/api/tools/convert?${baseParams}&target_format=${convertFormat}`; break;
      case 'audio': url = `/api/tools/audio-extract?${baseParams}&audio_format=${audioFormat}&quality=${audioQuality}`; break;
      case 'compress': url = `/api/tools/compress?${baseParams}&quality=${compressQuality}`; break;
      case 'gif': url = `/api/tools/gif?${baseParams}&start=${gifStart}&duration=${gifDuration}&fps=15&width=480`; break;
      case 'thumbnail': url = `/api/tools/thumbnail?${baseParams}&time_pos=00:00:01`; break;
      case 'watermark': url = `/api/tools/watermark?${baseParams}&text=${encodeURIComponent(wmText||'SnapVid')}&position=${wmPosition}`; break;
      case 'denoise': url = `/api/tools/denoise?${baseParams}`; break;
      case 'subtitle': url = `/api/tools/subtitle?${baseParams}&language=${subtitleLang}&format=${subtitleFormat}`; break;
      case 'separate': url = `/api/tools/audio-separate?${baseParams}&mode=${separateMode}`; break;
      case 'summary': url = `/api/tools/summary?${baseParams}`; break;
      case 'removebg': url = `/api/tools/remove-bg?${baseParams}&mode=video`; break;
      default: setError('功能开发中'); setProcessing(false); return;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        // Refresh file list if new file was registered
        if (data.registered_task_id) {
          const token = localStorage.getItem('snapvid_token') || '';
          fetch(`/api/downloads?token=${token}&limit=50`)
            .then(r => r.json()).then(d => setTasks(d.filter(t => t.status === 'completed' && t.filename)))
            .catch(() => {});
        }
      } else {
        setError(data.detail || '处理失败');
      }
    } catch (e) { setError('网络错误'); }
    setProcessing(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024*1024) return `${(bytes/1024/1024).toFixed(1)}MB`;
    return `${(bytes/1024).toFixed(0)}KB`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 pb-5">
        <h2 className="text-xl font-semibold text-white/90">工具箱</h2>
        <p className="text-sm text-white/40 mt-1">选择已下载的文件，一键处理</p>
      </div>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* Left: File List — Glass Card */}
        <div className="w-64 shrink-0 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <p className="text-sm text-white/50 font-medium">我的文件</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-white/20 p-4">暂无已下载文件</p>
            ) : tasks.map(task => (
              <div
                key={task.id}
                onClick={() => selectFile(task)}
                className={`px-4 py-3.5 cursor-pointer border-b border-white/[0.04] transition-all duration-200 ${
                  selectedTask === task.id
                    ? 'bg-violet-500/[0.08] border-l-2 border-l-violet-400'
                    : 'hover:bg-white/[0.04] hover:-translate-y-[0.5px]'
                }`}
              >
                <p className="text-sm text-white/70 truncate">{task.title || task.filename}</p>
                <p className="text-xs text-white/30 mt-0.5">{formatSize(task.filesize)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tools + Result */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-5">
          {!selectedTask ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-base text-white/20">← 选择一个文件开始操作</p>
            </div>
          ) : (
            <>
              {/* Video Preview — Glass Card */}
              <div className="glass rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={`/api/editor/stream/${selectedTask}`}
                  controls
                  preload="metadata"
                  className="w-full max-h-[240px] object-contain bg-black/50 rounded-t-2xl"
                />
                <div className="px-5 py-3.5 flex items-center gap-3 border-t border-white/[0.06]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/80 truncate font-medium">{selectedTaskInfo?.title || ''}</p>
                    <p className="text-xs text-white/35 mt-0.5">{formatSize(selectedTaskInfo?.filesize)}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid — Glass buttons */}
              <div className="space-y-3">
                <p className="text-sm text-white/40 font-medium">快捷操作</p>
                <div className="grid grid-cols-4 gap-3">
                  <QuickAction icon="🔄" label="转MP4" onClick={() => { setConvertFormat('mp4'); execute('convert'); }} disabled={processing} />
                  <QuickAction icon="🎵" label="提取音频" onClick={() => execute('audio')} disabled={processing} />
                  <QuickAction icon="🖼️" label="截封面" onClick={() => execute('thumbnail')} disabled={processing} />
                  <QuickAction icon="📦" label="压缩" onClick={() => execute('compress')} disabled={processing} pro />
                  <QuickAction icon="🎞️" label="转GIF" onClick={() => execute('gif')} disabled={processing} />
                  <QuickAction icon="📋" label="视频信息" onClick={() => execute('summary')} disabled={processing} />
                  <QuickAction icon="📝" label="AI字幕" onClick={() => execute('subtitle')} disabled={processing} pro />
                  <QuickAction icon="🎤" label="人声分离" onClick={() => execute('separate')} disabled={processing} pro />
                </div>
              </div>

              {/* Advanced Tools (collapsible) — Glass Panel */}
              <details className="group">
                <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors list-none flex items-center gap-1.5 py-1">
                  <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  更多工具和配置
                </summary>
                <div className="mt-3 glass rounded-2xl p-5 space-y-4">
                  {/* Format convert with options */}
                  <ToolRow label="格式转换" onExecute={() => execute('convert')} disabled={processing}>
                    <select value={convertFormat} onChange={e => setConvertFormat(e.target.value)} className="tool-select">
                      <option value="mp4">MP4</option><option value="mkv">MKV</option>
                      <option value="webm">WebM</option><option value="mov">MOV</option>
                    </select>
                  </ToolRow>

                  {/* Audio extract with options */}
                  <ToolRow label="音频提取" onExecute={() => execute('audio')} disabled={processing}>
                    <select value={audioFormat} onChange={e => setAudioFormat(e.target.value)} className="tool-select">
                      <option value="mp3">MP3</option><option value="m4a">M4A</option>
                      <option value="flac">FLAC</option><option value="wav">WAV</option>
                    </select>
                    <select value={audioQuality} onChange={e => setAudioQuality(e.target.value)} className="tool-select">
                      <option value="320">320kbps</option><option value="192">192kbps</option><option value="128">128kbps</option>
                    </select>
                  </ToolRow>

                  {/* GIF with time options */}
                  <ToolRow label="视频转GIF" onExecute={() => execute('gif')} disabled={processing}>
                    <input type="text" value={gifStart} onChange={e => setGifStart(e.target.value)}
                      placeholder="起始 00:00:00" className="tool-input w-24" />
                    <input type="text" value={gifDuration} onChange={e => setGifDuration(e.target.value)}
                      placeholder="时长(秒)" className="tool-input w-16" />
                  </ToolRow>

                  {/* Compress */}
                  <ToolRow label="视频压缩" onExecute={() => execute('compress')} disabled={processing} pro>
                    <select value={compressQuality} onChange={e => setCompressQuality(e.target.value)} className="tool-select">
                      <option value="high">轻度(画质优先)</option>
                      <option value="medium">中度(均衡)</option>
                      <option value="low">重度(体积优先)</option>
                    </select>
                  </ToolRow>

                  {/* Watermark */}
                  <ToolRow label="添加水印" onExecute={() => execute('watermark')} disabled={processing} pro>
                    <input type="text" value={wmText} onChange={e => setWmText(e.target.value)}
                      placeholder="水印文字" className="tool-input w-24" />
                    <select value={wmPosition} onChange={e => setWmPosition(e.target.value)} className="tool-select">
                      <option value="bottomright">右下</option><option value="topleft">左上</option>
                      <option value="center">居中</option>
                    </select>
                  </ToolRow>

                  {/* Denoise */}
                  <ToolRow label="音频降噪" onExecute={() => execute('denoise')} disabled={processing} pro />

                  {/* AI Subtitle */}
                  <ToolRow label="AI字幕" onExecute={() => execute('subtitle')} disabled={processing} pro>
                    <select value={subtitleLang} onChange={e => setSubtitleLang(e.target.value)} className="tool-select">
                      <option value="auto">自动</option><option value="zh">中文</option>
                      <option value="en">英文</option><option value="ja">日文</option>
                    </select>
                    <select value={subtitleFormat} onChange={e => setSubtitleFormat(e.target.value)} className="tool-select">
                      <option value="srt">SRT</option><option value="vtt">VTT</option>
                    </select>
                  </ToolRow>

                  {/* Audio Separate */}
                  <ToolRow label="人声分离" onExecute={() => execute('separate')} disabled={processing} pro>
                    <select value={separateMode} onChange={e => setSeparateMode(e.target.value)} className="tool-select">
                      <option value="vocals">提取人声</option><option value="music">提取BGM</option>
                    </select>
                  </ToolRow>

                  {/* Remove BG */}
                  <ToolRow label="AI去背景" onExecute={() => execute('removebg')} disabled={processing} pro>
                    <span className="text-xs text-white/20">≤30秒片段</span>
                  </ToolRow>
                </div>
              </details>

              {/* Processing indicator */}
              {processing && (
                <div className="flex items-center gap-3 px-5 py-4 glass rounded-2xl border-violet-500/20">
                  <div className="w-4 h-4 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                  <span className="text-sm text-violet-300/70">处理中...</span>
                </div>
              )}

              {/* Result — Glass with gradient success */}
              {result && (
                <div className="p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/[0.15] backdrop-blur-xl space-y-4">
                  <p className="text-sm text-emerald-300/90 font-medium flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">✓</span>
                    {result.message}
                  </p>
                  {result.registered_task_id && (
                    <p className="text-xs text-cyan-400/60">已加入文件列表，可继续用其他工具处理</p>
                  )}
                  {/* Image preview */}
                  {result.output_filename && result.output_filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) && (
                    <img src={`/api/tools/preview/${encodeURIComponent(result.output_filename)}`} alt=""
                      className="rounded-xl max-h-[200px] object-contain" />
                  )}
                  {/* Summary grid */}
                  {result.summary && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.summary).map(([k, v]) => (
                        <div key={k} className="flex justify-between px-3 py-2.5 bg-white/[0.03] rounded-xl text-xs border border-white/[0.04]">
                          <span className="text-white/30">{k}</span>
                          <span className="text-white/60">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* File info + download */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-white/30">
                      {result.output_filename && formatSize(result.output_size)}
                    </span>
                    {result.output_filename && (
                      <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download
                        className="btn-secondary text-xs px-4 py-2">
                        下载文件
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-5 py-4 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.12] backdrop-blur-xl">
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Quick action button component — Glass style
function QuickAction({ icon, label, onClick, disabled, pro }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl
        bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl
        hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-[1px]
        transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
        active:scale-[0.97]">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-white/60">{label}</span>
      {pro && <span className="text-[10px] text-violet-300/60 -mt-0.5">PRO</span>}
    </button>
  );
}

// Tool row with inline config + execute button
function ToolRow({ label, children, onExecute, disabled, pro }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-sm text-white/60 w-20 shrink-0">{label}</span>
      {pro && <span className="text-[10px] text-violet-300/50 bg-violet-500/10 px-1.5 py-0.5 rounded-md border border-violet-500/10">PRO</span>}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
      </div>
      <button onClick={onExecute} disabled={disabled}
        className="text-xs text-white/70 bg-white/[0.06] border border-white/[0.08] px-3.5 py-2 rounded-xl
          hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-30 shrink-0
          active:scale-[0.97]">
        执行
      </button>
    </div>
  );
}

export default Toolbox;
