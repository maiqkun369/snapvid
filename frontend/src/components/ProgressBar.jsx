import React, { useEffect, useState, useRef } from 'react';

// Clean technical error messages into user-friendly ones
function cleanErrorMessage(error) {
  if (!error) return '';
  const msg = error.toString();
  // YouTube/geo-blocked errors
  if (msg.includes('Sign in to confirm') || msg.includes('bot'))
    return '该视频所在平台当前网络无法直接访问，请在「高级选项」中配置代理后重试';
  if (msg.includes('cookies') || msg.includes('Fresh cookies'))
    return '该平台需要网络代理才能访问，请在「高级选项」中配置代理后重试';
  if (msg.includes('Video unavailable'))
    return '视频不可用：可能已被删除或设为私密';
  if (msg.includes('HTTP Error 403') || msg.includes('Forbidden'))
    return '访问被拒绝，请稍后重试或配置代理';
  if (msg.includes('Unsupported URL'))
    return '不支持的链接格式，请复制视频的完整分享链接';
  if (msg.includes('网络') || msg.includes('timeout') || msg.includes('timed out'))
    return '网络连接超时，请检查网络后重试';
  if (msg.includes('no available source'))
    return '暂时无法下载此视频，请稍后重试或配置代理';
  // Strip yt-dlp technical prefixes
  const cleaned = msg
    .replace(/ERROR:\s*\[[\w-]+\]\s*[\w-]+:\s*/g, '')
    .replace(/See\s+https:\/\/github\.com\/.*$/g, '')
    .replace(/Use\s+--cookies.*$/g, '')
    .replace(/下载失败:\s*/g, '')
    .replace(/下载出错:\s*/g, '');
  return cleaned.length > 100 ? cleaned.slice(0, 100) + '...' : cleaned;
}

function ProgressBar({ taskId, onComplete }) {
  const [status, setStatus] = useState('connecting');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const wsRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!taskId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/ws/progress/${taskId}`;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.speed !== undefined) setSpeed(data.speed);
          if (data.eta !== undefined) setEta(data.eta);
          if (data.status) {
            setStatus(data.status);
            if (data.status === 'completed' && !completedRef.current) {
              completedRef.current = true;
              if (onComplete) onComplete();
            }
            if (data.status === 'failed') {
              setError(data.error || '下载失败');
            }
          }
        } catch (err) {}
      };

      ws.onclose = () => {
        // Start polling fallback if not completed
        if (!completedRef.current) {
          startPolling();
        }
      };

      ws.onerror = () => ws.close();
    };

    // Polling fallback: check task status via REST API
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/downloads');
          if (!res.ok) return;
          const tasks = await res.json();
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            setProgress(task.progress);
            setSpeed(task.speed || '');
            setEta(task.eta || '');
            if (task.status === 'completed' && !completedRef.current) {
              completedRef.current = true;
              setStatus('completed');
              if (onComplete) onComplete();
              clearInterval(pollRef.current);
            } else if (task.status === 'failed') {
              setStatus('failed');
              setError(task.error || '下载失败');
              clearInterval(pollRef.current);
            } else {
              setStatus(task.status);
            }
          }
        } catch (e) {}
      }, 2000);
    };

    connect();
    // Also start polling immediately as backup
    startPolling();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [taskId, onComplete]);

  const getStatusLabel = () => {
    switch (status) {
      case 'connecting': return '连接中...';
      case 'pending': return '等待中...';
      case 'downloading': return '下载中';
      case 'completed': return '下载完成';
      case 'failed': return '下载失败';
      default: return status;
    }
  };

  const getBarColor = () => {
    if (status === 'completed') return 'bg-emerald-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-gradient-to-r from-purple-500 to-cyan-400';
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">{getStatusLabel()}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">{progress.toFixed(1)}%</span>
          {(status === 'downloading' || status === 'pending') && (
            <button
              onClick={async () => {
                try {
                  await fetch(`/api/downloads/${taskId}`, { method: 'DELETE' });
                  if (onComplete) onComplete();
                } catch (e) {}
              }}
              className="text-xs text-white/30 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
              title="取消下载"
            >
              取消
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/30">
        <span>{speed || '--'}</span>
        <span>{eta || '--'}</span>
      </div>

      {error && (
        <div className="text-xs text-red-300/80 bg-red-500/[0.08] border border-red-500/[0.12] rounded-lg px-3 py-2">
          {cleanErrorMessage(error)}
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-2 text-emerald-400/80 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          下载完成！可在下载历史中获取文件
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
