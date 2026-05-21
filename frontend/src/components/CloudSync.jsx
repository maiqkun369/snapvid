import React, { useState, useEffect } from 'react';

function CloudSync({ taskId }) {
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cloud/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleUpload = async () => {
    setUploading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/cloud/upload?task_id=${taskId}&phone=`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '上传失败');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/cloud/auth-url');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        setError(data.message || '百度网盘 API 尚未配置');
      }
    } catch (e) {
      setError('获取授权链接失败');
    }
  };

  if (!taskId) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/30 tracking-widest uppercase">Cloud Sync</p>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-400/10 text-purple-300">PRO</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Baidu NetDisk */}
        <button
          onClick={status?.connected ? handleUpload : handleConnect}
          disabled={uploading}
          className="flex-1 flex items-center gap-3 p-3 rounded-xl
            bg-white/[0.03] border border-white/[0.06]
            hover:bg-white/[0.06] hover:border-white/[0.12]
            transition-all duration-200 disabled:opacity-40"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#2196F3">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-xs text-white/60">百度网盘</p>
            <p className="text-[10px] text-white/25">
              {uploading ? '上传中...' : status?.connected ? '点击上传' : '点击授权连接'}
            </p>
          </div>
        </button>

        {/* More clouds - placeholder */}
        <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] opacity-40">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
            <span className="text-xs text-white/20">+</span>
          </div>
          <div className="text-left">
            <p className="text-xs text-white/30">更多云盘</p>
            <p className="text-[10px] text-white/15">即将支持</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-300/70 bg-red-500/[0.06] rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
          <p className="text-xs text-emerald-300/80">{result.message}</p>
          {result.simulated && (
            <p className="text-[10px] text-white/20 mt-1">演示模式 — 配置 BAIDU_APP_KEY 后启用真实上传</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CloudSync;
