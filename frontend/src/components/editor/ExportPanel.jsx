import React, { useState } from 'react';

function ExportPanel({ taskId, clips }) {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('original');
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!taskId || clips.length === 0) return;
    setExporting(true);
    setResult(null);
    setError('');

    const editPlan = {
      clips: clips.map(c => ({
        start: c.start,
        end: c.end,
        speed: c.speed || 1.0,
      })),
      output_format: format,
      resolution,
      quality,
      texts: [],
    };

    try {
      const res = await fetch(`/api/editor/export?task_id=${taskId}&edit_plan=${encodeURIComponent(JSON.stringify(editPlan))}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.detail || '导出失败');
      }
    } catch (e) {
      setError('网络错误');
    }
    setExporting(false);
  };

  return (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
      <p className="text-sm text-white/60 font-medium">导出设置</p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">格式</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
            <option value="mkv">MKV</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">分辨率</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="original">原始</option>
            <option value="1080p">1080P</option>
            <option value="720p">720P</option>
            <option value="480p">480P</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">质量</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none">
            <option value="high">高质量</option>
            <option value="medium">均衡</option>
            <option value="low">小体积</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting || clips.length === 0}
        className="w-full py-3 bg-white text-gray-900 font-medium rounded-xl transition-all
          hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] disabled:opacity-30"
      >
        {exporting ? '导出中...' : `导出视频 (${clips.length} 段)`}
      </button>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-3">
          <p className="text-sm text-emerald-300/80">✓ {result.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {result.output_size ? `${(result.output_size / 1024 / 1024).toFixed(1)} MB` : ''}
            </span>
            {result.output_filename && (
              <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-xl
                  hover:scale-[1.02] transition-all">
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
    </div>
  );
}

export default ExportPanel;
