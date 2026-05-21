import React, { useState } from 'react';

function AITools({ taskId }) {
  const [loading, setLoading] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const tools = [
    {
      id: 'subtitle',
      name: 'AI 字幕生成',
      icon: '💬',
      desc: '自动识别语音，生成字幕文件',
      action: 'subtitle',
    },
    {
      id: 'super_resolution',
      name: 'AI 超分增强',
      icon: '✨',
      desc: '提升视频至 2K/4K 画质',
      action: 'super-resolution',
    },
    {
      id: 'watermark_removal',
      name: 'AI 去水印',
      icon: '🧹',
      desc: '智能移除视频水印',
      action: 'watermark-removal',
    },
  ];

  const handleProcess = async (action) => {
    setLoading(action);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/ai/${action}?task_id=${taskId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '处理失败');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };

  if (!taskId) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/30 tracking-widest uppercase">AI Tools</p>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-400/10 text-purple-300">PRO</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleProcess(tool.action)}
            disabled={!!loading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl
              bg-white/[0.03] border border-white/[0.06]
              hover:bg-white/[0.06] hover:border-white/[0.12]
              transition-all duration-200 disabled:opacity-40"
          >
            <span className="text-xl">{tool.icon}</span>
            <span className="text-[11px] text-white/50 text-center">{tool.name}</span>
            {loading === tool.action && (
              <span className="text-[9px] text-purple-300">处理中...</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-300/70 bg-red-500/[0.06] rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
          <p className="text-xs text-emerald-300/80">{result.message}</p>
          {result.simulated && (
            <p className="text-[10px] text-white/20 mt-1">演示模式 — 配置 API Key 后启用真实处理</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AITools;
