import React, { useState } from 'react';

function BatchResultPanel({ results, onClear }) {
  const [selected, setSelected] = useState(new Set(
    results.filter(r => r.success).map((_, i) => i)
  ));
  const [downloadStatus, setDownloadStatus] = useState({}); // index -> 'pending'|'downloading'|'done'|'error'

  const successItems = results.filter(r => r.success);
  const allSelectedCount = [...selected].filter(i => results[i]?.success).length;

  const toggleSelect = (index) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const toggleAll = () => {
    if (allSelectedCount === successItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r, i) => r.success ? i : null).filter(i => i !== null)));
    }
  };

  const handleDownloadSelected = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    const urls = [...selected]
      .filter(i => results[i]?.success)
      .map(i => results[i].url);

    if (urls.length === 0) return;

    // Mark all as pending
    const newStatus = {};
    [...selected].forEach(i => { newStatus[i] = 'downloading'; });
    setDownloadStatus(prev => ({ ...prev, ...newStatus }));

    try {
      const res = await fetch(`/api/batch-download?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, audio_only: false, format_id: 'best' }),
      });
      if (res.ok) {
        const doneStatus = {};
        [...selected].forEach(i => { doneStatus[i] = 'done'; });
        setDownloadStatus(prev => ({ ...prev, ...doneStatus }));
      }
    } catch (e) {
      const errStatus = {};
      [...selected].forEach(i => { errStatus[i] = 'error'; });
      setDownloadStatus(prev => ({ ...prev, ...errStatus }));
    }
  };

  const handleDownloadSingle = async (index) => {
    const token = localStorage.getItem('snapvid_token') || '';
    const item = results[index];
    if (!item?.success) return;

    setDownloadStatus(prev => ({ ...prev, [index]: 'downloading' }));
    try {
      const res = await fetch(`/api/download?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, format_id: 'best' }),
      });
      if (res.ok) {
        setDownloadStatus(prev => ({ ...prev, [index]: 'done' }));
      } else {
        setDownloadStatus(prev => ({ ...prev, [index]: 'error' }));
      }
    } catch (e) {
      setDownloadStatus(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  const getStatusBadge = (index) => {
    const status = downloadStatus[index];
    if (!status) return null;
    if (status === 'downloading') return <span className="text-xs text-cyan-400/70 animate-pulse">下载中</span>;
    if (status === 'done') return <span className="text-xs text-emerald-400/70">✓ 已加入</span>;
    if (status === 'error') return <span className="text-xs text-red-400/70">失败</span>;
    return null;
  };

  const hasAnyDownloading = Object.values(downloadStatus).some(s => s === 'downloading');
  const allDone = successItems.length > 0 && successItems.every((_, i) => {
    const realIdx = results.indexOf(successItems[i]);
    return downloadStatus[realIdx] === 'done';
  });

  return (
    <div className="mt-8 fade-up">
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-white/60 font-medium">
              批量解析结果
            </p>
            <span className="text-xs text-white/30">
              {results.filter(r => r.success).length}/{results.length} 成功
              {allSelectedCount > 0 && ` · 已选 ${allSelectedCount}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!allDone && (
              <button
                onClick={handleDownloadSelected}
                disabled={allSelectedCount === 0 || hasAnyDownloading}
                className="text-xs text-white font-medium bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg
                  transition-all border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {hasAnyDownloading ? '提交中...' : `下载选中 (${allSelectedCount})`}
              </button>
            )}
            {allDone && (
              <a href="#/dashboard" className="text-xs text-emerald-400/70 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
                去控制台查看 →
              </a>
            )}
            <button onClick={onClear} className="text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1">
              ×
            </button>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.04]">
          <input
            type="checkbox"
            checked={allSelectedCount === successItems.length && successItems.length > 0}
            onChange={toggleAll}
            className="rounded border-white/20 bg-white/[0.05] text-cyan-500 focus:ring-0 w-4 h-4"
          />
          <span className="text-xs text-white/40">全选</span>
        </div>

        {/* List */}
        <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
          {results.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
              item.success
                ? selected.has(i) ? 'bg-cyan-500/[0.04] border-cyan-500/[0.12]' : 'bg-white/[0.02] border-white/[0.05]'
                : 'bg-red-500/[0.03] border-red-500/[0.08] opacity-60'
            }`}>
              {/* Checkbox */}
              {item.success && (
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelect(i)}
                  className="rounded border-white/20 bg-white/[0.05] text-cyan-500 focus:ring-0 w-4 h-4 shrink-0"
                />
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/60 truncate">{item.success ? item.title : item.url}</p>
                <p className="text-xs text-white/25 mt-0.5">
                  {item.success ? `${item.platform} · ${item.duration_string}` : item.error}
                </p>
              </div>

              {/* Status / Action */}
              <div className="shrink-0 ml-2">
                {getStatusBadge(i) || (
                  item.success && !downloadStatus[i] && (
                    <button
                      onClick={() => handleDownloadSingle(i)}
                      className="text-xs text-cyan-400/60 hover:text-cyan-300 px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors"
                    >
                      下载
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BatchResultPanel;
