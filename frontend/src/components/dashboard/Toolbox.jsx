import React, { useState, useEffect } from 'react';

function Toolbox() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Fetch completed tasks for file selection
  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=20`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
        if (completed.length > 0 && !selectedTask) setSelectedTask(completed[0].id);
      })
      .catch(() => {});
  }, []);

  const tools = [
    { id: 'convert', name: '格式转换', desc: '视频/音频无损转换格式', icon: '🔄', pro: false },
    { id: 'audio_extract', name: '音频提取', desc: '从视频中提取纯音频', icon: '🎵', pro: false },
    { id: 'thumbnail', name: '封面提取', desc: '截取视频画面为图片', icon: '🖼️', pro: false },
    { id: 'compress', name: '视频压缩', desc: '减小体积，保持画质', icon: '📦', pro: true },
    { id: 'subtitle', name: 'AI 字幕生成', desc: '语音识别自动生成字幕', icon: '📝', pro: true },
    { id: 'super_res', name: 'AI 超分增强', desc: '提升分辨率至 2K/4K', icon: '✨', pro: true },
    { id: 'watermark', name: 'AI 去水印', desc: '智能移除视频水印', icon: '🎨', pro: true },
    { id: 'merge', name: '视频拼接', desc: '多个视频合并为一个', icon: '🔗', pro: true },
  ];

  // Tool-specific options
  const [convertFormat, setConvertFormat] = useState('mp4');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('192');
  const [thumbTime, setThumbTime] = useState('00:00:01');
  const [compressQuality, setCompressQuality] = useState('medium');

  const handleExecute = async () => {
    if (!selectedTask || !activeTool) return;
    setProcessing(true);
    setResult(null);
    setError('');

    const token = localStorage.getItem('snapvid_token') || '';
    let url = '';
    let params = `task_id=${selectedTask}`;

    switch (activeTool) {
      case 'convert':
        url = `/api/tools/convert?${params}&target_format=${convertFormat}`;
        break;
      case 'audio_extract':
        url = `/api/tools/audio-extract?${params}&audio_format=${audioFormat}&quality=${audioQuality}`;
        break;
      case 'thumbnail':
        url = `/api/tools/thumbnail?${params}&time_pos=${thumbTime}`;
        break;
      case 'compress':
        url = `/api/tools/compress?${params}&quality=${compressQuality}`;
        break;
      case 'subtitle':
        url = `/api/ai/subtitle?${params}&language=auto&format=srt`;
        break;
      case 'super_res':
        url = `/api/ai/super-resolution?${params}&scale=2x`;
        break;
      case 'watermark':
        url = `/api/ai/watermark-removal?${params}`;
        break;
      default:
        setError('功能开发中');
        setProcessing(false);
        return;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.detail || '处理失败');
      }
    } catch (e) {
      setError('网络错误');
    }
    setProcessing(false);
  };

  const handleDownloadResult = () => {
    if (result?.output_filename) {
      // Find parent task to get download URL
      window.open(`/api/downloads/${selectedTask}/file`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white/80 mb-2">工具箱</h2>
        <p className="text-sm text-white/30">选择已下载的视频，使用工具进行加工处理</p>
      </div>

      {/* File Selection */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <label className="block text-xs text-white/40 mb-2">选择源文件</label>
        {tasks.length === 0 ? (
          <p className="text-sm text-white/30">暂无已完成的下载，请先下载视频</p>
        ) : (
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-cyan-500/30"
          >
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title || t.filename} ({t.filesize ? `${(t.filesize / 1024 / 1024).toFixed(1)}MB` : '--'})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); setResult(null); setError(''); }}
            disabled={tasks.length === 0}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200
              ${activeTool === tool.id
                ? 'bg-cyan-500/[0.08] border-cyan-500/30 scale-[1.02]'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              } disabled:opacity-30`}
          >
            <span className="text-2xl">{tool.icon}</span>
            <div>
              <span className="text-xs text-white/70 font-medium">{tool.name}</span>
              {tool.pro && <span className="text-[9px] ml-1 px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded">PRO</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Tool Options Panel */}
      {activeTool && tasks.length > 0 && (
        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
          <p className="text-sm text-white/60 font-medium">
            {tools.find(t => t.id === activeTool)?.icon} {tools.find(t => t.id === activeTool)?.name}
          </p>

          {/* Convert options */}
          {activeTool === 'convert' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-16">目标格式</span>
              <select value={convertFormat} onChange={(e) => setConvertFormat(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
                <option value="mov">MOV</option>
                <option value="avi">AVI</option>
              </select>
            </div>
          )}

          {/* Audio extract options */}
          {activeTool === 'audio_extract' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16">格式</span>
                <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A (AAC)</option>
                  <option value="flac">FLAC (无损)</option>
                  <option value="wav">WAV</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16">质量</span>
                <select value={audioQuality} onChange={(e) => setAudioQuality(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                  <option value="128">128 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="320">320 kbps (最高)</option>
                </select>
              </div>
            </div>
          )}

          {/* Thumbnail options */}
          {activeTool === 'thumbnail' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-16">截取时间</span>
              <input type="text" value={thumbTime} onChange={(e) => setThumbTime(e.target.value)}
                placeholder="00:00:01"
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1" />
            </div>
          )}

          {/* Compress options */}
          {activeTool === 'compress' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-16">压缩度</span>
              <select value={compressQuality} onChange={(e) => setCompressQuality(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none flex-1">
                <option value="high">轻度压缩 (画质优先)</option>
                <option value="medium">中度压缩 (均衡)</option>
                <option value="low">重度压缩 (体积优先)</option>
              </select>
            </div>
          )}

          {/* AI tools notice */}
          {(activeTool === 'subtitle' || activeTool === 'super_res' || activeTool === 'watermark') && (
            <p className="text-xs text-white/30">AI 工具将自动处理选中的视频文件</p>
          )}

          {activeTool === 'merge' && (
            <p className="text-xs text-white/30">视频拼接功能：请在下载历史中选择多个视频后使用</p>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={processing || !selectedTask || activeTool === 'merge'}
            className="w-full py-3 bg-white text-gray-900 font-medium rounded-xl transition-all
              hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {processing ? '处理中...' : '开始处理'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-2">
          <p className="text-sm text-emerald-300/80">✓ {result.message}</p>
          {result.output_filename && (
            <p className="text-xs text-white/40">输出文件: {result.output_filename}</p>
          )}
          {result.output_size && (
            <p className="text-xs text-white/40">文件大小: {(result.output_size / 1024 / 1024).toFixed(1)} MB</p>
          )}
          {result.compression_ratio && (
            <p className="text-xs text-white/40">体积减小: {result.compression_ratio}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20">
          <p className="text-sm text-red-300/80">{error}</p>
        </div>
      )}
    </div>
  );
}

export default Toolbox;
