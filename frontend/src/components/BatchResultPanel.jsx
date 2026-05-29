import React, { useState } from 'react';

function BatchResultPanel({ results, onClear }) {
  const [selected, setSelected] = useState(new Set(
    results.filter(r => r.success).map((_, i) => i)
  ));
  const [downloadStatus, setDownloadStatus] = useState({});
  const [showOptions, setShowOptions] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [formatSort, setFormatSort] = useState('');

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

    const newStatus = {};
    [...selected].forEach(i => { newStatus[i] = 'downloading'; });
    setDownloadStatus(prev => ({ ...prev, ...newStatus }));

    try {
      const res = await fetch(`/api/batch-download?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          audio_only: audioOnly,
          format_id: 'best',
          output_format: outputFormat,
          format_sort: formatSort || undefined,
        }),
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
    if (status === 'downloading') return <span className="text-xs font-bold text-[#CC0066] animate-pulse">下载中</span>;
    if (status === 'done') return <span className="text-xs font-bold text-green-600">已加入</span>;
    if (status === 'error') return <span className="text-xs font-bold text-red-600">失败</span>;
    return null;
  };

  const hasAnyDownloading = Object.values(downloadStatus).some(s => s === 'downloading');
  const allDone = successItems.length > 0 && successItems.every((_, i) => {
    const realIdx = results.indexOf(successItems[i]);
    return downloadStatus[realIdx] === 'done';
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-[#1D1C1C]">
            批量解析结果
          </p>
          <span className="text-xs font-medium text-[#4A4A4A]">
            {results.filter(r => r.success).length}/{results.length} 成功
            {allSelectedCount > 0 && ` · 已选 ${allSelectedCount}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!allDone && (
            <button
              onClick={handleDownloadSelected}
              disabled={allSelectedCount === 0 || hasAnyDownloading}
              className="text-xs font-bold text-white bg-[#1D1C1C] hover:opacity-80 px-4 py-2 rounded-full
                transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {hasAnyDownloading ? '提交中...' : `下载选中 (${allSelectedCount})`}
            </button>
          )}
          {allDone && (
            <a href="#/dashboard" className="text-xs font-bold text-green-600 hover:underline px-3 py-1.5">
              去控制台查看 →
            </a>
          )}
          <button onClick={onClear} className="text-xs text-[#4A4A4A] hover:text-[#1D1C1C] transition-colors px-2 py-1 font-bold">
            ×
          </button>
        </div>
      </div>

      {/* Download Options */}
      <div className="mb-4 pb-4 border-b border-[#E8E8E8]">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-xs font-bold text-[#4A4A4A] hover:text-[#1D1C1C] transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          下载配置
        </button>

        {showOptions && (
          <div className="mt-3 pl-5 space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setAudioOnly(false)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${!audioOnly ? 'bg-[#1D1C1C] text-white border-[#1D1C1C]' : 'bg-white text-[#1D1C1C] border-[#1D1C1C]'}`}>
                视频
              </button>
              <button onClick={() => setAudioOnly(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${audioOnly ? 'bg-[#1D1C1C] text-white border-[#1D1C1C]' : 'bg-white text-[#1D1C1C] border-[#1D1C1C]'}`}>
                仅音频
              </button>
            </div>

            {!audioOnly && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#4A4A4A] w-12">格式</span>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="tool-select flex-1">
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#4A4A4A] w-12">画质</span>
              <select value={formatSort} onChange={(e) => setFormatSort(e.target.value)} className="tool-select flex-1">
                <option value="">最佳画质</option>
                <option value="res:1080">1080P</option>
                <option value="res:720">720P (省流)</option>
                <option value="filesize">最小体积</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E8E8E8]">
        <input
          type="checkbox"
          checked={allSelectedCount === successItems.length && successItems.length > 0}
          onChange={toggleAll}
          className="rounded border-[#1D1C1C] w-4 h-4"
        />
        <span className="text-xs font-bold text-[#4A4A4A]">全选</span>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {results.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
            item.success
              ? selected.has(i) ? 'bg-[#FFF48D]/20 border-[#1D1C1C]' : 'bg-white border-[#E8E8E8]'
              : 'bg-red-50 border-red-200 opacity-70'
          }`}>
            {item.success && (
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggleSelect(i)}
                className="rounded border-[#1D1C1C] w-4 h-4 shrink-0"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1D1C1C] truncate">{item.success ? item.title : item.url}</p>
              <p className="text-xs text-[#4A4A4A] mt-0.5">
                {item.success ? `${item.platform} · ${item.duration_string}` : item.error}
              </p>
            </div>

            <div className="shrink-0 ml-2">
              {getStatusBadge(i) || (
                item.success && !downloadStatus[i] && (
                  <button
                    onClick={() => handleDownloadSingle(i)}
                    className="text-xs font-bold text-[#CC0066] hover:underline px-2 py-1"
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
  );
}

export default BatchResultPanel;
